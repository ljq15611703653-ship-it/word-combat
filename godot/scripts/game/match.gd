extends RefCounted
# 一局对战的流程控制（与界面无关）。人类默认是0号位；两边都可设为电脑，用于批量模拟。
#
# 每轮：开始（行动点/复出）→ 抽词（两袋，先手先选）→ 调整（各两次，交替、公开）→ 宣告（先手锁定→后手应对）→ 时间轴结算。

const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
const D = preload("res://scripts/core/deck.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")

var rng := RandomNumberGenerator.new()
var st: Dictionary = {}
var decks: Array = []
var pools: Array = [{}, {}]
var human: Array = [true, false]
var personas: Array = ["", ""]
var phase := "init"      # build draft adjust declare over
var bags: Array = []
var picker := 0
var bag_choice := -1
var adjust_steps: Array = []   # 依次轮到的一方
var adjust_idx := 0
var pending: Array = [{}, {}]
var declare_order: Array = []
var last_events: Array = []
var last_declared: Array = [{}, {}]
var log_lines: Array = []
var winner := -1               # -1 进行中，0/1，-2 平局
var fast_ai := false
var rounds_played := 0

func start(human0: bool = true, seed_val: int = -1, human1: bool = false) -> void:
	Lex.load_all()
	if seed_val < 0:
		rng.randomize()
	else:
		rng.seed = seed_val
	human = [human0, human1]
	pools = [{}, {}]
	for s in 2:
		for w in Lex.opening_words(rng):
			pools[s][w] = int(pools[s].get(w, 0)) + 1
		personas[s] = Ai.pick_persona(rng)
	decks = [D.new_deck(), D.new_deck()]
	for s in 2:
		if not human[s]:
			decks[s] = Ai.build_deck(pools[s], personas[s], rng)
	st = E.make_state(decks, 0, {}, rng.randi() & 0x7fffffff)
	phase = "build"
	winner = -1
	log_lines = []
	rounds_played = 0
	say("对局开始。双方各得12个起始词，先完成构筑。")

func say(t: String) -> void:
	log_lines.append(t)

# ---------------------------------------------------------------- 初始构筑
func commit_deck(side: int, deck: Dictionary) -> Dictionary:
	var v := D.validate(deck, pools[side])
	if not v.ok:
		return v
	decks[side] = deck
	E.set_deck(st, side, deck, false)
	return v

func ready_for_round() -> bool:
	for s in 2:
		if human[s]:
			if not D.validate(decks[s], pools[s]).ok:
				return false
			var has := false
			for u in decks[s].units:
				if not u.skills.is_empty():
					has = true
			if not has:
				return false
	return true

# ---------------------------------------------------------------- 一轮
func begin_round() -> Array:
	var revived := E.begin_round(st)
	rounds_played = st.round
	bags = [Lex.draw_bag(rng), Lex.draw_bag(rng)]
	picker = E.first_side(st)
	phase = "draft"
	bag_choice = -1
	say("—— 第 %d 轮 ——  先手：%s" % [st.round, "你" if human[picker] else "对手"])
	return revived

func pick_bag(side: int, idx: int) -> void:
	bag_choice = idx
	for w in bags[idx]:
		pools[side][w] = int(pools[side].get(w, 0)) + 1
	for w in bags[1 - idx]:
		pools[1 - side][w] = int(pools[1 - side].get(w, 0)) + 1
	say("%s 选择了%s袋。" % ["你" if human[side] else "对手", "左" if idx == 0 else "右"])
	var f := E.first_side(st)
	adjust_steps = [f, 1 - f, f, 1 - f]
	adjust_idx = 0
	phase = "adjust"

func ai_pick_bag() -> void:
	var idx := Ai.pick_bag(bags, pools[picker], personas[picker])
	pick_bag(picker, idx)

func adjust_side() -> int:
	return adjust_steps[adjust_idx] if adjust_idx < adjust_steps.size() else -1

func adjust_left(side: int) -> int:
	var n := 0
	for i in range(adjust_idx, adjust_steps.size()):
		if adjust_steps[i] == side:
			n += 1
	return n

# 人类或电脑提交“改动一张卡”。unit_idx 为卡的位置，new_unit 为新的卡数据。
func apply_adjust(side: int, unit_idx: int, new_unit: Dictionary) -> Dictionary:
	var nd := D.clone(decks[side])
	nd.units[unit_idx] = new_unit
	D.rename_skills(nd)
	var v := D.validate(nd, pools[side])
	if not v.ok:
		return v
	decks[side] = nd
	E.set_deck(st, side, nd, false)
	var names: Array = []
	for sk in new_unit.skills:
		names.append(sk.name)
	say("%s 调整了【%s】：现有技能 %s，关键词 %s，生命 %d。" % ["你" if human[side] else "对手", new_unit.name, "、".join(names) if not names.is_empty() else "无", new_unit.kw if new_unit.kw != "" else "无", int(new_unit.max_hp)])
	_advance_adjust()
	return v

func skip_adjust(side: int) -> void:
	# 放弃本方剩余的调整次数
	var keep: Array = []
	for i in adjust_steps.size():
		if i < adjust_idx or adjust_steps[i] != side:
			keep.append(adjust_steps[i])
	adjust_steps = keep
	if adjust_idx >= adjust_steps.size():
		phase = "adjust_done"

func _advance_adjust() -> void:
	adjust_idx += 1
	if adjust_idx >= adjust_steps.size():
		phase = "adjust_done"

func ai_adjust() -> void:
	var s := adjust_side()
	var nd := Ai.adjust_step(decks[s], pools[s], personas[s], rng)
	if nd.is_empty():
		# 无可装的新技能：放弃余下次数
		skip_adjust(s)
		return
	var changed := D.changed_units(decks[s], nd)
	if changed.is_empty():
		skip_adjust(s)
		return
	var r := apply_adjust(s, changed[0], nd.units[changed[0]])
	if not r.ok:
		skip_adjust(s)

func begin_declare() -> void:
	phase = "declare"
	pending = [{}, {}]
	declare_order = [E.first_side(st), 1 - E.first_side(st)]
	say("进入宣告：先手锁定行动，后手看见后应对。")

func declare_side() -> int:
	for s in declare_order:
		if not pending[s].has("done"):
			return s
	return -1

func submit(side: int, act: Dictionary) -> String:
	if not act.is_empty():
		var err := E.can_declare(st, act)
		if err != "":
			return err
	pending[side] = act.duplicate(true)
	pending[side]["done"] = true
	return ""

var max_think_ms := 0
func ai_declare() -> void:
	var t0 := Time.get_ticks_msec()
	var s := declare_side()
	var enemy: Dictionary = {}
	if s != declare_order[0] and not pending[declare_order[0]].is_empty():
		enemy = pending[declare_order[0]].duplicate()
		enemy.erase("done")
	var act := Ai.choose_action(st, s, enemy, rng, fast_ai)
	pending[s] = act.duplicate(true)
	pending[s]["done"] = true
	max_think_ms = maxi(max_think_ms, Time.get_ticks_msec() - t0)

func public_declared(side: int) -> Dictionary:
	# 后手可见的先手宣告
	if pending[side].has("done"):
		var a: Dictionary = pending[side].duplicate()
		a.erase("done")
		return a
	return {}

func resolve() -> Dictionary:
	var acts: Array = [{}, {}]
	for s in 2:
		var a: Dictionary = pending[s].duplicate()
		a.erase("done")
		acts[s] = a
	last_declared = acts
	var res := E.run_round(st, acts)
	last_events = res.events
	if res.winner != -1:
		winner = res.winner
	elif st.round >= int(st.rules.max_rounds):
		var a0: int = st.sides[0].score
		var a1: int = st.sides[1].score
		winner = 0 if a0 > a1 else (1 if a1 > a0 else -2)
	phase = "over" if winner != -1 else "resolved"
	return res

# ---------------------------------------------------------------- 全自动（批量模拟用）
func step_auto() -> bool:
	# 推进一步，返回是否仍在进行。仅在所有需要决策的一方都是电脑时使用。
	match phase:
		"build":
			for s in 2:
				if human[s]:
					return false
			begin_round()
		"draft":
			if human[picker]:
				return false
			ai_pick_bag()
		"adjust":
			var s2 := adjust_side()
			if human[s2]:
				return false
			ai_adjust()
		"adjust_done":
			begin_declare()
		"declare":
			var s3 := declare_side()
			if s3 == -1:
				resolve()
			elif human[s3]:
				return false
			else:
				ai_declare()
		"resolved":
			begin_round()
		"over":
			return false
	return phase != "over"

func run_to_end(max_steps: int = 400) -> void:
	var n := 0
	while step_auto() and n < max_steps:
		n += 1

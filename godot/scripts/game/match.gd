extends RefCounted
# 一局对战的流程控制（与界面无关）。人类默认是0号位；两边都可设为电脑，用于批量模拟。
#
# 开局：各发 12 个基础词 → 连选 OPENING_DRAFTS 轮词袋（每轮两袋，先挑的一方交替）→ 用全部词构筑 → 第 1 轮直接开打。
# 第 2 轮起每轮：开始（行动点）→ 抽词（两袋各25词，先手先选）→ 调整（各三次，交替、公开）→ 宣告（先手宣告完→后手宣告）→ 时间轴结算。

const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
const D = preload("res://scripts/core/deck.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const Namer = preload("res://scripts/core/namer.gd")
const Coach = preload("res://scripts/core/coach.gd")
const R = preload("res://scripts/core/recipes.gd")

var rng := RandomNumberGenerator.new()
static var AI_HP := 14          # 电脑拼每张卡时给的生命（其余预算给技能数字）；调平衡用
var st: Dictionary = {}
var decks: Array = []
var pools: Array = [{}, {}]
var human: Array = [true, false]
var personas: Array = ["", ""]
var phase := "init"      # build draft adjust declare over
var bags: Array = []
var picker := 0
var bag_choice := -1
var bag_taken: Array = [-1, -1]     # 双方各拿走了第几个兜子
var adjust_steps: Array = []   # 依次轮到的一方
var adjust_idx := 0
var declared: Array = [[], []]      # 每方本轮已宣告的行动（按宣告顺序）
var declare_done: Array = [false, false]
var declare_order: Array = []
var last_events: Array = []
var last_declared: Array = [[], []]
var log_lines: Array = []
var winner := -1               # -1 进行中，0/1，-2 平局
var fast_ai := false
var ai_epsilon := 0.0
var max_think_ms := 0
var rounds_played := 0
const OPENING_DRAFTS := 3     # 四张卡：第 1 张用初始词，之后每张卡之前选一袋词
var opening_idx := 0           # 开局选词进行到第几袋
var opening_total := OPENING_DRAFTS
var round1_draft := false      # 调试演示用：第 1 轮也抽词
var staged := false            # 逐张构筑：每轮双方同时拼一张，同时亮相，再选词拼下一张
var card_idx := 0              # 正在拼的是第几张
var card_ready := [false, false]
var scripted_ai: Callable = Callable()   # 教学：由脚本替电脑宣告

func start(human0: bool = true, seed_val: int = -1, human1: bool = false, openings: int = OPENING_DRAFTS) -> void:
	Lex.load_all()
	if seed_val < 0:
		rng.randomize()
	else:
		rng.seed = seed_val
	human = [human0, human1]
	pools = [{}, {}]
	for s in 2:
		pools[s] = Lex.basic_supply()
		personas[s] = Ai.pick_persona(rng)
	decks = [D.new_deck(), D.new_deck()]
	st = E.make_state(decks, 0, {}, rng.randi() & 0x7fffffff)
	winner = -1
	log_lines = []
	rounds_played = 0
	opening_idx = 0
	opening_total = openings
	say("对局开始。基础词随便用；进阶词要从兜子里拿，先后各选一兜。")
	if opening_total > 0:
		_next_opening()
	else:
		_finish_opening()

# 开局选词：每次两袋，先挑的一方交替
func _next_opening() -> void:
	phase = "opening"
	bags = Lex.draw_bags(rng)
	picker = (int(st.first) + opening_idx) % 2
	bag_choice = -1
	bag_taken = [-1, -1]

func _finish_opening() -> void:
	phase = "build"
	for s in 2:
		if not human[s]:
			decks[s] = Ai.build_deck(pools[s], personas[s], rng)
			E.set_deck(st, s, decks[s], false)

# ---------------------------------------------------------------- 逐张构筑（同时拼、同时亮）
func begin_staged() -> void:
	staged = true
	opening_idx = 0
	opening_total = D.COUNT - 1
	card_idx = 0
	for s2 in 2:
		for u in decks[s2].units:
			u.max_hp = AI_HP      # 没拼的卡先按默认生命占位，拼到它时再自己调
		E.set_deck(st, s2, decks[s2], false)
	_begin_card()

func _begin_card() -> void:
	phase = "build_card"
	card_ready = [false, false]
	for s in 2:
		if not human[s]:
			_ai_build_card(s, card_idx)
			card_ready[s] = true

# 电脑拼第 k 张（测试里也用它代替人类）：用“还没用掉的词”配一副，取其中带技能的一张；点数不超预算
func ai_make_card(side: int, k: int) -> Dictionary:
	if staged:
		var t: Dictionary = _ai_targeted_card(side, k)
		if not t.is_empty():
			return t
	return _ai_template_card(side, k)

# 已亮相的对手牌（逐张构筑中，对方当前正在拼的这张不算）
func revealed_deck(side: int) -> Dictionary:
	var d := D.clone(decks[side])
	for i in d.units.size():
		if i >= card_idx:
			d.units[i].skills = []
			d.units[i].kw = ""
	return d

# 针对对手已亮的牌：在“现有词 + 对手情报”里挑最合适的一条路线来拼这张
func _ai_targeted_card(side: int, k: int) -> Dictionary:
	var avail: Dictionary = Coach.free_words(pools[side], decks[side])
	var prof: Dictionary = Coach.foe_profile(revealed_deck(1 - side))
	var mine_tids := {}
	var mine_roles := {}
	var counters_have := 0
	for u in decks[side].units:
		for sk in u.skills:
			mine_tids[str(sk.get("template", ""))] = true
			mine_roles[str(sk.get("kind_tag", ""))] = int(mine_roles.get(str(sk.get("kind_tag", "")), 0)) + 1
			if str(sk.get("kind_tag", "atk")) != "atk":
				counters_have += 1
	var cands: Array = []
	for a in Coach.route_status(avail):
		if int(a.n) != 0:
			continue
		var rel: Dictionary = Coach._relevance(a, prof)
		var sc: float = float(a.w) + float(rel.bonus) * 3.2 + rng.randf() * 0.6
		# 更爱针对：应对/反制/控场类的路线有额外加分；自己的牌里应对类还不到两张时，加得更多
		if str(a.role) != "攻":
			sc += 1.0 + (1.6 if counters_have < 2 and k >= 1 else 0.0)
		if mine_tids.has(str(a.tid)):
			sc -= 1.2
		if str(a.role) == "守" and int(mine_roles.get("def", 0)) + int(mine_roles.get("heal", 0)) >= 2:
			sc -= 1.0
		cands.append({"sc": sc, "a": a})
	cands.sort_custom(func(x, y): return x.sc > y.sc)
	# 给后面还没拼的卡留预算：每张卡的数字大致不超过“剩余数字预算 ÷ 剩余张数”
	var hp_floor: int = AI_HP * D.COUNT
	var nums_used := 0
	for u0 in decks[side].units:
		for sk0 in u0.skills:
			nums_used += int(sk0.budget)
	var share: int = maxi(5, (D.BUDGET - hp_floor - nums_used) / maxi(1, D.COUNT - k))
	for c in cands.slice(0, 8):
		var sk: Dictionary = _shrink_skill(c.a, share)
		var u := {"name": "", "glyph": D.GLYPHS[k % D.GLYPHS.size()], "max_hp": AI_HP, "kw": "", "skills": [sk.duplicate(true)]}
		# 关键词：有就带上（首挡/回击等是白送的强度）
		for kw in ["首挡", "回击", "不屈", "回春", "同调"]:
			var left := int(avail.get(kw, 0))
			for w in G.count_words(sk.words):
				if w == kw:
					left -= 1
			if left > 0 and rng.randf() < 0.7:
				u.kw = kw
				break
		u["name"] = Namer.minion_name(u, rng)
		var nd := D.clone(decks[side])
		nd.units[k] = u
		while int(D.budget_used(nd).total) > D.BUDGET and int(nd.units[k].max_hp) > 3:
			nd.units[k].max_hp -= 1
		D.rename_skills(nd)
		if D.validate(nd, pools[side]).ok:
			return nd.units[k]
	return {}

# 把技能里的“数字”按比例缩小，直到点数不超过 cap（缩不动就原样返回）
func _shrink_skill(a: Dictionary, cap: int) -> Dictionary:
	var sk: Dictionary = a.skill
	if int(sk.budget) <= cap or not a.params.has("n"):
		return sk
	var p: Dictionary = a.params.duplicate()
	for f in [0.75, 0.55, 0.4, 0.3]:
		p["n"] = maxi(3, int(round(float(a.params.n) * f)))
		var s2: Dictionary = R.build(str(a.tid), p)
		if int(s2.budget) <= cap or int(p.n) <= 3:
			return s2
	return sk

func _ai_template_card(side: int, k: int) -> Dictionary:
	var left: Dictionary = pools[side].duplicate()
	for w in D.used_words(decks[side]):
		left[w] = int(left.get(w, 0)) - 1
		if int(left[w]) <= 0:
			left.erase(w)
	var nums_used := 0
	for i in decks[side].units.size():
		if i != k:
			for sk in decks[side].units[i].skills:
				nums_used += int(sk.budget)
	var hp_others := 0
	for i in decks[side].units.size():
		if i != k:
			hp_others += int(decks[side].units[i].max_hp)
	var nums_room: int = maxi(6, D.BUDGET - hp_others - nums_used - 8)
	var cap0: int = clampi(int(float(nums_room) * 4.0 / float(D.COUNT - k)), 8, 34)
	for cap in [cap0, int(cap0 * 0.6), int(cap0 * 0.35), 6]:
		var full: Dictionary = Ai.build_deck(left, personas[side], rng, maxi(4, cap))
		var pick := -1
		for i in full.units.size():
			if not full.units[i].skills.is_empty() and (pick == -1 or i == k):
				pick = i
		if pick == -1:
			continue
		var u: Dictionary = full.units[pick].duplicate(true)
		u["name"] = Namer.minion_name(u, rng)
		var nd := D.clone(decks[side])
		u["max_hp"] = mini(int(u.max_hp), AI_HP)
		nd.units[k] = u
		while int(D.budget_used(nd).total) > D.BUDGET and int(nd.units[k].max_hp) > 3:
			nd.units[k].max_hp -= 1
		D.rename_skills(nd)
		if D.validate(nd, pools[side]).ok:
			return nd.units[k]
	return {}

func _ai_build_card(side: int, k: int) -> void:
	var u: Dictionary = ai_make_card(side, k)
	if u.is_empty():
		return
	var nd := D.clone(decks[side])
	nd.units[k] = u
	D.rename_skills(nd)
	decks[side] = nd
	E.set_deck(st, side, nd, false)

# 人类拼好第 k 张
func commit_card(side: int, k: int, unit: Dictionary) -> Dictionary:
	var nd := D.clone(decks[side])
	nd.units[k] = unit
	D.rename_skills(nd)
	var v := D.validate(nd, pools[side])
	if not v.ok:
		return v
	decks[side] = nd
	E.set_deck(st, side, nd, false)
	card_ready[side] = true
	if card_ready[0] and card_ready[1]:
		phase = "reveal"
	return v

# 亮相看完了：还有下一张就先选词，否则开打
func after_reveal() -> void:
	if card_idx + 1 < D.COUNT:
		_next_opening()
	else:
		phase = "ready"

# 对手公开的牌组：拼卡阶段，本张还没亮出来的不给看
func public_deck(side: int) -> Dictionary:
	var d := D.clone(decks[side])
	if staged and phase == "build_card":
		for i in range(card_idx, d.units.size()):
			d.units[i].skills = []
			d.units[i].kw = ""
	return d

# 所有开局选词都交给电脑（调试演示、批量模拟用）
func auto_opening() -> void:
	while phase == "opening":
		ai_pick_bag()

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
	picker = 1 - E.first_side(st)      # 上一轮的先手先挑兜子（先手本来就吃亏）
	bag_choice = -1
	say("—— 第 %d 轮 ——  先手：%s" % [st.round, "你" if human[picker] else "对手"])
	if int(st.round) == 1 and opening_total > 0 and not round1_draft:
		# 刚用开局选的词构筑完：第 1 轮直接开打
		bags = []
		phase = "adjust_done"
		return revived
	bags = Lex.draw_bags(rng)
	bag_taken = [-1, -1]
	phase = "draft"
	return revived

func pick_bag(side: int, idx: int) -> void:
	if bag_taken[side] != -1 or idx in bag_taken:
		return
	bag_taken[side] = idx
	bag_choice = idx
	for w in bags[idx]:
		pools[side][w] = int(pools[side].get(w, 0)) + 1
	say("%s 拿走了第 %d 个兜子：%s。" % ["你" if human[side] else "对手", idx + 1, "、".join(bags[idx])])
	if bag_taken[1 - side] == -1:
		picker = 1 - side          # 轮到另一方，从剩下的兜子里拿一个
		return
	if phase == "opening":
		opening_idx += 1
		if staged:
			card_idx += 1
			_begin_card()
			return
		if opening_idx < opening_total:
			_next_opening()
		else:
			_finish_opening()
		return
	var f := E.first_side(st)
	adjust_steps = [f, 1 - f, f, 1 - f, f, 1 - f]
	adjust_idx = 0
	phase = "adjust"

func remaining_bags() -> Array:
	var out: Array = []
	for i in bags.size():
		if not (i in bag_taken):
			out.append(i)
	return out

func ai_pick_bag() -> void:
	var rem: Array = remaining_bags()
	var sub: Array = []
	for i in rem:
		sub.append(bags[i])
	var idx: int = int(rem[Ai.pick_bag(sub, pools[picker], personas[picker])])
	if staged and phase == "opening":
		var plan: Dictionary = Coach.draft_plan(pools[picker], decks[picker], sub, revealed_deck(1 - picker))
		idx = int(rem[int(plan.pick)])
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
	var only_names := D.changed_units(decks[side], nd).is_empty()
	decks[side] = nd
	E.set_deck(st, side, nd, false)
	if only_names:
		return v # 只改了名字：不算一次调整
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
	declared = [[], []]
	declare_done = [false, false]
	declare_order = [E.first_side(st), 1 - E.first_side(st)]
	say("进入宣告：先手把行动一次宣告完，后手看见全部后再宣告。")

func declare_side() -> int:
	for s in declare_order:
		if not declare_done[s]:
			return s
	return -1

# 宣告一个行动；act 为空表示本方不再宣告。返回错误文字（空串=成功）
func submit(side: int, act: Dictionary) -> String:
	if act.is_empty():
		declare_done[side] = true
		return ""
	var err := E.can_declare(st, act, declared[side])
	if err != "":
		return err
	declared[side].append(act.duplicate(true))
	return ""

const COUNTER_CATS := ["interrupt", "silence", "redirect", "reflect", "mit", "shield", "convert", "delay"]

func _skill_cat(sk: Dictionary) -> String:
	var t := str(sk.get("template", ""))
	var p: Dictionary = sk.get("params", {})
	if t == "time":
		return str(p.get("op", "time"))
	if t == "status" and str(p.get("st", "")) in ["衰弱", "灼烧", "易伤"]:
		return "debuff"
	if t == "status" and str(p.get("st", "")) == "铁壁":
		return "shield"
	return t

func _act_cat(a: Dictionary) -> String:
	return _skill_cat(E.skill_of(st, int(a.sid)))

func ai_declare() -> void:
	var t0 := Time.get_ticks_msec()
	var s := declare_side()
	if scripted_ai.is_valid():
		scripted_ai.call(self, s)
		declare_done[s] = true
		return
	var second: bool = s != declare_order[0]
	var enemy_list: Array = []
	if second:
		enemy_list = declared[1 - s].duplicate(true)
		# 后手先单独评估“应对类”技能：只要模拟里比不出更好，就用（看得见对手全部宣告）
		var guard0 := 0
		while guard0 < 4:
			guard0 += 1
			var base_acts: Array = enemy_list + declared[s]
			var base_v := Ai.evaluate(Ai._sim(st, base_acts), s)
			var best := {}
			var best_v := base_v + 0.01
			for a in Ai.enumerate_actions(st, s, enemy_list, 8, declared[s]):
				if a.is_empty() or not (_act_cat(a) in COUNTER_CATS):
					continue
				var v := Ai.evaluate(Ai._sim(st, base_acts + [a]), s)
				if v > best_v:
					best_v = v
					best = a
			if best.is_empty() or submit(s, best) != "":
				break
	# 先手：持有打断/沉默时，给下一轮（那时是后手，才打得中）留够行动点
	var reserve := 0
	if not second:
		for u in E.alive_units(st, s):
			for sid in u.skill_ids:
				var sk: Dictionary = E.skill_of(st, sid)
				if _skill_cat(sk) in ["interrupt", "silence"]:
					reserve = maxi(reserve, int(sk.get("cost", 0)) - int(st.rules.ap_gain))
	var guard := 0
	while guard < E.MAX_ACTIONS:
		guard += 1
		var act := Ai.choose_action(st, s, enemy_list, declared[s], rng, fast_ai, ai_epsilon)
		if act.is_empty():
			break
		if not second and _skill_cat(E.skill_of(st, int(act.sid))) in ["interrupt", "silence", "delay"]:
			break      # 先手时对手还没出牌，打断/沉默/延后没有目标，不空放
		if reserve > 0 and E.available_ap(st, s, declared[s]) - E.action_cost(st, act) < reserve:
			break
		if submit(s, act) != "":
			break
	declare_done[s] = true
	max_think_ms = maxi(max_think_ms, Time.get_ticks_msec() - t0)

# 对方可见的本方已宣告行动
func public_declared(side: int) -> Array:
	return declared[side].duplicate(true)

func resolve() -> Dictionary:
	var acts: Array = []
	for s in declare_order:
		acts.append_array(declared[s])
	last_declared = [declared[0].duplicate(true), declared[1].duplicate(true)]
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
		"opening":
			if human[picker]:
				return false
			ai_pick_bag()
		"build":
			for s in 2:
				if human[s]:
					return false
			begin_round()
		"build_card":
			for s4 in 2:
				if human[s4] and not card_ready[s4]:
					return false
			phase = "reveal"
		"reveal":
			after_reveal()
		"ready":
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

extends RefCounted
# 数字牌模式 · 一局的流程：开局（职业、卡组、生命）→ 每轮：轮流宣告 → 结算 → 轮末（骰子、阶梯、胜负）

const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")
const NAI = preload("res://scripts/numcard/nc_ai.gd")

var rng := RandomNumberGenerator.new()
var rnd := 0
var first0 := 0
var sides: Array = []
var R: Dictionary = {}
var human: Array = [true, false]
var phase := "setup"            # setup / declare / resolved / over
var declared: Array = []
var remaining: Array = [[], []]
var passed: Array = [[], []]
var turn := 0
var res: Array = [{}, {}]
var winner := -1                # -1 进行中；0/1；-2 平局
var last_events: Array = []
var round_notes: Array = []     # 轮末发生的事（骰子、阶梯解锁）
var last_declared: Array = []

# deck = {"cls":, "words": {词: 张}, "kws": [3 个], "hp": [3 个]}
func start(deck0: Dictionary, deck1: Dictionary, seed_val: int = -1, human0: bool = true, human1: bool = false) -> void:
	if seed_val < 0:
		rng.randomize()
	else:
		rng.seed = seed_val
	human = [human0, human1]
	first0 = rng.randi() % 2
	rnd = 0
	winner = -1
	sides = []
	var U: Array = []
	for s in 2:
		var d: Dictionary = deck0 if s == 0 else deck1
		sides.append({"cls": str(d.cls), "ap": NR.AP_START, "deck": (d.words as Dictionary).duplicate(), "used": {}, "prev": {},
			"cards": [], "lad": []})
		for i in 3:
			U.append({"uid": s * 3 + i, "side": s, "name": NR.UNIT_NAMES[i], "glyph": NR.UNIT_GLYPHS[i], "hp": int(d.hp[i]), "mx": int(d.hp[i]),
				"down": -1, "st": {}, "kw": str(d.kws[i]), "kws": false, "mit": 0, "mitv": 0.0, "lis": [], "last": null})
	R = {"U": U, "M": [NE.metric0(), NE.metric0()], "kob": [0.0, 0.0], "kos": [0, 0], "fz": [0, 0], "lost": [0, 0], "maxhit": 0, "ev": null}
	begin_round()

func cls_of(s: int) -> String:
	return str(sides[s].cls)

func progress(s: int) -> float:
	return NE.prog(R, s, cls_of(s))

func first_side() -> int:
	return (first0 + rnd - 1) % 2

# ---------------------------------------------------------------- 一轮开始
func begin_round() -> void:
	rnd += 1
	for u in R.U:
		u.mit = 0
		u.mitv = 0.0
		u.lis = []
		u.kws = false
		if int(u.down) != -1 and rnd >= int(u.down) + 2:
			u.down = -1
			u.hp = int(u.mx)
			u.st = {}
		elif int(u.down) == -1:
			for nm in (u.st as Dictionary).keys():
				var e: Array = u.st[nm]
				if rnd > int(e[1]):
					u.st.erase(nm)
				else:
					e[0] = int(e[0]) + 1
	for s in 2:
		var sd: Dictionary = sides[s]
		if rnd > 1:
			sd.ap = mini(int(sd.ap) + NR.AP_INCOME, NR.AP_CAP)
		sd.prev = sd.used
		sd.used = {}
		res[s] = {"ap": int(sd.ap), "words": avail_words_base(s), "cards": []}
	declared = []
	passed = [[], []]
	remaining = [[], []]
	for u in R.U:
		if int(u.down) == -1:
			remaining[int(u.side)].append(int(u.uid))
	turn = first_side()
	phase = "declare"

# 卡组里本轮能用的词（扣掉上一轮用过、正在冷却的）
func avail_words_base(s: int) -> Dictionary:
	var sd: Dictionary = sides[s]
	var out := {}
	for w in NR.WORD_ORDER:
		out[w] = int(sd.deck.get(w, 0)) - int(sd.prev.get(w, 0))
	return out

func cooling_words(s: int) -> Dictionary:
	return (sides[s].prev as Dictionary).duplicate()

func usable_cards(s: int) -> Array:
	var out: Array = []
	var reserved: Array = res[s].cards
	var cards: Array = sides[s].cards
	for i in cards.size():
		if i in reserved:
			continue
		var c: Dictionary = cards[i]
		if bool(c.once) or rnd - int(c.last) >= 2:
			out.append(i)
	return out

# 现在能用的数字：{面值: 张数}（1 不在里面，1 永远免费）
func usable_values(s: int) -> Dictionary:
	var out := {}
	for i in usable_cards(s):
		var v: int = int(sides[s].cards[i].v)
		out[v] = int(out.get(v, 0)) + 1
	return out

func pick_cards(s: int, values: Array):
	var need := {}
	for v in values:
		if int(v) > 1:
			need[int(v)] = int(need.get(int(v), 0)) + 1
	if need.is_empty():
		return []
	var avail := usable_cards(s)
	var cards: Array = sides[s].cards
	var used: Array = []
	for v in need:
		var cand: Array = []
		for i in avail:
			if int(cards[i].v) == int(v) and not (i in used):
				cand.append(i)
		cand.sort_custom(func(a, b): return (0 if not bool(cards[a].once) else 1) < (0 if not bool(cards[b].once) else 1))
		if cand.size() < int(need[v]):
			return null
		for k in int(need[v]):
			used.append(cand[k])
	return used

# ---------------------------------------------------------------- 宣告
func declare_side() -> int:
	if phase != "declare":
		return -1
	if remaining[0].is_empty() and remaining[1].is_empty():
		return -1
	if remaining[turn].is_empty():
		return 1 - turn
	return turn

func public_declared(s: int) -> Array:
	var out: Array = []
	for a in declared:
		if int(a.side) == s:
			out.append(a)
	return out

# 把一句话补全成可以结算的行动（花费、起手、价值、用哪几张数字牌）。返回 {act} 或 {err}
func build_action(s: int, uid: int, cls: Array, start: int) -> Dictionary:
	if cls.is_empty():
		return {"err": "这句话是空的"}
	if cls.size() > NR.CLAUSE_MAX:
		return {"err": "一句最多 %d 段" % NR.CLAUSE_MAX}
	var u: Dictionary = R.U[uid]
	if int(u.side) != s or int(u.down) != -1:
		return {"err": "这个随从现在不能出手"}
	var words := NE.action_words(cls)
	var need := {}
	for w in words:
		need[w] = int(need.get(w, 0)) + 1
	for w in need:
		if int(res[s].words.get(w, 0)) < int(need[w]):
			return {"err": "【%s】不够用（卡组里的张数用完了，或者在冷却）" % w}
	var cost := NE.action_cost(cls)
	if cost > int(res[s].ap):
		return {"err": "行动点不够（要 %d，还剩 %d）" % [cost, int(res[s].ap)]}
	var nums := NE.action_numbers(cls)
	var cards = pick_cards(s, nums)
	if cards == null:
		return {"err": "数字牌不够：这句要用 %s" % str(nums)}
	var ms := NE.action_windup(cls)
	if start < ms:
		return {"err": "这句最早第 %d 秒才能起效" % ms}
	if start > NR.TIMELINE:
		return {"err": "时间轴只有 %d 秒" % NR.TIMELINE}
	for c in cls:
		for tid in c.get("tg", []):
			var tu: Dictionary = R.U[int(tid)]
			if int(tu.down) != -1:
				return {"err": "目标已经倒下了"}
		if str(c.k) == "delay":
			var ok := false
			for b in declared:
				if int(b.ord) == int(c.act) and int(b.side) != s:
					ok = true
			if not ok:
				return {"err": "延后要选对方已经宣告的一句"}
	var val := cost
	for v in nums:
		val += int(v)
	return {"act": {"side": s, "uid": uid, "start": start, "cl": cls, "cost": cost, "cards": cards, "words": words,
		"val": float(val), "def": NE.is_def(cls), "ms": ms, "cv": nums, "ord": declared.size()}}

func submit(s: int, uid: int, act) -> String:
	if declare_side() != s:
		return "还没轮到你"
	if not (uid in remaining[s]):
		return "这个随从这一轮已经定过了"
	if act != null:
		var a: Dictionary = act
		a.ord = declared.size()
		declared.append(a)
		res[s].ap = int(res[s].ap) - int(a.cost)
		for w in a.words:
			res[s].words[w] = int(res[s].words.get(w, 0)) - 1
		for i in a.cards:
			(res[s].cards as Array).append(i)
	else:
		passed[s].append(uid)
	remaining[s].erase(uid)
	turn = 1 - s
	return ""

func ai_step() -> void:
	var s := declare_side()
	if s == -1 or human[s]:
		return
	var pick: Dictionary = NAI.choose(self, s)
	submit(s, int(pick.uid), pick.get("act"))

# ---------------------------------------------------------------- 结算与轮末
func resolve_round() -> Array:
	R.kos = [0, 0]
	R.lost = [0, 0]
	R.fz = [0, 0]
	R.maxhit = 0
	R.ev = []
	NE.resolve(R, declared, rnd)
	last_events = R.ev
	R.ev = null
	last_declared = declared.duplicate()
	for a in declared:
		var s: int = int(a.side)
		var sd: Dictionary = sides[s]
		sd.ap = int(sd.ap) - int(a.cost)
		for w in a.words:
			sd.used[w] = int(sd.used.get(w, 0)) + 1
		for i in a.cards:
			var c: Dictionary = sd.cards[i]
			if bool(c.once):
				c["gone"] = true
			else:
				c.last = rnd
	round_notes = []
	for s in 2:
		var keep: Array = []
		for c in sides[s].cards:
			if not c.get("gone", false):
				keep.append(c)
		sides[s].cards = keep
	for s2 in 2:
		var sd2: Dictionary = sides[s2]
		if int(R.lost[s2]) >= NR.DICE_HP or int(R.kos[s2]) > 0:
			var rolls: Array = []
			for _i in NR.DICE_COUNT:
				var v := rng.randi_range(1, 6)
				rolls.append(v)
				if v > 1:
					(sd2.cards as Array).append({"v": v, "once": true, "last": -9, "src": "骰子"})
			round_notes.append({"side": s2, "type": "dice", "rolls": rolls, "why": "有随从倒下" if int(R.kos[s2]) > 0 else "这一轮掉了 %d 点血" % int(R.lost[s2])})
		var p := progress(s2)
		for i in NR.LADDER.size():
			if p >= float(NR.LADDER[i]) and not (i in sd2.lad):
				(sd2.lad as Array).append(i)
				for _k in NR.LADDER_COPIES:
					(sd2.cards as Array).append({"v": int(NR.LADDER_VALUES[i]), "once": false, "last": -9, "src": "阶梯"})
				round_notes.append({"side": s2, "type": "ladder", "value": int(NR.LADDER_VALUES[i]), "copies": NR.LADDER_COPIES, "at": float(NR.LADDER[i])})
	var p0 := progress(0)
	var p1 := progress(1)
	if p0 >= 1.0 or p1 >= 1.0:
		winner = 0 if p0 > p1 else (1 if p1 > p0 else -2)
	elif rnd >= NR.MAX_ROUNDS:
		winner = 0 if p0 > p1 else (1 if p1 > p0 else -2)
	phase = "over" if winner != -1 else "resolved"
	return last_events

func next_round() -> void:
	if phase == "resolved":
		begin_round()

# 全自动跑完（测试、批量模拟用）
func run_to_end(max_steps: int = 2000) -> void:
	var n := 0
	while phase != "over" and n < max_steps:
		n += 1
		if phase == "declare":
			var s := declare_side()
			if s == -1:
				resolve_round()
			else:
				var pick: Dictionary = NAI.choose(self, s)
				submit(s, int(pick.uid), pick.get("act"))
		elif phase == "resolved":
			next_round()

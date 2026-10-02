extends RefCounted
# 数字牌模式 · 一局的流程：开局（职业、卡组、生命）→ 每轮：轮流宣告 →（择流定目标）→ 结算 → 轮末（骰子、阶梯、胜负）

const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")
const NAI = preload("res://scripts/numcard/nc_ai.gd")

var rng := RandomNumberGenerator.new()
var rnd := 0
var first0 := 0
var sides: Array = []
var R: Dictionary = {}
var human: Array = [true, false]
var phase := "setup"            # setup / declare / assign / resolved / over
var declared: Array = []
var remaining: Array = [[], []]
var passed: Array = [[], []]
var turn := 0
var res: Array = [{}, {}]
var winner := -1                # -1 进行中；0/1；-2 平局
var last_events: Array = []
var round_notes: Array = []     # 轮末发生的事（骰子、阶梯解锁、保底数字）
var last_declared: Array = []
var stats: Array = [{}, {}]     # 天赋用了多少（测试、调平衡看）

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
	stats = [{}, {}]
	var U: Array = []
	for s in 2:
		var d: Dictionary = deck0 if s == 0 else deck1
		sides.append({"cls": str(d.cls), "ap": NR.AP_START, "deck": (d.words as Dictionary).duplicate(), "used": {}, "prev": {},
			"cards": [], "lad": []})
		for i in 3:
			U.append({"uid": s * 3 + i, "side": s, "name": NR.UNIT_NAMES[i], "glyph": NR.UNIT_GLYPHS[i], "hp": int(d.hp[i]), "mx": int(d.hp[i]),
				"down": -1, "st": {}, "kw": str(d.kws[i]), "kws": false, "mit": 0, "mitc": 0, "msrc": [], "lis": [], "last": null})
	R = NE.new_R(U, [str(deck0.cls), str(deck1.cls)])
	begin_round()

func cls_of(s: int) -> String:
	return str(sides[s].cls)

func progress(s: int) -> float:
	return NE.prog(R, s, cls_of(s))

func caps(s: int) -> Dictionary:
	return NR.caps(cls_of(s), progress(s))

func first_side() -> int:
	return (first0 + rnd - 1) % 2

func _stat(s: int, key: String, v: int = 1) -> void:
	stats[s][key] = int(stats[s].get(key, 0)) + v

# 这一方挂着的续（还没断、还有轮数的）
func conts_of(s: int) -> Array:
	var out: Array = []
	for c in R.conts:
		if int(c.side) == s:
			out.append(c)
	return out

# ---------------------------------------------------------------- 一轮开始
func begin_round() -> void:
	rnd += 1
	for u in R.U:
		u.mit = 0
		u.mitc = 0
		u.msrc = []
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
	round_notes = []
	for s in 2:
		var sd: Dictionary = sides[s]
		if rnd > 1:
			sd.ap = mini(int(sd.ap) + NR.AP_INCOME, NR.AP_CAP)
		sd.prev = sd.used
		sd.used = {}
		if NR.FLOOR.has(rnd):
			(sd.cards as Array).append({"v": int(NR.FLOOR[rnd]), "once": false, "last": -9, "src": "保底"})
			round_notes.append({"side": s, "type": "floor", "value": int(NR.FLOOR[rnd])})
		res[s] = {"ap": int(sd.ap), "words": avail_words_base(s), "cards": [], "conts": 0}
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

# 血流：这个随从这一句最多能用多少血（至少留 1 血）
func blood_room(s: int, uid: int) -> int:
	var cp := caps(s)
	if int(cp.blood) <= 0:
		return 0
	return maxi(0, mini(int(cp.blood), int(R.U[uid].hp) - 1))

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

# 把一句话补全成可以结算的行动（花费、用多少血、起手、用哪几张数字牌）。返回 {act} 或 {err}
func build_action(s: int, uid: int, cls: Array, start: int) -> Dictionary:
	if cls.is_empty():
		return {"err": "这句话是空的"}
	var cp := caps(s)
	if cls.size() > int(cp.clauses):
		return {"err": "一句最多 %d 段" % int(cp.clauses)}
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
	var cost := NE.action_cost(cls, int(cp["and"]))
	var blood := 0
	if cost > int(res[s].ap):
		blood = cost - int(res[s].ap)
		if int(cp.blood) <= 0:
			return {"err": "行动点不够（要 %d，还剩 %d）" % [cost, int(res[s].ap)]}
		if blood > blood_room(s, uid):
			return {"err": "行动点不够，用血也付不起（差 %d，这个随从最多能付 %d 血）" % [blood, blood_room(s, uid)]}
		for c0 in cls:
			if str(c0.k) == "heal":
				return {"err": "用血付的句子里不能有【恢复】"}
	var nc := NE.cont_count(cls)
	if nc > 0:
		if int(cp.slots) <= 0:
			return {"err": "只有续流能把【持续】接在伤害、恢复、减伤后面"}
		if conts_of(s).size() + int(res[s].conts) + nc > int(cp.slots):
			return {"err": "续挂满了（同时最多 %d 个）" % int(cp.slots)}
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
		if str(c.get("tmode", "")) == "late":
			continue
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
	return {"act": {"side": s, "uid": uid, "start": start, "cl": cls, "cost": cost, "blood": blood, "cards": cards, "words": words,
		"def": NE.is_def(cls), "ms": ms, "cv": nums, "ord": declared.size()}}

func submit(s: int, uid: int, act) -> String:
	if declare_side() != s:
		return "还没轮到你"
	if not (uid in remaining[s]):
		return "这个随从这一轮已经定过了"
	if act != null:
		var a: Dictionary = act
		a.ord = declared.size()
		declared.append(a)
		res[s].ap = int(res[s].ap) - mini(int(a.cost), int(res[s].ap))
		for w in a.words:
			res[s].words[w] = int(res[s].words.get(w, 0)) - 1
		for i in a.cards:
			(res[s].cards as Array).append(i)
		res[s].conts = int(res[s].conts) + NE.cont_count(a.cl)
	else:
		passed[s].append(uid)
	remaining[s].erase(uid)
	turn = 1 - s
	if remaining[0].is_empty() and remaining[1].is_empty():
		_after_declare()
	return ""

# 择流的句子里还待定的段落：[{ord, ci, cl}]
func pending_late(s: int) -> Array:
	var out: Array = []
	for a in declared:
		if int(a.side) != s:
			continue
		for ci in (a.cl as Array).size():
			var c: Dictionary = a.cl[ci]
			if str(c.get("tmode", "")) == "late" and not bool(c.get("locked", false)):
				out.append({"ord": int(a.ord), "ci": ci, "cl": c})
	return out

func _after_declare() -> void:
	# 宣告全部结束：电脑一方如果是择流，先把目标定下来；玩家是择流就进“定目标”阶段
	for s in 2:
		if not human[s] and cls_of(s) == "择":
			NAI.assign_late(self, s)
	if human[0] and cls_of(0) == "择" and not pending_late(0).is_empty():
		phase = "assign"
	elif human[1] and cls_of(1) == "择" and not pending_late(1).is_empty():
		phase = "assign"

# 玩家给择流的一段定目标
func set_late(ord: int, ci: int, tg: Array) -> void:
	for a in declared:
		if int(a.ord) == ord:
			var c: Dictionary = a.cl[ci]
			c["tg"] = tg.duplicate()
			c["locked"] = true

func finish_assign() -> void:
	if phase == "assign":
		phase = "declare"

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
	R.eff = {}
	R.retarget = [0, 0]
	R.ev = []
	NE.resolve(R, declared, rnd)
	last_events = R.ev
	R.ev = null
	last_declared = declared.duplicate()
	var blood_paid := [0, 0]
	for a in declared:
		var s: int = int(a.side)
		var sd: Dictionary = sides[s]
		sd.ap = int(sd.ap) - mini(int(a.cost), int(sd.ap))
		blood_paid[s] += int(a.get("blood", 0))
		if int(a.get("blood", 0)) > 0:
			_stat(s, "血句")
			_stat(s, "血付", int(a.blood))
		if NE.cont_count(a.cl) > 0:
			_stat(s, "续句")
		if (a.cl as Array).size() > NR.CLAUSE_MAX:
			_stat(s, "超长句")
		for c in a.cl:
			if str(c.get("tmode", "")) == "late":
				_stat(s, "待定段")
		for w in a.words:
			sd.used[w] = int(sd.used.get(w, 0)) + 1
		for i in a.cards:
			var c2: Dictionary = sd.cards[i]
			if bool(c2.once):
				c2["gone"] = true
			else:
				c2.last = rnd
	for s0 in 2:
		if int(R.retarget[s0]) > 0:
			_stat(s0, "择换人", int(R.retarget[s0]))
	for s in 2:
		var keep: Array = []
		for c3 in sides[s].cards:
			if not c3.get("gone", false):
				keep.append(c3)
		sides[s].cards = keep
	for s2 in 2:
		var sd2: Dictionary = sides[s2]
		var lost: int = int(R.lost[s2]) + (blood_paid[s2] if NR.Y_DICE else 0)
		if lost >= NR.DICE_HP or int(R.kos[s2]) > 0:
			var rolls: Array = []
			for _i in NR.DICE_COUNT:
				var v := rng.randi_range(1, 6)
				rolls.append(v)
				if v > 1:
					(sd2.cards as Array).append({"v": v, "once": true, "last": -9, "src": "骰子"})
			round_notes.append({"side": s2, "type": "dice", "rolls": rolls, "why": "有随从倒下" if int(R.kos[s2]) > 0 else "这一轮掉了 %d 点血" % lost})
		var p := progress(s2)
		for i in NR.LADDER.size():
			if p >= float(NR.LADDER[i]) and not (i in sd2.lad):
				(sd2.lad as Array).append(i)
				for _k in NR.LADDER_COPIES:
					(sd2.cards as Array).append({"v": int(NR.LADDER_VALUES[i]), "once": false, "last": -9, "src": "阶梯"})
				round_notes.append({"side": s2, "type": "ladder", "value": int(NR.LADDER_VALUES[i]), "copies": NR.LADDER_COPIES, "at": float(NR.LADDER[i])})
		var up := _talent_up(s2, p)
		if up != "":
			round_notes.append({"side": s2, "type": "talent", "text": up})
	var p0 := progress(0)
	var p1 := progress(1)
	if p0 >= 1.0 or p1 >= 1.0:
		winner = 0 if p0 > p1 else (1 if p1 > p0 else -2)
	elif rnd >= NR.MAX_ROUNDS:
		winner = 0 if p0 > p1 else (1 if p1 > p0 else -2)
	phase = "over" if winner != -1 else "resolved"
	return last_events

# 职业阶梯带来的天赋上限变化（只在跨过门槛的那一轮报一次）
func _talent_up(s: int, p: float) -> String:
	var key := "tal_%d" % s
	var cur := NR.caps(cls_of(s), p)
	var old: Dictionary = stats[s].get(key, NR.caps(cls_of(s), 0.0))
	stats[s][key] = cur
	match cls_of(s):
		"续":
			if int(cur.slots) > int(old.slots):
				return "续的上限 %d → %d 个" % [int(old.slots), int(cur.slots)]
		"血":
			if int(cur.blood) > int(old.blood):
				return "一句最多付的血 %d → %d 点" % [int(old.blood), int(cur.blood)]
		"并":
			if int(cur.clauses) > int(old.clauses):
				return "一句最多 %d → %d 段" % [int(old.clauses), int(cur.clauses)]
	return ""

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
		elif phase == "assign":
			for s2 in 2:
				if cls_of(s2) == "择":
					NAI.assign_late(self, s2)
			finish_assign()
		elif phase == "resolved":
			next_round()

extends RefCounted
# 冒险关卡的“裁判”：给一个场面（关卡）和玩家拼出的一串牌，用真实的引擎结算一轮，判断过没过。
# 玩家只管拼句子；起效时间和要选的目标由裁判从所有可能里自动找“最有利的一种”（并告诉玩家选了什么），
# 这样关卡考的是“拼出怎样的句子”，而不是点哪里。

const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
const D = preload("res://scripts/core/deck.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

const MAX_SIMS := 900

static var cache: Dictionary = {}

static func load_levels(path: String = "res://data/bootcamp.json") -> Array:
	if path == "res://data/bootcamp.json" and cache.has("levels"):
		return cache.levels
	var f := FileAccess.open(path, FileAccess.READ)
	var arr: Array = []
	if f != null:
		var p = JSON.parse_string(f.get_as_text())
		if p is Dictionary:
			arr = p.levels
	if path == "res://data/bootcamp.json":
		cache["levels"] = arr
	return arr

# JSON 里的牌：字符串 = 词；整数 = 数字；"~xxx" = 连接牌
static func tokens_from(spec: Array) -> Array:
	var out: Array = []
	for x in spec:
		if x is float or x is int:
			out.append(S.Num(int(x)))
		elif str(x).begins_with("~"):
			out.append(S.Part(str(x).substr(1)))
		else:
			out.append(S.W(str(x)))
	return out

# 这一关的标准答案在当前语言里还拼得出来吗（用了已取消的词的关卡标成“待改”）
static var _playable_cache := {}

static func is_playable(level: Dictionary) -> bool:
	var id := int(level.get("id", -1))
	if _playable_cache.has(id):
		return bool(_playable_cache[id])
	var ok := false
	var an := S.analyze(tokens_from(level.sol))
	if an.complete:
		var sk: Dictionary = G.finalize(G.skill("x", an.skills[0]))
		if G.problems(sk).is_empty():
			ok = bool(evaluate(level, tokens_from(level.sol)).win)      # 标准答案也得真的能通关（规则改了，有的关会失效）
	_playable_cache[id] = ok
	return ok

static func tray_of(level: Dictionary) -> Dictionary:
	var t := {}
	for k in level.tray:
		t[k] = int(level.tray[k])
	return t

# ---------------------------------------------------------------- 搭场面
static func _deck_side(units: Array, glyphs: Array) -> Dictionary:
	var d: Dictionary = D.new_deck()
	for i in D.COUNT:
		if i < units.size():
			var u: Dictionary = units[i]
			d.units[i].name = str(u.get("name", "无名"))
			d.units[i].glyph = str(u.get("glyph", glyphs[i % glyphs.size()]))
			d.units[i].max_hp = int(u.get("hp", 10))
			d.units[i].kw = str(u.get("kw", ""))
		else:
			# 没写的位置：不存在（让它在开局就“倒下”）
			d.units[i].name = "空位"
			d.units[i].max_hp = 1
	return d

static func build_state(level: Dictionary, player_skill: Dictionary) -> Dictionary:
	var me: Array = level.me
	var foe: Array = level.foe
	var mine := _deck_side(me, ["剑", "盾", "咒", "弓", "魂"])
	var theirs := _deck_side(foe, ["盾", "盾", "盾", "盾", "盾"])
	if not player_skill.is_empty():
		mine.units[0].skills = [player_skill.duplicate(true)]
	# 己方其余随从可以带固定技能（level.me[i].skill 是牌）
	for i in me.size():
		if i > 0 and me[i].has("skill"):
			var r := S.analyze(tokens_from(me[i].skill))
			if r.complete:
				mine.units[i].skills = [G.finalize(G.skill(str(me[i].get("skill_name", "技能")), r.skills[0]))]
	var foe_acts: Array = []
	for i in foe.size():
		if foe[i].has("act"):
			var r2 := S.analyze(tokens_from(foe[i].act.tokens))
			if r2.complete:
				theirs.units[i].skills = [G.finalize(G.skill(str(foe[i].act.get("name", "敌招")), r2.skills[0]))]
				foe_acts.append(i)
	var st := E.make_state([mine, theirs], 0, {"start_ap": int(level.get("ap", 40)), "cooldown": 0}, 4242)
	E.begin_round(st)
	st.sides[0].ap = int(level.get("ap", 40))
	st.sides[1].ap = 200
	# 不存在的位置直接倒下
	for i in range(me.size(), D.COUNT):
		st.sides[0].units[i].hp = 0
		st.sides[0].units[i].down_round = 99
	for i in range(foe.size(), D.COUNT):
		st.sides[1].units[i].hp = 0
		st.sides[1].units[i].down_round = 99
	# 初始状态 / 初始血量
	for i in foe.size():
		var fu: Dictionary = st.sides[1].units[i]
		if foe[i].has("hp_now"):
			fu.hp = int(foe[i].hp_now)
		for s in foe[i].get("statuses", []):
			fu.statuses.append({"name": str(s.name), "value": int(s.get("value", 0)), "link": -1, "until": 999, "src": 0})
		_preset_stacks(fu, foe[i])
	for i in me.size():
		var mu: Dictionary = st.sides[0].units[i]
		if me[i].has("hp_now"):
			mu.hp = int(me[i].hp_now)
		for s2 in me[i].get("statuses", []):
			mu.statuses.append({"name": str(s2.name), "value": int(s2.get("value", 0)), "link": -1, "until": 999, "src": 0})
		_preset_stacks(mu, me[i])
	return {"st": st, "foe_acts": foe_acts}

# 初始的叠层状态：{"stacks": {"易伤": 3}} 或 {"易伤": [3, 到第几轮]}
static func _preset_stacks(u: Dictionary, spec: Dictionary) -> void:
	var sp: Dictionary = spec.get("stacks", {})
	for name in sp:
		var v = sp[name]
		var lv: int = int(v[0]) if v is Array else int(v)
		var end_r: int = int(v[1]) if (v is Array and v.size() > 1) else 99
		u.stacks[str(name)] = lv
		u.stack_end[str(name)] = end_r

# 己方随从的“自动行动”（me[i].act，每轮自动宣告，比如一直在给主力叠蓄力）
static func ally_actions(level: Dictionary, st: Dictionary) -> Array:
	var out: Array = []
	for i in level.me.size():
		var f: Dictionary = level.me[i]
		if i == 0 or not f.has("act"):
			continue
		var u := E._u(st, i)
		if u.is_empty() or u.skill_ids.is_empty():
			continue
		var sid: int = int(u.skill_ids[0])
		var sk := E.skill_of(st, sid)
		var ch := {}
		for slot in G.choice_slots(sk):
			if slot.kind == "target":
				var cands := E.slot_candidates(st, 0, slot)
				var want: int = int(f.act.get("target", 0))
				var pk: int = _pick_distinct(ch, slot, cands, want)
				if pk != -1:
					ch[slot.key] = pk
			elif slot.kind == "branch":
				ch[slot.key] = int(f.act.get("branch", 0))
		var act := {"side": 0, "sid": sid, "choices": ch, "start": maxi(int(f.act.get("start", 3)), E.min_start(st, {"side": 0, "sid": sid, "choices": ch, "start": 0}))}
		out.append({"unit": i, "act": act})
	return out

# 把一个候选方案（起效时间 + 目标）从头到尾模拟一遍（可能不止一轮）
static func _run_sim(level: Dictionary, st: Dictionary, sid: int, start: int, ch: Dictionary, foe_list: Array, ally_list: Array) -> Dictionary:
	var c := E.clone_state(st)
	var rounds: int = int(level.get("rounds", 1))
	var cast_rounds: Array = level.get("cast_rounds", [])
	var events: Array = []
	for r in range(1, rounds + 1):
		if r > 1:
			E.begin_round(c)
			c.sides[0].ap = int(level.get("ap", 40))
			c.sides[1].ap = 200
		var acts: Array = []
		var casts_now: bool = cast_rounds.is_empty()
		for cr in cast_rounds:
			if int(cr) == r:
				casts_now = true
		if casts_now:
			var mine := {"side": 0, "sid": sid, "choices": ch, "start": start}
			if E.can_declare(c, mine) != "":
				return {"ok": false}
			acts.append(mine)
		for al in ally_list:
			acts.append(al.act)
		for fa in foe_list:
			acts.append(fa.act)
		E.run_round(c, acts)
		if rounds > 1:
			events.append({"type": "round_mark", "round": r})
		events.append_array(c.events)
	return {"ok": true, "state": c, "events": events}

# 为一个目标槽挑人：优先 want；同一组“选择 一个 一个 …”里已经选过的不再选
static func _pick_distinct(ch: Dictionary, slot: Dictionary, cands: Array, want: int) -> int:
	var base: String = str(slot.key).split("#")[0]
	var used: Array = []
	for k in ch:
		if str(k).split("#")[0] == base:
			used.append(int(ch[k]))
	var pool: Array = []
	for cd in cands:
		if not (int(cd) in used):
			pool.append(int(cd))
	if pool.is_empty():
		return -1
	if want in pool:
		return want
	return int(pool[0])

# 敌方已宣告的行动（可以在界面上展示）
static func foe_actions(level: Dictionary, st: Dictionary) -> Array:
	var out: Array = []
	for i in level.foe.size():
		var f: Dictionary = level.foe[i]
		if not f.has("act"):
			continue
		var uid: int = 10 + i
		var u := E._u(st, uid)
		if u.is_empty() or u.skill_ids.is_empty():
			continue
		var sid: int = int(u.skill_ids[0])
		var sk := E.skill_of(st, sid)
		var ch := {}
		for slot in G.choice_slots(sk):
			if slot.kind == "target":
				var cands := E.slot_candidates(st, 1, slot)
				var want: int = int(f.act.get("target", 0))
				var pk: int = _pick_distinct(ch, slot, cands, want)
				if pk != -1:
					ch[slot.key] = pk
			elif slot.kind == "branch":
				ch[slot.key] = int(f.act.get("branch", 0))
			else:
				ch[slot.key] = ""
		var act := {"side": 1, "sid": sid, "choices": ch, "start": maxi(int(f.act.get("start", 6)), E.min_start(st, {"side": 1, "sid": sid, "choices": ch, "start": 0}))}
		out.append({"unit": i, "act": act, "name": str(sk.name), "text": str(sk.text)})
	return out

# ---------------------------------------------------------------- 目标判定
static func goal_ok(level: Dictionary, c: Dictionary) -> Dictionary:
	var oks: Array = []
	var all := true
	for g in level.goal:
		var ok := false
		var txt := ""
		match str(g.t):
			"kill":
				ok = true
				for i in g.who:
					if int(c.sides[1].units[int(i)].hp) > 0:
						ok = false
				txt = "打倒对手的 " + "、".join((g.who as Array).map(func(i): return str(level.foe[int(i)].name)))
			"kill_all":
				ok = true
				for i in level.foe.size():
					if int(c.sides[1].units[i].hp) > 0:
						ok = false
				txt = "打倒对手全部随从"
			"alive":
				ok = true
				for i in g.who:
					if int(c.sides[0].units[int(i)].hp) <= 0:
						ok = false
				txt = "你的 " + "、".join((g.who as Array).map(func(i): return str(level.me[int(i)].name))) + " 不能倒下"
			"hp_ge":
				ok = int(c.sides[0].units[int(g.who)].hp) >= int(g.n)
				txt = "%s 的生命至少剩 %d" % [str(level.me[int(g.who)].name), int(g.n)]
			"foe_hp_le":
				ok = int(c.sides[1].units[int(g.who)].hp) <= int(g.n)
				txt = "%s 的生命降到 %d 以下" % [str(level.foe[int(g.who)].name), int(g.n)]
			"foe_hp_ge":
				ok = int(c.sides[1].units[int(g.who)].hp) >= int(g.n)
				txt = "%s 的生命不能被打到 %d 以下" % [str(level.foe[int(g.who)].name), int(g.n)]
			"all_alive":
				ok = true
				for i in level.me.size():
					if int(c.sides[0].units[i].hp) <= 0:
						ok = false
				txt = "你的随从一个都不能倒下"
			"score_ge":
				ok = int(c.sides[0].score) >= int(g.n)
				txt = "得到至少 %d 分" % int(g.n)
			"my_hp_total_ge":
				var tot := 0
				for i in level.me.size():
					tot += maxi(0, int(c.sides[0].units[i].hp))
				ok = tot >= int(g.n)
				txt = "你全队剩余生命合计至少 %d" % int(g.n)
			"foe_stack_ge":
				ok = int(c.sides[1].units[int(g.who)].stacks.get(str(g.name), 0)) >= int(g.n)
				txt = "%s 身上的【%s】至少 %d 级" % [str(level.foe[int(g.who)].name), str(g.name), int(g.n)]
			"my_stack_ge":
				ok = int(c.sides[0].units[int(g.who)].stacks.get(str(g.name), 0)) >= int(g.n)
				txt = "%s 身上的【%s】至少 %d 级" % [str(level.me[int(g.who)].name), str(g.name), int(g.n)]
			"no_foe_acts":
				ok = true
				txt = ""
		oks.append({"ok": ok, "text": txt})
		if not ok:
			all = false
	return {"all": all, "items": oks}

# ---------------------------------------------------------------- 裁判
# 返回 {ok, win, reason, start, picks, result_state, events, cost, skill, goal_items}
static func evaluate(level: Dictionary, tokens: Array) -> Dictionary:
	var out := {"ok": false, "win": false, "reason": "", "start": -1, "picks": {}, "events": [], "cost": 0, "skill": {}, "goal_items": []}
	var an := S.analyze(tokens)
	if not an.complete:
		out.reason = "这还不是一句完整的话。"
		return out
	var sk: Dictionary = G.finalize(G.skill("你的招", an.skills[0]))
	out.skill = sk
	var probs := G.problems(sk)
	if not probs.is_empty():
		out.reason = "这句话不合法：" + str(probs[0])
		return out
	var tray := tray_of(level)
	var miss := G.missing(sk.words, tray)
	if not miss.is_empty():
		var parts: Array = []
		for w in miss:
			parts.append("%s×%d" % [w, int(miss[w])])
		out.reason = "这关你手里没有这些词：" + "、".join(parts)
		return out
	out.ok = true
	out.cost = int(sk.cost)
	if int(sk.cost) > int(level.get("ap", 40)):
		out.reason = "这句话要花 %d 行动点，这关你只有 %d。" % [int(sk.cost), int(level.get("ap", 40))]
		return out
	var built := build_state(level, sk)
	var st: Dictionary = built.st
	var sid: int = int(st.sides[0].units[0].skill_ids[0])
	var skill := E.skill_of(st, sid)
	# 所有选择槽的候选组合
	var slots: Array = G.choice_slots(skill)
	var combos: Array = [{}]
	for slot in slots:
		var opts: Array = []
		if slot.kind == "target":
			opts = E.slot_candidates(st, 0, slot)
		elif slot.kind == "branch":
			opts = [0, 1]
		else:
			opts = E.slot_candidates(st, 0, slot)
			if opts.is_empty():
				opts = [""]
		if opts.is_empty():
			combos = []
			break
		var nxt: Array = []
		var multi: bool = slot.kind == "target" and int(slot.get("multi_idx", 0)) > 0
		var base: String = str(slot.key).split("#")[0]
		for c in combos:
			var added := 0
			for o in opts:
				if multi:
					var bad := false
					for k in c:
						if str(k).split("#")[0] == base and int(c[k]) >= int(o):
							bad = true
					if bad:
						continue
				var c2: Dictionary = c.duplicate()
				c2[slot.key] = o
				nxt.append(c2)
				added += 1
			if multi and added == 0:
				nxt.append(c)
		combos = nxt.slice(0, 40)
	if combos.is_empty():
		out.reason = "这句话现在找不到可以作用的对象。"
		return out
	var foe_list: Array = foe_actions(level, st)
	var ally_list: Array = ally_actions(level, st)
	var best: Dictionary = {}
	var best_score := -1.0
	var sims := 0
	var min_start := E.min_start(st, {"side": 0, "sid": sid, "choices": combos[0], "start": 0})
	for start in range(min_start, 20):
		for ch in combos:
			if sims >= MAX_SIMS:
				break
			sims += 1
			var sim := _run_sim(level, st, sid, start, ch, foe_list, ally_list)
			if not bool(sim.ok):
				continue
			var c: Dictionary = sim.state
			var g := goal_ok(level, c)
			var sc := 0.0
			for it in g.items:
				if it.ok:
					sc += 1.0
			# 次要：对手总血量越低越好
			var foe_hp := 0
			for i in level.foe.size():
				foe_hp += maxi(0, int(c.sides[1].units[i].hp))
			sc += 1.0 / (1.0 + foe_hp)
			if g.all:
				out.win = true
				out.start = start
				out.picks = ch
				out.events = sim.events
				out.goal_items = g.items
				out.result_state = c
				return out
			if sc > best_score:
				best_score = sc
				best = {"start": start, "picks": ch, "events": sim.events, "goal_items": g.items, "result_state": c}
	if not best.is_empty():
		out.start = best.start
		out.picks = best.picks
		out.events = best.events
		out.goal_items = best.goal_items
		out.result_state = best.result_state
	out.reason = "试了所有的起效时间和目标，还是没能达成目标。"
	return out

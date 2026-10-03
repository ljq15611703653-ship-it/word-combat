extends RefCounted
# 数字牌模式 · 结算引擎（从 设计与审计/数字牌模式/nc_sim2.py 移植，规则一致）
# 一轮的状态 R = {U: 6 个随从, M: 两方的得分原始值, cls: [两方职业], kob: 击倒加成, kos, fz, lost, maxhit,
#               conts: 挂着的续, eff: 这一轮兑现了的段落, ev: 事件列表或 null}
# 一句话（行动）= {side, uid, start, cl: [子句], cost, blood, cards, words, def, ord}
# 子句 = {k: atk/heal/mit/st/redirect/delay/remove, tmode: choose/self/pick/late, side, count, tg: [uid], n, rep, st, act, cont}
#   late = 择流的“待定”目标：出手时按 tg（宣告结束后定的）打，定好的人倒了自动换人
#   cont = 续流的持续轮数（>1 时，这一段以后每轮同一秒自动再来一次）

const NR = preload("res://scripts/numcard/nc_rules.gd")

static func metric0() -> Dictionary:
	return {"chain": 0.0, "cont": 0.0, "pick": 0.0, "blood": 0.0, "dmg": 0.0}

static func new_R(U: Array, cls: Array) -> Dictionary:
	return {"U": U, "M": [metric0(), metric0()], "cls": cls.duplicate(), "kob": [0.0, 0.0], "kos": [0, 0], "fz": [0, 0],
		"lost": [0, 0], "maxhit": 0, "conts": [], "eff": {}, "retarget": [0, 0], "ev": null}

static func clone_R(R: Dictionary) -> Dictionary:
	var U: Array = []
	for u in R.U:
		var v: Dictionary = u.duplicate()
		var st := {}
		for k in u.st:
			st[k] = (u.st[k] as Array).duplicate()
		v["st"] = st
		var lis: Array = []
		for l in u.lis:
			lis.append((l as Dictionary).duplicate())
		v["lis"] = lis
		v["msrc"] = (u.msrc as Array).duplicate()
		U.append(v)
	var conts: Array = []
	for c in R.conts:
		conts.append((c as Dictionary).duplicate(true))
	return {"U": U, "M": [(R.M[0] as Dictionary).duplicate(), (R.M[1] as Dictionary).duplicate()], "cls": R.cls, "kob": (R.kob as Array).duplicate(),
		"kos": [0, 0], "fz": [0, 0], "lost": [0, 0], "maxhit": 0, "conts": conts, "eff": {}, "retarget": [0, 0], "ev": null}

static func prog(R: Dictionary, s: int, cls: String) -> float:
	return float(R.M[s][NR.METRIC[cls]]) / float(NR.TARGET[cls]) + float(R.kob[s])

static func _ev(R: Dictionary, d: Dictionary) -> void:
	if R.ev != null:
		(R.ev as Array).append(d)

static func _credit(R: Dictionary, s: int, key: String, v: float) -> void:
	if v > 0:
		R.M[s][key] = float(R.M[s][key]) + v

static func _ekey(ord: int, ci: int) -> String:
	return "%d:%d" % [ord, ci]

static func dmg_to(R: Dictionary, s_src: int, tu: Dictionary, amt: int) -> int:
	if amt <= 0 or int(tu.down) != -1:
		return 0
	var dealt: int = mini(amt, int(tu.hp)) if int(tu.hp) > 0 else 0
	tu.hp = int(tu.hp) - amt
	tu.last = s_src
	if s_src != int(tu.side):
		R.M[s_src].dmg = float(R.M[s_src].dmg) + dealt
		R.lost[int(tu.side)] = int(R.lost[int(tu.side)]) + dealt
	return dealt

# 一下伤害：先加（易伤），再减（衰弱、减伤、首挡、转移），然后掉血
static func hit(R: Dictionary, a: Dictionary, ci: int, cu: Dictionary, tu: Dictionary, base: int, t: int) -> int:
	var s: int = int(a.side)
	var o: int = int(tu.side)
	if int(tu.down) != -1 or int(tu.hp) <= 0:
		return 0
	var cls: Array = R.cls
	var is_cont: bool = bool(a.get("is_cont", false))
	var enemy: bool = s != o
	var amt: int = base
	var v = tu.st.get("易伤")
	var vl: int = int(v[0]) if v != null else 0
	amt += vl
	var parts := {}
	var wk = cu.st.get("衰弱")
	if wk != null and amt > 0:
		var r: int = mini(int(wk[0]), amt)
		amt -= r
		if enemy and int(wk[2]) == o and str(cls[o]) == "续":
			_credit(R, o, "cont", r)
		if r > 0:
			parts["衰弱"] = r
	if int(tu.mit) > 0 and amt > 0:
		var r3: int = mini(int(tu.mit), amt)
		amt -= r3
		if enemy:
			for key in tu.msrc:
				R.eff[key] = true
			if str(cls[o]) == "续" and int(tu.mitc) > 0:
				_credit(R, o, "cont", mini(r3, int(tu.mitc)))
		if r3 > 0:
			parts["减伤"] = r3
	if amt > 0 and enemy and int(tu.get("shield", 0)) > 0:
		var r4: int = mini(int(tu.shield), amt)
		tu.shield = int(tu.shield) - r4
		amt -= r4
		parts["血痂"] = r4
	if amt > 0 and enemy and str(tu.kw) == "首挡" and not bool(tu.kws):
		tu.kws = true
		parts["首挡"] = amt
		amt = 0
	var back := 0
	if amt > 0 and enemy:
		for l in tu.lis:
			if str(l.k) == "redirect":
				back = amt
				amt = 0
				R.eff[str(l.src)] = true
				parts["转移"] = back
				break
	var dealt := dmg_to(R, s, tu, amt)
	if enemy and dealt > 0:
		R.eff[_ekey(int(a.ord), ci)] = true
		match str(cls[s]):
			"择":
				_credit(R, s, "pick", dealt)
			"血":
				if int(a.get("blood", 0)) > 0:
					_credit(R, s, "blood", dealt)
			"续":
				if is_cont:
					_credit(R, s, "cont", dealt)
				elif vl > 0 and int(v[2]) == s:
					_credit(R, s, "cont", mini(vl, dealt))
	_ev(R, {"t": t, "type": "hit", "src": int(cu.uid), "tgt": int(tu.uid), "amount": amt, "dealt": dealt, "parts": parts, "vuln": vl, "cont": is_cont})
	if back > 0 and int(cu.down) == -1 and int(cu.hp) > 0:
		var d2 := dmg_to(R, o, cu, back)
		if str(cls[o]) == "择":
			_credit(R, o, "pick", d2)
		_ev(R, {"t": t, "type": "redirected", "src": int(tu.uid), "tgt": int(cu.uid), "amount": back, "dealt": d2})
	return dealt

static func fizzle(R: Dictionary, a: Dictionary, t: int, why: String) -> void:
	R.fz[int(a.side)] = int(R.fz[int(a.side)]) + 1
	_ev(R, {"t": t, "type": "fizzle", "ord": int(a.ord), "uid": int(a.uid), "why": why, "cont": bool(a.get("is_cont", false))})

static func _alive(u: Dictionary) -> bool:
	return int(u.down) == -1 and int(u.hp) > 0

# 择流：出手这一刻定目标。定好的（宣告结束后玩家或电脑定的）还活着就打它们，倒了的自动换人
static func late_targets(R: Dictionary, a: Dictionary, cl: Dictionary, acts: Array) -> Array:
	var s: int = int(a.side)
	var want_enemy: bool = str(cl.get("side", "enemy")) == "enemy"
	var pool: Array = []
	for u in R.U:
		if _alive(u) and ((int(u.side) != s) == want_enemy):
			pool.append(u)
	var n: int = mini(int(cl.get("count", 1)), pool.size())
	var pre: Array = []
	for x in cl.get("tg", []):
		var uu: Dictionary = R.U[int(x)]
		if _alive(uu) and uu in pool and not (int(x) in pre) and pre.size() < n:
			pre.append(int(x))
	if pre.size() >= n:
		return pre
	if not (cl.get("tg", []) as Array).is_empty():
		R.retarget[s] = int(R.retarget[s]) + 1
	var rest: Array = []
	for u2 in pool:
		if not (int(u2.uid) in pre):
			rest.append(u2)
	var k: String = str(cl.k)
	var score := {}
	match k:
		"atk":
			# 先挑这一下能打倒的、后面还有招没出的，再挑血少的
			var pend := {}
			for b in acts:
				if not bool(b.done) and int(b.side) != s:
					pend[int(b.uid)] = int(pend.get(int(b.uid), 0)) + 1
			var rep: int = int(cl.get("rep", 1))
			for u3 in rest:
				var vv = u3.st.get("易伤")
				var eff: int = (int(cl.n) + (int(vv[0]) if vv != null else 0) - int(u3.mit)) * rep
				var kill: bool = eff >= int(u3.hp) and not (str(u3.kw) == "首挡" and not bool(u3.kws))
				score[int(u3.uid)] = (1000 if kill else 0) + (100 * int(pend.get(int(u3.uid), 0)) if kill else 0) - int(u3.hp)
		"heal":
			for u4 in rest:
				score[int(u4.uid)] = int(u4.mx) - int(u4.hp)
		"mit":
			var thr := {}
			for b2 in acts:
				if not bool(b2.done) and int(b2.side) != s:
					for c2 in b2.cl:
						if str(c2.k) == "atk":
							for x2 in c2.get("tg", []):
								thr[int(x2)] = int(thr.get(int(x2), 0)) + int(c2.n) * int(c2.get("rep", 1))
			for u5 in rest:
				score[int(u5.uid)] = 10 * int(thr.get(int(u5.uid), 0)) - int(u5.hp)
		"st":
			for u6 in rest:
				var e6 = u6.st.get(str(cl.st))
				score[int(u6.uid)] = -10 * (int(e6[0]) if e6 != null else 0) - int(u6.hp)
		_:
			for u7 in rest:
				score[int(u7.uid)] = -int(u7.hp)
	rest.sort_custom(func(x, y): return int(score[int(x.uid)]) > int(score[int(y.uid)]))
	for u8 in rest:
		if pre.size() >= n:
			break
		pre.append(int(u8.uid))
	return pre

static func fire(R: Dictionary, a: Dictionary, acts: Array, rnd: int, t: int) -> void:
	var s: int = int(a.side)
	var U: Array = R.U
	var cu: Dictionary = U[int(a.uid)]
	var cls: Array = R.cls
	var is_cont: bool = bool(a.get("is_cont", false))
	var tot := 0
	_ev(R, {"t": t, "type": "fire", "ord": int(a.ord), "uid": int(a.uid), "cont": is_cont, "side": s})
	for ci in (a.cl as Array).size():
		var cl: Dictionary = a.cl[ci]
		var k: String = str(cl.k)
		var tg: Array = cl.get("tg", [])
		if str(cl.get("tmode", "")) == "late":
			var before: Array = tg.duplicate()
			tg = late_targets(R, a, cl, acts)
			_ev(R, {"t": t, "type": "lock", "ord": int(a.ord), "uid": int(a.uid), "tgts": tg, "changed": before != tg and not before.is_empty()})
		match k:
			"atk":
				for _r in int(cl.rep):
					for tid in tg:
						tot += hit(R, a, ci, cu, U[int(tid)], int(cl.n), t)
			"heal":
				for _r in int(cl.rep):
					for tid in tg:
						var tu: Dictionary = U[int(tid)]
						if int(tu.down) != -1:
							continue
						var eff: int = mini(int(cl.n), int(tu.mx) - int(tu.hp))
						if eff > 0:
							tu.hp = int(tu.hp) + eff
							if int(tu.side) == s:
								R.eff[_ekey(int(a.ord), ci)] = true
								if str(cls[s]) == "择" and NR.Z_HEAL:
									_credit(R, s, "pick", eff)
								if str(cls[s]) == "续" and is_cont:
									_credit(R, s, "cont", eff)
							_ev(R, {"t": t, "type": "heal", "src": int(cu.uid), "tgt": int(tu.uid), "amount": eff, "cont": is_cont})
			"mit":
				for tid in tg:
					var tu2: Dictionary = U[int(tid)]
					if int(tu2.down) == -1:
						tu2.mit = int(tu2.mit) + int(cl.n)
						if is_cont:
							tu2.mitc = int(tu2.mitc) + int(cl.n)
						(tu2.msrc as Array).append(_ekey(int(a.ord), ci))
						_ev(R, {"t": t, "type": "mit", "tgt": int(tu2.uid), "amount": int(cl.n), "cont": is_cont})
			"st":
				var nm: String = str(cl.st)
				for tid in tg:
					var tu3: Dictionary = U[int(tid)]
					if int(tu3.down) != -1:
						continue
					var e = tu3.st.get(nm)
					if e != null:
						e[0] = int(e[0]) + 1
						e[1] = maxi(int(e[1]), rnd + int(cl.n) - 1)
					else:
						tu3.st[nm] = [1, rnd + int(cl.n) - 1, s]
					R.eff[_ekey(int(a.ord), ci)] = true
					_ev(R, {"t": t, "type": "status", "tgt": int(tu3.uid), "st": nm, "lv": int(tu3.st[nm][0]), "end": int(tu3.st[nm][1])})
			"redirect":
				for tid in tg:
					var tu4: Dictionary = U[int(tid)]
					if int(tu4.down) == -1:
						(tu4.lis as Array).append({"k": k, "side": s, "src": _ekey(int(a.ord), ci)})
						_ev(R, {"t": t, "type": "listen", "tgt": int(tu4.uid), "k": k})
			"delay":
				for b in acts:
					if int(b.ord) == int(cl.act) and not bool(b.done):
						b.start = int(b.start) + int(cl.n)
						R.eff[_ekey(int(a.ord), ci)] = true
						_ev(R, {"t": t, "type": "delay", "ord": int(b.ord), "sec": int(cl.n), "to": int(b.start)})
						if int(b.start) > NR.TIMELINE:
							b.done = true
							fizzle(R, b, t, "被推出了时间轴")
			"remove":
				if not tg.is_empty():
					var tu5: Dictionary = U[int(tg[0])]
					if int(tu5.down) == -1:
						var had: bool = int(tu5.mit) > 0 or not (tu5.lis as Array).is_empty()
						var keep: Array = []
						var broke := 0
						for c in R.conts:
							if int(c.uid) == int(tu5.uid):
								broke += 1
							else:
								keep.append(c)
						R.conts = keep
						tu5.lis = []
						tu5.mit = 0
						tu5.mitc = 0
						tu5.msrc = []
						if had or broke > 0:
							R.eff[_ekey(int(a.ord), ci)] = true
						_ev(R, {"t": t, "type": "remove", "tgt": int(tu5.uid), "broke": broke})
		# 续：这一段以后每轮同一秒再来一次（目标照这一次的打）
		if int(cl.get("cont", 1)) > 1 and not is_cont:
			var c2: Dictionary = cl.duplicate(true)
			c2.erase("cont")
			c2["tg"] = tg.duplicate()
			if str(c2.get("tmode", "")) == "late":
				c2["tmode"] = "choose"
			R.conts.append({"side": s, "uid": int(a.uid), "cl": c2, "start": int(a.start), "left": int(cl.cont) - 1})
			_ev(R, {"t": t, "type": "cont_set", "uid": int(a.uid), "rounds": int(cl.cont) - 1})
	if tot > int(R.maxhit):
		R.maxhit = tot

static func ko_check(R: Dictionary, rnd: int, t: int) -> void:
	for u in R.U:
		if int(u.down) == -1 and int(u.hp) <= 0:
			if str(u.kw) == "不屈" and not bool(u.kws):
				u.kws = true
				u.hp = 1
				_ev(R, {"t": t, "type": "endure", "tgt": int(u.uid)})
				continue
			u.down = rnd
			u.hp = 0
			u.st = {}
			u.lis = []
			u.mit = 0
			u.mitc = 0
			u.msrc = []
			var keep: Array = []
			var broke := 0
			for c in R.conts:
				if int(c.uid) == int(u.uid):
					broke += 1
				else:
					keep.append(c)
			R.conts = keep
			var k = u.last
			if k != null and int(k) != int(u.side):
				R.kob[int(k)] = float(R.kob[int(k)]) + NR.KO_PCT
			R.kos[int(u.side)] = int(R.kos[int(u.side)]) + 1
			_ev(R, {"t": t, "type": "ko", "tgt": int(u.uid), "by": int(k) if k != null else -1, "broke": broke})

# 挂着的续变成这一轮的“自动句”
static func cont_acts(R: Dictionary) -> Array:
	var out: Array = []
	for i in (R.conts as Array).size():
		var c: Dictionary = R.conts[i]
		out.append({"side": int(c.side), "uid": int(c.uid), "start": int(c.start), "cl": [c.cl], "is_cont": true, "ord": 1000 + i,
			"def": str(c.cl.k) in ["mit", "heal"], "blood": 0, "cost": 0})
	return out

# 结算一轮：先付血 → 按秒走时间轴（同一秒里防守类先生效；倒下的随从这一秒之后的招落空）→ 灼烧 → 并流的连段分
static func resolve(R: Dictionary, acts_in: Array, rnd: int) -> void:
	var acts: Array = []
	for a in acts_in:
		var b: Dictionary = a.duplicate()
		b["done"] = false
		acts.append(b)
	for a0 in cont_acts(R):
		a0["done"] = false
		acts.append(a0)
	var keepc: Array = []
	for c in R.conts:
		c.left = int(c.left) - 1
		if int(c.left) > 0:
			keepc.append(c)
	R.conts = keepc
	for a1 in acts:
		var bl: int = int(a1.get("blood", 0))
		if bl > 0:
			var u: Dictionary = R.U[int(a1.uid)]
			u.hp = int(u.hp) - bl
			if NR.Y_GUARD > 0.0:
				if NR.Y_SHIELD:
					u["shield"] = int(u.get("shield", 0)) + int(bl * NR.Y_GUARD)
				else:
					u.mit = int(u.mit) + int(bl * NR.Y_GUARD)
			_credit(R, int(a1.side), "blood", bl)
			_ev(R, {"t": 0, "type": "blood", "uid": int(a1.uid), "amount": bl, "ord": int(a1.ord)})
	for t in range(0, NR.TIMELINE + 1):
		var firing: Array = []
		for a2 in acts:
			if not bool(a2.done) and int(a2.start) == t:
				firing.append(a2)
		if firing.is_empty():
			continue
		firing.sort_custom(func(x, y):
			var dx := 0 if bool(x.def) else 1
			var dy := 0 if bool(y.def) else 1
			if dx != dy:
				return dx < dy
			return int(x.ord) < int(y.ord))
		for a3 in firing:
			if bool(a3.done) or int(a3.start) != t:
				continue
			a3.done = true
			if int(R.U[int(a3.uid)].down) != -1:
				fizzle(R, a3, t, "出手的随从已经倒下")
				continue
			fire(R, a3, acts, rnd, t)
		ko_check(R, rnd, t)
	for a4 in acts:
		if not bool(a4.done):
			a4.done = true
			fizzle(R, a4, NR.TIMELINE, "没赶上")
	for u2 in R.U:
		if int(u2.down) != -1:
			continue
		var bu = u2.st.get("灼烧")
		if bu != null:
			var d := dmg_to(R, int(bu[2]), u2, int(bu[0]))
			if int(bu[2]) != int(u2.side):
				match str(R.cls[int(bu[2])]):
					"续":
						_credit(R, int(bu[2]), "cont", d)
					"择":
						_credit(R, int(bu[2]), "pick", d)
			_ev(R, {"t": NR.TIMELINE + 1, "type": "burn", "tgt": int(u2.uid), "amount": int(bu[0]), "dealt": d})
	ko_check(R, rnd, NR.TIMELINE + 1)
	# 并流：两段以上的句子里兑现了几种不同的效果
	for a5 in acts_in:
		var s: int = int(a5.side)
		if str(R.cls[s]) != "并" or (a5.cl as Array).size() < 2:
			continue
		var kinds := {}
		var landed := 0
		for ci in (a5.cl as Array).size():
			if R.eff.has(_ekey(int(a5.ord), ci)):
				landed += 1
				var c5: Dictionary = a5.cl[ci]
				var kname: String = str(c5.k)
				if kname == "st" and not NR.B_STKIND:
					kname = str(c5.st)
				kinds[{"atk": "伤害", "heal": "恢复", "mit": "减伤", "st": "状态", "redirect": "转移", "delay": "延后", "remove": "移除"}.get(kname, kname)] = true
		var allin: bool = landed == (a5.cl as Array).size()
		var base_pts: int = landed if NR.B_MODE == "count" else kinds.size()
		var pts: int = base_pts + ((NR.B_BONUS + NR.B_LEN * maxi(0, (a5.cl as Array).size() - 2)) if allin else 0)
		if pts > 0:
			_credit(R, s, "chain", pts)
			_ev(R, {"t": NR.TIMELINE + 1, "type": "chain", "ord": int(a5.ord), "uid": int(a5.uid), "kinds": kinds.keys(), "landed": landed, "points": pts, "all": landed == (a5.cl as Array).size()})

# ---------------------------------------------------------------- 句子的花费、起手、数字
static func clause_words(c: Dictionary) -> Array:
	match str(c.k):
		"st":
			return [str(c.st)]
		"redirect":
			return ["转移"]
		"delay":
			return ["延后"]
		"remove":
			return ["移除"]
	return []

static func action_words(cls: Array) -> Array:
	var out: Array = []
	for c in cls:
		out.append_array(clause_words(c))
	return out

static func _cnt(c: Dictionary) -> int:
	var m: String = str(c.get("tmode", "choose"))
	if m == "self" or m == "pick":
		return 1
	if c.has("count"):
		return int(c.count)
	return (c.get("tg", []) as Array).size()

# 一句话用到的数字（>1 的才要牌）。freecount：择流的“选几个”不要牌
static func action_numbers(cls: Array, freecount: bool = false) -> Array:
	var out: Array = []
	for c in cls:
		var cnt: int = 1 if (freecount and str(c.get("tmode", "")) == "late") else _cnt(c)
		match str(c.k):
			"atk", "heal":
				out.append(cnt)
				out.append(int(c.n))
				out.append(int(c.get("rep", 1)))
			"mit", "st":
				out.append(cnt)
				out.append(int(c.n))
			"redirect":
				out.append(cnt)
			"delay":
				out.append(int(c.n))
		if int(c.get("cont", 1)) > 1:
			out.append(int(c.cont))
	var big: Array = []
	for v in out:
		if int(v) > 1:
			big.append(int(v))
	return big

static func action_cost(cls: Array, and_cost: int = NR.AND_COST) -> int:
	var cost := NR.BASE_COST + (cls.size() - 1) * and_cost
	for w in action_words(cls):
		cost += int(NR.WORDS[w].price)
	return cost

static func action_windup(cls: Array, per_clause: int = 1) -> int:
	return 1 + action_words(cls).size() + (cls.size() - 1) * per_clause

static func is_def(cls: Array) -> bool:
	for c in cls:
		if not (str(c.k) in ["mit", "redirect", "heal"]):
			return false
	return true

# 一段的动作词（并流“同一个词一句只用一次”看的就是它）
static func clause_word(c: Dictionary) -> String:
	if str(c.k) == "st":
		return str(c.st)
	return {"atk": "造成", "heal": "恢复", "mit": "减伤", "redirect": "转移", "delay": "延后", "remove": "移除"}.get(str(c.k), str(c.k))

# 职业的用词限制（输入端）：违反了返回原因，空串 = 可以
static func word_rule_problem(cls: Array, cp: Dictionary) -> String:
	if bool(cp.get("once", false)):
		var seen := {}
		for c in cls:
			var w := clause_word(c)
			if seen.has(w):
				return "并流：一句里【%s】只能用一次（换一个词接上去）" % w
			seen[w] = true
	if bool(cp.get("cont_single", false)) and cls.size() > 1 and cont_count(cls) > 0:
		return "续流：带【持续】的句子只能一段，不能接【并】"
	if bool(cp.get("norep", false)):
		for c2 in cls:
			if int(c2.get("rep", 1)) > 1:
				return "择流：句子里不能用【重复】"
	return ""

static func cont_count(cls: Array) -> int:
	var n := 0
	for c in cls:
		if int(c.get("cont", 1)) > 1:
			n += 1
	return n

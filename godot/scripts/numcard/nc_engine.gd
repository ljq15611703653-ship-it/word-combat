extends RefCounted
# 数字牌模式 · 结算引擎（从 设计与审计/数字牌模式/nc_sim.py 移植，规则一致）
# 一轮的状态 R = {U: 6 个随从, M: 两方的得分原始值, kob: 击倒加成, kos, fz, lost, maxhit, ev: 事件列表或 null}
# 一句话（行动）= {side, uid, start, cl: [子句], cost, cards, words, val, def, ord}
# 子句 = {k: atk/heal/mit/st/reflect/redirect/delay/remove, tg: [uid], n, rep, st, act}

const NR = preload("res://scripts/numcard/nc_rules.gd")

const SELF_ST := ["蓄力", "铁壁"]

static func metric0() -> Dictionary:
	return {"dmg": 0.0, "prev": 0.0, "pay": 0.0, "heal": 0.0, "ctrl": 0.0}

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
		U.append(v)
	return {"U": U, "M": [(R.M[0] as Dictionary).duplicate(), (R.M[1] as Dictionary).duplicate()], "kob": (R.kob as Array).duplicate(),
		"kos": [0, 0], "fz": [0, 0], "lost": [0, 0], "maxhit": 0, "ev": null}

static func prog(R: Dictionary, s: int, cls: String) -> float:
	return float(R.M[s][NR.METRIC[cls]]) / float(NR.TARGET[cls]) + float(R.kob[s])

static func _ev(R: Dictionary, d: Dictionary) -> void:
	if R.ev != null:
		(R.ev as Array).append(d)

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

static func _credit(R: Dictionary, s: int, key: String, v: float) -> void:
	if v > 0:
		R.M[s][key] = float(R.M[s][key]) + v

# 一下伤害：先加（蓄力、易伤），再减（衰弱、铁壁、减伤、首挡、转移），然后掉血，最后回敬
static func hit(R: Dictionary, s: int, cu: Dictionary, tu: Dictionary, base: int, chg_l: int, t: int) -> int:
	var o: int = int(tu.side)
	if int(tu.down) != -1 or int(tu.hp) <= 0:
		return 0
	var enemy: bool = s != o
	var amt: int = base + chg_l
	var v = tu.st.get("易伤")
	var vl: int = int(v[0]) if v != null else 0
	amt += vl
	var parts := {}
	var wk = cu.st.get("衰弱")
	if wk != null and amt > 0:
		var r: int = mini(int(wk[0]), amt)
		amt -= r
		if enemy and int(wk[2]) == o:
			_credit(R, o, "prev", r)
			_credit(R, o, "pay", r)
			_credit(R, o, "ctrl", r)
		if r > 0:
			parts["衰弱"] = r
	var w = tu.st.get("铁壁")
	if w != null and amt > 0:
		var r2: int = mini(int(w[0]), amt)
		amt -= r2
		if enemy:
			_credit(R, o, "prev", r2)
			_credit(R, o, "pay", r2)
		if r2 > 0:
			parts["铁壁"] = r2
	if int(tu.mit) > 0 and amt > 0:
		var r3: int = mini(int(tu.mit), amt)
		amt -= r3
		if enemy:
			_credit(R, o, "prev", r3)
		if r3 > 0:
			parts["减伤"] = r3
	if amt > 0 and enemy and str(tu.kw) == "首挡" and not bool(tu.kws):
		tu.kws = true
		_credit(R, o, "prev", amt)
		parts["首挡"] = amt
		amt = 0
	var back := 0
	if amt > 0 and enemy:
		for l in tu.lis:
			if str(l.k) == "redirect":
				var c: int = amt if l.cap == null else mini(amt, int(l.cap))
				amt -= c
				back += c
				_credit(R, o, "prev", c)
				parts["转移"] = c
				break
	var dealt := dmg_to(R, s, tu, amt)
	if enemy and dealt > 0:
		if chg_l > 0:
			_credit(R, s, "pay", mini(chg_l, dealt))
		if vl > 0 and int(v[2]) == s:
			_credit(R, s, "pay", mini(vl, dealt))
	_ev(R, {"t": t, "type": "hit", "src": int(cu.uid), "tgt": int(tu.uid), "amount": amt, "dealt": dealt, "parts": parts, "chg": chg_l, "vuln": vl})
	if back > 0 and int(cu.down) == -1 and int(cu.hp) > 0:
		var d2 := dmg_to(R, o, cu, back)
		_ev(R, {"t": t, "type": "redirected", "src": int(tu.uid), "tgt": int(cu.uid), "amount": back, "dealt": d2})
	if enemy and amt > 0 and int(cu.down) == -1 and int(cu.hp) > 0:
		for l in tu.lis:
			if str(l.k) == "reflect":
				var bk: int = amt if l.cap == null else mini(amt, int(l.cap))
				var d3 := dmg_to(R, o, cu, bk)
				_ev(R, {"t": t, "type": "reflected", "src": int(tu.uid), "tgt": int(cu.uid), "amount": bk, "dealt": d3})
				break
	return dealt

static func fizzle(R: Dictionary, a: Dictionary, t: int, why: String) -> void:
	_credit(R, 1 - int(a.side), "ctrl", float(a.val))
	R.fz[int(a.side)] = int(R.fz[int(a.side)]) + 1
	_ev(R, {"t": t, "type": "fizzle", "ord": int(a.ord), "uid": int(a.uid), "why": why})

static func fire(R: Dictionary, a: Dictionary, acts: Array, rnd: int, t: int) -> void:
	var s: int = int(a.side)
	var U: Array = R.U
	var cu: Dictionary = U[int(a.uid)]
	var tot := 0
	_ev(R, {"t": t, "type": "fire", "ord": int(a.ord), "uid": int(a.uid)})
	for cl in a.cl:
		var k: String = str(cl.k)
		match k:
			"atk":
				var chg = cu.st.get("蓄力")
				var cl_ := 0
				if chg != null:
					cl_ = int(chg[0])
					cu.st.erase("蓄力")
				for _r in int(cl.rep):
					for tid in cl.tg:
						tot += hit(R, s, cu, U[int(tid)], int(cl.n), cl_, t)
			"heal":
				for _r in int(cl.rep):
					for tid in cl.tg:
						var tu: Dictionary = U[int(tid)]
						if int(tu.down) != -1:
							continue
						var eff: int = mini(int(cl.n), int(tu.mx) - int(tu.hp))
						if eff > 0:
							tu.hp = int(tu.hp) + eff
							if int(tu.side) == s:
								_credit(R, s, "heal", eff)
							_ev(R, {"t": t, "type": "heal", "src": int(cu.uid), "tgt": int(tu.uid), "amount": eff})
			"mit":
				for tid in cl.tg:
					var tu2: Dictionary = U[int(tid)]
					if int(tu2.down) == -1:
						tu2.mit = int(tu2.mit) + int(cl.n)
						tu2.mitv = float(tu2.mitv) + float(a.val) / float(cl.tg.size())
						_ev(R, {"t": t, "type": "mit", "tgt": int(tu2.uid), "amount": int(cl.n)})
			"st":
				var nm: String = str(cl.st)
				for tid in cl.tg:
					var tu3: Dictionary = U[int(tid)]
					if int(tu3.down) != -1:
						continue
					var e = tu3.st.get(nm)
					if e != null:
						e[0] = int(e[0]) + 1
						e[1] = maxi(int(e[1]), rnd + int(cl.n) - 1)
					else:
						tu3.st[nm] = [1, rnd + int(cl.n) - 1, s]
					_ev(R, {"t": t, "type": "status", "tgt": int(tu3.uid), "st": nm, "lv": int(tu3.st[nm][0]), "end": int(tu3.st[nm][1])})
			"reflect", "redirect":
				for tid in cl.tg:
					var tu4: Dictionary = U[int(tid)]
					if int(tu4.down) == -1:
						(tu4.lis as Array).append({"k": k, "cap": cl.get("cap"), "side": s, "val": float(a.val) / float(cl.tg.size())})
						_ev(R, {"t": t, "type": "listen", "tgt": int(tu4.uid), "k": k})
			"delay":
				for b in acts:
					if int(b.ord) == int(cl.act) and not bool(b.done):
						b.start = int(b.start) + int(cl.n)
						_credit(R, s, "ctrl", int(cl.n))
						_ev(R, {"t": t, "type": "delay", "ord": int(b.ord), "sec": int(cl.n), "to": int(b.start)})
						if int(b.start) > NR.TIMELINE:
							b.done = true
							fizzle(R, b, t, "被推出了时间轴")
			"remove":
				var tu5: Dictionary = U[int(cl.tg[0])]
				if int(tu5.down) == -1:
					var val: float = float(tu5.mitv)
					for l in tu5.lis:
						val += float(l.val)
					for nm2 in SELF_ST:
						var e2 = tu5.st.get(nm2)
						if e2 != null and int(e2[2]) == int(tu5.side):
							val += float(e2[0])
							tu5.st.erase(nm2)
					tu5.lis = []
					tu5.mit = 0
					tu5.mitv = 0.0
					_credit(R, s, "ctrl", val)
					_ev(R, {"t": t, "type": "remove", "tgt": int(tu5.uid), "value": val})
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
			var k = u.last
			if k != null and int(k) != int(u.side):
				R.kob[int(k)] = float(R.kob[int(k)]) + NR.KO_PCT
			R.kos[int(u.side)] = int(R.kos[int(u.side)]) + 1
			_ev(R, {"t": t, "type": "ko", "tgt": int(u.uid), "by": int(k) if k != null else -1})

# 结算一轮：按秒走时间轴；同一秒里防守类先生效；倒下的随从这一秒之后的招落空；最后灼烧
static func resolve(R: Dictionary, acts_in: Array, rnd: int) -> void:
	var acts: Array = []
	for a in acts_in:
		var b: Dictionary = a.duplicate()
		b["done"] = false
		acts.append(b)
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
	for u in R.U:
		if int(u.down) != -1:
			continue
		var bu = u.st.get("灼烧")
		if bu != null:
			var d := dmg_to(R, int(bu[2]), u, int(bu[0]))
			if int(bu[2]) != int(u.side):
				_credit(R, int(bu[2]), "pay", d)
			_ev(R, {"t": NR.TIMELINE + 1, "type": "burn", "tgt": int(u.uid), "amount": int(bu[0]), "dealt": d})
	ko_check(R, rnd, NR.TIMELINE + 1)

# ---------------------------------------------------------------- 句子的花费、起手、价值
static func action_words(cls: Array) -> Array:
	var out: Array = []
	for c in cls:
		match str(c.k):
			"st":
				out.append(str(c.st))
			"reflect":
				out.append("回敬")
			"redirect":
				out.append("转移")
			"delay":
				out.append("延后")
			"remove":
				out.append("移除")
	return out

static func _cnt(c: Dictionary) -> int:
	var m: String = str(c.get("tmode", "choose"))
	if m == "self" or m == "pick":
		return 1
	if c.has("count"):
		return int(c.count)
	return (c.get("tg", []) as Array).size()

# 一句话用到的数字（>1 的才要牌）
static func action_numbers(cls: Array) -> Array:
	var out: Array = []
	for c in cls:
		match str(c.k):
			"atk", "heal":
				out.append(_cnt(c))
				out.append(int(c.n))
				out.append(int(c.rep))
			"mit":
				out.append(_cnt(c))
				out.append(int(c.n))
			"st":
				out.append(_cnt(c))
				out.append(int(c.n))
			"reflect", "redirect":
				out.append(_cnt(c))
			"delay":
				out.append(int(c.n))
	var big: Array = []
	for v in out:
		if int(v) > 1:
			big.append(int(v))
	return big

static func action_cost(cls: Array) -> int:
	var cost := NR.BASE_COST + (cls.size() - 1) * NR.AND_COST
	for w in action_words(cls):
		cost += int(NR.WORDS[w].price)
	return cost

static func action_windup(cls: Array) -> int:
	return 1 + action_words(cls).size() + (cls.size() - 1)

static func is_def(cls: Array) -> bool:
	for c in cls:
		var k: String = str(c.k)
		if k in ["mit", "reflect", "redirect", "heal"]:
			continue
		if k == "st" and str(c.st) in SELF_ST:
			continue
		return false
	return true

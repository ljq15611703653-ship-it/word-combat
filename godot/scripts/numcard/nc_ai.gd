extends RefCounted
# 数字牌模式 · 电脑：每次定一个随从的一句。把每个候选放进“这一轮已经宣告的所有句子”里模拟一遍，
# 按 自己完成度 − 对方完成度、血量、状态、挂着的续、残血随从的风险 打分，减去花掉的行动点和数字牌。
# 先试单段，再把每种效果最好的几段用“并”连起来试；最好的几个再换几个起手秒数试。
# 择流：双方宣告完以后，逐段试每种目标组合，挑整轮模拟下来最好的。
# 和 设计与审计/数字牌模式/nc_sim2.py 的电脑是同一套逻辑。

const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")

const PASS_GAIN := 0.3
const KO_LOOK := 0.5
const DANGER_HP := 4
const DANGER_W := 1.0
const CONT_LOOK := 0.6
const COMBO_K := 6
const REP_MAX := 3

static func stat_value(R: Dictionary, s: int) -> float:
	var v := 0.0
	for u in R.U:
		if int(u.down) != -1:
			continue
		for nm in u.st:
			var e: Array = u.st[nm]
			if int(e[2]) == s:
				v += float(e[0])
	return v

# 还没放完的续，将来大概值多少
static func cont_value(R: Dictionary, s: int) -> float:
	var v := 0.0
	for c in R.conts:
		if int(c.side) != s:
			continue
		var cl: Dictionary = c.cl
		var cnt: int = int(cl.get("count", (cl.get("tg", [1]) as Array).size()))
		v += float(int(cl.get("n", 1)) * maxi(1, cnt) * int(cl.get("rep", 1)) * int(c.left))
	return v * CONT_LOOK

static func util(M, R: Dictionary, s: int) -> float:
	var c0: String = M.cls_of(s)
	var c1: String = M.cls_of(1 - s)
	var ps: float = NE.prog(R, s, c0)
	var po: float = NE.prog(R, 1 - s, c1)
	var u := 100.0 * (ps - po)
	var hs := 0
	var ho := 0
	for x in R.U:
		if int(x.down) == -1:
			if int(x.side) == s:
				hs += int(x.hp)
			else:
				ho += int(x.hp)
	u += 0.8 * float(hs - ho)
	u += 0.6 * (stat_value(R, s) - stat_value(R, 1 - s))
	var w0: float = 100.0 / float(NR.TARGET[c0]) if c0 == "续" else 0.5
	var w1: float = 100.0 / float(NR.TARGET[c1]) if c1 == "续" else 0.5
	u += cont_value(R, s) * w0 - cont_value(R, 1 - s) * w1
	var kp := NR.KO_PCT * 100.0 * KO_LOOK
	for x2 in R.U:
		if int(x2.down) == -1:
			var frac := 1.0 - float(x2.hp) / float(x2.mx)
			# 残血的随从下一轮很容易被收掉：额外算一份风险
			var danger: float = maxf(0.0, float(DANGER_HP - int(x2.hp)) / float(DANGER_HP)) * DANGER_W
			u += kp * (frac + danger) if int(x2.side) != s else -kp * (frac + danger)
	if ps >= 1.0 or po >= 1.0:
		u += 500.0 if ps > po else (-500.0 if po > ps else 0.0)
	return u

static func _ids(pool: Array) -> Array:
	var ids: Array = []
	for u in pool:
		ids.append(int(u.uid))
	return ids

static func _tsets(pool: Array, n: int, late: bool) -> Array:
	if late:
		return [null]
	var ids := _ids(pool)
	if ids.is_empty():
		return []
	if n >= ids.size():
		return [ids]
	if n == 1:
		var o: Array = [[ids[0]], [ids[ids.size() - 1]]]
		if ids.size() > 2:
			o.append([ids[1]])
		return o
	return [[ids[0], ids[1]], [ids[0], ids[ids.size() - 1]]]

static func _cl(k: String, side: String, tg, n: int, extra: Dictionary) -> Dictionary:
	var d := {"k": k, "side": side, "count": n}
	if tg == null:
		d["tmode"] = "late"
		d["tg"] = []
	else:
		d["tmode"] = "choose"
		d["tg"] = tg
	d.merge(extra, true)
	return d

# 单段候选：[[段], start 或 -1]
static func singles(M, s: int, uid: int, cp: Dictionary) -> Array:
	var R: Dictionary = M.R
	var U: Array = R.U
	var late: bool = bool(cp.late)
	var E: Array = []
	var F: Array = []
	for u in U:
		if int(u.down) == -1:
			if int(u.side) != s:
				E.append(u)
			else:
				F.append(u)
	E.sort_custom(func(a, b): return int(a.hp) < int(b.hp))
	var vals: Array = M.usable_values(s).keys()
	vals.sort()
	vals.reverse()
	var opts: Array = [1]
	for i in mini(2, vals.size()):
		opts.append(int(vals[i]))
	var enemy_acts: Array = []
	for a in M.declared:
		if int(a.side) != s:
			enemy_acts.append(a)
	var thr := {}
	for a2 in enemy_acts:
		for c in a2.cl:
			if str(c.k) == "atk":
				if str(c.get("tmode", "")) == "late":
					for u0 in F:
						thr[int(u0.uid)] = int(thr.get(int(u0.uid), 0)) + 1
				for t in c.get("tg", []):
					thr[int(t)] = int(thr.get(int(t), 0)) + 1
	var fs: Array = F.duplicate()
	fs.sort_custom(func(a, b):
		var ta: int = int(thr.get(int(a.uid), 0))
		var tb: int = int(thr.get(int(b.uid), 0))
		if ta != tb:
			return ta > tb
		return int(a.hp) < int(b.hp))
	var threat_order := _ids(fs)
	var conts: Array = [1]
	if int(cp.slots) > 0:
		for i2 in mini(2, vals.size()):
			if int(vals[i2]) > 1:
				conts.append(int(vals[i2]))
	var words: Dictionary = M.res[s].words
	var out: Array = []
	# 攻击：几个目标 × 几点 × 几次 ×（续几轮）
	if not E.is_empty():
		for n in opts:
			if int(n) > E.size():
				continue
			for d in opts:
				var reps: Array = [1]
				if not vals.is_empty() and int(vals[0]) > 1 and int(vals[0]) <= REP_MAX:
					reps.append(int(vals[0]))
				for r in reps:
					for tg in _tsets(E, int(n), late):
						for ct in conts:
							out.append([[_cl("atk", "enemy", tg, int(n), {"n": int(d), "rep": int(r), "cont": int(ct)})], -1])
	# 治疗
	var hurt: Array = []
	for u3 in F:
		if int(u3.hp) < int(u3.mx):
			hurt.append(u3)
	hurt.sort_custom(func(a, b): return int(a.hp) - int(a.mx) < int(b.hp) - int(b.mx))
	if not hurt.is_empty() or int(cp.slots) > 0:
		for n2 in opts:
			if int(n2) > F.size():
				continue
			for amt in opts:
				var tg2: Array = []
				for u4 in hurt:
					if tg2.size() < int(n2):
						tg2.append(int(u4.uid))
				for u5 in F:
					if tg2.size() < int(n2) and not (int(u5.uid) in tg2):
						tg2.append(int(u5.uid))
				for ct2 in conts:
					if hurt.is_empty() and int(ct2) == 1:
						continue
					out.append([[_cl("heal", "ally", null if late else tg2, int(n2), {"n": int(amt), "rep": 1, "cont": int(ct2)})], -1])
	# 减伤
	if not enemy_acts.is_empty() or int(cp.slots) > 0:
		for n3 in opts:
			if int(n3) > F.size():
				continue
			for amt2 in opts:
				for ct3 in conts:
					out.append([[_cl("mit", "ally", null if late else threat_order.slice(0, int(n3)), int(n3), {"n": int(amt2), "cont": int(ct3)})], -1])
	# 状态
	for nm in NR.ENEMY_ST:
		if int(words.get(nm, 0)) <= 0 or E.is_empty():
			continue
		for n4 in opts:
			if int(n4) > E.size():
				continue
			for dur in opts:
				for tg3 in _tsets(E, int(n4), late):
					out.append([[_cl("st", "enemy", tg3, int(n4), {"st": nm, "n": int(dur)})], -1])
	# 转移
	if int(words.get("转移", 0)) > 0 and not enemy_acts.is_empty():
		for n5 in opts:
			if int(n5) > F.size():
				continue
			out.append([[_cl("redirect", "ally", null if late else threat_order.slice(0, int(n5)), int(n5), {})], -1])
	# 延后
	if int(words.get("延后", 0)) > 0:
		for a4 in enemy_acts:
			for sec in opts:
				if 2 < int(a4.start):
					out.append([[{"k": "delay", "act": int(a4.ord), "n": int(sec), "tg": [], "side": "enemy", "count": 1}], 2])
	# 移除（拆保护、掐断续）
	if int(words.get("移除", 0)) > 0:
		for u7 in E:
			var has_cont := false
			for c3 in R.conts:
				if int(c3.uid) == int(u7.uid):
					has_cont = true
			if not (u7.lis as Array).is_empty() or int(u7.mit) > 0 or has_cont:
				out.append([[{"k": "remove", "tg": [int(u7.uid)], "tmode": "pick", "side": "enemy", "count": 1}], -1])
		for a5 in enemy_acts:
			for c2 in a5.cl:
				if str(c2.k) in ["mit", "redirect"] and not (c2.get("tg", []) as Array).is_empty():
					if int(a5.start) + 1 <= NR.TIMELINE:
						out.append([[{"k": "remove", "tg": [int(c2.tg[0])], "tmode": "pick", "side": "enemy", "count": 1}], int(a5.start) + 1])
	return out

static func _make(M, s: int, uid: int, cl_list: Array, start: int) -> Variant:
	var ms := NE.action_windup(cl_list, int(M.caps(s).wind))
	var st: int = ms if start < 0 else maxi(start, ms)
	if st > NR.TIMELINE:
		return null
	var r: Dictionary = M.build_action(s, uid, cl_list, st)
	if r.has("err"):
		return null
	return r.act

static func _kind(c: Dictionary) -> String:
	return str(c.st) if str(c.k) == "st" else str(c.k)

# 一个随从的所有候选，按估值从高到低：[[估值, 行动], ...]
static func candidates(M, s: int, uid: int, noise: bool = true) -> Array:
	var R0: Dictionary = M.R
	var cp: Dictionary = M.caps(s)
	var cards: Array = M.sides[s].cards
	var enemy_starts: Array = []
	for a in M.declared:
		if int(a.side) != s and not (int(a.start) in enemy_starts):
			enemy_starts.append(int(a.start))
	var evaluate := func(act: Dictionary) -> float:
		act["ord"] = M.declared.size()
		var R2 := NE.clone_R(R0)
		NE.resolve(R2, M.declared + [act], M.rnd)
		var v := util(M, R2, s) - 0.6 * float(act.cost)
		for i in act.cards:
			v -= (0.5 if bool(cards[i].once) else 0.25) * float(cards[i].v)
		return v + (M.rng.randf() * 0.3 if noise else 0.0)
	var local: Array = []
	for item in singles(M, s, uid, cp):
		var a = _make(M, s, uid, item[0], int(item[1]))
		if a == null:
			continue
		local.append([evaluate.call(a), a])
	local.sort_custom(func(x, y): return float(x[0]) > float(y[0]))
	# 拼多段：每种效果先各拿最好的一个，再按分数补满，两两三三连起来
	if int(cp.clauses) >= 2:
		var top: Array = []
		var kinds := {}
		for it in local:
			var c0: Dictionary = it[1].cl[0]
			if str(c0.k) == "delay" or kinds.has(_kind(c0)) or top.size() >= COMBO_K:
				continue
			kinds[_kind(c0)] = true
			top.append(it[1])
		for it2 in local:
			if top.size() >= COMBO_K:
				break
			if str(it2[1].cl[0].k) == "delay" or it2[1] in top:
				continue
			top.append(it2[1])
		for size in range(2, mini(int(cp.clauses), top.size()) + 1):
			for comb in _combos(top.size(), size):
				var cl_list: Array = []
				for idx in comb:
					for c1 in top[idx].cl:
						cl_list.append((c1 as Dictionary).duplicate(true))
				var a2 = _make(M, s, uid, cl_list, -1)
				if a2 != null:
					local.append([evaluate.call(a2), a2])
		# 一大串 1 点
		var E: Array = []
		for u in R0.U:
			if int(u.side) != s and int(u.down) == -1:
				E.append(u)
		if not E.is_empty():
			E.sort_custom(func(x, y): return int(x.hp) < int(y.hp))
			for kk in range(2, int(cp.clauses) + 1):
				var chain: Array = []
				for j in kk:
					chain.append(_cl("atk", "enemy", null if bool(cp.late) else [int(E[j % E.size()].uid)], 1, {"n": 1, "rep": 1}))
				var a3 = _make(M, s, uid, chain, -1)
				if a3 != null:
					local.append([evaluate.call(a3), a3])
	local.sort_custom(func(x, y): return float(x[0]) > float(y[0]))
	# 起手秒数：前几名再试几个时间
	var extra: Array = []
	for it3 in local.slice(0, 4):
		var a4: Dictionary = it3[1]
		if str(a4.cl[0].k) == "delay":
			continue
		var sts := {int(a4.ms) + 1: true}
		for t in enemy_starts:
			if int(t) >= int(a4.ms):
				sts[int(t)] = true
			if int(t) - 1 >= int(a4.ms):
				sts[int(t) - 1] = true
		for st in sts:
			if int(st) > NR.TIMELINE or int(st) == int(a4.start):
				continue
			var b: Dictionary = a4.duplicate()
			b.start = int(st)
			extra.append([evaluate.call(b), b])
	local.append_array(extra)
	local.sort_custom(func(x, y): return float(x[0]) > float(y[0]))
	return local

# 这一轮什么都不做时的估值（比较“出手值不值”用）
static func base_util(M, s: int) -> float:
	var base_R := NE.clone_R(M.R)
	NE.resolve(base_R, M.declared, M.rnd)
	return util(M, base_R, s)

# 返回 {"uid": 随从, "act": 行动或 null（这个随从这一轮不出手）}
static func choose(M, s: int) -> Dictionary:
	var u0 := base_util(M, s)
	var best = null
	var best_v := -1.0e9
	var worst_uid := -1
	var worst_gain := 1.0e9
	for uid in M.remaining[s]:
		var local := candidates(M, s, int(uid))
		var lb: float = float(local[0][0]) if not local.is_empty() else -1.0e9
		if not local.is_empty() and lb > best_v:
			best_v = lb
			best = local[0][1]
		var g := lb - u0
		if g < worst_gain:
			worst_gain = g
			worst_uid = int(uid)
	if best == null or best_v - u0 < PASS_GAIN:
		return {"uid": worst_uid if worst_uid != -1 else int(M.remaining[s][0]), "act": null}
	return {"uid": int(best.uid), "act": best}

# 给玩家的拼句建议（辅助轮）：这个随从估值最高的几句，人话不重复。[{act, gain}]
static func suggest(M, s: int, uid: int, k: int = 3) -> Array:
	var u0 := base_util(M, s)
	var out: Array = []
	var seen := {}
	for it in candidates(M, s, uid, false):
		var a: Dictionary = it[1]
		var key := str(a.cl)
		if seen.has(key):
			continue
		seen[key] = true
		out.append({"act": a, "gain": float(it[0]) - u0})
		if out.size() >= k:
			break
	return out

# n 个里挑 k 个的所有组合（下标）
static func _combos(n: int, k: int) -> Array:
	var out: Array = []
	var cur: Array = []
	_comb_rec(0, n, k, cur, out)
	return out

static func _comb_rec(i: int, n: int, k: int, cur: Array, out: Array) -> void:
	if cur.size() == k:
		out.append(cur.duplicate())
		return
	for j in range(i, n):
		cur.append(j)
		_comb_rec(j + 1, n, k, cur, out)
		cur.pop_back()

# 择流：宣告全部结束后，把每段“待定”的目标定下来（按出手先后逐段试，模拟整轮挑最好的）
static func assign_late(M, s: int) -> void:
	var order: Array = []
	for a in M.declared:
		if int(a.side) == s:
			order.append(a)
	order.sort_custom(func(x, y):
		if int(x.start) != int(y.start):
			return int(x.start) < int(y.start)
		return int(x.ord) < int(y.ord))
	for a2 in order:
		for c in a2.cl:
			if str(c.get("tmode", "")) != "late" or bool(c.get("locked", false)):
				continue
			var pool: Array = []
			for u in M.R.U:
				if int(u.down) == -1 and ((int(u.side) != s) == (str(c.side) == "enemy")):
					pool.append(int(u.uid))
			var n: int = mini(int(c.count), pool.size())
			var best: Array = []
			var bv := -1.0e9
			for comb in _combos(pool.size(), n):
				var tg: Array = []
				for i in comb:
					tg.append(pool[i])
				c["tg"] = tg
				var R2 := NE.clone_R(M.R)
				NE.resolve(R2, M.declared, M.rnd)
				var v := util(M, R2, s)
				if v > bv:
					bv = v
					best = tg
			c["tg"] = best
			c["locked"] = true

# 给玩家的建议（择流定目标界面用）：同一套模拟，返回这一段最好的目标
static func suggest_late(M, s: int, ord: int, ci: int) -> Array:
	for a in M.declared:
		if int(a.ord) != ord:
			continue
		var c: Dictionary = a.cl[ci]
		var keep: Array = (c.get("tg", []) as Array).duplicate()
		var pool: Array = []
		for u in M.R.U:
			if int(u.down) == -1 and ((int(u.side) != s) == (str(c.side) == "enemy")):
				pool.append(int(u.uid))
		var n: int = mini(int(c.count), pool.size())
		var best: Array = []
		var bv := -1.0e9
		for comb in _combos(pool.size(), n):
			var tg: Array = []
			for i in comb:
				tg.append(pool[i])
			c["tg"] = tg
			var R2 := NE.clone_R(M.R)
			NE.resolve(R2, M.declared, M.rnd)
			var v := util(M, R2, s)
			if v > bv:
				bv = v
				best = tg
		c["tg"] = keep
		return best
	return []

extends RefCounted
# 数字牌模式 · 电脑：每次定一个随从的一句。把每个候选放进“这一轮已经宣告的所有句子”里模拟一遍，
# 按 自己完成度 − 对方完成度、血量、状态、将来击倒的价值 打分，减去花掉的行动点和数字牌。
# 和 设计与审计/数字牌模式/nc_sim.py 的电脑是同一套逻辑。

const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")

const PASS_GAIN := 0.3
const KO_LOOK := 0.5
const ENEMY_ST := ["易伤", "灼烧", "衰弱"]
const SELF_ST := ["蓄力", "铁壁"]

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

static func util(M, R: Dictionary, s: int) -> float:
	var ps: float = NE.prog(R, s, M.cls_of(s))
	var po: float = NE.prog(R, 1 - s, M.cls_of(1 - s))
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
	var kp := NR.KO_PCT * 100.0 * KO_LOOK
	for x2 in R.U:
		if int(x2.down) == -1:
			var frac := 1.0 - float(x2.hp) / float(x2.mx)
			u += kp * frac if int(x2.side) != s else -kp * frac
	if ps >= 1.0 or po >= 1.0:
		u += 500.0 if ps > po else (-500.0 if po > ps else 0.0)
	return u

static func _tsets(pool: Array, n: int) -> Array:
	var ids: Array = []
	for u in pool:
		ids.append(int(u.uid))
	if ids.is_empty():
		return []
	if n >= ids.size():
		return [ids]
	if n == 1:
		return [[ids[0]], [ids[ids.size() - 1]]] if ids.size() > 1 else [[ids[0]]]
	return [[ids[0], ids[1]], [ids[0], ids[ids.size() - 1]]]

static func gen_cands(M, s: int, uid: int) -> Array:
	var R: Dictionary = M.R
	var U: Array = R.U
	var cls: String = M.cls_of(s)
	var E: Array = []
	var F: Array = []
	for u in U:
		if int(u.down) == -1:
			if int(u.side) != s:
				E.append(u)
			else:
				F.append(u)
	E.sort_custom(func(a, b): return int(a.hp) < int(b.hp))
	if E.is_empty() and F.is_empty():
		return []
	var vals: Array = M.usable_values(s).keys()
	vals.sort()
	vals.reverse()
	var opts: Array = [1]
	for i in mini(2, vals.size()):
		opts.append(int(vals[i]))
	var enemy_acts: Array = []
	var my_acts: Array = []
	for a in M.declared:
		if int(a.side) != s:
			enemy_acts.append(a)
	var threatened := {}
	for a2 in enemy_acts:
		for c in a2.cl:
			if str(c.k) == "atk":
				for t in c.tg:
					if int(U[int(t)].side) == s:
						threatened[int(t)] = int(threatened.get(int(t), 0)) + 1
	var fs: Array = F.duplicate()
	fs.sort_custom(func(a, b): return int(threatened.get(int(a.uid), 0)) > int(threatened.get(int(b.uid), 0)))
	var threat_order: Array = []
	for u2 in fs:
		threat_order.append(int(u2.uid))
	var starts_extra: Array = []
	for a3 in enemy_acts:
		if not (int(a3.start) in starts_extra):
			starts_extra.append(int(a3.start))
	var out: Array = []
	var words: Dictionary = M.res[s].words
	var ap_left: int = int(M.res[s].ap)
	var add := func(cl_list: Array, start_opts: Array) -> void:
		var cost := NE.action_cost(cl_list)
		if cost > ap_left:
			return
		var need := {}
		for w in NE.action_words(cl_list):
			need[w] = int(need.get(w, 0)) + 1
		for w2 in need:
			if int(words.get(w2, 0)) < int(need[w2]):
				return
		var nums := NE.action_numbers(cl_list)
		var cards = M.pick_cards(s, nums)
		if cards == null:
			return
		var ms := NE.action_windup(cl_list)
		if ms > NR.TIMELINE:
			return
		var sts: Array = start_opts
		if sts.is_empty():
			var so := [ms, ms + 1]
			for t2 in starts_extra:
				if int(t2) - 1 >= ms and not ((int(t2) - 1) in so):
					so.append(int(t2) - 1)
				if int(t2) >= ms and not (int(t2) in so):
					so.append(int(t2))
			so.sort()
			for x in so:
				if int(x) <= NR.TIMELINE and sts.size() < 3:
					sts.append(int(x))
		var val := cost
		for v in nums:
			val += int(v)
		for st in sts:
			out.append({"side": s, "uid": uid, "start": int(st), "cl": cl_list, "cost": cost, "cards": cards, "words": NE.action_words(cl_list),
				"val": float(val), "def": NE.is_def(cl_list), "ms": ms, "cv": nums})
	# 攻击：几个目标 × 几点 × 几次
	for n in opts:
		if int(n) > E.size():
			continue
		for d in opts:
			var reps: Array = [1]
			if not vals.is_empty() and int(vals[0]) <= 3:
				reps.append(int(vals[0]))
			for r in reps:
				for tg in _tsets(E, int(n)):
					add.call([{"k": "atk", "tg": tg, "n": int(d), "rep": int(r), "tmode": "choose"}], [])
	# 治疗
	var hurt: Array = []
	for u3 in F:
		if int(u3.hp) < int(u3.mx):
			hurt.append(u3)
	hurt.sort_custom(func(a, b): return int(a.hp) - int(a.mx) < int(b.hp) - int(b.mx))
	if not hurt.is_empty():
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
				add.call([{"k": "heal", "tg": tg2, "n": int(amt), "rep": 1, "tmode": "choose"}], [])
	# 治疗职业：打自己再奶
	if cls == "治疗" and F.size() > 1:
		var big: Dictionary = F[0]
		for u6 in F:
			if int(u6.hp) > int(big.hp):
				big = u6
		for d2 in opts:
			add.call([{"k": "atk", "tg": [int(big.uid)], "n": int(d2), "rep": 1, "tmode": "choose"}], [])
	# 减伤
	if not enemy_acts.is_empty() or cls == "守护":
		for n3 in opts:
			if int(n3) > F.size():
				continue
			for amt2 in opts:
				add.call([{"k": "mit", "tg": threat_order.slice(0, int(n3)), "n": int(amt2), "tmode": "choose"}], [])
	# 状态
	for nm in ENEMY_ST + SELF_ST:
		if int(words.get(nm, 0)) <= 0:
			continue
		var pool: Array = E if nm in ENEMY_ST else F
		if nm in SELF_ST:
			pool = F.duplicate()
			pool.sort_custom(func(a, b): return int(a.hp) > int(b.hp))
		for n4 in opts:
			if int(n4) > pool.size():
				continue
			for dur in opts:
				for tg3 in _tsets(pool, int(n4)):
					add.call([{"k": "st", "st": nm, "tg": tg3, "n": int(dur), "tmode": "choose"}], [])
	# 回敬 / 转移
	for pair in [["reflect", "回敬"], ["redirect", "转移"]]:
		if int(words.get(pair[1], 0)) <= 0 or (enemy_acts.is_empty() and cls != "守护"):
			continue
		for n5 in opts:
			if int(n5) > F.size():
				continue
			add.call([{"k": pair[0], "tg": threat_order.slice(0, int(n5)), "cap": null, "tmode": "choose"}], [])
	# 延后
	if int(words.get("延后", 0)) > 0:
		for a4 in enemy_acts:
			for sec in opts:
				if 2 < int(a4.start):
					add.call([{"k": "delay", "act": int(a4.ord), "n": int(sec), "tg": []}], [2])
	# 移除
	if int(words.get("移除", 0)) > 0:
		for u7 in E:
			if not (u7.lis as Array).is_empty() or int(u7.mit) > 0 or u7.st.has("蓄力") or u7.st.has("铁壁"):
				add.call([{"k": "remove", "tg": [int(u7.uid)], "tmode": "pick"}], [])
		for a5 in enemy_acts:
			for c2 in a5.cl:
				if str(c2.k) in ["mit", "reflect", "redirect"] or (str(c2.k) == "st" and str(c2.st) in SELF_ST):
					if int(a5.start) + 1 <= NR.TIMELINE and not c2.tg.is_empty():
						add.call([{"k": "remove", "tg": [int(c2.tg[0])], "tmode": "pick"}], [int(a5.start) + 1])
	# “1” 连打（并）
	if not E.is_empty():
		for kk in range(2, NR.CLAUSE_MAX + 1):
			var chain: Array = []
			for _j in kk:
				chain.append({"k": "atk", "tg": [int(E[0].uid)], "n": 1, "rep": 1, "tmode": "choose"})
			add.call(chain, [])
	return out

# 返回 {"uid": 随从, "act": 行动或 null（这个随从这一轮不出手）}
static func choose(M, s: int) -> Dictionary:
	var R0: Dictionary = M.R
	var base_R := NE.clone_R(R0)
	NE.resolve(base_R, M.declared, M.rnd)
	var u0 := util(M, base_R, s)
	var best = null
	var best_v := -1.0e9
	var worst_uid := -1
	var worst_gain := 1.0e9
	var cards: Array = M.sides[s].cards
	for uid in M.remaining[s]:
		var local_best := -1.0e9
		for c in gen_cands(M, s, int(uid)):
			c["ord"] = M.declared.size()
			var R2 := NE.clone_R(R0)
			NE.resolve(R2, M.declared + [c], M.rnd)
			var v := util(M, R2, s) - 0.6 * float(c.cost)
			for i in c.cards:
				v -= (0.5 if bool(cards[i].once) else 0.25) * float(cards[i].v)
			v += M.rng.randf() * 0.3
			if v > local_best:
				local_best = v
			if v > best_v:
				best_v = v
				best = c
		var g := local_best - u0
		if g < worst_gain:
			worst_gain = g
			worst_uid = int(uid)
	if best == null or best_v - u0 < PASS_GAIN:
		return {"uid": worst_uid if worst_uid != -1 else int(M.remaining[s][0]), "act": null}
	return {"uid": int(best.uid), "act": best}

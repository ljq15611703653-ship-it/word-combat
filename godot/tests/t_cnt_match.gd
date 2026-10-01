extends "res://scripts/game/match.gd"
# 复测用：在真实 Match 上记录电脑每张卡的拼卡信息（针对标记、对手已亮情报）。可选 ai_mode 实验。
var build_log: Array = []

func _role_of(sk: Dictionary) -> String:
	var best := ""
	var bestn := -1
	var prm: Dictionary = sk.get("params", {})
	for r in Coach.ROUTES:
		if str(r[1]) != str(sk.get("template", "")):
			continue
		var ok := true
		for k in r[2]:
			if str(prm.get(k, "")) != str(r[2][k]):
				ok = false
		if ok and r[2].size() > bestn:
			bestn = r[2].size()
			best = str(r[3])
	return best

func _ai_build_card(side: int, k: int) -> void:
	var prof: Dictionary = Coach.foe_profile(revealed_deck(1 - side))
	var mine_before := 0
	for u in decks[side].units:
		for sk in u.skills:
			if str(sk.get("kind_tag", "atk")) != "atk":
				mine_before += 1
	super._ai_build_card(side, k)
	var u2: Dictionary = decks[side].units[k]
	if u2.skills.is_empty():
		build_log.append({"side": side, "k": k, "empty": true})
		return
	var sk2: Dictionary = u2.skills[0]
	var a := {"params": sk2.get("params", {}), "tid": str(sk2.get("template", "")), "role": _role_of(sk2)}
	var rel: Dictionary = Coach._relevance(a, prof)
	var prm: Dictionary = sk2.get("params", {})
	build_log.append({"side": side, "k": k, "tid": a.tid, "op": str(prm.get("op", "")), "st": str(prm.get("st", "")),
		"role": a.role, "tag": str(sk2.get("kind_tag", "")), "rep": int(prm.get("rep", 0)), "bonus": float(rel.bonus),
		"foe_fb": ("首挡" in prof.kws), "foe_kws": prof.kws, "foe_tags": prof.tags, "kw": str(u2.kw), "cost": int(sk2.get("cost", 0)),
		"hp": int(u2.max_hp), "budget": int(sk2.get("budget", 0)), "mine_counters_before": mine_before})

# ---------------------------------------------------------------- 实验：电脑出手的“更爱针对”版本（只在本测试里生效）
var v2: Array = [false, false]
const COUNTER_CATS := ["interrupt", "silence", "redirect", "reflect", "mit", "shield", "convert", "delay"]
var v2_stats := {"counter_first_pick": 0, "reserve_block": 0}

func _cat2(sk: Dictionary) -> String:
	var t := str(sk.get("template", ""))
	var p: Dictionary = sk.get("params", {})
	if t == "time":
		return str(p.get("op", "time"))
	if t == "status" and str(p.get("st", "")) == "沉默":
		return "silence"
	return t

func _sk_cat_of_act(a: Dictionary) -> String:
	return _cat2(E.skill_of(st, int(a.sid)))

func ai_declare() -> void:
	var s := declare_side()
	if not v2[s] or scripted_ai.is_valid():
		super.ai_declare()
		return
	var second: bool = s != declare_order[0]
	var enemy_list: Array = []
	if second:
		enemy_list = declared[1 - s].duplicate(true)
	# 1) 后手：先看“应对类”技能能不能赚（不再要求比现状好 0.5 以上，只要模拟里更好就用）
	if second:
		var guard0 := 0
		while guard0 < 4:
			guard0 += 1
			var base_acts: Array = enemy_list + declared[s]
			var base_v := Ai.evaluate(Ai._sim(st, base_acts), s)
			var best := {}
			var best_v := base_v + 0.01
			for a in Ai.enumerate_actions(st, s, enemy_list, 8, declared[s]):
				if a.is_empty() or not (_sk_cat_of_act(a) in ["interrupt", "silence", "redirect", "reflect", "mit", "shield", "convert"]):
					continue
				var v := Ai.evaluate(Ai._sim(st, base_acts + [a]), s)
				if v > best_v:
					best_v = v
					best = a
			if best.is_empty() or submit(s, best) != "":
				break
			v2_stats.counter_first_pick += 1
	# 2) 先手：持有打断/沉默时，给下一轮留够行动点（下一轮会当后手，那时才打得中）
	var reserve := 0
	if not second:
		for u in E.alive_units(st, s):
			for sid in u.skill_ids:
				var sk: Dictionary = E.skill_of(st, sid)
				if _cat2(sk) in ["interrupt", "silence"]:
					reserve = maxi(reserve, int(sk.get("cost", 0)) - int(st.rules.ap_gain))
	var guard := 0
	while guard < E.MAX_ACTIONS:
		guard += 1
		var act := Ai.choose_action(st, s, enemy_list, declared[s], rng, fast_ai, ai_epsilon)
		if act.is_empty():
			break
		if reserve > 0 and E.available_ap(st, s, declared[s]) - E.action_cost(st, act) < reserve:
			v2_stats.reserve_block += 1
			break
		if submit(s, act) != "":
			break
	declare_done[s] = true

extends SceneTree
# 强组合 × 反制 审计（真实引擎，一轮对决）。
# 进攻方先手锁定，防守方看见后在全部合法行动（目标/起手时间）里选对自己最好的应对。
# 对每个反制族，逐档加大投入，找到“最小有效投入”，并换算成相对进攻操作费的比例（目标≥80%）。
# 用法： --script res://tests/t_audit.gd -- [ap] [out.json]
const G = preload("res://scripts/core/grammar.gd")
const E = preload("res://scripts/core/engine.gd")
const R = preload("res://scripts/core/recipes.gd")
const D = preload("res://scripts/core/deck.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

var AP := 60

# ------------------------------------------------------------ 牌组与场景
func make_deck(skill: Dictionary, host: int) -> Dictionary:
	var d := D.new_deck()
	var nums := int(skill.budget) if not skill.is_empty() else 0
	var hp_total := D.BUDGET - nums
	var each := int(hp_total / 5)
	for i in 5:
		d.units[i].max_hp = each
	d.units[0].max_hp += hp_total - each * 5
	if not skill.is_empty():
		d.units[host].skills.append(skill.duplicate(true))
	return d

func scenario(att: Dictionary, deff: Dictionary) -> Dictionary:
	var st := E.make_state([make_deck(att, 0), make_deck(deff, 1)], 0, {"start_ap": 0})
	E.begin_round(st)
	st.sides[0].ap = AP
	st.sides[1].ap = AP
	return st

func att_action(st: Dictionary, choice_uid: int) -> Dictionary:
	var sid: int = st.sides[0].units[0].skill_ids[0]
	var sk := E.skill_of(st, sid)
	var ch := {}
	for slot in G.choice_slots(sk):
		if slot.kind == "target":
			ch[slot.key] = choice_uid if slot.spec.get("side", "enemy") == "enemy" else 0
		elif slot.kind == "branch":
			ch[slot.key] = 0
	var act := {"side": 0, "sid": sid, "choices": ch, "start": 0}
	act.start = E.min_start(st, act)
	return act

func value_of(st: Dictionary) -> float:
	# 进攻方视角：本轮分差（计分制，无立即获胜）
	return float(st.sides[0].score - st.sides[1].score)

func run(st: Dictionary, a0: Dictionary, a1: Dictionary) -> Dictionary:
	var c := E.clone_state(st)
	E.run_round(c, [a0, a1])
	return c

# 进攻方对“被动防守”挑最好的目标
func best_attack(att: Dictionary) -> Dictionary:
	var st := scenario(att, {})
	var best: Dictionary = {}
	var best_v := -INF
	for uid in [10, 11, 12, 13, 14]:
		var a := att_action(st, uid)
		if E.can_declare(st, a) != "":
			continue
		var r := run(st, a, {})
		var v := value_of(r)
		if v > best_v:
			best_v = v
			best = {"uid": uid, "v": v, "score": int(r.sides[0].score), "wipe": r.winner == 0, "cost": E.action_cost(st, a), "windup": E.min_start(st, a)}
	return best

# 防守方的最优应对：枚举合法行动，取对进攻方最不利者
func best_response(att: Dictionary, deff: Dictionary, uid: int) -> Dictionary:
	var st := scenario(att, deff)
	var a0 := att_action(st, uid)
	var acts := Ai.enumerate_actions(st, 1, a0, 8)
	var worst := INF
	var res: Dictionary = {}
	for a in acts:
		if a.is_empty():
			continue
		var r := run(st, a0, a)
		var v := value_of(r)
		if v < worst:
			worst = v
			res = {"v": v, "att_score": int(r.sides[0].score), "def_score": int(r.sides[1].score), "winner": r.winner, "start": int(a.start), "cost": E.action_cost(st, a), "events": r.events.size()}
	return res

# ------------------------------------------------------------ 进攻组合
func atk_templates() -> Array:
	var out: Array = []
	var specs := [
		["单点", "atk1", {}],
		["单点·双倍", "atk1", {"dbl": 1}],
		["单点·双倍×2", "atk1", {"dbl": 2}],
		["单点·双倍·重复", "atk1", {"dbl": 1, "rep": 1}],
		["单点·重复×3", "atk1", {"rep": 3}],
		["全体", "atkA", {}],
		["全体·双倍", "atkA", {"dbl": 1}],
		["全体·重复", "atkA", {"rep": 1}],
		["全体·双倍·重复", "atkA", {"dbl": 1, "rep": 1}],
		["逐个全体·双倍", "atkA", {"scope": "each", "dbl": 1}],
		["分流", "split", {}],
		["复制", "copy", {}],
		["汲取", "drain", {}],
	]
	for s in specs:
		out.append({"name": s[0], "tid": s[1], "params": s[2]})
	return out

# 把主数值调到“操作费不超过上限”的最大值
func fit_attack(a: Dictionary, cap: int) -> Dictionary:
	var best: Dictionary = {}
	for n in range(1, 61):
		var p: Dictionary = a.params.duplicate()
		p["n"] = n
		var sk := R.build(a.tid, p)
		if int(sk.cost) <= cap:
			best = sk
		else:
			break
	return best

func custom_attacks(cap: int) -> Array:
	# 需要手工拼的强组合
	var out: Array = []
	for n in range(1, 61):
		var sk := G.finalize(G.skill("易伤+双倍打击", [
			G.status("易伤", G.T("choose", "enemy")),
			G.dmg(G.T("choose", "enemy"), G.N(n), {"dbl": 1, "rep": 1})]))
		if int(sk.cost) > cap:
			break
		out.append(sk)
	var best1: Dictionary = out[out.size() - 1] if not out.is_empty() else {}
	var res: Array = []
	if not best1.is_empty():
		res.append(best1)
	var best2: Dictionary = {}
	for n in range(1, 61):
		var sk2 := G.finalize(G.skill("狂振+全体·双倍", [
			G.status("狂振", G.T("all", "enemy")),
			G.dmg(G.T("all", "enemy"), G.N(n), {"dbl": 1})]))
		if int(sk2.cost) > cap:
			break
		best2 = sk2
	if not best2.is_empty():
		res.append(best2)
	var best3: Dictionary = {}
	for n in range(1, 61):
		var sk3 := G.finalize(G.skill("沉默+全体", [
			G.status("沉默", G.T("all", "enemy"), 0, 25),
			G.dmg(G.T("all", "enemy"), G.N(n), {"dbl": 1})]))
		if int(sk3.cost) > cap:
			break
		best3 = sk3
	if not best3.is_empty():
		res.append(best3)
	return res

# ------------------------------------------------------------ 反制族
# 每族：名字、构造函数(power) → 技能；power 取 [档位] 逐档加大；无数值的族只测一档
func counter_families() -> Array:
	var f: Array = []
	f.append({"name": "改道·全队·每次→来源（每人上限递增）", "powers": [10, 20, 30, 40, 50, 60], "build": func(p): return R.build("redirect", {"obs": "all", "to": "source", "freq": "every", "n": p})})
	f.append({"name": "改道·自身·首次→来源（上限递增）", "powers": [10, 20, 30, 40, 50, 60], "build": func(p): return R.build("redirect", {"obs": "self", "to": "source", "freq": "once", "n": p})})
	f.append({"name": "改道·全队·每次→敌方最高生命", "powers": [10, 20, 30, 40, 50, 60], "build": func(p): return R.build("redirect", {"obs": "all", "to": "highest", "freq": "every", "n": p})})
	f.append({"name": "转伤为疗·全队·每次（上限递增）", "powers": [10, 20, 30, 40, 50, 60], "build": func(p): return R.build("convert", {"obs": "all", "freq": "every", "n": p})})
	f.append({"name": "回敬·全队·等量·每次", "powers": [0], "build": func(p): return R.build("reflect", {"obs": "all", "mult": 0, "freq": "every"})})
	f.append({"name": "回敬·全队·双倍·每次", "powers": [0], "build": func(p): return R.build("reflect", {"obs": "all", "mult": 1, "freq": "every"})})
	f.append({"name": "减伤·全队·按比例", "powers": [10, 20, 30, 40, 60], "build": func(p): return R.build("mit", {"tgt": "all", "mode": "pct", "n": p})})
	f.append({"name": "护盾·全队", "powers": [10, 20, 30, 40, 60], "build": func(p): return R.build("shield", {"tgt": "all", "n": p})})
	f.append({"name": "治疗·全队", "powers": [10, 20, 30, 40, 60], "build": func(p): return R.build("heal", {"tgt": "all", "n": p})})
	f.append({"name": "打断（力度递增）", "powers": [10, 20, 30, 40, 50, 60], "build": func(p): return R.build("time", {"op": "interrupt", "power": p})})
	f.append({"name": "延后（秒递增）", "powers": [4, 8, 12, 16, 19], "build": func(p): return R.build("time", {"op": "delay", "sec": p})})
	f.append({"name": "沉默攻击者（力度递增）", "powers": [10, 20, 30, 40, 50, 60], "build": func(p): return R.build("status", {"st": "沉默", "tgt": "choose", "n": p})})
	f.append({"name": "见招收税", "powers": [10, 20, 30, 45], "build": func(p): return R.build("tax", {"n": p})})
	f.append({"name": "遗志", "powers": [10, 20, 30, 45], "build": func(p): return R.build("burst", {"n": p})})
	f.append({"name": "反击·全体打击", "powers": [10, 20, 30, 45], "build": func(p): return R.build("atkA", {"n": p})})
	f.append({"name": "反击·单点打击", "powers": [10, 20, 30, 45], "build": func(p): return R.build("atk1", {"n": p})})
	return f

func _init() -> void:
	Lex.load_all()
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		AP = int(args[0])
	var out_path := "res://audit_result.json"
	if args.size() > 1:
		out_path = args[1]
	var attacks: Array = []
	for t in atk_templates():
		var sk := fit_attack(t, AP)
		if not sk.is_empty():
			sk["name"] = t.name
			attacks.append(sk)
	for sk in custom_attacks(AP):
		attacks.append(sk)
	var fams := counter_families()
	var results: Array = []
	var t0 := Time.get_ticks_msec()
	for att in attacks:
		var base := best_attack(att)
		if base.is_empty():
			continue
		var row := {"attack": att.name, "text": att.text, "cost": int(att.cost), "windup": int(att.windup), "base_v": base.v, "base_score": base.score, "base_wipe": base.wipe, "counters": []}
		print("== 进攻 %s 操作费%d 起手%d  基线：得分%d %s" % [att.name, int(att.cost), int(att.windup), int(base.score), "（一轮全灭）" if base.wipe else ""])
		for fam in fams:
			var found := false
			var tried: Array = []
			for p in fam.powers:
				var cs: Dictionary = fam.build.call(p)
				if int(cs.cost) > AP:
					break
				var r := best_response(att, cs, base.uid)
				if r.is_empty():
					continue
				var neutral: bool = (r.v <= 0.25 * base.v) if base.v > 0 else (r.v <= base.v)
				var reversed: bool = r.v < 0
				var trade: bool = r.att_score > 0 and r.def_score > 0
				tried.append({"power": p, "cost": int(cs.cost), "frac": float(cs.cost) / float(att.cost), "v": r.v, "att_score": r.att_score, "def_score": r.def_score, "neutral": neutral, "reversed": reversed, "trade": trade, "start": r.start})
				if neutral:
					found = true
					break
			var best_try: Dictionary = {}
			if not tried.is_empty():
				best_try = tried[tried.size() - 1]
			row.counters.append({"name": fam.name, "neutralized": found, "tries": tried})
			var tag := "—"
			if found:
				tag = "✓ 最小有效：力度%s 费%d（占进攻%.0f%%）攻%d:守%d%s%s" % [str(best_try.power), best_try.cost, best_try.frac * 100.0, best_try.att_score, best_try.def_score, " 反打" if best_try.reversed else "", " 交换" if best_try.trade else ""]
			elif not tried.is_empty():
				tag = "✗ 最强档仍不足（剩余优势%.0f）" % best_try.v
			print("   %-28s %s" % [fam.name, tag])
		results.append(row)
	print("用时 %.1fs" % ((Time.get_ticks_msec() - t0) / 1000.0))
	var f := FileAccess.open(out_path, FileAccess.WRITE)
	f.store_string(JSON.stringify({"ap": AP, "results": results}, "  "))
	f.close()
	quit(0)

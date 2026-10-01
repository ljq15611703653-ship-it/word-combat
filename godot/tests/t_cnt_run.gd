extends SceneTree
# 针对性复测：真实逐张构筑 AI 对 AI。用法： -- 局数 起始种子 epsilon [输出jsonl路径]
const MatchX = preload("res://tests/t_cnt_match.gd")
const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")

func _cat(sk: Dictionary) -> String:
	var t := str(sk.get("template", ""))
	var p: Dictionary = sk.get("params", {})
	if t == "time":
		return str(p.get("op", "time"))
	if t == "status" and str(p.get("st", "")) == "沉默":
		return "silence"
	return t

func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 5
	var s0 := int(args[1]) if args.size() > 1 else 1
	var eps := float(args[2]) if args.size() > 2 else 0.12
	var outp := str(args[3]) if args.size() > 3 else ""
	var mask := str(args[4]) if args.size() > 4 else "00"
	var f: FileAccess = null
	if outp != "":
		f = FileAccess.open(outp, FileAccess.WRITE)
	for g in n:
		var m = MatchX.new()
		m.start(false, s0 + g, false)
		m.begin_staged()
		m.ai_epsilon = eps
		m.fast_ai = true
		m.v2 = [mask[0] == "1", mask[1] == "1"]
		var rec := {"seed": s0 + g, "eps": eps, "first": int(m.st.first), "ev": [{}, {}], "opps": [], "int_hits": [], "cnt_rounds": [], "mask": mask}
		var done_round := -1
		var guard := 0
		while guard < 900:
			guard += 1
			if m.phase == "declare" and m.declare_side() == -1:
				_snapshot(m, rec)
			var cont: bool = m.step_auto()
			if (m.phase == "resolved" or m.phase == "over") and done_round != int(m.st.round):
				done_round = int(m.st.round)
				_proc_round(m, rec)
			if not cont:
				break
		rec["v2stats"] = m.v2_stats
		rec["winner"] = m.winner
		rec["rounds"] = int(m.st.round)
		rec["score"] = [int(m.st.sides[0].score), int(m.st.sides[1].score)]
		rec["builds"] = m.build_log
		var fin: Array = [[], []]
		for s in 2:
			for u in m.decks[s].units:
				for sk in u.skills:
					fin[s].append({"cat": _cat(sk), "tag": str(sk.get("kind_tag", "")), "uid": s * 10 + m.decks[s].units.find(u), "cost": int(sk.get("cost", 0))})
		rec["final"] = fin
		var line := JSON.stringify(rec)
		if f:
			f.store_line(line)
		else:
			print(line)
	if f:
		f.close()
	quit()

func _add(rec: Dictionary, side: int, key: String, v: float = 1.0) -> void:
	var d: Dictionary = rec.ev[side]
	d[key] = float(d.get(key, 0.0)) + v

# 宣告结束、结算之前：记录每个时间/埋伏类技能“有没有机会、有没有被宣告”
func _snapshot(m, rec: Dictionary) -> void:
	var st: Dictionary = m.st
	for s in 2:
		var first: bool = m.declare_order[0] == s
		var foe_acts: Array = m.declared[1 - s]
		for u in E.alive_units(st, s):
			for sid in u.skill_ids:
				var sk: Dictionary = E.skill_of(st, sid)
				var cat := _cat(sk)
				var cost := int(sk.get("cost", 0))
				var decl := {}
				for a in m.declared[s]:
					if int(a.sid) == int(sid):
						decl = a
				var ms := mini(cost / 10, 19)
				var has_tgt := false
				if not decl.is_empty():
					for fa in foe_acts:
						if int(fa.start) >= int(decl.start):
							has_tgt = true
				rec.opps.append({"r": int(st.round), "side": s, "first": first, "cat": cat, "tag": str(sk.get("kind_tag", "")), "cost": cost, "ms": ms,
					"ap": int(st.sides[s].ap), "afford": cost <= int(st.sides[s].ap), "silenced": E._silenced_for(u, cost),
					"declared": not decl.is_empty(), "start": int(decl.get("start", -1)), "foe_n": foe_acts.size(), "has_tgt": has_tgt,
					"hp": int(u.hp), "uid": int(u.uid)})

func _proc_round(m, rec: Dictionary) -> void:
	var evs: Array = m.last_events
	var decls: Array = []
	for e in evs:
		if str(e.type) == "declare":
			decls.append(e)
	var shield := {}
	var abs_round := [0, 0]    # 本轮每方（受击方）被减伤/护盾吃掉的伤害
	var host_of := {}
	for e in evs:
		var t := str(e.type)
		match t:
			"interrupt":
				_add(rec, int(e.side), "interrupt")
				# 被打断的行动：对方在 >= 该秒起效的最早一次宣告
				var best := {}
				for d in decls:
					if int(d.side) == int(e.target_side) and int(d.start) >= int(e.t):
						if best.is_empty() or int(d.start) < int(best.start):
							best = d
				rec.int_hits.append({"t": int(e.t), "cost": int(best.get("cost", -1)), "by": int(e.side)})
			"time_fail":
				var why := str(e.why)
				_add(rec, int(e.side), "time_fail_notarget" if "没有宣告" in why else "time_fail_weak")
			"delay":
				_add(rec, int(e.side), "delay")
			"redirect":
				_add(rec, 1 - int(e.host) / 10, "redirect")
				_add(rec, 1 - int(e.host) / 10, "redirect_amt", float(e.amount))
			"redirect_fail":
				_add(rec, int(e.tgt) / 10, "redirect_fail")
			"convert":
				_add(rec, int(e.tgt) / 10, "convert")
				_add(rec, int(e.tgt) / 10, "convert_amt", float(e.amount))
			"shield":
				shield[int(e.tgt)] = int(shield.get(int(e.tgt), 0)) + int(e.absorbed)
				_add(rec, int(e.tgt) / 10, "shield_abs", float(e.absorbed))
				abs_round[int(e.tgt) / 10] += int(e.absorbed)
			"block":
				_add(rec, int(e.tgt) / 10, "block")
				shield[int(e.tgt)] = -1000000
			"dmg":
				var tg := int(e.tgt)
				var sh := int(shield.get(tg, 0))
				if sh > -1000:
					var mit := maxi(0, int(e.raw) - int(e.amount) - sh)
					if mit > 0:
						_add(rec, tg / 10, "mit_abs", float(mit))
						abs_round[tg / 10] += mit
				shield.erase(tg)
				_add(rec, int(e.src) / 10, "dmg_dealt", float(e.amount))
			"trigger":
				_add(rec, int(e.side), "trigger")
				if str(e.event) == "down":
					_add(rec, int(e.side), "legacy")
			"watch_install":
				_add(rec, int(e.side), "watch_install")
			"mit":
				_add(rec, int(e.tgt) / 10, "mit_install")
			"down":
				_add(rec, int(e.get("tgt", e.get("uid", 0))) / 10, "down")
			"keyword":
				_add(rec, int(e.tgt) / 10, "kw_" + str(e.kw))
			"status":
				_add(rec, int(e.tgt) / 10, "st_" + str(e.status))
			"fizzle":
				_add(rec, 0, "fizzle_" + str(e.why))
	for s in 2:
		if abs_round[s] >= 6:
			_add(rec, s, "abs6_rounds")

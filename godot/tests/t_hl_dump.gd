extends SceneTree
# 爽点挖掘：批量真实逐张构筑 AI 对 AI，每局每轮写 JSONL。用法： -- 局数 起始种子 输出路径
const Match = preload("res://scripts/game/match.gd")
const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
func _snap(m) -> Dictionary:
	var us: Array = []
	for s in 2:
		for u in m.st.sides[s].units:
			var sks: Array = []
			for sid in u.skill_ids:
				var sk: Dictionary = E.skill_of(m.st, sid)
				sks.append({"sid": sid, "name": str(sk.get("name", "")), "text": G.describe(sk), "cost": int(sk.get("cost", 0)), "budget": int(sk.get("budget", 0)), "tag": str(sk.get("kind_tag", ""))})
			us.append({"uid": u.uid, "side": s, "name": u.name, "hp": u.hp, "max_hp": u.max_hp, "kw": u.kw, "down": u.down_round, "skills": sks})
	return {"units": us, "ap": [m.st.sides[0].ap, m.st.sides[1].ap], "score": [m.st.sides[0].score, m.st.sides[1].score]}
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0])
	var s0 := int(args[1])
	var f := FileAccess.open(args[2], FileAccess.WRITE)
	for g in n:
		var seed_v := s0 + g
		var m := Match.new()
		m.start(false, seed_v, false)
		if args.size() > 3 and int(args[3]) == 1:
			m.st.first = 1      # 对照实验：把先手位互换（选词顺序、每轮先后手都跟着换）
			m.picker = (1 + m.opening_idx) % 2
		m.begin_staged()
		m.ai_epsilon = 0.12
		m.fast_ai = true
		var rounds: Array = []
		var snap := {}
		var guard := 0
		while guard < 900:
			guard += 1
			if m.phase == "adjust_done":
				snap = _snap(m)
				snap["first"] = E.first_side(m.st)
			var more: bool = m.step_auto()
			if m.phase == "resolved" or m.phase == "over":
				var acts: Array = []
				for s in 2:
					for a in m.last_declared[s]:
						var sk: Dictionary = E.skill_of(m.st, int(a.sid))
						acts.append({"side": s, "sid": a.sid, "host": E.host_of(m.st, int(a.sid)), "start": a.start, "choices": a.get("choices", {}), "text": G.describe(sk), "name": str(sk.get("name", "")), "cost": E.action_cost(m.st, a)})
				var after := _snap(m)
				rounds.append({"round": m.st.round, "pre": snap, "acts": acts, "events": m.last_events, "post_score": after.score, "post_hp": after.units.map(func(u): return [u.uid, u.hp, u.down])})
			if not more:
				break
		var rec := {"seed": seed_v, "winner": m.winner, "rounds": rounds, "personas": m.personas}
		f.store_line(JSON.stringify(rec))
	f.close()
	quit()

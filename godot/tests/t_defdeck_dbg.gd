extends SceneTree
const T = preload("res://tests/t_defdeck.gd")
func _init() -> void:
	await process_frame
	var m := T.M.new()
	m.mine = 0
	m.forced = true
	m.kind = "A"
	m.start(false, 1, false, 0)
	m.begin_staged()
	m.ai_epsilon = 0.12
	m.fast_ai = true
	var guard := 0
	var shown := 0
	while m.step_auto() and guard < 900:
		guard += 1
		if m.phase == "ready" and shown == 0:
			shown = 1
			for s in 2:
				print("== 方", s, " 预算", m.D.budget_used(m.decks[s]))
				for u in m.decks[s].units:
					var sk: Dictionary = u.skills[0] if not u.skills.is_empty() else {}
					print("  ", u.name, " hp", u.max_hp, " kw", u.kw, " | ", sk.get("text", "(空)"), " | 费", sk.get("cost", 0))
		if m.phase == "resolved" or m.phase == "over":
			var line := "第%d轮 AP[%d,%d] 分[%d,%d] 宣告:" % [m.st.round, m.st.sides[0].ap, m.st.sides[1].ap, m.st.sides[0].score, m.st.sides[1].score]
			for s in 2:
				for a in m.last_declared[s]:
					line += " [%d:%s@%d]" % [s, m.E.skill_of(m.st, int(a.sid)).name, int(a.start)]
			print(line)
			var c := {}
			for e in m.last_events:
				c[str(e.type)] = int(c.get(str(e.type), 0)) + 1
			print("   事件 ", c)
	quit()

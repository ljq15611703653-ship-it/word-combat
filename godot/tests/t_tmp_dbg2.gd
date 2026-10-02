extends SceneTree
const T = preload("res://tests/t_chargedeck.gd")
func _init() -> void:
	await process_frame
	var m := T.M.new()
	m.mine = 0
	m.thr = 3
	m.mainhp = 30
	m.otherhp = 10
	m.extp = 1
	m.start(false, 900, false, 0)
	m.begin_staged()
	m.ai_epsilon = 0.12
	m.fast_ai = true
	var guard := 0
	var shown := 0
	while m.step_auto() and guard < 600:
		guard += 1
		if m.phase == "ready" and shown == 0:
			shown = 1
			for u in m.decks[0].units:
				print(u.name, " hp", u.max_hp, " ", u.skills[0].text if not u.skills.is_empty() else "(空)", " 费", u.skills[0].get("cost", 0) if not u.skills.is_empty() else 0)
		if m.phase == "resolved":
			var line := "第%d轮 AP[%d,%d] 分[%d,%d] 主力蓄力 %d" % [m.st.round, m.st.sides[0].ap, m.st.sides[1].ap, m.st.sides[0].score, m.st.sides[1].score, m.E.stacks_of(m.st.sides[0].units[1], "蓄力")]
			for a in m.last_declared[0]:
				line += " [我:%s]" % m.E.skill_of(m.st, int(a.sid)).name
			print(line)
			for e in m.last_events:
				if str(e.type) in ["dmg", "down", "stack", "start", "fizzle"]:
					print("    ", e)
		if m.st.round >= 5:
			break
	quit()

extends SceneTree
# 逐张构筑的整局自动对战（电脑 vs 电脑，走真实的 staged 流程）并统计。用法： -- 局数 起始种子
const Match = preload("res://scripts/game/match.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 5
	var s0 := int(args[1]) if args.size() > 1 else 1
	var wins := [0, 0, 0]
	var rounds := 0
	var cap10 := 0
	var ev := {}
	var firstwin := 0
	var skills_empty := 0
	var total_cards := 0
	var swings := 0
	var wipes := 0
	for g in n:
		var m := Match.new()
		m.start(false, s0 + g, false)
		m.begin_staged()
		m.ai_epsilon = 0.12
		m.fast_ai = true
		var guard := 0
		while m.step_auto() and guard < 800:
			guard += 1
			if m.phase == "resolved" or m.phase == "over":
				var prev := [0, 0]
				for e in m.last_events:
					var t := str(e.type)
					ev[t] = int(ev.get(t, 0)) + 1
					if t == "dmg" and int(e.amount) >= 20:
						ev["big_hit"] = int(ev.get("big_hit", 0)) + 1
					if t == "down":
						ev["down"] = int(ev.get("down", 0)) + 1
		for u in m.decks[0].units + m.decks[1].units:
			total_cards += 1
			if u.skills.is_empty():
				skills_empty += 1
		var w: int = m.winner
		wins[w if w >= 0 else 2] += 1
		rounds += int(m.st.round)
		if int(m.st.round) >= 10:
			cap10 += 1
		print("局 %d：胜者 %d，轮数 %d，分数 %d:%d" % [g, w, int(m.st.round), int(m.st.sides[0].score), int(m.st.sides[1].score)])
	print("总计 0号位胜 %d / 1号位胜 %d / 平 %d，平均轮数 %.2f，打满10轮 %d 局，空技能卡 %d/%d" % [wins[0], wins[1], wins[2], float(rounds) / n, cap10, skills_empty, total_cards])
	var keys := ev.keys()
	keys.sort()
	for k in keys:
		print("  事件 %s：%d（每局 %.2f）" % [k, int(ev[k]), float(ev[k]) / n])
	quit()

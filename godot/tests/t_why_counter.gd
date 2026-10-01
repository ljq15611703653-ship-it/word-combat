extends SceneTree
# 为什么反制多的一方更容易输？统计：进攻卡数 vs 胜率、得分来源、行动点花销
const Coach = preload("res://scripts/core/coach.gd")
const Match = preload("res://scripts/game/match.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 100
	var by_atk := {}      # 进攻卡数 → [局数, 胜数]
	var score_by_atk := {}
	var seat := [0, 0, 0]
	var first_win := [0, 0]   # 第 1 轮先手方是否赢
	var ap_spent_counter := 0.0
	var ap_spent_all := 0.0
	var rounds_counter_used := 0
	var rounds_all := 0
	var counter_succ_win := [0, 0]   # 一局里反制成功次数多的一方 胜/负
	for g in n:
		var m := Match.new()
		m.start(false, 1 + g, false)
		m.begin_staged()
		m.ai_epsilon = 0.12
		m.fast_ai = true
		var succ := [0, 0]
		var guard := 0
		while m.step_auto() and guard < 900:
			guard += 1
			if m.phase == "resolved" or m.phase == "over":
				for e in m.last_events:
					var t := str(e.type)
					if t == "interrupt":
						succ[int(e.side)] += 1
					elif t == "redirect" or t == "convert":
						pass
				for s in 2:
					for a in m.last_declared[s]:
						var sk: Dictionary = m.E.skill_of(m.st, int(a.sid))
						var c := int(sk.get("cost", 0))
						ap_spent_all += c
						rounds_all += 1
						if str(sk.get("kind_tag", "atk")) != "atk":
							ap_spent_counter += c
							rounds_counter_used += 1
		var w: int = m.winner
		var natk := [0, 0]
		for s in 2:
			for u in m.decks[s].units:
				for sk in u.skills:
					if str(sk.get("kind_tag", "atk")) == "atk":
						natk[s] += 1
		for s in 2:
			var key := str(natk[s])
			if not by_atk.has(key):
				by_atk[key] = [0, 0]
				score_by_atk[key] = 0
			by_atk[key][0] += 1
			if w == s:
				by_atk[key][1] += 1
			score_by_atk[key] += int(m.st.sides[s].score)
		seat[w if w >= 0 else 2] += 1
		if succ[0] != succ[1] and w >= 0:
			var more := 0 if succ[0] > succ[1] else 1
			counter_succ_win[0 if w == more else 1] += 1
	print("座位：0号位胜 %d / 1号位胜 %d / 平 %d" % [seat[0], seat[1], seat[2]])
	var keys := by_atk.keys()
	keys.sort()
	for k in keys:
		var r: Array = by_atk[k]
		print("进攻卡 %s 张：%d 个席位，胜率 %.0f%%，平均得分 %.1f" % [k, r[0], 100.0 * r[1] / r[0], float(score_by_atk[k]) / r[0]])
	print("宣告的行动里 非进攻 占 %.0f%%（行动点占比 %.0f%%）" % [100.0 * rounds_counter_used / maxf(1.0, rounds_all), 100.0 * ap_spent_counter / maxf(1.0, ap_spent_all)])
	print("打断成功更多的一方：胜 %d / 负 %d" % [counter_succ_win[0], counter_succ_win[1]])
	quit()

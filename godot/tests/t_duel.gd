extends SceneTree
# 现场拼对决：电脑对电脑整局。用法： -- 局数 起始种子 eps [参数=值…]
const Duel = preload("res://scripts/game/duel.gd")
const E = preload("res://scripts/core/engine.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 6
	var s0 := int(args[1]) if args.size() > 1 else 1
	var eps := float(args[2]) if args.size() > 2 else 0.0
	var ov := {}
	for i in range(3, args.size()):
		var kv := str(args[i]).split("=")
		if kv.size() == 2:
			ov[kv[0]] = float(kv[1])
	if ov.has("unit"): E.STACK_UNIT = ov.unit
	if ov.has("base"): E.STACK_BASE = ov.base
	if ov.has("blind"): Duel.BLIND_SECOND = true
	if ov.has("fap"): Duel.FIRST_AP = int(ov.fap)
	if ov.has("cand"): Duel.CAND_MAX = int(ov.cand)
	if ov.has("starts"): Duel.START_PICKS = int(ov.starts)
	var wins := [0, 0, 0]
	var rounds := 0
	var sentences := 0
	var cap := 0
	var ev := {}
	var t0 := Time.get_ticks_msec()
	var maxhit := 0
	var score_w := 0.0
	var score_l := 0.0
	var decided := 0
	var empty := 0
	var tally := {}
	var f1win := 0
	var held := 0
	var stack_games := 0
	for g in n:
		var d := Duel.new()
		d.ai_epsilon = eps
		d.start(false, s0 + g, false)
		if ov.has("win"): d.st.rules.win_score = int(ov.win)
		if ov.has("rounds"): d.st.rules.max_rounds = int(ov.rounds)
		if ov.has("cd"): d.st.rules.cooldown = int(ov.cd)
		var guard := 0
		var g_stack := false
		while d.step_auto() and guard < 900:
			guard += 1
			if d.phase == "draft" or d.phase == "over":
				for e in d.last_events:
					var t := str(e.type)
					ev[t] = int(ev.get(t, 0)) + 1
					if t == "stack":
						g_stack = true
					if t == "dmg":
						maxhit = maxi(maxhit, int(e.amount))
		if g_stack:
			stack_games += 1
		var w: int = d.winner
		if w == d.first0:
			f1win += 1
		held += int(d.stats.get("held", 0))
		for sd in 2:
			var pn: String = d.personas[sd]
			var t2: Array = tally.get(pn, [0, 0, 0])
			t2[0] += 1
			if w == sd:
				t2[1] += 1
			elif w == -2:
				t2[2] += 1
			tally[pn] = t2
		wins[w if w >= 0 else 2] += 1
		rounds += int(d.st.round)
		sentences += int(d.stats.sentences)
		empty += int(d.stats.empty_units)
		if int(d.st.round) >= int(d.st.rules.max_rounds):
			cap += 1
		if w >= 0:
			decided += 1
			score_w += maxi(d.st.sides[0].score, d.st.sides[1].score)
			score_l += mini(d.st.sides[0].score, d.st.sides[1].score)
	var secs := float(Time.get_ticks_msec() - t0) / 1000.0
	print("现场拼对决 %d 局：0号位胜 %d / 1号位胜 %d / 平 %d；平均轮数 %.2f；打满上限 %d；用时 %.1f 秒（每局 %.1f 秒）" % [n, wins[0], wins[1], wins[2], float(rounds) / n, cap, secs, secs / n])
	print("每局拼句 %.1f 句（%.2f 句/轮）；本轮没出手的存活随从 %.1f 个/局；胜者平均分 %.1f / 败者 %.1f；出现过叠层的局 %d/%d；最大单次伤害 %d" % [float(sentences) / n, float(sentences) / maxf(1.0, float(rounds)), float(empty) / n, score_w / maxf(1.0, decided), score_l / maxf(1.0, decided), stack_games, n, maxhit])
	print("事件每局：击倒 %.1f 格挡 %.2f 落空 %.2f 叠层 %.1f 灼烧 %.1f 蓄力爆发 %.2f" % [float(ev.get("down", 0)) / n, float(ev.get("block", 0)) / n, float(ev.get("fizzle", 0)) / n, float(ev.get("stack", 0)) / n, float(ev.get("burn", 0)) / n, float(ev.get("stack_spent", 0)) / n])
	var keys: Array = tally.keys()
	keys.sort()
	var parts: Array = []
	for k in keys:
		parts.append("%s %d/%d（%.0f%%）" % [k, tally[k][1], tally[k][0], 100.0 * tally[k][1] / maxf(1.0, tally[k][0])])
	print("首轮先手方胜 %d/%d" % [f1win, n])
	print("流派胜率：" + "  ".join(parts) + "；攒行动点 %.1f 次/局" % (float(held) / n))
	quit()

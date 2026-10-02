extends SceneTree
# 逐张构筑的整局模拟（电脑 vs 电脑）：用来调参。 用法： -- 局数 起始种子 eps
const Match = preload("res://scripts/game/match.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 40
	var s0 := int(args[1]) if args.size() > 1 else 1
	var eps := float(args[2]) if args.size() > 2 else 0.12
	var ov := {}
	for i in range(3, args.size()):
		var kv := str(args[i]).split("=")
		if kv.size() == 2:
			ov[kv[0]] = float(kv[1])
	const E = preload("res://scripts/core/engine.gd")
	const Lx = preload("res://scripts/core/lexicon.gd")
	if ov.has("unit"): E.STACK_UNIT = ov.unit
	if ov.has("base"): E.STACK_BASE = ov.base
	if ov.has("smax"): E.STACK_MAX = int(ov.smax)
	if ov.has("per"): E.STACK_PER_ROUND = int(ov.per)
	if ov.has("bagsize"): Lx.BAG_SIZE = int(ov.bagsize)
	if ov.has("bags"): Lx.BAGS_PER_ROUND = int(ov.bags)
	if ov.has("rare"): Lx.RARE_SHARE = ov.rare
	if ov.has("hp"): Match.AI_HP = int(ov.hp)
	const AiS = preload("res://scripts/ai/ai.gd")
	if ov.has("sw"): AiS.STACK_WEIGHT = ov.sw
	if ov.has("la"): AiS.STACK_LOOKAHEAD = int(ov.la)
	var wins := [0, 0, 0]
	var rounds := 0
	var cap10 := 0
	var ev := {}
	var maxhit := 0
	var bighit := 0
	var score_w := 0.0
	var score_l := 0.0
	var first_round_leader_wins := 0
	var decided := 0
	var stack_games := 0
	var status_sk := 0
	var all_sk := 0
	var empty := 0
	var first_win := 0
	for g in n:
		var m := Match.new()
		m.start(false, s0 + g, false, 0)
		if ov.has("win"): m.st.rules.win_score = int(ov.win)
		if ov.has("cd"): m.st.rules.cooldown = int(ov.cd)
		if ov.has("apgain"): m.st.rules.ap_gain = int(ov.apgain)
		if ov.has("apcap"): m.st.rules.ap_cap = int(ov.apcap)
		if ov.has("rounds"): m.st.rules.max_rounds = int(ov.rounds)
		m.begin_staged()
		m.ai_epsilon = eps
		m.fast_ai = true
		var guard := 0
		var g_stack := false
		var lead_after1 := -1
		var rnd := 0
		while m.step_auto() and guard < 1500:
			guard += 1
			if m.phase == "resolved" or m.phase == "over":
				rnd += 1
				for e in m.last_events:
					var t := str(e.type)
					ev[t] = int(ev.get(t, 0)) + 1
					if t == "stack":
						g_stack = true
						ev["st_" + str(e.status)] = int(ev.get("st_" + str(e.status), 0)) + 1
					if t == "dmg":
						maxhit = maxi(maxhit, int(e.amount))
						if int(e.amount) >= 40:
							bighit += 1
				if rnd == 1:
					var a: int = m.st.sides[0].score
					var b: int = m.st.sides[1].score
					lead_after1 = 0 if a > b else (1 if b > a else -1)
		if g_stack:
			stack_games += 1
		for s in 2:
			for u in m.decks[s].units:
				for sk in u.skills:
					all_sk += 1
					if str(sk.get("kind_tag", "")) in ["ctl", "buff"]:
						status_sk += 1
				if u.skills.is_empty():
					empty += 1
		var w: int = m.winner
		wins[w if w >= 0 else 2] += 1
		rounds += int(m.st.round)
		if int(m.st.round) >= 10:
			cap10 += 1
		if w >= 0:
			decided += 1
			var hi: int = maxi(m.st.sides[0].score, m.st.sides[1].score)
			var lo: int = mini(m.st.sides[0].score, m.st.sides[1].score)
			score_w += hi
			score_l += lo
			if lead_after1 == w:
				first_round_leader_wins += 1
	print("总计 %d 局：0号位胜 %d / 1号位胜 %d / 平 %d；平均轮数 %.2f；打满10轮 %d" % [n, wins[0], wins[1], wins[2], float(rounds) / n, cap10])
	print("胜者平均分 %.1f / 败者 %.1f；第1轮领先者最终获胜 %d/%d" % [score_w / maxf(1.0, decided), score_l / maxf(1.0, decided), first_round_leader_wins, decided])
	print("叠层状态：出现过叠层的局 %d/%d；每局叠层 %.2f、用掉蓄力 %.2f、灼烧 %.2f、层数封顶 %.2f；最大单次伤害 %d；≥40 的大伤害每局 %.2f" % [stack_games, n, float(ev.get("stack", 0)) / n, float(ev.get("stack_spent", 0)) / n, float(ev.get("burn", 0)) / n, float(ev.get("stack_capped", 0)) / n, maxhit, float(bighit) / n])
	print("  各状态叠层次数/局：易伤 %.2f 灼烧 %.2f 衰弱 %.2f 蓄力 %.2f 铁壁 %.2f" % [float(ev.get("st_易伤", 0)) / n, float(ev.get("st_灼烧", 0)) / n, float(ev.get("st_衰弱", 0)) / n, float(ev.get("st_蓄力", 0)) / n, float(ev.get("st_铁壁", 0)) / n])
	print("技能：每局控/增益类 %.2f / 共 %.2f 张；空卡 %.2f 张；fizzle 每局 %.2f；击倒每局 %.2f" % [float(status_sk) / n, float(all_sk) / n, float(empty) / n, float(ev.get("fizzle", 0)) / n, float(ev.get("down", 0)) / n])
	quit()

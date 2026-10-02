extends SceneTree
# 数字牌模式：电脑对电脑整局。用法： -- 局数 起始种子
const NR = preload("res://scripts/numcard/nc_rules.gd")
const NM = preload("res://scripts/numcard/nc_match.gd")

func deck_of(cls: String) -> Dictionary:
	var p: Dictionary = NR.PRESETS[cls]
	return {"cls": cls, "words": (p.words as Dictionary).duplicate(), "kws": (p.kws as Array).duplicate(), "hp": [7, 7, 7]}

func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 10
	var s0 := int(args[1]) if args.size() > 1 else 1
	var wins := {}
	var games := {}
	var rounds := 0
	var first_w := 0
	var decided := 0
	var kos := 0
	var t0 := Time.get_ticks_msec()
	var problems := 0
	var talent_lines: Array = []
	for c in NR.CLASSES:
		wins[c] = 0
		games[c] = 0
	for g in n:
		var nc: int = NR.CLASSES.size()
		var c0: String = NR.CLASSES[g % nc]
		var c1: String = NR.CLASSES[(g + 1 + (g / nc) % (nc - 1)) % nc]
		for c in [c0, c1]:
			var p := NR.deck_problem(NR.PRESETS[c].words, NR.PRESETS[c].kws)
			if p != "":
				print("预设卡组不合规：", c, " ", p)
				problems += 1
		var m := NM.new()
		m.start(deck_of(c0), deck_of(c1), s0 + g, false, false)
		m.run_to_end()
		rounds += m.rnd
		for s in 2:
			kos += int(m.R.kos[s])
		if m.winner >= 0:
			decided += 1
			if m.winner == m.first0:
				first_w += 1
			if c0 != c1:
				wins[m.cls_of(m.winner)] += 1
		if c0 != c1:
			games[c0] += 1
			games[c1] += 1
		for s in 2:
			var st: Dictionary = m.stats[s]
			var tl := []
			for k in st:
				if not str(k).begins_with("tal_"):
					tl.append("%s%d" % [k, int(st[k])])
			if g < 4:
				talent_lines.append("  第%d局 %s：%s" % [g + 1, m.cls_of(s), " ".join(tl)])
		if g < 3:
			print("第%d局 %s 对 %s：%d 轮，胜者 %d，完成度 %.0f%% / %.0f%%" % [g + 1, c0, c1, m.rnd, m.winner, 100.0 * m.progress(0), 100.0 * m.progress(1)])
	var parts: Array = []
	for c in NR.CLASSES:
		parts.append("%s %d/%d" % [c, int(wins[c]), int(games[c])])
	print("数字牌模式 %d 局：平均 %.1f 轮；首轮先宣告方胜 %d/%d；用时 %.1f 秒" % [n, float(rounds) / n, first_w, decided, (Time.get_ticks_msec() - t0) / 1000.0])
	print("职业胜场：" + "  ".join(parts))
	print("预设卡组问题 %d" % problems)
	for line in talent_lines:
		print(line)
	quit(1 if problems > 0 else 0)

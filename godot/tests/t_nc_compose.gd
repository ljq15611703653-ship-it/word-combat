extends SceneTree
# 数字牌模式 · 拼句台：拼到一半也能读出人话、每个词/数字的预览、辅助轮建议能原样装回句子并拼好
const NR = preload("res://scripts/numcard/nc_rules.gd")
const NM = preload("res://scripts/numcard/nc_match.gd")
const Composer = preload("res://scripts/numcard/ui/nc_composer.gd")

var fails := 0

func check(ok: bool, msg: String) -> void:
	print(("  通过 " if ok else "  失败 ") + msg)
	if not ok:
		fails += 1

func deck_of(cls: String) -> Dictionary:
	var p: Dictionary = NR.PRESETS[cls]
	return {"cls": cls, "words": (p.words as Dictionary).duplicate(), "kws": (p.kws as Array).duplicate(), "hp": [7, 7, 7]}

func _init() -> void:
	await process_frame
	for cls in NR.CLASSES:
		print("【%s】" % cls)
		var m := NM.new()
		m.start(deck_of(cls), deck_of("血" if cls != "血" else "并"), 3, true, false)
		# 让电脑先手的话先走掉它那一步
		while m.declare_side() == 1:
			m.ai_step()
		var pop = Composer.new()
		root.add_child(pop)
		pop.setup(m, int(m.remaining[0][0]))
		pop.add_word("选择")
		check(pop.draft_text(pop.tokens).find("几个") >= 0, "只放了【选择】：人话里目标数写成“几个” → " + pop.draft_text(pop.tokens))
		pop.add_number(2 if m.usable_values(0).has(2) else 1)
		pop.add_word("敌方")
		pop.add_word("随从")
		pop.add_word("造成")
		var d: String = pop.draft_text(pop.tokens)
		check(d.find("几 点伤害") >= 0, "放到【造成】：伤害写成“几 点” → " + d)
		var pv: String = pop._preview_with({"t": "n", "v": 1})
		check(pv.find("1 点伤害") >= 0, "数字 1 的预览 → " + pv)
		pop.add_number(1)
		pop.add_word("伤害")
		check(bool(pop.parse(pop.tokens).complete), "选择 N 敌方 随从 造成 1 伤害 能拼好")
		if cls == "续":
			var names: Array = []
			for it in pop.options().words:
				names.append(str(it[0]))
			check("持续" in names, "续流：伤害后面能接【持续】")
			pop.add_word("持续")
			check(pop.draft_text(pop.tokens).find("再来一次") >= 0, "续流：接了持续，人话说每轮再来一次 → " + pop.draft_text(pop.tokens))
		if cls == "择":
			check(str(pop.parse(pop.tokens).clauses[0].tmode) == "late", "择流：选择的目标是待定")
			check(pop.draft_text(pop.tokens).find("待定") >= 0, "择流：人话里写待定 → " + pop.draft_text(pop.tokens))
		if cls == "并":
			var n := 1
			while n < NR.B_CLAUSES:
				pop.add_word("并")
				for w in ["选择"]:
					pop.add_word(w)
				pop.add_number(1)
				for w2 in ["敌方", "随从", "造成"]:
					pop.add_word(w2)
				pop.add_number(1)
				pop.add_word("伤害")
				n += 1
			check((pop.parse(pop.tokens).clauses as Array).size() == NR.B_CLAUSES, "并流：能拼到 %d 段" % NR.B_CLAUSES)
		# 辅助轮
		var sug: Array = pop.NAI.suggest(m, 0, pop.uid, 3)
		check(not sug.is_empty(), "辅助轮有建议（%d 条）" % sug.size())
		for it2 in sug:
			var toks: Array = pop.act_tokens(it2.act.cl)
			pop.tokens = toks
			var pr: Dictionary = pop.parse(toks)
			var ok: bool = bool(pr.get("complete", false)) and (pr.clauses as Array).size() == (it2.act.cl as Array).size()
			check(ok, "建议装回句子能拼好：" + pop.NT.action_text(m, it2.act.cl))
		pop.queue_free()
	print("拼句台测试：%s" % ("全部通过" if fails == 0 else "失败 %d 项" % fails))
	quit(1 if fails > 0 else 0)

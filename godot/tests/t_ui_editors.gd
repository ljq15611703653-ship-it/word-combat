extends SceneTree
# 编辑器（拼句台）的行为测试：拼词、数字牌、改数字、撤回、读取已有技能、确定。
const G = preload("res://scripts/core/grammar.gd")
const D = preload("res://scripts/core/deck.gd")
const R = preload("res://scripts/core/recipes.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const EditorPopup = preload("res://scripts/ui/editor_popup.gd")

var fails := 0
var committed_unit: Dictionary = {}

func check(cond: bool, msg: String) -> void:
	print("  ", "ok  " if cond else "FAIL ", msg)
	if not cond:
		fails += 1

func _init() -> void:
	await process_frame
	Lex.load_all()
	var pool := {}
	for w in Lex.implemented():
		pool[w] = 3
	var deck := D.new_deck()
	var pop := EditorPopup.new()
	root.add_child(pop)
	pop.open(deck, 0, pool, "initial")
	pop.committed.connect(func(u): committed_unit = u)
	var cp = pop.composer
	check(cp.tokens.is_empty() and not cp.is_complete(), "新卡一开始是空的，没有成句")
	check(pop.btn_commit.disabled, "没拼成句时“确定”不可点")
	# 1. 逐词拼一句：选择 目标 一个 敌方 随从 造成 14 伤害
	for w in ["选择", "一个", "敌方", "随从", "造成"]:
		cp.add_word(w)
	check(not cp.is_complete(), "拼到一半没有成句")
	check(cp.opts.numbers == ["value"], "拼到“造成”后下一张要填数字")
	check(cp.add_number(0, "value") == false and cp.tokens.size() == 5, "数字超出范围会被拒绝")
	check(cp.add_number(14, "value") and cp.tokens.size() == 6, "填 14 烙成一张数字牌")
	check("伤害" in cp.opts.words_have, "填完数字后，“伤害”是能接的")
	cp.add_word("伤害")
	check(cp.is_complete(), "接上“伤害”就成句了")
	pop._on_composed()
	check(not pop.cur_skill.is_empty() and pop.cur_skill.text.find("14 点伤害") >= 0, "人话：" + str(pop.cur_skill.get("text", "")))
	check(not pop.btn_commit.disabled, "成句后“确定”可点")
	# 2. 不合法的词接不上
	var before: int = cp.tokens.size()
	cp.add_word("恢复")
	check(cp.tokens.size() == before, "接不上的词（恢复）点了没有反应")
	# 3. 改数字：点数字牌 → 重新填
	cp._on_tile_clicked(5)
	check(cp.editing_idx == 5, "点数字牌进入修改")
	check(cp.add_number(9, "value") and int(cp.tokens[5].v) == 9 and cp.editing_idx == -1, "改成 9，重新烙")
	pop._on_composed()
	check(pop.cur_skill.text.find("9 点伤害") >= 0, "技能跟着变成 9 点")
	# 4. 加修饰：双倍
	cp.add_word("双倍")
	pop._on_composed()
	check(pop.cur_skill.text.find("9 点伤害，伤害翻倍") >= 0, "加“双倍”后显示：9 点伤害，伤害翻倍")
	await process_frame
	await process_frame
	await process_frame
	check(cp.hint_label.text.find("9 点伤害，伤害翻倍") >= 0, "人话提示也一样：" + cp.hint_label.text)
	# 5. 撤回 / 全部拿下
	cp.undo()
	check(cp.tokens.size() == 7, "撤回一张")
	cp._on_tile_clicked(2)
	check(cp.tokens.size() == 2, "点第 3 张牌会拿下它和后面的牌")
	cp.clear_all()
	check(cp.tokens.is_empty(), "全部拿下")
	# 6. 词不够就拼不下去
	var tiny := {"造成": 1, "伤害": 1, "自身": 1}
	cp.setup(tiny, [])
	cp.add_word("自身")
	cp.add_word("造成")
	cp.add_number(5, "value")
	cp.add_word("伤害")
	check(cp.is_complete(), "词库里只有这几个词也能拼成一句")
	cp.add_word("双倍")
	check(cp.tokens.size() == 4, "没有“双倍”这个词，加不上")
	# 7. 读取已有技能：全部模板都能读回来
	var loaded_ok := 0
	for t in R.catalog():
		var sk: Dictionary = R.build(t.id, R.defaults(t.id))
		cp.setup(pool, S.tokens_of_skill(sk.nodes))
		if cp.is_complete():
			loaded_ok += 1
	check(loaded_ok == R.catalog().size(), "全部 %d 个模板的技能都能读回拼句台（%d）" % [R.catalog().size(), loaded_ok])
	# 8. 确定：飞词组句动画走完，技能写进卡
	cp.setup(pool, S.tokens_of_skill([G.dmg(G.T("choose", "enemy"), G.N(11))]))
	pop._on_composed()
	pop._on_commit()
	var waited := 0
	while committed_unit.is_empty() and waited < 600:
		await process_frame
		waited += 1
	check(not committed_unit.is_empty() and committed_unit.skills.size() == 1, "点确定后（%d 帧）技能写进卡" % waited)
	if not committed_unit.is_empty():
		check(committed_unit.skills[0].text.find("11 点伤害") >= 0, "写进卡的技能：" + str(committed_unit.skills[0].text))
	# 9. 模糊匹配模式：随便扔词进托盘，电脑给出能拼的句子，并能“采用”
	cp.setup(pool, [])
	cp.toggle_fuzzy()
	check(cp.fuzzy_mode and cp.tray_box.visible and not cp.rail_box.visible, "切到模糊匹配模式后出现托盘")
	for w in ["造成", "伤害", "自身"]:
		cp.add_word(w)
	check(cp.tray.size() == 3 and cp.tokens.is_empty(), "词进了托盘（不按语法顺序也行）")
	var waited2 := 0
	while cp.fuzzy_box.get_child_count() < 2 and waited2 < 600:
		await process_frame
		waited2 += 1
	check(cp.fuzzy_box.get_child_count() >= 2, "电脑给出了分析结果（%d 帧）：%s" % [waited2, cp.fuzzy_msg.text])
	var f = load("res://scripts/compose/fuzzy.gd").new()
	var r: Dictionary = await f.solve(["造成", "伤害", "自身"])
	check(not r.exact.is_empty() and r.exact[0].text.find("对自身造成") >= 0, "托盘里 造成/伤害/自身 刚好能拼：" + str(r.exact[0].text if not r.exact.is_empty() else ""))
	var r2: Dictionary = await f.solve(["减伤", "友方", "随从"])
	check(not r2.completed.is_empty() and not r2.completed[0].added.is_empty(), "减伤+友方+随从 差一张目标词：补 " + str(r2.completed[0].added if not r2.completed.is_empty() else []))
	if not r.exact.is_empty():
		cp.adopt(r.exact[0].tokens)
		check(not cp.fuzzy_mode and cp.is_complete(), "“采用这一句”后回到拼句台并成句")
	print("编辑器测试完成，失败数 ", fails)
	quit(fails)

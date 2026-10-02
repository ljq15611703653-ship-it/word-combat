extends SceneTree
# 拼句台“先看后拼”：还没把词接上去之前，就能看到接上之后整句的人话。
#   · 能接的词（现在能接条 / 词库 / 连接牌 / 建议里的“接【某】”）悬停 → 人话提示读出接上后的整句
#   · 数字框里打数字 → 先读出填进去之后的整句
#   · 句子轨下面一直写着“读作：……”，没定的数字写“（几）”
#   · 对局拼句窗口里，推荐句子 / “我想干什么”的结果，人话直接写在按钮下面
const S = preload("res://scripts/compose/sentence.gd")
const H = preload("res://scripts/compose/hints.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Composer = preload("res://scripts/compose/composer.gd")
const Compose = preload("res://scripts/ui/duel_compose.gd")

var fails := 0

func check(cond: bool, msg: String) -> void:
	print("  ", "ok  " if cond else "FAIL ", msg)
	if not cond:
		fails += 1

func settle() -> void:
	for i in 4:
		await process_frame

func labels_under(n: Node) -> Array:
	var out: Array = []
	for c in n.find_children("*", "Label", true, false):
		out.append(str(c.text))
	return out

func _init() -> void:
	await process_frame
	Lex.load_all()
	# ---- 0. 纯函数：把“未定”写成人话
	check(H.humanize("对你选的一个敌方随从造成 某某 点伤害") == "对你选的一个敌方随从造成（几）点伤害", "humanize：某某 点 →（几）点")
	check(H.humanize("使自身受到的伤害降低 某某，持续到本轮结束").begins_with("使自身受到的伤害降低（几成）"), "humanize：降低 某某 →（几成）")
	check(H.humanize("接下来 %d 秒内，第一次自身受到伤害时，某某" % H.HOLE_N).begins_with("接下来（几）秒内"), "humanize：没填的秒数 →（几）秒")
	check(H.humanize("你选的一个某某随从").ends_with("（哪方）随从"), "humanize：没定的阵营 →（哪方）")
	check(H.humanize("对你选的一个敌方随从造成 9 点伤害，伤害翻倍") == "对你选的一个敌方随从造成 9 点伤害，伤害翻倍", "humanize 不改已经定好的句子")

	var pool := {}
	for w in Lex.implemented():
		pool[w] = 3
	var cp = Composer.new()
	cp.size = Vector2(1200, 800)
	root.add_child(cp)
	cp.setup(pool, [])
	await settle()
	check(str(cp.rail_read.text).begins_with("读作："), "空句子：句子轨下面有“读作”一行：" + cp.rail_read.text)
	check(str(cp.status_label.text).find("下一张可以接") >= 0, "空句子：状态行写出下一张能接什么")
	var p0: String = cp.preview_line(S.W("自身"))
	check(p0.find("接上【自身】") >= 0 and p0.find("自身") >= 0, "空句子悬停【自身】：" + p0)

	# ---- 1. 拼到目标：悬停“造成”，先读出整句
	for w in ["选择", "一个", "敌方", "随从"]:
		cp.add_word(w)
	await settle()
	check(str(cp.rail_read.text).find("你选的一个敌方随从") >= 0, "句子轨读作：" + cp.rail_read.text)
	check("造成" in cp.strip_cards, "“现在能接”条里有【造成】")
	var t0 := Time.get_ticks_msec()
	var pv: Dictionary = cp.preview_for(S.W("造成"))
	var dt := Time.get_ticks_msec() - t0
	check(bool(pv.ok) and str(pv.text).find("造成") >= 0 and str(pv.text).find("伤害") >= 0, "接【造成】预览：%s（%dms）" % [pv.text, dt])
	t0 = Time.get_ticks_msec()
	cp.preview_for(S.W("造成"))
	check(Time.get_ticks_msec() - t0 <= 2 and cp._preview_cache.has("W:造成"), "同一串牌第二次取预览走缓存")
	var card: Control = cp.strip_cards["造成"]
	card.mouse_entered.emit()
	var hl: String = cp.hint_label.text
	check(hl.find("如果接上【造成】") >= 0 and hl.find("你选的一个敌方随从") >= 0 and hl.find("伤害") >= 0, "悬停【造成】：人话提示换成预览：" + hl)
	check(str(card.tooltip_text).find("伤害") >= 0, "悬停后卡片提示框也是这句人话")
	card.mouse_exited.emit()
	check(str(cp.hint_label.text).begins_with("到目前为止的人话版："), "移开后人话提示回到“到目前为止”：" + cp.hint_label.text)
	# 接不上的词：词库里悬停不出预览
	var rc: Control = cp.rack_cards["双倍"].root
	rc.mouse_entered.emit()
	check(str(cp.hint_label.text).begins_with("到目前为止的人话版："), "现在接不上的【双倍】悬停不出预览")
	rc.mouse_exited.emit()
	# 合语法但不像样（给敌人回血）：照样读出来，并提醒
	var odd: String = cp.preview_line(S.W("恢复"))
	check(odd.find("恢复") >= 0 and odd.find("生命") >= 0 and odd.find("不划算") >= 0, "给敌人回血也先读出来并提醒：" + odd)
	# 建议里的整句：放大写“读作”，按钮写出接哪一张
	var sugg_txt: Array = labels_under(cp.sugg_box)
	var has_read := false
	for s in sugg_txt:
		if s.begins_with("读作："):
			has_read = true
	check(has_read, "三种流派每句都写着“读作：……”")
	var sbtn := false
	for b in cp.sugg_box.find_children("*", "Button", true, false):
		if str(b.text).begins_with("接【") or str(b.text).begins_with("填 "):
			sbtn = true
	check(sbtn, "建议的按钮写出接哪一张（接【某】▶）")

	# ---- 2. 接上“造成”：轮到数字，打数字时先读出整句
	cp.add_word("造成")
	await settle()
	check(cp.opts.numbers == ["value"], "接上【造成】后要填数字")
	var rr: String = cp.rail_read.text
	check(rr.find("（多少）") >= 0 or rr.find("（几）") >= 0, "没填的数字在句子轨上写成空位：" + rr)
	cp._preview_number("value", "14")
	check(str(cp.hint_label.text).find("如果填上 14") >= 0 and str(cp.hint_label.text).find("14 点伤害") >= 0, "打 14 时先读出：" + cp.hint_label.text)
	cp._preview_number("value", "0")
	check(str(cp.hint_label.text).find("1~60") >= 0, "打 0 时提示范围：" + cp.hint_label.text)
	cp._preview_number("value", "")
	check(str(cp.hint_label.text).begins_with("到目前为止的人话版："), "清空数字框后回到“到目前为止”")
	check(cp.add_number(14, "value"), "填 14")
	await settle()
	check(cp._preview_cache.is_empty() or not cp._preview_cache.has("W:造成"), "牌一变，预览缓存清空")
	var fin: String = cp.preview_line(S.W("伤害"))
	check(fin.find("就成句 ✓") >= 0 and fin.find("14 点伤害") >= 0, "接【伤害】就成句：" + fin)
	cp.add_word("伤害")
	await settle()
	check(cp.is_complete() and str(cp.rail_read.text).find("14 点伤害。") >= 0, "成句后句子轨读作：" + cp.rail_read.text)
	var dbl: String = cp.preview_line(S.W("双倍"))
	check(dbl.find("伤害翻倍") >= 0, "成句后再悬停【双倍】：" + dbl)
	# 改已有的数字：先读出改完的整句
	cp._on_tile_clicked(5)
	cp._preview_number("value", "9")
	check(str(cp.hint_label.text).find("把数字改成 9") >= 0 and str(cp.hint_label.text).find("9 点伤害") >= 0, "改数字时先读出：" + cp.hint_label.text)
	cp.add_number(9, "value")
	await settle()

	# ---- 3. 时长没填：写“（几）秒”
	cp.setup(pool, [S.W("当"), S.W("自身"), S.W("受到伤害"), S.W("持续")])
	await settle()
	check(str(cp.rail_read.text).find("接下来（几）秒内") >= 0, "“持续”后还没填秒数：" + cp.rail_read.text)
	cp.setup(pool, [S.W("当"), S.W("自身"), S.W("受到伤害")])
	await settle()
	var pc: String = cp.preview_line(S.W("每次"))
	check(pc.find("每当自身受到伤害时") >= 0, "埋伏里悬停【每次】：" + pc)

	# ---- 4. 连接牌也能先看
	cp.setup(pool, [S.W("若"), S.W("自身"), S.W("当前生命")])
	await settle()
	if "低于" in cp.opts.parts:
		var pp: String = cp.preview_line(S.Part("低于"))
		check(pp.find("低于") >= 0, "悬停连接牌【低于】：" + pp)
	else:
		check(false, "“若 自身 当前生命”之后应能接连接牌【低于】：" + str(cp.opts.parts))
	cp.queue_free()

	# ---- 5. 对局拼句窗口：推荐 / 我想干什么 的人话直接写出来，悬停时拼句台读一遍
	var nodes: Array = S.analyze([S.W("选择"), S.W("一个"), S.W("敌方"), S.W("随从"), S.W("造成"), S.Num(12), S.W("伤害")]).skills[0]
	var rec := {"name": "测试一刀", "cost": 3, "foe_after": 20, "foe_before": 32, "my_before": 30, "my_after": 30, "note": "",
		"text": "对你选的一个敌方随从造成 12 点伤害", "sk": {"nodes": nodes}}
	var pop = Compose.new()
	pop.size = Vector2(1400, 900)
	root.add_child(pop)
	pop.setup("小兵", pool, 6, {}, [], [rec])
	await settle()
	var rec_lbl := false
	for s in labels_under(pop):
		if s == "读作：对你选的一个敌方随从造成 12 点伤害":
			rec_lbl = true
	check(rec_lbl, "推荐句子的人话直接写在按钮下面")
	var rbtn: Button = null
	for b in pop.find_children("*", "Button", true, false):
		if str(b.text).begins_with("【测试一刀】"):
			rbtn = b
	check(rbtn != null, "找到推荐按钮")
	if rbtn != null:
		rbtn.mouse_entered.emit()
		check(str(pop.composer.hint_label.text).find("推荐【测试一刀】填进去读作：对你选的一个敌方随从造成 12 点伤害") >= 0, "悬停推荐：拼句台人话提示先读出：" + pop.composer.hint_label.text)
		rbtn.mouse_exited.emit()
		check(str(pop.composer.hint_label.text).find("推荐【") < 0, "移开推荐后人话提示恢复")
	pop.intent_edit.text = "打全部敌人"
	pop._find_intent()
	var it_read := 0
	for s in labels_under(pop.intent_box):
		if s.begins_with("读作："):
			it_read += 1
	check(it_read >= 1, "“我想干什么”找到的句子也写出人话（%d 条）" % it_read)
	pop.queue_free()
	await process_frame
	print("先看后拼测试完成，失败数 ", fails)
	quit(0 if fails == 0 else 1)

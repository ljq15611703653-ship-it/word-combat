extends Control
# 标题画面：漂浮的词卡作背景。

const K = preload("res://scripts/ui/kit.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Settings = preload("res://scripts/ui/settings.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")

signal start_game()
signal watch_demo()
signal start_tutorial()
signal start_first_match()
signal start_adventure()

var rules_panel: Control

func _ready() -> void:
	Lex.load_all()
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.add_child(K.glow())
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var float_layer := Control.new()
	float_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	float_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(float_layer)
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var words: Array = Lex.implemented()
	for i in 26:
		var w: String = words[rng.randi() % words.size()]
		var c := K.word_card(w, 1, -1, Vector2(84, 110))
		c.modulate.a = rng.randf_range(0.10, 0.28)
		c.position = Vector2(rng.randf_range(0, 1500), rng.randf_range(0, 820))
		c.rotation = rng.randf_range(-0.4, 0.4)
		c.scale = Vector2.ONE * rng.randf_range(0.7, 1.4)
		float_layer.add_child(c)
		var t := c.create_tween().set_loops()
		var dy := rng.randf_range(-60, 60)
		t.tween_property(c, "position:y", c.position.y + dy, rng.randf_range(3.0, 6.0)).set_trans(Tween.TRANS_SINE)
		t.tween_property(c, "position:y", c.position.y - dy, rng.randf_range(3.0, 6.0)).set_trans(Tween.TRANS_SINE)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var v := K.vbox(14)
	v.custom_minimum_size = Vector2(520, 0)
	center.add_child(v)
	var title := K.label("词　战", 120, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	title.add_theme_color_override("font_outline_color", Color("3a2d10"))
	title.add_theme_constant_override("outline_size", 12)
	v.add_child(title)
	v.add_child(K.label("拼　词　·　设　伏　·　见　招　拆　招", 26, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(K.spacer(24))
	Settings.load_all()
	var fm := not Settings.first_match_done
	var b0 := K.button("第一局：桌宠带你打一场" + ("  ← 第一次玩点这里" if fm else ""), "primary" if fm else "normal", 24)
	b0.custom_minimum_size = Vector2(0, 56)
	b0.pressed.connect(func(): start_first_match.emit())
	v.add_child(b0)
	var bt := K.button("新手教程（零基础，约5分钟）" + ("" if Settings.tutorial_done else "  ← 第一次玩点这里"), "primary" if not Settings.tutorial_done else "normal", 22)
	bt.custom_minimum_size = Vector2(0, 52)
	bt.pressed.connect(func(): start_tutorial.emit())
	v.add_child(bt)
	var b1 := K.button("开始对局", "normal" if fm else "primary", 30)
	b1.custom_minimum_size = Vector2(0, 68)
	b1.pressed.connect(func(): start_game.emit())
	v.add_child(b1)
	var ba := K.button("冒险：长难句训练营（%d 关通关）" % Settings.adv_cleared.size(), "normal", 22)
	ba.custom_minimum_size = Vector2(0, 52)
	ba.pressed.connect(func(): start_adventure.emit())
	v.add_child(ba)
	var lv_row := K.hbox(8)
	lv_row.alignment = BoxContainer.ALIGNMENT_CENTER
	var desc := K.label("", 15, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	var lv_btns: Array = []
	var refresh_lv := func():
		for i in lv_btns.size():
			var b: Button = lv_btns[i]
			var active: bool = i == Settings.level
			b.add_theme_stylebox_override("normal", K.style(K.GOLD if active else K.PANEL2, Color("fff0c0") if active else K.EDGE, 10, 1, 4))
			b.add_theme_color_override("font_color", Color("20180a") if active else K.TEXT)
			b.add_theme_color_override("font_hover_color", Color("20180a") if active else K.TEXT)
		desc.text = "难度：" + Settings.LEVEL_DESC[Settings.level]
	for i in 3:
		var b := K.button(Settings.LEVEL_NAMES[i], "normal", 18)
		b.custom_minimum_size = Vector2(110, 38)
		lv_btns.append(b)
		lv_row.add_child(b)
		b.pressed.connect(func():
			Settings.level = i
			Settings.save_all()
			refresh_lv.call())
	var snd := K.button("音效：开" if not Settings.muted else "音效：关", "ghost", 16)
	snd.pressed.connect(func():
		Settings.muted = not Settings.muted
		Sfx.muted = Settings.muted
		Settings.save_all()
		snd.text = "音效：关" if Settings.muted else "音效：开")
	lv_row.add_child(snd)
	var cbtn := K.button("辅助轮：开" if Settings.coach else "辅助轮：关", "ghost", 16)
	cbtn.tooltip_text = "抽词/构筑时给出路线提示，并提供“自动组合”“换一批”。纯新手建议打开。"
	cbtn.pressed.connect(func():
		Settings.coach = not Settings.coach
		Settings.save_all()
		cbtn.text = "辅助轮：开" if Settings.coach else "辅助轮：关")
	lv_row.add_child(cbtn)
	var pbtn := K.button("桌宠：开" if Settings.pet else "桌宠：关", "ghost", 16)
	pbtn.tooltip_text = "小词会在你拼技能、准备出招时评价这一招（新手引导里它总会出现）。"
	pbtn.pressed.connect(func():
		Settings.pet = not Settings.pet
		Settings.save_all()
		var P = load("res://scripts/ui/pet.gd")
		if P.inst != null:
			P.inst.visible = Settings.pet
		pbtn.text = "桌宠：开" if Settings.pet else "桌宠：关")
	lv_row.add_child(pbtn)
	v.add_child(lv_row)
	v.add_child(desc)
	refresh_lv.call()
	var b2 := K.button("玩法说明", "normal", 24)
	b2.custom_minimum_size = Vector2(0, 54)
	b2.pressed.connect(_show_rules)
	v.add_child(b2)
	var b3 := K.button("观战演示（电脑对电脑）", "ghost", 20)
	b3.pressed.connect(func(): watch_demo.emit())
	v.add_child(b3)
	var ver := K.label("原型 · Godot 4.7 · 词库 %d 词" % Lex.words.size(), 14, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(ver)
	rules_panel = Control.new()
	rules_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rules_panel.visible = false
	add_child(rules_panel)

func _show_rules() -> void:
	K.clear_children(rules_panel)
	rules_panel.visible = true
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.8)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rules_panel.add_child(dim)
	var win := K.panel(Color("171b29"), K.GOLD_D, 18, 2, 18)
	win.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	win.offset_left = 150
	win.offset_right = -150
	win.offset_top = 40
	win.offset_bottom = -40
	rules_panel.add_child(win)
	var v := K.vbox(8)
	win.add_child(v)
	v.add_child(K.label("玩法说明", 34, K.GOLD))
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var t := K.vbox(10)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(t)
	v.add_child(sc)
	var lines := [
		["目标", "双方各三个随从。每打倒一个敌人，得到它的生命上限那么多分；每轮全部结算后，若至少一方达到 150 分，分数较高者获胜。最多 12 轮。倒下的随从休整一轮后满血复出。"],
		["开局", "你和对手各自从 3 个兜子里挑 1 个，共挑两次（不用抢）。然后把 66 点生命分给三个随从，每个至少 10，分完不能再改。"],
		["每轮现场拼", "没有预先做好的卡。每轮看到对手的宣告之后（先手那方要盲拼，后手能看到全部），你给每个活着的随从从零拼一句话，每个随从一轮一句，不限时间。拼句台里有辅助轮建议。"],
		["词", "基础词无限供应。进阶词、奇术词是永久的词库，来自每轮战斗后的 5 个兜子（上一轮的先手先挑，另一方再挑，其余作废）。本轮用过的进阶词/奇术词，下一轮冷却。关键词（首挡、不屈、回击……）也是词库里的词，每个随从装一个，挑完兜子后可以免费换。"],
		["行动点", "每句话要付行动点：5 点启动费 + 填入的数字 + 词的价格。每轮 +45，最多攒 180。可以一轮多拼，也可以攒起来拼大句。"],
		["起手与时间轴", "行动点每 10 点要 1 秒起手：大招慢，小招快。双方的句子沿同一条 20 秒时间轴一起结算。你拼的句子里可以包含监听、减伤、改道、回敬、延后等应对。"],
		["叠层状态", "易伤、灼烧、衰弱给敌人，蓄力、铁壁给自己。施加后是 1 级，之后每过一轮自动 +1 级，指数增长。状态默认只撑本轮，每加一个【持久】持续轮数翻倍；状态还在时再放一次，等级 +1 并刷新倒计时。蓄力在你下一次出手时一次用完。"],
		["选目标", "“选择 一个”是选一个目标，多写几个“一个”最多选 3 个（每多一个，词价 +2）。拼出来的数字也可以用【敌方人数】【加上】等词算。"],
	]
	for l in lines:
		var row := K.hbox(14)
		var h := K.label(l[0], 20, K.GOLD)
		h.custom_minimum_size.x = 130
		row.add_child(h)
		var b := K.wrap_label(l[1], 18, K.TEXT)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(b)
		t.add_child(row)
	var close := K.button("明白了", "primary", 22)
	close.custom_minimum_size = Vector2(0, 48)
	close.pressed.connect(func(): rules_panel.visible = false)
	v.add_child(close)

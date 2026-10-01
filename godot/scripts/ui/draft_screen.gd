extends Control
# 抽词界面：两袋各25词，先手先选。

const Tut = preload("res://scripts/tutorial/tutorial.gd")
const Bag3D = preload("res://scripts/view3d/bag3d.gd")
const K = preload("res://scripts/ui/kit.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Settings = preload("res://scripts/ui/settings.gd")
const Pet = preload("res://scripts/ui/pet.gd")
const Coach = preload("res://scripts/core/coach.gd")

signal picked(idx)
signal finished()

var m
var panels: Array = []
var info_label: Label
var continue_btn: Button
var _picker := 0
var chosen := -1
var can_pick := false
var _ai_idx := -1
var coach_box: VBoxContainer
var coach_info: Dictionary = {}
var plan: Dictionary = {}
var rec_chips: Array = [null, null]
var bags3d: Array = [null, null]
var detail_layer: Control

func setup(match_obj, ai_idx: int = -1) -> void:
	m = match_obj
	_picker = int(m.picker)   # 开局选词里选完一袋会立刻轮到下一袋，所以要在这里记住这一袋是谁先挑
	_ai_idx = ai_idx
	K.clear_children(self)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var root := MarginContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_" + side, 28)
	add_child(root)
	var v := K.vbox(8)
	root.add_child(v)
	var opening: bool = m.phase == "opening"
	var title := K.label(("开局选词 · 第 %d / %d 袋" % [m.opening_idx + 1, m.opening_total]) if opening else ("第 %d 轮 · 词袋" % m.st.round), 30, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(title)
	info_label = K.label("", 20, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(info_label)
	Settings.load_all()
	coach_info = Coach.analyze_draft(m.pools[0], m.decks[0], m.bags)
	plan = Coach.draft_plan(m.pools[0], m.decks[0], m.bags, m.public_deck(1))
	coach_info["pick"] = plan.pick
	coach_info["reason"] = plan.reason
	coach_box = K.vbox(4)
	v.add_child(coach_box)
	var row := K.hbox(28)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(row)
	for i in 2:
		var p := _bag_panel(i)
		panels.append(p)
		row.add_child(p)
	# 已有词
	var pool_box := K.panel(K.PANEL, K.EDGE, 12, 1)
	var pv := K.vbox(6)
	pool_box.add_child(pv)
	pv.add_child(K.label("你目前持有的词（%d 张）" % _pool_total(), 15, K.MUTED))
	var sc := ScrollContainer.new()
	sc.custom_minimum_size = Vector2(0, 54)
	sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 5)
	flow.add_theme_constant_override("v_separation", 4)
	flow.custom_minimum_size.x = 1450
	var keys: Array = m.pools[0].keys()
	keys.sort_custom(func(a, b): return Lex.words[a].id < Lex.words[b].id)
	for w in keys:
		flow.add_child(K.word_tag(w, true, int(m.pools[0][w])))
	sc.add_child(flow)
	sc.custom_minimum_size = Vector2(0, 62)
	pv.add_child(sc)
	v.add_child(pool_box)
	var bottom := K.hbox(10)
	bottom.alignment = BoxContainer.ALIGNMENT_CENTER
	continue_btn = K.button("收下并继续  →", "primary", 22)
	continue_btn.custom_minimum_size = Vector2(260, 52)
	continue_btn.modulate.a = 0.0
	continue_btn.disabled = true
	continue_btn.pressed.connect(func():
		Tut.fire("draft_done")
		finished.emit())
	Tut.tag(continue_btn, "d:continue")
	bottom.add_child(continue_btn)
	v.add_child(bottom)
	_begin()
	_refresh_coach()
	if Settings.coach and m.human[_picker] and Pet.inst != null and is_instance_valid(Pet.inst) and not Tut.is_on():
		Pet.chat("我建议选%s袋。%s" % ["左" if int(plan.pick) == 0 else "右", plan.reason], "talk", 12.0)
	Tut.fire("screen:draft")

func _bag_summary(i: int) -> String:
	for o in plan.per_bag[i].options:
		if o.buildable:
			return "能拼出【%s】。怎么拼：%s" % [o.name, o.how]
	return "对你现有的路线帮助不大"

func _bag_line(i: int) -> String:
	var b: Dictionary = coach_info.per_bag[i]
	var parts: Array = []
	if not b.done.is_empty():
		var names: Array = []
		for d in b.done.slice(0, 3):
			names.append("%s" % d.name)
		parts.append("新凑齐：" + "、".join(names))
	if not b.near.is_empty():
		var nn: Array = []
		for c in b.near.slice(0, 2):
			nn.append("%s（差 %d 个）" % [c.name, c.n])
		parts.append("接近：" + "、".join(nn))
	return "；".join(parts) if not parts.is_empty() else "对你现有的路线帮助不大"

func _refresh_coach() -> void:
	K.clear_children(coach_box)
	var head := K.hbox(10)
	head.alignment = BoxContainer.ALIGNMENT_CENTER
	var tg := K.button("辅助轮：开" if Settings.coach else "辅助轮：关", "ghost", 15)
	tg.custom_minimum_size = Vector2(0, 30)
	tg.pressed.connect(func():
		Settings.coach = not Settings.coach
		Settings.save_all()
		_refresh_coach())
	head.add_child(tg)
	coach_box.add_child(head)
	for i in 2:
		if rec_chips[i] != null:
			rec_chips[i].visible = Settings.coach and m.human[_picker] and continue_btn.disabled and int(coach_info.pick) == i
	if not Settings.coach:
		return
	var box := K.panel(Color("1f2a26"), K.GREEN.darkened(0.2), 10, 1)
	var col := K.vbox(3)
	box.add_child(col)
	var pick: int = coach_info.pick
	var mine := pick
	if m.human[_picker]:
		col.add_child(K.wrap_label("小词推荐：%s袋 —— %s" % ["左" if pick == 0 else "右", coach_info.reason], 17, K.GREEN))
	else:
		mine = 1 - _ai_idx
		col.add_child(K.wrap_label("对手先选了%s袋，你拿到%s袋：%s" % [("左" if _ai_idx == 0 else "右"), ("左" if mine == 0 else "右"), _bag_summary(mine)], 17, K.GREEN))
	coach_box.add_child(box)

# 这袋词能拼出的三条备选：激进进攻 / 防御或反制 / 打断控场；写明怎么拼、针对对手什么
func _options_box(i: int) -> Control:
	var box := K.vbox(4)
	var opts: Array = plan.per_bag[i].options
	for o in opts:
		var p := K.panel(Color("1f2a26") if o.buildable else Color("23262f"), K.GREEN.darkened(0.3) if o.buildable else K.EDGE, 8, 1, 6)
		var col := K.vbox(1)
		p.add_child(col)
		var head := ("【%s】%s" % [o.school, o.name]) + ("  ← 这袋才拼得出" if o.fresh else "")
		col.add_child(K.label(head, 15, K.GREEN if o.buildable else K.MUTED))
		if o.buildable:
			col.add_child(K.wrap_label("怎么拼：" + str(o.how), 13, K.TEXT))
			if str(o.note) != "":
				col.add_child(K.wrap_label("针对：" + str(o.note), 13, K.GOLD))
		else:
			col.add_child(K.wrap_label("还差：" + str(o.missing), 13, K.MUTED))
		box.add_child(p)
	if opts.is_empty():
		box.add_child(K.label("这袋对你帮助不大", 14, K.MUTED))
	return box

func _pool_total() -> int:
	var n := 0
	for w in m.pools[0]:
		n += int(m.pools[0][w])
	return n

func _bag_panel(i: int) -> Control:
	var bag: Array = m.bags[i]
	var cnt := {}
	var basic := 0
	var adv := 0
	var rare := 0
	var price := 0
	for w in bag:
		cnt[w] = int(cnt.get(w, 0)) + 1
		var r: String = Lex.words[w].rarity
		if r == "基础":
			basic += 1
		elif r == "进阶":
			adv += 1
		else:
			rare += 1
		price += int(Lex.words[w].price)
	var p := K.panel(K.PANEL, K.EDGE, 16, 2, 10)
	p.name = "bag%d" % i
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.custom_minimum_size = Vector2(700, 0)
	var v := K.vbox(6)
	p.add_child(v)
	var head := K.hbox(8)
	head.add_child(K.label("左袋" if i == 0 else "右袋", 24, K.TEXT))
	head.add_child(K.spacer(1, 10))
	head.add_child(K.chip("基础 %d" % basic, Color("4a5260"), 14))
	head.add_child(K.chip("进阶 %d" % adv, Color("2f5f93"), 14))
	if rare > 0:
		head.add_child(K.chip("奇术 %d" % rare, Color("8a6a1f"), 14))
	head.add_child(K.chip("词价 %d" % price, Color("4a3f20"), 14))
	var rec := K.chip("小词推荐", Color("2c6a44"), 14)
	rec.visible = false
	head.add_child(rec)
	rec_chips[i] = rec
	v.add_child(head)
	# 3D 词袋：里面的牌在滚，袋口上方悬浮着最重要的几个词
	var notable: Array = []
	var uniq: Array = []
	for w in cnt:
		uniq.append(w)
	uniq.sort_custom(func(a, b):
		var ra: int = {"奇术": 0, "进阶": 1, "基础": 2}.get(str(Lex.words[a].rarity), 2)
		var rb: int = {"奇术": 0, "进阶": 1, "基础": 2}.get(str(Lex.words[b].rarity), 2)
		return ra < rb or (ra == rb and Lex.words[a].id < Lex.words[b].id))
	for w in uniq:
		if notable.size() >= 5:
			break
		if str(Lex.words[w].rarity) != "基础" or notable.size() < 3:
			notable.append(w)
	var b3 := Bag3D.new()
	b3.custom_minimum_size = Vector2(0, 300)
	b3.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b3.set_words(bag, notable)
	b3.clicked.connect(func():
		if can_pick:
			can_pick = false
			Sfx.play("pick")
			picked.emit(i))
	b3.hovered.connect(func(on): _hover(i, on))
	bags3d[i] = b3
	v.add_child(b3)
	if Settings.coach and plan.has("per_bag"):
		v.add_child(_options_box(i))
	var more := K.button("查看详情（全部 %d 个词）" % bag.size(), "ghost", 15)
	more.custom_minimum_size = Vector2(0, 32)
	more.pressed.connect(func(): _show_detail(i))
	Tut.tag(more, "d:detail%d" % i)
	v.add_child(more)
	p.gui_input.connect(func(ev): _on_panel_input(ev, i))
	p.mouse_entered.connect(func(): _hover(i, true))
	p.mouse_exited.connect(func(): _hover(i, false))
	return p

# “查看详情”：把这袋所有的词摆出来（弹窗，点空白处关闭）
func _show_detail(i: int) -> void:
	if detail_layer != null and is_instance_valid(detail_layer):
		detail_layer.queue_free()
	var bag: Array = m.bags[i]
	var cnt := {}
	for w in bag:
		cnt[w] = int(cnt.get(w, 0)) + 1
	detail_layer = Control.new()
	detail_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.7)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			detail_layer.queue_free())
	detail_layer.add_child(dim)
	var win := K.panel(Color("171b29"), K.GOLD_D, 16, 2, 14)
	win.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	win.custom_minimum_size = Vector2(1000, 520)
	win.position = Vector2(300, 190)
	detail_layer.add_child(win)
	var v := K.vbox(10)
	win.add_child(v)
	var hb := K.hbox(10)
	hb.add_child(K.label("%s · 全部 %d 个词" % ["左袋" if i == 0 else "右袋", bag.size()], 24, K.GOLD))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(sp)
	var close := K.button("关闭", "normal", 18)
	close.pressed.connect(func(): detail_layer.queue_free())
	hb.add_child(close)
	v.add_child(hb)
	var grid := GridContainer.new()
	grid.columns = 9
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	var keys: Array = cnt.keys()
	keys.sort_custom(func(a, b): return Lex.words[a].id < Lex.words[b].id)
	var delay := 0.0
	for w in keys:
		var c := K.word_card(w, int(cnt[w]), -1, Vector2(92, 100))
		c.pivot_offset = Vector2(46, 50)
		c.scale = Vector2(0.4, 0.4)
		c.modulate.a = 0.0
		grid.add_child(c)
		var t := c.create_tween()
		t.tween_interval(delay)
		t.tween_property(c, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		t.parallel().tween_property(c, "modulate:a", 1.0, 0.15)
		delay += 0.02
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.add_child(grid)
	v.add_child(sc)
	add_child(detail_layer)

func _hover(i: int, on: bool) -> void:
	if not can_pick:
		return
	panels[i].add_theme_stylebox_override("panel", K.style(K.PANEL2 if on else K.PANEL, K.GOLD if on else K.EDGE, 16, 3 if on else 2, 10))

func _on_panel_input(ev: InputEvent, i: int) -> void:
	if can_pick and ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		can_pick = false
		Sfx.play("pick")
		picked.emit(i)

func _begin() -> void:
	if m.human[_picker]:
		can_pick = true
		info_label.text = ("轮到你先挑：点击其中一袋收下，另一袋归对手。选完 %d 袋后再构筑。" % m.opening_total) if m.phase == "opening" else "你是本轮先手：点击其中一袋收下，另一袋归对手。"
	else:
		# 电脑先选：演示其选择
		_show_choice(_ai_idx, false)

func _show_choice(idx: int, human_chose: bool) -> void:
	chosen = idx
	can_pick = false
	var mine := idx if human_chose else 1 - idx
	for i in 2:
		var good: bool = (i == mine)
		panels[i].add_theme_stylebox_override("panel", K.style(Color("1f3a2c") if good else Color("2a2228"), K.GREEN if good else Color("5a3a3f"), 16, 4 if good else 2, 10))
		panels[i].modulate = Color(1, 1, 1, 1) if good else Color(1, 1, 1, 0.55)
		if bags3d[i] != null:
			bags3d[i].set_state("chosen" if good else "dim")
			if good:
				bags3d[i].kick(3.0)
	_refresh_coach()
	if human_chose:
		info_label.text = "你收下了%s袋；对手得到另一袋。" % ("左" if idx == 0 else "右")
	else:
		info_label.text = "对手先选了%s袋，剩下的%s袋归你。" % [("左" if idx == 0 else "右"), ("右" if idx == 0 else "左")]
	continue_btn.modulate.a = 1.0
	continue_btn.disabled = false

func show_human_choice(idx: int) -> void:
	_show_choice(idx, true)

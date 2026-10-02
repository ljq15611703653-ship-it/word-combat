extends Control
# 挑兜子：每轮战斗结束后摆出 5 个词兜子（每个兜子里是几个进阶词/奇术词），
# 上一轮的先手先挑一个，另一方再从剩下的里挑一个；没人要的兜子作废。基础词不用抢（无限）。

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
var coach_box: VBoxContainer
var chosen := -1                 # 你拿走的兜子
var foe_chosen := -1             # 对手拿走的兜子
var can_pick := false
var plan: Dictionary = {}
var rec_chips: Array = []
var bags3d: Array = []
var detail_layer: Control
var _ai_idx := -1                # 兼容旧接口

func setup(match_obj, _ai_idx_unused: int = -1) -> void:
	m = match_obj
	K.clear_children(self)
	panels = []
	rec_chips = []
	bags3d = []
	chosen = -1
	foe_chosen = -1
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.add_child(K.glow())
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var root := MarginContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_" + side, 24)
	add_child(root)
	var v := K.vbox(8)
	root.add_child(v)
	var opening: bool = m.phase == "opening"
	v.add_child(K.label(("开局选词 · 第 %d / %d 轮" % [m.opening_idx + 1, m.opening_total]) if opening else ("第 %d 轮 · 挑兜子" % m.st.round), 30, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	info_label = K.label("", 19, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(info_label)
	Settings.load_all()
	coach_box = K.vbox(4)
	v.add_child(coach_box)
	var row := K.hbox(14)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(row)
	for i in m.bags.size():
		var p := _bag_panel(i)
		panels.append(p)
		row.add_child(p)
	# 已有的进阶词（基础词无限，不列）
	var pool_box := K.panel(K.PANEL, K.EDGE, 12, 1)
	var pv := K.vbox(6)
	pool_box.add_child(pv)
	pv.add_child(K.label("你目前持有的进阶词（%d 个）· 基础词随便用，不用抢" % _adv_total(), 15, K.MUTED))
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 5)
	flow.add_theme_constant_override("v_separation", 4)
	flow.custom_minimum_size.x = 1450
	var keys: Array = []
	for w in m.pools[0]:
		if not Lex.is_basic(w) and int(m.pools[0][w]) > 0:
			keys.append(w)
	keys.sort_custom(func(a, b): return Lex.words[a].id < Lex.words[b].id)
	for w in keys:
		flow.add_child(K.word_tag(w, true, int(m.pools[0][w])))
	if keys.is_empty():
		flow.add_child(K.label("（还没有进阶词）", 14, K.MUTED))
	pv.add_child(flow)
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
	Tut.fire("screen:draft")

func _adv_total() -> int:
	var n := 0
	for w in m.pools[0]:
		if not Lex.is_basic(w):
			n += int(m.pools[0][w])
	return n

func _taken(i: int) -> bool:
	return i in m.bag_taken

func _bag_panel(i: int) -> Control:
	var bag: Array = m.bags[i]
	var adv := 0
	var rare := 0
	for w in bag:
		if str(Lex.words[w].rarity) == "奇术":
			rare += 1
		else:
			adv += 1
	var p := K.panel(K.PANEL, K.EDGE, 16, 2, 10)
	p.name = "bag%d" % i
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.custom_minimum_size = Vector2(250, 0)
	var v := K.vbox(6)
	p.add_child(v)
	var head := K.hbox(6)
	head.add_child(K.label("第 %d 袋" % (i + 1), 22, K.TEXT))
	head.add_child(K.spacer(1, 6))
	head.add_child(K.chip("进阶 %d" % adv, Color("2f5f93"), 13))
	if rare > 0:
		head.add_child(K.chip("奇术 %d" % rare, Color("8a6a1f"), 13))
	var rec := K.chip("小词推荐", Color("2c6a44"), 13)
	rec.visible = false
	head.add_child(rec)
	rec_chips.append(rec)
	v.add_child(head)
	var b3 := Bag3D.new()
	b3.custom_minimum_size = Vector2(0, 190)
	b3.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b3.set_words(bag, [])
	b3.clicked.connect(func(): _try_pick(i))
	b3.hovered.connect(func(on): _hover(i, on))
	bags3d.append(b3)
	v.add_child(b3)
	# 一眼看到里面有什么：每个词一张小牌，颜色区分稀有度
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 6)
	flow.add_theme_constant_override("v_separation", 6)
	var sorted: Array = bag.duplicate()
	sorted.sort_custom(func(a, b):
		var ra: int = 0 if str(Lex.words[a].rarity) == "奇术" else 1
		var rb: int = 0 if str(Lex.words[b].rarity) == "奇术" else 1
		return ra < rb or (ra == rb and Lex.words[a].id < Lex.words[b].id))
	for w in sorted:
		flow.add_child(K.word_card(w, 1, -1, Vector2(80, 100)))
	v.add_child(flow)
	if Settings.coach and Settings.coach_detail:
		var lines: Array = []
		var base_av: Dictionary = m.avail_words(0) if m.has_method("avail_words") else Coach.free_words(m.pools[0], m.decks[0])
		var after_av: Dictionary = base_av.duplicate()
		for w in bag:
			after_av[w] = int(after_av.get(w, 0)) + 1
		var rb: Array = Coach.route_status(base_av)
		var ra: Array = Coach.route_status(after_av)
		for k in rb.size():
			if int(rb[k].n) > 0 and int(ra[k].n) == 0:
				lines.append("✓ 拿了就能拼：%s（%s）" % [str(ra[k].name), str(ra[k].role)])
			elif int(ra[k].n) < int(rb[k].n) and int(ra[k].n) <= 2:
				lines.append("◦ 再差一点：%s，还缺 %s" % [str(ra[k].name), str(Coach._missing_text(ra[k].missing))])
		if lines.is_empty():
			lines.append("这袋暂时拼不出现成的路线，但可能配合以后的词。")
		v.add_child(K.wrap_label("\n".join(lines.slice(0, 5)), 13, K.GREEN))
	var more := K.button("查看词义", "ghost", 14)
	more.custom_minimum_size = Vector2(0, 28)
	more.pressed.connect(func(): _show_detail(i))
	Tut.tag(more, "d:detail%d" % i)
	v.add_child(more)
	p.gui_input.connect(func(ev): _on_panel_input(ev, i))
	p.mouse_entered.connect(func(): _hover(i, true))
	p.mouse_exited.connect(func(): _hover(i, false))
	return p

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE and detail_layer != null and is_instance_valid(detail_layer):
		detail_layer.queue_free()
		get_viewport().set_input_as_handled()

func _show_detail(i: int) -> void:
	if detail_layer != null and is_instance_valid(detail_layer):
		detail_layer.queue_free()
	var bag: Array = m.bags[i]
	detail_layer = Control.new()
	detail_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.7)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			detail_layer.queue_free())
	detail_layer.add_child(dim)
	var win := K.panel(Color("170d11"), K.GOLD_D, 16, 2, 14)
	win.custom_minimum_size = Vector2(900, 460)
	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	detail_layer.add_child(cc)
	cc.add_child(win)
	var v := K.vbox(10)
	win.add_child(v)
	var hb := K.hbox(10)
	hb.add_child(K.label("第 %d 袋 · %d 个词" % [i + 1, bag.size()], 24, K.GOLD))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(sp)
	var close := K.button("关闭", "normal", 18)
	close.pressed.connect(func(): detail_layer.queue_free())
	hb.add_child(close)
	v.add_child(hb)
	for w in bag:
		var info: Dictionary = Lex.get_word(w)
		var line := K.hbox(10)
		line.add_child(K.chip(w, Lex.rarity_color(w).darkened(0.35), 16))
		line.add_child(K.wrap_label("〔%s〕%s" % [info.get("cat", ""), info.get("desc", "")], 15, K.TEXT))
		v.add_child(line)
	add_child(detail_layer)

func _hover(i: int, on: bool) -> void:
	if not can_pick or _taken(i):
		return
	panels[i].add_theme_stylebox_override("panel", K.gem_style(K.PANEL2 if on else K.PANEL, K.GOLD if on else K.EDGE, 16, 3 if on else 2, 0.2))

func _on_panel_input(ev: InputEvent, i: int) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		_try_pick(i)

func _try_pick(i: int) -> void:
	if not can_pick or _taken(i):
		return
	can_pick = false
	Sfx.play("pick")
	picked.emit(i)
	Tut.fire("draft_picked")

# ---------------------------------------------------------------- 流程
func _begin() -> void:
	_refresh_coach()
	_advance()

# 轮到谁就让谁挑：对手挑的话立刻演示出来
func _advance() -> void:
	if m.bag_taken[0] != -1 and m.bag_taken[1] != -1:
		_done()
		return
	var who: int = m.picker
	if m.human[who]:
		can_pick = true
		var first_pick: bool = m.bag_taken[1 - who] == -1
		info_label.text = "轮到你先挑：点击一个兜子收下，另一方再从剩下的里挑一个。基础词不用抢。" if first_pick else "对手已经拿走了第 %d 袋，轮到你从剩下的里挑一个。" % (int(m.bag_taken[1 - who]) + 1)
		_refresh_coach()
		return
	m.ai_pick_bag()
	_show_marks()
	_advance()

func on_human_pick(idx: int) -> void:
	chosen = idx
	_show_marks()
	_advance()

func show_human_choice(idx: int) -> void:      # 兼容旧接口
	on_human_pick(idx)

func _show_marks() -> void:
	for i in panels.size():
		var mine: bool = m.bag_taken[0] == i
		var foe: bool = m.bag_taken[1] == i
		if mine:
			panels[i].add_theme_stylebox_override("panel", K.gem_style(Color("3a1c14"), K.GOLD, 16, 4, 0.3))
			panels[i].modulate = Color.WHITE
		elif foe:
			panels[i].add_theme_stylebox_override("panel", K.gem_style(Color("2a1018"), Color("a3121f"), 16, 3, 0.2))
			panels[i].modulate = Color(1, 1, 1, 0.8)
		elif m.bag_taken[0] != -1 or m.bag_taken[1] != -1:
			panels[i].modulate = Color(1, 1, 1, 0.85)
		if i < bags3d.size() and bags3d[i] != null:
			if mine or foe:
				bags3d[i].set_state("chosen")
				if mine:
					bags3d[i].kick(3.0)
			elif m.bag_taken[0] != -1 and m.bag_taken[1] != -1:
				bags3d[i].set_state("dim")
	if m.bag_taken[1] != -1:
		foe_chosen = m.bag_taken[1]

func _done() -> void:
	can_pick = false
	_show_marks()
	if int(m.bag_taken[1]) < 0:
		info_label.text = "你拿走了第 %d 袋。" % (int(m.bag_taken[0]) + 1)
	else:
		info_label.text = "你拿走了第 %d 袋，对手拿走了第 %d 袋。其余的兜子作废。" % [int(m.bag_taken[0]) + 1, int(m.bag_taken[1]) + 1]
	_refresh_coach()
	continue_btn.modulate.a = 1.0
	continue_btn.disabled = false

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
	for c in rec_chips:
		c.visible = false
	if not Settings.coach or m.bag_taken[0] != -1 or not m.human[0]:
		return
	var rem: Array = m.remaining_bags()
	var sub: Array = []
	for i in rem:
		sub.append(m.bags[i])
	if sub.is_empty():
		return
	plan = Coach.draft_plan(m.pools[0], m.decks[0], sub, m.public_deck(1))
	var rec_i: int = int(rem[int(plan.pick)])
	rec_chips[rec_i].visible = true
	for pp in panels:
		pp.remove_from_group("tut:d:rec")
	Tut.tag(panels[rec_i], "d:rec")
	var box := K.panel(Color("1c1210"), K.GREEN.darkened(0.2), 10, 1)
	var col := K.vbox(3)
	box.add_child(col)
	col.add_child(K.wrap_label("小词推荐：第 %d 袋 —— %s" % [rec_i + 1, str(plan.reason)], 17, K.GREEN))
	coach_box.add_child(box)

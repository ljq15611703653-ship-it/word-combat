extends Control
# 构筑 / 调整界面：五张随从卡 + 词库。点击卡牌进入编辑器。

const K = preload("res://scripts/ui/kit.gd")
const D = preload("res://scripts/core/deck.gd")
const G = preload("res://scripts/core/grammar.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const EditorPopup = preload("res://scripts/ui/editor_popup.gd")
const DeckView = preload("res://scripts/ui/deck_view.gd")

signal finished()                      # 构筑完成 / 结束调整
signal adjusted(unit_idx, unit)        # 调整模式下确认了一张卡的修改

var m
var mode := "initial"
var wd: Dictionary
var card_row: HBoxContainer
var pool_row: HBoxContainer
var budget_bar: HBoxContainer
var budget_label: Label
var msg_label: Label
var finish_btn: Button
var popup: Control
var overlay_layer: Control

func setup(match_obj, m_mode: String) -> void:
	m = match_obj
	mode = m_mode
	wd = D.clone(m.decks[0])
	_build()
	refresh()

func _build() -> void:
	K.clear_children(self)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var root := MarginContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_" + side, 24)
	add_child(root)
	var v := K.vbox(10)
	root.add_child(v)
	# 顶栏
	var top := K.hbox(14)
	var title := K.label("初始构筑" if mode == "initial" else "第 %d 轮 · 调整" % m.st.round, 34, K.GOLD)
	top.add_child(title)
	var sub := K.label("", 16, K.MUTED)
	sub.name = "sub"
	top.add_child(sub)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(sp)
	if mode == "adjust":
		var peek := K.button("查看对手牌组", "normal", 17)
		peek.pressed.connect(_peek_enemy)
		top.add_child(peek)
	finish_btn = K.button("开始对战  →" if mode == "initial" else "结束调整  →", "primary", 21)
	finish_btn.custom_minimum_size = Vector2(230, 48)
	finish_btn.pressed.connect(_on_finish)
	top.add_child(finish_btn)
	v.add_child(top)
	# 点数条
	var bb := K.hbox(10)
	bb.add_child(K.label("构筑点数", 16, K.MUTED))
	budget_bar = HBoxContainer.new()
	budget_bar.add_theme_constant_override("separation", 0)
	budget_bar.custom_minimum_size = Vector2(700, 26)
	bb.add_child(budget_bar)
	budget_label = K.label("", 18, K.TEXT)
	bb.add_child(budget_label)
	msg_label = K.label("", 15, K.RED)
	bb.add_child(msg_label)
	v.add_child(bb)
	# 五张卡
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	card_row = K.hbox(14)
	card_row.alignment = BoxContainer.ALIGNMENT_CENTER
	card_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(card_row)
	v.add_child(scroll)
	# 词库
	var pool_panel := K.panel(K.PANEL, K.EDGE, 12, 1)
	var pv := K.vbox(4)
	pool_panel.add_child(pv)
	pv.add_child(K.label("你的词库（已用 / 拥有）", 15, K.MUTED))
	var ps := ScrollContainer.new()
	ps.custom_minimum_size = Vector2(0, 140)
	ps.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	pool_row = K.hbox(8)
	ps.add_child(pool_row)
	pv.add_child(ps)
	v.add_child(pool_panel)
	overlay_layer = Control.new()
	overlay_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay_layer)

func _deck() -> Dictionary:
	return wd if mode == "initial" else m.decks[0]

func refresh() -> void:
	var deck := _deck()
	var b := D.budget_used(deck)
	K.clear_children(budget_bar)
	for part in [[int(b.hp), K.GREEN.darkened(0.25)], [int(b.nums), K.GOLD.darkened(0.2)], [maxi(0, D.BUDGET - int(b.total)), Color("20263a")]]:
		var r := ColorRect.new()
		r.color = part[1]
		r.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		r.size_flags_stretch_ratio = maxf(0.001, float(part[0]))
		r.custom_minimum_size = Vector2(0, 24)
		budget_bar.add_child(r)
	budget_label.text = "生命 %d + 数字 %d = %d / %d" % [b.hp, b.nums, b.total, D.BUDGET]
	budget_label.add_theme_color_override("font_color", K.RED if b.total > D.BUDGET else K.TEXT)
	# 卡
	K.clear_children(card_row)
	for i in 5:
		card_row.add_child(_unit_panel(i, deck.units[i]))
	# 词库
	K.clear_children(pool_row)
	var used := D.used_counts(deck)
	var keys: Array = m.pools[0].keys()
	keys.sort_custom(func(a, b):
		var ca: String = Lex.words[a].cat
		var cb: String = Lex.words[b].cat
		return ca < cb or (ca == cb and Lex.words[a].id < Lex.words[b].id))
	for w in keys:
		var total: int = int(m.pools[0][w])
		var u: int = int(used.get(w, 0))
		pool_row.add_child(K.word_card(w, total, u, Vector2(76, 100), u >= total))
	# 状态
	var sub: Label = find_child("sub", true, false)
	if sub != null:
		if mode == "initial":
			sub.text = "点击卡牌编辑技能（简单版：选招式填空；复杂版：自由拼词）。至少装一个技能。"
		else:
			sub.text = "你还有 %d 次调整，对手 %d 次。每次只能改一张卡。" % [m.adjust_left(0), m.adjust_left(1)]
	var v := D.validate(deck, m.pools[0])
	var has_skill := false
	for u2 in deck.units:
		if not u2.skills.is_empty():
			has_skill = true
	if mode == "initial":
		finish_btn.disabled = not (v.ok and has_skill)
		msg_label.text = "" if v.ok and has_skill else ("至少装一个技能" if v.ok else str(v.errors[0]))
	else:
		msg_label.text = ""

func _unit_panel(i: int, u: Dictionary) -> Control:
	var p := K.panel(Color("1d2233"), K.BLUE.darkened(0.3), 14, 2, 8)
	p.custom_minimum_size = Vector2(290, 0)
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var v := K.vbox(6)
	p.add_child(v)
	var head := K.hbox(8)
	head.add_child(K.label(u.glyph, 40, Color("c9b27a")))
	var col := K.vbox(0)
	col.add_child(K.label(u.name, 22, K.TEXT))
	col.add_child(K.label("第 %d 位" % (i + 1), 13, K.MUTED))
	head.add_child(col)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	head.add_child(K.chip("生命 %d" % int(u.max_hp), Color("2c5c44"), 18))
	v.add_child(head)
	if u.kw != "":
		v.add_child(K.chip("◈ " + u.kw, Color("6b5a22"), 15))
	else:
		v.add_child(K.label("◇ 无关键词", 14, K.MUTED))
	for k in D.MAX_SKILLS:
		if k < u.skills.size():
			var s: Dictionary = u.skills[k]
			var sp2 := K.panel(K.PANEL2, K.EDGE, 8, 1)
			var sv := K.vbox(2)
			sp2.add_child(sv)
			var r := K.hbox(6)
			r.add_child(K.label(s.name, 17, K.TEXT))
			r.add_child(K.chip("%d" % int(s.cost), Color("6b5a22"), 14))
			sv.add_child(r)
			sv.add_child(K.wrap_label(s.text, 13, K.MUTED))
			v.add_child(sp2)
		else:
			var e := K.panel(Color(1, 1, 1, 0.03), K.EDGE, 8, 1)
			e.add_child(K.label("＋ 空技能槽", 15, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
			v.add_child(e)
	var sp3 := Control.new()
	sp3.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(sp3)
	var edit := K.button("编辑", "primary", 18)
	edit.pressed.connect(func(): _open_editor(i))
	edit.disabled = mode == "adjust" and m.adjust_side() != 0
	v.add_child(edit)
	p.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	return p

func _open_editor(i: int) -> void:
	if mode == "adjust" and (m.adjust_side() != 0 or m.adjust_left(0) <= 0):
		return
	var pop := EditorPopup.new()
	overlay_layer.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay_layer.add_child(pop)
	pop.open(_deck(), i, m.pools[0], mode)
	pop.cancelled.connect(func(): _close_popup(pop))
	pop.committed.connect(func(unit):
		_close_popup(pop)
		if mode == "initial":
			wd.units[i] = unit
			D.rename_skills(wd)
			refresh()
		else:
			adjusted.emit(i, unit))
	popup = pop

func _close_popup(pop: Control) -> void:
	pop.queue_free()
	overlay_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE

func _peek_enemy() -> void:
	var dv := DeckView.new()
	overlay_layer.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay_layer.add_child(dv)
	var units: Array = []
	for u in m.decks[1].units:
		units.append(u)
	dv.open("对手的牌组（公开）", units, "对手性格：" + str(m.personas[1]))
	dv.closed.connect(func():
		dv.queue_free()
		overlay_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE)

func _on_finish() -> void:
	finished.emit()

func show_error(text: String) -> void:
	msg_label.text = text

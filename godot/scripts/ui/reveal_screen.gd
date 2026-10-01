extends Control
# 亮相：双方同时拼好的这一张牌一起翻开。下面是各自此前已亮相的牌。
# 看完点“继续”：还有下一张就先选一袋词，再拼下一张（可以针对对方已亮的牌）。

const K = preload("res://scripts/ui/kit.gd")
const CardFace = preload("res://scripts/ui/card_face.gd")
const DeckView = preload("res://scripts/ui/deck_view.gd")
const Tut = preload("res://scripts/tutorial/tutorial.gd")

signal finished()

var m

func setup(match_obj) -> void:
	m = match_obj
	_build()

func _build() -> void:
	K.clear_children(self)
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 28)
	add_child(margin)
	var v := K.vbox(12)
	margin.add_child(v)
	var k: int = int(m.card_idx)
	v.add_child(K.label("第 %d / %d 张 · 同时亮相" % [k + 1, m.decks[0].units.size()], 34, K.GOLD))
	var cols := K.hbox(24)
	cols.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(cols)
	for side in 2:
		cols.add_child(_column(side, k))
	var last: bool = k + 1 >= m.decks[0].units.size()
	var go := K.button("开始对战  →" if last else "继续：选一袋词，拼下一张  →", "primary", 24)
	go.custom_minimum_size = Vector2(0, 60)
	go.pressed.connect(func(): finished.emit())
	Tut.tag(go, "r:continue")
	v.add_child(go)

func _column(side: int, k: int) -> Control:
	var p := K.panel(K.PANEL, K.GOLD_D if side == 0 else K.RED.darkened(0.3), 16, 2, 14)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := K.vbox(8)
	p.add_child(v)
	v.add_child(K.label("你" if side == 0 else "对手", 24, K.TEXT))
	var u: Dictionary = m.decks[side].units[k]
	var top := K.hbox(14)
	var face := CardFace.new()
	face.set_unit(u, u.get("skills", []), false)
	top.add_child(face)
	var helper := DeckView.new()
	var blk: Control = helper._unit_block(u)
	helper.free()
	blk.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(blk)
	v.add_child(top)
	if k > 0:
		v.add_child(K.label("此前已亮相", 15, K.MUTED))
		var sc := ScrollContainer.new()
		sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
		sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		var col := K.vbox(6)
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sc.add_child(col)
		for i in k:
			var h2 := DeckView.new()
			var b2: Control = h2._unit_block(m.decks[side].units[i])
			h2.free()
			col.add_child(b2)
		v.add_child(sc)
	return p

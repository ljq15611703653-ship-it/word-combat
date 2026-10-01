extends Control
# 冒险地图：长难句训练营。按章节列出关卡，顺序解锁；通关记录在 user://settings.cfg。

const Settings = preload("res://scripts/ui/settings.gd")
const K = preload("res://scripts/ui/kit.gd")
const L = preload("res://scripts/adventure/level_eval.gd")

signal back()
signal chosen(id)

static func is_unlocked(id: int, levels: Array) -> bool:
	if id <= 1:
		return true
	return (id - 1) in Settings.adv_cleared or id in Settings.adv_cleared

func setup() -> void:
	Settings.load_all()
	K.clear_children(self)
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 32)
	add_child(margin)
	var v := K.vbox(10)
	margin.add_child(v)
	var levels: Array = L.load_levels()
	var head := K.hbox(14)
	head.add_child(K.label("冒险 · 长难句训练营", 36, K.GOLD))
	head.add_child(K.label("通关 %d / %d" % [Settings.adv_cleared.size(), levels.size()], 18, K.MUTED))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	var bk := K.button("返回", "normal", 18)
	bk.pressed.connect(func(): back.emit())
	head.add_child(bk)
	v.add_child(head)
	v.add_child(K.wrap_label("每一关，对手摆出了阵势：你只有手里这几张词，要拼出一句“长难句”来破局。小词会手把手教你。顺序解锁。", 16, K.MUTED))
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(sc)
	var col := K.vbox(16)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(col)
	var chapters := _chapters(levels)
	var next_id := -1
	for lv in levels:
		var id := int(lv.id)
		if not (id in Settings.adv_cleared) and is_unlocked(id, levels):
			next_id = id
			break
	for ch in chapters:
		var cp := K.panel(K.PANEL, K.EDGE, 14, 1, 12)
		cp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var cv := K.vbox(8)
		cp.add_child(cv)
		cv.add_child(K.label(str(ch.name), 22, K.GOLD))
		var flow := HFlowContainer.new()
		flow.add_theme_constant_override("h_separation", 8)
		flow.add_theme_constant_override("v_separation", 8)
		cv.add_child(flow)
		for lv in ch.levels:
			flow.add_child(_level_button(lv, int(lv.id) == next_id, levels))
		col.add_child(cp)

func _chapters(levels: Array) -> Array:
	var names := {}
	var f := FileAccess.open("res://data/bootcamp.json", FileAccess.READ)
	if f != null:
		var p = JSON.parse_string(f.get_as_text())
		if p is Dictionary and p.has("chapters"):
			names = p.chapters
	var order: Array = []
	var by := {}
	for lv in levels:
		var c := int(lv.chapter)
		if not by.has(c):
			by[c] = []
			order.append(c)
		by[c].append(lv)
	var out: Array = []
	for c in order:
		out.append({"name": str(names.get(str(c), "第 %d 章" % c)), "levels": by[c]})
	return out

func _level_button(lv: Dictionary, is_next: bool, levels: Array) -> Control:
	var id := int(lv.id)
	var cleared: bool = id in Settings.adv_cleared
	var open := is_unlocked(id, levels)
	var b := Button.new()
	b.custom_minimum_size = Vector2(150, 64)
	b.text = "%d  %s%s" % [id, str(lv.title), "  ✓" if cleared else ""]
	b.add_theme_font_size_override("font_size", 16)
	b.disabled = not open
	var col: Color = K.GREEN.darkened(0.4) if cleared else (K.GOLD_D if is_next else (K.PANEL2 if open else Color("171a24")))
	b.add_theme_stylebox_override("normal", K.style(col, K.GOLD if is_next else K.EDGE, 10, 2 if is_next else 1, 0))
	b.add_theme_stylebox_override("hover", K.style(col.lightened(0.15), K.GOLD, 10, 2, 0))
	b.add_theme_stylebox_override("disabled", K.style(Color("171a24"), Color("262b3a"), 10, 1, 0))
	b.tooltip_text = str(lv.get("story", "")) if open else "先通关上一关"
	b.pressed.connect(func(): chosen.emit(id))
	return b

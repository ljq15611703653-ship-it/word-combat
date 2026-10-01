extends Control
# 2D 卡面：随从的形象图标 + 随装备的关键词、技能长出来的配件图标。
# 规则和 3D 随从完全一样（data/appearance.json 的 rules）：装了什么，身上就多出什么。
# 每多一件配件，会“邦”地烙上去（钢印特效）。
# 素材接口：res://assets/cards/<proc>.png（配件）、res://assets/cards/body_<形象>.png（身体），放进去就替换代码画的图标。

const K = preload("res://scripts/ui/kit.gd")
const Icon = preload("res://scripts/ui/icon.gd")
const Appearance = preload("res://scripts/view3d/appearance.gd")
const FX = preload("res://scripts/compose/stamp_fx.gd")

const SIZE := Vector2(156, 206)
# 各挂点在卡面上的位置（中心点）与图标大小
const SLOT_POS := {
	"head": [Vector2(78, 52), 34], "back": [Vector2(34, 84), 40], "shoulder_l": [Vector2(30, 108), 32], "shoulder_r": [Vector2(126, 108), 32],
	"hand_l": [Vector2(28, 146), 40], "hand_r": [Vector2(128, 146), 40], "chest": [Vector2(78, 122), 34], "waist": [Vector2(78, 166), 38],
	"aura": [Vector2(78, 104), 0], "ghost": [Vector2(92, 98), 0],
}

var unit: Dictionary = {}
var skills: Array = []
var body_icon: Control
var layers: Control
var attach := {}              # 挂点 → {proc, node}
var name_label: Label
var skill_label: Label
var cost_chip: Control
var _fx: Control
var _aura: Control
var _ghost: Control
var _built := false

func _ready() -> void:
	_build()

func _build() -> void:
	if _built:
		return
	_built = true
	custom_minimum_size = SIZE
	size = SIZE
	clip_contents = false
	var frame := PanelContainer.new()
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_theme_stylebox_override("panel", K.style(Color("1d2233"), K.GOLD_D, 14, 3, 8))
	add_child(frame)
	# 画像区
	var art := Panel.new()
	art.position = Vector2(8, 28)
	art.size = Vector2(SIZE.x - 16, 148)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	art.add_theme_stylebox_override("panel", K.style(Color("2a3150"), Color("3b4562"), 10, 1))
	add_child(art)
	layers = Control.new()
	layers.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layers.size = SIZE
	add_child(layers)
	name_label = K.label("", 16, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	name_label.position = Vector2(6, 4)
	name_label.size = Vector2(SIZE.x - 12, 22)
	name_label.clip_text = true
	add_child(name_label)
	skill_label = K.label("", 13, Color("e0b85c"), HORIZONTAL_ALIGNMENT_CENTER)
	skill_label.position = Vector2(6, 178)
	skill_label.size = Vector2(SIZE.x - 12, 20)
	skill_label.clip_text = true
	add_child(skill_label)
	_fx = Control.new()
	_fx.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fx.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_fx)

# 素材优先：res://assets/cards/<名字>.png
static func _tex(name: String) -> Texture2D:
	var path := "res://assets/cards/%s.png" % name
	if ResourceLoader.exists(path):
		return load(path)
	return null

func _icon(proc: String, px: float, col: Color) -> Control:
	var tx := _tex(proc)
	if tx != null:
		var tr := TextureRect.new()
		tr.texture = tx
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(px, px)
		tr.size = Vector2(px, px)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		return tr
	return Icon.make_proc(proc, px, col)

func _body_color(glyph: String) -> Color:
	var b := Appearance.body_for(glyph)
	return Color(str(b.get("color", "#b45a52")))

# 设定当前的随从和技能，刷新配件；animate=true 时新增的配件会烙上去
func set_unit(u: Dictionary, sks: Array, animate: bool = true) -> void:
	_build()
	unit = u
	skills = sks
	name_label.text = str(u.get("name", ""))
	skill_label.text = str(sks[0].get("name", "")) if not sks.is_empty() else "（还没有技能）"
	var gl: String = str(u.get("glyph", "剑")) if not sks.is_empty() else "空"
	var col := _body_color(gl) if gl != "空" else Color("8a93a8")
	# 身体（形象图标）
	if body_icon == null:
		body_icon = _body(gl, col)
		layers.add_child(body_icon)
	else:
		layers.remove_child(body_icon)
		body_icon.queue_free()
		body_icon = _body(gl, col)
		layers.add_child(body_icon)
		layers.move_child(body_icon, 0)
	# 配件
	var want := {}
	for r in Appearance.resolve(u, sks):
		want[str(r.slot)] = r
	for slot in attach.keys():
		if not want.has(slot) or attach[slot].proc != str(want[slot].proc):
			var old: Control = attach[slot].node
			if is_instance_valid(old):
				var tw := old.create_tween().set_parallel(true)
				tw.tween_property(old, "modulate:a", 0.0, 0.15)
				tw.tween_property(old, "scale", Vector2(0.4, 0.4), 0.15)
				tw.chain().tween_callback(old.queue_free)
			attach.erase(slot)
	for slot in want:
		if attach.has(slot):
			continue
		var r: Dictionary = want[slot]
		var node := _make_attachment(slot, str(r.proc), Color(str(r.get("color", "#ffffff"))))
		layers.add_child(node)
		attach[slot] = {"proc": str(r.proc), "node": node}
		if animate and is_inside_tree():
			call_deferred("_stamp_it", node)

func _stamp_it(node: Control) -> void:
	if is_instance_valid(node) and is_instance_valid(_fx):
		FX.stamp(node, _fx)

func _body(glyph: String, col: Color) -> Control:
	var tx := _tex("body_" + glyph)
	var c: Control
	if tx != null:
		c = _icon("body_" + glyph, 96, col)
	else:
		c = Icon.make(glyph, 96, col.lightened(0.35))
	c.size = Vector2(96, 96)
	c.position = Vector2(SIZE.x * 0.5 - 48, 70)
	return c

func _make_attachment(slot: String, proc: String, col: Color) -> Control:
	var sp: Array = SLOT_POS.get(slot, [Vector2(78, 100), 32])
	var px: float = float(sp[1])
	if slot == "aura":
		var ring := Icon.make_proc(proc, 128, Color(col.r, col.g, col.b, 0.55))
		ring.size = Vector2(128, 128)
		ring.position = Vector2(SIZE.x * 0.5 - 64, 40)
		return ring
	if slot == "ghost":
		var g := Icon.make("剑" if unit.is_empty() else str(unit.get("glyph", "剑")), 96, Color(col.r, col.g, col.b, 0.35))
		g.size = Vector2(96, 96)
		g.position = Vector2(SIZE.x * 0.5 - 48 + 16, 70 - 6)
		return g
	var c := _icon(proc, px, col)
	c.size = Vector2(px, px)
	c.position = (sp[0] as Vector2) - Vector2(px, px) * 0.5
	return c

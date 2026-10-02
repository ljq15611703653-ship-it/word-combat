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
var frame_tex: TextureRect
var glint: TextureRect
var _glint_frames: Array = []
var _glint_t := 0.0

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
	frame.add_theme_stylebox_override("panel", K.style(Color("140b10"), Color("7a1620"), 14, 3, 8))
	add_child(frame)
	# 画像区
	var art := Panel.new()
	art.position = Vector2(12, 16)
	art.size = Vector2(SIZE.x - 24, 132)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	art.add_theme_stylebox_override("panel", K.style(Color("1b0e14"), Color("3a141c"), 10, 1))
	add_child(art)
	layers = Control.new()
	layers.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layers.size = SIZE
	layers.position = Vector2(0, -26)
	add_child(layers)
	# 卡框素材（暗红金属框 + 亮黄点睛）盖在最上面；放 assets/ui/cards/card_front_*.png 就用，没有就只剩上面的底板
	frame_tex = TextureRect.new()
	frame_tex.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	frame_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	frame_tex.stretch_mode = TextureRect.STRETCH_SCALE
	frame_tex.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame_tex.texture = _frame_for(0)
	add_child(frame_tex)
	glint = TextureRect.new()
	glint.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	glint.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	glint.stretch_mode = TextureRect.STRETCH_SCALE
	glint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var gm := CanvasItemMaterial.new()
	gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	glint.material = gm
	glint.modulate = Color(1, 1, 1, 0.0)
	add_child(glint)
	name_label = K.label("", 16, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	name_label.position = Vector2(10, 152)
	name_label.size = Vector2(SIZE.x - 20, 20)
	name_label.clip_text = true
	add_child(name_label)
	skill_label = K.label("", 12, Color("ffd21f"), HORIZONTAL_ALIGNMENT_CENTER)
	skill_label.position = Vector2(10, 172)
	skill_label.size = Vector2(SIZE.x - 20, 18)
	skill_label.clip_text = true
	add_child(skill_label)
	_fx = Control.new()
	_fx.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fx.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_fx)

# 卡框：按技能强弱换档（普通 / 稀有 / 秘术），素材在 res://assets/ui/cards/
static func _frame_for(tier: int) -> Texture2D:
	var names := ["card_front_common_512x768", "card_front_rare_512x768", "card_front_arcane_512x768"]
	var path := "res://assets/ui/cards/%s.png" % names[clampi(tier, 0, 2)]
	if ResourceLoader.exists(path):
		return load(path)
	return null

func _process(delta: float) -> void:
	if glint == null or not is_visible_in_tree():
		return
	_glint_t += delta
	if _glint_frames.is_empty():
		for i in 12:
			var gp := "res://assets/ui/cards/glint/border_glint_%02d.png" % i
			if ResourceLoader.exists(gp):
				_glint_frames.append(load(gp))
		if _glint_frames.is_empty():
			set_process(false)
			return
	# 每 ~3.2 秒扫一次，其余时间不显示
	var cyc := fmod(_glint_t, 3.2)
	if cyc < 0.9:
		glint.texture = _glint_frames[int(cyc / 0.9 * 11.99)]
		glint.modulate = Color(1, 1, 1, 0.85)
	else:
		glint.modulate = Color(1, 1, 1, 0.0)

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
		if proc == "amulet":
			tr.self_modulate = col.lerp(Color.WHITE, 0.35)      # 三种免疫共用一张吊坠：靠颜色区分
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
	var tier := 0
	if not sks.is_empty():
		var cst := int(sks[0].get("cost", 0))
		tier = 2 if cst >= 40 else (1 if cst >= 22 else 0)
	if frame_tex != null:
		frame_tex.texture = _frame_for(tier)
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
	if slot == "aura" and _tex(proc) != null:
		var ringp := _icon(proc, 128, col)
		ringp.size = Vector2(128, 128)
		ringp.position = Vector2(SIZE.x * 0.5 - 64, 40)
		ringp.modulate = Color(1, 1, 1, 0.85)
		return ringp
	if slot == "ghost" and _tex(proc) != null:
		var gh := _icon(proc, 96, col)
		gh.size = Vector2(96, 96)
		gh.position = Vector2(SIZE.x * 0.5 - 48 + 16, 70 - 6)
		gh.modulate = Color(1, 1, 1, 0.55)
		return gh
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

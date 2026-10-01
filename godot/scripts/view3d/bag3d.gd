extends SubViewportContainer
# 词袋：一个丢在牌桌上的布袋。里面一堆词牌真的在滚（物理模拟），袋子上悬浮着里面最重要的几个词。
# 点“查看详情”才展开全部词（由抽词界面负责）。袋子被悬停时会晃动、发亮；选中后变绿，没选的变暗。
# 素材接口：res://assets/table/bag.glb（袋子模型）。词牌的面、悬浮词的底板都是代码做的，之后可以换。

const Proc = preload("res://scripts/view3d/proc_parts.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

signal clicked()
signal hovered(on: bool)

const BAG_R := 0.36
var svp: SubViewport
var world: Node3D
var cam: Camera3D
var bag_root: Node3D
var sack: MeshInstance3D
var glow: OmniLight3D
var tiles: Array = []
var floaters: Array = []
var words: Array = []
var notable: Array = []
var state := "normal"
var _t := 0.0
var _hover := false
var _kick_t := 0.0
var _built := false

func _ready() -> void:
	_build()

func _build() -> void:
	if _built:
		return
	_built = true
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	svp = SubViewport.new()
	svp.own_world_3d = true
	svp.msaa_3d = Viewport.MSAA_4X
	svp.size = Vector2i(640, 440)
	svp.handle_input_locally = false
	svp.physics_object_picking = false
	add_child(svp)
	world = Node3D.new()
	svp.add_child(world)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("1a3a2e")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("9aa0c8")
	e.ambient_light_energy = 0.7
	env.environment = e
	world.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, 25, 0)
	sun.light_energy = 1.2
	world.add_child(sun)
	glow = OmniLight3D.new()
	glow.position = Vector3(0, 0.5, 0.2)
	glow.omni_range = 1.6
	glow.light_energy = 0.0
	world.add_child(glow)
	# 桌面（绿呢）
	var felt := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(3, 3)
	felt.mesh = pm
	felt.material_override = Proc.mat(Color("1f5a40"), 0.95)
	felt.position = Vector3(0, -0.02, 0)
	world.add_child(felt)
	cam = Camera3D.new()
	cam.position = Vector3(0, 0.95, 1.55)
	cam.fov = 40
	world.add_child(cam)
	var from := Vector3(0, 0.95, 1.55)
	cam.transform = Transform3D(Basis.looking_at(Vector3(0, 0.5, 0) - from, Vector3.UP), from)
	cam.current = true
	bag_root = Node3D.new()
	world.add_child(bag_root)
	_build_bag()
	gui_input.connect(_on_input)
	mouse_entered.connect(func(): _set_hover(true))
	mouse_exited.connect(func(): _set_hover(false))

func _on_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		clicked.emit()

func _set_hover(on: bool) -> void:
	_hover = on
	hovered.emit(on)

# ------------------------------------------------------------ 袋子本体与物理
func _bag_asset() -> Node3D:
	var path := "res://assets/table/bag.glb"
	if ResourceLoader.exists(path):
		var r = load(path)
		if r is PackedScene:
			return r.instantiate()
	return null

func _build_bag() -> void:
	var custom := _bag_asset()
	if custom != null:
		bag_root.add_child(custom)
	else:
		# 布袋：半透明的鼓肚子 + 收口 + 绳子，能看见里面的牌
		sack = MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = BAG_R
		sm.height = BAG_R * 2.0
		sack.mesh = sm
		var cloth := StandardMaterial3D.new()
		cloth.albedo_color = Color(0.72, 0.55, 0.34, 0.42)
		cloth.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		cloth.roughness = 0.9
		cloth.cull_mode = BaseMaterial3D.CULL_DISABLED
		sack.material_override = cloth
		sack.position = Vector3(0, BAG_R * 0.86, 0)
		sack.scale = Vector3(1.0, 0.86, 1.0)
		bag_root.add_child(sack)
		var neck := Proc.cyl(0.17, 0.2, 0.16, Proc.mat(Color("a98050"), 0.9), Vector3(0, BAG_R * 1.74 + 0.02, 0))
		bag_root.add_child(neck)
		var rope := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 0.17
		tm.outer_radius = 0.205
		rope.mesh = tm
		rope.material_override = Proc.mat(Color("6a3a22"), 0.7)
		rope.position = Vector3(0, BAG_R * 1.74 + 0.07, 0)
		bag_root.add_child(rope)
		var rim := MeshInstance3D.new()
		var rm := TorusMesh.new()
		rm.inner_radius = 0.22
		rm.outer_radius = 0.26
		rim.mesh = rm
		rim.material_override = Proc.mat(Color("8a6a40"), 0.8)
		rim.position = Vector3(0, BAG_R * 1.74 + 0.1, 0)
		bag_root.add_child(rim)
	# 物理容器：地板 + 一圈墙（看不见），牌被关在袋子里滚
	var body := StaticBody3D.new()
	world.add_child(body)
	var floor_shape := CollisionShape3D.new()
	var fb := BoxShape3D.new()
	fb.size = Vector3(1.2, 0.04, 1.2)
	floor_shape.shape = fb
	floor_shape.position = Vector3(0, 0.0, 0)
	body.add_child(floor_shape)
	var n := 14
	for i in n:
		var a := TAU * float(i) / float(n)
		var w := CollisionShape3D.new()
		var wb := BoxShape3D.new()
		wb.size = Vector3(0.06, 1.2, 0.2)
		w.shape = wb
		w.position = Vector3(cos(a) * (BAG_R * 0.92), 0.5, sin(a) * (BAG_R * 0.92))
		w.rotation = Vector3(0, -a, 0)
		body.add_child(w)
	var lid := CollisionShape3D.new()
	var lb := BoxShape3D.new()
	lb.size = Vector3(1.2, 0.04, 1.2)
	lid.shape = lb
	lid.position = Vector3(0, BAG_R * 1.75, 0)
	body.add_child(lid)

# ------------------------------------------------------------ 内容
# words：这袋所有的词（可重复）；notable：悬浮展示的重要词（词名 → 理由标签，可空）
func set_words(ws: Array, notable_words: Array) -> void:
	_build()
	words = ws
	notable = notable_words
	for t in tiles:
		if is_instance_valid(t):
			t.queue_free()
	tiles.clear()
	for f in floaters:
		if is_instance_valid(f):
			f.queue_free()
	floaters.clear()
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(str(ws))
	for i in ws.size():
		var tile := _make_tile(str(ws[i]))
		world.add_child(tile)
		tile.position = Vector3(rng.randf_range(-0.2, 0.2), 0.16 + rng.randf_range(0.0, 0.3), rng.randf_range(-0.2, 0.2))
		tile.rotation = Vector3(rng.randf() * TAU, rng.randf() * TAU, rng.randf() * TAU)
		tiles.append(tile)
	var k := 0
	for w in notable_words:
		var fl := _make_floater(str(w))
		world.add_child(fl)
		fl.set_meta("slot", k)
		fl.set_meta("count", notable_words.size())
		floaters.append(fl)
		k += 1

func _make_tile(word: String) -> RigidBody3D:
	var rb := RigidBody3D.new()
	rb.mass = 0.05
	rb.gravity_scale = 0.08           # 袋子里的牌几乎失重：悬在袋子中间翻滚，而不是躺在底上
	rb.linear_damp = 1.2
	rb.angular_damp = 0.8
	var pm := PhysicsMaterial.new()
	pm.bounce = 0.35
	pm.friction = 0.5
	rb.physics_material_override = pm
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(0.105, 0.018, 0.075)
	cs.shape = bs
	rb.add_child(cs)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.105, 0.018, 0.075)
	mi.mesh = bm
	var col: Color = Lex.cat_color(word)
	mi.material_override = Proc.mat(col.lightened(0.35), 0.5)
	rb.add_child(mi)
	var lab := Label3D.new()
	lab.text = word
	lab.font = load("res://assets/fonts/NotoSansSC-subset.ttf")
	lab.font_size = 48
	lab.pixel_size = 0.0011 if word.length() <= 3 else 0.0008
	lab.modulate = Color("1a1a24")
	lab.outline_size = 0
	lab.rotation_degrees = Vector3(-90, 0, 0)
	lab.position = Vector3(0, 0.0095, 0)
	lab.double_sided = false
	rb.add_child(lab)
	var lab2 := Label3D.new()
	lab2.text = word
	lab2.font = lab.font
	lab2.font_size = 48
	lab2.pixel_size = lab.pixel_size
	lab2.modulate = Color("1a1a24")
	lab2.rotation_degrees = Vector3(90, 0, 0)
	lab2.position = Vector3(0, -0.0095, 0)
	lab2.double_sided = false
	rb.add_child(lab2)
	return rb

# 悬浮在袋口上方的重要词：金色底板 + 大字，上下漂浮
func _make_floater(word: String) -> Node3D:
	var n := Node3D.new()
	var rarity: String = str(Lex.words[word].rarity) if Lex.words.has(word) else "基础"
	var col: Color = Lex.cat_color(word)
	var plate := MeshInstance3D.new()
	var qm := QuadMesh.new()
	var w: float = 0.05 + 0.088 * float(word.length())
	qm.size = Vector2(w, 0.11)
	plate.mesh = qm
	var pmat := StandardMaterial3D.new()
	pmat.albedo_color = col.darkened(0.15)
	pmat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	pmat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	pmat.no_depth_test = true
	pmat.render_priority = 1
	plate.material_override = pmat
	n.add_child(plate)
	var edge := MeshInstance3D.new()
	var em := QuadMesh.new()
	em.size = Vector2(w + 0.016, 0.126)
	edge.mesh = em
	var emat := StandardMaterial3D.new()
	emat.albedo_color = Color("ffd66b") if rarity == "奇术" else (Color("7fb6ee") if rarity == "进阶" else Color("c7ccd6"))
	emat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	emat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	emat.no_depth_test = true
	emat.render_priority = 0
	edge.material_override = emat
	n.add_child(edge)
	var lab := Label3D.new()
	lab.text = word
	lab.font = load("res://assets/fonts/NotoSansSC-subset.ttf")
	lab.font_size = 64
	lab.pixel_size = 0.0013
	lab.modulate = Color("fff6dc")
	lab.outline_size = 8
	lab.outline_modulate = Color(0, 0, 0, 0.8)
	lab.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	lab.no_depth_test = true
	lab.render_priority = 2
	lab.position = Vector3(0, 0, 0.001)
	n.add_child(lab)
	n.set_meta("w", w + 0.016)
	return n

# ------------------------------------------------------------ 状态
func set_state(s: String) -> void:
	state = s
	var tint := Color.WHITE
	match s:
		"chosen": tint = Color(0.85, 1.2, 0.9)
		"dim": tint = Color(0.5, 0.5, 0.55)
	modulate = tint
	glow.light_color = Color("62c483") if s == "chosen" else Color("ffd66b")
	glow.light_energy = 1.4 if s == "chosen" else 0.0

func kick(strength: float = 1.0) -> void:
	for t in tiles:
		if is_instance_valid(t):
			(t as RigidBody3D).apply_central_impulse(Vector3(randf_range(-1, 1), randf_range(0.6, 1.6), randf_range(-1, 1)) * 0.05 * strength)
			(t as RigidBody3D).apply_torque_impulse(Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * 0.004 * strength)

func _process(delta: float) -> void:
	if not _built:
		return
	_t += delta
	_kick_t -= delta
	# 袋子自己滚：隔一会儿踢一下里面的牌；悬停时晃得更勤
	if _kick_t <= 0.0:
		kick(1.6 if _hover else 0.6)
		_kick_t = 0.45 if _hover else 1.4
	var wob := (0.05 if _hover else 0.012)
	bag_root.rotation.z = sin(_t * (9.0 if _hover else 2.0)) * wob
	bag_root.rotation.x = cos(_t * (7.0 if _hover else 1.7)) * wob * 0.7
	if sack != null:
		sack.scale = Vector3(1.0 + sin(_t * 6.0) * (0.02 if _hover else 0.006), 0.86, 1.0)
	bag_root.position.y = 0.03 if _hover else 0.0
	glow.light_energy = lerpf(glow.light_energy, 1.1 if (_hover and state == "normal") else (1.4 if state == "chosen" else 0.0), minf(1.0, delta * 8.0))
	# 悬浮词：按各自的宽度一个挨一个排开，整体居中
	var total_w := 0.0
	for f in floaters:
		if is_instance_valid(f):
			total_w += float(f.get_meta("w")) + 0.03
	var cursor := -total_w * 0.5
	var k := 0
	for f in floaters:
		if not is_instance_valid(f):
			continue
		var fw: float = float(f.get_meta("w"))
		f.position = Vector3(cursor + fw * 0.5, 0.88 + sin(_t * 1.6 + k * 1.3) * 0.025 + (0.04 if _hover else 0.0), 0.0)
		cursor += fw + 0.03
		k += 1


# 袋子里的牌被一股看不见的旋涡带着转：向袋心聚拢 + 绕圈 + 偶尔翻身，所以看起来是“在袋子里滚来滚去”
func _physics_process(_delta: float) -> void:
	if not _built:
		return
	var center := Vector3(0, BAG_R * 0.9, 0)
	var swirl := 0.9 if _hover else 0.35
	for t in tiles:
		if not is_instance_valid(t):
			continue
		var rb := t as RigidBody3D
		var p: Vector3 = rb.global_position - center
		var d := p.length()
		var pull := (-p) * (2.2 if d > 0.2 else 0.5)
		var tang := Vector3(-p.z, 0.0, p.x).normalized() * swirl * 0.06
		var lift := Vector3(0, 0.35 * (BAG_R * 0.9 - rb.global_position.y), 0)
		rb.apply_central_force(pull * 0.05 + tang + lift * 0.05)
		if randf() < 0.02:
			rb.apply_torque_impulse(Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * 0.002)

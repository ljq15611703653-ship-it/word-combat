extends SubViewportContainer
# 编辑器里的小舞台：随从站在台上，随你拼的词、装的关键词实时变样，拼好确定后对着空气放一次技能。
# 技能越厉害（tier 越高），特效越炫：数量、范围、光、震屏、冲击波层数都按 tier 放大。
# 素材接口：res://assets/fx/cast_<类别>.tscn（类别 atk/heal/def/trap/ctl/buff）放进去就改用它，场景根节点有 play(ctx{tier,color}) 即可。

const Minion3D = preload("res://scripts/view3d/minion3d.gd")
const Proc = preload("res://scripts/view3d/proc_parts.gd")
const Appearance = preload("res://scripts/view3d/appearance.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")

signal cast_finished()

var svp: SubViewport
var cam: Camera3D
var world: Node3D
var minion: Node3D
var light: OmniLight3D
var _sig := ""
var _t := 0.0
var _shake := 0.0
var _unit: Dictionary = {}
var _skills: Array = []
var _built := false

func _ready() -> void:
	_build()

func _build() -> void:
	if _built:
		return
	_built = true
	stretch = true
	custom_minimum_size = Vector2(210, 210)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	svp = SubViewport.new()
	svp.own_world_3d = true
	svp.transparent_bg = false
	svp.msaa_3d = Viewport.MSAA_4X
	svp.size = Vector2i(420, 420)
	add_child(svp)
	world = Node3D.new()
	svp.add_child(world)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("141a2c")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("8a90b8")
	e.ambient_light_energy = 0.75
	env.environment = e
	world.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-45, 30, 0)
	sun.light_energy = 1.1
	world.add_child(sun)
	light = OmniLight3D.new()
	light.position = Vector3(0, 0.3, 0.2)
	light.omni_range = 1.4
	light.light_energy = 0.0
	world.add_child(light)
	# 台子
	world.add_child(Proc.cyl(0.24, 0.26, 0.03, Proc.mat(Color("4a2e1c"), 0.6, 0.05), Vector3(0, -0.015, 0)))
	world.add_child(Proc.cyl(0.22, 0.22, 0.004, Proc.mat(Color("1f5a40"), 0.95), Vector3(0, 0.001, 0)))
	cam = Camera3D.new()
	cam.position = Vector3(0, 0.25, 0.78)
	cam.fov = 40
	world.add_child(cam)
	cam.look_at(Vector3(0, 0.13, 0), Vector3.UP)
	cam.current = true

func _process(delta: float) -> void:
	_t += delta
	if cam != null:
		var base := Vector3(0, 0.25, 0.78)
		cam.position = base + Vector3(sin(_t * 0.5) * 0.02, 0, 0)
		if _shake > 0.0:
			_shake = maxf(0.0, _shake - delta)
			var k := _shake * 0.06
			cam.position += Vector3(randf_range(-k, k), randf_range(-k, k), 0)
		cam.look_at(Vector3(0, 0.13, 0), Vector3.UP)

static func _signature(u: Dictionary, sks: Array) -> String:
	var parts: Array = []
	for r in Appearance.resolve(u, sks):
		parts.append("%s:%s" % [r.slot, r.proc])
	return "%s|%s|%d" % [str(u.get("glyph", "")), ",".join(parts), int(u.get("max_hp", 0)) / 6]

# 设定随从与技能（技能可以是“拼到一半”的临时技能，只用来决定外观）
func set_unit(u: Dictionary, sks: Array, animate: bool = true) -> void:
	_build()
	var uu := u.duplicate(true)
	uu["uid"] = 9999
	uu["hp"] = int(uu.get("max_hp", 10))
	uu["statuses"] = []
	var sig := _signature(uu, sks)
	if minion == null or str(_unit.get("glyph", "")) != str(uu.get("glyph", "")):
		if minion != null:
			minion.queue_free()
		minion = Minion3D.new()
		world.add_child(minion)
		minion.setup(uu, sks, 1, "battle")
		minion.hud.visible = false
		if minion.get("plate") != null:
			minion.plate = null
	else:
		minion.refresh(uu, sks)
		minion.hud.visible = false
	_unit = uu
	_skills = sks
	if animate and sig != _sig and _sig != "":
		_pop()
	_sig = sig

# 配件一变：随从“邦”地弹一下，脚下冒一圈光
func _pop() -> void:
	if minion == null:
		return
	var t := minion.create_tween()
	t.tween_property(minion, "scale", Vector3(1.0, 0.86, 1.0), 0.06)
	t.tween_property(minion, "scale", Vector3(1.0, 1.1, 1.0), 0.1)
	t.tween_property(minion, "scale", Vector3.ONE, 0.1)
	_ring(Vector3(0, 0.01, 0), Color("ffd66b"), 0.2, 0.34, 0.35)
	light.light_color = Color("ffd66b")
	var lt := light.create_tween()
	lt.tween_property(light, "light_energy", 1.8, 0.05)
	lt.tween_property(light, "light_energy", 0.0, 0.25)

# ------------------------------------------------------------ 放技能（对着空气）
# tier：0 普通 1 不错 2 强 3 超级厉害；tag：atk/heal/def/trap/ctl/buff
func cast(tier: int, tag: String) -> void:
	if minion == null:
		cast_finished.emit()
		return
	Sfx.play("cast")
	var col: Color = {"atk": Color("ff6a5a"), "heal": Color("62e0a0"), "def": Color("6aa8ff"), "trap": Color("b48ae0"), "ctl": Color("5ad0d0"), "buff": Color("ffd66b")}.get(tag, Color("ffd66b"))
	var custom := _asset("fx/cast_%s.tscn" % tag)
	# 随从起手：蓄力后仰，再猛地向前
	var mt := minion.create_tween()
	mt.tween_property(minion, "scale", Vector3(1.0, 0.9, 1.0), 0.16)
	mt.tween_property(minion, "scale", Vector3(1.0, 1.12, 1.0), 0.07)
	mt.tween_property(minion, "scale", Vector3.ONE, 0.12)
	minion.lunge(Vector3(0, 0, 2.0))
	await get_tree().create_timer(0.2).timeout
	if custom != null:
		var n: Node = custom.instantiate()
		world.add_child(n)
		if n.has_method("play"):
			n.play({"tier": tier, "color": col})
	else:
		_code_fx(tier, tag, col)
	_shake = 0.1 + 0.18 * tier
	var total := 0.9 + 0.35 * tier
	await get_tree().create_timer(total).timeout
	cast_finished.emit()

static func _asset(rel: String) -> PackedScene:
	var path := "res://assets/" + rel
	if ResourceLoader.exists(path):
		var r = load(path)
		if r is PackedScene:
			return r
	return null

func _glow(col: Color, a: float = 1.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(col.r, col.g, col.b, a)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	return m

func _ring(at: Vector3, col: Color, r0: float, r1: float, dur: float, flat: bool = true) -> void:
	var tor := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.9
	tm.outer_radius = 1.0
	tor.mesh = tm
	tor.material_override = _glow(col, 0.9)
	world.add_child(tor)
	tor.position = at
	if not flat:
		tor.rotation_degrees = Vector3(90, 0, 0)
	tor.scale = Vector3.ONE * r0
	var t := tor.create_tween().set_parallel(true)
	t.tween_property(tor, "scale", Vector3.ONE * r1, dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	t.tween_method(func(a: float):
		if is_instance_valid(tor):
			(tor.material_override as StandardMaterial3D).albedo_color.a = a, 0.9, 0.0, dur)
	t.chain().tween_callback(tor.queue_free)

func _orb(at: Vector3, to: Vector3, col: Color, size: float, dur: float, delay: float = 0.0) -> void:
	var o := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = size
	sm.height = size * 2.0
	o.mesh = sm
	o.material_override = _glow(col, 1.0)
	world.add_child(o)
	o.position = at
	var t := o.create_tween().set_parallel(true)
	t.tween_property(o, "position", to, dur).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	t.tween_property(o, "scale", Vector3.ZERO, dur * 0.5).set_delay(delay + dur * 0.5)
	t.chain().tween_callback(o.queue_free)

func _pillar(at: Vector3, col: Color, h: float, r: float, dur: float) -> void:
	var c := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = r
	cm.bottom_radius = r * 1.4
	cm.height = h
	c.mesh = cm
	c.material_override = _glow(col, 0.65)
	world.add_child(c)
	c.position = at + Vector3(0, h * 0.5, 0)
	c.scale = Vector3(0.1, 0.1, 0.1)
	var t := c.create_tween()
	t.tween_property(c, "scale", Vector3.ONE, dur * 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.tween_property(c, "scale", Vector3(0.05, 1.0, 0.05), dur * 0.75)
	t.tween_callback(c.queue_free)

func _flash(col: Color, energy: float, dur: float) -> void:
	light.light_color = col
	var lt := light.create_tween()
	lt.tween_property(light, "light_energy", energy, 0.06)
	lt.tween_property(light, "light_energy", 0.0, dur)

# 代码做的特效：tier 越高，数量、范围、层数、光都越大
func _code_fx(tier: int, tag: String, col: Color) -> void:
	var rings: int = 1 + tier
	var count: int = 6 + tier * 8
	var reach: float = 0.35 + 0.15 * tier
	var p0 := Vector3(0, 0.16, 0.06)
	match tag:
		"atk":
			for i in count:
				var ang := randf_range(-0.9, 0.9)
				var to := p0 + Vector3(sin(ang) * reach, randf_range(-0.05, 0.22), cos(ang) * reach * 1.1)
				_orb(p0, to, col.lightened(randf() * 0.4), 0.012 + 0.006 * tier, 0.4 + randf() * 0.2, randf() * 0.12)
			_ring(Vector3(0, 0.14, 0.2), col, 0.05, 0.3 + 0.12 * tier, 0.4, false)
		"heal":
			for i in count:
				var a := randf() * TAU
				var base := Vector3(cos(a) * 0.16, 0.02, sin(a) * 0.16)
				_orb(base, base + Vector3(0, 0.3 + 0.1 * tier, 0), col, 0.01 + 0.005 * tier, 0.7 + randf() * 0.3, randf() * 0.3)
			_pillar(Vector3.ZERO, col, 0.4 + 0.15 * tier, 0.07 + 0.02 * tier, 0.9)
		"def":
			var dome := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = 0.2
			sm.height = 0.4
			dome.mesh = sm
			dome.material_override = _glow(col, 0.35)
			world.add_child(dome)
			dome.position = Vector3(0, 0.13, 0)
			dome.scale = Vector3.ONE * 0.3
			var t := dome.create_tween()
			t.tween_property(dome, "scale", Vector3.ONE * (1.0 + 0.3 * tier), 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
			t.tween_interval(0.4 + 0.1 * tier)
			t.tween_property(dome, "scale", Vector3.ONE * (1.25 + 0.3 * tier), 0.25)
			t.tween_callback(dome.queue_free)
		"trap":
			for i in 3 + tier:
				var a2 := TAU * i / float(3 + tier)
				_pillar(Vector3(cos(a2) * 0.18, 0, sin(a2) * 0.18), col, 0.25 + 0.1 * tier, 0.02, 1.0 + 0.2 * tier)
			_ring(Vector3(0, 0.01, 0), col, 0.1, 0.3, 0.9)
		"ctl":
			for i in rings + 1:
				_ring(Vector3(0, 0.1 + 0.03 * i, 0), col, 0.05, 0.28 + 0.06 * i, 0.5 + 0.12 * i, false)
		_:
			_pillar(Vector3.ZERO, col, 0.35 + 0.12 * tier, 0.06, 0.9)
			for i in count / 2:
				_orb(Vector3(0, 0.05, 0), Vector3(randf_range(-0.2, 0.2), 0.3 + randf() * 0.2, randf_range(-0.2, 0.2)), col, 0.01, 0.6, randf() * 0.2)
	# 通用：地面冲击波层数 = tier + 1；光闪；tier≥2 追加十字光柱；tier 3 再来一轮大爆发
	for i in rings:
		_ring(Vector3(0, 0.012, 0), col, 0.06, 0.25 + 0.12 * i + 0.06 * tier, 0.35 + 0.1 * i)
	_flash(col, 1.5 + 1.2 * tier, 0.3 + 0.12 * tier)
	if tier >= 2:
		for i in 4:
			var a3 := TAU * i / 4.0
			_pillar(Vector3(cos(a3) * 0.1, 0, sin(a3) * 0.1), col.lightened(0.3), 0.5, 0.012, 0.7)
	if tier >= 3:
		await get_tree().create_timer(0.25).timeout
		if not is_inside_tree():
			return
		_flash(Color.WHITE, 4.0, 0.5)
		for i in 28:
			var a4 := randf() * TAU
			_orb(p0, p0 + Vector3(cos(a4), randf_range(-0.1, 0.6), sin(a4)) * randf_range(0.2, 0.6), col.lightened(0.5), 0.016, 0.6, randf() * 0.15)
		_ring(Vector3(0, 0.014, 0), Color.WHITE, 0.06, 0.8, 0.6)
		_pillar(Vector3.ZERO, Color.WHITE, 0.9, 0.05, 0.8)
		_shake = 0.6

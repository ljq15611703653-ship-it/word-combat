extends Node3D

const NAMES := ["sword", "shield", "mage", "bow", "wisp"]
const LABELS := ["SWORD", "SHIELD", "MAGE", "BOW", "WISP"]

func _ready() -> void:
	RenderingServer.set_default_clear_color(Color("1d172f"))
	var env := WorldEnvironment.new()
	var world := Environment.new()
	world.background_mode = Environment.BG_COLOR
	world.background_color = Color("1d172f")
	world.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	world.ambient_light_color = Color("9188b3")
	world.ambient_light_energy = 0.35
	world.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.environment = world
	add_child(env)
	var camera := Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 0.60
	camera.position = Vector3(0.30 if OS.get_cmdline_user_args().has("--three-quarter") else 0.0, 0.28, -0.92)
	camera.current = true
	add_child(camera)
	camera.look_at(Vector3(0, 0.153, 0), Vector3.UP)
	_light(Vector3(-0.55, 0.8, -0.5), Color("fff2dd"), 1.25)
	_light(Vector3(0.5, 0.45, 0.25), Color("b48bff"), 0.65)
	_light(Vector3(0.2, 0.27, -0.8), Color("a5c8ff"), 0.20)
	for i in NAMES.size():
		var n: String = NAMES[i]
		var path := ProjectSettings.globalize_path("res://../../../assets/models/minions/body_%s.glb" % n)
		var state := GLTFState.new()
		var doc := GLTFDocument.new()
		var err := doc.append_from_file(path, state)
		if err != OK:
			push_error("Missing " + n); continue
		var model := doc.generate_scene(state)
		model.position = Vector3((2 - i) * 0.255, 0, 0)
		add_child(model)
		var pedestal := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.092
		mesh.bottom_radius = 0.101
		mesh.height = 0.014
		pedestal.mesh = mesh
		pedestal.position = Vector3((2 - i) * 0.255, -0.013, 0)
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color("594875")
		mat.metallic = 0.53
		mat.roughness = 0.38
		pedestal.material_override = mat
		add_child(pedestal)
	_labels()

func _light(at: Vector3, color: Color, energy: float) -> void:
	var l := OmniLight3D.new()
	l.position = at
	l.light_color = color
	l.light_energy = energy
	l.omni_range = 2.5
	add_child(l)

func _labels() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)
	for i in NAMES.size():
		var name := Label.new()
		name.text = LABELS[i]
		name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name.position = Vector2(230 + i * 269, 615)
		name.size = Vector2(180, 32)
		name.add_theme_font_size_override("font_size", 24)
		name.add_theme_color_override("font_color", Color("f8df9c"))
		canvas.add_child(name)

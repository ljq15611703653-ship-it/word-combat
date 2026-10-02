extends SceneTree
# Offline preview only: body + independent attachments. Does not enter the game.

func _initialize() -> void:
	call_deferred("run")

func load_gltf(path: String) -> Node3D:
	var state := GLTFState.new()
	var doc := GLTFDocument.new()
	var err := doc.append_from_file(path, state)
	if err != OK:
		push_error("Could not import " + path + " error=" + str(err))
		return Node3D.new()
	return doc.generate_scene(state)

func run() -> void:
	var base := ProjectSettings.globalize_path("res://../art/handoff_2026-10-01").simplify_path()
	var body := load_gltf(base.path_join("assets/models/minions/body_sword.glb"))
	var accessories := {"hand_r":"sword", "hand_l":"shield", "back":"cape", "shoulder_r":"thorns", "shoulder_l":"vines", "chest":"amulet", "head":"halo", "aura":"ring_double"}
	for slot in accessories:
		var socket := body.find_child("Socket_" + slot, true, false)
		if socket == null:
			push_error("Missing socket " + slot)
			continue
		var part := load_gltf(base.path_join("assets/models/attachments/" + accessories[slot] + ".glb"))
		socket.add_child(part)
	var vp := SubViewport.new()
	vp.size = Vector2i(768,768)
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.msaa_3d = Viewport.MSAA_4X
	root.add_child(vp)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.background_color = Color("#292034")
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color("#c7b8d2")
	env.environment.ambient_light_energy = 0.85
	vp.add_child(env)
	vp.add_child(body)
	var key := OmniLight3D.new()
	key.position = Vector3(-0.24,0.34,-0.25)
	key.omni_range = 1.5
	key.light_energy = 1.9
	vp.add_child(key)
	var rim := OmniLight3D.new()
	rim.position = Vector3(0.22,0.29,0.25)
	rim.light_color = Color("#ffca96")
	rim.omni_range = 1.3
	rim.light_energy = 1.1
	vp.add_child(rim)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 0.43
	cam.position = Vector3(0.13,0.24,-0.62)
	vp.add_child(cam)
	cam.look_at(Vector3(0,0.125,0),Vector3.UP)
	cam.current = true
	for i in 5:
		await process_frame
	await RenderingServer.frame_post_draw
	vp.get_texture().get_image().save_png(base.path_join("previews/assembled_sword.png"))
	print("assembled preview saved")
	quit()

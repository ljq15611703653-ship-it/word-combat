extends SceneTree
# Reimport each delivery GLB with Godot's glTF parser and render an offline preview.

const BASE := "res://../art/handoff_2026-10-01"
const NAMES := ["sword", "shield", "buckler", "cape", "thorns", "vines", "twin_ring", "amulet", "ring_double", "afterimage", "hourglass", "mirror", "wand", "halo", "chains", "mask", "book"]

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var base := ProjectSettings.globalize_path(BASE).simplify_path()
	var out := base.path_join("previews/attachments")
	DirAccess.make_dir_recursive_absolute(out)
	var report := {}
	for item in NAMES:
		var file := base.path_join("assets/models/attachments/" + item + ".glb")
		var doc := GLTFDocument.new()
		var state := GLTFState.new()
		var err := doc.append_from_file(file, state)
		if err != OK:
			push_error("IMPORT FAILED " + item + " " + str(err))
			continue
		var scene := doc.generate_scene(state)
		var meshes: Array = []
		var collisions: Array = []
		collect(scene, meshes, collisions)
		if meshes.is_empty() or not collisions.is_empty():
			push_error("BAD GEOMETRY " + item + " meshes=" + str(meshes.size()) + " collisions=" + str(collisions.size()))
		var vp := SubViewport.new()
		vp.size = Vector2i(384,384)
		vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		vp.msaa_3d = Viewport.MSAA_4X
		root.add_child(vp)
		var env := WorldEnvironment.new()
		env.environment = Environment.new()
		env.environment.background_mode = Environment.BG_COLOR
		env.environment.background_color = Color("#292034")
		env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		env.environment.ambient_light_color = Color("#c8bad8")
		env.environment.ambient_light_energy = 0.95
		vp.add_child(env)
		vp.add_child(scene)
		var light := DirectionalLight3D.new()
		light.rotation_degrees = Vector3(-40,20,0)
		light.light_energy = 1.25
		vp.add_child(light)
		var key := OmniLight3D.new()
		key.position = Vector3(-0.17,0.23,-0.20)
		key.omni_range = 1.0
		key.light_energy = 1.7
		vp.add_child(key)
		var rim := OmniLight3D.new()
		rim.position = Vector3(0.11,0.18,0.18)
		rim.light_color = Color("#ffc28b")
		rim.omni_range = 1.0
		rim.light_energy = 0.9
		vp.add_child(rim)
		var cam := Camera3D.new()
		cam.projection = Camera3D.PROJECTION_ORTHOGONAL
		cam.size = 0.30 if item == "afterimage" else 0.24
		cam.position = Vector3(0.10,0.10,-0.38)
		vp.add_child(cam)
		cam.look_at(Vector3(0,-0.025,0) if item == "cape" else Vector3(0,0.035,0),Vector3.UP)
		cam.current = true
		for i in 4:
			await process_frame
		await RenderingServer.frame_post_draw
		var png := out.path_join(item + ".png")
		var image := vp.get_texture().get_image()
		image.save_png(png)
		report[item] = {"mesh_nodes":meshes.size(),"collision_nodes":collisions.size(),"bytes":FileAccess.get_file_as_bytes(file).size(),"preview":png}
		print("VALID " + item + " meshes=" + str(meshes.size()) + " collisions=" + str(collisions.size()))
		vp.queue_free()
		await process_frame
	var output := FileAccess.open(base.path_join("previews/attachments/validation.json"), FileAccess.WRITE)
	output.store_string(JSON.stringify(report,"\t"))
	output.close()
	quit()

func collect(node: Node, meshes: Array, collisions: Array) -> void:
	if node is MeshInstance3D:
		meshes.append(node)
	if node is CollisionObject3D or node is CollisionShape3D:
		collisions.append(node)
	for child in node.get_children():
		collect(child,meshes,collisions)

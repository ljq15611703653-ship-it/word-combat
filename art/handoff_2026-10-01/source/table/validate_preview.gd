extends SceneTree
# Reimport the five table GLBs and render representative game-angle previews.

const BASE := "res://../art/handoff_2026-10-01"
const NAMES := ["table", "opponent", "chip_mine", "chip_foe", "bag"]
var base: String
var report := {}

func _initialize() -> void:
	call_deferred("run")

func load_gltf(path: String) -> Node3D:
	var state := GLTFState.new()
	var doc := GLTFDocument.new()
	var err := doc.append_from_file(path,state)
	if err != OK:
		push_error("IMPORT FAILED " + path + " error=" + str(err))
		return Node3D.new()
	return doc.generate_scene(state)

func tally(n: Node, meshes: Array, colliders: Array) -> void:
	if n is MeshInstance3D:
		meshes.append(n)
	if n is CollisionObject3D or n is CollisionShape3D:
		colliders.append(n)
	for c in n.get_children():
		tally(c,meshes,colliders)

func bounds_of(n: Node, parent_transform: Transform3D, values: Dictionary) -> void:
	var transform := parent_transform
	if n is Node3D:
		transform = parent_transform * (n as Node3D).transform
	if n is MeshInstance3D:
		var box: AABB = (n as MeshInstance3D).mesh.get_aabb()
		for ix in 2:
			for iy in 2:
				for iz in 2:
					var corner := box.position + Vector3(box.size.x*ix,box.size.y*iy,box.size.z*iz)
					var at := transform * corner
					values.min = Vector3(minf(values.min.x,at.x),minf(values.min.y,at.y),minf(values.min.z,at.z))
					values.max = Vector3(maxf(values.max.x,at.x),maxf(values.max.y,at.y),maxf(values.max.z,at.z))
	for child in n.get_children():
		bounds_of(child,transform,values)

func aabb_report(scene: Node3D) -> Dictionary:
	var values := {"min":Vector3(1e6,1e6,1e6),"max":Vector3(-1e6,-1e6,-1e6)}
	bounds_of(scene,Transform3D.IDENTITY,values)
	return {"min":[snappedf(values.min.x,0.0001),snappedf(values.min.y,0.0001),snappedf(values.min.z,0.0001)],"max":[snappedf(values.max.x,0.0001),snappedf(values.max.y,0.0001),snappedf(values.max.z,0.0001)]}

func run() -> void:
	base = ProjectSettings.globalize_path(BASE).simplify_path()
	DirAccess.make_dir_recursive_absolute(base.path_join("previews/table"))
	for item in NAMES:
		var file := base.path_join("assets/table/"+item+".glb")
		var scene := load_gltf(file)
		var meshes := []
		var colliders := []
		tally(scene,meshes,colliders)
		if meshes.is_empty() or not colliders.is_empty():
			push_error("INVALID " + item)
		var actual := aabb_report(scene)
		var legacy_file := base.path_join("source/legacy_table/models/"+item+".glb")
		var legacy := {}
		if FileAccess.file_exists(legacy_file):
			var old_scene := load_gltf(legacy_file)
			legacy = aabb_report(old_scene)
			old_scene.free()
		var within := true
		if not legacy.is_empty():
			for axis in 3:
				within = within and actual.min[axis] >= legacy.min[axis] and actual.max[axis] <= legacy.max[axis]
		if not within and item != "opponent":
			push_error("OUTSIDE LEGACY ENVELOPE " + item + " actual=" + str(actual) + " legacy=" + str(legacy))
		var seated: bool = item == "opponent" and actual.min[1] < -0.5 and actual.min[2] < -0.4 and actual.max[1] < 0.5 and actual.max[2] < 0.05
		if item == "opponent" and not seated:
			push_error("OPPONENT IS NOT BEHIND THE TABLE " + str(actual))
		report[item] = {"bytes":FileAccess.get_file_as_bytes(file).size(),"mesh_nodes":meshes.size(),"collision_nodes":colliders.size(),"aabb":actual,"legacy_aabb":legacy,"within_legacy_envelope":within,"intentional_seated_offset":item == "opponent","seated_position_valid":seated if item == "opponent" else null}
		print("VALID " + item + " meshes=" + str(meshes.size()) + " collisions=" + str(colliders.size()))
		scene.free()
	await render_table(false,"seat_exact")
	await render_table(false,"seat")
	await render_table(false,"hero")
	await render_table(true,"top")
	await render_bag()
	await render_object("opponent",Vector3(0,0.47,1.05),Vector3(0,0.28,0),0.77)
	await render_object("chip_mine",Vector3(0.12,0.18,0.13),Vector3.ZERO,0.16)
	await render_object("chip_foe",Vector3(0.12,0.18,0.13),Vector3.ZERO,0.16)
	var f := FileAccess.open(base.path_join("previews/table/validation.json"),FileAccess.WRITE)
	f.store_string(JSON.stringify(report,"\t"))
	f.close()
	quit()

func stage(size: Vector2i, bg: String) -> SubViewport:
	var vp := SubViewport.new()
	vp.size = size
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.msaa_3d = Viewport.MSAA_4X
	root.add_child(vp)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.background_color = Color(bg)
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color("#7a80a0")
	env.environment.ambient_light_energy = 0.55
	vp.add_child(env)
	var lamp := OmniLight3D.new()
	lamp.position = Vector3(0,1.25,0)
	lamp.omni_range = 3.2
	lamp.light_energy = 2.4
	lamp.light_color = Color("#ffe0b0")
	vp.add_child(lamp)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-60,160,0)
	fill.light_energy = 0.35
	fill.light_color = Color("#a0b0ff")
	vp.add_child(fill)
	return vp

func capture(vp: SubViewport, name: String) -> void:
	for i in 5:
		await process_frame
	await RenderingServer.frame_post_draw
	vp.get_texture().get_image().save_png(base.path_join("previews/table/"+name+".png"))
	print("PREVIEW " + name)
	vp.queue_free()
	await process_frame

func render_table(minions: bool, view: String) -> void:
	var vp := stage(Vector2i(1280,720),"#0d0b10")
	vp.add_child(load_gltf(base.path_join("assets/table/table.glb")))
	var foe := load_gltf(base.path_join("assets/table/opponent.glb"))
	foe.position = Vector3(0,0,-0.85)
	vp.add_child(foe)
	for s in 2:
		for i in 5:
			var chip := load_gltf(base.path_join("assets/table/chip_mine.glb" if s == 0 else "assets/table/chip_foe.glb"))
			chip.position = Vector3(1.05,0.02+float(i)*0.016,0.34 if s == 0 else -0.34)
			vp.add_child(chip)
	if minions:
		var kinds := ["body_sword","body_shield","body_mage","body_bow","body_wisp"]
		for s in 2:
			for i in 5:
				var body := load_gltf(base.path_join("assets/models/minions/"+kinds[i]+".glb"))
				body.position = Vector3((float(i)-2.0)*0.42,0,0.30 if s == 0 else -0.30)
				body.rotation_degrees.y = 180 if s == 1 else 0
				vp.add_child(body)
	var cam := Camera3D.new()
	# seat_exact records table3d.gd's fixed camera; seat is a wider art preview
	# so the entire opponent silhouette can be judged without changing the game.
	if view == "top":
		cam.fov = 60
		cam.position = Vector3(0,1.26,0.63)
		cam.rotation_degrees = Vector3(-67,0,0)
	elif view == "hero":
		cam.fov = 50
		cam.position = Vector3(1.65,1.25,1.9)
	elif view == "seat_exact":
		cam.fov = 56
		cam.position = Vector3(0,0.66,1.0)
		cam.rotation_degrees = Vector3(-33,0,0)
	else:
		cam.fov = 60
		cam.position = Vector3(0,0.72,1.22)
		cam.rotation_degrees = Vector3(-29,0,0)
	vp.add_child(cam)
	if view == "hero":
		cam.look_at(Vector3(0,-0.12,-0.1),Vector3.UP)
	cam.current = true
	await capture(vp,"table_"+view)

func render_bag() -> void:
	var vp := stage(Vector2i(800,600),"#0d0b10")
	var bag := load_gltf(base.path_join("assets/table/bag.glb"))
	vp.add_child(bag)
	var cam := Camera3D.new()
	cam.position = Vector3(0,0.95,1.55)
	cam.fov = 40
	vp.add_child(cam)
	cam.look_at(Vector3(0,0.5,0),Vector3.UP)
	cam.current = true
	await capture(vp,"bag")

func render_object(item: String, camera_at: Vector3, target: Vector3, size: float) -> void:
	var vp := stage(Vector2i(560,560),"#0d0b10")
	vp.add_child(load_gltf(base.path_join("assets/table/"+item+".glb")))
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = size
	cam.position = camera_at
	vp.add_child(cam)
	cam.look_at(target,Vector3.UP)
	cam.current = true
	await capture(vp,item)

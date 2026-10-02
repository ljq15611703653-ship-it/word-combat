extends SceneTree

const NAMES := ["sword", "shield", "mage", "bow", "wisp"]
const SLOTS := ["head", "back", "shoulder_l", "shoulder_r", "hand_l", "hand_r", "chest", "waist", "aura", "ghost"]

func _initialize() -> void:
	var failed := false
	for n in NAMES:
		var path := ProjectSettings.globalize_path("res://../../../assets/models/minions/body_%s.glb" % n)
		var state := GLTFState.new()
		var doc := GLTFDocument.new()
		var err := doc.append_from_file(path, state)
		if err != OK:
			push_error("GLB import failed: %s error=%d" % [n, err]); failed = true; continue
		var scene := doc.generate_scene(state)
		if scene == null:
			push_error("GLB scene null: " + n); failed = true; continue
		var mesh_count := 0
		var max_y := -999.0
		var min_y := 999.0
		for child in scene.find_children("*", "MeshInstance3D", true, false):
			mesh_count += 1
			var bb: AABB = (child as MeshInstance3D).mesh.get_aabb()
			max_y = max(max_y, bb.position.y + bb.size.y)
			min_y = min(min_y, bb.position.y)
		for slot in SLOTS:
			if scene.find_child("Socket_" + slot, true, false) == null:
				push_error("Missing socket: %s %s" % [n, slot]); failed = true
		if mesh_count < 15 or max_y < 0.28 or max_y > 0.34 or min_y < -0.01:
			push_error("Geometry extent issue: %s mesh=%d y=[%.3f, %.3f]" % [n, mesh_count, min_y, max_y]); failed = true
		print("CHECK %s: meshes=%d y=[%.3f, %.3f] sockets=%d" % [n, mesh_count, min_y, max_y, SLOTS.size()])
		scene.free()
	quit(1 if failed else 0)

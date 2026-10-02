extends SceneTree
# Source generator for the modular GLB attachments in this handoff.
# Units are Godot metres. The origin of each exported scene is its Socket_* pivot.
# No collider, animation, or scene-level behavior is exported.

const OUT := "../../assets/models/attachments"
var base_dir: String

func _initialize() -> void:
	base_dir = ProjectSettings.globalize_path("res://../art/handoff_2026-10-01/source/attachments")
	var out_dir := base_dir.path_join(OUT).simplify_path()
	DirAccess.make_dir_recursive_absolute(out_dir)
	var names := ["sword", "shield", "buckler", "cape", "thorns", "vines", "twin_ring", "amulet", "ring_double", "afterimage", "hourglass", "mirror", "wand", "halo", "chains", "mask", "book"]
	var failed := false
	for item in names:
		var root := Node3D.new()
		root.name = item
		build(item, root)
		var state := GLTFState.new()
		var document := GLTFDocument.new()
		var err := document.append_from_scene(root, state)
		if err == OK:
			err = document.write_to_filesystem(state, out_dir.path_join(item + ".glb"))
		if err != OK:
			push_error("Could not export " + item + ": " + str(err))
			failed = true
		else:
			print("EXPORTED " + item)
		root.free()
	quit(1 if failed else 0)

func material(color: String, roughness := 0.34, metal := 0.12, emission := 0.0, alpha := 1.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(color, alpha)
	mat.roughness = roughness
	mat.metallic = metal
	if emission > 0.0:
		mat.emission_enabled = true
		mat.emission = Color(color)
		mat.emission_energy_multiplier = emission
	if alpha < 1.0:
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_ALWAYS
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat

func mesh(parent: Node3D, primitive: Mesh, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, scale := Vector3.ONE, label := "") -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label if label != "" else "Shape"
	node.mesh = primitive
	node.material_override = mat
	node.position = pos
	node.rotation_degrees = rot
	node.scale = scale
	parent.add_child(node)
	return node

func sphere(parent: Node3D, radius: float, mat: Material, pos := Vector3.ZERO, scale := Vector3.ONE, label := "") -> void:
	var shape := SphereMesh.new()
	shape.radius = radius
	shape.height = 2.0 * radius
	shape.radial_segments = 24
	shape.rings = 12
	mesh(parent, shape, mat, pos, Vector3.ZERO, scale, label)

func box(parent: Node3D, size: Vector3, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, label := "") -> void:
	var shape := BoxMesh.new()
	shape.size = size
	mesh(parent, shape, mat, pos, rot, Vector3.ONE, label)

func cylinder(parent: Node3D, top_radius: float, bottom_radius: float, height: float, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, label := "") -> void:
	var shape := CylinderMesh.new()
	shape.top_radius = top_radius
	shape.bottom_radius = bottom_radius
	shape.height = height
	shape.radial_segments = 24
	mesh(parent, shape, mat, pos, rot, Vector3.ONE, label)

func torus(parent: Node3D, inner: float, outer: float, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, label := "") -> void:
	var shape := TorusMesh.new()
	shape.inner_radius = inner
	shape.outer_radius = outer
	shape.rings = 36
	shape.ring_segments = 12
	mesh(parent, shape, mat, pos, rot, Vector3.ONE, label)

func rod(parent: Node3D, a: Vector3, b: Vector3, radius: float, mat: Material, label := "") -> void:
	var length := a.distance_to(b)
	var shape := CylinderMesh.new()
	shape.top_radius = radius
	shape.bottom_radius = radius
	shape.height = length
	shape.radial_segments = 12
	var node := mesh(parent, shape, mat, (a+b)*0.5, Vector3.ZERO, Vector3.ONE, label)
	node.quaternion = Quaternion(Vector3.UP, (b-a).normalized())

func poly(parent: Node3D, points: PackedVector3Array, faces: PackedInt32Array, mat: Material, label: String) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for idx in faces:
		surface.add_vertex(points[idx])
	surface.generate_normals()
	var shape := surface.commit()
	mesh(parent, shape, mat, Vector3.ZERO, Vector3.ZERO, Vector3.ONE, label)

func badge(parent: Node3D, color: String, size: float, y := 0.0, z := -0.012) -> void:
	var gold := material("#ffe0a0", 0.22, 0.62)
	var gem := material(color, 0.2, 0.1, 0.12)
	torus(parent, size*0.74, size, gold, Vector3(0, y, z), Vector3(90, 0, 0), "GoldBezel")
	sphere(parent, size*0.78, gem, Vector3(0, y, z-0.001), Vector3(1, 1, 0.38), "EnamelGem")
	sphere(parent, size*0.19, material("#fff9de", 0.13, 0.0, 0.15), Vector3(-size*0.28, y+size*0.32, z-size*0.012), Vector3(1, 0.7, 0.3), "Glint")

func leaf(parent: Node3D, p: Vector3, tilt: float, size: float, col: String) -> void:
	var pts := PackedVector3Array([
		Vector3(0, -size, 0), Vector3(-size*0.48, 0, 0),
		Vector3(0, size, -size*0.14), Vector3(size*0.48, 0, 0),
	])
	var holder := Node3D.new()
	holder.name = "Leaf"
	holder.position = p
	holder.rotation_degrees.z = tilt
	parent.add_child(holder)
	poly(holder, pts, PackedInt32Array([0,1,2, 0,2,3]), material(col, 0.45), "EnamelLeaf")
	rod(holder, Vector3(0,-size*0.7,-0.0003), Vector3(0,size*0.7,-size*0.09), size*0.045, material("#d7bb78", 0.38, 0.3), "Vein")

func build(kind: String, root: Node3D) -> void:
	var gold := material("#e9bd6f", 0.27, 0.68)
	var bright_gold := material("#ffe7a8", 0.21, 0.55, 0.04)
	var deep := material("#392548", 0.55)
	var pearl := material("#fff1d7", 0.35)
	match kind:
		"sword":
			var blade := material("#e9f7ff", 0.17, 0.72)
			var blade_edge := material("#ffffff", 0.12, 0.7)
			cylinder(root, 0.005, 0.006, 0.036, deep, Vector3(0, -0.006, 0), Vector3.ZERO, "Grip")
			cylinder(root, 0.007, 0.007, 0.006, bright_gold, Vector3(0,-0.026,0), Vector3.ZERO, "Pommel")
			box(root, Vector3(0.048,0.008,0.012), gold, Vector3(0,0.015,0), Vector3.ZERO, "Guard")
			sphere(root, 0.008, material("#ff747e", 0.18, 0.05, 0.1), Vector3(0,0.016,-0.007), Vector3(1,0.7,0.38), "GuardRuby")
			poly(root, PackedVector3Array([Vector3(-0.011,0.02,0.002),Vector3(0.011,0.02,0.002),Vector3(0.009,0.104,0.002),Vector3(0,0.128,0.002),Vector3(-0.009,0.104,0.002),Vector3(0,0.02,-0.007),Vector3(0,0.105,-0.007)]), PackedInt32Array([0,1,5, 1,2,6, 1,6,5, 2,3,6, 3,4,6, 4,0,5, 4,5,6]), blade, "FacetedBlade")
			rod(root, Vector3(0,0.031,-0.008),Vector3(0,0.111,-0.004),0.0013,blade_edge,"BrightCenter")
		"shield", "buckler":
			var r := 0.048 if kind == "shield" else 0.034
			var face_col := "#ef756c" if kind == "shield" else "#81c4f5"
			var face := material(face_col, 0.28, 0.2)
			cylinder(root, r, r, 0.008, gold, Vector3(0,0,-0.008), Vector3(90,0,0), "GoldRim")
			cylinder(root, r*0.85, r*0.85, 0.009, face, Vector3(0,0,-0.014), Vector3(90,0,0), "DomedEnamel")
			torus(root, r*0.63, r*0.73, bright_gold, Vector3(0,0,-0.02), Vector3(90,0,0), "InnerFillet")
			badge(root, "#fff7cc", r*0.27, 0, -0.026)
			for i in 4:
				var a := TAU*float(i)/4.0
				sphere(root,r*0.047,bright_gold,Vector3(cos(a)*r*0.7,sin(a)*r*0.7,-0.023),Vector3.ONE,"Stud")
		"cape":
			var capemat := material("#b44e6d", 0.76)
			var border := material("#f3c984", 0.36, 0.4)
			var verts := PackedVector3Array([Vector3(-0.038,0.028,0.001),Vector3(0.038,0.028,0.001),Vector3(-0.056,-0.12,0.027),Vector3(0.055,-0.118,0.023),Vector3(0,-0.108,0.046),Vector3(0,0.03,0.014)])
			poly(root, verts, PackedInt32Array([0,5,2, 5,4,2, 5,1,4, 1,3,4]), capemat, "DrapedFabric")
			rod(root,verts[0],verts[2],0.0018,border,"LeftHem")
			rod(root,verts[1],verts[3],0.0018,border,"RightHem")
			rod(root,verts[2],verts[4],0.0018,border,"ScallopHem")
			rod(root,verts[4],verts[3],0.0018,border,"ScallopHem")
			rod(root,verts[0],verts[1],0.003,gold,"Collar")
			badge(root,"#fca2aa",0.008,0.028,-0.006)
		"thorns":
			var enamel := material("#ed9d77", 0.35)
			for i in 3:
				var x := (float(i)-1.0)*0.016
				var h := 0.043 if i == 1 else 0.031
				cylinder(root, 0.0, 0.009, h, enamel, Vector3(x,0.008+h*0.35,-0.007), Vector3(0,0,(-21+21*i)), "SoftSpine")
				sphere(root,0.008,gold,Vector3(x,0.005,-0.009),Vector3.ONE,"Rivet")
			torus(root,0.019,0.024,gold,Vector3(0,0,0),Vector3(75,0,0),"ShoulderCuff")
		"vines":
			var green := material("#65b786", 0.42)
			var stem := material("#357564", 0.56)
			var pts := [Vector3(-0.027,-0.015,0.004),Vector3(-0.013,0.018,0.001),Vector3(0.012,0.022,-0.009),Vector3(0.028,0.0,-0.011)]
			for i in 3:
				rod(root,pts[i],pts[i+1],0.0035,stem,"CurlingStem")
			leaf(root,Vector3(-0.014,0.02,-0.005),-42,0.018,"#81c98d")
			leaf(root,Vector3(0.016,0.017,-0.014),36,0.014,"#5cb29d")
			sphere(root,0.008,material("#ffb6cb",0.25),Vector3(0.027,0.001,-0.013),Vector3(0.8,1,0.8),"Bud")
		"twin_ring":
			var aqua := material("#8be5e9",0.22,0.33,0.13)
			var pink := material("#f2aacd",0.27,0.26,0.07)
			torus(root,0.014,0.020,aqua,Vector3(-0.015,0,-0.008),Vector3(90,15,0),"FirstLoop")
			torus(root,0.014,0.020,pink,Vector3(0.015,0,-0.01),Vector3(90,-15,0),"SecondLoop")
			sphere(root,0.005,bright_gold,Vector3(0,0.011,-0.015),Vector3.ONE,"SharedSpark")
		"amulet":
			rod(root,Vector3(-0.018,0.022,0),Vector3(0,-0.012,-0.013),0.0016,gold,"Chain")
			rod(root,Vector3(0,-0.012,-0.013),Vector3(0.018,0.022,0),0.0016,gold,"Chain")
			badge(root,"#b696f4",0.021,-0.012,-0.015)
		"ring_double":
			var sun := material("#ffd684",0.2,0.35,0.18,0.8)
			torus(root,0.069,0.074,sun,Vector3(0,0.003,0),Vector3.ZERO,"InnerHalo")
			torus(root,0.091,0.095,bright_gold,Vector3(0,0.007,0),Vector3.ZERO,"OuterHalo")
			for i in 8:
				var a := TAU*float(i)/8.0
				sphere(root,0.004,sun,Vector3(cos(a)*0.084,0.011,sin(a)*0.084),Vector3(1,0.42,1),"OrbitSpark")
		"afterimage":
			var ghost := material("#b8bbff",0.22,0.02,0.3,0.4)
			sphere(root,0.045,ghost,Vector3(0.051,0.129,0.031),Vector3(0.85,1.35,0.5),"GlassBodyEcho")
			sphere(root,0.032,ghost,Vector3(0.053,0.206,0.032),Vector3(1,0.8,0.65),"GlassHeadEcho")
			torus(root,0.045,0.049,ghost,Vector3(0.049,0.014,0.04),Vector3.ZERO,"FadingFootprint")
		"hourglass":
			var glass := material("#cff0ed",0.12,0.03,0.04,0.62)
			cylinder(root,0.024,0.024,0.005,gold,Vector3(0,0.033,0),Vector3.ZERO,"TopCap")
			cylinder(root,0.024,0.024,0.005,gold,Vector3(0,-0.033,0),Vector3.ZERO,"BottomCap")
			cylinder(root,0.018,0.005,0.028,glass,Vector3(0,0.015,0),Vector3.ZERO,"UpperGlass")
			cylinder(root,0.005,0.018,0.028,glass,Vector3(0,-0.015,0),Vector3.ZERO,"LowerGlass")
			cylinder(root,0.009,0.016,0.01,material("#f4c87b",0.65),Vector3(0,-0.025,0),Vector3.ZERO,"Sand")
			for x in [-0.018,0.018]:
				rod(root,Vector3(x,-0.03,0),Vector3(x,0.03,0),0.002,gold,"FrameRod")
		"mirror":
			var shine := material("#c3edf6",0.16,0.68,0.03)
			cylinder(root,0.033,0.033,0.006,gold,Vector3(0,0.024,-0.009),Vector3(90,0,0),"Frame")
			cylinder(root,0.028,0.028,0.006,shine,Vector3(0,0.024,-0.014),Vector3(90,0,0),"ReflectiveFace")
			torus(root,0.029,0.033,bright_gold,Vector3(0,0.024,-0.019),Vector3(90,0,0),"Bezel")
			rod(root,Vector3(0,-0.029,-0.008),Vector3(0,0,-0.008),0.004,deep,"Handle")
			sphere(root,0.005,gold,Vector3(0,-0.029,-0.008),Vector3.ONE,"HandleEnd")
			sphere(root,0.007,pearl,Vector3(-0.009,0.037,-0.020),Vector3(0.7,0.9,0.2),"MirrorGlint")
		"wand":
			rod(root,Vector3(0,-0.026,0),Vector3(0.012,0.093,0),0.004,deep,"LacquerShaft")
			rod(root,Vector3(0,-0.026,0),Vector3(0.012,0.093,0),0.0014,gold,"GoldInlay")
			sphere(root,0.015,material("#cfa9f7",0.18,0.12,0.2),Vector3(0.013,0.099,0),Vector3(0.8,1.3,0.8),"Crystal")
			torus(root,0.007,0.011,bright_gold,Vector3(0.013,0.088,0),Vector3.ZERO,"CrystalSetting")
		"halo":
			var halo_mat := material("#fff1ad",0.19,0.46,0.2,0.86)
			torus(root,0.033,0.038,halo_mat,Vector3(0,0.047,0),Vector3(5,0,0),"CrownHalo")
			for i in 3:
				var a := TAU*float(i)/3.0
				sphere(root,0.004,pearl,Vector3(cos(a)*0.035,0.049,sin(a)*0.035),Vector3.ONE,"HaloPearl")
		"chains":
			var steel := material("#abb9d3",0.27,0.76)
			for i in 8:
				var a := TAU*float(i)/8.0
				torus(root,0.007,0.010,steel,Vector3(cos(a)*0.047,0.002*sin(a*2),sin(a)*0.046),Vector3(90,rad_to_deg(a),28 if i%2==0 else -28),"FloatingLink")
			badge(root,"#f5b5b0",0.009,-0.004,-0.054)
		"mask":
			var ivory := material("#fff1db",0.43)
			sphere(root,0.03,ivory,Vector3(0,-0.003,-0.029),Vector3(1.1,0.88,0.36),"IvoryFace")
			sphere(root,0.009,deep,Vector3(-0.012,0.003,-0.040),Vector3(1,0.45,0.22),"LeftEye")
			sphere(root,0.009,deep,Vector3(0.012,0.003,-0.040),Vector3(1,0.45,0.22),"RightEye")
			rod(root,Vector3(-0.017,-0.015,-0.038),Vector3(0,-0.021,-0.040),0.0014,gold,"CheekTrim")
			rod(root,Vector3(0,-0.021,-0.040),Vector3(0.017,-0.015,-0.038),0.0014,gold,"CheekTrim")
		"book":
			var cover := material("#895c92",0.54)
			box(root,Vector3(0.052,0.061,0.014),cover,Vector3(0,0,0.022),Vector3(9,0,-8),"HardCover")
			box(root,Vector3(0.046,0.056,0.007),pearl,Vector3(0,0,0.015),Vector3(9,0,-8),"PageBlock")
			box(root,Vector3(0.008,0.061,0.017),gold,Vector3(-0.024,0,0.022),Vector3(9,0,-8),"Spine")
			badge(root,"#a4dce4",0.011,0,-0.009)

extends SceneTree
# Offline generator of existing 3D table interface assets. No colliders or scripts exported.

const NAMES := ["table", "opponent", "chip_mine", "chip_foe", "bag"]

func _initialize() -> void:
	var out := ProjectSettings.globalize_path("res://../art/handoff_2026-10-01/assets/table").simplify_path()
	DirAccess.make_dir_recursive_absolute(out)
	var failures := 0
	for item in NAMES:
		var root := Node3D.new()
		root.name = item
		match item:
			"table": make_table(root)
			"opponent": make_opponent(root)
			"chip_mine": make_chip(root, false)
			"chip_foe": make_chip(root, true)
			"bag": make_bag(root)
		var state := GLTFState.new()
		var doc := GLTFDocument.new()
		var err := doc.append_from_scene(root,state)
		if err == OK:
			err = doc.write_to_filesystem(state,out.path_join(item+".glb"))
		if err != OK:
			push_error("FAILED " + item + " error=" + str(err))
			failures += 1
		else:
			print("EXPORTED " + item)
		root.free()
	quit(1 if failures else 0)

func mat(hex: String, rough := 0.46, metal := 0.0, glow := 0.0, alpha := 1.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex,alpha)
	m.roughness = rough
	m.metallic = metal
	if glow > 0.0:
		m.emission_enabled = true
		m.emission = Color(hex)
		m.emission_energy_multiplier = glow
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_ALWAYS
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m

func mesh(p: Node3D, shape: Mesh, m: Material, pos := Vector3.ZERO, rot := Vector3.ZERO, scale := Vector3.ONE, name := "Shape") -> MeshInstance3D:
	var n := MeshInstance3D.new()
	n.name = name
	n.mesh = shape
	n.material_override = m
	n.position = pos
	n.rotation_degrees = rot
	n.scale = scale
	p.add_child(n)
	return n

func box(p: Node3D, s: Vector3, m: Material, at := Vector3.ZERO, rot := Vector3.ZERO, name := "Box") -> void:
	var shape := BoxMesh.new()
	shape.size = s
	mesh(p,shape,m,at,rot,Vector3.ONE,name)

func cyl(p: Node3D, rt: float, rb: float, h: float, m: Material, at := Vector3.ZERO, rot := Vector3.ZERO, name := "Cylinder") -> void:
	var shape := CylinderMesh.new()
	shape.top_radius = rt
	shape.bottom_radius = rb
	shape.height = h
	shape.radial_segments = 32
	mesh(p,shape,m,at,rot,Vector3.ONE,name)

func sphere(p: Node3D, r: float, m: Material, at := Vector3.ZERO, scl := Vector3.ONE, name := "Sphere") -> void:
	var shape := SphereMesh.new()
	shape.radius = r
	shape.height = 2.0*r
	shape.radial_segments = 32
	shape.rings = 16
	mesh(p,shape,m,at,Vector3.ZERO,scl,name)

func torus(p: Node3D, ri: float, ro: float, m: Material, at := Vector3.ZERO, rot := Vector3.ZERO, name := "Ring") -> void:
	var shape := TorusMesh.new()
	shape.inner_radius = ri
	shape.outer_radius = ro
	shape.rings = 48
	shape.ring_segments = 12
	mesh(p,shape,m,at,rot,Vector3.ONE,name)

func rod(p: Node3D, a: Vector3, b: Vector3, r: float, m: Material, name := "Line") -> void:
	var d := b-a
	var shape := CylinderMesh.new()
	shape.top_radius = r
	shape.bottom_radius = r
	shape.height = d.length()
	shape.radial_segments = 10
	var n := mesh(p,shape,m,(a+b)*0.5,Vector3.ZERO,Vector3.ONE,name)
	n.quaternion = Quaternion(Vector3.UP,d.normalized())

func round_rail(p: Node3D, a: Vector3, b: Vector3, r: float, m: Material, name: String) -> void:
	rod(p,a,b,r,m,name)
	sphere(p,r,m,a,Vector3.ONE,name+"Cap")
	sphere(p,r,m,b,Vector3.ONE,name+"Cap")

func diamond(p: Node3D, c: Vector3, wx: float, wz: float, m: Material, r := 0.0018, name := "WordCell") -> void:
	var v := [c+Vector3(-wx,0,0), c+Vector3(0,0,-wz), c+Vector3(wx,0,0), c+Vector3(0,0,wz)]
	for i in 4:
		rod(p,v[i],v[(i+1)%4],r,m,name)

func diamond_face(p: Node3D, c: Vector3, wx: float, wy: float, m: Material, r := 0.0018, name := "FaceCell") -> void:
	var v := [c+Vector3(-wx,0,0), c+Vector3(0,wy,0), c+Vector3(wx,0,0), c+Vector3(0,-wy,0)]
	for i in 4:
		rod(p,v[i],v[(i+1)%4],r,m,name)

func bevel_rail(p: Node3D, axis_x: bool, center: float, length: float) -> void:
	# Each sloped band is actual 3D surface geometry, not a painted line.
	# Outer bounds remain within the original table footprint and y <= 0.035.
	var profile := [Vector2(-0.046,0.013),Vector2(-0.042,0.023),Vector2(-0.035,0.031),Vector2(-0.018,0.034),Vector2(0.018,0.034),Vector2(0.035,0.031),Vector2(0.042,0.023),Vector2(0.046,0.013)]
	var finish := [
		mat("#310817",0.38,0.46),
		mat("#78162b",0.21,0.52,0.012),
		mat("#a32b38",0.20,0.55,0.014),
		mat("#4a0a1d",0.26,0.52),
		mat("#993425",0.21,0.48,0.012),
		mat("#641424",0.3,0.48),
		mat("#230711",0.38,0.42),
	]
	for i in profile.size()-1:
		var u0: Vector2 = profile[i]
		var u1: Vector2 = profile[i+1]
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		var a: Vector3
		var b: Vector3
		var c: Vector3
		var d: Vector3
		if axis_x:
			a = Vector3(-length*0.5,u0.y,center+u0.x)
			b = Vector3(length*0.5,u0.y,center+u0.x)
			c = Vector3(length*0.5,u1.y,center+u1.x)
			d = Vector3(-length*0.5,u1.y,center+u1.x)
		else:
			a = Vector3(center+u0.x,u0.y,-length*0.5)
			b = Vector3(center+u0.x,u0.y,length*0.5)
			c = Vector3(center+u1.x,u1.y,length*0.5)
			d = Vector3(center+u1.x,u1.y,-length*0.5)
		for vertex in [a,b,c,a,c,d]:
			st.add_vertex(vertex)
		st.generate_normals()
		mesh(p,st.commit(),finish[i],Vector3.ZERO,Vector3.ZERO,Vector3.ONE,"MetalBevelBand")

func lane_socket(p: Node3D, at: Vector3, mine: bool) -> void:
	# A visual shallow recess, not a collision platform; units still stand at y=0.
	var dark := mat("#170714",0.98,0.0)
	var lip := mat("#4b2638" if mine else "#3c1d30",0.52,0.18)
	var glint := mat("#986553" if mine else "#803747",0.34,0.26)
	var oval := CylinderMesh.new()
	oval.top_radius = 0.103
	oval.bottom_radius = 0.103
	oval.height = 0.001
	oval.radial_segments = 48
	mesh(p,oval,dark,at+Vector3(0,0.0019,0),Vector3.ZERO,Vector3(1.44,1,0.84),"InsetSlotBed")
	var t := TorusMesh.new()
	t.inner_radius = 0.102
	t.outer_radius = 0.106
	t.rings = 48
	t.ring_segments = 10
	mesh(p,t,lip,at+Vector3(0,0.0033,0),Vector3.ZERO,Vector3(1.44,0.45,0.84),"BeveledSlotLip")
	# Short asymmetric light dash implies which side owns the socket.
	var sign := 1.0 if mine else -1.0
	rod(p,at+Vector3(-0.026,0.0035,sign*0.076),at+Vector3(0.026,0.0035,sign*0.076),0.0014,glint,"OwnershipGlint")

func radial_star(p: Node3D, center: Vector3, outer: float, inner: float, count: int, m: Material, name := "Star") -> void:
	for i in count*2:
		var a := -PI*0.5 + TAU*float(i)/float(count*2)
		var b := -PI*0.5 + TAU*float(i+1)/float(count*2)
		var ra := outer if i%2 == 0 else inner
		var rb := outer if (i+1)%2 == 0 else inner
		var a3 := center + Vector3(cos(a)*ra,0,sin(a)*ra)
		var b3 := center + Vector3(cos(b)*rb,0,sin(b)*rb)
		rod(p,a3,b3,0.0016,m,name)

func make_table(root: Node3D) -> void:
	# Same envelope and y=0 play surface as table3d.gd. A black-wine field
	# lets the minions and cards be the brightest objects.
	var walnut := mat("#210c16",0.58)
	var rail_core := mat("#300817",0.34,0.5)
	var rail_round := mat("#681429",0.22,0.54)
	var cloth := mat("#ffffff",0.89)
	cloth.metallic_specular = 0.05
	var surface_path := ProjectSettings.globalize_path("res://../art/handoff_2026-10-01/source/table/table_surface_2048x1024.png").simplify_path()
	var surface_image := Image.load_from_file(surface_path)
	if surface_image != null:
		cloth.albedo_texture = ImageTexture.create_from_image(surface_image)
		var normal_path := ProjectSettings.globalize_path("res://../art/handoff_2026-10-01/assets/table/textures/table_cloth_normal_2048x1024.png").simplify_path()
		var normal_image := Image.load_from_file(normal_path)
		if normal_image != null:
			cloth.normal_enabled = true
			cloth.normal_texture = ImageTexture.create_from_image(normal_image)
			cloth.normal_scale = 0.23
	else:
		push_error("MISSING TABLE SURFACE " + surface_path)
		cloth.albedo_color = Color("#100018")
	var shadow_gold := mat("#7b4b36",0.45,0.4)
	var pale_gold := mat("#d1a564",0.25,0.55)
	var yellow := mat("#ffe53b",0.24,0.34,0.08)
	box(root,Vector3(2.70,0.095,1.80),walnut,Vector3(0,-0.055,0),Vector3.ZERO,"BlackWineSlab")
	box(root,Vector3(2.49,0.004,1.57),cloth,Vector3(0,-0.003,0),Vector3.ZERO,"NearBlackCloth")
	for sx in [-1,1]:
		box(root,Vector3(0.095,0.028,1.80),rail_core,Vector3(sx*1.303,0.003,0),Vector3.ZERO,"SideRailCore")
		bevel_rail(root,false,sx*1.303,1.712)
	for sz in [-1,1]:
		box(root,Vector3(2.70,0.028,0.095),rail_core,Vector3(0,0.003,sz*0.853),Vector3.ZERO,"EndRailCore")
		bevel_rail(root,true,sz*0.853,2.604)
		# One short bright metal plaque at the centre, echoing the card's rarity gleam.
		round_rail(root,Vector3(-0.10,0.031,sz*0.861),Vector3(0.10,0.031,sz*0.861),0.002,pale_gold,"RarityPlaque")
	for sx in [-1,1]:
		for sz in [-1,1]:
			# Rounding is within the original 2.7 x 1.8 footprint.
			sphere(root,0.041,rail_round,Vector3(sx*1.308,0.010,sz*0.858),Vector3(0.94,0.53,0.94),"SoftMetalCorner")
			sphere(root,0.018,mat("#a33835",0.2,0.47),Vector3(sx*1.315,0.023,sz*0.864),Vector3(0.85,0.48,0.85),"CornerSpecularDome")
			cyl(root,0.063,0.083,0.69,walnut,Vector3(sx*1.18,-0.47,sz*0.72),Vector3.ZERO,"ShortLeg")
			cyl(root,0.095,0.095,0.026,shadow_gold,Vector3(sx*1.18,-0.15,sz*0.72),Vector3.ZERO,"LegFerrule")
	# Three vertical lacquer layers give the side wall physical depth in oblique views.
	var apron_red := mat("#621328",0.26,0.51)
	var apron_glint := mat("#9e3a32",0.20,0.52,0.010)
	var apron_dark := mat("#160812",0.66,0.2)
	for sx in [-1,1]:
		box(root,Vector3(0.002,0.019,1.56),apron_red,Vector3(sx*1.348,-0.034,0),Vector3.ZERO,"SideLacquerApron")
		box(root,Vector3(0.002,0.003,1.40),apron_glint,Vector3(sx*1.348,-0.025,0),Vector3.ZERO,"SideApronReflection")
		box(root,Vector3(0.002,0.029,1.56),apron_dark,Vector3(sx*1.348,-0.083,0),Vector3.ZERO,"SideBlackBase")
	for sz in [-1,1]:
		box(root,Vector3(2.52,0.019,0.002),apron_red,Vector3(0,-0.034,sz*0.898),Vector3.ZERO,"EndLacquerApron")
		box(root,Vector3(2.33,0.003,0.002),apron_glint,Vector3(0,-0.025,sz*0.898),Vector3.ZERO,"EndApronReflection")
		box(root,Vector3(2.52,0.029,0.002),apron_dark,Vector3(0,-0.083,sz*0.898),Vector3.ZERO,"EndBlackBase")
	# Cloth is visually recessed below the polished inner metal bead; the actual
	# characters still sit at their old y=0 and there is no new collision mesh.
	var inner_rim := mat("#672034",0.27,0.48)
	var brass_wire := mat("#b58743",0.28,0.68)
	for sx in [-1,1]:
		rod(root,Vector3(sx*1.239,0.005,-0.766),Vector3(sx*1.239,0.005,0.766),0.0023,inner_rim,"InsetFieldBead")
		rod(root,Vector3(sx*1.225,0.0018,-0.741),Vector3(sx*1.225,0.0018,0.741),0.0019,brass_wire,"InnerBrassInlay")
	for sz in [-1,1]:
		rod(root,Vector3(-1.23,0.005,sz*0.778),Vector3(1.23,0.005,sz*0.778),0.0023,inner_rim,"InsetFieldBead")
		rod(root,Vector3(-1.205,0.0018,sz*0.757),Vector3(1.205,0.0018,sz*0.757),0.0019,brass_wire,"InnerBrassInlay")
	# Small forged curls close the four inlay corners. They sit outside both unit rows.
	for sx in [-1,1]:
		for sz in [-1,1]:
			var curl_center := Vector3(sx*1.12,0.0018,sz*0.665)
			var last := curl_center + Vector3(sx*0.050,0,0)
			for i in range(1,7):
				var t := float(i)/6.0
				var a := PI*0.15 + PI*1.36*t
				var radius := 0.047*(1.0-t)+0.005
				var next := curl_center + Vector3(sx*cos(a)*radius,0,sz*sin(a)*radius)
				rod(root,last,next,0.0016,brass_wire,"CornerCurl")
				last = next
			sphere(root,0.0034,pale_gold,last,Vector3(1,0.3,1),"CurlNail")
	# Flush inset resource strip breaks up the otherwise empty near third of the table.
	# Its top and every engraved mark remain at or below y=0; it is not a button.
	var band := mat("#150713",0.74,0.1)
	var band_edge := mat("#725035",0.42,0.45)
	box(root,Vector3(2.02,0.0005,0.15),band,Vector3(0,-0.00075,0.555),Vector3.ZERO,"FlushResourceInlay")
	for z in [0.483,0.627]:
		box(root,Vector3(1.95,0.0002,0.002),band_edge,Vector3(0,-0.0001,z),Vector3.ZERO,"ResourceEtchedEdge")
	for sx in [-1,1]:
		box(root,Vector3(0.002,0.0002,0.13),band_edge,Vector3(sx*0.987,-0.0001,0.555),Vector3.ZERO,"ResourceEndCap")
	for x in [-0.61,-0.305,0.0,0.305,0.61]:
		diamond(root,Vector3(x,-0.0015,0.555),0.019,0.023,brass_wire,0.0015,"ResourceWordEngraving")
	for x in [-0.76,-0.455,-0.15,0.15,0.455,0.76]:
		box(root,Vector3(0.025,0.0002,0.002),band_edge,Vector3(x,-0.0001,0.555),Vector3.ZERO,"ResourceGrain")
	# Two full five-unit lanes define structure without crowding the minion art.
	for side in [-1,1]:
		var mine: bool = side == 1
		for i in 5:
			lane_socket(root,Vector3((float(i)-2.0)*0.37,0,side*0.30),mine)
		# Thin title plates carry a tiny three-word stamp, no literal text.
		var plate_z: float = float(side)*0.705
		box(root,Vector3(0.26,0.002,0.057),mat("#3a0d20",0.24,0.22),Vector3(0,0.0025,plate_z),Vector3.ZERO,"InsetSidePlaque")
		rod(root,Vector3(-0.125,0.004,plate_z-side*0.027),Vector3(0.125,0.004,plate_z-side*0.027),0.0018,inner_rim,"PlaqueFillet")
		for x in [-0.038,0.0,0.038]:
			diamond(root,Vector3(x,0.0045,plate_z),0.009,0.011,pale_gold,0.0016,"PlaqueWordStamp")
	# Tiny rivets and red metal bars make the end quarters feel hand-finished.
	for sx in [-1,1]:
		for sz in [-1,1]:
			for xoff in [0.0,-0.14]:
				sphere(root,0.007,mat("#bb6968",0.22,0.38),Vector3(sx*(1.13+xoff),0.006,sz*0.724),Vector3(1,0.48,1),"LacquerRivet")
			rod(root,Vector3(sx*1.14,0.005,sz*0.69),Vector3(sx*1.06,0.005,sz*0.69),0.0017,inner_rim,"QuarterInlay")
	# Original word-slot motif, deliberately quieter than the bright card back.
	var y := 0.004
	var motif_edge := mat("#a05a4c",0.38,0.26)
	var motif_shadow := mat("#632637",0.58)
	for x in [-0.175,0.0,0.175]:
		diamond(root,Vector3(x,y,0),0.074,0.068,motif_edge,0.0024,"LinkedWordCell")
		diamond(root,Vector3(x,y+0.0007,0),0.052,0.045,motif_shadow,0.0014,"InnerWordFacet")
		sphere(root,0.004,pale_gold,Vector3(x,y+0.0012,0),Vector3(1,0.24,1),"WordNail")
	for x in [-0.0875,0.0875]:
		rod(root,Vector3(x-0.014,y,0),Vector3(x+0.014,y,0),0.002,shadow_gold,"WordLink")
	# Bracket endpoints imply editable sentences, but aren't copied from the card art.
	for sx in [-1,1]:
		var x: float = float(sx)*0.305
		rod(root,Vector3(x+sx*0.045,y,-0.065),Vector3(x,y,0),0.0025,shadow_gold,"OpenBracket")
		rod(root,Vector3(x,y,0),Vector3(x+sx*0.045,y,0.065),0.0025,shadow_gold,"OpenBracket")
		sphere(root,0.006,yellow,Vector3(sx*0.43,y+0.001,0),Vector3(1,0.28,1),"OneBrightMark")
	# Asymmetric corner stamp: three small joints and a short slash, sparse and original.
	for sx in [-1,1]:
		for sz in [-1,1]:
			var c := Vector3(sx*1.08,y,sz*0.62)
			rod(root,c,c+Vector3(-sx*0.035,0,0),0.002,shadow_gold,"CornerJoint")
			rod(root,c,c+Vector3(0,0,-sz*0.035),0.002,shadow_gold,"CornerJoint")
			sphere(root,0.004,pale_gold,c,Vector3(1,0.28,1),"CornerPin")
	# A very soft dashed separator uses low-bright red rather than the old gold star trail.
	var dim_red := mat("#6a2031",0.62)
	for i in 11:
		var x := -0.96+float(i)*0.192
		rod(root,Vector3(x-0.013,y,-0.19),Vector3(x+0.013,y,-0.19),0.0014,dim_red,"RowTick")
		rod(root,Vector3(x-0.013,y,0.19),Vector3(x+0.013,y,0.19),0.0014,dim_red,"RowTick")

func make_opponent(root: Node3D) -> void:
	# table3d.gd places this root at world z=-0.85. Body and chair live
	# behind the far rim (local z<-.05); only folded hands reach that rim.
	var lacquer := mat("#3a0b20",0.28,0.38)
	var velvet := mat("#1c0b17",0.82)
	var plum := mat("#62172e",0.40,0.12)
	var shadow := mat("#0d0b10",0.85)
	var brass := mat("#aa793f",0.26,0.60)
	var ivory := mat("#fff0ba",0.56)
	var eye := mat("#efcc52",0.29,0.12)
	# Broad chair back and cushion make a seated silhouette even from above.
	sphere(root,0.34,lacquer,Vector3(0,-0.025,-0.615),Vector3(1.02,0.88,0.18),"ChairBack")
	sphere(root,0.29,velvet,Vector3(0,-0.075,-0.584),Vector3(0.93,0.80,0.16),"ChairInset")
	sphere(root,0.29,plum,Vector3(0,-0.275,-0.445),Vector3(1.12,0.17,0.71),"ChairCushion")
	box(root,Vector3(0.57,0.046,0.37),lacquer,Vector3(0,-0.318,-0.45),Vector3.ZERO,"ChairSeatFrame")
	for sx in [-1,1]:
		rod(root,Vector3(sx*0.29,-0.25,-0.61),Vector3(sx*0.29,0.18,-0.61),0.018,brass,"ChairSideGilt")
		cyl(root,0.029,0.034,0.42,lacquer,Vector3(sx*0.235,-0.52,-0.555),Vector3.ZERO,"ChairLeg")
	# Bent legs and low waist stay below y=0, behind the table surface.
	sphere(root,0.16,velvet,Vector3(0,-0.20,-0.35),Vector3(1.35,0.88,0.86),"SeatedWaist")
	for sx in [-1,1]:
		sphere(root,0.14,plum,Vector3(sx*0.14,-0.33,-0.28),Vector3(0.86,0.90,1.22),"BentKnee")
		sphere(root,0.07,shadow,Vector3(sx*0.15,-0.50,-0.14),Vector3(1.15,0.48,1.55),"SmallShoe")
	# Wide shoulders, neck and front waistcoat read as a person, not a bottle.
	sphere(root,0.26,velvet,Vector3(0,-0.01,-0.35),Vector3(1.05,1.03,0.77),"SeatedTorso")
	sphere(root,0.20,plum,Vector3(0,0.015,-0.185),Vector3(0.64,0.78,0.22),"RubyWaistcoat")
	sphere(root,0.10,ivory,Vector3(0,0.16,-0.35),Vector3(0.70,0.75,0.68),"Neck")
	for sx in [-1,1]:
		sphere(root,0.09,plum,Vector3(sx*0.19,0.16,-0.345),Vector3(1.10,0.88,1.03),"RoundShoulder")
		var shoulder := Vector3(sx*0.235,0.145,-0.33)
		var elbow := Vector3(sx*0.29,0.075,-0.17)
		var wrist := Vector3(sx*0.255,0.047,-0.052)
		rod(root,shoulder,elbow,0.059,velvet,"BentSleeveUpper")
		rod(root,elbow,wrist,0.046,plum,"BentSleeveForearm")
		sphere(root,0.052,plum,elbow,Vector3.ONE,"SoftElbow")
		sphere(root,0.044,brass,wrist+Vector3(0,0,-0.025),Vector3(1.0,0.61,0.72),"GoldCuff")
		sphere(root,0.041,ivory,wrist+Vector3(0,-0.009,0.012),Vector3(1.12,0.60,1.05),"RestingHand")
		for finger in [-1,0,1]:
			rod(root,wrist+Vector3(sx*0.012+finger*0.011,-0.012,0.034),wrist+Vector3(sx*0.012+finger*0.011,-0.017,0.066),0.006,ivory,"RestingFinger")
	# Small face is set behind the rail in depth but above it in height.
	sphere(root,0.20,plum,Vector3(0,0.240,-0.355),Vector3(1.02,0.90,0.92),"RoundHood")
	sphere(root,0.137,shadow,Vector3(0,0.243,-0.157),Vector3(1.02,0.89,0.29),"HoodOpening")
	sphere(root,0.115,ivory,Vector3(0,0.246,-0.113),Vector3(0.96,0.88,0.30),"PorcelainFace")
	torus(root,0.145,0.152,brass,Vector3(0,0.244,-0.156),Vector3(90,0,0),"HoodGiltArc")
	for sx in [-1,1]:
		sphere(root,0.019,eye,Vector3(sx*0.046,0.269,-0.076),Vector3(0.84,0.68,0.45),"WarmEye")
		sphere(root,0.0065,shadow,Vector3(sx*0.047,0.267,-0.069),Vector3(0.78,0.77,0.38),"EyePupil")
		rod(root,Vector3(sx*0.024,0.156,-0.078),Vector3(sx*0.008,0.149,-0.082),0.0018,shadow,"QuietSmile")
		rod(root,Vector3(sx*0.076,0.154,-0.173),Vector3(0,0.034,-0.137),0.003,brass,"WaistcoatLapels")
	rod(root,Vector3(-0.09,0.387,-0.255),Vector3(0.09,0.387,-0.255),0.006,brass,"HoodCrownBand")
	sphere(root,0.018,brass,Vector3(0,0.18,-0.168),Vector3(1.0,0.77,0.42),"CollarClasp")

func make_chip(root: Node3D, foe: bool) -> void:
	# 0.10 diameter, 0.014 total height: exactly matches the existing AP stack pitch.
	var rim := mat("#802238" if not foe else "#512231",0.22,0.7)
	var face := mat("#120b13" if not foe else "#3f1024",0.48,0.12)
	var bright := mat("#ffe53b" if not foe else "#e8ac6c",0.25,0.52,0.06)
	cyl(root,0.05,0.05,0.012,rim,Vector3.ZERO,Vector3.ZERO,"CoinEdge")
	cyl(root,0.043,0.043,0.002,face,Vector3(0,0.006,0),Vector3.ZERO,"CoinFace")
	torus(root,0.038,0.042,bright,Vector3(0,0.0062,0),Vector3.ZERO,"GiltFaceRing")
	if foe:
		for sx in [-1,1]:
			var x: float = float(sx)*0.018
			rod(root,Vector3(x+sx*0.010,0.0063,-0.012),Vector3(x,0.0063,0),0.0017,bright,"CounterBracket")
			rod(root,Vector3(x,0.0063,0),Vector3(x+sx*0.010,0.0063,0.012),0.0017,bright,"CounterBracket")
		diamond(root,Vector3(0,0.0063,0),0.007,0.008,bright,0.0017,"ReplyGem")
	else:
		for x in [-0.019,0.0,0.019]:
			diamond(root,Vector3(x,0.0071,0),0.008,0.011,bright,0.0017,"ThreeWordCells")

func lathe(parent: Node3D, profile: Array, material: Material, name: String) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var sides := 64
	for j in profile.size()-1:
		var dr: float = profile[j+1].x-profile[j].x
		var dy: float = profile[j+1].y-profile[j].y
		for i in sides:
			var a := TAU*float(i)/sides
			var b := TAU*float(i+1)/sides
			var r0: float = profile[j].x
			var y0: float = profile[j].y
			var r1: float = profile[j+1].x
			var y1: float = profile[j+1].y
			var fold_a := 1.0 + 0.028*sin(8*a+0.4*j)
			var fold_b := 1.0 + 0.028*sin(8*b+0.4*j)
			var p00 := Vector3(cos(a)*r0*fold_a,y0,sin(a)*r0*fold_a)
			var p01 := Vector3(cos(b)*r0*fold_b,y0,sin(b)*r0*fold_b)
			var p10 := Vector3(cos(a)*r1*fold_a,y1,sin(a)*r1*fold_a)
			var p11 := Vector3(cos(b)*r1*fold_b,y1,sin(b)*r1*fold_b)
			for p in [p00,p10,p11,p00,p11,p01]:
				var radial := Vector3(p.x,0,p.z).normalized()
				st.set_normal(Vector3(radial.x*dy,-dr,radial.z*dy).normalized())
				st.add_vertex(p)
	mesh(parent,st.commit(),material,Vector3.ZERO,Vector3.ZERO,Vector3.ONE,name)

func make_bag(root: Node3D) -> void:
	# Radius about 0.36, mouth at y=0.65. Hollow transparent fabric lets words be seen.
	var cloth := mat("#4c1029",0.8,0.0,0.0,0.47)
	var seam := mat("#863149",0.55,0.13,0.0,0.78)
	var cord := mat("#8c3546",0.44,0.35)
	var gold := mat("#b67b4e",0.31,0.5)
	var yellow := mat("#ffe53b",0.28,0.23,0.08)
	var gem := mat("#1a0b17",0.3,0.08)
	lathe(root,[Vector2(0.17,0.035),Vector2(0.235,0.045),Vector2(0.29,0.082),Vector2(0.33,0.15),Vector2(0.36,0.24),Vector2(0.36,0.32),Vector2(0.345,0.39),Vector2(0.305,0.46),Vector2(0.25,0.53),Vector2(0.205,0.58),Vector2(0.182,0.61),Vector2(0.19,0.635),Vector2(0.205,0.65)],cloth,"TranslucentCloth")
	# No top cap: the opening remains open to show the physical word tiles inside.
	torus(root,0.18,0.205,cord,Vector3(0,0.615,0),Vector3.ZERO,"Drawstring")
	torus(root,0.197,0.219,gold,Vector3(0,0.652,0),Vector3.ZERO,"MetalOpenMouth")
	torus(root,0.213,0.217,yellow,Vector3(0,0.653,0),Vector3.ZERO,"NarrowYellowGlint")
	for i in 12:
		var a := TAU*float(i)/12.0
		var x := cos(a)
		var z := sin(a)
		rod(root,Vector3(x*0.218,0.607,z*0.218),Vector3(x*0.188,0.648,z*0.188),0.002,seam,"GatherStitch")
	# Gold cord tails at the front, local +Z faces the camera used in bag3d.gd.
	rod(root,Vector3(-0.105,0.617,0.19),Vector3(-0.15,0.45,0.26),0.004,cord,"DrawstringTail")
	rod(root,Vector3(-0.078,0.617,0.202),Vector3(-0.032,0.47,0.32),0.004,cord,"DrawstringTail")
	sphere(root,0.011,yellow,Vector3(-0.15,0.45,0.26),Vector3.ONE,"Tassel")
	sphere(root,0.011,yellow,Vector3(-0.032,0.47,0.32),Vector3.ONE,"Tassel")
	# Collector's seal on the bag front.
	sphere(root,0.066,gold,Vector3(0,0.305,0.34),Vector3(1,1,0.25),"SealBezel")
	sphere(root,0.047,gem,Vector3(0,0.305,0.358),Vector3(1,1,0.23),"SealEnamel")
	for x in [-0.023,0.0,0.023]:
		diamond_face(root,Vector3(x,0.305,0.373),0.008,0.008,yellow,0.0019,"WordSeal")

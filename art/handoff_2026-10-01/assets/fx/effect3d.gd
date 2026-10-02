extends Node3D
## Shared 3D visual for battle FX and six editor cast categories.
## Every visible piece is real 3D mesh geometry; no collision shapes or screen quads.

@export var effect_kind: String = "cast"

const COLORS := {
	"cast": Color("#c0a8ff"),
	"hit": Color("#ff9caa"),
	"big_hit": Color("#ffcc80"),
	"heal": Color("#a6efcf"),
	"block": Color("#9fc7ff"),
	"shield": Color("#8dc6ff"),
	"trigger": Color("#d7b4ff"),
	"chain": Color("#e4bdff"),
	"interrupt": Color("#a8e8ff"),
	"kill": Color("#ffe4a2"),
	"cast_atk": Color("#ff9bb7"),
	"cast_heal": Color("#b4f2d5"),
	"cast_def": Color("#9ccaff"),
	"cast_trap": Color("#edc884"),
	"cast_ctl": Color("#c9a6f4"),
	"cast_buff": Color("#f6dc94"),
}

@onready var core: MeshInstance3D = $Core
@onready var ring: MeshInstance3D = $Ring
@onready var inner_ring: MeshInstance3D = $InnerRing
@onready var beam: MeshInstance3D = $Beam

func _ready() -> void:
	for part in [core, ring, inner_ring, beam]:
		part.visible = false

func play(ctx: Dictionary = {}) -> void:
	var color: Color = COLORS.get(effect_kind, Color("#ddc0ff"))
	if effect_kind == "kill" and str(ctx.get("who", "mine")) == "foe":
		color = Color("#ff9ca6")
	if ctx.has("color"):
		var requested = ctx["color"]
		if requested is Color:
			color = requested
		elif requested is String:
			color = Color(requested)
	var tier: int = clampi(int(ctx.get("tier", 0)), 0, 3)
	var size_factor: float = 1.0 + float(tier) * 0.16
	if effect_kind == "big_hit":
		size_factor += minf(float(ctx.get("amount", 10)) / 50.0, 0.4)
	if effect_kind == "chain":
		size_factor += minf(float(ctx.get("n", 2)) * 0.06, 0.45)
	if effect_kind in ["cast", "big_hit", "chain", "kill"]:
		match effect_kind:
			"cast":
				_hero_cast(color, size_factor)
			"big_hit":
				_hero_big_hit(color, size_factor)
			"chain":
				_hero_chain(color, size_factor, clampi(int(ctx.get("n", 3)), 2, 4))
			"kill":
				_hero_kill(color, size_factor)
		return
	var duration := 0.50
	match effect_kind:
		"hit", "block", "interrupt", "cast_atk":
			duration = 0.42
		"big_hit", "kill":
			duration = 0.78
		"shield", "heal", "cast_heal", "cast_def":
			duration = 0.62
		"chain", "cast_buff":
			duration = 0.70
	_start_ring(ring, color, 0.34 * size_factor, duration, 0.0)
	if effect_kind in ["big_hit", "kill", "chain", "shield", "cast_def", "cast_buff"]:
		_start_ring(inner_ring, color.lightened(0.38), 0.46 * size_factor, duration + 0.09, 0.07)
	if effect_kind in ["shield", "cast_def"]:
		_start_core(color, Vector3(2.4, 2.7, 2.4) * size_factor, duration, 0.12)
	elif effect_kind in ["heal", "cast_heal"]:
		_start_core(color, Vector3(0.9, 2.6, 0.9) * size_factor, duration, 0.23)
	elif effect_kind in ["kill", "cast_buff"]:
		_start_beam(color, duration, size_factor)
	else:
		_start_core(color, Vector3.ONE * (1.1 if effect_kind == "big_hit" else 0.75) * size_factor, duration * 0.7, 0.04)
	var count := 5
	if effect_kind in ["big_hit", "kill", "chain"]:
		count = 12
	elif effect_kind in ["hit", "block"]:
		count = 4
	_spawn_crystals(color, count, 0.13 * size_factor, duration)
	_spawn_sparks(color, 8 if count < 10 else 15, duration, size_factor)
	_signature(color, duration, size_factor)
	_light(color, duration)

func _material(color: Color, alpha: float = 0.8, energy: float = 1.8) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.albedo_color = Color(color.r, color.g, color.b, alpha)
	m.metallic = 0.12
	m.roughness = 0.34
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy * 0.35
	return m

func _start_ring(part: MeshInstance3D, color: Color, diameter: float, dur: float, delay: float) -> void:
	part.visible = true
	part.material_override = _material(color, 0.85, 1.9)
	part.scale = Vector3(0.05, 0.22, 0.05)
	part.transparency = 0.0
	part.position.y = -0.08
	var tw := create_tween().set_parallel(true)
	tw.tween_property(part, "scale", Vector3(diameter, 0.28, diameter), dur).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(part, "position:y", 0.05, dur).set_delay(delay)
	tw.tween_property(part, "rotation:y", 0.55, dur).set_delay(delay)
	tw.tween_property(part, "transparency", 1.0, dur * 0.45).set_delay(delay + dur * 0.55)

func _start_core(color: Color, dest: Vector3, dur: float, rise: float) -> void:
	core.visible = true
	core.material_override = _material(color.lightened(0.22), 0.43, 2.3)
	core.scale = Vector3.ONE * 0.08
	core.position = Vector3.ZERO
	core.transparency = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(core, "scale", dest, dur * 0.55).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(core, "position:y", rise, dur)
	tw.tween_property(core, "transparency", 1.0, dur * 0.45).set_delay(dur * 0.55)

func _start_beam(color: Color, dur: float, size_factor: float) -> void:
	beam.visible = true
	beam.material_override = _material(color, 0.35, 2.4)
	beam.scale = Vector3(0.12, 0.02, 0.12)
	beam.position = Vector3(0, 0.02, 0)
	beam.transparency = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(beam, "scale", Vector3(0.42, 1.25, 0.42) * size_factor, dur * 0.52).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(beam, "position:y", 0.12, dur * 0.52)
	tw.tween_property(beam, "transparency", 1.0, dur * 0.48).set_delay(dur * 0.52)

func _spawn_crystals(color: Color, count: int, spread: float, dur: float) -> void:
	for i in count:
		var angle := TAU * float(i) / float(count) + float(i % 3) * 0.14
		var dir := Vector3(cos(angle), 0.16 + float(i % 3) * 0.22, sin(angle)).normalized()
		var shard := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.0
		mesh.bottom_radius = 0.008 if count < 10 else 0.011
		mesh.height = 0.055 if count < 10 else 0.075
		mesh.radial_segments = 5
		shard.mesh = mesh
		shard.material_override = _material(color.lightened(float(i % 3) * 0.16), 0.9, 1.6)
		shard.quaternion = Quaternion(Vector3.UP, dir)
		shard.position = dir * 0.025
		add_child(shard)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(shard, "position", dir * spread * (1.3 + float(i % 2) * 0.35), dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(shard, "scale", Vector3.ONE * 0.16, dur).set_delay(dur * 0.45)
		tw.tween_property(shard, "transparency", 1.0, dur * 0.45).set_delay(dur * 0.55)

func _spawn_sparks(color: Color, count: int, dur: float, size_factor: float) -> void:
	for i in count:
		var a := float(i) * 2.399963
		var radius := 0.02 + 0.008 * float(i % 4)
		var start := Vector3(cos(a) * radius, -0.02, sin(a) * radius)
		var orb := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = 0.004 + 0.001 * float(i % 3)
		mesh.height = mesh.radius * 2.0
		mesh.radial_segments = 8
		mesh.rings = 4
		orb.mesh = mesh
		orb.material_override = _material(color.lightened(0.25 + 0.12 * float(i % 2)), 0.95, 2.2)
		orb.position = start
		add_child(orb)
		var end := Vector3(cos(a) * (0.10 + 0.02 * float(i % 3)) * size_factor,
			0.09 + 0.035 * float(i % 4), sin(a) * (0.10 + 0.02 * float(i % 3)) * size_factor)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(orb, "position", end, dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(orb, "transparency", 1.0, dur * 0.42).set_delay(dur * 0.58)

func _signature(color: Color, dur: float, size_factor: float) -> void:
	if effect_kind in ["hit", "big_hit", "cast_atk", "interrupt"]:
		var slash_color := Color("#bfefff") if effect_kind == "interrupt" else color.lightened(0.28)
		var slash_count := 3 if effect_kind == "big_hit" else 2
		for i in slash_count:
			var blade := MeshInstance3D.new()
			var mesh := BoxMesh.new()
			mesh.size = Vector3(0.011, 0.16 * size_factor, 0.012)
			blade.mesh = mesh
			blade.material_override = _material(slash_color, 0.85, 2.4)
			blade.rotation.z = -0.75 + float(i) * 0.78
			blade.rotation.y = float(i) * 0.7
			blade.position = Vector3((float(i)-1.0)*0.025, 0.03, 0.01)
			add_child(blade)
			var tw := create_tween().set_parallel(true)
			tw.tween_property(blade, "scale", Vector3(1.2, 1.2, 1.2), dur * 0.3).set_trans(Tween.TRANS_BACK)
			tw.tween_property(blade, "transparency", 1.0, dur * 0.55).set_delay(dur * 0.45)
	elif effect_kind in ["heal", "cast_heal"]:
		for i in 3:
			var bead := MeshInstance3D.new()
			var mesh := SphereMesh.new()
			mesh.radius = 0.012
			mesh.height = 0.024
			bead.mesh = mesh
			bead.material_override = _material(color.lightened(0.4), 0.85, 1.6)
			bead.position = Vector3((float(i)-1.0)*0.05, -0.05, 0.0)
			add_child(bead)
			var tw := create_tween().set_parallel(true)
			tw.tween_property(bead, "position:y", 0.22 + float(i)*0.03, dur).set_trans(Tween.TRANS_QUAD)
			tw.tween_property(bead, "transparency", 1.0, dur*0.35).set_delay(dur*0.65)
	elif effect_kind in ["kill", "cast_buff", "chain"]:
		for i in 8:
			var ray := MeshInstance3D.new()
			var mesh := BoxMesh.new()
			mesh.size = Vector3(0.008, 0.11, 0.008)
			ray.mesh = mesh
			ray.material_override = _material(color.lightened(0.32), 0.88, 2.4)
			var a := TAU * float(i) / 8.0
			var dir := Vector3(cos(a), 0.33, sin(a)).normalized()
			ray.quaternion = Quaternion(Vector3.UP, dir)
			ray.position = dir * 0.025
			add_child(ray)
			var tw := create_tween().set_parallel(true)
			tw.tween_property(ray, "position", dir * 0.20 * size_factor, dur*0.75).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			tw.tween_property(ray, "transparency", 1.0, dur*0.4).set_delay(dur*0.6)
	elif effect_kind == "cast_trap":
		for i in 4:
			var bar := MeshInstance3D.new()
			var mesh := BoxMesh.new()
			mesh.size = Vector3(0.008, 0.13, 0.008)
			bar.mesh = mesh
			bar.material_override = _material(color, 0.75, 1.5)
			var a := TAU * float(i) / 4.0
			bar.position = Vector3(cos(a)*0.11, 0.05, sin(a)*0.11)
			add_child(bar)
			var tw := create_tween().set_parallel(true)
			tw.tween_property(bar, "position:y", -0.04, dur).set_trans(Tween.TRANS_BOUNCE)
			tw.tween_property(bar, "transparency", 1.0, dur*0.35).set_delay(dur*0.65)

func _light(color: Color, dur: float) -> void:
	var lamp := OmniLight3D.new()
	lamp.light_color = color
	lamp.light_energy = 3.0 if effect_kind in ["big_hit", "kill"] else 1.7
	lamp.omni_range = 0.7
	lamp.shadow_enabled = false
	lamp.position = Vector3(0, 0.10, 0)
	add_child(lamp)
	var tw := create_tween()
	tw.tween_property(lamp, "light_energy", 0.0, dur).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)

func _hero_cast(color: Color, magnitude: float) -> void:
	# A quiet gathering of runes and dust, followed by one compact release.
	_hero_ring(color, 0.24 * magnitude, 0.0, 0.65, Vector3(0.42, 0.0, 0.21))
	_hero_ring(color.lightened(0.35), 0.18 * magnitude, 0.09, 0.56, Vector3(-0.34, 0.0, -0.20))
	_runic_circle(color.lightened(0.4), 12, 0.12 * magnitude, 0.05, 0.58)
	_diamond(color, 0.16, 0.52, 0.10 * magnitude)
	_dust(color.lightened(0.4), 16, 0.18 * magnitude, 0.02, 0.0, 0.40)
	_radial_spokes(Color("#ddbbf0"), 8, 0.18 * magnitude, 0.37, 0.30)
	_pulse_light(color, 0.27, 0.5, 2.2)

func _hero_big_hit(color: Color, magnitude: float) -> void:
	# A hard point of impact, then a crystal shockwave and brief gold shell.
	_diamond(Color("#f8ce81"), 0.0, 0.35, 0.08 * magnitude)
	_hero_ring(color, 0.34 * magnitude, 0.15, 0.53)
	_hero_ring(Color("#f7d690"), 0.45 * magnitude, 0.23, 0.48)
	_shell(color, 0.15, 0.53, 0.17 * magnitude)
	_runic_circle(color.lightened(0.3), 12, 0.17 * magnitude, 0.17, 0.48)
	_radial_spokes(Color("#f2bd5f"), 14, 0.24 * magnitude, 0.17, 0.45)
	_dust(color.lightened(0.35), 23, 0.03, 0.25 * magnitude, 0.15, 0.48)
	_pulse_light(color, 0.16, 0.50, 5.0)

func _hero_chain(color: Color, magnitude: float, links: int) -> void:
	# Separate links ignite one by one; the final shared ring is the pay-off.
	for i in links:
		var phase := float(i) * 0.13
		var link := _new_torus(color.lightened(float(i % 2) * 0.23), 0.88)
		link.position = Vector3((float(i) - float(links-1)*0.5) * 0.085 * magnitude,
			-0.015 + float(i % 2) * 0.035, 0.0)
		link.rotation.z = -0.55 + float(i) * 0.34
		link.scale = Vector3.ONE * 0.015
		var tw := create_tween().set_parallel(true)
		tw.tween_property(link, "scale", Vector3(0.14, 0.14, 0.14) * magnitude, 0.30).set_delay(phase).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(link, "rotation:y", 0.95, 0.55).set_delay(phase)
		tw.tween_property(link, "transparency", 1.0, 0.29).set_delay(phase + 0.37)
		_diamond(color.lightened(float(i) * 0.08), phase, 0.39, 0.042 * magnitude,
			link.position)
	_runic_circle(color.lightened(0.35), 16, 0.22 * magnitude, 0.34, 0.42)
	_hero_ring(Color("#dfbff2"), 0.37 * magnitude, 0.39, 0.40)
	_dust(color, 19, 0.03, 0.20 * magnitude, 0.32, 0.43)
	_pulse_light(color, 0.32, 0.5, 3.1)

func _hero_kill(color: Color, magnitude: float) -> void:
	# Rare climax: a restrained four-pillar ascent, expanding shell, crown,
	# and a short fan of warm gold spokes.  The game's big_text stays separate.
	_diamond(Color("#f9d786"), 0.0, 0.70, 0.10 * magnitude)
	_hero_ring(color, 0.24 * magnitude, 0.0, 0.78)
	_hero_ring(Color("#f7d991"), 0.48 * magnitude, 0.24, 0.62)
	_runic_circle(color, 16, 0.19 * magnitude, 0.18, 0.64)
	_shell(color, 0.22, 0.58, 0.19 * magnitude)
	_golden_pillars(color, magnitude)
	_radial_spokes(Color("#efba58"), 18, 0.29 * magnitude, 0.24, 0.50)
	_dust(color.lightened(0.3), 26, 0.04, 0.30 * magnitude, 0.22, 0.62)
	_pulse_light(color, 0.23, 0.65, 5.8)

func _new_torus(color: Color, alpha: float = 0.8) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := TorusMesh.new()
	mesh.inner_radius = 0.465
	mesh.outer_radius = 0.5
	mesh.rings = 40
	mesh.ring_segments = 8
	node.mesh = mesh
	node.material_override = _material(color, alpha, 2.1)
	add_child(node)
	return node

func _hero_ring(color: Color, diameter: float, delay: float, dur: float, tilt: Vector3 = Vector3.ZERO) -> void:
	var node := _new_torus(color, 0.90)
	node.scale = Vector3(0.018, 0.018, 0.018)
	node.rotation = tilt
	var tw := create_tween().set_parallel(true)
	tw.tween_property(node, "scale", Vector3(diameter, diameter * 0.43, diameter), dur).set_delay(delay).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(node, "rotation:y", tilt.y + 0.8, dur).set_delay(delay)
	tw.tween_property(node, "transparency", 1.0, dur * 0.45).set_delay(delay + dur * 0.55)

func _runic_circle(color: Color, count: int, radius: float, delay: float, dur: float) -> void:
	var pivot := Node3D.new()
	add_child(pivot)
	pivot.scale = Vector3.ONE * 0.05
	for i in count:
		var a := TAU * float(i) / float(count)
		var mark := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(0.005, 0.014 if i % 3 != 0 else 0.028, 0.018)
		mark.mesh = mesh
		mark.material_override = _material(color, 0.95, 2.1)
		mark.position = Vector3(cos(a)*radius, 0.0, sin(a)*radius)
		mark.rotation.y = a
		pivot.add_child(mark)
		var fade := create_tween()
		fade.tween_property(mark, "transparency", 1.0, dur * 0.35).set_delay(delay + dur * 0.65)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(pivot, "scale", Vector3.ONE, dur*0.46).set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(pivot, "rotation:y", 0.75, dur).set_delay(delay)

func _diamond(color: Color, delay: float, dur: float, size: float, at: Vector3 = Vector3.ZERO) -> void:
	var pivot := Node3D.new()
	pivot.position = at
	pivot.scale = Vector3.ONE * 0.02
	add_child(pivot)
	for half in 2:
		var point := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.0
		mesh.bottom_radius = size * 0.38
		mesh.height = size * 0.78
		mesh.radial_segments = 4
		point.mesh = mesh
		point.material_override = _material(color.lightened(float(half)*0.18), 0.92, 2.7)
		point.position.y = size * (0.39 if half == 0 else -0.39)
		if half == 1:
			point.rotation.x = PI
		pivot.add_child(point)
		var fade := create_tween()
		fade.tween_property(point, "transparency", 1.0, dur*0.32).set_delay(delay + dur*0.68)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(pivot, "scale", Vector3.ONE, dur*0.42).set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(pivot, "position:y", at.y + 0.045, dur).set_delay(delay)
	tw.tween_property(pivot, "rotation:y", 1.8, dur).set_delay(delay)

func _shell(color: Color, delay: float, dur: float, radius: float) -> void:
	# Three crossing great circles read as a transparent spherical shell without
	# obscuring the target with a large opaque dome in Compatibility rendering.
	for i in 3:
		var node := _new_torus(color.lightened(0.08 * float(i)), 0.75)
		node.rotation = Vector3(PI * 0.5, float(i) * PI / 3.0, 0)
		node.scale = Vector3.ONE * 0.01
		var tw := create_tween().set_parallel(true)
		tw.tween_property(node, "scale", Vector3.ONE * radius * 2.0, dur).set_delay(delay + float(i)*0.035).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.tween_property(node, "rotation:y", float(i)*PI/3.0 + 0.48, dur).set_delay(delay)
		tw.tween_property(node, "transparency", 1.0, dur*0.50).set_delay(delay + dur*0.50)

func _radial_spokes(color: Color, count: int, spread: float, delay: float, dur: float) -> void:
	for i in count:
		var a := TAU*float(i)/float(count)
		var dir := Vector3(cos(a), 0.13 + float(i % 3)*0.11, sin(a)).normalized()
		var ray := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(0.006, 0.095 + float(i%2)*0.045, 0.006)
		ray.mesh = mesh
		ray.material_override = _material(color, 0.93, 2.7)
		ray.quaternion = Quaternion(Vector3.UP, dir)
		ray.position = dir * 0.015
		ray.scale = Vector3.ONE * 0.01
		add_child(ray)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(ray, "scale", Vector3.ONE, dur*0.4).set_delay(delay).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tw.tween_property(ray, "position", dir*spread, dur).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(ray, "transparency", 1.0, dur*0.42).set_delay(delay + dur*0.58)

func _dust(color: Color, count: int, start_radius: float, end_radius: float, delay: float, dur: float) -> void:
	for i in count:
		var angle := float(i)*2.399963
		var sr := start_radius * (0.65 + 0.10*float(i%4))
		var er := end_radius * (0.75 + 0.08*float(i%5))
		var orb := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = 0.0028 + float(i%3)*0.001
		mesh.height = mesh.radius*2.0
		mesh.radial_segments = 8
		mesh.rings = 4
		orb.mesh = mesh
		orb.material_override = _material(color.lightened(0.23), 0.92, 2.6)
		orb.position = Vector3(cos(angle)*sr, -0.05 + float(i%4)*0.025, sin(angle)*sr)
		add_child(orb)
		var dest := Vector3(cos(angle)*er, 0.04 + float(i%5)*0.04, sin(angle)*er)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(orb, "position", dest, dur).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(orb, "transparency", 1.0, dur*0.30).set_delay(delay + dur*0.70)

func _golden_pillars(color: Color, magnitude: float) -> void:
	for i in 4:
		var a := TAU*float(i)/4.0 + PI/4.0
		var bar := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.003
		mesh.bottom_radius = 0.011
		mesh.height = 0.32 * magnitude
		mesh.radial_segments = 6
		bar.mesh = mesh
		bar.material_override = _material(color.lightened(0.3), 0.55, 2.1)
		bar.position = Vector3(cos(a)*0.045, -0.15, sin(a)*0.045)
		bar.scale = Vector3(0.3, 0.02, 0.3)
		add_child(bar)
		var tw := create_tween().set_parallel(true)
		tw.tween_property(bar, "scale", Vector3.ONE, 0.32).set_delay(0.19).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.tween_property(bar, "position:y", 0.13, 0.45).set_delay(0.19)
		tw.tween_property(bar, "transparency", 1.0, 0.29).set_delay(0.50)

func _pulse_light(color: Color, delay: float, dur: float, peak: float) -> void:
	var lamp := OmniLight3D.new()
	lamp.light_color = color
	lamp.light_energy = 0.0
	lamp.omni_range = 0.75
	lamp.shadow_enabled = false
	lamp.position = Vector3(0,0.12,0)
	add_child(lamp)
	var tw := create_tween()
	tw.tween_interval(delay)
	tw.tween_property(lamp, "light_energy", peak, dur*0.20).set_trans(Tween.TRANS_QUAD)
	tw.tween_property(lamp, "light_energy", 0.0, dur*0.80).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)

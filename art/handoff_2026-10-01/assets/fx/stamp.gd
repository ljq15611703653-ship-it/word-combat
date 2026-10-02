extends Control
## Short 2D mint-gold steel-stamp accent over a newly attached card piece.
## The caller positions this Control at ctx.center; this effect frees itself.

var age := 0.0
var duration := 0.43

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 60
	set_process(false)

func play(_ctx: Dictionary = {}) -> void:
	age = 0.0
	set_process(true)
	queue_redraw()

func _process(delta: float) -> void:
	age += delta
	queue_redraw()
	if age >= duration:
		queue_free()

func _draw() -> void:
	var t := clampf(age / duration, 0.0, 1.0)
	var fade := pow(1.0 - t, 1.5)
	var radius := lerpf(12.0, 82.0, t)
	draw_arc(Vector2.ZERO, radius, 0.0, TAU, 48, Color(1.0, 0.84, 0.49, fade * 0.85), 3.0, true)
	draw_arc(Vector2.ZERO, radius * 0.70, 0.0, TAU, 48, Color(0.72, 0.61, 0.95, fade * 0.65), 2.0, true)
	draw_circle(Vector2.ZERO, lerpf(20.0, 2.0, t), Color(1.0, 0.95, 0.77, fade * 0.66))
	for i in 8:
		var a := TAU * float(i) / 8.0 + 0.22
		var near := Vector2(cos(a), sin(a)) * lerpf(8.0, 62.0, t)
		var far := near + Vector2(cos(a), sin(a)) * (14.0 + float(i % 3) * 4.0)
		draw_line(near, far, Color(1.0, 0.90, 0.65, fade), 3.0, true)

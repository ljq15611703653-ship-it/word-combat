extends SceneTree
const Duel = preload("res://scripts/game/duel.gd")
const E = preload("res://scripts/core/engine.gd")
func _init() -> void:
	await process_frame
	Duel.FIRST_AP = 50
	var d := Duel.new()
	d.start(false, 5, false)
	while d.phase != "declare":
		d.step_auto()
	print("first0=", d.first0, " first_side=", E.first_side(d.st), " ap=", d.st.sides[0].ap, ",", d.st.sides[1].ap, " order=", d.declare_order)
	quit()

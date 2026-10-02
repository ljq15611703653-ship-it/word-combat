extends SceneTree
const NcSetup = preload("res://scripts/numcard/ui/nc_setup.gd")
const NcBattle = preload("res://scripts/numcard/ui/nc_battle.gd")
const Composer = preload("res://scripts/numcard/ui/nc_composer.gd")
func shot(name: String) -> void:
	await create_timer(0.6).timeout
	root.get_viewport().get_texture().get_image().save_png(OS.get_cmdline_user_args()[0] + "_" + name + ".png")
func _init() -> void:
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await create_timer(0.5).timeout
	main._show_numcard()
	await shot("setup")
	main.screen._go()
	await create_timer(0.3).timeout
	var b = main.screen
	b.fast = true
	b._step()
	for i in 50:
		await create_timer(0.1).timeout
		if b.ui == "pick_unit":
			break
	await shot("battle")
	var uid: int = int(b.M.remaining[0][0])
	b._open_composer(uid)
	await create_timer(0.3).timeout
	var pop = null
	for c in b.get_children():
		if c is Composer:
			pop = c
	pop.add_word("选择")
	pop.add_number(1)
	pop.add_word("敌方")
	pop.add_word("随从")
	pop.add_word("造成")
	pop.add_number(1)
	pop.add_word("伤害")
	await shot("compose")
	pop._ok()
	await create_timer(0.3).timeout
	await shot("target")
	quit(0)

extends SceneTree
# 截图：走到战斗界面，打开“拼这一句”，把画面存下来
const Battle = preload("res://scripts/ui/battle_screen.gd")
const Draft = preload("res://scripts/ui/draft_screen.gd")
const Setup = preload("res://scripts/ui/duel_setup.gd")
func _init() -> void:
	var out := OS.get_cmdline_user_args()[0]
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await create_timer(0.5).timeout
	const Settings = preload("res://scripts/ui/settings.gd")
	Settings.coach = true
	Settings.coach_detail = true
	main._new_duel(3, true)
	var last := ""
	var n := 0
	for i in 80:
		await create_timer(0.3).timeout
		var s = main.screen
		var tg: String = str(s.get_script().resource_path.get_file()) + main.m.phase
		if tg != last:
			last = tg
			await create_timer(0.8).timeout
			root.get_viewport().get_texture().get_image().save_png(out + "_s%d.png" % n)
			n += 1
		if s is Draft:
			if s.can_pick:
				s._try_pick(int(main.m.remaining_bags()[0]))
			elif not s.continue_btn.disabled:
				s.finished.emit()
		elif s is Setup:
			s.ok_btn.pressed.emit()
		elif s is Battle and s.my_turn:
			root.get_viewport().get_texture().get_image().save_png(out + "_battle.png")
			main.m.pools[0]["易伤"] = 2
			main.m.pools[0]["蓄力"] = 1
			main.m.used_log[0][int(main.m.st.round) - 1] = {"易伤": 1, "蓄力": 1}
			s._open_compose(int(main.m.st.sides[0].units[0].uid))
			await create_timer(1.0).timeout
			for c in s.get_children():
				if c.has_method("setup") and c.get("composer") != null:
					c.composer.rack_scroll.scroll_vertical = 900
			for c in s.get_children():
				if c.get("intent_edit") != null:
					c.composer.setup(c._avail, [{"t":"W","v":"选择"},{"t":"W","v":"一个"},{"t":"W","v":"一个"},{"t":"W","v":"敌方"},{"t":"W","v":"随从"},{"t":"W","v":"造成"},{"t":"N","v":8},{"t":"W","v":"伤害"}])
					c.composer.rack_scroll.scroll_vertical = 0
			await create_timer(0.4).timeout
			root.get_viewport().get_texture().get_image().save_png(out + "_compose.png")
			print("saved", root.size)
			quit(0)
			return
	quit(1)

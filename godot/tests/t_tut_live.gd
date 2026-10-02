extends SceneTree
# 新手教程通关：按每一步的“等待事件”，用真实处理函数做对应动作，检查每个高亮目标都找得到
const Tut = preload("res://scripts/tutorial/tutorial.gd")
const Draft = preload("res://scripts/ui/draft_screen.gd")
const Battle = preload("res://scripts/ui/battle_screen.gd")
const Compose = preload("res://scripts/ui/duel_compose.gd")
const E = preload("res://scripts/core/engine.gd")
func _init() -> void:
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await create_timer(0.5).timeout
	main._start_live_tutorial()
	var last := ""
	var bad := 0
	for i in 700:
		await create_timer(0.2).timeout
		var t = Tut.active
		if t == null or not is_instance_valid(t):
			if main.screen != null and main.screen.get_script().resource_path.ends_with("title_screen.gd"):
				print("教程走完，回到标题。目标缺失 %d 处" % bad)
				quit(0 if bad == 0 else 1)
				return
			continue
		var s: Dictionary = t.cur()
		if s.is_empty():
			continue
		var id := str(s.id)
		var w = s.get("wait", "next")
		var scr = main.screen
		if id != last:
			last = id
			var tg := str(s.get("target", ""))
			if tg != "" and not bool(s.get("hide", false)):
				await create_timer(0.3).timeout
				var r: Rect2 = t.target_rect(tg)
				if r.size.x <= 2:
					bad += 1
					print("  !! 步骤 %s：找不到目标 %s（屏幕 %s）" % [id, tg, scr.get_script().resource_path.get_file()])
			print("  步骤 ", id)
		if w is String:
			if w == "next":
				if t.next_b != null:
					t.next_b.pressed.emit()
			elif w == "draft_picked" and scr is Draft and scr.can_pick:
				scr._try_pick(int(main.m.remaining_bags()[0]))
			elif w == "draft_done" and scr is Draft and not scr.continue_btn.disabled:
				scr.continue_btn.pressed.emit()
			elif w == "hp_done" and scr.has_method("_refresh_hp"):
				scr.ok_btn.pressed.emit()
			elif w == "compose_open" and scr is Battle and scr.my_turn:
				var uid := int(main.m.st.sides[0].units[0].uid)
				scr._open_compose(uid)
			elif w.begins_with("w:") or w.begins_with("n:"):
				var pop = null
				for c in scr.get_children():
					if c is Compose:
						pop = c
				if pop != null:
					var want: String = w.substr(2)
					var plan: Array = Tut.plan
					var stop := plan.size()
					for k in plan.size():
						if str(plan[k]) == want:
							stop = k + 1
							break
					while pop.composer.tokens.size() < stop:
						var nx = plan[pop.composer.tokens.size()]
						if nx is int or nx is float:
							pop.composer.add_number(int(nx), "")
						else:
							pop.composer.add_word(str(nx))
			elif w == "compose_confirm":
				for c in scr.get_children():
					if c is Compose and not c.btn_ok.disabled:
						c.btn_ok.pressed.emit()
			elif w == "target_picked" and scr is Battle:
				var side := 1 if id == "tgt" else 0
				var u: Dictionary = E.alive_units(main.m.st, side)[0]
				scr._on_card_clicked(scr.cards[int(u.uid)])
			elif w == "declared" and scr is Battle:
				scr._confirm()
			elif w == "pass" and scr is Battle:
				scr._pass()
			elif w == "next_round" and scr is Battle and t.next_b == null:
				Tut.fire("next_round")
				scr.next_round.emit()
	print("超时，停在 ", last)
	quit(1)

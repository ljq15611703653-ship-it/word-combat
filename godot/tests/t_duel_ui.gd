extends SceneTree
# 现场拼对决的界面通关：真实屏幕 + 真实处理函数，一直点到结束。用法： -- 种子 [最多轮数]
const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const Draft = preload("res://scripts/ui/draft_screen.gd")
const Setup = preload("res://scripts/ui/duel_setup.gd")
const Battle = preload("res://scripts/ui/battle_screen.gd")

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var seed_v := int(args[0]) if args.size() > 0 else 3
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await create_timer(0.5).timeout
	main._new_duel(seed_v, true)
	var steps := 0
	var rounds_seen := 0
	var composed := 0
	var reused := false
	var last := ""
	while steps < 400:
		steps += 1
		await create_timer(0.25).timeout
		var s = main.screen
		if s == null or not is_instance_valid(s):
			continue
		var tag := "%s/%s" % [s.get_script().resource_path.get_file(), main.m.phase]
		if tag != last:
			print("  屏幕：", tag, " 轮 ", main.m.st.round)
			last = tag
		if s is Draft:
			if s.can_pick:
				var rem: Array = main.m.remaining_bags()
				if not rem.is_empty():
					s._try_pick(int(rem[0]))
			elif not s.continue_btn.disabled:
				s.finished.emit()
		elif s is Setup:
			s.ok_btn.pressed.emit()
		elif s is Battle:
			var m = main.m
			if m.phase == "over" or m.winner != -1:
				print("通关：胜者 ", m.winner, " 轮 ", m.st.round, " 分 ", m.st.sides[0].score, ":", m.st.sides[1].score, " 我方拼句 ", composed)
				quit(0)
				return
			if s.busy:
				continue
			if s.my_turn:
				var idle: Array = m.idle_units(0)
				if idle.is_empty() or E.available_ap(m.st, 0, m.declared[0]) < 8:
					s._pass()
					continue
				var u: Dictionary = idle[0]
				if composed == 0:
					s._peek_duel(1)
					s._peek_duel(0)
				if m.last_sentence.has(int(u.uid)) and not reused:
					reused = true
					s._reuse_last(int(u.uid))
					print("  沿用上一句：", s.sel_sid, " 员 ", u.name)
					if s.sel_sid == -1:
						print("  !! 沿用失败（可能冷却中）")
					else:
						var ra: Array = Ai.enumerate_actions(m.st, 0, m.public_declared(1), 4, m.declared[0])
						for a in ra:
							if not a.is_empty() and int(a.sid) == s.sel_sid:
								s.sel_choices = a.choices
								s.sel_start = int(a.start)
								s._confirm()
								composed += 1
								break
						continue
				# 用电脑的挑句思路：直接拿一个能打的基础句
				var sk := G.finalize(G.skill("测试", [G.dmg(G.T("choose", "enemy", {"n": 1}), G.N(8))]))
				var r: Dictionary = m.stage_sentence(int(u.uid), sk)
				if r.has("err"):
					print("  !! 拼句失败：", r.err)
					s._pass()
					continue
				s._select_skill(int(r.sid))
				var acts: Array = Ai.enumerate_actions(m.st, 0, m.public_declared(1), 4, m.declared[0])
				var pick := {}
				for a in acts:
					if not a.is_empty() and int(a.sid) == int(r.sid):
						pick = a
						break
				if pick.is_empty():
					m.unstage(int(u.uid))
					s._pass()
					continue
				s.sel_choices = pick.choices
				s.sel_start = int(pick.start)
				s._confirm()
				composed += 1
			else:
				pass
			# 结算完的“下一轮”
			if not s.my_turn and not s.busy and m.phase == "draft":
				s.next_round.emit()
	print("超过步数仍未结束：", last)
	quit(1)

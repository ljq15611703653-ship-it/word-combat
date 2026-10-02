extends SceneTree
const Duel = preload("res://scripts/game/duel.gd")
const E = preload("res://scripts/core/engine.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var d := Duel.new()
	d.start(false, int(args[0]) if args.size() > 0 else 1, false)
	var guard := 0
	var last_phase := ""
	while d.step_auto() and guard < 400:
		guard += 1
		if d.phase == "hp" and last_phase != "hp":
			print("开局词库（进阶）：")
			for s in 2:
				var adv: Array = []
				for w in d.pools[s]:
					if int(d.pools[s][w]) > 0 and not d.Lex.is_basic(w):
						adv.append(w)
				print("  方", s, " ", adv)
		last_phase = d.phase
		if d.phase == "draft" or d.phase == "over":
			print("== 第", d.st.round, "轮 分[", d.st.sides[0].score, ",", d.st.sides[1].score, "] AP[", d.st.sides[0].ap, ",", d.st.sides[1].ap, "]")
			for s in 2:
				for t in d.last_skills[s].texts:
					print("   方", s, "：", str(t).substr(0, 100))
			var c := {}
			for e in d.last_events:
				c[str(e.type)] = int(c.get(str(e.type), 0)) + 1
			print("   事件", c)
			if d.phase == "over":
				break
	print("胜者 ", d.winner)
	quit()

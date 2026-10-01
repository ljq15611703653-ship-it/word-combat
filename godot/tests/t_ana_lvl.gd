extends SceneTree
# 难度强弱：0号位用 eps_a、1号位用 eps_b（偶数局互换座位），同性格(随机)镜像不强求。
# 用法：--script res://tests/t_ana_lvl.gd -- <种子> <局数> <eps_a> <eps_b> <fast_a 0/1> <fast_b 0/1>
# 输出：每局一行 "seed pers0 pers1 strongSeat winner rounds"
const Match = preload("res://scripts/game/match.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")

func _init() -> void:
	await process_frame
	Lex.load_all()
	var a := OS.get_cmdline_user_args()
	var seed0 := int(a[0]); var n := int(a[1])
	var eps := [float(a[2]), float(a[3])]
	var fast := [int(a[4]) == 1, int(a[5]) == 1]
	var A_wins := 0.0; var B_wins := 0.0
	var pers: Array = Ai.PERSONA_ORDER
	for g in n:
		var m := Match.new()
		m.start(false, seed0 + g, false)
		var k := (seed0 + g) % 25
		m.personas = [pers[k / 5], pers[k % 5]]
		var swap := (g % 2 == 1)    # swap: A(eps[0]) 坐 1 号位
		m.auto_opening()
		var guard := 0
		while guard < 600:
			guard += 1
			if m.phase == "declare" and m.declare_side() != -1:
				var s: int = m.declare_side()
				var who: int = (1 - s) if swap else s     # 0=A 1=B
				m.ai_epsilon = eps[who]
				m.fast_ai = fast[who]
			if not m.step_auto():
				break
		var w: int = m.winner
		var aseat := 1 if swap else 0
		var r := 0.5
		if w == aseat: r = 1.0
		elif w == 1 - aseat: r = 0.0
		A_wins += r; B_wins += 1.0 - r
		print("G %d %s %s Aseat=%d w=%d r=%d" % [seed0 + g, m.personas[0], m.personas[1], aseat, w, m.st.round])
	print("SUMMARY A(eps=%s fast=%s) wins %.1f / %d" % [eps[0], fast[0], A_wins, n])
	quit(0)

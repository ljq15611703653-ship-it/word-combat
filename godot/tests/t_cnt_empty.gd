extends SceneTree
# 诊断：为什么第 3/4 张卡经常拼不出来（空卡）。用法： -- 局数 起始种子
const MatchX = preload("res://tests/t_cnt_match.gd")
const D = preload("res://scripts/core/deck.gd")
const Coach = preload("res://scripts/core/coach.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 20
	var s0 := int(args[1]) if args.size() > 1 else 1
	var tot := 0
	var empt := 0
	var reasons := {}
	for g in n:
		var m = MatchX.new()
		m.start(false, s0 + g, false)
		m.begin_staged()
		m.ai_epsilon = 0.0
		m.fast_ai = true
		var guard := 0
		var last_k := -1
		while guard < 60 and m.phase != "ready":
			guard += 1
			# 在拼每张卡之前抓取预算/词情况
			if m.phase == "build_card" and last_k != m.card_idx:
				last_k = m.card_idx
				for s in 2:
					var b: Dictionary = D.budget_used(m.decks[s])
					var avail: Dictionary = Coach.free_words(m.pools[s], m.decks[s])
					var ready := 0
					for a in Coach.route_status(avail):
						if int(a.n) == 0:
							ready += 1
					m.set_meta("pre_%d_%d" % [s, last_k], {"total": int(b.total), "ready": ready, "hp_sum": int(b.hp)})
			m.step_auto()
		for s in 2:
			for k in 4:
				tot += 1
				var u: Dictionary = m.decks[s].units[k]
				if u.skills.is_empty():
					empt += 1
					var pre: Dictionary = m.get_meta("pre_%d_%d" % [s, k], {})
					var key := "k%d ready=%s total_before=%s" % [k, "0" if int(pre.get("ready", 0)) == 0 else ">0", str(int(pre.get("total", 0)) / 10 * 10)]
					reasons[key] = int(reasons.get(key, 0)) + 1
	print("空卡 %d / %d" % [empt, tot])
	var ks := reasons.keys()
	ks.sort()
	for k in ks:
		print("  ", k, " : ", reasons[k])
	quit()

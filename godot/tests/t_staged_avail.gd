extends SceneTree
# 逐张构筑时：每条路线“拼得出来”的比例（词够不够）vs 实际被选中的比例
const Match = preload("res://scripts/game/match.gd")
const Coach = preload("res://scripts/core/coach.gd")
func _init() -> void:
	await process_frame
	var able := {}
	var chosen := {}
	var n_slots := 0
	for g in 60:
		var m := Match.new()
		m.start(false, 900 + g, false)
		m.begin_staged()
		var guard := 0
		while m.phase != "ready" and guard < 60:
			guard += 1
			if m.phase == "build_card":
				var avail: Dictionary = Coach.free_words(m.pools[0], m.decks[0])
				n_slots += 1
				for a in Coach.route_status(avail):
					if int(a.n) == 0:
						able[a.name] = int(able.get(a.name, 0)) + 1
			m.step_auto()
		for u in m.decks[0].units:
			for sk in u.skills:
				var nm := str(sk.get("name", "?"))
				chosen[nm] = int(chosen.get(nm, 0)) + 1
	print("卡位数 ", n_slots)
	var keys := able.keys()
	keys.sort_custom(func(a, b): return able[a] > able[b])
	for k in keys:
		print("  可拼 %-14s %3d / %d (%.0f%%)" % [k, able[k], n_slots, 100.0 * able[k] / n_slots])
	print("  —— 从未可拼的路线：")
	for r in Coach.ROUTES:
		if not able.has(r[0]):
			print("    ", r[0])
	quit()

extends SceneTree
const Match = preload("res://scripts/game/match.gd")
func _init() -> void:
	await process_frame
	var tags := {}
	var tids := {}
	var kws := {}
	var targeted := 0
	var total := 0
	for g in 60:
		var m := Match.new()
		m.start(false, 500 + g, false)
		m.begin_staged()
		var guard := 0
		while m.phase != "ready" and guard < 60:
			guard += 1
			m.step_auto()
		for s in 2:
			for u in m.decks[s].units:
				total += 1
				if str(u.kw) != "":
					kws[u.kw] = int(kws.get(u.kw, 0)) + 1
				for sk in u.skills:
					var t := str(sk.get("kind_tag", "?"))
					tags[t] = int(tags.get(t, 0)) + 1
					var id := str(sk.get("template", "?")) + str(sk.get("params", {}).get("op", ""))
					tids[id] = int(tids.get(id, 0)) + 1
	print("卡数 ", total, " 技能类型 ", tags)
	print("模板 ", tids)
	print("关键词 ", kws)
	quit()

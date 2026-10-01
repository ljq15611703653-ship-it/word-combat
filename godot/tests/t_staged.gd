extends SceneTree
# 逐张构筑流程：每张卡双方同时拼、同时亮；中间选词；最后第 1 轮直接开打
const Match = preload("res://scripts/game/match.gd")
const D = preload("res://scripts/core/deck.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const Namer = preload("res://scripts/core/namer.gd")

func _init() -> void:
	await process_frame
	var bad := 0
	for seed in [1, 2, 3, 4, 5, 6, 7, 8]:
		var m := Match.new()
		m.start(true, seed, false)
		m.begin_staged()
		var guard := 0
		while m.phase != "ready" and guard < 40:
			guard += 1
			match m.phase:
				"build_card":
					var u: Dictionary = m.ai_make_card(0, m.card_idx)
					if u.is_empty():
						u = m.decks[0].units[m.card_idx].duplicate(true)
						u["name"] = "肉盾"
						u["skills"] = []
					var r := m.commit_card(0, m.card_idx, u)
					if not r.ok:
						print("seed %d card %d commit failed: %s" % [seed, m.card_idx, str(r.errors)])
						bad += 1
						break
				"reveal":
					for s in 2:
						if m.decks[s].units[m.card_idx].skills.is_empty():
							print("  note: seed %d card %d side %d 没凑出技能（词不够）" % [seed, m.card_idx, s])
					m.after_reveal()
				"opening":
					m.ai_pick_bag()
		if m.phase != "ready":
			print("seed %d did not reach ready: %s" % [seed, m.phase])
			bad += 1
			continue
		m.begin_round()
		if m.phase != "adjust_done":
			print("seed %d bad phase after begin_round %s" % [seed, m.phase])
			bad += 1
		var okv: bool = D.validate(m.decks[0], m.pools[0]).ok and D.validate(m.decks[1], m.pools[1]).ok
		if not okv:
			print("seed %d invalid final deck" % seed)
			bad += 1
		print("seed %d ok: %d bags, names %s | %s" % [seed, m.opening_idx, str(m.decks[1].units.map(func(x): return x.name)), str(m.decks[1].units.map(func(x): return x.skills.size()))])
	print("逐张构筑测试结束，失败 ", bad)
	quit(1 if bad > 0 else 0)

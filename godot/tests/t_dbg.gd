extends SceneTree
const Match = preload("res://scripts/game/match.gd")
const E = preload("res://scripts/core/engine.gd")
const R = preload("res://scripts/core/recipes.gd")
const D = preload("res://scripts/core/deck.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
func _init() -> void:
	Lex.load_all()
	var m := Match.new()
	m.start(true, 7, false)
	m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
	m.commit_deck(0, m.decks[0])
	m.begin_round()
	m.pick_bag(0, 0)
	print("steps ", m.adjust_steps, " idx ", m.adjust_idx, " side ", m.adjust_side())
	var nd := D.clone(m.decks[0])
	var sk := R.build("mit", {})
	var u: Dictionary = nd.units[1]
	u.skills.append(sk)
	print("validate ", D.validate(nd, m.pools[0]).ok)
	var r := m.apply_adjust(0, 1, u)
	print("apply ", r.ok, " ", r.get("errors", []))
	print("steps ", m.adjust_steps, " idx ", m.adjust_idx, " side ", m.adjust_side(), " phase ", m.phase)
	var guard := 0
	while m.phase == "adjust" and guard < 10:
		guard += 1
		var s: int = m.adjust_side()
		print(" loop side ", s, " human ", m.human[s], " left ", m.adjust_left(s))
		if m.human[s]:
			break
		m.ai_adjust()
		print("  after ai: steps ", m.adjust_steps, " idx ", m.adjust_idx, " phase ", m.phase)
	quit(0)

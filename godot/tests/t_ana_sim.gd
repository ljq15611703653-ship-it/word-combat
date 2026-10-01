extends SceneTree
# 批量 AI 对 AI 模拟，逐局输出 JSONL。用法：
#  --script res://tests/t_ana_sim.gd -- <起始种子> <局数> <难度0/1/2> <输出文件> [pair]
# 难度：0简单(eps .45, fast) 1普通(eps .12, fast) 2困难(eps 0, 完整思考)。pair 缺省=循环25个性格组合
const Match = preload("res://scripts/game/match.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const E = preload("res://scripts/core/engine.gd")
const Ai = preload("res://scripts/ai/ai.gd")

func _deck_info(m, s: int) -> Array:
	var out: Array = []
	for u in m.decks[s].units:
		var sks: Array = []
		for sk in u.skills:
			sks.append({"name": sk.get("name", ""), "tpl": sk.get("template", ""), "text": sk.get("text", ""), "words": sk.get("words", []), "budget": int(sk.get("budget", 0)), "tag": sk.get("kind_tag", "")})
		out.append({"name": u.name, "hp": int(u.max_hp), "kw": u.kw, "skills": sks})
	return out

func _init() -> void:
	await process_frame
	Lex.load_all()
	var a := OS.get_cmdline_user_args()
	var seed0 := int(a[0]); var n := int(a[1]); var lvl := int(a[2])
	var f := FileAccess.open(a[3], FileAccess.WRITE)
	var fixed_pair: Array = []
	if a.size() > 4:
		fixed_pair = String(a[4]).split(",")
	var pers: Array = Ai.PERSONA_ORDER
	var t0 := Time.get_ticks_msec()
	for g in n:
		var m := Match.new()
		m.fast_ai = lvl < 2
		m.ai_epsilon = [0.45, 0.12, 0.0][lvl]
		m.start(false, seed0 + g, false)
		if fixed_pair.size() == 2:
			m.personas = [fixed_pair[0], fixed_pair[1]]
		else:
			var k := (seed0 + g) % 25
			m.personas = [pers[k / 5], pers[k % 5]]
		m.auto_opening()
		var rounds: Array = []
		var guard := 0
		var deck_done := false
		while guard < 600:
			guard += 1
			var before: String = m.phase
			if not m.step_auto():
				pass
			if m.phase == "resolved" or m.phase == "over":
				if rounds.size() < int(m.st.round):
					var sk := {}
					for s in 2:
						for d in m.last_declared[s]:
							var sd: Dictionary = E.skill_of(m.st, int(d.sid))
							sk[str(d.sid)] = {"text": sd.get("text", ""), "tpl": sd.get("template", ""), "tag": sd.get("kind_tag", ""), "budget": int(sd.get("budget", 0)), "host": E.host_of(m.st, int(d.sid)), "name": sd.get("name", "")}
					var hps: Array = []
					for s in 2:
						var h: Array = []
						for u in m.st.sides[s].units:
							h.append(int(u.hp) if u.down_round == -1 else 0)
						hps.append(h)
					rounds.append({"r": int(m.st.round), "first": E.first_side(m.st), "score": [int(m.st.sides[0].score), int(m.st.sides[1].score)],
						"ap": [int(m.st.sides[0].ap), int(m.st.sides[1].ap)], "hp": hps,
						"decl": [m.last_declared[0].size(), m.last_declared[1].size()], "sk": sk, "ev": m.last_events.duplicate(true)})
				if m.phase == "over":
					break
			if before == "build" and not deck_done:
				deck_done = true
		var rec := {"seed": seed0 + g, "lvl": lvl, "pers": m.personas, "winner": m.winner, "rounds": rounds, "decks": [_deck_info(m, 0), _deck_info(m, 1)], "ms": 0}
		f.store_line(JSON.stringify(rec))
		if g % 50 == 49:
			f.flush()
			print("done ", g + 1, " ", Time.get_ticks_msec() - t0, "ms")
	f.close()
	print("FINISHED ", n, " games ", Time.get_ticks_msec() - t0, "ms")
	quit(0)

extends SceneTree
# 手工构筑一套“高血量 + 回敬/改道”的防反牌组（不考虑抽词），对打电脑默认的逐张构筑牌组。
# 用法： -- 局数(每种座位) 起始种子 策略(forced|default) 套牌(A|B)
const D = preload("res://scripts/core/deck.gd")
const R = preload("res://scripts/core/recipes.gd")
const E = preload("res://scripts/core/engine.gd")
const Ai = preload("res://scripts/ai/ai.gd")

# 套牌 A：混合；套牌 B：纯防反（四张全是埋伏，没有进攻，看会不会靠回敬自己赢）
static func plan(kind: String) -> Array:
	# A8 / A5：同一套技能，只把四张卡的生命压到 8 / 5（验证“生命越高，对手击倒你一次得分越多”）
	if kind == "A8" or kind == "A5":
		var hp := 8 if kind == "A8" else 5
		var base := plan("A")
		for b in base:
			b[2] = hp
		return base
	if kind == "B":
		return [
			["reflect", {"obs": "all", "mult": 1, "freq": "every"}, 15, "首挡"],
			["redirect", {"obs": "all", "to": "source", "n": 12, "freq": "every"}, 15, "不屈"],
			["reflect", {"obs": "self", "mult": 1, "freq": "every"}, 15, "回击"],
			["redirect", {"obs": "self", "to": "source", "n": 12, "freq": "every"}, 15, "回春"],
		]
	return [
		["reflect", {"obs": "all", "mult": 1, "freq": "every"}, 14, "首挡"],
		["redirect", {"obs": "all", "to": "source", "n": 14, "freq": "every"}, 14, "不屈"],
		["atk1", {"tgt": "lowest", "n": 12}, 13, "回击"],
		["reflect", {"obs": "self", "mult": 1, "freq": "every"}, 13, "回春"],
	]

class M extends "res://scripts/game/match.gd":
	var mine := 0
	var forced := true
	var kind := "A"
	func _ai_build_card(side: int, k: int) -> void:
		if side != mine:
			super._ai_build_card(side, k)
			return
		var pl: Array = plan_of(kind)[k]
		var sk: Dictionary = R.build(str(pl[0]), pl[1])
		var u := {"name": "", "glyph": D.GLYPHS[k % D.GLYPHS.size()], "max_hp": int(pl[2]), "kw": str(pl[3]), "skills": [sk]}
		u["name"] = "防反%d" % (k + 1)
		var nd := D.clone(decks[side])
		nd.units[k] = u
		D.rename_skills(nd)
		decks[side] = nd
		E.set_deck(st, side, nd, false)
	func plan_of(kd: String) -> Array:
		return load("res://tests/t_defdeck.gd").plan(kd)
	func ai_adjust() -> void:
		if adjust_side() == mine:
			skip_adjust(mine)
			return
		super.ai_adjust()
	func ai_declare() -> void:
		var s := declare_side()
		if s != mine or not forced or scripted_ai.is_valid():
			super.ai_declare()
			return
		var enemy_list: Array = []
		if s != declare_order[0]:
			enemy_list = declared[1 - s].duplicate(true)
		# 埋伏类（回敬/改道/减伤/护盾）：每轮都在最早的时间布好
		var done := {}
		for a in Ai.enumerate_actions(st, s, enemy_list, 8, declared[s]):
			if a.is_empty():
				continue
			var cat := _act_cat(a)
			if not (cat in ["reflect", "redirect", "mit", "shield", "convert"]):
				continue
			if done.has(int(a.sid)):
				continue
			var best: Dictionary = a
			for b in Ai.enumerate_actions(st, s, enemy_list, 8, declared[s]):
				if not b.is_empty() and int(b.sid) == int(a.sid) and int(b.start) < int(best.start):
					best = b
			if submit(s, best) == "":
				done[int(a.sid)] = true
		var guard := 0
		while guard < E.MAX_ACTIONS:
			guard += 1
			var act := Ai.choose_action(st, s, enemy_list, declared[s], rng, fast_ai, ai_epsilon)
			if act.is_empty():
				break
			if _act_cat(act) in ["reflect", "redirect", "mit", "shield", "convert"] and done.has(int(act.sid)):
				break
			if submit(s, act) != "":
				break
		declare_done[s] = true

func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 50
	var s0 := int(args[1]) if args.size() > 1 else 1
	var pol := str(args[2]) if args.size() > 2 else "forced"
	var kind := str(args[3]) if args.size() > 3 else "A"
	var apx := float(args[4]) if args.size() > 4 else 1.0
	var res := {"win": 0, "lose": 0, "draw": 0}
	var by_seat := [[0, 0], [0, 0]]
	var score_me := 0
	var score_foe := 0
	var rounds := 0
	for seat in 2:
		for g in n:
			var m := M.new()
			m.mine = seat
			m.forced = pol == "forced"
			m.kind = kind
			m.start(false, s0 + g, false, 0)
			if apx != 1.0:
				m.st.rules.ap_gain = int(15 * apx)
				m.st.rules.ap_cap = int(60 * apx)
				m.st.rules.start_ap = int(15 * apx)
				for sd in 2:
					m.st.sides[sd].ap = int(m.st.rules.start_ap)
			m.begin_staged()
			m.ai_epsilon = 0.12
			m.fast_ai = true
			var guard := 0
			while m.step_auto() and guard < 900:
				guard += 1
			var w: int = m.winner
			if w == seat:
				res.win += 1
				by_seat[seat][0] += 1
			elif w == -2 or w == -1:
				res.draw += 1
			else:
				res.lose += 1
			by_seat[seat][1] += 1
			score_me += int(m.st.sides[seat].score)
			score_foe += int(m.st.sides[1 - seat].score)
			rounds += int(m.st.round)
	var total := n * 2
	print("行动点×%.1f 防反牌组[%s] 策略=%s：%d 局 胜 %d / 负 %d / 平 %d；胜率 %.0f%%" % [apx, kind, pol, total, res.win, res.lose, res.draw, 100.0 * res.win / total])
	print("  坐 0 号位：%d/%d；坐 1 号位：%d/%d" % [by_seat[0][0], by_seat[0][1], by_seat[1][0], by_seat[1][1]])
	print("  平均得分 我 %.1f / 对手 %.1f；平均轮数 %.2f" % [float(score_me) / total, float(score_foe) / total, float(rounds) / total])
	quit()

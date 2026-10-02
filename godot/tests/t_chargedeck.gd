extends SceneTree
# 手工构筑一套“蓄爆”牌组（两张蓄力轮流叠 + 铁壁护主力 + 一个大招），对打电脑默认牌组，看这个流派行不行。
# 用法： -- 每个座位局数 起始种子 阈值(叠到几层才放大招) [unit=.. smax=.. cd=.. per=.. win=.. rounds=.. hp=..]
const D = preload("res://scripts/core/deck.gd")
const R = preload("res://scripts/core/recipes.gd")
const E = preload("res://scripts/core/engine.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const G = preload("res://scripts/core/grammar.gd")

class M extends "res://scripts/game/match.gd":
	var mine := 0
	var thr := 4
	var hits := 0
	var spent_best := 0
	var mainhp := 16
	var extp := 1
	var otherhp := 14
	func _ai_build_card(side: int, k: int) -> void:
		if side != mine:
			super._ai_build_card(side, k)
			return
		var plan := [
			["status", {"st": "蓄力", "ext": extp}, otherhp, ""],      # 0：给主力叠蓄力
			["atkA", {"n": 22}, mainhp, "首挡"],   # 1：主力（群攻大招：选满 4 个敌人）
			["status", {"st": "铁壁", "ext": extp}, otherhp, ""],      # 2：给主力叠铁壁
			["status", {"st": "蓄力", "ext": extp}, otherhp, ""],      # 3：另一张蓄力，和 0 轮流放（冷却 1 轮）
		]
		var pl: Array = plan[k]
		var sk: Dictionary = R.build(str(pl[0]), pl[1])
		var u := {"name": "蓄爆%d" % (k + 1), "glyph": D.GLYPHS[k % D.GLYPHS.size()], "max_hp": int(pl[2]), "kw": str(pl[3]), "skills": [sk]}
		var nd := D.clone(decks[side])
		nd.units[k] = u
		D.rename_skills(nd)
		decks[side] = nd
		E.set_deck(st, side, nd, false)
	func ai_adjust() -> void:
		if adjust_side() == mine:
			skip_adjust(mine)
			return
		super.ai_adjust()
	func ai_declare() -> void:
		var s := declare_side()
		if s != mine or scripted_ai.is_valid():
			super.ai_declare()
			return
		var enemy_list: Array = []
		if s != declare_order[0]:
			enemy_list = declared[1 - s].duplicate(true)
		var main_uid: int = mine * 10 + 1
		var main_u: Dictionary = E._u(st, main_uid)
		var stacks: int = E.stacks_of(main_u, "蓄力")
		var acts: Array = Ai.enumerate_actions(st, s, enemy_list, 12, declared[s])
		# 1) 叠蓄力 / 铁壁，目标一律是主力
		var done := {}
		for a in acts:
			if a.is_empty():
				continue
			var sk: Dictionary = E.skill_of(st, int(a.sid))
			var stn := ""
			for n in sk.nodes:
				if n.kind == "status":
					stn = str(n.status)
			if stn == "" or done.has(int(a.sid)):
				continue
			var ok := true
			for k in a.choices:
				if int(a.choices[k]) != main_uid:
					ok = false
			if not ok:
				continue
			if submit(s, a) == "":
				done[int(a.sid)] = true
		# 2) 层数够了再放大招（或者场上有能一击击倒的目标也放）
		if stacks >= thr:
			var best := {}
			var best_sc := -1.0e9
			for a in acts:
				if a.is_empty() or int(E.host_of(st, int(a.sid))) != main_uid:
					continue
				var v := Ai.evaluate(Ai._sim(st, enemy_list + declared[s] + [a]), s)
				if v > best_sc:
					best_sc = v
					best = a
			if not best.is_empty() and submit(s, best) == "":
				hits += 1
				spent_best = maxi(spent_best, stacks)
		else:
			# 层数不够：只在能直接击倒目标时放大招
			pass
		declare_done[s] = true

func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 30
	var s0 := int(args[1]) if args.size() > 1 else 1
	var thr := int(args[2]) if args.size() > 2 else 4
	var ov := {}
	for i in range(3, args.size()):
		var kv := str(args[i]).split("=")
		if kv.size() == 2:
			ov[kv[0]] = float(kv[1])
	if ov.has("unit"): E.STACK_UNIT = ov.unit
	if ov.has("base"): E.STACK_BASE = ov.base
	if ov.has("smax"): E.STACK_MAX = int(ov.smax)
	if ov.has("burn"): E.BURN_SCALE = ov.burn
	if ov.has("hp"): load("res://scripts/game/match.gd").AI_HP = int(ov.hp)
	var win := 0
	var lose := 0
	var draw := 0
	var by_seat := [[0, 0], [0, 0]]
	var sc_me := 0
	var sc_foe := 0
	var rounds := 0
	var maxhit := 0
	var big := 0
	var casts := 0
	for seat in 2:
		for g in n:
			var m := M.new()
			m.mine = seat
			m.thr = thr
			m.mainhp = int(ov.get("mainhp", 16))
			m.extp = int(ov.get("ext", 1))
			m.otherhp = int(ov.get("otherhp", 14))
			m.start(false, s0 + g, false, 0)
			if ov.has("win"): m.st.rules.win_score = int(ov.win)
			if ov.has("cd"): m.st.rules.cooldown = int(ov.cd)
			if ov.has("rounds"): m.st.rules.max_rounds = int(ov.rounds)
			m.begin_staged()
			m.ai_epsilon = 0.12
			m.fast_ai = true
			var guard := 0
			while m.step_auto() and guard < 1500:
				guard += 1
				if m.phase == "resolved" or m.phase == "over":
					for e in m.last_events:
						if str(e.type) == "dmg":
							maxhit = maxi(maxhit, int(e.amount))
							if int(e.amount) >= 60:
								big += 1
			var w: int = m.winner
			if w == seat:
				win += 1
				by_seat[seat][0] += 1
			elif w < 0:
				draw += 1
			else:
				lose += 1
			by_seat[seat][1] += 1
			sc_me += int(m.st.sides[seat].score)
			sc_foe += int(m.st.sides[1 - seat].score)
			rounds += int(m.st.round)
			casts += m.hits
	var total := n * 2
	print("蓄爆牌组 阈值%d：%d 局 胜 %d / 负 %d / 平 %d；胜率 %.0f%%（座位0 %d/%d，座位1 %d/%d）" % [thr, total, win, lose, draw, 100.0 * win / total, by_seat[0][0], by_seat[0][1], by_seat[1][0], by_seat[1][1]])
	print("  平均得分 我 %.1f / 对手 %.1f；平均轮数 %.2f；最大单次伤害 %d；≥60 的大伤害 %.2f 次/局；放出大招 %.2f 次/局" % [float(sc_me) / total, float(sc_foe) / total, float(rounds) / total, maxhit, float(big) / total, float(casts) / total])
	quit()

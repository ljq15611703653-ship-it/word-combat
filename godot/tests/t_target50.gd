extends SceneTree
# 逐张构筑的真实对战（电脑 vs 电脑）：统计“针对”与反制。用法： -- 局数 起始种子 eps
const Match = preload("res://scripts/game/match.gd")
const Coach = preload("res://scripts/core/coach.gd")
class M extends "res://scripts/game/match.gd":
	var tgt_cards := [0, 0]
	var cards := [0, 0]
	var empty := [0, 0]
	func _ai_build_card(side: int, k: int) -> void:
		var prof: Dictionary = Coach.foe_profile(revealed_deck(1 - side))
		super._ai_build_card(side, k)
		cards[side] += 1
		var u: Dictionary = decks[side].units[k]
		if u.skills.is_empty():
			empty[side] += 1
			return
		var sk: Dictionary = u.skills[0]
		var role := ""
		for r in Coach.ROUTES:
			if str(r[1]) == str(sk.get("template", "")):
				role = str(r[3])
				break
		var a := {"params": sk.get("params", {}), "tid": str(sk.get("template", "")), "role": role}
		if float(Coach._relevance(a, prof).bonus) > 0.0:
			tgt_cards[side] += 1
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var n := int(args[0]) if args.size() > 0 else 50
	var s0 := int(args[1]) if args.size() > 1 else 1
	var eps := float(args[2]) if args.size() > 2 else 0.12
	var ev := {}
	var wins := [0, 0, 0]
	var rounds := 0
	var cap10 := 0
	var more_tgt_wins := 0
	var more_tgt_games := 0
	var tgt_total := [0, 0]
	var empty_total := 0
	var cards_total := 0
	var any_counter_games := 0
	var atk_cards := 0
	var all_cards := 0
	for g in n:
		var m := M.new()
		m.start(false, s0 + g, false)
		m.begin_staged()
		m.ai_epsilon = eps
		m.fast_ai = true
		var gc := 0
		var guard := 0
		while m.step_auto() and guard < 900:
			guard += 1
			if m.phase == "resolved" or m.phase == "over":
				for e in m.last_events:
					var t := str(e.type)
					ev[t] = int(ev.get(t, 0)) + 1
					if t in ["interrupt", "redirect", "convert"]:
						gc += 1
					if t == "mit" or t == "shield" or t == "block":
						gc += 1
		if gc > 0:
			any_counter_games += 1
		for s in 2:
			tgt_total[s] += m.tgt_cards[s]
			empty_total += m.empty[s]
			cards_total += m.cards[s]
			for u in m.decks[s].units:
				for sk in u.skills:
					all_cards += 1
					if str(sk.get("kind_tag", "atk")) == "atk":
						atk_cards += 1
		var w: int = m.winner
		wins[w if w >= 0 else 2] += 1
		rounds += int(m.st.round)
		if int(m.st.round) >= 10:
			cap10 += 1
		if w >= 0 and m.tgt_cards[0] != m.tgt_cards[1]:
			more_tgt_games += 1
			var more: int = 0 if m.tgt_cards[0] > m.tgt_cards[1] else 1
			if w == more:
				more_tgt_wins += 1
	print("总计 %d 局：0号位胜 %d / 1号位胜 %d / 平 %d；平均轮数 %.2f；打满10轮 %d" % [n, wins[0], wins[1], wins[2], float(rounds) / n, cap10])
	print("拼卡：空卡 %d/%d；进攻卡占 %.0f%%；带“针对”标记的卡 %d/%d (%.0f%%)" % [empty_total, cards_total, 100.0 * atk_cards / maxf(1.0, all_cards), tgt_total[0] + tgt_total[1], cards_total, 100.0 * (tgt_total[0] + tgt_total[1]) / maxf(1.0, cards_total)])
	print("针对更多的一方胜率：%d/%d" % [more_tgt_wins, more_tgt_games])
	print("出现过反制类事件(打断/改道/转伤为疗/减伤/护盾/首挡)的局数：%d/%d" % [any_counter_games, n])
	for k in ["interrupt", "time_fail", "redirect", "convert", "mit", "shield", "block", "trigger", "fizzle"]:
		print("  事件 %s：每局 %.2f" % [k, float(ev.get(k, 0)) / n])
	quit()

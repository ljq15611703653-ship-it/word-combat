extends SceneTree
const Match = preload("res://scripts/game/match.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
func _init() -> void:
	Lex.load_all()
	var scores: Array = []
	var by_round := {}
	for g in 60:
		var m := Match.new()
		m.fast_ai = true
		m.start(false, 500 + g, false)
		m.st.rules.win_score = 100000
		var guard := 0
		var hit := {}
		while guard < 600:
			guard += 1
			if not m.step_auto():
				break
			if m.phase == "resolved":
				var mx: int = maxi(int(m.st.sides[0].score), int(m.st.sides[1].score))
				for thr in [60, 80, 100, 120, 150]:
					if mx >= thr and not hit.has(thr):
						hit[thr] = int(m.st.round)
		for thr in [60, 80, 100, 120, 150]:
			if not by_round.has(thr):
				by_round[thr] = []
			by_round[thr].append(hit.get(thr, 99))
		scores.append(maxi(int(m.st.sides[0].score), int(m.st.sides[1].score)))
	scores.sort()
	print("最终最高分 分位: 10%%=%d 25%%=%d 50%%=%d 75%%=%d 90%%=%d" % [scores[6], scores[15], scores[30], scores[45], scores[54]])
	for thr in [60, 80, 100, 120, 150]:
		var arr: Array = by_round[thr]
		arr.sort()
		var reached := 0
		for r in arr:
			if r < 99:
				reached += 1
		print("阈值%d：%d/60局在12轮内达到，中位达到轮数 %s" % [thr, reached, str(arr[30])])
	quit(0)

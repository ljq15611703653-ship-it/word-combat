extends SceneTree
# 新课程自测：每一关的标准答案要能通关；“天真写法”（naive）不能通关；打印费用与行动点。
const L = preload("res://scripts/adventure/level_eval.gd")
func _init() -> void:
	await process_frame
	var lv: Array = L.load_levels()
	var bad := 0
	for l in lv:
		var r: Dictionary = L.evaluate(l, L.tokens_from(l.sol))
		var cost: int = int(r.get("cost", 0))
		var line := "第%2d关 %-8s 标准答案：%s 费用%d/%d" % [int(l.id), str(l.title), "通关" if r.win else "没通！（%s）" % str(r.get("reason", "")), cost, int(l.ap)]
		if not r.win:
			bad += 1
			for it in r.get("goal_items", []):
				line += "\n      %s %s" % ["✓" if it.ok else "✗", str(it.text)]
		for nv in l.get("naive", []):
			var toks: Array = []
			for w in str(nv).split(" "):
				toks.append(float(w) if w.is_valid_int() else w)
			var r2: Dictionary = L.evaluate(l, L.tokens_from(toks))
			if r2.win:
				line += "\n      ⚠ 天真写法也能通关：" + str(nv)
				bad += 1
			else:
				line += "\n      天真写法不能通关 ✓（%s）" % str(nv).substr(0, 24)
		print(line)
	print("课程自测结束：问题 %d" % bad)
	quit(1 if bad > 0 else 0)

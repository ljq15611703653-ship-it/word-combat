extends SceneTree
const F = preload("res://scripts/compose/fuzzy.gd")
func _init() -> void:
	await process_frame
	for tray in [["自身", "恢复", "生命"], ["敌方", "随从", "造成", "伤害", "选择", "一个"], ["造成", "伤害", "双倍"], ["当", "受到伤害", "来源", "造成", "伤害", "自身"], ["若有", "全部", "敌方", "随从", "造成", "伤害", "并"], ["减伤", "友方", "随从"]]:
		var f = F.new()
		var t0 := Time.get_ticks_msec()
		var r = await f.solve(tray)
		print("—— 托盘：", tray, "  用时 %dms" % (Time.get_ticks_msec() - t0))
		print("   ", r.message)
		for k in ["exact", "partial", "completed"]:
			for e in r[k]:
				print("   [%s] %s  | 补：%s | 没用上：%s | 牌：%s" % [k, e.text, str(e.added), str(e.unused), str(e.tokens.map(func(t): return str(t.v)))])
		if not r.guess.is_empty():
			print("   [猜测] %s | 补：%s | 没用上：%s" % [r.guess.text, str(r.guess.added), str(r.guess.unused)])
	quit()

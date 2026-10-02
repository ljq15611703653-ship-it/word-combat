extends SceneTree
# 冒险 100 关里，标准答案在当前语言里还能通关的有多少（用了已取消的词的关卡会被标成“待改”）
const L = preload("res://scripts/adventure/level_eval.gd")
func _init() -> void:
	await process_frame
	var lv: Array = L.load_levels()
	var ok: Array = []
	var bad: Array = []
	for l in lv:
		if L.is_playable(l):
			ok.append(int(l.id))
		else:
			bad.append(int(l.id))
	print("可玩 %d / %d 关" % [ok.size(), lv.size()])
	print("待改：", bad)
	quit()

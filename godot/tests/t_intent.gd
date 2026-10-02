extends SceneTree
const Intent = preload("res://scripts/compose/intent.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
func _init() -> void:
	await process_frame
	Lex.load_all()
	var avail := Lex.basic_supply()
	for w in ["持久", "双倍", "重复", "蓄力", "易伤", "灼烧", "转移", "恢复生命", "当", "即将受到伤害", "该次伤害", "来源", "受到伤害", "转为"]:
		avail[w] = 1
	for q in ["打全部敌人", "我想打最低血的那个", "给我的随从减伤", "给自己回血", "把伤害反弹回去", "叠蓄力然后一口气打爆", "让敌人持续掉血", "打 20 点伤害", "保护队友", "拖住对手", "随便说点什么"]:
		var res: Array = Intent.find(q, avail, 3)
		var names: Array = []
		for it in res:
			names.append("%s%s" % [it.name, "" if it.ok else "(缺)"])
		print("「%s」→ %s" % [q, "、".join(names) if not names.is_empty() else "没听懂"])
	quit()

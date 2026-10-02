extends SceneTree
const R = preload("res://scripts/core/recipes.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
func _init() -> void:
	await process_frame
	Lex.load_all()
	for n in [12, 22, 31]:
		var sk: Dictionary = R.build("atkA", {"n": n})
		print("群攻 %d：行动点 %d，起手 %d 秒 —— %s" % [n, int(sk.cost), int(sk.windup), sk.text])
	var sk1: Dictionary = R.build("atk1", {"n": 22})
	print("单体 22：行动点 %d —— %s" % [int(sk1.cost), sk1.text])
	for t in ["mit", "heal"]:
		var d: Dictionary = R.defaults(t)
		d["tgt"] = "all"
		var sk2: Dictionary = R.build(t, d)
		print("%s 全队：行动点 %d —— %s" % [t, int(sk2.cost), sk2.text])
	quit()

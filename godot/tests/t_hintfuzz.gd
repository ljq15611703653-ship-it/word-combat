extends SceneTree
const S = preload("res://scripts/compose/sentence.gd")
const H = preload("res://scripts/compose/hints.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
func _init() -> void:
	Lex.load_all()
	var rng := RandomNumberGenerator.new(); rng.seed = 21
	var pool := {}
	for w in Lex.implemented():
		pool[w] = 3
	var n := 0
	for i in 120:
		var wk := H.walk([], pool, rng, {})
		if not wk.ok:
			continue
		var toks: Array = wk.tokens
		for k in range(1, toks.size() + 1):
			var pre := toks.slice(0, k)
			var h := H.human_hint(pre, H.avail_of(pool, pre), 3, 6)
			var o := H.options(pre, H.avail_of(pool, pre))
			n += 1
	print("提示模糊测试：%d 个前缀全部跑完" % n)
	quit()

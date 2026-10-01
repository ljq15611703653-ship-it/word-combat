extends SceneTree
const G = preload("res://scripts/core/grammar.gd")
const S = preload("res://scripts/compose/sentence.gd")
const H = preload("res://scripts/compose/hints.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")
func w(a: Array) -> Array:
	return a.map(func(x): return S.Num(int(x)) if x is int else S.W(str(x)))
func _init() -> void:
	Lex.load_all()
	var rng := RandomNumberGenerator.new(); rng.seed = 9
	var pool := {}
	for k in 4:
		for x in (Lex.opening_words(rng) if k == 0 else Lex.draw_bag(rng)): pool[x] = int(pool.get(x, 0)) + 1
	print("词库共", pool.size(), "种")
	for pre in [[], ["选择", "一个", "敌方", "随从"], ["选择", "一个", "敌方", "随从", "造成"], ["自身", "恢复", 8], ["当", "自身", "受到伤害"]]:
		var toks := w(pre)
		var avail := H.avail_of(pool, toks)
		var t0 := Time.get_ticks_msec()
		var o := H.options(toks, avail)
		var t1 := Time.get_ticks_msec()
		var hint := H.human_hint(toks, avail)
		var t2 := Time.get_ticks_msec()
		var sg := H.suggestions(toks, avail, 3, 11)
		var t3 := Time.get_ticks_msec()
		print("—— 前缀：", pre.map(func(x): return str(x)))
		print("  能接（有）：", o.words_have.slice(0, 10), " 数字：", o.numbers, " 缺：", o.words_miss.slice(0, 6), " 成句=", o.complete)
		print("  人话：", hint.get("text", ""), "  (%d样本)" % int(hint.get("samples", 0)))
		for s in sg:
			print("  流派[", s.school, "]：", s.text, "  ← 还要拼：", s.added.map(func(t): return str(t.v)))
		print("  用时 options %dms / 人话 %dms / 流派 %dms" % [t1 - t0, t2 - t1, t3 - t2])
	quit()

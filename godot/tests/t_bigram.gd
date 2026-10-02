extends SceneTree
const R = preload("res://scripts/core/recipes.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Coach = preload("res://scripts/core/coach.gd")
func _init() -> void:
	await process_frame
	Lex.load_all()
	var all := {}
	for w in Lex.words:
		all[w] = 9
	var seen := {}
	var sents: Array = []
	for r in Coach.route_status(all):
		sents.append(r.skill)
	for t in R.catalog():
		sents.append(R.build(t.id, {}))
	var bg := {}
	for sk in sents:
		var toks: Array = S.tokens_of_skill(sk.nodes)
		var prev := "^"
		var line: Array = []
		for t in toks:
			var cur: String = "N" if str(t.t) == "N" else str(t.v)
			line.append(cur)
			var key := prev + " " + cur
			bg[key] = int(bg.get(key, 0)) + 1
			prev = cur
		var key2 := prev + " $"
		bg[key2] = int(bg.get(key2, 0)) + 1
		var ln := " ".join(line)
		if not seen.has(ln):
			seen[ln] = true
			print("SENT ", ln)
	var keys: Array = bg.keys()
	keys.sort_custom(func(a, b): return bg[a] > bg[b])
	for k in keys:
		print("BG ", bg[k], " ", k)
	quit()

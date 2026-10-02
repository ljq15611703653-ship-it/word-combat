extends SceneTree
const R = preload("res://scripts/core/recipes.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Coach = preload("res://scripts/core/coach.gd")
const Glue = preload("res://scripts/compose/glue.gd")
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
	for sk in sents:
		var toks: Array = S.tokens_of_skill(sk.nodes)
		var out := ""
		for i in toks.size():
			out += Glue.before(toks, i) + (str(toks[i].v) if str(toks[i].t) != "N" else "N") + " "
		out += Glue.tail(toks, true)
		if not seen.has(out):
			seen[out] = true
			print("G ", out)
	quit()

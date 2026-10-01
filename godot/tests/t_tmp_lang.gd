extends SceneTree
const G = preload("res://scripts/core/grammar.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
func T(a: Array) -> Array:
	return a.map(func(x): return S.Num(x) if x is int else (S.Part(str(x).substr(1)) if str(x).begins_with("~") else S.W(str(x))))
func _init() -> void:
	await process_frame
	Lex.load_all()
	var cases := [
		["选择","一个","敌方","随从","造成","最前","友方","随从","当前生命","加上",5,"伤害"],
		["选择","一个","敌方","随从","造成","~（","敌方人数","加上","友方人数","~）","减去",3,"伤害"],
		["选择","一个","敌方","随从","造成","敌方人数","减去","友方人数","伤害"],
		["选择","一个","一个","一个","敌方","随从","造成",6,"伤害"],
		["若","敌方人数","~低于","友方人数","选择","一个","敌方","随从","造成",10,"伤害","否则","自身","恢复",5,"生命"],
		["选择","一个","友方","随从","恢复","选择","一个","敌方","随从","当前生命","生命"],
		["选择","一个","敌方","随从","施加","沉默","持续",5],
		["选择","一个","敌方","随从","造成","~（","1","加上",2,"~）","伤害"],
	]
	for c in cases:
		var toks: Array = T(c)
		var r := S.analyze(toks)
		if r.complete:
			var sk: Dictionary = G.finalize(G.skill("x", r.skills[0]))
			print("OK  ", sk.text, " | 费用", sk.cost, " 价格", sk.price, " 槽", G.choice_slots(sk).map(func(x): return x.key))
		else:
			print("NO  ", c.map(func(x): return str(x)))
	quit()

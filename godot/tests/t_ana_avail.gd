extends SceneTree
# 理论可得率：每个招式模板(默认参数 + 若干变体)在“构筑时(开局选词后)”与“终局(含各轮抽词)”的词池里能否凑齐；
# 同时统计词库里哪些“已实现”的词从没被任何模板用到。用法： -- <种子> <局数>
const Match = preload("res://scripts/game/match.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const R = preload("res://scripts/core/recipes.gd")
const G = preload("res://scripts/core/grammar.gd")

func _init() -> void:
	await process_frame
	Lex.load_all()
	var a := OS.get_cmdline_user_args()
	var seed0 := int(a[0]); var n := int(a[1])
	var variants := {
		"atk1 基础": ["atk1", {}], "atk1 双倍": ["atk1", {"dbl": 1}], "atk1 双倍+重复": ["atk1", {"dbl": 1, "rep": 1}], "atk1 双倍x2+重复": ["atk1", {"dbl": 2, "rep": 1}],
		"atkA 基础": ["atkA", {}], "atkA 双倍": ["atkA", {"dbl": 1}],
		"chase 追击": ["chase", {}], "split 分流": ["split", {}], "copy 复制": ["copy", {}], "drain 汲取": ["drain", {}],
		"heal 自身": ["heal", {"tgt": "self"}], "heal 全队": ["heal", {"tgt": "all"}], "mit 自身": ["mit", {"tgt": "self"}], "mit 全队": ["mit", {"tgt": "all"}],
		"shield 自身": ["shield", {"tgt": "self"}], "status 易伤": ["status", {"st": "易伤"}], "status 沉默": ["status", {"st": "沉默"}], "status 狂振": ["status", {"st": "狂振", "allyside": true, "tgt": "choose"}],
		"status 牵连": ["status", {"st": "牵连"}], "status 升华": ["status", {"st": "升华", "allyside": true, "tgt": "choose"}],
		"redirect 全队来源": ["redirect", {"obs": "all", "to": "source", "freq": "every"}], "redirect 自身来源once": ["redirect", {"obs": "self", "to": "source", "freq": "once"}],
		"convert 全队": ["convert", {"obs": "all", "freq": "every"}], "convert 自身": ["convert", {"obs": "self", "freq": "every"}],
		"reflect 全队": ["reflect", {"obs": "all", "mult": 1, "freq": "every"}], "reflect 自身x0": ["reflect", {"obs": "self", "mult": 0, "freq": "every"}],
		"burst 遗志": ["burst", {}], "engine 治疗引爆": ["engine", {"to": "all"}], "tax 收税": ["tax", {}], "regen 回合结算": ["regen", {}],
		"time 打断": ["time", {"op": "interrupt"}], "time 延后": ["time", {"op": "delay", "sec": 6}], "time 提前": ["time", {"op": "advance", "sec": 3}],
		"remove 驱散限时": ["remove", {"what": "限时效果"}], "swap 换位": ["swap", {}],
	}
	var used_words := {}
	var open_ok := {}; var end_ok := {}
	for k in variants:
		open_ok[k] = 0; end_ok[k] = 0
		var sk := R.build(variants[k][0], variants[k][1])
		for w in sk.words:
			used_words[w] = true
	var cost := {}
	for k in variants:
		cost[k] = int(R.build(variants[k][0], variants[k][1]).budget)
	for g in n:
		var m := Match.new()
		m.fast_ai = true
		m.ai_epsilon = 0.12
		m.start(false, seed0 + g, false)
		m.auto_opening()
		var pool0: Dictionary = m.pools[0].duplicate()
		for k in variants:
			var sk := R.build(variants[k][0], variants[k][1])
			if G.missing(sk.words, pool0).is_empty():
				open_ok[k] += 1
		m.run_to_end()
		var pool1: Dictionary = m.pools[0]
		for k in variants:
			var sk2 := R.build(variants[k][0], variants[k][1])
			if G.missing(sk2.words, pool1).is_empty():
				end_ok[k] += 1
	for k in variants:
		print("AV\t%s\t%d\t%d\t%d\t%d" % [k, open_ok[k], end_ok[k], n, cost[k]])
	var unused: Array = []
	for w in Lex.implemented():
		if not used_words.has(w):
			unused.append(w)
	print("IMPL ", Lex.implemented().size(), " TEMPLATEWORDS ", used_words.size())
	print("UNUSED ", ",".join(unused))
	quit(0)

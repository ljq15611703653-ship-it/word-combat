extends SceneTree
# 拼句语法的往返测试：技能树 → 一串牌 → 解析 → 必须得到同一棵树，用的词也必须和 grammar.words_of 完全一致。
# 用法： -- [随机条数] [种子]
const G = preload("res://scripts/core/grammar.gd")
const R = preload("res://scripts/core/recipes.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

var rng := RandomNumberGenerator.new()

func pick(a: Array):
	return a[rng.randi() % a.size()]

# 树的“规范形”：去掉值为 0/false 的可选字段和运行时编号，方便比较
func norm(x):
	if x is Dictionary:
		var o := {}
		for k in x:
			if k in ["id", "_h"]:
				continue
			if k == "observe" and x.get("kind", "") == "watch" and str(x.get("event", "")) in G.NO_OBSERVE:
				continue   # 队友倒下/回合结束这类事件不看观察对象
			var v = norm(x[k])
			if k in ["dbl", "half", "rep", "rep_gap", "delay"] and int(v) == 0:
				continue
			if k == "sync" and not v:
				continue
			o[k] = v
		return o
	if x is Array:
		return x.map(func(e): return norm(e))
	return x

func sorted_words(a: Array) -> Array:
	var b := a.duplicate()
	b.sort()
	return b

var fails := 0
var checked := 0

func check_skill(label: String, sk: Dictionary) -> void:
	checked += 1
	var toks := S.tokens_of_skill(sk.nodes)
	var res := S.analyze(toks)
	if not res.complete:
		fails += 1
		if fails <= 12:
			print("  ✗ 解析失败 ", label, "：", G.describe(sk))
			print("     牌：", toks.map(func(t): return str(t.v)))
		return
	var want = norm(sk.nodes)
	var ok := false
	for cand in res.skills:
		if str(norm(cand)) == str(want):
			ok = true
			break
	if not ok:
		fails += 1
		if fails <= 12:
			print("  ✗ 树不一致 ", label, "：", G.describe(sk))
			print("     解析出的第一棵：", G.describe(G.finalize(G.skill("x", res.skills[0]))))
		return
	var w1 := sorted_words(G.skill_words(sk))
	var w2 := sorted_words(S.words_in(toks))
	if str(w1) != str(w2):
		fails += 1
		if fails <= 12:
			print("  ✗ 词不一致 ", label, "：", G.describe(sk))
			print("     树的词：", w1, "\n     牌的词：", w2)

# ---------------------------------------------------------------- 随机树（覆盖全部节点种类）
func rt(side_pref := "") -> Dictionary:
	var o: Array = pick([["self", "self"], ["choose", "enemy"], ["choose", "ally"], ["all", "enemy"], ["all", "ally"], ["each", "enemy"], ["lowest", "enemy"], ["highest", "ally"], ["first", "enemy"], ["last", "enemy"], ["random", "enemy"], ["other", "ally"]])
	return G.T(o[0], o[1])

func rv(depth := 0, ctx := "") -> Dictionary:
	var r := rng.randf()
	if r < 0.6 or depth > 1:
		return G.N(rng.randi_range(1, 30))
	if r < 0.8:
		return G.REF(pick(["cur_hp", "max_hp", "lost_hp"]), rt())
	return G.OP(pick(["max", "min", "sum", "diff"]), rv(depth + 1), rv(depth + 1))

func mods(n: Dictionary, half := true, rep := true) -> Dictionary:
	if rng.randf() < 0.4:
		n["dbl"] = rng.randi_range(1, 3)
	if half and rng.randf() < 0.1:
		n["half"] = rng.randi_range(1, 2)
	if rep and rng.randf() < 0.3:
		n["rep"] = rng.randi_range(1, 3)
		if rng.randf() < 0.5:
			n["rep_gap"] = rng.randi_range(1, 4)
	if rng.randf() < 0.15:
		n["sync"] = true
	return n

func rdh(kind: String, ctx := "", prev := false) -> Dictionary:
	var v: Dictionary = G.REF("prev") if prev else rv(0, ctx)
	var tgt: Dictionary = rt() if ctx == "" else pick([G.T("source", "ref"), G.T("all", "enemy"), rt()])
	var n: Dictionary = G.dmg(tgt, v, {"alt": pick([0, 0, 1])}) if kind == "dmg" else G.heal(tgt, v, {"alt": pick([0, 0, 1])})
	return mods(n)

func rcond(ctx := "") -> Dictionary:
	if rng.randf() < 0.3:
		return G.has_cond(rt(), pick(G.STATUSES))
	return G.cmp_cond(rv(0, ctx), pick(["lt", "ge"]), rv(0, ctx))

func rnode(depth := 0, ctx := "") -> Dictionary:
	var r := rng.randf()
	var n: Dictionary = {}
	if r < 0.3 or depth > 2:
		n = rdh(pick(["dmg", "heal"]), ctx)
	elif r < 0.37:
		n = G.mit(rt(), pick(["pct", "fixed"]), rng.randi_range(5, 40), pick([0, 0, 6]))
		if rng.randf() < 0.3: n["dbl"] = 1
	elif r < 0.45:
		var st: String = pick(G.STATUSES)
		n = G.status(st, rt(), pick([0, 5]), rng.randi_range(5, 30) if st in ["护盾", "沉默"] else 0, rt() if st == "牵连" else {})
		if rng.randf() < 0.2: n["dbl"] = 1
	elif r < 0.5:
		n = G.remove(pick(["限时效果", "状态"]), rt())
	elif r < 0.56:
		n = G.time_op(pick(["delay", "advance", "interrupt"]), pick(["ally", "enemy"]), rng.randi_range(2, 19))
		if rng.randf() < 0.2: n["dbl"] = 1
	elif r < 0.6:
		n = G.swap(G.T("choose", "ally"))
	elif r < 0.66:
		var a := rng.randi_range(2, 20)
		var b := rng.randi_range(2, 20)
		n = G.split(pick(["dmg", "heal"]), a + b, [{"target": rt(), "part": a, "delay": 0}, {"target": rt(), "part": b, "delay": pick([0, 0, 3])}], pick([0, 1]))
	elif r < 0.72:
		n = G.chain(rdh(pick(["dmg", "heal"]), ctx), rdh(pick(["dmg", "heal"]), ctx, true))
		n.then.target = G.T("choose", "enemy")
	elif r < 0.77:
		n = G.copy_to(rdh(pick(["dmg", "heal"]), ctx), G.T("lowest", "enemy"))
	elif r < 0.82:
		n = G.until_node(rcond(ctx), rdh("dmg", ctx), pick([0, 3]))
	elif r < 0.87:
		n = G.if_node(rcond(ctx), rdh("dmg", ctx), rdh("heal", ctx) if rng.randf() < 0.5 else {})
	elif r < 0.9:
		n = G.pick_one(rdh("dmg", ctx), rdh("heal", ctx))
	else:
		var ev: String = pick(["pending_dmg", "damaged", "dealt", "healed", "lost", "targeted", "cast", "hit", "down", "ally_down", "enemy_down", "round_end", "status_applied", "status_end"])
		var child: Dictionary
		if ev == "pending_dmg" and rng.randf() < 0.5:
			child = G.redirect(pick([G.T("source", "ref"), G.T("highest", "enemy")]), rng.randi_range(5, 40)) if rng.randf() < 0.6 else G.convert_heal(rng.randi_range(5, 40))
			if rng.randf() < 0.3: child["dbl"] = 1
		else:
			child = rnode(depth + 1, ev) if depth < 2 else rdh("dmg", ev)
		n = G.watch(ev, rt(), child, {"freq": pick(["every", "once"]), "life": pick(["round", "dur"]), "dur": rng.randi_range(2, 10)})
		if n.life == "round": n.dur = 0
	if rng.randf() < 0.1 and n.kind in S.DELAYABLE:
		n["delay"] = rng.randi_range(1, 6)
	return n

func _init() -> void:
	Lex.load_all()
	var args := OS.get_cmdline_user_args()
	var count := int(args[0]) if args.size() > 0 else 3000
	rng.seed = int(args[1]) if args.size() > 1 else 1
	# 1. 全部模板（含各种参数组合）
	var t_ok := 0
	for t in R.catalog():
		for trial in 12:
			var p := {}
			for prm in t.params:
				match prm.kind:
					"enum": p[prm.key] = pick(prm.options)[0]
					"int": p[prm.key] = rng.randi_range(int(prm.min), int(prm.max))
					"bool": p[prm.key] = rng.randf() < 0.4
			var sk: Dictionary = R.build(t.id, p)
			check_skill("模板 " + t.id, sk)
			t_ok += 1
	print("模板：检查 %d 条" % t_ok)
	# 2. 随机技能（1~3 个节点，用“并”连接）
	for i in count:
		var nodes: Array = []
		for k in rng.randi_range(1, 3):
			nodes.append(rnode())
		check_skill("随机#%d" % i, G.finalize(G.skill("随机", nodes)))
	print("共检查 %d 条，失败 %d" % [checked, fails])
	quit(1 if fails > 0 else 0)

extends RefCounted
# 拼词时的三类提示（都只依赖“当前拼了哪些牌”和“词库里还有什么词”）：
#   1. options：下一张牌能接什么（词库里有的高亮，没有的单独列出）
#   2. suggestions：按当前拼法，接下来可能的 3 种“流派”整句
#   3. human_hint：到目前为止这句话的“人话版”，还不确定的地方用“某某”（human 版里没填的数字写“（几）”）
#   4. preview_after：先看后拼——接上某一张之后整句会读成什么（拼句台悬停在词上时显示）
# 做法：不停问解析器“下一步能接什么”，随机往下接，直到成句（随机游走），把得到的整句拿来展示或合并。

const G = preload("res://scripts/core/grammar.gd")
const S = preload("res://scripts/compose/sentence.gd")

# 这些词是“可有可无的修饰”：随机补全时降低权重，免得每句都带一堆
const Lex = preload("res://scripts/core/lexicon.gd")
const OPTIONAL_WORDS := ["双倍", "一半", "重复", "间隔", "同时", "每次", "持续", "并", "否则", "之后"]
const OPTIONAL_KEYS := ["dbl", "half", "rep", "rep_gap", "sync", "delay", "gap", "dur"]

static func avail_of(pool: Dictionary, used_tokens: Array) -> Dictionary:
	var a := pool.duplicate()
	for t in used_tokens:
		if t.t == "W":
			a[t.v] = int(a.get(t.v, 0)) - 1
	return a

# 数字牌的默认取值（随机补全用）
static func sample_number(role: String, rng: RandomNumberGenerator) -> int:
	match role:
		"value": return rng.randi_range(4, 20)
		"dur": return rng.randi_range(3, 10)
		"delay": return rng.randi_range(2, 5)
		"gap": return rng.randi_range(2, 4)
		"part": return rng.randi_range(5, 15)
		"alive": return rng.randi_range(1, 3)
	return rng.randi_range(4, 15)

# ------------------------------------------------------------ 1. 下一张牌
# 返回 {complete, words_have:[词], words_miss:[词], numbers:[role], parts:[虚词], skills}
static func options(tokens: Array, avail: Dictionary) -> Dictionary:
	var res := S.analyze(tokens)
	var have: Array = []
	var miss: Array = []
	var nums: Array = []
	var parts: Array = []
	for e in res.expect:
		match e.t:
			"W":
				if int(avail.get(e.v, 0)) > 0:
					have.append(e.v)
				else:
					miss.append(e.v)
			"N":
				if not (e.role in nums):
					nums.append(e.role)
			"P":
				parts.append(e.v)
	return {"complete": res.complete, "words_have": have, "words_miss": miss, "numbers": nums, "parts": parts, "skills": res.skills}

# ------------------------------------------------------------ 随机游走补全
# first：强制的下一张牌（可空）。返回 {ok, tokens, added:[新增的牌]}
# strict=false（只给“先看后拼”的预览用）：不挑句子像不像样，只要合语法就收——比如“给敌人回血”也照样读给你听
static func walk(tokens: Array, avail_in: Dictionary, rng: RandomNumberGenerator, first: Dictionary = {}, max_extra: int = 36, strict: bool = true) -> Dictionary:
	var toks: Array = tokens.duplicate()
	var avail := avail_in.duplicate()
	var added: Array = []
	var forced := first
	for step in max_extra:
		var res := S.analyze(toks)
		if res.complete and forced.is_empty():
			# 已经成句：越长越想停下；只剩“可有可无的修饰”可接时更倾向停
			var only_opt := true
			for e0 in res.expect:
				if not (e0.t == "W" and e0.v in OPTIONAL_WORDS):
					only_opt = false
			var stop_p := (0.88 if only_opt else 0.5) + 0.03 * added.size()
			if (rng.randf() < stop_p or res.expect.is_empty()) and (not strict or good(res.skills[0])):
				return {"ok": true, "tokens": toks, "added": added, "skills": res.skills}
		var cands: Array = []
		var weights: Array = []
		for e in res.expect:
			var tok: Dictionary = {}
			match e.t:
				"W":
					if int(avail.get(e.v, 0)) <= 0:
						continue
					tok = S.W(e.v)
				"N":
					tok = S.Num(sample_number(e.role, rng))
				"P":
					if e.v in ["（", "）"]:
						continue      # 括号不用于随机补全
					tok = S.Part(e.v)
			if not forced.is_empty():
				if not (forced.t == tok.t and (tok.t == "N" or forced.v == tok.v)):
					continue
				tok = forced
			cands.append(tok)
			var wgt := 1.0
			if e.t == "W" and e.v in OPTIONAL_WORDS:
				wgt = 0.12
			elif e.t == "W" and e.v in ["加上", "减去", "较高者", "较低者", "差值"]:
				wgt = 0.03        # 运算词不拿来随机补全（太绕）
			elif e.t == "W" and Lex.words.has(e.v) and str(Lex.words[e.v].cat) == "引用":
				wgt = 0.15        # 引用类的词也少一点，优先给直接填数字的写法
			weights.append(wgt)
		if cands.is_empty():
			if res.complete and (not strict or good(res.skills[0])):
				return {"ok": true, "tokens": toks, "added": added, "skills": res.skills}
			return {"ok": false, "tokens": toks, "added": added}
		forced = {}
		var total := 0.0
		for w in weights:
			total += float(w)
		var r := rng.randf() * total
		var idx := 0
		for k in cands.size():
			r -= float(weights[k])
			if r <= 0.0:
				idx = k
				break
		var chosen: Dictionary = cands[idx]
		toks.append(chosen)
		added.append(chosen)
		if chosen.t == "W":
			avail[chosen.v] = int(avail.get(chosen.v, 0)) - 1
	var fin := S.analyze(toks)
	return {"ok": fin.complete and (not strict or good(fin.skills[0])), "tokens": toks, "added": added, "skills": fin.skills}

# ------------------------------------------------------------ 2. 三种流派的整句
# 返回 [{tokens, added, text, school}]，每条的 added 是“还没拼的部分”
static func suggestions(tokens: Array, avail: Dictionary, count: int, seed_val: int) -> Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var opt := options(tokens, avail)
	var out: Array = []
	var seen := {}
	# 以“下一张词牌”为流派的分界：每种不同的下一张牌，各试几次
	var firsts: Array = []
	for w in opt.words_have:
		firsts.append(S.W(w))
	# 打乱，但把“可有可无的修饰”放后面
	firsts.shuffle()
	firsts.sort_custom(func(a, b): return (a.v in OPTIONAL_WORDS) < (b.v in OPTIONAL_WORDS))
	if opt.complete and firsts.is_empty():
		return out
	var tries := 0
	var fi := 0
	while out.size() < count and tries < 28:
		tries += 1
		var first: Dictionary = {}
		if not firsts.is_empty():
			first = firsts[fi % firsts.size()]
			fi += 1
		elif not opt.numbers.is_empty():
			first = S.Num(sample_number(opt.numbers[0], rng))
		var w := walk(tokens, avail, rng, first)
		if not w.ok or w.added.is_empty():
			continue
		var text := text_of(w.skills[0])
		if seen.has(text):
			continue
		seen[text] = true
		out.append({"tokens": w.tokens, "added": w.added, "text": text, "school": _school(w.skills[0])})
	return out

static func text_of(nodes: Array) -> String:
	return G.describe(G.skill("x", nodes))

# 一句话的“流派”标签：看主节点
static func _school(nodes: Array) -> String:
	var n: Dictionary = nodes[0]
	match n.kind:
		"dmg": return "进攻"
		"heal": return "治疗"
		"mit": return "防守"
		"status": return "状态"
		"watch": return "埋伏"
		"time": return "时间术"
		"split", "copy", "chain", "until": return "连招"
		"remove", "swap": return "控场"
		"if", "choose": return "分支"
	return "其他"

# ------------------------------------------------------------ 3. “到目前为止”的人话
static func human_hint(tokens: Array, avail: Dictionary, seed_val: int = 5, samples: int = 10, strict: bool = true) -> Dictionary:
	if tokens.is_empty():
		return {"text": "某某", "ok": true, "known": 0}
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var res := S.analyze(tokens)
	if res.complete:
		# 已经是完整的一句话：就按真实的树显示，不再和“可能的补全”合并（否则双倍、重复这类可选修饰会被当成“不确定”而丢掉）
		var full := G.describe(G.skill("x", res.skills[0]))
		return {"text": full, "ok": true, "merged": res.skills[0], "samples": 1, "human": humanize(full), "complete": true}
	var trees: Array = []
	var opt_first: Array = []
	for e in res.expect:
		# 加上/减去 是接在数字后面的“可有可无”：不拿来强行分岔，否则刚填的数字永远显示成“（多少）”
		if e.t == "W" and int(avail.get(e.v, 0)) > 0 and not (e.v in ["加上", "减去"]):
			opt_first.append(S.W(e.v))
	var tries := 0
	while trees.size() < samples and tries < samples * 3:
		tries += 1
		var first: Dictionary = {}
		if not opt_first.is_empty() and rng.randf() < 0.7:
			first = opt_first[rng.randi() % opt_first.size()]
		var w := walk(tokens, avail, rng, first, 36, strict)
		if w.ok and not w.skills.is_empty():
			trees.append(w.skills[0])
	if trees.is_empty():
		return {"text": "", "ok": false}
	var merged: Array = _merge_list(trees)
	# human：给玩家看的那一版——没填的数字写成“（几）”，没定的阵营写成“（哪方）”（只用来显示，不回传树）
	var holey: Array = _merge_list(trees, true)
	return {"text": G.describe(G.skill("x", merged)), "ok": true, "merged": merged, "samples": trees.size(),
		"human": humanize(G.describe(G.skill("x", holey)))}

# ------------------------------------------------------------ 4. 先看后拼：接上某一张之后，整句读起来是什么
# 只做显示用的少量随机补全（默认 5 个样本），调用方按“当前这一串牌”缓存，不要每帧算。
# 返回 {ok, text, complete, odd}：ok=false 表示接上这张后，用你现有的词拼不出整句（会卡住）；
# odd=true 表示合语法、但补不出“像样”的句子（比如给敌人回血），读出来让玩家自己判断
static func preview_after(tokens: Array, tok: Dictionary, avail: Dictionary, samples: int = 5) -> Dictionary:
	var toks: Array = tokens.duplicate()
	toks.append(tok)
	var a := avail.duplicate()
	if str(tok.get("t", "")) == "W":
		a[tok.v] = int(a.get(tok.v, 0)) - 1
	return preview_of(toks, a, samples)

# 任意一串牌（比如把某张数字牌改了之后）的预览；avail 是这串牌用掉之后还剩的词
static func preview_of(toks: Array, a: Dictionary, samples: int = 5) -> Dictionary:
	var res := S.analyze(toks)
	if res.complete:
		return {"ok": true, "complete": true, "text": humanize(G.describe(G.skill("x", res.skills[0])))}
	var h := human_hint(toks, a, 5, samples)
	var odd := false
	if not bool(h.get("ok", false)):
		# 像样的整句拼不出来：放宽到“合语法就行”再试一次，读出来让玩家自己判断（比如给敌人回血）
		h = human_hint(toks, a, 7, maxi(2, samples - 2), false)
		odd = true
	if not bool(h.get("ok", false)):
		return {"ok": false, "complete": false, "odd": false, "text": ""}
	return {"ok": true, "complete": false, "odd": odd, "text": str(h.get("human", h.get("text", "")))}

# 把人话里的“未定”写得更像人话：数字空位 →（几），阵营空位 →（哪方），数值写法未定 →（多少）
const HOLE_N := 9999      # 只在 holes 合并里出现：时长/间隔/延后/分到的点数还没填
static func humanize(text: String) -> String:
	var s := text
	s = s.replace("降低 某某", "降低（几成）")
	s = s.replace("造成与 某某 相等的伤害", "造成（多少）伤害")
	s = s.replace("恢复与 某某 相等的生命", "恢复（多少）生命")
	s = s.replace(" %d " % HOLE_N, "（几）")
	s = s.replace(" %d" % HOLE_N, "（几）")
	s = s.replace("%d " % HOLE_N, "（几）")
	s = s.replace(str(HOLE_N), "（几）")
	for unit in ["点", "秒", "个"]:
		s = s.replace(" 某某 " + unit, "（几）" + unit)
	var re := RegEx.new()
	re.compile("(减少|增加) 某某(?=$|，|；|（)")
	s = re.sub(s, "$1（几）", true)
	s = s.replace(" -1 ", "（几）")
	s = s.replace("某某的某某", "（多少）")
	s = s.replace("某某随从", "（哪方）随从")
	return s

static func _merge_list(trees: Array, holes: bool = false) -> Array:
	var cnt: int = 99
	for t in trees:
		cnt = mini(cnt, t.size())
	var out: Array = []
	for k in cnt:
		var col: Array = []
		for t in trees:
			col.append(t[k])
		out.append(_merge(col, holes))
	return out

# 这些键是“数字空位”：所有样本都有、都大于 0、只是数不同 → 说明这里一定要填一个数，只是还没填
const HOLE_KEYS := ["delay", "dur", "gap", "rep_gap", "part", "total"]

# 把若干棵“长得差不多”的树合成一棵：处处一致的地方保留，不一致的地方变成“某某”
# holes=true（只用于显示）：时长/间隔这类“一定有、但数还没填”的地方保留成 HOLE_N，而不是整段丢掉
static func _merge(vals: Array, holes: bool = false):
	var first = vals[0]
	if first is Dictionary:
		for v in vals:
			if not (v is Dictionary):
				return "某某"
		# 节点种类都不同 → 整个节点未定，但如果大家的“目标”相同就保留目标
		var kinds := {}
		for v in vals:
			kinds[str(v.get("kind", ""))] = true
		if kinds.size() > 1:
			var hole := {"kind": "hole"}
			var tg := []
			for v in vals:
				if v.has("target"):
					tg.append(v.target)
			if tg.size() == vals.size() and str(_merge(tg)) == str(tg[0]):
				hole["target"] = tg[0]
			return hole
		var keys := {}
		for v in vals:
			for k in v:
				keys[k] = true
		var out := {}
		for k in keys:
			var col: Array = []
			var all_have := true
			for v in vals:
				if v.has(k):
					col.append(v[k])
				else:
					all_have = false
			if not all_have:
				continue   # 有的样本有、有的没有（可选修饰）：不显示
			if holes and k in HOLE_KEYS and not _all_equal(col) and _all_positive_ints(col):
				out[k] = HOLE_N
				continue
			var m = _merge(col, holes)
			if k in OPTIONAL_KEYS and not _all_equal(col):
				continue
			out[k] = m
		return out
	if first is Array:
		var cnt := 99
		for v in vals:
			if not (v is Array):
				return "某某"
			cnt = mini(cnt, v.size())
		var arr: Array = []
		for k in cnt:
			var col2: Array = []
			for v in vals:
				col2.append(v[k])
			arr.append(_merge(col2, holes))
		return arr
	if _all_equal(vals):
		return first
	if first is int or first is float:
		return -1       # 数字未定
	return "某某"      # 词/名称未定

static func _all_positive_ints(vals: Array) -> bool:
	for v in vals:
		if not (v is int) or int(v) <= 0:
			return false
	return true

static func _all_equal(vals: Array) -> bool:
	for v in vals:
		if str(v) != str(vals[0]):
			return false
	return true


# ------------------------------------------------------------ 句子质量：随机补出来的句子要“像样”
# 只用于提示（补全和人话），不影响玩家自己能拼什么。
static func good(nodes: Array) -> bool:
	var sk: Dictionary = G.finalize(G.skill("x", nodes.duplicate(true)))
	if not G.problems(sk).is_empty():
		return false
	for n in nodes:
		if _junk(n, false):
			return false
	return true

static func _junk_value(v: Dictionary) -> bool:
	if v.get("k", "") == "ref" and v.ref in ["cur_hp", "max_hp", "lost_hp", "round_taken", "remaining", "count"] and not v.has("of"):
		return true
	if v.get("k", "") == "ref" and v.has("of") and v.ref != "count" and v.of.pick in ["all", "each", "adjacent"]:
		return true
	if v.get("k", "") == "op":
		return _junk_value(v.a) or _junk_value(v.b)
	return false

static func _junk(n: Dictionary, in_watch: bool) -> bool:
	match n.get("kind", ""):
		"dmg":
			if _junk_value(n.value):
				return true
			var t: Dictionary = n.target
			if not in_watch and (t.pick == "self" or t.side == "ally"):
				return true
		"heal":
			if _junk_value(n.value):
				return true
			if n.target.side == "enemy":
				return true
		"mit":
			if n.target.side == "enemy":
				return true
		"swap":
			if n.target.pick in ["self", "all", "each", "adjacent", "random"]:
				return true
		"time":
			if n.op in ["delay", "interrupt"] and n.side == "ally":
				return true
			if n.op == "advance" and n.side == "enemy":
				return true
		"watch":
			return _junk(n.child, true)
		"chain", "copy":
			return _junk(n.first, in_watch) or (n.kind == "chain" and _junk(n.then, in_watch))
		"until":
			return _junk(n.child, in_watch)
		"if":
			return _junk(n.then, in_watch) or (n.has("else") and _junk(n["else"], in_watch))
		"choose":
			return _junk(n.a, in_watch) or _junk(n.b, in_watch)
	return false

extends RefCounted
# 模糊匹配：玩家随便扔一堆词，电脑告诉他
#   1. 刚好用完这些词，能拼成什么句子、怎么摆；
#   2. 只用这些词，最多能用上几张、哪几张用不上；
#   3. 再补几张词就能把这些词全用上，补哪几张；
#   4. 以上都不行时，预测他大概想拼什么。
# 做法：束搜索——每个半成品只分析一次（得到“下一张能接什么”），向外扩展，按“用上了多少托盘里的词”打分。
# 数字牌用示例值（拼好后玩家自己改）。

const S = preload("res://scripts/compose/sentence.gd")
const H = preload("res://scripts/compose/hints.gd")
const G = preload("res://scripts/core/grammar.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

const BEAM := 28
const NUM_SAMPLE := {"value": 10, "dur": 5, "delay": 3, "gap": 2, "part": 6, "alive": 1}

var host: Node = null        # 用来在帧之间让出时间（可空：同步跑完）
var _tick := 0
var cancelled := false

static func _count(words: Array) -> Dictionary:
	var c := {}
	for w in words:
		c[w] = int(c.get(w, 0)) + 1
	return c

# 可以作为“补充词”的词：已实现、不是关键词
static func extra_words() -> Array:
	Lex.load_all()
	var out: Array = []
	for w in Lex.implemented():
		if str(Lex.words[w].cat) == "关键词":
			continue
		out.append(w)
	return out

func _yield() -> void:
	_tick += 1
	if host != null and _tick % 6 == 0 and host.is_inside_tree():
		await host.get_tree().process_frame

# 一轮束搜索：返回所有搜到的“完整句子”
func _beam(tray: Array, max_add: int, depth_cap: int) -> Array:
	var tray_cnt := _count(tray)
	var extras: Array = extra_words() if max_add > 0 else []
	var beam: Array = [{"tokens": [], "used": {}, "n_used": 0, "added": [], "score": 0.0}]
	var done := {}
	var found: Array = []
	for depth in depth_cap:
		if cancelled:
			break
		var nxt: Array = []
		var seen := {}
		for p in beam:
			await _yield()
			var res := S.analyze(p.tokens)
			if res.complete and not p.tokens.is_empty() and _valid(res.skills[0]):
				var key := JSON.stringify(p.tokens.map(func(t): return t.v))
				if not done.has(key):
					done[key] = true
					found.append({"tokens": p.tokens, "used": p.used, "n_used": p.n_used, "added": p.added, "nodes": res.skills[0]})
			for e in res.expect:
				var tok: Dictionary = {}
				var used: Dictionary = p.used
				var n_used: int = p.n_used
				var added: Array = p.added
				var sc: float = p.score
				match e.t:
					"W":
						var left: int = int(tray_cnt.get(e.v, 0)) - int(used.get(e.v, 0))
						if left > 0:
							tok = S.W(e.v)
							used = used.duplicate()
							used[e.v] = int(used.get(e.v, 0)) + 1
							n_used += 1
							sc += 3.0
						elif max_add > 0 and added.size() < max_add and (e.v in extras):
							tok = S.W(e.v)
							added = added.duplicate()
							added.append(e.v)
							sc -= 2.2
						else:
							continue
					"N":
						tok = S.Num(int(NUM_SAMPLE.get(e.role, 5)))
						sc -= 0.05
					"P":
						if e.v in ["（", "）"]:
							continue
						tok = S.Part(e.v)
						sc -= 0.05
				var toks: Array = p.tokens.duplicate()
				toks.append(tok)
				var k2 := JSON.stringify(toks.map(func(t): return t.v))
				if seen.has(k2):
					continue
				seen[k2] = true
				nxt.append({"tokens": toks, "used": used, "n_used": n_used, "added": added, "score": sc - 0.04 * toks.size()})
		if nxt.is_empty():
			break
		nxt.sort_custom(func(a, b): return a.score > b.score)
		beam = nxt.slice(0, BEAM)
	# 最后一层里剩下的也可能已经成句
	for p2 in beam:
		var r2 := S.analyze(p2.tokens)
		if r2.complete and not p2.tokens.is_empty() and _valid(r2.skills[0]):
			var kk := JSON.stringify(p2.tokens.map(func(t): return t.v))
			if not done.has(kk):
				done[kk] = true
				found.append({"tokens": p2.tokens, "used": p2.used, "n_used": p2.n_used, "added": p2.added, "nodes": r2.skills[0]})
	return found

# 合法就行（玩家想对自己造成伤害也是他的自由）；是否“像样”只用来排序
static func _valid(nodes: Array) -> bool:
	return G.problems(G.finalize(G.skill("x", nodes.duplicate(true)))).is_empty()

# 把搜到的句子整理成给玩家看的条目
func _entry(f: Dictionary, tray: Array) -> Dictionary:
	var unused: Array = []
	var cnt := _count(tray)
	for w in cnt:
		var left: int = int(cnt[w]) - int(f.used.get(w, 0))
		for i in left:
			unused.append(w)
	return {"tokens": f.tokens, "text": G.describe(G.skill("x", f.nodes)), "added": f.added, "unused": unused, "n_used": f.n_used, "sensible": H.good(f.nodes)}

# 主入口。tray：托盘里的词（可重复）。返回
# {exact:[条目], partial:[条目], completed:[条目], guess:条目或{}, message:字符串}
func solve(tray: Array) -> Dictionary:
	cancelled = false
	_tick = 0
	var out := {"exact": [], "partial": [], "completed": [], "guess": {}, "message": ""}
	if tray.is_empty():
		out.message = "托盘是空的：先从下面把词点进托盘。"
		return out
	var depth := tray.size() + 5
	# 第一轮：只用托盘里的词
	var found: Array = await _beam(tray, 0, depth)
	var ents: Array = []
	for f in found:
		ents.append(_entry(f, tray))
	ents.sort_custom(func(a, b):
		if a.n_used != b.n_used:
			return a.n_used > b.n_used
		if a.sensible != b.sensible:
			return a.sensible
		return a.tokens.size() < b.tokens.size())
	var seen := {}
	for e in ents:
		if seen.has(e.text):
			continue
		seen[e.text] = true
		if e.unused.is_empty():
			if out.exact.size() < 3:
				out.exact.append(e)
		elif out.partial.size() < 3:
			out.partial.append(e)
	if not out.exact.is_empty():
		out.message = "这些词刚好能拼成一句话（全部用上了）。"
		return out
	# 第二轮：允许补充几张词，把托盘里的词都用上
	for add in [2, 4]:
		var found2: Array = await _beam(tray, add, depth + add)
		var ents2: Array = []
		for f2 in found2:
			ents2.append(_entry(f2, tray))
		ents2.sort_custom(func(a, b):
			if a.unused.size() != b.unused.size():
				return a.unused.size() < b.unused.size()
			if a.sensible != b.sensible:
				return a.sensible
			if a.added.size() != b.added.size():
				return a.added.size() < b.added.size()
			return a.tokens.size() < b.tokens.size())
		var seen2 := {}
		for e2 in ents2:
			if seen2.has(e2.text) or e2.added.is_empty():
				continue
			seen2[e2.text] = true
			if e2.unused.is_empty() and out.completed.size() < 3:
				out.completed.append(e2)
			elif out.guess.is_empty():
				out.guess = e2
		if not out.completed.is_empty():
			break
	if not out.completed.is_empty():
		out.message = "只用这些词拼不成完整的一句，但再补几张就行（红框的是要补的）。"
	elif not out.partial.is_empty():
		out.message = "只用这些词能拼成一句，但有几张用不上。"
	elif not out.guess.is_empty():
		out.message = "这些词凑不成完整的句子。我猜你想拼的是下面这句，还差几张。"
	else:
		out.message = "这些词暂时凑不成一句话。试试放一个目标词（比如“自身”“全部 敌方 随从”）和一个动作词（比如“造成”“恢复”）。"
	return out

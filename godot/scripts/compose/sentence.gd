extends RefCounted
# 句子语法：把“一串词牌”解析成技能树，并告诉你“下一步还能接什么”。
#
# 玩家拼出来的是一串牌（token）：
#   词牌 {"t":"W","v":"造成"}    —— 词库里的词，会消耗词
#   数字牌 {"t":"N","v":14}      —— 手填的数字，填完变成一张牌烙上去
#   虚词牌 {"t":"P","v":"低于"}  —— 免费的小连接牌（低于/不低于/每次固定），不消耗词
#
# 解析器是“成功列表”式的递归下降：每个产生式返回所有可能的 {i: 读到哪, v: 语义值}。
# 读到输入末尾时，所有“想要的下一张牌”都被记进 expect，这就是“下一个能接的词”。
# 生成的技能树和引擎、模板、AI 用的是同一种树（grammar.gd），词的统计也由 grammar.words_of 给出，
# 所以这里不碰任何规则，只是“用接词的方式表达同一棵树”。

const G = preload("res://scripts/core/grammar.gd")

const PICKS := [["最低生命", "lowest"], ["最高生命", "highest"], ["最前", "first"],
	["最后", "last"], ["随机", "random"], ["另一个", "other"], ["相邻", "adjacent"]]
const SIDES := [["友方", "ally"], ["敌方", "enemy"]]
const OPS := [["较高者", "max"], ["较低者", "min"], ["差值", "diff"]]      # 前缀：较高者 A B
const INFIX := [["加上", "sum"], ["减去", "sub"]]                              # 中缀：A 加上 B 减去 C，从左到右
const PAREN_L := "（"
const PAREN_R := "）"
const TARGET_REFS := ["cur_hp", "max_hp", "lost_hp", "round_taken", "remaining"]      # 人数写成“敌方人数/友方人数”
const SIMPLE_REFS := ["event_damage", "event_heal", "actual", "raw", "overflow", "ap", "paid", "invested", "times"]
const EVENTS := [["即将受到伤害", "pending_dmg"], ["受到伤害", "damaged"], ["造成伤害", "dealt"], ["恢复生命", "healed"],
	["失去生命", "lost"], ["被选为目标", "targeted"], ["发动技能", "cast"], ["技能命中", "hit"], ["状态施加", "status_applied"],
	["状态结束", "status_end"], ["倒下", "down"], ["队友倒下", "ally_down"], ["敌人倒下", "enemy_down"], ["回合结束", "round_end"]]
const DELAYABLE := ["dmg", "heal", "mit", "status", "remove", "watch", "time", "swap"]
const MAX_NODES := 6

var toks: Array = []
var n := 0
var expect := {}
var _memo := {}

# ------------------------------------------------------------ 牌的构造与判断
static func W(v: String) -> Dictionary:
	return {"t": "W", "v": v}

static func Num(v: int) -> Dictionary:
	return {"t": "N", "v": v}

static func Part(v: String) -> Dictionary:
	return {"t": "P", "v": v}

static func same(a: Dictionary, b: Dictionary) -> bool:
	return a.t == b.t and a.v == b.v

# ------------------------------------------------------------ 对外接口
# 分析一串牌：返回 {complete, skills:[[节点...]], expect:[{t,v,role}], count}
static func analyze(tokens: Array) -> Dictionary:
	var p = load("res://scripts/compose/sentence.gd").new()
	return p._run(tokens)

func _run(tokens: Array) -> Dictionary:
	toks = tokens
	n = tokens.size()
	expect = {}
	_memo = {}
	var skills: Array = []
	for st in _skill():
		if int(st.i) == n:
			skills.append(st.nodes.duplicate(true))
	var exp: Array = []
	for k in expect:
		exp.append(expect[k])
	return {"complete": not skills.is_empty(), "skills": skills, "expect": exp}

# ------------------------------------------------------------ 终结符
func _want(t: String, v: String, role: String = "") -> void:
	expect["%s:%s:%s" % [t, v, role]] = {"t": t, "v": v, "role": role}

func _w(i: int, name: String) -> bool:
	if i >= n:
		_want("W", name)
		return false
	return toks[i].t == "W" and toks[i].v == name

func _p(i: int, name: String) -> bool:
	if i >= n:
		_want("P", name)
		return false
	return toks[i].t == "P" and toks[i].v == name

func _num(i: int, role: String) -> int:
	if i >= n:
		_want("N", "", role)
		return -1
	if toks[i].t == "N":
		return int(toks[i].v)
	return -1

func _count_words(i: int, word: String, maxn: int) -> Array:
	var out: Array = [{"i": i, "n": 0}]
	var j := i
	for k in maxn:
		if _w(j, word):
			j += 1
			out.append({"i": j, "n": k + 1})
		else:
			break
	return out

# ------------------------------------------------------------ 目标
func _side(i: int, only: String = "") -> Array:
	var out: Array = []
	for s in SIDES:
		if only != "" and s[1] != only:
			continue
		if _w(i, s[0]):
			out.append({"i": i + 1, "v": s[1]})
	return out

func p_target(i: int, c: Dictionary) -> Array:
	var key := "T%d|%s" % [i, str(c.get("watch", false))]
	if _memo.has(key):
		return _memo[key]
	var out: Array = []
	if _w(i, "自身"):
		out.append({"i": i + 1, "v": G.T("self", "self")})
	if c.get("watch", false):
		if _w(i, "来源"):
			out.append({"i": i + 1, "v": G.T("source", "ref")})
		if _w(i, "接受者"):
			out.append({"i": i + 1, "v": G.T("recipient", "ref")})
	if _w(i, "选择"):
		var j := i + 1
		var cnt := 0
		while cnt < G.MAX_PICK and _w(j, "一个"):
			cnt += 1
			j += 1
		if cnt >= 1:
			for s in _side(j):
				if _w(s.i, "随从"):
					out.append({"i": s.i + 1, "v": G.T("choose", s.v, {"n": cnt} if cnt > 1 else {})})
	for pk in PICKS:
		if pk[1] == "adjacent" and not c.get("watch", false):
			continue
		if _w(i, pk[0]):
			for s in _side(i + 1, "ally" if pk[1] == "other" else ""):
				if _w(s.i, "随从"):
					out.append({"i": s.i + 1, "v": G.T(pk[1], s.v)})
	_memo[key] = out
	return out

# ------------------------------------------------------------ 数值
func _ref_ok(ref: String, c: Dictionary) -> bool:
	var ev: String = str(c.get("event", ""))
	match ref:
		"event_damage", "actual", "raw": return ev in ["damaged", "dealt", "lost", "pending_dmg"]
		"event_heal", "overflow": return ev == "healed"
		"times": return bool(c.get("watch", false))
	return true

# 数值式：项 { (加上|减去) 项 }，从左到右；项 = 数字 / 引用 / 敌方人数 / 前缀运算 / （数值式）
func p_value(i: int, c: Dictionary, _depth: int = 0, allow_prev: bool = false) -> Array:
	var key := "V%d|%s|%s|%s" % [i, str(c.get("watch", false)), str(c.get("event", "")), str(allow_prev)]
	if _memo.has(key):
		return _memo[key]
	var done: Array = []
	var cur: Array = []
	for t in p_term(i, c):
		cur.append({"i": t.i, "v": t.v})
	for _k in G.MAX_TERMS:
		var nxt: Array = []
		for st in cur:
			done.append(st)
			for op in INFIX:
				if _w(st.i, op[0]):
					for t2 in p_term(st.i + 1, c):
						var nv: Dictionary = G.OP(op[1], st.v, t2.v)
						if G.value_terms(nv) <= G.MAX_TERMS:
							nxt.append({"i": t2.i, "v": nv})
		cur = nxt
	for st2 in cur:
		done.append(st2)
	if allow_prev:
		done.append({"i": i, "v": G.REF("prev")})
	_memo[key] = done
	return done

func p_term(i: int, c: Dictionary) -> Array:
	var key := "M%d|%s|%s" % [i, str(c.get("watch", false)), str(c.get("event", ""))]
	if _memo.has(key):
		return _memo[key]
	var out: Array = []
	var k := _num(i, "value")
	if k >= 0:
		out.append({"i": i + 1, "v": G.N(k)})
	for ref in SIMPLE_REFS:
		if _ref_ok(ref, c) and _w(i, G.REF_WORD[ref]):
			out.append({"i": i + 1, "v": G.REF(ref)})
	for s in SIDES:
		if _w(i, s[0] + "人数"):
			out.append({"i": i + 1, "v": G.REF("count", G.T("all", s[1]))})
	for ref in TARGET_REFS:
		var rw: String = G.REF_WORD[ref]
		if _w(i, rw):
			out.append({"i": i + 1, "v": G.REF(ref)})
	for t in p_target(i, c):
		if t.v.pick == "choose" and int(t.v.get("n", 1)) > 1:
			continue      # 数值里的“选择 一个”只能选一个人
		for ref in TARGET_REFS:
			if _w(t.i, G.REF_WORD[ref]):
				out.append({"i": t.i + 1, "v": G.REF(ref, t.v)})
	for op in OPS:
		if _w(i, op[0]):
			for a in p_term(i + 1, c):
				for b in p_term(a.i, c):
					out.append({"i": b.i, "v": G.OP(op[1], a.v, b.v)})
	if _p(i, PAREN_L):
		for e in p_value(i + 1, c):
			if _p(e.i, PAREN_R):
				out.append({"i": e.i + 1, "v": e.v})
	_memo[key] = out
	return out

func p_cond(i: int, c: Dictionary) -> Array:
	var out: Array = []
	if _w(i, "已生效"):
		for st in G.STATUSES:
			if _w(i + 1, st):
				for t in p_target(i + 2, c):
					out.append({"i": t.i, "v": G.has_cond(t.v, st)})
	for l in p_value(i, c):
		if _p(l.i, "低于"):
			for r in p_value(l.i + 1, c):
				out.append({"i": r.i, "v": G.cmp_cond(l.v, "lt", r.v)})
		if _p(l.i, "不低于"):
			for r2 in p_value(l.i + 1, c):
				out.append({"i": r2.i, "v": G.cmp_cond(l.v, "ge", r2.v)})
	return out

# ------------------------------------------------------------ 节点
func p_node(i: int, c: Dictionary, kinds: Array = [], allow_prev: bool = false) -> Array:
	var key := "N%d|%s|%s|%s|%s" % [i, str(c.get("watch", false)), str(c.get("event", "")), str(kinds), str(allow_prev)]
	if _memo.has(key):
		return _memo[key]
	var out: Array = []
	var starts: Array = [{"i": i, "delay": 0}]
	if _w(i, "之后"):
		var d := _num(i + 1, "delay")
		if d >= 1:
			starts.append({"i": i + 2, "delay": d})
	for s in starts:
		for r in _body(s.i, c, allow_prev):
			var node: Dictionary = r.v
			if not kinds.is_empty() and not (node.kind in kinds):
				continue
			if int(s.delay) > 0:
				if not (node.kind in DELAYABLE):
					continue
				node = node.duplicate(true)
				node["delay"] = int(s.delay)
			out.append({"i": r.i, "v": node})
	_memo[key] = out
	return out

func _body(i: int, c: Dictionary, allow_prev: bool) -> Array:
	var out: Array = []
	for t in p_target(i, c):
		var j: int = t.i
		out.append_array(_dmgheal(j, c, t.v, allow_prev))
		out.append_array(_mit(j, t.v))
		out.append_array(_status(j, c, t.v))
		if _w(j, "移除"):
			for what in ["限时效果", "状态"]:
				if _w(j + 1, what):
					out.append({"i": j + 2, "v": G.remove(what, t.v)})
	out.append_array(_watch(i, c))
	out.append_array(_redirect_convert(i, c))
	out.append_array(_time(i))
	if _w(i, "换位"):
		for t2 in p_target(i + 1, c):
			out.append({"i": t2.i, "v": G.swap(t2.v)})
	out.append_array(_split(i, c))
	if _w(i, "接续"):
		for f in p_node(i + 1, c, ["dmg", "heal"]):
			for th in p_node(f.i, c, [], true):
				out.append({"i": th.i, "v": G.chain(f.v, th.v)})
	if _w(i, "复制"):
		for f2 in p_node(i + 1, c, ["dmg", "heal"]):
			for t3 in p_target(f2.i, c):
				out.append({"i": t3.i, "v": G.copy_to(f2.v, t3.v)})
	if _w(i, "直到"):
		for cd in p_cond(i + 1, c):
			var gaps: Array = [{"i": cd.i, "gap": 0}]
			if _w(cd.i, "间隔"):
				var g := _num(cd.i + 1, "gap")
				if g >= 1:
					gaps.append({"i": cd.i + 2, "gap": g})
			for gp in gaps:
				for ch in p_node(gp.i, c, ["dmg", "heal", "mit", "status", "split", "chain", "copy"]):
					out.append({"i": ch.i, "v": G.until_node(cd.v, ch.v, int(gp.gap))})
	# 若 条件 效果 [否则 效果]；若有 阵营 随从 个数 效果 [否则 效果]（“若有”自己就是条件，前面不再加“若”）
	var conds: Array = []
	if _w(i, "若"):
		conds.append_array(p_cond(i + 1, c))
	if _w(i, "若有"):
		for s0 in _side(i + 1):
			if _w(s0.i, "随从"):
				var an := _num(s0.i + 1, "alive")
				if an >= 1:
					conds.append({"i": s0.i + 2, "v": G.alive_cond(s0.v, an)})
	for cd2 in conds:
		for th2 in p_node(cd2.i, c):
			out.append({"i": th2.i, "v": G.if_node(cd2.v, th2.v)})
			if _w(th2.i, "否则"):
				for el in p_node(th2.i + 1, c):
					out.append({"i": el.i, "v": G.if_node(cd2.v, th2.v, el.v)})
	if _w(i, "择一"):
		for a in p_node(i + 1, c):
			for b in p_node(a.i, c):
				out.append({"i": b.i, "v": G.pick_one(a.v, b.v)})
	return out

# ---- 伤害 / 治疗：目标 造成 数值 伤害 [双倍 一半 重复 间隔 同时]
func _mods(i: int, allow_half: bool, allow_rep: bool, allow_sync: bool, max_dbl: int = 3) -> Array:
	var out: Array = []
	for d in _count_words(i, "双倍", max_dbl):
		var halves: Array = _count_words(d.i, "一半", 2) if allow_half else [{"i": d.i, "n": 0}]
		for h in halves:
			var reps: Array = _count_words(h.i, "重复", 3) if allow_rep else [{"i": h.i, "n": 0}]
			for r in reps:
				var gaps: Array = [{"i": r.i, "gap": 0}]
				if int(r.n) > 0 and _w(r.i, "间隔"):
					var g := _num(r.i + 1, "gap")
					if g >= 1:
						gaps.append({"i": r.i + 2, "gap": g})
				for gp in gaps:
					var syncs: Array = [{"i": gp.i, "s": false}]
					if allow_sync and _w(gp.i, "同时"):
						syncs.append({"i": gp.i + 1, "s": true})
					for sy in syncs:
						var m := {}
						if int(d.n) > 0:
							m["dbl"] = int(d.n)
						if int(h.n) > 0:
							m["half"] = int(h.n)
						if int(r.n) > 0:
							m["rep"] = int(r.n)
						if int(gp.gap) > 0:
							m["rep_gap"] = int(gp.gap)
						if sy.s:
							m["sync"] = true
						out.append({"i": sy.i, "m": m})
	return out

func _dmgheal(j: int, c: Dictionary, t: Dictionary, allow_prev: bool) -> Array:
	var out: Array = []
	var heads: Array = []
	# [起点, 种类, alt, 数值起点, 收尾词]
	if _w(j, "造成"):
		for v in p_value(j + 1, c, 0, allow_prev):
			if _w(v.i, "伤害"):
				heads.append({"i": v.i + 1, "kind": "dmg", "alt": 0, "v": v.v})
	if _w(j, "减少") and _w(j + 1, "当前生命"):
		for v2 in p_value(j + 2, c, 0, allow_prev):
			heads.append({"i": v2.i, "kind": "dmg", "alt": 1, "v": v2.v})
	if _w(j, "恢复"):
		for v3 in p_value(j + 1, c, 0, allow_prev):
			if _w(v3.i, "生命"):
				heads.append({"i": v3.i + 1, "kind": "heal", "alt": 0, "v": v3.v})
	if _w(j, "增加") and _w(j + 1, "当前生命"):
		for v4 in p_value(j + 2, c, 0, allow_prev):
			heads.append({"i": v4.i, "kind": "heal", "alt": 1, "v": v4.v})
	for h in heads:
		for md in _mods(h.i, true, true, true):
			var o: Dictionary = md.m.duplicate()
			o["alt"] = h.alt
			var node: Dictionary = G.dmg(t, h.v, o) if h.kind == "dmg" else G.heal(t, h.v, o)
			out.append({"i": md.i, "v": node})
	return out

# ---- 减伤：目标 减伤 [每次固定] 数字 [双倍] [持续 秒]
func _mit(j: int, t: Dictionary) -> Array:
	var out: Array = []
	if not _w(j, "减伤"):
		return out
	var modes: Array = [{"i": j + 1, "mode": "pct"}]
	if _p(j + 1, "每次固定"):
		modes.append({"i": j + 2, "mode": "fixed"})
	for md in modes:
		var k := _num(md.i, "value")
		if k < 0:
			continue
		for d in _count_words(md.i + 1, "双倍", 3):
			for du in _durs(d.i):
				var node: Dictionary = G.mit(t, md.mode, k, int(du.dur))
				if int(d.n) > 0:
					node["dbl"] = int(d.n)
				out.append({"i": du.i, "v": node})
	return out

func _durs(i: int) -> Array:
	var out: Array = [{"i": i, "dur": 0}]
	if _w(i, "持续"):
		var k := _num(i + 1, "dur")
		if k >= 1:
			out.append({"i": i + 2, "dur": k})
	return out

# ---- 状态（叠层）：目标 施加 状态 [双倍] [持久]
func _status(j: int, c: Dictionary, t: Dictionary) -> Array:
	var out: Array = []
	if not _w(j, "施加"):
		return out
	for st in G.STATUSES:
		if not _w(j + 1, st):
			continue
		for d in _count_words(j + 2, "双倍", 3):
			for x in _count_words(d.i, "持久", 3):
				var node: Dictionary = G.status(st, t, 0, 0, {})
				if int(d.n) > 0:
					node["dbl"] = int(d.n)
				if int(x.n) > 0:
					node["ext"] = int(x.n)
				out.append({"i": x.i, "v": node})
	return out

# ---- 时间术：延后/提前 阵营 技能 数字 [双倍]（“打断”已取消）
func _time(i: int) -> Array:
	var out: Array = []
	for op in [["延后", "delay"], ["提前", "advance"]]:
		if _w(i, op[0]):
			for s in _side(i + 1):
				if _w(s.i, "技能"):
					var k := _num(s.i + 1, "value")
					if k >= 0:
						for d in _count_words(s.i + 2, "双倍", 3):
							var node: Dictionary = G.time_op(op[1], s.v, k)
							if int(d.n) > 0:
								node["dbl"] = int(d.n)
							out.append({"i": d.i, "v": node})
	return out

# ---- 转移 / 转为（只能放在“当 即将受到伤害”之下）
func _redirect_convert(i: int, c: Dictionary) -> Array:
	var out: Array = []
	if str(c.get("event", "")) != "pending_dmg":
		# 仍然记录想要的词，方便提示“放在即将受到伤害之下才能用”
		return out
	if _w(i, "转移"):
		for t in p_target(i + 1, c):
			var k := _num(t.i, "value")
			if k >= 0:
				for d in _count_words(t.i + 1, "双倍", 3):
					var node: Dictionary = G.redirect(t.v, k)
					if int(d.n) > 0:
						node["dbl"] = int(d.n)
					out.append({"i": d.i, "v": node})
	if _w(i, "转为") and _w(i + 1, "恢复") and _w(i + 2, "生命"):
		var k2 := _num(i + 3, "value")
		if k2 >= 0:
			for d2 in _count_words(i + 4, "双倍", 3):
				var node2: Dictionary = G.convert_heal(k2)
				if int(d2.n) > 0:
					node2["dbl"] = int(d2.n)
				out.append({"i": d2.i, "v": node2})
	return out

# ---- 监听：当 [目标] 事件 [每次] [持续 秒] 效果
func _watch(i: int, c: Dictionary) -> Array:
	var out: Array = []
	if not _w(i, "当"):
		return out
	for ev in EVENTS:
		var heads: Array = []
		if ev[1] in G.NO_OBSERVE:
			if _w(i + 1, ev[0]):
				heads.append({"i": i + 2, "obs": G.T("all", "ally")})
		else:
			for t in p_target(i + 1, c):
				if _w(t.i, ev[0]):
					heads.append({"i": t.i + 1, "obs": t.v})
		for h in heads:
			var freqs: Array = [{"i": h.i, "f": "once"}]
			if _w(h.i, "每次"):
				freqs.append({"i": h.i + 1, "f": "every"})
			for f in freqs:
				var lives: Array = [{"i": f.i, "life": "round", "dur": 0}]
				if _w(f.i, "持续"):
					var k := _num(f.i + 1, "dur")
					if k >= 1:
						lives.append({"i": f.i + 2, "life": "dur", "dur": k})
				for lf in lives:
					var cc := {"watch": true, "event": ev[1]}
					for ch in p_node(lf.i, cc, []):
						var o := {"freq": f.f, "life": lf.life, "dur": int(lf.dur)}
						out.append({"i": ch.i, "v": G.watch(ev[1], h.obs, ch.v, o)})
	return out

# ---- 分流：分流 造成伤害 目标 数字 目标 数字 [间隔 秒 秒]
func _split(i: int, c: Dictionary) -> Array:
	var out: Array = []
	if not _w(i, "分流"):
		return out
	var verbs: Array = []
	if _w(i + 1, "造成") and _w(i + 2, "伤害"):
		verbs.append({"i": i + 3, "verb": "dmg", "alt": 0})
	if _w(i + 1, "减少") and _w(i + 2, "当前生命"):
		verbs.append({"i": i + 3, "verb": "dmg", "alt": 1})
	if _w(i + 1, "恢复") and _w(i + 2, "生命"):
		verbs.append({"i": i + 3, "verb": "heal", "alt": 0})
	if _w(i + 1, "增加") and _w(i + 2, "当前生命"):
		verbs.append({"i": i + 3, "verb": "heal", "alt": 1})
	for vb in verbs:
		for t1 in p_target(vb.i, c):
			var p1 := _num(t1.i, "part")
			if p1 < 0:
				continue
			for t2 in p_target(t1.i + 1, c):
				var p2 := _num(t2.i, "part")
				if p2 < 0:
					continue
				var after: int = t2.i + 1
				var delays: Array = [{"i": after, "d1": 0, "d2": 0}]
				if _w(after, "间隔"):
					var d1 := _num(after + 1, "delay")
					if d1 >= 0:
						var d2 := _num(after + 2, "delay")
						if d2 >= 0 and (d1 > 0 or d2 > 0):
							delays.append({"i": after + 3, "d1": d1, "d2": d2})
				for dl in delays:
					var branches: Array = [{"target": t1.v, "part": p1, "delay": int(dl.d1)}, {"target": t2.v, "part": p2, "delay": int(dl.d2)}]
					out.append({"i": dl.i, "v": G.split(vb.verb, p1 + p2, branches, int(vb.alt))})
	return out

# ---- 整个技能：节点 { 并 节点 }
func _skill() -> Array:
	var c0 := {"watch": false, "event": ""}
	var cur: Array = []
	for r in p_node(0, c0):
		cur.append({"i": r.i, "nodes": [r.v]})
	var done: Array = []
	for round_k in MAX_NODES - 1:
		var nxt: Array = []
		for st in cur:
			done.append(st)
			if _w(st.i, "并"):
				for r2 in p_node(st.i + 1, c0):
					nxt.append({"i": r2.i, "nodes": st.nodes + [r2.v]})
		cur = nxt
	for st2 in cur:
		done.append(st2)
	return done

# ============================================================ 反向：技能树 → 一串牌
static func tokens_of_skill(nodes: Array) -> Array:
	var out: Array = []
	for k in nodes.size():
		if k > 0:
			out.append(W("并"))
		out.append_array(node_tokens(nodes[k]))
	return out

static func target_tokens(t: Dictionary) -> Array:
	var out: Array = []
	match t.pick:
		"self": out.append(W("自身"))
		"source": out.append(W("来源"))
		"recipient": out.append(W("接受者"))
		"choose":
			out.append(W("选择"))
			for _i in G.pick_count(t):
				out.append(W("一个"))
			out.append_array([W(G.SIDE_WORD[t.side]), W("随从")])
		_:
			for pk in PICKS:
				if pk[1] == t.pick:
					out.append_array([W(pk[0]), W(G.SIDE_WORD[t.side]), W("随从")])
	return out

static func value_tokens(v: Dictionary) -> Array:
	var out: Array = []
	match v.k:
		"num":
			out.append(Num(int(v.n)))
		"ref":
			if v.ref == "count" and v.has("of") and v.of.pick == "all":
				out.append(W(G.SIDE_WORD[v.of.side] + "人数"))
				return out
			if v.has("of"):
				out.append_array(target_tokens(v.of))
			if str(G.REF_WORD[v.ref]) != "":
				out.append(W(G.REF_WORD[v.ref]))
		"op":
			if v.op in G.INFIX_OPS:
				out.append_array(value_tokens(v.a))
				out.append(W(G.OP_WORD[v.op]))
				out.append_array(_term_tokens(v.b))
			else:
				out.append(W(G.OP_WORD[v.op]))
				out.append_array(_term_tokens(v.a))
				out.append_array(_term_tokens(v.b))
	return out

# 作为“项”写出：中缀式要套括号
static func _term_tokens(v: Dictionary) -> Array:
	if v.k == "op" and (v.op in G.INFIX_OPS):
		var out: Array = [Part(PAREN_L)]
		out.append_array(value_tokens(v))
		out.append(Part(PAREN_R))
		return out
	return value_tokens(v)

static func cond_tokens(cd: Dictionary) -> Array:
	var out: Array = []
	if cd.has("has"):
		out.append_array([W("已生效"), W(cd.has.status)])
		out.append_array(target_tokens(cd.has.target))
		return out
	out.append_array(value_tokens(cd.left))
	out.append(Part("低于" if cd.cmp == "lt" else "不低于"))
	out.append_array(value_tokens(cd.right))
	return out

static func _rep(word: String, k: int) -> Array:
	var out: Array = []
	for i in k:
		out.append(W(word))
	return out

static func node_tokens(node: Dictionary) -> Array:
	var out: Array = []
	if int(node.get("delay", 0)) > 0:
		out.append_array([W("之后"), Num(int(node.delay))])
	match node.kind:
		"dmg", "heal":
			out.append_array(target_tokens(node.target))
			var alt := int(node.get("alt", 0))
			if node.kind == "dmg" and alt == 0:
				out.append(W("造成"))
				out.append_array(value_tokens(node.value))
				out.append(W("伤害"))
			elif node.kind == "dmg":
				out.append_array([W("减少"), W("当前生命")])
				out.append_array(value_tokens(node.value))
			elif alt == 0:
				out.append(W("恢复"))
				out.append_array(value_tokens(node.value))
				out.append(W("生命"))
			else:
				out.append_array([W("增加"), W("当前生命")])
				out.append_array(value_tokens(node.value))
			out.append_array(_rep("双倍", int(node.get("dbl", 0))))
			out.append_array(_rep("一半", int(node.get("half", 0))))
			out.append_array(_rep("重复", int(node.get("rep", 0))))
			if int(node.get("rep_gap", 0)) > 0:
				out.append_array([W("间隔"), Num(int(node.rep_gap))])
			if node.get("sync", false):
				out.append(W("同时"))
		"mit":
			out.append_array(target_tokens(node.target))
			out.append(W("减伤"))
			if node.mode == "fixed":
				out.append(Part("每次固定"))
			out.append(Num(int(node.value.n)))
			out.append_array(_rep("双倍", int(node.get("dbl", 0))))
			if int(node.dur) > 0:
				out.append_array([W("持续"), Num(int(node.dur))])
		"status":
			out.append_array(target_tokens(node.target))
			out.append_array([W("施加"), W(node.status)])
			out.append_array(_rep("双倍", int(node.get("dbl", 0))))
			out.append_array(_rep("持久", int(node.get("ext", 0))))
			if node.has("link"):
				out.append_array(target_tokens(node.link))
			if int(node.dur) > 0:
				out.append_array([W("持续"), Num(int(node.dur))])
		"remove":
			out.append_array(target_tokens(node.target))
			out.append_array([W("移除"), W(node.what)])
		"swap":
			out.append(W("换位"))
			out.append_array(target_tokens(node.target))
		"time":
			var opw: String = {"delay": "延后", "advance": "提前"}.get(node.op, "延后")
			out.append_array([W(opw), W(G.SIDE_WORD[node.side]), W("技能"), Num(int(node.value.n))])
			out.append_array(_rep("双倍", int(node.get("dbl", 0))))
		"redirect":
			out.append(W("转移"))
			out.append_array(target_tokens(node.target))
			out.append(Num(int(node.value.n)))
			out.append_array(_rep("双倍", int(node.get("dbl", 0))))
		"convert":
			out.append_array([W("转为"), W("恢复"), W("生命"), Num(int(node.value.n))])
			out.append_array(_rep("双倍", int(node.get("dbl", 0))))
		"watch":
			out.append(W("当"))
			if not (node.event in G.NO_OBSERVE):
				out.append_array(target_tokens(node.observe))
			out.append(W(G.EVENT_WORD[node.event]))
			if node.freq == "every":
				out.append(W("每次"))
			if node.life == "dur":
				out.append_array([W("持续"), Num(int(node.dur))])
			out.append_array(node_tokens(node.child))
		"split":
			out.append(W("分流"))
			out.append_array(G.verb_words(node.verb, int(node.get("alt", 0))).map(func(x): return W(x)))
			var any_delay := false
			for b in node.branches:
				out.append_array(target_tokens(b.target))
				out.append(Num(int(b.part)))
				if int(b.get("delay", 0)) > 0:
					any_delay = true
			if any_delay:
				out.append(W("间隔"))
				out.append(Num(int(node.branches[0].get("delay", 0))))
				out.append(Num(int(node.branches[1].get("delay", 0))))
		"chain":
			out.append(W("接续"))
			out.append_array(node_tokens(node.first))
			out.append_array(node_tokens(node.then))
		"copy":
			out.append(W("复制"))
			out.append_array(node_tokens(node.first))
			out.append_array(target_tokens(node.target))
		"until":
			out.append(W("直到"))
			out.append_array(cond_tokens(node.cond))
			if int(node.get("gap", 0)) > 0:
				out.append_array([W("间隔"), Num(int(node.gap))])
			out.append_array(node_tokens(node.child))
		"if":
			if node.cond.has("alive"):
				out.append_array([W("若有"), W(G.SIDE_WORD[node.cond.alive.side]), W("随从"), Num(int(node.cond.alive.n))])
			else:
				out.append(W("若"))
				out.append_array(cond_tokens(node.cond))
			out.append_array(node_tokens(node.then))
			if node.has("else"):
				out.append(W("否则"))
				out.append_array(node_tokens(node["else"]))
		"choose":
			out.append(W("择一"))
			out.append_array(node_tokens(node.a))
			out.append_array(node_tokens(node.b))
	return out

# 牌里的词（不含数字牌和虚词牌），与 grammar.skill_words 对照用
static func words_in(tokens: Array) -> Array:
	var out: Array = []
	for t in tokens:
		if t.t == "W":
			out.append(t.v)
	return out

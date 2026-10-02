extends RefCounted
# 技能语法：节点树 → 所需词 / 费用 / 合法性 / 人话。
# 词按词名计数；同名词卡可互换。所有玩家与AI建出的技能都是这里的节点树。

const Lex = preload("res://scripts/core/lexicon.gd")

const START_FEE := 5
const SIDE_WORD := {"ally": "友方", "enemy": "敌方"}
const SIDE_TEXT := {"ally": "友方", "enemy": "敌方"}

const EVENT_WORD := {
	"pending_dmg": "即将受到伤害", "damaged": "受到伤害", "dealt": "造成伤害", "healed": "恢复生命",
	"lost": "失去生命", "targeted": "被选为目标", "cast": "发动技能", "hit": "技能命中",
	"status_applied": "状态施加", "status_end": "状态结束", "down": "倒下", "ally_down": "队友倒下",
	"enemy_down": "敌人倒下", "round_end": "回合结束",
}
const EVENT_TEXT := {
	"pending_dmg": "即将受到伤害", "damaged": "受到伤害", "dealt": "造成伤害", "healed": "恢复生命",
	"lost": "失去生命", "targeted": "被选为目标", "cast": "发动技能", "hit": "被技能命中",
	"status_applied": "被施加状态", "status_end": "状态结束", "down": "倒下", "ally_down": "有友方倒下",
	"enemy_down": "有敌方倒下", "round_end": "本轮结束",
}
const NO_OBSERVE := ["ally_down", "enemy_down", "round_end"]
const MAX_PICK := 4        # “选择 一个 一个 …”最多选几个目标
const MAX_TERMS := 6       # 一个数值式里最多几项（加上/减去连起来）
const NUM_CN := {1: "一", 2: "两", 3: "三", 4: "四"}
const REF_WORD := {
	"event_damage": "该次伤害", "event_heal": "该次治疗", "actual": "实际数值", "raw": "原始数值",
	"cur_hp": "当前生命", "max_hp": "生命上限", "lost_hp": "失去的生命", "count": "人数", "times": "次数",
	"ap": "可用行动点", "paid": "支付的行动点", "invested": "已投入数字", "overflow": "溢出", "prev": "",
	"round_taken": "本轮", "remaining": "剩余",
}
const UNTIL_MAX := 4       # “直到”最多重复执行的次数（首次之外），每次重新付数字
const REF_TEXT := {
	"event_damage": "这次伤害", "event_heal": "这次治疗", "actual": "实际数值", "raw": "原始数值",
	"cur_hp": "当前生命", "max_hp": "生命上限", "lost_hp": "已损失生命", "count": "人数", "times": "本轮已触发的次数",
	"ap": "剩余行动点", "paid": "已支付的行动点", "invested": "这个技能投入的数字", "overflow": "溢出的治疗", "prev": "上一步的实际数值",
	"round_taken": "本轮累计受到的伤害", "remaining": "剩余护盾量",
}
const OP_WORD := {"max": "较高者", "min": "较低者", "sum": "加上", "sub": "减去", "diff": "差值"}
const OP_TEXT := {"max": "较高者", "min": "较低者", "sum": "加上", "sub": "减去", "diff": "差值"}
const INFIX_OPS := ["sum", "sub"]      # 中缀：A 加上 B 减去 C，从左到右算（减不到 0 以下）
# 叠层状态：每次施加叠一层（每轮每个单位最多叠两次），层数跨轮保留，倒下清零；效果随层数指数增长（前期慢，后期爆炸）
# 己方用：蓄力、铁壁；敌方用：易伤、灼烧、衰弱（语法上谁都可以施加给谁）
const STACK_STATUSES := ["易伤", "灼烧", "衰弱", "蓄力", "铁壁"]
const STATUSES := ["易伤", "灼烧", "衰弱", "蓄力", "铁壁"]
const STATUS_DESC := {
	"易伤": "每层让受到的伤害大幅增加（层数越多涨得越快）",
	"灼烧": "每轮结束时受到伤害，第 n 层是 2 的 n-1 次方点",
	"衰弱": "每层让造成的伤害大幅降低",
	"蓄力": "下一次造成伤害时一次用掉所有层数，伤害大幅放大",
	"铁壁": "每层让受到的伤害大幅降低",
}
const STATUS_SIDE := {"易伤": "enemy", "灼烧": "enemy", "衰弱": "enemy", "蓄力": "ally", "铁壁": "ally"}

# ---------------------------------------------------------------- 目标式
static func T(pick: String, side: String = "enemy", extra: Dictionary = {}) -> Dictionary:
	var t := {"pick": pick, "side": side}
	for k in extra:
		t[k] = extra[k]
	return t

static func target_words(t: Dictionary) -> Array:
	var s: String = SIDE_WORD.get(t.get("side", ""), "")
	match t.pick:
		"self": return ["自身"]
		"source": return ["来源"]
		"recipient": return ["接受者"]
		"choose":
			var cw: Array = ["选择"]
			for _i in pick_count(t):
				cw.append("一个")
			cw.append_array([s, "随从"])
			return cw
		"all": return ["全部", s, "随从"]      # 内部仍有，玩家拼不出来（已被“一个+一个”取代）
		"each": return ["每个", s, "随从"]
		"lowest": return ["最低生命", s, "随从"]
		"highest": return ["最高生命", s, "随从"]
		"first": return ["最前", s, "随从"]
		"last": return ["最后", s, "随从"]
		"random": return ["随机", s, "随从"]
		"other": return ["另一个", s, "随从"]
		"adjacent": return ["相邻", s, "随从"]
	return []

static func target_text(t: Dictionary) -> String:
	var s: String = SIDE_TEXT.get(t.get("side", ""), "某某" if str(t.get("side", "")) == "某某" else "")
	match t.pick:
		"self": return "自身"
		"source": return "来源随从"
		"recipient": return "被作用的随从"
		"choose": return ("你选的一个" if pick_count(t) == 1 else "你选的%s个" % NUM_CN.get(pick_count(t), str(pick_count(t)))) + s + "随从"
		"all": return "全部" + s + "随从"
		"each": return "每一个" + s + "随从"
		"lowest": return "生命最低的" + s + "随从"
		"highest": return "生命最高的" + s + "随从"
		"first": return "最前面的" + s + "随从"
		"last": return "最后面的" + s + "随从"
		"random": return "随机一个" + s + "随从"
		"other": return "另一个" + s + "随从"
		"adjacent": return "相邻的" + s + "随从"
	return "某某"

static func pick_count(t: Dictionary) -> int:
	return clampi(int(t.get("n", 1)), 1, MAX_PICK)

static func is_single_pick(t: Dictionary) -> bool:
	if t.pick == "choose" and pick_count(t) > 1:
		return false
	return not (t.pick in ["all", "each", "adjacent"])

static func needs_choice(t: Dictionary) -> bool:
	return t.pick == "choose" or t.pick == "other"

# ---------------------------------------------------------------- 数值式
static func N(n: int) -> Dictionary:
	return {"k": "num", "n": n}

static func REF(ref: String, of: Dictionary = {}) -> Dictionary:
	var v := {"k": "ref", "ref": ref}
	if not of.is_empty():
		v["of"] = of
	return v

static func OP(op: String, a: Dictionary, b: Dictionary) -> Dictionary:
	return {"k": "op", "op": op, "a": a, "b": b}

static func value_words(v: Dictionary) -> Array:
	match v.k:
		"num": return []
		"ref":
			var out: Array = []
			if v.ref == "count" and v.has("of") and v.of.pick == "all":
				return [SIDE_WORD[v.of.side] + "人数"]
			if REF_WORD[v.ref] != "":
				out.append(REF_WORD[v.ref])
			if v.has("of"):
				out.append_array(target_words(v.of))
			return out
		"op":
			var out2: Array = [OP_WORD[v.op]]
			out2.append_array(value_words(v.a))
			out2.append_array(value_words(v.b))
			return out2
	return []

static func value_nums(v: Dictionary) -> int:
	match v.k:
		"num": return int(v.n)
		"op": return value_nums(v.a) + value_nums(v.b)
	return 0

static func value_text(v: Dictionary) -> String:
	match v.k:
		"num": return str(int(v.n)) if int(v.n) >= 0 else "某某"
		"ref":
			if v.ref == "count" and v.has("of") and v.of.pick == "all":
				return "%s存活的人数" % SIDE_TEXT.get(v.of.get("side", ""), "")
			var s: String = REF_TEXT.get(v.ref, "某某")
			if v.has("of"):
				s = target_text(v.of) + "的" + s
			return s
		"op":
			var a := _paren_text(v.a)
			var b := _paren_text(v.b)
			match v.op:
				"max": return "%s 与 %s 中较大的" % [a, b]
				"min": return "%s 与 %s 中较小的" % [a, b]
				"sum": return "%s 加上 %s" % [value_text(v.a), b]
				"sub": return "%s 减去 %s（不小于 0）" % [value_text(v.a), b]
				"diff": return "%s 与 %s 的差" % [a, b]
	return "某某"

static func _paren_text(v: Dictionary) -> String:
	if v.k == "op" and (v.op in INFIX_OPS):
		return "（" + value_text(v) + "）"
	return value_text(v)

# 一个数值式里的项数（加上/减去连起来的个数）
static func value_terms(v: Dictionary) -> int:
	if v.k == "op":
		if v.op in INFIX_OPS:
			return value_terms(v.a) + value_terms(v.b)
		return maxi(1, value_terms(v.a) + value_terms(v.b))
	return 1

# 数值套上 双倍/一半 之后的人话：数字直接给最终值；非数字（引用）写“2倍的…”
static func _num_text(node: Dictionary, v: Dictionary) -> String:
	if v.k == "num":
		return str(int(v.n)) if int(v.n) >= 0 else "某某"
	return value_text(v)

# 双倍/一半写成单独的一句：“造成 5 点伤害，伤害翻倍”。数字保持原样，别的增益作用在这个 5 上时，翻几倍都还能叠加。
static func mods_clause(node: Dictionary, what: String = "数值") -> String:
	var d := int(node.get("dbl", 0))
	var h := int(node.get("half", 0))
	var out := ""
	if d == 1:
		out += "，%s翻倍" % what
	elif d > 1:
		out += "，%s连续翻倍 %d 次" % [what, d]
	if h == 1:
		out += "，%s减半" % what
	elif h > 1:
		out += "，%s连续减半 %d 次" % [what, h]
	return out

static func _after_text(node: Dictionary) -> String:
	var d := int(node.get("delay", 0))
	return ("%d 秒后，" % d) if d > 0 else ""

static func _dur_text(dur: int) -> String:
	return "，持续 %d 秒" % dur if dur > 0 else "，持续到本轮结束"

# ---------------------------------------------------------------- 节点构造
static func dmg(target: Dictionary, value: Dictionary, o: Dictionary = {}) -> Dictionary:
	var n := {"kind": "dmg", "alt": 0, "target": target, "value": value}
	for k in o:
		n[k] = o[k]
	return n

static func heal(target: Dictionary, value: Dictionary, o: Dictionary = {}) -> Dictionary:
	var n := {"kind": "heal", "alt": 0, "target": target, "value": value}
	for k in o:
		n[k] = o[k]
	return n

static func mit(target: Dictionary, mode: String, value: int, dur: int = 0) -> Dictionary:
	return {"kind": "mit", "target": target, "mode": mode, "value": N(value), "dur": dur}

static func status(name: String, target: Dictionary, dur: int = 0, value: int = 0, link: Dictionary = {}) -> Dictionary:
	var n := {"kind": "status", "status": name, "target": target, "dur": dur, "value": N(value)}
	if not link.is_empty():
		n["link"] = link
	return n

static func remove(what: String, target: Dictionary) -> Dictionary:
	return {"kind": "remove", "what": what, "target": target}

static func watch(event: String, observe: Dictionary, child: Dictionary, o: Dictionary = {}) -> Dictionary:
	var n := {"kind": "watch", "event": event, "observe": observe, "child": child, "freq": "once", "life": "round", "dur": 0}
	for k in o:
		n[k] = o[k]
	return n

static func redirect(target: Dictionary, cap: int = 20) -> Dictionary:
	return {"kind": "redirect", "target": target, "value": N(cap)}

static func convert_heal(cap: int = 20) -> Dictionary:
	return {"kind": "convert", "value": N(cap)}

static func time_op(op: String, side: String, seconds: int = 0) -> Dictionary:
	return {"kind": "time", "op": op, "side": side, "value": N(seconds)}

static func swap(target: Dictionary) -> Dictionary:
	return {"kind": "swap", "target": target}

static func split(verb: String, total: int, branches: Array, alt: int = 0) -> Dictionary:
	return {"kind": "split", "verb": verb, "alt": alt, "total": total, "branches": branches}

static func chain(first: Dictionary, then: Dictionary) -> Dictionary:
	return {"kind": "chain", "first": first, "then": then}

static func copy_to(first: Dictionary, target: Dictionary) -> Dictionary:
	return {"kind": "copy", "first": first, "target": target}

static func if_node(cond: Dictionary, then: Dictionary, els: Dictionary = {}) -> Dictionary:
	var n := {"kind": "if", "cond": cond, "then": then}
	if not els.is_empty():
		n["else"] = els
	return n

static func pick_one(a: Dictionary, b: Dictionary) -> Dictionary:
	return {"kind": "choose", "a": a, "b": b}

static func until_node(cond: Dictionary, child: Dictionary, gap: int = 0) -> Dictionary:
	return {"kind": "until", "cond": cond, "child": child, "gap": gap}

static func has_cond(target: Dictionary, status_name: String) -> Dictionary:
	return {"has": {"target": target, "status": status_name}}

static func cmp_cond(left: Dictionary, cmp: String, right: Dictionary) -> Dictionary:
	return {"left": left, "cmp": cmp, "right": right}

static func alive_cond(side: String, n: int) -> Dictionary:
	return {"alive": {"side": side, "n": n}}

static func cond_words(c: Dictionary) -> Array:
	if c.has("alive"):
		return ["若有", SIDE_WORD[c.alive.side], "随从"]
	if c.has("has"):
		var w: Array = ["已生效", c.has.status]
		w.append_array(target_words(c.has.target))
		return w
	var out: Array = value_words(c.left)
	out.append_array(value_words(c.right))
	return out

static func cond_nums(c: Dictionary) -> int:
	if c.has("alive"):
		return int(c.alive.n)
	if c.has("has"):
		return 0
	return value_nums(c.left) + value_nums(c.right)

static func cond_text(c: Dictionary) -> String:
	if c.has("alive"):
		return "%s存活的随从至少有 %s 个" % [SIDE_TEXT.get(c.alive.side, "某某"), "某某" if int(c.alive.n) < 0 else str(int(c.alive.n))]
	if not c.has("has") and not (c.has("left") and c.has("right")):
		return "某某"
	if c.has("has"):
		return "%s身上有【%s】" % [target_text(c.has.target), c.has.status]
	return "%s %s %s" % [value_text(c.left), "低于" if c.get("cmp", "") == "lt" else ("不低于" if c.get("cmp", "") == "ge" else "某某"), value_text(c.right)]

static func cond_check(c: Dictionary, out: Array, ctx: String) -> void:
	if c.has("alive"):
		if int(c.alive.n) < 1 or int(c.alive.n) > 5:
			out.append("“若有”的个数须在1到5")
		return
	if c.has("has"):
		if not (c.has.status in STATUSES):
			out.append("未知状态：" + str(c.has.status))
		_check_target(c.has.target, out, ctx != "")
	else:
		_check_value(c.left, out, ctx)
		_check_value(c.right, out, ctx)

static func skill(name: String, nodes: Array) -> Dictionary:
	return {"name": name, "nodes": nodes}

# ---------------------------------------------------------------- 词与数字
static func verb_words(kind: String, alt: int) -> Array:
	if kind == "dmg":
		return ["造成", "伤害"] if alt == 0 else ["减少", "当前生命"]
	return ["恢复", "生命"] if alt == 0 else ["增加", "当前生命"]

static func _rep(word: String, n: int) -> Array:
	var out: Array = []
	for i in n:
		out.append(word)
	return out

static func words_of(node: Dictionary) -> Array:
	var w := _words_core(node)
	if node.get("sync", false):
		w.append("同时")
	return w

static func _words_core(node: Dictionary) -> Array:
	var w: Array = []
	match node.kind:
		"dmg", "heal":
			w.append_array(verb_words(node.kind, int(node.get("alt", 0))))
			w.append_array(target_words(node.target))
			w.append_array(value_words(node.value))
			w.append_array(_rep("双倍", int(node.get("dbl", 0))))
			w.append_array(_rep("一半", int(node.get("half", 0))))
			w.append_array(_rep("重复", int(node.get("rep", 0))))
			if int(node.get("rep_gap", 0)) > 0:
				w.append("间隔")
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"mit":
			w.append("减伤")
			w.append_array(target_words(node.target))
			w.append_array(_rep("双倍", int(node.get("dbl", 0))))
			if int(node.dur) > 0:
				w.append("持续")
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"status":
			w.append("施加")
			w.append(node.status)
			w.append_array(target_words(node.target))
			w.append_array(_rep("双倍", int(node.get("dbl", 0))))
			if node.has("link"):
				w.append_array(target_words(node.link))
			if int(node.dur) > 0:
				w.append("持续")
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"remove":
			w.append("移除")
			w.append(node.what)
			w.append_array(target_words(node.target))
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"watch":
			w.append("当")
			w.append(EVENT_WORD[node.event])
			if node.freq == "every":
				w.append("每次")
			if not (node.event in NO_OBSERVE):
				w.append_array(target_words(node.observe))
			if node.life == "dur":
				w.append("持续")
			w.append_array(words_of(node.child))
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"redirect":
			w.append("转移")
			w.append_array(target_words(node.target))
			w.append_array(_rep("双倍", int(node.get("dbl", 0))))
		"convert":
			w.append("转为")
			w.append_array(["恢复", "生命"])
			w.append_array(_rep("双倍", int(node.get("dbl", 0))))
		"time":
			w.append({"delay": "延后", "advance": "提前", "interrupt": "打断"}[node.op])
			w.append(SIDE_WORD[node.side])
			w.append("技能")
			w.append_array(_rep("双倍", int(node.get("dbl", 0))))
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"swap":
			w.append("换位")
			w.append_array(target_words(node.target))
			if int(node.get("delay", 0)) > 0:
				w.append("之后")
		"split":
			w.append("分流")
			w.append_array(verb_words(node.verb, int(node.get("alt", 0))))
			var any_delay := false
			for b in node.branches:
				w.append_array(target_words(b.target))
				if int(b.get("delay", 0)) > 0:
					any_delay = true
			if any_delay:
				w.append("间隔")
		"chain":
			w.append("接续")
			w.append_array(words_of(node.first))
			w.append_array(words_of(node.then))
		"copy":
			w.append("复制")
			w.append_array(words_of(node.first))
			w.append_array(target_words(node.target))
		"until":
			w.append("直到")
			w.append_array(cond_words(node.cond))
			w.append_array(words_of(node.child))
			if int(node.get("gap", 0)) > 0:
				w.append("间隔")
		"if":
			if not node.cond.has("alive"):
				w.append("若")
			w.append_array(cond_words(node.cond))
			w.append_array(words_of(node.then))
			if node.has("else"):
				w.append("否则")
				w.append_array(words_of(node["else"]))
		"choose":
			w.append("择一")
			w.append_array(words_of(node.a))
			w.append_array(words_of(node.b))
	return w

# 技能里有没有进阶/奇术词（有的话，这个技能用完要冷却）
static func is_advanced_skill(sk: Dictionary) -> bool:
	Lex.load_all()
	for w in sk.get("words", []):
		if Lex.words.has(w) and str(Lex.words[w].rarity) != "基础":
			return true
	return false

# 技能的全部词（含“并”）
static func skill_words(sk: Dictionary) -> Array:
	var w: Array = []
	for n in sk.nodes:
		w.append_array(words_of(n))
	if sk.nodes.size() > 1:
		w.append_array(_rep("并", sk.nodes.size() - 1))
	return w

# 构筑数字与行动点数字： {budget, ap}
static func nums_of(node: Dictionary, choices: Dictionary = {}) -> Dictionary:
	var b := 0
	var ap := 0
	match node.kind:
		"dmg", "heal":
			var v := value_nums(node.value)
			var times := 1 + int(node.get("rep", 0))
			b += v
			ap += v * times
		"mit":
			b += int(node.value.n) + int(node.dur)
			ap += int(node.value.n) + int(node.dur)
		"status":
			b += int(node.value.n) + int(node.dur)
			ap += int(node.value.n) + int(node.dur)
		"watch":
			var c := nums_of(node.child, choices)
			var d := int(node.dur) if node.life == "dur" else 0
			b += c.budget + d
			ap += c.ap + d
		"redirect", "convert":
			b += int(node.value.n)
			ap += int(node.value.n)
		"remove", "swap":
			pass
		"time":
			b += int(node.value.n)
			ap += int(node.value.n)
		"split":
			b += int(node.total)
			ap += int(node.total)
		"chain":
			var a1 := nums_of(node.first, choices)
			var a2 := nums_of(node.then, choices)
			b += a1.budget + a2.budget
			ap += a1.ap + a2.ap
		"copy":
			var a3 := nums_of(node.first, choices)
			b += a3.budget
			ap += a3.ap
		"until":
			var uc := nums_of(node.child, choices)
			b += uc.budget + cond_nums(node.cond)
			ap += uc.ap * (1 + UNTIL_MAX) + cond_nums(node.cond)
		"if":
			b += cond_nums(node.cond)
			ap += cond_nums(node.cond)
			var t1 := nums_of(node.then, choices)
			b += t1.budget
			ap += t1.ap
			if node.has("else"):
				var t2 := nums_of(node["else"], choices)
				b += t2.budget
				ap += t2.ap
		"choose":
			var c1 := nums_of(node.a, choices)
			var c2 := nums_of(node.b, choices)
			b += c1.budget + c2.budget
			# 宣告时只选一棵，只付所选；未传入选择时显示较贵的一棵作为上界
			if choices.has("b%d" % node.id):
				ap += c2.ap if int(choices["b%d" % node.id]) == 1 else c1.ap
			else:
				ap += maxi(c1.ap, c2.ap)
	return {"budget": b, "ap": ap}

static func skill_nums(sk: Dictionary, choices: Dictionary = {}) -> Dictionary:
	var b := 0
	var ap := 0
	for n in sk.nodes:
		var r := nums_of(n, choices)
		b += r.budget
		ap += r.ap
	return {"budget": b, "ap": ap}

static func cost_with_choices(sk: Dictionary, choices: Dictionary) -> int:
	return START_FEE + int(skill_nums(sk, choices).ap) + int(sk.price)

static func words_price(words: Array) -> int:
	var p := 0
	var picks := 0
	var ones := 0
	for w in words:
		p += Lex.price(w)
		if w == "一个":
			ones += 1
		elif w == "选择":
			picks += 1
	# 每个“选择”后的第一个“一个”免费，之后每多一个加 2 点（选得越多越贵）
	return p + 2 * maxi(0, ones - picks)

# 补全技能的派生字段：编号、词、价格、费用、起手、文字。
static func finalize(sk: Dictionary) -> Dictionary:
	var counter := [0]
	for n in sk.nodes:
		_assign_ids(n, counter)
	sk["words"] = skill_words(sk)
	sk["price"] = words_price(sk.words)
	var nums := skill_nums(sk)
	sk["budget"] = nums.budget
	sk["ap_nums"] = nums.ap
	sk["cost"] = START_FEE + nums.ap + sk.price
	sk["windup"] = int(sk.cost / 10)
	sk["text"] = describe(sk)
	sk["kind_tag"] = kind_tag(sk)
	return sk

static func _assign_ids(node: Dictionary, counter: Array) -> void:
	counter[0] += 1
	node["id"] = counter[0]
	_assign_value_slots(node)
	for key in ["child", "first", "then", "else", "a", "b"]:
		if node.has(key) and node[key] is Dictionary and not node[key].is_empty():
			_assign_ids(node[key], counter)

# 数值/条件里写了“选择 一个 …”（例如 选择 一个 友方 随从 当前生命）：宣告时也要点一个人，给它一个槽
static func _assign_value_slots(node: Dictionary) -> void:
	var idx := [0]
	match node.kind:
		"dmg", "heal":
			_slot_in_value(node.value, int(node.id), idx)
		"until", "if":
			_slot_in_cond(node.cond, int(node.id), idx)

static func _slot_in_value(v: Dictionary, nid: int, idx: Array) -> void:
	if v.k == "ref" and v.has("of") and v.ref != "count" and v.of.pick == "choose":
		v.of["slot"] = "v%d_%d" % [nid, idx[0]]
		idx[0] += 1
	elif v.k == "op":
		_slot_in_value(v.a, nid, idx)
		_slot_in_value(v.b, nid, idx)

static func _slot_in_cond(c: Dictionary, nid: int, idx: Array) -> void:
	if c.has("has"):
		if c.has.target.pick == "choose":
			c.has.target["slot"] = "v%d_%d" % [nid, idx[0]]
			idx[0] += 1
	elif c.has("left"):
		_slot_in_value(c.left, nid, idx)
		_slot_in_value(c.right, nid, idx)

static func _value_slot_specs(node: Dictionary) -> Array:
	var out: Array = []
	match node.kind:
		"dmg", "heal":
			_specs_in_value(node.value, out)
		"until", "if":
			var c: Dictionary = node.cond
			if c.has("has"):
				if c.has.target.has("slot"):
					out.append(c.has.target)
			elif c.has("left"):
				_specs_in_value(c.left, out)
				_specs_in_value(c.right, out)
	return out

static func _specs_in_value(v: Dictionary, out: Array) -> void:
	if v.k == "ref" and v.has("of") and v.of.has("slot"):
		out.append(v.of)
	elif v.k == "op":
		_specs_in_value(v.a, out)
		_specs_in_value(v.b, out)

# 宣告时必须作出的选择： [{key, kind:'target'|'remove'|'branch', node_id, spec, label}]
static func choice_slots(sk: Dictionary) -> Array:
	var out: Array = []
	for n in sk.nodes:
		_collect_choices(n, out, false)
	return out

# 目标槽：“选择 一个 一个 …”要点几个人就展开成几个槽（key、key#1、key#2…），彼此要选不同的人
static func _push_target_slots(out: Array, key: String, node_id: int, spec: Dictionary, label: String) -> void:
	var n := pick_count(spec) if spec.pick == "choose" else 1
	for i in n:
		out.append({"key": key if i == 0 else "%s#%d" % [key, i], "kind": "target", "node_id": node_id, "spec": spec,
			"label": label if n == 1 else "%s（第 %d 个）" % [label, i + 1], "multi_idx": i, "multi_n": n})

static func _collect_choices(node: Dictionary, out: Array, in_watch: bool) -> void:
	for vs in _value_slot_specs(node):
		out.append({"key": str(vs.slot), "kind": "target", "node_id": node.id, "spec": vs, "label": "引用：" + target_text(vs), "multi_idx": 0, "multi_n": 1})
	match node.kind:
		"dmg", "heal", "mit", "status", "swap", "remove":
			if needs_choice(node.target):
				_push_target_slots(out, "t%d" % node.id, node.id, node.target, target_text(node.target))
			if node.kind == "status" and node.has("link") and needs_choice(node.link):
				_push_target_slots(out, "l%d" % node.id, node.id, node.link, "牵连对象：" + target_text(node.link))
			if node.kind == "remove" and node.what == "限时效果":
				out.append({"key": "r%d" % node.id, "kind": "remove", "node_id": node.id, "label": "要移除的限时效果"})
		"split":
			for i in node.branches.size():
				var b: Dictionary = node.branches[i]
				if needs_choice(b.target):
					_push_target_slots(out, "s%d_%d" % [node.id, i], node.id, b.target, target_text(b.target))
		"watch":
			if not (node.event in NO_OBSERVE) and needs_choice(node.observe):
				_push_target_slots(out, "o%d" % node.id, node.id, node.observe, "监听对象：" + target_text(node.observe))
			_collect_choices(node.child, out, true)
			if node.child.kind == "redirect" and needs_choice(node.child.target):
				_push_target_slots(out, "t%d" % node.child.id, node.child.id, node.child.target, "转移给：" + target_text(node.child.target))
		"chain":
			_collect_choices(node.first, out, in_watch)
			_collect_choices(node.then, out, in_watch)
		"copy":
			_collect_choices(node.first, out, in_watch)
			if needs_choice(node.target):
				_push_target_slots(out, "t%d" % node.id, node.id, node.target, target_text(node.target))
		"until":
			_collect_choices(node.child, out, in_watch)
		"if":
			_collect_choices(node.then, out, in_watch)
			if node.has("else"):
				_collect_choices(node["else"], out, in_watch)
		"choose":
			out.append({"key": "b%d" % node.id, "kind": "branch", "node_id": node.id, "label": "择一：哪一棵"})
			_collect_choices(node.a, out, in_watch)
			_collect_choices(node.b, out, in_watch)
	# 监听器子树里的 choose 目标在监听器安装时选定（宣告时），故同样收集。

# ---------------------------------------------------------------- 合法性
# 返回问题文字数组；空数组表示结构合法。
static func problems(sk: Dictionary) -> Array:
	var out: Array = []
	if sk.nodes.is_empty():
		out.append("技能是空的")
	for n in sk.nodes:
		_check(n, out, "")
	return out

static func _check(node: Dictionary, out: Array, ctx: String) -> void:
	# ctx: "" 顶层；否则为所在监听器的事件名
	var in_watch := ctx != ""
	match node.kind:
		"dmg", "heal":
			_check_target(node.target, out, in_watch)
			_check_value(node.value, out, ctx)
			if int(node.get("rep", 0)) > 0 and int(node.get("rep_gap", 0)) < 0:
				out.append("重复间隔不合法")
		"mit", "status", "remove", "swap":
			_check_target(node.target, out, in_watch)
			if node.has("link"):
				_check_target(node.link, out, in_watch)
			if node.kind == "status" and not (node.status in STATUSES):
				out.append("未知状态：" + str(node.status))
			if node.kind in ["mit", "status"] and (int(node.dur) < 0 or int(node.dur) > 20):
				out.append("持续秒数须在1到20")
			if node.kind == "swap" and node.target.side != "ally":
				out.append("换位只能与己方随从")
		"watch":
			if node.has("dur") and node.life == "dur" and (int(node.dur) < 1 or int(node.dur) > 20):
				out.append("持续秒数须在1到20")
			if not (node.event in NO_OBSERVE):
				_check_target(node.observe, out, in_watch)
			var ck: String = node.child.kind
			if ck == "redirect" or ck == "convert":
				if node.event != "pending_dmg":
					out.append("转移/转为只能用于“即将受到伤害”")
				if int(node.child.get("value", {"n": 0}).n) < 1:
					out.append("转移/转为要填入每个被保护者的上限（至少1）")
				if ck == "redirect":
					_check_target(node.child.target, out, true)
			else:
				_check(node.child, out, node.event)
			if ck == "watch":
				pass # 允许监听器里再装监听器（嵌套合法，层数不设上限）
		"redirect", "convert":
			out.append("转移/转为必须直接放在“当 即将受到伤害”之下")
		"time":
			if node.op == "interrupt":
				out.append("“打断”已取消")
			elif int(node.value.n) < 1 or int(node.value.n) > 19:
				out.append("时间改动须填1到19秒")
		"split":
			var sum := 0
			for b in node.branches:
				sum += int(b.part)
				_check_target(b.target, out, in_watch)
			if sum != int(node.total):
				out.append("分流各段之和必须等于总填数")
			if node.branches.size() != 2:
				out.append("分流必须有两条分支")
		"chain":
			_check(node.first, out, ctx)
			_check(node.then, out, ctx)
			if not (node.first.kind in ["dmg", "heal"]):
				out.append("接续的前一效果必须是伤害或治疗")
			if node.then.has("target") and not is_single_pick(node.then.target):
				out.append("接续的后一效果只能作用于单个随从（否则前一效果每个结果都会各自触发一遍，数值会被成倍放大）")
		"copy":
			_check(node.first, out, ctx)
			_check_target(node.target, out, in_watch)
			if not (node.first.kind in ["dmg", "heal"]):
				out.append("复制只能复制伤害或治疗")
			if not is_single_pick(node.target):
				out.append("复制的目标只能是单个随从（每个结果各复制一份，给多个目标会成平方放大）")
		"until":
			cond_check(node.cond, out, ctx)
			_check(node.child, out, ctx)
			if not (node.child.kind in ["dmg", "heal", "mit", "status", "split", "chain", "copy"]):
				out.append("“直到”只能重复伤害、治疗、减伤、状态、分流、接续或复制")
		"if":
			cond_check(node.cond, out, ctx)
			_check(node.then, out, ctx)
			if node.has("else"):
				_check(node["else"], out, ctx)
		"choose":
			_check(node.a, out, ctx)
			_check(node.b, out, ctx)

static func _check_target(t: Dictionary, out: Array, in_watch: bool) -> void:
	if (t.pick == "source" or t.pick == "recipient" or t.pick == "adjacent") and not in_watch:
		out.append("“%s”只能在监听器的效果里使用" % target_text(t))
	if t.pick == "all" or t.pick == "each":
		out.append("“全部/每个”已取消：想作用于几个目标，就写几个“一个”（选择 一个 一个 …，最多%d个）" % MAX_PICK)
	if t.pick == "choose" and (int(t.get("n", 1)) < 1 or int(t.get("n", 1)) > MAX_PICK):
		out.append("“选择”后的“一个”要有 1 到 %d 个" % MAX_PICK)

static func _check_value(v: Dictionary, out: Array, ctx: String) -> void:
	match v.k:
		"ref":
			if v.ref in ["event_damage", "actual", "raw"] and not (ctx in ["damaged", "dealt", "lost", "pending_dmg"]):
				out.append("“%s”只能在伤害类监听器里使用" % REF_TEXT[v.ref])
			if v.ref == "event_heal" and ctx != "healed":
				out.append("“该次治疗”只能在“恢复生命”监听器里使用")
			if v.ref == "overflow" and ctx != "healed":
				out.append("“溢出”只能在“恢复生命”监听器里使用")
			if v.ref == "times" and ctx == "":
				out.append("“次数”只能在监听器里使用")
			if v.has("of"):
				if v.ref == "count":
					if v.of.pick != "all":
						out.append("人数只能写“敌方人数/友方人数”")
				else:
					_check_target(v.of, out, ctx != "")
		"op":
			_check_value(v.a, out, ctx)
			_check_value(v.b, out, ctx)
			if value_terms(v) > MAX_TERMS:
				out.append("一个数值式最多 %d 项" % MAX_TERMS)

# 对照词库存量：返回缺的词 {词名: 缺几张}
static func missing(words: Array, pool: Dictionary) -> Dictionary:
	var need := {}
	for w in words:
		need[w] = int(need.get(w, 0)) + 1
	var miss := {}
	for w in need:
		var have := int(pool.get(w, 0))
		if have < need[w]:
			miss[w] = need[w] - have
	return miss

static func count_words(words: Array) -> Dictionary:
	var c := {}
	for w in words:
		c[w] = int(c.get(w, 0)) + 1
	return c

# ---------------------------------------------------------------- 人话
static func verb_text(kind: String, alt: int, target: String, value: String, is_num: bool = true) -> String:
	if kind == "dmg":
		if alt == 0:
			return ("对%s造成 %s 点伤害" % [target, value]) if is_num else ("对%s造成与 %s 相等的伤害" % [target, value])
		return "使%s的当前生命减少 %s" % [target, value]
	if alt == 0:
		return ("使%s恢复 %s 点生命" % [target, value]) if is_num else ("使%s恢复与 %s 相等的生命" % [target, value])
	return "使%s的当前生命增加 %s" % [target, value]

static func node_text(node: Dictionary) -> String:
	var t := _node_text_core(node)
	if node.get("sync", false):
		t += "（各次同时落下）"
	return t

static func _event_phrase(node: Dictionary) -> String:
	var who: String = ""
	if not (node.event in NO_OBSERVE):
		var ob: Dictionary = node.observe
		if ob.pick in ["all", "each"]:
			who = "任何一个" + SIDE_TEXT.get(ob.get("side", ""), "") + "随从"
		else:
			who = target_text(ob)
	return who + EVENT_TEXT.get(node.event, "某某")

static func _node_text_core(node: Dictionary) -> String:
	match node.kind:
		"hole":
			if node.has("target"):
				return "对%s做某某" % target_text(node.target)
			return "某某"
		"dmg", "heal":
			var t := verb_text(node.kind, int(node.get("alt", 0)), target_text(node.target), _num_text(node, node.value), node.value.k == "num")
			t += mods_clause(node, "伤害" if node.kind == "dmg" else "治疗")
			if int(node.get("rep", 0)) > 0:
				var gap := int(node.get("rep_gap", 0)) if int(node.get("rep_gap", 0)) > 0 else 2
				t += "；之后每隔 %d 秒再来一次，共再来 %d 次" % [gap, int(node.rep)]
			return _after_text(node) + t
		"mit":
			var s: String = "使%s受到的伤害%s" % [target_text(node.target), ("每次减少 %s 点" % ("某某" if int(node.value.n) < 0 else str(int(node.value.n) / 2))) if node.get("mode", "") == "fixed" else ("降低 %s" % ("某某" if int(node.value.n) < 0 else "%d%%" % pct_of(int(node.value.n))))]
			return s + mods_clause(node, "效果") + _dur_text(int(node.get("dur", 0)))
		"status":
			var s2: String = "给%s叠 %s 层【%s】" % [target_text(node.target), "1" if int(node.get("dbl", 0)) == 0 else str(1 << int(node.dbl)), node.status]
			if STATUS_DESC.has(node.status):
				s2 += "（%s）" % STATUS_DESC[node.status]
			return _after_text(node) + s2
		"remove":
			return "移除%s身上的%s" % [target_text(node.target), node.what]
		"watch":
			if node.event == "round_end":
				return "本轮结束时，" + node_text(node.child)
			var when := "本轮内，" if node.life != "dur" else "接下来 %d 秒内，" % int(node.get("dur", 0))
			var f := "每当" if node.freq == "every" else "第一次"
			return "%s%s%s时，%s" % [when, f, _event_phrase(node), node_text(node.child)]
		"redirect":
			return "改由%s承受这次伤害（每个被保护的随从最多转移 %s 点%s）" % [target_text(node.target), "某某" if int(node.value.n) < 0 else str(int(node.value.n)), mods_clause(node, "上限")]
		"convert":
			return "伤害照常落下，随后返还等量治疗（共用上限 %s 点%s；致命伤救不回）" % ["某某" if int(node.value.n) < 0 else str(int(node.value.n)), mods_clause(node, "上限")]
		"time":
			var who: String = SIDE_TEXT.get(node.side, "某某") + "接下来第一个起效的技能"
			var tn: String = "某某" if int(node.value.n) < 0 else str(int(node.value.n))
			var tclause: String = mods_clause(node, "数值")
			match node.op:
				"delay": return "把%s推迟 %s 秒%s" % [who, tn, tclause]
				"advance": return "把%s提前 %s 秒%s" % [who, tn, tclause]
				"interrupt": return "打断%s（取消它尚未起效的技能，不论费用）" % who
				_: return "对%s做某某" % who
		"swap":
			return "自身与%s交换位置" % target_text(node.target)
		"split":
			var parts: Array = []
			for b in node.branches:
				parts.append("%s 分到 %d" % [target_text(b.target), int(b.part)])
			return "把总共 %d 点%s分配出去：%s" % [int(node.total), "伤害" if node.verb == "dmg" else "治疗", "；".join(parts)]
		"chain":
			return node_text(node.first) + "；然后" + node_text(node.then)
		"copy":
			return node_text(node.first) + "；同样的数值也对" + target_text(node.target) + "生效"
		"until":
			var gap2 := int(node.get("gap", 0)) if int(node.get("gap", 0)) > 0 else 2
			return "%s；每隔 %d 秒再来一次，直到 %s 为止（最多再来 %d 次）" % [node_text(node.child), gap2, cond_text(node.cond), UNTIL_MAX]
		"if":
			var s3 := "如果%s，就%s" % [cond_text(node.cond), node_text(node.then)]
			if node.has("else"):
				s3 += "；否则%s" % node_text(node["else"])
			return s3
		"choose":
			return "二选一，宣告时决定：%s，或者%s" % [node_text(node.a), node_text(node.b)]
	return "?"

static func effective_num(node: Dictionary) -> int:
	var v := int(node.value.n)
	for i in int(node.get("dbl", 0)):
		v *= 2
	for i in int(node.get("half", 0)):
		v = (v + 1) / 2
	return v

# 打断/沉默不再有“只对某费用以下的技能起效”的限制：不论对方技能多贵，都能打断、都能沉默。
# 数字只决定这张牌自己的价格。这里保留函数是为了兼容旧调用：返回一个永远够大的上限。
static func silence_limit(_p: int) -> int:
	return 9999

static func pct_of(points: int) -> int:
	return int(round(100.0 * points / (points + 20.0)))

static func describe(sk: Dictionary) -> String:
	var parts: Array = []
	for n in sk.nodes:
		parts.append(node_text(n))
	return "；另外，".join(parts)

# 技能的粗分类，用于界面图标与AI：atk / def / heal / ctl / buff
static func kind_tag(sk: Dictionary) -> String:
	return _node_tag(sk.nodes[0]) if not sk.nodes.is_empty() else "atk"


static func _node_tag(n: Dictionary) -> String:
	match n.kind:
		"dmg", "split", "copy", "chain", "until": return "atk"
		"heal": return "heal"
		"mit": return "def"
		"watch": return "trap"
		"time", "remove", "swap": return "ctl"
		"status":
			match str(n.get("status", "")):
				"铁壁": return "def"
				"蓄力": return "buff"
				_: return "ctl"
	return "atk"

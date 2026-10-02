extends RefCounted
# 人话连接字：在拼句台的词牌之间插入灰色的小字，让整句读起来像一句话。
# 只是显示用，不是词，点不了，也不占词库。没有把握的位置就什么都不加。
# 例：选择 一个 敌方 随从 ，对其 造成 8 点 伤害 。

const TRIG := ["即将受到伤害", "受到伤害", "造成伤害", "恢复生命", "失去生命", "被选为目标", "发动技能", "技能命中", "状态施加", "状态结束", "倒下", "队友倒下", "敌人倒下", "回合结束"]
const NOUNS := ["随从", "自身", "接受者", "技能", "状态", "限时效果"]
const LEAD := ["复制", "分流", "接续", "延后", "提前", "换位", "直到", "当"]
const PICK := ["最低生命", "最高生命", "另一个", "最前", "最后"]

static func _v(tokens: Array, i: int) -> String:
	if i < 0 or i >= tokens.size():
		return "^"
	var t: Dictionary = tokens[i]
	return "N" if str(t.t) == "N" else str(t.v)

# 当前这组“选择 一个 一个 …”里有几个“一个”（最近的一组）
static func _group_n(tokens: Array, i: int) -> int:
	var n := 0
	var k := i - 1
	while k >= 0:
		var v := _v(tokens, k)
		if v == "一个":
			n += 1
		elif v in ["敌方", "友方", "随从", "最低生命", "最高生命", "另一个", "最前", "最后", "选择"]:
			if n > 0 or v == "选择":
				break
		else:
			break
		k -= 1
	return maxi(n, 1)

static func _lead(tokens: Array) -> String:
	for t in tokens:
		if str(t.t) == "W":
			var v := str(t.v)
			if v in ["复制", "分流", "接续", "延后", "提前", "换位", "直到"]:
				return v
			return ""
	return ""

# 第 i 张牌前面插什么字
static func before(tokens: Array, i: int) -> String:
	var C := _v(tokens, i)
	var P := _v(tokens, i - 1)
	var PP := _v(tokens, i - 2)
	if P == "^":
		return ""
	var lead := _lead(tokens)
	# 每次 之后紧跟的动作，不再加逗号（“每次”本身前面已经有逗号了）
	if P == "每次" and C != "来源":
		return ""
	if P == "并" and C == "选择":
		return ""
	if P == "自身" and C in ["恢复", "减伤", "施加", "造成", "移除"]:
		return ""
	match C:
		"选择":
			if lead == "分流" and P == "伤害":
				return "："
			if P == "当" or P in ["复制", "接续", "换位", "之后"]:
				return ""
			if P in TRIG:
				return "时，"
			if P == "N" and PP == "之后":
				return "秒后，"
			if P in ["每次", "并"]:
				return "，"
			if P in ["伤害", "生命", "N", "技能", "限时效果"]:
				return "，再"
			return "，"
		"每次":
			return "，"
		"造成":
			if P == "分流":
				return ""
			if P == "来源":
				return ""
			if lead == "直到" and P in NOUNS:
				return ""
			if P in NOUNS:
				return "，对它们" if _group_n(tokens, i) > 1 else "，对其"
			return "，"
		"来源":
			if P == "每次":
				return "对"
			if P == "转移":
				return "到"
			return ""
		"恢复":
			if P in NOUNS:
				return "，使其"
			if P == "转为":
				return ""
			return "，"
		"减伤":
			if P in NOUNS:
				return "，使其"
			return "，"
		"施加":
			return "，对其"
		"增加", "减少":
			return "，对其" if P in NOUNS else "，"
		"移除":
			return "，对其" if P in NOUNS else "，"
		"转移", "转为":
			return "，"
		"自身":
			if P in ["伤害", "N", "生命"] and lead == "接续":
				return "，接着让"
			return ""
		"N":
			if P == "随从" and lead == "分流":
				return "分到 "
			if P == "来源":
				return "，最多 "
			return ""
		"伤害", "生命":
			if P == "N" or P in ["该次伤害", "该次治疗"]:
				return "点"
			return ""
		"双倍", "重复":
			return "，并"
		"持久":
			return "，再" if P == "持久" else "，并"
		"并":
			return "，"
		"之后":
			return "" if P == "并" else "，"
		"当前生命":
			return "的" if P in NOUNS else ""
		_:
			pass
	if C in TRIG:
		return "" if (P in NOUNS or P == "当") else "，"
	if C in PICK:
		if P == "N" and lead == "直到":
			return "，对"
		if P in ["伤害", "N"]:
			if lead == "复制":
				return "，复制给"
			if lead == "分流":
				return "，"
		return ""
	return ""

# 整句拼完之后的收尾
static func tail(tokens: Array, complete: bool) -> String:
	if not complete or tokens.is_empty():
		return ""
	var last := _v(tokens, tokens.size() - 1)
	var lead := _lead(tokens)
	if last == "N" and lead in ["延后", "提前"]:
		return "秒。"
	return "。"

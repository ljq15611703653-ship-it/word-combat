extends RefCounted
# 数字牌模式 · 把句子翻译成人话（界面、日志、电脑的宣告都用这一套）

const NR = preload("res://scripts/numcard/nc_rules.gd")

static func unit_name(M, uid: int) -> String:
	if M == null:
		return "某某"
	var u: Dictionary = M.R.U[uid]
	return ("你的" if int(u.side) == 0 else "对手的") + str(u.name)

static func _targets(M, c: Dictionary) -> String:
	var tg: Array = c.get("tg", [])
	if str(c.get("tmode", "choose")) == "self":
		return "自身"
	if not tg.is_empty() and M != null:
		var names: Array = []
		for t in tg:
			names.append(unit_name(M, int(t)))
		return "、".join(names)
	var n: int = int(c.get("count", tg.size()))
	var side: String = "敌方" if str(c.get("side", "enemy")) == "enemy" else "友方"
	return "你选的 %d 个%s随从" % [maxi(n, 1), side]

# 一段的人话
static func clause_text(M, c: Dictionary) -> String:
	var who := _targets(M, c)
	match str(c.k):
		"atk":
			var t := "对%s造成 %d 点伤害" % [who, int(c.n)]
			if int(c.get("rep", 1)) > 1:
				t += "，一共打 %d 次" % int(c.rep)
			return t
		"heal":
			var t2 := "使%s恢复 %d 点生命" % [who, int(c.n)]
			if int(c.get("rep", 1)) > 1:
				t2 += "，一共 %d 次" % int(c.rep)
			return t2
		"mit":
			return "本轮%s每次受到的伤害少 %d 点" % [who, int(c.n)]
		"st":
			var nm: String = str(c.st)
			var tail := "（持续 %d 轮，每过一轮 +1 级）" % int(c.n) if int(c.n) > 1 else "（只撑本轮）"
			return "给%s施加【%s】%s" % [who, nm, tail]
		"reflect":
			return "本轮%s被敌人打中时，把伤害原样打回出手的人" % who
		"redirect":
			return "本轮打向%s的敌方伤害，转给出手的人" % who
		"delay":
			var a := ""
			if M != null and int(c.get("act", -1)) >= 0:
				for b in M.declared:
					if int(b.ord) == int(c.act):
						a = "（%s 第 %d 秒那句）" % [unit_name(M, int(b.uid)), int(b.start)]
			return "把对方的一句%s往后推 %d 秒" % [a, int(c.n)]
		"remove":
			return "拆掉%s身上的保护和增益" % who
	return "？"

static func action_text(M, cls: Array) -> String:
	var parts: Array = []
	for c in cls:
		parts.append(clause_text(M, c))
	return "；并且".join(parts)

static func status_chip(nm: String, e: Array, rnd: int) -> String:
	var left: int = int(e[1]) - rnd + 1
	return "%s%d级·剩%d轮" % [nm, int(e[0]), maxi(left, 0)]

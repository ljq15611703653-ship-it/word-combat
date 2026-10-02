extends RefCounted
# 数字牌模式 · 把句子翻译成人话（界面、日志、电脑的宣告、拼句台的预览都用这一套）
# 还没定的数字写成“几”，还没定的目标写成“某某”，这样拼到一半也能读出整句话的意思。

const NR = preload("res://scripts/numcard/nc_rules.gd")

static func unit_name(M, uid: int) -> String:
	if M == null:
		return "某某"
	var u: Dictionary = M.R.U[uid]
	return ("你的" if int(u.side) == 0 else "对手的") + str(u.name)

# viewer：从谁的角度看（择流的待定目标，对手看不到）
static func _targets(M, c: Dictionary, viewer: int = 0, owner: int = 0) -> String:
	var tg: Array = c.get("tg", [])
	var mode: String = str(c.get("tmode", "choose"))
	if mode == "self":
		return "自身"
	var n: int = int(c.get("count", tg.size()))
	var side: String = "敌方" if str(c.get("side", "enemy")) == "enemy" else "友方"
	var ncount := ("%d 个" % n) if c.has("count") and n > 0 else "几个"
	if mode == "late":
		if tg.is_empty() or (M != null and viewer != owner and not bool(c.get("shown", false))):
			return "%s%s随从（待定：宣告完再定）" % [ncount, side]
	if not tg.is_empty() and M != null:
		var names: Array = []
		for t in tg:
			names.append(unit_name(M, int(t)))
		return "、".join(names)
	return "%s%s随从" % [ncount, side]

static func _num(c: Dictionary, key: String) -> String:
	return str(int(c[key])) if c.has(key) else "几"

# 一段的人话
static func clause_text(M, c: Dictionary, viewer: int = 0, owner: int = 0) -> String:
	var who := _targets(M, c, viewer, owner)
	var cont: int = int(c.get("cont", 1))
	var tail := ("，以后每轮同一秒再来一次（共 %d 轮）" % cont) if cont > 1 else ""
	match str(c.get("k", "")):
		"atk":
			var t := "对%s造成 %s 点伤害" % [who, _num(c, "n")]
			if int(c.get("rep", 1)) > 1:
				t += "，一共打 %d 次" % int(c.rep)
			return t + tail
		"heal":
			var t2 := "使%s恢复 %s 点生命" % [who, _num(c, "n")]
			if int(c.get("rep", 1)) > 1:
				t2 += "，一共 %d 次" % int(c.rep)
			return t2 + tail
		"mit":
			return "本轮%s每次受到的伤害少 %s 点" % [who, _num(c, "n")] + tail
		"st":
			var nm: String = str(c.get("st", "某个状态"))
			var dur: int = int(c.get("n", 1))
			var tl := "（持续 %d 轮，每过一轮 +1 级）" % dur if dur > 1 else "（只撑本轮）"
			return "给%s施加【%s】%s" % [who, nm, tl]
		"redirect":
			return "本轮打向%s的敌方伤害，转给出手的人" % who
		"delay":
			var a := ""
			if M != null and int(c.get("act", -1)) >= 0:
				for b in M.declared:
					if int(b.ord) == int(c.act):
						a = "（%s 第 %d 秒那句）" % [unit_name(M, int(b.uid)), int(b.start)]
			return "把对方的一句%s往后推 %s 秒" % [a, _num(c, "n")]
		"remove":
			return "拆掉%s身上的减伤、转移，掐断它的续" % (who if not (c.get("tg", []) as Array).is_empty() else "一个敌人")
	return "……"

static func action_text(M, cls: Array, viewer: int = 0, owner: int = 0) -> String:
	var parts: Array = []
	for c in cls:
		parts.append(clause_text(M, c, viewer, owner))
	return "；并且".join(parts)

static func status_chip(nm: String, e: Array, rnd: int) -> String:
	var left: int = int(e[1]) - rnd + 1
	return "%s%d级·剩%d轮" % [nm, int(e[0]), maxi(left, 0)]

static func cont_chip(c: Dictionary) -> String:
	var k: String = str(c.cl.k)
	var nm: String = {"atk": "打%d" % int(c.cl.n), "heal": "奶%d" % int(c.cl.n), "mit": "减伤%d" % int(c.cl.n)}.get(k, k)
	return "续·%s·第%d秒·还%d轮" % [nm, int(c.start), int(c.left)]

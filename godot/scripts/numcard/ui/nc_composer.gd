extends Control
# 数字牌模式 · 拼句台：一张一张点词和数字牌，拼成一句（最多三段，用“并”连起来）。
# 数字就是次数：选几个目标、打几点、重复几次、持续几轮、延后几秒，都放一张数字牌；1 免费，其余要用手里的牌。
# 完成后发出 done(clauses)：每段带 tmode/side/count，具体打谁在战斗界面点。

const K = preload("res://scripts/ui/kit.gd")
const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")
const NT = preload("res://scripts/numcard/nc_text.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")

signal done(clauses)
signal cancelled()

const BASIC_DESC := {
	"选择": "选几个目标：后面放一张数字牌（几个），再说敌方还是友方",
	"自身": "目标是出手的这个随从自己",
	"敌方": "对方的随从", "友方": "自己这边的随从", "随从": "随从",
	"造成": "打伤害：后面放数字牌（几点）", "伤害": "伤害",
	"恢复": "回血：后面放数字牌（几点）", "生命": "生命",
	"减伤": "本轮每次少受几点伤害：后面放数字牌",
	"施加": "上一个状态（要卡组里的状态词）",
	"持续": "状态撑几轮：后面放数字牌（不写就只撑本轮）",
	"重复": "再来几次：后面放数字牌（一共几次）",
	"并": "接着说下一段（每多一段 +%d 行动点，最多 %d 段）" % [NR.AND_COST, NR.CLAUSE_MAX],
}

var M
var uid := -1
var tokens: Array = []
var rail: HFlowContainer
var opt_flow: HFlowContainer
var num_flow: HFlowContainer
var text_label: Label
var info_label: Label
var help_label: Label
var ok_btn: Button
var parsed: Dictionary = {}

func setup(match_obj, unit_id: int, init_tokens: Array = []) -> void:
	M = match_obj
	uid = unit_id
	tokens = init_tokens.duplicate(true)
	K.clear_children(self)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.8)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var mc := MarginContainer.new()
	mc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		mc.add_theme_constant_override("margin_" + side, 40)
	add_child(mc)
	var p := K.panel(Color("141826"), K.GOLD, 18, 3, 16)
	mc.add_child(p)
	var v := K.vbox(10)
	p.add_child(v)
	var head := K.hbox(10)
	var u: Dictionary = M.R.U[uid]
	head.add_child(K.label("给【%s】拼一句" % str(u.name), 28, K.GOLD))
	head.add_child(K.chip("本轮还剩行动点 %d" % int(M.res[0].ap), Color("7a6424"), 16))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	var undo := K.button("撤回一张", "normal", 16)
	undo.pressed.connect(_undo)
	head.add_child(undo)
	var clr := K.button("全部拿下", "ghost", 16)
	clr.pressed.connect(func():
		tokens.clear()
		_refresh())
	head.add_child(clr)
	var cancel := K.button("取消", "ghost", 16)
	cancel.pressed.connect(func(): cancelled.emit())
	head.add_child(cancel)
	v.add_child(head)
	var rail_box := K.panel(Color("2a0d14"), Color("a3121f"), 12, 2)
	rail_box.custom_minimum_size = Vector2(0, 110)
	rail = HFlowContainer.new()
	rail.add_theme_constant_override("h_separation", 6)
	rail.add_theme_constant_override("v_separation", 6)
	rail_box.add_child(rail)
	v.add_child(rail_box)
	text_label = K.wrap_label("", 20, Color("f1e3b0"))
	v.add_child(text_label)
	help_label = K.wrap_label("", 16, Color("9fd0ff"))
	v.add_child(help_label)
	v.add_child(K.label("下一张可以接", 16, K.MUTED))
	opt_flow = HFlowContainer.new()
	opt_flow.add_theme_constant_override("h_separation", 8)
	opt_flow.add_theme_constant_override("v_separation", 8)
	v.add_child(opt_flow)
	v.add_child(K.label("你的数字牌（1 免费无限用；放进句子里的那张本轮就用掉了）", 16, K.MUTED))
	num_flow = HFlowContainer.new()
	num_flow.add_theme_constant_override("h_separation", 8)
	num_flow.add_theme_constant_override("v_separation", 8)
	v.add_child(num_flow)
	var sp2 := Control.new()
	sp2.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(sp2)
	var foot := K.hbox(12)
	info_label = K.wrap_label("", 17, K.TEXT)
	info_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	foot.add_child(info_label)
	ok_btn = K.button("拼好了 → 去选目标", "primary", 22)
	ok_btn.custom_minimum_size = Vector2(320, 54)
	ok_btn.pressed.connect(_ok)
	foot.add_child(ok_btn)
	v.add_child(foot)
	_refresh()

# ---------------------------------------------------------------- 语法：一边读一边建段落
func parse(toks: Array) -> Dictionary:
	var clauses: Array = []
	var cur = null
	var expect := "start"
	var glue: Array = []
	for tok in toks:
		var g := ""
		var w: String = str(tok.v) if str(tok.t) == "w" else ""
		var n: int = int(tok.v) if str(tok.t) == "n" else 0
		match expect:
			"start":
				if w == "选择":
					cur = {"tmode": "choose"}
					expect = "count"
				elif w == "自身":
					cur = {"tmode": "self", "side": "ally", "count": 1}
					expect = "action"
					g = "，"
				elif w == "延后":
					cur = {"k": "delay", "act": -1, "tg": []}
					expect = "delay_n"
				elif w == "移除":
					cur = {"k": "remove", "tmode": "pick", "side": "enemy", "count": 1, "tg": []}
					expect = "end"
					g = "一个敌人身上的保护"
				else:
					return {"err": "这里要以【选择】【自身】【延后】【移除】开头"}
			"count":
				cur["count"] = n
				expect = "side"
				g = "个"
			"side":
				cur["side"] = "enemy" if w == "敌方" else "ally"
				expect = "unit"
			"unit":
				expect = "action"
				g = "，"
			"action":
				match w:
					"造成":
						cur["k"] = "atk"
						expect = "atk_n"
					"恢复":
						cur["k"] = "heal"
						expect = "heal_n"
					"减伤":
						cur["k"] = "mit"
						expect = "mit_n"
					"施加":
						cur["k"] = "st"
						expect = "st_name"
					"回敬":
						cur["k"] = "reflect"
						cur["cap"] = null
						expect = "end"
					"转移":
						cur["k"] = "redirect"
						cur["cap"] = null
						expect = "end"
			"atk_n":
				cur["n"] = n
				expect = "atk_dmg"
				g = "点"
			"atk_dmg":
				cur["rep"] = 1
				expect = "end_rep"
			"heal_n":
				cur["n"] = n
				expect = "heal_hp"
				g = "点"
			"heal_hp":
				cur["rep"] = 1
				expect = "end_rep"
			"mit_n":
				cur["n"] = n
				expect = "end"
				g = "点"
			"st_name":
				cur["st"] = w
				cur["n"] = 1
				expect = "end_dur"
			"rep_n":
				cur["rep"] = n
				expect = "end"
				g = "次"
			"dur_n":
				cur["n"] = n
				expect = "end"
				g = "轮"
			"delay_n":
				cur["n"] = n
				expect = "end"
				g = "秒"
			"end_rep", "end_dur", "end":
				if w == "重复" and expect == "end_rep":
					expect = "rep_n"
					g = ""
				elif w == "持续" and expect == "end_dur":
					expect = "dur_n"
				elif w == "并":
					clauses.append(cur)
					cur = null
					expect = "start"
		glue.append(g)
	var complete: bool = cur != null and expect in ["end", "end_rep", "end_dur"]
	var all_cl: Array = clauses.duplicate()
	if complete:
		all_cl.append(cur)
	return {"clauses": all_cl, "done": clauses, "cur": cur, "expect": expect, "complete": complete, "glue": glue}

func _used_values() -> Dictionary:
	var out := {}
	for t in tokens:
		if str(t.t) == "n" and int(t.v) > 1:
			out[int(t.v)] = int(out.get(int(t.v), 0)) + 1
	return out

func _used_words() -> Dictionary:
	var out := {}
	for t in tokens:
		if str(t.t) == "w" and NR.WORDS.has(str(t.v)):
			out[str(t.v)] = int(out.get(str(t.v), 0)) + 1
	return out

func word_left(w: String) -> int:
	return int(M.res[0].words.get(w, 0)) - int(_used_words().get(w, 0))

func _alive(side: String) -> int:
	var n := 0
	for u in M.R.U:
		if int(u.down) == -1 and ((int(u.side) == 1) == (side == "enemy")):
			n += 1
	return n

func _enemy_declared() -> bool:
	for a in M.declared:
		if int(a.side) == 1:
			return true
	return false

# 现在能接的词：[{w, ok, why}]，以及要不要数字
func options() -> Dictionary:
	var pr := parse(tokens)
	var e: String = str(pr.get("expect", "start"))
	var cur = pr.get("cur")
	var ws: Array = []
	var need_num := false
	var nclauses: int = (pr.get("done", []) as Array).size()
	match e:
		"start":
			ws = [["选择", true, ""], ["自身", true, ""]]
			ws.append(["延后", word_left("延后") > 0 and _enemy_declared(), "要卡组里有【延后】，并且对手已经宣告过" if not (word_left("延后") > 0 and _enemy_declared()) else ""])
			ws.append(["移除", word_left("移除") > 0, "" if word_left("移除") > 0 else "卡组里的【移除】用完了或在冷却"])
		"count", "atk_n", "heal_n", "mit_n", "rep_n", "dur_n", "delay_n":
			need_num = true
		"side":
			var cnt: int = int(cur.get("count", 1))
			ws = [["敌方", _alive("enemy") >= cnt, "" if _alive("enemy") >= cnt else "对面只剩 %d 个随从" % _alive("enemy")],
				["友方", _alive("ally") >= cnt, "" if _alive("ally") >= cnt else "你只剩 %d 个随从" % _alive("ally")]]
		"unit":
			ws = [["随从", true, ""]]
		"action":
			if str(cur.get("side", "enemy")) == "enemy":
				ws = [["造成", true, ""], ["施加", _any_status("enemy"), "" if _any_status("enemy") else "卡组里没有能用的易伤/灼烧/衰弱"]]
			else:
				ws = [["恢复", true, ""], ["减伤", true, ""], ["造成", true, "（打自己人：治疗职业可以自残再奶）"],
					["施加", _any_status("ally"), "" if _any_status("ally") else "卡组里没有能用的蓄力/铁壁"],
					["回敬", word_left("回敬") > 0, "" if word_left("回敬") > 0 else "【回敬】用完了或在冷却"],
					["转移", word_left("转移") > 0, "" if word_left("转移") > 0 else "【转移】用完了或在冷却"]]
		"atk_dmg":
			ws = [["伤害", true, ""]]
		"heal_hp":
			ws = [["生命", true, ""]]
		"st_name":
			var names: Array = ["易伤", "灼烧", "衰弱"] if str(cur.get("side", "enemy")) == "enemy" else ["蓄力", "铁壁"]
			for nm in names:
				ws.append([nm, word_left(nm) > 0, "" if word_left(nm) > 0 else "用完了或在冷却"])
		"end_rep":
			ws = [["重复", true, ""]]
		"end_dur":
			ws = [["持续", true, ""]]
	if e in ["end", "end_rep", "end_dur"] and nclauses + 1 < NR.CLAUSE_MAX:
		ws.append(["并", true, ""])
	return {"words": ws, "num": need_num, "parsed": pr}

func _any_status(side: String) -> bool:
	var names: Array = ["易伤", "灼烧", "衰弱"] if side == "enemy" else ["蓄力", "铁壁"]
	for nm in names:
		if word_left(nm) > 0:
			return true
	return false

# ---------------------------------------------------------------- 点击
func add_word(w: String) -> void:
	var op := options()
	for item in op.words:
		if str(item[0]) == w and bool(item[1]):
			tokens.append({"t": "w", "v": w})
			Sfx.play("stamp")
			_refresh()
			return

func add_number(n: int) -> void:
	var op := options()
	if not bool(op.num):
		return
	if n > 1:
		var have: int = int(M.usable_values(0).get(n, 0))
		if int(_used_values().get(n, 0)) >= have:
			return
	tokens.append({"t": "n", "v": n})
	Sfx.play("stamp")
	_refresh()

func _undo() -> void:
	if not tokens.is_empty():
		tokens.pop_back()
		Sfx.play("click")
		_refresh()

func _ok() -> void:
	var pr := parse(tokens)
	if not bool(pr.complete):
		return
	done.emit((pr.clauses as Array).duplicate(true))

# ---------------------------------------------------------------- 显示
func _tile(text: String, col: Color, big: bool = false) -> PanelContainer:
	var t := PanelContainer.new()
	t.custom_minimum_size = Vector2(64 if big else 76, 76)
	t.add_theme_stylebox_override("panel", K.style(Color("202638"), col, 9, 2, 3))
	var l := K.label(text, 30 if big else (24 if text.length() <= 2 else 18), K.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	t.add_child(l)
	return t

func _word_color(w: String) -> Color:
	if NR.WORDS.has(w):
		return K.GOLD
	return Color("5a6a8a")

func _refresh() -> void:
	var op := options()
	var pr: Dictionary = op.parsed
	parsed = pr
	K.clear_children(rail)
	var glue: Array = pr.get("glue", [])
	for i in tokens.size():
		var t: Dictionary = tokens[i]
		var tile: PanelContainer
		if str(t.t) == "n":
			tile = _tile(str(t.v), Color("e0b85c") if int(t.v) > 1 else Color("8a8a8a"), true)
		else:
			tile = _tile(str(t.v), _word_color(str(t.v)))
		rail.add_child(tile)
		if i < glue.size() and str(glue[i]) != "":
			var gl := K.label(str(glue[i]), 22, Color("b9a68a"))
			gl.custom_minimum_size = Vector2(0, 76)
			gl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			rail.add_child(gl)
	var ghost := _tile("?", Color(1, 1, 1, 0.15))
	ghost.modulate.a = 0.4
	rail.add_child(ghost)
	# 人话
	if pr.has("err"):
		text_label.text = str(pr.err)
	elif bool(pr.get("complete", false)):
		text_label.text = "这句话：" + NT.action_text(null, pr.clauses) + "。"
	else:
		var done_cl: Array = pr.get("done", [])
		text_label.text = ("已经拼好：" + NT.action_text(null, done_cl) + "；正在拼下一段…") if not done_cl.is_empty() else "还没拼完。"
	help_label.text = _help(str(pr.get("expect", "start")))
	# 词
	K.clear_children(opt_flow)
	for item in op.words:
		var w: String = str(item[0])
		var b := K.button(w, "primary" if bool(item[1]) and NR.WORDS.has(w) else "normal", 22)
		b.custom_minimum_size = Vector2(96, 56)
		b.disabled = not bool(item[1])
		var tip: String = str(NR.WORDS[w].desc) if NR.WORDS.has(w) else str(BASIC_DESC.get(w, ""))
		if NR.WORDS.has(w):
			tip += "\n（进阶词：卡组里还能用 %d 张，价格 %d）" % [word_left(w), int(NR.WORDS[w].price)]
		if str(item[2]) != "":
			tip += "\n" + str(item[2])
		b.tooltip_text = tip
		var ww := w
		b.pressed.connect(func(): add_word(ww))
		opt_flow.add_child(b)
	if op.words.is_empty() and not bool(op.num):
		opt_flow.add_child(K.label("（这一段拼完了）", 16, K.MUTED))
	# 数字牌
	K.clear_children(num_flow)
	var have: Dictionary = M.usable_values(0)
	var used := _used_values()
	var b1 := K.button("1（免费）", "primary" if bool(op.num) else "normal", 22)
	b1.custom_minimum_size = Vector2(120, 56)
	b1.disabled = not bool(op.num)
	b1.pressed.connect(func(): add_number(1))
	num_flow.add_child(b1)
	var vals: Array = have.keys()
	vals.sort()
	for v in vals:
		var left: int = int(have[v]) - int(used.get(v, 0))
		var bn := K.button("%d ×%d" % [int(v), left], "primary" if bool(op.num) and left > 0 else "normal", 22)
		bn.custom_minimum_size = Vector2(110, 56)
		bn.disabled = not (bool(op.num) and left > 0)
		var vv: int = int(v)
		bn.pressed.connect(func(): add_number(vv))
		num_flow.add_child(bn)
	var cooling := 0
	for c in M.sides[0].cards:
		if not bool(c.once) and M.rnd - int(c.last) < 2:
			cooling += 1
	if cooling > 0:
		num_flow.add_child(K.chip("另有 %d 张在冷却（上一轮用过的阶梯牌）" % cooling, Color("5a3a3f"), 14))
	# 花费
	if bool(pr.get("complete", false)):
		var cl: Array = pr.clauses
		var cost := NE.action_cost(cl)
		var ms := NE.action_windup(cl)
		info_label.text = "花 %d 行动点（还剩 %d）· 最早第 %d 秒起效 · 用数字牌 %s" % [cost, int(M.res[0].ap), ms, str(NE.action_numbers(cl)) if not NE.action_numbers(cl).is_empty() else "无（全是 1）"]
		ok_btn.disabled = cost > int(M.res[0].ap)
		if cost > int(M.res[0].ap):
			info_label.text += "  —— 行动点不够"
	else:
		info_label.text = "拼完整之后才能用。"
		ok_btn.disabled = true

func _help(e: String) -> String:
	match e:
		"start":
			return "第一张：【选择】几个目标 / 【自身】 / 【延后】对方的一句 / 【移除】敌人的保护。"
		"count":
			return "选几个目标？放一张数字牌：1 免费；2、3 要用手里的牌。"
		"side":
			return "选敌方还是友方？"
		"unit":
			return "接【随从】。"
		"action":
			return "要做什么？"
		"atk_n":
			return "打几点？放一张数字牌。"
		"heal_n":
			return "回几点血？放一张数字牌。"
		"mit_n":
			return "本轮每次少受几点？放一张数字牌。"
		"st_name":
			return "上哪个状态？"
		"rep_n":
			return "一共打几次？放一张数字牌。"
		"dur_n":
			return "持续几轮？放一张数字牌（状态每过一轮自己 +1 级）。"
		"delay_n":
			return "往后推几秒？放一张数字牌。推出第 %d 秒就落空。" % NR.TIMELINE
		"end_rep":
			return "可以拼好了；也可以接【重复】让它多打几次，或者【并】接下一段。"
		"end_dur":
			return "可以拼好了；也可以接【持续】让状态多撑几轮，或者【并】接下一段。"
		"end":
			return "可以拼好了；也可以【并】接下一段。"
	return ""

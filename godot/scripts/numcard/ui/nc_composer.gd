extends Control
# 数字牌模式 · 拼句台：一张一张点词和数字牌，拼成一句（用“并”连成多段；并流能拼更长）。
# 数字就是次数：选几个目标、打几点、重复几次、持续几轮、延后几秒，都放一张数字牌；1 免费，其余要用手里的牌。
# 拼之前就能看到人话：每个能接的词、每张数字牌，鼠标移上去就显示“接上它以后这句话怎么说”；
# 拼到一半，没定的数字写成“几”、没定的目标写成“几个”，整句话一直读得通。
# 完成后发出 done(clauses)：每段带 tmode/side/count，具体打谁在战斗界面点（择流不用点：宣告完再定）。

const K = preload("res://scripts/ui/kit.gd")
const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")
const NT = preload("res://scripts/numcard/nc_text.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const NAI = preload("res://scripts/numcard/nc_ai.gd")

signal done(clauses)
signal cancelled()

const BASIC_DESC := {
	"选择": "选几个目标：后面放一张数字牌（几个），再说敌方还是友方",
	"自身": "目标是出手的这个随从自己",
	"敌方": "对方的随从", "友方": "自己这边的随从",
	"造成": "打伤害：后面放数字牌（几点）",
	"恢复": "回血：后面放数字牌（几点）",
	"减伤": "本轮每次少受几点伤害：后面放数字牌",
	"持续": "撑几轮：后面放数字牌",
	"重复": "再来几次：后面放数字牌（一共几次）",
	"并": "接着说下一段",
}

var M
var uid := -1
var tokens: Array = []
var rail: HFlowContainer
var opt_flow: HFlowContainer
var num_flow: HFlowContainer
var text_label: Label
var preview_label: Label
var info_label: Label
var help_label: Label
var ok_btn: Button
var parsed: Dictionary = {}
var cp: Dictionary = {}
var sugg_box: VBoxContainer
var sugg: Dictionary = {}       # 用了哪条建议：{act, tokens}，原样拼好时连目标、秒数一起带过去

func setup(match_obj, unit_id: int, init_tokens: Array = []) -> void:
	M = match_obj
	uid = unit_id
	cp = M.caps(0)
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
	var cls: String = M.cls_of(0)
	head.add_child(K.chip(NR.CLASS_NAME[cls], NR.CLASS_COLOR[cls], 16))
	head.add_child(K.chip("本轮还剩行动点 %d" % int(M.res[0].ap), Color("7a6424"), 16))
	if int(cp.blood) > 0:
		head.add_child(K.chip("不够可用血付，最多 %d" % M.blood_room(0, uid), Color("7a1f2a"), 16))
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
	v.add_child(K.wrap_label("职业特长：" + NR.talent_text(cls), 14, Color("c9b27a")))
	# 辅助轮：电脑用同一套估值给这个随从出主意，先读人话，再一键装进句子
	sugg_box = K.vbox(4)
	var sb := K.button("辅助轮：让电脑出几个主意（先看人话，点一下装进来）", "ghost", 15)
	sb.pressed.connect(_show_suggestions)
	sugg_box.add_child(sb)
	v.add_child(sugg_box)
	var rail_box := K.panel(Color("2a0d14"), Color("a3121f"), 12, 2)
	rail_box.custom_minimum_size = Vector2(0, 110)
	rail = HFlowContainer.new()
	rail.add_theme_constant_override("h_separation", 6)
	rail.add_theme_constant_override("v_separation", 6)
	rail_box.add_child(rail)
	v.add_child(rail_box)
	text_label = K.wrap_label("", 20, Color("f1e3b0"))
	v.add_child(text_label)
	preview_label = K.wrap_label("", 17, Color("9fe0b0"))
	v.add_child(preview_label)
	help_label = K.wrap_label("", 16, Color("9fd0ff"))
	v.add_child(help_label)
	v.add_child(K.label("下一张可以接（鼠标移上去，先看接上以后这句话怎么说）", 16, K.MUTED))
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
# 状态（expect）：start → count → side → action → 数值 → end（可接 重复 / 持续 / 并）
# “随从”“伤害”“生命”“施加”这些不带意思的词不用拼：数字就是牌，拼句台自动补成人话的连接字
func parse(toks: Array) -> Dictionary:
	var clauses: Array = []
	var cur = null
	var expect := "start"
	var glue: Array = []
	var late: bool = bool(cp.get("late", false))
	for tok in toks:
		var g := ""
		var w: String = str(tok.v) if str(tok.t) == "w" else ""
		var n: int = int(tok.v) if str(tok.t) == "n" else 0
		match expect:
			"start":
				if w == "选择":
					cur = {"tmode": "late" if late else "choose"}
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
				expect = "action"
				g = "随从，"
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
					"易伤", "灼烧", "衰弱":
						cur["k"] = "st"
						cur["st"] = w
						cur["n"] = 1
						expect = "end"
						g = "（状态）"
					"转移":
						cur["k"] = "redirect"
						expect = "end"
			"atk_n":
				cur["n"] = n
				cur["rep"] = 1
				expect = "end"
				g = "点伤害"
			"heal_n":
				cur["n"] = n
				cur["rep"] = 1
				expect = "end"
				g = "点生命"
			"mit_n":
				cur["n"] = n
				expect = "end"
				g = "点"
			"rep_n":
				cur["rep"] = n
				cur["rep_set"] = true
				expect = "end"
				g = "次"
			"dur_n":
				if str(cur.get("k", "")) == "st":
					cur["n"] = n
				else:
					cur["cont"] = n
				cur["dur_set"] = true
				expect = "end"
				g = "轮"
			"delay_n":
				cur["n"] = n
				expect = "end"
				g = "秒"
			"end":
				if w == "重复":
					expect = "rep_n"
				elif w == "持续":
					expect = "dur_n"
				elif w == "并":
					clauses.append(_clean(cur))
					cur = null
					expect = "start"
		glue.append(g)
	var complete: bool = cur != null and expect == "end"
	var all_cl: Array = clauses.duplicate()
	if complete:
		all_cl.append(_clean(cur))
	return {"clauses": all_cl, "done": clauses, "cur": cur, "expect": expect, "complete": complete, "glue": glue}

func _clean(c: Dictionary) -> Dictionary:
	var d := c.duplicate()
	d.erase("rep_set")
	d.erase("dur_set")
	if not d.has("tg"):
		d["tg"] = []
	return d

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

func _cont_room() -> int:
	return int(cp.slots) - M.conts_of(0).size() - int(M.res[0].conts)

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
			ws = [["敌方", _alive("enemy") >= cnt or str(cur.get("tmode", "")) == "late", "" if _alive("enemy") >= cnt else "对面只剩 %d 个随从" % _alive("enemy")],
				["友方", _alive("ally") >= cnt or str(cur.get("tmode", "")) == "late", "" if _alive("ally") >= cnt else "你只剩 %d 个随从" % _alive("ally")]]
		"action":
			if str(cur.get("side", "enemy")) == "enemy":
				ws = [["造成", true, ""]]
				for nm0 in NR.ENEMY_ST:
					ws.append([nm0, word_left(nm0) > 0, "" if word_left(nm0) > 0 else "卡组里的【%s】用完了或在冷却" % nm0])
			else:
				ws = [["恢复", true, ""], ["减伤", true, ""], ["造成", true, "（打自己人）"],
					["转移", word_left("转移") > 0, "" if word_left("转移") > 0 else "【转移】用完了或在冷却"]]
		"end":
			var k: String = str(cur.get("k", ""))
			if k in ["atk", "heal"] and not bool(cur.get("rep_set", false)):
				ws.append(["重复", true, ""])
			if not bool(cur.get("dur_set", false)):
				if k == "st":
					ws.append(["持续", true, ""])
				elif k in ["atk", "heal", "mit"] and int(cp.slots) > 0:
					var room := _cont_room()
					ws.append(["持续", room > 0, "" if room > 0 else "续挂满了（同时最多 %d 个）" % int(cp.slots)])
	if e == "end" and nclauses + 1 < int(cp.clauses):
		ws.append(["并", true, ""])
	return {"words": ws, "num": need_num, "parsed": pr}

func _any_status() -> bool:
	for nm in NR.ENEMY_ST:
		if word_left(nm) > 0:
			return true
	return false

# ---------------------------------------------------------------- 人话预览
# 拼到一半的句子也翻成人话：没定的写“几”“几个”，还没说做什么就写“……”
func draft_text(toks: Array) -> String:
	var pr := parse(toks)
	if pr.has("err"):
		return str(pr.err)
	var parts: Array = []
	for c in pr.done:
		parts.append(NT.clause_text(M, c))
	var cur = pr.get("cur")
	if cur != null:
		var c2: Dictionary = (cur as Dictionary).duplicate()
		if not c2.has("k"):
			var who := "自身" if str(c2.get("tmode", "")) == "self" else ("%s%s随从" % [("%d 个" % int(c2.count)) if c2.has("count") else "几个", ("敌方" if str(c2.get("side", "enemy")) == "enemy" else "友方") if c2.has("side") else "某方"])
			if str(c2.get("tmode", "")) == "late" and c2.has("side"):
				who += "（待定）"
			parts.append("对%s……" % who)
		else:
			parts.append(NT.clause_text(M, c2))
			if str(pr.expect) == "rep_n":
				parts[parts.size() - 1] += "，一共 几 次"
			if str(pr.expect) == "dur_n":
				parts[parts.size() - 1] += ("，持续 几 轮" if str(c2.k) == "st" else "，以后每轮同一秒再来一次（共 几 轮）")
	var s := "；并且".join(parts)
	if s == "":
		s = "（空）"
	return s

func _preview_with(tok: Dictionary) -> String:
	var t2 := tokens.duplicate()
	t2.append(tok)
	var pr := parse(t2)
	var s := draft_text(t2)
	if bool(pr.get("complete", false)):
		s += "。（到这里就能拼好）"
	return s

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
	var cl: Array = (pr.clauses as Array).duplicate(true)
	# 原样用了建议：目标也照建议的（还能在下一步改）
	if not sugg.is_empty() and str(sugg.tokens) == str(tokens) and cl.size() == (sugg.act.cl as Array).size():
		for i in cl.size():
			var sc: Dictionary = sugg.act.cl[i]
			if str(sc.get("tmode", "")) == "choose" and not (sc.get("tg", []) as Array).is_empty():
				cl[i]["tg"] = (sc.tg as Array).duplicate()
				cl[i]["pre"] = true
			if str(sc.k) == "delay":
				cl[i]["act"] = int(sc.act)
		cl[0]["sugg_start"] = int(sugg.act.start)
	done.emit(cl)

# ---------------------------------------------------------------- 辅助轮
# 一段话 → 词牌（拼句台的语法）
static func clause_tokens(c: Dictionary) -> Array:
	var t: Array = []
	var W := func(w: String): t.append({"t": "w", "v": w})
	var N := func(n: int): t.append({"t": "n", "v": n})
	var k: String = str(c.k)
	match k:
		"delay":
			W.call("延后")
			N.call(int(c.n))
			return t
		"remove":
			W.call("移除")
			return t
	if str(c.get("tmode", "")) == "self":
		W.call("自身")
	else:
		W.call("选择")
		N.call(int(c.get("count", 1)))
		W.call("敌方" if str(c.get("side", "enemy")) == "enemy" else "友方")
	match k:
		"atk":
			W.call("造成")
			N.call(int(c.n))
		"heal":
			W.call("恢复")
			N.call(int(c.n))
		"mit":
			W.call("减伤")
			N.call(int(c.n))
		"st":
			W.call(str(c.st))
			if int(c.n) > 1:
				W.call("持续")
				N.call(int(c.n))
		"redirect":
			W.call("转移")
	if k in ["atk", "heal"] and int(c.get("rep", 1)) > 1:
		W.call("重复")
		N.call(int(c.rep))
	if int(c.get("cont", 1)) > 1:
		W.call("持续")
		N.call(int(c.cont))
	return t

static func act_tokens(cl: Array) -> Array:
	var out: Array = []
	for i in cl.size():
		if i > 0:
			out.append({"t": "w", "v": "并"})
		out.append_array(clause_tokens(cl[i]))
	return out

func _show_suggestions() -> void:
	K.clear_children(sugg_box)
	var list: Array = NAI.suggest(M, 0, uid, 3)
	if list.is_empty():
		sugg_box.add_child(K.label("辅助轮：这个随从现在没什么好打的，可以让它这轮不出手。", 15, K.MUTED))
		return
	sugg_box.add_child(K.label("辅助轮 · 电脑会这样拼（按它的估值排；点一下装进句子，还能接着改）：", 15, K.MUTED))
	for it in list:
		var a: Dictionary = it.act
		var tg_txt := NT.action_text(M, a.cl)
		var extra := "第 %d 秒 · 花 %d 点%s" % [int(a.start), int(a.cost), ("（%d 点用血付）" % int(a.blood)) if int(a.get("blood", 0)) > 0 else ""]
		if float(it.gain) < NAI.PASS_GAIN:
			extra += " · 电脑觉得不太值"
		var b := K.button("%s  （%s）" % [tg_txt, extra], "normal", 15)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.custom_minimum_size = Vector2(0, 40)
		var toks := act_tokens(a.cl)
		var aa := a
		b.pressed.connect(func():
			tokens = toks.duplicate(true)
			sugg = {"act": aa, "tokens": toks.duplicate(true)}
			Sfx.play("stamp")
			_refresh())
		sugg_box.add_child(b)

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
	if w == NR.CLASS_WORD.get(M.cls_of(0), ""):
		return NR.CLASS_COLOR[M.cls_of(0)]
	return Color("5a6a8a")

func _hover(b: Button, text: String) -> void:
	b.mouse_entered.connect(func(): preview_label.text = "接上它：" + text)
	b.mouse_exited.connect(func(): preview_label.text = "")
	b.focus_entered.connect(func(): preview_label.text = "接上它：" + text)

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
	# 人话：一直显示整句（没定的写“几”）
	if pr.has("err"):
		text_label.text = str(pr.err)
	elif bool(pr.get("complete", false)):
		text_label.text = "这句话：" + NT.action_text(M, pr.clauses) + "。"
	elif tokens.is_empty():
		text_label.text = "这句话：（还是空的，从下面挑第一张）"
	else:
		text_label.text = "拼到这里：" + draft_text(tokens) + "（还没拼完）"
	preview_label.text = ""
	help_label.text = _help(str(pr.get("expect", "start")))
	# 词
	K.clear_children(opt_flow)
	for item in op.words:
		var w: String = str(item[0])
		var b := K.button(w, "primary" if bool(item[1]) and (NR.WORDS.has(w) or w == NR.CLASS_WORD.get(M.cls_of(0), "")) else "normal", 22)
		b.custom_minimum_size = Vector2(96, 56)
		b.disabled = not bool(item[1])
		var tip: String = str(NR.WORDS[w].desc) if NR.WORDS.has(w) else str(BASIC_DESC.get(w, ""))
		if w == "并":
			tip += "（每多一段 +%d 行动点，最多 %d 段）" % [int(cp["and"]), int(cp.clauses)]
		if w == "持续" and str((pr.get("cur", {}) as Dictionary).get("k", "")) != "st":
			tip = "续流特长：这一段以后每轮同一秒自动再来一次，后面放数字牌（一共几轮）"
		if NR.WORDS.has(w):
			tip += "\n（进阶词：卡组里还能用 %d 张，价格 %d）" % [word_left(w), int(NR.WORDS[w].price)]
		if str(item[2]) != "":
			tip += "\n" + str(item[2])
		var pv := _preview_with({"t": "w", "v": w})
		tip += "\n接上以后：" + pv
		b.tooltip_text = tip
		_hover(b, pv)
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
	if bool(op.num):
		var pv1 := _preview_with({"t": "n", "v": 1})
		b1.tooltip_text = "接上以后：" + pv1
		_hover(b1, pv1)
	b1.pressed.connect(func(): add_number(1))
	num_flow.add_child(b1)
	var vals: Array = have.keys()
	vals.sort()
	for v in vals:
		var left: int = int(have[v]) - int(used.get(v, 0))
		var bn := K.button("%d ×%d" % [int(v), left], "primary" if bool(op.num) and left > 0 else "normal", 22)
		bn.custom_minimum_size = Vector2(110, 56)
		bn.disabled = not (bool(op.num) and left > 0)
		if bool(op.num):
			var pvn := _preview_with({"t": "n", "v": int(v)})
			bn.tooltip_text = "接上以后：" + pvn
			_hover(bn, pvn)
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
		var cost := NE.action_cost(cl, int(cp["and"]))
		var ms := NE.action_windup(cl, int(cp.wind))
		var ap: int = int(M.res[0].ap)
		var blood: int = maxi(0, cost - ap)
		info_label.text = "花 %d 行动点（还剩 %d）· 最早第 %d 秒起效 · 用数字牌 %s" % [cost, ap, ms, str(NE.action_numbers(cl)) if not NE.action_numbers(cl).is_empty() else "无（全是 1）"]
		var bad := false
		if blood > 0:
			if int(cp.blood) > 0:
				var has_heal := false
				for c3 in cl:
					if str(c3.k) == "heal":
						has_heal = true
				if has_heal:
					info_label.text += "  —— 行动点不够；用血付的句子不能有【恢复】"
					bad = true
				elif blood > M.blood_room(0, uid):
					info_label.text += "  —— 差 %d 点，这个随从最多只能付 %d 血" % [blood, M.blood_room(0, uid)]
					bad = true
				else:
					info_label.text += "  —— 差的 %d 点用【%s】的生命付" % [blood, str(M.R.U[uid].name)]
			else:
				info_label.text += "  —— 行动点不够"
				bad = true
		ok_btn.disabled = bad
		var all_late := true
		for c4 in cl:
			if not (str(c4.get("tmode", "")) in ["late", "self"]) and str(c4.k) != "delay":
				all_late = false
		ok_btn.text = "拼好了 → 定起手秒数" if all_late else "拼好了 → 去选目标"
	else:
		info_label.text = "拼完整之后才能用。"
		ok_btn.disabled = true

func _help(e: String) -> String:
	match e:
		"start":
			var h := "第一张：【选择】几个目标 / 【自身】 / 【延后】对方的一句 / 【移除】敌人的保护。"
			if bool(cp.get("late", false)):
				h += " 择流：选择的目标现在不用定，双方宣告完你再定（对手只看到“待定”）。"
			return h
		"count":
			return "选几个目标？放一张数字牌：1 免费；2、3 要用手里的牌。"
		"side":
			return "选敌方还是友方？"
		"action":
			return "要做什么？（对敌方：造成伤害，或者直接放一个状态词；对友方：恢复、减伤、转移）"
		"atk_n":
			return "打几点？放一张数字牌。"
		"heal_n":
			return "回几点血？放一张数字牌。"
		"mit_n":
			return "本轮每次少受几点？放一张数字牌。"
		"rep_n":
			return "一共打几次？放一张数字牌。"
		"dur_n":
			return "持续几轮？放一张数字牌。"
		"delay_n":
			return "往后推几秒？放一张数字牌。推出第 %d 秒就落空。" % NR.TIMELINE
		"end":
			var parts: Array = ["可以拼好了"]
			for item in options().words:
				if str(item[0]) == "重复":
					parts.append("接【重复】多打几次")
				elif str(item[0]) == "持续":
					parts.append("接【持续】让它多撑几轮" if str((parsed.get("cur", {}) as Dictionary).get("k", "")) == "st" else "接【持续】让它以后每轮自动再来")
				elif str(item[0]) == "并":
					parts.append("【并】接下一段")
			return "；也可以".join(parts) + "。"
	return ""

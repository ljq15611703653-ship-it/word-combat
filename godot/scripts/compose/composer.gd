extends Control
# 拼句台：玩家把词一张一张拼成一句话。
#   · 句子轨：已拼好的牌（钢印烙上去），最后有一个“下一张”的空位
#   · 词库：你手里的词；现在能接的发亮，其他的变暗
#   · 人话提示：这句话到目前为止大概是什么意思，还不确定的地方写“某某”
#   · 三种流派：按现在的拼法，接下来可能变成的三句话（也是拼出来的，点一下接上第一张）
#   · 数字：手填，填完变成一张金属数字牌烙进去；点数字牌可以改，改完重新烙
#   · 先看后拼：鼠标停在能接的词（连接牌、建议里的“接【某】”）上、或者在数字框里打数字时，
#     人话提示先读出“接上之后整句是什么”；句子轨下面一直写着现在读作什么（没填的数字写“（几）”）
# 拼出来的是一串牌，解析成技能树交给上层；规则本身（引擎、费用、词的统计）一点没变。

const K = preload("res://scripts/ui/kit.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const G = preload("res://scripts/core/grammar.gd")
const Pet = preload("res://scripts/ui/pet.gd")
const S = preload("res://scripts/compose/sentence.gd")
const H = preload("res://scripts/compose/hints.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Tut = preload("res://scripts/tutorial/tutorial.gd")
const FX = preload("res://scripts/compose/stamp_fx.gd")
const Fuzzy = preload("res://scripts/compose/fuzzy.gd")

signal changed()
signal hint_ready()

const Glue = preload("res://scripts/compose/glue.gd")
const TILE := Vector2(76, 98)
const RACK_CARD := Vector2(80, 96)
const CAT_ORDER := ["动作", "对象", "范围", "结构", "触发", "时间", "引用", "状态"]
const ROLE_TEXT := {"alive": "至少几个（1~5）", "value": "填一个数（点数）", "dur": "持续几秒（1~20）", "delay": "几秒之后（1~19）", "gap": "间隔几秒（1~10）", "part": "这一份分多少点"}
const ROLE_RANGE := {"alive": [1, 5], "value": [1, 60], "dur": [1, 20], "delay": [1, 19], "gap": [1, 10], "part": [1, 60]}
const PART_HELP := {"低于": "左边比右边小", "不低于": "左边不比右边小", "每次固定": "每次固定减少，而不是按比例", "（": "左括号：括号里的先算（可以不用）", "）": "右括号：和左括号配对"}

var pool: Dictionary = {}
var tokens: Array = []
var avail: Dictionary = {}
var compact := false                       # 窄空间（对局里的拼句窗口）：轨道/建议压缩，词架至少留出一块高度
var cooling: Dictionary = {}               # 词 → 正在冷却的张数（每一张单独显示成一块黑牌，点不了）
var analysis: Dictionary = {}
var opts: Dictionary = {}
var editing_idx := -1
var animate_next := true

var rail_box: PanelContainer
var rail: HFlowContainer
var hint_label: Label
var status_label: Label
var help_label: Label
var hint_panel: Control
var sugg_group: Control
var strip_panel: Control
var fuzzy_btn: Button
var fuzzy_mode := false
var tray: Array = []
var tray_box: PanelContainer
var tray_flow: HFlowContainer
var fuzzy_box: VBoxContainer
var fuzzy_msg: Label
var _fuzzy_token := 0
var _fuzzy_solver
var sugg_box: VBoxContainer
var rack_flow: VBoxContainer
var rack_cards := {}
var part_tiles := {}
var miss_label: Label
var strip_flow: HFlowContainer
var strip_title: Label
var rack_scroll: ScrollContainer
var back_btn: Button
var clear_btn: Button
var fx_layer: Control
var _num_edit: LineEdit
var _hint_token := 0
var _sugg_seed := 1
var _built := false
var last_hint_nodes: Array = []
var rail_read: Label                       # 句子轨下面：现在这串牌读作什么（带“（几）”“某某”空位）
var strip_cards := {}                      # “现在能接”条里的词 → 卡片（悬停预览用）
var _preview_cache := {}                   # 先看后拼的缓存：只对“当前这一串牌”有效，牌一变就清空
var _hover_key := ""                       # 正在预览的那张（""=没在预览，人话提示显示“到目前为止”）
var _idle_hint := ""                       # 不预览时人话提示该显示的文字
const HINT_COLOR := Color("f1e3b0")
const PREVIEW_COLOR := Color("9fe0ff")

func _ready() -> void:
	_build()

# ------------------------------------------------------------ 构建
func _build() -> void:
	if _built:
		return
	_built = true
	var v := K.vbox(8)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(v)
	# 标题行
	var head := K.hbox(8)
	head.add_child(K.label("拼句台", 22, K.GOLD))
	head.add_child(K.label("点下面发亮的词，一张一张拼成一句话", 15, K.MUTED))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	fuzzy_btn = K.button("模糊匹配模式：关", "ghost", 15)
	fuzzy_btn.custom_minimum_size = Vector2(0, 32)
	fuzzy_btn.tooltip_text = "把词随便扔进托盘，电脑告诉你它们能拼成什么、怎么摆；拼不成就猜你想拼什么、还差哪张"
	fuzzy_btn.pressed.connect(toggle_fuzzy)
	Tut.tag(fuzzy_btn, "c:fuzzy")
	head.add_child(fuzzy_btn)
	back_btn = K.button("撤回一张", "normal", 15)
	back_btn.custom_minimum_size = Vector2(0, 32)
	back_btn.pressed.connect(undo)
	Tut.tag(back_btn, "c:undo")
	head.add_child(back_btn)
	clear_btn = K.button("全部拿下", "ghost", 15)
	clear_btn.custom_minimum_size = Vector2(0, 32)
	clear_btn.pressed.connect(clear_all)
	head.add_child(clear_btn)
	v.add_child(head)
	# 句子轨
	rail_box = PanelContainer.new()
	var rs := K.gem_style(Color("2a0d14"), Color("a3121f"), 12, 2, 0.2)
	rs.content_margin_left = 12
	rs.content_margin_right = 12
	rs.content_margin_top = 10
	rs.content_margin_bottom = 10
	rail_box.add_theme_stylebox_override("panel", rs)
	rail_box.custom_minimum_size = Vector2(0, 84 if compact else 124)
	var rv := K.vbox(4)
	rail_box.add_child(rv)
	rail = HFlowContainer.new()
	rail.add_theme_constant_override("h_separation", 6)
	rail.add_theme_constant_override("v_separation", 6)
	rv.add_child(rail)
	# 句子轨下面一行：现在这串牌读作什么（没定的地方写“（几）”“某某”）
	rail_read = K.wrap_label("", 14 if compact else 16, Color("f3d9a0"))
	rail_read.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rv.add_child(rail_read)
	Tut.tag(rail_box, "c:rail")
	v.add_child(rail_box)
	# 模糊匹配的托盘：词随便扔，不用按语法顺序
	tray_box = PanelContainer.new()
	var ts := K.gem_style(Color("1e1018"), Color("7a2a3a"), 12, 2, 0.14)
	ts.content_margin_left = 12
	ts.content_margin_right = 12
	ts.content_margin_top = 10
	ts.content_margin_bottom = 10
	tray_box.add_theme_stylebox_override("panel", ts)
	tray_box.custom_minimum_size = Vector2(0, 124)
	tray_box.visible = false
	var tv := K.vbox(4)
	tray_box.add_child(tv)
	tv.add_child(K.label("托盘：把词点进来（点托盘里的词可以拿出去），电脑会分析它们能拼成什么", 14, Color("c9b6ee")))
	tray_flow = HFlowContainer.new()
	tray_flow.add_theme_constant_override("h_separation", 6)
	tray_flow.add_theme_constant_override("v_separation", 6)
	tv.add_child(tray_flow)
	Tut.tag(tray_box, "c:tray")
	v.add_child(tray_box)
	fuzzy_box = K.vbox(6)
	fuzzy_box.visible = false
	fuzzy_msg = K.wrap_label("", 17, Color("f1e3b0"))
	fuzzy_box.add_child(fuzzy_msg)
	v.add_child(fuzzy_box)
	# 人话提示
	var hp := K.panel(Color("1c1210"), Color("7a5a14"), 10, 1)
	hint_panel = hp
	var hv := K.vbox(2)
	hp.add_child(hv)
	hint_label = K.wrap_label("", 15 if compact else 18, HINT_COLOR)
	hv.add_child(hint_label)
	status_label = K.wrap_label("", 14, K.MUTED)
	hv.add_child(status_label)
	help_label = K.wrap_label("", 13, Color("9fd0ff"))
	hv.add_child(help_label)
	Tut.tag(hp, "c:hint")
	v.add_child(hp)
	# 三种流派
	var sg := K.vbox(4)
	sugg_group = sg
	sg.add_child(K.label("接下来可能变成的三句话（也是用词拼出来的）", 15, K.MUTED))
	sugg_box = K.vbox(4)
	sg.add_child(sugg_box)
	Tut.tag(sg, "c:sugg")
	v.add_child(sg)
	# 词库
	var rh := K.hbox(8)
	rh.add_child(K.label("你的词", 16, K.TEXT))
	rh.add_child(K.label("亮的是现在能接的", 13, K.MUTED))
	miss_label = K.label("", 13, Color("e8a0a0"))
	miss_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	miss_label.clip_text = true
	rh.add_child(miss_label)
	v.add_child(rh)
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	rack_scroll = sc
	sc.custom_minimum_size = Vector2(0, 200 if compact else 0)
	var inner := K.vbox(6)
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(inner)
	# 最上面：“现在能接”的词，放大，永远一眼看到
	strip_panel = K.panel(Color("1c1210"), Color("9c7a14"), 10, 2)
	var sv := K.vbox(4)
	strip_panel.add_child(sv)
	strip_title = K.label("现在能接 ▶", 15, Color("ffd66b"))
	sv.add_child(strip_title)
	strip_flow = HFlowContainer.new()
	strip_flow.add_theme_constant_override("h_separation", 6)
	strip_flow.add_theme_constant_override("v_separation", 6)
	sv.add_child(strip_flow)
	Tut.tag(strip_panel, "c:next")
	inner.add_child(strip_panel)
	inner.add_child(K.label("全部的词（暗的现在接不上）", 13, K.MUTED))
	rack_flow = K.vbox(6)
	rack_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.add_child(rack_flow)
	Tut.tag(sc, "c:rack")
	v.add_child(sc)
	# 特效层：顶层，不挡鼠标
	fx_layer = Control.new()
	fx_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fx_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(fx_layer)

# ------------------------------------------------------------ 对外
# pool_words：本技能可以用的词 {词: 数量}（已扣掉别的卡占用的）
func setup(pool_words: Dictionary, initial_tokens: Array = []) -> void:
	_build()
	pool = pool_words.duplicate()
	tokens = initial_tokens.duplicate(true)
	editing_idx = -1
	_build_rack()
	_recompute()
	_rebuild_rail(false)
	changed.emit()

func skill_nodes() -> Array:
	if analysis.get("complete", false):
		return analysis.skills[0]
	return []

func is_complete() -> bool:
	return bool(analysis.get("complete", false))

func word_use() -> Array:
	return S.words_in(tokens)

func clear_all() -> void:
	if tokens.is_empty():
		return
	Sfx.play("click")
	tokens.clear()
	editing_idx = -1
	_after_change(false)

func _guarded(kind: String, v) -> bool:
	var msg: String = Tut.guard(kind, v, tokens.size())
	if msg == "":
		return false
	_shake_rail()
	Pet.chat(msg, "talk", 4.0)
	return true

func undo() -> void:
	if tokens.is_empty() or _guarded("undo", ""):
		return
	Sfx.play("click")
	tokens.pop_back()
	editing_idx = -1
	_after_change(false)
	Tut.fire("undo")

func add_word(w: String) -> void:
	if fuzzy_mode:
		_tray_add(w)
		return
	if _guarded("W", w):
		return
	if not _expects("W", w):
		_shake_rail()
		return
	if int(avail.get(w, 0)) <= 0:
		_shake_rail()
		return
	tokens.append(S.W(w))
	editing_idx = -1
	_after_change(true)
	Tut.fire("w:" + w)

func add_part(p: String) -> void:
	if _guarded("P", p):
		return
	if not _expects("P", p):
		_shake_rail()
		return
	tokens.append(S.Part(p))
	_after_change(true)

func add_number(v: int, role: String) -> bool:
	if editing_idx < 0 and _guarded("N", v):
		return false
	var rg: Array = ROLE_RANGE.get(role, [0, 99])
	if v < int(rg[0]) or v > int(rg[1]):
		_shake_rail()
		return false
	if editing_idx >= 0 and editing_idx < tokens.size():
		tokens[editing_idx] = S.Num(v)
		var idx := editing_idx
		editing_idx = -1
		_after_change(false, idx)
		Tut.fire("n_edit")
		return true
	tokens.append(S.Num(v))
	_after_change(true)
	Tut.fire("n:%d" % v)
	return true

func _expects(t: String, v: String) -> bool:
	for e in analysis.get("expect", []):
		if e.t == t and e.v == v:
			return true
	return false

# ------------------------------------------------------------ 变化后的统一处理
func _after_change(stamp_last: bool, stamp_idx: int = -1) -> void:
	_recompute()
	_rebuild_rail(stamp_last, stamp_idx)
	changed.emit()

func _recompute() -> void:
	_preview_cache.clear()          # 牌变了：先看后拼的缓存作废
	_hover_key = ""
	if fuzzy_mode:
		avail = pool.duplicate()
		for w in tray:
			avail[w] = int(avail.get(w, 0)) - 1
		opts = {"complete": false, "words_have": [], "words_miss": [], "numbers": [], "parts": [], "skills": []}
		for w in pool:
			if int(avail.get(w, 0)) > 0:
				opts.words_have.append(w)
		analysis = {"complete": false, "skills": [], "expect": []}
		_update_rack()
		return
	avail = H.avail_of(pool, tokens)
	analysis = S.analyze(tokens)
	opts = H.options(tokens, avail)
	_update_rack()
	back_btn.disabled = tokens.is_empty()
	clear_btn.disabled = tokens.is_empty()
	_hint_token += 1
	var tok := _hint_token
	hint_label.text = "…"
	call_deferred("_deferred_hints", tok)

func _deferred_hints(tok: int) -> void:
	if tok != _hint_token or not is_inside_tree():
		return
	await get_tree().process_frame
	if tok != _hint_token or not is_inside_tree():
		return
	_refresh_hint()
	_refresh_suggestions()

# ------------------------------------------------------------ 句子轨
func _rebuild_rail(stamp_last: bool, stamp_idx: int = -1) -> void:
	K.clear_children(rail)
	var last_tile: Control = null
	for i in tokens.size():
		var tok: Dictionary = tokens[i]
		var tile: Control
		if tok.t == "N" and editing_idx == i:
			tile = _number_entry(_role_for_edit(i), int(tok.v))
		else:
			tile = _tile_for(tok, i)
		var g: String = Glue.before(tokens, i)
		if g != "":
			rail.add_child(_glue_label(g))
		rail.add_child(tile)
		if (stamp_last and i == tokens.size() - 1) or i == stamp_idx:
			last_tile = tile
	var tl: String = Glue.tail(tokens, bool(analysis.get("complete", false)))
	if tl != "":
		rail.add_child(_glue_label(tl))
	# 下一张的空位
	var ghost := _ghost_tile()
	rail.add_child(ghost)
	if last_tile != null:
		_stamp(last_tile)
	if _num_edit != null and is_instance_valid(_num_edit):
		_num_edit.call_deferred("grab_focus")

# 人话连接字：灰色小字夹在词牌之间，点不了
func _glue_label(text: String) -> Control:
	var l := Label.new()
	l.text = text.strip_edges() if text.strip_edges() != "" else text
	l.add_theme_font_size_override("font_size", 20)
	l.add_theme_color_override("font_color", Color("b9a68a"))
	l.custom_minimum_size = Vector2(0, TILE.y)
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func _role_for_edit(i: int) -> String:
	# 编辑已有数字：沿用它当初的角色；不知道就按“数值”
	return str(tokens[i].get("role", "value"))

func _tile_for(tok: Dictionary, idx: int) -> Control:
	var t: Control
	match tok.t:
		"W":
			t = K.word_card(tok.v, 1, -1, TILE)
		"N":
			t = _num_plate(int(tok.v), _effective_at(idx))
		_:
			t = _part_plate(str(tok.v), true)
	t.mouse_filter = Control.MOUSE_FILTER_STOP
	t.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	t.tooltip_text = ("点一下改这个数字" if tok.t == "N" else "点这张会把它和它后面的牌都拿下来")
	var ii := idx
	t.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			_on_tile_clicked(ii))
	return t

func _on_tile_clicked(i: int) -> void:
	if i < 0 or i >= tokens.size():
		return
	if tokens[i].t == "N":
		editing_idx = i
		Sfx.play("click")
		_rebuild_rail(false)
		return
	if _guarded("undo", ""):
		return
	Sfx.play("click")
	tokens = tokens.slice(0, i)
	editing_idx = -1
	_after_change(false)

# 这个数字后面接了几个双倍/一半，实际生效的是多少（数字牌上要同时显示，免得以为双倍没生效）
func _effective_at(i: int) -> Dictionary:
	var v: int = int(tokens[i].v)
	var j := i + 1
	if j < tokens.size() and tokens[j].t == "W" and tokens[j].v in ["伤害", "生命"]:
		j += 1
	var d := 0
	var h := 0
	while j < tokens.size() and tokens[j].t == "W" and tokens[j].v == "双倍":
		d += 1
		j += 1
	while j < tokens.size() and tokens[j].t == "W" and tokens[j].v == "一半":
		h += 1
		j += 1
	var eff := v
	for k in d:
		eff *= 2
	for k in h:
		eff = (eff + 1) / 2
	return {"base": v, "eff": eff, "d": d, "h": h}

func _num_plate(v: int, eff: Dictionary = {}) -> Control:
	var root := Control.new()
	root.custom_minimum_size = TILE
	var p := PanelContainer.new()
	p.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_theme_stylebox_override("panel", K.gem_style(Color("6b2a14"), Color("ffd21f"), 9, 3, 0.3))
	var c := CenterContainer.new()
	var vb := K.vbox(0)
	var shown: int = v   # 数字牌上永远是你填的数；双倍写在后面单独的一句里
	vb.add_child(K.label(str(shown), 34 if str(shown).length() < 3 else 26, Color("fff3c8"), HORIZONTAL_ALIGNMENT_CENTER))
	var cap := "数字"
	if int(eff.get("d", 0)) > 0 or int(eff.get("h", 0)) > 0:
		cap = "后面有翻倍" if int(eff.get("d", 0)) > 0 else "后面有减半"
	vb.add_child(K.label(cap, 12, Color("f0d890"), HORIZONTAL_ALIGNMENT_CENTER))
	c.add_child(vb)
	p.add_child(c)
	root.add_child(p)
	return root

func _part_plate(text: String, placed: bool) -> Control:
	var root := Control.new()
	root.custom_minimum_size = TILE if placed else Vector2(92, 52)
	var p := PanelContainer.new()
	p.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_theme_stylebox_override("panel", K.gem_style(Color("2e1a22"), Color("a88a92"), 9, 2, 0.18))
	var c := CenterContainer.new()
	var vb := K.vbox(0)
	vb.add_child(K.label(text, 22 if text.length() <= 2 else 18, Color("ece8da"), HORIZONTAL_ALIGNMENT_CENTER))
	vb.add_child(K.label("连接牌", 11, Color("b8bfd4"), HORIZONTAL_ALIGNMENT_CENTER))
	c.add_child(vb)
	p.add_child(c)
	root.add_child(p)
	root.tooltip_text = PART_HELP.get(text, "")
	return root

# 下一张的空位：要填数字时就是一个输入框
func _ghost_tile() -> Control:
	_num_edit = null
	if editing_idx >= 0:
		var g0 := Control.new()
		g0.custom_minimum_size = Vector2(1, TILE.y)
		return g0
	if not opts.numbers.is_empty():
		return _number_entry(str(opts.numbers[0]), -1)
	var root := Control.new()
	root.custom_minimum_size = TILE
	var p := Panel.new()
	p.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(1, 1, 1, 0.04)
	sb.border_color = Color(1, 1, 1, 0.35) if not opts.complete else Color("62c483")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(9)
	p.add_theme_stylebox_override("panel", sb)
	root.add_child(p)
	var txt := "下一张" if tokens.is_empty() or not opts.complete else "成句 ✓"
	var l := K.label(txt, 15, Color(1, 1, 1, 0.6) if not opts.complete else Color("62c483"), HORIZONTAL_ALIGNMENT_CENTER)
	l.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	l.position = Vector2(0, TILE.y * 0.38)
	l.size = Vector2(TILE.x, 24)
	root.add_child(l)
	var tw := root.create_tween().set_loops()
	tw.tween_property(p, "modulate:a", 0.45, 0.8)
	tw.tween_property(p, "modulate:a", 1.0, 0.8)
	return root

func _number_entry(role: String, prefill: int) -> Control:
	var root := PanelContainer.new()
	root.custom_minimum_size = Vector2(150, TILE.y)
	root.add_theme_stylebox_override("panel", K.gem_style(Color("3a1c14"), Color("ffd21f"), 9, 2, 0.22))
	var vb := K.vbox(3)
	root.add_child(vb)
	vb.add_child(K.label(str(ROLE_TEXT.get(role, "填一个数")), 13, Color("f0d890")))
	var row := K.hbox(4)
	var le := LineEdit.new()
	le.custom_minimum_size = Vector2(64, 34)
	le.max_length = 3
	le.alignment = HORIZONTAL_ALIGNMENT_CENTER
	le.add_theme_font_size_override("font_size", 22)
	le.placeholder_text = "?"
	if prefill >= 0:
		le.text = str(prefill)
	le.text_changed.connect(func(t: String):
		var clean := ""
		for ch in t:
			if ch >= "0" and ch <= "9":
				clean += ch
		if clean != t:
			le.text = clean
			le.caret_column = clean.length()
		_preview_number(role, clean))
	var submit := func():
		if le.text == "":
			return
		var rg: Array = ROLE_RANGE.get(role, [0, 99])
		var ok := add_number(int(le.text), role)
		if not ok:
			le.add_theme_color_override("font_color", K.RED)
			le.placeholder_text = "%d~%d" % [int(rg[0]), int(rg[1])]
	le.text_submitted.connect(func(_t): submit.call())
	row.add_child(le)
	var b := K.button("烙", "primary", 16)
	b.custom_minimum_size = Vector2(40, 34)
	b.tooltip_text = "把这个数字烙进句子（也可以按回车）"
	b.pressed.connect(func(): submit.call())
	row.add_child(b)
	vb.add_child(row)
	Tut.tag(root, "c:number")
	_num_edit = le
	return root

# ------------------------------------------------------------ 钢印特效
func _stamp(tile: Control) -> void:
	Sfx.play("stamp")
	if not is_inside_tree():
		return
	await get_tree().process_frame
	if not is_instance_valid(tile):
		return
	FX.stamp(tile, fx_layer)
	# 句子轨整体被“砸”了一下
	rail_box.pivot_offset = rail_box.size * 0.5
	var tw := create_tween()
	tw.tween_property(rail_box, "scale", Vector2(1.012, 1.03), 0.05).set_delay(0.12)
	tw.tween_property(rail_box, "scale", Vector2.ONE, 0.12)

func _shake_rail() -> void:
	Sfx.play("block")
	var tw := create_tween()
	var base := rail_box.position
	for i in 4:
		tw.tween_property(rail_box, "modulate", Color(1, 0.7, 0.7), 0.04)
		tw.tween_property(rail_box, "modulate", Color.WHITE, 0.04)

# ------------------------------------------------------------ 词库
func _build_rack() -> void:
	K.clear_children(rack_flow)
	rack_cards.clear()
	part_tiles.clear()
	var by_cat := {}
	for w in pool:
		if not Lex.words.has(w):
			continue
		var cat: String = Lex.words[w].cat
		if cat == "关键词":
			continue
		if not by_cat.has(cat):
			by_cat[cat] = []
		by_cat[cat].append(w)
	for cat in CAT_ORDER:
		if not by_cat.has(cat):
			continue
		var ws: Array = by_cat[cat]
		ws.sort_custom(func(a, b): return Lex.words[a].id < Lex.words[b].id)
		var row := K.hbox(8)
		var lab := K.label(cat, 14, Lex.CAT_COLORS.get(cat, K.MUTED))
		lab.custom_minimum_size.x = 38
		lab.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		row.add_child(lab)
		var fl := HFlowContainer.new()
		fl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		fl.add_theme_constant_override("h_separation", 6)
		fl.add_theme_constant_override("v_separation", 6)
		row.add_child(fl)
		rack_flow.add_child(row)
		for w in ws:
			fl.add_child(_rack_card(w))
			for k in int(cooling.get(w, 0)):
				fl.add_child(_cooling_card(w))
	# 免费的连接牌
	var prow := K.hbox(8)
	var plab := K.label("连接", 14, K.MUTED)
	plab.custom_minimum_size.x = 38
	prow.add_child(plab)
	var pfl := HFlowContainer.new()
	pfl.add_theme_constant_override("h_separation", 6)
	prow.add_child(pfl)
	for pname in ["低于", "不低于", "每次固定", "（", "）"]:
		var pt := _part_plate(pname, false)
		pt.mouse_filter = Control.MOUSE_FILTER_STOP
		pt.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		var pn: String = pname
		pt.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
				add_part(pn))
		_hook_preview(pt, S.Part(pn), true, str(PART_HELP.get(pn, "")))
		pfl.add_child(pt)
		part_tiles[pname] = pt
	prow.add_child(K.label("免费，不占你的词", 12, K.MUTED))
	rack_flow.add_child(prow)

# 冷却中的一张：整块变黑，写着“冷却”，点不了。用过一张就黑一张，没用过的照常能用
func _cooling_card(w: String) -> Control:
	var root := Control.new()
	root.custom_minimum_size = RACK_CARD
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.tooltip_text = "【%s】上一轮用过，这一张本轮冷却，下一轮回来" % w
	var card := K.word_card(w, 1, -1, RACK_CARD)
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.modulate = Color(0.28, 0.28, 0.32, 1.0)
	root.add_child(card)
	var chip := K.chip("冷却", Color("5a3a3f"), 13)
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	chip.grow_horizontal = Control.GROW_DIRECTION_BOTH
	chip.grow_vertical = Control.GROW_DIRECTION_BOTH
	root.add_child(chip)
	return root

func _rack_card(w: String) -> Control:
	var root := Control.new()
	root.custom_minimum_size = RACK_CARD
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var card := K.word_card(w, 1, -1, RACK_CARD)
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(card)
	var hl := Panel.new()
	hl.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.88, 0.72, 0.36, 0.12)
	sb.border_color = Color("ffd66b")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(9)
	sb.shadow_color = Color(1.0, 0.82, 0.3, 0.5)
	sb.shadow_size = 8
	hl.add_theme_stylebox_override("panel", sb)
	hl.visible = false
	root.add_child(hl)
	var badge := K.chip("×1", Color("3a4263"), 12)
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	badge.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	badge.grow_vertical = Control.GROW_DIRECTION_BEGIN
	badge.offset_right = 4
	badge.offset_bottom = 6
	root.add_child(badge)
	var ww := w
	root.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			add_word(ww))
	_hook_preview(root, S.W(w), true)
	Tut.tag(root, "c:word:" + w)
	rack_cards[w] = {"root": root, "hl": hl, "badge": badge, "tween": null}
	return root

func _update_rack() -> void:
	var have: Array = opts.words_have
	for w in rack_cards:
		var rc: Dictionary = rack_cards[w]
		var left: int = int(avail.get(w, 0))
		var allowed: bool = w in have
		var root: Control = rc.root
		var hl: Panel = rc.hl
		root.visible = not (left == 0 and int(cooling.get(w, 0)) > 0)   # 没有可用的了，只剩黑牌
		hl.visible = allowed
		root.modulate = Color.WHITE if allowed else (Color(1, 1, 1, 0.34) if left > 0 else Color(1, 1, 1, 0.16))
		var badge: Control = rc.badge
		var lab: Label = badge.get_child(0) if badge.get_child_count() > 0 else null
		if lab == null:
			for c in badge.find_children("*", "Label", true, false):
				lab = c
		if lab != null:
			lab.text = "∞" if left >= 50 else ("×%d" % left)
		badge.visible = int(pool.get(w, 0)) > 1 or left == 0
	for pname in part_tiles:
		var pt: Control = part_tiles[pname]
		pt.modulate = Color.WHITE if (pname in opts.parts) else Color(1, 1, 1, 0.3)
	_rebuild_strip()
	# 现在也许需要、但你没有的词
	var miss: Array = opts.words_miss.slice(0, 8)
	miss_label.text = ("也可能接：" + "、".join(miss) + "（你没有）") if not miss.is_empty() else ""

# ------------------------------------------------------------ 人话提示
# 这句话里用到了某些词时，顺手讲一下怎么调（比如减伤的比例和数字）
func _context_help() -> String:
	var ws: Array = S.words_in(tokens)
	var lines: Array = []
	if "减伤" in ws:
		lines.append("调减伤：强度就是“减伤”后面那个数字（点数字牌可以改）。比例 = 数字 ÷（数字 + 20）：填 20 ≈ 减 50%，40 ≈ 67%，60 ≈ 75%，越投越难再提高。想要“每次固定减少”，在【减伤】后面接连接牌【每次固定】（每次减少数字的一半）；想更强就接【双倍】。")
	if "若有" in ws:
		lines.append("若有：数字是“至少有几个存活的随从”（1~5）。想覆盖五个随从，要拼五个【若有】，每个只管一次判断。")
	if "并" in ws:
		lines.append("并：把几个效果连成同一个技能（最多 6 个）；想让后一段晚一点，在它前面加【之后】和秒数。")
	var n_one := 0
	for w in ws:
		if w == "一个":
			n_one += 1
	if n_one >= 1 and "选择" in ws:
		lines.append("选几个目标：每个【一个】选一个不同的目标。放 2 个就选 2 个，放满对面（或我方）的人数就是全体——游戏里没有“全部”，一个 × 3（× 4）就是它。每多放一个，词价多 2 点。")
	var stat_words: Array = []
	for sn in G.STACK_STATUSES:
		if sn in ws:
			stat_words.append(sn)
	if not stat_words.is_empty():
		lines.append("叠层状态：施加后是 1 级，之后每过一轮自动 +1 级，效果按指数曲线涨（前期轻、后期猛）。不放【持久】只撑本轮；每放一个【持久】持续轮数翻倍（1→2→4→8）。状态还在时再放一次：等级 +1，倒计时刷新到这次的末尾。双倍：一次加 2、4 级。")
		for sn2 in stat_words:
			lines.append("【%s】：%s" % [sn2, str(G.STATUS_DESC.get(sn2, ""))])
	if "蓄力" in ws:
		lines.append("蓄力放大的是这个随从“下一次出手”的整句话：所有目标和重复都吃到放大，所以配【一个 × 3】就是一刀灭队。必须由有蓄力的那个随从自己出手；打出去就用完。")
	if "加上" in ws or "减去" in ws:
		lines.append("运算从左往右算：A 加上 B 减去 C。想先算后面的，用括号圈起来。结果不会小于 0。")
	return "\n".join(lines)

func _refresh_hint() -> void:
	help_label.text = _context_help()
	last_hint_nodes = []
	if tokens.is_empty():
		_set_idle_hint("这句话还没开始：某某。\n可以先放一个目标（比如“自身”“选择 一个 敌方 随从”），或者先放“当”设一个埋伏。")
		rail_read.text = "读作：（还没开始）"
		status_label.text = _next_summary()
		status_label.add_theme_color_override("font_color", K.MUTED)
		return
	var h := H.human_hint(tokens, avail)
	if not bool(h.get("ok", false)):
		_set_idle_hint("这样拼下去暂时接不上（词不够或语法不通）。试试“撤回一张”。")
		rail_read.text = "读作：（这样拼下去接不上了，撤回一张试试）"
		status_label.text = ""
		return
	last_hint_nodes = h.get("merged", [])
	var human: String = str(h.get("human", h.text))
	_set_idle_hint("到目前为止的人话版：" + human)
	rail_read.text = "读作：" + human + ("。" if is_complete() else " ……")
	if is_complete():
		var probs: Array = G.problems(G.finalize(G.skill("x", skill_nodes())))
		if probs.is_empty():
			status_label.text = "已经是一句完整的话了 ✓  可以点“确定”，也可以接着加修饰（双倍、重复、并……）"
			status_label.add_theme_color_override("font_color", K.GREEN)
		else:
			status_label.text = "成句了，但有问题：" + str(probs[0])
			status_label.add_theme_color_override("font_color", K.RED)
	else:
		status_label.text = "还没拼完：“某某”“（几）”是你还没定的地方。" + _next_summary()
		status_label.add_theme_color_override("font_color", K.MUTED)
	hint_ready.emit()

# 下一张能接什么，一句话说清（词按词表顺序，最多列 6 个）
func _next_summary() -> String:
	var items: Array = []
	for role in opts.get("numbers", []):
		items.append("填一个数（%s）" % str(ROLE_TEXT.get(role, "数字")))
	if compact:
		# 窄窗口：能接的词下面“现在能接”条里已经摆着了，这里只留一句怎么先看
		return ("下一张：" + "、".join(items) + "。" if not items.is_empty() else "") + "鼠标停在亮着的词上，先读出接上之后的整句。"
	var have: Array = opts.get("words_have", []).duplicate()
	have.sort_custom(func(a, b): return Lex.words[a].id < Lex.words[b].id)
	for w in have.slice(0, 6):
		items.append("【%s】" % w)
	if have.size() > 6:
		items.append("等 %d 个词" % have.size())
	for pn in opts.get("parts", []):
		items.append("连接牌【%s】" % pn)
	if items.is_empty():
		return ""
	return "下一张可以接：" + "、".join(items) + "。鼠标停在词上，上面先读出接上之后的整句。"

# ------------------------------------------------------------ 先看后拼
# 人话提示平时显示“到目前为止”；鼠标停在某张能接的牌上时，换成“接上它之后整句读作什么”
func _set_idle_hint(text: String) -> void:
	_idle_hint = text
	if _hover_key == "":
		hint_label.text = text
		hint_label.add_theme_color_override("font_color", HINT_COLOR)

func _show_hint_preview(key: String, text: String) -> void:
	_hover_key = key
	hint_label.text = text
	hint_label.add_theme_color_override("font_color", PREVIEW_COLOR)

func _end_hint_preview(key: String) -> void:
	if _hover_key != key:
		return
	_hover_key = ""
	hint_label.text = _idle_hint
	hint_label.add_theme_color_override("font_color", HINT_COLOR)

static func _cand_key(tok: Dictionary) -> String:
	return "%s:%s" % [str(tok.get("t", "")), str(tok.get("v", ""))]

# 接上这一张之后整句的人话（按当前这串牌缓存；第一次算大约几十毫秒，之后直接取）
func preview_for(tok: Dictionary) -> Dictionary:
	var key := _cand_key(tok)
	if _preview_cache.has(key):
		return _preview_cache[key]
	var p: Dictionary = H.preview_after(tokens, tok, avail)
	_preview_cache[key] = p
	return p

# 给玩家看的一句：如果接上【某】：……
func preview_line(tok: Dictionary) -> String:
	return _preview_text(_tok_act(tok), preview_for(tok))

static func _tok_act(tok: Dictionary) -> String:
	if str(tok.get("t", "")) == "N":
		return "填上 %s" % str(tok.v)
	if str(tok.get("t", "")) == "P":
		return "接上连接牌【%s】" % str(tok.v)
	return "接上【%s】" % str(tok.v)

# act：“接上【造成】”“填上 12”“把数字改成 12”这类动作
static func _preview_text(act: String, p: Dictionary) -> String:
	var a2 := act + (" " if act.right(1) >= "0" and act.right(1) <= "9" else "")    # “填上 14 就成句”
	if not bool(p.get("ok", false)):
		return "%s之后，用你现有的词拼不成整句（会卡住），换一张试试。" % a2
	if bool(p.get("complete", false)):
		return "%s就成句 ✓：%s。" % [a2, str(p.text)]
	if bool(p.get("odd", false)):
		return "如果%s：%s ……（合语法，但这样用一般不划算）" % [act, str(p.text)]
	return "如果%s：%s ……" % [act, str(p.text)]

func _hover_in(tok: Dictionary, src: Control, tip_head: String = "") -> void:
	if fuzzy_mode:
		return
	var line := preview_line(tok)
	_show_hint_preview(_cand_key(tok), line)
	if src != null and is_instance_valid(src):
		src.tooltip_text = (tip_head + "\n" if tip_head != "" else "") + line     # 提示框弹出时读的是这时的文字

func _hover_out(tok: Dictionary) -> void:
	_end_hint_preview(_cand_key(tok))

# 给一张卡/按钮挂上“先看后拼”的悬停（only_if_next：只有它现在真能接时才预览，词库里的卡用）
func _hook_preview(c: Control, tok: Dictionary, only_if_next: bool = false, tip_head: String = "") -> void:
	var tk := tok
	c.mouse_entered.connect(func():
		if only_if_next and not _can_take(tk):
			return
		_hover_in(tk, c, tip_head))
	c.mouse_exited.connect(func(): _hover_out(tk))

# 这一张现在真的能接上（语法上要它，而且你手里还有）
func _can_take(tok: Dictionary) -> bool:
	match str(tok.get("t", "")):
		"W": return str(tok.v) in opts.get("words_have", [])
		"P": return str(tok.v) in opts.get("parts", [])
		"N": return not opts.get("numbers", []).is_empty()
	return false

# 数字框里打数字时：先读出填进去之后整句是什么（改已有数字牌时同样）
func _preview_number(role: String, txt: String) -> void:
	if fuzzy_mode:
		return
	if txt == "":
		_end_hint_preview("num")
		return
	var v := int(txt)
	var rg: Array = ROLE_RANGE.get(role, [0, 99])
	if v < int(rg[0]) or v > int(rg[1]):
		_show_hint_preview("num", "这里要填 %d~%d（%s）。" % [int(rg[0]), int(rg[1]), str(ROLE_TEXT.get(role, "数字"))])
		return
	var p: Dictionary
	if editing_idx >= 0 and editing_idx < tokens.size():
		var key := "E%d:%d" % [editing_idx, v]
		if not _preview_cache.has(key):
			var toks: Array = tokens.duplicate()
			toks[editing_idx] = S.Num(v)
			_preview_cache[key] = H.preview_of(toks, avail)
		p = _preview_cache[key]
		_show_hint_preview("num", _preview_text("把数字改成 %d" % v, p))
		return
	_show_hint_preview("num", preview_line(S.Num(v)))

# 外部（推荐句子、“我想干什么”的结果）也可以借人话提示先读给玩家听
func show_preview(text: String) -> void:
	_show_hint_preview("ext", text)

func clear_preview() -> void:
	_end_hint_preview("ext")

# ------------------------------------------------------------ 三种流派
func reroll_suggestions() -> void:
	_sugg_seed += 1
	_refresh_suggestions()

func _refresh_suggestions() -> void:
	K.clear_children(sugg_box)
	if opts.complete and opts.words_have.is_empty() and opts.numbers.is_empty():
		sugg_box.add_child(K.label("（这句话已经拼完了，没有别的词可以接）", 14, K.MUTED))
		return
	var list: Array = H.suggestions(tokens, avail, 2 if compact else 3, _sugg_seed * 131 + tokens.size())
	if list.is_empty():
		sugg_box.add_child(K.label("（用你现有的词，这样拼下去没有别的整句了）", 14, K.MUTED))
		return
	for sg in list:
		sugg_box.add_child(_suggestion_row(sg))

func _suggestion_row(sg: Dictionary) -> Control:
	var p := K.panel(Color("1d1318"), Color("5a1c27"), 9, 1)
	var hb := K.hbox(8)
	p.add_child(hb)
	var tag := K.chip(str(sg.school), Color("39507a"), 13)
	tag.custom_minimum_size.x = 56
	hb.add_child(tag)
	var vb := K.vbox(2)
	vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hb.add_child(vb)
	var fl := HFlowContainer.new()
	fl.add_theme_constant_override("h_separation", 3)
	fl.add_theme_constant_override("v_separation", 3)
	var placed: int = tokens.size()
	var all_t: Array = sg.tokens
	for i in all_t.size():
		fl.add_child(_mini_chip(all_t[i], i >= placed))
	vb.add_child(fl)
	# 整句的人话放大写，先读懂再决定要不要接
	vb.add_child(K.wrap_label("读作：" + H.humanize(str(sg.text)), 14 if compact else 16, Color("e6ecff")))
	var has_num := false
	for t in sg.added:
		if str(t.t) == "N":
			has_num = true
	if has_num:
		vb.add_child(K.label("（还没填的数字是示例，拼到那里自己填）", 12, K.MUTED))
	var first: Dictionary = sg.added[0] if not sg.added.is_empty() else {}
	var btxt := "接这一张 ▶"
	if not first.is_empty():
		btxt = ("填 %s ▶" % str(first.v)) if str(first.t) == "N" else ("接【%s】▶" % str(first.v))
	var b := K.button(btxt, "ghost", 13)
	b.custom_minimum_size = Vector2(0, 30)
	b.pressed.connect(func(): _take_first(first))
	if not first.is_empty():
		_hook_preview(b, first)
	hb.add_child(b)
	return p

func _take_first(first: Dictionary) -> void:
	var kind: String = str(first.get("t", ""))
	if kind == "W":
		add_word(str(first.v))
	elif kind == "P":
		add_part(str(first.v))
	elif kind == "N":
		_prefill_number(int(first.v))

func _mini_chip(tok: Dictionary, ghost: bool) -> Control:
	var col := Color("4a5266")
	var txt := str(tok.v)
	match tok.t:
		"W": col = Lex.cat_color(str(tok.v)).darkened(0.25)
		"N": col = Color("6b5a22")
		"P": col = Color("4a5266")
	var c := K.chip(txt, col, 13)
	if ghost:
		c.modulate = Color(1, 1, 1, 0.5)
	return c

func _prefill_number(v: int) -> void:
	if _num_edit != null and is_instance_valid(_num_edit):
		_num_edit.text = str(v)
		_num_edit.grab_focus()
		_num_edit.caret_column = _num_edit.text.length()
		if not opts.numbers.is_empty():
			_preview_number(str(opts.numbers[0]), str(v))

# ------------------------------------------------------------ 拼好了：所有词飞起来，组合成一句人话
func play_combine(text: String) -> void:
	await FX.combine(rail, text, self, tokens.duplicate())

# “现在能接”条：把当前能接的词、连接牌放大摆在最上面
func _rebuild_strip() -> void:
	K.clear_children(strip_flow)
	strip_cards.clear()
	var have: Array = opts.words_have.duplicate()
	have.sort_custom(func(a, b): return Lex.words[a].id < Lex.words[b].id)
	for w in have:
		strip_flow.add_child(_strip_card(w))
	for pname in opts.parts:
		var pt := _part_plate(str(pname), false)
		pt.mouse_filter = Control.MOUSE_FILTER_STOP
		pt.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		var pn: String = str(pname)
		pt.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
				add_part(pn))
		_hook_preview(pt, S.Part(pn), false, str(PART_HELP.get(pn, "")))
		strip_flow.add_child(pt)
	var note := ""
	if not opts.numbers.is_empty():
		note = "这里该填一个数字了：在上面句子轨的空位里输入，按回车或点“烙”。"
	elif have.is_empty() and opts.parts.is_empty():
		note = "这句话已经完整，没有别的词可以接了。点右下角“确定”。" if opts.complete else "你现有的词接不上了。试试“撤回一张”。"
	strip_title.text = ("现在能接 ▶   " + note) if note != "" else "现在能接 ▶"
	if rack_scroll != null:
		rack_scroll.scroll_vertical = 0

func _strip_card(w: String) -> Control:
	var root := Control.new()
	root.custom_minimum_size = RACK_CARD
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var card := K.word_card(w, int(avail.get(w, 0)), -1, RACK_CARD)
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(card)
	var hl := Panel.new()
	hl.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0, 0)
	sb.border_color = Color("ffd66b")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(9)
	sb.shadow_color = Color(1.0, 0.82, 0.3, 0.55)
	sb.shadow_size = 8
	hl.add_theme_stylebox_override("panel", sb)
	root.add_child(hl)
	var ww := w
	root.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			add_word(ww))
	root.tooltip_text = "鼠标停一下：上面先读出接上【%s】之后整句是什么" % w
	_hook_preview(root, S.W(w))
	strip_cards[w] = root
	Tut.tag(root, "c:next:" + w)
	return root

# 拼到一半时用来决定“外观”的临时技能：词是已经拼上的词，节点是人话提示里已经确定的部分
func partial_skill() -> Dictionary:
	if is_complete():
		return G.finalize(G.skill("x", skill_nodes().duplicate(true)))
	var nodes: Array = last_hint_nodes.duplicate(true)
	var tag := ""
	if not nodes.is_empty() and str(nodes[0].get("kind", "hole")) != "hole":
		tag = G.kind_tag({"nodes": nodes})
	return {"name": "", "words": S.words_in(tokens), "nodes": nodes, "kind_tag": tag}

# ------------------------------------------------------------ 模糊匹配模式
func toggle_fuzzy() -> void:
	if Tut.is_on() and not Tut.plan.is_empty():
		Pet.chat("这一步先不用模糊匹配，照着拼吧。", "talk", 4.0)
		return
	fuzzy_mode = not fuzzy_mode
	Sfx.play("click")
	fuzzy_btn.text = "模糊匹配模式：开" if fuzzy_mode else "模糊匹配模式：关"
	rail_box.visible = not fuzzy_mode
	hint_panel.visible = not fuzzy_mode
	sugg_group.visible = not fuzzy_mode
	strip_panel.visible = not fuzzy_mode
	tray_box.visible = fuzzy_mode
	fuzzy_box.visible = fuzzy_mode
	back_btn.visible = not fuzzy_mode
	clear_btn.visible = not fuzzy_mode
	if fuzzy_mode:
		tray.clear()
		_rebuild_tray()
		fuzzy_msg.text = "把你想试的词点进托盘，不用管顺序。"
		_clear_fuzzy_results()
	_recompute_after_mode()
	changed.emit()

# 清掉旧的分析结果，但保留那条提示文字本身
func _clear_fuzzy_results() -> void:
	for c in fuzzy_box.get_children():
		if c != fuzzy_msg:
			fuzzy_box.remove_child(c)
			c.queue_free()

func _recompute_after_mode() -> void:
	if fuzzy_mode:
		_recompute()
	else:
		_after_change(false)

func _tray_add(w: String) -> void:
	if int(avail.get(w, 0)) <= 0:
		_shake_rail()
		return
	tray.append(w)
	Sfx.play("stamp")
	_recompute()
	_rebuild_tray(true)
	_schedule_fuzzy()

func _tray_remove(i: int) -> void:
	if i < 0 or i >= tray.size():
		return
	tray.remove_at(i)
	Sfx.play("click")
	_recompute()
	_rebuild_tray()
	_schedule_fuzzy()

func _rebuild_tray(stamp_last: bool = false) -> void:
	K.clear_children(tray_flow)
	var last: Control = null
	for i in tray.size():
		var t := K.word_card(str(tray[i]), 1, -1, TILE)
		t.mouse_filter = Control.MOUSE_FILTER_STOP
		t.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		t.tooltip_text = "点一下把它拿出托盘"
		var ii := i
		t.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
				_tray_remove(ii))
		tray_flow.add_child(t)
		last = t
	if tray.is_empty():
		tray_flow.add_child(K.label("（空）", 16, Color(1, 1, 1, 0.4)))
	if stamp_last and last != null:
		_stamp(last)

func _schedule_fuzzy() -> void:
	_fuzzy_token += 1
	var tok := _fuzzy_token
	if _fuzzy_solver != null:
		_fuzzy_solver.cancelled = true
	call_deferred("_run_fuzzy", tok)

func _run_fuzzy(tok: int) -> void:
	if not is_inside_tree():
		return
	await get_tree().create_timer(0.25).timeout
	if tok != _fuzzy_token or not fuzzy_mode:
		return
	_clear_fuzzy_results()
	fuzzy_msg.text = "分析中…" if not tray.is_empty() else "托盘是空的：先从下面把词点进托盘。"
	if tray.is_empty():
		return
	var solver = Fuzzy.new()
	solver.host = self
	_fuzzy_solver = solver
	var res: Dictionary = await solver.solve(tray.duplicate())
	if tok != _fuzzy_token or not fuzzy_mode or not is_inside_tree():
		return
	_show_fuzzy(res)

func _show_fuzzy(res: Dictionary) -> void:
	_clear_fuzzy_results()
	fuzzy_msg.text = str(res.message)
	var sc := ScrollContainer.new()
	sc.custom_minimum_size = Vector2(0, 250)
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var box := K.vbox(6)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(box)
	var any := false
	var groups: Array = [["exact", "刚好用完", Color("2c6a44")], ["partial", "能拼，但有词用不上", Color("2f5f93")], ["completed", "再补几张就行", Color("8a6a1f")]]
	for g in groups:
		for e in res[g[0]]:
			any = true
			box.add_child(_fuzzy_row(e, str(g[1]), g[2]))
	if not res.guess.is_empty():
		any = true
		box.add_child(_fuzzy_row(res.guess, "我猜你想拼这句", Color("8a3a3a")))
	if any:
		fuzzy_box.add_child(sc)

func _fuzzy_row(e: Dictionary, label: String, col: Color) -> Control:
	var p := K.panel(Color("1d1318"), col, 9, 2)
	var vb := K.vbox(4)
	p.add_child(vb)
	var top := K.hbox(8)
	top.add_child(K.chip(label, col, 14))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(sp)
	var use := K.button("采用这一句", "primary", 14)
	use.custom_minimum_size = Vector2(0, 30)
	var toks: Array = e.tokens
	use.pressed.connect(func(): adopt(toks))
	top.add_child(use)
	vb.add_child(top)
	# 怎么摆：按顺序一张一张列出；托盘里的词是实心的，要补的词红框，数字是示例值
	var fl := HFlowContainer.new()
	fl.add_theme_constant_override("h_separation", 4)
	fl.add_theme_constant_override("v_separation", 4)
	var added_left: Array = e.added.duplicate()
	var idx := 1
	for t in e.tokens:
		var chip: Control
		if t.t == "W" and t.v in added_left:
			added_left.erase(t.v)
			chip = K.chip("%d·%s ＋补" % [idx, t.v], Color("8a2a2a"), 14)
		elif t.t == "W":
			chip = K.chip("%d·%s" % [idx, t.v], Lex.cat_color(str(t.v)).darkened(0.25), 14)
		elif t.t == "N":
			chip = K.chip("%d·数字(自填)" % idx, Color("6b5a22"), 14)
		else:
			chip = K.chip("%d·%s" % [idx, t.v], Color("4a5266"), 14)
		fl.add_child(chip)
		idx += 1
	vb.add_child(fl)
	vb.add_child(K.wrap_label("= " + str(e.text), 14, Color("c8d0e8")))
	if not e.added.is_empty():
		vb.add_child(K.wrap_label("还差：" + "、".join(e.added) + "（你托盘里没有这几张）", 14, Color("e8a0a0")))
	if not e.unused.is_empty():
		vb.add_child(K.wrap_label("用不上：" + "、".join(e.unused), 14, K.MUTED))
	return p

# 把某一句送回正式的拼句台（数字是示例值，自己点数字牌改）
func adopt(toks: Array) -> void:
	if _guarded("undo", ""):
		return
	toggle_fuzzy()
	tokens = toks.duplicate(true)
	editing_idx = -1
	_after_change(false)
	Sfx.play("chime")

extends Control
# 现场拼一句：给某个随从从零拼一句话（词库里没在冷却的词可用，基础词无限）。
# 辅助轮就是拼句台自带的提示/建议。确定后发出 composed(skill)。

const K = preload("res://scripts/ui/kit.gd")
const G = preload("res://scripts/core/grammar.gd")
const Composer = preload("res://scripts/compose/composer.gd")
const Namer = preload("res://scripts/core/namer.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Tut = preload("res://scripts/tutorial/tutorial.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Intent = preload("res://scripts/compose/intent.gd")

signal composed(skill)
signal cancelled()

var composer
var info: Label
var btn_ok: Button
var cur_skill: Dictionary = {}
var intent_box: HBoxContainer
var intent_edit: LineEdit
var _avail: Dictionary = {}
var picked_rec: Dictionary = {}          # 手把手模式：点了哪条推荐（目标、时间用它预填）
var _unit_name := ""

func setup(unit_name: String, avail: Dictionary, ap: int, cooling: Dictionary, init_tokens: Array = [], recs: Array = []) -> void:
	_unit_name = unit_name
	K.clear_children(self)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.78)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 28)
	add_child(margin)
	var panel := K.panel(Color("141826"), K.GOLD, 18, 3, 16)
	margin.add_child(panel)
	var v := K.vbox(8)
	panel.add_child(v)
	var head := K.hbox(10)
	head.add_child(K.label("给【%s】拼这一句" % unit_name, 26, K.GOLD))
	head.add_child(K.chip("本轮可用行动点 %d" % ap, Color("7a6424"), 16))
	if not cooling.is_empty():
		var parts: Array = []
		for w in cooling:
			parts.append(str(w))
		head.add_child(K.chip("冷却中（上一轮用过）：" + "、".join(parts), Color("5a3a3f"), 14))
	head.add_child(K.label("我想干什么：", 15, K.GOLD))
	intent_edit = LineEdit.new()
	intent_edit.placeholder_text = "用自己的话说，比如：" + "、".join(Intent.EXAMPLES.slice(0, 3))
	intent_edit.custom_minimum_size = Vector2(300, 34)
	intent_edit.add_theme_font_size_override("font_size", 16)
	intent_edit.text_submitted.connect(func(_t): _find_intent())
	head.add_child(intent_edit)
	var ibtn := K.button("找句子", "primary", 15)
	ibtn.pressed.connect(_find_intent)
	head.add_child(ibtn)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	var cancel := K.button("取消", "ghost", 18)
	cancel.pressed.connect(func(): cancelled.emit())
	head.add_child(cancel)
	v.add_child(head)
	if not recs.is_empty():
		var rbox := K.hbox(8)
		rbox.add_child(K.label("推荐（点一下填入）：", 15, K.GREEN))
		for r in recs:
			var txt := "【%s】%d点 → 对手剩 %d" % [str(r.name), int(r.cost), int(r.foe_after)]
			var info_t: String = "%s\n不拼这句：我方剩 %d、对手剩 %d；拼这句：我方剩 %d、对手剩 %d。%s"
			var use := K.button(txt, "normal", 14)
			use.tooltip_text = info_t % [str(r.text), int(r.my_before), int(r.foe_before), int(r.my_after), int(r.foe_after), str(r.note)]
			var rr: Dictionary = r
			use.pressed.connect(func():
				picked_rec = rr
				composer.setup(avail, S.tokens_of_skill(rr.sk.nodes)))
			# 先看后拼：人话直接写在按钮下面，鼠标停上去拼句台的人话提示也读一遍
			rbox.add_child(_with_text(use, str(r.text), "推荐【%s】填进去读作：" % str(r.name)))
		v.add_child(rbox)
	_avail = avail
	intent_box = K.hbox(8)
	v.add_child(intent_box)
	composer = Composer.new()
	composer.compact = true
	composer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	composer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	composer.changed.connect(_on_changed)
	v.add_child(composer)
	var foot := K.hbox(12)
	info = K.label("还没拼完。", 18, K.MUTED)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	foot.add_child(info)
	btn_ok = K.button("就这一句  →  选目标", "primary", 22)
	btn_ok.custom_minimum_size = Vector2(300, 52)
	btn_ok.disabled = true
	btn_ok.pressed.connect(_ok)
	Tut.tag(btn_ok, "k:confirm")
	foot.add_child(btn_ok)
	v.add_child(foot)
	composer.cooling = cooling
	composer.setup(avail, init_tokens)
	_on_changed()

func _on_changed() -> void:
	if composer == null or info == null:
		return
	var nodes: Array = composer.skill_nodes()
	cur_skill = {}
	if nodes.is_empty():
		info.text = "从下面的词里挑词，按顺序拼成一句话。不会拼就看提示里的“辅助轮”建议。"
		info.add_theme_color_override("font_color", K.MUTED)
		btn_ok.disabled = true
		return
	var r := RandomNumberGenerator.new()
	r.seed = hash(G.describe(G.skill("x", nodes)))
	var nm := Namer.skill_name(G.finalize(G.skill("x", nodes.duplicate(true))), r)
	cur_skill = G.finalize(G.skill(nm, nodes.duplicate(true)))
	info.text = "【%s】 行动点 %d · 起手 ≥%d 秒 —— %s" % [nm, int(cur_skill.cost), int(cur_skill.windup), str(cur_skill.text)]
	info.add_theme_color_override("font_color", K.TEXT)
	btn_ok.disabled = false

func _ok() -> void:
	if cur_skill.is_empty():
		return
	Sfx.play("stamp")
	Tut.fire("compose_confirm")
	composed.emit(cur_skill)

# 按玩家说的话找几条现成的句子；词够的点一下填入，词不够的灰着并写出还缺什么
func _find_intent() -> void:
	K.clear_children(intent_box)
	var text: String = intent_edit.text.strip_edges()
	if text == "":
		return
	var list: Array = Intent.find(text, _avail, 3)
	if list.is_empty():
		intent_box.add_child(K.label("没听懂。试试这样说：" + "；".join(Intent.EXAMPLES), 14, K.MUTED))
		return
	for it in list:
		var label_t: String = "【%s】" % str(it.name)
		if bool(it.ok):
			label_t += " 填入"
		else:
			var parts: Array = []
			for w in it.missing:
				parts.append(str(w))
			label_t += " 还缺：" + "、".join(parts)
		var b := K.button(label_t, "normal" if bool(it.ok) else "ghost", 14)
		b.tooltip_text = str(it.desc) + "\n" + str(it.skill.get("text", ""))
		b.disabled = not bool(it.ok)
		var sk: Dictionary = it.skill
		b.pressed.connect(func():
			picked_rec = {}
			composer.setup(_avail, S.tokens_of_skill(sk.nodes)))
		var head_t: String = ("【%s】填进去读作：" % str(it.name)) if bool(it.ok) else ("【%s】（词还不够）拼成了会读作：" % str(it.name))
		intent_box.add_child(_with_text(b, str(it.skill.get("text", "")), head_t))

# 按钮 + 它下面的一行人话（最多两行，全文在悬停时由拼句台的人话提示读出来）
func _with_text(b: Control, text: String, head: String) -> Control:
	var col := K.vbox(2)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(b)
	if text != "":
		var l := K.wrap_label("读作：" + text, 13, Color("e6ecff"))
		l.max_lines_visible = 2
		l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		l.tooltip_text = text
		l.mouse_filter = Control.MOUSE_FILTER_PASS
		col.add_child(l)
		for c in [b, l]:
			c.mouse_entered.connect(func():
				if composer != null:
					composer.show_preview(head + text))
			c.mouse_exited.connect(func():
				if composer != null:
					composer.clear_preview())
	return col

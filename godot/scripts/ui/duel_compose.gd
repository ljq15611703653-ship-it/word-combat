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

signal composed(skill)
signal cancelled()

var composer
var info: Label
var btn_ok: Button
var cur_skill: Dictionary = {}
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
			rbox.add_child(use)
		v.add_child(rbox)
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

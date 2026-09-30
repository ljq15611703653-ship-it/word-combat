extends Control
# 战斗界面：上排对手、下排己方，中间是20秒时间轴，底部是手牌（己方技能）与宣告面板。
# 流程：先手锁定 → 后手看见后应对 → 时间轴逐秒播放结算。

const K = preload("res://scripts/ui/kit.gd")
const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const MinionCard = preload("res://scripts/ui/minion_card.gd")
const Timeline = preload("res://scripts/ui/timeline.gd")
const DeckView = preload("res://scripts/ui/deck_view.gd")

signal next_round()
signal quit_to_title()
signal rematch()

const CARD_SIZE := Vector2(160, 204)

var m
var cards := {}
var enemy_row: HBoxContainer
var my_row: HBoxContainer
var timeline
var banner: VBoxContainer
var hand_row: HBoxContainer
var action_box: VBoxContainer
var log_box: RichTextLabel
var round_label: Label
var score_label: Label
var ap_label: Label
var toast_label: Label
var fx_layer: Control
var overlay: Control
var speed_btn: Button

var sel_sid := -1
var sel_choices := {}
var sel_start := 0
var picking := {}
var my_turn := false
var busy := false
var speed := 1.0
var disp_score := [0, 0]
var skip_anim := false
var _built := false
var auto_human := false

func begin(match_obj) -> void:
	m = match_obj
	if auto_human:
		print("第 %d 轮 战斗开始" % int(m.st.round))
	if not _built:
		_build()
		_built = true
	cards.clear()
	_clear_selection()
	timeline.clear_all()
	disp_score = [int(m.st.sides[0].score), int(m.st.sides[1].score)]
	log_box.clear()
	_log("[color=#e0b85c]—— 第 %d 轮 ——[/color]" % m.st.round)
	_rebuild_rows()
	_rebuild_hand()
	_update_hud()
	_update_marks()
	banner_clear()
	_next_declare()

# ---------------------------------------------------------------- 骨架
func _build() -> void:
	K.clear_children(self)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var root := MarginContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		root.add_theme_constant_override("margin_" + side, 18)
	root.add_theme_constant_override("margin_top", 8)
	root.add_theme_constant_override("margin_bottom", 8)
	add_child(root)
	var v := K.vbox(4)
	root.add_child(v)
	# 顶栏
	var top := K.hbox(16)
	round_label = K.label("", 22, K.GOLD)
	top.add_child(round_label)
	score_label = K.label("", 22, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	score_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(score_label)
	ap_label = K.label("", 19, K.TEXT, HORIZONTAL_ALIGNMENT_RIGHT)
	top.add_child(ap_label)
	var peek := K.button("对手牌组", "normal", 16)
	peek.custom_minimum_size = Vector2(0, 34)
	peek.pressed.connect(_peek_enemy)
	top.add_child(peek)
	var mine := K.button("我的牌组", "normal", 16)
	mine.custom_minimum_size = Vector2(0, 34)
	mine.pressed.connect(_peek_mine)
	top.add_child(mine)
	speed_btn = K.button("动画 ×1", "normal", 16)
	speed_btn.custom_minimum_size = Vector2(0, 34)
	speed_btn.pressed.connect(_toggle_speed)
	top.add_child(speed_btn)
	var quit := K.button("退出", "ghost", 16)
	quit.custom_minimum_size = Vector2(0, 34)
	quit.pressed.connect(func(): quit_to_title.emit())
	top.add_child(quit)
	v.add_child(top)
	# 敌方排
	enemy_row = K.hbox(10)
	enemy_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(enemy_row)
	# 时间轴 + 横幅
	var mid := PanelContainer.new()
	mid.add_theme_stylebox_override("panel", K.style(Color("151927"), K.EDGE, 10, 1))
	var mv := K.vbox(0)
	mid.add_child(mv)
	banner = K.vbox(2)
	mv.add_child(banner)
	timeline = Timeline.new()
	mv.add_child(timeline)
	v.add_child(mid)
	# 我方排
	my_row = K.hbox(10)
	my_row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(my_row)
	# 底部：日志 | 手牌 | 宣告面板
	var bottom := K.hbox(10)
	bottom.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var logp := K.panel(Color("141826"), K.EDGE, 10, 1)
	logp.custom_minimum_size = Vector2(330, 0)
	log_box = RichTextLabel.new()
	log_box.bbcode_enabled = true
	log_box.scroll_following = true
	log_box.add_theme_font_size_override("normal_font_size", 14)
	log_box.add_theme_font_size_override("bold_font_size", 14)
	logp.add_child(log_box)
	bottom.add_child(logp)
	var hand_sc := ScrollContainer.new()
	hand_sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hand_sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	hand_row = K.hbox(8)
	hand_row.alignment = BoxContainer.ALIGNMENT_BEGIN
	hand_sc.add_child(hand_row)
	bottom.add_child(hand_sc)
	var ap := K.panel(K.PANEL, K.GOLD_D, 12, 2, 6)
	ap.custom_minimum_size = Vector2(470, 0)
	var asc := ScrollContainer.new()
	asc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	action_box = K.vbox(6)
	action_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	asc.add_child(action_box)
	ap.add_child(asc)
	bottom.add_child(ap)
	v.add_child(bottom)
	# 特效层
	fx_layer = Control.new()
	fx_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fx_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fx_layer)
	toast_label = K.label("", 40, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	toast_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.95))
	toast_label.add_theme_constant_override("outline_size", 8)
	toast_label.position = Vector2(300, 318)
	toast_label.size = Vector2(1000, 60)
	toast_label.modulate.a = 0.0
	toast_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fx_layer.add_child(toast_label)
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)

func _toggle_speed() -> void:
	speed = 2.0 if speed == 1.0 else (4.0 if speed == 2.0 else 1.0)
	speed_btn.text = "动画 ×%d" % int(speed)

func banner_clear() -> void:
	K.clear_children(banner)

# ---------------------------------------------------------------- 显示同步
func _name_of(uid: int) -> String:
	var u := E._u(m.st, uid)
	if u.is_empty():
		return "?"
	return "%s的%s" % ["你" if u.side == 0 else "对手", u.name]

func _skills_of(u: Dictionary) -> Array:
	var out: Array = []
	for sid in u.skill_ids:
		out.append(E.skill_of(m.st, sid))
	return out

func _rebuild_rows() -> void:
	K.clear_children(enemy_row)
	K.clear_children(my_row)
	cards.clear()
	for s in 2:
		var row := enemy_row if s == 1 else my_row
		for u in m.st.sides[s].units:
			var c := MinionCard.new(CARD_SIZE)
			row.add_child(c)
			c.setup(u, _skills_of(u), s, "battle")
			c.clicked.connect(_on_card_clicked)
			cards[u.uid] = c

func _update_hud() -> void:
	round_label.text = "第 %d / %d 轮   先手：%s" % [m.st.round, int(m.st.rules.max_rounds), "你" if m.human[E.first_side(m.st)] else "对手"]
	score_label.text = "你 %d   ∶   %d 对手      （先到 %d 分，或全灭对手）" % [disp_score[0], disp_score[1], int(m.st.rules.win_score)]
	var a0: int = m.st.sides[0].ap
	var a1: int = m.st.sides[1].ap
	ap_label.text = "行动点 你 %d/%d · 对手 %d/%d" % [a0, int(m.st.rules.ap_cap), a1, int(m.st.rules.ap_cap)]

func _update_marks() -> void:
	timeline.marks = []
	for s in 2:
		var a: Dictionary = m.pending[s]
		if a.has("done") and a.get("sid", -1) >= 0:
			var sk := E.skill_of(m.st, a.sid)
			timeline.marks.append({"t": int(a.start), "label": sk.name, "side": s})
	timeline.queue_redraw()

func _describe_act(act: Dictionary) -> String:
	if act.is_empty() or act.get("sid", -1) < 0:
		return "不行动"
	var sk := E.skill_of(m.st, act.sid)
	var t := "【%s】 第%d秒 · 操作费%d\n%s" % [sk.name, int(act.start), E.action_cost(m.st, act), sk.text]
	var parts: Array = []
	for slot in G.choice_slots(sk):
		if act.choices.has(slot.key):
			if slot.kind == "target":
				parts.append("%s → %s" % [slot.label, _name_of(int(act.choices[slot.key]))])
			elif slot.kind == "branch":
				parts.append("择一选了分支%s" % ("B" if int(act.choices[slot.key]) == 1 else "A"))
			else:
				parts.append("移除：" + _origin_label(str(act.choices[slot.key])))
	if not parts.is_empty():
		t += "\n" + "；".join(parts)
	return t

func _origin_label(origin: String) -> String:
	var p := origin.split(":")
	if p.size() < 3:
		return origin
	var sk := E.skill_of(m.st, int(p[1]))
	var node := _find_node(sk.get("nodes", []), int(p[p.size() - 1]))
	var who := "你" if int(p[0]) == 0 else "对手"
	return "%s的【%s】：%s" % [who, sk.get("name", "?"), G.node_text(node).substr(0, 40) if not node.is_empty() else ""]

func _find_node(list: Array, id: int) -> Dictionary:
	for n in list:
		var r := _find_in(n, id)
		if not r.is_empty():
			return r
	return {}

func _find_in(n: Dictionary, id: int) -> Dictionary:
	if int(n.get("id", -1)) == id:
		return n
	for key in ["child", "first", "then", "else", "a", "b"]:
		if n.has(key) and n[key] is Dictionary and not n[key].is_empty():
			var r := _find_in(n[key], id)
			if not r.is_empty():
				return r
	return {}

# ---------------------------------------------------------------- 手牌
func _rebuild_hand() -> void:
	K.clear_children(hand_row)
	var ap: int = m.st.sides[0].ap
	for u in m.st.sides[0].units:
		for sid in u.skill_ids:
			var sk := E.skill_of(m.st, sid)
			hand_row.add_child(_skill_card(sk, u, ap))
	if hand_row.get_child_count() == 0:
		hand_row.add_child(K.label("你还没有任何技能。", 20, K.MUTED))

func _skill_reason(sk: Dictionary, u: Dictionary, ap: int) -> String:
	if u.down_round != -1:
		return "持有者修整中"
	if E._silenced_for(u, int(sk.cost)):
		return "被沉默（压制操作费≤%d）" % E._silence_cap(u)
	var cheapest: int = int(sk.cost)
	if cheapest > ap:
		# 择一可能更便宜
		var has_branch := false
		for sl in G.choice_slots(sk):
			if sl.kind == "branch":
				has_branch = true
		if not has_branch:
			return "行动点不足"
	return ""

func _skill_card(sk: Dictionary, u: Dictionary, ap: int) -> Control:
	var tag: String = sk.get("kind_tag", "atk")
	var col: Color = {"atk": Color("a84a42"), "def": Color("3a70ad"), "heal": Color("3a9470"), "trap": Color("8a5ab8"), "ctl": Color("3a9494"), "buff": Color("b08a3a")}.get(tag, K.EDGE)
	var reason := _skill_reason(sk, u, ap)
	var selected: bool = int(sk.sid) == sel_sid
	var root := PanelContainer.new()
	root.custom_minimum_size = Vector2(176, 226)
	root.add_theme_stylebox_override("panel", K.style(Color("1d2233"), K.GOLD if selected else col, 12, 4 if selected else 2, 10 if selected else 4))
	var v := K.vbox(4)
	root.add_child(v)
	var head := K.hbox(6)
	head.add_child(K.chip("%d" % int(sk.cost), Color("7a6424"), 18))
	var nm := K.label(sk.name, 18, K.TEXT)
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nm.clip_text = true
	head.add_child(nm)
	v.add_child(head)
	var sub := K.hbox(6)
	sub.add_child(K.chip("起手≥%d秒" % int(sk.windup), Color("2f5f93"), 12))
	sub.add_child(K.chip(u.name, col.darkened(0.3), 12))
	v.add_child(sub)
	var tx := K.wrap_label(sk.text, 13, K.MUTED)
	tx.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tx.clip_text = true
	tx.max_lines_visible = 7
	v.add_child(tx)
	if reason != "":
		v.add_child(K.label(reason, 14, K.RED, HORIZONTAL_ALIGNMENT_CENTER))
		root.modulate = Color(1, 1, 1, 0.5)
	root.tooltip_text = "%s  操作费%d  起手≥%d秒\n%s" % [sk.name, int(sk.cost), int(sk.windup), sk.text]
	root.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			_select_skill(int(sk.sid)))
	root.mouse_entered.connect(func():
		if not selected:
			root.add_theme_stylebox_override("panel", K.style(Color("262d44"), col.lightened(0.3), 12, 3, 8)))
	root.mouse_exited.connect(func():
		root.add_theme_stylebox_override("panel", K.style(Color("1d2233"), K.GOLD if selected else col, 12, 4 if selected else 2, 10 if selected else 4)))
	return root

# ---------------------------------------------------------------- 宣告流程
func _next_declare() -> void:
	var s: int = m.declare_side()
	if s == -1:
		_resolve()
		return
	if m.human[s]:
		my_turn = true
		_clear_selection()
		_show_enemy_declared()
		_rebuild_hand()
		_render_action_panel()
		if auto_human:
			_auto_play()
	else:
		my_turn = false
		_render_action_panel()
		_ai_turn(s)

func _ai_turn(s: int) -> void:
	await get_tree().create_timer(0.35).timeout
	await get_tree().process_frame
	m.ai_declare()
	_update_marks()
	var act: Dictionary = m.public_declared(s)
	_update_hud()
	await get_tree().create_timer(0.3).timeout
	_next_declare()

func _show_enemy_declared() -> void:
	banner_clear()
	var first: int = m.declare_order[0]
	var foe := 1 - 0
	if m.pending[foe].has("done"):
		var a: Dictionary = m.public_declared(foe)
		var box := K.panel(Color("3a1f24"), K.RED, 8, 2)
		var h := K.hbox(10)
		h.add_child(K.chip("对手已宣告", K.RED.darkened(0.2), 16))
		var t := K.wrap_label(_describe_act(a).replace("\n", "   "), 16, K.TEXT)
		t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(t)
		box.add_child(h)
		banner.add_child(box)
	elif first != 0:
		pass
	else:
		var box2 := K.panel(Color("1f2a3a"), K.BLUE, 8, 1)
		box2.add_child(K.label("你是先手：先锁定行动，对手看见后再应对。", 16, K.TEXT))
		banner.add_child(box2)

func _clear_selection() -> void:
	sel_sid = -1
	sel_choices = {}
	sel_start = 0
	picking = {}
	_clear_highlights()
	timeline.windup_hint = -1
	timeline.start_hint = -1
	timeline.queue_redraw()

func _clear_highlights() -> void:
	for uid in cards:
		cards[uid].selectable = false
		if cards[uid].highlight.a > 0.0:
			cards[uid].set_highlight(Color(0, 0, 0, 0))

func _select_skill(sid: int) -> void:
	if not my_turn or busy:
		return
	var sk := E.skill_of(m.st, sid)
	var host := E.host_of(m.st, sid)
	var u := E._u(m.st, host)
	if _skill_reason(sk, u, m.st.sides[0].ap) != "":
		return
	sel_sid = sid
	sel_choices = {}
	picking = {}
	var enemy: Dictionary = m.public_declared(1)
	var act := {"side": 0, "sid": sid, "choices": {}, "start": 0}
	var ms := E.min_start(m.st, act)
	sel_start = ms
	if not enemy.is_empty() and enemy.get("sid", -1) >= 0:
		sel_start = maxi(ms, int(enemy.start))
	timeline.windup_hint = ms
	timeline.start_hint = sel_start
	timeline.queue_redraw()
	_rebuild_hand()
	_advance_picking()
	_render_action_panel()

func _advance_picking() -> void:
	_clear_highlights()
	picking = {}
	var sk := E.skill_of(m.st, sel_sid)
	for slot in G.choice_slots(sk):
		if not sel_choices.has(slot.key):
			if slot.kind == "target":
				picking = slot
				var cands := E.slot_candidates(m.st, 0, slot)
				for uid in cands:
					if cards.has(uid):
						cards[uid].selectable = true
						cards[uid].set_highlight(K.GOLD)
			return

func _on_card_clicked(card) -> void:
	if not my_turn or busy or picking.is_empty():
		return
	if not card.selectable:
		return
	sel_choices[picking.key] = card.uid
	_advance_picking()
	_render_action_panel()

func _current_act() -> Dictionary:
	return {"side": 0, "sid": sel_sid, "choices": sel_choices, "start": sel_start}

func _render_action_panel() -> void:
	K.clear_children(action_box)
	if busy:
		action_box.add_child(K.label("结算中…", 22, K.GOLD))
		return
	if not my_turn:
		action_box.add_child(K.label("对手思考中…", 22, K.MUTED))
		return
	var second: bool = m.declare_order[0] != 0
	var title := K.hbox(8)
	title.add_child(K.label("你的宣告" + ("（应对）" if second else "（先手）"), 20, K.GOLD))
	var tsp := Control.new()
	tsp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_child(tsp)
	title.add_child(K.label("行动点 %d" % int(m.st.sides[0].ap), 16, K.TEXT))
	action_box.add_child(title)
	if sel_sid < 0:
		action_box.add_child(K.wrap_label("点选下方的一张技能牌。操作费从行动点里扣；每轮 +%d，最多存 %d。先手锁定，后手看见后应对。" % [int(m.st.rules.ap_gain), int(m.st.rules.ap_cap)], 14, K.MUTED))
		var passb := K.button("本轮不行动（攒行动点）", "normal", 17)
		passb.pressed.connect(_pass)
		action_box.add_child(passb)
		return
	var sk := E.skill_of(m.st, sel_sid)
	var nm := K.hbox(8)
	nm.add_child(K.label(sk.name, 19, K.TEXT))
	nm.add_child(K.chip("起手≥%d秒" % int(sk.windup), Color("2f5f93"), 12))
	action_box.add_child(nm)
	var st := K.wrap_label(sk.text, 13, K.MUTED)
	st.max_lines_visible = 3
	action_box.add_child(st)
	# 选择槽
	for slot in G.choice_slots(sk):
		var row := K.hbox(6)
		row.add_child(K.label(slot.label, 13, K.MUTED))
		if slot.kind == "target":
			if sel_choices.has(slot.key):
				row.add_child(K.chip(_name_of(int(sel_choices[slot.key])), Color("2c5c44"), 14))
				var re := K.button("重选", "ghost", 12)
				re.custom_minimum_size = Vector2(44, 24)
				re.pressed.connect(func():
					sel_choices.erase(slot.key)
					_advance_picking()
					_render_action_panel())
				row.add_child(re)
			else:
				row.add_child(K.label("← 点击场上的卡牌", 15, K.GOLD))
		elif slot.kind == "branch":
			for bi in 2:
				var node := _find_node(sk.nodes, int(slot.node_id))
				var b := K.button("分支 " + ("B" if bi == 1 else "A"), "primary" if int(sel_choices.get(slot.key, -1)) == bi else "normal", 14)
				b.custom_minimum_size = Vector2(0, 28)
				var bidx := bi
				b.pressed.connect(func():
					sel_choices[slot.key] = bidx
					_render_action_panel())
				b.tooltip_text = G.node_text(node["a" if bi == 0 else "b"]) if not node.is_empty() else ""
				row.add_child(b)
		elif slot.kind == "remove":
			var ob := OptionButton.new()
			ob.add_theme_font_size_override("font_size", 13)
			var cands := E.slot_candidates(m.st, 0, slot, [m.public_declared(1)])
			var sel := -1
			for i in cands.size():
				ob.add_item(_origin_label(str(cands[i])).substr(0, 30))
				ob.set_item_metadata(i, cands[i])
				if sel_choices.get(slot.key, "") == cands[i]:
					sel = i
			if cands.is_empty():
				ob.add_item("（当前没有可移除的限时效果）")
				ob.disabled = true
			else:
				if sel < 0:
					sel_choices[slot.key] = cands[0]
					sel = 0
				ob.select(sel)
				ob.item_selected.connect(func(i): sel_choices[slot.key] = ob.get_item_metadata(i))
			row.add_child(ob)
		action_box.add_child(row)
	# 起手
	var act := _current_act()
	var ms := E.min_start(m.st, act)
	var srow := K.hbox(8)
	srow.add_child(K.label("起效", 14, K.MUTED))
	var sl := HSlider.new()
	sl.min_value = ms
	sl.max_value = 19
	sl.step = 1
	sl.value = maxi(sel_start, ms)
	sl.custom_minimum_size = Vector2(190, 26)
	sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var vl := K.label("第 %d 秒" % int(sl.value), 16, K.GOLD)
	sl.value_changed.connect(func(x):
		sel_start = int(x)
		vl.text = "第 %d 秒" % int(x)
		timeline.start_hint = sel_start
		timeline.queue_redraw())
	srow.add_child(sl)
	srow.add_child(vl)
	var en: Dictionary = m.public_declared(1)
	if not en.is_empty() and en.get("sid", -1) >= 0:
		var align := K.button("对齐对手", "ghost", 12)
		align.custom_minimum_size = Vector2(0, 24)
		align.tooltip_text = "对手第 %d 秒起效；想抢在前面就要更早（起手 ≥ %d 秒）" % [int(en.start), ms]
		align.pressed.connect(func():
			sel_start = maxi(ms, int(en.start))
			_render_action_panel()
			timeline.start_hint = sel_start
			timeline.queue_redraw())
		srow.add_child(align)
	action_box.add_child(srow)
	var cost := E.action_cost(m.st, act)
	var err := E.can_declare(m.st, act)
	var btns := K.hbox(8)
	btns.add_child(K.label("操作费 %d（%d→%d）" % [cost, int(m.st.sides[0].ap), int(m.st.sides[0].ap) - cost], 14, K.GOLD))
	var ok := K.button("宣告 ✓", "primary", 19)
	ok.disabled = err != ""
	ok.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ok.pressed.connect(_confirm)
	btns.add_child(ok)
	var cancel := K.button("重选", "normal", 16)
	cancel.pressed.connect(func():
		_clear_selection()
		_rebuild_hand()
		_render_action_panel())
	btns.add_child(cancel)
	action_box.add_child(btns)
	if err != "":
		action_box.add_child(K.wrap_label(err, 13, K.RED))

func _pass() -> void:
	m.submit(0, {})
	my_turn = false
	_clear_selection()
	_update_marks()
	_next_declare()

func _confirm() -> void:
	var act := _current_act()
	var err: String = m.submit(0, act)
	if err != "":
		return
	my_turn = false
	_clear_selection()
	_update_marks()
	_next_declare()

# ---------------------------------------------------------------- 结算与动画
func _resolve() -> void:
	busy = true
	my_turn = false
	_render_action_panel()
	# 结算前的快照，供动画从旧状态开始
	var snap := {}
	for s in 2:
		for u in m.st.sides[s].units:
			snap[u.uid] = {"hp": int(u.hp), "down": int(u.down_round) != -1}
	var before_score := [int(m.st.sides[0].score), int(m.st.sides[1].score)]
	var res: Dictionary = m.resolve()
	for uid in cards:
		if snap.has(uid):
			cards[uid].begin_anim(snap[uid].hp, snap[uid].down)
	disp_score = before_score
	await _animate(res.events)
	for uid in cards:
		cards[uid].end_anim()
	disp_score = [int(m.st.sides[0].score), int(m.st.sides[1].score)]
	_rebuild_rows()
	_rebuild_hand()
	_update_hud()
	timeline.set_playhead(-1.0)
	busy = false
	_after_round()

func _animate(events: Array) -> void:
	var by_t := {}
	for e in events:
		var t: int = int(e.t)
		if not by_t.has(t):
			by_t[t] = []
		by_t[t].append(e)
	# 先显示已宣告的落点
	_update_marks()
	for t in range(0, 21):
		timeline.set_playhead(float(t))
		var evs: Array = by_t.get(t, [])
		var meaningful := false
		for e in evs:
			if not (e.type in ["declare", "hp"]):
				meaningful = true
		if evs.is_empty():
			await get_tree().create_timer(0.035 / speed).timeout
			continue
		for e in evs:
			var pause := _play_event(e, t)
			if pause > 0.0 and meaningful:
				await get_tree().create_timer(pause / speed).timeout
		if meaningful:
			await get_tree().create_timer(0.3 / speed).timeout
	await get_tree().create_timer(0.3 / speed).timeout

func _card(uid: int):
	return cards.get(uid)

func _uname(uid: int) -> String:
	return _name_of(uid)

func _play_event(e: Dictionary, t: int) -> float:
	var ty: String = e.type
	match ty:
		"start":
			var sk := E.skill_of(m.st, int(e.sid))
			_log("[color=#9aa2b8]第%d秒[/color] %s发动【%s】" % [t, "你" if e.side == 0 else "对手", sk.name])
			var c = _card(int(e.host))
			if c != null:
				c.flash(K.BLUE if e.side == 0 else K.RED)
			toast("%s：%s" % ["你" if e.side == 0 else "对手", sk.name], K.BLUE if e.side == 0 else K.RED)
			return 0.45
		"dmg":
			var c2 = _card(int(e.tgt))
			if int(e.amount) > 0:
				if c2 != null:
					c2.float_text("-%d" % int(e.amount), K.RED)
					c2.shake()
					c2.flash(K.RED)
				_line_fx(int(e.src), int(e.tgt), K.RED)
				timeline.add_dot(float(t), K.RED, E._u(m.st, int(e.tgt)).side)
				_log("　%s 对 %s 造成 [color=#e0605a]%d[/color]%s" % [_uname(int(e.src)), _uname(int(e.tgt)), int(e.amount), "" if int(e.raw) == int(e.amount) else "（原 %d）" % int(e.raw)])
				return 0.3
			else:
				if c2 != null:
					c2.float_text("0", K.MUTED, 24)
				return 0.12
		"heal":
			var c3 = _card(int(e.tgt))
			if c3 != null:
				c3.float_text("+%d" % int(e.actual) if int(e.actual) > 0 else "满", K.GREEN)
				c3.flash(K.GREEN)
			timeline.add_dot(float(t), K.GREEN, E._u(m.st, int(e.tgt)).side)
			_log("　%s 恢复 [color=#62c483]%d[/color]" % [_uname(int(e.tgt)), int(e.actual)])
			return 0.25
		"status":
			var c4 = _card(int(e.tgt))
			if c4 != null:
				c4.float_text(str(e.status), Color("e0b85c"), 26)
				c4.flash(K.GOLD)
			_log("　%s 获得【%s】" % [_uname(int(e.tgt)), str(e.status)])
			return 0.3
		"block":
			var c5 = _card(int(e.tgt))
			if c5 != null:
				c5.float_text("格挡!", K.GOLD, 28)
			_log("　%s 的首挡生效" % _uname(int(e.tgt)))
			return 0.25
		"shield":
			var c6 = _card(int(e.tgt))
			if c6 != null:
				c6.float_text("盾 -%d" % int(e.absorbed), K.BLUE, 24)
			return 0.2
		"mit":
			var c7 = _card(int(e.tgt))
			if c7 != null:
				c7.float_text("减伤", K.BLUE, 26)
				c7.flash(K.BLUE)
			_log("　%s 获得减伤" % _uname(int(e.tgt)))
			return 0.25
		"watch_install":
			var c8 = _card(int(e.host))
			if c8 != null:
				c8.flash(K.PURPLE)
				c8.float_text("设伏", K.PURPLE, 24)
			_log("[color=#a279d6]第%d秒[/color] %s布下：%s" % [t, "你" if e.side == 0 else "对手", str(e.text).substr(0, 60)])
			return 0.4
		"trigger":
			var c9 = _card(int(e.host))
			if c9 != null:
				c9.flash(K.PURPLE)
				c9.float_text("触发!", K.PURPLE, 26)
			_log("　[color=#a279d6]%s 的监听触发[/color]" % _uname(int(e.host)))
			return 0.35
		"redirect":
			var cf = _card(int(e.from))
			if cf != null:
				cf.float_text("转移!", K.PURPLE, 28)
			_line_fx(int(e.from), int(e.to), K.PURPLE)
			toast("伤害被转移给 %s" % _uname(int(e.to)), K.PURPLE)
			_log("　[color=#a279d6]%d 点伤害从 %s 转移给 %s[/color]" % [int(e.amount), _uname(int(e.from)), _uname(int(e.to))])
			return 0.6
		"convert":
			var cc = _card(int(e.tgt))
			if cc != null:
				cc.float_text("转为治疗", K.GREEN, 24)
			_log("　[color=#62c483]%s 受到的伤害被转为治疗[/color]" % _uname(int(e.tgt)))
			return 0.45
		"interrupt":
			toast("打断！对方的招式落空", K.GOLD)
			_log("[color=#e0b85c]第%d秒 %s打断了%s的技能[/color]" % [t, "你" if e.side == 0 else "对手", "对手" if e.side == 0 else "你"])
			return 0.6
		"delay":
			toast("延后 %d 秒" % int(e.sec), K.GOLD)
			_log("[color=#e0b85c]第%d秒 %s把%s的技能延后%d秒[/color]" % [t, "你" if e.side == 0 else "对手", "对手" if e.side == 0 else "你", int(e.sec)])
			return 0.5
		"advance":
			toast("提前 %d 秒" % int(e.sec), K.GOLD)
			return 0.4
		"fizzle":
			var cz = _card(int(e.get("host", -1)))
			if cz != null:
				cz.float_text("落空", K.MUTED, 26)
			_log("　[color=#9aa2b8]%s 的技能落空（%s）[/color]" % [_uname(int(e.get("host", -1))), str(e.why)])
			return 0.4
		"swap":
			toast("换位", K.GOLD)
			return 0.3
		"hp":
			var ch = _card(int(e.tgt))
			if ch != null:
				ch.animate_hp(int(e.hp))
			return 0.0
		"down":
			var cd = _card(int(e.tgt))
			if cd != null:
				cd.anim_down = true
				cd.refresh(cd.unit, cd.skills)
				cd.float_text("倒下", K.RED, 34)
				cd.shake()
			disp_score[int(e.score_side)] += int(e.score)
			_update_hud()
			toast("%s 倒下！ %s +%d分" % [_uname(int(e.tgt)), "你" if int(e.score_side) == 0 else "对手", int(e.score)], K.RED if int(e.score_side) == 1 else K.GREEN)
			_log("　[color=#e0605a]%s 倒下[/color]，%s 得 %d 分" % [_uname(int(e.tgt)), "你" if int(e.score_side) == 0 else "对手", int(e.score)])
			return 0.75
		"keyword":
			var ck = _card(int(e.tgt))
			if ck != null:
				ck.float_text(str(e.kw), K.GOLD, 26)
			_log("　%s 的关键词【%s】生效" % [_uname(int(e.tgt)), str(e.kw)])
			return 0.35
		"immune":
			var ci = _card(int(e.tgt))
			if ci != null:
				ci.float_text("免疫", K.MUTED, 26)
			return 0.25
		"link_split":
			var cl = _card(int(e.partner))
			if cl != null:
				cl.float_text("分摊 %d" % int(e.amount), Color("b48ae0"), 24)
			return 0.25
		"bank":
			var cb = _card(int(e.tgt))
			if cb != null:
				cb.float_text("蓄势 +%d" % int(e.amount), K.GOLD, 24)
			return 0.25
		"cleanse":
			var cn = _card(int(e.tgt))
			if cn != null:
				cn.float_text("驱散", K.BLUE, 24)
			return 0.25
		"effect_removed":
			toast("一个限时效果被移除", K.BLUE)
			_log("　[color=#5fa0e0]一个限时效果被移除[/color]")
			return 0.4
		"remove_fail", "time_fail", "redirect_fail":
			_log("　[color=#9aa2b8]%s[/color]" % str(e.get("why", "没有效果")))
			return 0.25
	return 0.0

func _line_fx(from_uid: int, to_uid: int, col: Color) -> void:
	var a = _card(from_uid)
	var b = _card(to_uid)
	if a == null or b == null or a == b:
		return
	var l := Line2D.new()
	l.width = 6.0
	l.default_color = col
	l.add_point(fx_layer.get_global_transform().affine_inverse() * (a.global_position + a.size / 2.0 * a.scale))
	l.add_point(fx_layer.get_global_transform().affine_inverse() * (b.global_position + b.size / 2.0 * b.scale))
	l.z_index = 10
	fx_layer.add_child(l)
	var t := create_tween()
	t.tween_property(l, "modulate:a", 0.0, 0.5 / speed).from(1.0)
	t.tween_callback(l.queue_free)

func toast(text: String, col: Color) -> void:
	toast_label.text = text
	toast_label.add_theme_color_override("font_color", col)
	toast_label.modulate.a = 1.0
	var t := create_tween()
	t.tween_property(toast_label, "modulate:a", 0.0, 0.8 / speed).set_delay(0.35 / speed)

func _log(bb: String) -> void:
	log_box.append_text(bb + "\n")

# 脚本化的“人类”：走真实的界面处理函数，用于自动化验证
func _auto_play() -> void:
	await get_tree().create_timer(0.25).timeout
	var Ai = load("res://scripts/ai/ai.gd")
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var acts: Array = Ai.enumerate_actions(m.st, 0, m.public_declared(1))
	var act: Dictionary = acts[rng.randi() % acts.size()]
	if act.is_empty():
		_pass()
		return
	_select_skill(int(act.sid))
	var guard := 0
	while not picking.is_empty() and guard < 10:
		guard += 1
		var uid: int = int(act.choices.get(picking.key, -1))
		if cards.has(uid):
			_on_card_clicked(cards[uid])
		else:
			break
	for k in act.choices:
		sel_choices[k] = act.choices[k]
	sel_start = int(act.start)
	_confirm()

# ---------------------------------------------------------------- 回合结束
func _after_round() -> void:
	K.clear_children(action_box)
	banner_clear()
	if m.winner != -1:
		_show_game_over()
		return
	action_box.add_child(K.label("本轮结算完毕", 22, K.GOLD))
	var alive0 := E.alive_units(m.st, 0).size()
	var alive1 := E.alive_units(m.st, 1).size()
	action_box.add_child(K.label("场上存活：你 %d · 对手 %d" % [alive0, alive1], 17, K.TEXT))
	action_box.add_child(K.label("分数：你 %d · 对手 %d" % [int(m.st.sides[0].score), int(m.st.sides[1].score)], 17, K.TEXT))
	var nb := K.button("下一轮  →", "primary", 22)
	nb.custom_minimum_size = Vector2(0, 52)
	nb.pressed.connect(func(): next_round.emit())
	action_box.add_child(nb)
	if auto_human:
		await get_tree().create_timer(0.3).timeout
		next_round.emit()

func _show_game_over() -> void:
	if auto_human:
		print("【自动游玩结束】胜者=%d 轮数=%d 分数 %d:%d" % [int(m.winner), int(m.st.round), int(m.st.sides[0].score), int(m.st.sides[1].score)])
		get_tree().quit()
		return
	K.clear_children(overlay)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(dim)
	var p := K.panel(Color("171b29"), K.GOLD, 20, 3, 20)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(620, 380)
	p.position = Vector2(490, 260)
	overlay.add_child(p)
	var v := K.vbox(14)
	p.add_child(v)
	var w: int = m.winner
	var title := "胜利！" if w == 0 else ("落败" if w == 1 else "平局")
	var col := K.GREEN if w == 0 else (K.RED if w == 1 else K.GOLD)
	var tl := K.label(title, 64, col, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(tl)
	v.add_child(K.label("你 %d 分  ∶  %d 分 对手    共 %d 轮" % [int(m.st.sides[0].score), int(m.st.sides[1].score), int(m.st.round)], 24, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	var reason := ""
	if E.alive_units(m.st, 1).is_empty() and w == 0:
		reason = "对手全队同时倒下。"
	elif E.alive_units(m.st, 0).is_empty() and w == 1:
		reason = "你的全队同时倒下。"
	elif m.st.round >= int(m.st.rules.max_rounds):
		reason = "轮数用尽，按分数判定。"
	else:
		reason = "先到 %d 分。" % int(m.st.rules.win_score)
	v.add_child(K.label(reason, 18, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	var row := K.hbox(14)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	var again := K.button("再来一局", "primary", 22)
	again.custom_minimum_size = Vector2(200, 54)
	again.pressed.connect(func():
		overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		K.clear_children(overlay)
		rematch.emit())
	row.add_child(again)
	var back := K.button("返回标题", "normal", 22)
	back.custom_minimum_size = Vector2(200, 54)
	back.pressed.connect(func(): quit_to_title.emit())
	row.add_child(back)
	v.add_child(row)
	tl.scale = Vector2(0.3, 0.3)
	tl.pivot_offset = Vector2(300, 40)
	var tw := create_tween()
	tw.tween_property(tl, "scale", Vector2.ONE, 0.4).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

# ---------------------------------------------------------------- 牌组查看
func _units_for_view(s: int) -> Array:
	var out: Array = []
	for u in m.st.sides[s].units:
		var d: Dictionary = u.duplicate(false)
		d["skills"] = _skills_of(u)
		out.append(d)
	return out

func _peek_enemy() -> void:
	_peek("对手的牌组（公开）", _units_for_view(1), "性格：" + str(m.personas[1]))

func _peek_mine() -> void:
	_peek("我的牌组", _units_for_view(0), "")

func _peek(title: String, units: Array, extra: String) -> void:
	var dv := DeckView.new()
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(dv)
	dv.open(title, units, extra)
	dv.closed.connect(func():
		dv.queue_free()
		overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE)

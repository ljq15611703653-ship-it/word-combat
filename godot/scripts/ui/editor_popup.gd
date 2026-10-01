extends Control
# 卡牌编辑器弹窗：一张随从卡的名字、生命、关键词和它唯一的技能。
# 技能只能“拼”出来：在右边的拼句台里把词一张一张接成一句话（见 scripts/compose/）。
# 没有模板、没有滑块——每个数字也是手填、烙成一张牌。拼好点“确定”，所有牌飞起来合成一句人话。

const Tut = preload("res://scripts/tutorial/tutorial.gd")
const K = preload("res://scripts/ui/kit.gd")
const Appraise = preload("res://scripts/game/appraise.gd")
const Pet = preload("res://scripts/ui/pet.gd")
const Icon = preload("res://scripts/ui/icon.gd")
const G = preload("res://scripts/core/grammar.gd")
const D = preload("res://scripts/core/deck.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Namer = preload("res://scripts/core/namer.gd")
const S = preload("res://scripts/compose/sentence.gd")
const Composer = preload("res://scripts/compose/composer.gd")
const FX = preload("res://scripts/compose/stamp_fx.gd")
const CardFace = preload("res://scripts/ui/card_face.gd")
const MinionStage = preload("res://scripts/view3d/minion_stage.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")

signal committed(unit)
signal cancelled()

var base_deck: Dictionary
var pool: Dictionary
var unit_idx := 0
var work: Dictionary          # 正在编辑的这张卡
var slot := 0                 # 一人一招，恒为 0
var mode := "initial"
var require_name := false     # 开局第一张牌：必须给随从起名才能确定
var _named := false

var hp_label: Label
var skill_name_edit: LineEdit
var kw_slot: Control
var card_face: Control
var stage: Control
var kw_flow: HFlowContainer
var kw_desc: Label
var fx_top: Control
var slot_box: VBoxContainer
var info_box: VBoxContainer
var btn_commit: Button
var budget_label: Label
var composer: Control
var unit_name_edit: LineEdit
var sum_box: VBoxContainer
var rb_box: VBoxContainer
var sel_name := ""            # 玩家给技能起的名字（空=按效果自动起）
var cur_skill: Dictionary = {}
var _rng := RandomNumberGenerator.new()
var _ap_token := 0
var _last_ap_sig := ""
var _committing := false

func _unhandled_key_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE and visible and not _committing and not require_name:
		get_viewport().set_input_as_handled()
		cancelled.emit()

func open(deck: Dictionary, idx: int, pool_words: Dictionary, m: String) -> void:
	base_deck = deck
	unit_idx = idx
	pool = pool_words
	mode = m
	work = D.clone(deck).units[idx]
	slot = 0
	var sk: Dictionary = work.skills[0] if not work.skills.is_empty() else {}
	sel_name = str(sk.get("name", "")) if sk.get("custom_name", false) else ""
	_build()
	var init: Array = S.tokens_of_skill(sk.nodes) if sk.has("nodes") else []
	composer.setup(avail_for_slot(), init)
	_on_composed()

# ---------------------------------------------------------------- 可用性计算
func _other_used() -> Dictionary:
	# 除“当前正在编辑的这个技能”以外，牌组其余部分用掉的词
	var used := {}
	for i in base_deck.units.size():
		if i == unit_idx:
			continue
		for w in D.used_words({"units": [base_deck.units[i]]}):
			used[w] = int(used.get(w, 0)) + 1
	if work.kw != "":
		used[work.kw] = int(used.get(work.kw, 0)) + 1
	return used

func avail_for_slot() -> Dictionary:
	var used := _other_used()
	var a := {}
	for w in pool:
		a[w] = int(pool[w]) - int(used.get(w, 0))
	return a

func _points_other() -> int:
	var total := 0
	for i in base_deck.units.size():
		if i == unit_idx:
			continue
		total += int(base_deck.units[i].max_hp)
		for sk in base_deck.units[i].skills:
			total += int(sk.budget)
	total += int(work.max_hp)
	return total

func _slot_budget() -> int:
	return int(work.skills[0].budget) if not work.skills.is_empty() else 0

# ---------------------------------------------------------------- 构建界面
func _build() -> void:
	K.clear_children(self)
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.72)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var win := K.panel(Color("171b29"), K.GOLD_D, 18, 2, 18)
	win.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	win.offset_left = 28
	win.offset_right = -28
	win.offset_top = 20
	win.offset_bottom = -20
	add_child(win)
	var root := K.vbox(8)
	win.add_child(root)
	# 标题栏
	var head := K.hbox(12)
	head.add_child(K.label("编辑【%s】" % work.name, 26, K.GOLD))
	head.add_child(K.label("改动将写入牌组" if mode == "initial" else "本次调整只能改这一张卡（消耗1次调整）", 14, K.MUTED))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	budget_label = K.label("", 17, K.TEXT)
	head.add_child(budget_label)
	root.add_child(head)
	var body := K.hbox(12)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(body)
	# ---------------- 左栏：这张卡本身
	var left := K.panel(K.PANEL, K.EDGE, 12, 1)
	left.custom_minimum_size = Vector2(380, 0)
	Tut.tag(left, "e:left")
	body.add_child(left)
	var lsc := ScrollContainer.new()
	lsc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	left.add_child(lsc)
	var lv := K.vbox(8)
	lv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lsc.add_child(lv)
	# 卡面（2D）和随从（3D）并排：拼一个词，两边都会跟着变
	var pv := K.hbox(6)
	pv.alignment = BoxContainer.ALIGNMENT_CENTER
	card_face = CardFace.new()
	card_face.custom_minimum_size = CardFace.SIZE
	pv.add_child(card_face)
	stage = MinionStage.new()
	stage.custom_minimum_size = Vector2(196, 196)
	pv.add_child(stage)
	Tut.tag(pv, "e:preview3d")
	lv.add_child(pv)
	var nrow := K.hbox(6)
	nrow.add_child(K.label("卡名", 17, K.MUTED))
	unit_name_edit = LineEdit.new()
	unit_name_edit.max_length = 8
	unit_name_edit.text = work.name
	unit_name_edit.custom_minimum_size = Vector2(150, 34)
	unit_name_edit.text_changed.connect(func(t):
		work.name = t if t.strip_edges() != "" else work.name
		_named = true
		_refresh_preview(false)
		_refresh_info()
		Tut.fire("named"))
	nrow.add_child(unit_name_edit)
	var dice := K.button("随机", "normal", 15)
	dice.custom_minimum_size = Vector2(54, 34)
	dice.tooltip_text = "按这张卡装的技能随机取一个名字"
	dice.pressed.connect(func():
		_rng.randomize()
		work.name = Namer.minion_name(work, _rng)
		unit_name_edit.text = work.name
		_named = true
		_refresh_preview(false)
		_refresh_info()
		Tut.fire("named"))
	nrow.add_child(dice)
	Tut.tag(nrow, "e:name")
	lv.add_child(nrow)
	var hp_row := K.hbox(6)
	hp_row.add_child(K.label("生命", 17, K.MUTED))
	for d in [-5, -1]:
		var b := K.button(str(d), "normal", 15)
		b.custom_minimum_size = Vector2(42, 34)
		b.pressed.connect(func(): _hp(d))
		hp_row.add_child(b)
	hp_label = K.label("", 24, K.GREEN, HORIZONTAL_ALIGNMENT_CENTER)
	hp_label.custom_minimum_size.x = 54
	hp_row.add_child(hp_label)
	for d in [1, 5]:
		var b2 := K.button("+%d" % d, "normal", 15)
		b2.custom_minimum_size = Vector2(42, 34)
		b2.pressed.connect(func(): _hp(d))
		hp_row.add_child(b2)
	Tut.tag(hp_row, "e:hp")
	lv.add_child(hp_row)
	lv.add_child(HSeparator.new())
	# 技能名（和随从名分开起）
	var snrow := K.hbox(6)
	snrow.add_child(K.label("技能名", 17, K.MUTED))
	skill_name_edit = LineEdit.new()
	skill_name_edit.max_length = 10
	skill_name_edit.placeholder_text = "拼好后自动起一个"
	skill_name_edit.text = sel_name
	skill_name_edit.custom_minimum_size = Vector2(150, 34)
	skill_name_edit.text_changed.connect(func(tx):
		sel_name = tx.strip_edges()
		_on_composed(false)
		Tut.fire("skill_named"))
	snrow.add_child(skill_name_edit)
	var sdice := K.button("随机", "normal", 15)
	sdice.custom_minimum_size = Vector2(54, 34)
	sdice.tooltip_text = "按这个技能的效果随机取一个名字"
	sdice.pressed.connect(func():
		_rng.randomize()
		if not cur_skill.is_empty():
			sel_name = Namer.skill_name(cur_skill, _rng)
			skill_name_edit.text = sel_name
			_on_composed(false)
		Tut.fire("skill_named"))
	snrow.add_child(sdice)
	Tut.tag(snrow, "e:skillname")
	lv.add_child(snrow)
	# 技能小结
	sum_box = K.vbox(4)
	Tut.tag(sum_box, "e:preview")
	lv.add_child(sum_box)
	rb_box = K.vbox(3)
	lv.add_child(rb_box)
	info_box = K.vbox(2)
	lv.add_child(info_box)
	# ---------------- 右栏：拼句台
	composer = Composer.new()
	composer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	composer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	composer.changed.connect(func(): _on_composed())
	composer.hint_ready.connect(func(): _refresh_preview())
	body.add_child(composer)
	# ---------------- 关键词：底下摆一排，点一张烙到这张卡上
	var kwp := K.panel(Color("1d2233"), K.GOLD_D, 10, 1)
	var kwh := K.hbox(10)
	kwp.add_child(kwh)
	var kwv := K.vbox(2)
	kwv.add_child(K.label("关键词", 16, K.GOLD))
	kwv.add_child(K.label("一张卡最多一个", 12, K.MUTED))
	kwh.add_child(kwv)
	kw_slot = Control.new()
	kw_slot.custom_minimum_size = Vector2(66, 82)
	kwh.add_child(kw_slot)
	kw_desc = K.wrap_label("", 13, K.MUTED)
	kw_desc.custom_minimum_size = Vector2(190, 0)
	kwh.add_child(kw_desc)
	kwh.add_child(VSeparator.new())
	kw_flow = HFlowContainer.new()
	kw_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	kw_flow.add_theme_constant_override("h_separation", 6)
	kwh.add_child(kw_flow)
	Tut.tag(kwp, "e:kw")
	kwp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# ---------------- 底栏：左下角留给桌宠“小词”，关键词一排摆在中间，确定在右边
	var foot := K.hbox(12)
	var pet_gap := Control.new()
	pet_gap.custom_minimum_size = Vector2(112, 0)
	foot.add_child(pet_gap)
	foot.add_child(kwp)
	var cancel := K.button("取消", "normal", 19)
	cancel.custom_minimum_size = Vector2(100, 44)
	cancel.pressed.connect(func():
		if not _committing:
			cancelled.emit())
	cancel.visible = not require_name      # 开局第一张牌：不能取消，必须拼出来
	foot.add_child(cancel)
	btn_commit = K.button("确定，拼好了", "primary", 20)
	btn_commit.custom_minimum_size = Vector2(170, 44)
	Tut.tag(btn_commit, "e:commit")
	btn_commit.pressed.connect(_on_commit)
	foot.add_child(btn_commit)
	root.add_child(foot)
	fx_top = Control.new()
	fx_top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fx_top.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(fx_top)
	_refresh_left()

# ---------------------------------------------------------------- 左栏
func _hp(d: int) -> void:
	var nv: int = maxi(1, int(work.max_hp) + d)
	if d > 0 and _points_other() - int(work.max_hp) + nv > D.BUDGET:
		nv = D.BUDGET - (_points_other() - int(work.max_hp))
	work.max_hp = maxi(1, nv)
	_refresh_left()
	_on_composed(false)

func _pick_kw(kw: String) -> void:
	if composer == null or _committing:
		return
	var same: bool = work.kw == kw
	work.kw = "" if same else kw
	Sfx.play("click" if same else "stamp")
	_refresh_left(not same)
	composer.setup(avail_for_slot(), composer.tokens)   # 关键词占用的词变了
	_on_composed(false)
	Tut.fire("kw:" + str(work.kw))

func _refresh_left(stamp_kw: bool = false) -> void:
	hp_label.text = str(work.max_hp)
	# 关键词：槽里是已烙上的，下面一排是还能选的
	var used := _other_used()
	if work.kw != "":
		used[work.kw] = int(used.get(work.kw, 0)) - 1
	K.clear_children(kw_slot)
	if work.kw != "":
		var t := K.word_card(work.kw, 1, -1, Vector2(66, 82))
		t.mouse_filter = Control.MOUSE_FILTER_STOP
		t.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		t.tooltip_text = "点一下取下这个关键词"
		var cur: String = work.kw
		t.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
				_pick_kw(cur))
		kw_slot.add_child(t)
		if stamp_kw:
			await get_tree().process_frame
			if is_instance_valid(t):
				FX.stamp(t, fx_top)
		kw_desc.text = str(Lex.get_word(work.kw).desc)
	else:
		var ph := Panel.new()
		ph.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(1, 1, 1, 0.04)
		sb.border_color = Color(1, 1, 1, 0.3)
		sb.set_border_width_all(2)
		sb.set_corner_radius_all(9)
		ph.add_theme_stylebox_override("panel", sb)
		kw_slot.add_child(ph)
		kw_desc.text = "还没有关键词。点右边一张，烙到这张卡上。"
	K.clear_children(kw_flow)
	var any := false
	for kw in D.KEYWORDS:
		var have := int(pool.get(kw, 0)) - int(used.get(kw, 0))
		if have <= 0 or kw == work.kw:
			continue
		any = true
		var c := K.word_card(kw, 1, -1, Vector2(66, 82))
		c.mouse_filter = Control.MOUSE_FILTER_STOP
		c.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		var kk: String = kw
		c.gui_input.connect(func(ev):
			if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
				_pick_kw(kk))
		Tut.tag(c, "e:kw:" + kw)
		kw_flow.add_child(c)
	if not any:
		kw_flow.add_child(K.label("（你现在没有可用的关键词）" if work.kw == "" else "（没有别的关键词了）", 14, K.MUTED))
	var pts := _points_other()
	budget_label.text = "点数 %d / %d" % [pts, D.BUDGET]
	budget_label.add_theme_color_override("font_color", K.RED if pts > D.BUDGET else K.TEXT)

# ---------------------------------------------------------------- 拼句台变化后
func _auto_name(nodes: Array) -> String:
	var r := RandomNumberGenerator.new()
	r.seed = hash(G.describe(G.skill("x", nodes)))
	return Namer.skill_name(G.finalize(G.skill("x", nodes.duplicate(true))), r)

func _on_composed(refresh_receipt: bool = true) -> void:
	if composer == null or sum_box == null:
		return
	var nodes: Array = composer.skill_nodes()
	cur_skill = {}
	if not nodes.is_empty():
		var nm: String = sel_name if sel_name != "" else _auto_name(nodes)
		var sk: Dictionary = G.finalize(G.skill(nm, nodes.duplicate(true)))
		if sel_name != "":
			sk["custom_name"] = true
			sk["base_name"] = sel_name
		cur_skill = sk
		skill_name_edit.placeholder_text = nm
	_render_summary()
	_refresh_preview()
	if refresh_receipt:
		_render_receipt()
	_refresh_info()
	Tut.vars["cost"] = int(cur_skill.get("cost", 0))
	Tut.vars["nums"] = int(cur_skill.get("ap_nums", 0))
	Tut.vars["price"] = int(cur_skill.get("price", 0))
	Tut.vars["windup"] = int(cur_skill.get("windup", 0))
	Tut.fire("composed")
	if not cur_skill.is_empty():
		Tut.fire("complete")

func _preview_unit() -> Dictionary:
	return {"name": str(work.name), "glyph": str(work.glyph), "kw": str(work.kw), "max_hp": int(work.max_hp)}

func _refresh_preview(animate: bool = true) -> void:
	if card_face == null or stage == null or composer == null:
		return
	var sks: Array = []
	if not cur_skill.is_empty():
		sks = [cur_skill]
	elif not composer.tokens.is_empty():
		sks = [composer.partial_skill()]
	var u := _preview_unit()
	card_face.set_unit(u, sks, animate)
	stage.set_unit(u, sks, animate)

func _render_summary() -> void:
	K.clear_children(sum_box)
	sum_box.add_child(K.label("这个技能", 15, K.MUTED))
	if cur_skill.is_empty():
		sum_box.add_child(K.wrap_label("（还没拼成一句完整的话）", 15, K.MUTED))
		return
	sum_box.add_child(K.label(cur_skill.name, 20, K.TEXT))
	sum_box.add_child(K.wrap_label(cur_skill.text, 16, K.TEXT))
	var stats := K.hbox(6)
	stats.add_child(K.chip("操作费 %d" % int(cur_skill.cost), Color("6b5a22"), 14))
	stats.add_child(K.chip("起手 ≥ %d 秒" % int(cur_skill.windup), Color("2f5f93"), 14))
	stats.add_child(K.chip("占用点数 %d" % int(cur_skill.budget), Color("4a4f66"), 14))
	sum_box.add_child(stats)
	sum_box.add_child(K.wrap_label("操作费 = 起步 %d + 填的数字 %d + 词价 %d；越强越贵" % [G.START_FEE, int(cur_skill.ap_nums), int(cur_skill.price)], 12, K.MUTED))

func _render_receipt() -> void:
	K.clear_children(rb_box)
	if cur_skill.is_empty() or not G.problems(cur_skill).is_empty():
		return
	appraise_into(rb_box, cur_skill)

func _refresh_info() -> void:
	K.clear_children(info_box)
	var ok := false
	var msgs: Array = []
	if cur_skill.is_empty():
		msgs.append("还没有拼出完整的技能：把句子拼完整再点确定。")
	else:
		for p in G.problems(cur_skill):
			msgs.append(str(p))
		if _points_other() - _slot_budget() + int(cur_skill.budget) > D.BUDGET:
			msgs.append("点数超出预算：减少生命或把数字填小一点")
		if require_name and not _named:
			msgs.append("给你的随从起个名字再确定（自己填，或点卡名旁边的“随机”）")
		var miss := G.missing(cur_skill.words, avail_for_slot())
		for w in miss:
			msgs.append("缺词：%s×%d" % [w, miss[w]])
		ok = msgs.is_empty()
	if ok:
		var merged := {"units": _merged_units()}
		var v := D.validate(merged, pool)
		if v.ok:
			info_box.add_child(K.label("当前牌组合法。", 15, K.GREEN))
		else:
			ok = false
			for e in v.errors.slice(0, 2):
				info_box.add_child(K.label("· " + str(e), 14, K.RED))
	else:
		for m2 in msgs.slice(0, 3):
			info_box.add_child(K.label("· " + str(m2), 14, K.RED if not cur_skill.is_empty() else K.MUTED))
	btn_commit.disabled = not ok

func _merged_units() -> Array:
	var units: Array = []
	for i in base_deck.units.size():
		if i == unit_idx:
			var w2: Dictionary = work.duplicate(true)
			w2.skills = [cur_skill.duplicate(true)] if not cur_skill.is_empty() else []
			units.append(w2)
		else:
			units.append(base_deck.units[i])
	return units

# ---------------------------------------------------------------- 确定
func _install(sk: Dictionary) -> void:
	var copy: Dictionary = sk.duplicate(true)
	work.skills = [copy]
	_refresh_left()

func _on_commit() -> void:
	if _committing or cur_skill.is_empty() or btn_commit.disabled:
		return
	_committing = true
	btn_commit.disabled = true
	Tut.fire("commit_pressed")
	await composer.play_combine(str(cur_skill.text))
	if not is_inside_tree():
		return
	# 组句特效结束后，随从当场对着空气放出这个技能：越厉害越炫
	var info: Dictionary = Appraise.appraise(cur_skill, base_deck, unit_idx, work.duplicate(true))
	var tier := 0
	if info.big:
		tier = 3
	elif int(info.best.get("dmg", 0)) >= 25 or int(cur_skill.cost) >= 35:
		tier = 2
	elif int(cur_skill.cost) >= 20:
		tier = 1
	Tut.fire("casting")
	await stage.cast(tier, str(cur_skill.get("kind_tag", "atk")))
	if not is_inside_tree():
		return
	_install(cur_skill)
	Tut.fire("installed")
	committed.emit(work)

# ---------------------------------------------------------------- 强度回执 + 小词感叹
func appraise_into(box: VBoxContainer, sk: Dictionary) -> void:
	box.add_child(K.label("强度回执：计算中…", 14, K.MUTED))
	_ap_token += 1
	var tok := _ap_token
	if is_inside_tree():
		await get_tree().create_timer(0.3).timeout
	if tok != _ap_token or not is_instance_valid(box):
		return
	var work_copy: Dictionary = work.duplicate(true)
	var info: Dictionary = Appraise.appraise(sk, base_deck, unit_idx, work_copy)
	if not is_instance_valid(box):
		return
	K.clear_children(box)
	var panel := K.panel(Color("2a2414") if info.big else Color("17202e"), K.GOLD if info.big else Color("2f5f93"), 8, 2 if info.big else 1)
	var v := K.vbox(3)
	panel.add_child(v)
	v.add_child(K.label("★ 超级厉害的技能！" if info.big else "强度回执", 16, K.GOLD))
	if info.summary != "":
		v.add_child(K.wrap_label("预计（对手不动时）：" + str(info.summary) + "。", 14, K.TEXT))
	if info.ok and int(info.best.get("dmg", 0)) + int(info.best.get("score", 0)) > 0:
		if info.counters.is_empty():
			v.add_child(K.wrap_label("对手现在公开的牌里：没有能拆它的招！", 14, K.GREEN))
		else:
			var names: Array = []
			for c in info.counters:
				names.append("【%s】" % c.name)
			v.add_child(K.wrap_label("对手现在公开的牌里能削弱它的：" + "、".join(names), 14, Color("e8b0aa")))
	for w in info.weak.slice(0, 3):
		v.add_child(K.wrap_label("· 怕：" + str(w), 13, K.MUTED))
	box.add_child(panel)
	var sig := "%s|%d|%s" % [sk.get("text", ""), int(work.max_hp), str(info.summary)]
	if sig != _last_ap_sig and str(info.line) != "":
		_last_ap_sig = sig
		Pet.chat(str(info.line), "excited" if info.big else "talk", 7.0)

extends Control
# 数字牌模式 · 对战界面：轮流宣告（一次定一个随从的一句）→ 结算回放 → 轮末（骰子、阶梯）→ 下一轮

const K = preload("res://scripts/ui/kit.gd")
const NR = preload("res://scripts/numcard/nc_rules.gd")
const NE = preload("res://scripts/numcard/nc_engine.gd")
const NAI = preload("res://scripts/numcard/nc_ai.gd")
const NT = preload("res://scripts/numcard/nc_text.gd")
const Composer = preload("res://scripts/numcard/ui/nc_composer.gd")
const Setup = preload("res://scripts/numcard/ui/nc_setup.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Pet = preload("res://scripts/ui/pet.gd")

signal rematch()
signal quit_to_title()

const MARK := ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"]

var M
var ui := "idle"              # idle / foe / pick_unit / compose / target / timing / assign / resolving / round_end / over
var late_pick: Array = []     # 择流定目标：这一段已经点了谁
var sel_uid := -1
var pending: Array = []       # 拼好、还在选目标的段落
var pend_i := 0
var cards := {}               # uid → 随从卡（PanelContainer）
var top_label: Label
var prog_box: VBoxContainer
var hand_box: HFlowContainer
var foe_row: HBoxContainer
var my_row: HBoxContainer
var timeline: Control
var decl_box: VBoxContainer
var action_box: VBoxContainer
var log_box: RichTextLabel
var overlay: Control
var shown_hp := {}
var playhead := -1.0
var fast := false
var auto_test := false        # 测试用：不等动画
static var test_auto := false   # 测试在开局前打开它

func begin(match_obj) -> void:
	M = match_obj
	auto_test = test_auto
	if Pet.inst != null and is_instance_valid(Pet.inst):
		Pet.inst.visible = false        # 新模式不带桌宠，免得气泡挡住拼句台
	_build()
	_refresh_all()
	_step()

# ---------------------------------------------------------------- 骨架
func _build() -> void:
	K.clear_children(self)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var mc := MarginContainer.new()
	mc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		mc.add_theme_constant_override("margin_" + side, 14)
	add_child(mc)
	var root := K.vbox(8)
	mc.add_child(root)
	# 顶栏
	var top := K.hbox(12)
	top_label = K.label("", 22, K.GOLD)
	top.add_child(top_label)
	prog_box = K.vbox(2)
	prog_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(prog_box)
	var rules := K.button("怎么玩", "normal", 16)
	rules.pressed.connect(_show_rules)
	top.add_child(rules)
	var spd := K.button("动画：正常", "ghost", 16)
	spd.pressed.connect(func():
		fast = not fast
		spd.text = "动画：快" if fast else "动画：正常")
	top.add_child(spd)
	var quit := K.button("退出", "ghost", 16)
	quit.pressed.connect(func(): quit_to_title.emit())
	top.add_child(quit)
	root.add_child(top)
	# 对手一排
	foe_row = K.hbox(10)
	foe_row.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_child(foe_row)
	# 时间轴
	timeline = Control.new()
	timeline.custom_minimum_size = Vector2(0, 64)
	timeline.draw.connect(_draw_timeline)
	root.add_child(timeline)
	# 我方一排
	my_row = K.hbox(10)
	my_row.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_child(my_row)
	# 数字牌
	hand_box = HFlowContainer.new()
	hand_box.add_theme_constant_override("h_separation", 6)
	root.add_child(hand_box)
	# 下半：宣告列表 + 日志 | 操作面板
	var bottom := K.hbox(10)
	bottom.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(bottom)
	var left := K.vbox(6)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 1.4
	bottom.add_child(left)
	var dp := K.panel(K.PANEL, K.EDGE, 10, 1)
	dp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var dsc := ScrollContainer.new()
	dsc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	dp.add_child(dsc)
	decl_box = K.vbox(4)
	decl_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dsc.add_child(decl_box)
	left.add_child(dp)
	var lp := K.panel(Color("120c12"), K.EDGE, 10, 1)
	lp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_child(lp)
	log_box = RichTextLabel.new()
	log_box.bbcode_enabled = true
	log_box.scroll_following = true
	log_box.custom_minimum_size = Vector2(0, 120)
	log_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	log_box.add_theme_font_size_override("normal_font_size", 15)
	log_box.text = "结算的经过会写在这里。"
	lp.add_child(log_box)
	var ap := K.panel(Color("1a1420"), K.GOLD_D, 12, 2)
	ap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var asc := ScrollContainer.new()
	asc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	ap.add_child(asc)
	action_box = K.vbox(8)
	action_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	asc.add_child(action_box)
	bottom.add_child(ap)
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)

# ---------------------------------------------------------------- 刷新
func _refresh_all() -> void:
	shown_hp = {}
	for u in M.R.U:
		shown_hp[int(u.uid)] = [int(u.hp), int(u.down) != -1]
	_rebuild_rows()
	_refresh_top()
	_refresh_hand()
	_refresh_decl()
	timeline.queue_redraw()

func _refresh_top() -> void:
	var first: int = M.first_side()
	top_label.text = "第 %d / %d 轮 · 本轮先宣告：%s" % [int(M.rnd), NR.MAX_ROUNDS, "你" if first == 0 else "电脑"]
	K.clear_children(prog_box)
	for s in 2:
		var c: String = M.cls_of(s)
		var h := K.hbox(8)
		h.add_child(K.chip(("你 · " if s == 0 else "电脑 · ") + NR.CLASS_NAME[c], NR.CLASS_COLOR[c], 15))
		var pb := _bar(100, minf(100.0, 100.0 * M.progress(s)), NR.CLASS_COLOR[c].lightened(0.2))
		pb.custom_minimum_size = Vector2(320, 16)
		h.add_child(pb)
		var raw: float = float(M.R.M[s][NR.METRIC[c]])
		var lb := K.label("%d%%（%s %.0f / %d，击倒 +%d%%）" % [int(100.0 * M.progress(s)), _metric_name(c), raw, int(NR.TARGET[c]), int(100.0 * float(M.R.kob[s]))], 15, K.TEXT)
		lb.tooltip_text = "得分：" + str(NR.CLASS_GOAL[c]) + "\n特长：" + NR.talent_text(c)
		lb.mouse_filter = Control.MOUSE_FILTER_PASS
		h.add_child(lb)
		var apv: int = int(M.res[s].ap) if M.phase == "declare" else int(M.sides[s].ap)
		h.add_child(K.chip("行动点 %d/%d" % [apv, NR.AP_CAP], Color("7a6424"), 14))
		prog_box.add_child(h)

func _metric_name(c: String) -> String:
	return str(NR.METRIC_NAME.get(c, ""))

func _refresh_hand() -> void:
	K.clear_children(hand_box)
	hand_box.add_child(K.label("你的数字牌：", 16, K.MUTED))
	hand_box.add_child(K.chip("1 · 免费无限", Color("4a4a5a"), 15))
	var cards_l: Array = M.sides[0].cards
	var reserved: Array = M.res[0].cards if M.phase == "declare" else []
	for i in cards_l.size():
		var c: Dictionary = cards_l[i]
		var cooling: bool = not bool(c.once) and int(M.rnd) - int(c.last) < 2
		var col := Color("8a6a1f") if not bool(c.once) else Color("8a3a6a")
		var t := "%d · %s" % [int(c.v), "阶梯" if not bool(c.once) else "骰子·一次性"]
		if cooling:
			t += "（冷却）"
			col = Color("3a3a3a")
		elif i in reserved:
			t += "（本轮已用）"
			col = Color("3a3a3a")
		hand_box.add_child(K.chip(t, col, 15))
	var foe_n: int = (M.sides[1].cards as Array).size()
	hand_box.add_child(K.label("    电脑有 %d 张数字牌" % foe_n, 15, K.MUTED))

func _rebuild_rows() -> void:
	K.clear_children(foe_row)
	K.clear_children(my_row)
	cards.clear()
	for u in M.R.U:
		var c := _unit_card(u)
		cards[int(u.uid)] = c
		if int(u.side) == 1:
			foe_row.add_child(c)
		else:
			my_row.add_child(c)

func _unit_card(u: Dictionary) -> PanelContainer:
	var uid: int = int(u.uid)
	var mine: bool = int(u.side) == 0
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(300, 118)
	var col := K.BLUE if mine else K.RED
	var hl := false
	if ui == "pick_unit" and mine and uid in M.remaining[0]:
		hl = true
	if ui == "target" and _target_ok(uid):
		hl = true
	if ui == "assign" and _late_ok(uid):
		hl = true
	p.add_theme_stylebox_override("panel", K.style(Color("1d2233"), K.GOLD if hl else col.darkened(0.2), 12, 3 if hl else 2, 4))
	var v := K.vbox(3)
	p.add_child(v)
	var head := K.hbox(6)
	head.add_child(K.label(("你的" if mine else "对手的") + str(u.name), 19, K.TEXT))
	var hpv: Array = shown_hp.get(uid, [int(u.hp), int(u.down) != -1])
	var down: bool = bool(hpv[1])
	head.add_child(K.chip("倒下·休整中" if down else "生命 %d/%d" % [int(hpv[0]), int(u.mx)], Color("5a3a3f") if down else Color("2c5c44"), 14))
	var kwt := "【%s】%s" % [str(u.kw), "本轮已用" if bool(u.kws) else ""]
	head.add_child(K.chip(kwt, Color("3a4263"), 13))
	v.add_child(head)
	var bar := _bar(int(u.mx), 0 if down else int(hpv[0]), K.GREEN if int(hpv[0]) * 2 > int(u.mx) else K.RED)
	bar.custom_minimum_size = Vector2(0, 12)
	v.add_child(bar)
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 4)
	for nm in u.st:
		var e: Array = u.st[nm]
		flow.add_child(K.chip(NT.status_chip(str(nm), e, int(M.rnd)), Color("6a2a4a"), 13))
	if int(u.mit) > 0:
		flow.add_child(K.chip("减伤%d" % int(u.mit), Color("2a4a6a"), 13))
	for l in u.lis:
		flow.add_child(K.chip("转移", Color("4a2a6a"), 13))
	for cc in M.R.conts:
		if int(cc.uid) == uid:
			flow.add_child(K.chip(NT.cont_chip(cc), NR.CLASS_COLOR["续"].darkened(0.35), 13))
	if mine and M.phase == "declare":
		if uid in M.passed[0]:
			flow.add_child(K.chip("本轮不出手", Color("3a3a3a"), 13))
		else:
			for a in M.declared:
				if int(a.uid) == uid:
					flow.add_child(K.chip("已宣告 %s" % MARK[mini(int(a.ord), MARK.size() - 1)], Color("2c6a44"), 13))
	elif not mine and M.phase == "declare":
		for a2 in M.declared:
			if int(a2.uid) == uid:
				flow.add_child(K.chip("已宣告 %s" % MARK[mini(int(a2.ord), MARK.size() - 1)], Color("6a2c2c"), 13))
	v.add_child(flow)
	p.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			_on_unit_clicked(uid))
	return p

func _refresh_decl() -> void:
	K.clear_children(decl_box)
	var title := "本轮已宣告（你看得到对方定下的每一句）" if M.phase == "declare" else "上一轮的宣告"
	decl_box.add_child(K.label(title, 16, K.MUTED))
	var list: Array = M.declared if M.phase == "declare" else M.last_declared
	if list.is_empty():
		decl_box.add_child(K.label("（还没有）", 15, K.MUTED))
	for a in list:
		var mine: bool = int(a.side) == 0
		var t := "%s %s · %s · 第 %d 秒 · 花 %d 点%s%s：%s" % [MARK[mini(int(a.ord), MARK.size() - 1)], "你" if mine else "电脑", str(M.R.U[int(a.uid)].name), int(a.start), int(a.cost),
			("（其中 %d 点用血付）" % int(a.blood)) if int(a.get("blood", 0)) > 0 else "",
			("，数字牌 " + str(a.cv)) if not (a.cv as Array).is_empty() else "", NT.action_text(M, a.cl, 0, int(a.side)) if M.phase in ["declare", "assign"] else NT.action_text(M, a.cl)]
		decl_box.add_child(K.wrap_label(t, 15, Color("9fd0ff") if mine else Color("f0a0a0")))
	if M.phase == "declare":
		for s in 2:
			for uid in M.passed[s]:
				decl_box.add_child(K.label("%s的%s 本轮不出手" % ["你" if s == 0 else "电脑", str(M.R.U[int(uid)].name)], 14, K.MUTED))

func _draw_timeline() -> void:
	var w := timeline.size.x
	var y := 30.0
	var x0 := 40.0
	var x1 := w - 40.0
	timeline.draw_line(Vector2(x0, y), Vector2(x1, y), Color(1, 1, 1, 0.3), 2.0)
	var font := timeline.get_theme_default_font()
	for t in range(0, NR.TIMELINE + 1):
		var x := x0 + (x1 - x0) * float(t) / float(NR.TIMELINE)
		timeline.draw_line(Vector2(x, y - 6), Vector2(x, y + 6), Color(1, 1, 1, 0.4), 1.0)
		timeline.draw_string(font, Vector2(x - 6, y + 26), "%d" % t, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(1, 1, 1, 0.5))
	var list: Array = M.declared if M.phase == "declare" else M.last_declared
	var stack := {}
	for a in list:
		var st: int = int(a.start)
		var k: int = int(stack.get(st, 0))
		stack[st] = k + 1
		var x2 := x0 + (x1 - x0) * float(mini(st, NR.TIMELINE)) / float(NR.TIMELINE)
		var col := Color("5fa0e0") if int(a.side) == 0 else Color("e8434d")
		timeline.draw_circle(Vector2(x2, y - 12 - k * 14), 7.0, col)
		timeline.draw_string(font, Vector2(x2 + 9, y - 7 - k * 14), MARK[mini(int(a.ord), MARK.size() - 1)], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, col)
	if playhead >= 0.0:
		var xp := x0 + (x1 - x0) * minf(playhead, float(NR.TIMELINE)) / float(NR.TIMELINE)
		timeline.draw_line(Vector2(xp, 0), Vector2(xp, 60), K.GOLD, 2.0)

# ---------------------------------------------------------------- 流程
func _step() -> void:
	if M.phase == "over":
		_show_over()
		return
	if M.phase == "assign":
		_begin_assign()
		return
	if M.phase != "declare":
		return
	var s: int = M.declare_side()
	if s == -1:
		_resolve()
		return
	if s == 0:
		ui = "pick_unit"
		sel_uid = -1
		_rebuild_rows()
		_render_panel()
		if auto_test:
			_auto_play()
		return
	ui = "foe"
	_render_panel()
	await get_tree().create_timer(0.05 if (fast or auto_test) else 0.6).timeout
	if not is_inside_tree():
		return
	M.ai_step()
	Sfx.play("declare")
	_refresh_all()
	_step()

func _render_panel() -> void:
	K.clear_children(action_box)
	match ui:
		"foe":
			action_box.add_child(K.label("电脑在想……", 22, K.MUTED))
		"pick_unit":
			action_box.add_child(K.label("轮到你：选一个随从，给它拼一句", 22, K.GOLD))
			action_box.add_child(K.wrap_label("点下面的按钮（或点你的随从卡）。每个随从一轮一句；可以先让一个随从出手，看看对方怎么接，再定下一个。", 15, K.MUTED))
			for uid in M.remaining[0]:
				var u: Dictionary = M.R.U[int(uid)]
				var row := K.hbox(8)
				var b := K.button("给【%s】拼一句" % str(u.name), "primary", 18)
				var id: int = int(uid)
				b.pressed.connect(func(): _open_composer(id))
				row.add_child(b)
				var ps := K.button("它这轮不出手", "ghost", 15)
				ps.pressed.connect(func(): _pass(id))
				row.add_child(ps)
				action_box.add_child(row)
			action_box.add_child(K.label("本轮行动点还剩 %d" % int(M.res[0].ap), 16, K.TEXT))
		"target":
			var c: Dictionary = pending[pend_i]
			action_box.add_child(K.label("选目标（第 %d / %d 段）" % [pend_i + 1, pending.size()], 22, K.GOLD))
			action_box.add_child(K.wrap_label(NT.clause_text(null, c), 16, K.TEXT))
			if str(c.k) == "delay":
				action_box.add_child(K.label("要延后对方的哪一句？", 17, K.TEXT))
				for a in M.declared:
					if int(a.side) == 1:
						var bt := K.button("%s 电脑·%s 第 %d 秒：%s" % [MARK[mini(int(a.ord), MARK.size() - 1)], str(M.R.U[int(a.uid)].name), int(a.start), NT.action_text(M, a.cl)], "normal", 14)
						var ord: int = int(a.ord)
						bt.pressed.connect(func(): _pick_act(ord))
						action_box.add_child(bt)
			else:
				var need: int = int(c.get("count", 1))
				var side_t := "敌方" if str(c.get("side", "enemy")) == "enemy" else "你的"
				action_box.add_child(K.label("点 %d 个%s随从（已选 %d 个）" % [need, side_t, (c.tg as Array).size()], 17, K.TEXT))
			var back := K.button("重新拼", "ghost", 15)
			back.pressed.connect(func(): _open_composer(sel_uid))
			action_box.add_child(back)
		"timing":
			var ms := NE.action_windup(pending, int(M.caps(0).wind))
			action_box.add_child(K.label("第几秒起效？", 22, K.GOLD))
			action_box.add_child(K.wrap_label(NT.action_text(M, pending), 15, K.TEXT))
			action_box.add_child(K.wrap_label("这句最早第 %d 秒。越早越不容易被打断；对方的招落在哪一秒，看上面的时间轴。" % ms, 15, K.MUTED))
			var cst := NE.action_cost(pending, int(M.caps(0)["and"]))
			if cst > int(M.res[0].ap):
				action_box.add_child(K.wrap_label("行动点差 %d：开打时先从【%s】身上扣 %d 点生命付掉。" % [cst - int(M.res[0].ap), str(M.R.U[sel_uid].name), cst - int(M.res[0].ap)], 15, NR.CLASS_COLOR["血"].lightened(0.3)))
			var flow := HFlowContainer.new()
			flow.add_theme_constant_override("h_separation", 6)
			var foe_starts := {}
			for a2 in M.declared:
				if int(a2.side) == 1:
					foe_starts[int(a2.start)] = true
			var best_t: int = int(pending[0].get("sugg_start", ms)) if not pending.is_empty() else ms
			if best_t != ms:
				action_box.add_child(K.wrap_label("辅助轮建议第 %d 秒。" % best_t, 15, K.GREEN))
			for t in range(ms, NR.TIMELINE + 1):
				var bt2 := K.button(("%d 秒" % t) + ("·对方" if foe_starts.has(t) else ""), "primary" if t == best_t else "normal", 16)
				var tt := t
				bt2.pressed.connect(func(): _declare(tt))
				flow.add_child(bt2)
			action_box.add_child(flow)
			var back2 := K.button("重新拼", "ghost", 15)
			back2.pressed.connect(func(): _open_composer(sel_uid))
			action_box.add_child(back2)
		"assign":
			var pl: Array = M.pending_late(0)
			if pl.is_empty():
				return
			var item: Dictionary = pl[0]
			var c2: Dictionary = item.cl
			var need: int = mini(int(c2.count), _late_pool(c2).size())
			action_box.add_child(K.label("择流 · 定目标（还剩 %d 段）" % pl.size(), 22, NR.CLASS_COLOR["择"].lightened(0.3)))
			action_box.add_child(K.wrap_label("双方都宣告完了，对手看不到你的目标。现在点 %d 个%s随从（已点 %d 个）。出手前目标倒了会自动换人。" % [need, "敌方" if str(c2.side) == "enemy" else "你的", late_pick.size()], 15, K.TEXT))
			for a in M.declared:
				if int(a.ord) == int(item.ord):
					action_box.add_child(K.wrap_label("%s %s 第 %d 秒：%s" % [MARK[mini(int(a.ord), MARK.size() - 1)], str(M.R.U[int(a.uid)].name), int(a.start), NT.clause_text(M, c2)], 15, Color("9fd0ff")))
			var sug: Array = NAI.suggest_late(M, 0, int(item.ord), int(item.ci))
			var names: Array = []
			for x in sug:
				names.append(str(M.R.U[int(x)].name))
			var sb := K.button("用建议：" + "、".join(names), "normal", 16)
			sb.pressed.connect(func():
				late_pick = sug.duplicate()
				_commit_late())
			action_box.add_child(sb)
			var ab := K.button("剩下的全部用建议", "ghost", 15)
			ab.pressed.connect(func():
				NAI.assign_late(M, 0)
				_finish_assign())
			action_box.add_child(ab)
		"resolving":
			action_box.add_child(K.label("结算中……", 22, K.GOLD))
			var sk := K.button("跳过动画", "ghost", 15)
			sk.pressed.connect(func(): fast = true)
			action_box.add_child(sk)

# ---------------------------------------------------------------- 你的操作
func _on_unit_clicked(uid: int) -> void:
	if ui == "pick_unit" and uid in M.remaining[0]:
		_open_composer(uid)
	elif ui == "target":
		_pick_target(uid)
	elif ui == "assign":
		_pick_late(uid)

func _pass(uid: int) -> void:
	var e: String = M.submit(0, uid, null)
	if e != "":
		_toast(e)
		return
	_refresh_all()
	_step()

func _open_composer(uid: int) -> void:
	sel_uid = uid
	ui = "compose"
	var pop = Composer.new()
	pop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(pop)
	pop.setup(M, uid)
	pop.cancelled.connect(func():
		pop.queue_free()
		ui = "pick_unit"
		_rebuild_rows()
		_render_panel())
	pop.done.connect(func(cls):
		pop.queue_free()
		_start_targeting(cls))

func _start_targeting(cls: Array) -> void:
	pending = cls
	for c in pending:
		if str(c.get("tmode", "")) == "self":
			c["tg"] = [sel_uid]
		elif str(c.k) != "delay" and not bool(c.get("pre", false)):
			c["tg"] = []
	pend_i = 0
	_advance_targets()

func _advance_targets() -> void:
	while pend_i < pending.size():
		var c: Dictionary = pending[pend_i]
		if str(c.k) == "delay":
			if int(c.get("act", -1)) >= 0:
				pend_i += 1
				continue
			break
		if str(c.get("tmode", "")) == "late" or (c.tg as Array).size() >= int(c.get("count", 1)):
			pend_i += 1
			continue
		break
	if pend_i >= pending.size():
		ui = "timing"
	else:
		ui = "target"
	_rebuild_rows()
	_render_panel()
	if auto_test:
		_auto_play()

func _target_ok(uid: int) -> bool:
	if ui != "target" or pend_i >= pending.size():
		return false
	var c: Dictionary = pending[pend_i]
	if str(c.k) == "delay":
		return false
	var u: Dictionary = M.R.U[uid]
	if int(u.down) != -1:
		return false
	var want_enemy: bool = str(c.get("side", "enemy")) == "enemy"
	if (int(u.side) == 1) != want_enemy:
		return false
	return not (uid in c.tg)

func _pick_target(uid: int) -> void:
	if not _target_ok(uid):
		return
	Sfx.play("click")
	(pending[pend_i].tg as Array).append(uid)
	_advance_targets()

func _pick_act(ord: int) -> void:
	pending[pend_i]["act"] = ord
	_advance_targets()

func _declare(start: int) -> void:
	var r: Dictionary = M.build_action(0, sel_uid, pending, start)
	if r.has("err"):
		_toast(str(r.err))
		return
	var e: String = M.submit(0, sel_uid, r.act)
	if e != "":
		_toast(e)
		return
	Sfx.play("declare")
	pending = []
	_refresh_all()
	_step()

# ---------------------------------------------------------------- 择流定目标
func _begin_assign() -> void:
	if M.pending_late(0).is_empty():
		_finish_assign()
		return
	ui = "assign"
	late_pick = []
	_rebuild_rows()
	_render_panel()
	if auto_test:
		await get_tree().process_frame
		NAI.assign_late(M, 0)
		_finish_assign()

func _late_pool(c: Dictionary) -> Array:
	var out: Array = []
	for u in M.R.U:
		if int(u.down) == -1 and ((int(u.side) == 1) == (str(c.side) == "enemy")):
			out.append(int(u.uid))
	return out

func _late_ok(uid: int) -> bool:
	var pl: Array = M.pending_late(0)
	if pl.is_empty():
		return false
	return uid in _late_pool(pl[0].cl) and not (uid in late_pick)

func _pick_late(uid: int) -> void:
	if not _late_ok(uid):
		return
	Sfx.play("click")
	late_pick.append(uid)
	var c: Dictionary = M.pending_late(0)[0].cl
	if late_pick.size() >= mini(int(c.count), _late_pool(c).size()):
		_commit_late()
	else:
		_rebuild_rows()
		_render_panel()

func _commit_late() -> void:
	var pl: Array = M.pending_late(0)
	if pl.is_empty():
		return
	M.set_late(int(pl[0].ord), int(pl[0].ci), late_pick)
	late_pick = []
	if M.pending_late(0).is_empty():
		_finish_assign()
	else:
		_rebuild_rows()
		_render_panel()

func _finish_assign() -> void:
	M.finish_assign()
	_refresh_all()
	_step()

# ---------------------------------------------------------------- 结算回放
func _resolve() -> void:
	ui = "resolving"
	_render_panel()
	var before := {}
	for u in M.R.U:
		before[int(u.uid)] = [int(u.hp), int(u.down) != -1]
	var prog_before := [M.progress(0), M.progress(1)]
	var decl_copy: Array = M.declared.duplicate()
	var events: Array = M.resolve_round()
	shown_hp = before
	log_box.clear()
	_log("[color=#e0b85c]—— 第 %d 轮结算 ——[/color]" % int(M.rnd))
	for ev in events:
		playhead = float(int(ev.t))
		timeline.queue_redraw()
		var line := _event_text(ev, decl_copy)
		if line != "":
			_log(line)
		_apply_shown(ev)
		if not (fast or auto_test):
			await get_tree().create_timer(0.35).timeout
			if not is_inside_tree():
				return
	playhead = -1.0
	_refresh_all()
	_round_summary(prog_before)

func _apply_shown(ev: Dictionary) -> void:
	var t: String = str(ev.type)
	var uid := -1
	var delta := 0
	match t:
		"hit", "redirected", "burn":
			uid = int(ev.tgt)
			delta = -int(ev.get("amount", 0))
		"heal":
			uid = int(ev.tgt)
			delta = int(ev.amount)
		"blood":
			uid = int(ev.uid)
			delta = -int(ev.amount)
		"ko":
			uid = int(ev.tgt)
			shown_hp[uid] = [0, true]
		"endure":
			uid = int(ev.tgt)
			shown_hp[uid] = [1, false]
	if uid >= 0 and delta != 0 and shown_hp.has(uid):
		var cur: Array = shown_hp[uid]
		shown_hp[uid] = [maxi(0, int(cur[0]) + delta), bool(cur[1])]
	if uid >= 0 and cards.has(uid):
		var old: PanelContainer = cards[uid]
		var u: Dictionary = M.R.U[uid]
		var nc := _unit_card(u)
		old.get_parent().add_child(nc)
		old.get_parent().move_child(nc, old.get_index())
		old.queue_free()
		cards[uid] = nc
		nc.modulate = Color(1.6, 0.8, 0.8) if delta < 0 or t == "ko" else Color(0.8, 1.6, 0.8)
		var tw := nc.create_tween()
		tw.tween_property(nc, "modulate", Color.WHITE, 0.4)

func _event_text(ev: Dictionary, decl: Array) -> String:
	var t: String = str(ev.type)
	var nm := func(uid: int) -> String: return NT.unit_name(M, uid)
	match t:
		"fire":
			if bool(ev.get("cont", false)):
				return "第 %d 秒 [color=#d89a2a]%s 的续自动再来一次[/color]" % [int(ev.t), nm.call(int(ev.uid))]
			return "第 %d 秒 %s %s出手" % [int(ev.t), MARK[mini(int(ev.ord), MARK.size() - 1)], nm.call(int(ev.uid))]
		"blood":
			var gd := int(int(ev.amount) * NR.Y_GUARD)
			return "[color=#e0606e]开打前 %s 用 %d 点生命付了 %s 的行动点%s[/color]" % [nm.call(int(ev.uid)), int(ev.amount), MARK[mini(int(ev.ord), MARK.size() - 1)], ("（血契护体：本轮多 %d 点减伤）" % gd) if gd > 0 else ""]
		"lock":
			var ns: Array = []
			for x in ev.tgts:
				ns.append(nm.call(int(x)))
			return "    [color=#9ac43a]择定目标：%s%s[/color]" % ["、".join(ns), "（原定的倒了，换人）" if bool(ev.changed) else ""]
		"cont_set":
			return "    [color=#d89a2a]→ 挂上续：以后 %d 轮每轮同一秒再来一次[/color]" % int(ev.rounds)
		"chain":
			return "[color=#2fb8c8]%s 连段：兑现 %s，得 %d 分%s[/color]" % [MARK[mini(int(ev.ord), MARK.size() - 1)], "、".join(ev.kinds), int(ev.points), ("（整句全中 +%d）" % (int(ev.points) - (ev.kinds as Array).size())) if bool(ev.all) else ""]
		"hit":
			var parts: Dictionary = ev.parts
			var ex: Array = []
			if int(ev.get("vuln", 0)) > 0:
				ex.append("易伤 +%d" % int(ev.vuln))
			for k in parts:
				ex.append("%s −%d" % [str(k), int(parts[k])])
			return "    → %s 受到 %d 点%s" % [nm.call(int(ev.tgt)), int(ev.amount), ("（" + "、".join(ex) + "）") if not ex.is_empty() else ""]
		"redirected":
			return "    → 转移：%d 点转给 %s" % [int(ev.amount), nm.call(int(ev.tgt))]
		"heal":
			return "    → %s 恢复 %d 点" % [nm.call(int(ev.tgt)), int(ev.amount)]
		"mit":
			return "    → %s 本轮每次少受 %d" % [nm.call(int(ev.tgt)), int(ev.amount)]
		"status":
			return "    → %s【%s】%d 级（撑到第 %d 轮）" % [nm.call(int(ev.tgt)), str(ev.st), int(ev.lv), int(ev.end)]
		"listen":
			return "    → %s 本轮受到的伤害会转给出手的人" % nm.call(int(ev.tgt))
		"delay":
			return "    → 把 %s 推到第 %d 秒" % [MARK[mini(int(ev.ord), MARK.size() - 1)], int(ev.to)]
		"remove":
			return "    → 拆掉了 %s 的保护%s" % [nm.call(int(ev.tgt)), ("，掐断 %d 个续" % int(ev.broke)) if int(ev.get("broke", 0)) > 0 else ""]
		"fizzle":
			return "[color=#ad9aa0]%s 落空：%s[/color]" % [MARK[mini(int(ev.ord), MARK.size() - 1)], str(ev.why)]
		"ko":
			Sfx.play("ko")
			return "[color=#e8434d]%s 倒下了！%s[/color]" % [nm.call(int(ev.tgt)), ("它的 %d 个续断了" % int(ev.broke)) if int(ev.get("broke", 0)) > 0 else ""]
		"endure":
			return "    → %s【不屈】留了 1 血" % nm.call(int(ev.tgt))
		"burn":
			return "轮末 %s 灼烧掉 %d 血" % [nm.call(int(ev.tgt)), int(ev.dealt)]
	return ""

func _round_summary(prog_before: Array) -> void:
	K.clear_children(action_box)
	ui = "round_end"
	action_box.add_child(K.label("第 %d 轮结束" % int(M.rnd), 22, K.GOLD))
	for s in 2:
		action_box.add_child(K.label("%s：完成度 %d%% → %d%%" % ["你" if s == 0 else "电脑", int(100.0 * float(prog_before[s])), int(100.0 * M.progress(s))], 17, K.TEXT))
	for n in M.round_notes:
		var who := "你" if int(n.side) == 0 else "电脑"
		if str(n.type) == "dice":
			var rolls: Array = n.rolls
			var got: Array = []
			for r in rolls:
				if int(r) > 1:
					got.append(str(r))
			action_box.add_child(K.wrap_label("%s %s，掷骰子：%s → %s" % [who, str(n.why), "、".join(rolls.map(func(x): return str(x))), ("得到一次性数字牌 " + "、".join(got)) if not got.is_empty() else "运气不好，都是 1"], 16, K.GOLD))
		elif str(n.type) == "floor":
			action_box.add_child(K.wrap_label("%s 得到保底数字【%d】（能反复用）" % [who, int(n.value)], 16, K.GOLD))
		elif str(n.type) == "talent":
			action_box.add_child(K.wrap_label("%s 的职业特长升级：%s" % [who, str(n.text)], 16, K.GREEN))
		elif str(n.type) == "ladder":
			action_box.add_child(K.wrap_label("%s 得分到 %d%%：解锁 %d 张【%d】（能反复用，用完冷却一轮）" % [who, int(100.0 * float(n.at)), int(n.copies), int(n.value)], 16, K.GREEN))
	if M.phase == "over":
		var b := K.button("看结果", "primary", 20)
		b.pressed.connect(_show_over)
		action_box.add_child(b)
		if auto_test:
			_show_over()
		return
	var nb := K.button("下一轮 →", "primary", 22)
	nb.custom_minimum_size = Vector2(0, 52)
	nb.pressed.connect(func():
		M.next_round()
		_refresh_all()
		_step())
	action_box.add_child(nb)
	if auto_test:
		M.next_round()
		_refresh_all()
		_step()

func _show_over() -> void:
	ui = "over"
	K.clear_children(overlay)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.75)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(dim)
	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(cc)
	var p := K.panel(Color("171b29"), K.GOLD, 20, 3, 20)
	p.custom_minimum_size = Vector2(640, 0)
	cc.add_child(p)
	var v := K.vbox(12)
	p.add_child(v)
	var w: int = int(M.winner)
	v.add_child(K.label("胜利！" if w == 0 else ("落败" if w == 1 else "平局"), 60, K.GREEN if w == 0 else (K.RED if w == 1 else K.GOLD), HORIZONTAL_ALIGNMENT_CENTER))
	for s in 2:
		v.add_child(K.label("%s（%s）完成度 %d%%" % ["你" if s == 0 else "电脑", M.cls_of(s), int(100.0 * M.progress(s))], 20, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(K.label("共 %d 轮" % int(M.rnd), 16, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	var row := K.hbox(12)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	var again := K.button("再来一局", "primary", 20)
	again.pressed.connect(func(): rematch.emit())
	row.add_child(again)
	var back := K.button("返回标题", "normal", 20)
	back.pressed.connect(func(): quit_to_title.emit())
	row.add_child(back)
	v.add_child(row)
	if auto_test:
		print("【数字牌模式·自动游玩结束】胜者=%d 轮数=%d 完成度 %.0f%%/%.0f%%" % [w, int(M.rnd), 100.0 * M.progress(0), 100.0 * M.progress(1)])

# ---------------------------------------------------------------- 杂项
func _bar(maxv: int, val: float, col: Color) -> ProgressBar:
	var pb := ProgressBar.new()
	pb.min_value = 0
	pb.max_value = maxi(1, maxv)
	pb.value = val
	pb.show_percentage = false
	var bgs := StyleBoxFlat.new()
	bgs.bg_color = Color(1, 1, 1, 0.12)
	bgs.set_corner_radius_all(4)
	var fs := StyleBoxFlat.new()
	fs.bg_color = col
	fs.set_corner_radius_all(4)
	pb.add_theme_stylebox_override("background", bgs)
	pb.add_theme_stylebox_override("fill", fs)
	return pb

func _log(bb: String) -> void:
	log_box.append_text(bb + "\n")

func _toast(text: String) -> void:
	var l := K.label(text, 24, K.RED, HORIZONTAL_ALIGNMENT_CENTER)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("outline_size", 6)
	l.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	l.position.y = 120
	add_child(l)
	var tw := l.create_tween()
	tw.tween_interval(1.6)
	tw.tween_property(l, "modulate:a", 0.0, 0.5)
	tw.tween_callback(l.queue_free)

func _show_rules() -> void:
	var layer := Control.new()
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(layer)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.8)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.add_child(dim)
	var cc := CenterContainer.new()
	cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.add_child(cc)
	var p := K.panel(Color("171b29"), K.GOLD_D, 18, 2, 18)
	p.custom_minimum_size = Vector2(1100, 0)
	cc.add_child(p)
	var v := K.vbox(8)
	p.add_child(v)
	v.add_child(K.label("数字牌模式 · 怎么玩", 30, K.GOLD))
	for line in Setup.rules_lines():
		v.add_child(K.wrap_label(line, 17, K.TEXT))
	var close := K.button("知道了", "primary", 20)
	close.pressed.connect(func(): layer.queue_free())
	dim.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			layer.queue_free())
	v.add_child(close)

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
		for c in get_children():
			if c is Composer:
				c.cancelled.emit()
				get_viewport().set_input_as_handled()
				return

# 测试：用最简单的句子替“你”出手（选 1 个敌人打 1 点），走真实的界面处理函数
func _auto_play() -> void:
	await get_tree().process_frame
	if not is_inside_tree():
		return
	match ui:
		"pick_unit":
			if M.remaining[0].is_empty():
				return
			var uid: int = int(M.remaining[0][0])
			if int(M.res[0].ap) < NR.BASE_COST:
				_pass(uid)
				return
			sel_uid = uid
			var pop = Composer.new()
			add_child(pop)
			pop.setup(M, uid)
			for w in ["选择"]:
				pop.add_word(w)
			pop.add_number(1)
			for w2 in ["敌方", "随从", "造成"]:
				pop.add_word(w2)
			var big := 1
			for v in M.usable_values(0):
				big = maxi(big, int(v))
			pop.add_number(big)
			pop.add_word("伤害")
			var pr: Dictionary = pop.parse(pop.tokens)
			pop.queue_free()
			if not bool(pr.complete):
				_pass(uid)
				return
			_start_targeting(pr.clauses)
		"target":
			for u in M.R.U:
				if _target_ok(int(u.uid)):
					_pick_target(int(u.uid))
					return
			_pass(sel_uid)
		"timing":
			_declare(NE.action_windup(pending, int(M.caps(0).wind)))

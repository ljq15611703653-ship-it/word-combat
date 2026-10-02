extends Control
# 冒险关卡：对手摆出阵势，玩家用手里的词拼一句“长难句”破局；小词手把手教，话很多；对手也会说话。
# 判定交给 level_eval.gd（真实引擎结算，起效时间和目标自动选最有利的）。

const Settings = preload("res://scripts/ui/settings.gd")
const K = preload("res://scripts/ui/kit.gd")
const L = preload("res://scripts/adventure/level_eval.gd")
const S = preload("res://scripts/compose/sentence.gd")
const G = preload("res://scripts/core/grammar.gd")
const E = preload("res://scripts/core/engine.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Composer = preload("res://scripts/compose/composer.gd")
const Pet = preload("res://scripts/ui/pet.gd")
const Highlight = preload("res://scripts/fx/highlight.gd")
const Table3D = preload("res://scripts/view3d/table3d.gd")
const Preview = preload("res://scripts/game/preview.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")

signal back()
signal next_level(id)

const CAT_TEACH := {
	"动作": "这是【动作词】，决定要“做什么”。",
	"对象": "这是【对象词】，决定“对谁”。",
	"范围": "这是【范围词】，决定“多少个/怎么放大”。",
	"结构": "这是【结构词】，决定句子怎么连起来。",
	"触发": "这是【触发词】，决定“什么时候才发生”。",
	"时间": "这是【时间词】，决定“什么时候/隔多久”。",
	"引用": "这是【引用词】，用别的东西的数值来当数字。",
	"状态": "这是【状态词】，给对象加上一种效果。",
}
const IDLE_QUIPS := [
	"别紧张，句子是一张一张拼出来的，不是一口气想出来的～",
	"实在没头绪，点【小词，教我下一步】，我一个字一个字带你。",
	"你看对面那张脸，一副‘你肯定想不出来’的样子……气死我了！",
	"小提示：亮着的牌才能接，暗着的现在接不上。",
	"嘿，想想这关的目标是什么？先别管句子，先想‘要发生什么’。",
	"拼错了不丢人，【撤回一张】随便点！",
]
const TOKEN_QUIPS := [
	"啪！烙上去了。", "嗯嗯，有那味儿了。", "这张选得有意思～", "继续继续，我看好你！", "咔哒，一块拼图到位。",
]
const OPP_TAUNTS := [
	"哦？就这样？……来吧，我等着。", "拼得挺认真嘛，可惜我不怕。", "慢慢想，我不急（其实有点急）。",
]

var level: Dictionary = {}
var levels: Array = []
var composer: Control
var submit_btn: Button
var hint_btn: Button
var teach_btn: Button
var opp_name_label: Label
var opp_text: Label
var unit_boxes := {}          # uid → {panel, hp_label, status, hp, max}
var uid_name := {}
var hints_used := 0
var busy := false
var _idle := 0.0
var _teaching := false
var _last_tokens := 0
var _pulse: Tween = null
var _hl_node: Control = null
var _won := false

func setup(id: int) -> void:
	Settings.load_all()
	levels = L.load_levels()
	for lv in levels:
		if int(lv.id) == id:
			level = lv
	if level.is_empty():
		back.emit()
		return
	_build()
	_intro()

# ---------------------------------------------------------------- 搭界面
func _build() -> void:
	K.clear_children(self)
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.add_child(K.glow())
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 22)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)
	var v := K.vbox(8)
	margin.add_child(v)
	# 顶栏
	var top := K.hbox(12)
	top.add_child(K.label("第 %d 关 · %s" % [int(level.id), str(level.title)], 28, K.GOLD))
	top.add_child(K.label("行动点 %d" % int(level.get("ap", 40)), 16, K.MUTED))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(sp)
	var bk := K.button("返回地图", "normal", 16)
	bk.pressed.connect(func(): back.emit())
	top.add_child(bk)
	v.add_child(top)
	# 战场
	_make_table(v)
	v.add_child(_info_bar())
	# 拼句台
	composer = Composer.new()
	composer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	composer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	composer.changed.connect(_on_changed)
	v.add_child(composer)
	composer.setup(L.tray_of(level), [])
	if composer.hint_label != null:
		composer.hint_label.add_theme_font_size_override("font_size", 15)
	if composer.sugg_group != null:
		composer.sugg_group.visible = false     # 冒险里不给“接下来三句话”的现成答案，靠小词教
	# 底栏：提示 / 出招
	var bot := K.hbox(10)
	bot.add_child(K.spacer(0, 118))      # 给桌宠留位置
	hint_btn = K.button("小词，教我下一步", "normal", 17)
	hint_btn.pressed.connect(_on_hint)
	bot.add_child(hint_btn)
	teach_btn = K.button("手把手带我拼完", "normal", 17)
	teach_btn.pressed.connect(_on_teach)
	bot.add_child(teach_btn)
	var sp2 := Control.new()
	sp2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bot.add_child(sp2)
	submit_btn = K.button("出招！", "primary", 24)
	submit_btn.custom_minimum_size = Vector2(220, 50)
	submit_btn.disabled = true
	submit_btn.pressed.connect(_on_submit)
	bot.add_child(submit_btn)
	v.add_child(bot)

func _units_of(side: int) -> Array:
	return level.me if side == 0 else level.foe

var _st: Dictionary = {}
var table: Node3D
var table_box: SubViewportContainer

# 真实的 3D 牌桌：和正式对战一样，对手坐在对面，随从摆在桌上，已宣告的招用意图箭头标出来
func _make_table(parent: Control) -> void:
	table_box = SubViewportContainer.new()
	table_box.stretch = true
	table_box.custom_minimum_size = Vector2(0, 262)
	var svp := SubViewport.new()
	svp.msaa_3d = Viewport.MSAA_4X
	svp.handle_input_locally = true
	svp.physics_object_picking = false
	table_box.add_child(svp)
	table = Table3D.new()
	svp.add_child(table)
	parent.add_child(table_box)
	var plates := Control.new()
	plates.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	plates.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(plates)
	table.plate_layer = plates
	table.plate_origin = table_box
	_st = L.build_state(level, {}).st
	table.setup_state(_st, func(u): return _skills_of_unit(u))
	table.relayout(_st, false)
	# 关卡里没有的空位不摆出来
	var intents: Array = []
	for side in 2:
		var units: Array = _units_of(side)
		for i in _st.sides[side].units.size():
			var su: Dictionary = _st.sides[side].units[i]
			var uid: int = int(su.uid)
			if i >= units.size():
				if table.minions.has(uid):
					table.minions[uid].queue_free()
					table.minions.erase(uid)
				continue
			uid_name[uid] = str(su.name)
			table.minions[uid].set_top_view(true, false)
			unit_boxes[uid] = {"card": table.minions[uid], "hp": int(su.hp), "max": int(su.max_hp), "init": su.duplicate(true), "skills": _skills_of_unit(su)}
	for fa in L.foe_actions(level, _st):
		intents.append(Preview.intent_of(_st, fa.act))
	table.set_view("top", false)
	table.set_intents(intents)

func _skills_of_unit(u: Dictionary) -> Array:
	var out: Array = []
	for sid in u.skill_ids:
		out.append(E.skill_of(_st, sid))
	return out

func _info_bar() -> Control:
	var row := K.hbox(10)
	var p := K.panel(Color("1f2330"), K.GOLD_D, 12, 2, 8)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.size_flags_stretch_ratio = 1.6
	var v := K.vbox(3)
	p.add_child(v)
	v.add_child(K.wrap_label(str(level.story), 14, K.TEXT))
	var gl := K.hbox(14)
	gl.add_child(K.label("目标：", 14, K.GOLD))
	for g in level.goal:
		var t := _goal_text(g)
		if t != "":
			gl.add_child(K.label("· " + t, 14, K.TEXT))
	v.add_child(gl)
	var rn: int = int(level.get("rounds", 1))
	if rn > 1:
		var cr: Array = level.get("cast_rounds", [])
		var cast_txt := "每一轮你都会自动重复出这一句" if cr.is_empty() else ("你只在第 %s 轮出手" % "、".join(cr.map(func(x): return str(int(x)))))
		v.add_child(K.label("这一关共 %d 轮 · %s；状态会在轮与轮之间成长。" % [rn, cast_txt], 14, K.GOLD))
	row.add_child(p)
	var op: Dictionary = level.get("opp", {})
	var q := K.panel(Color("2a1a1d"), K.RED.darkened(0.3), 12, 2, 8)
	q.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var qv := K.vbox(3)
	q.add_child(qv)
	opp_name_label = K.label("%s%s" % [str(op.get("name", "对手")), ("（%s）" % str(op.title)) if str(op.get("title", "")) != "" else ""], 15, K.RED)
	qv.add_child(opp_name_label)
	opp_text = K.wrap_label("", 15, Color("f0c8c0"))
	qv.add_child(opp_text)
	row.add_child(q)
	return row

func _goal_text(g: Dictionary) -> String:
	match str(g.t):
		"kill": return "打倒 " + "、".join((g.who as Array).map(func(i): return str(level.foe[int(i)].name)))
		"kill_all": return "打倒对手全部随从"
		"alive": return "你的 " + "、".join((g.who as Array).map(func(i): return str(level.me[int(i)].name))) + " 不能倒下"
		"hp_ge": return "%s 的生命至少剩 %d" % [str(level.me[int(g.who)].name), int(g.n)]
		"foe_hp_le": return "%s 的生命降到 %d 以下" % [str(level.foe[int(g.who)].name), int(g.n)]
		"foe_hp_ge": return "%s 的生命不能被打到 %d 以下" % [str(level.foe[int(g.who)].name), int(g.n)]
		"all_alive": return "你的随从一个都不能倒下"
		"score_ge": return "得到至少 %d 分" % int(g.n)
		"my_hp_total_ge": return "你全队剩余生命合计至少 %d" % int(g.n)
	return ""

# ---------------------------------------------------------------- 开场：对手 + 小词都要说话
func _intro() -> void:
	var op: Dictionary = level.get("opp", {})
	var pt: Dictionary = level.get("pet", {})
	_opp_say(str(op.get("intro", "来吧，让我看看你的本事。")))
	var line := str(pt.get("intro", "这一关交给你啦！看看对面摆的阵，再想想要拼一句怎样的话。"))
	await get_tree().create_timer(0.8).timeout
	if is_inside_tree():
		Pet.chat(line, "excited", 9.0)
	await get_tree().create_timer(9.0).timeout
	if is_inside_tree() and not busy and composer != null and composer.tokens.is_empty():
		Pet.chat("目标看懂了吗？" + str(level.why), "talk", 10.0)

func _opp_say(t: String) -> void:
	if opp_text == null:
		return
	opp_text.text = "「%s」" % t
	opp_text.modulate.a = 0.0
	var tw := opp_text.create_tween()
	tw.tween_property(opp_text, "modulate:a", 1.0, 0.4)

func _process(delta: float) -> void:
	if busy or _teaching or _won:
		return
	_idle += delta
	if _idle > 22.0:
		_idle = 0.0
		Pet.chat(IDLE_QUIPS[randi() % IDLE_QUIPS.size()], "talk", 7.0)

# ---------------------------------------------------------------- 拼句台变化
func _on_changed() -> void:
	if submit_btn == null:
		return
	_idle = 0.0
	var n: int = composer.tokens.size()
	var ok: bool = composer.analysis.get("complete", false) and n > 0
	submit_btn.disabled = not ok or busy or _teaching
	_clear_highlight()
	if n > _last_tokens and not _teaching:
		if randf() < 0.45:
			Pet.chat(TOKEN_QUIPS[randi() % TOKEN_QUIPS.size()], "talk", 3.5)
		if ok and n >= 3:
			Pet.chat("成句了！检查一遍就点【出招！】——还能接着加修饰也行。", "excited", 6.0)
			if randf() < 0.6:
				_opp_say(OPP_TAUNTS[randi() % OPP_TAUNTS.size()])
	elif n < _last_tokens and not _teaching:
		Pet.chat("撤回也是学习的一部分嘛～", "talk", 3.5)
	_last_tokens = n

# ---------------------------------------------------------------- 手把手
func _sol_tokens() -> Array:
	return L.tokens_from(level.sol)

func _is_prefix() -> bool:
	var sol: Array = _sol_tokens()
	var cur: Array = composer.tokens
	if cur.size() > sol.size():
		return false
	for i in cur.size():
		if str(cur[i].t) != str(sol[i].t) or str(cur[i].v) != str(sol[i].v):
			return false
	return true

func _explain(tok: Dictionary) -> String:
	if str(tok.t) == "N":
		return "这里填数字【%d】，是这一句的“数值”。想想：它够不够，又会不会太贵？" % int(tok.v)
	if str(tok.t) == "P":
		return "接一张连接牌【%s】：它决定两边怎么比较。" % str(tok.v)
	var w := str(tok.v)
	var notes: Dictionary = level.get("notes", {})
	if notes.has(w):
		return "点【%s】。%s" % [w, str(notes[w])]
	var cat := str(Lex.words[w].cat) if Lex.words.has(w) else ""
	return "点【%s】。%s" % [w, CAT_TEACH.get(cat, "")]

func _on_hint() -> void:
	if busy or _teaching:
		return
	hints_used += 1
	_idle = 0.0
	var sol: Array = _sol_tokens()
	if composer.tokens.size() >= sol.size() and _is_prefix():
		Pet.chat("句子已经和我教的一模一样啦，点【出招！】吧！", "excited", 5.0)
		return
	if not _is_prefix():
		Pet.chat("你现在的拼法和我教的路线不一样～不一定错，裁判只看结果！想跟着我走的话，点几次【撤回一张】，或者点【手把手带我拼完】从头来。", "talk", 9.0)
		return
	var nxt: Dictionary = sol[composer.tokens.size()]
	if hints_used == 1 and composer.tokens.is_empty():
		Pet.chat("先想思路：" + str(level.why), "talk", 10.0)
		return
	Pet.chat(_explain(nxt), "talk", 9.0)
	_highlight(nxt)

func _highlight(tok: Dictionary) -> void:
	_clear_highlight()
	if str(tok.t) != "W":
		return
	await get_tree().create_timer(0.15).timeout
	for n in get_tree().get_nodes_in_group("tut:c:next:" + str(tok.v)):
		if n is Control and n.is_visible_in_tree():
			_hl_node = n
			_pulse = n.create_tween().set_loops()
			_pulse.tween_property(n, "modulate", Color(1.6, 1.5, 0.8), 0.45)
			_pulse.tween_property(n, "modulate", Color(1, 1, 1), 0.45)
			return

func _clear_highlight() -> void:
	if _pulse != null:
		_pulse.kill()
		_pulse = null
	if _hl_node != null and is_instance_valid(_hl_node):
		_hl_node.modulate = Color(1, 1, 1)
	_hl_node = null

func _on_teach() -> void:
	if busy or _teaching:
		return
	_teaching = true
	teach_btn.disabled = true
	hint_btn.disabled = true
	submit_btn.disabled = true
	composer.setup(L.tray_of(level), [])
	_last_tokens = 0
	Pet.chat("好！看小词表演——这是这一关的解法，我边拼边讲，你边看边记！", "excited", 6.0)
	await get_tree().create_timer(1.6).timeout
	var sol: Array = _sol_tokens()
	for tok in sol:
		if not is_inside_tree():
			return
		Pet.chat(_explain(tok), "talk", 6.0)
		await _highlight(tok)
		await get_tree().create_timer(1.5).timeout
		_clear_highlight()
		if str(tok.t) == "W":
			composer.add_word(str(tok.v))
		elif str(tok.t) == "N":
			var role := "value"
			for e in composer.analysis.get("expect", []):
				if str(e.t) == "N":
					role = str(e.get("role", "value"))
			composer.add_number(int(tok.v), role)
		else:
			composer.add_part(str(tok.v))
		await get_tree().create_timer(0.7).timeout
	_teaching = false
	teach_btn.disabled = false
	hint_btn.disabled = false
	Pet.chat("拼好啦！看懂了就点【出招！】。下次试着自己拼，别偷看我～", "excited", 7.0)
	_on_changed()

# ---------------------------------------------------------------- 出招 / 结算
func _on_submit() -> void:
	if busy or _teaching:
		return
	busy = true
	submit_btn.disabled = true
	_clear_highlight()
	var tokens: Array = composer.tokens.duplicate(true)
	var res: Dictionary = L.evaluate(level, tokens)
	if not res.ok:
		busy = false
		submit_btn.disabled = false
		Pet.chat(str(res.reason), "sad", 8.0)
		return
	_opp_say("看招！" if randf() < 0.5 else "哼，让我看看这句话有多大本事。")
	Pet.chat("【%s】——出招！屏住呼吸……" % str(res.skill.text), "excited", 6.0)
	await composer.play_combine(str(res.skill.text))
	if not is_inside_tree():
		return
	await _play_events(res.get("events", []))
	_show_result(res, tokens)

func _set_hp(uid: int, hp: int) -> void:
	var b: Dictionary = unit_boxes.get(uid, {})
	if b.is_empty():
		return
	b.hp = maxi(0, hp)
	var c = b.card
	if not c.anim_mode:
		c.begin_anim(int(b.hp), false)
	c.animate_hp(int(b.hp), 0.3)

func _flash(uid: int, col: Color, text: String) -> void:
	var b: Dictionary = unit_boxes.get(uid, {})
	if b.is_empty():
		return
	var c = b.card
	c.float_text(text, col, 26)
	c.flash(col)
	if col == K.RED:
		c.shake()

func _play_events(events: Array) -> void:
	for e in events:
		if not is_inside_tree():
			return
		match str(e.type):
			"start":
				Sfx.play("cast")
				await get_tree().create_timer(0.3).timeout
			"dmg":
				if int(e.amount) > 0:
					var b: Dictionary = unit_boxes.get(int(e.tgt), {})
					if not b.is_empty():
						_set_hp(int(e.tgt), int(b.hp) - int(e.amount))
						_flash(int(e.tgt), K.RED, "-%d" % int(e.amount))
						Sfx.play("hit")
						await get_tree().create_timer(0.35).timeout
			"heal":
				if int(e.actual) > 0:
					var b2: Dictionary = unit_boxes.get(int(e.tgt), {})
					if not b2.is_empty():
						_set_hp(int(e.tgt), mini(int(b2.max), int(b2.hp) + int(e.actual)))
						_flash(int(e.tgt), K.GREEN, "+%d" % int(e.actual))
						await get_tree().create_timer(0.3).timeout
			"block":
				_flash(int(e.tgt), K.GOLD, "格挡!")
				await get_tree().create_timer(0.3).timeout
			"status":
				_flash(int(e.tgt), K.GOLD, str(e.status))
				await get_tree().create_timer(0.25).timeout
			"mit":
				_flash(int(e.tgt), K.BLUE, "减伤")
				await get_tree().create_timer(0.25).timeout
			"round_mark":
				await _round_banner(int(e.round))
			"stack":
				_flash(int(e.tgt), Color("ffd21f") if str(e.status) in ["蓄力", "铁壁"] else Color("ff7a6a"), "%s Lv%d%s" % [str(e.status), int(e.stacks), "（续放）" if bool(e.get("recast", false)) else ""])
				await get_tree().create_timer(0.35).timeout
			"stack_spent":
				_flash(int(e.tgt), Color("ffd21f"), "蓄力 %d 级爆发！" % int(e.stacks))
				Sfx.play("hit")
				await get_tree().create_timer(0.5).timeout
			"burn":
				var bb: Dictionary = unit_boxes.get(int(e.tgt), {})
				_flash(int(e.tgt), Color("ff5a2a"), "灼烧 -%d" % int(e.amount))
				await get_tree().create_timer(0.3).timeout
			"interrupt":
				Pet.chat("打断成功！", "excited", 3.0)
				await get_tree().create_timer(0.3).timeout
	await get_tree().create_timer(0.4).timeout

func _round_banner(r: int) -> void:
	var lab := K.label("第 %d 轮" % r, 54, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	lab.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.95))
	lab.add_theme_constant_override("outline_size", 10)
	lab.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	lab.position = Vector2(400, 150)
	lab.size = Vector2(800, 80)
	lab.modulate.a = 0.0
	add_child(lab)
	var tw := lab.create_tween()
	tw.tween_property(lab, "modulate:a", 1.0, 0.2)
	tw.tween_interval(0.6)
	tw.tween_property(lab, "modulate:a", 0.0, 0.25)
	tw.tween_callback(lab.queue_free)
	await get_tree().create_timer(1.0).timeout

func _show_result(res: Dictionary, tokens: Array) -> void:
	busy = false
	var op: Dictionary = level.get("opp", {})
	var pt: Dictionary = level.get("pet", {})
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var p := K.panel(Color("171b29"), K.GOLD if res.win else K.RED, 18, 3, 16)
	p.custom_minimum_size = Vector2(700, 0)
	add_child(p)
	var v := K.vbox(10)
	p.add_child(v)
	v.add_child(K.label("破局成功！" if res.win else "还差一点", 36, K.GOLD if res.win else K.RED, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(K.wrap_label("你的招：" + str(res.skill.text) + "（操作费 %d，第 %d 秒起效）" % [int(res.cost), int(res.start)], 16, K.TEXT))
	for it in res.get("goal_items", []):
		if str(it.text) != "":
			v.add_child(K.label("%s %s" % ["✓" if it.ok else "×", str(it.text)], 17, K.GREEN if it.ok else K.RED))
	var line := str(op.get("beaten", "……我认输。")) if res.win else str(op.get("gloat", "哈哈，不过如此！"))
	v.add_child(K.wrap_label("%s：「%s」" % [str(op.get("name", "对手")), line], 17, Color("f0c8c0")))
	if res.win:
		v.add_child(K.wrap_label("为什么这样拼：" + str(level.why), 15, K.MUTED))
	var row := K.hbox(10)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(row)
	if res.win:
		_won = true
		Highlight.play("level_clear", {"id": int(level.id), "hints_used": hints_used, "boss": int(level.id) % 10 == 0}, self)
		if int(level.id) % 10 == 0:
			Highlight.play("boss_defeated", {"id": int(level.id), "chapter": int(level.chapter)}, self)
		if not (int(level.id) in Settings.adv_cleared):
			Settings.adv_cleared.append(int(level.id))
			Settings.save_all()
		Pet.chat(str(pt.get("win", "太棒了！这一关你拿下了！")) + (" 而且一次提示都没用，厉害！" if hints_used == 0 else ""), "excited", 9.0)
		var nid := _next_id()
		if nid > 0:
			var nb := K.button("下一关  →", "primary", 22)
			nb.pressed.connect(func(): next_level.emit(nid))
			row.add_child(nb)
		var mb := K.button("回地图", "normal", 18)
		mb.pressed.connect(func(): back.emit())
		row.add_child(mb)
	else:
		Pet.chat(str(pt.get("lose", "没关系，再想想！")), "sad", 9.0)
		var rb := K.button("再试一次（保留我的句子）", "primary", 20)
		rb.pressed.connect(func():
			dim.queue_free()
			p.queue_free()
			_reset_field()
			composer.setup(L.tray_of(level), tokens))
		row.add_child(rb)
		var hb := K.button("小词，教我", "normal", 18)
		hb.pressed.connect(func():
			dim.queue_free()
			p.queue_free()
			_reset_field()
			_on_hint())
		row.add_child(hb)
	await get_tree().process_frame
	p.position = (get_viewport_rect().size - p.size) * 0.5

func _reset_field() -> void:
	for uid in unit_boxes:
		var b: Dictionary = unit_boxes[uid]
		b.hp = int(b.init.hp)
		var c = b.card
		c.end_anim()
		c.refresh(b.init, b.skills)
	_opp_say("再来一次？我随时奉陪。")
	_on_changed()

func _next_id() -> int:
	var best := -1
	for lv in levels:
		if int(lv.id) > int(level.id) and L.is_playable(lv) and (best == -1 or int(lv.id) < best):
			best = int(lv.id)
	return best

extends Control
# 总控：串起 标题 → 构筑 → 抽词 → 调整 → 战斗 的整局流程。
# 调试入口（命令行 -- 之后）： --demo=title|build|draft|adjust|battle|editor|complex|simple   --auto（双方都由电脑操作）

const K = preload("res://scripts/ui/kit.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const D = preload("res://scripts/core/deck.gd")
const Match = preload("res://scripts/game/match.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Settings = preload("res://scripts/ui/settings.gd")
const TitleScreen = preload("res://scripts/ui/title_screen.gd")
const BuildScreen = preload("res://scripts/ui/build_screen.gd")
const DraftScreen = preload("res://scripts/ui/draft_screen.gd")
const BattleScreen = preload("res://scripts/ui/battle_screen.gd")

var m
var screen: Control
var battle_screen
var auto := false
var driver_on := false
var slow := false

func _ready() -> void:
	Lex.load_all()
	RenderingServer.set_default_clear_color(K.BG)
	var f := SystemFont.new()
	f.font_names = PackedStringArray(["Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "SimHei", "WenQuanYi Micro Hei"])
	var th := Theme.new()
	th.default_font = f
	th.default_font_size = 18
	theme = th
	Settings.load_all()
	Sfx.muted = Settings.muted
	var sfx := Sfx.new()
	add_child(sfx)
	var args := OS.get_cmdline_user_args()
	var demo := ""
	for a in args:
		if a.begins_with("--demo="):
			demo = a.substr(7)
		if a == "--auto":
			auto = true
		if a == "--play":
			driver_on = true
		if a == "--slow":
			slow = true
	if demo == "" and driver_on:
		_new_game(7)
	elif demo == "":
		_show_title()
	else:
		_run_demo(demo)

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and ev.keycode == KEY_F11:
		var mode := DisplayServer.window_get_mode()
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if mode == DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)

func _set_screen(c: Control) -> void:
	if screen != null:
		screen.queue_free()
	screen = c
	add_child(c)
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	if driver_on:
		_drive(c)

# 自动游玩驱动：走真实的界面处理函数（只用于验证）
func _drive(s: Control) -> void:
	await get_tree().create_timer(0.35).timeout
	if not is_instance_valid(s) or s != screen:
		return
	print("  [驱动] 屏幕=", s.get_script().resource_path.get_file(), " 阶段=", m.phase, " 轮=", m.st.round)
	if s is BuildScreen:
		if s.mode == "initial":
			# 用电脑的构筑法给“人类”装牌，再经编辑器弹窗走一遍提交路径
			var d: Dictionary = Ai.build_deck(m.pools[0], "均衡", m.rng)
			s.wd = d
			s.refresh()
			s._open_editor(0)
			await get_tree().create_timer(0.3).timeout
			if s.popup != null and is_instance_valid(s.popup):
				s.popup.committed.emit(s.popup.work)
			await get_tree().create_timer(0.3).timeout
		else:
			# 调整阶段：尝试用编辑器装一个当前词库里凑得出的新技能，走完整的提交路径
			var R = load("res://scripts/core/recipes.gd")
			var G = load("res://scripts/core/grammar.gd")
			var done := false
			if m.adjust_side() == 0 and m.adjust_left(0) > 0:
				s._open_editor(1)
				await get_tree().create_timer(0.3).timeout
				var pop = s.popup
				if pop != null and is_instance_valid(pop):
					for t in R.catalog():
						var sk: Dictionary = R.build(t.id, {})
						if G.missing(sk.words, pop.avail_for_slot()).is_empty() and pop._points_other() - pop._slot_budget() + int(sk.budget) <= 100 and G.problems(sk).is_empty():
							pop.slot = 1
							pop._install(sk)
							if pop.btn_commit.disabled:
								continue
							pop.committed.emit(pop.work)
							done = true
							print("  [驱动] 调整：装入 ", t.id)
							break
					if not done:
						pop.cancelled.emit()
			if not done:
				s.finished.emit()
			return
		s.finished.emit()
	elif s is DraftScreen:
		if m.human[m.picker]:
			s.picked.emit(0)
			await get_tree().create_timer(0.3).timeout
		s.finished.emit()
	elif s is BattleScreen:
		s.speed = 1.0 if slow else 4.0
		s.auto_human = true
		if m.human[m.declare_side()] if m.declare_side() != -1 else false:
			s._auto_play()

# ---------------------------------------------------------------- 标题
func _show_title() -> void:
	var t := TitleScreen.new()
	_set_screen(t)
	t.start_game.connect(_new_game)
	t.watch_demo.connect(func():
		auto = true
		_new_game())

func _new_game(seed_val: int = -1) -> void:
	m = Match.new()
	m.start(not auto, seed_val, false)
	m.ai_epsilon = [0.45, 0.12, 0.0][Settings.level]
	m.fast_ai = Settings.level < 2
	if auto:
		m.human = [false, false]
		m.decks[0] = Ai.build_deck(m.pools[0], m.personas[0], m.rng)
		m.commit_deck(0, m.decks[0])
		_begin_round()
	else:
		_show_build("initial")

# ---------------------------------------------------------------- 构筑
func _show_build(mode: String) -> void:
	var s := BuildScreen.new()
	_set_screen(s)
	s.setup(m, mode)
	if mode == "initial":
		s.finished.connect(func():
			var r: Dictionary = m.commit_deck(0, s.wd)
			if not r.ok:
				s.show_error(str(r.errors[0]))
				return
			_begin_round())
	else:
		s.finished.connect(func():
			m.skip_adjust(0)
			_continue_adjust())
		s.adjusted.connect(func(idx, unit):
			var r: Dictionary = m.apply_adjust(0, idx, unit)
			if not r.ok:
				s.show_error(str(r.errors[0]))
				s.refresh()
				return
			_continue_adjust())

func _begin_round() -> void:
	m.begin_round()
	_show_draft()

# ---------------------------------------------------------------- 抽词
func _show_draft() -> void:
	var d := DraftScreen.new()
	_set_screen(d)
	var ai_idx := -1
	var picker: int = m.picker
	if not m.human[picker]:
		ai_idx = Ai.pick_bag(m.bags, m.pools[picker], m.personas[picker])
	d.setup(m, ai_idx)
	if m.human[picker]:
		d.picked.connect(func(i):
			m.pick_bag(0, i)
			d.show_human_choice(i))
		d.finished.connect(_continue_adjust)
	else:
		d.finished.connect(func():
			m.pick_bag(picker, ai_idx)
			_continue_adjust())
		if auto:
			d.get_tree().create_timer(1.2).timeout.connect(func(): d.finished.emit())

# ---------------------------------------------------------------- 调整
func _continue_adjust() -> void:
	while m.phase == "adjust":
		var s: int = m.adjust_side()
		if m.human[s]:
			if m.adjust_left(s) <= 0:
				m.skip_adjust(s)
				continue
			_show_build("adjust")
			return
		m.ai_adjust()
	m.begin_declare()
	_show_battle()

# ---------------------------------------------------------------- 战斗
func _show_battle() -> void:
	var b := BattleScreen.new()
	_set_screen(b)
	battle_screen = b
	b.begin(m)
	b.next_round.connect(_begin_round)
	b.quit_to_title.connect(_show_title)
	b.rematch.connect(func(): _new_game())
	if auto:
		b.next_round.disconnect(_begin_round)
		b.next_round.connect(func(): b.get_tree().create_timer(0.5).timeout.connect(_begin_round))
		_auto_press_next(b)

func _auto_press_next(b) -> void:
	# 观战模式：结算完自动进入下一轮
	await b.get_tree().create_timer(0.2).timeout
	if is_instance_valid(b) and m.phase == "resolved":
		pass

# ---------------------------------------------------------------- 调试演示
func _run_demo(demo: String) -> void:
	m = Match.new()
	m.start(true, 7, false)
	match demo:
		"title":
			_show_title()
		"build":
			_show_build("initial")
		"draft":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			m.begin_round()
			_show_draft()
		"adjust":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			m.begin_round()
			m.pick_bag(0, 0)
			_show_build("adjust")
		"gameover", "deckview", "statuses":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			m.begin_round()
			m.pick_bag(0, 0)
			while m.phase == "adjust":
				m.skip_adjust(0)
				m.skip_adjust(1)
			m.phase = "adjust_done"
			m.begin_declare()
			m.human = [true, false]
			_show_battle()
			await get_tree().create_timer(0.5).timeout
			var bb = battle_screen
			if demo == "gameover":
				m.winner = 0
				m.st.sides[0].score = 103
				m.st.sides[1].score = 64
				bb._show_game_over()
			elif demo == "deckview":
				bb._peek_enemy()
			else:
				var E = load("res://scripts/core/engine.gd")
				for u in m.st.sides[1].units:
					u.statuses.append({"name": "易伤", "value": 0, "link": -1, "until": 999, "src": 0})
				m.st.sides[1].units[1].statuses.append({"name": "护盾", "value": 12, "link": -1, "until": 999, "src": 0})
				m.st.sides[1].units[2].statuses.append({"name": "沉默", "value": 20, "link": -1, "until": 999, "src": 0})
				m.st.sides[1].units[0].hp = 5
				m.st.sides[1].units[3].down_round = 1
				m.st.sides[1].units[3].hp = 0
				bb._rebuild_rows()
		"complex2":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			var s2 := BuildScreen.new()
			_set_screen(s2)
			s2.setup(m, "initial")
			s2._open_editor(2)
			await get_tree().create_timer(0.3).timeout
			var G = load("res://scripts/core/grammar.gd")
			var pp = s2.popup
			pp.tab = "complex"
			pp.complex_root.visible = true
			pp.simple_root.visible = false
			pp.complex_root.avail = {}
			for w in Lex.implemented():
				pp.complex_root.avail[w] = 4
			pp.complex_root.nodes = [
				G.watch("pending_dmg", G.T("all", "ally"), G.redirect(G.T("source", "ref"), 25), {"freq": "every"}),
				G.watch("damaged", G.T("self", "self"), G.chain(G.dmg(G.T("source", "ref"), G.REF("event_damage"), {"dbl": 1}), G.heal(G.T("self", "self"), G.REF("prev"))), {"freq": "every"}),
			]
			pp.complex_root.skill_name = "嵌套示例"
			pp.complex_root.name_edit.text = "嵌套示例"
			pp.complex_root._rerender()
		"clicktest":
			await _click_test()
		"clicktest2":
			await _click_test_editor()
		"clicktest3":
			await _click_test_coach()
		"select", "respond":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			m.begin_round()
			if demo == "respond":
				m.begin_round()
			m.st.sides[0].ap = 50
			m.st.sides[1].ap = 50
			m.pick_bag(0, 0)
			while m.phase == "adjust":
				m.skip_adjust(0)
				m.skip_adjust(1)
			m.phase = "adjust_done"
			m.begin_declare()
			m.human = [true, false]
			_show_battle()
			if demo == "respond":
				await get_tree().create_timer(3.0).timeout
			await get_tree().create_timer(0.6).timeout
			var b = battle_screen
			if b.my_turn:
				for sid in m.st.sides[0].units[0].skill_ids:
					if E_skill(sid).kind_tag == "atk":
						b._select_skill(sid)
						break
				if b.sel_sid < 0:
					b._select_skill(m.st.sides[0].units[1].skill_ids[0])
				var guard := 0
				while not b.picking.is_empty() and guard < 5:
					guard += 1
					var cands: Array = b.cards.keys().filter(func(u): return b.cards[u].selectable)
					b._on_card_clicked(b.cards[cands[0]])
		"battle":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			m.begin_round()
			m.st.sides[0].ap = 45
			m.st.sides[1].ap = 45
			_continue_adjust_demo()
		"editor", "simple", "complex":
			m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
			m.commit_deck(0, m.decks[0])
			var s := BuildScreen.new()
			_set_screen(s)
			s.setup(m, "initial")
			s._open_editor(0)
			if demo == "complex" and s.popup != null:
				s.popup.tab = "complex"
				s.popup.complex_root.visible = true
				s.popup.simple_root.visible = false
				s.popup.complex_root.load_skill(s.popup._current_skill(), s.popup.avail_for_slot(), s.popup._points_other())

# ---- 真实鼠标点击的集成测试：把鼠标事件注入视口，走“点技能牌 → 点目标 → 点宣告”
func _click(c: Control) -> void:
	var pos: Vector2 = c.get_global_rect().get_center()
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	ev.position = pos
	ev.global_position = pos
	ev.pressed = true
	get_viewport().push_input(ev)
	var ev2 := InputEventMouseButton.new()
	ev2.button_index = MOUSE_BUTTON_LEFT
	ev2.position = pos
	ev2.global_position = pos
	ev2.pressed = false
	get_viewport().push_input(ev2)
	await get_tree().create_timer(0.15).timeout

func _find_button(root: Node, text: String) -> Button:
	for n in root.find_children("*", "Button", true, false):
		if n is Button and n.text == text and n.visible and not n.disabled:
			return n
	return null

func _click_test() -> void:
	var okf := [true]
	var log := func(msg: String, good: bool):
		print("  [点击测试] ", ("通过 " if good else "失败 "), msg)
		if not good:
			okf[0] = false
	m.decks[0] = Ai.build_deck(m.pools[0], "均衡", m.rng)
	m.commit_deck(0, m.decks[0])
	m.begin_round()
	# —— 抽词界面：点左袋，再点“收下并继续”
	var d := DraftScreen.new()
	_set_screen(d)
	d.setup(m, -1 if m.human[m.picker] else Ai.pick_bag(m.bags, m.pools[m.picker], m.personas[m.picker]))
	d.picked.connect(func(i): d.show_human_choice(i))
	await get_tree().create_timer(0.3).timeout
	if m.human[m.picker]:
		var bag0: Control = d.panels[0]
		await _click(bag0)
		log.call("点击词袋后界面进入“已选择”状态", d.chosen == 0 and d.continue_btn.visible)
		m.pick_bag(0, 0)
	else:
		m.pick_bag(m.picker, d._ai_idx)
	var words_after := 0
	for w in m.pools[0]:
		words_after += int(m.pools[0][w])
	log.call("收下词袋后词库增加到 %d 个词" % words_after, words_after > 12)
	# —— 调整阶段略过，进入战斗
	while m.phase == "adjust":
		m.skip_adjust(0)
		m.skip_adjust(1)
	m.phase = "adjust_done"
	m.st.sides[0].ap = 60
	m.st.sides[1].ap = 60
	m.begin_declare()
	_show_battle()
	var b = battle_screen
	b.speed = 4.0
	await get_tree().create_timer(0.8).timeout
	# 若对手先手，等它宣告完
	var guard := 0
	while not b.my_turn and guard < 40:
		guard += 1
		await get_tree().create_timer(0.2).timeout
	log.call("轮到你宣告", b.my_turn)
	# —— 点一张攻击类技能牌
	var idx := 0
	var target_card: Control = null
	for u in m.st.sides[0].units:
		for sid in u.skill_ids:
			var sk = E_skill(sid)
			if sk.kind_tag == "atk" and target_card == null and int(sk.cost) <= 60:
				target_card = b.hand_row.get_child(idx)
				break
			idx += 1
		if target_card != null:
			break
	if target_card == null:
		log.call("找不到攻击技能牌", false)
	else:
		await _click(target_card)
		log.call("点击技能牌后已选中", b.sel_sid >= 0)
		var tries := 0
		while not b.picking.is_empty() and tries < 4:
			tries += 1
			var enemy_uid := -1
			for uid in b.cards:
				if b.cards[uid].selectable:
					enemy_uid = uid
					break
			if enemy_uid == -1:
				break
			await _click(b.cards[enemy_uid])
		log.call("点击目标卡后选择槽已补全", b.picking.is_empty())
		var confirm := _find_button(b.action_box, "宣告 ✓")
		log.call("出现可点击的“宣告 ✓”按钮", confirm != null)
		if confirm != null:
			await _click(confirm)
			await get_tree().create_timer(0.3).timeout
			log.call("宣告已提交给对局", not m.declared[0].is_empty() or m.phase != "declare")
			var done_btn := _find_button(b.action_box, "完成宣告  →")
			if done_btn != null:
				await _click(done_btn)
				await get_tree().create_timer(0.3).timeout
	# 等动画结束，出现“下一轮”
	guard = 0
	var nb: Button = null
	while nb == null and guard < 200:
		guard += 1
		await get_tree().create_timer(0.2).timeout
		nb = _find_button(b.action_box, "下一轮  →")
	log.call("结算动画结束后出现“下一轮”按钮", nb != null)
	if nb != null:
		await _click(nb)
		await get_tree().create_timer(0.4).timeout
		log.call("点击后进入下一轮抽词", m.st.round == 2 and screen is DraftScreen)
	print("【点击测试结束】", "全部通过" if okf[0] else "有失败")
	get_tree().quit(0 if okf[0] else 1)

# ---- 辅助轮：自动组合 / 换一批 / 自动调整 的真实点击测试
func _click_test_coach() -> void:
	var okf := [true]
	var log := func(msg: String, good: bool):
		print("  [辅助轮点击] ", ("通过 " if good else "失败 "), msg)
		if not good:
			okf[0] = false
	Settings.coach = true
	_show_build("initial")
	var s = screen
	await get_tree().create_timer(0.4).timeout
	var auto := _find_button(s, "自动组合")
	log.call("有“自动组合”按钮", auto != null)
	await _click(auto)
	await get_tree().create_timer(0.3).timeout
	var skills := 0
	for u in s.wd.units:
		skills += u.skills.size()
	log.call("自动组合后牌组合法且有技能（%d个）" % skills, D.validate(s.wd, m.pools[0]).ok and skills >= 2)
	var nb := _find_button(s, "换一批")
	log.call("有“换一批”按钮", nb != null)
	await _click(nb)
	await get_tree().create_timer(0.3).timeout
	log.call("换一批后牌组仍合法", D.validate(s.wd, m.pools[0]).ok)
	var start_btn := _find_button(s, "开始对战  →")
	log.call("可以开始对战", start_btn != null)
	await _click(start_btn)
	await get_tree().create_timer(0.5).timeout
	log.call("进入抽词", screen is DraftScreen)
	var d = screen
	if m.human[m.picker]:
		await _click(d.panels[0])
		await get_tree().create_timer(0.2).timeout
	var cont := _find_button(d, "收下并继续  →")
	log.call("可以继续", cont != null)
	await _click(cont)
	await get_tree().create_timer(0.6).timeout
	if screen is BuildScreen:
		var b = screen
		var adj := _find_button(b, "自动调整（用掉一次）")
		log.call("调整界面有“自动调整”按钮", adj != null)
		if adj != null:
			var left_before: int = m.adjust_left(0)
			await _click(adj)
			await get_tree().create_timer(0.3).timeout
			var use := _find_button(b, "采用（用掉一次调整）")
			log.call("出现建议并可采用（也可能暂无可装的新招）", use != null or b.archetype_note != "")
			if use != null:
				await _click(use)
				await get_tree().create_timer(0.5).timeout
				log.call("采用后消耗了一次调整", m.adjust_left(0) < left_before or screen is BattleScreen)
	else:
		log.call("本轮人类没有调整步骤（直接进入战斗）", screen is BattleScreen)
	print("【辅助轮点击测试结束】", "全部通过" if okf[0] else "有失败")
	get_tree().quit(0 if okf[0] else 1)

# ---- 构筑界面与编辑器的真实点击测试
func _click_test_editor() -> void:
	var okf := [true]
	var log := func(msg: String, good: bool):
		print("  [编辑器点击] ", ("通过 " if good else "失败 "), msg)
		if not good:
			okf[0] = false
	_show_build("initial")
	var s = screen
	await get_tree().create_timer(0.4).timeout
	var edit := _find_button(s, "编辑")
	log.call("构筑界面有“编辑”按钮", edit != null)
	await _click(edit)
	await get_tree().create_timer(0.3).timeout
	var pop = s.popup
	log.call("点击后弹出编辑器", pop != null and is_instance_valid(pop))
	# 逐个点模板，直到“装入技能槽 1”可点
	var installed := false
	for tid in ["atk1", "atkA", "heal", "mit", "shield", "redirect", "time", "swap"]:
		if not pop.tpl_buttons.has(tid):
			continue
		await _click(pop.tpl_buttons[tid])
		var ib := _find_button(pop, "装入技能槽 1")
		if ib != null:
			await _click(ib)
			installed = true
			log.call("选模板 %s 并装入" % tid, pop.work.skills.size() == 1)
			break
	log.call("至少有一个模板凑得出词", installed)
	# 复杂版标签
	var tab_btn := _find_button(pop, "复杂版 · 自由拼词")
	log.call("有复杂版标签", tab_btn != null)
	if tab_btn != null:
		await _click(tab_btn)
		log.call("切到复杂版后可见", pop.complex_root.visible and not pop.simple_root.visible)
		var back := _find_button(pop, "简单版 · 选招式填空")
		await _click(back)
		log.call("切回简单版", pop.simple_root.visible)
	var commit := _find_button(pop, "确认修改")
	log.call("“确认修改”可点", commit != null)
	if commit != null:
		await _click(commit)
		await get_tree().create_timer(0.3).timeout
		log.call("确认后牌组里有技能", s.wd.units[0].skills.size() == 1)
	var start_btn := _find_button(s, "开始对战  →")
	log.call("装好技能后“开始对战”可点", start_btn != null)
	if start_btn != null:
		await _click(start_btn)
		await get_tree().create_timer(0.4).timeout
		log.call("进入抽词", screen is DraftScreen and m.phase == "draft")
	print("【编辑器点击测试结束】", "全部通过" if okf[0] else "有失败")
	get_tree().quit(0 if okf[0] else 1)

func E_skill(sid: int) -> Dictionary:
	return load("res://scripts/core/engine.gd").skill_of(m.st, sid)

func _continue_adjust_demo() -> void:
	m.pick_bag(0, 0)
	while m.phase == "adjust":
		m.skip_adjust(0)
		m.skip_adjust(1)
	m.phase = "adjust_done"
	m.begin_declare()
	m.human = [true, false] if not auto else [false, false]
	_show_battle()

extends Control
# 总控：串起 标题 → 构筑 → 抽词 → 调整 → 战斗 的整局流程。
# 调试入口（命令行 -- 之后）： --demo=title|build|draft|adjust|battle|editor|complex|simple   --auto（双方都由电脑操作）

const K = preload("res://scripts/ui/kit.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const D = preload("res://scripts/core/deck.gd")
const Match = preload("res://scripts/game/match.gd")
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

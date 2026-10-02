extends Control
# 数字牌模式 · 开局准备：选职业 → 组卡（自由组，预设只是建议）→ 分生命 → 选对手职业 → 开打

const K = preload("res://scripts/ui/kit.gd")
const NR = preload("res://scripts/numcard/nc_rules.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Pet = preload("res://scripts/ui/pet.gd")

signal start_game(deck, foe_cls)
signal back()

const SAVE := "user://numcard_deck.json"

var cls := "进攻"
var words: Dictionary = {}
var kws: Array = []
var hps: Array = [7, 7, 7]
var foe := ""
var body: VBoxContainer
var err_label: Label

func _ready() -> void:
	if Pet.inst != null and is_instance_valid(Pet.inst):
		Pet.inst.visible = false
	_load()
	_build()

func _load() -> void:
	var p: Dictionary = NR.PRESETS[cls]
	words = (p.words as Dictionary).duplicate()
	kws = (p.kws as Array).duplicate()
	if FileAccess.file_exists(SAVE):
		var f := FileAccess.open(SAVE, FileAccess.READ)
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary and NR.CLASSES.has(str(d.get("cls", ""))):
			cls = str(d.cls)
			var w2 := {}
			for k in d.get("words", {}):
				w2[str(k)] = int(d.words[k])
			if NR.deck_problem(w2, d.get("kws", [])) == "":
				words = w2
				kws = (d.kws as Array).duplicate()
			if NR.hp_problem(d.get("hp", [])) == "":
				hps = []
				for h in d.hp:
					hps.append(int(h))

func _save() -> void:
	var f := FileAccess.open(SAVE, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify({"cls": cls, "words": words, "kws": kws, "hp": hps}))

func _build() -> void:
	K.clear_children(self)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.add_child(K.glow())
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var sc := ScrollContainer.new()
	sc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(sc)
	var mc := MarginContainer.new()
	mc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for side in ["left", "right", "top", "bottom"]:
		mc.add_theme_constant_override("margin_" + side, 28)
	sc.add_child(mc)
	body = K.vbox(14)
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mc.add_child(body)
	var head := K.hbox(12)
	head.add_child(K.label("数字牌模式 · 准备", 36, K.GOLD))
	head.add_child(K.chip("新玩法试玩", Color("2c6a44"), 15))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	var rules := K.button("怎么玩", "normal", 18)
	rules.pressed.connect(_show_rules)
	head.add_child(rules)
	var bk := K.button("返回标题", "ghost", 18)
	bk.pressed.connect(func(): back.emit())
	head.add_child(bk)
	body.add_child(head)
	body.add_child(K.wrap_label("数字是牌：1 免费无限用，更大的数字靠职业阶梯和挫折骰子拿到。数字也是次数：选几个目标、打几点、重复几次、持续几轮都放数字牌。五个职业各有各的得分方式，先到自己目标分的赢；击倒一个敌人也算目标分的 15%。", 17, K.MUTED))
	body.add_child(_class_box())
	body.add_child(_deck_box())
	var row := K.hbox(14)
	row.add_child(_kw_box())
	row.add_child(_hp_box())
	row.add_child(_foe_box())
	body.add_child(row)
	err_label = K.label("", 18, K.RED)
	body.add_child(err_label)
	var go := K.button("开打  →", "primary", 28)
	go.custom_minimum_size = Vector2(0, 64)
	go.pressed.connect(_go)
	body.add_child(go)
	_check()

func _section(title: String) -> Array:
	var p := K.panel(K.PANEL, K.EDGE, 14, 2)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := K.vbox(8)
	p.add_child(v)
	v.add_child(K.label(title, 22, K.GOLD))
	return [p, v]

func _class_box() -> Control:
	var s := _section("1. 选职业（决定你怎么得分）")
	var row := K.hbox(10)
	for c in NR.CLASSES:
		var b := Button.new()
		b.text = "%s\n目标 %d 分" % [c, int(NR.TARGET[c])]
		b.custom_minimum_size = Vector2(150, 70)
		b.add_theme_font_size_override("font_size", 20)
		var col: Color = NR.CLASS_COLOR[c]
		b.add_theme_stylebox_override("normal", K.style(col.darkened(0.55) if c != cls else col.darkened(0.15), K.GOLD if c == cls else col, 10, 3 if c == cls else 1, 4))
		b.add_theme_stylebox_override("hover", K.style(col.darkened(0.3), K.GOLD, 10, 2, 4))
		b.tooltip_text = "得分：" + str(NR.CLASS_GOAL[c])
		var cc: String = c
		b.pressed.connect(func():
			if cls != cc:
				cls = cc
				var p: Dictionary = NR.PRESETS[cls]
				words = (p.words as Dictionary).duplicate()
				kws = (p.kws as Array).duplicate()
				Sfx.play("click")
				_build())
		row.add_child(b)
	s[1].add_child(row)
	s[1].add_child(K.wrap_label("【%s】得分：%s。目标 %d 分。" % [cls, str(NR.CLASS_GOAL[cls]), int(NR.TARGET[cls])], 17, K.TEXT))
	return s[0]

func _deck_box() -> Control:
	var s := _section("2. 组卡：%d 张进阶词，同名最多 %d 张（基础词随便用，不用组）" % [NR.DECK_SIZE, NR.COPY_MAX])
	var top := K.hbox(10)
	var cnt := K.label("", 18, K.TEXT)
	cnt.text = "已选 %d / %d 张" % [NR.deck_size(words), NR.DECK_SIZE]
	cnt.add_theme_color_override("font_color", K.GREEN if NR.deck_size(words) == NR.DECK_SIZE else K.RED)
	top.add_child(cnt)
	var pre := K.button("用【%s】的推荐卡组" % cls, "normal", 16)
	pre.pressed.connect(func():
		words = (NR.PRESETS[cls].words as Dictionary).duplicate()
		kws = (NR.PRESETS[cls].kws as Array).duplicate()
		_build())
	top.add_child(pre)
	var clear := K.button("清空", "ghost", 16)
	clear.pressed.connect(func():
		words = {}
		_build())
	top.add_child(clear)
	s[1].add_child(top)
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 8)
	for w in NR.WORD_ORDER:
		var cell := K.panel(Color("1d2233"), K.GOLD_D, 10, 1)
		cell.custom_minimum_size = Vector2(470, 0)
		var h := K.hbox(8)
		cell.add_child(h)
		var nv := K.vbox(2)
		nv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nv.add_child(K.label("%s  · 价格 %d" % [w, int(NR.WORDS[w].price)], 19, K.GOLD))
		nv.add_child(K.wrap_label(str(NR.WORDS[w].desc), 13, K.MUTED))
		h.add_child(nv)
		var minus := K.button("－", "normal", 20)
		minus.custom_minimum_size = Vector2(42, 40)
		var ww: String = w
		minus.pressed.connect(func():
			words[ww] = maxi(0, int(words.get(ww, 0)) - 1)
			_build())
		h.add_child(minus)
		h.add_child(K.label(str(int(words.get(w, 0))), 24, K.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
		var plus := K.button("＋", "normal", 20)
		plus.custom_minimum_size = Vector2(42, 40)
		plus.disabled = int(words.get(w, 0)) >= NR.COPY_MAX or NR.deck_size(words) >= NR.DECK_SIZE
		plus.pressed.connect(func():
			words[ww] = mini(NR.COPY_MAX, int(words.get(ww, 0)) + 1)
			_build())
		h.add_child(plus)
		grid.add_child(cell)
	s[1].add_child(grid)
	return s[0]

func _kw_box() -> Control:
	var s := _section("3. 关键词（每个随从一个，点击切换）")
	for i in 3:
		var h := K.hbox(8)
		h.add_child(K.label(NR.UNIT_NAMES[i], 19, K.TEXT))
		var b := K.button("【%s】" % str(kws[i]), "normal", 18)
		b.tooltip_text = str(NR.KEYWORDS.get(str(kws[i]), ""))
		var ii := i
		b.pressed.connect(func():
			var cur: int = NR.KW_ORDER.find(str(kws[ii]))
			kws[ii] = NR.KW_ORDER[(cur + 1) % NR.KW_ORDER.size()]
			_build())
		h.add_child(b)
		var kd := K.wrap_label(str(NR.KEYWORDS.get(str(kws[i]), "")), 13, K.MUTED)
		kd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		kd.custom_minimum_size = Vector2(220, 0)
		h.add_child(kd)
		s[1].add_child(h)
	return s[0]

func _hp_box() -> Control:
	var s := _section("4. 分生命（共 %d，每个至少 %d）" % [NR.HP_POOL, NR.HP_MIN])
	var left: int = NR.HP_POOL - int(hps[0]) - int(hps[1]) - int(hps[2])
	for i in 3:
		var h := K.hbox(8)
		h.add_child(K.label(NR.UNIT_NAMES[i], 19, K.TEXT))
		var ii := i
		var m := K.button("－", "normal", 20)
		m.custom_minimum_size = Vector2(42, 40)
		m.disabled = int(hps[i]) <= NR.HP_MIN
		m.pressed.connect(func():
			hps[ii] = int(hps[ii]) - 1
			_build())
		h.add_child(m)
		h.add_child(K.label(str(int(hps[i])), 24, K.GREEN, HORIZONTAL_ALIGNMENT_CENTER))
		var p := K.button("＋", "normal", 20)
		p.custom_minimum_size = Vector2(42, 40)
		p.disabled = left <= 0
		p.pressed.connect(func():
			hps[ii] = int(hps[ii]) + 1
			_build())
		h.add_child(p)
		s[1].add_child(h)
	s[1].add_child(K.label("还剩 %d 点没分" % left, 16, K.MUTED if left == 0 else K.RED))
	return s[0]

func _foe_box() -> Control:
	var s := _section("5. 对手（电脑）的职业")
	var opts: Array = [""] + NR.CLASSES
	var row := HFlowContainer.new()
	row.add_theme_constant_override("h_separation", 6)
	for c in opts:
		var b := K.button("随机" if c == "" else str(c), "primary" if c == foe else "normal", 16)
		var cc: String = str(c)
		b.pressed.connect(func():
			foe = cc
			_build())
		row.add_child(b)
	s[1].add_child(row)
	s[1].add_child(K.wrap_label("电脑用它职业的推荐卡组。", 13, K.MUTED))
	return s[0]

func _check() -> String:
	var e := NR.deck_problem(words, kws)
	if e == "":
		e = NR.hp_problem(hps)
	if err_label != null:
		err_label.text = e
	return e

func _go() -> void:
	if _check() != "":
		Sfx.play("click")
		return
	_save()
	start_game.emit({"cls": cls, "words": words.duplicate(), "kws": kws.duplicate(), "hp": hps.duplicate()}, foe)

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
	for line in rules_lines():
		v.add_child(K.wrap_label(line, 17, K.TEXT))
	var close := K.button("知道了", "primary", 20)
	close.pressed.connect(func(): layer.queue_free())
	dim.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			layer.queue_free())
	v.add_child(close)

static func rules_lines() -> Array:
	return [
		"· 双方各 3 个随从，共 %d 点生命。被击倒的随从休整一轮，再满血回来。" % NR.HP_POOL,
		"· 每轮轮流宣告：一方定一个随从的一句，另一方再定一个，交替进行；每轮换一方先定。你能看到对方已经定下的句子。",
		"· 一句话就是一张张词拼起来的：比如 选择 2 个 敌方 随从，造成 3 点 伤害，重复 2 次。数字都是牌：1 免费无限用，2 以上要用手里的数字牌，每个位置一张。",
		"· 数字牌从哪来：你的职业得分到 10%%、25%%、45%%、70%% 时，各解锁两张 2、3、4、5（能反复用，用完冷却一轮）；一轮里掉了 %d 点以上血或有随从倒下，掷两个骰子，掷出几给一张几（只能用一次）。" % NR.DICE_HP,
		"· 行动点：开局 %d，每轮 +%d，最多 %d。一句的花费 = %d + 进阶词价格 + 每多一段（并）%d。" % [NR.AP_START, NR.AP_INCOME, NR.AP_CAP, NR.BASE_COST, NR.AND_COST],
		"· 时间轴 0~%d 秒：一句最早第（1 + 进阶词数 + 段数 − 1）秒起效；同一秒里减伤、回敬这类保护先生效；出手的随从先被打倒，它的招就落空。" % NR.TIMELINE,
		"· 进阶词要组进卡组（%d 张，同名最多 %d 张）；用过的那一张下一轮冷却。" % [NR.DECK_SIZE, NR.COPY_MAX],
		"· 状态每过一轮自己 +1 级：易伤（每次多受）、灼烧（每轮末掉血）、衰弱（每次少打）、蓄力（下一次出手每下多打，用掉）、铁壁（每次少受）。",
		"· 五个职业：进攻=打出的伤害；守护=挡掉/转走的伤害；积蓄=状态兑现出来的效果；治疗=回的血（自残再奶也算）；控制=让对方白花的行动点。先到自己目标分的赢；击倒一个敌人算目标分的 15%%；打满 %d 轮比完成的百分比。" % NR.MAX_ROUNDS,
	]

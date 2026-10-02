extends Control
# 对局准备界面两种用法：
#   mode "hp"    开局把生命池分给三个随从（之后不再改）
#   mode "equip" 每次挑完兜子后，给三个随从换关键词（免费换，一人一个）
# 完成后发 finished。

const K = preload("res://scripts/ui/kit.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")
const Pet = preload("res://scripts/ui/pet.gd")
const Tut = preload("res://scripts/tutorial/tutorial.gd")

signal finished()

var m
var mode := "hp"
var hps: Array = []
var kws: Array = []
var hp_labels: Array = []
var left_label: Label
var err_label: Label
var ok_btn: Button
var kw_btns: Array = []

func setup(match_obj, which: String) -> void:
	m = match_obj
	mode = which
	K.clear_children(self)
	var bg := ColorRect.new()
	bg.color = K.BG
	bg.add_child(K.glow())
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var v := K.vbox(14)
	v.custom_minimum_size = Vector2(900, 0)
	center.add_child(v)
	if mode == "hp":
		_build_hp(v)
		Tut.fire("screen:hp")
	else:
		_build_equip(v)

# ---------------------------------------------------------------- 分配生命
func _build_hp(v: VBoxContainer) -> void:
	v.add_child(K.label("分配生命", 40, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(K.wrap_label("三个随从共用 %d 点生命，每个至少 %d。只在开局分一次，之后不能再改；倒下的随从修整一轮后会带着满生命回来。" % [m.HP_POOL, m.HP_MIN], 19, K.TEXT))
	hps = [22, 22, 22]
	hp_labels = []
	for i in 3:
		var row := K.panel(K.PANEL, K.EDGE, 14, 2)
		if i == 0:
			Tut.tag(row, "h:rows")
		var h := K.hbox(14)
		row.add_child(h)
		h.add_child(K.label(str(m.decks[0].units[i].name), 26, K.TEXT))
		var sp := Control.new()
		sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(sp)
		var idx := i
		var minus := K.button("－", "normal", 26)
		minus.custom_minimum_size = Vector2(60, 50)
		minus.pressed.connect(func(): _bump(idx, -2))
		h.add_child(minus)
		var lb := K.label("22", 34, K.GREEN, HORIZONTAL_ALIGNMENT_CENTER)
		lb.custom_minimum_size = Vector2(80, 0)
		hp_labels.append(lb)
		h.add_child(lb)
		var plus := K.button("＋", "normal", 26)
		plus.custom_minimum_size = Vector2(60, 50)
		plus.pressed.connect(func(): _bump(idx, 2))
		h.add_child(plus)
		v.add_child(row)
	left_label = K.label("", 20, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(left_label)
	err_label = K.label("", 18, K.RED, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(err_label)
	ok_btn = K.button("就这样分，开战  →", "primary", 24)
	ok_btn.custom_minimum_size = Vector2(0, 58)
	Tut.tag(ok_btn, "h:ok")
	ok_btn.pressed.connect(func():
		var e: String = m.set_hp(0, hps)
		if e != "":
			err_label.text = e
			return
		Tut.fire("hp_done")
		finished.emit())
	v.add_child(ok_btn)
	_refresh_hp()
	Pet.chat("血量一人分一份：想让谁当主力、谁当替死鬼，你说了算。对手也会分，而且你看不到。", "talk", 8.0)

func _bump(i: int, d: int) -> void:
	var left: int = m.HP_POOL - int(hps[0]) - int(hps[1]) - int(hps[2])
	if d > 0:
		d = mini(d, left)
		if d <= 0:
			return
	else:
		d = -mini(-d, int(hps[i]) - m.HP_MIN)
	hps[i] += d
	Sfx.play("click")
	_refresh_hp()

func _refresh_hp() -> void:
	for i in 3:
		hp_labels[i].text = str(hps[i])
	var left: int = m.HP_POOL - int(hps[0]) - int(hps[1]) - int(hps[2])
	left_label.text = "还剩 %d 点没分" % left
	ok_btn.disabled = left != 0
	err_label.text = ""

# ---------------------------------------------------------------- 换关键词
func _build_equip(v: VBoxContainer) -> void:
	v.add_child(K.label("换关键词", 40, K.GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(K.wrap_label("关键词是词库里的词，每个随从最多装一个，随时免费换。装了的关键词不能再用在句子里。", 19, K.TEXT))
	var stock: Dictionary = m.keyword_stock(0)
	kws = []
	for i in 3:
		kws.append(str(m.decks[0].units[i].kw))
	if stock.is_empty():
		v.add_child(K.label("你的词库里还没有关键词。从兜子里拿到之后再来装。", 20, K.MUTED, HORIZONTAL_ALIGNMENT_CENTER))
	kw_btns = []
	for i in 3:
		var row := K.panel(K.PANEL, K.EDGE, 14, 2)
		var h := K.hbox(14)
		row.add_child(h)
		h.add_child(K.label(str(m.decks[0].units[i].name), 24, K.TEXT))
		var sp := Control.new()
		sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(sp)
		var idx := i
		var b := K.button("", "normal", 20)
		b.custom_minimum_size = Vector2(240, 48)
		b.pressed.connect(func(): _cycle(idx))
		kw_btns.append(b)
		h.add_child(b)
		v.add_child(row)
	err_label = K.label("", 18, K.RED, HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(err_label)
	ok_btn = K.button("开始下一轮  →", "primary", 24)
	ok_btn.custom_minimum_size = Vector2(0, 58)
	ok_btn.pressed.connect(func():
		var e: String = m.equip(0, kws)
		if e != "":
			err_label.text = e
			return
		finished.emit())
	v.add_child(ok_btn)
	_refresh_equip()

func _cycle(i: int) -> void:
	var stock: Dictionary = m.keyword_stock(0)
	var opts: Array = [""]
	for k in stock:
		opts.append(k)
	var cur: int = opts.find(kws[i])
	for step in range(1, opts.size() + 1):
		var cand: String = opts[(cur + step) % opts.size()]
		var used := 0
		for j in 3:
			if j != i and kws[j] == cand and cand != "":
				used += 1
		if cand == "" or used < int(stock.get(cand, 0)):
			kws[i] = cand
			break
	Sfx.play("click")
	_refresh_equip()

func _refresh_equip() -> void:
	for i in 3:
		var k: String = kws[i]
		kw_btns[i].text = "无（点击切换）" if k == "" else "【%s】（点击切换）" % k
		if k != "" and Lex.words.has(k):
			kw_btns[i].tooltip_text = str(Lex.words[k].desc)
	err_label.text = ""

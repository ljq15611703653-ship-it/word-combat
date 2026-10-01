extends RefCounted
# 拼词的两个特效：
#   stamp(tile, layer)  钢印：牌从上面“邦”地砸下来烙在句子轨上，溅火花、冒一圈冲击波
#   combine(rail, text, host)  拼好了：所有牌飞起来，咔咔咔拼在一起，合成一张写着人话的牌
# 都是纯代码动画。以后要换成美术素材：在 res://assets/fx/stamp.tscn / combine.tscn 放场景即可（见 docs/素材与特效接口.md）。

const K = preload("res://scripts/ui/kit.gd")
const Sfx = preload("res://scripts/ui/sfx.gd")

# ------------------------------------------------------------ 钢印
static func stamp(tile: Control, layer: Control) -> void:
	if not is_instance_valid(tile):
		return
	var custom := _asset("fx/stamp.tscn")
	tile.pivot_offset = tile.size * 0.5
	tile.modulate.a = 0.0
	tile.scale = Vector2(2.3, 2.3)
	tile.rotation = randf_range(-0.16, 0.16)
	var tw := tile.create_tween()
	tw.tween_property(tile, "modulate:a", 1.0, 0.05)
	tw.parallel().tween_property(tile, "scale", Vector2(0.94, 0.94), 0.12).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	tw.parallel().tween_property(tile, "rotation", 0.0, 0.12)
	tw.tween_callback(func():
		_impact(tile, layer, custom))
	tw.tween_property(tile, "scale", Vector2(1.06, 1.06), 0.06)
	tw.tween_property(tile, "scale", Vector2.ONE, 0.1)

static func _asset(rel: String) -> PackedScene:
	var path := "res://assets/" + rel
	if ResourceLoader.exists(path):
		var r = load(path)
		if r is PackedScene:
			return r
	return null

static func _impact(tile: Control, layer: Control, custom: PackedScene) -> void:
	if not is_instance_valid(tile) or not is_instance_valid(layer):
		return
	var center: Vector2 = tile.get_global_rect().get_center() - layer.get_global_rect().position
	if custom != null:
		var n: Node = custom.instantiate()
		layer.add_child(n)
		if n is Control:
			(n as Control).position = center
		if n.has_method("play"):
			n.play({"center": center})
		return
	# 白闪：像钢印烙下去那一瞬间发热
	var flash := Panel.new()
	var fs := StyleBoxFlat.new()
	fs.bg_color = Color(1.0, 0.9, 0.6, 0.85)
	fs.set_corner_radius_all(10)
	flash.add_theme_stylebox_override("panel", fs)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	flash.size = tile.size
	flash.position = tile.get_global_rect().position - layer.get_global_rect().position
	layer.add_child(flash)
	var ft := flash.create_tween()
	ft.tween_property(flash, "modulate:a", 0.0, 0.22)
	ft.tween_callback(flash.queue_free)
	# 冲击波
	var ring := Panel.new()
	var rs := StyleBoxFlat.new()
	rs.bg_color = Color(0, 0, 0, 0)
	rs.border_color = Color("ffd66b")
	rs.set_border_width_all(4)
	rs.set_corner_radius_all(200)
	ring.add_theme_stylebox_override("panel", rs)
	ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ring.size = Vector2(40, 40)
	ring.pivot_offset = Vector2(20, 20)
	ring.position = center - Vector2(20, 20)
	layer.add_child(ring)
	var rt := ring.create_tween().set_parallel(true)
	rt.tween_property(ring, "scale", Vector2(4.2, 4.2), 0.32).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	rt.tween_property(ring, "modulate:a", 0.0, 0.32)
	rt.chain().tween_callback(ring.queue_free)
	# 火花
	for i in 12:
		var sp := ColorRect.new()
		sp.color = Color(1.0, randf_range(0.72, 0.95), randf_range(0.25, 0.5))
		sp.size = Vector2(randf_range(3, 7), randf_range(3, 7))
		sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		sp.position = center
		layer.add_child(sp)
		var ang := randf() * TAU
		var dist := randf_range(34.0, 90.0)
		var tgt := center + Vector2(cos(ang), sin(ang)) * dist
		var st := sp.create_tween().set_parallel(true)
		st.tween_property(sp, "position", tgt, 0.38).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		st.tween_property(sp, "modulate:a", 0.0, 0.38).set_delay(0.08)
		st.chain().tween_callback(sp.queue_free)

# ------------------------------------------------------------ 组句：飞起来、咔咔拼合、变成一句人话
static func combine(rail: Control, text: String, host: Control, toks: Array = []) -> void:
	var tree := host.get_tree()
	var vp := host.get_viewport_rect().size
	var ov := Control.new()
	ov.top_level = true
	ov.position = Vector2.ZERO
	ov.size = vp
	ov.mouse_filter = Control.MOUSE_FILTER_STOP
	ov.z_index = 80
	host.add_child(ov)
	var skip := [false]
	ov.gui_input.connect(func(ev):
		if ev is InputEventMouseButton and ev.pressed:
			skip[0] = true)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.0)
	dim.size = vp
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ov.add_child(dim)
	var dt := dim.create_tween()
	dt.tween_property(dim, "color:a", 0.62, 0.3)
	# 1. 把句子轨里的每张牌复制一张，飞起来
	var clones: Array = []
	var ri := -1
	for t in rail.get_children():
		ri += 1
		if not (t is Control) or not t.visible or t.size.x < 30 or t.get_child_count() == 0:
			continue
		var c: Control
		if not toks.is_empty():
			if ri >= toks.size():
				continue   # 末尾的空位
			c = _clone_of_token(toks[ri])
		else:
			if t is PanelContainer:
				continue   # 空位 / 输入框
			c = _clone_of(t)
		if c == null:
			continue
		ov.add_child(c)
		c.position = t.get_global_rect().position
		c.size = t.size
		c.pivot_offset = t.size * 0.5
		clones.append(c)
		(t as Control).modulate.a = 0.0
	Sfx.play("whoosh")
	var n := clones.size()
	if n == 0:
		ov.queue_free()
		return
	# 2. 飞到屏幕中央的一条线上
	var spacing: float = minf(70.0, (vp.x * 0.78) / maxf(1.0, float(n)))
	var total_w: float = spacing * float(n - 1)
	var y0 := vp.y * 0.46
	for i in n:
		var c2: Control = clones[i]
		var start: Vector2 = c2.position
		var dest := Vector2(vp.x * 0.5 - total_w * 0.5 + spacing * i - c2.size.x * 0.5, y0)
		var mid := (start + dest) * 0.5 + Vector2(randf_range(-80, 80), -randf_range(90, 220))
		var delay: float = 0.05 * float(i)
		var tw := c2.create_tween()
		tw.tween_interval(delay)
		tw.tween_method(func(k: float):
			if is_instance_valid(c2):
				var a := start.lerp(mid, k)
				var b := mid.lerp(dest, k)
				c2.position = a.lerp(b, k)
				c2.rotation = sin(k * PI) * 0.35 * (1.0 if i % 2 == 0 else -1.0)
				c2.scale = Vector2.ONE * (1.0 + 0.2 * sin(k * PI)), 0.0, 1.0, 0.5)
		tw.tween_callback(func():
			Sfx.play("clack")
			if is_instance_valid(c2):
				c2.rotation = 0.0
				c2.scale = Vector2.ONE
				_spark(ov, c2.position + c2.size * 0.5))
	var fly_time: float = 0.5 + 0.05 * float(n)
	await _wait(tree, fly_time + 0.1, skip)
	# 3. 咔咔咔：一张一张挤到一起
	var snap := ov.create_tween().set_parallel(true)
	var tight: float = minf(34.0, spacing * 0.5)
	var tw_w: float = tight * float(n - 1)
	for i in n:
		var c3: Control = clones[i]
		var d3 := Vector2(vp.x * 0.5 - tw_w * 0.5 + tight * i - c3.size.x * 0.5, y0)
		snap.tween_property(c3, "position", d3, 0.28).set_delay(0.02 * i).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN_OUT)
	Sfx.play("clack")
	await _wait(tree, 0.4 + 0.02 * n, skip)
	Sfx.play("clack")
	# 4. 闪光，变成一张写着人话的牌
	var flash := ColorRect.new()
	flash.color = Color(1, 0.95, 0.75, 0.0)
	flash.size = vp
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ov.add_child(flash)
	var ft := flash.create_tween()
	ft.tween_property(flash, "color:a", 0.75, 0.08)
	ft.tween_property(flash, "color:a", 0.0, 0.3)
	for c4 in clones:
		var ct := (c4 as Control).create_tween().set_parallel(true)
		ct.tween_property(c4, "modulate:a", 0.0, 0.2)
		ct.tween_property(c4, "scale", Vector2(0.4, 0.4), 0.2)
	var card := PanelContainer.new()
	var cs := K.style(Color("2a2414"), Color("ffd66b"), 16, 4, 14)
	cs.content_margin_left = 34
	cs.content_margin_right = 34
	cs.content_margin_top = 22
	cs.content_margin_bottom = 22
	card.add_theme_stylebox_override("panel", cs)
	var l := K.wrap_label(text, 30, Color("fff3c8"))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.custom_minimum_size = Vector2(minf(vp.x * 0.7, 900.0), 0)
	var vb := K.vbox(6)
	vb.add_child(K.label("你拼出了一个技能", 18, Color("ffd66b"), HORIZONTAL_ALIGNMENT_CENTER))
	vb.add_child(l)
	card.add_child(vb)
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ov.add_child(card)
	await tree.process_frame
	card.size = card.get_combined_minimum_size()
	card.pivot_offset = card.size * 0.5
	card.position = Vector2((vp.x - card.size.x) * 0.5, vp.y * 0.42 - card.size.y * 0.5)
	card.scale = Vector2(0.5, 0.5)
	card.modulate.a = 0.0
	Sfx.play("chime")
	var cw := card.create_tween().set_parallel(true)
	cw.tween_property(card, "scale", Vector2.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	cw.tween_property(card, "modulate:a", 1.0, 0.15)
	for i in 14:
		_spark(ov, card.position + Vector2(randf() * card.size.x, randf() * card.size.y))
	await _wait(tree, 1.05, skip)
	var out := ov.create_tween().set_parallel(true)
	out.tween_property(card, "modulate:a", 0.0, 0.25)
	out.tween_property(card, "scale", Vector2(0.9, 0.9), 0.25)
	out.tween_property(dim, "color:a", 0.0, 0.25)
	await _wait(tree, 0.28, skip)
	if is_instance_valid(ov):
		ov.queue_free()

static func _wait(tree: SceneTree, secs: float, skip: Array) -> void:
	var t := 0.0
	while t < secs and not skip[0]:
		await tree.process_frame
		t += tree.root.get_process_delta_time()

static func _clone_of_token(tok: Dictionary) -> Control:
	var txt := str(tok.v)
	var col := Color("6b5a22") if tok.t == "N" else (Color("5a4a7a") if tok.t == "P" else Lex_cat("", txt))
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", K.style(col.darkened(0.15), col.lightened(0.25), 9, 2, 4))
	p.add_child(K.label(txt, 24 if txt.length() <= 3 else 18, Color("fff6dc"), HORIZONTAL_ALIGNMENT_CENTER))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

static func _clone_of(t: Control) -> Control:
	# 取牌上的文字，做成一张简化的牌（飞行时不需要完整的词卡）
	var txt := ""
	var col := Color("4a5266")
	var labels := t.find_children("*", "Label", true, false)
	var texts: Array = []
	for lb in labels:
		if lb is Label and lb.text != "" and lb.text != "·" and not (lb.text.begins_with("◆")):
			texts.append(lb.text)
	if texts.size() >= 2:
		txt = str(texts[1]) if str(texts[0]) in ["动作", "对象", "范围", "时间", "触发", "结构", "引用", "状态"] else str(texts[0])
		col = Lex_cat(str(texts[0]), str(txt))
	elif texts.size() == 1:
		txt = str(texts[0])
	if txt == "":
		return null
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", K.style(col.darkened(0.15), col.lightened(0.25), 9, 2, 4))
	var l := K.label(txt, 24 if txt.length() <= 3 else 18, Color("fff6dc"), HORIZONTAL_ALIGNMENT_CENTER)
	p.add_child(l)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

static func Lex_cat(cat: String, word: String) -> Color:
	var Lex = load("res://scripts/core/lexicon.gd")
	if word.is_valid_int():
		return Color("6b5a22")
	var c: Color = Lex.cat_color(word)
	return c if c != Color.GRAY else Color("4a5266")

static func _spark(layer: Control, at: Vector2) -> void:
	for i in 6:
		var sp := ColorRect.new()
		sp.color = Color(1.0, randf_range(0.75, 0.95), randf_range(0.3, 0.55))
		sp.size = Vector2(4, 4)
		sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		sp.position = at
		layer.add_child(sp)
		var ang := randf() * TAU
		var tgt := at + Vector2(cos(ang), sin(ang)) * randf_range(18.0, 52.0)
		var st := sp.create_tween().set_parallel(true)
		st.tween_property(sp, "position", tgt, 0.3).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		st.tween_property(sp, "modulate:a", 0.0, 0.3)
		st.chain().tween_callback(sp.queue_free)

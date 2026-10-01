extends SceneTree
# 冒险关卡的验证：每一关的标准答案必须真的通关；并检查“只拼一个最简单的效果”是不是通不了关。
# 用法： -- [起始关] [结束关] [naive]   （第三个参数写 naive 才做“最简做法也能过吗”的检查，较慢）
const L = preload("res://scripts/adventure/level_eval.gd")
const S = preload("res://scripts/compose/sentence.gd")
const G = preload("res://scripts/core/grammar.gd")
const Fuzzy = preload("res://scripts/compose/fuzzy.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

func _init() -> void:
	await process_frame
	Lex.load_all()
	var args := OS.get_cmdline_user_args()
	var from_id := int(args[0]) if args.size() > 0 else 1
	var to_id := int(args[1]) if args.size() > 1 else 9999
	var naive := args.size() > 2 and args[2] == "naive"
	var levels: Array = L.load_levels()
	var bad: Array = []
	var cheap: Array = []
	var total_t := 0
	for lv in levels:
		var id := int(lv.id)
		if id < from_id or id > to_id:
			continue
		var toks: Array = L.tokens_from(lv.sol)
		var t0 := Time.get_ticks_msec()
		var r: Dictionary = L.evaluate(lv, toks)
		var dt := Time.get_ticks_msec() - t0
		var line := "第%3d关 %-14s" % [id, str(lv.title)]
		if r.win:
			line += " ✓ 通关 第%d秒起效 操作费%d/%d  %dms" % [int(r.start), int(r.cost), int(lv.ap), dt]
		else:
			line += " ✗ 没通：" + str(r.reason)
			for it in r.get("goal_items", []):
				line += "\n        %s %s" % ["✓" if it.ok else "✗", it.text]
			bad.append(id)
		print(line)
		if naive and r.win:
			# 只拼最简单的效果（单个节点、不用“并”“若”这类结构词）能不能过关？
			var req: Array = lv.requires
			var solver = Fuzzy.new()
			var tray: Array = []
			for w in lv.tray:
				for k in int(lv.tray[w]):
					tray.append(w)
			var found: Array = await solver._beam(tray, 0, mini(11, toks.size() + 2))
			var shown := 0
			for f in found:
				var words: Array = S.words_in(f.tokens)
				var has_req := req.is_empty()
				for q in req:
					if q in words:
						has_req = true
				if has_req:
					continue
				var rr: Dictionary = L.evaluate(lv, f.tokens)
				if rr.win:
					cheap.append([id, G.describe(G.skill("x", f.nodes))])
					print("        ⚠ 没用 %s 也能过：%s" % [str(req), G.describe(G.skill("x", f.nodes))])
					shown += 1
					if shown >= 2:
						break
	print("——— 共检查 %d 关，标准答案没通关的：%s" % [levels.size(), str(bad)])
	if naive:
		print("——— 没用到关键结构词也能过的关卡：%s" % str(cheap.map(func(c): return c[0])))
	quit(1 if not bad.is_empty() else 0)

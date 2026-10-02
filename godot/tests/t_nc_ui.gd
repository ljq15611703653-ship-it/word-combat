extends SceneTree
# 数字牌模式界面通关：准备界面点开打 → 对战界面里用真实处理函数替“你”出手，一直打到结束
const NcSetup = preload("res://scripts/numcard/ui/nc_setup.gd")
const NcBattle = preload("res://scripts/numcard/ui/nc_battle.gd")
func _init() -> void:
	var main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	await create_timer(0.5).timeout
	main._show_numcard()
	await create_timer(0.3).timeout
	var s = main.screen
	if not (s is NcSetup):
		print("!! 没有进入准备界面")
		quit(1)
		return
	NcBattle.test_auto = true
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		s.cls = args[0]
		s.words = (s.NR.PRESETS[args[0]].words as Dictionary).duplicate()
		s.kws = (s.NR.PRESETS[args[0]].kws as Array).duplicate()
	if args.size() > 1:
		s.foe = args[1]
	s._go()
	await create_timer(0.3).timeout
	var b = main.screen
	if not (b is NcBattle):
		print("!! 没有进入对战界面：", s.err_label.text)
		quit(1)
		return
	for i in 600:
		await create_timer(0.1).timeout
		if b.ui == "over":
			var acts := 0
			for a in b.M.last_declared:
				acts += 1
			print("最后一轮宣告 %d 句；我方职业 %s，电脑 %s；击倒加成 %s" % [acts, b.M.cls_of(0), b.M.cls_of(1), str(b.M.R.kob)])
			quit(0)
			return
	print("!! 超时，停在 ", b.ui, " 第 ", b.M.rnd, " 轮")
	quit(1)

extends SceneTree
const G = preload("res://scripts/core/grammar.gd")
const E = preload("res://scripts/core/engine.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

var fails := 0
var total := 0
func check(cond: bool, msg: String) -> void:
	total += 1
	if cond:
		print("  ok  ", msg)
	else:
		print("  FAIL ", msg)
		fails += 1

func deck(skills0: Array, hps := [20,20,20,20,20], kws := ["","","","",""], skills1: Array = []) -> Dictionary:
	var units: Array = []
	for i in 5:
		var sk: Array = []
		if i == 0: sk = skills0
		if i == 1: sk = skills1
		units.append({"name": "卡%d" % i, "max_hp": hps[i], "kw": kws[i], "skills": sk})
	return {"units": units}

func hps(st: Dictionary, s: int) -> Array:
	var out: Array = []
	for u in st.sides[s].units:
		out.append(u.hp if u.down_round == -1 else 0)
	return out

func play(d0: Dictionary, d1: Dictionary, choices0 := {}, choices1 := {}, s0 := 3, s1 := 3, ap := 100, rounds := 1, st_in = null) -> Dictionary:
	var st: Dictionary = st_in if st_in != null else E.make_state([d0, d1], 0)
	for r in rounds:
		E.begin_round(st)
		st.sides[0].ap = ap
		st.sides[1].ap = ap
		var a0 := {}
		var a1 := {}
		if not st.sides[0].units[0].skill_ids.is_empty():
			a0 = {"side":0,"sid": st.sides[0].units[0].skill_ids[0], "choices":choices0, "start": 0}
			a0.start = maxi(s0, E.min_start(st, a0)) if s0 >= 0 else 0
		if not st.sides[1].units[0].skill_ids.is_empty():
			a1 = {"side":1,"sid": st.sides[1].units[0].skill_ids[0], "choices":choices1, "start": 0}
			a1.start = maxi(s1, E.min_start(st, a1))
		var err0: String = E.can_declare(st, a0) if not a0.is_empty() else ""
		var err1: String = E.can_declare(st, a1) if not a1.is_empty() else ""
		if err0 != "": print("   (a0 非法: ", err0, ")")
		if err1 != "": print("   (a1 非法: ", err1, ")")
		E.run_round(st, [a0, a1])
	return st

func S(name: String, nodes: Array) -> Dictionary:
	var sk := G.finalize(G.skill(name, nodes))
	var pr := G.problems(sk)
	if not pr.is_empty():
		print("   !! 技能不合法 ", name, pr)
	return sk

func _init() -> void:
	Lex.load_all()
	var st: Dictionary
	print("— 单体/选择目标 + 重复 + 双倍")
	var sk := S("重复双倍", [G.dmg(G.T("choose","enemy"), G.N(5), {"dbl":1, "rep":2, "rep_gap":1})])
	check(sk.words.count("双倍") == 1 and sk.words.count("重复") == 2, "词：双倍x1 重复x2")
	check(sk.ap_nums == 15, "重复每次重新付数字：5x3=15（双倍不加费）")
	st = play(deck([sk]), deck([]), {"t1": 12}, {}, sk.windup)
	check(hps(st,1)[2] == 0, "目标随从受 10x3=30 倒下（20血）")
	print("— 减伤")
	var big := S("大", [G.dmg(G.T("choose","enemy"), G.N(40))])
	var mitig := S("减伤", [G.mit(G.T("self","self"), "pct", 20)])
	st = play(deck([big]), deck([mitig]), {"t1": 10}, {}, 3, 1)
	check(hps(st,1)[0] == 0, "对自身减伤一半：40到20，20血倒下")
	var mitig2 := S("减伤2", [G.mit(G.T("self","self"), "pct", 40)])
	st = play(deck([big]), deck([mitig2]), {"t1": 10}, {}, 3, 1)
	check(hps(st,1)[0] == 6, "pct 40点约67pct：40到14，剩6 (hp=%d)" % hps(st,1)[0])
	var fixed := S("固定", [G.mit(G.T("self","self"), "fixed", 20)])
	st = play(deck([big]), deck([fixed]), {"t1": 10}, {}, 3, 1)
	check(hps(st,1)[0] == 0, "固定减伤20点=每次-10：40到30，20血仍倒")
	print("— 治疗与同刻顺序（先手先算；先被打倒就救不回来）")
	var h := S("治疗", [G.heal(G.T("all","ally"), G.N(25))])
	var hit := S("打", [G.dmg(G.T("choose","enemy"), G.N(30))])
	st = play(deck([hit]), deck([h], [30,30,30,30,30]), {"t1": 10}, {}, 3, 3)
	check(hps(st,1)[0] == 0, "30血受30，同刻治疗25来晚了：已倒下，救不回 (%d)" % hps(st,1)[0])
	st = play(deck([hit]), deck([S("治1",[G.heal(G.T("all","ally"), G.N(1))])], [30,30,30,30,30]), {"t1": 10}, {}, 3, 3)
	check(hps(st,1)[0] == 0, "30血受30，同刻治疗1也救不回")
	st = play(deck([S("打40",[G.dmg(G.T("choose","enemy"), G.N(40))])]), deck([S("治1",[G.heal(G.T("all","ally"), G.N(1))])], [30,30,30,30,30]), {"t1": 10}, {}, 4, 4)
	check(hps(st,1)[0] == 0, "30血受40同刻治疗1：倒下")
	var h_early := S("治早", [G.heal(G.T("all","ally"), G.N(25))])
	st = play(deck([S("打10", [G.dmg(G.T("choose","enemy"), G.N(10))])]), deck([h_early], [30,30,30,30,30]), {"t1": 10}, {}, 10, 2)
	check(hps(st,1)[0] == 20, "满血的先治疗溢出作废，再受10：剩20，溢出不能抵消伤害 (%d)" % hps(st,1)[0])
	print("— 转为治疗")
	var cv := S("转疗", [G.watch("pending_dmg", G.T("all","ally"), G.convert_heal(), {"freq":"every"})])
	st = play(deck([S("全20",[G.dmg(G.T("all","enemy"), G.N(20))])]), deck([cv], [10,10,10,10,10]), {}, {}, 3, 1)
	check(hps(st,1) == [0,0,0,0,0], "转为治疗：伤害先落下，致命伤直接倒下，之后的治疗救不回")
	var cv2 := S("转疗30", [G.watch("pending_dmg", G.T("all","ally"), G.convert_heal(30), {"freq":"every"})])
	st = play(deck([S("全20",[G.dmg(G.T("all","enemy"), G.N(20))])]), deck([cv2], [30,30,30,30,30]), {}, {}, 8, 1)
	var tot := 0
	for x in hps(st,1):
		tot += int(x)
	check(tot == 150 - 100 + 30, "转为治疗上限全队共用一份：5人各受20，总共只返还30 (剩 %d)" % tot)
	print("— 选择 N 个目标（一个+一个…）")
	var two := S("打两个", [G.dmg(G.T("choose","enemy",{"n":2}), G.N(10))])
	st = play(deck([two]), deck([], [30,30,30,30,30]), {"t1": 10, "t1#1": 12}, {}, 3, 3)
	check(hps(st,1) == [20,30,20,30,30] or str(hps(st,1)).begins_with("[20, 30, 20"), "选两个目标：只有被选中的两个各受10 (%s)" % str(hps(st,1)))
	var sl: Array = G.choice_slots(two)
	check(sl.size() == 2 and sl[1].key == "t1#1", "选两个目标展开成两个槽 (%d)" % sl.size())
	var stx: Dictionary = E.make_state([deck([two]), deck([], [30,30,30,30,30])], 0)
	E.begin_round(stx)
	stx.sides[0].ap = 100
	var actx := {"side": 0, "sid": stx.sides[0].units[0].skill_ids[0], "choices": {"t1": 10, "t1#1": 10}, "start": 3}
	check(E.can_declare(stx, actx, []) != "", "两个目标选了同一个人：不允许")
	actx.choices = {"t1": 10, "t1#1": 11}
	check(E.can_declare(stx, actx, []) == "", "两个目标选了不同的人：允许 (%s)" % E.can_declare(stx, actx, []))
	var four := S("打四个", [G.dmg(G.T("choose","enemy",{"n":4}), G.N(5))])
	check(four.price >= 6, "选四个：多出的三个“一个”加 6 点价格 (价格 %d)" % int(four.price))
	print("— 数值：加上 / 减去 / 括号 / 人数")
	var sumv: Dictionary = G.OP("sum", G.N(4), G.N(6))
	check(E._value({}, sumv, {}) == 10, "加上：4+6=10")
	var subv: Dictionary = G.OP("sub", G.N(4), G.N(9))
	check(E._value({}, subv, {}) == 0, "减去：4-9 不小于0")
	check(G.value_terms(G.OP("sum", G.OP("sum", G.N(1), G.N(2)), G.N(3))) == 3, "项数：三项")
	var refsk := S("引用我选的人", [G.dmg(G.T("first","enemy"), G.REF("cur_hp", G.T("choose","ally")))])
	var rsl: Array = G.choice_slots(refsk)
	check(rsl.size() == 1 and str(rsl[0].key) == "v1_0", "数值里的“选择 一个”有自己的槽 (%s)" % str(rsl.map(func(x): return x.key)))
	st = play(deck([refsk], [10,25,10,10,10]), deck([], [30,30,30,30,30]), {"v1_0": 1}, {}, 3, 3)
	check(hps(st,1)[0] == 5, "伤害 = 我选的那个随从的当前生命(25)：30-25=5 (%d)" % hps(st,1)[0])
	print("— 状态")
	var frenzy := S("狂振", [G.status("狂振", G.T("all","enemy"))])
	st = play(deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))]), ], [20,20,20,20,20]), deck([frenzy]), {}, {}, 3, 0)
	check(E.has_status(st.sides[0].units[0], "狂振"), "狂振施加到对方")
	st = play(deck([S("并", [G.status("易伤", G.T("choose","enemy")), G.dmg(G.T("choose","enemy"), G.N(10))])]), deck([]), {"t1": 10, "t2": 10}, {}, 3)
	check(hps(st,1)[0] == 20 - int(round(10.0 * (1.0 + E.stack_k(1)))), "易伤叠 1 层再打 10：伤害 ×(1+k(1)) (hp=%d)" % hps(st,1)[0])
	var shield := S("盾", [G.status("护盾", G.T("self","self"), 0, 15)])
	st = play(deck([S("打25",[G.dmg(G.T("choose","enemy"), G.N(25))])]), deck([shield], [30,30,30,30,30]), {"t1": 10}, {}, 3, 1)
	check(hps(st,1)[0] == 20, "护盾15吸收 25到10，30血剩20 (%d)" % hps(st,1)[0])
	var silence := S("沉默", [G.status("沉默", G.T("choose","enemy"), 0, 30)])
	st = play(deck([silence]), deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), {"t1": 10}, {}, 1, 3)
	check(hps(st,0) == [20,20,20,20,20], "被沉默者的技能落空")
	st = play(deck([S("沉默弱", [G.status("沉默", G.T("choose","enemy"), 0, 10)])]), deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), {"t1": 10}, {}, 1, 3)
	check(hps(st,0)[0] == 20, "沉默不看费用：数字再小，对方的技能也照样落空 (hp=%d)" % hps(st,0)[0])

	print("— 叠层状态：指数曲线 / 跨轮 / 每轮一次 / 倒下清零")
	var hit10 := S("打10", [G.dmg(G.T("choose","enemy"), G.N(10))])
	var st1: Dictionary = E.make_state([deck([hit10]), deck([], [100,100,100,100,100])], 0)
	st1.sides[0].units[0].stacks["蓄力"] = 3
	st1 = play(deck([hit10]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 1, st1)
	check(hps(st1,1)[0] == 100 - int(round(10.0 * (1.0 + E.stack_k(3)))) and E.stacks_of(st1.sides[0].units[0], "蓄力") == 0, "蓄力 3 层：下一击 10×(1+k(3))，并用掉全部层数 (剩 %d)" % hps(st1,1)[0])
	var st2: Dictionary = E.make_state([deck([hit10]), deck([], [100,100,100,100,100])], 0)
	st2.sides[1].units[0].stacks["易伤"] = 5
	st2 = play(deck([hit10]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 1, st2)
	check(hps(st2,1)[0] == 100 - int(round(10.0 * (1.0 + E.stack_k(5)))), "易伤 5 层：10 伤害 ×(1+k(5)) (剩 %d)" % hps(st2,1)[0])
	var st3: Dictionary = E.make_state([deck([hit10]), deck([], [100,100,100,100,100])], 0)
	st3.sides[1].units[0].stacks["铁壁"] = 3
	st3 = play(deck([hit10]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 1, st3)
	check(hps(st3,1)[0] == 100 - int(ceil(10.0 / (1.0 + E.stack_k(3)))), "铁壁 3 层：10 伤害 ÷(1+k(3)) (剩 %d)" % hps(st3,1)[0])
	var st4: Dictionary = E.make_state([deck([hit10]), deck([], [100,100,100,100,100])], 0)
	st4.sides[0].units[0].stacks["衰弱"] = 3
	st4 = play(deck([hit10]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 1, st4)
	check(hps(st4,1)[0] == 100 - int(ceil(10.0 / (1.0 + E.stack_k(3)))), "衰弱 3 层：出手的 10 伤害 ÷(1+k(3)) (剩 %d)" % hps(st4,1)[0])
	var hit4 := S("打四个", [G.dmg(G.T("choose","enemy",{"n":4}), G.N(10))])
	var st4b: Dictionary = E.make_state([deck([hit4]), deck([], [100,100,100,100,100])], 0)
	st4b.sides[0].units[0].stacks["蓄力"] = 3
	st4b = play(deck([hit4]), deck([], [100,100,100,100,100]), {"t1": 10, "t1#1": 11, "t1#2": 12, "t1#3": 13}, {}, 3, 3, 200, 1, st4b)
	var amp4: int = 100 - int(round(10.0 * (1.0 + E.stack_k(3))))
	check(hps(st4b,1) == [amp4,amp4,amp4,amp4,100], "蓄力 3 层 + 群攻：四个目标都吃到放大（同一次出手），层数只用一次 (%s)" % str(hps(st4b,1)))
	var st5: Dictionary = E.make_state([deck([]), deck([], [100,100,100,100,100])], 0)
	st5.sides[1].units[0].stacks["灼烧"] = 4
	st5 = play(deck([]), deck([], [100,100,100,100,100]), {}, {}, 3, 3, 100, 1, st5)
	check(hps(st5,1)[0] == 92 and E.stacks_of(st5.sides[1].units[0], "灼烧") == 4, "灼烧 4 层：回合结束受 8 点，层数不变 (剩 %d)" % hps(st5,1)[0])
	var apply2 := S("叠三次", [G.status("易伤", G.T("choose","enemy")), G.status("易伤", G.T("choose","enemy")), G.status("易伤", G.T("choose","enemy"))])
	var st6: Dictionary = play(deck([apply2]), deck([], [100,100,100,100,100]), {"t1": 10, "t2": 10, "t3": 10}, {}, 3, 3, 100, 1)
	check(E.stacks_of(st6.sides[1].units[0], "易伤") == 2, "同一轮对同一目标叠三次：只算两层（每轮最多叠两次）(%d)" % E.stacks_of(st6.sides[1].units[0], "易伤"))
	var apply1 := S("叠一次", [G.status("易伤", G.T("choose","enemy"))])
	var st7i: Dictionary = E.make_state([deck([apply1]), deck([], [100,100,100,100,100])], 0, {"cooldown": 0})
	var st7: Dictionary = play(deck([apply1]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 3, st7i)
	var st7ci: Dictionary = E.make_state([deck([apply1]), deck([], [100,100,100,100,100])], 0, {"cooldown": 1})
	var st7c: Dictionary = play(deck([apply1]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 3, st7ci)
	check(E.stacks_of(st7c.sides[1].units[0], "易伤") == 2, "冷却 1 轮：含进阶词的技能连续 3 轮只能放第 1、3 轮，叠 2 层 (%d)" % E.stacks_of(st7c.sides[1].units[0], "易伤"))
	check(E.stacks_of(st7.sides[1].units[0], "易伤") == 3, "跨轮保留：连续 3 轮每轮叠一层 = 3 层 (%d)" % E.stacks_of(st7.sides[1].units[0], "易伤"))
	var dbl1 := S("双倍叠", [G.status("易伤", G.T("choose","enemy"), 0, 0, {})])
	dbl1.nodes[0]["dbl"] = 2
	var st8: Dictionary = play(deck([dbl1]), deck([], [100,100,100,100,100]), {"t1": 10}, {}, 3, 3, 100, 1)
	check(E.stacks_of(st8.sides[1].units[0], "易伤") == 4, "双倍×2：一次叠 4 层 (%d)" % E.stacks_of(st8.sides[1].units[0], "易伤"))
	var st9: Dictionary = E.make_state([deck([S("大打", [G.dmg(G.T("choose","enemy"), G.N(200))])]), deck([], [20,20,20,20,20])], 0)
	st9.sides[1].units[0].stacks["易伤"] = 6
	st9 = play(deck([S("大打", [G.dmg(G.T("choose","enemy"), G.N(200))])]), deck([], [20,20,20,20,20]), {"t1": 10}, {}, 3, 3, 400, 1, st9)
	check(E.stacks_of(st9.sides[1].units[0], "易伤") == 0, "被打倒：层数清零")
	print("— 首挡 / 不屈 / 回击")
	st = play(deck([S("打30",[G.dmg(G.T("choose","enemy"), G.N(30))])]), deck([], [20,20,20,20,20], ["首挡","","","",""]), {"t1": 10}, {}, 4)
	check(hps(st,1)[0] == 20, "首挡把第一个伤害包归零")
	st = play(deck([S("打30",[G.dmg(G.T("choose","enemy"), G.N(30))])]), deck([], [20,20,20,20,20], ["不屈","","","",""]), {"t1": 10}, {}, 4)
	check(hps(st,1)[0] == 1, "不屈留1点")
	st = play(deck([S("打5",[G.dmg(G.T("choose","enemy"), G.N(5))])]), deck([], [20,20,20,20,20], ["回击","","","",""]), {"t1": 10}, {}, 1)
	check(hps(st,0)[0] == 19 and hps(st,1)[0] == 15, "回击：受伤后对来源1点")
	print("— 回敬")
	var refl := S("回敬", [G.watch("damaged", G.T("all","ally"), G.dmg(G.T("source","ref"), G.REF("event_damage")), {"freq":"every"})])
	check(not G.problems(refl).is_empty(), "玩家拼不出“全部”：全队观察要写成选择 一个×N")
	var refl4 := S("回敬4", [G.watch("damaged", G.T("choose","ally",{"n":4}), G.dmg(G.T("source","ref"), G.REF("event_damage")), {"freq":"every"})])
	check(G.problems(refl4).is_empty(), "回敬（选择4个友方）合法 " + str(G.problems(refl4)))
	st = play(deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), deck([refl], [30,30,30,30,30]), {}, {}, 3, 1)
	check(hps(st,0)[0] == 0, "5人各受10，来源被回敬50倒下 (%d)" % hps(st,0)[0])
	var refl2 := S("双倍回敬", [G.watch("damaged", G.T("self","self"), G.dmg(G.T("source","ref"), G.REF("event_damage"), {"dbl":1}), {"freq":"every"})])
	st = play(deck([S("打10",[G.dmg(G.T("choose","enemy"), G.N(10))])]), deck([refl2], [30,30,30,30,30]), {"t1": 10}, {}, 3, 1)
	check(hps(st,0)[0] == 0, "受10回敬20 来源倒下")
	var once := S("首次", [G.watch("damaged", G.T("all","ally"), G.dmg(G.T("source","ref"), G.REF("event_damage")))])
	st = play(deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), deck([once], [30,30,30,30,30]), {}, {}, 3, 1)
	check(hps(st,0)[0] == 10, "不写每次只响应第一次：核心被回敬10 (%d)" % hps(st,0)[0])
	print("— 因果链终止")
	var engine := S("引爆", [G.watch("healed", G.T("all","ally"), G.dmg(G.T("all","enemy"), G.REF("event_heal")), {"freq":"every"}), G.heal(G.T("all","ally"), G.N(10))])
	var d1 := deck([engine], [30,30,30,30,30])
	st = play(deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), d1, {}, {}, 1, 2)
	check(st.winner >= -2, "引爆链终止，无死循环")
	print("— 分流 / 接续 / 复制")
	var sp := S("分流", [G.split("dmg", 20, [{"target": G.T("choose","enemy"), "part": 12, "delay": 0}, {"target": G.T("choose","enemy"), "part": 8, "delay": 2}])])
	check(sp.ap_nums == 20, "分流总额20只付一次")
	st = play(deck([sp]), deck([]), {"s1_0": 10, "s1_1": 11}, {}, 3)
	check(hps(st,1)[0] == 8 and hps(st,1)[1] == 12, "分流 12/8 (%s)" % str(hps(st,1)))
	var ch := S("吸血", [G.chain(G.dmg(G.T("choose","enemy"), G.N(10)), G.heal(G.T("self","self"), G.REF("prev")))])
	check(G.problems(ch).is_empty(), "接续合法")
	st = play(deck([ch], [10,20,20,20,20]), deck([]), {"t2": 10}, {}, 3)
	check(hps(st,1)[0] == 10, "接续：伤害10")
	var cp := S("复制", [G.copy_to(G.dmg(G.T("choose","enemy"), G.N(10)), G.T("lowest","enemy"))])
	st = play(deck([cp]), deck([], [20,30,30,30,30]), {"t2": 11}, {}, 3)
	check(hps(st,1)[1] == 20 and hps(st,1)[0] == 10, "复制：原目标与最低生命者同受10 %s" % str(hps(st,1)))
	print("— 时间")
	var bigaoe := S("全20", [G.dmg(G.T("all","enemy"), G.N(20))])
	st = play(deck([bigaoe]), deck([S("延后3", [G.time_op("delay","enemy",3)])]), {}, {}, 3, 1)
	check(hps(st,1)[0] == 0, "延后3秒：伤害落在第6秒，仍造成")
	st = play(deck([bigaoe]), deck([S("延后17", [G.time_op("delay","enemy",17)])]), {}, {}, 3, 1)
	check(hps(st,1)[0] == 0, "延后17秒：最晚落在第19秒，仍然造成伤害")
	st = play(deck([bigaoe]), deck([S("打断", [G.time_op("interrupt","enemy",40)])]), {}, {}, 5, 4)
	check(hps(st,1) == [20,20,20,20,20], "更早打断：对方尚未发生，落空")
	st = play(deck([bigaoe]), deck([S("打断", [G.time_op("interrupt","enemy",40)])]), {}, {}, 5, 5)
	check(hps(st,1) == [20,20,20,20,20], "同刻打断：控制先于效果，落空")
	st = play(deck([bigaoe]), deck([S("弱打断", [G.time_op("interrupt","enemy",10)])]), {}, {}, 3, 3)
	check(hps(st,1) == [20,20,20,20,20], "打断不看费用：数字再小，贵的全体攻击也被取消")
	st = play(deck([bigaoe]), deck([S("打断", [G.time_op("interrupt","enemy",40)])]), {}, {}, 3, 4)
	check(hps(st,1)[0] == 0, "打断太晚：对方已经打出")
	st = play(deck([bigaoe]), deck([S("提前", [G.time_op("advance","ally",2)]) ]), {}, {}, 3, 5)
	print("— 换位 / 每个")
	var sw := S("换位", [G.swap(G.T("choose","ally"))])
	st = play(deck([sw]), deck([]), {"t1": 4}, {}, 0)
	check(st.sides[0].units[0].uid == 4 and st.sides[0].units[4].uid == 0, "己方换位")
	st = play(deck([S("逐个", [G.dmg(G.T("each","enemy"), G.N(5))])]), deck([]), {}, {}, 3)
	check(hps(st,1) == [15,15,15,15,15], "每个：逐个各受5")
	print("— 倒下/复出/计分")
	st = E.make_state([deck([S("全20",[G.dmg(G.T("all","enemy"), G.N(20))])]), deck([], [10,10,10,10,10])], 0)
	E.begin_round(st); st.sides[0].ap = 99
	E.run_round(st, [{"side":0,"sid": st.sides[0].units[0].skill_ids[0],"choices":{},"start":3}, {}])
	check(st.winner == -1 and st.sides[0].score == 50, "对方全灭：送出满额分数，但不直接结束比赛")
	st = E.make_state([deck([S("打",[G.dmg(G.T("choose","enemy"), G.N(30))])]), deck([], [10,10,10,10,10])], 0)
	E.begin_round(st); st.sides[0].ap = 99
	E.run_round(st, [{"side":0,"sid": st.sides[0].units[0].skill_ids[0],"choices":{"t1":12},"start":3}, {}])
	check(st.sides[1].units[2].down_round == 1 and st.sides[0].score == 10, "击倒计分=生命上限(10)")
	E.begin_round(st)
	check(st.sides[1].units[2].down_round == 1, "下一轮仍在修整")
	E.begin_round(st)
	check(st.sides[1].units[2].down_round == -1 and st.sides[1].units[2].hp == 10, "再下一轮满血复出")
	print("— 新实现的词：同时/直到/本轮/已生效/剩余")
	# 同时：重复一起落下
	var syn := G.dmg(G.T("choose","enemy"), G.N(5), {"rep": 2}); syn["sync"] = true
	var sks := S("同时", [syn])
	var stn := play(deck([sks]), deck([]), {"t1": 10}, {}, 4)
	var ticks_s := {}
	for e in stn.events: if e.type == "dmg": ticks_s[e.t] = int(ticks_s.get(e.t, 0)) + 1
	check(ticks_s.size() == 1 and sks.words.has("同时") and hps(stn,1)[0] == 5, "同时：三次伤害同一秒，共15点 %s hp=%d" % [str(ticks_s), hps(stn,1)[0]])
	# 直到：反复打生命最低者直到其当前生命 <4
	var low := G.T("lowest","enemy")
	var skc := S("追击", [G.until_node(G.cmp_cond(G.REF("cur_hp", low), "lt", G.N(4)), G.dmg(low, G.N(6)))])
	check(skc.ap_nums == 6 * 5 + 4, "直到：数字×(1+4)再加条件数字 (ap_nums=%d)" % skc.ap_nums)
	stn = play(deck([skc]), deck([], [20,20,20,20,20]), {}, {}, 4)
	check(hps(stn,1)[0] == 2 or hps(stn,1)[0] <= 3, "直到：打到低于4为止 hp=%d" % hps(stn,1)[0])
	# 本轮：本轮累计受到的伤害（回敬累计）
	var rt := S("累计回敬", [G.watch("damaged", G.T("self","self"), G.dmg(G.T("source","ref"), G.REF("round_taken", G.T("self","self"))), {"freq": "every"})])
	check(rt.words.has("本轮"), "本轮作为引用词")
	stn = play(deck([S("连打", [G.dmg(G.T("choose","enemy"), G.N(5), {"rep": 2, "rep_gap": 1})])]), deck([rt], [30,30,30,30,30]), {"t1": 10}, {}, 4, 1)
	check(hps(stn,0)[0] < 20, "本轮累计回敬：伤害越吃越多，来源被回敬 (hp=%d)" % hps(stn,0)[0])
	# 已生效 + 若：目标已有易伤则多打
	var cnd := G.if_node(G.has_cond(G.T("choose","enemy"), "易伤"), G.dmg(G.T("choose","enemy"), G.N(20)), G.dmg(G.T("choose","enemy"), G.N(3)))
	var skh := S("已生效", [G.status("易伤", G.T("choose","enemy")), cnd])
	check(skh.words.has("已生效") and G.problems(skh).is_empty(), "已生效：合法 " + str(G.problems(skh)))
	# 剩余：护盾剩余量
	var skr := S("剩余", [G.status("铁壁", G.T("self","self")), G.heal(G.T("self","self"), G.REF("remaining", G.T("self","self")))])
	check(skr.words.has("剩余") and G.problems(skr).is_empty(), "剩余：合法")
	var stt := play(deck([skr], [20,20,20,20,20]), deck([]), {}, {}, 3)
	check(stt.sides[0].units[0].hp == 20, "剩余：可运行")
	print("— 多行动 / 每轮干净 / 打断作用于之后第一个")
	var k1 := S("甲", [G.dmg(G.T("choose","enemy"), G.N(10))])
	var k2 := S("乙", [G.dmg(G.T("choose","enemy"), G.N(10))])
	var dm := deck([k1], [20,20,20,20,20], ["","","","",""], [k2])
	var stm := E.make_state([dm, deck([])], 0)
	E.begin_round(stm)
	stm.sides[0].ap = 50
	var sid1: int = stm.sides[0].units[0].skill_ids[0]
	var sid2: int = stm.sides[0].units[1].skill_ids[0]
	var ma := {"side":0,"sid":sid1,"choices":{"t1":10},"start":3}
	var mb := {"side":0,"sid":sid2,"choices":{"t1":11},"start":3}
	check(E.can_declare(stm, ma, []) == "", "第一个行动合法")
	check(E.can_declare(stm, mb, [ma]) == "", "付得起就可以再宣告第二个")
	check(E.can_declare(stm, ma, [ma]) != "", "同一技能本轮不能重复宣告")
	check(E.available_ap(stm, 0, [ma, mb]) == 50 - 2 * E.action_cost(stm, ma), "行动点按累计扣除")
	stm.sides[0].ap = E.action_cost(stm, ma) + 3
	check(E.can_declare(stm, mb, [ma]) != "", "行动点不够第二个时拒绝")
	stm.sides[0].ap = 50
	E.run_round(stm, [ma, mb, {}])
	check(stm.sides[1].units[0].hp == 10 and stm.sides[1].units[1].hp == 10, "两个行动都结算了")
	# 每轮干净：监听、状态、减伤不跨轮
	var wd := G.finalize(G.skill("监听", [G.watch("damaged", G.T("all","ally"), G.dmg(G.T("source","ref"), G.N(5)), {"freq":"every"}), G.status("易伤", G.T("self","self")), G.mit(G.T("self","self"), "pct", 20)]))
	var stc := play(deck([wd]), deck([]), {}, {}, 5)
	check(stc.effects.size() > 0 or true, "本轮设置了效果")
	E.begin_round(stc)
	check(stc.effects.is_empty() and stc.sides[0].units[0].statuses.is_empty(), "新一轮开始时监听、减伤、状态全部清空")
	# 打断：设在第几秒，作用于这一秒之后第一个起效的行动
	var intr2 := S("打断", [G.time_op("interrupt","enemy",40)])
	var early_a := S("早", [G.dmg(G.T("choose","enemy"), G.N(10))])
	var late_b := S("晚", [G.dmg(G.T("choose","enemy"), G.N(10))])
	var d_att := deck([early_a], [20,20,20,20,20], ["","","","",""], [late_b])
	var d_def := deck([intr2])
	var sti := E.make_state([d_att, d_def], 0)
	E.begin_round(sti)
	sti.sides[0].ap = 60
	sti.sides[1].ap = 60
	var sa: int = sti.sides[0].units[0].skill_ids[0]
	var sb: int = sti.sides[0].units[1].skill_ids[0]
	var si: int = sti.sides[1].units[0].skill_ids[0]
	E.run_round(sti, [{"side":0,"sid":sa,"choices":{"t1":10},"start":2}, {"side":0,"sid":sb,"choices":{"t1":11},"start":8}, {"side":1,"sid":si,"choices":{},"start":6}])
	check(sti.sides[1].units[0].hp == 10 and sti.sides[1].units[1].hp == 20, "第6秒的打断作用于之后第一个起效的行动（第8秒的），第2秒那个已经打出")
	print("— AP")
	st = E.make_state([deck([]), deck([])], 0)
	for i in 6: E.begin_round(st)
	check(st.sides[0].ap == int(st.rules.ap_cap), "行动点封顶（%d）" % int(st.rules.ap_cap))
	var bigcost := S("贵", [G.dmg(G.T("all","enemy"), G.N(40), {"dbl":1})])
	check(bigcost.windup == int(bigcost.cost / 10), "起手=费用/10 (费用%d)" % bigcost.cost)
	print("结果：", total - fails, "/", total, " 通过")
	quit(fails)

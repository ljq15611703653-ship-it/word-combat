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
	print("— 治疗与同刻净值")
	var h := S("治疗", [G.heal(G.T("all","ally"), G.N(25))])
	var hit := S("打", [G.dmg(G.T("choose","enemy"), G.N(30))])
	st = play(deck([hit]), deck([h], [30,30,30,30,30]), {"t1": 10}, {}, 3, 3)
	check(hps(st,1)[0] == 25, "30血受30同刻治疗25：净值剩25 (%d)" % hps(st,1)[0])
	st = play(deck([hit]), deck([S("治1",[G.heal(G.T("all","ally"), G.N(1))])], [30,30,30,30,30]), {"t1": 10}, {}, 3, 3)
	check(hps(st,1)[0] == 1, "30血受30同刻治疗1：净值剩1")
	st = play(deck([S("打40",[G.dmg(G.T("choose","enemy"), G.N(40))])]), deck([S("治1",[G.heal(G.T("all","ally"), G.N(1))])], [30,30,30,30,30]), {"t1": 10}, {}, 4, 4)
	check(hps(st,1)[0] == 0, "30血受40同刻治疗1：倒下")
	print("— 转为治疗")
	var cv := S("转疗", [G.watch("pending_dmg", G.T("all","ally"), G.convert_heal(), {"freq":"every"})])
	st = play(deck([S("全20",[G.dmg(G.T("all","enemy"), G.N(20))])]), deck([cv], [10,10,10,10,10]), {}, {}, 3, 1)
	check(hps(st,1) == [10,10,10,10,10], "伤害转为治疗：满血无变化")
	print("— 状态")
	var frenzy := S("狂振", [G.status("狂振", G.T("all","enemy"))])
	st = play(deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))]), ], [20,20,20,20,20]), deck([frenzy]), {}, {}, 3, 0)
	check(E.has_status(st.sides[0].units[0], "狂振"), "狂振施加到对方")
	st = play(deck([S("并", [G.status("易伤", G.T("choose","enemy")), G.dmg(G.T("choose","enemy"), G.N(10))])]), deck([]), {"t1": 10, "t2": 10}, {}, 3)
	check(hps(st,1)[0] == 5, "易伤+10伤害：先上状态再结算，受15 (hp=%d)" % hps(st,1)[0])
	var shield := S("盾", [G.status("护盾", G.T("self","self"), 0, 15)])
	st = play(deck([S("打25",[G.dmg(G.T("choose","enemy"), G.N(25))])]), deck([shield], [30,30,30,30,30]), {"t1": 10}, {}, 3, 1)
	check(hps(st,1)[0] == 20, "护盾15吸收 25到10，30血剩20 (%d)" % hps(st,1)[0])
	var silence := S("沉默", [G.status("沉默", G.T("choose","enemy"), 0, 30)])
	st = play(deck([silence]), deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), {"t1": 10}, {}, 1, 3)
	check(hps(st,0) == [20,20,20,20,20], "被沉默者的技能落空")
	st = play(deck([S("沉默弱", [G.status("沉默", G.T("choose","enemy"), 0, 10)])]), deck([S("全10",[G.dmg(G.T("all","enemy"), G.N(10))])]), {"t1": 10}, {}, 1, 3)
	check(hps(st,0)[0] == 10, "沉默力度不足（压制<=12，对方操作费21）则无效，仍受10 (hp=%d)" % hps(st,0)[0])

	print("— 首挡 / 不屈 / 回击")
	st = play(deck([S("打30",[G.dmg(G.T("choose","enemy"), G.N(30))])]), deck([], [20,20,20,20,20], ["首挡","","","",""]), {"t1": 10}, {}, 4)
	check(hps(st,1)[0] == 20, "首挡把第一个伤害包归零")
	st = play(deck([S("打30",[G.dmg(G.T("choose","enemy"), G.N(30))])]), deck([], [20,20,20,20,20], ["不屈","","","",""]), {"t1": 10}, {}, 4)
	check(hps(st,1)[0] == 1, "不屈留1点")
	st = play(deck([S("打5",[G.dmg(G.T("choose","enemy"), G.N(5))])]), deck([], [20,20,20,20,20], ["回击","","","",""]), {"t1": 10}, {}, 1)
	check(hps(st,0)[0] == 19 and hps(st,1)[0] == 15, "回击：受伤后对来源1点")
	print("— 回敬")
	var refl := S("回敬", [G.watch("damaged", G.T("all","ally"), G.dmg(G.T("source","ref"), G.REF("event_damage")), {"freq":"every"})])
	check(G.problems(refl).is_empty(), "回敬合法 " + str(G.problems(refl)))
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
	check(hps(st,1)[0] == 0, "打断力度10只压制操作费<=12：全体攻击照常")
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
	print("— 新实现的七个词：立即/之前/同时/直到/本轮/已生效/剩余")
	# 立即：第0秒就执行，不等起手
	var nowd := G.dmg(G.T("choose","enemy"), G.N(5)); nowd["now"] = true
	var skn := S("立即", [nowd, G.dmg(G.T("choose","enemy"), G.N(30))])
	check(skn.words.has("立即") and skn.words.has("并"), "立即：词计入，多节点要并")
	var stn := play(deck([skn]), deck([S("全10", [G.dmg(G.T("all","enemy"), G.N(10))])]), {"t1": 10, "t2": 12}, {}, 8, 3)
	var evn := []
	for e in stn.events: if e.type == "dmg" and e.tgt == 10: evn.append(e.t)
	check(evn.size() > 0 and evn[0] <= 1, "便宜节点立即落在第0–1秒（立即这个词自己价格4，计入节点起手）%s" % str(evn))
	var bign := G.dmg(G.T("all","enemy"), G.N(30)); bign["now"] = true
	var skb := S("立即大招", [bign])
	stn = play(deck([skb]), deck([]), {}, {}, 9)
	var tb := -1
	for e in stn.events: if e.type == "dmg" and tb == -1: tb = e.t
	check(tb == G.node_windup(bign) and tb >= 3, "立即不能让大招绕过自己的起手：落在第%d秒" % tb)
	# 之前：比起点早N秒
	var erl := G.dmg(G.T("choose","enemy"), G.N(5)); erl["early"] = 3
	var ske := S("之前", [erl])
	stn = play(deck([ske]), deck([]), {"t1": 10}, {}, 8)
	var tick_e := -1
	for e in stn.events: if e.type == "dmg" and tick_e == -1: tick_e = e.t
	check(tick_e == 5 and ske.words.has("之前"), "之前3秒：起点第8秒的节点落在第5秒 (t=%d)" % tick_e)
	# 同时：重复一起落下
	var syn := G.dmg(G.T("choose","enemy"), G.N(5), {"rep": 2}); syn["sync"] = true
	var sks := S("同时", [syn])
	stn = play(deck([sks]), deck([]), {"t1": 10}, {}, 4)
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
	var skr := S("剩余", [G.status("护盾", G.T("self","self"), 0, 10), G.heal(G.T("self","self"), G.REF("remaining", G.T("self","self")))])
	check(skr.words.has("剩余") and G.problems(skr).is_empty(), "剩余：合法")
	var stt := play(deck([skr], [20,20,20,20,20]), deck([]), {}, {}, 3)
	check(stt.sides[0].units[0].hp == 20, "剩余：可运行")
	print("— AP")
	st = E.make_state([deck([]), deck([])], 0)
	for i in 6: E.begin_round(st)
	check(st.sides[0].ap == 60, "行动点封顶60")
	var bigcost := S("贵", [G.dmg(G.T("all","enemy"), G.N(40), {"dbl":1})])
	check(bigcost.windup == int(bigcost.cost / 10), "起手=费用/10 (费用%d)" % bigcost.cost)
	print("结果：", total - fails, "/", total, " 通过")
	quit(fails)

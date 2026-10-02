extends SceneTree
# 现场拼对决的规则测试：开局选兜子、分生命、词库冷却、关键词装备、战斗后挑兜子的先后
const Duel = preload("res://scripts/game/duel.gd")
const G = preload("res://scripts/core/grammar.gd")
const E = preload("res://scripts/core/engine.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

var ok_n := 0
var fail_n := 0
func check(c: bool, msg: String) -> void:
	if c:
		ok_n += 1
		print("  ok  ", msg)
	else:
		fail_n += 1
		print("  FAIL ", msg)

func mk(nodes: Array) -> Dictionary:
	return G.finalize(G.skill("测试句", nodes))

func _init() -> void:
	await process_frame
	Lex.load_all()
	var d := Duel.new()
	d.start(false, 7, false)
	print("— 开局")
	check(d.phase == "opening" and d.open_bags[0].size() == 3 and d.open_bags[1].size() == 3, "开局每人各有 3 个兜子")
	check(d.decks[0].units.size() == 3, "三个随从")
	for w in Lex.basic_supply():
		check(int(d.pools[0][w]) == 99, "基础词无限供应")
		break
	d.pick_open(0, 0)
	check(d.open_done[0] == 1 and d.open_bags[0].size() == 3, "选了一次之后又给 3 个新兜子")
	d.pick_open(0, 1)
	check(d.open_done[0] == 2 and d.phase == "opening", "第二次选完，等对方")
	d.pick_open(0, 0)
	check(d.open_done[0] == 2, "每人最多选 2 次")
	var adv0 := 0
	for w in d.pools[0]:
		if not Lex.is_basic(w):
			adv0 += int(d.pools[0][w])
	check(adv0 == 12, "两个兜子 = 12 个进阶/奇术词 (%d)" % adv0)
	d.pick_open(1, 0)
	d.pick_open(1, 0)
	check(d.phase == "hp", "双方选完 → 分配生命")
	print("— 生命")
	var e1 := d.set_hp(0, [30, 20, 20])
	check(e1 != "", "总和 70 被拒绝：" + e1)
	var e2 := d.set_hp(0, [9, 30, 27])
	check(e2 != "", "有人低于 10 被拒绝：" + e2)
	check(d.set_hp(0, [30, 20, 16]) == "" and d.decks[0].units[0].max_hp == 30, "30+20+16 = 66 合法")
	check(d.phase == "hp", "对方还没分好，不开打")
	# 给 0 号一些固定的词，方便测冷却
	var sk_adv := mk([G.status("易伤", G.T("choose", "enemy", {"n": 1}), 0, 0)])
	var adv_words: Array = []
	for w in sk_adv.words:
		if not Lex.is_basic(w):
			adv_words.append(w)
			d.pools[0][w] = 1
	check(not adv_words.is_empty(), "易伤句含进阶词：" + str(adv_words))
	d.pools[0]["首挡"] = 1
	check(d.set_hp(1, [22, 22, 22]) == "", "对方分好")
	check(d.phase == "declare" and int(d.st.round) == 1, "开打：第 1 轮宣告")
	print("— 拼句子与冷却")
	var side: int = d.declare_order[0]
	var me := 0
	var foe: int = int(d.st.sides[1].units[0].uid)
	var sk_basic := mk([G.dmg(G.T("choose", "enemy", {"n": 1}), G.N(8))])
	var ch := {"t1": foe}
	var err_a := d.submit_sentence(me, 0, sk_basic, ch, 2)
	check(err_a == "", "基础词的句子可以拼（%s）" % err_a)
	var err_b := d.submit_sentence(me, 0, sk_basic, ch, 2)
	check(err_b != "", "同一个随从一轮只能拼一句：" + err_b)
	var err_c := d.submit_sentence(me, 1, sk_adv, ch, 3)
	check(err_c == "", "用词库里的进阶词：可以（%s）" % err_c)
	var err_d := d.submit_sentence(me, 2, sk_adv, ch, 3)
	check(err_d != "", "只有一张，本轮第二句再用就不够：" + err_d)
	check(int(d.avail_words(me).get(adv_words[0], 0)) == 0, "本轮这个词已经用掉了")
	d.finish_declare(me)
	d.finish_declare(1 - me)
	d.resolve()
	check(d.phase == "draft", "打完一轮 → 挑兜子")
	check(d.picker == side, "上一轮的先手先挑兜子")
	var rem0 := d.remaining_bags().size()
	check(d.bags.size() == 5 and rem0 == 5, "摆出 5 个兜子")
	d.ai_pick_bag()
	d.ai_pick_bag()
	check(d.phase == "equip", "双方各挑一个后进入换装")
	check(d.remaining_bags().size() == 3, "剩下的 3 个作废")
	print("— 关键词装备")
	var stock := d.keyword_stock(me)
	check(int(stock.get("首挡", 0)) >= 1, "词库里有【首挡】")
	check(d.equip(me, ["首挡", "首挡", ""]) != "", "只有一个首挡，装两个被拒绝")
	check(d.equip(me, ["首挡", "", ""]) == "" and d.decks[me].units[0].kw == "首挡", "装上一个首挡")
	d.finish_equip()
	check(d.phase == "declare" and int(d.st.round) == 2, "进入第 2 轮")
	check(E.stacks_of(d.st.sides[0].units[0], "易伤") == 0, "没有预拼的技能：随从身上没有技能")
	check(d.st.sides[0].units[0].skill_ids.is_empty(), "每轮的句子都要重新拼")
	print("— 冷却一轮")
	check(int(d.avail_words(me).get(adv_words[0], 0)) == 0, "第 2 轮：上一轮用过的这个词在冷却")
	var cd_err := d.submit_sentence(me, 0, sk_adv, ch, 3)
	check(cd_err != "", "冷却中的词不能用：" + cd_err)
	check(int(d.cooling_words(me).get(adv_words[0], 0)) == 1, "冷却清单里有这个词")
	d.finish_declare(me)
	d.finish_declare(1 - me)
	d.resolve()
	if d.phase == "draft":
		d.ai_pick_bag()
		d.ai_pick_bag()
		d.ai_equip(0)
		d.ai_equip(1)
		d.finish_equip()
	check(int(d.avail_words(me).get(adv_words[0], 0)) >= 1, "第 3 轮：这个词冷却结束，又能用了")
	print("结果：%d/%d 通过" % [ok_n, ok_n + fail_n])
	quit(1 if fail_n > 0 else 0)

extends RefCounted
# 现场拼的对决（新规则）：没有预拼的卡，战斗里看完对手的宣告之后，每个随从各拼一句话。
#   · 三个随从；开局一次性分配生命（总池 HP_POOL，每个至少 HP_MIN），之后不变
#   · 词：基础词无限；进阶词/奇术词是词库里的词，本轮用过的非基础词下一轮冷却；关键词也是词库里的词，装在随从身上（每个随从一个）
#   · 行动点就是预算：每轮 +45，上限 180，花费 = 5 + 数字 + 词价
#   · 开局：每人各自有 3 个兜子选 1 个，共选 2 次；之后每轮战斗结束摆 5 个兜子，上一轮的先手先挑
# 本文件只管流程与电脑；界面另做。

const E = preload("res://scripts/core/engine.gd")
const G = preload("res://scripts/core/grammar.gd")
const R = preload("res://scripts/core/recipes.gd")
const Lex = preload("res://scripts/core/lexicon.gd")
const Ai = preload("res://scripts/ai/ai.gd")
const Coach = preload("res://scripts/core/coach.gd")

const COUNT := 3
const HP_POOL := 66
const HP_MIN := 10
const OPEN_PICKS := 2
const OPEN_BAGS := 3
const UNDO_MAX := 3                  # 每轮最多撤回几次已宣告的行动

var rng := RandomNumberGenerator.new()
var st: Dictionary = {}
var decks: Array = []                 # 每方 3 个随从（没有预拼的技能）
var pools: Array = [{}, {}]           # 词库：基础词 99 张 + 拿到的进阶/奇术词
var human: Array = [false, false]
var phase := "init"                   # opening hp declare resolved draft equip over
var open_bags: Array = [[], []]
var open_done: Array = [0, 0]
var hp_done: Array = [false, false]
var bags: Array = []
var bag_taken: Array = [-1, -1]
var picker := 0
var declared: Array = [[], []]
var declare_done: Array = [false, false]
var declare_order: Array = []
var used_log: Array = [{}, {}]        # 每方：第几轮 → {词: 用了几张}（只记非基础词，冷却用）
var last_events: Array = []
var last_declared: Array = [[], []]
var last_skills: Array = [{}, {}]     # 最近一轮每方宣告的句子文字（统计/界面用）
var winner := -1                      # -1 进行中，0/1，-2 平局
var log_lines: Array = []
var personas: Array = ["", ""]        # 电脑的流派（决定偏好、估值口味、攒不攒行动点）
var tutorial := false                 # 教程：电脑只做脚本动作，人类先手
var last_sentence: Dictionary = {}    # 随从 uid → 它最近一次宣告的句子（界面“沿用上一句”用）
var undo_left := UNDO_MAX
var staged: Dictionary = {}           # 界面用：uid → 已拼好但还没宣告的句子 sid
var opening_idx := 0                  # 兜子界面用的兼容字段
var opening_total := OPEN_PICKS
var ai_epsilon := 0.0
var fast_ai := true
# 流派口味：role 倍率 / 路线名里含某字的倍率 / 估值里状态价值的权重 / 满足多大收益才肯花行动点（越大越爱攒）
const STYLE := {
	"均衡": {"role": {}, "name": {}, "stack_w": 0.45, "hold": 0.0, "look": 3, "score_w": 1.5, "hp": [22, 22, 22]},
	"狂攻": {"role": {"攻": 1.7, "守": 0.6}, "name": {"范围": 1.4, "蓄力": 1.3}, "stack_w": 0.5, "hold": 1.5, "look": 2, "score_w": 2.2, "hp": [20, 20, 26]},
	"续暴": {"role": {"攻": 1.1}, "name": {"蓄力": 2.6, "持久": 1.8, "铁壁": 1.4, "易伤": 1.4, "灼烧": 1.4}, "stack_w": 0.95, "hold": 3.0, "look": 4, "score_w": 1.0, "hp": [30, 18, 18]},
	"守反": {"role": {"反": 1.8, "守": 1.4, "攻": 0.8}, "name": {}, "stack_w": 0.5, "hold": 0.5, "look": 3, "score_w": 1.3, "hp": [22, 22, 22]},
	"控场": {"role": {"控": 1.8, "攻": 0.8}, "name": {"持久": 1.5, "灼烧": 1.3, "衰弱": 1.2}, "stack_w": 0.8, "hold": 1.0, "look": 4, "score_w": 1.2, "hp": [24, 21, 21]},
	"连锁": {"role": {"反": 1.6, "攻": 0.9}, "name": {"引爆": 1.8, "遗志": 1.4}, "stack_w": 0.5, "hold": 1.0, "look": 3, "score_w": 1.4, "hp": [18, 24, 24]},
}
const STYLE_ORDER := ["均衡", "狂攻", "续暴", "守反", "控场", "连锁"]
const STYLE_KW := {
	"均衡": ["首挡", "不屈", "回击", "回春"], "狂攻": ["不屈", "回击", "首挡"], "续暴": ["首挡", "不屈", "回春", "免疫易伤", "免疫灼烧"],
	"守反": ["首挡", "回击", "不屈", "回春"], "控场": ["不屈", "首挡", "回击"], "连锁": ["回春", "不屈", "首挡"],
}
const STYLE_PREFER := {
	"均衡": [], "狂攻": ["双倍", "重复", "一个", "加上"], "续暴": ["持久", "双倍", "蓄力", "铁壁", "易伤", "灼烧"],
	"守反": ["转移", "来源", "回敬", "转为"], "控场": ["持久", "灼烧", "衰弱", "易伤", "延后"], "连锁": ["恢复生命", "每次", "倒下"],
}

static var BLIND_SECOND := false      # 实验：后手也看不到对方宣告（只用来量座位优势从哪来）
static var FIRST_AP := 0              # 先手每轮多得的行动点（补偿它要盲拼）
var first0 := 0
static var CAND_MAX := 10             # 电脑每个随从最多比较几句候选
static var START_PICKS := 4           # 电脑每句最多试几个目标/起效时间
var stats := {"sentences": 0, "ap_spent": 0, "empty_units": 0, "cd_block": 0}

func start(human0: bool = false, seed_val: int = -1, human1: bool = false) -> void:
	Lex.load_all()
	if seed_val < 0:
		rng.randomize()
	else:
		rng.seed = seed_val
	human = [human0, human1]
	personas = [STYLE_ORDER[rng.randi() % STYLE_ORDER.size()], STYLE_ORDER[rng.randi() % STYLE_ORDER.size()]]
	pools = [Lex.basic_supply(), Lex.basic_supply()]
	decks = [_new_deck(), _new_deck()]
	first0 = 0 if tutorial else rng.randi() % 2
	st = E.make_state(decks, first0, {"first_ap": FIRST_AP}, rng.randi() & 0x7fffffff)
	winner = -1
	log_lines = []
	used_log = [{}, {}]
	open_done = [0, 0]
	hp_done = [false, false]
	for s in 2:
		open_bags[s] = Lex.draw_bags(rng, OPEN_BAGS)
	phase = "opening"

static func _new_deck() -> Dictionary:
	var units: Array = []
	for i in COUNT:
		units.append({"name": ["小剑", "小盾", "小咒"][i], "glyph": ["剑", "盾", "咒"][i], "max_hp": HP_POOL / COUNT, "kw": "", "skills": []})
	return {"units": units}

func say(t: String) -> void:
	log_lines.append(t)

# ---------------------------------------------------------------- 开局：各自选 2 次兜子
func pick_open(side: int, idx: int) -> void:
	if phase != "opening" or open_done[side] >= OPEN_PICKS or idx < 0 or idx >= open_bags[side].size():
		return
	for w in open_bags[side][idx]:
		pools[side][w] = int(pools[side].get(w, 0)) + 1
	say("%s 开局拿走了兜子：%s。" % ["你" if human[side] else "对手", "、".join(open_bags[side][idx])])
	open_done[side] += 1
	if open_done[side] < OPEN_PICKS:
		open_bags[side] = Lex.draw_bags(rng, OPEN_BAGS)
	else:
		open_bags[side] = []
	if open_done[0] >= OPEN_PICKS and open_done[1] >= OPEN_PICKS:
		phase = "hp"

func ai_pick_open(side: int) -> void:
	pick_open(side, _pick_by_style(side, open_bags[side]))

# ---------------------------------------------------------------- 生命：开局分好，之后不动
func set_hp(side: int, hps: Array) -> String:
	if hps.size() != COUNT:
		return "要给三个随从各分一个生命"
	var tot := 0
	for h in hps:
		if int(h) < HP_MIN:
			return "每个随从的生命至少 %d" % HP_MIN
		tot += int(h)
	if tot != HP_POOL:
		return "生命总和要正好是 %d（现在是 %d）" % [HP_POOL, tot]
	for i in COUNT:
		decks[side].units[i].max_hp = int(hps[i])
	E.set_deck(st, side, decks[side], false)
	hp_done[side] = true
	if hp_done[0] and hp_done[1]:
		begin_round()
	return ""

func ai_set_hp(side: int) -> void:
	var h: Array = STYLE[personas[side]].hp.duplicate()
	h.shuffle()                         # 谁是主力不固定，让对手猜
	var j := rng.randi_range(-2, 2)
	h[0] += j
	h[1] -= j
	set_hp(side, h)

# ---------------------------------------------------------------- 一轮
func begin_round() -> void:
	E.begin_round(st)
	E.clear_round_skills(st)
	declared = [[], []]
	undo_left = UNDO_MAX
	staged = {}
	declare_done = [false, false]
	var f := E.first_side(st)
	declare_order = [f, 1 - f]
	phase = "declare"
	say("—— 第 %d 轮 ——  先手：%s" % [st.round, "你" if human[f] else "对手"])

func declare_side() -> int:
	for s in declare_order:
		if not declare_done[s]:
			return s
	return -1

# 这一方此刻能用的词（词库 − 上一轮用过的 − 本轮已经拼进别的句子的）。基础词不受限
func avail_words(side: int) -> Dictionary:
	var out := {}
	var prev: Dictionary = used_log[side].get(int(st.round) - 1, {})
	var now: Dictionary = used_log[side].get(int(st.round), {})
	for w in pools[side]:
		if Lex.is_basic(w):
			out[w] = int(pools[side][w])
		else:
			out[w] = int(pools[side][w]) - int(prev.get(w, 0)) - int(now.get(w, 0))
	return out

# 哪些词因为冷却现在用不了：{词: 冷却的张数}
func cooling_words(side: int) -> Dictionary:
	var out := {}
	var prev: Dictionary = used_log[side].get(int(st.round) - 1, {})
	for w in prev:
		if int(prev[w]) > 0:
			out[w] = int(prev[w])
	return out

# 提交一句话：把它登记到随从身上，再宣告（目标、起效时间在 act 里）。返回错误文字，空串 = 成功
func submit_sentence(side: int, uid: int, skill: Dictionary, choices: Dictionary, start: int) -> String:
	var u := E._u(st, uid)
	if u.is_empty() or int(u.side) != side or u.down_round != -1:
		return "这个随从现在不能出手"
	for a in declared[side]:
		if E.host_of(st, int(a.sid)) == uid:
			return "这个随从本轮已经拼过一句了"
	var sk: Dictionary = G.finalize(skill.duplicate(true))
	var probs := G.problems(sk)
	if not probs.is_empty():
		return "这句话不合法：" + str(probs[0])
	var miss := G.missing(sk.words, avail_words(side))
	if not miss.is_empty():
		var parts: Array = []
		for w in miss:
			parts.append("%s×%d" % [w, int(miss[w])])
		return "词不够（或在冷却）：" + "、".join(parts)
	var sid := E.add_round_skill(st, uid, sk)
	var act := {"side": side, "sid": sid, "choices": choices, "start": start}
	var err := E.can_declare(st, act, declared[side])
	if err != "":
		E.remove_round_skill(st, uid, sid)
		return err
	declared[side].append(act)
	var rec: Dictionary = used_log[side].get(int(st.round), {})
	for w in sk.words:
		if not Lex.is_basic(w):
			rec[w] = int(rec.get(w, 0)) + 1
	used_log[side][int(st.round)] = rec
	stats.sentences += 1
	return ""

# 界面：把拼好的句子登记到随从身上（还没宣告）。返回 {"sid": n} 或 {"err": 文字}
func stage_sentence(uid: int, skill: Dictionary) -> Dictionary:
	var u := E._u(st, uid)
	if u.is_empty() or int(u.side) != 0 or u.down_round != -1:
		return {"err": "这个随从现在不能出手"}
	for a in declared[0]:
		if E.host_of(st, int(a.sid)) == uid:
			return {"err": "这个随从本轮已经拼过一句了"}
	var sk: Dictionary = G.finalize(skill.duplicate(true))
	var probs := G.problems(sk)
	if not probs.is_empty():
		return {"err": "这句话不合法：" + str(probs[0])}
	var miss := G.missing(sk.words, avail_words(0))
	if not miss.is_empty():
		var parts: Array = []
		for w in miss:
			parts.append("%s×%d" % [w, int(miss[w])])
		return {"err": "词不够（或在冷却）：" + "、".join(parts)}
	unstage(uid)
	var sid := E.add_round_skill(st, uid, sk)
	staged[uid] = sid
	return {"sid": sid}

func unstage(uid: int) -> void:
	if staged.has(uid):
		E.remove_round_skill(st, uid, int(staged[uid]))
		staged.erase(uid)

func is_staged(sid: int) -> bool:
	for uid in staged:
		if int(staged[uid]) == sid:
			return true
	return false

# 界面宣告（和旧 Match.submit 同一个接口）：空 = 本方不再宣告
func submit(side: int, act: Dictionary) -> String:
	if act.is_empty():
		for uid in staged.keys():
			unstage(int(uid))
		declare_done[side] = true
		return ""
	var sid := int(act.sid)
	var sk: Dictionary = E.skill_of(st, sid)
	var miss := G.missing(sk.words, avail_words(side))
	if not miss.is_empty():
		return "词不够（或在冷却）"
	var err := E.can_declare(st, act, declared[side])
	if err != "":
		return err
	declared[side].append(act.duplicate(true))
	if side == 0:
		last_sentence[E.host_of(st, sid)] = sk.duplicate(true)
	staged.erase(E.host_of(st, sid))
	var rec: Dictionary = used_log[side].get(int(st.round), {})
	for w in sk.words:
		if not Lex.is_basic(w):
			rec[w] = int(rec.get(w, 0)) + 1
	used_log[side][int(st.round)] = rec
	stats.sentences += 1
	return ""

# 撤回自己已宣告的一个行动（还没点“完成宣告”时；每轮 UNDO_MAX 次）。句子留在随从身上，可以重选目标/时间再宣告
func retract(side: int, sid: int) -> String:
	if declare_done[side]:
		return "宣告已经结束，不能撤回了"
	if undo_left <= 0:
		return "本轮的撤回次数用完了（每轮 %d 次）" % UNDO_MAX
	for i in declared[side].size():
		if int(declared[side][i].sid) == sid:
			declared[side].remove_at(i)
			var uid := E.host_of(st, sid)
			var rec: Dictionary = used_log[side].get(int(st.round), {})
			for w in E.skill_of(st, sid).words:
				if not Lex.is_basic(w):
					rec[w] = maxi(0, int(rec.get(w, 0)) - 1)
			staged[uid] = sid
			undo_left -= 1
			stats.sentences -= 1
			return ""
	return "找不到这个行动"

func public_declared(side: int) -> Array:
	return declared[side].duplicate(true)

# 还有哪些存活的随从没出手
func idle_units(side: int) -> Array:
	var out: Array = []
	for u in E.alive_units(st, side):
		var has := false
		for a in declared[side]:
			if E.host_of(st, int(a.sid)) == int(u.uid):
				has = true
		if not has:
			out.append(u)
	return out

func finish_declare(side: int) -> void:
	declare_done[side] = true

func resolve() -> Dictionary:
	var acts: Array = []
	for s in declare_order:
		acts.append_array(declared[s])
	last_declared = [declared[0].duplicate(true), declared[1].duplicate(true)]
	last_skills = [{}, {}]
	for s in 2:
		var names: Array = []
		for a in declared[s]:
			names.append(str(E.skill_of(st, int(a.sid)).get("text", "")))
		last_skills[s] = {"texts": names}
	for ord_i in 2:
		var sd3: int = declare_order[ord_i]
		var tag := "first" if ord_i == 0 else "second"
		var spent := 0
		for a3 in declared[sd3]:
			spent += E.action_cost(st, a3)
		stats[tag + "_sent"] = int(stats.get(tag + "_sent", 0)) + declared[sd3].size()
		stats[tag + "_ap"] = int(stats.get(tag + "_ap", 0)) + spent
		stats[tag + "_n"] = int(stats.get(tag + "_n", 0)) + 1
	var res := E.run_round(st, acts)
	last_events = res.events
	for s2 in 2:
		var live := 0
		for u in E.alive_units(st, s2):
			live += 1
		stats.empty_units += maxi(0, live - declared[s2].size())
	if res.winner != -1:
		winner = res.winner
	elif st.round >= int(st.rules.max_rounds):
		var a0: int = st.sides[0].score
		var a1: int = st.sides[1].score
		winner = 0 if a0 > a1 else (1 if a1 > a0 else -2)
	if winner != -1:
		phase = "over"
	else:
		bags = Lex.draw_bags(rng)
		bag_taken = [-1, -1]
		picker = E.first_side(st)       # 这一轮的先手先挑兜子（下一轮它就是后手了）
		phase = "draft"
	return res

# ---------------------------------------------------------------- 兜子（战斗后）
func pick_bag(side: int, idx: int) -> void:
	if phase == "opening":
		# 开局各选各的：你选完，电脑立刻也选一次
		if open_done[side] >= OPEN_PICKS or idx < 0 or idx >= open_bags[side].size():
			return
		pick_open(side, idx)
		if side == 0 and human[0] and not human[1]:
			if open_done[1] < OPEN_PICKS:
				ai_pick_open(1)
		bag_taken = [idx, -3]
		return
	if phase != "draft" or bag_taken[side] != -1 or idx in bag_taken or idx < 0 or idx >= bags.size():
		return
	bag_taken[side] = idx
	for w in bags[idx]:
		pools[side][w] = int(pools[side].get(w, 0)) + 1
	say("%s 拿走了第 %d 个兜子：%s。" % ["你" if human[side] else "对手", idx + 1, "、".join(bags[idx])])
	if bag_taken[1 - side] == -1:
		picker = 1 - side
		return
	phase = "equip"

# 开局阶段，兜子界面要看到“你自己的 3 个兜子”：刷新兼容字段
func sync_draft_view() -> void:
	if phase == "opening":
		bags = open_bags[0].duplicate(true)
		bag_taken = [-1, -1]
		picker = 0
		opening_idx = open_done[0]
		opening_total = OPEN_PICKS

# 手把手辅助轮：给我方一个随从推荐几句（用电脑同一套估值）。返回 [{sk, act, name, text, cost, foe_loss, my_loss, note}]
func recommend(uid: int, n: int = 3) -> Array:
	var u := E._u(st, uid)
	if u.is_empty():
		return []
	var enemy_list: Array = []
	var blind: bool = declare_order[0] == 0
	if not blind:
		enemy_list = declared[1].duplicate(true)
	var ap_left: int = E.available_ap(st, 0, declared[0])
	var scan := _scan_unit(0, u, enemy_list, declared[0], avail_words(0), ap_left, _mood(0), 8, 2)
	var before := _hp_sums(Ai._sim(st, enemy_list + declared[0]))
	var out: Array = []
	var seen := {}
	for c in scan.list:
		var key := str(c.sk.get("template", "")) + "|" + str(int(c.sk.cost))
		if seen.has(key):
			continue
		seen[key] = true
		var sid := E.add_round_skill(st, uid, c.sk)       # 扫描时登记的句子已经撤掉，这里重新登记再推演
		var act2: Dictionary = c.act.duplicate(true)
		act2.sid = sid
		var after := _hp_sums(Ai._sim(st, enemy_list + declared[0] + [act2]))
		E.remove_round_skill(st, uid, sid)
		var foe_loss: int = int(before[1]) - int(after[1])
		var my_loss: int = int(before[0]) - int(after[0])
		out.append({"sk": c.sk, "act": c.act, "name": str(c.sk.get("name", "")), "text": str(c.sk.get("text", "")), "cost": int(c.sk.cost), "foe_loss": foe_loss, "my_loss": my_loss, "foe_after": int(after[1]), "my_after": int(after[0]), "foe_before": int(before[1]), "my_before": int(before[0]),
			"note": "（对手还没出招，按它不动估算）" if blind else ""})
		if out.size() >= n:
			break
	return out

func _hp_sums(c: Dictionary) -> Array:
	var r := [0, 0]
	for s2 in 2:
		for x in c.sides[s2].units:
			r[s2] += int(x.hp) if int(x.down_round) == -1 else 0
	return r

func public_deck(_side: int) -> Dictionary:
	return {"units": []}

# 对手公开的信息：流派、每个随从的生命上限和关键词、持有的进阶词（不含它怎么拼）
func public_info(side: int) -> Dictionary:
	var advs: Array = []
	for w in pools[side]:
		if not Lex.is_basic(w) and int(pools[side][w]) > 0:
			advs.append("%s×%d" % [w, int(pools[side][w])] if int(pools[side][w]) > 1 else str(w))
	var us: Array = []
	for u in decks[side].units:
		us.append({"name": u.name, "max_hp": int(u.max_hp), "kw": str(u.kw)})
	return {"style": personas[side], "units": us, "words": advs}

func remaining_bags() -> Array:
	if phase == "opening":
		var all: Array = []
		for i in bags.size():
			all.append(i)
		return all
	var out: Array = []
	for i in bags.size():
		if not (i in bag_taken):
			out.append(i)
	return out

func ai_pick_bag() -> void:
	var rem: Array = remaining_bags()
	var sub: Array = []
	for i in rem:
		sub.append(bags[i])
	pick_bag(picker, int(rem[_pick_by_style(picker, sub)]))

# ---------------------------------------------------------------- 关键词装备（每个随从一个，免费换）
func keyword_stock(side: int) -> Dictionary:
	var out := {}
	for w in pools[side]:
		if str(Lex.words[w].cat) == "关键词" and int(pools[side][w]) > 0:
			out[w] = int(pools[side][w])
	return out

func equip(side: int, kws: Array) -> String:
	var stock := keyword_stock(side)
	var need := {}
	for k in kws:
		if str(k) != "":
			need[k] = int(need.get(k, 0)) + 1
	for k in need:
		if int(need[k]) > int(stock.get(k, 0)):
			return "你没有那么多【%s】" % str(k)
	for i in COUNT:
		decks[side].units[i].kw = str(kws[i]) if i < kws.size() else ""
	E.set_deck(st, side, decks[side], false)
	return ""

func ai_equip(side: int) -> void:
	var stock := keyword_stock(side)
	var pri: Array = STYLE_KW[personas[side]].duplicate()
	# 对手身上有什么状态就拿对应的免疫
	for nm in ["易伤", "灼烧", "衰弱"]:
		for u in E.alive_units(st, side):
			if int(u.get("stacks", {}).get(nm, 0)) > 0 and not (("免疫" + nm) in pri):
				pri.push_front("免疫" + nm)
				break
	pri.append("同调")
	var assign: Array = ["", "", ""]
	var slot := 0
	for k in pri:
		var n: int = int(stock.get(k, 0))
		while n > 0 and slot < COUNT:
			assign[slot] = k
			slot += 1
			n -= 1
	equip(side, assign)

func finish_equip() -> void:
	if phase == "equip":
		begin_round()

# 兜子打分：新凑齐的路线按流派权重加成，再加偏爱的词
func _pick_by_style(side: int, bag_list: Array) -> int:
	var base_av := avail_words(side)
	var base := Coach.route_status(base_av)
	var best := 0
	var best_g := -1.0e9
	for i in bag_list.size():
		var av := base_av.duplicate()
		for w in bag_list[i]:
			av[w] = int(av.get(w, 0)) + 1
		var after := Coach.route_status(av)
		var g := rng.randf() * 0.8
		for k in base.size():
			var b: Dictionary = base[k]
			var a: Dictionary = after[k]
			var m := _route_mult(side, b, {})
			if int(b.n) > 0 and int(a.n) == 0:
				g += float(a.w) * 2.0 * m
			elif int(a.n) < int(b.n) and int(a.n) <= 2:
				g += float(a.w) * m * float(int(b.n) - int(a.n)) / float(maxi(int(b.n), 1))
		for w in bag_list[i]:
			if w in STYLE_PREFER[personas[side]]:
				g += 1.2
			if str(Lex.words[w].cat) == "关键词":
				g += 0.6
		if g > best_g:
			best_g = g
			best = i
	return best

# 流派 + 局势 决定每条路线此刻有多想用
func _route_mult(side: int, r: Dictionary, mood: Dictionary) -> float:
	var stl: Dictionary = STYLE[personas[side]]
	var m := 1.0
	m *= float(stl.role.get(str(r.role), 1.0))
	for k in stl.name:
		if str(r.name).contains(k):
			m *= float(stl.name[k])
	m *= float(mood.get(str(r.role), 1.0))
	return m

# 局势：落后就多攻，领先就稳；自己身上的状态在长大就要压回去；对方蓄力很高就先发制人或设伏
func _mood(side: int) -> Dictionary:
	var out := {}
	var me: Dictionary = st.sides[side]
	var op: Dictionary = st.sides[1 - side]
	var diff: int = int(me.score) - int(op.score)
	if diff <= -2:
		out["攻"] = 1.0 + 0.2 * mini(-diff, 4)
	elif diff >= 2:
		out["守"] = 1.25
		out["攻"] = 0.9
	var worry := 0
	for u in E.alive_units(st, side):
		for nm in u.get("stacks", {}):
			if str(nm) in ["易伤", "灼烧", "衰弱"]:
				worry += int(u.stacks[nm])
	if worry >= 3:
		out["攻"] = float(out.get("攻", 1.0)) * 1.3
		out["控"] = 1.2
	for u in E.alive_units(st, 1 - side):
		if int(u.get("stacks", {}).get("蓄力", 0)) >= 3:
			out["反"] = 1.5
			out["攻"] = float(out.get("攻", 1.0)) * 1.3
	return out

# ---------------------------------------------------------------- 电脑：现场拼
static var BLIND_EARLY := 1.2         # 盲拼时越早起手越好（后手看见了可以抢在前面把你打倒，你的招就落空）
static var LOOKAHEAD := false         # 盲拼的先手也会“想对手会怎么应对”
static var LOOK_TOP := 3              # 先手每个随从只对前几名候选做应对推演
static var RESP_CAND := 5             # 推演对手应对时，对手每个随从比较几句候选
static var RESP_PICKS := 2

func ai_declare(side: int = -1) -> void:
	if side == -1:
		side = declare_side()
	if tutorial:
		_scripted_foe(side)
		return
	var enemy_list: Array = []
	var blind: bool = side == declare_order[0] or BLIND_SECOND
	if not blind:
		enemy_list = declared[1 - side].duplicate(true)
	var avail := avail_words(side)
	var order: Array = E.alive_units(st, side)
	order.sort_custom(func(a, b): return int(a.hp) > int(b.hp))
	var mood := _mood(side)
	var stl: Dictionary = STYLE[personas[side]]
	for u in order:
		var ap_left: int = E.available_ap(st, side, declared[side])
		if ap_left < 8:
			break
		var scan := _scan_unit(side, u, enemy_list, declared[side], avail, ap_left, mood, CAND_MAX, START_PICKS)
		var base_v: float = scan.base
		var best: Dictionary = {}
		var best_v := base_v + 0.6
		if blind and LOOKAHEAD and not scan.list.is_empty():
			# 先手：不知道对手会怎么应对，就推演一下——前几名候选各让对手“看到后”应对一次，按应对之后的局面打分
			var resp0 := _respond(1 - side, declared[side])
			base_v = _eval(declared[side] + resp0.acts, side)
			_cleanup_resp(resp0)
			best_v = base_v + 0.6
			var top: Array = scan.list.slice(0, LOOK_TOP)
			for c in top:
				var sid := E.add_round_skill(st, int(u.uid), c.sk)
				var act: Dictionary = c.act.duplicate(true)
				act.sid = sid
				var mine: Array = declared[side] + [act]
				var resp := _respond(1 - side, mine)
				var v := _eval(mine + resp.acts, side) + rng.randf() * 0.6
				_cleanup_resp(resp)
				E.remove_round_skill(st, int(u.uid), sid)
				if v > best_v:
					best_v = v
					best = {"skill": c.sk, "act": c.act, "uid": int(u.uid)}
		else:
			for c in scan.list:
				if float(c.v) > best_v:
					best_v = float(c.v)
					best = {"skill": c.sk, "act": c.act, "uid": int(u.uid)}
		if best.is_empty():
			continue
		# 取舍：这一句赚得不够多，就把行动点攒着，留给后面更大的句子
		if best_v - base_v < float(stl.hold) * _hold_scale(side, ap_left):
			stats["held"] = int(stats.get("held", 0)) + 1
			continue
		if ai_epsilon > 0.0 and rng.randf() < ai_epsilon:
			continue
		var err := submit_sentence(side, int(best.uid), best.skill, best.act.choices, int(best.act.start))
		if err == "":
			avail = avail_words(side)
	declare_done[side] = true

# 一个随从所有候选句的打分（按分数从高到低），以及什么都不做的基准分
func _scan_unit(side: int, u: Dictionary, enemy_list: Array, mine_decl: Array, avail: Dictionary, ap_left: int, mood: Dictionary, cand_max: int, picks: int) -> Dictionary:
	var base_acts: Array = enemy_list + mine_decl
	var out := {"base": _eval(base_acts, side), "list": []}
	var saved := CAND_MAX
	CAND_MAX = cand_max
	var cands := _candidates(side, avail, ap_left, mood)
	CAND_MAX = saved
	for sk in cands:
		var sid := E.add_round_skill(st, int(u.uid), sk)
		var tried := 0
		for a in Ai.enumerate_actions(st, side, enemy_list, picks, mine_decl):
			if a.is_empty() or int(a.sid) != sid:
				continue
			tried += 1
			var early := 0.0
			if enemy_list.is_empty() and BLIND_EARLY > 0.0:
				early = float(19 - int(a.start)) * BLIND_EARLY
			out.list.append({"sk": sk, "act": a, "v": _eval(base_acts + [a], side) + rng.randf() * 1.2 + early})
			if tried >= picks:
				break
		E.remove_round_skill(st, int(u.uid), sid)
	out.list.sort_custom(func(x, y): return float(x.v) > float(y.v))
	return out

# 假设对手（resp_side）看到了 first_acts，它会怎么应对：返回 {acts, sids:[[uid,sid]]}，用完要 _cleanup_resp
func _respond(resp_side: int, first_acts: Array) -> Dictionary:
	var res := {"acts": [], "sids": []}
	var avail := avail_words(resp_side)
	var order: Array = E.alive_units(st, resp_side)
	order.sort_custom(func(a, b): return int(a.hp) > int(b.hp))
	var mood := _mood(resp_side)
	var stl: Dictionary = STYLE[personas[resp_side]]
	for u in order:
		var ap_left: int = E.available_ap(st, resp_side, res.acts)
		if ap_left < 8:
			break
		var scan := _scan_unit(resp_side, u, first_acts, res.acts, avail, ap_left, mood, RESP_CAND, RESP_PICKS)
		if scan.list.is_empty():
			continue
		var c: Dictionary = scan.list[0]
		if float(c.v) - float(scan.base) < 0.6 + float(stl.hold) * _hold_scale(resp_side, ap_left):
			continue
		var sid := E.add_round_skill(st, int(u.uid), c.sk)
		var act: Dictionary = c.act.duplicate(true)
		act.sid = sid
		res.acts.append(act)
		res.sids.append([int(u.uid), sid])
		for w in c.sk.words:
			if avail.has(w):
				avail[w] = int(avail[w]) - 1
	return res

func _cleanup_resp(r: Dictionary) -> void:
	for pair in r.sids:
		E.remove_round_skill(st, int(pair[0]), int(pair[1]))

# 候选句：按路线挑出“词够的”，数字放大几档（受行动点限制），再按权重抽出若干
# 教程里的对手：第 1 轮站着不动；之后每轮用一个随从打你的第一个随从，让你练“见招拆招”
func _scripted_foe(side: int) -> void:
	if int(st.round) >= 2:
		var mine: Array = E.alive_units(st, 1 - side)
		var me_u: Array = E.alive_units(st, side)
		if not mine.is_empty() and not me_u.is_empty():
			var sk: Dictionary = G.finalize(G.skill("木头一击", [G.dmg(G.T("choose", "enemy", {"n": 1}), G.N(14))]))
			submit_sentence(side, int(me_u[0].uid), sk, {"t1": int(mine[0].uid)}, 2)
	declare_done[side] = true

func _candidates(side: int, avail: Dictionary, ap_left: int, mood: Dictionary = {}) -> Array:
	var rs: Array = Coach.route_status(avail)
	var pool_c: Array = []
	for r in rs:
		if int(r.n) != 0:
			continue
		var base_sk: Dictionary = r.skill
		var variants: Array = [base_sk]
		var has_n := false
		for prm in R.template(str(r.tid)).params:
			if str(prm.key) == "n" and str(prm.kind) == "int":
				has_n = true
		if has_n:
			var n0: int = int(r.params.n)
			for f in [0.6, 1.7, 2.6, 4.0]:
				var p: Dictionary = r.params.duplicate()
				p["n"] = clampi(int(round(float(n0) * f)), 2, 90)
				if int(p.n) != n0:
					variants.append(R.build(str(r.tid), p))
		for sk in variants:
			if int(sk.cost) <= ap_left:
				pool_c.append({"sk": sk, "w": float(r.w) * _route_mult(side, r, mood) + rng.randf() * 1.6 - float(sk.cost) * 0.004})
	pool_c.sort_custom(func(a, b): return a.w > b.w)
	var out: Array = []
	var seen := {}
	for c in pool_c:
		var key := "%s|%d" % [str(c.sk.get("template", "")), int(c.sk.cost)]
		if seen.has(key):
			continue
		seen[key] = true
		out.append(c.sk)
		if out.size() >= CAND_MAX:
			break
	return out

# ---------------------------------------------------------------- 全自动（批量模拟用）
func step_auto() -> bool:
	match phase:
		"opening":
			for s in 2:
				if human[s]:
					continue
				while open_done[s] < OPEN_PICKS:
					ai_pick_open(s)
			if phase == "opening":
				return false
		"hp":
			for s2 in 2:
				if not human[s2] and not hp_done[s2]:
					ai_set_hp(s2)
			if phase == "hp":
				return false
		"declare":
			var sd := declare_side()
			if sd == -1:
				resolve()
			elif human[sd]:
				return false
			else:
				ai_declare(sd)
		"resolved":
			pass
		"draft":
			if human[picker]:
				return false
			ai_pick_bag()
		"equip":
			for s3 in 2:
				if not human[s3]:
					ai_equip(s3)
			if human[0] or human[1]:
				return false
			finish_equip()
		"over":
			return false
	return phase != "over"

func run_to_end(max_steps: int = 600) -> void:
	var n := 0
	while step_auto() and n < max_steps:
		n += 1

# 估值：不同流派给状态、比分不同的权重
func _eval(acts: Array, side: int) -> float:
	var stl: Dictionary = STYLE[personas[side]]
	var old_w: float = Ai.STACK_WEIGHT
	var old_l: int = Ai.STACK_LOOKAHEAD
	Ai.STACK_WEIGHT = float(stl.stack_w)
	Ai.STACK_LOOKAHEAD = int(stl.look)
	var c := Ai._sim(st, acts)
	var v := Ai.evaluate(c, side)
	v += float(c.sides[side].score - c.sides[1 - side].score) * (float(stl.score_w) - 1.5)
	Ai.STACK_WEIGHT = old_w
	Ai.STACK_LOOKAHEAD = old_l
	return v

# 攒行动点的意愿随局面变：行动点已经很多就别攒了，临近局末、落后很多也别攒
func _hold_scale(side: int, ap_left: int) -> float:
	var cap := float(st.rules.get("ap_cap", 180))
	var k := 1.0
	if float(ap_left) > cap * 0.75:
		k = 0.0
	elif float(ap_left) > cap * 0.5:
		k = 0.5
	if int(st.round) >= int(st.rules.max_rounds) - 1:
		k = 0.0
	if int(st.sides[side].score) < int(st.sides[1 - side].score) - 2:
		k *= 0.4
	return k

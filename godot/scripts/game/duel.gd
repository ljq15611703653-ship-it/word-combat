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
	st = E.make_state(decks, 0, {}, rng.randi() & 0x7fffffff)
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

func remaining_bags() -> Array:
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
func ai_declare(side: int) -> void:
	var enemy_list: Array = []
	if side != declare_order[0]:
		enemy_list = declared[1 - side].duplicate(true)
	var avail := avail_words(side)
	var order: Array = E.alive_units(st, side)
	order.sort_custom(func(a, b): return int(a.hp) > int(b.hp))
	var mood := _mood(side)
	for u in order:
		var ap_left: int = E.available_ap(st, side, declared[side])
		if ap_left < 8:
			break
		var stl: Dictionary = STYLE[personas[side]]
		var base_acts: Array = enemy_list + declared[side]
		var base_v := _eval(base_acts, side)
		var best: Dictionary = {}
		var best_v := base_v + 0.6
		for sk in _candidates(side, avail, ap_left, mood):
			var sid := E.add_round_skill(st, int(u.uid), sk)
			var tried := 0
			for a in Ai.enumerate_actions(st, side, enemy_list, START_PICKS, declared[side]):
				if a.is_empty() or int(a.sid) != sid:
					continue
				tried += 1
				var v := _eval(base_acts + [a], side) + rng.randf() * 1.2
				if v > best_v:
					best_v = v
					best = {"skill": sk, "act": a, "uid": int(u.uid)}
				if tried >= START_PICKS:
					break
			E.remove_round_skill(st, int(u.uid), sid)
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

# 候选句：按路线挑出“词够的”，数字放大几档（受行动点限制），再按权重抽出若干
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

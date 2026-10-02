extends RefCounted
# 辅助轮（教练）：分析“拿哪一袋词更有利”“现在能凑出什么、还差什么”。
# 只读公开信息：玩家自己的词库与牌组。不改任何状态。

const G = preload("res://scripts/core/grammar.gd")
const R = preload("res://scripts/core/recipes.gd")
const D = preload("res://scripts/core/deck.gd")
const Lex = preload("res://scripts/core/lexicon.gd")

# 路线：名字、模板、固定参数、定位、权重（越大越值得追）、一句话说明
const ROUTES := [
	["单点打击", "atk1", {}, "攻", 1.0, "打一个敌人，最基础的输出"],
	["单点·双倍", "atk1", {"dbl": 1}, "攻", 1.6, "单体伤害翻倍，用来斩杀"],
	["单点·双倍·重复", "atk1", {"dbl": 1, "rep": 1}, "攻", 2.4, "翻倍再打两次，单体爆发"],
	["追击", "chase", {}, "攻", 2.0, "反复打最低生命的敌人，直到它快死"],
	["范围打击", "atkA", {}, "攻", 2.0, "一次打全场，每个敌人都吃满数值"],
	["范围·双倍", "atkA", {"dbl": 1}, "攻", 3.0, "全场翻倍，先手大招"],
	["范围·重复", "atkA", {"rep": 1}, "攻", 3.0, "全场打两轮"],
	["范围·双倍·重复", "atkA", {"dbl": 1, "rep": 1}, "攻", 4.0, "全场翻倍再打两轮，惊艳大招"],
	["分流打击", "split", {}, "攻", 2.0, "总伤害拆给两个目标"],
	["复制打击", "copy", {}, "攻", 2.5, "打一个，再把伤害复制给另一个"],
	["汲取", "drain", {}, "攻", 1.5, "打人并按伤害回血"],
	["治疗·全队", "heal", {"tgt": "all"}, "守", 1.2, "给全队回血"],
	["减伤·全队", "mit", {"tgt": "all", "mode": "pct"}, "守", 1.4, "全队受伤降低一截"],
	["铁壁", "status", {"st": "铁壁"}, "守", 2.6, "给自己叠铁壁：层数越多，受到的伤害降得越多（前期慢，后期很硬）"],
	["蓄力", "status", {"st": "蓄力"}, "攻", 2.8, "给自己叠蓄力：忍着，叠够了一次打出去，伤害指数放大"],
	["改道·全队→来源", "redirect", {"obs": "all", "to": "source", "freq": "every"}, "反", 2.4, "把打向我方的伤害转给出招的人，大招反噬"],
	["改道·全队·双倍", "redirect", {"obs": "all", "to": "source", "freq": "every", "dbl": 1}, "反", 3.2, "双倍上限的全队改道"],
	["转伤为疗·全队", "convert", {"obs": "all", "freq": "every"}, "反", 2.4, "把对方的伤害变成我方的治疗"],
	["回敬·全队", "reflect", {"obs": "all", "mult": 0, "freq": "every"}, "反", 2.0, "挨打后按该次伤害回敬来源"],
	["回敬·双倍", "reflect", {"obs": "all", "mult": 1, "freq": "every"}, "反", 2.5, "挨打后双倍奉还"],
	["见招收税", "tax", {}, "反", 1.6, "对手每发动一个技能就让施法者掉血"],
	["遗志", "burst", {}, "反", 1.6, "倒下时对全场造成伤害"],
	["治疗引爆", "engine", {}, "反", 2.4, "每次回血都转成对敌伤害"],
	["延后", "time", {"op": "delay"}, "控", 1.2, "把对方的技能往后推"],
	["易伤", "status", {"st": "易伤", "tgt": "choose"}, "控", 2.8, "给对方叠易伤：层数越多，它越怕疼"],
	["灼烧", "status", {"st": "灼烧", "tgt": "choose"}, "控", 3.0, "给对方叠灼烧：每轮结束掉血，越叠越痛"],
	["衰弱", "status", {"st": "衰弱", "tgt": "choose"}, "控", 2.8, "给对方叠衰弱：它的伤害越来越低"],
	["驱散", "remove", {"what": "限时效果"}, "控", 1.5, "拆掉对方布下的监听或减伤"],
]

# 当前“空闲词”（词库减去已装在牌组里的词）
static func free_words(pool: Dictionary, deck: Dictionary) -> Dictionary:
	var used := D.used_counts(deck)
	var out := {}
	for w in pool:
		out[w] = int(pool[w]) - int(used.get(w, 0))
	return out

static func _missing(words: Array, avail: Dictionary) -> Dictionary:
	return G.missing(words, avail)

static func _count(miss: Dictionary) -> int:
	var n := 0
	for w in miss:
		n += int(miss[w])
	return n

# 对一条路线，在“选项型参数”里挑缺词最少的取值（目标的写法有很多种）
static func fit(route: Array, avail: Dictionary) -> Dictionary:
	var tid: String = route[1]
	var p: Dictionary = R.defaults(tid)
	for k in route[2]:
		p[k] = route[2][k]
	var best := _count(_missing(R.build(tid, p).words, avail))
	for prm in R.template(tid).params:
		if prm.kind != "enum" or route[2].has(prm.key):
			continue
		for o in prm.options:
			var trial := p.duplicate()
			trial[prm.key] = o[0]
			var m := _count(_missing(R.build(tid, trial).words, avail))
			if m < best:
				best = m
				p = trial
		if best == 0:
			break
	var sk := R.build(tid, p)
	return {"params": p, "skill": sk, "missing": _missing(sk.words, avail), "n": best}

static func route_status(avail: Dictionary) -> Array:
	var out: Array = []
	for r in ROUTES:
		var f := fit(r, avail)
		out.append({"name": r[0], "role": r[3], "w": float(r[4]), "desc": r[5], "tid": r[1], "route": r,
			"missing": f.missing, "n": f.n, "params": f.params, "skill": f.skill})
	return out

static func _bag_free(avail: Dictionary, bag: Array) -> Dictionary:
	var a := avail.duplicate()
	for w in bag:
		a[w] = int(a.get(w, 0)) + 1
	return a

static func _missing_text(miss: Dictionary) -> String:
	var parts: Array = []
	for w in miss:
		parts.append("%s%s" % [w, ("×%d" % int(miss[w])) if int(miss[w]) > 1 else ""])
	return "、".join(parts)

# ------------------------------------------------------------ 抽词建议
# 返回 {pick, per_bag:[{gain, done:[名], near:[{name,missing}] }], reason, watch:[文字]}
static func analyze_draft(pool: Dictionary, deck: Dictionary, bags: Array) -> Dictionary:
	var avail := free_words(pool, deck)
	var base := route_status(avail)
	var per: Array = []
	for bag in bags:
		var after := route_status(_bag_free(avail, bag))
		var done: Array = []
		var near: Array = []
		var gain := 0.0
		for i in base.size():
			var b: Dictionary = base[i]
			var a: Dictionary = after[i]
			if b.n > 0 and a.n == 0:
				done.append({"name": a.name, "role": a.role, "w": a.w})
				gain += a.w * 2.0
			elif a.n < b.n and a.n <= 2:
				near.append({"name": a.name, "role": a.role, "w": a.w, "missing": a.missing, "n": a.n})
				gain += a.w * (float(b.n - a.n) / float(maxi(b.n, 1))) * 1.2
			elif a.n < b.n:
				gain += a.w * 0.1 * float(b.n - a.n)
		done.sort_custom(func(x, y): return x.w > y.w)
		near.sort_custom(func(x, y): return x.w > y.w)
		per.append({"gain": gain, "done": done, "near": near, "after": after})
	var pick := 0 if per[0].gain >= per[1].gain else 1
	var chosen: Dictionary = per[pick]
	var reason := ""
	if not chosen.done.is_empty():
		var names: Array = []
		for d in chosen.done.slice(0, 3):
			names.append("【%s】" % d.name)
		reason = "拿这袋能新凑齐 %s" % "、".join(names)
		if not chosen.near.is_empty():
			reason += "，还让【%s】只差一点" % chosen.near[0].name
	elif not chosen.near.is_empty():
		reason = "拿这袋能让【%s】只差 %d 个词（%s）" % [chosen.near[0].name, chosen.near[0].n, _missing_text(chosen.near[0].missing)]
	else:
		reason = "两袋对现有路线的帮助都不大，选词更多、更基础的一袋稳妥"
	# 接下来要留意：选中后最有价值、还没凑齐、差得最少的路线
	var watch: Array = []
	var cand: Array = []
	for a in chosen.after:
		if a.n > 0 and a.n <= 4:
			cand.append(a)
	cand.sort_custom(func(x, y): return (x.w / float(x.n)) > (y.w / float(y.n)))
	for c in cand.slice(0, 3):
		watch.append("【%s】（%s）还缺：%s" % [c.name, c.role, _missing_text(c.missing)])
	return {"pick": pick, "per_bag": per, "reason": reason, "watch": watch}

# ------------------------------------------------------------ 构筑/调整建议
# 现在凑得出但还没装的路线，加上最值得追的缺词路线
static func analyze_build(pool: Dictionary, deck: Dictionary) -> Dictionary:
	var avail := free_words(pool, deck)
	var st := route_status(avail)
	var ready: Array = []
	var chase: Array = []
	for r in st:
		if r.n == 0:
			ready.append(r)
		elif r.n <= 4:
			chase.append(r)
	ready.sort_custom(func(x, y): return x.w > y.w)
	chase.sort_custom(func(x, y): return (x.w / float(x.n)) > (y.w / float(y.n)))
	# 放进哪张卡：技能槽有空、生命较高的卡
	var target := -1
	var best_free := -1
	for i in deck.units.size():
		var free_slots: int = D.MAX_SKILLS - deck.units[i].skills.size()
		if free_slots > 0 and (free_slots > best_free or (free_slots == best_free and deck.units[i].max_hp > deck.units[target].max_hp)):
			best_free = free_slots
			target = i
	return {"ready": ready, "chase": chase, "target_unit": target}

static func describe_build(pool: Dictionary, deck: Dictionary) -> Array:
	var info := analyze_build(pool, deck)
	var lines: Array = []
	if info.ready.is_empty():
		lines.append("你现有的空闲词暂时凑不出新的招式，先看下面“再凑什么”。")
	else:
		var names: Array = []
		for r in info.ready.slice(0, 4):
			names.append("【%s】" % r.name)
		lines.append("现在就能做、但还没装上的：%s" % "、".join(names))
		if info.target_unit >= 0:
			lines.append("建议：编辑【%s】，装入【%s】（%s）：%s" % [deck.units[info.target_unit].name, info.ready[0].name, info.ready[0].role, info.ready[0].desc])
		else:
			lines.append("四张卡的技能槽都满了；想装新招，先在某张卡里清空一个技能槽。")
	for c in info.chase.slice(0, 2):
		lines.append("再凑 %d 个词就能做【%s】（%s）：%s" % [c.n, c.name, c.role, _missing_text(c.missing)])
	return lines

# ------------------------------------------------------------ 抽词辅助轮 v2：每袋三条备选 + 推荐 + 针对
const SCHOOL_LABEL := {"攻": "激进进攻", "守": "稳健防御", "反": "反制埋伏", "控": "沉默延后"}

# 对手已公开的牌：关键词、技能类型、血少的卡、全场伤害、高伤害招
static func foe_profile(foe: Dictionary) -> Dictionary:
	var kws: Array = []
	var tags := {}
	var low: Array = []
	var aoe := 0
	var big := 0
	var heavy: Array = []
	for u in foe.get("units", []):
		if str(u.get("kw", "")) != "":
			kws.append(str(u.kw))
		if int(u.max_hp) <= 8 and not u.skills.is_empty():
			low.append(str(u.get("name", "")))
		for sk in u.get("skills", []):
			var t := str(sk.get("kind_tag", "atk"))
			tags[t] = int(tags.get(t, 0)) + 1
			if "衰弱" in sk.words or "灼烧" in sk.words:
				tags["ctl"] = int(tags.get("ctl", 0)) + 1
			if t == "atk":
				if "全部" in sk.words:
					aoe += 1
				if int(sk.get("cost", 0)) >= 28:
					big += 1
					heavy.append(str(sk.get("name", "")))
	return {"kws": kws, "tags": tags, "low": low, "aoe": aoe, "big": big, "heavy": heavy}

# 这条路线针对对手已亮出的牌有什么用：返回 {bonus, note}。“针对”不只是打断：挡住它、反弹它、拆掉它、抢先打倒它都算。
static func _relevance(a: Dictionary, prof: Dictionary) -> Dictionary:
	var params: Dictionary = a.params
	var tid: String = str(a.tid)
	var role: String = str(a.role)
	var tags: Dictionary = prof.tags
	var best := {"bonus": 0.0, "note": ""}
	var cand: Array = []
	if "首挡" in prof.kws and int(params.get("rep", 0)) > 0:
		cand.append({"bonus": 2.2, "note": "对手有带【首挡】的卡：多段攻击的第二下能打进去，首挡只能挡第一下"})
	if (int(tags.get("heal", 0)) > 0 or int(tags.get("def", 0)) > 0) and role == "控":
		cand.append({"bonus": 1.6, "note": "对手会治疗/叠铁壁：灼烧和衰弱能慢慢磨掉它"})
	if int(tags.get("heal", 0)) > 0 and tid in ["tax", "burst"]:
		cand.append({"bonus": 1.4, "note": "对手会回血：治疗惩罚/爆发伤害能压过它的治疗"})
	if int(tags.get("trap", 0)) > 0 and tid == "remove":
		cand.append({"bonus": 1.6, "note": "对手布了埋伏：驱散能提前拆掉它"})
	if int(prof.get("aoe", 0)) > 0 and role in ["守", "反"]:
		cand.append({"bonus": 2.0, "note": "对手有全场攻击：全队减伤、铁壁、转移、回敬能一次挡住或还回去"})
	if int(prof.get("big", 0)) > 0 and (role in ["守", "反", "控"]):
		cand.append({"bonus": 1.7, "note": "对手有大招：减伤、铁壁、改道、转为治疗、延后都能化解"})
	if int(tags.get("atk", 0)) >= 2 and role in ["守", "反"]:
		cand.append({"bonus": 1.3, "note": "对手进攻型卡很多：减伤、改道、反噬都能克制它"})
	if not prof.low.is_empty() and tid in ["atk1", "chase"]:
		cand.append({"bonus": 1.3, "note": "对手有血很少的卡（%s）：单点或追击能直接斩杀" % str(prof.low[0])})
	if "不屈" in prof.kws and (int(params.get("rep", 0)) > 0 or int(params.get("dbl", 0)) > 0):
		cand.append({"bonus": 1.1, "note": "对手有【不屈】：一下打不死也会留 1 点血，爆发或多段才能一口气打倒"})
	for c in cand:
		if float(c.bonus) > float(best.bonus):
			best = c
	return best

static func _how_text(sk: Dictionary) -> String:
	var S = load("res://scripts/compose/sentence.gd")
	var parts: Array = []
	for t in S.tokens_of_skill(sk.nodes):
		parts.append("〔数字〕" if str(t.t) == "N" else str(t.v))
	return " ".join(parts)

# 每袋三条备选（进攻 / 防御或反制 / 打断控场），再推荐一袋
static func draft_plan(pool: Dictionary, deck: Dictionary, bags: Array, foe: Dictionary) -> Dictionary:
	var avail := free_words(pool, deck)
	var base := route_status(avail)
	var prof := foe_profile(foe)
	var per: Array = []
	for bag in bags:
		var after := route_status(_bag_free(avail, bag))
		var opts: Array = []
		var score := 0.0
		for slot in [["攻"], ["守", "反"], ["控"]]:
			var best: Dictionary = {}
			var best_sc := -999.0
			for i in after.size():
				var a: Dictionary = after[i]
				if not (str(a.role) in slot):
					continue
				var rel := _relevance(a, prof)
				var buildable: bool = int(a.n) == 0
				var fresh: bool = buildable and int(base[i].n) > 0
				var sc: float = float(a.w) + float(rel.bonus) - (0.9 if str(a.role) == "反" and float(rel.bonus) <= 0.0 else 0.0) + (1.2 if fresh else 0.0) - (0.0 if buildable else 2.0 + float(a.n) * 0.7)
				if sc > best_sc:
					best_sc = sc
					best = {"school": SCHOOL_LABEL[str(slot[0])] if slot.size() == 1 else ("稳健防御" if str(a.role) == "守" else "反制埋伏"),
						"name": a.name, "desc": a.desc, "buildable": buildable, "fresh": fresh, "n": int(a.n),
						"missing": _missing_text(a.missing), "note": rel.note, "score": sc,
						"text": str(a.skill.text), "how": _how_text(a.skill)}
			if not best.is_empty():
				opts.append(best)
				if best.buildable:
					score += float(best.score)
		per.append({"options": opts, "score": score})
	var pick := 0 if per[0].score >= per[1].score else 1
	var win: Dictionary = per[pick]
	var top: Dictionary = {}
	for o in win.options:
		if o.buildable and (top.is_empty() or o.score > top.score):
			top = o
	var reason := "两袋都不太能拼出成型的招，选词更多、更基础的一袋稳妥"
	if not top.is_empty():
		reason = "拿这袋能拼出【%s】（%s）。怎么拼：%s" % [top.name, top.desc, top.how]
		if top.note != "":
			reason += "。针对：" + str(top.note)
	return {"pick": pick, "per_bag": per, "reason": reason, "top": top}

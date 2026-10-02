extends RefCounted
# 招式模板：简单编辑器的“填空式招式”，同时是AI的构筑素材。
# 每个模板把参数拼成同一种节点树（即复杂编辑器里的树），所以两种编辑器生成的牌完全同构。

const G = preload("res://scripts/core/grammar.gd")

const ENEMY_PICKS := [
	["choose", "所选一个"], ["first", "最前"], ["last", "最后"], ["lowest", "最低生命"], ["highest", "最高生命"], ["random", "随机一个"],
]
const ALLY_PICKS := [
	["self", "自身"], ["choose", "所选一个"], ["lowest", "最低生命"], ["all", "全队"],
]
const OBSERVE := [["self", "自身"], ["all", "全队"]]

# “全部/全队”已取消：现在是“选择 一个 一个 一个 …”选满 3 个（场上不够就选能选的）
static func all4(side: String) -> Dictionary:
	return G.T("choose", side, {"n": G.MAX_PICK})

static func tspec(pick: String, side: String) -> Dictionary:
	if pick == "self":
		return G.T("self", "self")
	if pick == "all":
		return all4(side)
	return G.T(pick, side)

# -------- 模板目录（界面用） --------
# params: [{key,label,kind:"enum"|"int"|"bool", options:[[value,label]], min,max, default}]
static func catalog() -> Array:
	return [
		{"id": "atk1", "family": "攻", "title": "单点打击", "glyph": "斩", "blurb": "对一个敌人造成伤害。可叠双倍、重复。",
			"params": [
				{"key": "tgt", "label": "目标", "kind": "enum", "options": ENEMY_PICKS, "default": "choose"},
				{"key": "n", "label": "伤害", "kind": "int", "min": 1, "max": 60, "default": 15},
				{"key": "dbl", "label": "双倍次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "rep", "label": "重复次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "alt", "label": "写法", "kind": "enum", "options": [[0, "造成伤害"], [1, "减少当前生命"]], "default": 0},
				{"key": "sync", "label": "同时（重复一起落下）", "kind": "bool", "default": false},
			]},
		{"id": "atkA", "family": "攻", "title": "范围打击", "glyph": "轰", "blurb": "对全部（或逐个）敌人造成同样的伤害。",
			"params": [
				{"key": "scope", "label": "范围", "kind": "enum", "options": [["all", "选满 3 个"]], "default": "all"},
				{"key": "n", "label": "伤害", "kind": "int", "min": 1, "max": 60, "default": 12},
				{"key": "dbl", "label": "双倍次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "rep", "label": "重复次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "sync", "label": "同时（重复/逐个一起落下）", "kind": "bool", "default": false},
			]},
		{"id": "chase", "family": "攻", "title": "追击", "glyph": "追", "blurb": "反复打生命最低的敌人，直到它的当前生命低于门槛。每次重新付数字。",
			"params": [
				{"key": "n", "label": "每次伤害", "kind": "int", "min": 1, "max": 30, "default": 8},
				{"key": "th", "label": "直到当前生命低于", "kind": "int", "min": 1, "max": 20, "default": 4},
			]},
		{"id": "split", "family": "攻", "title": "分流打击", "glyph": "分", "blurb": "总伤害拆成两段，打两个目标。总额只付一次。",
			"params": [
				{"key": "n", "label": "总伤害", "kind": "int", "min": 2, "max": 60, "default": 20},
				{"key": "tgt1", "label": "目标一", "kind": "enum", "options": ENEMY_PICKS, "default": "choose"},
				{"key": "tgt2", "label": "目标二", "kind": "enum", "options": ENEMY_PICKS, "default": "lowest"},
				{"key": "gap", "label": "第二段延后(秒)", "kind": "int", "min": 0, "max": 9, "default": 0},
			]},
		{"id": "copy", "family": "攻", "title": "复制打击", "glyph": "叠", "blurb": "造成伤害后，把实际伤害复制给另一个目标。",
			"params": [
				{"key": "n", "label": "伤害", "kind": "int", "min": 1, "max": 60, "default": 12},
				{"key": "tgt", "label": "首个目标", "kind": "enum", "options": ENEMY_PICKS, "default": "choose"},
				{"key": "tgt2", "label": "复制给", "kind": "enum", "options": [["lowest", "最低生命"], ["highest", "最高生命"], ["random", "随机一个"], ["first", "最前"], ["last", "最后"]], "default": "lowest"},
			]},
		{"id": "drain", "family": "攻", "title": "汲取", "glyph": "吸", "blurb": "造成伤害，再按实际伤害治疗自身。",
			"params": [
				{"key": "tgt", "label": "目标", "kind": "enum", "options": ENEMY_PICKS, "default": "choose"},
				{"key": "n", "label": "伤害", "kind": "int", "min": 1, "max": 60, "default": 12},
			]},
		{"id": "heal", "family": "守", "title": "治疗", "glyph": "愈", "blurb": "恢复生命。可叠双倍。",
			"params": [
				{"key": "tgt", "label": "目标", "kind": "enum", "options": ALLY_PICKS, "default": "self"},
				{"key": "n", "label": "治疗", "kind": "int", "min": 1, "max": 60, "default": 12},
				{"key": "dbl", "label": "双倍次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "alt", "label": "写法", "kind": "enum", "options": [[0, "恢复生命"], [1, "增加当前生命"]], "default": 0},
			]},
		{"id": "mit", "family": "守", "title": "减伤", "glyph": "御", "blurb": "降低目标受到的伤害。比例越投越难再提高。",
			"params": [
				{"key": "tgt", "label": "目标", "kind": "enum", "options": ALLY_PICKS, "default": "self"},
				{"key": "mode", "label": "方式", "kind": "enum", "options": [["pct", "按比例"], ["fixed", "每次固定"]], "default": "pct"},
				{"key": "n", "label": "投入", "kind": "int", "min": 1, "max": 60, "default": 20},
				{"key": "dur", "label": "持续(秒,0=本轮)", "kind": "int", "min": 0, "max": 20, "default": 0},
			]},
		{"id": "status", "family": "控", "title": "叠层状态", "glyph": "咒", "blurb": "给目标一个会自己长大的状态：1 级起步，每过一轮 +1 级，效果指数增长；持久让它撑得更久，续放再 +1 级。易伤、灼烧、衰弱给敌人，蓄力、铁壁给自己。",
			"params": [
				{"key": "st", "label": "状态", "kind": "enum", "options": [["易伤", "易伤"], ["灼烧", "灼烧"], ["衰弱", "衰弱"], ["蓄力", "蓄力"], ["铁壁", "铁壁"]], "default": "易伤"},
				{"key": "tgt", "label": "目标（敌方状态用）", "kind": "enum", "options": ENEMY_PICKS, "default": "choose"},
				{"key": "dbl", "label": "双倍次数（一次加几级）", "kind": "int", "min": 0, "max": 2, "default": 0},
				{"key": "ext", "label": "持久次数（持续 1/2/4/8 轮）", "kind": "int", "min": 0, "max": 3, "default": 0},
			]},
		{"id": "redirect", "family": "反", "title": "改道", "glyph": "转", "blurb": "当被保护者即将受伤，把这次伤害转移给别人。",
			"params": [
				{"key": "obs", "label": "保护", "kind": "enum", "options": OBSERVE, "default": "all"},
				{"key": "to", "label": "转给", "kind": "enum", "options": [["source", "来源"], ["lowest", "敌方最低生命"], ["highest", "敌方最高生命"], ["random", "敌方随机"], ["self", "自身(替人挡)"]], "default": "source"},
				{"key": "n", "label": "每人转移上限", "kind": "int", "min": 1, "max": 60, "default": 20},
				{"key": "dbl", "label": "双倍次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "freq", "label": "次数", "kind": "enum", "options": [["once", "第一次"], ["every", "每次"]], "default": "every"},
			]},
		{"id": "convert", "family": "反", "title": "转伤为疗", "glyph": "化", "blurb": "把即将受到的伤害改写成等量治疗。",
			"params": [
				{"key": "obs", "label": "保护", "kind": "enum", "options": OBSERVE, "default": "all"},
				{"key": "n", "label": "每人转换上限", "kind": "int", "min": 1, "max": 60, "default": 20},
				{"key": "dbl", "label": "双倍次数", "kind": "int", "min": 0, "max": 3, "default": 0},
				{"key": "freq", "label": "次数", "kind": "enum", "options": [["once", "第一次"], ["every", "每次"]], "default": "every"},
			]},
		{"id": "reflect", "family": "反", "title": "回敬", "glyph": "反", "blurb": "受到伤害后，按该次伤害回敬来源。",
			"params": [
				{"key": "obs", "label": "监听", "kind": "enum", "options": OBSERVE, "default": "self"},
				{"key": "mult", "label": "倍率", "kind": "enum", "options": [[0, "等量"], [1, "双倍"], [-1, "一半"]], "default": 0},
				{"key": "freq", "label": "次数", "kind": "enum", "options": [["once", "第一次"], ["every", "每次"]], "default": "every"},
			]},
		{"id": "burst", "family": "反", "title": "遗志", "glyph": "遗", "blurb": "自身倒下时，对全部敌人造成伤害。",
			"params": [
				{"key": "n", "label": "伤害", "kind": "int", "min": 1, "max": 60, "default": 15},
			]},
		{"id": "engine", "family": "反", "title": "治疗引爆", "glyph": "爆", "blurb": "给全队治疗；每次实际恢复，按恢复量对敌人造成伤害。",
			"params": [
				{"key": "n", "label": "治疗", "kind": "int", "min": 1, "max": 60, "default": 10},
				{"key": "to", "label": "伤害对象", "kind": "enum", "options": [["all", "选满 3 个敌人"], ["lowest", "敌方最低生命"]], "default": "all"},
			]},
		{"id": "tax", "family": "反", "title": "见招收税", "glyph": "税", "blurb": "敌人每发动一个技能，就对施法者造成伤害。",
			"params": [
				{"key": "n", "label": "伤害", "kind": "int", "min": 1, "max": 60, "default": 10},
			]},
		{"id": "regen", "family": "守", "title": "回合结算", "glyph": "养", "blurb": "本轮结束时，全队恢复生命。",
			"params": [
				{"key": "n", "label": "治疗", "kind": "int", "min": 1, "max": 60, "default": 6},
			]},
		{"id": "time", "family": "控", "title": "时间术", "glyph": "时", "blurb": "延后对方已宣告的技能，或提前自己的。",
			"params": [
				{"key": "op", "label": "方式", "kind": "enum", "options": [["delay", "延后对方"], ["advance", "提前自己"]], "default": "delay"},
				{"key": "sec", "label": "秒数（延后/提前用）", "kind": "int", "min": 1, "max": 19, "default": 4},
			]},
		{"id": "remove", "family": "控", "title": "驱散", "glyph": "散", "blurb": "移除一个已建立的限时效果，或目标身上的状态。",
			"params": [
				{"key": "what", "label": "移除", "kind": "enum", "options": [["限时效果", "限时效果"], ["状态", "状态"]], "default": "限时效果"},
				{"key": "allyside", "label": "对己方使用", "kind": "bool", "default": false},
			]},
		{"id": "swap", "family": "控", "title": "换位", "glyph": "换", "blurb": "与己方另一个随从交换位置。",
			"params": []},
	]

static func template(tid: String) -> Dictionary:
	for t in catalog():
		if t.id == tid:
			return t
	return {}

static func defaults(tid: String) -> Dictionary:
	var p := {}
	for prm in template(tid).get("params", []):
		p[prm.key] = prm.default
	return p

# -------- 构造 --------
static func build(tid: String, pin: Dictionary) -> Dictionary:
	var p := defaults(tid)
	for k in pin:
		p[k] = pin[k]
	var nodes: Array = []
	var title: String = template(tid).title
	match tid:
		"atk1":
			var a1 := G.dmg(tspec(p.tgt, "enemy"), G.N(int(p.n)), {"alt": int(p.alt), "dbl": int(p.dbl), "rep": int(p.rep)})
			_timing(a1, p)
			nodes = [a1]
		"atkA":
			var aa := G.dmg(all4("enemy"), G.N(int(p.n)), {"dbl": int(p.dbl), "rep": int(p.rep)})
			_timing(aa, p)
			nodes = [aa]
		"chase":
			var low := G.T("lowest", "enemy")
			nodes = [G.until_node(G.cmp_cond(G.REF("cur_hp", low), "lt", G.N(int(p.th))), G.dmg(low, G.N(int(p.n))))]
		"split":
			var part1 := int(ceil(int(p.n) * 0.6))
			nodes = [G.split("dmg", int(p.n), [
				{"target": tspec(p.tgt1, "enemy"), "part": part1, "delay": 0},
				{"target": tspec(p.tgt2, "enemy"), "part": int(p.n) - part1, "delay": int(p.gap)}])]
		"copy":
			nodes = [G.copy_to(G.dmg(tspec(p.tgt, "enemy"), G.N(int(p.n))), tspec(p.tgt2, "enemy"))]
		"drain":
			nodes = [G.chain(G.dmg(tspec(p.tgt, "enemy"), G.N(int(p.n))), G.heal(G.T("self", "self"), G.REF("prev")))]
		"heal":
			nodes = [G.heal(tspec(p.tgt, "ally"), G.N(int(p.n)), {"alt": int(p.alt), "dbl": int(p.dbl)})]
		"mit":
			nodes = [G.mit(tspec(p.tgt, "ally"), p.mode, int(p.n), int(p.dur))]
		"status":
			var ally_side: bool = str(G.STATUS_SIDE.get(p.st, "enemy")) == "ally"
			var tnode: Dictionary = G.T("choose", "ally") if ally_side else tspec(p.tgt, "enemy")
			var stn := G.status(p.st, tnode, 0, 0, {})
			if int(p.dbl) > 0:
				stn["dbl"] = int(p.dbl)
			if int(p.ext) > 0:
				stn["ext"] = int(p.ext)
			nodes = [stn]
			title = ("叠" if int(p.ext) == 0 else "持久") + p.st
		"redirect":
			var to: Dictionary
			match p.to:
				"source": to = G.T("source", "ref")
				"self": to = G.T("self", "self")
				_: to = G.T(p.to, "enemy")
			var rd := G.redirect(to, int(p.n))
			if int(p.dbl) > 0:
				rd["dbl"] = int(p.dbl)
			nodes = [G.watch("pending_dmg", _observe(p.obs), rd, {"freq": p.freq})]
		"convert":
			var cv := G.convert_heal(int(p.n))
			if int(p.dbl) > 0:
				cv["dbl"] = int(p.dbl)
			nodes = [G.watch("pending_dmg", _observe(p.obs), cv, {"freq": p.freq})]
		"reflect":
			var o := {}
			if int(p.mult) > 0:
				o["dbl"] = 1
			elif int(p.mult) < 0:
				o["half"] = 1
			nodes = [G.watch("damaged", _observe(p.obs), G.dmg(G.T("source", "ref"), G.REF("event_damage"), o), {"freq": p.freq})]
		"burst":
			nodes = [G.watch("down", G.T("self", "self"), G.dmg(all4("enemy"), G.N(int(p.n))), {"freq": "once"})]
		"engine":
			nodes = [
				G.watch("healed", all4("ally"), G.dmg(tspec(p.to, "enemy"), G.REF("event_heal")), {"freq": "every"}),
				G.heal(all4("ally"), G.N(int(p.n)), {"delay": 1}),
			]
		"tax":
			nodes = [G.watch("cast", all4("enemy"), G.dmg(G.T("source", "ref"), G.N(int(p.n))), {"freq": "every"})]
		"regen":
			nodes = [G.watch("round_end", G.T("self", "self"), G.heal(all4("ally"), G.N(int(p.n))), {"freq": "once"})]
		"time":
			var sd: String = "ally" if p.op == "advance" else "enemy"
			var tn := G.time_op(p.op, sd, int(p.sec))
			nodes = [tn]
			title = {"delay": "延后", "advance": "提前"}[p.op]
		"remove":
			var side2: String = "ally" if p.allyside else "enemy"
			nodes = [G.remove(p.what, tspec("self" if p.allyside else "choose", side2))]
		"swap":
			nodes = [G.swap(G.T("choose", "ally"))]
	var sk := G.skill(title, nodes)
	sk["template"] = tid
	sk["params"] = p
	return G.finalize(sk)

static func _timing(node: Dictionary, p: Dictionary) -> void:
	if p.get("sync", false):
		node["sync"] = true

static func _observe(obs: String) -> Dictionary:
	return G.T("self", "self") if obs == "self" else all4("ally")

# 模板参数决定的“简短名字”
static func short_name(sk: Dictionary) -> String:
	return String(sk.get("name", "技能"))

# 某模板在当前词库下是否可造（返回缺词）
static func missing_for(tid: String, p: Dictionary, pool: Dictionary, reserved: Dictionary = {}) -> Dictionary:
	var sk := build(tid, p)
	var avail := {}
	for w in pool:
		avail[w] = int(pool[w]) - int(reserved.get(w, 0))
	return G.missing(sk.words, avail)

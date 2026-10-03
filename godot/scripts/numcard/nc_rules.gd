extends RefCounted
# 数字牌模式 · 规则与数值（和老模式完全分开；数值来自 设计与审计/数字牌模式/nc_sim2.py 的调平衡结果）
#   · 职业 = 一个人人都用的基础词的特长：
#       并流（并）  长度：一句能拼更多段，“并”更便宜
#       续流（持续）时长：持续能接在伤害、恢复、减伤上，这一段以后每轮同一秒自动再来一次
#       择流（选择）时机：目标到宣告全部结束后才定（宣告时对手只看到“待定”），定好的人倒了自动换人
#       血流（自身）费用：行动点不够，可以用出手随从的生命来付
#   · 数字是牌：1 免费无限用；2~5 从职业阶梯解锁（可反复用，用完冷却一轮）；
#     一轮里掉血多或有随从倒下，掷两个骰子，掷出几给一张几（一次性）；第 3/5/7 轮各发一张保底数字
#   · 数字 = 次数：目标个数、伤害、治疗、减伤、重复次数、持续轮数、延后秒数，都用同一种数字牌，每个位置一张
#   · 各职业各自得分，先到自己的目标分赢；击倒一个敌人 = 目标分的 15%
#   · 轮流宣告：先宣告的一方每轮轮换，一次定一个随从的一句

const CLASSES := ["并", "续", "择", "血"]
const CLASS_NAME := {"并": "并流", "续": "续流", "择": "择流", "血": "血流"}
const CLASS_WORD := {"并": "并", "续": "持续", "择": "选择", "血": "自身"}
const METRIC := {"并": "chain", "续": "cont", "择": "pick", "血": "blood"}
const METRIC_NAME := {"并": "连段", "续": "续出", "择": "命中", "血": "血债"}
const TARGET := {"并": 34, "续": 60, "择": 63, "血": 79}
const CLASS_TALENT := {
	"并": "上限：一句最多 %d 段（别人 3 段），每多一段只加 %d 行动点（别人 2），起手不因为段多变晚。限制：一句里同一个动作词（造成、恢复、减伤、易伤、灼烧、衰弱、转移、延后、移除）只能用一次",
	"续": "上限：【持续】能接在 造成、恢复、减伤 后面，这一段以后每轮同一秒自动再来一次（不花行动点），同时能挂 %d 个续。限制：带【持续】的这句只能一段，不能接【并】。出手的随从倒下或被【移除】，它的续就断了",
	"择": "上限：【选择】几个目标不用数字牌，想选几个选几个；目标宣告时不定（对手只看到“待定”），双方宣告完再定，定好的人倒了自动换人。限制：句子里不能用【重复】",
	"血": "上限：行动点不够时，用出手随从的生命来付，想付多少付多少（1 点生命顶 1 点行动点，至少留 1 血）。限制：用血付的句子里不能有【恢复】【减伤】【转移】",
}
const CLASS_GOAL := {
	"并": "连段分：两段以上的句子里，兑现了几段就得几分；整句每段都兑现再 +1",
	"续": "续出来的效果：续自动再来的那几次打出的伤害、回的血、挡下的伤害，加上你上的灼烧烧掉的、易伤多打的、衰弱让对方少打的",
	"择": "命中：对敌人实际打掉的血（打空、被挡掉的不算）",
	"血": "血债：用生命付掉的点数，加上用血付的句子对敌人打掉的血",
}
const CLASS_COLOR := {"并": Color("2fb8c8"), "续": Color("d89a2a"), "择": Color("9ac43a"), "血": Color("c0283a")}

const HP_POOL := 21
const HP_MIN := 3
const UNIT_NAMES := ["小剑", "小盾", "小咒"]
const UNIT_GLYPHS := ["剑", "盾", "咒"]

const AP_START := 6
const AP_INCOME := 6
const AP_CAP := 12
const BASE_COST := 1
const AND_COST := 2
const CLAUSE_MAX := 3
const TIMELINE := 10
const MAX_ROUNDS := 12
const KO_PCT := 0.15

const LADDER := [0.10, 0.25, 0.45, 0.70]
const LADDER_VALUES := [2, 3, 4, 5]
const LADDER_COPIES := 2
const DICE_HP := 4
const DICE_COUNT := 2
const FLOOR := {3: 2, 5: 3, 7: 4}     # 保底数字：第几轮开始时双方各得一张（可反复用）

# 职业天赋的数值
const B_CLAUSES := 7
const B_AND := 1
const B_BONUS := 1
const B_MODE := "count"              # 并流得分：count = 兑现的段数；kinds = 兑现的效果种类
const B_STKIND := true                # 易伤、灼烧、衰弱合起来只算一种效果
const B_WIND := 0                     # 并流每多一段起手晚几秒（别人 1）
const B_LEN := 0                      # 并流整句全中时，超过两段的每一段再 +几分
const X_SLOTS := 3
const X_SLOTS_UP := []
const Z_HEAL := false
const Y_CAP := 99
const Y_CAP_UP := []
const Y_GUARD := 0.0                  # 血契护体：用血付了几点，那个随从本轮就多几点保护
const Y_SHIELD := false               # true：这几点是一层护盾（本轮一共挡这么多）；false：是减伤（每下少受这么多）
# 职业的用词限制（输入端：拼的时候哪些词不能这么用，不改结算）
const B_ONCE := true                 # 并流：一句里同一个动作词（造成、恢复、减伤、易伤、灼烧、衰弱、转移、延后、移除）只能用一次
const X_SINGLE := true               # 续流：带【持续】（续）的句子只能一段，不能接【并】
const Z_FREE := true                 # 择流：【选择】几个目标不用数字牌（上限提高）
const Z_NOREP := true                # 择流：句子里不能用【重复】
const Y_NOHEAL := true                # 血流：用血付的句子里不能有【恢复】
const Y_NODEF := true                # 血流：用血付的句子里不能有【减伤】【转移】
const Y_DICE := true                  # 用血付的生命也算进“一轮掉的血”（挫折骰子）

const DECK_SIZE := 10
const COPY_MAX := 2
const KW_SLOTS := 3

# 进阶词（要组进卡组；用过的那一张下一轮冷却）
# 删掉的：铁壁（= 减伤 + 数字牌）、蓄力（= 伤害 + 数字牌）、回敬（同价的转移完全压过它）
const WORDS := {
	"易伤": {"price": 1, "kind": "status", "on": "enemy", "desc": "给敌人上易伤：每级让它每次多受 1 点伤害。每过一轮自动 +1 级"},
	"灼烧": {"price": 1, "kind": "status", "on": "enemy", "desc": "给敌人上灼烧：每轮结束时，每级让它掉 1 点血。每过一轮自动 +1 级"},
	"衰弱": {"price": 1, "kind": "status", "on": "enemy", "desc": "给敌人上衰弱：每级让它每次少打 1 点伤害。每过一轮自动 +1 级"},
	"转移": {"price": 2, "kind": "redirect", "on": "ally", "desc": "本轮打向这个随从的敌方伤害，转给出手的人（它自己不掉血）"},
	"延后": {"price": 1, "kind": "delay", "on": "act", "desc": "把对方已宣告的一句往后推 N 秒；推出时间轴就落空"},
	"移除": {"price": 1, "kind": "remove", "on": "enemy", "desc": "拆掉一个敌人身上的减伤、转移，并掐断它挂着的续"},
}
const WORD_ORDER := ["易伤", "灼烧", "衰弱", "转移", "延后", "移除"]
const ENEMY_ST := ["易伤", "灼烧", "衰弱"]
const KEYWORDS := {
	"首挡": "每轮第一次被敌人打中，整下挡掉",
	"不屈": "每轮第一次被打到 0 血，留 1 血",
}
const KW_ORDER := ["首挡", "不屈"]

# 预设卡组（只是建议，可以随便改）
const PRESETS := {
	"并": {"words": {"易伤": 2, "灼烧": 1, "衰弱": 2, "转移": 2, "延后": 1, "移除": 2}, "kws": ["不屈", "首挡", "首挡"]},
	"续": {"words": {"易伤": 2, "灼烧": 2, "衰弱": 2, "转移": 1, "延后": 1, "移除": 2}, "kws": ["首挡", "不屈", "不屈"]},
	"择": {"words": {"易伤": 2, "灼烧": 1, "衰弱": 1, "转移": 2, "延后": 2, "移除": 2}, "kws": ["首挡", "不屈", "首挡"]},
	"血": {"words": {"易伤": 2, "灼烧": 2, "衰弱": 1, "转移": 2, "延后": 1, "移除": 2}, "kws": ["不屈", "不屈", "首挡"]},
}

static func talent_text(cls: String) -> String:
	match cls:
		"并":
			return CLASS_TALENT["并"] % [B_CLAUSES, B_AND]
		"续":
			return CLASS_TALENT["续"] % X_SLOTS
	return str(CLASS_TALENT.get(cls, ""))

# 这一方现在的职业上限（会随职业得分涨）
static func caps(cls: String, p: float) -> Dictionary:
	var out := {"clauses": CLAUSE_MAX, "and": AND_COST, "slots": 0, "blood": 0, "late": false, "wind": 1,
		"once": false, "cont_single": false, "freecount": false, "norep": false, "noheal": false, "nodef": false}
	match cls:
		"并":
			out.clauses = B_CLAUSES
			out["and"] = B_AND
			out["wind"] = B_WIND
			out.once = B_ONCE
		"续":
			var n := X_SLOTS
			for t in X_SLOTS_UP:
				if p >= float(t):
					n += 1
			out.slots = n
			out.cont_single = X_SINGLE
		"择":
			out.late = true
			out.freecount = Z_FREE
			out.norep = Z_NOREP
		"血":
			var b := Y_CAP
			for pr in Y_CAP_UP:
				if p >= float(pr[0]):
					b = int(pr[1])
			out.blood = b
			out.noheal = Y_NOHEAL
			out.nodef = Y_NODEF
	return out

static func deck_size(words: Dictionary) -> int:
	var n := 0
	for w in words:
		n += int(words[w])
	return n

# 卡组是否合规：返回错误文字，空串 = 合规
static func deck_problem(words: Dictionary, kws: Array) -> String:
	for w in words:
		if not WORDS.has(w):
			return "没有【%s】这个进阶词" % w
		if int(words[w]) > COPY_MAX:
			return "【%s】最多带 %d 张" % [w, COPY_MAX]
	var n := deck_size(words)
	if n != DECK_SIZE:
		return "卡组要正好 %d 张进阶词（现在 %d 张）" % [DECK_SIZE, n]
	if kws.size() != KW_SLOTS:
		return "要选 %d 个关键词（每个随从一个）" % KW_SLOTS
	for k in kws:
		if not KEYWORDS.has(str(k)):
			return "没有【%s】这个关键词" % str(k)
	return ""

static func hp_problem(hps: Array) -> String:
	if hps.size() != 3:
		return "要给三个随从各分一份生命"
	var tot := 0
	for h in hps:
		if int(h) < HP_MIN:
			return "每个随从至少 %d 点生命" % HP_MIN
		tot += int(h)
	if tot != HP_POOL:
		return "生命总和要正好 %d（现在 %d）" % [HP_POOL, tot]
	return ""

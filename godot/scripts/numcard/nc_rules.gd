extends RefCounted
# 数字牌模式 · 规则与数值（和老模式完全分开；数值来自 设计与审计/数字牌模式/nc_sim.py 十轮迭代的定稿）
#   · 数字是牌：1 免费无限用；2~5 从职业阶梯解锁（可反复用，用完冷却一轮）；
#     一轮里掉血多或有随从倒下，掷两个骰子，掷出几给一张几（一次性）
#   · 数字 = 次数：目标个数、伤害、治疗、减伤、重复次数、持续轮数、延后秒数，都用同一种数字牌，每个位置一张
#   · 五个职业各自得分，先到自己的目标分赢；击倒一个敌人 = 目标分的 15%
#   · 轮流宣告：先宣告的一方每轮轮换，一次定一个随从的一句

const CLASSES := ["进攻", "守护", "积蓄", "治疗", "控制"]
const METRIC := {"进攻": "dmg", "守护": "prev", "积蓄": "pay", "治疗": "heal", "控制": "ctrl"}
const TARGET := {"进攻": 35, "守护": 18, "积蓄": 38, "治疗": 35, "控制": 25}
const CLASS_GOAL := {
	"进攻": "对敌人造成的伤害",
	"守护": "挡掉、转走的敌方伤害",
	"积蓄": "状态兑现出来的效果（易伤和蓄力多打的、灼烧烧掉的、铁壁和衰弱少挨的）",
	"治疗": "给己方恢复的生命（自己打自己再奶也算）",
	"控制": "让对方白花的行动点：延后的秒数、移除的东西、落空的招、衰弱压低的输出",
}
const CLASS_COLOR := {"进攻": Color("c0504d"), "守护": Color("4f81bd"), "积蓄": Color("b08a3a"), "治疗": Color("3a9470"), "控制": Color("8a5ab8")}

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

const DECK_SIZE := 15
const COPY_MAX := 2
const KW_SLOTS := 3

# 进阶词（要组进卡组；用过的那一张下一轮冷却）
const WORDS := {
	"易伤": {"price": 1, "kind": "status", "on": "enemy", "desc": "给敌人上易伤：每级让它每次多受 1 点伤害。每过一轮自动 +1 级"},
	"灼烧": {"price": 1, "kind": "status", "on": "enemy", "desc": "给敌人上灼烧：每轮结束时，每级让它掉 1 点血。每过一轮自动 +1 级"},
	"衰弱": {"price": 1, "kind": "status", "on": "enemy", "desc": "给敌人上衰弱：每级让它每次少打 1 点伤害。每过一轮自动 +1 级"},
	"蓄力": {"price": 1, "kind": "status", "on": "ally", "desc": "给己方上蓄力：下一次出手，每下多打（等级）点，打完用掉。每过一轮自动 +1 级"},
	"铁壁": {"price": 1, "kind": "status", "on": "ally", "desc": "给己方上铁壁：每级让它每次少受 1 点伤害。每过一轮自动 +1 级"},
	"回敬": {"price": 2, "kind": "reflect", "on": "ally", "desc": "本轮这个随从每次被敌人打中，把打中的伤害原样打回出手的人"},
	"转移": {"price": 2, "kind": "redirect", "on": "ally", "desc": "本轮打向这个随从的敌方伤害，转给出手的人（它自己不掉血）"},
	"延后": {"price": 1, "kind": "delay", "on": "act", "desc": "把对方已宣告的一句往后推 N 秒；推出时间轴就落空"},
	"移除": {"price": 1, "kind": "remove", "on": "enemy", "desc": "拆掉一个敌人身上的保护（减伤、回敬、转移）和它自己的蓄力、铁壁"},
}
const WORD_ORDER := ["易伤", "灼烧", "衰弱", "蓄力", "铁壁", "回敬", "转移", "延后", "移除"]
const KEYWORDS := {
	"首挡": "每轮第一次被敌人打中，整下挡掉",
	"不屈": "每轮第一次被打到 0 血，留 1 血",
}
const KW_ORDER := ["首挡", "不屈"]

# 预设卡组（只是建议，可以随便改）
const PRESETS := {
	"进攻": {"words": {"蓄力": 2, "易伤": 2, "灼烧": 2, "移除": 2, "延后": 2, "转移": 1, "回敬": 1, "衰弱": 1, "铁壁": 2}, "kws": ["不屈", "不屈", "首挡"]},
	"守护": {"words": {"铁壁": 2, "转移": 2, "回敬": 2, "衰弱": 2, "移除": 2, "延后": 2, "蓄力": 1, "易伤": 1, "灼烧": 1}, "kws": ["首挡", "首挡", "不屈"]},
	"积蓄": {"words": {"蓄力": 2, "易伤": 2, "灼烧": 2, "衰弱": 2, "铁壁": 2, "移除": 2, "延后": 1, "转移": 1, "回敬": 1}, "kws": ["首挡", "不屈", "不屈"]},
	"治疗": {"words": {"铁壁": 2, "衰弱": 2, "转移": 2, "回敬": 1, "移除": 2, "延后": 2, "蓄力": 1, "易伤": 1, "灼烧": 2}, "kws": ["首挡", "不屈", "首挡"]},
	"控制": {"words": {"延后": 2, "移除": 2, "衰弱": 2, "转移": 2, "回敬": 2, "易伤": 2, "灼烧": 1, "铁壁": 1, "蓄力": 1}, "kws": ["首挡", "不屈", "不屈"]},
}

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

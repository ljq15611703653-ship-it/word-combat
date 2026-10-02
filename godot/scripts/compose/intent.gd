extends RefCounted
# “我想干什么”：玩家用自己的话说想做什么，按关键词匹配到现成的路线（Coach.ROUTES），
# 再按玩家现有的词看拼得出来还是还缺什么。不用大模型：句式是有限的，匹配够用，而且拼出的句子一定合法。

const Coach = preload("res://scripts/core/coach.gd")
const R = preload("res://scripts/core/recipes.gd")
const G = preload("res://scripts/core/grammar.gd")

# 关键词（说法）→ 对应的“特征”。路线本身也带特征，说法命中的特征越多分越高
const SAY := {
	"hit": ["打", "造成", "攻击", "揍", "砍", "击", "输出", "杀", "弄死", "干掉", "斩", "秒", "灭", "扣血", "削血"],
	"aoe": ["全部", "所有", "全场", "全体", "群", "范围", "每个", "每一个", "都", "一起", "团灭", "三个", "对面", "整队", "清场"],
	"single": ["单体", "一个", "单点", "指定", "集火", "点杀", "那个"],
	"low": ["最低", "残血", "低血", "血少", "最弱", "补刀", "收割", "斩杀"],
	"chase": ["追击", "追杀", "追着", "补刀", "收割"],
	"split": ["分流", "拆开", "分给", "分摊", "两个人", "两个目标", "平分"],
	"copy": ["复制", "溅射", "顺带", "连带", "再打一个"],
	"drain": ["吸血", "汲取", "偷血", "偷", "边打边回", "打了回血"],
	"heal": ["治疗", "回血", "恢复", "奶", "补血", "加血", "救", "回复", "续命"],
	"mit": ["减伤", "防御", "挡", "抗", "护", "保护", "扛", "少受伤", "免伤", "不被打", "不要死", "别死", "保命"],
	"redirect": ["转移", "改道", "嫁祸", "甩给", "转给", "还给", "让他打自己", "打回去", "自相残杀"],
	"convert": ["变成治疗", "转为治疗", "吸收", "化伤", "把伤害变"],
	"reflect": ["反弹", "回敬", "反击", "奉还", "反伤", "打我我就打你", "以牙还牙", "挨打"],
	"tax": ["收税", "惩罚", "出招就掉血", "出手掉血", "代价", "出招的人"],
	"burst": ["遗志", "死了", "倒下", "同归于尽", "自爆", "临死", "陪葬"],
	"engine": ["引爆", "治疗变伤害", "回血变伤害", "连锁"],
	"delay": ["延后", "拖", "慢", "拖延", "晚点", "推迟", "拖住", "来不及"],
	"remove": ["驱散", "解除", "拆掉", "移除", "清掉", "破解", "拆陷阱"],
	"charge": ["蓄力", "蓄", "攒", "囤", "爆发", "憋大招", "大招", "越攒越强", "积攒"],
	"vuln": ["易伤", "更疼", "脆弱", "受伤加重", "挨打更疼", "越打越疼"],
	"burn": ["灼烧", "烧", "火", "持续伤害", "掉血", "持续掉血", "中毒", "流血", "每轮掉血", "dot", "慢慢磨"],
	"weak": ["衰弱", "虚弱", "削弱", "降低伤害", "打得轻", "废掉输出", "压制输出"],
	"wall": ["铁壁", "越来越硬", "越来越抗", "防御成长", "壁", "坦"],
	"ext": ["持久", "持续", "几轮", "长期", "久一点", "撑几轮", "多轮"],
	"dbl": ["双倍", "翻倍", "加倍", "两倍", "更强"],
	"rep": ["重复", "两次", "连续", "连击", "再来一次", "多打几下", "两下", "多段"],
	"self": ["自己", "自身", "我自己", "本体"],
	"ally": ["队友", "友方", "我方", "我的", "保护"],
}

const EXAMPLES := ["打全部敌人", "给我的随从减伤", "把伤害反弹回去", "叠蓄力后一口气打爆", "让敌人持续掉血", "给自己回血"]

# 路线 → 它的特征
static func _route_feats(r: Dictionary) -> Array:
	var f: Array = []
	var tid: String = str(r.tid)
	var p: Dictionary = r.params
	match tid:
		"atk1":
			f = ["hit", "single"]
		"atkA":
			f = ["hit", "aoe"]
		"chase":
			f = ["hit", "chase", "low"]
		"split":
			f = ["hit", "split"]
		"copy":
			f = ["hit", "copy"]
		"drain":
			f = ["hit", "drain"]
		"heal":
			f = ["heal"]
		"mit":
			f = ["mit"]
		"redirect":
			f = ["redirect"]
		"convert":
			f = ["convert", "heal"]
		"reflect":
			f = ["reflect"]
		"tax":
			f = ["tax"]
		"burst":
			f = ["burst", "hit"]
		"engine":
			f = ["engine", "heal", "hit"]
		"time":
			f = ["delay"]
		"remove":
			f = ["remove"]
		"status":
			match str(p.get("st", "")):
				"蓄力": f = ["charge"]
				"易伤": f = ["vuln"]
				"灼烧": f = ["burn", "hit"]
				"衰弱": f = ["weak"]
				"铁壁": f = ["wall", "mit"]
	if int(p.get("dbl", 0)) > 0:
		f.append("dbl")
	if int(p.get("rep", 0)) > 0:
		f.append("rep")
	if int(p.get("ext", 0)) > 0:
		f.append("ext")
	if str(p.get("tgt", "")) == "all" or str(p.get("tgt", "")) == "all_ally":
		f.append("ally")
	if str(p.get("tgt", "")) == "self":
		f.append("self")
	return f

# 说的话里命中了哪些特征：返回 {特征: 命中次数}
static func parse(text: String) -> Dictionary:
	var hit := {}
	for feat in SAY:
		for w in SAY[feat]:
			if text.contains(w):
				hit[feat] = int(hit.get(feat, 0)) + 1
				break
	return hit

static func numbers_in(text: String) -> Array:
	var out: Array = []
	var cur := ""
	for ch in text:
		if ch >= "0" and ch <= "9":
			cur += ch
		else:
			if cur != "":
				out.append(int(cur))
				cur = ""
	if cur != "":
		out.append(int(cur))
	return out

# 返回最多 n 条：[{name, desc, skill, missing, ok, score}]；ok=现有的词够拼
static func find(text: String, avail: Dictionary, n: int = 3) -> Array:
	var said := parse(text)
	if said.is_empty():
		return []
	if said.has("hit"):
		var specific := false
		for f in ["aoe", "low", "chase", "split", "copy", "drain", "burn", "burst", "engine", "charge"]:
			if said.has(f):
				specific = true
		if not specific:
			said["single"] = 1                    # 只说“打”：默认指打一个
	var nums := numbers_in(text)
	var scored: Array = []
	for r in Coach.route_status(avail):
		var feats: Array = _route_feats(r)
		var sc := 0.0
		var base_hit := 0
		for f in feats:
			if said.has(f):
				sc += 2.0 if f in ["hit", "heal", "mit"] else 3.0
				base_hit += 1
		# 说了的特征路线里没有 = 不贴切：每个扣一点
		var extra := 0
		for f in said:
			if not (f in feats):
				extra += 1
		sc -= 0.7 * float(extra)
		if base_hit == 0:
			continue
		# 路线里有你没说的特征（双倍、重复、复制……）每个扣一点：没说就用最朴素的
		for f in feats:
			if not said.has(f) and not (f in ["ally", "self"]):
				sc -= 0.6
		if int(r.n) == 0:
			sc += 1.5                              # 词够的优先
		scored.append({"r": r, "score": sc})
	scored.sort_custom(func(a, b): return float(a.score) > float(b.score))
	var out: Array = []
	var seen := {}
	for it in scored:
		var r: Dictionary = it.r
		var sk: Dictionary = r.skill
		var ps: Dictionary = r.params
		if not nums.is_empty() and _has_int_param(str(r.tid), "n"):
			var p2: Dictionary = ps.duplicate()
			p2["n"] = clampi(int(nums[0]), 1, 99)
			sk = R.build(str(r.tid), p2)
		var key := str(sk.get("text", ""))
		if seen.has(key):
			continue
		seen[key] = true
		out.append({"name": str(r.name), "desc": str(r.desc), "skill": sk, "missing": r.missing, "ok": int(r.n) == 0, "score": float(it.score)})
		if out.size() >= n:
			break
	return out

static func _has_int_param(tid: String, key: String) -> bool:
	for prm in R.template(tid).params:
		if str(prm.key) == key and str(prm.kind) == "int":
			return true
	return false

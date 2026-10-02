extends RefCounted
# 词库：从 res://data/words.tsv 读取。词实例按“词名”计数（同名词卡可互换）。

static var words: Dictionary = {}   # 词名 -> {id,name,cat,rarity,price,impl,weight,desc}
static var order: Array = []        # 词名，按编号
static var _loaded := false

const CAT_COLORS := {
	"动作": Color("c0504d"), "对象": Color("4a7fb5"), "范围": Color("8e6bb5"), "时间": Color("3f9a8c"),
	"触发": Color("d28a2e"), "结构": Color("7a8a99"), "引用": Color("5c9a4b"), "状态": Color("b5567f"),
	"关键词": Color("c7a13a"),
}
const RARITY_COLORS := {"基础": Color("9aa3ad"), "进阶": Color("5aa0e0"), "奇术": Color("e0a93a")}

static func load_all() -> void:
	if _loaded:
		return
	var f := FileAccess.open("res://data/words.tsv", FileAccess.READ)
	if f == null:
		push_error("无法读取词库")
		return
	f.get_line() # 表头
	while not f.eof_reached():
		var line := f.get_line().strip_edges()
		if line == "":
			continue
		var p := line.split("\t")
		if p.size() < 8:
			continue
		var w := {"id": p[0], "name": p[1], "cat": p[2], "rarity": p[3], "price": int(p[4]),
			"impl": int(p[5]) == 1, "weight": int(p[6]), "desc": p[7]}
		words[w.name] = w
		order.append(w.name)
	_loaded = true

static func get_word(name: String) -> Dictionary:
	load_all()
	return words.get(name, {})

static func price(name: String) -> int:
	load_all()
	return int(words[name].price) if words.has(name) else 0

static func cat_color(name: String) -> Color:
	load_all()
	if not words.has(name):
		return Color.GRAY
	return CAT_COLORS.get(words[name].cat, Color.GRAY)

static func rarity_color(name: String) -> Color:
	load_all()
	if not words.has(name):
		return Color.GRAY
	return RARITY_COLORS.get(words[name].rarity, Color.GRAY)

static func implemented() -> Array:
	load_all()
	var out: Array = []
	for n in order:
		if words[n].impl:
			out.append(n)
	return out

# 基础词（语法胶水）无限供应：每个基础词给 BASIC_SUPPLY 张，等于想用几次用几次，只付价格。
# 进阶词和奇术词只能从词兜子里拿，拿到的词永久留在词库里（一次只能装在一处）。
const BASIC_SUPPLY := 99
static var BAG_SIZE := 6              # 每个词兜子里的进阶词个数
static var BAGS_PER_ROUND := 5        # 每轮战斗结束后摆出的兜子数
static var RARE_SHARE := 0.15         # 兜子里每个位置是奇术词的概率

static func is_basic(name: String) -> bool:
	load_all()
	return words.has(name) and str(words[name].rarity) == "基础"

static func basic_supply() -> Dictionary:
	load_all()
	var out := {}
	for n in order:
		var w: Dictionary = words[n]
		if w.impl and w.rarity == "基础":
			out[n] = BASIC_SUPPLY
	return out

# 兜了：只含进阶词和奇术词（基础词不用抢）；同一个兜子里词不重复
static func draw_bag(rng: RandomNumberGenerator, size: int = -1) -> Array:
	load_all()
	if size < 0:
		size = BAG_SIZE
	var adv: Array = []
	var rare: Array = []
	for n in order:
		var w: Dictionary = words[n]
		if not w.impl:
			continue
		if w.rarity == "进阶":
			for i in int(w.weight):
				adv.append(n)
		elif w.rarity == "奇术":
			for i in int(w.weight):
				rare.append(n)
	var bag: Array = []
	var guard := 0
	while bag.size() < size and guard < 200:
		guard += 1
		var src: Array = rare if rng.randf() < RARE_SHARE else adv
		var pick: String = src[rng.randi() % src.size()]
		if not (pick in bag):
			bag.append(pick)
	bag.sort_custom(func(a, b): return words[a].id < words[b].id)
	return bag

static func draw_bags(rng: RandomNumberGenerator, n: int = -1) -> Array:
	if n < 0:
		n = BAGS_PER_ROUND
	var out: Array = []
	for i in n:
		out.append(draw_bag(rng))
	return out

# 兼容旧调用：开局的“词库”就是全部基础词（无限）
const OPENING_COUNT := 0

static func opening_words(_rng: RandomNumberGenerator) -> Array:
	var out: Array = []
	var sup := basic_supply()
	for n in sup:
		for i in int(sup[n]):
			out.append(n)
	return out

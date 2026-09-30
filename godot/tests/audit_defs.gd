extends RefCounted
# 审计用的进攻组合与反制族定义（t_audit.gd 与 t_avail.gd 共用）。
const G = preload("res://scripts/core/grammar.gd")
const R = preload("res://scripts/core/recipes.gd")

# 进攻：模板 + 参数；主数值 n 由审计按“操作费上限”拟合
static func attack_specs() -> Array:
	return [
		{"name": "单点", "tid": "atk1", "params": {}},
		{"name": "单点·双倍", "tid": "atk1", "params": {"dbl": 1}},
		{"name": "单点·双倍×2", "tid": "atk1", "params": {"dbl": 2}},
		{"name": "单点·双倍·重复", "tid": "atk1", "params": {"dbl": 1, "rep": 1}},
		{"name": "单点·重复×3", "tid": "atk1", "params": {"rep": 3}},
		{"name": "全体", "tid": "atkA", "params": {}},
		{"name": "全体·双倍", "tid": "atkA", "params": {"dbl": 1}},
		{"name": "全体·重复", "tid": "atkA", "params": {"rep": 1}},
		{"name": "全体·双倍·重复", "tid": "atkA", "params": {"dbl": 1, "rep": 1}},
		{"name": "逐个全体·双倍", "tid": "atkA", "params": {"scope": "each", "dbl": 1}},
		{"name": "分流", "tid": "split", "params": {}},
		{"name": "复制", "tid": "copy", "params": {}},
		{"name": "汲取", "tid": "drain", "params": {}},
	]

# 自拟组合（多节点）：按 n 逐步加大，取操作费不超上限的最大者
static func custom_attack(kind: String, n: int) -> Dictionary:
	match kind:
		"易伤+双倍打击":
			return G.finalize(G.skill(kind, [
				G.status("易伤", G.T("choose", "enemy")),
				G.dmg(G.T("choose", "enemy"), G.N(n), {"dbl": 1, "rep": 1})]))
		"狂振+全体·双倍":
			return G.finalize(G.skill(kind, [
				G.status("狂振", G.T("all", "enemy")),
				G.dmg(G.T("all", "enemy"), G.N(n), {"dbl": 1})]))
		"沉默+全体":
			return G.finalize(G.skill(kind, [
				G.status("沉默", G.T("all", "enemy"), 0, 25),
				G.dmg(G.T("all", "enemy"), G.N(n), {"dbl": 1})]))
	return {}

static func custom_kinds() -> Array:
	return ["易伤+双倍打击", "狂振+全体·双倍", "沉默+全体"]

# 反制族：tid + 固定参数 + 可递增的参数名与档位
static func counter_specs() -> Array:
	var d := func(name, tid, params, pkey, powers): return {"name": name, "tid": tid, "params": params, "pkey": pkey, "powers": powers}
	return [
		d.call("改道·全队·每次→来源", "redirect", {"obs": "all", "to": "source", "freq": "every"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("改道·自身·首次→来源", "redirect", {"obs": "self", "to": "source", "freq": "once"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("改道·全队·每次→敌方最高生命", "redirect", {"obs": "all", "to": "highest", "freq": "every"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("转伤为疗·全队·每次", "convert", {"obs": "all", "freq": "every"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("回敬·全队·等量·每次", "reflect", {"obs": "all", "mult": 0, "freq": "every"}, "", [0]),
		d.call("回敬·全队·双倍·每次", "reflect", {"obs": "all", "mult": 1, "freq": "every"}, "", [0]),
		d.call("减伤·全队·按比例", "mit", {"tgt": "all", "mode": "pct"}, "n", [10, 20, 30, 40, 60]),
		d.call("护盾·全队", "shield", {"tgt": "all"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("治疗·全队", "heal", {"tgt": "all"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("打断", "time", {"op": "interrupt"}, "power", [10, 20, 30, 40, 50, 60]),
		d.call("延后", "time", {"op": "delay"}, "sec", [4, 8, 12, 16, 19]),
		d.call("沉默攻击者", "status", {"st": "沉默", "tgt": "choose"}, "n", [10, 20, 30, 40, 50, 60]),
		d.call("见招收税", "tax", {}, "n", [10, 20, 30, 45]),
		d.call("遗志", "burst", {}, "n", [10, 20, 30, 45]),
		d.call("反击·全体打击", "atkA", {}, "n", [10, 20, 30, 45]),
		d.call("反击·单点打击", "atk1", {}, "n", [10, 20, 30, 45]),
	]

static func build_counter(spec: Dictionary, power: int) -> Dictionary:
	var p: Dictionary = spec.params.duplicate()
	if spec.pkey != "":
		p[spec.pkey] = power
	return R.build(spec.tid, p)

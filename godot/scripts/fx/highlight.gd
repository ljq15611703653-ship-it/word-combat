extends RefCounted
# 「高光时刻」演出接口（目前只留接口，演出本身还没做）。
# 游戏在这些时刻调用 Highlight.play(kind, ctx, host)：
#   level_clear     冒险通关一关          ctx: {id, hints_used, boss(bool)}
#   boss_defeated   冒险章节 boss 被击败   ctx: {id, chapter}
#   multi_kill      一轮里同一秒击倒 >= 2 个   ctx: {count, side}
#   perfect_counter 完美反制（打断成功 / 转移或改道反杀 / 转伤为疗保命）  ctx: {kind, side}
#   reversal        翻盘（分数落后时一轮反超）   ctx: {swing, side}
#   rare_word       抽到稀有词（奇术类）    ctx: {word}
# 素材约定：放 res://assets/fx/highlight_<kind>.tscn（场景根节点实现 play(ctx: Dictionary)，演完自己 queue_free），
#           没有素材就什么都不做。也可以往 Highlight.listeners 里加 Callable(kind, ctx)，用自己的方式表现。
# 整体美术方向见 docs/素材与特效接口.md：黑 / 红宝石暗红 / 亮黄点睛。

static var listeners: Array = []
static var enabled := true

static func play(kind: String, ctx: Dictionary = {}, host: Node = null) -> void:
	if not enabled:
		return
	for cb in listeners:
		if cb is Callable and cb.is_valid():
			cb.call(kind, ctx)
	var path := "res://assets/fx/highlight_%s.tscn" % kind
	if host != null and is_instance_valid(host) and ResourceLoader.exists(path):
		var ps = load(path)
		if ps is PackedScene:
			var n: Node = ps.instantiate()
			host.add_child(n)
			if n.has_method("play"):
				n.play(ctx)

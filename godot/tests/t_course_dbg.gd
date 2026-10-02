extends SceneTree
const L = preload("res://scripts/adventure/level_eval.gd")
func _init() -> void:
	await process_frame
	var args := OS.get_cmdline_user_args()
	var id := int(args[0]) if args.size() > 0 else 11
	var sol_override := str(args[1]) if args.size() > 1 else ""
	var lv: Array = L.load_levels()
	for l in lv:
		if int(l.id) != id:
			continue
		var toks: Array = L.tokens_from(l.sol)
		if sol_override != "":
			var arr: Array = []
			for w in sol_override.split(" "):
				arr.append(float(w) if w.is_valid_int() else w)
			toks = L.tokens_from(arr)
		var r: Dictionary = L.evaluate(l, toks)
		print("win=", r.win, " start=", r.start, " picks=", r.picks, " reason=", r.get("reason", ""))
		for e in r.get("events", []):
			var t := str(e.type)
			if t in ["dmg", "stack", "burn", "down", "start", "fizzle", "round_mark", "stack_spent", "stack_capped", "heal", "mit"]:
				print("  ", e)
		var rs: Dictionary = r.get("result_state", {})
		if not rs.is_empty():
			for s in 2:
				for u in rs.sides[s].units:
					print("  side", s, " ", u.name, " hp", u.hp, "/", u.max_hp, " stacks", u.stacks, " end", u.stack_end)
	quit()

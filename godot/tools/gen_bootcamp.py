# -*- coding: utf-8 -*-
# 生成 data/bootcamp.json：python tools/gen_bootcamp.py
# 只生成某一章用于自测：python tools/gen_bootcamp.py --only ch3 --out data/bc_ch3.json
import sys, os, importlib, traceback
sys.path.insert(0, os.path.dirname(__file__))
import bootcamp_dsl as D
args = sys.argv[1:]
only = args[args.index("--only") + 1] if "--only" in args else None
out = args[args.index("--out") + 1] if "--out" in args else os.path.join(os.path.dirname(__file__), "..", "data", "bootcamp.json")
mods = ["bootcamp_course"]      # 新课程（旧的 7 章在 tools/old_bootcamp/，已停用）
for m in mods:
    if only and m != "bootcamp_" + only:
        continue
    try:
        importlib.import_module(m)
    except ModuleNotFoundError as e:
        if m not in str(e):
            raise
    except Exception:
        print("警告：", m, "出错，已跳过（可能正在编辑）")
        traceback.print_exc()
D.LEVELS.sort(key=lambda l: l["id"])
D.write(out)

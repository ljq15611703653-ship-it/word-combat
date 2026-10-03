# 变体：“使用词的能力”词不占卡组（像基础词一样人人可用，每种 2 张），看慢卡组是不是被卡组位置拖垮的
import sys, iters, nc_rr3
MODS = ["蓄", "放", "省", "接力", "续杯", "加急", "精通", "封词"]
orig = iters.setup
def setup(name, STYLES):
    orig(name, STYLES)
    for k, d in list(STYLES.items()):
        def wrap(c, d=d):
            dd = dict(d(c) if callable(d) else d)
            for m in MODS:
                dd[m] = max(dd.get(m, 0), 2)
            return dd
        STYLES[k] = wrap
iters.setup = setup
sys.argv = ["x"] + sys.argv[1:]
exec(open(sys.argv[0] if False else ("nc_tune3.py" if __import__("os").environ.get("FM_TUNE") else "nc_rr3.py"), encoding="utf-8").read())

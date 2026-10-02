# -*- coding: utf-8 -*-
"""天赋有多重要：把一个职业的天赋关掉（规则照旧、目标分不变），看它的胜率掉多少。
掉得少 = 这个天赋可有可无（“没什么必要”）；掉得多 = 职业靠它立住。
用法：python nc_ablate2.py 局数 [键=值 ...]"""
import sys
from collections import Counter
import nc_sim2 as S

def rates(res):
    w, g = Counter(), Counter()
    for r in res:
        for c in r["cls"]:
            g[c] += 1
        if r["winner"] >= 0:
            w[r["cls"][r["winner"]]] += 1
    return {c: w[c] / max(1, g[c]) for c in S.CLASSES}

if __name__ == "__main__":
    n = int(sys.argv[1])
    over = dict(x.split("=", 1) for x in sys.argv[2:])
    cfg, res, secs = S.run(n, 21, over)
    base = rates(res)
    print("基准：" + "  ".join("%s %.0f%%" % (c, 100 * base[c]) for c in S.CLASSES), flush=True)
    for c in S.CLASSES:
        o = dict(over)
        o["off"] = c
        cfg, res, secs = S.run(n, 21, o)
        r = rates(res)
        print("关掉【%s】的天赋：%s 胜率 %.0f%% → %.0f%%（%+.0f）" % (c, c, 100 * base[c], 100 * r[c], 100 * (r[c] - base[c])), flush=True)

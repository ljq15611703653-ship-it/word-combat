# -*- coding: utf-8 -*-
"""一个变体：先自动调目标分，再用 1200 局评估。python nc_exp2.py 名字 [键=值 ...]"""
import sys
from collections import Counter, defaultdict
import nc_sim2 as S
import nc_tune2 as T

def tune(over, n=480, it=5, want=8.0):
    cfg0 = S.cfg_from(over)
    tg = {c: float(cfg0[T.KEY[c]]) for c in S.CLASSES}
    for i in range(it):
        o = dict(over)
        for c in S.CLASSES:
            o[T.KEY[c]] = "%.1f" % tg[c]
        cfg, res, secs = S.run(n, 7 + i, o)
        wr = T.winrates(res)
        rounds = sum(r["rounds"] for r in res) / len(res)
        scale = (want / rounds) ** 0.7
        for c in S.CLASSES:
            tg[c] *= (1 + 1.2 * (wr[c] - 0.5)) * scale
    return {T.KEY[c]: "%.1f" % tg[c] for c in S.CLASSES}

if __name__ == "__main__":
    name = sys.argv[1]
    over = dict(x.split("=", 1) for x in sys.argv[2:])
    t = tune(over)
    o = dict(over); o.update(t)
    cfg, res, secs = S.run(1200, 11, o)
    rep = S.report(cfg, res, secs)
    # 对局最大偏差
    mat = defaultdict(int)
    for r in res:
        if r["winner"] >= 0:
            mat[(r["cls"][r["winner"]], r["cls"][1 - r["winner"]])] += 1
    worst = 0
    for i, a in enumerate(S.CLASSES):
        for b in S.CLASSES[i + 1:]:
            wa, wb = mat[(a, b)], mat[(b, a)]
            worst = max(worst, abs(wa - wb) / max(1, wa + wb) / 2 + 0.5)
    print("==== %s  %s  最偏对局 %.0f%%" % (name, " ".join("%s=%s" % kv for kv in o.items()), 100 * worst))
    print(rep)
    sys.stdout.flush()

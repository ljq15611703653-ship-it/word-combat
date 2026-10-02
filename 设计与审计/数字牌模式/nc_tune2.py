# -*- coding: utf-8 -*-
"""自动调目标分：按职业胜率偏离 50% 的程度乘性调整，同时把平均轮数拉向 want_rounds。
用法：python nc_tune2.py 每轮局数 迭代次数 want_rounds [键=值 ...]"""
import sys, json
from collections import Counter
import nc_sim2 as S

KEY = {"并": "t_chain", "续": "t_cont", "择": "t_pick", "血": "t_blood"}


def winrates(res):
    wins, games = Counter(), Counter()
    for r in res:
        for c in r["cls"]:
            games[c] += 1
        if r["winner"] >= 0:
            wins[r["cls"][r["winner"]]] += 1
    return {c: wins[c] / max(1, games[c]) for c in S.CLASSES}


if __name__ == "__main__":
    n = int(sys.argv[1])
    it = int(sys.argv[2])
    want = float(sys.argv[3])
    over = {}
    for a in sys.argv[4:]:
        k, v = a.split("=", 1)
        over[k] = v
    cfg0 = S.cfg_from(over)
    tg = {c: float(cfg0[KEY[c]]) for c in S.CLASSES}
    for i in range(it):
        o = dict(over)
        for c in S.CLASSES:
            o[KEY[c]] = "%.1f" % tg[c]
        cfg, res, secs = S.run(n, 7 + i, o)
        wr = winrates(res)
        rounds = sum(r["rounds"] for r in res) / len(res)
        print("第%d次 目标 %s 胜率 %s 轮数 %.1f" % (i + 1, " ".join("%s%.1f" % (c, tg[c]) for c in S.CLASSES),
                                            " ".join("%s%.0f" % (c, 100 * wr[c]) for c in S.CLASSES), rounds), flush=True)
        scale = (want / rounds) ** 0.7
        for c in S.CLASSES:
            tg[c] *= (1 + 1.2 * (wr[c] - 0.5)) * scale
    print("最终：" + " ".join("%s=%.1f" % (KEY[c], tg[c]) for c in S.CLASSES))

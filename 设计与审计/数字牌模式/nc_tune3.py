# -*- coding: utf-8 -*-
"""
给当前迭代的词表/卡组风格自动调四个职业的目标分，让“按职业”的总胜率都靠近 50%、平均局长靠近 8 轮。
用法： python nc_tune3.py 迭代名 [轮数=5] [每对局数=2] [styles=...] [键=值 ...]
输出：调好的 t_chain t_cont t_pick t_blood，然后用 6 局/对 做一次完整评估。
"""
import sys
from collections import Counter
import os, importlib
S = importlib.import_module(os.environ.get("NC_SIM", "nc_sim3"))
import nc_rr3 as RR
import iters

KEY = {"并": "t_chain", "续": "t_cont", "择": "t_pick", "血": "t_blood"}


def class_wr(res):
    win, games = Counter(), Counter()
    for r in res:
        for s in range(2):
            games[r["cls"][s]] += 1
        if r["winner"] >= 0:
            win[r["cls"][r["winner"]]] += 1
    return {c: win[c] / float(max(1, games[c])) for c in S.CLASSES}


def tune(it, over, styles, rounds=5, n_each=2, want=8.0):
    iters.setup(it, RR.STYLES)
    st = styles or list(RR.STYLES.keys())
    tg = {c: float(over.get(KEY[c], RR.FINAL[KEY[c]])) for c in S.CLASSES}
    hist = []
    for i in range(rounds):
        o = dict(over)
        for c in S.CLASSES:
            o[KEY[c]] = "%.1f" % tg[c]
        cons, res, secs = RR.run(it, n_each, 50 + i, o, list(S.CLASSES), st)
        wr = class_wr(res)
        rd = sum(r["rounds"] for r in res) / float(len(res))
        scale = (want / rd) ** 0.7
        hist.append("第%d轮 胜率 %s 平均 %.1f 轮" % (i + 1, " ".join("%s%.0f%%" % (c, 100 * wr[c]) for c in S.CLASSES), rd))
        for c in S.CLASSES:
            tg[c] *= (1 + 1.2 * (wr[c] - 0.5)) * scale
    return {KEY[c]: "%.1f" % tg[c] for c in S.CLASSES}, hist


if __name__ == "__main__":
    it = sys.argv[1]
    rounds = 5
    n_each = 2
    styles = None
    over = {}
    for a in sys.argv[2:]:
        k, v = a.split("=", 1)
        if k == "轮数":
            rounds = int(v)
        elif k == "每对":
            n_each = int(v)
        elif k == "styles":
            styles = v.split(",")
        else:
            over[k] = v
    t, hist = tune(it, over, styles, rounds, n_each)
    print("调参过程：")
    for h in hist:
        print("  " + h)
    print("调好的目标分：", t)
    o = dict(over)
    o.update(t)
    iters.setup(it, RR.STYLES)
    st = styles or list(RR.STYLES.keys())
    cons, res, secs = RR.run(it, 6, 77, o, list(S.CLASSES), st)
    text, win, games, pair = RR.report(cons, res, secs)
    print("==== 迭代 %s（目标分已调）：选手 %d 个" % (it, len(cons)))
    print(text)

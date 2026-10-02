# -*- coding: utf-8 -*-
"""看一对职业的细节：python nc_pair2.py 甲 乙 局数 [键=值]"""
import sys, random
from multiprocessing import Pool
from collections import Counter
import nc_sim2 as S

def job(a):
    cfg, c0, c1, seed = a
    return S.play_game(cfg, c0, c1, seed)

if __name__ == "__main__":
    a, b, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
    over = dict(x.split("=", 1) for x in sys.argv[4:])
    cfg = S.cfg_from(over)
    jobs = [(cfg, a, b, 5000 + i) if i % 2 == 0 else (cfg, b, a, 5000 + i) for i in range(n)]
    with Pool(4) as p:
        res = p.map(job, jobs)
    w = Counter(); kob = Counter(); met = Counter(); kos_suffered = Counter(); rounds = 0; tal = {a: Counter(), b: Counter()}
    for r in res:
        rounds += r["rounds"]
        if r["winner"] >= 0:
            w[r["cls"][r["winner"]]] += 1
        for s in range(2):
            c = r["cls"][s]
            kob[c] += r["kob"][s]
            met[c] += r["metric"][s][S.METRIC[c]] / cfg["target"][c]
            met[c + "伤"] += r["metric"][s]["dmg"]
            tal[c].update(r["talent"][s])
    print("%s %d : %d %s，平均 %.1f 轮" % (a, w[a], w[b], b, rounds / n))
    for c in (a, b):
        print("  %s：职业分完成度 %.0f%%  击倒分 %.0f%%  对敌伤害 %.1f/局  天赋 %s" % (c, 100 * met[c] / n, 100 * kob[c] / n, met[c + "伤"] / n,
              " ".join("%s %.1f" % (k, v / n) for k, v in tal[c].items())))

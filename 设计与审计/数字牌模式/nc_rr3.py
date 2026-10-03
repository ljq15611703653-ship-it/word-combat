# -*- coding: utf-8 -*-
"""
循环赛：每个职业 × 每种卡组风格 = 一个选手，所有选手两两对打，看手感。
用法： python nc_rr3.py 迭代名 每对局数 种子 [styles=a,b,c] [classes=并,续] [键=值 ...]
每次迭代的卡组风格写在 STYLES 里（词表 = 当前迭代能用的进阶词）。
"""
import sys, time, json, itertools
from collections import Counter, defaultdict
from multiprocessing import Pool
import os, importlib
S = importlib.import_module(os.environ.get("NC_SIM", "nc_sim3"))

# 定稿参数（和 nc_sim2 的定稿评估一致；血流目标分用游戏里核对后的 81）
FINAL = {"danger_w": "1", "z_heal": "0", "b_stkind": "1", "b_wind": "0", "b_cap": "7", "b_once": "1", "b_mode": "count",
         "b_len": "0", "x_slots": "3", "x_slots_up": "", "x_single": "1", "z_free": "1", "z_norep": "1", "y_cap": "99",
         "y_cap_up": "", "y_nodef": "1", "y_guard": "0", "t_chain": "34", "t_cont": "60", "t_pick": "63", "t_blood": "81"}

STYLES = {}


def style_decks():
    return STYLES


def _job(args):
    cfg, a, b, seed = args
    (c0, st0, d0), (c1, st1, d1) = a, b
    r = S.play_game(cfg, c0, c1, seed, d0, d1)
    r["styles"] = [st0, st1]
    return r


def contestants(classes, styles):
    out = []
    for c in classes:
        for sn in styles:
            d = STYLES[sn]
            if callable(d):
                d = d(c)
            if d is None:
                continue
            out.append((c, sn, dict(d)))
    return out


def run(it_name, n_each, seed, over, classes, styles, procs=18):
    o = dict(FINAL)
    o.update(over)
    cfg = S.cfg_from(o)
    cons = contestants(classes, styles)
    jobs = []
    k = 0
    for i, a in enumerate(cons):
        for j, b in enumerate(cons):
            if i == j:
                continue
            for g in range(n_each):
                jobs.append((cfg, a, b, seed * 1000000 + k))
                k += 1
    t0 = time.time()
    with Pool(procs) as p:
        res = p.map(_job, jobs, chunksize=4)
    return cons, res, time.time() - t0


def report(cons, res, secs, top=6):
    L = []
    n = len(res)
    names = ["%s·%s" % (c, st) for c, st, _ in cons]
    win = Counter()
    games = Counter()
    pair = defaultdict(lambda: [0, 0])
    byclass, bystyle = Counter(), Counter()
    gclass, gstyle = Counter(), Counter()
    rounds = 0
    capped = 0
    words = defaultdict(Counter)
    wgames = Counter()
    kos = 0
    for r in res:
        a = "%s·%s" % (r["cls"][0], r["styles"][0])
        b = "%s·%s" % (r["cls"][1], r["styles"][1])
        rounds += r["rounds"]
        capped += 1 if r["capped"] else 0
        kos += r["kos"]
        for s, nm in ((0, a), (1, b)):
            games[nm] += 1
            gclass[r["cls"][s]] += 1
            gstyle[r["styles"][s]] += 1
            for w, v in r["words"][s].items():
                words[r["styles"][s]][w] += v
            wgames[r["styles"][s]] += 1
        if r["winner"] >= 0:
            w, l = (a, b) if r["winner"] == 0 else (b, a)
            win[w] += 1
            pair[(w, l)][0] += 1
            wc = r["cls"][r["winner"]]
            ws = r["styles"][r["winner"]]
            byclass[wc] += 1
            bystyle[ws] += 1
    L.append("局数 %d（%.0f 秒）：平均 %.1f 轮；打满 12 轮 %.0f%%；每局击倒 %.1f" % (n, secs, rounds / float(n), 100.0 * capped / n, kos / float(n)))
    nb = sum(1 for r in res if any(a >= 2 and d >= 6 for (_, a, d) in r.get("burst", [])))
    nrel = sum(1 for r in res if r.get("burst"))
    L.append("续暴：放出过存的句子的局 %.0f%%；其中“存了≥2轮、放出≥6点伤害”的局 %.0f%%（目标 ≥40%%）" % (100.0 * nrel / n, 100.0 * nb / n))
    L.append("按职业：" + "  ".join("%s %.0f%%" % (c, 100.0 * byclass[c] / max(1, gclass[c])) for c in sorted(gclass)))
    L.append("按风格：" + "  ".join("%s %.0f%%" % (c, 100.0 * bystyle[c] / max(1, gstyle[c])) for c in sorted(gstyle)))
    rank = sorted(names, key=lambda nm: -win[nm] / max(1, games[nm]))
    L.append("选手总胜率（前 %d / 后 %d）：" % (top, top) + "  ".join("%s %.0f%%" % (nm, 100.0 * win[nm] / max(1, games[nm])) for nm in rank[:top]) + "  ……  " +
             "  ".join("%s %.0f%%" % (nm, 100.0 * win[nm] / max(1, games[nm])) for nm in rank[-top:]))
    if os.environ.get("NC_FULL"):
        L.append("全部选手：" + "  ".join("%s %.0f%%" % (nm, 100.0 * win[nm] / max(1, games[nm])) for nm in rank))
    ext = []
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            wa, wb = pair[(a, b)][0], pair[(b, a)][0]
            if wa + wb >= 6:
                ext.append((max(wa, wb) / float(wa + wb), a, b, wa, wb))
    ext.sort(reverse=True)
    L.append("最一边倒的对局：" + "；".join("%s %d:%d %s" % (a, wa, wb, b) for _, a, b, wa, wb in ext[:top]))
    spread = [e[0] for e in ext]
    if spread:
        L.append("对局偏差：平均 %.0f%%；>65%% 的对局占 %.0f%%；>75%% 占 %.0f%%" % (100 * sum(spread) / len(spread), 100.0 * sum(1 for x in spread if x > 0.65) / len(spread), 100.0 * sum(1 for x in spread if x > 0.75) / len(spread)))
    # 风格对风格（把四个职业合起来看）：行 = 这种风格，列 = 对手风格，格子 = 行的胜率
    sw = defaultdict(lambda: [0, 0])
    for r in res:
        if r["winner"] < 0:
            continue
        w = r["styles"][r["winner"]]
        l = r["styles"][1 - r["winner"]]
        sw[(w, l)][0] += 1
        sw[(l, w)][1] += 1
    sts = sorted(gstyle)
    L.append("风格对风格胜率（行 对 列）：")
    L.append("　　　　" + "".join("%-7s" % x[:3] for x in sts))
    for a in sts:
        row = []
        for b in sts:
            if a == b:
                row.append("  —    ")
            else:
                w, l = sw[(a, b)][0], sw[(a, b)][1]
                row.append("%3d%%   " % (100.0 * w / max(1, w + l)))
        L.append("%-4s" % a[:4] + "".join(row))
    for st in sorted(words):
        g = float(wgames[st])
        L.append("  %s：进阶词/局 %s" % (st, " ".join("%s%.1f" % (w, v / g) for w, v in words[st].most_common())))
    return "\n".join(L), win, games, pair


if __name__ == "__main__":
    it = sys.argv[1]
    n_each = int(sys.argv[2])
    seed = int(sys.argv[3])
    over = {}
    classes = list(S.CLASSES)
    sel = None
    for a in sys.argv[4:]:
        k, v = a.split("=", 1)
        if k == "styles":
            sel = v.split(",")
        elif k == "classes":
            classes = v.split(",")
        else:
            over[k] = v
    import iters
    iters.setup(it, STYLES)
    styles = sel or list(STYLES.keys())
    cons, res, secs = run(it, n_each, seed, over, classes, styles)
    text, win, games, pair = report(cons, res, secs)
    print("==== 迭代 %s：选手 %d 个（%d 职业 × %d 风格）" % (it, len(cons), len(classes), len(styles)))
    print(text)

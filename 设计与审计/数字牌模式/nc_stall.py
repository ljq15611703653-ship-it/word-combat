# -*- coding: utf-8 -*-
"""
被动/拖局问题的测量（只读引用 nc_sim.py，不改它）
  · 弱玩家：每个随从只会“选 1 个血最少的敌人打 1 点”
  · 全被动玩家：什么都不出
  · 防守类职业互打（守护/治疗/控制）
对比几种防拖局的办法：保底数字（固定轮次发可反复用的数字牌）、后期全场易伤（越拖越脆）
用法：python nc_stall.py 变体名 ...   （变体：V0 V1 V2 V3）
"""
import sys, random, time
from multiprocessing import Pool
from collections import defaultdict
import nc_sim as S

A = dict(ap_start=6, ap_income=6, ap_cap=12, ladder="0.1,0.25,0.45,0.7", ladder_copies=2, dice_count=2, dice_hp=4,
         pass_gain=0.3, ko_pct=0.15, t_atk=35, t_def=18, t_heal=35, t_ctl=25, t_acc=38, reflect_cap=0, clause_max=3,
         and_cost=2, alternate=1)

VARIANTS = {
    "V0": {"floor": {}, "esc": 0, "desc": "现状"},
    "V1": {"floor": {3: 2, 5: 3, 7: 4}, "esc": 0, "desc": "保底数字：第3/5/7轮各发一张可反复用的 2/3/4"},
    "V2": {"floor": {}, "esc": 7, "desc": "越拖越脆：第7轮起全场随从每轮多 1 级易伤"},
    "V3": {"floor": {3: 2, 5: 3, 7: 4}, "esc": 7, "desc": "保底数字 + 越拖越脆"},
    "V4": {"floor": {3: 2, 5: 3, 7: 4}, "esc": 0, "hold": 0.5, "desc": "保底数字 + 阵地分（守护：己方铁壁等级；控制：压在敌人身上的衰弱/易伤等级，每轮末按 0.5 折算）"},
    "V5": {"floor": {}, "esc": 0, "hold": 0.5, "desc": "只加阵地分（不加保底数字）"},
}

_orig_choose = S.choose
_orig_begin = S.begin_round
MODE = {"p0": "ai", "floor": {}, "esc": 0, "hold": 0.0}
_orig_resolve = S.resolve


def weak_choose(G, s, declared, remaining, res):
    uid = remaining[0]
    E = [u for u in G["R"]["U"] if u["side"] != s and u["down"] == -1]
    if not E or res["ap"] < 1:
        return uid, None
    t = min(E, key=lambda u: u["hp"])
    return uid, {"side": s, "uid": uid, "start": 1, "cl": [{"k": "atk", "tg": [t["uid"]], "n": 1, "rep": 1}], "cost": 1,
                 "cards": [], "words": [], "val": 1.0, "def": False, "ms": 1, "cv": []}


def choose(G, s, declared, remaining, res):
    if s == 0 and MODE["p0"] == "weak":
        return weak_choose(G, s, declared, remaining, res)
    if s == 0 and MODE["p0"] == "passive":
        return remaining[0], None
    return _orig_choose(G, s, declared, remaining, res)


def begin_round(G):
    _orig_begin(G)
    r = G["round"]
    if r in MODE["floor"]:
        for s in range(2):
            G["sides"][s]["cards"].append({"v": MODE["floor"][r], "once": False, "last": -9})
    if MODE["esc"] and r >= MODE["esc"]:
        for u in G["R"]["U"]:
            if u["down"] == -1 and "易伤" not in u["st"]:
                u["st"]["易伤"] = [1, 99, -1]


def resolve(R, acts_in, cfg, rnd):
    _orig_resolve(R, acts_in, cfg, rnd)
    k = MODE["hold"]
    if k > 0:
        for s in range(2):
            wall = 0
            press = 0
            for u in R["U"]:
                if u["down"] != -1:
                    continue
                for nm, e in u["st"].items():
                    if u["side"] == s and nm == "铁壁" and e[2] == s:
                        wall += e[0]
                    if u["side"] != s and nm in ("衰弱", "易伤") and e[2] == s:
                        press += e[0]
            if MODE["cls"][s] == "守护":
                R["M"][s]["prev"] += k * wall
            if MODE["cls"][s] == "控制":
                R["M"][s]["ctrl"] += k * press


S.choose = choose
S.begin_round = begin_round
S.resolve = resolve


def _job(args):
    cfg, c0, c1, seed, p0, floor, esc, hold = args
    MODE["p0"] = p0
    MODE["floor"] = floor
    MODE["esc"] = esc
    MODE["hold"] = hold
    MODE["cls"] = [c0, c1]
    return S.play_game(cfg, c0, c1, seed)


def batch(pool, cfg, pairs, n_each, p0, var, seed):
    jobs = []
    k = 0
    for c0, c1 in pairs:
        for i in range(n_each):
            jobs.append((cfg, c0, c1, seed * 100000 + k, p0, var["floor"], var["esc"], var.get("hold", 0.0)))
            k += 1
    return pool.map(_job, jobs, chunksize=2)


def summary(res):
    n = len(res)
    rounds = sum(r["rounds"] for r in res) / float(n)
    capped = sum(1 for r in res if r["capped"])
    return rounds, 100.0 * capped / n


if __name__ == "__main__":
    over = dict(a.split("=", 1) for a in sys.argv[1:] if "=" in a)
    A.update(over)
    cfg = S.cfg_from({k: str(v) for k, v in A.items()})
    names = [a for a in sys.argv[1:] if "=" not in a] or ["V0", "V1", "V2", "V3"]
    if over:
        print("改了：", over)
    with Pool(18) as pool:
        for vn in names:
            var = VARIANTS[vn]
            t0 = time.time()
            print("==== %s：%s" % (vn, var["desc"]))
            # 1. 电脑对电脑，全部职业
            pairs = [(a, b) for a in S.CLASSES for b in S.CLASSES]
            res = batch(pool, cfg, pairs, 20, "ai", var, 11)
            wins = defaultdict(int)
            games = defaultdict(int)
            for r in res:
                a, b = r["cls"]
                if a == b:
                    continue
                games[a] += 1
                games[b] += 1
                if r["winner"] >= 0:
                    wins[r["cls"][r["winner"]]] += 1
            rd, cp = summary(res)
            print("  电脑对电脑 %d 局：平均 %.1f 轮，打满 %.0f%%；职业胜率 %s" % (len(res), rd, cp, "  ".join("%s %.0f%%" % (c, 100.0 * wins[c] / max(1, games[c])) for c in S.CLASSES)))
            # 2. 防守类互打
            react = [("守护", "治疗"), ("治疗", "控制"), ("守护", "控制"), ("治疗", "治疗"), ("守护", "守护"), ("控制", "控制")]
            parts = []
            for pr in react:
                rr = batch(pool, cfg, [pr], 30, "ai", var, 12)
                rd2, cp2 = summary(rr)
                parts.append("%s对%s %.1f轮/打满%.0f%%" % (pr[0], pr[1], rd2, cp2))
            print("  防守类互打：" + "；".join(parts))
            # 3. 弱玩家、全被动玩家 对 各职业电脑
            for p0, label in (("weak", "弱玩家（只会戳 1 点）"), ("passive", "全被动玩家（什么都不出）")):
                parts = []
                for c in S.CLASSES:
                    rr = batch(pool, cfg, [("进攻", c)], 30, p0, var, 13)
                    rd3, cp3 = summary(rr)
                    aiw = sum(1 for r in rr if r["winner"] == 1)
                    parts.append("%s %.1f轮/打满%.0f%%/电脑胜%d%%" % (c, rd3, cp3, int(100.0 * aiw / len(rr))))
                print("  %s 对 电脑：" % label + "；".join(parts))
            print("  （用时 %.0f 秒）" % (time.time() - t0))

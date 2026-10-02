# -*- coding: utf-8 -*-
"""
数字牌模式 · 设计模拟器（研究用，不接游戏，不改原来的代码）

规则要点（第 1 版，参数都在 BASE 里，可以用命令行覆盖）：
  · 双方各 3 个随从，生命小数值；击倒的随从休整一轮后满血回来
  · 数字是牌：1 免费无限用；2 以上来自 职业阶梯（可反复用，用完冷却一轮）
    / 挫折骰子（一次性）/ 轮次增长（可选，一次性）
  · 数字 = 次数：目标个数、伤害量、重复次数、持续轮数、延后秒数、上限，全部用同一种数字牌，每个位置一张
  · 行动点保留（小数值）：一句的花费 = 基础 + 进阶词价格 + 每多一段的“并”
  · 轮流宣告：先宣告方每轮轮换；一方一次定一个随从的一句
  · 五个职业各自得分：进攻=造成的伤害；守护=挡掉/转走的伤害；积蓄=状态兑现的效果；
    治疗=治疗量（自残再奶也算）；控制=让对方白花的行动点和数字
  · 状态是加减：易伤 L 每次多受 L；铁壁 L 每次少受 L；衰弱 L 每次少打 L；灼烧 L 每轮末掉 L；
    蓄力 L 下一次出手每下多打 L（用掉）。每过一轮 +1 级，持续轮数用数字牌
用法：python nc_sim.py 局数 种子 [键=值 ...]
"""
import random, sys, json, time
from collections import Counter, defaultdict
from multiprocessing import Pool

CLASSES = ["进攻", "守护", "积蓄", "治疗", "控制"]
METRIC = {"进攻": "dmg", "守护": "prev", "积蓄": "pay", "治疗": "heal", "控制": "ctrl"}
ENEMY_ST = ("易伤", "灼烧", "衰弱")
SELF_ST = ("蓄力", "铁壁")
PRICE = {"易伤": 1, "灼烧": 1, "衰弱": 1, "蓄力": 1, "铁壁": 1, "回敬": 2, "转移": 2, "延后": 1, "移除": 1}

BASE = dict(
    hp_pool=21, hp_min=3,
    ap_start=3, ap_income=3, ap_cap=9,
    base_cost=1, and_cost=1, clause_max=3,
    timeline=10, max_rounds=12,
    t_atk=40, t_def=30, t_acc=25, t_heal=30, t_ctl=20,
    ko_pct=0.0,
    ladder="0.2,0.4,0.6,0.8", ladder_values="2,3,4,5", ladder_copies=1,
    dice_hp=6, dice_on_ko=1, dice_count=1,
    round_growth=0,
    reflect_cap=0,
    alternate=1,
    rep_max=3,
    pass_gain=0.6,
    ko_look=0.5,
)

PRESET = {
    "进攻": {"蓄力": 2, "易伤": 2, "灼烧": 2, "移除": 2, "延后": 2, "转移": 1, "回敬": 1, "衰弱": 1, "铁壁": 2},
    "守护": {"铁壁": 2, "转移": 2, "回敬": 2, "衰弱": 2, "移除": 2, "延后": 2, "蓄力": 1, "易伤": 1, "灼烧": 1},
    "积蓄": {"蓄力": 2, "易伤": 2, "灼烧": 2, "衰弱": 2, "铁壁": 2, "移除": 2, "延后": 1, "转移": 1, "回敬": 1},
    "治疗": {"铁壁": 2, "衰弱": 2, "转移": 2, "回敬": 1, "移除": 2, "延后": 2, "蓄力": 1, "易伤": 1, "灼烧": 2},
    "控制": {"延后": 2, "移除": 2, "衰弱": 2, "转移": 2, "回敬": 2, "易伤": 2, "灼烧": 1, "铁壁": 1, "蓄力": 1},
}
KWS = {"进攻": ["不屈", "不屈", "首挡"], "守护": ["首挡", "首挡", "不屈"], "积蓄": ["首挡", "不屈", "不屈"],
       "治疗": ["首挡", "不屈", "首挡"], "控制": ["首挡", "不屈", "不屈"]}


def cfg_from(over):
    c = dict(BASE)
    for k, v in over.items():
        c[k] = type(BASE[k])(v) if k in BASE and not isinstance(BASE[k], str) else v
    c["target"] = {"进攻": c["t_atk"], "守护": c["t_def"], "积蓄": c["t_acc"], "治疗": c["t_heal"], "控制": c["t_ctl"]}
    c["lad"] = [float(x) for x in str(c["ladder"]).split(",") if x]
    c["ladv"] = [int(x) for x in str(c["ladder_values"]).split(",") if x]
    return c


# ---------------------------------------------------------------- 状态
def split_hp(pool, n=3):
    base = pool // n
    out = [base] * n
    for i in range(pool - base * n):
        out[i] += 1
    return out


def new_game(cfg, c0, c1, rng):
    G = {"cfg": cfg, "round": 0, "rng": rng, "first0": rng.randint(0, 1), "sides": [], "R": None,
         "stat": {"cards_gain": [Counter(), Counter()], "cards_used": [[], []], "kinds": Counter(), "maxhit": 0,
                  "chain": 0, "acts": 0, "kos": 0, "prog_r4": None, "fz": 0, "stalled": 0}}
    U = []
    for s, c in enumerate((c0, c1)):
        G["sides"].append({"cls": c, "ap": cfg["ap_start"], "deck": dict(PRESET[c]), "used": Counter(),
                           "prev": Counter(), "cards": [], "lad": set()})
        hp = split_hp(cfg["hp_pool"])
        for i in range(3):
            U.append({"uid": s * 3 + i, "side": s, "hp": hp[i], "mx": hp[i], "down": -1, "st": {}, "kw": KWS[c][i],
                      "kws": False, "mit": 0, "mitv": 0.0, "lis": [], "last": None})
    G["R"] = {"U": U, "M": [{"dmg": 0.0, "prev": 0.0, "pay": 0.0, "heal": 0.0, "ctrl": 0.0} for _ in range(2)],
              "kob": [0.0, 0.0], "kos": [0, 0], "fz": [0, 0], "lost": [0, 0], "maxhit": 0}
    return G


def clone_R(R):
    U = []
    for u in R["U"]:
        v = u.copy()
        v["st"] = {k: x[:] for k, x in u["st"].items()}
        v["lis"] = [l.copy() for l in u["lis"]]
        U.append(v)
    return {"U": U, "M": [R["M"][0].copy(), R["M"][1].copy()], "kob": R["kob"][:], "kos": [0, 0], "fz": [0, 0],
            "lost": [0, 0], "maxhit": 0}


def prog(R, s, cls, cfg):
    return R["M"][s][METRIC[cls]] / float(cfg["target"][cls]) + R["kob"][s]


# ---------------------------------------------------------------- 结算
def dmg_to(R, s_src, tu, amt):
    if amt <= 0 or tu["down"] != -1:
        return 0
    dealt = min(amt, tu["hp"]) if tu["hp"] > 0 else 0
    tu["hp"] -= amt
    tu["last"] = s_src
    if s_src != tu["side"]:
        R["M"][s_src]["dmg"] += dealt
        R["lost"][tu["side"]] += dealt
    return dealt


def hit(R, s, cu, tu, base, chg_l):
    o = tu["side"]
    if tu["down"] != -1 or tu["hp"] <= 0:
        return 0
    enemy = s != o
    amt = base + chg_l
    v = tu["st"].get("易伤")
    vl = v[0] if v else 0
    amt += vl
    wk = cu["st"].get("衰弱")
    if wk and amt > 0:
        r = min(wk[0], amt)
        amt -= r
        if enemy and wk[2] == o:
            R["M"][o]["prev"] += r
            R["M"][o]["pay"] += r
            R["M"][o]["ctrl"] += r
    w = tu["st"].get("铁壁")
    if w and amt > 0:
        r = min(w[0], amt)
        amt -= r
        if enemy:
            R["M"][o]["prev"] += r
            R["M"][o]["pay"] += r
    if tu["mit"] > 0 and amt > 0:
        r = min(tu["mit"], amt)
        amt -= r
        if enemy:
            R["M"][o]["prev"] += r
    if amt > 0 and enemy and tu["kw"] == "首挡" and not tu["kws"]:
        tu["kws"] = True
        R["M"][o]["prev"] += amt
        amt = 0
    back = 0
    if amt > 0 and enemy:
        for l in tu["lis"]:
            if l["k"] == "redirect":
                c = amt if l["cap"] is None else min(amt, l["cap"])
                amt -= c
                back += c
                R["M"][o]["prev"] += c
                break
    dealt = dmg_to(R, s, tu, amt)
    if enemy and dealt > 0:
        if chg_l:
            R["M"][s]["pay"] += min(chg_l, dealt)
        if vl and v[2] == s:
            R["M"][s]["pay"] += min(vl, dealt)
    if back and cu["down"] == -1 and cu["hp"] > 0:
        dmg_to(R, o, cu, back)
    if enemy and amt > 0 and cu["down"] == -1 and cu["hp"] > 0:
        for l in tu["lis"]:
            if l["k"] == "reflect":
                dmg_to(R, o, cu, amt if l["cap"] is None else min(amt, l["cap"]))
                break
    return dealt


def fizzle(R, a):
    R["M"][1 - a["side"]]["ctrl"] += a["val"]
    R["fz"][a["side"]] += 1


def fire(R, a, acts, cfg, rnd):
    s = a["side"]
    U = R["U"]
    cu = U[a["uid"]]
    tot = 0
    for cl in a["cl"]:
        k = cl["k"]
        if k == "atk":
            chg = cu["st"].pop("蓄力", None)
            cl_ = chg[0] if chg else 0
            for _ in range(cl["rep"]):
                for t in cl["tg"]:
                    tot += hit(R, s, cu, U[t], cl["n"], cl_)
        elif k == "heal":
            for _ in range(cl["rep"]):
                for t in cl["tg"]:
                    tu = U[t]
                    if tu["down"] != -1:
                        continue
                    eff = min(cl["n"], tu["mx"] - tu["hp"])
                    if eff > 0:
                        tu["hp"] += eff
                        if tu["side"] == s:
                            R["M"][s]["heal"] += eff
        elif k == "mit":
            for t in cl["tg"]:
                tu = U[t]
                if tu["down"] == -1:
                    tu["mit"] += cl["n"]
                    tu["mitv"] += a["val"] / len(cl["tg"])
        elif k == "st":
            nm = cl["st"]
            for t in cl["tg"]:
                tu = U[t]
                if tu["down"] != -1:
                    continue
                e = tu["st"].get(nm)
                if e:
                    e[0] += 1
                    e[1] = max(e[1], rnd + cl["n"] - 1)
                else:
                    tu["st"][nm] = [1, rnd + cl["n"] - 1, s]
        elif k in ("reflect", "redirect"):
            for t in cl["tg"]:
                tu = U[t]
                if tu["down"] == -1:
                    tu["lis"].append({"k": k, "cap": cl.get("cap"), "side": s, "val": a["val"] / len(cl["tg"])})
        elif k == "delay":
            for b in acts:
                if b["ord"] == cl["act"] and not b["done"]:
                    b["start"] += cl["n"]
                    R["M"][s]["ctrl"] += cl["n"]
                    if b["start"] > cfg["timeline"]:
                        b["done"] = True
                        fizzle(R, b)
        elif k == "remove":
            tu = U[cl["tg"][0]]
            if tu["down"] == -1:
                val = tu["mitv"] + sum(l["val"] for l in tu["lis"])
                for nm in SELF_ST:
                    e = tu["st"].get(nm)
                    if e and e[2] == tu["side"]:
                        val += e[0]
                        del tu["st"][nm]
                tu["lis"] = []
                tu["mit"] = 0
                tu["mitv"] = 0.0
                R["M"][s]["ctrl"] += val
    if tot > R["maxhit"]:
        R["maxhit"] = tot


def ko_check(R, cfg, rnd):
    for u in R["U"]:
        if u["down"] == -1 and u["hp"] <= 0:
            if u["kw"] == "不屈" and not u["kws"]:
                u["kws"] = True
                u["hp"] = 1
                continue
            u["down"] = rnd
            u["hp"] = 0
            u["st"] = {}
            u["lis"] = []
            u["mit"] = 0
            k = u["last"]
            if k is not None and k != u["side"]:
                R["kob"][k] += cfg["ko_pct"]
            R["kos"][u["side"]] += 1


def resolve(R, acts_in, cfg, rnd):
    acts = []
    for a in acts_in:
        b = dict(a)
        b["done"] = False
        acts.append(b)
    tl = cfg["timeline"]
    for t in range(0, tl + 1):
        firing = [a for a in acts if not a["done"] and a["start"] == t]
        if not firing:
            continue
        firing.sort(key=lambda a: (0 if a["def"] else 1, a["ord"]))
        for a in firing:
            if a["done"] or a["start"] != t:
                continue
            a["done"] = True
            if R["U"][a["uid"]]["down"] != -1:
                fizzle(R, a)
                continue
            fire(R, a, acts, cfg, rnd)
        ko_check(R, cfg, rnd)
    for a in acts:
        if not a["done"]:
            a["done"] = True
            fizzle(R, a)
    for u in R["U"]:
        if u["down"] != -1:
            continue
        b = u["st"].get("灼烧")
        if b:
            d = dmg_to(R, b[2], u, b[0])
            if b[2] != u["side"]:
                R["M"][b[2]]["pay"] += d
    ko_check(R, cfg, rnd)


# ---------------------------------------------------------------- 电脑（贪心 + 一轮模拟）
def stat_value(R, s):
    v = 0.0
    for u in R["U"]:
        if u["down"] != -1:
            continue
        for nm, e in u["st"].items():
            if e[2] == s:
                v += e[0]
    return v


def util(R, s, G):
    cfg = G["cfg"]
    c0 = G["sides"][s]["cls"]
    c1 = G["sides"][1 - s]["cls"]
    ps = prog(R, s, c0, cfg)
    po = prog(R, 1 - s, c1, cfg)
    u = 100.0 * (ps - po)
    hs = sum(x["hp"] for x in R["U"] if x["side"] == s and x["down"] == -1)
    ho = sum(x["hp"] for x in R["U"] if x["side"] != s and x["down"] == -1)
    u += 0.8 * (hs - ho)
    u += 0.6 * (stat_value(R, s) - stat_value(R, 1 - s))
    # 打掉的血折算成“将来击倒”的价值（只看这一轮的话，电脑不愿意先磨血）
    kp = cfg["ko_pct"] * 100.0 * cfg["ko_look"]
    if kp > 0:
        for x in R["U"]:
            if x["down"] == -1:
                frac = 1.0 - x["hp"] / float(x["mx"])
                u += kp * frac if x["side"] != s else -kp * frac
    if ps >= 1.0 or po >= 1.0:
        u += 500 if ps > po else (-500 if po > ps else 0)
    return u


def usable_cards(G, s, reserved):
    r = G["round"]
    out = []
    for i, c in enumerate(G["sides"][s]["cards"]):
        if i in reserved:
            continue
        if c["once"] or r - c["last"] >= 2:
            out.append(i)
    return out


def pick_cards(G, s, avail_idx, values):
    """values: 每个数字位置要的值（1 免费）。返回用到的牌下标，凑不齐返回 None"""
    need = Counter(v for v in values if v > 1)
    if not need:
        return []
    cards = G["sides"][s]["cards"]
    used = []
    for v, n in need.items():
        cand = [i for i in avail_idx if cards[i]["v"] == v and i not in used]
        cand.sort(key=lambda i: 0 if not cards[i]["once"] else 1)   # 先用可反复的
        if len(cand) < n:
            return None
        used += cand[:n]
    return used


def gen_cands(G, s, uid, declared, res):
    cfg = G["cfg"]
    R = G["R"]
    U = R["U"]
    side = G["sides"][s]
    cls = side["cls"]
    E = sorted([u for u in U if u["side"] != s and u["down"] == -1], key=lambda u: u["hp"])
    F = [u for u in U if u["side"] == s and u["down"] == -1]
    if not E and not F:
        return []
    avail_idx = usable_cards(G, s, res["cards"])
    vals = sorted({G["sides"][s]["cards"][i]["v"] for i in avail_idx}, reverse=True)
    opts = [1] + vals[:2]
    enemy_acts = [a for a in declared if a["side"] != s]
    threatened = []
    for a in enemy_acts:
        for cl in a["cl"]:
            if cl["k"] == "atk":
                threatened += [t for t in cl["tg"] if U[t]["side"] == s]
    threat_order = [u["uid"] for u in sorted(F, key=lambda u: -threatened.count(u["uid"]))]
    starts_extra = sorted({a["start"] for a in enemy_acts})

    def starts(ms):
        out = {ms, ms + 1}
        for t in starts_extra:
            if t - 1 >= ms:
                out.add(t - 1)
            if t >= ms:
                out.add(t)
        out = sorted(x for x in out if x <= cfg["timeline"])
        return out[:3]

    def tsets(pool, n):
        ids = [u["uid"] for u in pool]
        if not ids:
            return []
        if n >= len(ids):
            return [ids]
        if n == 1:
            return [[ids[0]], [ids[-1]]] if len(ids) > 1 else [[ids[0]]]
        return [ids[:2], [ids[0], ids[-1]]]

    out = []
    words = res["words"]

    def add(cl_list, ab_words, card_vals, start_opts=None):
        cost = cfg["base_cost"] + sum(PRICE[w] for w in ab_words) + (len(cl_list) - 1) * cfg["and_cost"]
        if cost > res["ap"]:
            return
        for w in ab_words:
            if words[w] <= 0:
                return
        cards = pick_cards(G, s, avail_idx, card_vals)
        if cards is None:
            return
        ms = 1 + len(ab_words) + (len(cl_list) - 1)
        if ms > cfg["timeline"]:
            return
        val = cost + sum(v for v in card_vals if v > 1)
        dfn = all(c["k"] in ("mit", "reflect", "redirect", "heal") or (c["k"] == "st" and c["st"] in SELF_ST) for c in cl_list)
        for st in (start_opts or starts(ms)):
            out.append({"side": s, "uid": uid, "start": st, "cl": cl_list, "cost": cost, "cards": cards,
                        "words": ab_words, "val": val, "def": dfn, "ms": ms,
                        "cv": [v for v in card_vals if v > 1]})

    # 攻击：几个目标 × 几点 × 几次
    for n in opts:
        if n > len(E):
            continue
        for d in opts:
            for r in [1] + [v for v in vals[:1] if v <= cfg["rep_max"]]:
                for tg in tsets(E, n):
                    add([{"k": "atk", "tg": tg, "n": d, "rep": r}], [], [n, d, r])
    # 治疗
    hurt = sorted([u for u in F if u["hp"] < u["mx"]], key=lambda u: u["hp"] - u["mx"])
    if hurt:
        for n in opts:
            if n > len(F):
                continue
            for a in opts:
                tg = [u["uid"] for u in hurt][:n]
                if len(tg) < n:
                    tg = (tg + [u["uid"] for u in F if u["uid"] not in tg])[:n]
                add([{"k": "heal", "tg": tg, "n": a, "rep": 1}], [], [n, a])
    # 自残（治疗职业才考虑：打自己再奶）
    if cls == "治疗" and len(F) > 1:
        big = max(F, key=lambda u: u["hp"])
        for d in opts:
            add([{"k": "atk", "tg": [big["uid"]], "n": d, "rep": 1}], [], [1, d, 1])
    # 减伤
    if enemy_acts or cls == "守护":
        for n in opts:
            if n > len(F):
                continue
            for a in opts:
                add([{"k": "mit", "tg": threat_order[:n], "n": a}], [], [n, a])
    # 状态
    for nm in ENEMY_ST + SELF_ST:
        if words[nm] <= 0:
            continue
        pool = E if nm in ENEMY_ST else F
        for n in opts:
            if n > len(pool):
                continue
            for d in opts:
                for tg in tsets(pool if nm in ENEMY_ST else sorted(F, key=lambda u: -u["hp"]), n):
                    add([{"k": "st", "st": nm, "tg": tg, "n": d}], [nm], [n, d])
    # 回敬 / 转移（改道）
    for k, w in (("reflect", "回敬"), ("redirect", "转移")):
        if words[w] <= 0 or not (enemy_acts or cls == "守护"):
            continue
        for n in opts:
            if n > len(F):
                continue
            if cfg["reflect_cap"]:
                for c in opts:
                    add([{"k": k, "tg": threat_order[:n], "cap": c}], [w], [n, c])
            else:
                add([{"k": k, "tg": threat_order[:n], "cap": None}], [w], [n])
    # 延后
    if words["延后"] > 0:
        for a in enemy_acts:
            for sec in opts:
                ms = 2
                st = [x for x in range(ms, a["start"]) ][:1]
                if st:
                    add([{"k": "delay", "act": a["ord"], "n": sec}], ["延后"], [sec], st)
    # 移除
    if words["移除"] > 0:
        for u in E:
            if u["lis"] or u["mit"] or any(nm in u["st"] for nm in SELF_ST):
                add([{"k": "remove", "tg": [u["uid"]]}], ["移除"], [])
        for a in enemy_acts:
            for cl in a["cl"]:
                if cl["k"] in ("mit", "reflect", "redirect") or (cl["k"] == "st" and cl["st"] in SELF_ST):
                    t = cl["tg"][0]
                    st = [x for x in range(a["start"] + 1, cfg["timeline"] + 1)][:1]
                    if st:
                        add([{"k": "remove", "tg": [t]}], ["移除"], [], st)
    # “1” 免费连击（并）：检查“并”会不会被滥用
    if E:
        for kk in range(2, cfg["clause_max"] + 1):
            add([{"k": "atk", "tg": [E[0]["uid"]], "n": 1, "rep": 1} for _ in range(kk)], [], [])
    return out


def choose(G, s, declared, remaining, res):
    R0 = G["R"]
    base_R = clone_R(R0)
    resolve(base_R, declared, G["cfg"], G["round"])
    u0 = util(base_R, s, G)
    best = None
    best_v = -1e9
    worst_uid = None
    worst_gain = 1e9
    cards = G["sides"][s]["cards"]
    for uid in remaining:
        local_best = -1e9
        for c in gen_cands(G, s, uid, declared, res):
            c["ord"] = len(declared)
            R = clone_R(R0)
            resolve(R, declared + [c], G["cfg"], G["round"])
            v = util(R, s, G) - 0.6 * c["cost"]
            for i in c["cards"]:
                v -= (0.5 if cards[i]["once"] else 0.25) * cards[i]["v"]
            v += G["rng"].random() * 0.3
            if v > local_best:
                local_best = v
            if v > best_v:
                best_v = v
                best = c
        g = local_best - u0
        if g < worst_gain:
            worst_gain = g
            worst_uid = uid
    if best is None or best_v - u0 < G["cfg"]["pass_gain"]:
        return worst_uid if worst_uid is not None else remaining[0], None
    return best["uid"], best


# ---------------------------------------------------------------- 一局
def begin_round(G):
    cfg = G["cfg"]
    G["round"] += 1
    r = G["round"]
    for u in G["R"]["U"]:
        u["mit"] = 0
        u["mitv"] = 0.0
        u["lis"] = []
        u["kws"] = False
        if u["down"] != -1 and r >= u["down"] + 2:
            u["down"] = -1
            u["hp"] = u["mx"]
            u["st"] = {}
        elif u["down"] == -1:
            for nm in list(u["st"]):
                e = u["st"][nm]
                if r > e[1]:
                    del u["st"][nm]
                else:
                    e[0] += 1
    for s in range(2):
        sd = G["sides"][s]
        if r > 1:
            sd["ap"] = min(sd["ap"] + cfg["ap_income"], cfg["ap_cap"])
        sd["prev"] = sd["used"]
        sd["used"] = Counter()
        if cfg["round_growth"] and r >= 2:
            v = min(1 + r // 2, 6)
            sd["cards"].append({"v": v, "once": True, "last": -9})
            G["stat"]["cards_gain"][s]["轮次"] += 1


def play_round(G):
    cfg = G["cfg"]
    begin_round(G)
    r = G["round"]
    first = (G["first0"] + r - 1) % 2
    remaining = {s: [u["uid"] for u in G["R"]["U"] if u["side"] == s and u["down"] == -1] for s in range(2)}
    res = {}
    for s in range(2):
        sd = G["sides"][s]
        words = Counter()
        for w, n in sd["deck"].items():
            words[w] = n - sd["prev"][w]
        res[s] = {"ap": sd["ap"], "words": words, "cards": set()}
    declared = []
    turn = first
    if cfg["alternate"]:
        seq = None
    else:
        seq = [first] * len(remaining[first]) + [1 - first] * len(remaining[1 - first])
    step = 0
    while remaining[0] or remaining[1]:
        if seq is not None:
            s = seq[step]
        else:
            s = turn
            if not remaining[s]:
                s = 1 - s
        uid, act = choose(G, s, declared, remaining[s], res[s])
        remaining[s].remove(uid)
        if act is not None:
            act["ord"] = len(declared)
            declared.append(act)
            res[s]["ap"] -= act["cost"]
            for w in act["words"]:
                res[s]["words"][w] -= 1
            for i in act["cards"]:
                res[s]["cards"].add(i)
        turn = 1 - s
        step += 1
    # 真结算
    R = G["R"]
    R["kos"] = [0, 0]
    R["lost"] = [0, 0]
    R["fz"] = [0, 0]
    R["maxhit"] = 0
    resolve(R, declared, cfg, r)
    st = G["stat"]
    st["maxhit"] = max(st["maxhit"], R["maxhit"])
    st["kos"] += R["kos"][0] + R["kos"][1]
    st["fz"] += R["fz"][0] + R["fz"][1]
    for a in declared:
        s = a["side"]
        sd = G["sides"][s]
        sd["ap"] -= a["cost"]
        for w in a["words"]:
            sd["used"][w] += 1
        for i in a["cards"]:
            c = sd["cards"][i]
            st["cards_used"][s].append(c["v"])
            if c["once"]:
                c["gone"] = True
            else:
                c["last"] = r
        st["acts"] += 1
        kinds = [cl["k"] if cl["k"] != "st" else ("状态" + cl["st"]) for cl in a["cl"]]
        if len(a["cl"]) > 1:
            st["chain"] += 1
            st["kinds"]["连击(并)"] += 1
        else:
            st["kinds"][kinds[0]] += 1
    for s in range(2):
        G["sides"][s]["cards"] = [c for c in G["sides"][s]["cards"] if not c.get("gone")]
    # 挫折骰子、阶梯
    for s in range(2):
        sd = G["sides"][s]
        if R["lost"][s] >= cfg["dice_hp"] or (cfg["dice_on_ko"] and R["kos"][s] > 0):
            for _ in range(cfg["dice_count"]):
                v = G["rng"].randint(1, 6)
                st["cards_gain"][s]["骰子掷出%d" % v] += 1
                if v > 1:
                    sd["cards"].append({"v": v, "once": True, "last": -9})
                    st["cards_gain"][s]["骰子"] += 1
        p = prog(R, s, sd["cls"], cfg)
        for i, thr in enumerate(cfg["lad"]):
            if p >= thr and i not in sd["lad"]:
                sd["lad"].add(i)
                for _ in range(cfg["ladder_copies"]):
                    sd["cards"].append({"v": cfg["ladv"][i], "once": False, "last": -9})
                    st["cards_gain"][s]["阶梯"] += 1
    if r == 4:
        st["prog_r4"] = [prog(R, s, G["sides"][s]["cls"], cfg) for s in range(2)]


def play_game(cfg, c0, c1, seed):
    rng = random.Random(seed)
    G = new_game(cfg, c0, c1, rng)
    winner = -2
    while G["round"] < cfg["max_rounds"]:
        play_round(G)
        p = [prog(G["R"], s, G["sides"][s]["cls"], cfg) for s in range(2)]
        if p[0] >= 1.0 or p[1] >= 1.0:
            winner = 0 if p[0] > p[1] else (1 if p[1] > p[0] else -1)
            break
    p = [prog(G["R"], s, G["sides"][s]["cls"], cfg) for s in range(2)]
    capped = winner == -2
    if capped:
        winner = 0 if p[0] > p[1] else (1 if p[1] > p[0] else -1)
    st = G["stat"]
    comeback = False
    if st["prog_r4"] and winner >= 0:
        lead = 0 if st["prog_r4"][0] > st["prog_r4"][1] + 0.05 else (1 if st["prog_r4"][1] > st["prog_r4"][0] + 0.05 else -1)
        comeback = lead >= 0 and lead != winner
    return {"cls": [c0, c1], "winner": winner, "rounds": G["round"], "capped": capped, "first0": G["first0"],
            "prog": p, "kos": st["kos"], "maxhit": st["maxhit"], "kinds": dict(st["kinds"]), "acts": st["acts"],
            "chain": st["chain"], "gain": [dict(st["cards_gain"][0]), dict(st["cards_gain"][1])],
            "used": st["cards_used"], "comeback": comeback, "fz": st["fz"],
            "metric": [dict(G["R"]["M"][0]), dict(G["R"]["M"][1])]}


def _job(args):
    cfg, c0, c1, seed = args
    return play_game(cfg, c0, c1, seed)


def run(n, seed, over):
    cfg = cfg_from(over)
    rng = random.Random(seed)
    jobs = []
    for i in range(n):
        c0 = CLASSES[i % 5]
        c1 = CLASSES[(i // 5) % 5]
        if rng.random() < 0.5:
            c0, c1 = c1, c0
        jobs.append((cfg, c0, c1, seed * 100000 + i))
    t0 = time.time()
    with Pool(18) as p:
        res = p.map(_job, jobs, chunksize=2)
    return cfg, res, time.time() - t0


def report(cfg, res, secs):
    n = len(res)
    lines = []
    rounds = sum(r["rounds"] for r in res) / n
    capped = sum(1 for r in res if r["capped"])
    first_w = sum(1 for r in res if r["winner"] == r["first0"])
    decided = sum(1 for r in res if r["winner"] >= 0)
    lines.append("局数 %d（%.0f 秒）：平均 %.1f 轮，打满 12 轮 %d 局（%.0f%%），平局 %d" % (n, secs, rounds, capped, 100.0 * capped / n, n - decided))
    lines.append("首轮先宣告方胜 %d/%d（%.0f%%）" % (first_w, decided, 100.0 * first_w / max(1, decided)))
    wins = Counter()
    games = Counter()
    mat = defaultdict(lambda: [0, 0])
    for r in res:
        a, b = r["cls"]
        if a == b:
            continue
        games[a] += 1
        games[b] += 1
        if r["winner"] >= 0:
            w = r["cls"][r["winner"]]
            l = r["cls"][1 - r["winner"]]
            wins[w] += 1
            mat[(w, l)][0] += 1
    lines.append("职业胜率（不含同职业对局）：" + "  ".join("%s %.0f%%" % (c, 100.0 * wins[c] / max(1, games[c])) for c in CLASSES))
    worst = []
    for i, a in enumerate(CLASSES):
        for b in CLASSES[i + 1:]:
            wa = mat[(a, b)][0]
            wb = mat[(b, a)][0]
            if wa + wb >= 4:
                worst.append((abs(wa - wb) / float(wa + wb), a, b, wa, wb))
    worst.sort(reverse=True)
    lines.append("最一边倒的对局：" + "；".join("%s %d:%d %s" % (a, wa, wb, b) for _, a, b, wa, wb in worst[:4]))
    prog_cls = defaultdict(list)
    for r in res:
        for s in range(2):
            prog_cls[r["cls"][s]].append(r["prog"][s])
    rate = defaultdict(list)
    for r in res:
        for s in range(2):
            c = r["cls"][s]
            rate[c].append(r["metric"][s][METRIC[c]] / float(r["rounds"]))
    lines.append("每轮得分速度（原始值/轮，目标 %s）：" % "/".join(str(cfg["target"][c]) for c in CLASSES) + "  ".join("%s %.1f" % (c, sum(rate[c]) / max(1, len(rate[c]))) for c in CLASSES))
    lines.append("终局完成度平均：" + "  ".join("%s %.0f%%" % (c, 100.0 * sum(prog_cls[c]) / max(1, len(prog_cls[c]))) for c in CLASSES))
    kos = sum(r["kos"] for r in res) / n
    mh = sorted(r["maxhit"] for r in res)
    lines.append("每局击倒 %.1f；一句话最大伤害 中位 %d / 95%% %d / 最大 %d；每局落空 %.1f 次" % (kos, mh[n // 2], mh[int(n * 0.95)], mh[-1], sum(r["fz"] for r in res) / n))
    g = Counter()
    used = []
    for r in res:
        for s in range(2):
            for k, v in r["gain"][s].items():
                g[k] += v
            used += r["used"][s]
    side_games = 2.0 * n
    lines.append("每方每局获得数字牌：阶梯 %.1f 张、骰子 %.1f 张（掷出 1 作废 %.1f 次）、轮次 %.1f 张；用掉 %.1f 张，平均面值 %.1f" % (
        g["阶梯"] / side_games, g["骰子"] / side_games, g["骰子掷出1"] / side_games, g["轮次"] / side_games,
        len(used) / side_games, (sum(used) / float(len(used))) if used else 0))
    kinds = Counter()
    acts = 0
    for r in res:
        for k, v in r["kinds"].items():
            kinds[k] += v
        acts += r["acts"]
    lines.append("每局出手 %.1f 句；动作占比：" % (acts / float(n)) + "  ".join("%s %.0f%%" % (k, 100.0 * v / max(1, acts)) for k, v in kinds.most_common(9)))
    cb = sum(1 for r in res if r["comeback"])
    lines.append("翻盘（第 4 轮落后的一方最终赢）%d 局（%.0f%%）" % (cb, 100.0 * cb / max(1, decided)))
    return "\n".join(lines)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    over = {}
    for a in sys.argv[3:]:
        k, v = a.split("=", 1)
        over[k] = v
    cfg, res, secs = run(n, seed, over)
    print("参数：", json.dumps({k: cfg[k] for k in over}, ensure_ascii=False))
    print(report(cfg, res, secs))

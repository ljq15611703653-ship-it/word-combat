# -*- coding: utf-8 -*-
"""
数字牌模式 · 第二版模拟器：四个职业 = 四个基础词的特长（研究用；游戏代码 godot/scripts/numcard/ 按这里的定稿移植）

职业（每个职业拿一个人人都用的基础词，改它的一条规则）：
  并流（并）  长度：一句能拼更多段，“并”更便宜
  续流（持续）时长：持续能接在伤害、恢复、减伤上 —— 这一段以后每轮同一秒自动再来一次
  择流（选择）时机：目标到出手那一刻才定（宣告时对手只看到“待定”），定好的人倒了自动换人
  血流（自身）费用：行动点不够，可以用出手随从的生命来付

共同：数字是牌（1 免费；职业阶梯、挫折骰子、保底数字），轮流宣告，击倒得目标分的 15%，先到 100% 赢，12 轮打满比完成度。
进阶词只剩 易伤 灼烧 衰弱 转移 延后 移除（铁壁 = 减伤+数字，蓄力 = 伤害+数字，回敬被转移完全压过，都删掉）。

用法：python nc_sim2.py 局数 种子 [键=值 ...]
"""
import random, sys, json, time
from collections import Counter, defaultdict
from multiprocessing import Pool

CLASSES = ["并", "续", "择", "血"]
METRIC = {"并": "chain", "续": "cont", "择": "pick", "血": "blood"}
ENEMY_ST = ("易伤", "灼烧", "衰弱")
PRICE = {"易伤": 1, "灼烧": 1, "衰弱": 1, "转移": 2, "延后": 1, "移除": 1}

BASE = dict(
    hp_pool=21, hp_min=3,
    ap_start=6, ap_income=6, ap_cap=12,
    base_cost=1, and_cost=2, clause_max=3,
    timeline=10, max_rounds=12,
    ko_pct=0.15,
    ladder="0.1,0.25,0.45,0.7", ladder_values="2,3,4,5", ladder_copies=2,
    dice_hp=4, dice_count=2,
    floor="3:2,5:3,7:4",
    # 目标分
    t_chain=30, t_cont=40, t_pick=45, t_blood=50,
    # 并流
    b_cap=5, b_cap_up="", b_and=1, b_bonus=1, b_mode="kinds",
    # 续流
    x_slots=1, x_slots_up="0.25,0.7", x_payoff=1,
    # 择流
    z_heal=1, z_ko=0,
    # 血流
    y_cap=3, y_cap_up="0.25:5,0.7:8", y_paid=1.0, y_dice=1, y_all=0, y_bw=1.0,
    # 电脑
    pass_gain=0.3, ko_look=0.5, danger_hp=4, danger_w=0.0, combo_k=6, smart_late=1, cont_look=0.6,
    rep_max=3,
)

PRESET = {
    "并": {"易伤": 2, "灼烧": 1, "衰弱": 2, "转移": 2, "延后": 1, "移除": 2},
    "续": {"易伤": 2, "灼烧": 2, "衰弱": 2, "转移": 1, "延后": 1, "移除": 2},
    "择": {"易伤": 2, "灼烧": 1, "衰弱": 1, "转移": 2, "延后": 2, "移除": 2},
    "血": {"易伤": 2, "灼烧": 2, "衰弱": 1, "转移": 2, "延后": 1, "移除": 2},
}
KWS = {"并": ["不屈", "首挡", "首挡"], "续": ["首挡", "不屈", "不屈"], "择": ["首挡", "不屈", "首挡"], "血": ["不屈", "不屈", "首挡"]}


def cfg_from(over):
    c = dict(BASE)
    for k, v in over.items():
        if k in BASE and not isinstance(BASE[k], str):
            c[k] = type(BASE[k])(float(v)) if isinstance(BASE[k], int) else type(BASE[k])(v)
        else:
            c[k] = v
    c["target"] = {"并": c["t_chain"], "续": c["t_cont"], "择": c["t_pick"], "血": c["t_blood"]}
    c["lad"] = [float(x) for x in str(c["ladder"]).split(",") if x]
    c["ladv"] = [int(x) for x in str(c["ladder_values"]).split(",") if x]
    c["floor_d"] = {int(a): int(b) for a, b in (p.split(":") for p in str(c["floor"]).split(",") if p)}
    c["b_cap_up_l"] = [float(x) for x in str(c["b_cap_up"]).split(",") if x]
    c["x_slots_up_l"] = [float(x) for x in str(c["x_slots_up"]).split(",") if x]
    c["y_cap_up_l"] = [(float(a), int(b)) for a, b in (p.split(":") for p in str(c["y_cap_up"]).split(",") if p)]
    return c


# ---------------------------------------------------------------- 状态
def new_game(cfg, c0, c1, rng):
    G = {"cfg": cfg, "round": 0, "rng": rng, "first0": rng.randint(0, 1), "sides": [], "R": None,
         "stat": {"kinds": Counter(), "acts": 0, "kos": 0, "prog_r4": None, "maxhit": 0, "fz": 0,
                  "talent": [Counter(), Counter()], "clauses": [Counter(), Counter()], "words": [Counter(), Counter()]}}
    U = []
    for s, c in enumerate((c0, c1)):
        G["sides"].append({"cls": c, "ap": cfg["ap_start"], "deck": dict(PRESET[c]), "used": Counter(),
                           "prev": Counter(), "cards": [], "lad": set()})
        for i in range(3):
            U.append({"uid": s * 3 + i, "side": s, "hp": 7, "mx": 7, "down": -1, "st": {}, "kw": KWS[c][i],
                      "kws": False, "mit": 0, "mitc": 0, "msrc": [], "lis": [], "last": None})
    G["R"] = {"U": U, "M": [metric0() for _ in range(2)], "kob": [0.0, 0.0], "kos": [0, 0], "fz": [0, 0],
              "lost": [0, 0], "maxhit": 0, "conts": [], "eff": set()}
    return G


def metric0():
    return {"chain": 0.0, "cont": 0.0, "pick": 0.0, "blood": 0.0, "dmg": 0.0}


def clone_R(R):
    U = []
    for u in R["U"]:
        v = u.copy()
        v["st"] = {k: x[:] for k, x in u["st"].items()}
        v["lis"] = [l.copy() for l in u["lis"]]
        v["msrc"] = u["msrc"][:]
        U.append(v)
    return {"U": U, "M": [R["M"][0].copy(), R["M"][1].copy()], "kob": R["kob"][:], "kos": [0, 0], "fz": [0, 0],
            "lost": [0, 0], "maxhit": 0, "conts": [dict(c) for c in R["conts"]], "eff": set()}


def caps(G, s):
    """这一方现在的职业上限（会随职业阶梯涨）"""
    cfg = G["cfg"]
    sd = G["sides"][s]
    c = sd["cls"]
    p = prog(G["R"], s, c, cfg)
    out = {"clauses": cfg["clause_max"], "and": cfg["and_cost"], "slots": 0, "blood": 0, "late": False}
    if c == "并":
        out["clauses"] = cfg["b_cap"] + sum(1 for t in cfg["b_cap_up_l"] if p >= t)
        out["and"] = cfg["b_and"]
    elif c == "续":
        out["slots"] = cfg["x_slots"] + sum(1 for t in cfg["x_slots_up_l"] if p >= t)
    elif c == "择":
        out["late"] = True
    elif c == "血":
        b = cfg["y_cap"]
        for t, v in cfg["y_cap_up_l"]:
            if p >= t:
                b = v
        out["blood"] = b
    return out


def prog(R, s, cls, cfg):
    return R["M"][s][METRIC[cls]] / float(cfg["target"][cls]) + R["kob"][s]


# ---------------------------------------------------------------- 结算
def credit(R, s, key, v):
    if v > 0:
        R["M"][s][key] += v


def dmg_to(R, s_src, tu, amt, G_cls):
    if amt <= 0 or tu["down"] != -1:
        return 0
    dealt = min(amt, tu["hp"]) if tu["hp"] > 0 else 0
    tu["hp"] -= amt
    tu["last"] = s_src
    if s_src != tu["side"]:
        R["M"][s_src]["dmg"] += dealt
        R["lost"][tu["side"]] += dealt
    return dealt


def hit(R, cfg, cls, s, cu, tu, base, a, ci, cont):
    """一下伤害。返回打掉的血。cls = 两方职业"""
    o = tu["side"]
    if tu["down"] != -1 or tu["hp"] <= 0:
        return 0
    enemy = s != o
    amt = base
    v = tu["st"].get("易伤")
    vl = v[0] if v else 0
    amt += vl
    wk = cu["st"].get("衰弱")
    if wk and amt > 0:
        r = min(wk[0], amt)
        amt -= r
        if enemy and wk[2] == o and cls[o] == "续" and cfg["x_payoff"]:
            credit(R, o, "cont", r)
    if tu["mit"] > 0 and amt > 0:
        r = min(tu["mit"], amt)
        amt -= r
        if enemy:
            for key in tu["msrc"]:
                R["eff"].add(key)
            if cls[o] == "续" and tu["mitc"] > 0:
                credit(R, o, "cont", min(r, tu["mitc"]))
    if amt > 0 and enemy and tu["kw"] == "首挡" and not tu["kws"]:
        tu["kws"] = True
        amt = 0
    back = 0
    if amt > 0 and enemy:
        for l in tu["lis"]:
            if l["k"] == "redirect":
                back = amt
                amt = 0
                R["eff"].add(l["src"])
                break
    dealt = dmg_to(R, s, tu, amt, cls)
    if enemy and dealt > 0:
        R["eff"].add((a["ord"], ci))
        if cls[s] == "择":
            credit(R, s, "pick", dealt)
        if cls[s] == "血" and (a.get("blood", 0) > 0 or cfg["y_all"]):
            credit(R, s, "blood", dealt * cfg["y_paid"])
        if cls[s] == "续":
            if cont:
                credit(R, s, "cont", dealt)
            elif vl and v[2] == s and cfg["x_payoff"]:
                credit(R, s, "cont", min(vl, dealt))
        elif vl and v[2] == s and cls[s] != "续":
            pass
        if vl and v[2] != s and cls[v[2]] == "续" and cfg["x_payoff"]:
            pass
    if back and cu["down"] == -1 and cu["hp"] > 0:
        d = dmg_to(R, o, cu, back, cls)
        if cls[o] == "择":
            credit(R, o, "pick", d)
    return dealt


def fizzle(R, a):
    R["fz"][a["side"]] += 1


def late_targets(R, cfg, cls, a, cl, acts, t):
    """择流：出手这一刻定目标。已经定好的（玩家或电脑在宣告结束后定的）还活着就打它们，倒了的自动换人"""
    s = a["side"]
    U = R["U"]
    side = cl["side"]
    pool = [u for u in U if u["down"] == -1 and u["hp"] > 0 and ((u["side"] != s) == (side == "enemy"))]
    n = min(cl["count"], len(pool))
    pre = [x for x in (cl.get("tg") or []) if U[x]["down"] == -1 and U[x]["hp"] > 0 and U[x] in pool]
    pre = pre[:n]
    if len(pre) >= n:
        return pre
    if cl.get("tg"):
        R.setdefault("retarget", [0, 0])[s] += 1
    rest = [u for u in pool if u["uid"] not in pre]
    k = cl["k"]
    if k == "atk":
        # 先挑这一下能打倒的、后面还有招没出的，再挑血少的
        pend = Counter(b["uid"] for b in acts if not b["done"] and b["side"] != s)
        per = cl["n"] * cl.get("rep", 1)

        def key(u):
            vl = u["st"].get("易伤")
            eff = per + (vl[0] if vl else 0) * cl.get("rep", 1) - u["mit"] * cl.get("rep", 1)
            kill = 1 if eff >= u["hp"] and not (u["kw"] == "首挡" and not u["kws"]) else 0
            return (-kill, -pend[u["uid"]] * kill, -(1 if any(l["k"] == "redirect" for l in u["lis"]) else 0) * -1, u["hp"])
        rest.sort(key=key)
    elif k == "heal":
        rest.sort(key=lambda u: u["hp"] - u["mx"])
    elif k == "mit":
        thr = Counter()
        for b in acts:
            if not b["done"] and b["side"] != s:
                for c2 in b["cl"]:
                    if c2["k"] == "atk":
                        for x in (c2.get("tg") or []):
                            thr[x] += c2["n"] * c2.get("rep", 1)
        rest.sort(key=lambda u: (-thr[u["uid"]], u["hp"]))
    elif k == "st":
        rest.sort(key=lambda u: (u["st"].get(cl["st"], [0])[0], u["hp"]))
    else:
        rest.sort(key=lambda u: u["hp"])
    return pre + [u["uid"] for u in rest[:n - len(pre)]]


def fire(R, cfg, cls, a, acts, rnd, t):
    s = a["side"]
    U = R["U"]
    cu = U[a["uid"]]
    tot = 0
    for ci, cl in enumerate(a["cl"]):
        k = cl["k"]
        cont = a.get("is_cont", False)
        if cl.get("late"):
            tg = late_targets(R, cfg, cls, a, cl, acts, t)
            cl = dict(cl)
            cl["tg"] = tg
            if a.get("is_cont"):
                pass
        if k == "atk":
            for _ in range(cl["rep"]):
                for x in cl["tg"]:
                    tot += hit(R, cfg, cls, s, cu, U[x], cl["n"], a, ci, cont)
        elif k == "heal":
            for _ in range(cl["rep"]):
                for x in cl["tg"]:
                    tu = U[x]
                    if tu["down"] != -1:
                        continue
                    eff = min(cl["n"], tu["mx"] - tu["hp"])
                    if eff > 0:
                        tu["hp"] += eff
                        if tu["side"] == s:
                            R["eff"].add((a["ord"], ci))
                            if cls[s] == "择" and cfg["z_heal"]:
                                credit(R, s, "pick", eff)
                            if cls[s] == "续" and cont:
                                credit(R, s, "cont", eff)
        elif k == "mit":
            for x in cl["tg"]:
                tu = U[x]
                if tu["down"] == -1:
                    tu["mit"] += cl["n"]
                    if cont:
                        tu["mitc"] += cl["n"]
                    tu["msrc"].append((a["ord"], ci))
        elif k == "st":
            nm = cl["st"]
            for x in cl["tg"]:
                tu = U[x]
                if tu["down"] != -1:
                    continue
                e = tu["st"].get(nm)
                if e:
                    e[0] += 1
                    e[1] = max(e[1], rnd + cl["n"] - 1)
                else:
                    tu["st"][nm] = [1, rnd + cl["n"] - 1, s]
                R["eff"].add((a["ord"], ci))
        elif k == "redirect":
            for x in cl["tg"]:
                tu = U[x]
                if tu["down"] == -1:
                    tu["lis"].append({"k": k, "side": s, "src": (a["ord"], ci)})
        elif k == "delay":
            for b in acts:
                if b["ord"] == cl["act"] and not b["done"]:
                    b["start"] += cl["n"]
                    R["eff"].add((a["ord"], ci))
                    if b["start"] > cfg["timeline"]:
                        b["done"] = True
                        fizzle(R, b)
        elif k == "remove":
            tu = U[cl["tg"][0]] if cl.get("tg") else None
            if tu is not None and tu["down"] == -1:
                had = tu["mit"] > 0 or tu["lis"] or any(c["uid"] == tu["uid"] for c in R["conts"])
                tu["lis"] = []
                tu["mit"] = 0
                tu["mitc"] = 0
                tu["msrc"] = []
                n0 = len(R["conts"])
                R["conts"] = [c for c in R["conts"] if c["uid"] != tu["uid"]]
                if had:
                    R["eff"].add((a["ord"], ci))
        # 续：这一段以后每轮同一秒再来一次
        if cl.get("cont", 1) > 1 and not a.get("is_cont"):
            c2 = dict(cl)
            c2.pop("cont", None)
            R["conts"].append({"side": s, "uid": a["uid"], "cl": c2, "start": a["start"], "left": cl["cont"] - 1})
    if tot > R["maxhit"]:
        R["maxhit"] = tot


def ko_check(R, cfg, cls, rnd):
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
            u["mitc"] = 0
            u["msrc"] = []
            R["conts"] = [c for c in R["conts"] if c["uid"] != u["uid"]]
            k = u["last"]
            if k is not None and k != u["side"]:
                R["kob"][k] += cfg["ko_pct"]
                if cls[k] == "择" and cfg["z_ko"]:
                    R["M"][k]["pick"] += cfg["z_ko"]
            R["kos"][u["side"]] += 1


def cont_acts(R):
    out = []
    for i, c in enumerate(R["conts"]):
        out.append({"side": c["side"], "uid": c["uid"], "start": c["start"], "cl": [c["cl"]], "is_cont": True,
                    "ord": 1000 + i, "def": c["cl"]["k"] in ("mit", "heal"), "blood": 0, "cost": 0})
    return out


def resolve(R, acts_in, cfg, cls, rnd):
    """一轮结算。cls=[职业0, 职业1]。会消耗续（left-1）"""
    acts = [dict(a, done=False) for a in acts_in]
    acts += [dict(a, done=False) for a in cont_acts(R)]
    for c in R["conts"]:
        c["left"] -= 1
    R["conts"] = [c for c in R["conts"] if c["left"] > 0]
    # 血契：先付血
    for a in acts:
        b = a.get("blood", 0)
        if b > 0:
            u = R["U"][a["uid"]]
            u["hp"] -= b
            if cls[a["side"]] == "血":
                credit(R, a["side"], "blood", b * cfg["y_bw"])
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
            fire(R, cfg, cls, a, acts, rnd, t)
        ko_check(R, cfg, cls, rnd)
    for a in acts:
        if not a["done"]:
            a["done"] = True
            fizzle(R, a)
    for u in R["U"]:
        if u["down"] != -1:
            continue
        b = u["st"].get("灼烧")
        if b:
            d = dmg_to(R, b[2], u, b[0], cls)
            if b[2] != u["side"]:
                if cls[b[2]] == "续" and cfg["x_payoff"]:
                    credit(R, b[2], "cont", d)
                if cls[b[2]] == "择":
                    credit(R, b[2], "pick", d)
    ko_check(R, cfg, cls, rnd)
    # 并流：多段句子里兑现的段数
    for a in acts_in:
        s = a["side"]
        if cls[s] == "并" and len(a["cl"]) >= 2:
            landed = [ci for ci in range(len(a["cl"])) if (a["ord"], ci) in R["eff"]]
            if cfg["b_mode"] == "kinds":
                kinds = {a["cl"][ci]["k"] if a["cl"][ci]["k"] != "st" else a["cl"][ci]["st"] for ci in landed}
                n = len(kinds)
            else:
                n = len(landed)
            R["M"][s]["chain"] += n + (cfg["b_bonus"] if len(landed) == len(a["cl"]) else 0)


# ---------------------------------------------------------------- 电脑
def stat_value(R, s):
    v = 0.0
    for u in R["U"]:
        if u["down"] != -1:
            continue
        for nm, e in u["st"].items():
            if e[2] == s:
                v += e[0]
    return v


def cont_value(R, s, G):
    """还没放完的续，将来大概值多少（换成完成度的百分点）"""
    cfg = G["cfg"]
    v = 0.0
    for c in R["conts"]:
        if c["side"] != s:
            continue
        cl = c["cl"]
        per = cl.get("n", 1) * cl.get("count", len(cl.get("tg") or [1])) * cl.get("rep", 1)
        v += per * c["left"]
    return v * cfg["cont_look"]


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
    cv0 = cont_value(R, s, G)
    cv1 = cont_value(R, 1 - s, G)
    u += cv0 * (100.0 / cfg["target"][c0] if c0 == "续" else 0.5) - cv1 * (100.0 / cfg["target"][c1] if c1 == "续" else 0.5)
    kp = cfg["ko_pct"] * 100.0 * cfg["ko_look"]
    if kp > 0:
        for x in R["U"]:
            if x["down"] == -1:
                frac = 1.0 - x["hp"] / float(x["mx"])
                # 残血的随从下一轮很容易被收掉：额外算一份风险
                danger = max(0.0, (cfg["danger_hp"] - x["hp"]) / float(cfg["danger_hp"])) * cfg["danger_w"]
                u += kp * (frac + danger) if x["side"] != s else -kp * (frac + danger)
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
    need = Counter(v for v in values if v > 1)
    if not need:
        return []
    cards = G["sides"][s]["cards"]
    used = []
    for v, n in need.items():
        cand = [i for i in avail_idx if cards[i]["v"] == v and i not in used]
        cand.sort(key=lambda i: 0 if not cards[i]["once"] else 1)
        if len(cand) < n:
            return None
        used += cand[:n]
    return used


def clause_words(cl):
    k = cl["k"]
    if k == "st":
        return [cl["st"]]
    if k == "redirect":
        return ["转移"]
    if k == "delay":
        return ["延后"]
    if k == "remove":
        return ["移除"]
    return []


def clause_nums(cl):
    k = cl["k"]
    out = []
    if k in ("atk", "heal"):
        out += [cl["count"], cl["n"], cl["rep"]]
    elif k == "mit":
        out += [cl["count"], cl["n"]]
    elif k == "st":
        out += [cl["count"], cl["n"]]
    elif k == "redirect":
        out += [cl["count"]]
    elif k == "delay":
        out += [cl["n"]]
    if cl.get("cont", 1) > 1:
        out.append(cl["cont"])
    return [v for v in out if v > 1]


def act_cost(cls_list, cp):
    words = [w for cl in cls_list for w in clause_words(cl)]
    return 1 + sum(PRICE[w] for w in words) + (len(cls_list) - 1) * cp["and"], words


def act_windup(cls_list, words):
    return 1 + len(words) + (len(cls_list) - 1)


def is_def(cls_list):
    return all(c["k"] in ("mit", "redirect", "heal") for c in cls_list)


def make_act(G, s, uid, cl_list, res, cp, start=None):
    """把一句话补全成行动；不合法返回 None"""
    cfg = G["cfg"]
    if len(cl_list) > cp["clauses"]:
        return None
    cost, words = act_cost(cl_list, cp)
    need = Counter(words)
    for w, n in need.items():
        if res["words"][w] < n:
            return None
    blood = 0
    if cost > res["ap"]:
        if cp["blood"] <= 0:
            return None
        blood = cost - res["ap"]
        u = G["R"]["U"][uid]
        if blood > cp["blood"] or u["hp"] - blood < 1:
            return None
        if any(c["k"] == "heal" for c in cl_list):
            return None
    nconts = sum(1 for c in cl_list if c.get("cont", 1) > 1)
    if nconts:
        active = sum(1 for c in G["R"]["conts"] if c["side"] == s) + res["conts"]
        if active + nconts > cp["slots"]:
            return None
    nums = [v for cl in cl_list for v in clause_nums(cl)]
    avail_idx = usable_cards(G, s, res["cards"])
    cards = pick_cards(G, s, avail_idx, nums)
    if cards is None:
        return None
    ms = act_windup(cl_list, words)
    if ms > cfg["timeline"]:
        return None
    return {"side": s, "uid": uid, "start": ms if start is None else max(start, ms), "cl": cl_list, "cost": cost,
            "blood": blood, "cards": cards, "words": words, "def": is_def(cl_list), "ms": ms, "nums": nums}


def singles(G, s, uid, declared, res, cp):
    cfg = G["cfg"]
    R = G["R"]
    U = R["U"]
    cls = G["sides"][s]["cls"]
    late = cp["late"]
    E = sorted([u for u in U if u["side"] != s and u["down"] == -1], key=lambda u: u["hp"])
    F = [u for u in U if u["side"] == s and u["down"] == -1]
    avail_idx = usable_cards(G, s, res["cards"])
    vals = sorted({G["sides"][s]["cards"][i]["v"] for i in avail_idx}, reverse=True)
    opts = [1] + vals[:2]
    enemy_acts = [a for a in declared if a["side"] != s]
    thr = Counter()
    for a in enemy_acts:
        for cl in a["cl"]:
            if cl["k"] == "atk":
                if cl.get("late"):
                    for u in F:
                        thr[u["uid"]] += 1
                for t in (cl.get("tg") or []):
                    thr[t] += 1
    threat_order = [u["uid"] for u in sorted(F, key=lambda u: (-thr[u["uid"]], u["hp"]))]
    conts = [1]
    if cp["slots"] > 0:
        conts += [v for v in vals[:2] if v > 1]
    out = []

    def tsets(pool, n):
        ids = [u["uid"] for u in pool]
        if late:
            return [None]
        if not ids:
            return []
        if n >= len(ids):
            return [ids]
        if n == 1:
            return [[ids[0]], [ids[-1]]] + ([[ids[1]]] if len(ids) > 2 else [])
        return [ids[:2], [ids[0], ids[-1]]]

    def cl_of(k, side, tg, n, **kw):
        d = {"k": k, "side": side, "count": n, "tg": tg, "late": late and tg is None}
        d.update(kw)
        return d

    for n in opts:
        if n > len(E) or not E:
            continue
        for d in opts:
            reps = [1] + [v for v in vals[:1] if 1 < v <= cfg["rep_max"]]
            for r in reps:
                for tg in tsets(E, n):
                    for ct in conts:
                        out.append([cl_of("atk", "enemy", tg, n, n_=d, rep=r, cont=ct)])
    hurt = sorted([u for u in F if u["hp"] < u["mx"]], key=lambda u: u["hp"] - u["mx"])
    if hurt or cp["slots"] > 0:
        for n in opts:
            if n > len(F):
                continue
            for a in opts:
                tg = [u["uid"] for u in hurt][:n]
                tg = (tg + [u["uid"] for u in F if u["uid"] not in tg])[:n]
                for ct in conts:
                    if not hurt and ct == 1:
                        continue
                    out.append([cl_of("heal", "ally", None if late else tg, n, n_=a, rep=1, cont=ct)])
    if enemy_acts or cp["slots"] > 0:
        for n in opts:
            if n > len(F):
                continue
            for a in opts:
                for ct in conts:
                    out.append([cl_of("mit", "ally", None if late else threat_order[:n], n, n_=a, cont=ct)])
    for nm in ENEMY_ST:
        if res["words"][nm] <= 0 or not E:
            continue
        for n in opts:
            if n > len(E):
                continue
            for d in opts:
                for tg in tsets(E, n):
                    out.append([cl_of("st", "enemy", tg, n, st=nm, n_=d)])
    if res["words"]["转移"] > 0 and enemy_acts:
        for n in opts:
            if n > len(F):
                continue
            out.append([cl_of("redirect", "ally", None if late else threat_order[:n], n)])
    if res["words"]["延后"] > 0:
        for a in enemy_acts:
            for sec in opts:
                out.append([{"k": "delay", "act": a["ord"], "n_": sec, "count": 1, "tg": [], "side": "enemy", "_start": 2}])
    if res["words"]["移除"] > 0:
        for u in E:
            if u["lis"] or u["mit"] or any(c["uid"] == u["uid"] for c in R["conts"]):
                out.append([{"k": "remove", "tg": [u["uid"]], "count": 1, "side": "enemy"}])
        for a in enemy_acts:
            for cl in a["cl"]:
                if cl["k"] in ("mit", "redirect") and cl.get("tg"):
                    out.append([{"k": "remove", "tg": [cl["tg"][0]], "count": 1, "side": "enemy", "_start": a["start"] + 1}])
    # 把 n_ 改成 n
    for cl_list in out:
        for c in cl_list:
            if "n_" in c:
                c["n"] = c.pop("n_")
    return out


def choose(G, s, declared, remaining, res):
    cfg = G["cfg"]
    cls2 = [G["sides"][0]["cls"], G["sides"][1]["cls"]]
    R0 = G["R"]
    cp = caps(G, s)
    base_R = clone_R(R0)
    resolve(base_R, declared, cfg, cls2, G["round"])
    u0 = util(base_R, s, G)
    cards = G["sides"][s]["cards"]
    enemy_starts = sorted({a["start"] for a in declared if a["side"] != s})

    def evaluate(act):
        act["ord"] = len(declared)
        R = clone_R(R0)
        resolve(R, declared + [act], cfg, cls2, G["round"])
        v = util(R, s, G) - 0.6 * act["cost"]
        for i in act["cards"]:
            v -= (0.5 if cards[i]["once"] else 0.25) * cards[i]["v"]
        return v + G["rng"].random() * 0.3

    best = None
    best_v = -1e9
    worst_uid = None
    worst_gain = 1e9
    for uid in remaining:
        local = []
        for cl_list in singles(G, s, uid, declared, res, cp):
            st0 = cl_list[0].pop("_start", None)
            a = make_act(G, s, uid, cl_list, res, cp, st0)
            if a is None:
                continue
            local.append((evaluate(a), a))
        # 拼多段：拿最好的几个单段两两三三连起来
        local.sort(key=lambda x: -x[0])
        if cp["clauses"] >= 2:
            top = []
            seen = set()
            kinds_seen = set()
            # 先每种效果各拿最好的一个（并流靠不同效果连起来），再按分数补满
            for v, a in local:
                c0 = a["cl"][0]
                kd = c0["k"] if c0["k"] != "st" else c0["st"]
                if kd in kinds_seen or len(top) >= cfg["combo_k"]:
                    continue
                kinds_seen.add(kd)
                seen.add(json.dumps(a["cl"], sort_keys=True, ensure_ascii=False))
                top.append(a)
            for v, a in local:
                if len(top) >= cfg["combo_k"]:
                    break
                key = json.dumps(a["cl"], sort_keys=True, ensure_ascii=False)
                if key in seen:
                    continue
                seen.add(key)
                top.append(a)
            import itertools
            for size in range(2, min(cp["clauses"], len(top)) + 1):
                for comb in itertools.combinations(top, size):
                    cl_list = [dict(c) for a in comb for c in a["cl"]]
                    a = make_act(G, s, uid, cl_list, res, cp)
                    if a is None:
                        continue
                    local.append((evaluate(a), a))
            # 一大串 1 点（并流的看家本领）
            E = [u for u in R0["U"] if u["side"] != s and u["down"] == -1]
            if E:
                Es = sorted(E, key=lambda u: u["hp"])
                for kk in range(2, cp["clauses"] + 1):
                    cl_list = [{"k": "atk", "side": "enemy", "count": 1, "tg": None if cp["late"] else [Es[j % len(Es)]["uid"]],
                                "late": cp["late"], "n": 1, "rep": 1} for j in range(kk)]
                    a = make_act(G, s, uid, cl_list, res, cp)
                    if a is not None:
                        local.append((evaluate(a), a))
        local.sort(key=lambda x: -x[0])
        # 起手秒数：前几名再试几个时间
        for v, a in local[:4]:
            if a["cl"][0]["k"] == "delay":
                continue
            for st in sorted({a["ms"] + 1} | {t for t in enemy_starts if t >= a["ms"]} | {t - 1 for t in enemy_starts if t - 1 >= a["ms"]}):
                if st > cfg["timeline"] or st == a["start"]:
                    continue
                b = dict(a, start=st)
                local.append((evaluate(b), b))
        lb = max((v for v, a in local), default=-1e9)
        for v, a in local:
            if v > best_v:
                best_v, best = v, a
        g = lb - u0
        if g < worst_gain:
            worst_gain, worst_uid = g, uid
    if best is None or best_v - u0 < cfg["pass_gain"]:
        return (worst_uid if worst_uid is not None else remaining[0]), None
    return best["uid"], best


def assign_late(G, s, declared):
    """择流：宣告全部结束后，电脑把自己每句“待定”的目标定下来（逐句试，模拟整轮挑最好的）"""
    cfg = G["cfg"]
    cls2 = [G["sides"][0]["cls"], G["sides"][1]["cls"]]
    U = G["R"]["U"]
    import itertools
    order = sorted([a for a in declared if a["side"] == s], key=lambda a: (a["start"], 0 if a["def"] else 1, a["ord"]))
    for a in order:
        for ci, cl in enumerate(a["cl"]):
            if not cl.get("late"):
                continue
            pool = [u["uid"] for u in U if u["down"] == -1 and ((u["side"] != s) == (cl["side"] == "enemy"))]
            n = min(cl["count"], len(pool))
            best, bv = None, -1e9
            for comb in itertools.combinations(pool, n):
                cl["tg"] = list(comb)
                R = clone_R(G["R"])
                resolve(R, declared, cfg, cls2, G["round"])
                v = util(R, s, G)
                if v > bv:
                    bv, best = v, list(comb)
            cl["tg"] = best


# ---------------------------------------------------------------- 一局
def begin_round(G):
    cfg = G["cfg"]
    G["round"] += 1
    r = G["round"]
    for u in G["R"]["U"]:
        u["mit"] = 0
        u["mitc"] = 0
        u["msrc"] = []
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
        if r in cfg["floor_d"]:
            sd["cards"].append({"v": cfg["floor_d"][r], "once": False, "last": -9})


def play_round(G):
    cfg = G["cfg"]
    begin_round(G)
    r = G["round"]
    cls2 = [G["sides"][0]["cls"], G["sides"][1]["cls"]]
    first = (G["first0"] + r - 1) % 2
    remaining = {s: [u["uid"] for u in G["R"]["U"] if u["side"] == s and u["down"] == -1] for s in range(2)}
    res = {}
    for s in range(2):
        sd = G["sides"][s]
        words = Counter()
        for w, n in sd["deck"].items():
            words[w] = n - sd["prev"][w]
        res[s] = {"ap": sd["ap"], "words": words, "cards": set(), "conts": 0}
    declared = []
    turn = first
    while remaining[0] or remaining[1]:
        s = turn if remaining[turn] else 1 - turn
        uid, act = choose(G, s, declared, remaining[s], res[s])
        remaining[s].remove(uid)
        if act is not None:
            act["ord"] = len(declared)
            declared.append(act)
            res[s]["ap"] -= min(act["cost"], res[s]["ap"])
            for w in act["words"]:
                res[s]["words"][w] -= 1
            for i in act["cards"]:
                res[s]["cards"].add(i)
            res[s]["conts"] += sum(1 for c in act["cl"] if c.get("cont", 1) > 1)
        turn = 1 - s
    for s in range(2):
        if G["sides"][s]["cls"] == "择" and cfg["smart_late"]:
            assign_late(G, s, declared)
    G["_decl"] = declared
    R = G["R"]
    R["kos"] = [0, 0]
    R["lost"] = [0, 0]
    R["fz"] = [0, 0]
    R["maxhit"] = 0
    R["eff"] = set()
    R["retarget"] = [0, 0]
    resolve(R, declared, cfg, cls2, r)
    st = G["stat"]
    for s in range(2):
        if R["retarget"][s]:
            st["talent"][s]["择换人"] += R["retarget"][s]
        nl = sum(1 for a in declared if a["side"] == s for c in a["cl"] if c.get("late"))
        if nl:
            st["talent"][s]["待定段"] += nl
    st["maxhit"] = max(st["maxhit"], R["maxhit"])
    st["kos"] += R["kos"][0] + R["kos"][1]
    st["fz"] += R["fz"][0] + R["fz"][1]
    for a in declared:
        s = a["side"]
        sd = G["sides"][s]
        sd["ap"] -= min(a["cost"], sd["ap"])
        for w in a["words"]:
            sd["used"][w] += 1
            st["words"][s][w] += 1
        for i in a["cards"]:
            c = sd["cards"][i]
            if c["once"]:
                c["gone"] = True
            else:
                c["last"] = r
        st["acts"] += 1
        st["clauses"][s][len(a["cl"])] += 1
        if a.get("blood"):
            st["talent"][s]["血付"] += a["blood"]
            st["talent"][s]["血句"] += 1
        if any(c.get("cont", 1) > 1 for c in a["cl"]):
            st["talent"][s]["续句"] += 1
        if len(a["cl"]) > 3:
            st["talent"][s]["超长句"] += 1
        for c in a["cl"]:
            st["kinds"][c["k"] if c["k"] != "st" else c["st"]] += 1
    for s in range(2):
        G["sides"][s]["cards"] = [c for c in G["sides"][s]["cards"] if not c.get("gone")]
    for s in range(2):
        sd = G["sides"][s]
        lost = R["lost"][s] + (sum(a.get("blood", 0) for a in declared if a["side"] == s) if cfg["y_dice"] else 0)
        if lost >= cfg["dice_hp"] or R["kos"][s] > 0:
            for _ in range(cfg["dice_count"]):
                v = G["rng"].randint(1, 6)
                if v > 1:
                    sd["cards"].append({"v": v, "once": True, "last": -9})
        p = prog(R, s, sd["cls"], cfg)
        for i, thr in enumerate(cfg["lad"]):
            if p >= thr and i not in sd["lad"]:
                sd["lad"].add(i)
                for _ in range(cfg["ladder_copies"]):
                    sd["cards"].append({"v": cfg["ladv"][i], "once": False, "last": -9})
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
            "talent": [dict(x) for x in st["talent"]], "clauses": [dict(x) for x in st["clauses"]],
            "words": [dict(x) for x in st["words"]], "comeback": comeback, "fz": st["fz"],
            "metric": [dict(G["R"]["M"][0]), dict(G["R"]["M"][1])], "kob": G["R"]["kob"][:]}


def _job(args):
    cfg, c0, c1, seed = args
    return play_game(cfg, c0, c1, seed)


def run(n, seed, over, procs=4):
    cfg = cfg_from(over)
    pairs = [(a, b) for a in CLASSES for b in CLASSES if a != b]
    jobs = []
    for i in range(n):
        c0, c1 = pairs[i % len(pairs)]
        jobs.append((cfg, c0, c1, seed * 100000 + i))
    t0 = time.time()
    with Pool(procs) as p:
        res = p.map(_job, jobs, chunksize=1)
    return cfg, res, time.time() - t0


def report(cfg, res, secs):
    n = len(res)
    L = []
    rounds = sum(r["rounds"] for r in res) / n
    capped = sum(1 for r in res if r["capped"])
    first_w = sum(1 for r in res if r["winner"] == r["first0"])
    decided = sum(1 for r in res if r["winner"] >= 0)
    L.append("局数 %d（%.0f 秒）：平均 %.1f 轮，打满 12 轮 %d 局（%.0f%%），平局 %d" % (n, secs, rounds, capped, 100.0 * capped / n, n - decided))
    L.append("首轮先宣告方胜 %.0f%%" % (100.0 * first_w / max(1, decided)))
    wins, games = Counter(), Counter()
    mat = defaultdict(lambda: [0, 0])
    for r in res:
        a, b = r["cls"]
        games[a] += 1
        games[b] += 1
        if r["winner"] >= 0:
            w = r["cls"][r["winner"]]
            l = r["cls"][1 - r["winner"]]
            wins[w] += 1
            mat[(w, l)][0] += 1
    L.append("职业胜率：" + "  ".join("%s %.0f%%" % (c, 100.0 * wins[c] / max(1, games[c])) for c in CLASSES))
    pr = []
    for i, a in enumerate(CLASSES):
        for b in CLASSES[i + 1:]:
            wa, wb = mat[(a, b)][0], mat[(b, a)][0]
            pr.append("%s%d:%d%s" % (a, wa, wb, b))
    L.append("对局：" + " ".join(pr))
    rl = defaultdict(list)
    for r in res:
        rl[tuple(sorted(r["cls"]))].append(r["rounds"])
    L.append("对局平均轮数：" + " ".join("%s%s %.1f" % (k[0], k[1], sum(v) / len(v)) for k, v in sorted(rl.items())))
    rate = defaultdict(list)
    kob = defaultdict(list)
    for r in res:
        for s in range(2):
            c = r["cls"][s]
            rate[c].append(r["metric"][s][METRIC[c]] / float(r["rounds"]))
            kob[c].append(r["kob"][s])
    L.append("每轮职业分（目标 %s）：" % "/".join(str(cfg["target"][c]) for c in CLASSES) +
             "  ".join("%s %.1f" % (c, sum(rate[c]) / len(rate[c])) for c in CLASSES) +
             "；击倒分占比 " + " ".join("%s %.0f%%" % (c, 100 * sum(kob[c]) / len(kob[c])) for c in CLASSES))
    mh = sorted(r["maxhit"] for r in res)
    L.append("每局击倒 %.1f；一句最大伤害 中位 %d / 最大 %d；每局落空 %.1f" % (sum(r["kos"] for r in res) / n, mh[n // 2], mh[-1], sum(r["fz"] for r in res) / n))
    tal = defaultdict(Counter)
    cl = defaultdict(Counter)
    wd = defaultdict(Counter)
    sidegames = Counter()
    for r in res:
        for s in range(2):
            c = r["cls"][s]
            sidegames[c] += 1
            for k, v in r["talent"][s].items():
                tal[c][k] += v
            for k, v in r["clauses"][s].items():
                cl[c][int(k)] += v
            for k, v in r["words"][s].items():
                wd[c][k] += v
    for c in CLASSES:
        g = float(sidegames[c])
        tot = sum(cl[c].values())
        L.append("  %s：每局 %.1f 句；段数分布 %s；天赋 %s；进阶词/局 %s" % (
            c, tot / g, " ".join("%d段%.0f%%" % (k, 100.0 * v / max(1, tot)) for k, v in sorted(cl[c].items())),
            " ".join("%s %.1f" % (k, v / g) for k, v in tal[c].items()),
            " ".join("%s%.1f" % (k, v / g) for k, v in wd[c].most_common())))
    kinds = Counter()
    for r in res:
        kinds.update(r["kinds"])
    tot = sum(kinds.values())
    L.append("段落种类：" + " ".join("%s %.0f%%" % (k, 100.0 * v / tot) for k, v in kinds.most_common()))
    cb = sum(1 for r in res if r["comeback"])
    L.append("翻盘 %.0f%%" % (100.0 * cb / max(1, decided)))
    return "\n".join(L)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 48
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    over = {}
    for a in sys.argv[3:]:
        k, v = a.split("=", 1)
        over[k] = v
    cfg, res, secs = run(n, seed, over)
    print("参数：", json.dumps(over, ensure_ascii=False))
    print(report(cfg, res, secs))

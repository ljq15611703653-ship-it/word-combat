# -*- coding: utf-8 -*-
# 长难句训练营（冒险模式）的关卡写法：用很短的 Python 把一个场面写出来，再生成 data/bootcamp.json。
# 牌的写法：用空格隔开的字符串。词 = 词名；数字 = 阿拉伯数字；"~低于" = 连接牌。
import json, os, sys
LEVELS = []

def toks(s):
    out = []
    for t in s.split():
        if t.isdigit():
            out.append(int(t))
        else:
            out.append(t)
    return out

def M(name, glyph, hp, kw="", hp_now=None, statuses=None, skill=None):
    d = {"name": name, "glyph": glyph, "hp": hp}
    if kw: d["kw"] = kw
    if hp_now is not None: d["hp_now"] = hp_now
    if statuses: d["statuses"] = statuses
    if skill: d["skill"] = toks(skill)
    return d

def F(name, hp, kw="", glyph="盾", hp_now=None, statuses=None, act=None):
    d = {"name": name, "glyph": glyph, "hp": hp}
    if kw: d["kw"] = kw
    if hp_now is not None: d["hp_now"] = hp_now
    if statuses: d["statuses"] = statuses
    if act: d["act"] = act
    return d

def A(sentence, start, target=0, name="敌招", branch=0):
    return {"tokens": toks(sentence), "start": start, "target": target, "name": name, "branch": branch}

def st(name, value=0):
    return {"name": name, "value": value}

def lvl(id, ch, title, story, why, me, foe, goal, sol, extra="", ap=40, requires=None, tray_extra=None, steps=None):
    solt = toks(sol)
    tray = {}
    for t in solt:
        if isinstance(t, str) and not t.startswith("~"):
            tray[t] = tray.get(t, 0) + 1
    for t in toks(extra):
        if isinstance(t, str):
            tray[t] = tray.get(t, 0) + 1
    LEVELS.append({"id": id, "chapter": ch, "title": title, "story": story, "why": why, "ap": ap,
                   "me": me, "foe": foe, "goal": goal, "tray": tray, "sol": solt, "requires": requires or [], "steps": steps or []})

def kill(*who): return {"t": "kill", "who": list(who)}
def kill_all(): return {"t": "kill_all"}
def alive(*who): return {"t": "alive", "who": list(who)}
def hp_ge(who, n): return {"t": "hp_ge", "who": who, "n": n}
def foe_hp_le(who, n): return {"t": "foe_hp_le", "who": who, "n": n}
def foe_hp_ge(who, n): return {"t": "foe_hp_ge", "who": who, "n": n}
def all_alive(): return {"t": "all_alive"}
def score_ge(n): return {"t": "score_ge", "n": n}
def team_hp_ge(n): return {"t": "my_hp_total_ge", "n": n}

CH = {1: "第一章 · 一句话", 2: "第二章 · 连招", 3: "第三章 · 条件与循环", 4: "第四章 · 埋伏", 5: "第五章 · 控场", 6: "第六章 · 嵌套", 7: "第七章 · 终局"}

def write(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"chapters": CH, "levels": LEVELS}, f, ensure_ascii=False, indent=1)
    print("写入", len(LEVELS), "关 →", path)

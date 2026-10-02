# -*- coding: utf-8 -*-
import sys, random
import nc_sim as S
cfg = S.cfg_from(dict(a.split("=",1) for a in sys.argv[4:]))
c0, c1, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
rng = random.Random(seed)
G = S.new_game(cfg, c0, c1, rng)
orig = S.play_round
def show_round(G):
    # 复制 play_round 的宣告部分，打印出来
    S.play_round(G)
    R = G["R"]
    print("第%d轮 完成度 %s  生命 %s  行动点 %s  数字牌 %s" % (G["round"],
        ["%.0f%%" % (100*S.prog(R, s, G["sides"][s]["cls"], cfg)) for s in range(2)],
        [[u["hp"] if u["down"] == -1 else "倒" for u in R["U"] if u["side"] == s] for s in range(2)],
        [G["sides"][s]["ap"] for s in range(2)],
        [[c["v"] for c in G["sides"][s]["cards"]] for s in range(2)]))
_choose = S.choose
def choose_log(G, s, declared, remaining, res):
    uid, act = _choose(G, s, declared, remaining, res)
    if act is None:
        print("   方%d 随从%d 不出手" % (s, uid))
    else:
        print("   方%d 随从%d 第%d秒 %s  花%d 牌%s" % (s, uid, act["start"], [(c["k"], c.get("st",""), c.get("tg"), c.get("n"), c.get("rep",""), c.get("cap","")) for c in act["cl"]], act["cost"], act["cv"]))
    return uid, act
S.choose = choose_log
print("职业", c0, c1, "先宣告", G["first0"])
while G["round"] < cfg["max_rounds"]:
    show_round(G)
    p = [S.prog(G["R"], s, G["sides"][s]["cls"], cfg) for s in range(2)]
    if max(p) >= 1: break

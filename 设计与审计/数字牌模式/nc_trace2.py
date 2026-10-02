# -*- coding: utf-8 -*-
"""打印一局的过程：python nc_trace2.py 甲 乙 种子 [键=值]"""
import sys
import nc_sim2 as S

def cl_txt(cl, U):
    k = cl["k"]
    tg = "待定" if cl.get("late") and not cl.get("tg") else ",".join(str(x) for x in (cl.get("tg") or []))
    if cl.get("late") and cl.get("tg"):
        tg = "择" + tg
    c = "×续%d" % cl["cont"] if cl.get("cont", 1) > 1 else ""
    if k == "atk": return "打[%s]%d×%d%s" % (tg, cl["n"], cl["rep"], c)
    if k == "heal": return "奶[%s]%d%s" % (tg, cl["n"], c)
    if k == "mit": return "减伤[%s]%d%s" % (tg, cl["n"], c)
    if k == "st": return "%s[%s]%d轮" % (cl["st"], tg, cl["n"])
    if k == "redirect": return "转移[%s]" % tg
    if k == "delay": return "延后#%d %d秒" % (cl["act"], cl["n"])
    if k == "remove": return "移除[%s]" % tg
    return k

if __name__ == "__main__":
    a, b, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
    over = dict(x.split("=", 1) for x in sys.argv[4:])
    cfg = S.cfg_from(over)
    import random
    G = S.new_game(cfg, a, b, random.Random(seed))
    orig = S.resolve
    def res2(R, acts, cfg_, cls, rnd):
        orig(R, acts, cfg_, cls, rnd)
    while G["round"] < cfg["max_rounds"]:
        # 包一层：记录宣告
        decl = []
        oc = S.choose
        def ch(G_, s, d, rem, res):
            uid, act = oc(G_, s, d, rem, res)
            return uid, act
        S.play_round(G)
        R = G["R"]
        p = [S.prog(R, s, G["sides"][s]["cls"], cfg) for s in range(2)]
        hp = " ".join("%d:%s" % (u["uid"], "倒" if u["down"] != -1 else u["hp"]) for u in R["U"])
        print("第%d轮 完成度 %s %.0f%% / %s %.0f%%  血 %s  续%d  ap %d/%d" % (G["round"], a, 100 * p[0], b, 100 * p[1], hp, len(R["conts"]),
              G["sides"][0]["ap"], G["sides"][1]["ap"]))
        for x in G.get("_decl", []):
            print("    %s 随从%d 第%d秒%s：%s" % ("甲" if x["side"] == 0 else "乙", x["uid"], x["start"], (" 血%d" % x["blood"]) if x.get("blood") else "", " 并 ".join(cl_txt(c, R["U"]) for c in x["cl"])))
        if p[0] >= 1 or p[1] >= 1:
            break

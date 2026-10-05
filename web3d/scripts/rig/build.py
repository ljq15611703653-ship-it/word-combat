"""半自动装配: 紧凑映射 maps2/<id>.json  ->  pack 所需完整 spec  ->  rig.json/atlas.png。
用法: python build.py <id> [<id> ...]      (之后 python preview.py <id> 看静止组装对比)

紧凑映射格式 (坐标全是 idle_raw / 1254 设计坐标, 部件的 comps/clip 是 parts.png 源图坐标):
{
 "J": {                       # 关节覆盖 (缺省取 DEF_J, 取自叶栖)
   "neck":[x,y],              # 头与躯干接口 (头的枢轴落在这里)
   "torso":[x,y],             # 躯干部件顶部中心
   "waist":[x,y],             # 躯干/髋骨骼旋转中心
   "sh_f","el_f","wr_f","hd_f"  # 远侧手臂 肩/肘/腕/手尖 (hd 决定手的缩放参考)
   "sh_n","el_n","wr_n","hd_n", "hp_f","kn_f","an_f","hp_n","kn_n","an_n"
 },
 "head":  {"c":[1], "ps":1.1, "pivot":[sx,sy]|"bot"},
 "hair_back": {"c":[2], "at":[x,y], "ps":1.0},        # at = 部件中心的世界落点
 "torso": {"c":[21], "ps":0.8, "erase":[...]},
 "arm_far":  [ {"c":[24],"clip":[..],"tuck":20,"erase":[..]}, {"c":[30]} , {"c":[..]} ],  # 上臂, 前臂, (手)
 "arm_near": [...], "leg_far": [...], "leg_near": [...],   # 上腿, 小腿, 脚
 "extras": [ {"n":"skirtL","c":[26],"bone":"skirt","at":[x,y],"ps":0.8,"pivot":"top","z":"front","rot":0,"glow":1} ],
 "order": [...]  (可选: 覆盖绘制顺序)
 "view":[x,0,w,1254]
}
z 取值: back(最底) | hair(头后) | mid(躯干后, 腿前) | front(躯干前, 头前) | top(最上)"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
import pack

HERE = os.path.dirname(__file__)
DEF_J = dict(root=[610, 800], waist=[610, 730], neck=[640, 478], torso=[640, 478], hair=[560, 330],
             sh_f=[445, 545], el_f=[385, 700], wr_f=[392, 790], hd_f=[400, 885],
             sh_n=[755, 570], el_n=[825, 700], wr_n=[822, 790], hd_n=[825, 885],
             hp_f=[560, 730], kn_f=[505, 950], an_f=[470, 1085], hp_n=[700, 730], kn_n=[730, 950], an_n=[780, 1080], so_f=[470, 1212], so_n=[790, 1210])
EXTRA_BONES = dict(cape=("torso", "waist"), skirt=("hip", "waist"), strap=("hip", "waist"), tail=("head", "neck"), holo=("root", [900, 700]), drone=("root", [300, 400]))

def build(name):
    m = json.load(open(f"{HERE}/maps2/{name}.json", encoding="utf-8-sig"))
    if m.get("parts2"): os.environ["PARTS2"] = "1"
    J = {**DEF_J, **m.get("J", {})}
    bones = {
        "root": dict(at=J["root"]), "hip": dict(parent="root", at=J["waist"]),
        "torso": dict(parent="hip", at=J["waist"]), "neck": dict(parent="torso", at=J["neck"]),
        "head": dict(parent="neck", at=J["neck"]), "hair": dict(parent="head", at=J["hair"]),
    }
    for k, (par, at) in EXTRA_BONES.items():
        bones[k] = dict(parent=par, at=list(J[at] if isinstance(at, str) else at))
    for k, v in (m.get("bones") or {}).items(): bones[k] = v
    parts = {}; z = {k: [] for k in ("back", "hair", "armf", "legf", "legn", "mid", "front", "armn", "top")}
    def add(pn, pd): parts[pn] = pd

    # 头 / 后发 / 躯干
    h = m["head"]; add("head", dict(comps=h["c"], bone="head", pivot=h.get("pivot", "bot"), ps=h.get("ps", 1.1), erase=h.get("erase", []), clip=h["clip"]) if "clip" in h else dict(comps=h["c"], bone="head", pivot=h.get("pivot", "bot"), ps=h.get("ps", 1.1), erase=h.get("erase", [])))
    if "off" in h: parts["head"]["off"] = h["off"]
    if "hair_back" in m:
        hb = m["hair_back"]; add("hair_back", dict(comps=hb["c"], bone="hair", pivot="mid", ps=hb.get("ps", 1.0), off=[hb["at"][0] - bones["hair"]["at"][0], hb["at"][1] - bones["hair"]["at"][1]], erase=hb.get("erase", [])))
    t = m["torso"]; add("torso", dict(comps=t["c"], bone="torso", pivot="top", ps=t.get("ps", 0.8), off=[J["torso"][0] - bones["torso"]["at"][0], J["torso"][1] - bones["torso"]["at"][1]], erase=list(t.get("erase", [])) + ([{"peg": "both"}] if m.get("peg") else [])))
    if "pivot" in t: parts["torso"]["pivot"] = t["pivot"]

    def chain(key, side, bs, js, hand=True):
        segs = m.get(key, [])
        names = ["up", "fore", "hand"] if key.startswith("arm") else ["up", "lo", "foot"]
        pts = [J[f"{j}_{side}"] for j in js]  # 3 个关节 + 末端点
        prev_ps = None
        out = []
        for i, s in enumerate(segs):
            pn = f"{key}_{names[i]}"
            pd = dict(comps=s["c"], bone=bs[i], pivot=s.get("pivot", "top"), erase=s.get("erase", []))
            if "clip" in s: pd["clip"] = s["clip"]
            if m.get("peg"): pd["erase"] = list(pd["erase"]) + [{"peg": "both" if i < len(segs) - 1 else "top", "v": m.get("pegv", [35, 215])}]
            if i < 2:
                e_ = pts[3] if s.get("end") else pts[i + 1]; a = [e_[0] - pts[i][0], e_[1] - pts[i][1]]
                pd["aim"] = a; pd["child"] = bs[i + 1]; pd["tuck"] = s.get("tuck", 36 if i == 0 else 30)
            else:
                pd["ps"] = s.get("ps", 0.8)
            if "ps" in s: pd["ps"] = s["ps"]
            if "rot" in s: pd["rot"] = s["rot"]
            if "hem" in s: pd["hem"] = s["hem"]
            sw_ = s.get("sw", (m.get("sw") or {}).get("arm" if key.startswith("arm") else "leg"))
            if sw_: pd["sw"] = sw_
            if "off" in s: pd["off"] = s["off"]
            add(pn, pd); out.append(pn)
        return out
    af = chain("arm_far", "f", ["sh_far", "el_far", "wr_far"], ["sh", "el", "wr", "hd"])
    an = chain("arm_near", "n", ["sh_near", "el_near", "wr_near"], ["sh", "el", "wr", "hd"])
    lf = chain("leg_far", "f", ["hp_far", "kn_far", "an_far"], ["hp", "kn", "an", "so"])
    ln = chain("leg_near", "n", ["hp_near", "kn_near", "an_near"], ["hp", "kn", "an", "so"])
    for side, par, js in (("far", "sh_far", None), ("near", "sh_near", None)):
        pass
    sk = "f"
    for nm, par, at in (("sh_far", "torso", J["sh_f"]), ("el_far", "sh_far", J["el_f"]), ("wr_far", "el_far", J["wr_f"]),
                        ("sh_near", "torso", J["sh_n"]), ("el_near", "sh_near", J["el_n"]), ("wr_near", "el_near", J["wr_n"]),
                        ("hp_far", "hip", J["hp_f"]), ("kn_far", "hp_far", J["kn_f"]), ("an_far", "kn_far", J["an_f"]),
                        ("hp_near", "hip", J["hp_n"]), ("kn_near", "hp_near", J["kn_n"]), ("an_near", "kn_near", J["an_n"])):
        bones[nm] = dict(parent=par, at=list(at))
    for e in m.get("extras", []):
        b = e.get("bone", "cape"); assert b in bones, (name, b)
        pd = dict(comps=e["c"], bone=b, pivot=e.get("pivot", "top"), ps=e.get("ps", 0.8), erase=e.get("erase", []),
                  off=([e["at"][0] - bones[b]["at"][0], e["at"][1] - bones[b]["at"][1]] if "at" in e else list(e.get("off", [0, 0]))))
        if e.get("peg"): pd["erase"] = list(pd["erase"]) + [{"peg": "both"}]
        for k in ("rot", "glow", "clip", "alpha", "sw"):
            if k in e: pd[k] = e[k]
        if "pivot_src" in e: pd["pivot"] = e["pivot_src"]
        add(e["n"], pd); z[e.get("z", "front")].append(e["n"])
    order = list(z["back"]) + (["hair_back"] if "hair_back" in parts else []) + list(z["hair"])
    order += list(reversed(af)) + list(z["armf"]) + list(reversed(lf)) + list(z["legf"]) + list(reversed(ln)) + list(z["legn"]) + list(z["mid"])
    order += ["torso"] + list(z["front"]) + ["head"] + list(reversed(an)) + list(z["armn"]) + list(z["top"])
    if m.get("armf_front"):
        order = [o for o in order if o not in af]; i = order.index("head"); order[i:i] = list(reversed(af))
    if m.get("armn_back"):
        order = [o for o in order if o not in an]; i = order.index("torso"); order[i:i] = list(reversed(an))
    if "order" in m: order = m["order"]
    order = [o for o in order if o in parts]
    spec = dict(grow=m.get("grow", 1), mina=m.get("mina", 300), ps=1.0, ref=f"D:/wc/art/q/cls/{name}/idle_raw.png",
                view=m.get("view", [195, 0, 780, 1254]), style=m.get("style", name.split("_")[-1]), bones=bones, order=order, parts=parts, gain=m.get("gain"))
    return spec

if __name__ == "__main__":
    for n in sys.argv[1:]:
        spec = build(n)
        json.dump(spec, open(f"D:/wc/art/rig2/_debug/{n}_spec.json", "w"), indent=1, ensure_ascii=False)
        pack.main(n, spec)

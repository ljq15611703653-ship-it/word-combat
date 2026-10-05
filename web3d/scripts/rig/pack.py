"""按 maps/<角色>.json 把连通域切成部件, 输出 透明 PNG(rig/parts) + atlas.png/atlas.json + rig.json。
maps 格式见 maps/ye_qi.json。
  comps: [id | "r:x0,y0,x1,y1"]  连通域序号(GROW 标注图上的编号) 或 矩形(选中心落在矩形内的所有小连通域)
  erase: [[x0,y0,x1,y1],...]    部件内抹掉的矩形(源图坐标; 用于去掉被相邻部件盖住的灰色接口)
  pivot: [x,y] | "top" | "bot"  源图坐标, 或自动(顶/底端 12 行的质心)
  bone/z/rot/off/ps            绑定骨骼 / 绘制序 / 额外旋转 / 额外偏移(设计坐标) / 缩放覆盖
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from cut import load

OUT = "D:/wc/wt_polish2/web3d/public/duanju/art"
HERE = os.path.dirname(__file__)

def label(alpha, grow, mina):
    m = ndi.binary_opening(alpha > 0.5, iterations=1)
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=grow))
    lab = lab * m
    # 与 cut.py 同序编号: 过滤小面积后保留原编号
    keep = {}
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) >= 1: keep[i] = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, len(ys))
    return lab, keep

def end_pt(mask, which, band=12):
    ys, xs = np.nonzero(mask)
    y0, y1 = ys.min(), ys.max()
    sel = (ys < y0 + band) if which == "top" else (ys > y1 - band)
    cx = xs[sel].mean(); cy = (y0 + band * 0.8) if which == "top" else (y1 - band * 0.8)
    return [float(cx), float(cy)]

def main(name, spec=None):
    spec = spec or json.load(open(f"{HERE}/maps/{name}.json", encoding="utf-8-sig"))
    rgb, alpha = load(name)
    lab, keep = label(alpha, spec.get("grow", 1), spec.get("mina", 300))
    parts = {}; imgs = {}
    for pn, pd in spec["parts"].items():
        mask = np.zeros(alpha.shape, bool)
        for c in pd["comps"]:
            if isinstance(c, str) and c.startswith("r:"):
                x0, y0, x1, y1 = map(int, c[2:].split(","))
                for i, (a, b, cc, d, ar) in keep.items():
                    cx, cy = (a + cc) / 2, (b + d) / 2
                    if x0 <= cx <= x1 and y0 <= cy <= y1: mask |= lab == i
            else:
                mask |= lab == int(c)
        if "clip" in pd:  # 同一连通域内按矩形再切 (例如 Lu 的腿由球关节连成一体)
            cx0, cy0, cx1, cy1 = pd["clip"]; cm = np.zeros_like(mask); cm[cy0:cy1, cx0:cx1] = True; mask &= cm
        # 软边: 取 mask 膨胀 2px 范围内的原始 alpha (保留抗锯齿边)
        grown = ndi.binary_dilation(mask, iterations=2)
        a = np.where(grown, alpha, 0.0)
        # 但不能吃到邻接部件: 只保留与 mask 距离内、且不属于其它标签的像素
        other = (lab > 0) & ~mask
        a = np.where(other, 0.0, a)
        for e in pd.get("erase", []):
            if isinstance(e, dict) and "peg" in e:  # {"peg":"top|bot|both","h":40}: 端部圆形灰色关节球(小而圆的低饱和连通块)整块抹掉
                yy, xx = np.nonzero(mask); h_ = e.get("h", 44); lo, hi = e.get("v", [35, 215])
                for side in (["top", "bot"] if e["peg"] == "both" else [e["peg"]]):
                    y0 = int(yy.min()) if side == "top" else int(yy.max()) + 1 - h_; y1 = y0 + h_
                    x0, x1 = int(xx.min()), int(xx.max()) + 1
                    sub = rgb[y0:y1, x0:x1].astype(int); mx = sub.max(2); mn = sub.min(2)
                    gm = (a[y0:y1, x0:x1] > 0.3) & ((mx - mn) < 0.3 * np.maximum(mx, 1)) & (mx >= lo) & (mx <= hi)
                    gm = ndi.binary_opening(gm, iterations=2)
                    lb, nb = ndi.label(gm)
                    for k, sl in enumerate(ndi.find_objects(lb), 1):
                        ww = sl[1].stop - sl[1].start; hh = sl[0].stop - sl[0].start; ar = int((lb[sl] == k).sum())
                        if 100 <= ar and ww <= e.get("maxw", 60) and hh <= e.get("maxw", 60) and ar / (ww * hh) >= 0.55:
                            hullm = ndi.binary_dilation(lb == k, iterations=3)
                            a[y0:y1, x0:x1][hullm] = 0; mask[y0:y1, x0:x1][hullm] = False
            elif isinstance(e, dict):  # {"g":[rect]}: 矩形内灰色(低饱和、中亮度)像素的凸包整块抹掉 (接口圆柱/环)
                if isinstance(e["g"], str):
                    yy, xx = np.nonzero(mask); h_ = e.get("h", 45)
                    x0, x1 = int(xx.min()), int(xx.max()) + 1
                    y0, y1 = (int(yy.max()) + 1 - h_, int(yy.max()) + 1) if e["g"] == "bot" else (int(yy.min()), int(yy.min()) + h_)
                else: x0, y0, x1, y1 = e["g"]
                lo, hi = e.get("v", [85, 215])
                sub = rgb[y0:y1, x0:x1].astype(int); mx = sub.max(2); mn = sub.min(2)
                gray = (a[y0:y1, x0:x1] > 0.3) & ((mx - mn) < 0.2 * np.maximum(mx, 1)) & (mx >= lo) & (mx <= hi)
                gray = ndi.binary_opening(gray, iterations=1)
                ys_, xs_ = np.nonzero(gray)
                if len(ys_) > 10:
                    from scipy.spatial import ConvexHull
                    from PIL import ImageDraw
                    pts = np.stack([xs_, ys_], 1); h = ConvexHull(pts)
                    im_ = Image.new("L", (x1 - x0, y1 - y0), 0); ImageDraw.Draw(im_).polygon([tuple(pts[i]) for i in h.vertices], fill=255)
                    hull = ndi.binary_dilation(np.array(im_) > 0, iterations=e.get("grow", 2))
                    a[y0:y1, x0:x1][hull] = 0; mask[y0:y1, x0:x1][hull] = False
            else:
                x0, y0, x1, y1 = e; a[y0:y1, x0:x1] = 0; mask[y0:y1, x0:x1] = False
        ys, xs = np.nonzero(a > 0.02)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
        imgs[pn] = Image.fromarray(rgba, "RGBA")
        pv = pd.get("pivot", "mid")
        if pv in ("top", "bot"): pv = end_pt(mask, pv)
        elif pv == "mid": pv = [(x0 + x1) / 2, (y0 + y1) / 2]
        yy, xx = np.nonzero(mask); yb = yy.max(); sel = yy > yb - 6
        hem = [float(xx[sel].mean()), float(yb)]
        if "hem" in pd: hem = [float(pd["hem"][0]), float(pd["hem"][1])]
        parts[pn] = dict(hem=hem, src=[int(x0), int(y0), int(x1 - x0), int(y1 - y0)], pivot=[round(pv[0] - x0, 1), round(pv[1] - y0, 1)])
    # 打图集(货架式)
    names = sorted(imgs, key=lambda n: -imgs[n].height)
    W = 1024; x = y = rowh = 0; pos = {}
    for n in names:
        w, h = imgs[n].size
        if x + w + 2 > W: x = 0; y += rowh + 2; rowh = 0
        pos[n] = (x, y); x += w + 2; rowh = max(rowh, h)
    H = y + rowh + 2
    atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for n in names: atlas.alpha_composite(imgs[n], pos[n])
    rd = f"{OUT}/{name}/rig"; os.makedirs(rd, exist_ok=True)
    if os.environ.get("PARTS"): os.makedirs(rd + "/parts", exist_ok=True); [imgs[n].save(f"{rd}/parts/{n}.png") for n in names]
    atlas.save(f"{rd}/atlas.png", optimize=True)
    aj = {n: dict(x=int(pos[n][0]), y=int(pos[n][1]), w=int(imgs[n].width), h=int(imgs[n].height)) for n in names}
    json.dump(dict(size=[W, H], frames=aj), open(f"{rd}/atlas.json", "w"), indent=1)
    import math
    bones = spec["bones"]
    for pn, pd in spec["parts"].items():
        if "aim" not in pd and "len" not in pd: continue
        info = parts[pn]; src = info["src"]
        pv = info["pivot"]; hem = [info["hem"][0] - src[0], info["hem"][1] - src[1]]
        vx, vy = hem[0] - pv[0], hem[1] - pv[1]; L = math.hypot(vx, vy)
        tuck = pd.get("tuck", 12); vx, vy = vx * (L - tuck) / L, vy * (L - tuck) / L; L -= tuck
        info["vec"] = [vx, vy]
        if "aim" in pd:
            ax, ay = pd["aim"]
            pd["rot"] = round(math.degrees(math.atan2(ay, ax) - math.atan2(vy, vx)), 2)
            if "len" not in pd: pd["len"] = math.hypot(ax, ay)
        pd["ps"] = round(pd["len"] / L, 4)
        if pd.get("child"):
            b = bones[pd["child"]]; par = bones[b["parent"]]
            r = math.radians(pd["rot"]); sx = (vx * math.cos(r) - vy * math.sin(r)) * pd["ps"]; sy = (vx * math.sin(r) + vy * math.cos(r)) * pd["ps"]
            b["at"] = [round(par["at"][0] + sx - 0 + (bones[pd["bone"]]["at"][0] - par["at"][0]) * 0, 1), 0]
            b["at"] = [round(bones[pd["bone"]]["at"][0] + sx, 1), round(bones[pd["bone"]]["at"][1] + sy, 1)]
    rig = dict(name=name, ps=spec.get("ps", 1.9), ref=spec.get("ref"), view=spec.get("view"), gain=spec.get("gain"), style=spec.get("style"), bones=spec["bones"], parts={}, order=spec["order"], anims=spec.get("anims"))
    for pn, pd in spec["parts"].items():
        p = dict(atlas=aj[pn], pivot=parts[pn]["pivot"], bone=pd["bone"])
        for k in ("rot", "off", "ps", "glow", "alpha", "blend", "sway", "sw"):
            if k in pd: p[k] = pd[k]
        rig["parts"][pn] = p
    json.dump(rig, open(f"{rd}/rig.json", "w"), indent=1, ensure_ascii=False, default=float)
    json.dump({n: parts[n] for n in parts}, open(f"D:/wc/art/rig2/_debug/{name}_parts_info.json", "w"), indent=1, default=float)
    print(name, "atlas", W, H, "parts", len(parts))
    for n in parts: print(" ", n, parts[n])

if __name__ == "__main__":
    main(sys.argv[1])

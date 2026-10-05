"""部件拆分图 -> 透明 PNG + 连通域标注图。
用法: python cut.py <角色>   生成 D:/wc/art/rig/_debug/<角色>_labels.png 供人工校对,
再写 maps/<角色>.json (连通域序号 -> 部件名/合并), 然后 python pack.py <角色>。"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

SRC = "D:/wc/art/rig"; DBG = "D:/wc/art/rig/_debug"
os.makedirs(DBG, exist_ok=True)

def matte(rgb):
    """洋红抠色: 距离 #FF00FF 软边 + 去溢色(边缘像素的洋红分量回退)"""
    a = rgb.astype(np.float32)
    d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
    lo, hi = 60.0, 150.0
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = np.clip(np.minimum(r, b) - g, 0, None)
    # 只在半透明边缘/紧邻背景处去溢色; 内部真实洋红色(几乎没有)不处理
    near_bg = ndi.binary_dilation(alpha < 0.5, iterations=3)
    k = near_bg.astype(np.float32)
    a[..., 0] = np.clip(r - spill * 0.8 * k, 0, 255)
    a[..., 2] = np.clip(b - spill * 0.8 * k, 0, 255)
    return a.astype(np.uint8), alpha

def load(name):
    p = f"D:/wc/art/q/cls/{name}/parts{'2' if os.environ.get('PARTS2') else ''}.png"
    im = Image.open(p if os.path.exists(p) else f"{SRC}/{name}_parts.png").convert("RGB")
    return matte(np.array(im))

def components(alpha, grow=int(os.environ.get("GROW", 6)), minarea=int(os.environ.get("MINA", 120))):
    m = alpha > 0.5
    m = ndi.binary_opening(m, iterations=1)
    merged = ndi.binary_dilation(m, iterations=grow)
    lab, n = ndi.label(merged)
    lab = lab * m
    out = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < minarea: continue
        out.append(dict(id=i, x0=int(xs.min()), y0=int(ys.min()), x1=int(xs.max()) + 1, y1=int(ys.max()) + 1, area=int(len(ys))))
    return lab, out

if __name__ == "__main__":
    name = sys.argv[1]
    rgb, alpha = load(name)
    lab, comps = components(alpha)
    im = Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA")
    bg = Image.new("RGBA", im.size, (60, 60, 70, 255)); bg.alpha_composite(im)
    d = ImageDraw.Draw(bg)
    for c in comps:
        d.rectangle([c["x0"], c["y0"], c["x1"], c["y1"]], outline=(255, 255, 0, 255))
        d.text((c["x0"] + 3, c["y0"] + 2), str(c["id"]), fill=(255, 255, 0, 255))
    bg.convert("RGB").save(f"{DBG}/{name}_labels.png")
    print(name, len(comps), "components")
    for c in comps: print(c["id"], c["x0"], c["y0"], c["x1"], c["y1"], c["area"])

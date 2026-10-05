"""整图切块骨骼(无拆分图时的诚实回退): python build_whole.py mask
把 idle_raw 抠洋红底，切成 头 / 上身 / 双前臂 / 下身 五块刚体，装进 rig.json(与 pack.py 产物同格式)。
上身与下身接缝处互相重叠 40px，头与上身在领口重叠，转动幅度小时无缝。"""
import sys, os, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from cut import matte
name = sys.argv[1]
OUT = f"D:/wc/wt_polish2/web3d/public/duanju/art/{name}/rig"; os.makedirs(OUT, exist_ok=True)
rgb, alpha = matte(np.array(Image.open(f"D:/wc/art/q/cls/{name}/idle_raw.png").convert("RGB")))
H, W = alpha.shape
cfg = json.load(open(os.path.dirname(__file__) + f"/maps_whole/{name}.json", encoding="utf8"))
def piece(rect, erase=()):
    x0, y0, x1, y1 = rect; a = np.zeros_like(alpha); a[y0:y1, x0:x1] = alpha[y0:y1, x0:x1]
    for e in erase: a[e[1]:e[3], e[0]:e[2]] = 0
    return a
FA, NA = cfg["far_fore"], cfg["near_fore"]
P = {
  "legs": (piece(cfg["legs"], [FA, NA]), "hip"),
  "torso": (piece(cfg["torso"], [FA, NA]), "torso"),
  "arm_far_fore": (piece(FA), "el_far"), "arm_near_fore": (piece(NA), "el_near"),
  "head": (piece(cfg["head"]), "head"),
}
order = ["legs", "arm_far_fore", "torso", "head", "arm_near_fore"]
imgs = {}; parts = {}; bones = {"root": {"at": cfg["root"]}, "hip": {"parent": "root", "at": cfg["hip"]}, "torso": {"parent": "hip", "at": cfg["hip"]},
  "neck": {"parent": "torso", "at": cfg["neck"]}, "head": {"parent": "neck", "at": cfg["neck"]}, "hair": {"parent": "head", "at": cfg["neck"]}}
for k in ("far", "near"):
    bones[f"el_{k}"] = {"parent": "torso", "at": cfg[f"el_{k}"]}; bones[f"wr_{k}"] = {"parent": f"el_{k}", "at": cfg[f"wr_{k}"]}
for pn, (a, bone) in P.items():
    ys, xs = np.nonzero(a > 0.02); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    imgs[pn] = (Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)])[y0:y1, x0:x1], "RGBA"), (x0, y0))
Wd = 1024; x = y = rowh = 0; pos = {}
for n in sorted(imgs, key=lambda n: -imgs[n][0].height):
    w, h = imgs[n][0].size
    if x + w + 2 > Wd: x = 0; y += rowh + 2; rowh = 0
    pos[n] = (x, y); x += w + 2; rowh = max(rowh, h)
atlas = Image.new("RGBA", (Wd, y + rowh + 2), (0, 0, 0, 0))
for n in imgs: atlas.alpha_composite(imgs[n][0], pos[n])
atlas.save(f"{OUT}/atlas.png", optimize=True)
for n, (im, (ox, oy)) in imgs.items():
    b = P[n][1]; at = bones[b]["at"]
    parts[n] = dict(atlas=dict(x=pos[n][0], y=pos[n][1], w=im.width, h=im.height), pivot=[at[0] - ox, at[1] - oy], bone=b)
rig = dict(name=name, ps=1.0, ref=f"D:/wc/art/q/cls/{name}/idle_raw.png", view=[195, 0, 780, 1254], gain=cfg["gain"], style="shu", bones=bones, parts=parts, order=order, anims=None)
json.dump(rig, open(f"{OUT}/rig.json", "w"), indent=1, ensure_ascii=False, default=int)
# 预览(与 preview.py 同一路径)
os.system(f"python -W ignore {os.path.dirname(__file__)}/preview.py {name}")
print("ok", name, list(parts))

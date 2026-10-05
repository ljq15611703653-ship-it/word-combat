# 把 D:/wc/art/panels/<id>.png 裁成格子比例、转 webp 放进 public/duanju/story/panels/，并更新 panels.json 的 image 字段（没出图的格子置空，用占位）
import json, os, sys
from PIL import Image
SRC = "D:/wc/art/panels"; DST = "public/duanju/story/panels"; PJ = "public/duanju/story/panels.json"
os.makedirs(DST, exist_ok=True)
d = json.load(open(PJ, encoding="utf8")); n = 0
for p in d["panels"]:
    src = f"{SRC}/{p['id']}.png"
    if not os.path.exists(src): p["image"] = None; continue
    w, h = map(int, p.get("ratio", "16:9").split(":")); r = w / h
    im = Image.open(src).convert("RGB"); W, H = im.size
    if W / H > r: nw = int(H * r); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    else: nh = int(W / r); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    if im.width > 1600: im = im.resize((1600, int(1600 / r)), Image.LANCZOS)
    im.save(f"{DST}/{p['id']}.webp", quality=84); p["image"] = f"{p['id']}.webp"; n += 1
json.dump(d, open(PJ, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("installed", n, "of", len(d["panels"]))

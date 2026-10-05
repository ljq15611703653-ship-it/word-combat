"""idle_raw(洋红底整身) -> 透明抠图 public/duanju/art/<id>/battle_idle.png (裁到包围盒, 高 640): python cutidle.py <id> ..."""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from cut import matte

OUT = "D:/wc/wt_rig2/web3d/public/duanju/art"
for n in sys.argv[1:]:
    rgb, alpha = matte(np.array(Image.open(f"D:/wc/art/q/cls/{n}/idle_raw.png").convert("RGB")))
    im = Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA")
    ys, xs = np.nonzero(alpha > 0.1)
    im = im.crop((max(0, xs.min() - 6), max(0, ys.min() - 6), min(1254, xs.max() + 7), min(1254, ys.max() + 7)))
    sc = 640 / im.height
    im = im.resize((round(im.width * sc), 640), Image.LANCZOS)
    os.makedirs(f"{OUT}/{n}", exist_ok=True); im.save(f"{OUT}/{n}/battle_idle.png", optimize=True)
    print(n, im.size)

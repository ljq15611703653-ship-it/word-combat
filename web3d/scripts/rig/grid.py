"""idle_raw 画坐标网格(1254 坐标): python grid.py <id> [x0 y0 x1 y1] -> D:/wc/art/rig2/_debug/grid_<id>.png (可选裁切放大)
   没有裁切参数时同时打印前景包围盒"""
import sys
import numpy as np
from PIL import Image, ImageDraw
n = sys.argv[1]; r = list(map(int, sys.argv[2:6])) if len(sys.argv) > 5 else [0, 0, 1254, 1254]
full = Image.open(f"D:/wc/art/q/cls/{n}/idle_raw.png").convert("RGB")
a = np.array(full).astype(int); fg = ~((a[..., 0] > 200) & (a[..., 1] < 90) & (a[..., 2] > 200)); ys, xs = np.nonzero(fg)
print(n, "bbox", xs.min(), ys.min(), xs.max(), ys.max())
im = full.crop(r)
sc = 1000 / max(im.size); im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS); d = ImageDraw.Draw(im)
for x in range((r[0] // 50 + 1) * 50, r[2], 50):
    X = (x - r[0]) * sc; d.line([(X, 0), (X, im.height)], fill=(255, 255, 255) if x % 100 == 0 else (120, 120, 120))
    if x % 100 == 0: d.text((X + 2, 2), str(x), fill=(255, 255, 0))
for y in range((r[1] // 50 + 1) * 50, r[3], 50):
    Y = (y - r[1]) * sc; d.line([(0, Y), (im.width, Y)], fill=(255, 255, 255) if y % 100 == 0 else (120, 120, 120))
    if y % 100 == 0: d.text((2, Y + 2), str(y), fill=(255, 255, 0))
im.save(f"D:/wc/art/rig2/_debug/grid_{n}.png")

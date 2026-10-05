"""放大裁切并画坐标网格(源图坐标): python crop.py <角色> x0 y0 x1 y1 [scale] -> D:/wc/art/rig/_debug/crop.png"""
import sys
from PIL import Image, ImageDraw
name = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); sc = float(sys.argv[6]) if len(sys.argv) > 6 else 3
im = Image.open(f"D:/wc/art/rig/{name}_parts.png").convert("RGB").crop((x0, y0, x1, y1))
im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
step = 20
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * sc; d.line([(X, 0), (X, im.height)], fill=(255, 255, 255) if x % 100 == 0 else (150, 150, 150), width=1); d.text((X + 2, 2), str(x), fill=(255, 255, 0))
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * sc; d.line([(0, Y), (im.width, Y)], fill=(255, 255, 255) if y % 100 == 0 else (150, 150, 150), width=1); d.text((2, Y + 2), str(y), fill=(255, 255, 0))
im.save("D:/wc/art/rig/_debug/crop.png")

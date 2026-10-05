"""12 个角色 静止组装 vs idle_raw 并排总图 -> D:/wc/art/rig2/_sheets/compare12.png (每格: 左组装 右 idle_raw)"""
import os
from PIL import Image, ImageDraw
ids = [f"{c}_{p}" for c in ("bing", "yin", "xian", "zhuang") for p in ("ci", "shu", "su")]
W, H = 330, 410
sheet = Image.new("RGB", (W * 2 * 3, H * 4), (40, 40, 50)); d = ImageDraw.Draw(sheet)
for k, n in enumerate(ids):
    r, c = divmod(k, 3)
    a = Image.open(f"D:/wc/art/rig2/_debug/{n}_assembled_full.png")
    pw = a.width // 3
    asm = a.crop((150, 0, pw - 150 + 0, a.height)).resize((W, int(a.height * W / (pw - 300))))
    ref = a.crop((pw + 150, 0, 2 * pw - 150, a.height)).resize((W, int(a.height * W / (pw - 300))))
    ox = c * W * 2; oy = r * H
    sheet.paste(asm.crop((0, 0, W, H)), (ox, oy)); sheet.paste(ref.crop((0, 0, W, H)), (ox + W, oy))
    d.text((ox + 4, oy + 4), n, fill=(255, 255, 0))
os.makedirs("D:/wc/art/rig2/_sheets", exist_ok=True)
sheet.save("D:/wc/art/rig2/_sheets/compare12.png")

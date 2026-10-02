"""Build a readable contact sheet from Godot's render validation PNGs."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
PREVIEWS = ROOT / "previews" / "attachments"
FONT_PATH = Path("C:/Windows/Fonts/msyh.ttc")

ITEMS = [
    ("sword", "右手 · 攻击"), ("shield", "左手 · 首挡"),
    ("buckler", "左手 · 防御"), ("cape", "背部 · 不屈"),
    ("thorns", "右肩 · 回击"), ("vines", "左肩 · 回春"),
    ("twin_ring", "胸口 · 同调"), ("amulet", "胸口 · 三种免疫"),
    ("ring_double", "光环 · 双倍"), ("afterimage", "幻影 · 重复"),
    ("hourglass", "左手 · 时间"), ("mirror", "左手 · 反射/转移"),
    ("wand", "右手 · 状态"), ("halo", "头顶 · 治疗"),
    ("chains", "腰间 · 陷阱"), ("mask", "头部 · 控制"),
    ("book", "背部 · 强化"),
]

cols, tile_w, tile_h = 4, 350, 370
rows = (len(ITEMS) + cols - 1) // cols
canvas = Image.new("RGB", (cols * tile_w + 60, rows * tile_h + 140), "#201926")
draw = ImageDraw.Draw(canvas)
title_font = ImageFont.truetype(str(FONT_PATH), 37)
name_font = ImageFont.truetype(str(FONT_PATH), 25)
desc_font = ImageFont.truetype(str(FONT_PATH), 19)
draw.text((38, 30), "WORD COMBAT  ·  3D MODULES", font=title_font, fill="#ffe3af")
draw.text((40, 79), "17 个独立挂件 · 原点即挂点 · 无碰撞体 · Godot 已重新导入", font=desc_font, fill="#d3bfdc")

for idx, (name, use) in enumerate(ITEMS):
    col, row = idx % cols, idx // cols
    x = 30 + col * tile_w
    y = 130 + row * tile_h
    draw.rounded_rectangle((x, y, x + tile_w - 12, y + tile_h - 14), 18,
                           fill="#32253c", outline="#a47e87", width=2)
    preview = Image.open(PREVIEWS / f"{name}.png").convert("RGB")
    preview = preview.resize((280, 280), Image.Resampling.LANCZOS)
    canvas.paste(preview, (x + 29, y + 10))
    draw.text((x + 22, y + 292), name, font=name_font, fill="#ffdfad")
    draw.text((x + 22, y + 326), use, font=desc_font, fill="#d6c5de")

output = ROOT / "previews" / "attachments_contact_sheet.png"
canvas.save(output)
print(output)

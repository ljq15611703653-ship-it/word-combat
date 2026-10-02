"""Contact sheet for the five existing 3D table asset interfaces."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "previews" / "table"
FONT = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 25)
SMALL = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 19)
TITLE = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 38)

img = Image.new("RGB", (1920, 1150), "#0d0b10")
draw = ImageDraw.Draw(img)
draw.text((36, 24), "WORD COMBAT · 3D 场景模块", font=TITLE, fill="#ffe53b")
draw.text((40, 77), "五件 GLB · 原接口尺寸与原点 · 零碰撞节点 · 桌面仍在 y=0", font=SMALL, fill="#d9bec6")


def panel(name, label, x, y, w, h):
    draw.rounded_rectangle((x, y, x+w, y+h), 17, fill="#2b0c1c", outline="#925566", width=2)
    src = Image.open(PREVIEW / f"{name}.png").convert("RGB")
    avail_w, avail_h = w-18, h-57
    ratio = min(avail_w/src.width, avail_h/src.height)
    src = src.resize((round(src.width*ratio), round(src.height*ratio)), Image.Resampling.LANCZOS)
    px = x + (w-src.width)//2
    py = y + 9 + (avail_h-src.height)//2
    img.paste(src, (px, py))
    draw.text((x+20, y+h-44), label, font=FONT, fill="#fffaba")


panel("table_hero", "table.glb · 斜视倒角与内凹战场", 30, 125, 606, 445)
panel("table_seat", "table.glb · 坐在桌前", 657, 125, 606, 445)
panel("table_top", "table.glb · 十张随从上场", 1284, 125, 606, 445)
panel("bag", "bag.glb · 开口词袋", 30, 592, 450, 510)
panel("opponent", "opponent.glb · 对手", 500, 592, 450, 510)
panel("chip_mine", "chip_mine.glb · 我方筹码", 970, 592, 450, 510)
panel("chip_foe", "chip_foe.glb · 对方筹码", 1440, 592, 450, 510)
draw.text((39, 1114), "仅为待接入素材；游戏现有碰撞体、站位与相机没有修改。", font=SMALL, fill="#ad8b9c")

out = ROOT / "previews" / "table_contact_sheet.png"
img.save(out)
print(out)

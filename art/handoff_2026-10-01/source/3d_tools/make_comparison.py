"""Create a simple side-by-side audit sheet; original master PNGs remain untouched."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "source" / "characters"
PREVIEWS = ROOT / "previews"
MASTERS = [
    "body_sword_master.png",
    "body_shield_v2_master.png",
    "body_mage_master.png",
    "body_bow_master.png",
    "body_wisp_master.png",
]
front = Image.open(PREVIEWS / "3d_bodies_front.png").convert("RGBA")
sheet = Image.new("RGBA", (1600, 1160), "#1d172f")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
except OSError:
    font = ImageFont.load_default()
draw.text((40, 16), "2D MASTER SILHOUETTES", fill="#f8df9c", font=font)
for index, path in enumerate(MASTERS):
    img = Image.open(SOURCE / path).convert("RGBA")
    img = img.crop(img.getbbox())
    img.thumbnail((260, 350), Image.Resampling.LANCZOS)
    cx = [205, 500, 795, 1100, 1390][index]
    sheet.alpha_composite(img, (int(cx - img.width / 2), int(68 + (350 - img.height))))
draw.line((30, 434, 1570, 434), fill="#6d587f", width=2)
draw.text((40, 455), "ACTUAL GODOT GLB RENDER", fill="#f8df9c", font=font)
sheet.alpha_composite(front, (0, 505))
output = PREVIEWS / "3d_vs_2d_bodies.png"
sheet.convert("RGB").save(output, quality=95)
print(output)

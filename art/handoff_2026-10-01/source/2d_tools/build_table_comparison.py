"""Side-by-side QA of the old and new 3D table renders; no game assets changed."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parents[2]
before = root / 'source' / 'legacy_table'
after = root / 'previews' / 'table'
out = root / 'previews' / 'table_before_after.png'

canvas = Image.new('RGB', (1360, 850), (18, 11, 19))
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 24)
except OSError:
    font = ImageFont.load_default()

for row, name in enumerate(('table_seat', 'table_top')):
    for col, folder in enumerate((before, after)):
        filename = f'{name}_before.png' if col == 0 else f'{name}.png'
        image = Image.open(folder / filename).convert('RGB')
        image = ImageOps.fit(image, (650, 365), method=Image.Resampling.LANCZOS)
        x = 20 + col * 670
        y = 38 + row * 405
        canvas.paste(image, (x, y))
        draw.text((x, y - 28), ('改前' if col == 0 else '改后') + (' · 对战视角' if row == 0 else ' · 俯视视角'), font=font, fill=(255, 226, 104))

canvas.save(out)
print(out)

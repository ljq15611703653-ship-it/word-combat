"""python vfx-shell-sheet.py <dir> <play> [cols] -> <dir>/sheet_p<play>.jpg  按 meta 里壳的矩形取固定裁切(含施法者)，每帧标注序号/壳不透明度/镜头"""
import sys, json, glob
from PIL import Image, ImageDraw
d, play = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
meta = json.load(open(f"{d}/p{play}_meta.json"))
W, H = 520, 460; sc = 0.78; tw, th = int(W * sc), int(H * sc)
cen = None; cs = []
for m in meta:
    if m.get("shell"): r = m["shell"]; cen = (r[0] + r[2] / 2, r[1] + r[3] / 2)
    cs.append(cen)
first = next((c for c in cs if c), (640, 400)); cs = [c or first for c in cs]
rows = (len(meta) + cols - 1) // cols
s = Image.new("RGB", (tw * cols, th * rows), (0, 0, 0))
for i, m in enumerate(meta):
    cx, cy = cs[i]; x0 = int(max(0, min(1280 - W, cx - W / 2))); y0 = int(max(0, min(720 - H, cy - H / 2)))
    im = Image.open(f"{d}/p{play}_{m['n']}.jpg").crop((x0, y0, x0 + W, y0 + H)).resize((tw, th))
    ImageDraw.Draw(im).text((4, 3), f"{i} sh={'-' if not m['shell'] else m['op'][:4]} tok={m['toks']}", fill=(255, 255, 0)); s.paste(im, ((i % cols) * tw, (i // cols) * th))
s.save(f"{d}/sheet_p{play}.jpg", quality=85); print(s.size)

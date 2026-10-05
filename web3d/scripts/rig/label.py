"""连通域标注(与 build.py/pack.py 同一套编号: grow=1, mina=300): python label.py <id>
输出 D:/wc/art/rig2/<id>/labels.png (灰底 + 黄框 + 大号编号) 与 comps.json (bbox/面积)"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from cut import load

OUT = "D:/wc/art/rig2"

def comps(alpha, grow=1, mina=300):
    m = ndi.binary_opening(alpha > 0.5, iterations=1)
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=grow)); lab = lab * m
    res = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None: continue
        ar = int((lab[sl] == i).sum())
        if ar < mina: continue
        res.append(dict(id=i, x0=sl[1].start, y0=sl[0].start, x1=sl[1].stop, y1=sl[0].stop, area=ar))
    return lab, res

if __name__ == "__main__":
    name = sys.argv[1]; od = f"{OUT}/{name}"; os.makedirs(od, exist_ok=True)
    rgb, alpha = load(name)
    lab, cs = comps(alpha)
    json.dump(cs, open(f"{od}/comps.json", "w"))
    im = Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA")
    bg = Image.new("RGBA", im.size, (70, 70, 80, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg)
    f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
    for c in cs:
        d.rectangle([c["x0"], c["y0"], c["x1"], c["y1"]], outline=(255, 255, 0, 255))
        d.rectangle([c["x0"], c["y0"], c["x0"] + 12 * len(str(c["id"])) + 8, c["y0"] + 24], fill=(0, 0, 0, 200))
        d.text((c["x0"] + 3, c["y0"]), str(c["id"]), fill=(255, 255, 0, 255), font=f)
    bg.convert("RGB").save(f"{od}/labels.png")
    print(name, len(cs), "components")

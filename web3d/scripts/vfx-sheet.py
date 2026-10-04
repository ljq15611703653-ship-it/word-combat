import sys, json, glob, os
from PIL import Image
d = sys.argv[1]
for jf in glob.glob(d + "/*.json"):
    files = json.load(open(jf))
    if not files: continue
    n = min(6, len(files)); idx = [round(i * (len(files) - 1) / max(1, n - 1)) for i in range(n)]
    ims = [Image.open(files[i]) for i in idx]
    w, h = ims[0].size; sw, sh = w // 2, h // 2
    sheet = Image.new("RGB", (sw * 3, sh * 2))
    for k, im in enumerate(ims): sheet.paste(im.resize((sw, sh)), ((k % 3) * sw, (k // 3) * sh))
    sheet.save(jf.replace(".json", "_sheet.jpg"), quality=80)

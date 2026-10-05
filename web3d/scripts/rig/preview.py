"""静止组装预览(与运行时同一套 FK): python preview.py <角色> [--pose name:t] -> D:/wc/art/rig2/_debug/<角色>_assembled.png (左: 组装, 右: idle_raw, 另有 50% 叠加)"""
import sys, json, math
import numpy as np
from PIL import Image

OUT = "D:/wc/wt_polish2/web3d/public/duanju/art"

def mat(tx=0, ty=0, rot=0, sx=1, sy=1):
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    return np.array([[c * sx, -s * sy, tx], [s * sx, c * sy, ty], [0, 0, 1]], float)

def render(rig, atlas, size=1254, pose=None):
    bones = rig["bones"]; world = {}
    def W(b):
        if b in world: return world[b]
        bd = bones[b]; p = bd.get("parent")
        at = bd["at"]; pat = bones[p]["at"] if p else [0, 0]
        a = (pose or {}).get(b, {})
        local = mat(at[0] - pat[0] + a.get("x", 0), at[1] - pat[1] + a.get("y", 0), a.get("rot", 0), a.get("sx", 1), a.get("sy", 1))
        world[b] = (W(p) if p else np.eye(3)) @ local
        return world[b]
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for pn in rig["order"]:
        p = rig["parts"][pn]; f = p["atlas"]
        im = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
        ps = p.get("ps", rig["ps"]); off = p.get("off", [0, 0])
        M = W(p["bone"]) @ mat(off[0], off[1], p.get("rot", 0), ps * p.get("sw", 1), ps) @ mat(-p["pivot"][0], -p["pivot"][1])
        inv = np.linalg.inv(M)
        layer = im.transform((size, size), Image.AFFINE, tuple(inv[:2].flatten()), Image.BICUBIC)
        canvas.alpha_composite(layer)
    return canvas

if __name__ == "__main__":
    name = sys.argv[1]
    rd = f"{OUT}/{name}/rig"
    rig = json.load(open(f"{rd}/rig.json", encoding="utf8")); atlas = Image.open(f"{rd}/atlas.png").convert("RGBA")
    pose = None
    if len(sys.argv) > 2 and sys.argv[2] == "--pose":
        pose = json.load(open(sys.argv[3]))
    a = render(rig, atlas, pose=pose)
    ref = Image.open(rig["ref"]).convert("RGBA")
    # 洋红底 -> 灰
    arr = np.array(ref); mg = (arr[..., 0] > 200) & (arr[..., 1] < 80) & (arr[..., 2] > 200); arr[mg] = (70, 70, 80, 255); ref = Image.fromarray(arr)
    g = Image.new("RGBA", a.size, (70, 70, 80, 255)); g.alpha_composite(a)
    ov = ref.copy(); ov.alpha_composite(a.copy().point(lambda v: v)); ov = Image.blend(ref, g, 0.5)
    sheet = Image.new("RGB", (a.width * 3, a.height)); sheet.paste(g.convert("RGB"), (0, 0)); sheet.paste(ref.convert("RGB"), (a.width, 0)); sheet.paste(ov.convert("RGB"), (a.width * 2, 0))
    sheet.resize((1800,int(1254*1800/3762))).save(f"D:/wc/art/rig2/_debug/{name}_assembled.png"); sheet.crop((0,0,1254*3,1254)).save(f"D:/wc/art/rig2/_debug/{name}_assembled_full.png"); g.convert("RGB").save(f"D:/wc/art/rig2/_debug/{name}_asm_only.png")

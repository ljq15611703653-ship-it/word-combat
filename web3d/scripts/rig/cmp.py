"""build+preview+对比图(旧 | 新组装 | idle_raw | 叠加): python cmp.py <id>... -> D:/wc/art/rig4/new/<id>.png"""
import sys, os, subprocess
os.environ["TEMP"] = os.environ["TMP"] = "D:/wc/tmp"
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
for i in sys.argv[1:]:
    for s in ("build.py", "preview.py"):
        r = subprocess.run([sys.executable, "-W", "ignore", f"{H}/{s}", i], capture_output=True, text=True, cwd=H)
        if r.returncode: print(r.stderr[-1500:])
    a = Image.open(f"D:/wc/art/rig2/_debug/{i}_assembled_full.png")
    o = Image.open(f"D:/wc/art/rig4/old/{i}.png").crop((0, 0, 1254, 1254))
    s = Image.new("RGB", (1254 * 4, 1254)); s.paste(o, (0, 0)); s.paste(a, (1254, 0))
    s.resize((2400, int(1254 * 2400 / 5016))).save(f"D:/wc/art/rig4/new/{i}.png")
    print("ok", i)

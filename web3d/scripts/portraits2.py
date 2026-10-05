"""D:/wc/art/portraits2/<名>/neutral.png (洋红底) -> public/duanju/story/portraits/<中文名>_neutral.webp (1024 RGBA)。已存在的不覆盖，缺的下次再跑。"""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rig"))
from cut import matte
M = {"Song_Bo":"宋伯","Adou":"阿豆","Ye_Qing":"叶晴","Pei_Lan":"裴岚","Gu_Heng":"顾衡","Echo":"回声","Old_Cai":"老蔡","Lu_Xi":"鹿溪","Han_Jin":"韩烬","Tong_Qiao":"童乔","Lu_Ming":"鹿鸣","Li_Su":"黎簌","Bai_Zhi":"白芷","Uncle_Wu":"乌叔","Jian":"缄","Lao_Dao":"老刀","He_Yun":"贺云","Mo_Wen":"莫问"}
SRC = "D:/wc/art/portraits2"; DST = os.path.join(os.path.dirname(__file__), "..", "public/duanju/story/portraits")
done, missing = [], []
for k, zh in M.items():
    p = f"{SRC}/{k}/neutral.png"
    if not os.path.exists(p): missing.append(zh); continue
    rgb, a = matte(np.array(Image.open(p).convert("RGB")))
    im = Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]), "RGBA").resize((1024, 1024), Image.LANCZOS)
    im.save(f"{DST}/{zh}_neutral.webp", quality=88, method=6); done.append(zh)
print("done", done); print("missing", missing)

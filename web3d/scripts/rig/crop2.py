"""python crop2.py <id> x0 y0 x1 y1 [scale]  -> D:/wc/tmp/crop_<id>.png  (组装 | 待机 | 50%叠加, 设计坐标裁切, 带每50px 刻度)"""
import sys
from PIL import Image, ImageDraw
n=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]) if len(sys.argv)>6 else 1.5
im=Image.open(f"D:/wc/art/rig2/_debug/{n}_assembled_full.png").convert("RGB")
out=[]
for i in range(3):
    c=im.crop((i*1254+x0,y0,i*1254+x1,y1)).resize((int((x1-x0)*sc),int((y1-y0)*sc)),Image.LANCZOS)
    d=ImageDraw.Draw(c)
    for gx in range((x0//50+1)*50,x1,50): d.line([((gx-x0)*sc,0),((gx-x0)*sc,8)],fill=(255,255,0)); d.text(((gx-x0)*sc+2,8),str(gx),fill=(255,255,0))
    for gy in range((y0//50+1)*50,y1,50): d.line([(0,(gy-y0)*sc),(8,(gy-y0)*sc)],fill=(255,255,0)); d.text((10,(gy-y0)*sc-5),str(gy),fill=(255,255,0))
    out.append(c)
W=sum(c.width for c in out)+8; s=Image.new("RGB",(W,out[0].height),(0,0,0)); x=0
for c in out: s.paste(c,(x,0)); x+=c.width+4
s.save(f"D:/wc/tmp/crop_{n}.png")

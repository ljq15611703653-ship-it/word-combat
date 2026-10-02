"""Create the optional UI skin and two static implementation mockups.

All PNG/SVG pairs are handoff art, not runtime assets.  The SVGs retain the
editable vector shapes used for the PNGs; the background PNG adds subtle
procedural grain that the vector source intentionally omits.
"""
from __future__ import annotations

import math
import random
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from build_assets import (
    Art, S, INK, OUTLINE, INDIGO, VIOLET, LAVENDER, CREAM, GOLD, GOLD_L,
    CYAN, RED, GREEN, CARD_DIR, OPTIONAL, ROOT
)

UI = ROOT / "assets" / "ui"
SRC = ROOT / "source" / "svg"
MOCK = ROOT / "mockups"
WINDOWS_CJK_FONT = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT = (WINDOWS_CJK_FONT if WINDOWS_CJK_FONT.exists() else
        ROOT.parents[1] / "godot" / "assets" / "fonts" / "NotoSansSC-subset.ttf")
BASELINE = Path(r"D:\work\shots\visual-baseline")


def rgba_css(value):
    if value is None:
        return "none"
    if isinstance(value, tuple):
        if len(value)==4:
            return f"rgba({value[0]},{value[1]},{value[2]},{value[3]/255:.3f})"
        return f"rgb({value[0]},{value[1]},{value[2]})"
    return value


class Skin:
    def __init__(self, w, h):
        self.w,self.h=w,h
        self.a=Art(w,h)
        self.tags=[]

    def rect(self,box,fill=None,outline=None,width=0,radius=0):
        self.a.rect(box,fill,outline,width,radius)
        x0,y0,x1,y1=box
        self.tags.append(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="{radius}" fill="{rgba_css(fill)}" stroke="{rgba_css(outline)}" stroke-width="{width}"/>')

    def ellipse(self,box,fill=None,outline=None,width=0):
        self.a.ellipse(box,fill,outline,width)
        x0,y0,x1,y1=box
        self.tags.append(f'<ellipse cx="{(x0+x1)/2}" cy="{(y0+y1)/2}" rx="{(x1-x0)/2}" ry="{(y1-y0)/2}" fill="{rgba_css(fill)}" stroke="{rgba_css(outline)}" stroke-width="{width}"/>')

    def line(self,pts,color,width=1):
        self.a.line(pts,color,width)
        points=" ".join(f"{x},{y}" for x,y in pts)
        self.tags.append(f'<polyline points="{points}" fill="none" stroke="{rgba_css(color)}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')

    def poly(self,pts,fill=None,outline=None,width=0):
        self.a.poly(pts,fill,outline,width)
        points=" ".join(f"{x},{y}" for x,y in pts)
        self.tags.append(f'<polygon points="{points}" fill="{rgba_css(fill)}" stroke="{rgba_css(outline)}" stroke-width="{width}" stroke-linejoin="round"/>')

    def star(self,cx,cy,r1,r2,n=4,fill=GOLD_L,outline=None,width=0):
        pts=[]
        for i in range(n*2):
            t=-math.pi/2+i*math.pi/n
            r=r1 if i%2==0 else r2
            pts.append((cx+r*math.cos(t),cy+r*math.sin(t)))
        self.poly(pts,fill,outline,width)

    def save(self,name,subfolder=""):
        p=UI/subfolder/(name+".png")
        p.parent.mkdir(parents=True,exist_ok=True)
        self.a.output(p)
        s=SRC/subfolder/(name+".svg")
        s.parent.mkdir(parents=True,exist_ok=True)
        data=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
              f'viewBox="0 0 {self.w} {self.h}">\n'
              +'\n'.join(self.tags)+'\n</svg>\n')
        s.write_text(data,encoding="utf-8")
        return p


def panel(name,w,h,kind):
    q=Skin(w,h)
    if kind=="basic":
        q.rect((3,3,w-3,h-3),INK,GOLD,4,20)
        q.rect((10,10,w-10,h-10),"#30294e",LAVENDER,2,14)
        q.rect((17,17,w-17,h-17),None,"#574678",1,9)
        for x in (22,w-22):
            for y in (22,h-22):
                q.star(x,y,5,1.5,4,GOLD_L)
    elif kind=="popup":
        q.rect((3,3,w-3,h-3),"#18152e",GOLD,6,30)
        q.rect((12,12,w-12,h-12),"#342955",LAVENDER,3,22)
        q.rect((21,21,w-21,h-21),"#2a2247",GOLD,1,16)
        q.line([(55,32),(w-55,32)],GOLD_L,2)
        for x in (30,w-30):
            for y in (30,h-30):
                q.star(x,y,9,3,4,GOLD_L)
    elif kind=="top":
        q.rect((2,2,w-2,h-2),INK,GOLD,3,19)
        q.rect((8,8,w-8,h-8),"#302749",LAVENDER,2,13)
        q.line([(26,h-17),(w-26,h-17)],GOLD,2)
        for x in (20,w-20):
            q.star(x,h-18,6,2,4,GOLD_L)
    q.save(name,"panels")


def button(state,primary):
    w,h=360,96
    q=Skin(w,h)
    if primary:
        fills={
            "normal":("#d4a65a","#fbe0a1","#775134"),
            "hover":("#efc979","#fff2ba","#a56837"),
            "pressed":("#ae7f43","#e6bc71","#6c482b"),
            "disabled":("#776d75","#aaa0aa","#4e4855"),
        }
    else:
        fills={
            "normal":("#30284d","#b6a9d8","#77619e"),
            "hover":("#4e3a73","#f5d58c","#ad83cb"),
            "pressed":("#25203d","#8f7bb2","#695287"),
            "disabled":("#2c2939","#67616f","#514a5a"),
        }
    base,top,edge=fills[state]
    q.rect((4,5,w-4,h-5),base,INK,5,23)
    q.rect((8,8,w-8,h-13),base,edge,4,19)
    q.line([(35,16),(w-35,16)],top,4)
    q.line([(35,h-16),(w-35,h-16)],top,2)
    for x in (26,w-26):
        q.star(x,h/2,10,3,4,top)
    q.save(f"button_{'primary' if primary else 'secondary'}_{state}_360x96","buttons")


def tab(active):
    q=Skin(192,80)
    if active:
        q.rect((3,3,189,77),"#48345d",GOLD,4,18)
        q.rect((9,8,183,71),"#55406d",LAVENDER,2,13)
        q.line([(35,65),(157,65)],GOLD_L,4)
        q.star(20,40,7,2,4,GOLD_L)
    else:
        q.rect((4,5,188,77),"#2b2543","#695e83",3,18)
        q.rect((11,12,181,69),"#342b4c","#4d416c",2,12)
        q.line([(35,63),(157,63)],"#71638a",2)
    q.save(f"tab_{'active' if active else 'normal'}_192x80","panels")


def card_front(name,color,bright):
    q=Skin(512,768)
    q.rect((8,8,504,760),None,color,10,27)
    q.rect((22,22,490,746),None,bright,4,19)
    q.rect((35,35,477,733),None,CREAM,2,13)
    # Artwork window and lower description well are independent transparent regions.
    q.rect((48,73,464,540),None,color,4,14)
    q.rect((50,559,462,720),None,bright,3,12)
    q.line([(60,550),(452,550)],color,3)
    for x in (45,467):
        for y in (45,723):
            q.star(x,y,16,5,4,bright)
    q.star(256,42,23,7,8,bright,INK,2)
    q.save(name,"cards")


def card_back():
    # Source keeps the compass geometry editable.  PNG uses the matching
    # textured render from build_assets.py, so it is the preferred preview.
    q=Skin(512,768)
    q.rect((5,5,507,763),INK,GOLD,12,30)
    q.rect((22,22,490,746),INDIGO,LAVENDER,5,22)
    q.rect((38,38,474,730),None,CREAM,2,15)
    for r,col,ww in ((192,LAVENDER,5),(168,GOLD,3),(121,LAVENDER,3)):
        q.ellipse((256-r,384-r,256+r,384+r),None,col,ww)
    q.star(256,384,100,29,8,GOLD_L,INK,7)
    q.star(256,384,57,17,8,CREAM)
    for x,y in ((68,69),(444,69),(68,699),(444,699)):
        q.star(x,y,18,6,4,GOLD_L)
    q.save("card_back_512x768","cards")
    shutil.copyfile(OPTIONAL/"card_back_512x768.png",UI/"cards"/"card_back_512x768.png")


def hud():
    q=Skin(320,42)
    q.rect((2,2,318,40),INK,GOLD,3,18)
    q.rect((8,8,312,34),"#3f3154",LAVENDER,2,12)
    q.save("hp_bar_bg_320x42","hud")
    q=Skin(320,42)
    q.rect((4,4,316,38),"#427c75",GREEN,3,16)
    q.rect((11,10,309,19),"#9be9c2")
    q.line([(15,33),(303,33)],"#356b68",3)
    q.save("hp_bar_fill_320x42","hud")
    q=Skin(128,128)
    q.ellipse((4,4,124,124),GOLD,INK,7)
    q.ellipse((14,14,114,114),"#7c5638",CREAM,4)
    q.ellipse((23,23,105,105),GOLD_L,GOLD,3)
    q.star(64,64,37,14,6,CREAM,INK,3)
    q.save("ap_chip_128","hud")
    status=[
        ("狂振",RED),("易伤","#d99b59"),("沉默","#9994ba"),
        ("护盾",CYAN),("牵连","#ba93e0"),("升华",GOLD_L),
    ]
    for label,col in status:
        q=Skin(128,128)
        q.ellipse((5,5,123,123),INK,GOLD,7)
        q.ellipse((14,14,114,114),INDIGO,col,6)
        if label=="狂振":
            q.poly([(64,18),(89,62),(77,55),(89,98),(64,112),(39,98),(51,55),(39,62)],col)
        elif label=="易伤":
            q.poly([(33,27),(83,29),(62,62),(93,69),(61,107),(42,80),(61,68)],col)
        elif label=="沉默":
            q.rect((37,53,91,101),col,radius=7)
            q.ellipse((47,24,81,68),None,col,10)
        elif label=="护盾":
            q.poly([(28,27),(100,27),(97,72),(64,107),(31,72)],col)
        elif label=="牵连":
            q.ellipse((20,44,75,88),None,col,10)
            q.ellipse((53,44,108,88),None,col,10)
        else:
            q.star(64,64,44,15,8,col)
        q.save(f"status_{label}_128","hud")


def background():
    w,h=1600,900
    im=Image.new("RGB",(w,h))
    pix=im.load()
    rng=random.Random(7264)
    for y in range(h):
        for x in range(w):
            r2=((x-w/2)/950)**2+((y-h/2)/630)**2
            glow=max(0,1-r2)
            grain=rng.randint(-2,2)
            pix[x,y]=(max(0,int(20+16*glow+grain)),
                      max(0,int(16+11*glow+grain)),
                      max(0,int(39+38*glow+grain)))
    d=ImageDraw.Draw(im,"RGBA")
    for rad,alpha in ((330,100),(280,105),(230,120)):
        d.ellipse((800-rad,450-rad,800+rad,450+rad),outline=(215,175,95,alpha),width=3)
    for i in range(12):
        t=i*math.tau/12
        x0=800+234*math.cos(t);y0=450+234*math.sin(t)
        x1=800+319*math.cos(t);y1=450+319*math.sin(t)
        d.line((x0,y0,x1,y1),fill=(215,175,95,85),width=2)
    star_rng=random.Random(942)
    stars=[]
    for i in range(80):
        x=star_rng.randrange(w);y=star_rng.randrange(h)
        r=star_rng.choice((1,1,1,2))
        opacity=star_rng.randrange(60,150)
        stars.append((x,y,r,opacity))
        d.ellipse((x-r,y-r,x+r,y+r),fill=(247,230,196,opacity))
    p=UI/"backgrounds"/"astral_table_1600x900.png"
    p.parent.mkdir(parents=True,exist_ok=True)
    im.save(p)
    # Editable base geometry; procedural grain is only in the PNG.
    ray_tags=[]
    for i in range(12):
        t=i*math.tau/12
        x0=800+234*math.cos(t);y0=450+234*math.sin(t)
        x1=800+319*math.cos(t);y1=450+319*math.sin(t)
        ray_tags.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" stroke="#d7af5f" stroke-width="2" opacity=".35"/>')
    star_tags=[f'<circle cx="{x}" cy="{y}" r="{r}" fill="#f7e6c4" opacity="{alpha/255:.3f}"/>' for x,y,r,alpha in stars]
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<defs><radialGradient id="dusk"><stop offset="0" stop-color="#28214b"/><stop offset="1" stop-color="#141027"/></radialGradient></defs>
<rect width="{w}" height="{h}" fill="url(#dusk)"/>
<circle cx="800" cy="450" r="330" fill="none" stroke="#b69560" stroke-width="3" opacity=".35"/>
<circle cx="800" cy="450" r="280" fill="none" stroke="#b69560" stroke-width="3" opacity=".35"/>
<circle cx="800" cy="450" r="230" fill="none" stroke="#b69560" stroke-width="3" opacity=".4"/>
{''.join(ray_tags)}
{''.join(star_tags)}
</svg>'''
    s=SRC/"backgrounds"/"astral_table_1600x900.svg"
    s.parent.mkdir(parents=True,exist_ok=True)
    s.write_text(svg,encoding="utf-8")

    q=Skin(1024,1024)
    for rad,color,ww in ((470,GOLD,7),(421,LAVENDER,4),(365,GOLD_L,4),(275,GOLD,3)):
        q.ellipse((512-rad,512-rad,512+rad,512+rad),None,color,ww)
    for i in range(24):
        t=i*math.tau/24
        x0=512+373*math.cos(t);y0=512+373*math.sin(t)
        x1=512+456*math.cos(t);y1=512+456*math.sin(t)
        q.line([(x0,y0),(x1,y1)],GOLD,3)
    q.star(512,512,214,65,8,GOLD_L)
    q.star(512,512,118,34,8,INDIGO)
    q.save("dark_gold_magic_circle_1024","backgrounds")


def font(size):
    return ImageFont.truetype(str(FONT),size)


def label(d,xy,text,size=22,color=CREAM):
    d.text(xy,text,font=font(size),fill=color)


def scale_asset(path,size):
    im=Image.open(path).convert("RGBA")
    return im.resize(size,Image.Resampling.LANCZOS)


def paste(c,path,xy,size):
    im=scale_asset(path,size)
    c.alpha_composite(im,xy)


def paste_nine(c,path,xy,size,margins):
    src=Image.open(path).convert("RGBA")
    sw,sh=src.size
    dw,dh=size
    l,t,r,b=margins
    xs=(0,l,sw-r,sw)
    ys=(0,t,sh-b,sh)
    xd=(0,l,dw-r,dw)
    yd=(0,t,dh-b,dh)
    out=Image.new("RGBA",(dw,dh),(0,0,0,0))
    for row in range(3):
        for col in range(3):
            cut=src.crop((xs[col],ys[row],xs[col+1],ys[row+1]))
            tw=xd[col+1]-xd[col]
            th=yd[row+1]-yd[row]
            cut=cut.resize((tw,th),Image.Resampling.LANCZOS)
            out.alpha_composite(cut,(xd[col],yd[row]))
    c.alpha_composite(out,xy)


def make_battle_mock():
    c=Image.open(UI/"backgrounds"/"astral_table_1600x900.png").convert("RGBA")
    d=ImageDraw.Draw(c)
    # Preserve the project's current 3D game-stage concept in the design.
    source=Image.open(BASELINE/"battle00000001.png").convert("RGB")
    stage=source.crop((18,47,1582,410)).resize((1530,430),Image.Resampling.LANCZOS)
    stage=Image.blend(stage,Image.new("RGB",stage.size,"#352654"),0.23)
    c.paste(stage,(35,94))
    paste_nine(c,UI/"panels"/"topbar_9slice_256x96.png",(16,9),(1568,75),(24,24,24,24))
    d=ImageDraw.Draw(c)
    label(d,(54,26),"第 2 / 10 轮   ·   对手先手",27,GOLD_L)
    label(d,(596,25),"你 0     :     0 对手",30,CREAM)
    label(d,(1220,28),"行动点 50 / 60",24,CREAM)
    paste_nine(c,UI/"panels"/"panel_9slice_192.png",(18,545),(326,335),(24,24,24,24))
    paste_nine(c,UI/"panels"/"panel_9slice_192.png",(356,545),(868,335),(24,24,24,24))
    paste_nine(c,UI/"panels"/"panel_9slice_192.png",(1236,545),(346,335),(24,24,24,24))
    paste(c,UI/"hud"/"ap_chip_128.png",(86,561),(55,55))
    d=ImageDraw.Draw(c)
    label(d,(155,569),"行动点",24,GOLD_L)
    label(d,(49,635),"回合结束前先宣告技能。",22,CREAM)
    label(d,(49,678),"技能亮出后，对手才能回应。",21,LAVENDER)
    label(d,(384,566),"我方卡组",24,GOLD_L)
    label(d,(1259,566),"对手行动",24,GOLD_L)
    names=[("剑灵","body_剑.png"),("盾卫","body_盾.png"),("咒师","body_咒.png"),("弓手","body_弓.png"),("魂使","body_魂.png")]
    for i,(name,file) in enumerate(names):
        x=380+i*166
        paste(c,UI/"cards"/"card_front_common_512x768.png",(x,616),(151,227))
        item=CARD_DIR/file
        if item.exists():
            paste(c,item,(x+16,642),(118,118))
        d=ImageDraw.Draw(c)
        label(d,(x+53,780),name,19,CREAM)
        label(d,(x+20,809),"生命 10 / 10",15,CYAN)
    paste(c,UI/"buttons"/"button_primary_normal_360x96.png",(1268,788),(275,75))
    d=ImageDraw.Draw(c)
    label(d,(1333,807),"宣告行动",27,INK)
    d.rounded_rectangle((35,94,1565,524),radius=18,outline=GOLD,width=2)
    label(d,(1300,524),"美术示意 · 未接入",17,LAVENDER)
    MOCK.mkdir(parents=True,exist_ok=True)
    c.convert("RGB").save(MOCK/"battle_skin_concept_1600x900.png")


def make_editor_mock():
    c=Image.open(UI/"backgrounds"/"astral_table_1600x900.png").convert("RGBA")
    paste_nine(c,UI/"panels"/"topbar_9slice_256x96.png",(16,12),(1568,78),(24,24,24,24))
    paste_nine(c,UI/"panels"/"panel_9slice_192.png",(17,105),(390,646),(24,24,24,24))
    paste_nine(c,UI/"panels"/"panel_9slice_192.png",(420,105),(1163,646),(24,24,24,24))
    d=ImageDraw.Draw(c)
    label(d,(46,31),"编辑随从   ·   剑灵",29,GOLD_L)
    label(d,(1256,34),"剩余点数 92 / 100",23,CREAM)
    label(d,(42,117),"随从外观",26,GOLD_L)
    item=CARD_DIR/"body_剑.png"
    if item.exists():
        paste(c,item,(81,176),(262,262))
    label(d,(64,474),"生命   11",30,CREAM)
    paste(c,UI/"hud"/"hp_bar_bg_320x42.png",(61,527),(296,34))
    paste(c,UI/"hud"/"hp_bar_fill_320x42.png",(65,531),(207,26))
    label(d,(58,593),"装备与关键词逐件叠在角色上",18,LAVENDER)
    label(d,(447,116),"拼合台",27,GOLD_L)
    label(d,(447,151),"把词组成招式。卡面按实际配件即时变化。",20,LAVENDER)
    words=[("选择","#927eb8"),("一个","#927eb8"),("敌方","#7778b8"),("随从","#7778b8"),
           ("造成",RED),("8",GOLD),("伤害",RED),("并",GREEN),("恢复",GREEN)]
    x=448
    for word,col in words:
        ww=72 if len(word)<=2 else 84
        d.rounded_rectangle((x,206,x+ww,270),radius=13,fill="#382d58",outline=col,width=3)
        label(d,(x+15,221),word,23,CREAM)
        x+=ww+10
    d.rounded_rectangle((445,302,1559,380),radius=17,fill="#2a2445",outline=GOLD,width=3)
    label(d,(471,316),"你选的敌方随从受到 8 点伤害；然后我方生命最低者恢复生命。",23,CREAM)
    label(d,(445,410),"当前招式用词",24,GOLD_L)
    for i,name in enumerate(("同调","回击","回春","免疫","重复","转化","伤害")):
        x=448+i*152
        d.rounded_rectangle((x,453,x+134,595),radius=14,fill="#3c315d",outline=LAVENDER,width=2)
        label(d,(x+21,493),name,25,CREAM)
    paste(c,UI/"buttons"/"button_secondary_normal_360x96.png",(1060,778),(210,77))
    paste(c,UI/"buttons"/"button_primary_normal_360x96.png",(1280,778),(275,77))
    d=ImageDraw.Draw(c)
    label(d,(1122,801),"取消",26,CREAM)
    label(d,(1310,801),"确定，拼好了",25,INK)
    label(d,(35,757),"设计示意：使用现有模块素材；布局、字体和交互仍待集成",18,LAVENDER)
    MOCK.mkdir(parents=True,exist_ok=True)
    c.convert("RGB").save(MOCK/"editor_skin_concept_1600x900.png")


def make_skin_preview():
    c=Image.new("RGBA",(1470,900),"#19152b")
    d=ImageDraw.Draw(c)
    label(d,(24,20),"WORD COMBAT  ·  ASTROLABE UI SKIN",30,GOLD_L)
    label(d,(24,65),"独立美术素材预览 · 未接入游戏",19,LAVENDER)
    cards=[
        "card_back_512x768.png","card_front_common_512x768.png",
        "card_front_rare_512x768.png","card_front_arcane_512x768.png",
    ]
    for i,name in enumerate(cards):
        x=30+i*228
        paste(c,UI/"cards"/name,(x,124),(196,294))
        label(ImageDraw.Draw(c),(x,434),("牌背","通用框","稀有框","秘术框")[i],18,CREAM)
    d=ImageDraw.Draw(c)
    label(d,(968,120),"状态徽章",22,GOLD_L)
    for i,name in enumerate(("狂振","易伤","沉默","护盾","牵连","升华")):
        x=965+(i%3)*151
        y=169+(i//3)*135
        paste(c,UI/"hud"/f"status_{name}_128.png",(x,y),(78,78))
        label(ImageDraw.Draw(c),(x+83,y+25),name,18,CREAM)
    labels=("normal","hover","pressed","disabled")
    for i,state in enumerate(labels):
        x=30+(i%2)*442
        y=500+(i//2)*119
        paste(c,UI/"buttons"/f"button_primary_{state}_360x96.png",(x,y),(360,96))
        label(ImageDraw.Draw(c),(x+135,y+28),state,25,INK if state!="disabled" else CREAM)
    paste_nine(c,UI/"panels"/"panel_9slice_192.png",(928,485),(506,241),(24,24,24,24))
    label(ImageDraw.Draw(c),(952,509),"可拉伸面板",24,CREAM)
    label(ImageDraw.Draw(c),(952,554),"四角保持原样，中间延展。",19,LAVENDER)
    paste(c,UI/"hud"/"ap_chip_128.png",(1064,592),(98,98))
    c.convert("RGB").save(ROOT/"preview_ui_skin.png")


def verify_ui():
    pngs=sorted(UI.rglob("*.png"))
    svgs=sorted(SRC.rglob("*.svg"))
    assert len(pngs)==len(svgs)==28,(len(pngs),len(svgs))
    for p in pngs:
        rel=p.relative_to(UI).with_suffix(".svg")
        svg=SRC/rel
        assert svg.exists(),rel
        image=Image.open(p)
        assert image.size[0]>0 and image.size[1]>0,p
        ET.parse(svg)
    print(f"UI skin: {len(pngs)} PNG/SVG pairs + 2 static mockups")


def main():
    panel("panel_9slice_192",192,192,"basic")
    panel("popup_9slice_256",256,256,"popup")
    panel("topbar_9slice_256x96",256,96,"top")
    tab(False);tab(True)
    for primary in (True,False):
        for state in ("normal","hover","pressed","disabled"):
            button(state,primary)
    card_front("card_front_common_512x768",GOLD,LAVENDER)
    card_front("card_front_rare_512x768",GOLD_L,CREAM)
    card_front("card_front_arcane_512x768","#bb9fe6",CYAN)
    card_back()
    hud()
    background()
    make_battle_mock()
    make_editor_mock()
    make_skin_preview()
    verify_ui()


if __name__=="__main__":
    main()

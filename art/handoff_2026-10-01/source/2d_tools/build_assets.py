"""Build modular 2D card ornaments and tintable UI glyphs.

Pillow/NumPy, deterministic, supersampled.  The generated PNGs are handoff
assets, deliberately outside godot/assets until the integrator reviews them.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]
REPO = HERE.parents[4]
CARD_DIR = ROOT / "assets" / "cards"
ICON_DIR = ROOT / "assets" / "icons"
OPTIONAL = ROOT / "optional"
PREVIEW = ROOT / "preview_2d.png"
S = 4
N = 256

INK = "#201733"
OUTLINE = "#362451"
INDIGO = "#363066"
VIOLET = "#786cb3"
LAVENDER = "#bdb1e6"
CREAM = "#fff3dd"
GOLD = "#e7bf70"
GOLD_L = "#fff0ad"
CYAN = "#a5dced"
RED = "#b66488"
GREEN = "#8ec4ab"


def sc(x):
    return round(x * S)


def pt(points):
    return [(sc(x), sc(y)) for x, y in points]


class Art:
    def __init__(self, size=N, height=None):
        self.size = size
        self.height = height if height is not None else size
        self.im = Image.new("RGBA", (size * S, self.height * S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def ellipse(self, box, fill, outline=None, width=0):
        self.d.ellipse(tuple(sc(v) for v in box), fill=fill, outline=outline,
                       width=sc(width) if outline else 0)

    def rect(self, box, fill, outline=None, width=0, radius=0):
        box = tuple(sc(v) for v in box)
        self.d.rounded_rectangle(box, radius=sc(radius), fill=fill,
                                 outline=outline, width=sc(width) if outline else 0)

    def poly(self, points, fill, outline=None, width=0):
        p = pt(points)
        self.d.polygon(p, fill=fill)
        if outline:
            self.d.line(p + [p[0]], fill=outline, width=sc(width), joint="curve")

    def line(self, points, fill, width=1):
        p = pt(points)
        self.d.line(p, fill=fill, width=sc(width), joint="curve")
        r = sc(width) // 2
        for q in (p[0], p[-1]):
            self.d.ellipse((q[0]-r, q[1]-r, q[0]+r, q[1]+r), fill=fill)

    def arc(self, box, start, end, fill, width):
        self.d.arc(tuple(sc(v) for v in box), start, end, fill=fill, width=sc(width))

    def star(self, cx, cy, r1, r2, n=5, fill=GOLD, outline=None, width=0, rot=-math.pi/2):
        q = []
        for i in range(n*2):
            a = rot + i*math.pi/n
            r = r1 if i % 2 == 0 else r2
            q.append((cx+math.cos(a)*r, cy+math.sin(a)*r))
        self.poly(q, fill, outline, width)

    def curve(self, start, c1, c2, end, fill, width, steps=32):
        q = []
        for i in range(steps+1):
            t = i/steps
            u = 1-t
            x = u**3*start[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t**3*end[0]
            y = u**3*start[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t**3*end[1]
            q.append((x,y))
        self.line(q, fill, width)

    def output(self, path, shadow=False):
        path.parent.mkdir(parents=True, exist_ok=True)
        image = self.im
        if shadow:
            alpha = image.getchannel("A")
            haze = Image.new("RGBA", image.size, (18, 12, 39, 0))
            sh = alpha.filter(ImageFilter.GaussianBlur(sc(4)))
            haze.putalpha(sh.point(lambda a: min(85, int(a*0.48))))
            base = Image.new("RGBA", image.size, (0,0,0,0))
            base.alpha_composite(haze, dest=(sc(3),sc(5)))
            base.alpha_composite(image)
            image = base
        image.resize((self.size, self.height), Image.Resampling.LANCZOS).save(path)


def ornament(a, x, y, r=5, color=GOLD_L):
    a.star(x,y,r,r*0.26,4,color,rot=math.pi/4)


def draw_part(name, a):
    if name == "shield":
        a.poly([(64,35),(192,35),(205,124),(174,187),(128,219),(82,187),(51,124)],
               INDIGO, GOLD, 10)
        a.poly([(77,51),(179,51),(185,118),(160,169),(128,193),(96,169),(71,118)],
               "#6562a2", CREAM, 5)
        a.line([(128,57),(128,188)], GOLD_L, 5)
        a.star(128,119,41,13,8,CREAM,GOLD,3)
        ornament(a,78,46,5); ornament(a,178,46,5)
    elif name == "cape":
        a.poly([(81,27),(169,28),(195,183),(159,163),(128,212),(92,166),(59,187)],
               "#5b315e", INK, 12)
        a.poly([(91,44),(162,44),(176,160),(151,149),(129,193),(103,147),(76,164)],
               "#a35581", GOLD, 5)
        a.curve((114,50),(92,91),(104,130),(89,160),CREAM,5)
        a.curve((146,50),(167,91),(158,134),(169,159),LAVENDER,5)
        a.ellipse((103,17,153,67), GOLD, INK, 7)
        a.star(128,42,16,7,5,CREAM)
    elif name == "thorns":
        a.poly([(34,193),(74,86),(88,156),(121,37),(145,150),(188,83),(222,191)],
               CREAM, INK, 10)
        a.poly([(43,190),(77,102),(91,173),(121,55),(142,167),(184,101),(212,187)],
               GOLD_L)
        a.arc((33,167,223,219),185,355,VIOLET,12)
        a.arc((36,174,220,220),180,355,GOLD,5)
    elif name == "vines":
        a.curve((46,210),(93,171),(70,88),(142,108),INK,16)
        a.curve((46,210),(93,171),(70,88),(142,108),GREEN,10)
        a.curve((142,108),(189,136),(203,71),(166,43),INK,16)
        a.curve((142,108),(189,136),(203,71),(166,43),GREEN,10)
        for pts in [
            [(76,162),(49,128),(37,93),(84,111),(95,143)],
            [(94,111),(99,65),(124,47),(132,94)],
            [(166,117),(183,70),(213,49),(206,101)],
            [(177,66),(143,39),(132,35),(147,76)],
        ]:
            a.poly(pts,"#b0ddae",INK,5)
        ornament(a,149,110,10,GOLD_L)
    elif name == "twin_ring":
        a.ellipse((36,61,166,191),None,GOLD,19)
        a.ellipse((91,61,221,191),None,CYAN,19)
        a.arc((36,61,166,191),305,80,GOLD_L,7)
        a.arc((91,61,221,191),110,250,CREAM,7)
        ornament(a,128,126,14,CREAM)
    elif name == "amulet":
        a.curve((51,39),(78,91),(175,91),(205,39),INK,15)
        a.curve((51,39),(78,91),(175,91),(205,39),GOLD,7)
        a.poly([(128,76),(183,133),(128,217),(73,133)],OUTLINE,GOLD,10)
        a.poly([(128,91),(167,137),(128,196),(88,137)],"#987fd1",CREAM,6)
        a.poly([(128,98),(145,138),(128,180),(111,138)],CYAN)
        ornament(a,128,129,11,CREAM)
    elif name == "ring_double":
        a.ellipse((30,30,226,226),None,GOLD,13)
        a.ellipse((65,65,191,191),None,CREAM,10)
        a.ellipse((91,91,165,165),None,LAVENDER,7)
        for x,y in [(46,83),(207,99),(82,205),(173,49)]:
            ornament(a,x,y,11,GOLD_L)
    elif name == "afterimage":
        a.ellipse((69,27,181,133),"#9e93d2",OUTLINE,8)
        a.poly([(69,91),(181,91),(194,212),(161,194),(128,218),(95,194),(61,212)],
               "#9e93d2",OUTLINE,8)
        a.ellipse((98,75,115,93),INK)
        a.ellipse((141,75,158,93),INK)
        a.curve((76,120),(109,147),(151,146),(178,120),CREAM,7)
        ornament(a,198,58,11,CYAN)
    elif name == "hourglass":
        a.rect((62,28,194,51),GOLD,INK,5,10)
        a.rect((62,204,194,227),GOLD,INK,5,10)
        a.line([(80,50),(80,205)],GOLD,10)
        a.line([(176,50),(176,205)],GOLD,10)
        a.poly([(88,55),(168,55),(158,94),(128,122),(98,94)],"#b6d9e4",INK,5)
        a.poly([(98,161),(128,133),(158,161),(168,200),(88,200)],"#b6d9e4",INK,5)
        a.poly([(100,185),(128,165),(156,185),(160,196),(96,196)],"#e9c784")
        a.line([(128,122),(128,164)],GOLD_L,6)
    elif name == "mirror":
        a.line([(128,164),(128,223)],INK,23)
        a.line([(128,164),(128,223)],GOLD,14)
        a.ellipse((54,17,202,180),GOLD,INK,10)
        a.ellipse((69,32,187,165),"#b8d7e8",CREAM,9)
        a.curve((82,131),(102,80),(148,67),(176,51),CREAM,12)
        ornament(a,162,84,11,CREAM)
    elif name == "wand":
        a.line([(54,214),(172,62)],INK,26)
        a.line([(54,214),(172,62)],GOLD,17)
        a.line([(67,197),(154,86)],CREAM,4)
        a.star(183,58,53,22,6,LAVENDER,INK,9)
        a.star(183,58,30,12,6,CREAM)
        ornament(a,76,69,10,CYAN)
    elif name == "sword":
        a.poly([(128,9),(153,77),(145,168),(128,188),(111,168),(103,77)],
               "#e8e9ee",INK,9)
        a.line([(128,24),(128,167)],CREAM,6)
        a.line([(61,166),(195,166)],INK,22)
        a.line([(65,166),(191,166)],GOLD,14)
        a.rect((117,176,139,227),GOLD,INK,6,8)
        a.ellipse((110,218,146,244),GOLD_L,INK,6)
    elif name == "halo":
        a.ellipse((27,86,229,158),None,INK,26)
        a.ellipse((27,86,229,158),None,GOLD,17)
        a.arc((27,86,229,158),195,345,CREAM,7)
        for x,y in [(51,89),(205,96),(126,50)]:
            ornament(a,x,y,10,GOLD_L)
    elif name == "buckler":
        a.ellipse((40,41,216,217),INDIGO,INK,11)
        a.ellipse((56,57,200,201),CYAN,GOLD,9)
        a.ellipse((79,80,177,178),"#668dbc",CREAM,6)
        a.star(128,129,47,18,6,GOLD_L,OUTLINE,5)
        ornament(a,66,129,6); ornament(a,190,129,6)
    elif name == "chains":
        for cx,cy,rot in [(64,107,0),(125,145,0),(188,106,0)]:
            a.ellipse((cx-47,cy-32,cx+47,cy+32),None,INK,25)
            a.ellipse((cx-47,cy-32,cx+47,cy+32),None,GOLD,15)
            a.arc((cx-47,cy-32,cx+47,cy+32),205,290,CREAM,6)
        ornament(a,125,145,6,CREAM)
    elif name == "mask":
        a.poly([(49,39),(207,39),(204,141),(170,196),(128,221),(86,196),(52,141)],
               CREAM,INK,11)
        a.poly([(62,48),(194,48),(187,123),(156,158),(128,165),(100,158),(69,123)],
               "#ddd0ed",GOLD,5)
        a.poly([(75,111),(111,101),(105,127),(83,129)],OUTLINE)
        a.poly([(145,101),(181,111),(173,129),(151,127)],OUTLINE)
        a.curve((102,174),(118,185),(138,185),(154,174),OUTLINE,7)
        ornament(a,128,62,12,GOLD)
    elif name == "book":
        a.poly([(37,56),(127,37),(219,57),(219,206),(128,190),(37,206)],
               OUTLINE,INK,10)
        a.poly([(47,67),(122,51),(122,183),(47,196)],"#eee4d5",GOLD,6)
        a.poly([(134,51),(209,67),(209,196),(134,183)],"#e3d3e6",GOLD,6)
        a.line([(128,47),(128,192)],GOLD_L,7)
        a.star(174,120,31,12,8,GOLD,OUTLINE,4)
        a.curve((60,83),(80,72),(100,72),(112,76),LAVENDER,5)
        a.curve((60,96),(80,87),(100,87),(112,90),LAVENDER,5)
    else:
        raise ValueError(name)


PART_NAMES = (
    "shield cape thorns vines twin_ring amulet ring_double afterimage "
    "hourglass mirror wand sword halo buckler chains mask book"
).split()


def draw_icon(kind, a):
    c = CREAM
    d = a
    if kind == "sword":
        d.poly([(128,12),(151,56),(144,166),(128,184),(112,166),(105,56)],c)
        d.line([(64,170),(192,170)],c,18)
        d.line([(128,175),(128,238)],c,17)
    elif kind == "shield":
        d.poly([(42,32),(214,32),(211,130),(173,194),(128,227),(83,194),(45,130)],c)
        d.poly([(73,58),(183,58),(182,127),(156,169),(128,190),(100,169),(74,127)],(0,0,0,0))
        # a central mark keeps the tiny silhouette legible
        d.star(128,119,37,13,4,c)
    elif kind == "spell":
        d.ellipse((99,99,157,157),c)
        for i in range(8):
            t = i*math.tau/8
            d.line([(128+45*math.cos(t),128+45*math.sin(t)),
                    (128+100*math.cos(t),128+100*math.sin(t))],c,16)
    elif kind == "bow":
        d.arc((28,31,173,225),275,85,c,19)
        d.line([(100,39),(100,217)],c,9)
        d.line([(71,128),(218,128)],c,15)
        d.poly([(235,128),(190,101),(190,155)],c)
    elif kind == "wisp":
        d.ellipse((68,40,188,160),c)
        d.poly([(68,107),(188,107),(184,223),(155,199),(128,224),(101,199),(72,223)],c)
        d.ellipse((99,102,116,120),(0,0,0,0))
        d.ellipse((140,102,157,120),(0,0,0,0))
    elif kind == "slash":
        d.line([(47,218),(210,36)],c,29)
        d.line([(65,230),(218,71)],c,12)
    elif kind == "burst":
        d.star(128,128,112,47,10,c)
    elif kind == "cross":
        d.rect((103,25,153,231),c,radius=9)
        d.rect((25,103,231,153),c,radius=9)
    elif kind == "leaf":
        d.poly([(34,202),(48,100),(137,31),(226,30),(211,132),(136,209)],c)
        d.line([(48,216),(180,83)],c,15)
    elif kind == "mirror":
        d.poly([(128,20),(211,128),(128,236),(45,128)],c)
        d.line([(128,34),(128,222)],c,14)
    elif kind == "swap":
        d.line([(31,84),(194,84)],c,22)
        d.poly([(231,84),(177,48),(177,120)],c)
        d.line([(225,172),(62,172)],c,22)
        d.poly([(25,172),(79,136),(79,208)],c)
    elif kind == "clock":
        d.ellipse((27,27,229,229),None,c,23)
        d.line([(128,128),(128,68)],c,20)
        d.line([(128,128),(178,154)],c,20)
    elif kind == "drop":
        d.poly([(128,15),(58,125),(47,165),(61,207),(96,233),(160,233),(195,207),(209,165),(198,125)],c)
    elif kind == "split":
        d.line([(128,231),(128,133)],c,22)
        d.line([(128,133),(49,45)],c,22)
        d.line([(128,133),(207,45)],c,22)
        d.poly([(45,21),(28,92),(85,57)],c)
        d.poly([(211,21),(171,57),(228,92)],c)
    elif kind == "swirl":
        d.arc((34,34,222,222),22,330,c,23)
        d.poly([(227,89),(166,89),(203,143)],c)
        d.ellipse((109,109,147,147),c)
    elif kind == "stack":
        for y in (45,104,163):
            d.rect((39,y,217,y+43),c,radius=9)
    elif kind == "arrow":
        d.line([(23,128),(181,128)],c,25)
        d.poly([(237,128),(153,62),(153,194)],c)
    elif kind == "coin":
        d.ellipse((25,25,231,231),c)
        d.ellipse((62,62,194,194),(0,0,0,0))
        d.star(128,128,44,17,5,c)
    elif kind == "ghost":
        d.ellipse((62,32,194,164),c)
        d.poly([(62,112),(194,112),(194,223),(168,208),(142,226),(113,207),(87,226),(62,208)],c)
    elif kind == "star":
        d.star(128,128,105,43,5,c)
    else:
        raise ValueError(kind)


ICON_NAMES = (
    "sword shield spell bow wisp slash burst cross leaf mirror swap clock "
    "drop split swirl stack arrow coin ghost star"
).split()


def write_ornament():
    for name in PART_NAMES:
        art = Art()
        draw_part(name, art)
        art.output(CARD_DIR / (name+".png"),shadow=True)


def write_icons():
    for name in ICON_NAMES:
        art = Art()
        draw_icon(name, art)
        art.output(ICON_DIR / (name+".png"))


def optional_assets():
    # Not wired to an existing loader: reusable, transparent visual language sheets.
    a=Art(512,768)
    a.rect((14,14,498,754),None,GOLD,6,27)
    a.rect((25,25,487,743),None,LAVENDER,4,20)
    a.rect((36,36,476,732),None,CREAM,2,14)
    for x in (49,463):
        for y in (49,719):
            a.star(x,y,13,4,4,GOLD_L)
    a.output(OPTIONAL/"card_frame_common_512x768.png")

    a=Art(512,768)
    a.rect((12,12,500,756),None,GOLD_L,9,27)
    a.rect((26,26,486,742),None,GOLD,5,18)
    a.rect((41,41,471,727),None,CREAM,2,12)
    for x in (46,466):
        for y in (46,722):
            a.star(x,y,19,7,4,GOLD_L)
    for x,y in ((256,27),(256,741),(27,384),(485,384)):
        a.star(x,y,15,4,4,GOLD_L)
    a.output(OPTIONAL/"card_frame_rare_512x768.png")

    # Full card back is a separate optional mockup, not a card-face layer.
    a=Art(512,768)
    a.rect((5,5,507,763),INK,GOLD,12,30)
    # A restrained enamel surface: centre glow, vignette and fine grain.
    rng=random.Random(93021)
    lo=Image.new("RGBA",(512,768),(0,0,0,0))
    pix=lo.load()
    for yy in range(768):
        for xx in range(512):
            dist=((xx-256)/360)**2+((yy-350)/610)**2
            glow=max(0.0,1.0-dist)
            grain=rng.randrange(-3,4)
            pix[xx,yy]=(max(0,int(45+18*glow+grain)),
                        max(0,int(38+13*glow+grain)),
                        max(0,int(87+29*glow+grain)),255)
    m=Image.new("L",(512,768),0)
    ImageDraw.Draw(m).rounded_rectangle((22,22,490,746),radius=22,fill=255)
    lo.putalpha(m)
    a.im.alpha_composite(lo.resize((512*S,768*S),Image.Resampling.BICUBIC))
    a.rect((22,22,490,746),None,LAVENDER,5,22)
    a.rect((38,38,474,730),None,CREAM,2,15)
    a.ellipse((64,192,448,576),None,LAVENDER,5)
    a.ellipse((88,216,424,552),None,GOLD,3)
    a.ellipse((135,263,377,505),None,LAVENDER,3)
    a.star(256,384,100,29,8,GOLD_L,INK,7)
    a.star(256,384,57,17,8,CREAM)
    for x,y in ((68,69),(444,69),(68,699),(444,699)):
        a.star(x,y,18,6,4,GOLD_L)
    for i in range(12):
        t=math.tau*i/12
        a.star(256+175*math.cos(t),384+175*math.sin(t),7,3,4,CREAM)
    a.output(OPTIONAL/"card_back_512x768.png")

    a=Art(512)
    for radius, color, wid in [(235,GOLD,4),(204,LAVENDER,3),(171,GOLD_L,3),(130,LAVENDER,2)]:
        a.ellipse((256-radius,256-radius,256+radius,256+radius),None,color,wid)
    for i in range(12):
        t=math.tau*i/12
        a.line([(256+175*math.cos(t),256+175*math.sin(t)),
                (256+227*math.cos(t),256+227*math.sin(t))],GOLD_L,3)
    for i in range(8):
        t=math.tau*i/8-math.pi/2
        a.star(256+196*math.cos(t),256+196*math.sin(t),10,3,4,CREAM)
    a.star(256,256,116,30,8,LAVENDER)
    a.output(OPTIONAL/"summon_circle_512.png")

    a=Art(512)
    for i in range(40):
        t=math.tau*i/40
        r0=33 if i%2 else 45
        r1=248 if i%2 else 214
        p=[(256+r0*math.cos(t-.025),256+r0*math.sin(t-.025)),
           (256+r1*math.cos(t),256+r1*math.sin(t)),
           (256+r0*math.cos(t+.025),256+r0*math.sin(t+.025))]
        a.poly(p,(255,237,170,54 if i%2 else 89))
    a.ellipse((191,191,321,321),(255,250,207,200))
    a.output(OPTIONAL/"reveal_rays_512.png")

    # Separate broad, translucent rear light for a rare reveal.  The fine
    # rays above stay in front; this one belongs behind the featured card.
    import numpy as np
    side=1024
    yy,xx=np.mgrid[0:side,0:side].astype(np.float32)
    dx=(xx-side*0.5)/(side*0.5)
    dy=(yy-side*0.5)/(side*0.5)
    rr=np.sqrt(dx*dx+dy*dy)
    ang=np.arctan2(dy,dx)
    fan=0.78*np.maximum(0.0,np.cos(13.0*ang+0.17*np.sin(4.0*ang)))**2
    fan+=0.48*np.maximum(0.0,np.cos(19.0*ang+0.36))**3
    fan+=0.22*np.maximum(0.0,np.cos(8.0*ang-0.18))**1.5
    fan=np.minimum(fan,1.0)
    falloff=np.exp(-((rr/1.20)**1.8))
    core=np.exp(-((rr/0.19)**2.0))
    alpha=np.clip((0.72*fan*falloff+0.90*core)*255,0,255).astype(np.uint8)
    warm=np.clip(rr,0.0,1.0)
    rgba=np.zeros((side,side,4),dtype=np.uint8)
    rgba[...,0]=255
    rgba[...,1]=np.clip(249-37*warm,0,255).astype(np.uint8)
    rgba[...,2]=np.clip(220-91*warm,0,255).astype(np.uint8)
    rgba[...,3]=alpha
    Image.fromarray(rgba,"RGBA").save(OPTIONAL/"reveal_rays_soft_1024.png")

    a=Art(512)
    for i in range(42):
        t=i*2.399963
        rad=14+7.1*i
        x=256+math.cos(t)*rad
        y=256+math.sin(t)*rad
        r=3+(i%4)
        a.star(x,y,r*2,r*.55,4,GOLD_L if i%3 else CREAM)
    a.output(OPTIONAL/"stardust_512.png")


def preview():
    names=[("cards",n) for n in PART_NAMES]+[("icons",n) for n in ICON_NAMES]
    cell=172
    cols=7
    rows=math.ceil(len(names)/cols)
    bg=Image.new("RGB",(cols*cell,rows*cell+76),"#231b3c")
    d=ImageDraw.Draw(bg)
    d.text((24,22),"WORD COMBAT  |  modular 2D art kit",fill="#fff3dd")
    for i,(folder,name) in enumerate(names):
        x=(i%cols)*cell
        y=(i//cols)*cell+76
        d.rounded_rectangle((x+7,y+7,x+cell-7,y+cell-7),radius=13,fill="#322849",outline="#8d779c",width=2)
        im=Image.open((CARD_DIR if folder=="cards" else ICON_DIR)/(name+".png")).convert("RGBA")
        im.thumbnail((120,120),Image.Resampling.LANCZOS)
        bg.paste(im,(x+(cell-im.width)//2,y+10),im)
        d.text((x+13,y+138),name,fill="#f4e6cc")
    bg.save(PREVIEW)

    small=Image.new("RGB",(900,395),"#241c40")
    sd=ImageDraw.Draw(small)
    sd.text((20,15),"Actual UI scale: 34px attachments / 32px icons",fill="#fff3dd")
    for idx,name in enumerate(PART_NAMES):
        x=20+(idx%9)*97
        y=55+(idx//9)*92
        item=Image.open(CARD_DIR/(name+".png")).convert("RGBA")
        item=item.resize((34,34),Image.Resampling.LANCZOS)
        small.paste(item,(x+28,y),item)
        sd.text((x,y+44),name,fill="#f2dfbd")
    for idx,name in enumerate(ICON_NAMES):
        x=20+(idx%10)*88
        y=239+(idx//10)*73
        item=Image.open(ICON_DIR/(name+".png")).convert("RGBA")
        item=item.resize((32,32),Image.Resampling.LANCZOS)
        small.paste(item,(x+27,y),item)
        sd.text((x,y+37),name,fill="#f2dfbd")
    small.save(ROOT/"preview_small_scale.png")

    # Exact card_face.gd SLOT_POS at 4x, for the art integrator to judge scale.
    w,h=156,206
    mul=4
    card=Image.new("RGBA",(w*mul,h*mul),"#241c40")
    dd=ImageDraw.Draw(card)
    dd.rounded_rectangle((3*mul,3*mul,153*mul,203*mul),radius=14*mul,
                         fill="#2d2853",outline=GOLD,width=3*mul)
    dd.rounded_rectangle((8*mul,28*mul,148*mul,176*mul),radius=8*mul,
                         fill="#342d60",outline=LAVENDER,width=1*mul)
    def paste(name,x,y,side):
        item=Image.open(CARD_DIR/(name+".png")).convert("RGBA")
        item=item.resize((side*mul,side*mul),Image.Resampling.LANCZOS)
        card.alpha_composite(item,(x*mul,y*mul))
    paste("cape",14,64,40)       # back: center (34,84)
    if (CARD_DIR/"body_剑.png").exists():
        paste("body_剑",30,70,96)
    paste("halo",61,35,34)      # head: center (78,52)
    paste("shield",8,126,40)    # hand_l: center (28,146)
    paste("sword",108,126,40)   # hand_r: center (128,146)
    card.resize((624,824),Image.Resampling.LANCZOS).save(ROOT/"preview_card_assembly.png")


def verify():
    app=json.loads((REPO/"godot/data/appearance.json").read_text(encoding="utf-8"))
    required={r["proc"] for r in app["rules"]}
    assert required==set(PART_NAMES),(required-set(PART_NAMES),set(PART_NAMES)-required)
    for folder,names in ((CARD_DIR,PART_NAMES),(ICON_DIR,ICON_NAMES)):
        for name in names:
            im=Image.open(folder/(name+".png"))
            assert im.size==(256,256) and im.mode=="RGBA",(name,im.size,im.mode)
            alpha=im.getchannel("A")
            assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]==255,name
    print(f"verified {len(PART_NAMES)} card attachments + {len(ICON_NAMES)} tintable icons")


if __name__=="__main__":
    write_ornament()
    write_icons()
    optional_assets()
    preview()
    verify()

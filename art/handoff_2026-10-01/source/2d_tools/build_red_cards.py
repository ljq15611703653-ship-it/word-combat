"""Original black / wine-red / bright-yellow rounded metal card skin.
Run after build_ui_skin.py. No game code is touched. Produces standalone art only.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
import math

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'ui' / 'cards'
SVG = ROOT / 'source' / 'svg' / 'cards'
OPT = ROOT / 'optional'
PRE = ROOT / 'previews'
for p in (OUT, SVG, OPT, PRE, OUT / 'glint'):
    p.mkdir(parents=True, exist_ok=True)
W,H=512,768
BLACK=(13,11,16)
WINE=(53,9,25)
RED=(114,20,39)
YELLOW=(255,229,59)
CREAM=(255,250,186)

def rr(box, radius):
    # Fourfold mask gives soft, rounded corners even at card-size reduction.
    ss=4
    m=Image.new('L',(W*ss,H*ss),0)
    d=ImageDraw.Draw(m)
    d.rounded_rectangle(tuple(int(v*ss) for v in box),radius=int(radius*ss),fill=255)
    return m.resize((W,H),Image.Resampling.LANCZOS)

def band(outer, inner, ro, ri):
    a=rr(outer,ro)
    b=rr(inner,ri)
    return Image.fromarray(np.maximum(0,np.asarray(a,dtype=np.int16)-np.asarray(b,dtype=np.int16)).astype('uint8'),'L')

def fill_gradient(mask, top, bottom, shade=0.0, shine=0.0):
    y,x=np.mgrid[0:H,0:W].astype(np.float32)
    t=y/(H-1)
    top=np.array(top,dtype=np.float32); bottom=np.array(bottom,dtype=np.float32)
    rgb=(1-t[...,None])*top + t[...,None]*bottom
    # A warm lengthwise reflection and a short glint on the upper-left bevel.
    if shade:
        v=np.exp(-((x - (W*.24 + y*.11))/54.0)**2)*shade
        rgb=rgb+(np.array(CREAM,dtype=np.float32)-rgb)*v[...,None]
    if shine:
        v=np.exp(-((y-(31+x*.17))/12.0)**2)*shine
        rgb=rgb+(np.array((255,255,220),dtype=np.float32)-rgb)*v[...,None]
    rgba=np.dstack((np.clip(rgb,0,255).astype('uint8'),np.asarray(mask,dtype='uint8')))
    return Image.fromarray(rgba,'RGBA')

def bg_back():
    y,x=np.mgrid[0:H,0:W].astype(np.float32)
    center=np.exp(-(((x-256)/270)**2+((y-385)/350)**2)*1.7)
    side=np.maximum(0,1-np.abs(x-256)/256)
    base=np.zeros((H,W,4),dtype=np.uint8)
    base[:,:,:3]=np.clip(np.array(BLACK)[None,None,:] + center[...,None]*np.array((53,7,23))[None,None,:] + side[...,None]*np.array((10,2,5))[None,None,:],0,255).astype('uint8')
    base[:,:,3]=np.asarray(rr((7,7,505,761),33))
    return Image.fromarray(base,'RGBA')

def metal_layer(bright=1.0):
    outer=band((7,7,505,761),(25,25,487,743),33,25)
    metal=fill_gradient(outer,(255,246,129) if bright else (198,64,73),(148,83,21) if bright else (65,13,28),.32,.65)
    # A slim near-white top ridge and dark lower bevel make the border convex.
    hi=band((10,10,502,758),(14,14,498,754),30,28)
    metal.alpha_composite(fill_gradient(hi,(255,254,202) if bright else (255,214,123),(232,184,54) if bright else (166,42,53),.18,.72))
    inner=band((25,25,487,743),(29,29,483,739),25,22)
    metal.alpha_composite(fill_gradient(inner,(57,18,27),(25,10,16),.09,0))
    return metal,outer

def ring(im, outer, inner, radius_outer, radius_inner, colors):
    m=band(outer,inner,radius_outer,radius_inner)
    im.alpha_composite(fill_gradient(m,colors[0],colors[1],.33,.35))
    return m

def corner_etch(im, box, size=29):
    """Quiet engraved vines inside all four corners; no reference-video motif."""
    d=ImageDraw.Draw(im)
    x0,y0,x1,y1=box
    def curve(points, color, width):
        # Sample a cubic rather than drawing a hard rectangular ornament.
        p0,p1,p2,p3=points
        route=[]
        for i in range(13):
            t=i/12; u=1-t
            route.append((round(u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0]),
                          round(u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1])))
        d.line(route, fill=color, width=width, joint='curve')
    for left in (True,False):
        for top in (True,False):
            sx=1 if left else -1; sy=1 if top else -1
            cx=x0+11 if left else x1-11
            cy=y0+11 if top else y1-11
            pts=[(cx,cy+sy*size),(cx,cy+sy*6),(cx+sx*6,cy),(cx+sx*size,cy)]
            d.line(pts,fill=(75,17,27,200),width=7,joint='curve')
            d.line(pts,fill=(245,203,83,170),width=3,joint='curve')
            # Two asymmetric leaves follow the bracket, like restrained metal engraving.
            vine=[(cx+sx*8,cy+sy*15),(cx+sx*12,cy+sy*17),
                  (cx+sx*21,cy+sy*16),(cx+sx*24,cy+sy*10)]
            curve(vine,(75,17,27,165),5)
            curve(vine,(250,209,92,165),2)
            curl=[(cx+sx*16,cy+sy*9),(cx+sx*20,cy+sy*7),
                  (cx+sx*24,cy+sy*11),(cx+sx*22,cy+sy*14)]
            curve(curl,(255,232,125,135),2)
            for ox,oy in ((size+5,0),(0,size+5)):
                px=cx+sx*ox; py=cy+sy*oy
                d.ellipse((px-2,py-2,px+2,py+2),fill=(255,226,111,145))

def emboss(im):
    d=ImageDraw.Draw(im)
    # Two interlocking broken brackets, an original emblem for combining words.
    left=[(178,325),(215,325),(254,383),(215,441),(178,441),(217,383)]
    right=[(334,325),(297,325),(258,383),(297,441),(334,441),(295,383)]
    for pts in (left,right):
        d.line(pts+[pts[0]],fill=(50,13,25,255),width=22,joint='curve')
        d.line(pts+[pts[0]],fill=(248,208,59,255),width=12,joint='curve')
        d.line(pts+[pts[0]],fill=(255,251,178,200),width=3,joint='curve')
    # An open seam, not the star/compass decoration of the reference video.
    for yy in (285,481):
        d.line((184,yy,230,yy),fill=(188,59,56,170),width=4)
        d.line((282,yy,328,yy),fill=(188,59,56,170),width=4)
    d.polygon([(256,373),(270,383),(256,393),(242,383)],fill=(255,237,84,255))

def back_card():
    im=bg_back()
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((34,34,478,734),radius=22,outline=(116,30,46,255),width=8)
    d.rounded_rectangle((43,43,469,725),radius=17,outline=(242,203,59,190),width=2)
    # Red lacquer grooves (not circular star chart).
    for off in (0,10,20):
        d.line((82+off,145,82+off,242),fill=(91,24,42,115),width=2)
        d.line((430-off,526,430-off,623),fill=(91,24,42,115),width=2)
    emboss(im)
    metal,m=metal_layer(False)
    im.alpha_composite(metal)
    corner_etch(im,(43,43,469,725),26)
    for yy in (64,704):
        d=ImageDraw.Draw(im)
        d.rounded_rectangle((214,yy,298,yy+7),radius=3,fill=(255,225,67,220))
    return im,m

def front_card(kind):
    im=Image.new('RGBA',(W,H),(0,0,0,0))
    # Black-red lacquer bezel; art aperture stays transparent for modular body layers.
    base=bg_back()
    im.alpha_composite(base)
    d=ImageDraw.Draw(im)
    art=(43,70,469,551)
    d.rounded_rectangle(art,radius=18,fill=(0,0,0,0))
    # Bottom name/skill plate is dark black, with restrained red reflection.
    d.rounded_rectangle((39,573,473,724),radius=18,fill=(17,12,18,255),outline=(113,27,43,255),width=5)
    for yy,al in [(586,95),(594,45)]:
        d.line((61,yy,451,yy),fill=(197,36,54,al),width=3)
    if kind=='common':
        art_top,art_bottom=(221,152,47),(121,65,25)
        title_top,title_bottom=(234,179,53),(102,53,22)
        bright=False
    elif kind=='rare':
        art_top,art_bottom=(255,242,133),(181,89,28)
        title_top,title_bottom=(247,205,93),(139,62,28)
        bright=False
    else:
        art_top,art_bottom=(255,218,69),(137,49,71)
        title_top,title_bottom=(247,210,77),(103,37,56)
        bright=True
    metal,m=metal_layer(bright)
    im.alpha_composite(metal)
    artmask=ring(im,(34,60,478,561),(43,70,469,551),23,18,(art_top,art_bottom))
    if kind=='rare':
        ring(im,(45,72,467,549),(48,75,464,546),17,15,((255,253,213),(226,160,65)))
    titlemask=ring(im,(35,570,477,730),(42,577,470,723),18,14,(title_top,title_bottom))
    # Rounded corner studs, the word-combat 'join' mark instead of a star motif.
    d=ImageDraw.Draw(im)
    for x in (54,458):
        for y in (42,744):
            d.ellipse((x-5,y-5,x+5,y+5),fill=(255,245,160,255),outline=(96,47,23,255),width=2)
    corner_etch(im,(43,70,469,551),27)
    d.polygon([(242,32),(270,32),(282,42),(270,52),(242,52),(230,42)],fill=(34,12,20,255),outline=(255,229,59,255))
    if kind=='rare':
        d.rounded_rectangle((49,34,128,59),radius=9,fill=(43,8,20,255),outline=(244,208,70,255),width=3)
        d.polygon([(435,33),(447,45),(435,57),(423,45)],fill=(255,236,86,255),outline=(103,44,22,255))
        for xx in (73,90,107):
            d.polygon([(xx,647),(xx+7,655),(xx,663),(xx-7,655)],fill=(250,211,74,220))
    return im,Image.fromarray(np.maximum.reduce([np.asarray(m),np.asarray(artmask),np.asarray(titlemask)]).astype('uint8'),'L')

def make_glint(metalmask):
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    mm=np.asarray(metalmask,dtype=np.float32)/255.0
    frames=[]
    for i in range(12):
        center=-210+i*(980/11)
        dist=xx + .62*yy-center
        broad=np.exp(-(dist/58.0)**2)*78
        core=np.exp(-(dist/10.0)**2)*155
        alpha=np.clip((broad+core)*mm,0,230).astype('uint8')
        arr=np.zeros((H,W,4),dtype=np.uint8)
        arr[:,:,:3]=(255,250,180)
        arr[:,:,3]=alpha
        frames.append(Image.fromarray(arr,'RGBA'))
    return frames

def svg_source(kind):
    red=kind in ('back','common','rare')
    if red:
        stops='<stop stop-color="#ffb96c"/><stop offset=".22" stop-color="#cd4551"/><stop offset=".58" stop-color="#570e25"/><stop offset=".82" stop-color="#ef8a66"/><stop offset="1" stop-color="#3f0b1d"/>'
    else:
        stops='<stop stop-color="#fffbc5"/><stop offset=".22" stop-color="#ffe53c"/><stop offset=".58" stop-color="#a95d1f"/><stop offset=".82" stop-color="#ffe879"/><stop offset="1" stop-color="#754218"/>'
    defs=f'<defs><linearGradient id="lacquer" x2=".8" y2="1"><stop stop-color="#4b1128"/><stop offset=".52" stop-color="#190c17"/><stop offset="1" stop-color="#090a0f"/></linearGradient><linearGradient id="metal" x2=".7" y2="1">{stops}</linearGradient><mask id="bodyMask"><rect width="512" height="768" fill="white"/>'
    if kind != 'back':
        defs+='<rect x="43" y="70" width="426" height="481" rx="18" fill="black"/>'
    defs+='</mask></defs>'
    body='<rect x="7" y="7" width="498" height="754" rx="33" fill="url(#lacquer)" mask="url(#bodyMask)"/><rect x="14" y="14" width="484" height="740" rx="29" fill="none" stroke="url(#metal)" stroke-width="17"/><rect x="27" y="27" width="458" height="714" rx="24" fill="none" stroke="#320b1a" stroke-width="5"/>'
    if kind == 'back':
        body+='<rect x="39" y="39" width="434" height="690" rx="17" fill="none" stroke="#f6d348" stroke-width="2"/>'
        body+='<path d="M178 325 H215 L254 383 L215 441 H178 L217 383 Z M334 325 H297 L258 383 L297 441 H334 L295 383 Z" fill="none" stroke="#421021" stroke-width="22" stroke-linejoin="round"/>'
        body+='<path d="M178 325 H215 L254 383 L215 441 H178 L217 383 Z M334 325 H297 L258 383 L297 441 H334 L295 383 Z" fill="none" stroke="#ffe43b" stroke-width="12" stroke-linejoin="round"/>'
        body+='<path d="M178 325 H215 L254 383 L215 441 H178 L217 383 Z M334 325 H297 L258 383 L297 441 H334 L295 383 Z" fill="none" stroke="#fffbc1" stroke-width="3" stroke-linejoin="round"/>'
        corner_box=(43,43,469,725); corner_size=26
    else:
        body+='<rect x="38" y="65" width="436" height="491" rx="20" fill="none" stroke="url(#metal)" stroke-width="10"/>'
        body+='<rect x="39" y="573" width="434" height="151" rx="17" fill="#110c12" stroke="url(#metal)" stroke-width="7"/>'
        body+='<path d="M230 42 L242 32 H270 L282 42 L270 52 H242 Z" fill="#220c17" stroke="#ffe43b" stroke-width="2"/>'
        corner_box=(43,70,469,551); corner_size=27
    x0,y0,x1,y1=corner_box
    for left in (True,False):
        for top in (True,False):
            cx=x0+11 if left else x1-11
            cy=y0+11 if top else y1-11
            sx=1 if left else -1; sy=1 if top else -1
            body+=f'<g transform="translate({cx} {cy}) scale({sx} {sy})">'
            body+=f'<path d="M0 {corner_size} V6 Q0 0 6 0 H{corner_size}" fill="none" stroke="#4b111b" stroke-width="7" stroke-linejoin="round"/>'
            body+=f'<path d="M0 {corner_size} V6 Q0 0 6 0 H{corner_size}" fill="none" stroke="#f5cb53" stroke-opacity=".67" stroke-width="3" stroke-linejoin="round"/>'
            body+='<path d="M8 15 C12 17 21 16 24 10 M16 9 C20 7 24 11 22 14" fill="none" stroke="#fadd83" stroke-opacity=".65" stroke-width="2"/>'
            body+=f'<circle cx="{corner_size+5}" cy="0" r="2" fill="#ffe26f" fill-opacity=".6"/><circle cx="0" cy="{corner_size+5}" r="2" fill="#ffe26f" fill-opacity=".6"/></g>'
    return '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="768" viewBox="0 0 512 768">'+defs+body+'</svg>\n'

art={}
back,mask=back_card();art['card_back_512x768']=back
for kind in ('common','rare','arcane'):
    img,_=front_card(kind)
    art[f'card_front_{kind}_512x768']=img
for name,img in art.items():
    img.save(OUT/(name+'.png'))
    (SVG/(name+'.svg')).write_text(svg_source('back' if name.startswith('card_back') else name.split('_')[-2]),encoding='utf-8')
    runtime=OUT/'runtime_156x206'
    runtime.mkdir(exist_ok=True)
    img.resize((156,206),Image.Resampling.LANCZOS).save(runtime/(name+'_156x206.png'))
# Dynamic foil is delivered separately; it follows the rounded metal mask only.
mask.save(OUT/'glint'/'metal_border_mask.png')
frames=make_glint(mask)
for i,frame in enumerate(frames):
    frame.save(OUT/'glint'/f'border_glint_{i:02d}.png')
preview=[]
for frame in frames:
    comp=back.copy();comp.alpha_composite(frame)
    preview.append(comp.resize((256,384),Image.Resampling.LANCZOS).convert('RGB'))
preview[0].save(PRE/'card_metal_glint.gif',save_all=True,append_images=preview[1:],duration=80,loop=0,optimize=False)
# Keep optional legacy-named pieces pointing at the updated original design.
back.save(OPT/'card_back_512x768.png')
art['card_front_common_512x768'].save(OPT/'card_frame_common_512x768.png')
art['card_front_rare_512x768'].save(OPT/'card_frame_rare_512x768.png')
# All four together at readable scale.
show=Image.new('RGBA',(4*260,420),(22,11,19,255))
for i,img in enumerate(art.values()):
    show.alpha_composite(img.resize((256,384),Image.Resampling.LANCZOS),(i*260+2,16))
show.convert('RGB').save(PRE/'red_black_yellow_card_set.png')
# Independent art-window backings keep character sprites and frames modular.
for mood in ('common','rare'):
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    r=((xx-256)/250.0)**2+((yy-305)/280.0)**2
    light=np.exp(-r*1.8)
    if mood=='rare':
        dark=np.array((34,11,21),dtype=np.float32)
        warm=np.array((178,77,42),dtype=np.float32)
    else:
        dark=np.array((25,10,20),dtype=np.float32)
        warm=np.array((108,28,45),dtype=np.float32)
    rgb=dark[None,None,:]+light[...,None]*(warm-dark)[None,None,:]
    slash=np.exp(-((xx+0.48*yy-384)/58.0)**2)*(.25 if mood=='rare' else .13)
    rgb=rgb+slash[...,None]*(np.array((255,231,126),dtype=np.float32)-rgb)
    mask=rr((43,70,469,551),18)
    arr=np.dstack((np.clip(rgb,0,255).astype('uint8'),np.asarray(mask,dtype='uint8')))
    backing=Image.fromarray(arr,'RGBA')
    dots=Image.new('RGBA',(W,H));dd=ImageDraw.Draw(dots)
    import random
    rng=random.Random(115 if mood=='rare' else 79)
    for j in range(31 if mood=='rare' else 17):
        sx=rng.randint(64,448);sy=rng.randint(92,525)
        rradius=2 if j%6==0 else 1
        dd.ellipse((sx-rradius,sy-rradius,sx+rradius,sy+rradius),fill=(255,235,144,115 if mood=='rare' else 75))
    dots.putalpha(Image.fromarray((np.asarray(dots.getchannel('A'),dtype=np.float32)*np.asarray(mask,dtype=np.float32)/255).astype('uint8'),'L'))
    backing.alpha_composite(dots)
    backing.save(OUT/f'art_backing_{mood}_512x768.png')
# A complete card for visual QA. Body art, backdrop, metal frame and type remain separate.
wisp=ROOT/'assets'/'cards'/'body_魂.png'
if wisp.exists():
    qa=Image.open(OUT/'art_backing_rare_512x768.png').convert('RGBA')
    body=Image.open(wisp).convert('RGBA').resize((348,348),Image.Resampling.LANCZOS)
    qa.alpha_composite(body,(82,128))
    qa.alpha_composite(art['card_front_rare_512x768'])
    ink=ImageDraw.Draw(qa)
    try:
        font_big=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',36)
        font_small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
    except OSError:
        font_big=font_small=ImageFont.load_default()
    ink.text((59,37),'珍藏',font=font_small,fill=(255,242,168),stroke_width=0)
    ink.text((256,596),'魂使',font=font_big,fill=(255,242,168),anchor='mt')
    ink.text((256,667),'未写下的词',font=font_small,fill=(193,150,139),anchor='mt')
    qa.save(PRE/'rare_card_with_corner_ornaments.png')
    qa.save(PRE/'rare_card_v2_assembled.png')
    row=Image.new('RGBA',(1130,280),(19,10,20,255))
    small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',34) if Path('C:/Windows/Fonts/msyh.ttc').exists() else ImageFont.load_default()
    figures=[('剑','剑灵'),('盾','盾卫'),('咒','咒师'),('弓','弓手'),('魂','魂使')]
    for j,(key,label) in enumerate(figures):
        sample=Image.open(OUT/f'art_backing_{"rare" if key=="魂" else "common"}_512x768.png').convert('RGBA')
        figure=Image.open(ROOT/'assets'/'cards'/f'body_{key}.png').convert('RGBA').resize((348,348),Image.Resampling.LANCZOS)
        sample.alpha_composite(figure,(82,128))
        sample.alpha_composite(art[f'card_front_{"rare" if key=="魂" else "common"}_512x768'])
        ImageDraw.Draw(sample).text((256,602),label,font=small,fill=(255,237,164),anchor='mt')
        row.alpha_composite(sample.resize((150,225),Image.Resampling.LANCZOS),(25+j*185,27))
    row.alpha_composite(back.resize((150,225),Image.Resampling.LANCZOS),(25+5*185,27))
    row.convert('RGB').save(PRE/'red_cards_on_characters.png')
print('red-black-yellow card kit saved:',OUT)


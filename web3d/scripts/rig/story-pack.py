"""Pack user-authorized separated component sheets into the existing Canvas rig format."""
from pathlib import Path
from PIL import Image
import json, sys, shutil
import numpy as np
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[3]
names=['head','body','upper_far','fore_far','hand_far','upper_near','fore_near','hand_near','thigh_far','shin_far','boot_far','thigh_near','shin_near','boot_near','accessory','controller']
def build(name,source):
    out=ROOT/'web3d/public/duanju/art'/('story_'+name)/'rig'
    out.mkdir(parents=True,exist_ok=True)
    im=Image.open(source).convert('RGBA'); w,h=im.size
    pieces={}
    labels,count=ndimage.label(ndimage.binary_dilation(np.array(im)[:,:,3]>20,iterations=3))
    for i,sl in enumerate(ndimage.find_objects(labels)):
        if (labels[sl]==i+1).sum()<600:continue
        x0,x1,y0,y1=sl[1].start,sl[1].stop,sl[0].start,sl[0].stop
        col=min(3,int((x0+x1)/2/w*4));row=min(3,int((y0+y1)/2/h*4));key=names[row*4+col]
        if key in pieces:raise ValueError('ambiguous component '+key)
        p=im.crop((x0,y0,x1,y1));mask=Image.fromarray(((labels[sl]==i+1)*255).astype('uint8'))
        a=np.array(p.getchannel('A'));a[np.array(mask)==0]=0;p.putalpha(Image.fromarray(a));pieces[key]=p
    if set(pieces)!=set(names):raise ValueError('Missing parts '+str(set(names)-set(pieces)))
    bones={}
    def b(key,par,x,y): bones[key]={'at':[x,y],**({'parent':par} if par else {})}
    b('root',None,500,780);b('hip','root',500,780);b('torso','hip',500,640)
    b('neck','torso',500,465);b('head','neck',500,490)
    b('sh_far','torso',390,505);b('el_far','sh_far',380,650);b('wr_far','el_far',380,790)
    b('sh_near','torso',610,505);b('el_near','sh_near',620,650);b('wr_near','el_near',620,790)
    for side,x in [('far',430),('near',565)]:
        b('hp_'+side,'hip',x,785);b('kn_'+side,'hp_'+side,x,925);b('an_'+side,'kn_'+side,x,1060)
    b('hair','head',605,500);b('drone','torso',635,500);b('strap','hip',560,780)
    spec={'head':('head',440,.5,.91),'body':('torso',385,.5,.48),'accessory':('hair' if name=='ye_qing' else 'drone' if name=='a_dou' else 'strap',210,.5,.08),'controller':('wr_near',65,.5,.55)}
    for side in ['far','near']:
        for key,bone,height in [('upper','sh',190),('fore','el',170),('hand','wr',95),('thigh','hp',190),('shin','kn',180),('boot','an',115)]:
            spec[key+'_'+side]=(bone+'_'+side,height,.5,.10 if key!='boot' else .22)
    atlas=Image.new('RGBA',(1024,2048));parts={};x=y=row=0
    for key,p in pieces.items():
        bone,height,px,py=spec[key]
        scale=height/p.height
        p=p.resize((max(1,round(p.width*scale)),height),Image.Resampling.LANCZOS)
        if x+p.width+8>1024:x=0;y+=row+8;row=0
        atlas.alpha_composite(p,(x,y));p.save(out/(key+'.png'))
        parts[key]={'atlas':{'x':x,'y':y,'w':p.width,'h':p.height},'pivot':[round(p.width*px),round(p.height*py)],'bone':bone}
        x+=p.width+8;row=max(row,p.height)
    atlas=atlas.crop((0,0,1024,y+row+8));atlas.save(out/'atlas.png')
    order=['thigh_far','shin_far','boot_far','upper_far','fore_far','hand_far','thigh_near','shin_near','boot_near','body','upper_near','fore_near','hand_near','head','accessory','controller']
    data={'name':name,'ps':1,'view':[-50,0,1200,1250],'bones':bones,'parts':parts,'order':order,'style':'shu','gain':{'sh_near':.72,'el_near':.85,'sh_far':.6,'head':.7}}
    (out/'rig.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(name,len(parts),'parts',atlas.size)
def masks(source):
    im=Image.open(source).convert('RGBA');w,h=im.size
    for i,name in enumerate(['ye_qing','a_dou','lao_cai','tong_qiao']):
        p=im.crop((i%2*w//2,i//2*h//2,(i%2+1)*w//2,(i//2+1)*h//2));p=p.crop(p.getchannel('A').getbbox())
        base=ROOT/'web3d/public/duanju/art'/('story_'+name)
        out=ROOT/'web3d/public/duanju/art'/('story_'+name+'_masked')/'rig';out.mkdir(parents=True,exist_ok=True)
        d=json.loads((base/'rig/rig.json').read_text());old=d['parts']['head'];p=p.resize((old['atlas']['w'],old['atlas']['h']),Image.Resampling.LANCZOS)
        a=Image.open(base/'rig/atlas.png').convert('RGBA');atlas=Image.new('RGBA',(a.width,a.height+p.height+8));atlas.alpha_composite(a);atlas.alpha_composite(p,(0,a.height+8));atlas.save(out/'atlas.png')
        old['atlas'].update(x=0,y=a.height+8);d['name']=name+'_masked';(out/'rig.json').write_text(json.dumps(d,indent=2),encoding='utf-8');p.save(out/'head.png')
        # fallback remains a real character, never an unrelated placeholder.
        for fn in ['battle_idle.png','battle_cast.png','battle_hurt.png']:shutil.copy2(base/fn,out.parent/fn)
        print(name,'masked head shares body and bones')
if __name__=='__main__':
    if sys.argv[1]=='--masks':masks(sys.argv[2])
    else:build(sys.argv[1],sys.argv[2])

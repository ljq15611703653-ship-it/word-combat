"""复用已核对人物的画面，逐格裁切；不修改分镜布局与镜头运动。"""
from pathlib import Path
from PIL import Image, ImageOps
import json, shutil
root=Path(__file__).resolve().parents[2]
src=root/'art/story-v2/source'
out=root/'web3d/public/duanju/story/panels'
gen=Path('C:/Users/27654/.codex/generated_images/01a10d0f-3fd6-72d3-85df-9205fd8a3782')
sheet_files={1:'exec-fb66a8db-0f07-4163-82a3-e3ae1207d5e2.png',2:'exec-6de18635-78a3-455c-a5de-b433eb0f9202.png',3:'exec-ea570675-f8b2-4df7-965a-7e2221460d8f.png',4:'exec-b53d49b2-6819-40ce-b7b9-549603cd56e9.png',14:'exec-ecf45bae-5f1a-440e-922a-3ebc478db509.png'}
for n,f in sheet_files.items():shutil.copy2(gen/f,src/f'comic-sheet-{n}.png')
# Source + normalized crop. Only approved cells; mixed casts are excluded.
def cell(n,k):
    x=(k-1)%4;y=(k-1)//4
    return (f'comic-sheet-{n}',(x/4+.007,y/2+.009,(x+1)/4-.007,(y+1)/2-.009))
def crop(name,box=(0,0,1,1)):return(name,box)
hero=crop('control',(.12,.20,.53,.97));mentor=crop('control',(.38,0,.73,.80));screen=crop('control',(.67,.2,1,.95));desk=crop('control',(.17,.62,.70,1))
msg=[crop('message'),crop('message',(.29,.05,.67,.75)),crop('message',(.58,.36,.96,.95)),crop('message',(.32,.46,.84,1))]
note=[crop('thought'),crop('thought',(.31,0,.67,.78)),crop('thought',(.26,.60,.91,1)),crop('thought',(.25,.3,.80,.98))]
mapping={}
for n in range(1,15):
    mapping[n,'pre']=[mentor,hero,screen,desk]
    mapping[n,'post']=msg if n in [4,7,9,12] else note
mapping[1,'pre']=[crop('raid',(.0,.0,.68,1)),cell(1,2),cell(1,3),crop('raid',(.55,.22,.80,.83))]
mapping[1,'post']=[cell(1,6),crop('raid',(.57,.22,.82,.87)),crop('raid',(.22,.19,.58,.98)),crop('raid',(.0,.0,.34,.98))]
mapping[2,'pre']=[crop('pump',(.62,.32,1,.96)),crop('pump',(0,.15,.56,1)),cell(2,3),cell(2,4)]
mapping[2,'post']=[cell(2,6),crop('home',(.25,.10,.68,.91)),cell(2,7),crop('home',(.24,.12,.43,.82))]
mapping[3,'pre']=[cell(3,k) for k in range(1,5)]
mapping[3,'post']=[hero,cell(3,6),cell(3,7),screen]
mapping[4,'pre']=[cell(4,1),cell(4,2),screen,cell(4,4)]
mapping[4,'post']=[msg[0],cell(4,7),msg[1],cell(4,8)]
# 第五关关后是厂区维修，保留工人镜头作环境，不冒充叶栖。
mapping[5,'post']=[crop('workers'),crop('message'),msg[2],msg[1]]
mapping[14,'pre']=[cell(14,k) for k in range(1,5)]
mapping[14,'post']=[cell(14,k) for k in range(5,9)]
frames=json.loads((root/'art/story-v2/layout-reference.json').read_text(encoding='utf-8'))['frames']
manifest=[]
for (n,when),shots in mapping.items():
    for k,(name,box) in enumerate(shots,1):
        im=Image.open(src/(name+'.png')).convert('RGB');w,h=im.size
        im=im.crop(tuple(round(v*(w if i%2==0 else h)) for i,v in enumerate(box)))
        frame=next(p for p in frames if p['level']==n and p['when']==when and p['page']==(k-1)//2+1 and p['slot']==(k-1)%2+1)
        rw,rh=map(float,frame.get('ratio','16:9').split(':'))
        size=(960,round(960*rh/rw))
        im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS)
        filename=f'v2-L{n}-{when}-{k}.webp';im.save(out/filename,quality=91,method=6)
        manifest.append({'level':n,'when':when,'shot':k,'source':name+'.png','crop':box,'output':filename,'size':size})
(root/'art/story-v2/shot-crops.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Prepared',len(manifest),'individual shots; excluded wrong-cast sheet cells')

# 序章与终章按原格子的实际包围框裁切，揭晓脸部不得被宽格切掉。
data=json.loads((root/'web3d/public/duanju/story/panels.json').read_text(encoding='utf-8'))
ending_sources={1:'report',2:'cai-final',3:'qing-dou-final',4:'tong-final',5:'report',6:'empty'}
intro_sources={1:'city',2:'tech',3:'workers',4:'home'}
for p in data['panels']:
    if p['level'] not in [0,15]:continue
    level=p['level'];page=p['page'];slot=p['slot'];name=(intro_sources if level==0 else ending_sources)[page]
    im=Image.open(src/(name+'.png')).convert('RGB');w,h=im.size
    box=(0,0,1,1)
    if level==15 and page==4:box=(.27,0,.78,.66) if slot<=2 else ((.30,.04,.73,.65) if slot==3 else (.20,.38,.85,1))
    im=im.crop(tuple(round(v*(w if i%2==0 else h)) for i,v in enumerate(box)))
    points=p['polygon'];pw=max(x[0] for x in points)-min(x[0] for x in points);ph=max(x[1] for x in points)-min(x[1] for x in points)
    size=(1100,round(1100*ph*810/(pw*1440)))
    im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS,centering=(.5,.22 if level==15 and page==4 and slot<=3 else .5))
    filename=f'v2-L{level}-{p["when"]}-page{page}-slot{slot}.webp';im.save(out/filename,quality=91,method=4)
    manifest.append({'level':level,'page':page,'slot':slot,'source':name+'.png','crop':box,'output':filename,'size':size})
(root/'art/story-v2/shot-crops.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

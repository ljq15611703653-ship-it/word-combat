"""每格使用独立绘制的镜头；只从多图素材表分离各个镜头，不拆同一场景复用。"""
from pathlib import Path
from PIL import Image, ImageOps
import json, shutil
root=Path(__file__).resolve().parents[2]
plans=json.loads((root/'art/story-v2/independent-shots.json').read_text(encoding='utf-8'))
data=json.loads((root/'web3d/public/duanju/story/panels.json').read_text(encoding='utf-8'))
out=root/'web3d/public/duanju/story/panels'
used=set();manifest=[]
for job in plans:
    source=root/'art/story-v2/source'/('independent-'+job['key']+'.png')
    if not source.exists():shutil.copy2(job['source'],source)
    sheet=Image.open(source).convert('RGB');w,h=sheet.size
    if job['key'].startswith('L'):
        n=int(job['key'][1:]);frames=[p for p in data['panels'] if p['level']==n]
        frames.sort(key=lambda p:(0 if p['when']=='pre' else 1,p['page'],p['slot']))
    else:
        ending=job['key'].startswith('ending');page=int(job['key'].replace('ending','').replace('opening',''))
        frames=sorted([p for p in data['panels'] if p['level']==(15 if ending else 0) and p['page']==page],key=lambda p:p['slot'])
    assert len(frames)==len(job['shots']),job['key']
    for i,p in enumerate(frames):
        assert(source.name,i) not in used;used.add((source.name,i))
        col=i%job['columns'];row=i//job['columns']
        box=((col+.012)*w/job['columns'],(row+.012)*h/job['rows'],(col+.988)*w/job['columns'],(row+.988)*h/job['rows'])
        im=sheet.crop(tuple(round(v) for v in box))
        points=p['polygon'];pw=max(x[0] for x in points)-min(x[0] for x in points);ph=max(x[1] for x in points)-min(x[1] for x in points)
        size=(1100,round(1100*ph*810/(pw*1440)))
        scene=job['shots'][i].lower()
        people=any(n in scene for n in ['yeqi','guheng','yeqing','adou','oldcai','tongqiao','叶栖','顾衡'])
        detail=any(n in scene for n in ['closeup hand','closeup report','closeup terminal','closeup notebook','closeup her controller','mechanical hand','mechanical hands','机械手'])
        # 竖镜头装入宽格时，人物取上部保留脸；纯操作/设备镜头保留中部。
        center=(.5,.15 if people and not detail else .5)
        im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS,centering=center)
        if p['level'] in [0,15]:filename=f'v2-L{p["level"]}-{p["when"]}-page{p["page"]}-slot{p["slot"]}.webp'
        else:filename=f'v2-L{p["level"]}-{p["when"]}-{(p["page"]-1)*2+p["slot"]}.webp'
        im.save(out/filename,quality=92,method=4)
        manifest.append({'output':filename,'source':source.name,'cell':i+1,'scene':job['shots'][i],'crop':list(box),'centering':center,'size':size})
assert len(manifest)==len(data['panels'])==143
(root/'art/story-v2/shot-crops.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Installed 143 distinct independently illustrated shots, no scene reused')

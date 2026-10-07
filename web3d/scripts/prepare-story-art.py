"""用户已授权裁剪与缩放；只做确定的素材尺寸处理，不代替生图。"""
from pathlib import Path
from PIL import Image, ImageOps
import json, shutil
root = Path(__file__).resolve().parents[2]
manifest = root / 'art/story-v2/sources.json'
out = root / 'web3d/public/duanju/story/panels'
originals = root / 'art/story-v2/source'
originals.mkdir(parents=True, exist_ok=True)
for item in json.loads(manifest.read_text(encoding='utf-8')):
    src = Path(item['source'])
    shutil.copy2(src, originals / (item['name'] + '.png'))
    if item['name'] in ['lao-cai-face','tong-qiao-face']:
        im=Image.open(src).convert('RGBA')
        im.thumbnail((1024,1536),Image.Resampling.LANCZOS)
        who='老蔡' if item['name']=='lao-cai-face' else '童乔'
        im.save(root / ('web3d/public/duanju/story/portraits/v2-'+who+'_neutral.png'))
        print(who,'unmasked canonical portrait')
        continue
    if item['name'] == 'squad-sprites':
        im = Image.open(src).convert('RGBA')
        assert im.getchannel('A').getextrema()[0] == 0, 'Sprite sheet must retain real transparency'
        w,h = im.size
        for name,box in [('ye_qing',(0,0,w//2,h//2)),('a_dou',(w//2,0,w,h//2)),('lao_cai',(0,h//2,w//2,h)),('tong_qiao',(w//2,h//2,w,h))]:
            sprite=im.crop(box)
            bbox=sprite.getchannel('A').getbbox()
            assert bbox, name
            sprite=sprite.crop(bbox)
            sprite.thumbnail((340,480),Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',(384,512),(0,0,0,0))
            canvas.alpha_composite(sprite,((384-sprite.width)//2,512-sprite.height-8))
            dest=root / ('web3d/public/duanju/art/story_'+name)
            dest.mkdir(parents=True,exist_ok=True)
            for state in ['idle','cast','hurt']:
                # 骨骼已安装时保留从真实动作帧渲染的回退图。
                if not (dest/'rig/rig.json').exists():
                    canvas.save(dest / ('battle_'+state+'.png'))
            print(name,'384x512 RGBA')
        continue
    im = Image.open(src).convert('RGB')
    # 所有叙事画面按完整16:9保留主体，生成图只需极少边缘裁剪。
    im = ImageOps.fit(im, (1600,900), method=Image.Resampling.LANCZOS, centering=(.5,.5))
    im.save(out / ('v2-' + item['name'] + '.webp'), quality=92, method=6)
    print(item['name'], '1600x900')

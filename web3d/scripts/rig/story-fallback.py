from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
qa=Path('D:/wc/guide/主线重写-20261007')
for name in ['ye_qing','a_dou','lao_cai','tong_qiao']:
 for suffix in ['', '_masked']:
  for anim in ['idle','cast','hurt']:
   im=Image.open(qa/(name+suffix+'-'+anim+'.png')).convert('RGBA');im=im.crop(im.getchannel('A').getbbox());im.thumbnail((360,480),Image.Resampling.LANCZOS)
   out=Image.new('RGBA',(384,512));out.alpha_composite(im,((384-im.width)//2,504-im.height));out.save(root/('web3d/public/duanju/art/story_'+name+suffix+'/battle_'+anim+'.png'))

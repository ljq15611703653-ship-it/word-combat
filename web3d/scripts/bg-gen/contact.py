from PIL import Image, ImageDraw, ImageFont
import os
D = 'D:/wc/art_q/bgs/'
names = ['', '校准', '回响', '醒来', '试探', '街灯', '雨夜', '屋顶', '旧厂', '暗处', '镜厅', '烛廊', '骰厅', '赤红竞技场', '毕业']
tw, th = 640, 360
sheet = Image.new('RGB', (tw * 4, th * 4), (10, 10, 20))
f = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 26)
cells = [('bg_battle(参考)', 'D:/wc/art_q/bg_battle.png')] + [(f'{i:02d} {names[i]}', D + f's{i:02d}.png') for i in range(1, 15)]
for k, (lab, p) in enumerate(cells):
    im = Image.open(p).convert('RGB')
    if im.size != (1920, 1080): print('SIZE', p, im.size)
    im = im.resize((tw, th), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 260, 38], fill=(0, 0, 0)); d.text((8, 4), lab, font=f, fill=(255, 255, 255))
    sheet.paste(im, ((k % 4) * tw, (k // 4) * th))
sheet.save(D + 'contact.png')

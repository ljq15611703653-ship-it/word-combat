from PIL import Image
N = ['', 'calibrate', 'echo', 'wake', 'probe', 'streetlamp', 'rainnight', 'rooftop', 'oldfactory', 'darkcorner', 'mirrorhall', 'candlehall', 'dicehall', 'crimsonarena', 'graduate']
for i in [int(a) for a in __import__('sys').argv[1:]] or range(1, 15):
    Image.open(f'D:/wc/art_q/bgs/s{i:02d}.png').convert('RGB').save(f'D:/wc/wt_bgfix/web3d/public/duanju/bg/bg_{i:02d}_{N[i]}.webp', quality=88)

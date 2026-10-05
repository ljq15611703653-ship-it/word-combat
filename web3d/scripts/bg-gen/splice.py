import re, sys
# 把 new/*.js 里的场景函数替换进 gen.html（幂等：按 S[n] = () => 到下一个 S[m] / S[SC]() 之间替换）
P = 'D:/wc/wt_bgfix/web3d/scripts/bg-gen/'
src = open(P + 'gen.html', encoding='utf-8').read()
for n in (3, 9, 10, 13, 14):
    new = open(P + f'new/s{n:02d}.js', encoding='utf-8').read()
    m = re.search(r'^S\[%d\] = \(\) =>.*?(?=^S\[(?:\d+|SC)\])' % n, src, re.S | re.M)
    src = src[:m.start()] + new + src[m.end():]
cube = open(P + 'new/cube.js', encoding='utf-8').read()
m = re.search(r'^function cube\(.*?(?=^function coin)', src, re.S | re.M)
src = src[:m.start()] + cube + src[m.end():]
open(P + 'gen.html', 'w', encoding='utf-8').write(src)
print('ok')

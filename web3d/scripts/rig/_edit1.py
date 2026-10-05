import json
p = 'D:/wc/wt_rig/web3d/scripts/rig/maps/ye_qi.json'
d = json.load(open(p, encoding='utf8'))
d['bones']['hair'] = {"parent": "head", "at": [600, 330]}
d['parts']['hair_back']['off'] = [-35 + 10, -210 + 150]
d['bones']['hair']['at'] = [610 - 10, 330]
json.dump(d, open(p, 'w', encoding='utf8'), indent=1, ensure_ascii=False)

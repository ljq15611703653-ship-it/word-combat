# 生成 panels.json 的 sfxText / sfxStyle / sfxColor / sfxBig 字段(保留原 sfx)。可重复运行: python scripts/comic-sfx.py
import json, sys
PJ = "public/duanju/story/panels.json"
# 格子 id -> (拟声词, 是否强冲击大号)。不在表里的格子不显示拟声字。
MAP = {
 "L0-pre-1-1": ("哗", 0), "L0-pre-1-2": ("咕嘟", 0), "L0-pre-1-4": ("啪嗒", 0), "L0-pre-2-1": ("啪", 0),
 "L0-pre-2-3": ("唰", 0), "L0-pre-3-1": ("叮", 0), "L0-pre-3-2": ("嗒", 0),
 "L1-pre-1-1": ("嗡", 0), "L1-pre-2-1": ("嗯", 0), "L1-pre-2-2": ("滴", 0), "L1-post-1-1": ("哗啦", 1), "L1-post-1-2": ("嗯", 0),
 "L2-pre-2-1": ("嗡", 0), "L2-pre-2-2": ("啪", 0), "L2-post-1-1": ("咚", 1), "L2-post-1-2": ("嗒", 0), "L2-post-2-2": ("哒", 0),
 "L3-pre-2-2": ("沙", 0), "L3-post-1-1": ("叮", 0), "L3-post-2-2": ("嗒", 0),
 "L4-pre-2-1": ("嗡", 0), "L4-post-1-1": ("咔啦", 1), "L4-post-1-2": ("叮", 0), "L4-post-2-2": ("沙", 0),
 "L5-pre-1-1": ("哗", 0), "L5-pre-2-1": ("叮", 0), "L5-post-1-1": ("噼啪", 0), "L5-post-1-2": ("咕噜", 0),
 "L6-pre-2-1": ("滴", 0), "L6-pre-2-2": ("嗒", 0), "L6-post-1-1": ("嗖", 1), "L6-post-1-2": ("铿", 1),
 "L7-pre-1-1": ("呼", 0), "L7-post-1-1": ("轰", 1), "L7-post-2-2": ("沙", 0),
 "L8-pre-1-1": ("哐啷", 0), "L8-pre-2-1": ("噼啪", 0), "L8-pre-2-2": ("哗", 0), "L8-post-1-1": ("嗡", 0),
 "L9-post-1-1": ("刺啦", 1),
 "L10-pre-1-1": ("嗡", 0), "L10-pre-2-2": ("嗡", 0), "L10-post-1-1": ("砰砰", 1),
 "L11-pre-1-1": ("滋", 0), "L11-post-1-1": ("滋", 0), "L11-post-2-2": ("哗", 0),
 "L12-pre-1-1": ("咕噜", 0), "L12-pre-1-2": ("叮", 0), "L12-pre-2-2": ("咕噜", 0), "L12-post-1-1": ("啪", 1), "L12-post-1-2": ("叮", 0),
 "L13-pre-1-1": ("咚", 0), "L13-post-1-1": ("咚咚", 1),
 "L14-pre-1-1": ("铛", 0), "L14-post-1-1": ("轰", 1), "L14-post-2-1": ("嗯", 0),
 "L15-reveal-1-1": ("轰隆", 1), "L15-reveal-1-3": ("啪", 0), "L15-reveal-3-1": ("叮叮", 0),
 "L15-endA-1-1": ("啪啪", 0), "L15-endA-1-4": ("哗", 0),
 "L15-endB-1-2": ("沙", 0), "L15-endB-1-3": ("嗒嗒", 0), "L15-endB-2-1": ("嗯", 0), "L15-endB-2-2": ("哗", 0),
}
# 色板: (底色, 字色)。按有拟声字的格子序号轮换。
PAL = [("#ff2d95", "#fff7d6"), ("#ffd23f", "#e8112d"), ("#19c3d6", "#fff7d6"), ("#ff7a1a", "#fff7d6"), ("#7b4dff", "#ffe600"), ("#2fd36b", "#fff7d6")]
STY = ["burst", "slash", "block"]
d = json.load(open(PJ, encoding="utf8")); n = 0
for p in d["panels"]:
    for k in ("sfxText", "sfxStyle", "sfxColor", "sfxInk", "sfxBig"): p.pop(k, None)
    m = MAP.get(p["id"])
    if not m or not p.get("sfx"): continue
    big = m[1]
    p["sfxText"] = m[0]; p["sfxBig"] = big
    p["sfxStyle"] = "burst" if big else STY[(n // 2) % 3 if n % 3 else 1]
    p["sfxColor"], p["sfxInk"] = PAL[n % len(PAL)]; n += 1
unk = [p["id"] for p in d["panels"] if p.get("sfx") and p["id"] not in MAP]
json.dump(d, open(PJ, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("sfxText panels:", n, "unmapped sfx:", unk)

// 组牌载荷板逻辑测试（移植自 deckbuilder/test.mjs）+ 对所有规则配置的「合法卡组都装得下」穷举。
// 用法：node node_modules/tsx/dist/cli.mjs scripts/duanju-deck-test.ts
import assert from "node:assert/strict";
import { configureRules, ADV, ADV_WORDS, P2 } from "../src/duanju/engine/api";
import { autoPack, addError, dims, canPlace, nearestSpot, type Block, type Placed, type Word } from "../src/duanju/deck/layout";
import { getWords, wordMap, expandDeck, boardSize, validateDeck } from "../src/duanju/deck/words";
import { PRESETS } from "../src/duanju/deck/data";
import { shapeFor } from "../src/duanju/deck/shapes";

function validate(pl: Placed[], cols: number, rows: number) {
  const g = new Set<number>();
  for (const p of pl) {
    const d = dims(p.word, p.rot);
    assert(p.x >= 0 && p.y >= 0 && p.x + d.w <= cols && p.y + d.h <= rows, "out of bounds");
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) { const k = (p.y + j) * cols + p.x + i; assert(!g.has(k), "overlap"); g.add(k); }
  }
}
assert.deepEqual([shapeFor(2), shapeFor(3), shapeFor(8)], [[2, 1], [3, 1], [4, 2]]);

for (const kind of ["default", "legacy", "real"] as const) {
  assert.equal(configureRules(kind), null);
  const { cols, rows } = boardSize(); const CAP = cols * rows;
  const words = getWords(); const bn = wordMap(words);
  assert.equal(CAP, P2.BUDGET);
  // 词表 = 引擎 ADV（价格=面积，张数=max），且都有说明
  for (const w of words) { assert.equal(w.area, ADV[w.name].price); assert.equal(w.max, ADV[w.name].max); assert.equal(w.size[0] * w.size[1], w.area, `shape area ${w.name}`); assert(w.desc && w.desc !== "（暂无说明）", "缺说明 " + w.name); assert(w.example, "缺示例 " + w.name); }
  assert.equal(words.length, ADV_WORDS.length);
  // 推荐配置：能用的都能排下
  let pOk = 0;
  for (const p of PRESETS) {
    const ok = Object.entries(p.deck).every(([n, k]) => bn[n] && k <= bn[n].max) && Object.entries(p.deck).reduce((s, [n, k]) => s + k * (bn[n]?.area ?? 99), 0) <= CAP;
    if (!ok) continue;
    const w = expandDeck(p.deck, bn); const r = autoPack(w, cols, rows); assert(r, `${kind} preset failed ${p.id}`); assert.equal(r.length, w.length); validate(r, cols, rows); pOk++;
    assert.equal(validateDeck(p.deck, bn), null);
  }
  assert(pOk >= 4, "至少 4 套职业推荐可用 " + kind);
  // 穷举：枚举全部合法卡组（张数≤max、总价≤预算），按形状多重集去重后逐一装箱
  const shapes = new Set<string>(); let decks = 0;
  const cnt: Record<string, number> = {};
  const rec = (i: number, left: number) => {
    if (i === words.length) { decks++; shapes.add(Object.entries(cnt).filter(([, v]) => v).sort().map(([k, v]) => `${k}x${v}`).join(",")); return; }
    const w = words[i]; const key = `${w.size[0]}x${w.size[1]}`;
    for (let k = 0; k <= w.max && k * w.area <= left; k++) { const old = cnt[key] || 0; cnt[key] = old + k; rec(i + 1, left - k * w.area); cnt[key] = old; }
  };
  rec(0, CAP);
  let bad = 0;
  for (const s of shapes) {
    const ws: Word[] = [];
    for (const part of s.split(",").filter(Boolean)) { const [dim, n] = part.split("x").length === 3 ? [part.split("x").slice(0, 2).join("x"), part.split("x")[2]] : [part, "0"]; const [a, b] = dim.split("x").map(Number); for (let i = 0; i < +n; i++) ws.push({ name: dim + "#" + i, area: a * b, max: 99, cat: "core", icon: "", size: [a, b], desc: "", example: "" }); }
    const r = autoPack(ws, cols, rows); if (!r) { bad++; console.log("装不下的形状组合", s); } else validate(r, cols, rows);
  }
  console.log(`规则 ${kind}: 板 ${cols}x${rows}，合法卡组 ${decks} 套，形状组合 ${shapes.size} 种，装不下 ${bad}`);
  assert.equal(bad, 0);
  // 随机卡组（真实词，含 name 去重逻辑）
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  let ok = 0, tried = 0;
  while (ok < 300 && tried < 5000) {
    tried++; const deck: Record<string, number> = {}; let area = 0;
    for (let i = 0; i < 14; i++) { const w = words[Math.floor(rnd() * words.length)]; if ((deck[w.name] || 0) >= w.max || area + w.area > CAP) continue; deck[w.name] = (deck[w.name] || 0) + 1; area += w.area; }
    const ws = expandDeck(deck, bn); const r = autoPack(ws, cols, rows); assert(r, "random deck unpackable " + JSON.stringify(deck)); assert.equal(r.length, ws.length); validate(r, cols, rows); ok++;
  }
  // 超容量 / addError / 吸附
  const over = [bn["并"], ...Array(3).fill(bn["不得"]), ...Array(3).fill(bn["定时"])].filter(Boolean); // 超过容量
  assert.equal(autoPack(over.concat(over), cols, rows), null);
  const one: Block[] = [{ id: 1, word: bn["兑现"], x: 0, y: 0, rot: false }];
  assert.equal(addError(one, cols, rows, bn["兑现"]), "full");
  assert.equal(addError([], cols, rows, bn["兑现"]), null);
  assert(!canPlace(one, cols, rows, bn["并"], false, 1, 0), "重叠被拒");
  const s2 = nearestSpot(one, cols, rows, bn["并"], false, 0, 0); assert(s2 && canPlace(one, cols, rows, bn["并"], false, s2.x, s2.y));
  const big = words.find((w) => w.size[1] > rows - 0 || w.size[0] * 1 >= 4 && w.size[1] === 2);
  if (big) assert(!canPlace([], cols, rows, big, true, 0, 0), "2x4 旋转后高 4 > 3 行放不进");
  assert.equal(validateDeck({ 并: 99 }, bn), "「并」最多 3 张"); assert.equal(validateDeck({ 假词: 1 }, bn), "未知的词：假词");
  console.log(`规则 ${kind}: 推荐配置可用 ${pOk} 套，随机 ${ok} 组全部装下`);
}
// 自定义规则里出现别的面积：1/2/3/8 必须能装满；4/5/6 是扩展形状（2x2/5x1/3x2），只报告装箱上限，不保证任意组合
{
  assert.equal(configureRules("default"), null);
  const { cols, rows } = boardSize();
  const rep: string[] = [];
  for (const a of [1, 2, 3, 4, 5, 6, 8]) {
    const sz = shapeFor(a); let n = 0;
    for (let k = 1; k <= 18; k++) { const ws: Word[] = Array.from({ length: k }, (_, i) => ({ name: "x" + i, area: a, max: 99, cat: "core", icon: "", size: sz, desc: "", example: "" })); if (autoPack(ws, cols, rows)) n = k; else break; }
    rep.push(`面积${a}(${sz[0]}x${sz[1]})最多装 ${n} 个`);
    const want: Record<number, number> = { 1: 18, 2: 9, 3: 6, 8: 1 }; if (want[a]) assert.equal(n, want[a], "面积 " + a);
  }
  console.log(rep.join("；"));
}
console.log("all deck tests passed");

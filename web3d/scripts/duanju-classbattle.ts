// 四职业循环赛（复现 lab2/classbattle.ts）：node node_modules/tsx/dist/cli.mjs scripts/duanju-classbattle.ts [每对局数=50] [规则=rules.final-nodice.json]
import { readFileSync } from "node:fs";
import { applyRules, CLASSES_ALL, type Cls } from "../src/duanju/engine/params";
import { AI_DEFAULT } from "../src/duanju/engine/ai";
import { mulberry32 } from "../src/duanju/engine/gen";
import { randKws } from "../src/duanju/engine/deck";
import { playGame } from "../src/duanju/engine/arena";
const N = +(process.argv[2] ?? 50), RF = process.argv[3] ?? "rules.final-nodice.json";
applyRules(JSON.parse(readFileSync(new URL(`../src/duanju/engine/${RF}`, import.meta.url), "utf8")));
const DECKS: Record<Cls, Record<string, number>> = { 并: { 并: 3, 减伤: 2, 易伤: 2, 灼烧: 1, 衰弱: 1 }, 引用: { 累计: 1, 次数: 1, 定时: 1, 词数: 1, 并: 1 }, 限制: { 不得: 2, 收紧: 2, 至多: 2, 移除: 1 }, 状态: { 灼烧: 2, 易伤: 2, 衰弱: 2, 并: 3 } };
const cfg = { ...AI_DEFAULT, mode: "playbook" as const };
const pairs: [Cls, Cls][] = [];
CLASSES_ALL.forEach((a, i) => CLASSES_ALL.forEach((b, k) => { if (i <= k) pairs.push([a, b]); }));
const r = mulberry32(2026);
const w: Record<string, number[]> = {};
pairs.forEach(([a, b], pi) => { let sa = 0, sb = 0; for (let g = 0; g < N; g++) { const kws: [string[], string[]] = [randKws(r), randKws(r)]; const o = playGame(DECKS[a], DECKS[b], 5000 + g * 7 + pi, (g % 2) as 0 | 1, cfg, false, kws, [a, b]); if (o.win === 2) { sa += .5; sb += .5; } else if (o.win === 0) sa++; else if (o.win === 1) sb++; } w[a + b] = [sa / N, sb / N]; });
const wr = (a: Cls, b: Cls) => { const x = w[a + b]; return x ? x[0] : w[b + a][1]; };
console.log(RF, "N=" + N);
for (const a of CLASSES_ALL) console.log(a, CLASSES_ALL.map((b) => (wr(a, b) * 100).toFixed(1) + "%").join("  "), "| 合计", (CLASSES_ALL.filter((b) => b !== a).reduce((s, b) => s + wr(a, b), 0) / 3 * 100).toFixed(1) + "%");

import { playGame } from "./arena";
import { sentenceText } from "./ast";
const deck = { 并: 2, 减伤: 1, 定时: 1, 移除: 1, 灼烧: 1, 易伤: 1, 无视: 1, 不得: 1, 收紧: 2, 至多: 1, 兑现: 1, 先后: 1, 衰弱: 1 };
const m: Record<string, number> = {}; let tot = 0; const t0 = Date.now();
for (let i = 0; i < 30; i++) { const g = playGame(deck, deck, 500 + i, (i % 2) as 0 | 1, undefined, true); for (const x of g.rec ?? []) { const k = sentenceText(x.cl).replace(/\d+/g, "N"); m[k] = (m[k] ?? 0) + 1; tot++; } }
const plain = Object.entries(m).filter(([k]) => /^(敌方最低血|随从N)受伤N$/.test(k)).reduce((a, [, v]) => a + v, 0);
console.log(`句子 ${tot}，纯攻击 ${(plain / tot * 100).toFixed(0)}%，${((Date.now() - t0) / 30).toFixed(0)}ms/局`);
for (const [k, v] of Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(v, k);

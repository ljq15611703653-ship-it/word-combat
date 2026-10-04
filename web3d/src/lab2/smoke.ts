import { playGame } from "./arena";
import { sentenceText } from "./ast";
const deck = { 并: 2, 减伤: 2, 定时: 1, 移除: 1, 灼烧: 1, 易伤: 1, 无视: 1, 不得: 1, 收紧: 2, 至多: 1 };
const t0 = Date.now(); let w = [0, 0, 0], rs = 0; const N = 20;
for (let i = 0; i < N; i++) { const g = playGame(deck, deck, 100 + i, (i % 2) as 0 | 1, undefined, i === 0); w[g.win < 0 ? 2 : g.win]++; rs += g.rounds;
  if (i === 0 && g.rec) for (const x of g.rec.slice(0, 40)) console.log(`R${x.rnd} s${x.side} u${x.unit}: ${sentenceText(x.cl)}`); }
console.log(`胜 ${w}，平均 ${(rs / N).toFixed(1)} 轮，${((Date.now() - t0) / N).toFixed(0)} ms/局`);

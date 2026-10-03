declare const process: { argv: string[] };
import { Match } from "./match";
import { CLASSES, presetDeck, type Cls } from "./rules";
const n = +(process.argv[2] ?? 100);
const wins: Record<string, number> = {}, games: Record<string, number> = {};
let rounds = 0, decided = 0, firstW = 0;
for (const c of CLASSES) { wins[c] = 0; games[c] = 0; }
const t0 = Date.now();
for (let g = 0; g < n; g++) {
  const nc = CLASSES.length;
  const c0 = CLASSES[g % nc] as Cls, c1 = CLASSES[(g + 1 + (Math.floor(g / nc) % (nc - 1))) % nc] as Cls;
  const m = new Match();
  m.start(presetDeck(c0), presetDeck(c1), 1 + g, false, false);
  m.runToEnd();
  rounds += m.rnd;
  if (m.winner >= 0) { decided++; if (m.winner === m.first0) firstW++; if (c0 !== c1) wins[m.clsOf(m.winner)]++; }
  if (c0 !== c1) { games[c0]++; games[c1]++; }
}
console.log(`${n} 局 平均 ${(rounds / n).toFixed(1)} 轮 先手胜 ${firstW}/${decided} 用时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(CLASSES.map((c) => `${c} ${wins[c]}/${games[c]} (${((100 * wins[c]) / Math.max(1, games[c])).toFixed(0)}%)`).join("  "));

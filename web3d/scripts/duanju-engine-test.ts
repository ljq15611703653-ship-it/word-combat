// 纯引擎 headless 测试：N 局对局不崩（默认规则 + REAL 各一半，混合电脑代打与随机出句）。
// 用法：node node_modules/tsx/dist/cli.mjs scripts/duanju-engine-test.ts [局数]
import { Match, configureRules, DECK_WORDS, deckOk, TIER_NAMES } from "../src/duanju/engine/api";
import { randDeck } from "../src/duanju/engine/deck";
import { mulberry32 } from "../src/duanju/engine/gen";
const N = +(process.argv[2] ?? 200);
const r = mulberry32(7);
let rounds = 0, ev = 0; const res: Record<string, number> = {}; const t0 = Date.now();
for (let i = 0; i < N; i++) {
  configureRules(i % 2 ? "real" : "default");
  const ps = DECK_WORDS.presets.filter((p) => deckOk(p.deck));
  const deck = i % 3 && ps.length ? ps[i % ps.length].deck : randDeck(r);
  const m = new Match({ first: (i % 2) as 0 | 1, myDeck: deck, tier: TIER_NAMES[i % 4], seed: 1000 + i });
  let guard = 0;
  while (!m.over() && guard++ < 40) {
    for (let g = 0; g < 14; g++) {
      const w = m.who(); if (w === -1) break;
      if (w === 1) m.aiMove();
      else if (i % 4 === 0) m.autoMyMove();
      else {
        const u = m.myUnits().find((x) => m.canAct(x))!;
        const c = m.legalSentences(u, 30);
        if (c.length && r() < 0.8) { const x = c[Math.floor(r() * c.length)]; if (!m.declare(u, x.cl, Math.min(m.tl(), x.minStart + Math.floor(r() * 4)))) m.pass(u); } else m.pass(u);
      }
    }
    const e = m.resolve(); ev += e.length;
    for (const x of e) if (!isFinite(x.sec) || !x.type) throw new Error("bad event " + JSON.stringify(x));
    if (!m.over()) m.nextRound();
  }
  if (!m.over()) throw new Error("game " + i + " did not finish");
  rounds += m.rnd; res[m.outcome()!] = (res[m.outcome()!] ?? 0) + 1;
}
console.log(`ok ${N} 局，平均 ${(rounds / N).toFixed(1)} 轮，${ev} 个回放事件，结果`, res, `${((Date.now() - t0) / N).toFixed(0)} ms/局`);

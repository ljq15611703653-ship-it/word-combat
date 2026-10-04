// 逐词拼句往返/nextLegal 测试共用：随机对局里收集大量真实候选句。
import { Match, configureRules, DECK_WORDS, deckOk, TIER_NAMES } from "../src/duanju/engine/api";
import { randDeck } from "../src/duanju/engine/deck";
import { mulberry32, candidates } from "../src/duanju/engine/gen";
import { canAfford, windupFor } from "../src/duanju/engine/interp";
import type { Sentence } from "../src/duanju/engine/ast";

export interface Visit { m: Match; unit: number; cands: Sentence[] }
/** 跑 nMatch 局，每个我方随从的每次出手机会都取一批候选句，回调 visit；之后随机选一句（或不出手）继续 */
export function walk(nMatch: number, visit: (v: Visit) => void, opts: { k?: number; seed?: number; rules?: string[] } = {}) {
  const r = mulberry32(opts.seed ?? 11);
  for (let i = 0; i < nMatch; i++) {
    configureRules((opts.rules ?? ["default", "real"])[i % (opts.rules ?? ["default", "real"]).length] as any);
    const ps = DECK_WORDS.presets.filter((p) => deckOk(p.deck));
    const deck = i % 3 && ps.length ? ps[i % ps.length].deck : randDeck(r);
    const m = new Match({ first: (i % 2) as 0 | 1, myDeck: deck, tier: TIER_NAMES[i % 4], seed: 5000 + i });
    let guard = 0;
    while (!m.over() && guard++ < 14) {
      for (let g = 0; g < 14; g++) {
        const w = m.who(); if (w === -1) break;
        if (w === 1) { m.aiMove(); continue; }
        const u = m.myUnits().find((x) => m.canAct(x))!;
        const rng = mulberry32(Math.floor(r() * 1e9));
        const cands: Sentence[] = candidates(m.s, 0, u, rng, opts.k ?? 70, "playbook").filter((cl) => canAfford(m.s, 0, cl, u));
        visit({ m, unit: u, cands });
        const ok = cands.filter((cl) => windupFor(cl, u, m.s) <= m.tl());
        if (ok.length && r() < 0.85) { const x = ok[Math.floor(r() * ok.length)]; if (!m.declare(u, x, windupFor(x, u, m.s) + Math.floor(r() * 2))) m.pass(u); } else m.pass(u);
      }
      m.resolve(); if (!m.over()) m.nextRound();
    }
  }
}

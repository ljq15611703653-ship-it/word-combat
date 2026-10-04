// 对战场：两副卡组、同一个通用电脑，自动打完一局并返回统计与句子记录
import { type Deck, type Cls } from "./params";
import { newGame, declare, passUnit, nextSide, resolveRound, nextRound, type St } from "./interp";
import { think, AI_DEFAULT, type AiCfg } from "./ai";
import { mulberry32 } from "./gen";
import type { Side } from "./ast";

export interface GameResult { win: -1 | 0 | 1 | 2; rounds: number; stats: Record<string, number>; rec?: St["rec"]; hp: [number, number] }
export function playGame(d0: Deck | null, d1: Deck | null, seed: number, first: Side = 0, cfg: AiCfg | [AiCfg, AiCfg] = AI_DEFAULT, record = false, kws?: [string[] | null, string[] | null], cls?: [Cls | null, Cls | null]): GameResult {
  const r = mulberry32(seed);
  const s = newGame(first, [d0, d1], record, kws, cls);
  let guard = 0;
  while (s.win < 0 && guard++ < 40) {
    for (let g = 0; g < 14; g++) {
      const sd = nextSide(s); if (sd === -1) break;
      const m = think(s, sd, r, Array.isArray(cfg) ? cfg[sd] : cfg);
      if (m.cl && declare(s, sd, m.unit, m.cl, m.start)) { /* ok */ } else passUnit(s, m.unit);
      s.turn = (1 - s.turn) as Side;
    }
    resolveRound(s);
    if (s.win < 0) nextRound(s);
  }
  const hp = [0, 1].map((sd) => [0, 1, 2].reduce((a, i) => a + Math.max(0, s.hp[sd * 3 + i]), 0)) as [number, number];
  return { win: s.win, rounds: s.rnd, stats: s.stats, rec: s.rec, hp };
}

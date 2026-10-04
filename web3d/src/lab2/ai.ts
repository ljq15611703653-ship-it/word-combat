// 通用电脑：不分流派。候选句子来自语法（gen.ts），每个候选推演几轮（默认策略代打），选估值最高的。
import { P } from "../lab/rules";
import { act, dmg, heal, type Sentence, type Side } from "./ast";
import { windup } from "./ast";
import { type St, clone, declare, passUnit, nextSide, resolveRound, nextRound, alive, unitsOf, total, nAlive, canAfford } from "./interp";
import { candidates, type Rng } from "./gen";

export interface AiCfg { k: number; depth: number; w: number[]; passBias: number }
export const AI_DEFAULT: AiCfg = { k: 8, depth: 2, w: [1, 0.7, 0.5], passBias: 0 };

/** 估值：站在 side 看，活着的随从差 + 总血量差；终局给大数 */
export function evaluate(s: St, side: Side): number {
  const o = (1 - side) as Side;
  if (s.win >= 0) return s.win === 2 ? 0 : s.win === side ? 1000 : -1000;
  return 10 * (nAlive(s, side) - nAlive(s, o)) + 1.2 * (total(s, side) - total(s, o));
}

/** 默认策略（推演里给所有人代打）：打最低血量的敌人；残血回血；其余不出手 */
export function defaultMove(s: St, side: Side, u: number): boolean {
  const foes = unitsOf((1 - side) as Side).filter((x) => alive(s, x));
  if (!foes.length) return false;
  const mine = unitsOf(side).filter((x) => alive(s, x));
  const lowMine = mine.reduce((b, x) => (s.hp[x] < s.hp[b] ? x : b), mine[0]);
  if (s.hp[lowMine] <= 4 && s.hp[lowMine] < P.HP && declare(s, side, u, [act(heal(2, { t: "unit", u: lowMine }))], 4)) return true;
  const maxN = Math.max(1, ...s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v));
  for (let n = Math.min(3, maxN); n >= 1; n--) {
    const cl: Sentence = [act(dmg(n, { t: "lowFoe" }))];
    if (canAfford(s, side, cl)) return declare(s, side, u, cl, windup(cl));
  }
  return false;
}
function playOutRound(s: St) {
  for (let g = 0; g < 12; g++) {
    const sd = nextSide(s); if (sd < 0) break;
    const u = unitsOf(sd).find((x) => alive(s, x) && !s.done[x])!;
    if (!defaultMove(s, sd, u)) passUnit(s, u);
    s.turn = (1 - s.turn) as Side;
  }
}
/** 从 s0 出发：side 的 unit 说 cl（起手 start，null = 不出手），其余按默认策略，推演 depth 轮 */
function rollout(s0: St, side: Side, unit: number, cl: Sentence | null, start: number, cfg: AiCfg): number {
  const s = clone(s0);
  if (cl) { if (!declare(s, side, unit, cl, start)) return -1e9; } else passUnit(s, unit);
  s.turn = (1 - s.turn) as Side;
  let val = 0;
  for (let d = 0; d < cfg.depth; d++) {
    if (d > 0) { if (s.win >= 0) break; nextRound(s); }
    playOutRound(s);
    resolveRound(s);
    val += (cfg.w[d] ?? 0.4) * evaluate(s, side);
    if (s.win >= 0) break;
  }
  return val;
}

/** 轮到 side 宣告：选出 (随从, 句子, 起手秒)，或不出手。返回 null 表示这个随从不出手 */
export function think(s: St, side: Side, r: Rng, cfg: AiCfg = AI_DEFAULT): { unit: number; cl: Sentence | null; start: number } {
  const us = unitsOf(side).filter((x) => alive(s, x) && !s.done[x]);
  let best = { unit: us[0], cl: null as Sentence | null, start: 1 }, bestV = -Infinity;
  // 每个未出手的随从各看一遍（候选里含「不出手」）
  for (const u of us) {
    const base = rollout(s, side, u, null, 1, cfg) + cfg.passBias;
    if (base > bestV) { bestV = base; best = { unit: u, cl: null, start: 1 }; }
    for (const cl of candidates(s, side, u, r, Math.ceil(cfg.k / us.length) + 1)) {
      const w = windup(cl);
      const starts = [w, ...(w < P.TL - 1 && r() < 0.7 ? [w + 1 + Math.floor(r() * Math.min(8, P.TL - 1 - w))] : [])];
      for (const st of starts) { const v = rollout(s, side, u, cl, st, cfg); if (v > bestV) { bestV = v; best = { unit: u, cl, start: st }; } }
    }
  }
  return best;
}

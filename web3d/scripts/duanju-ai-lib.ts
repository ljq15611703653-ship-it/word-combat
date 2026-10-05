// 电脑 AI 对战评估（engine 级自对战，无浏览器）。

//   项目：vs-old | matrix | tiers | beat14 | all
// 旧 AI = scripts/_oldai（f06621e 时的 ai/gen/playbook/tiers，共用现有 interp），先后手各半，双方卡组按预设轮换。
import { configureRules, DECK_WORDS } from "../src/duanju/engine/api";
import { newGame, declare, passUnit, nextSide, resolveRound, nextRound, canAfford, windupFor, alive, unitsOf, type St } from "../src/duanju/engine/interp";
import { act, dmg, heal, type Sentence } from "../src/duanju/engine/ast";
import { mulberry32, type Rng } from "../src/duanju/engine/gen";
import { randKws } from "../src/duanju/engine/deck";
import { think as thinkNew } from "../src/duanju/engine/ai2";
import { TIERS as TIERS_NEW } from "../src/duanju/engine/ai2";
import { think as thinkOld } from "./_oldai/ai";
import { TIERS as TIERS_OLD } from "./_oldai/tiers";

export type Move = { unit: number; cl: Sentence | null; start: number };
export type Mover = (s: St, side: 0 | 1, r: Rng) => Move;
export const aiNew = (tier: string): Mover => (s, side, r) => thinkNew(s, side, r, TIERS_NEW[tier]);
export const aiOld = (tier: string): Mover => (s, side, r) => thinkOld(s, side, r, TIERS_OLD[tier]);
/** 朴素玩家：每个随从打最低血敌人，数字尽量大（至多手上最大牌），血低时偶尔治疗。不会用任何进阶词。 */
export const naive: Mover = (s, side, r) => {
  const u = unitsOf(side).find((x) => alive(s, x) && !s.done[x])!;
  const mine = unitsOf(side).filter((x) => alive(s, x));
  const low = mine.reduce((b, x) => (s.hp[x] < s.hp[b] ? x : b), mine[0]);
  if (s.hp[low] <= 2 && r() < 0.5) { const cl: Sentence = [act(heal(2, { t: "lowMe" }))]; if (canAfford(s, side, cl, u)) return { unit: u, cl, start: windupFor(cl, u, s) }; }
  for (let n = 2; n >= 1; n--) { const cl: Sentence = [act(dmg(n, { t: "lowFoe" }))]; if (canAfford(s, side, cl, u)) return { unit: u, cl, start: windupFor(cl, u, s) }; }
  return { unit: u, cl: null, start: 1 };
};

const PRE = Object.fromEntries(DECK_WORDS.presets.map((p) => [p.id, p.deck]));
export const CLASSES = { 并: "newbie", 限制: "forbid", 引用: "quote", 状态: "state" } as const;
export const deckOfClass = (k: keyof typeof CLASSES) => ({ ...PRE[CLASSES[k]] });

/** 打一局。movers[side]；first = 先手方。返回胜者 0/1，2 = 平 */
export function play(first: 0 | 1, decks: [Record<string, number>, Record<string, number>], movers: [Mover, Mover], seed: number): { win: number; rounds: number; s: St } {
  const r = mulberry32(seed);
  const s = newGame(first, [{ ...decks[0] }, { ...decks[1] }], false, [randKws(r), randKws(r)]);
  s.rs = (seed ^ 0x5bd1e995) >>> 0;
  let guard = 0;
  while (s.win < 0 && guard++ < 40) {
    for (let g = 0; g < 14; g++) {
      const w = nextSide(s); if (w === -1) break;
      const m = movers[w](s, w as 0 | 1, r);
      if (m.cl && declare(s, w as 0 | 1, m.unit, m.cl, m.start)) { /* ok */ } else passUnit(s, m.unit);
      s.turn = (1 - s.turn) as 0 | 1;
    }
    resolveRound(s);
    if (s.win < 0) nextRound(s);
  }
  return { win: s.win, rounds: s.rnd, s };
}

/** A 对 B：N 局，先后手各半。返回 A 的胜/平/负 */
export function duel(N: number, mkA: (i: number) => { mv: Mover; deck: Record<string, number> }, mkB: (i: number) => { mv: Mover; deck: Record<string, number> }, seed0 = 1, off = 0) {
  let w = 0, d = 0, l = 0, rounds = 0;
  for (let i = 0; i < N; i++) {
    const A = mkA(i), B = mkB(i), aSide = ((i + off) % 2) as 0 | 1;
    const decks: any = aSide === 0 ? [A.deck, B.deck] : [B.deck, A.deck];
    const movers: any = aSide === 0 ? [A.mv, B.mv] : [B.mv, A.mv];
    const first = (((i + off) >> 1) % 2) as 0 | 1;
    const g = play(first, decks, movers, seed0 * 100003 + i + off);
    rounds += g.rounds;
    if (g.win === 2) d++; else if (g.win === aSide) w++; else l++;
  }
  return { w, d, l, rate: (w + d / 2) / N, rounds: rounds / N };
}
export const pct = (x: number) => (100 * x).toFixed(0).padStart(3) + "%";
export const fmt = (r: ReturnType<typeof duel>) => `${pct(r.rate)} (胜${r.w} 平${r.d} 负${r.l}, 均${r.rounds.toFixed(1)}轮)`;

/** 玩家规格 "impl:tier:class"：impl = new|old|naive|novice；class = 并|限制|引用|状态|* （* = 按局序号轮换）。novice = 旧「入门」档配置、失误率 0.5 */
export function player(spec: string, i: number): { mv: Mover; deck: Record<string, number> } {
  const [impl, tier = "普通", cls = "*"] = spec.split(":");
  const ks = Object.keys(CLASSES) as (keyof typeof CLASSES)[];
  const k = cls === "*" ? ks[(i >> 2) % 4] : cls === "~" ? ks[(i >> 4) % 4] : (cls as keyof typeof CLASSES);
  const mv = impl === "new" ? aiNew(tier) : impl === "old" ? aiOld(tier) : impl === "naive" ? naive : impl === "novice" ? ((s, side, r) => thinkOld(s, side, r, { ...TIERS_OLD["入门"], blunder: 0.5 })) : (() => { throw new Error("impl? " + impl); })();
  return { mv, deck: deckOfClass(k) };
}

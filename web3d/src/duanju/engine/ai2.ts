/* eslint-disable */
// @ts-nocheck
// 《断·句》电脑对手 v2（手写，不被 sync-engine.mjs 覆盖；旧版 ai.ts / tiers.ts 原样保留，入门档仍走旧版）。
// 思路：候选句（语法 + 手册 + 本文件的补充）→ 克隆状态 → 默认策略推演几轮 → 选估值最高的。相对旧版的改动：
//   1. 数字牌感知：补充「大数字」「选择 N 个」候选（骰牌 4~6 可以一击秒人）；默认策略也会用大数字；估值里按牌面留牌。
//   2. 反制起手：对手已宣告的句子，候选起手秒多加「它的起手秒 − 1」（抢在它前面打倒出手者使其落空）和「同一秒」（防御/拆除先手）。
//   3. 避开违规：对手挂着「不得」时，推演里的默认代打不再违规；不重复同一句复杂句（上一轮同一签名的复杂句扣分）。
//   4. 难度：入门 = 旧版原样；普通 = 补充候选 + 新默认策略；进阶 = + 反制起手 + 手册 + 重复惩罚；大师 = + 更深推演 + 对手回应检查。
import { P } from "./lab-rules";
import { act, dmg, heal, shield, unit, status, forbid, whenever, query, win, cat, ev, wordsOf, type Sentence, type Side, type Tg } from "./ast";
import { type St, windupFor, clone, declare, passUnit, nextSide, resolveRound, nextRound, alive, unitsOf, canAfford } from "./interp";
import { candidates, type Rng, type Env } from "./gen";
import { expandTg } from "./playbook";
import { P2 } from "./params";
import { think as thinkClassic, evaluate, fancy, type AiCfg } from "./ai";
import { TIERS as OLD_TIERS } from "./tiers";

export interface Ai2Cfg extends AiCfg { lvl: 0 | 1 | 2 | 3; reply?: number }
const env = ((globalThis as any).process?.env) ?? {};
const num = (k: string, d: number) => (env[k] !== undefined ? +env[k] : d);
const flag = (k: string, d = 1) => (env[k] !== undefined ? +env[k] !== 0 : !!d);

export const TIERS: Record<string, Ai2Cfg> = {
  入门: { ...OLD_TIERS["入门"], lvl: 0 },
  普通: { ...OLD_TIERS["普通"], lvl: 1 },
  进阶: { ...OLD_TIERS["进阶"], lvl: 2 },
  大师: { ...OLD_TIERS["大师"], lvl: 3, reply: 5 },
};
export const TIER_NAMES = Object.keys(TIERS);

// ---------- 对手限制（不得）----------
/** 对方挂着（已生效或本轮已宣告）的「不得」：返回被禁的类别集合，推演里的默认代打不去违规 */
function bans(s: St, side: Side): Set<string> {
  const out = new Set<string>();
  const foe = (1 - side) as Side;
  const add = (c: any) => { if (c.k === "when" && c.forbid && c.q.obj.t === "cat") out.add(c.q.obj.c); };
  for (const x of s.stand) if (x.owner === foe && x.left > 0) add(x.c);
  for (const d of s.decl) if (d.side === foe && !d.gone) d.cl.forEach(add);
  return out;
}

// ---------- 默认策略（推演里代打）----------
/** 比旧版：数字可以用到牌面（含数位 +1、骰牌），不违反对手的「不得」；血少先自保 */
function defaultMove(s: St, side: Side, u: number): boolean {
  const foes = unitsOf((1 - side) as Side).filter((x) => alive(s, x));
  if (!foes.length) return false;
  const mine = unitsOf(side).filter((x) => alive(s, x));
  const lowMine = mine.reduce((b, x) => (s.hp[x] < s.hp[b] ? x : b), mine[0]);
  const ban = bans(s, side);
  const noAtk = ban.has("atk") || ban.has("any") || ban.has("dmg");
  if (s.hp[lowMine] <= 4 && s.hp[lowMine] < P.HP && !ban.has("heal") && !ban.has("any") && declare(s, side, u, [act(heal(2, { t: "lowMe" }))], 4)) return true;
  if (noAtk) return false;
  const maxN = Math.max(1, ...s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v)) + (P2.POS && u % 3 === 1 ? P2.POS_NUM : 0);
  for (let n = Math.min(FLAT_N, maxN); n >= 1; n--) {
    const cl: Sentence = [act(dmg(n, { t: "lowFoe" }))];
    if (canAfford(s, side, cl, u)) return declare(s, side, u, cl, windupFor(cl, u, s));
  }
  return false;
}
const FLAT_N = num("AI2_FLATN", 3);
function playOutRound(s: St) {
  for (let g = 0; g < 12; g++) {
    const sd = nextSide(s); if (sd === -1) break;
    const u = unitsOf(sd).find((x) => alive(s, x) && !s.done[x])!;
    if (!defaultMove(s, sd, u)) passUnit(s, u);
    s.turn = (1 - s.turn) as Side;
  }
}
function rollout(s0: St, side: Side, u: number, cl: Sentence | null, start: number, cfg: Ai2Cfg): number {
  const s = clone(s0);
  if (cl) { if (!declare(s, side, u, cl, start)) return -1e9; } else passUnit(s, u);
  s.turn = (1 - s.turn) as Side;
  let val = 0;
  for (let d = 0; d < cfg.depth; d++) {
    if (d > 0) { if (s.win >= 0) break; nextRound(s); }
    playOutRound(s);
    resolveRound(s);
    val += (cfg.w[d] ?? 0.4) * evaluate(s, side, cfg);
    if (s.win >= 0) break;
  }
  return val;
}

// ---------- 补充候选 ----------
/** 旧候选里没有的：大数字（骰牌）、选择 N 个（带大数字时才有意义）、血多时的大治疗/减伤。数字不够的会被 canAfford 过滤掉 */
function extras(s: St, side: Side, u: number, r: Rng, k: number): Sentence[] {
  const foes = unitsOf((1 - side) as Side).filter((x) => alive(s, x));
  const mine = unitsOf(side).filter((x) => alive(s, x));
  const ready = s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v);
  const maxN = Math.max(1, ...ready) + (P2.POS && u % 3 === 1 ? P2.POS_NUM : 0);
  const e: Env = { s, side, unit: u, r, maxN, foes, mine };
  const raw: Sentence[] = [];
  if ((s.deck[side]?.断言 ?? 0) > 0) for (const f of foes) raw.push([
    { k: "assert", scope: "side", who: "foe", win: { dir: "after", unit: "sent", n: 1 }, obj: { t: "word", w: "造成" }, judge: "exist", effs: [shield(1, unit(u))], otherwise: [dmg(1, unit(f))] },
  ]);
  const cap = Math.min(maxN, 6);
  for (const f of foes) for (let n = 4; n <= cap; n++) raw.push([act(dmg(n, unit(f)))]);                 // 大单击（骰牌 / 数位）
  for (const N of [2, 3]) {                                                                               // 选择 N 个：N 本身占数字牌（牌面 ≥ N）
    if (N > foes.length || maxN < N) continue;
    for (let n = 1; n <= Math.min(3, cap); n++) raw.push([act(dmg(n, { t: "some", n: N, side: "foe" }))]);
    if (mine.length >= N) { raw.push([act(heal(1, { t: "some", n: N, side: "me" }))]); raw.push([act(shield(1, { t: "some", n: N, side: "me" }))]); }
  }
  const lowMine = mine.reduce((b, x) => (s.hp[x] < s.hp[b] ? x : b), mine[0]);
  if (s.hp[lowMine] <= 3) for (let n = 3; n <= Math.min(5, cap); n++) { raw.push([act(heal(n, { t: "lowMe" }))]); raw.push([act(shield(n, { t: "lowMe" }))]); }
  const out: Sentence[] = [], seen = new Set<string>();
  for (const cl of raw) for (const x of (P2.TGT_AT_DECL ? expandTg(e, cl) : [cl])) {
    const key = JSON.stringify(x);
    if (!seen.has(key) && canAfford(s, side, x, u)) { seen.add(key); out.push(x); }
  }
  return out;
}

// ---------- 职业补充句 ----------
/** 职业来自 s.cls（lab2 同步进游戏后才有；现在读不到 = 通用策略）。只是多给几条该职业的强句，是否出由推演决定；职业限制（段数/封顶/引用量词个数）由 canAfford 过滤 */
export const clsOf = (s: St, side: Side): string | null => ((s as any).cls?.[side] ?? null);
function classExtras(s: St, side: Side, u: number, r: Rng): Sentence[] {
  const cx = clsOf(s, side);
  if (!cx) return [];
  const foes = unitsOf((1 - side) as Side).filter((x) => alive(s, x));
  const mine = unitsOf(side).filter((x) => alive(s, x));
  if (!foes.length || !mine.length) return [];
  const e: Env = { s, side, unit: u, r, maxN: 3, foes, mine };
  const lowFoe: Tg = { t: "lowFoe" }, lowMe: Tg = { t: "lowMe" }, two: Tg = { t: "some", n: 2, side: "me" }, src: Tg = { t: "src" };
  const q = (who: "me" | "foe", obj: any, agg: "count" | "sum", mult: number, n = 1) => ({ q: query(win("before", n, "round"), who, obj, agg), mult });
  const raw: Sentence[] = [];
  if (cx === "并") {
    raw.push([act(dmg(2, lowFoe)), act(heal(2, lowMe), "ok"), act(shield(2, lowMe), "fail")]);
    raw.push([status("vuln", 1, 2, lowFoe), act(dmg(2, lowFoe)), act(heal(2, lowMe))]);
    raw.push([status("vuln", 1, 2, lowFoe), status("weak", 1, 2, lowFoe), act(dmg(3, lowFoe))]);
    raw.push([act(dmg(2, lowFoe)), act(dmg(2, lowFoe), "ok"), act(dmg(3, lowFoe), "ok"), act(dmg(3, lowFoe), "ok")]);
  } else if (cx === "引用") {
    raw.push([act(dmg(q("me", cat("dealt"), "sum", 1, 99), lowFoe))]);
    raw.push([act(dmg(q("foe", cat("atk"), "count", 2), lowFoe))]);
    raw.push([act(shield(q("me", ev("hurt"), "count", 2), two))]);
    raw.push([act(dmg(q("me", cat("dealt"), "sum", 2), lowFoe)), act(heal(2, two))]);
  } else if (cx === "限制") {
    raw.push([forbid(cat("atk"), 3, 2, 2)]);
    raw.push([forbid(cat("any"), 3, 2, 3), act(shield(2, lowMe))]);
    raw.push([whenever("foe", cat("atk"), 3, [dmg(2, src)], 3, 2)]);
    raw.push([forbid(cat("heal"), 3, 2, 2), forbid(cat("def"), 3, 2, 2)]);
  } else if (cx === "状态") {
    for (const a of foes) for (const b of foes) if (a < b) raw.push([status("vuln", 1, 2, unit(a)), status("burn", 1, 3, unit(b))]);
    raw.push([status("vuln", 1, 3, lowFoe), act(dmg(1, lowFoe)), act(dmg(1, lowFoe))]);
    raw.push([status("burn", 1, 3, lowFoe), act(shield(2, lowMe))]);
  }
  const out: Sentence[] = [], seen = new Set<string>();
  for (const cl of raw) for (const x of (P2.TGT_AT_DECL ? expandTg(e, cl) : [cl])) { const k = JSON.stringify(x); if (!seen.has(k) && canAfford(s, side, x, u)) { seen.add(k); out.push(x); } }
  return out;
}

// ---------- 起手秒 ----------
function startsFor(s: St, side: Side, u: number, cl: Sentence, cfg: Ai2Cfg, r: Rng): number[] {
  const w = windupFor(cl, u, s);
  if (cl.some((c) => c.k === "postpone")) return [w];
  const set = new Set<number>(
    cfg.mode === "playbook" ? [w, w + 3, 8, 12].filter((x) => x >= w && x <= P.TL)
      : [w, ...(w < P.TL - 1 && r() < 0.7 ? [w + 1 + Math.floor(r() * Math.min(8, P.TL - 1 - w))] : [])]);
  if (cfg.lvl >= 2) {   // 反制起手：对方已宣告的每一句，抢在它前面一秒 / 同一秒（防御与拆除同秒先手）
    for (const d of s.decl) if (d.side !== side && !d.gone) for (const x of [d.start - 1, d.start]) if (x >= w && x <= P.TL) set.add(x);
  }
  return [...set];
}

// ---------- 重复惩罚 ----------
function sig(cl: Sentence) { return cl.flatMap(wordsOf).join("|") + "#" + cl.map((c) => c.k).join(""); }
function recent(s: St, side: Side) {
  const prev = new Set<string>(), now = new Set<string>();
  // 日志里的宣告事件只带词序列，足够区分「同一类复杂句」
  for (const e of s.log) if (e.kind === "decl" && e.side === side) (e.rnd === s.rnd ? now : e.rnd >= s.rnd - 2 ? prev : now).add(e.words.join("|") + "#" + e.segs);
  return { prev, now };
}
const segsOf = (cl: Sentence) => cl.length;
function repeatPenalty(cl: Sentence, rec: { prev: Set<string>; now: Set<string> }) {
  if (!fancy(cl)) return 0;
  const key = cl.flatMap(wordsOf).join("|") + "#" + segsOf(cl);
  return (rec.now.has(key) ? REP_NOW : 0) + (rec.prev.has(key) ? REP_PREV : 0);
}
const REP_NOW = num("AI2_REPNOW", 3), REP_PREV = num("AI2_REPPREV", 1.5);

// ---------- 对手回应检查（大师）----------
/** 对 top 候选：假设我方这样出手，对手的剩余随从用「各自最好的朴素回应」（打任意敌人的 1~maxN 点、起手最早）会造成什么——取最坏。返回需要从估值里扣的差 */
function replyCheck(s0: St, side: Side, u: number, cl: Sentence | null, start: number, cfg: Ai2Cfg): number {
  const foe = (1 - side) as Side;
  const s = clone(s0);
  if (cl) { if (!declare(s, side, u, cl, start)) return 0; } else passUnit(s, u);
  s.turn = foe;
  // 对手最坏回应：每个未出手的对手随从，集火我方当前最低血的随从，数字取满
  let worst = Infinity;
  for (const pol of ["focus", "spread"]) {
    const t = clone(s);
    for (let g = 0; g < 12; g++) {
      const sd = nextSide(t); if (sd === -1) break;
      const x = unitsOf(sd).find((q) => alive(t, q) && !t.done[q])!;
      let ok = false;
      if (sd === foe) {
        const mine = unitsOf(side).filter((q) => alive(t, q));
        const tgt = pol === "focus" ? mine.reduce((b, q) => (t.hp[q] + t.sh[q] < t.hp[b] + t.sh[b] ? q : b), mine[0]) : mine[(x + g) % Math.max(1, mine.length)];
        const maxN = Math.max(1, ...t.side[foe].cards.filter((c) => c.cd === 0).map((c) => c.v)) + (P2.POS && x % 3 === 1 ? P2.POS_NUM : 0);
        for (let n = Math.min(6, maxN); n >= 1 && !ok; n--) { const c: Sentence = [act(dmg(n, unit(tgt)))]; if (canAfford(t, sd, c, x)) ok = declare(t, sd, x, c, windupFor(c, x, t)); }
      } else ok = defaultMove(t, sd, x);
      if (!ok) passUnit(t, x);
      t.turn = (1 - t.turn) as Side;
    }
    resolveRound(t);
    worst = Math.min(worst, evaluate(t, side, cfg));
  }
  return worst;
}

// ---------- 主入口 ----------
export function think(s: St, side: Side, r: Rng, cfg: Ai2Cfg = TIERS["进阶"]): { unit: number; cl: Sentence | null; start: number } {
  if (!cfg.lvl) return thinkClassic(s, side, r, cfg);
  const us = unitsOf(side).filter((x) => alive(s, x) && !s.done[x]);
  let best = { unit: us[0], cl: null as Sentence | null, start: 1 }, bestV = -Infinity;
  const all: { v: number; m: { unit: number; cl: Sentence | null; start: number } }[] = [];
  const rec = cfg.lvl >= 2 && flag("AI2_REP") ? recent(s, side) : { prev: new Set<string>(), now: new Set<string>() };
  for (const u of us) {
    const base = rollout(s, side, u, null, 1, cfg) + cfg.passBias;
    all.push({ v: base, m: { unit: u, cl: null, start: 1 } });
    if (base > bestV) { bestV = base; best = { unit: u, cl: null, start: 1 }; }
    const seen = new Set<string>();
    const cands = candidates(s, side, u, r, Math.ceil(cfg.k / us.length) + 1, cfg.mode ?? "free");
    if (flag("AI2_EXTRA")) cands.push(...extras(s, side, u, r, cfg.k));
    if (cfg.lvl >= 2) cands.push(...classExtras(s, side, u, r));
    for (const cl of cands) {
      const key = JSON.stringify(cl); if (seen.has(key)) continue; seen.add(key);
      const pen = repeatPenalty(cl, rec);
      for (const st of startsFor(s, side, u, cl, cfg, r)) {
        const v = rollout(s, side, u, cl, st, cfg) + (fancy(cl) ? cfg.recBonus : 0) - pen;
        all.push({ v, m: { unit: u, cl, start: st } });
        if (v > bestV) { bestV = v; best = { unit: u, cl, start: st }; }
      }
    }
  }
  // 大师：前几名再过一遍「对手回应」——对手剩下的随从集火我方最脆的人会怎样，取最坏
  if (cfg.lvl >= 3 && cfg.reply && flag("AI2_REPLY") && all.length > 1) {
    all.sort((a, b) => b.v - a.v);
    let bv = -Infinity;
    for (const x of all.slice(0, cfg.reply)) {
      const wc = replyCheck(s, side, x.m.unit, x.m.cl, x.m.start, cfg);
      const v = 0.5 * x.v + 0.5 * wc;
      if (v > bv) { bv = v; best = x.m; }
    }
  }
  if (cfg.blunder && r() < cfg.blunder && all.length > 1) { all.sort((a, b) => b.v - a.v); return all[Math.floor(r() * Math.min(3, all.length))].m; }
  return best;
}

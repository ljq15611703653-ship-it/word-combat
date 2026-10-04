// 原型的电脑：候选句子（含起手秒数）→ 推演几轮（默认策略接着打）→ 选估值最高的。风格 = 允许用哪些句式。
import { P, type Clause, type Cls } from "./rules";
import { alive, canAfford, clone, declare, nextSide, nextRound, nAlive, passUnit, resolveRound, total, unitsOf, windup, type St } from "./sim";

export type Style = "ATK" | "TURTLE" | "TRAP" | "BURST" | "FULL";
export const STYLES: Style[] = ["ATK", "TURTLE", "TRAP", "BURST", "FULL"];
export type Rng = () => number;
export function rngOf(seed: number): Rng { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export interface Cand { unit: number; cl: Clause[]; start: number }
const D = (n: number, tg: number, ifPrev?: "ok" | "fail", pierce?: boolean): Clause => ({ k: "dmg", n, tg, ifPrev, pierce });
const H = (n: number, tg: number, ifPrev?: "ok" | "fail"): Clause => ({ k: "heal", n, tg, ifPrev });
const SH = (n: number, tg: number): Clause => ({ k: "shield", n, tg });

export function avail(s: St, side: 0 | 1): number[] {
  const set = new Set<number>([1]);
  for (const c of s.side[side].cards) if (c.cd === 0) set.add(c.v);
  return [...set].sort((a, b) => a - b);
}
/** 候选起手秒：最早 / 稍晚 / 中段 / 末尾 */
const startsFor = (ws: number): number[] => [...new Set([ws, Math.min(P.TL, ws + 5), Math.max(ws, 10), P.TL].filter((x) => x >= ws))].slice(0, 3);

export function genCands(s: St, side: 0 | 1, style: Style, rng: Rng, cap = 40): Cand[] {
  const foe = (1 - side) as 0 | 1;
  const F = unitsOf(foe).filter((u) => alive(s, u)), A = unitsOf(side).filter((u) => alive(s, u));
  const nums = avail(s, side);
  const out: Cand[] = [], extra: Cand[] = [];
  for (const u of A) {
    if (s.done[u]) continue;
    const add = (cl: Clause[], ex = false, early = false) => {
      if (!canAfford(s, side, cl)) return;
      const ws = windup(cl);
      for (const st of early ? [ws] : startsFor(ws)) (ex ? extra : out).push({ unit: u, cl, start: st });
    };
    const useAtk = style === "ATK" || style === "FULL", useDef = style === "TURTLE" || style === "FULL";
    const useTrap = style === "TRAP" || style === "FULL", useBurst = style === "BURST" || style === "FULL";
    for (const n of nums) for (const f of F) add([D(n, f)]);
    for (const n of nums) for (const m of nums) for (const f of F) for (const g of F) if (f <= g) add([D(n, f), D(m, g)], true, true);
    if (useAtk) {
      for (const n of nums) for (const f of F) {
        add([D(n, f), D(n, f, "ok")], true, true);
        add([D(n, f, undefined, true)], true);                                     // 无视（对攻击：无视减伤）
        for (const g of F) add([D(n, f), D(n, g, "fail")], true, true);            // 若失败转火
        add([D(n, f), D(n, f, "fail", true)], true, true);                         // 被挡住就再来一刀无视
      }
      for (const n of nums) for (const f of F) for (const a of A) add([D(n, f), H(1, a, "ok")], true, true);
    }
    if (useDef) {
      for (const n of nums) for (const a of A) { add([H(n, a)]); add([SH(n, a)]); }
      for (const n of nums) for (const a of A) for (const b of A) add([H(n, a), SH(n, b)], true, true);
      for (const w of nums.filter((x) => x <= 3)) add([{ k: "immune", win: w }], true);   // 无视：对面长期句子的效果落不到我方
    }
    if (useTrap) {
      const use = (cls: Cls | "any"): any => ({ t: "use", cls });
      for (const w of nums.filter((x) => x <= 3)) for (const c of [1, 2]) for (const t of nums.filter((x) => x <= 4)) for (const n of [1, 2]) {
        if (!nums.includes(n)) continue;
        const common = { k: "trig" as const, win: w, cap: c, tight: t };
        add([{ ...common, who: "foe", ev: use("atk"), eff: { t: "dmgSrc", n } }], true);
        add([{ ...common, who: "foe", ev: use("heal"), eff: { t: "dmgSrc", n } }], true);
        add([{ ...common, who: "foe", ev: use("any"), eff: { t: "dmgSrc", n } }], true);
        add([{ ...common, who: "me", ev: { t: "hurt" }, eff: { t: "shieldAll", n } }], true);
        add([{ ...common, who: "foe", ev: { t: "down" }, eff: { t: "healAll", n } }], true);
        add([{ ...common, who: "me", ev: { t: "down" }, eff: { t: "dmgLow", n } }], true);
      }
      for (const w of nums.filter((x) => x <= 3)) for (const n of nums.filter((x) => x <= 3)) {
        for (const cls of ["atk", "heal"] as Cls[]) add([{ k: "absent", who: "foe", cls, win: w, eff: { t: "dmgLow", n } }], true);
        add([{ k: "absent", who: "me", cls: "atk", win: w, eff: { t: "healAll", n } }], true);
      }
      for (const cls of ["atk", "heal", "def", "any"] as const) add([{ k: "remove", cls }], true, true);
    }
    if (useBurst) {
      for (const wt of nums.filter((x) => x >= 2 && x <= 4)) for (const m of nums.filter((x) => x <= 3)) {
        add([{ k: "delay", wait: wt, mult: m, ref: "rounds" }], true);
        for (const cls of ["atk", "heal", "def"] as Cls[]) add([{ k: "delay", wait: wt, mult: m, ref: "count", cnt: { who: "me", ev: { t: "use", cls } } }], true);
        add([{ k: "delay", wait: wt, mult: m, ref: "count", cnt: { who: "foe", ev: { t: "hurt" } } }], true);
      }
      add([{ k: "cash" }], true, true);
    }
  }
  // 特殊句 + 一段伤害 并在一起（占一个随从的位置，不如顺手打一下）
  for (const e of extra.slice()) {
    const c0 = e.cl[0];
    if (e.cl.length !== 1 || (c0.k !== "trig" && c0.k !== "absent" && c0.k !== "delay" && c0.k !== "immune")) continue;
    const t = F.slice().sort((a, b) => s.hp[a] - s.hp[b])[0];
    if (t === undefined) continue;
    for (const n of [1, nums[nums.length - 1]]) { const cl = [D(n, t), ...e.cl]; if (canAfford(s, side, cl)) extra.push({ unit: e.unit, cl, start: Math.max(e.start, windup(cl)) }); }
  }
  // 分层抽样：每个「句式种类」各留几个
  const groups = new Map<string, Cand[]>();
  for (const e of extra) { const k = e.cl.map((x) => x.k + (x.k === "trig" ? ":" + (x.ev.t === "use" ? x.ev.cls : x.ev.t) + ":" + x.who : "") + ((x as any).pierce ? "!" : "") + ((x as any).ifPrev ?? "")).join("+"); (groups.get(k) ?? groups.set(k, []).get(k)!).push(e); }
  const picked: Cand[] = [];
  const per = Math.max(2, Math.floor(cap / Math.max(1, groups.size)));
  for (const g of groups.values()) { for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; } picked.push(...g.slice(0, per)); }
  return [...out, ...picked];
}

// ---------- 默认策略（推演用） ----------
function penaltyFor(s: St, side: 0 | 1, cls: Cls): number {
  let p = 0;
  for (const st of s.stand) {
    if (st.owner === side || st.c.k !== "trig" || st.c.who !== "foe") continue;
    const c = st.c;
    if (c.ev.t !== "use" || (c.ev.cls !== cls && c.ev.cls !== "any") || c.eff.t !== "dmgSrc" || st.fired >= c.cap) continue;
    const k = c.ev.cls === "any" ? "use:any" : `use:${cls}`;
    if ((st.lcnt[`foe|${k}`] ?? 0) + 1 > Math.max(0, P.THR0 - (c.tight - 1))) p += c.eff.n;
  }
  return p;
}
export function greedyMove(s: St, side: 0 | 1): Cand | null {
  const foe = (1 - side) as 0 | 1;
  const F = unitsOf(foe).filter((u) => alive(s, u)), A = unitsOf(side).filter((u) => alive(s, u));
  const left = A.filter((u) => !s.done[u]);
  if (!left.length) return null;
  const nums = avail(s, side).reverse();
  let best: Cand | null = null, bv = 0.2;
  const carry = (u: number) => s.stand.filter((x) => x.owner === foe && x.unit === u).length;
  const tgt = F.slice().sort((a, b) => (s.hp[a] - 2.5 * carry(a)) - (s.hp[b] - 2.5 * carry(b)))[0];
  const penAtk = penaltyFor(s, side, "atk"), penHeal = penaltyFor(s, side, "heal");
  const mk = (u: number, cl: Clause[]): Cand => ({ unit: u, cl, start: windup(cl) });
  for (const u of left) {
    for (const n of nums) {
      if (tgt === undefined) break;
      const cl = [D(n, tgt)];
      if (!canAfford(s, side, cl)) continue;
      const dealt = Math.min(n, s.hp[tgt]);
      const v = dealt * 1.2 + (dealt >= s.hp[tgt] ? 4 : 0) - penAtk * 1.3;
      if (v > bv) { bv = v; best = mk(u, cl); }
      break;
    }
    const hurt = A.slice().sort((a, b) => s.hp[a] - s.hp[b])[0];
    if (hurt !== undefined && P.HP - s.hp[hurt] >= 2) for (const n of nums) {
      const cl = [H(n, hurt)];
      if (!canAfford(s, side, cl)) continue;
      const v = Math.min(n, P.HP - s.hp[hurt]) * 0.95 - penHeal * 1.3;
      if (v > bv) { bv = v; best = mk(u, cl); }
      break;
    }
    const weak = A.slice().sort((a, b) => s.hp[a] - s.hp[b])[0];
    if (weak !== undefined && s.hp[weak] <= 3 && F.length) for (const n of nums) {
      const cl = [SH(n, weak)];
      if (!canAfford(s, side, cl)) continue;
      const v = Math.min(n, 3) * 0.7 - 0.8;
      if (v > bv) { bv = v; best = mk(u, cl); }
      break;
    }
    if (best) return best;
  }
  return null;
}
function playOut(s: St) {
  for (let guard = 0; guard < 20; guard++) {
    const ns = nextSide(s);
    if (ns === -1) return;
    const m = greedyMove(s, ns);
    if (m) declare(s, ns, m.unit, m.cl, m.start);
    else for (const u of unitsOf(ns)) if (alive(s, u) && !s.done[u]) passUnit(s, u);
    s.turn = (1 - ns) as 0 | 1;
  }
}
function value(s: St, me: 0 | 1): number {
  const foe = (1 - me) as 0 | 1;
  if (s.win >= 0) return s.win === 2 ? 0 : s.win === me ? 1000 - s.rnd * 10 : -1000 + s.rnd * 10;
  return 10 * (nAlive(s, me) - nAlive(s, foe)) + 1.2 * (total(s, me) - total(s, foe));
}
const HORIZON = 3;
const WTS = [1, 0.7, 0.5];
export function evalCand(s0: St, side: 0 | 1, c: Cand | null, unit: number): number {
  const s = clone(s0);
  if (c && c.cl.length) { if (!declare(s, side, c.unit, c.cl, c.start)) return -1e9; }
  else passUnit(s, unit);
  s.turn = (1 - side) as 0 | 1;
  let acc = 0;
  for (let r = 0; r < HORIZON; r++) {
    playOut(s);
    resolveRound(s);
    acc += WTS[r] * value(s, side);
    if (s.win >= 0) break;
    nextRound(s);
  }
  return acc;
}

export function choose(s: St, side: 0 | 1, style: Style, rng: Rng): Cand | null {
  const cands = genCands(s, side, style, rng);
  const idle = unitsOf(side).find((u) => alive(s, u) && !s.done[u])!;
  let best: Cand | null = null, bv = evalCand(s, side, null, idle) + 0.05;
  for (const c of cands) { const v = evalCand(s, side, c, c.unit) + rng() * 0.02; if (v > bv) { bv = v; best = c; } }
  return best;
}

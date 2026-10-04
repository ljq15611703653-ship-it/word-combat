// 句子规则原型：状态、宣告、结算（有起手秒数：每轮 TL 秒，句子在起手秒生效）
import { P, type Clause, type Cls, type Ev, type Eff, type Sentence, type Standing, type SideState } from "./rules";

export interface St {
  rnd: number;
  sec: number;                  // 结算时的当前秒
  hp: number[];                 // 6 个随从，0~2 = 我方（side 0），3~5 = 对方
  sh: number[];                 // 本轮减伤
  side: [SideState, SideState];
  stand: Standing[];
  decl: Sentence[];
  done: boolean[];
  first: 0 | 1;
  turn: 0 | 1;
  ord: number;
  win: -1 | 0 | 1 | 2;
  stats: Record<string, number>;
}
export const sideOf = (u: number): 0 | 1 => (u < 3 ? 0 : 1);
export const alive = (s: St, u: number) => s.hp[u] > 0;
export const unitsOf = (side: 0 | 1) => (side === 0 ? [0, 1, 2] : [3, 4, 5]);

export function newGame(first: 0 | 1): St {
  const mk = (): SideState => ({ ap: P.AP0, cards: P.CARDS0.map((v) => ({ v, cd: 0 })) });
  return { rnd: 1, sec: 0, hp: Array(6).fill(P.HP), sh: Array(6).fill(0), side: [mk(), mk()], stand: [], decl: [], done: Array(6).fill(false), first, turn: first, ord: 0, win: -1, stats: {} };
}
export function clone(s: St): St {
  return {
    ...s, hp: s.hp.slice(), sh: s.sh.slice(), side: [{ ap: s.side[0].ap, cards: s.side[0].cards.map((c) => ({ ...c })) }, { ap: s.side[1].ap, cards: s.side[1].cards.map((c) => ({ ...c })) }],
    stand: s.stand.map((x) => ({ ...x, lcnt: { ...x.lcnt } })), decl: s.decl.slice(), done: s.done.slice(), stats: { ...s.stats },
  };
}
const stat = (s: St, k: string, n = 1) => { s.stats[k] = (s.stats[k] ?? 0) + n; };

// ---------- 费用与起手时间 ----------
export function numsOf(c: Clause): number[] {
  switch (c.k) {
    case "dmg": case "heal": case "shield": return [c.n];
    case "trig": return [c.win, c.cap, c.tight, c.eff.n];
    case "absent": return [c.win, c.eff.n];
    case "delay": return [c.wait, c.mult];
    case "immune": return [c.win];
    default: return [];
  }
}
export function clauseCost(c: Clause): number {
  switch (c.k) {
    case "dmg": return P.BASE + (c.pierce ? P.PIERCE : 0);
    case "heal": return P.HEALC;
    case "shield": return P.SHC;
    case "trig": return P.STAND + (c.ev.t === "use" && c.ev.cls === "any" ? P.ANYCLS : 0);
    case "absent": case "delay": case "immune": return P.STAND;
    case "cash": return P.CASH;
    case "remove": return c.cls === "any" ? P.REMOVE_ANY : P.REMOVE;
  }
}
export function sentenceCost(cl: Clause[]): number {
  let t = 0;
  cl.forEach((c, i) => {
    const chainFollow = (c.k === "dmg" || c.k === "heal" || c.k === "shield") && c.ifPrev && i > 0;
    t += clauseCost(c) + (i > 0 && !chainFollow ? P.AND : 0);
  });
  return t;
}
/** 起手时间：段越多、数字越大，越晚才能生效（最早不能早于这一秒） */
export function windup(cl: Clause[]): number {
  const maxN = Math.max(1, ...cl.flatMap(numsOf));
  return Math.min(P.TL, 1 + (cl.length - 1) * P.WIND_CL + Math.floor((maxN - 1) * P.WIND_N));
}
export function pickCards(s: St, side: 0 | 1, nums: number[]): number[] | null {
  const used: number[] = [];
  const ns = nums.filter((n) => n >= 2).sort((a, b) => b - a);
  for (const n of ns) {
    let bi = -1;
    s.side[side].cards.forEach((c, j) => { if (c.cd === 0 && !used.includes(j) && (P.EXACT ? c.v === n : c.v >= n) && (bi < 0 || c.v < s.side[side].cards[bi].v)) bi = j; });
    if (bi < 0) return null;
    used.push(bi);
  }
  return used;
}
const isSpecial = (c: Clause) => c.k !== "dmg" && c.k !== "heal" && c.k !== "shield";
export function canAfford(s: St, side: 0 | 1, cl: Clause[]): { cost: number; nums: number[] } | null {
  const sp = cl.filter(isSpecial).length;
  if (sp && (s.stats[`s${side}:spec`] ?? 0) + sp > P.SPEC) return null;
  const cost = sentenceCost(cl);
  if (cost > s.side[side].ap) return null;
  const nums = cl.flatMap(numsOf).filter((n) => n >= 2);
  if (pickCards(s, side, nums) === null) return null;
  return { cost, nums };
}

// ---------- 宣告 ----------
export function declare(s: St, side: 0 | 1, unit: number, cl: Clause[], start = windup(cl)): boolean {
  const a = canAfford(s, side, cl);
  if (!a) return false;
  start = Math.max(start, windup(cl));
  const idx = pickCards(s, side, a.nums)!;
  for (const i of idx) s.side[side].cards[i].cd = 2;
  s.side[side].ap -= a.cost;
  s.done[unit] = true;
  s.decl.push({ side, unit, cl, ord: s.ord++, cost: a.cost, nums: a.nums, start });
  stat(s, `s${side}:spec`, cl.filter(isSpecial).length);
  for (const c of cl) {
    if (c.k === "trig" || c.k === "absent" || c.k === "immune") s.stand.push({ owner: side, unit, c, left: c.win, fired: 0, age: 0, cnt: 0, from: start, lcnt: {} });
    else if (c.k === "delay") s.stand.push({ owner: side, unit, c, left: c.wait, fired: 0, age: 0, cnt: 0, from: start, lcnt: {} });
    stat(s, `s${side}:${c.k}`);
  }
  stat(s, `s${side}:len`, cl.length); stat(s, `s${side}:sent`); stat(s, `s${side}:ap`, a.cost); stat(s, `s${side}:start`, start);
  return true;
}
export function passUnit(s: St, unit: number) { s.done[unit] = true; stat(s, `s${sideOf(unit)}:pass`); }
export function nextSide(s: St): 0 | 1 | -1 {
  const left = (sd: 0 | 1) => unitsOf(sd).some((u) => alive(s, u) && !s.done[u]);
  const a = left(0), b = left(1);
  if (!a && !b) return -1;
  if (a && b) return s.turn;
  return a ? 0 : 1;
}

// ---------- 事件与触发 ----------
const evKey = (e: Ev) => (e.t === "use" ? `use:${e.cls}` : e.t);
const active = (s: St, st: Standing) => s.sec >= st.from;
function emit(s: St, e: { t: "use"; cls: Cls } | { t: "down" } | { t: "hurt" }, side: 0 | 1, unit: number, noTrig: boolean) {
  const keys = e.t === "use" ? [`use:${e.cls}`, "use:any"] : [e.t];
  // 先给所有生效中的长期句子记一笔（不管它是不是这一刻触发）
  for (const st of s.stand) {
    if (!active(s, st)) continue;
    const rel = side === st.owner ? "me" : "foe";
    for (const k of keys) st.lcnt[`${rel}|${k}`] = (st.lcnt[`${rel}|${k}`] ?? 0) + 1;
    const c = st.c;
    if (c.k === "delay" && c.ref === "count" && c.cnt && c.cnt.who === rel && keys.includes(evKey(c.cnt.ev))) st.cnt++;
  }
  if (noTrig) return;
  for (const st of s.stand) {
    const c = st.c;
    if (c.k !== "trig" || !active(s, st)) continue;
    const rel = side === st.owner ? "me" : "foe";
    if (c.who !== rel || !keys.includes(evKey(c.ev))) continue;
    const thr = Math.max(0, P.THR0 - (c.tight - 1));
    if ((st.lcnt[`${c.who}|${evKey(c.ev)}`] ?? 0) <= thr || st.fired >= c.cap) continue;
    st.fired++; stat(s, `s${st.owner}:fire`);
    applyEff(s, st.owner, c.eff, unit);
  }
}
function lowestAlive(s: St, side: 0 | 1): number {
  let b = -1;
  for (const u of unitsOf(side)) if (alive(s, u) && (b < 0 || s.hp[u] < s.hp[b])) b = u;
  return b;
}
/** 对面有「无视」生效时，我方长期句子的效果落不到它身上 */
function immune(s: St, target: number): boolean {
  const sd = sideOf(target);
  return s.stand.some((x) => x.c.k === "immune" && x.owner === sd && active(s, x) && x.left > 0);
}
function applyEff(s: St, owner: 0 | 1, e: Eff, src: number) {
  const foe = (1 - owner) as 0 | 1;
  if (e.t === "dmgSrc") { if (alive(s, src) && sideOf(src) === foe && !immune(s, src)) hit(s, src, e.n, true, false); }
  else if (e.t === "dmgLow") { const t = lowestAlive(s, foe); if (t >= 0 && !immune(s, t)) hit(s, t, e.n, true, false); else if (t >= 0) stat(s, `s${foe}:ignored`); }
  else if (e.t === "healAll") { for (const u of unitsOf(owner)) if (alive(s, u)) s.hp[u] = Math.min(P.HP, s.hp[u] + e.n); }
  else if (e.t === "shieldAll") { for (const u of unitsOf(owner)) if (alive(s, u)) s.sh[u] += e.n; }
}
function hit(s: St, u: number, n: number, noTrig: boolean, pierce: boolean): number {
  const ab = pierce ? 0 : Math.min(s.sh[u], n); s.sh[u] -= ab;
  const d = Math.min(s.hp[u], n - ab);
  if (d > 0) {
    s.hp[u] -= d;
    emit(s, { t: "hurt" }, sideOf(u), u, noTrig);
    if (s.hp[u] <= 0) { emit(s, { t: "down" }, sideOf(u), u, noTrig); s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u)); }
  }
  return d;
}

// ---------- 结算 ----------
function clsOfStanding(x: Standing): Cls | "any" {
  const c = x.c;
  if (c.k === "trig") return c.ev.t === "use" ? (c.ev.cls === "any" ? "any" : c.ev.cls) : "atk";
  if (c.k === "absent") return c.cls;
  return "atk";
}
function runClause(s: St, sen: Sentence, c: Clause, prev: { ok: boolean }) {
  const me = sen.side, foe = (1 - me) as 0 | 1;
  if (c.k === "dmg" || c.k === "heal" || c.k === "shield") {
    if (c.ifPrev === "ok" && !prev.ok) return;
    if (c.ifPrev === "fail" && prev.ok) return;
  }
  if (c.k === "dmg") {
    let t = c.tg; if (!alive(s, t) || sideOf(t) !== foe) t = lowestAlive(s, foe);
    if (t < 0) { prev.ok = false; return; }
    emit(s, { t: "use", cls: "atk" }, me, sen.unit, false);
    const d = hit(s, t, c.n, false, !!c.pierce); prev.ok = d > 0; stat(s, `s${me}:dealt`, d);
    if (d <= 0) stat(s, `s${me}:blocked`);
  } else if (c.k === "heal") {
    let t = c.tg; if (!alive(s, t) || sideOf(t) !== me) t = lowestAlive(s, me);
    if (t < 0) { prev.ok = false; return; }
    emit(s, { t: "use", cls: "heal" }, me, sen.unit, false);
    const d = Math.max(0, Math.min(c.n - P.HEALPEN, P.HP - s.hp[t])); s.hp[t] += d; prev.ok = d > 0; stat(s, `s${me}:healed`, d);
  } else if (c.k === "shield") {
    let t = c.tg; if (!alive(s, t) || sideOf(t) !== me) t = lowestAlive(s, me);
    if (t < 0) { prev.ok = false; return; }
    emit(s, { t: "use", cls: "def" }, me, sen.unit, false);
    s.sh[t] += c.n; prev.ok = true;
  } else if (c.k === "remove") {
    const cand = s.stand.filter((x) => x.owner === foe && (c.cls === "any" || clsOfStanding(x) === c.cls)).sort((a, b) => b.left - a.left)[0];
    if (cand) { s.stand = s.stand.filter((x) => x !== cand); stat(s, `s${me}:removed`); } else stat(s, `s${me}:removeMiss`);
  } else if (c.k === "cash") {
    for (const st of s.stand.filter((x) => x.owner === me && x.c.k === "delay" && active(s, x))) cashStanding(s, st);
  }
}
function cashStanding(s: St, st: Standing) {
  const c = st.c; if (c.k !== "delay") return;
  const ref = c.ref === "rounds" ? st.age : st.cnt;
  const foe = (1 - st.owner) as 0 | 1, t = lowestAlive(s, foe);
  if (t >= 0 && ref > 0) { if (immune(s, t)) stat(s, `s${foe}:ignored`); else { const d = hit(s, t, ref * c.mult, true, false); stat(s, `s${st.owner}:burst`, d); } }
  st.left = -1;
}
const PHASE: Record<string, number> = { remove: 0, shield: 1, heal: 2, dmg: 3, cash: 4 };
export function resolveRound(s: St) {
  type Job = { sec: number; ph: number; ord: number; run: () => void };
  const jobs: Job[] = [];
  for (const sen of s.decl) {
    const chain = sen.cl.some((c) => "ifPrev" in c && c.ifPrev);
    if (chain) { jobs.push({ sec: sen.start, ph: PHASE[sen.cl[0].k] ?? 3, ord: sen.ord, run: () => { const prev = { ok: true }; for (const c of sen.cl) runClause(s, sen, c, prev); } }); continue; }
    for (const c of sen.cl) if (c.k in PHASE) jobs.push({ sec: sen.start, ph: PHASE[c.k], ord: sen.ord, run: () => { runClause(s, sen, c, { ok: true }); } });
  }
  jobs.sort((a, b) => a.sec - b.sec || a.ph - b.ph || a.ord - b.ord);
  for (const j of jobs) {
    s.sec = j.sec;
    j.run();
  }
  s.sec = P.TL + 1;
  // 回合末
  for (const st of s.stand) {
    st.age++;
    if (st.c.k === "absent" && st.age >= 1) {
      const c = st.c;
      if (!((st.lcnt[`${c.who}|use:${c.cls}`] ?? 0) > 0)) {
        const tgtSide = c.who === "me" ? st.owner : ((1 - st.owner) as 0 | 1);
        void tgtSide;
        st.fired++; stat(s, `s${st.owner}:fire`); applyEff(s, st.owner, c.eff, -1);
      }
    }
    if (st.c.k === "delay" && st.age >= st.c.wait) cashStanding(s, st);
  }
  const preHp = [0, 1].map((sd) => unitsOf(sd as 0 | 1).reduce((a, u) => a + Math.max(0, s.hp[u]), 0));
  if (s.rnd >= P.HEAT_FROM) for (let u = 0; u < 6; u++) if (s.hp[u] > 0) { s.hp[u] = Math.max(0, s.hp[u] - (s.rnd - 2)); if (s.hp[u] <= 0) s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u)); }
  s.stand = s.stand.filter((x) => { if (x.left === -1) return false; if (x.c.k === "delay") return true; x.left--; return x.left > 0; });
  const al = [0, 1].map((sd) => unitsOf(sd as 0 | 1).filter((u) => s.hp[u] > 0).length);
  if (al[0] === 0 || al[1] === 0) s.win = al[0] === 0 && al[1] === 0 ? (preHp[0] === preHp[1] ? 2 : preHp[0] > preHp[1] ? 0 : 1) : al[0] === 0 ? 1 : 0;
  else if (s.rnd >= P.ROUNDS) { const hs = [0, 1].map((sd) => unitsOf(sd as 0 | 1).reduce((a, u) => a + s.hp[u], 0)); s.win = al[0] !== al[1] ? (al[0] > al[1] ? 0 : 1) : hs[0] === hs[1] ? 2 : hs[0] > hs[1] ? 0 : 1; }
}
export function nextRound(s: St) {
  s.rnd++; s.sec = 0; s.sh.fill(0);
  s.stand.forEach((x) => { x.fired = 0; x.from = 0; x.lcnt = {}; });
  s.decl = []; s.done = Array(6).fill(false);
  s.first = (1 - s.first) as 0 | 1; s.turn = s.first; s.ord = 0;
  for (const sd of [0, 1] as const) {
    const S = s.side[sd]; S.ap = Math.min(P.APCAP, S.ap + P.APINC);
    for (const c of S.cards) if (c.cd > 0) c.cd--;
    for (const v of P.SCHEDULE[s.rnd] ?? []) S.cards.push({ v, cd: 0 });
  }
}
export const total = (s: St, side: 0 | 1) => unitsOf(side).reduce((a, u) => a + Math.max(0, s.hp[u]), 0);
export const nAlive = (s: St, side: 0 | 1) => unitsOf(side).filter((u) => s.hp[u] > 0).length;

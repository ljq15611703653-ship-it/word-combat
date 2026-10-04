// 句子解释器：一棵语法树 + 一份事件日志。窗口、存在/不存在、引用量全部是对日志的查询，没有写死的「陷阱句式」。
import { P, type SideState } from "../lab/rules";
import {
  type Clause, type Eff, type Obj, type Query, type Amt, type Sentence, type Side, type Tg,
  wordsOf, catsOf, numsOf, sentenceCost, windup,
} from "./ast";

export interface Ev {
  seq: number; rnd: number; sord: number; rord: number;
  side: Side;                       // 这件事「属于」哪一方：使用/宣告 = 出手方；受伤/倒下/被恢复 = 承受方
  kind: "use" | "decl" | "hurt" | "down" | "healed";
  words: string[]; cats: string[]; amt: number; len: number; segs: number;
  src: number;                      // 造成它的随从（没有 = -1）
  trig: boolean;                    // 由长期句子的效果产生（一层封顶：不再触发别的长期句子）
}
export interface Standing {
  owner: Side; unit: number; c: Clause; sord: number;
  words: string[]; cats: string[];
  active: boolean; from: number;    // 生效秒数
  fromSeq: number; fromRnd: number;
  rseq: number;                     // 本轮起算的日志位置（按轮计数的触发用）
  age: number; left: number; fired: number;
}
export interface Decl { side: Side; unit: number; cl: Sentence; ord: number; sord: number; cost: number; nums: number[]; start: number }
export interface St {
  rnd: number; sec: number; seq: number; sord: number;
  hp: number[]; sh: number[];
  side: [SideState, SideState];
  stand: Standing[]; decl: Decl[]; log: Ev[]; done: boolean[];
  first: Side; turn: Side; ord: number; win: -1 | 0 | 1 | 2;
  stats: Record<string, number>;
}
export const sideOf = (u: number): Side => (u < 3 ? 0 : 1);
export const alive = (s: St, u: number) => s.hp[u] > 0;
export const unitsOf = (side: Side) => (side === 0 ? [0, 1, 2] : [3, 4, 5]);
export const total = (s: St, side: Side) => unitsOf(side).reduce((a, u) => a + Math.max(0, s.hp[u]), 0);
export const nAlive = (s: St, side: Side) => unitsOf(side).filter((u) => s.hp[u] > 0).length;
const stat = (s: St, k: string, n = 1) => { s.stats[k] = (s.stats[k] ?? 0) + n; };

export function newGame(first: Side): St {
  const mk = (): SideState => ({ ap: P.AP0, cards: P.CARDS0.map((v) => ({ v, cd: 0 })) });
  return { rnd: 1, sec: 0, seq: 0, sord: 0, hp: Array(6).fill(P.HP), sh: Array(6).fill(0), side: [mk(), mk()], stand: [], decl: [], log: [], done: Array(6).fill(false), first, turn: first, ord: 0, win: -1, stats: {} };
}
export function clone(s: St): St {
  const sd = (x: SideState): SideState => ({ ap: x.ap, cards: x.cards.map((c) => ({ ...c })) });
  return { ...s, hp: s.hp.slice(), sh: s.sh.slice(), side: [sd(s.side[0]), sd(s.side[1])], stand: s.stand.map((x) => ({ ...x })), decl: s.decl.slice(), log: s.log.slice(), done: s.done.slice(), stats: { ...s.stats } };
}

// ---------- 查询 ----------
interface Ctx { owner: Side; sord: number; fromSeq?: number; fromRnd?: number }
function match(e: Ev, o: Obj): boolean {
  switch (o.t) {
    case "word": return e.words.includes(o.w);
    case "cat": return o.c === "any" ? e.kind === "use" : e.cats.includes(o.c);
    case "ev": return e.kind === o.e;
    case "nth": return e.kind === "decl" && e.rord === o.n;
    case "order": { const a = e.words.indexOf(o.a), b = e.words.indexOf(o.b); return e.kind === "decl" && a >= 0 && b > a; }
  }
}
const value = (e: Ev, agg: Query["agg"]) => (agg === "count" ? 1 : agg === "sum" ? e.amt : e.kind === "decl" ? (agg === "len" ? e.len : e.segs) : 0);
export function evalQ(s: St, q: Query, c: Ctx): number {
  const side = q.who === "me" ? c.owner : ((1 - c.owner) as Side);
  const w = q.win;
  let tot = 0;
  for (const e of s.log) {
    if (e.side !== side) continue;
    if (w.dir === "before") {
      if (w.unit === "round" ? e.rnd <= s.rnd - w.n : e.sord >= c.sord || e.sord < c.sord - w.n) continue;
    } else {
      if (e.seq < (c.fromSeq ?? s.seq)) continue;
      if (w.unit === "round" ? e.rnd >= (c.fromRnd ?? s.rnd) + w.n : e.sord <= c.sord || e.sord > c.sord + w.n) continue;
    }
    if (match(e, q.obj)) tot += value(e, q.agg);
  }
  return tot;
}
const thr = (q: Query) => Math.max(0, P.THR0 - ((q.tight ?? 1) - 1));
const amount = (s: St, a: Amt, c: Ctx) => (typeof a === "number" ? a : Math.floor(evalQ(s, a.q, c) * a.mult));

// ---------- 事件与触发 ----------
function emit(s: St, e: Omit<Ev, "seq" | "rnd" | "rord" | "trig"> & { trig?: boolean; rord?: number }): Ev {
  const ev: Ev = { ...e, seq: s.seq++, rnd: s.rnd, rord: e.rord ?? 0, trig: !!e.trig };
  s.log.push(ev);
  if (!ev.trig) for (const st of s.stand.slice()) fireStanding(s, st, ev);
  return ev;
}
function roundCount(s: St, st: Standing, q: Query): number {
  const side = q.who === "me" ? st.owner : ((1 - st.owner) as Side);
  let n = 0;
  for (const e of s.log) if (e.rnd === s.rnd && e.seq >= st.rseq && e.side === side && match(e, q.obj)) n += value(e, q.agg);
  return n;
}
function fireStanding(s: St, st: Standing, ev: Ev) {
  const c = st.c;
  if (c.k !== "when" || c.q.win.dir !== "after" || c.judge !== "exist" || !st.active) return;
  const q = c.q;
  const side = q.who === "me" ? st.owner : ((1 - st.owner) as Side);
  if (ev.side !== side || !match(ev, q.obj)) return;
  if (q.win.unit === "sent" && (ev.sord <= st.sord || ev.sord > st.sord + q.win.n)) return;
  const cnt = q.win.unit === "round" ? roundCount(s, st, q) : evalQ(s, q, { owner: st.owner, sord: st.sord, fromSeq: st.fromSeq, fromRnd: st.fromRnd });
  if (cnt <= thr(q) || st.fired >= c.cap) return;
  st.fired++; stat(s, `s${st.owner}:fire`);
  for (const e of c.effs) exec(s, st.owner, e, { src: ev.src, sord: st.sord, noTrig: true, ctx: { owner: st.owner, sord: st.sord, fromSeq: st.fromSeq, fromRnd: st.fromRnd } });
}
function lowest(s: St, side: Side): number {
  let b = -1;
  for (const u of unitsOf(side)) if (alive(s, u) && (b < 0 || s.hp[u] < s.hp[b])) b = u;
  return b;
}
/** 对面有「无视 长期句子」生效时，我方长期句子的效果落不到它身上 */
const shielded = (s: St, u: number) => s.stand.some((x) => x.c.k === "ignore" && x.owner === sideOf(u) && x.active && x.left > 0);

interface Run { src: number; sord: number; noTrig: boolean; ctx: Ctx; unit?: number }
function targets(s: St, owner: Side, e: Eff, r: Run): number[] {
  const foe = (1 - owner) as Side, want = e.verb === "dmg" ? foe : owner;
  const t = e.tg;
  const fix = (u: number) => (u >= 0 && alive(s, u) && sideOf(u) === want ? u : lowest(s, want));
  switch (t.t) {
    case "unit": return [fix(t.u)].filter((u) => u >= 0);
    case "src": return r.src >= 0 && alive(s, r.src) && sideOf(r.src) === want ? [r.src] : [];
    case "lowFoe": case "lowMe": return [lowest(s, want)].filter((u) => u >= 0);
    case "allMe": return unitsOf(owner).filter((u) => alive(s, u));
    case "allFoe": return unitsOf(foe).filter((u) => alive(s, u));
  }
}
function hit(s: St, u: number, n: number, pierce: boolean, r: Run, owner: Side): number {
  const ab = pierce ? 0 : Math.min(s.sh[u], n); s.sh[u] -= ab;
  const d = Math.min(s.hp[u], n - ab);
  if (d > 0) {
    s.hp[u] -= d;
    emit(s, { sord: r.sord, side: sideOf(u), kind: "hurt", words: [], cats: ["dmg", "hpchg"], amt: d, len: 0, segs: 0, src: r.unit ?? r.src, trig: r.noTrig });
    if (s.hp[u] <= 0) {
      emit(s, { sord: r.sord, side: sideOf(u), kind: "down", words: [], cats: [], amt: 1, len: 0, segs: 0, src: r.unit ?? r.src, trig: r.noTrig });
      s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u));
    }
  }
  void owner;
  return d;
}
/** 执行一个效果，返回「成功」（真的发生了） */
function exec(s: St, owner: Side, e: Eff, r: Run, emitUse = false): boolean {
  const n = amount(s, e.n, r.ctx);
  const tg = targets(s, owner, e, r);
  if (!tg.length) return false;
  if (emitUse) {
    const w = e.verb === "dmg" ? ["造成"] : e.verb === "heal" ? ["恢复"] : ["减伤"];
    emit(s, { sord: r.sord, side: owner, kind: "use", words: w, cats: (e.verb === "dmg" ? ["atk", "dmg", "hpchg"] : e.verb === "heal" ? ["heal", "hpchg"] : ["def", "guard"]), amt: n, len: 0, segs: 0, src: r.unit ?? -1, trig: r.noTrig });
  }
  let ok = false;
  for (const u of tg) {
    if (e.verb === "dmg") {
      if (r.noTrig && sideOf(u) !== owner && shielded(s, u)) { stat(s, `s${sideOf(u)}:ignored`); continue; }
      if (n <= 0) continue;
      const d = hit(s, u, n, e.ignore === "shield", r, owner);
      if (d > 0) { ok = true; stat(s, `s${owner}:dealt`, d); } else stat(s, `s${owner}:blocked`);
    } else if (e.verb === "heal") {
      const d = Math.max(0, Math.min(n - P.HEALPEN, P.HP - s.hp[u]));
      s.hp[u] += d; if (d > 0) { ok = true; stat(s, `s${owner}:healed`, d); emit(s, { sord: r.sord, side: sideOf(u), kind: "healed", words: [], cats: ["heal", "hpchg"], amt: d, len: 0, segs: 0, src: r.unit ?? -1, trig: r.noTrig }); }
    } else { s.sh[u] += n; ok = true; }
  }
  return ok;
}

// ---------- 费用 / 数字牌 / 宣告 ----------
export function pickCards(s: St, side: Side, nums: number[]): number[] | null {
  const used: number[] = [];
  for (const n of nums.filter((x) => x >= 2).sort((a, b) => b - a)) {
    let bi = -1;
    s.side[side].cards.forEach((c, j) => { if (c.cd === 0 && !used.includes(j) && (P.EXACT ? c.v === n : c.v >= n) && (bi < 0 || c.v < s.side[side].cards[bi].v)) bi = j; });
    if (bi < 0) return null;
    used.push(bi);
  }
  return used;
}
export function canAfford(s: St, side: Side, cl: Sentence): { cost: number; nums: number[] } | null {
  const cost = sentenceCost(cl);
  if (cost > s.side[side].ap) return null;
  const nums = cl.flatMap(numsOf).filter((n) => n >= 2);
  return pickCards(s, side, nums) === null ? null : { cost, nums };
}
const isStanding = (c: Clause) => (c.k === "when" && c.q.win.dir === "after") || c.k === "delay" || c.k === "ignore";
export function declare(s: St, side: Side, unit: number, cl: Sentence, start = windup(cl)): boolean {
  const a = canAfford(s, side, cl);
  if (!a) return false;
  start = Math.max(start, windup(cl));
  for (const i of pickCards(s, side, a.nums)!) s.side[side].cards[i].cd = 2;
  s.side[side].ap -= a.cost; s.done[unit] = true;
  const sord = s.sord++, ord = s.ord++;
  s.decl.push({ side, unit, cl, ord, sord, cost: a.cost, nums: a.nums, start });
  const words = cl.flatMap(wordsOf), cats = [...new Set(cl.flatMap(catsOf))];
  emit(s, { sord, rord: ord + 1, side, kind: "decl", words, cats, amt: a.cost, len: words.length, segs: cl.length, src: unit });
  for (const c of cl) {
    if (isStanding(c)) {
      s.stand.push({ owner: side, unit, c, sord, words: wordsOf(c), cats: catsOf(c), active: false, from: start, fromSeq: 0, rseq: 0, fromRnd: s.rnd, age: 0, fired: 0, left: c.k === "when" ? (c.q.win.unit === "round" ? c.q.win.n : 99) : c.k === "delay" ? c.wait : c.win });
    }
    stat(s, `s${side}:${c.k}`);
  }
  stat(s, `s${side}:len`, cl.length); stat(s, `s${side}:sent`); stat(s, `s${side}:ap`, a.cost); stat(s, `s${side}:start`, start);
  return true;
}
export function passUnit(s: St, unit: number) { s.done[unit] = true; stat(s, `s${sideOf(unit)}:pass`); }
export function nextSide(s: St): Side | -1 {
  const left = (sd: Side) => unitsOf(sd).some((u) => alive(s, u) && !s.done[u]);
  const a = left(0), b = left(1);
  return !a && !b ? -1 : a && b ? s.turn : a ? 0 : 1;
}

// ---------- 结算 ----------
const PH = { remove: 0, shield: 1, heal: 2, dmg: 3, cash: 4 };
const phaseOf = (c: Clause): number => c.k === "remove" ? PH.remove : c.k === "cash" ? PH.cash : c.k === "act" ? PH[c.eff.verb] : c.k === "when" ? PH[c.effs[0]?.verb ?? "dmg"] : PH.dmg;
function standingMatches(x: Standing, o: Obj) { return o.t === "word" ? x.words.includes(o.w) : o.t === "cat" ? (o.c === "any" || x.cats.includes(o.c)) : false; }
function cashStanding(s: St, st: Standing) {
  const c = st.c; if (c.k !== "delay") return;
  const ctx: Ctx = { owner: st.owner, sord: st.sord, fromSeq: st.fromSeq, fromRnd: st.fromRnd };
  for (const e of c.effs) if (exec(s, st.owner, e, { src: -1, sord: st.sord, noTrig: true, ctx })) stat(s, `s${st.owner}:burst`);
  st.left = -1;
}
function runClause(s: St, d: Decl, c: Clause, prev: { ok: boolean }) {
  const me = d.side, foe = (1 - me) as Side;
  const run = (e: Eff, emitUse: boolean) => exec(s, me, e, { src: d.unit, unit: d.unit, sord: d.sord, noTrig: false, ctx: { owner: me, sord: d.sord } }, emitUse);
  if (c.k === "act") {
    if (c.ifPrev === "ok" && !prev.ok) return;
    if (c.ifPrev === "fail" && prev.ok) return;
    prev.ok = run(c.eff, true);
  } else if (c.k === "when") {
    // before 窗口：宣告生效那一刻判断一次
    const cnt = evalQ(s, c.q, { owner: me, sord: d.sord });
    const yes = c.judge === "exist" ? cnt > thr(c.q) : cnt === 0;
    if (yes) { stat(s, `s${me}:fire`); for (const e of c.effs) run(e, false); }
  } else if (c.k === "remove") {
    const cand = s.stand.filter((x) => x.owner === foe && standingMatches(x, c.obj)).sort((a, b) => b.left - a.left)[0];
    if (cand) { s.stand = s.stand.filter((x) => x !== cand); stat(s, `s${me}:removed`); } else stat(s, `s${me}:removeMiss`);
  } else if (c.k === "cash") {
    for (const st of s.stand.filter((x) => x.owner === me && x.c.k === "delay" && x.active)) cashStanding(s, st);
  }
}
export function resolveRound(s: St) {
  type Job = { sec: number; ph: number; ord: number; run: () => void };
  const jobs: Job[] = [];
  for (const d of s.decl) {
    for (const st of s.stand.filter((x) => x.sord === d.sord && x.from === d.start && !x.active)) jobs.push({ sec: d.start, ph: -1, ord: d.ord, run: () => { st.active = true; st.fromSeq = s.seq; st.rseq = s.seq; st.fromRnd = s.rnd; } });
    const chain = d.cl.some((c) => c.k === "act" && c.ifPrev);
    if (chain) { jobs.push({ sec: d.start, ph: phaseOf(d.cl[0]), ord: d.ord, run: () => { const prev = { ok: true }; for (const c of d.cl) runClause(s, d, c, prev); } }); continue; }
    for (const c of d.cl) if (!isStanding(c)) jobs.push({ sec: d.start, ph: phaseOf(c), ord: d.ord, run: () => runClause(s, d, c, { ok: true }) });
  }
  jobs.sort((a, b) => a.sec - b.sec || a.ph - b.ph || a.ord - b.ord);
  for (const j of jobs) { s.sec = j.sec; j.run(); }
  s.sec = P.TL + 1;
  // 回合末：「不存在」长期句子判断、定时到期
  for (const st of s.stand.slice()) {
    if (!st.active) continue;
    st.age++;
    const c = st.c;
    if (c.k === "when" && c.q.win.dir === "after" && c.judge === "absent" && roundCount(s, st, c.q) === 0) {
      st.fired++; stat(s, `s${st.owner}:fire`);
      for (const e of c.effs) exec(s, st.owner, e, { src: -1, sord: st.sord, noTrig: true, ctx: { owner: st.owner, sord: st.sord, fromSeq: st.fromSeq, fromRnd: st.fromRnd } });
    }
    if (c.k === "delay" && st.age >= c.wait) cashStanding(s, st);
  }
  const pre = [total(s, 0), total(s, 1)];
  if (s.rnd >= P.HEAT_FROM) for (let u = 0; u < 6; u++) if (s.hp[u] > 0) { s.hp[u] = Math.max(0, s.hp[u] - (s.rnd - 2)); if (s.hp[u] <= 0) s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u)); }
  s.stand = s.stand.filter((x) => { if (x.left === -1) return false; if (x.c.k === "delay") return true; x.left--; return x.left > 0; });
  const al = [nAlive(s, 0), nAlive(s, 1)];
  if (al[0] === 0 || al[1] === 0) s.win = al[0] === 0 && al[1] === 0 ? (pre[0] === pre[1] ? 2 : pre[0] > pre[1] ? 0 : 1) : al[0] === 0 ? 1 : 0;
  else if (s.rnd >= P.ROUNDS) { const h = [total(s, 0), total(s, 1)]; s.win = al[0] !== al[1] ? (al[0] > al[1] ? 0 : 1) : h[0] === h[1] ? 2 : h[0] > h[1] ? 0 : 1; }
}
export function nextRound(s: St) {
  s.rnd++; s.sec = 0; s.sh.fill(0);
  // 长期句子：新的一轮从第 0 秒起生效、本轮触发次数清零
  s.stand.forEach((x) => { x.fired = 0; x.from = 0; x.rseq = s.seq; });
  s.decl = []; s.done = Array(6).fill(false);
  s.first = (1 - s.first) as Side; s.turn = s.first; s.ord = 0;
  for (const sd of [0, 1] as const) {
    const S = s.side[sd]; S.ap = Math.min(P.APCAP, S.ap + P.APINC);
    for (const c of S.cards) if (c.cd > 0) c.cd--;
    for (const v of P.SCHEDULE[s.rnd] ?? []) S.cards.push({ v, cd: 0 });
  }
}
export { type Tg };

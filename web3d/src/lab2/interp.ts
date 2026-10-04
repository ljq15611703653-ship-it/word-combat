// 句子解释器：一棵语法树 + 一份事件日志。窗口、存在/不存在、引用量全部是对日志的查询，没有写死的「陷阱句式」。
import { P, type SideState } from "../lab/rules";
import { P2, type Deck } from "./params";
import {
  type Clause, type Eff, type Obj, type Query, type Amt, type Sentence, type Side, type Tg, type StatusKind,
  wordsOf, catsOf, numsOf, sentenceCost, windup, advWordsOf, refKindsOf, legal,
} from "./ast";

export interface Ev {
  seq: number; rnd: number; sord: number; rord: number;
  side: Side;                       // 这件事「属于」哪一方：使用/宣告 = 出手方；受伤/倒下/被恢复 = 承受方
  kind: "use" | "decl" | "hurt" | "down" | "healed" | "dealt";   // dealt = 实际打掉的伤害（攻击方）；hurt = 实际受到的伤害（承受方）
  words: string[]; cats: string[]; amt: number; len: number; segs: number;
  src: number;                      // 造成它的随从（没有 = -1）
  derived?: boolean;                // 数量来自「引用量」的效果产生的事件：不再被引用量查询统计（防止滚雪球）
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
export interface Status { unit: number; kind: StatusKind; lvl: number; left: number }
export interface Decl { side: Side; unit: number; cl: Sentence; ord: number; sord: number; cost: number; nums: number[]; start: number }
export const REF_KINDS = ["cond", "win", "judge", "ref", "all"] as const;
export interface St {
  rnd: number; sec: number; seq: number; sord: number;
  hp: number[]; sh: number[];
  side: [SideState, SideState];
  deck: [Deck | null, Deck | null];                  // 进阶词剩余张数（null = 不限，测试用）
  refc: [Record<string, number[]>, Record<string, number[]>];   // 自指词：每张的冷却
  sts: Status[];
  stand: Standing[]; decl: Decl[]; log: Ev[]; done: boolean[];
  first: Side; turn: Side; ord: number; win: -1 | 0 | 1 | 2;
  stats: Record<string, number>;
  rec?: { side: Side; rnd: number; unit: number; cl: Sentence }[];   // 只在真实对局里记录（克隆不带）
}
export const sideOf = (u: number): Side => (u < 3 ? 0 : 1);
export const alive = (s: St, u: number) => s.hp[u] > 0;
export const unitsOf = (side: Side) => (side === 0 ? [0, 1, 2] : [3, 4, 5]);
export const total = (s: St, side: Side) => unitsOf(side).reduce((a, u) => a + Math.max(0, s.hp[u]), 0);
export const nAlive = (s: St, side: Side) => unitsOf(side).filter((u) => s.hp[u] > 0).length;
const stat = (s: St, k: string, n = 1) => { s.stats[k] = (s.stats[k] ?? 0) + n; };

const mkRef = () => Object.fromEntries(REF_KINDS.map((k) => [k, Array(k === "all" ? 1 : P2.REFCOPIES).fill(0)])) as Record<string, number[]>;
export function newGame(first: Side, decks: [Deck | null, Deck | null] = [null, null], record = false): St {
  const mk = (): SideState => ({ ap: P.AP0, cards: P.CARDS0.map((v) => ({ v, cd: 0 })) });
  return {
    rnd: 1, sec: 0, seq: 0, sord: 0, hp: Array(6).fill(P.HP), sh: Array(6).fill(0), side: [mk(), mk()],
    deck: [decks[0] ? { ...decks[0] } : null, decks[1] ? { ...decks[1] } : null], refc: [mkRef(), mkRef()], sts: [],
    stand: [], decl: [], log: [], done: Array(6).fill(false), first, turn: first, ord: 0, win: -1, stats: {}, rec: record ? [] : undefined,
  };
}
export function clone(s: St): St {
  const sd = (x: SideState): SideState => ({ ap: x.ap, cards: x.cards.map((c) => ({ ...c })) });
  const rf = (r: Record<string, number[]>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.slice()]));
  return {
    ...s, hp: s.hp.slice(), sh: s.sh.slice(), side: [sd(s.side[0]), sd(s.side[1])],
    deck: [s.deck[0] ? { ...s.deck[0] } : null, s.deck[1] ? { ...s.deck[1] } : null], refc: [rf(s.refc[0]), rf(s.refc[1])], sts: s.sts.map((x) => ({ ...x })),
    stand: s.stand.map((x) => ({ ...x })), decl: s.decl.slice(), log: s.log.slice(), done: s.done.slice(), stats: { ...s.stats }, rec: undefined,
  };
}

// ---------- 查询 ----------
interface Ctx { owner: Side; sord: number; fromSeq?: number; fromRnd?: number }
function match(e: Ev, o: Obj): boolean {
  switch (o.t) {
    case "word": return e.words.includes(o.w);
    case "cat": return e.kind !== "decl" && (o.c === "any" ? e.kind === "use" : e.cats.includes(o.c));
    case "ev": return e.kind === o.e;
    case "nth": return e.kind === "decl" && e.rord === o.n;
    case "order": { const a = e.words.indexOf(o.a), b = e.words.indexOf(o.b); return e.kind === "decl" && a >= 0 && b > a; }
  }
}
/** 查询是否命中事件：词在「句」窗口里看宣告的句子，在「轮」窗口里看实际使用；其余照 match */
const matchQ = (e: Ev, q: Query) => (q.obj.t === "word" ? (q.win.unit === "sent" ? e.kind === "decl" : e.kind === "use") && match(e, q.obj) : match(e, q.obj));
const value = (e: Ev, agg: Query["agg"]) => (agg === "count" ? 1 : agg === "sum" ? e.amt : e.kind === "decl" ? (agg === "len" ? e.len : e.segs) : 0);
export function evalQ(s: St, q: Query, c: Ctx): number {
  const side = q.who === "me" ? c.owner : ((1 - c.owner) as Side);
  const w = q.win;
  let tot = 0;
  for (const e of s.log) {
    if (e.side !== side || e.derived) continue;
    if (w.dir === "before") {
      // 「之前 N 轮」= 已经结束的前 N 轮（不含当前这一轮）；要读本轮用「之前 N 句」
      if (w.unit === "round" ? e.rnd >= s.rnd || e.rnd < s.rnd - w.n : e.sord >= c.sord || e.sord < c.sord - w.n) continue;
    } else {
      if (e.seq < (c.fromSeq ?? s.seq)) continue;
      if (w.unit === "round" ? e.rnd >= (c.fromRnd ?? s.rnd) + w.n : e.sord <= c.sord || e.sord > c.sord + w.n) continue;
    }
    if (matchQ(e, q)) tot += value(e, q.agg);
  }
  return tot;
}
/** 触发门槛：基线按「量的种类」定，收紧每 +1 降低 1；「之前」窗口的次数类基线为 0（存在 = 至少一次） */
export function thr(q: Query): number {
  const base = q.agg === "count" ? (q.win.dir === "before" ? 0 : P.THR0) : q.agg === "sum" ? P2.THR_SUM : q.agg === "len" ? P2.THR_LEN : P2.THR_SEGS;
  return Math.max(0, base - ((q.tight ?? 1) - 1));
}
const amount = (s: St, a: Amt, c: Ctx) => (typeof a === "number" ? a : Math.min(P2.QCAP, Math.floor(evalQ(s, a.q, c) * a.mult)));

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
  for (const e of s.log) if (e.rnd === s.rnd && e.seq >= st.rseq && e.side === side && matchQ(e, q)) n += value(e, q.agg);
  return n;
}
const sctx = (st: Standing): Ctx => ({ owner: st.owner, sord: st.sord, fromSeq: st.fromSeq, fromRnd: st.fromRnd });
function fireStanding(s: St, st: Standing, ev: Ev) {
  const c = st.c;
  if (c.k !== "when" || c.q.win.dir !== "after" || c.judge !== "exist" || !st.active) return;
  const q = c.q;
  const side = q.who === "me" ? st.owner : ((1 - st.owner) as Side);
  if (ev.side !== side || !matchQ(ev, q)) return;
  if (q.win.unit === "sent" && (ev.sord <= st.sord || ev.sord > st.sord + q.win.n)) return;
  const cnt = q.win.unit === "round" ? roundCount(s, st, q) : evalQ(s, q, sctx(st));
  if (cnt <= thr(q) || st.fired >= c.cap) return;
  st.fired++; stat(s, `s${st.owner}:fire`);
  for (const e of c.effs) exec(s, st.owner, e, { src: ev.src, actor: st.unit, sord: st.sord, noTrig: true, ctx: sctx(st) });
}
function lowest(s: St, side: Side): number {
  let b = -1;
  for (const u of unitsOf(side)) if (alive(s, u) && (b < 0 || s.hp[u] < s.hp[b])) b = u;
  return b;
}
/** 对面有「无视 长期句子」生效时，我方长期句子的效果落不到它身上 */
const shielded = (s: St, u: number) => s.stand.some((x) => x.c.k === "ignore" && x.owner === sideOf(u) && x.active && x.left > 0);
const stLvl = (s: St, u: number, k: StatusKind) => s.sts.filter((x) => x.unit === u && x.kind === k).reduce((a, x) => Math.max(a, x.lvl), 0);

interface Run { src: number; actor: number; sord: number; noTrig: boolean; ctx: Ctx; derived?: boolean }
function targets(s: St, owner: Side, verb: Eff["verb"] | "status", t: Tg, r: Run): number[] {
  const foe = (1 - owner) as Side, want = verb === "dmg" || verb === "status" ? foe : owner;
  const fix = (u: number) => (u >= 0 && alive(s, u) && sideOf(u) === want ? u : lowest(s, want));
  switch (t.t) {
    case "unit": return [fix(t.u)].filter((u) => u >= 0);
    case "src": return r.src >= 0 && alive(s, r.src) && sideOf(r.src) === want ? [r.src] : [];
    case "lowFoe": case "lowMe": return [lowest(s, want)].filter((u) => u >= 0);
    case "allMe": return unitsOf(owner).filter((u) => alive(s, u));
    case "allFoe": return unitsOf(foe).filter((u) => alive(s, u));
    case "some": { const side = t.side === "foe" ? foe : owner; return unitsOf(side).filter((u) => alive(s, u)).sort((a, b) => s.hp[a] - s.hp[b]).slice(0, t.n); }
  }
}
function hit(s: St, u: number, n: number, pierce: boolean, r: Run): number {
  const ab = pierce ? 0 : Math.min(s.sh[u], n); s.sh[u] -= ab;
  const d = Math.min(s.hp[u], n - ab);
  if (d > 0) {
    s.hp[u] -= d;
    emit(s, { sord: r.sord, side: sideOf(u), kind: "hurt", words: [], cats: ["taken", "hpchg"], amt: d, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived });
    if (s.hp[u] <= 0) {
      emit(s, { sord: r.sord, side: sideOf(u), kind: "down", words: [], cats: [], amt: 1, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived });
      s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u));
      s.sts = s.sts.filter((x) => x.unit !== u);
    }
  }
  return d;
}
/** 执行一个效果，返回「成功」（真的发生了） */
function exec(s: St, owner: Side, e: Eff, r0: Run, emitUse = false): boolean {
  const r: Run = typeof e.n === "number" ? r0 : { ...r0, derived: true };
  const base = amount(s, e.n, r.ctx);
  const tg = targets(s, owner, e.verb, e.tg, r);
  if (!tg.length) return false;
  if (emitUse) emit(s, { sord: r.sord, side: owner, kind: "use", words: [e.verb === "dmg" ? "造成" : e.verb === "heal" ? "恢复" : "减伤"], cats: e.verb === "dmg" ? ["atk", "dmg", "hpchg"] : e.verb === "heal" ? ["heal", "hpchg"] : ["def", "guard"], amt: base, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived });
  let ok = false;
  for (const u of tg) {
    if (e.verb === "dmg") {
      if (r.noTrig && sideOf(u) !== owner && shielded(s, u)) { stat(s, `s${sideOf(u)}:ignored`); continue; }
      let n = base;
      if (n > 0) n = Math.max(0, n + stLvl(s, u, "vuln") - (r.actor >= 0 ? stLvl(s, r.actor, "weak") : 0));
      if (n <= 0) continue;
      const d = hit(s, u, n, e.ignore === "shield", r);
      if (d > 0) { ok = true; stat(s, `s${owner}:dealt`, d); if (P2.POS && r.actor >= 0) stat(s, `s${owner}:dealt:pos${r.actor % 3}`, d);
        { const mk = `s${owner}:maxhit`; s.stats[mk] = Math.max(s.stats[mk] ?? 0, d); } emit(s, { sord: r.sord, side: owner, kind: "dealt", words: [], cats: ["dealt"], amt: d, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived }); } else stat(s, `s${owner}:blocked`);
    } else if (e.verb === "heal") {
      const d = Math.max(0, Math.min(base - P.HEALPEN, P.HP - s.hp[u]));
      s.hp[u] += d;
      if (d > 0) { ok = true; stat(s, `s${owner}:healed`, d); emit(s, { sord: r.sord, side: sideOf(u), kind: "healed", words: [], cats: ["heal", "hpchg"], amt: d, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived }); }
    } else { s.sh[u] += base; ok = true; }
  }
  return ok;
}
const STATUS_WORD: Record<StatusKind, string> = { burn: "灼烧", vuln: "易伤", weak: "衰弱" };
function applyStatus(s: St, owner: Side, c: Extract<Clause, { k: "status" }>, r: Run): boolean {
  const tg = targets(s, owner, "status", c.tg, r);
  if (!tg.length) return false;
  emit(s, { sord: r.sord, side: owner, kind: "use", words: [STATUS_WORD[c.kind]], cats: ["status"], amt: c.lvl, len: 0, segs: 0, src: r.actor, trig: false });
  const lvl = Math.min(P2.STATUS_MAX, c.lvl);
  for (const u of tg) {
    const cur = s.sts.find((x) => x.unit === u && x.kind === c.kind);
    if (cur) { cur.lvl = Math.max(cur.lvl, lvl); cur.left = Math.max(cur.left, c.dur); } else s.sts.push({ unit: u, kind: c.kind, lvl, left: c.dur });
    stat(s, `s${owner}:status`);
  }
  return true;
}

// ---------- 费用 / 数字牌 / 卡组 / 自指词 / 宣告 ----------
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
const countOf = (xs: string[]) => { const m: Record<string, number> = {}; for (const x of xs) m[x] = (m[x] ?? 0) + 1; return m; };
/** 这句话能不能说：行动点、数字牌、卡组里的进阶词、自指词（含冷却） */
/** 这句话要占卡组里的哪些进阶词（词位：第一个并免占张数） */
function advFor(cl: Sentence, pos: number): string[] { const a = advWordsOf(cl); if (pos === 0 && P2.POS_WORD_FREE) { const i = a.indexOf("并"); if (i >= 0) a.splice(i, 1); } return a; }
const posOf = (unit: number) => (P2.POS && unit >= 0 ? unit % 3 : -1);
/** 起手最早时间：速位提前几秒 */
export const windupFor = (cl: Sentence, unit: number) => Math.max(1, windup(cl) - (posOf(unit) === 2 && P2.POS3 === "speed" ? P2.POS_SPEED : 0));
export function canAfford(s: St, side: Side, cl: Sentence, unit = -1): { cost: number; nums: number[] } | null {
  if (!legal(cl)) return null;
  const pos = posOf(unit);
  const cost = sentenceCost(cl, s.rnd, pos);
  if (cost > s.side[side].ap) return null;
  const dk = s.deck[side];
  if (dk) for (const [w, n] of Object.entries(countOf(advFor(cl, pos)))) if ((dk[w] ?? 0) < n) return null;
  for (const [k, n] of Object.entries(countOf(refKindsOf(cl)))) if (!(pos === 2 && P2.POS3 === "ref") && s.refc[side][k].filter((cd) => cd === 0).length < n) return null;   // 引用位：引用词不冷却
  const bonus = pos === 1 ? P2.POS_NUM : 0;   // 数位：牌面 +N
  const raw = cl.flatMap(numsOf);
  const mx = Math.max(...raw, 0);
  let used = false;
  const nums = raw.map((n) => { if (P2.POS_NUM_ONE && bonus && n === mx && !used) { used = true; return n - bonus; } return P2.POS_NUM_ONE ? n : n - bonus; }).filter((n) => n >= 2);
  return pickCards(s, side, nums) === null ? null : { cost, nums };
}
const isStanding = (c: Clause) => (c.k === "when" && c.q.win.dir === "after") || c.k === "delay" || c.k === "ignore";
export function declare(s: St, side: Side, unit: number, cl: Sentence, start = windupFor(cl, unit)): boolean {
  const a = canAfford(s, side, cl, unit);
  if (!a) return false;
  start = Math.max(start, windupFor(cl, unit));
  for (const i of pickCards(s, side, a.nums)!) s.side[side].cards[i].cd = 2;
  const dk = s.deck[side];
  const adv = advFor(cl, posOf(unit));
  if (dk) for (const w of adv) dk[w]--;
  if (!(posOf(unit) === 2 && P2.POS3 === "ref")) for (const [k, n] of Object.entries(countOf(refKindsOf(cl)))) { let m = n; for (let i = 0; i < s.refc[side][k].length && m > 0; i++) if (s.refc[side][k][i] === 0) { s.refc[side][k][i] = 2; m--; } }
  s.side[side].ap -= a.cost; s.done[unit] = true;
  const sord = s.sord++, ord = s.ord++;
  s.decl.push({ side, unit, cl, ord, sord, cost: a.cost, nums: a.nums, start });
  s.rec?.push({ side, rnd: s.rnd, unit, cl });
  const words = cl.flatMap(wordsOf), cats = [...new Set(cl.flatMap(catsOf))];
  emit(s, { sord, rord: ord + 1, side, kind: "decl", words, cats, amt: a.cost, len: words.length, segs: cl.length, src: unit });
  for (const c of cl) {
    if (isStanding(c)) {
      s.stand.push({ owner: side, unit, c, sord, words: wordsOf(c), cats: catsOf(c), active: false, from: start, fromSeq: 0, rseq: 0, fromRnd: s.rnd, age: 0, fired: 0, left: c.k === "when" ? (c.q.win.unit === "round" ? c.q.win.n : 99) : c.k === "delay" ? c.wait : c.k === "ignore" ? c.win : 1 });
    }
    stat(s, `s${side}:${c.k}`);
  }
  for (const w of adv) stat(s, `s${side}:w:${w}`);
  const pos = posOf(unit);
  if (pos >= 0) {
    stat(s, `s${side}:pos${pos}`);
    // 位置加成真的发挥了多少：词位少付的行动点 / 数位省下的数字牌 / 引用位免冷却的引用词与全程半价
    if (pos === 0) stat(s, `s${side}:bon0`, Math.max(0, cl.length - 1) * Math.min(P2.POS_WORD, Math.max(P.AND, 0)));
    if (pos === 1) stat(s, `s${side}:bon1`, cl.flatMap(numsOf).filter((n) => n >= 2).length - a.nums.length);
    if (pos === 0 && P2.POS_WORD_FREE && advWordsOf(cl).includes("并")) stat(s, `s${side}:bon0`, 1);
    if (pos === 2 && P2.POS3 === "ref") stat(s, `s${side}:bon2`, refKindsOf(cl).length);
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
  for (const e of c.effs) if (exec(s, st.owner, e, { src: -1, actor: st.unit, sord: st.sord, noTrig: true, ctx: sctx(st) })) stat(s, `s${st.owner}:burst`);
  st.left = -1;
}
function runClause(s: St, d: Decl, c: Clause, prev: { ok: boolean }) {
  const me = d.side, foe = (1 - me) as Side;
  const r: Run = { src: d.unit, actor: d.unit, sord: d.sord, noTrig: false, ctx: { owner: me, sord: d.sord } };
  if (c.k === "act") {
    if (c.ifPrev === "ok" && !prev.ok) return;
    if (c.ifPrev === "fail" && prev.ok) return;
    prev.ok = exec(s, me, c.eff, r, true);
  } else if (c.k === "status") {
    prev.ok = applyStatus(s, me, c, r);
  } else if (c.k === "when") {
    const cnt = evalQ(s, c.q, r.ctx);   // before 窗口：宣告生效那一刻判断一次
    const yes = c.judge === "exist" ? cnt > thr(c.q) : cnt === 0;
    if (yes) { stat(s, `s${me}:fire`); for (const e of c.effs) exec(s, me, e, r, false); }
  } else if (c.k === "remove") {
    emit(s, { sord: d.sord, side: me, kind: "use", words: ["移除"], cats: ["struct"], amt: 1, len: 0, segs: 0, src: d.unit, trig: false });
    if (c.obj.t === "cat" && c.obj.c === "status") { const n = s.sts.filter((x) => sideOf(x.unit) === me).length; s.sts = s.sts.filter((x) => sideOf(x.unit) !== me); stat(s, n ? `s${me}:removed` : `s${me}:removeMiss`); return; }
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
    for (const c of d.cl) if (!isStanding(c)) jobs.push({ sec: d.start, ph: c.k === "status" ? 0.5 : phaseOf(c), ord: d.ord, run: () => runClause(s, d, c, { ok: true }) });
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
      for (const e of c.effs) exec(s, st.owner, e, { src: -1, actor: st.unit, sord: st.sord, noTrig: true, ctx: sctx(st) });
    }
    if (c.k === "delay" && st.age >= c.wait) cashStanding(s, st);
  }
  // 灼烧：轮末每级掉 1 点（挡不住）
  for (const x of s.sts.filter((q) => q.kind === "burn" && alive(s, q.unit))) hit(s, x.unit, x.lvl, true, { src: -1, actor: -1, sord: s.sord, noTrig: true, ctx: { owner: sideOf(x.unit), sord: s.sord } });
  const pre = [total(s, 0), total(s, 1)];
  if (s.rnd >= P.HEAT_FROM) for (let u = 0; u < 6; u++) if (s.hp[u] > 0) { s.hp[u] = Math.max(0, s.hp[u] - (s.rnd - 2)); if (s.hp[u] <= 0) { s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u)); s.sts = s.sts.filter((x) => x.unit !== u); } }
  s.stand = s.stand.filter((x) => { if (x.left === -1) return false; if (x.c.k === "delay") return true; x.left--; return x.left > 0; });
  s.sts = s.sts.filter((x) => (x.left--, x.left > 0));
  const al = [nAlive(s, 0), nAlive(s, 1)];
  if (al[0] === 0 || al[1] === 0) s.win = al[0] === 0 && al[1] === 0 ? (pre[0] === pre[1] ? 2 : pre[0] > pre[1] ? 0 : 1) : al[0] === 0 ? 1 : 0;
  else if (s.rnd >= P.ROUNDS) { const h = [total(s, 0), total(s, 1)]; s.win = al[0] !== al[1] ? (al[0] > al[1] ? 0 : 1) : h[0] === h[1] ? 2 : h[0] > h[1] ? 0 : 1; }
}
export function nextRound(s: St) {
  s.rnd++; s.sec = 0; s.sh.fill(0);
  // 长期句子：新的一轮从第 0 秒起生效、本轮触发次数清零
  s.stand.forEach((x) => { x.fired = 0; x.from = 0; x.rseq = s.seq; });
  // 日志只留最近 13 轮（还没到期的定时句要看的部分也保留）
  const keepSeq = Math.min(...s.stand.filter((x) => x.c.k === "delay").map((x) => x.fromSeq), Infinity);
  if (s.rnd > 14) s.log = s.log.filter((e) => e.rnd > s.rnd - 14 || e.seq >= keepSeq);
  s.decl = []; s.done = Array(6).fill(false);
  s.first = (1 - s.first) as Side; s.turn = s.first; s.ord = 0;
  for (const sd of [0, 1] as const) {
    const S = s.side[sd]; S.ap = Math.min(P.APCAP, S.ap + P.APINC);
    for (const c of S.cards) if (c.cd > 0) c.cd--;
    for (const k of REF_KINDS) s.refc[sd][k] = s.refc[sd][k].map((cd) => (cd > 0 ? cd - 1 : 0));
    for (const v of P.SCHEDULE[s.rnd] ?? []) S.cards.push({ v, cd: 0 });
  }
}

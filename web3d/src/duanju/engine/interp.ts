// 自动同步自 lab2/interp.ts（scripts/sync-engine.mjs），请勿手改；补丁见 PATCHES.md
/* eslint-disable */
// @ts-nocheck
// 句子解释器：一棵语法树 + 一份事件日志。窗口、存在/不存在、引用量全部是对日志的查询，没有写死的「陷阱句式」。
import { P, type SideState } from "./lab-rules";
import { P2, type Deck, type Cls } from "./params";
import {
  type Clause, type Eff, type Obj, type Query, type Amt, type Sentence, type Side, type Tg, type StatusKind,
  wordsOf, catsOf, numsOf, sentenceCost, windup, advWordsOf, refKindsOf, legal, isDefSentence, classProblem, segCap,
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
export interface Status { unit: number; kind: StatusKind; lvl: number; left: number; end?: number; src?: Side }   // end/src：STAUTO（真实）下用，状态撑到第 end 轮
export interface Decl { side: Side; unit: number; cl: Sentence; ord: number; sord: number; cost: number; nums: number[]; start: number; fired?: boolean; gone?: boolean }
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
  cls: [Cls | null, Cls | null];                    // 职业（P2.CLASSES 开着才生效）
  kw: string[]; kwUsed: boolean[];                   // 关键词（首挡 / 不屈 / ""）与本轮是否已用掉
  redir: boolean[];                                  // 转移：本轮打向这个随从的敌方伤害转给出手的人
  dead: boolean[];                                   // 已经倒下（KOCHECK 下，hp ≤ 0 但本秒还没结束的随从还没倒下）
  pend: { u: number; src: number; sord: number; trig: boolean; derived?: boolean }[];
  stats: Record<string, number>;
  rs: number;                                        // [补丁 T4] 引擎种子随机数状态（骰子用，Match 构造时由 seed 定）
  rec?: { side: Side; rnd: number; unit: number; cl: Sentence }[];   // 只在真实对局里记录（克隆不带）
}
/** [补丁 T1] 结算追踪：duanju/engine/api.ts 用它生成回放事件 */
export let TRACE: ((e: any) => void) | null = null;
export function setTrace(fn: ((e: any) => void) | null) { TRACE = fn; }
const TR = (e: any) => { if (TRACE) TRACE(e); };
export const sideOf = (u: number): Side => (u < 3 ? 0 : 1);
export const alive = (s: St, u: number) => s.hp[u] > 0;
export const unitsOf = (side: Side) => (side === 0 ? [0, 1, 2] : [3, 4, 5]);
export const total = (s: St, side: Side) => unitsOf(side).reduce((a, u) => a + Math.max(0, s.hp[u]), 0);
export const nAlive = (s: St, side: Side) => unitsOf(side).filter((u) => s.hp[u] > 0).length;
const stat = (s: St, k: string, n = 1) => { s.stats[k] = (s.stats[k] ?? 0) + n; };

const mkRef = (extra = 0) => Object.fromEntries(REF_KINDS.map((k) => [k, Array(k === "all" ? 1 : P2.REFCOPIES + extra).fill(0)])) as Record<string, number[]>;
export function newGame(first: Side, decks: [Deck | null, Deck | null] = [null, null], record = false, kws?: [string[] | null, string[] | null], cls?: [Cls | null, Cls | null]): St {
  const cx: [Cls | null, Cls | null] = P2.CLASSES && cls ? [cls[0], cls[1]] : [null, null];
  const mk = (): SideState => ({ ap: P.AP0, cards: P.CARDS0.map((v) => ({ v, cd: 0 })) });
  return {
    rnd: 1, sec: 0, seq: 0, sord: 0, hp: Array(6).fill(P.HP), sh: Array(6).fill(0), side: [mk(), mk()],
    deck: [decks[0] ? { ...decks[0] } : null, decks[1] ? { ...decks[1] } : null], refc: [mkRef(cx[0] === "引用" ? P2.REF_PLUS : 0), mkRef(cx[1] === "引用" ? P2.REF_PLUS : 0)], sts: [], cls: cx,
    stand: [], decl: [], log: [], done: Array(6).fill(false), first, turn: first, ord: 0, win: -1, stats: {}, rs: 0x9e3779b9, rec: record ? [] : undefined,
    kw: Array.from({ length: 6 }, (_, u) => (P2.KW && kws?.[u < 3 ? 0 : 1]?.[u % 3]) || ""), kwUsed: Array(6).fill(false), redir: Array(6).fill(false), dead: Array(6).fill(false), pend: [],
  };
}
export function clone(s: St): St {
  const sd = (x: SideState): SideState => ({ ap: x.ap, cards: x.cards.map((c) => ({ ...c })) });
  const rf = (r: Record<string, number[]>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.slice()]));
  return {
    ...s, hp: s.hp.slice(), sh: s.sh.slice(), side: [sd(s.side[0]), sd(s.side[1])],
    deck: [s.deck[0] ? { ...s.deck[0] } : null, s.deck[1] ? { ...s.deck[1] } : null], refc: [rf(s.refc[0]), rf(s.refc[1])], sts: s.sts.map((x) => ({ ...x })),
    stand: s.stand.map((x) => ({ ...x })), decl: s.decl.slice(), log: s.log.slice(), done: s.done.slice(), stats: { ...s.stats }, rec: undefined,
    kwUsed: s.kwUsed.slice(), redir: s.redir.slice(), dead: s.dead.slice(), pend: s.pend.map((x) => ({ ...x })),
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
  const plus = c.forbid && clsOf(s, st.owner) === "限制" ? P2.FORBID_PLUS : 0;   // 限制流：不得的惩罚 +1
  if (plus) stat(s, `s${st.owner}:t:不得加罚`);
  for (const e of c.effs) exec(s, st.owner, plus && typeof e.n === "number" ? { ...e, n: e.n + plus } : e, { src: ev.src, actor: st.unit, sord: st.sord, noTrig: true, ctx: sctx(st) });
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
function targets(s: St, owner: Side, verb: Eff["verb"] | "status" | "redir" | "strip", t: Tg, r: Run): number[] {
  const foe = (1 - owner) as Side, want = verb === "dmg" || verb === "status" || verb === "strip" ? foe : owner;
  const ok = (u: number) => (P2.KOCHECK ? !s.dead[u] : alive(s, u));   // 真实：本秒被打到 0 血的随从要到秒末才倒下，仍可被指定
  const fix = (u: number) => (u >= 0 && ok(u) && sideOf(u) === want ? u : P2.STRICT_TG ? -1 : lowest(s, want));
  switch (t.t) {
    case "unit": return [fix(t.u)].filter((u) => u >= 0);
    case "src": return r.src >= 0 && ok(r.src) && sideOf(r.src) === want ? [r.src] : [];
    case "lowFoe": case "lowMe": return [lowest(s, want)].filter((u) => u >= 0);
    case "allMe": return unitsOf(owner).filter((u) => alive(s, u));
    case "allFoe": return unitsOf(foe).filter((u) => alive(s, u));
    case "units": return t.us.filter((u) => sideOf(u) === want && ok(u));
    case "some": { const side = t.side === "foe" ? foe : owner; return unitsOf(side).filter((u) => alive(s, u)).sort((a, b) => s.hp[a] - s.hp[b]).slice(0, t.n); }
  }
}
/** 随从倒下：清掉它挂着的长期句子和状态，发「倒下」事件 */
/** [补丁 T4] 己方随从倒下：投 d6（走 s.rs，可复现），得到一张该点数的一次性数字牌 */
export function rollDown(s: St, u: number) {
  if (!P2.DICE) return;
  s.rs = (s.rs + 0x6D2B79F5) >>> 0;
  let t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const v = 1 + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 6);
  s.side[sideOf(u)].cards.push({ v, cd: 0, once: true });
  stat(s, `s${sideOf(u)}:dice`);
  TR({ t: "dice", u, roll: v, side: sideOf(u), sec: s.sec });
}
function koNow(s: St, u: number, src: number, sord: number, trig: boolean, derived?: boolean) {
  s.hp[u] = 0; s.dead[u] = true; s.redir[u] = false; rollDown(s, u);
  TR({ t: "down", u, src, sec: s.sec }); emit(s, { sord, side: sideOf(u), kind: "down", words: [], cats: [], amt: 1, len: 0, segs: 0, src, trig, derived });
  s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u));
  s.sts = s.sts.filter((x) => x.unit !== u);
}
/** 不屈：每轮第一次被打到 0 血，留 1 血 */
function endure(s: St, u: number): boolean {
  if (!P2.KW || s.kw[u] !== "不屈" || s.kwUsed[u]) return false;
  s.kwUsed[u] = true; s.hp[u] = 1; stat(s, `s${sideOf(u)}:endure`);
  return true;
}
/** 一秒结束时的倒下判定（真实 koCheck）：hp ≤ 0 的随从，有不屈就留 1 血，否则倒下 */
function koCheck(s: St) {
  const ps = s.pend; s.pend = [];
  for (const p of ps) {
    if (s.dead[p.u] || s.hp[p.u] > 0) continue;
    if (endure(s, p.u)) continue;
    koNow(s, p.u, p.src, p.sord, p.trig, p.derived);
  }
}
/** 实际扣血（已经过所有减免）：发受伤事件，到 0 血就倒下（或等秒末判定）。返回实际打掉的血 */
function damage(s: St, u: number, amt: number, r: Run): number {
  if (amt <= 0) return 0;
  const d = Math.min(Math.max(0, s.hp[u]), amt);
  s.hp[u] -= P2.KOCHECK ? amt : d;
  if (d > 0) TR({ t: "hit", u, amt: d, src: r.actor, sec: s.sec }); if (d > 0) emit(s, { sord: r.sord, side: sideOf(u), kind: "hurt", words: [], cats: ["taken", "hpchg"], amt: d, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived });
  if (s.hp[u] <= 0 && d > 0) {
    if (P2.KOCHECK) s.pend.push({ u, src: r.actor, sord: r.sord, trig: r.noTrig, derived: r.derived });
    else if (!endure(s, u)) koNow(s, u, r.actor, r.sord, r.noTrig, r.derived);
  }
  return d;
}
function hit(s: St, u: number, n: number, pierce: boolean, r: Run): number {
  if (P2.KOCHECK && s.hp[u] <= 0) return 0;          // 已经打到 0 血、等本秒结束才倒下的，打不动
  const enemy = r.actor >= 0 && sideOf(r.actor) !== sideOf(u);   // 灼烧、过热没有出手者：不吃首挡、转移
  const ab = pierce ? 0 : Math.min(s.sh[u], n);
  if (ab > 0) TR({ t: "absorb", u, amt: ab, src: r.actor, sec: s.sec }); if (!P2.MITHIT) s.sh[u] -= ab;                      // MITHIT：减伤不消耗，每一击都少 ab
  let amt = n - ab;
  if (amt > 0 && enemy && P2.KW && s.kw[u] === "首挡" && !s.kwUsed[u]) { s.kwUsed[u] = true; stat(s, `s${sideOf(u)}:firstblock`); return 0; }
  if (amt > 0 && enemy && P2.REDIR && s.redir[u]) {
    // 转移：全部转给出手的人（不再经过它的减伤、首挡；不屈照常）
    stat(s, `s${sideOf(u)}:redirect`, amt);
    const a = r.actor;
    if ((P2.KOCHECK ? !s.dead[a] : alive(s, a)) && s.hp[a] > 0) {
      const back = damage(s, a, amt, { ...r, actor: u });
      if (back > 0) { stat(s, `s${sideOf(u)}:dealt`, back); emit(s, { sord: r.sord, side: sideOf(u), kind: "dealt", words: [], cats: ["dealt"], amt: back, len: 0, segs: 0, src: u, trig: r.noTrig, derived: r.derived }); }
    }
    amt = 0;
  }
  return damage(s, u, amt, r);
}
/** 执行一个效果，返回「成功」（真的发生了） */
function exec(s: St, owner: Side, e: Eff, r0: Run, emitUse = false): boolean {
  const r: Run = typeof e.n === "number" ? r0 : { ...r0, derived: true };
  let base = amount(s, e.n, r.ctx);
  if (emitUse && e.verb === "dmg" && clsOf(s, owner) === "限制" && base > P2.CAP_LIM) { base = P2.CAP_LIM; stat(s, `s${owner}:t:限制封顶`); }   // 限制流：攻击句单次伤害封顶（引用量算出来的也一样）
  const tg = targets(s, owner, e.verb, e.tg, r);
  if (!tg.length) return false;
  if (emitUse) emit(s, { sord: r.sord, side: owner, kind: "use", words: [e.verb === "dmg" ? "造成" : e.verb === "heal" ? "恢复" : "减伤"], cats: e.verb === "dmg" ? ["atk", "dmg", "hpchg"] : e.verb === "heal" ? ["heal", "hpchg"] : ["def", "guard"], amt: base, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived });
  let ok = false;
  const reps = e.verb === "shield" ? 1 : Math.max(1, e.rep ?? 1);   // 重复：打 M 次，每次都重新结算易伤/衰弱/减伤
  for (let rp = 0; rp < reps; rp++) for (const u of tg) {
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
      if (d > 0) { TR({ t: "heal", u, amt: d, src: r.actor, sec: s.sec }); ok = true; stat(s, `s${owner}:healed`, d); emit(s, { sord: r.sord, side: sideOf(u), kind: "healed", words: [], cats: ["heal", "hpchg"], amt: d, len: 0, segs: 0, src: r.actor, trig: r.noTrig, derived: r.derived }); }
    } else { s.sh[u] += base; ok = true; TR({ t: "shield", u, amt: base, src: r.actor, sec: s.sec }); }
  }
  return ok;
}
const STATUS_WORD: Record<StatusKind, string> = { burn: "灼烧", vuln: "易伤", weak: "衰弱" };
function applyStatus(s: St, owner: Side, c: Extract<Clause, { k: "status" }>, r: Run): boolean {
  const tg = targets(s, owner, "status", c.tg, r);
  if (!tg.length) return false;
  emit(s, { sord: r.sord, side: owner, kind: "use", words: [STATUS_WORD[c.kind]], cats: ["status"], amt: c.lvl, len: 0, segs: 0, src: r.actor, trig: false });
  const plus = clsOf(s, owner) === "状态" ? P2.ST_LVL_PLUS : 0;   // 状态流：新挂上的状态初始级别 +1
  const lvl = Math.min(P2.STATUS_MAX, c.lvl + plus);
  for (const u of tg) {
    const cur = s.sts.find((x) => x.unit === u && x.kind === c.kind);
    if (P2.STAUTO) {
      // 真实：已经有 → 级别 +1、撑到更晚的那轮；没有 → 1 级，撑到「当前轮 + 持续数 − 1」，来源记第一个施放的人
      if (cur) { cur.lvl += 1; cur.end = Math.max(cur.end ?? 0, s.rnd + c.dur - 1); } else s.sts.push({ unit: u, kind: c.kind, lvl: 1 + plus, left: c.dur, end: s.rnd + c.dur - 1, src: owner });
    } else if (cur) { cur.lvl = Math.max(cur.lvl, lvl); cur.left = Math.max(cur.left, c.dur); } else s.sts.push({ unit: u, kind: c.kind, lvl, left: c.dur });
    TR({ t: "status", u, kind: c.kind, src: r.actor, sec: s.sec }); stat(s, `s${owner}:status`);
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
/** 引用量算出的最大数字（只算「之前」窗口：读的是已结束的轮，宣告那一刻就已确定） */
function quantMax(s: St, side: Side, cl: Sentence): number {
  let m = 0;
  const am = (a: Amt) => { if (typeof a !== "number" && a.q.win.dir === "before") m = Math.max(m, Math.min(P2.QCAP, Math.floor(evalQ(s, a.q, { owner: side, sord: s.sord }) * a.mult))); };
  for (const c of cl) { if (c.k === "act") am(c.eff.n); else if (c.k === "when") c.effs.forEach((e) => am(e.n)); }
  return m;
}
const clsOf = (s: St | undefined, side: Side): Cls | null => (P2.CLASSES && s ? s.cls[side] : null);
export const windupFor = (cl: Sentence, unit: number, s?: St) =>
  Math.max(1, windup(cl, P2.QWIND && s ? quantMax(s, sideOf(unit), cl) : 0, clsOf(s, sideOf(unit))) - (posOf(unit) === 2 && P2.POS3 === "speed" ? P2.POS_SPEED : 0));
/** TGT_AT_DECL：把别名目标（最低血 / 全体 / 选择 N 个）解析成宣告那一刻的具体随从；不改传进来的句子 */
export function resolveTgs(s: St, side: Side, cl: Sentence): Sentence {
  const foe = (1 - side) as Side;
  const rt = (t: Tg, verb: Eff["verb"] | "status" | "redir" | "strip"): Tg => {
    const want = verb === "dmg" || verb === "status" || verb === "strip" ? foe : side;
    switch (t.t) {
      case "lowFoe": case "lowMe": { const u = lowest(s, want); return u >= 0 ? { t: "unit", u } : t; }
      case "allMe": return { t: "units", us: unitsOf(side).filter((u) => alive(s, u)) };
      case "allFoe": return { t: "units", us: unitsOf(foe).filter((u) => alive(s, u)) };
      case "some": return { t: "units", us: unitsOf(t.side === "foe" ? foe : side).filter((u) => alive(s, u)).sort((a, b) => s.hp[a] - s.hp[b]).slice(0, t.n) };
      default: return t;
    }
  };
  const re = (e: Eff): Eff => ({ ...e, tg: rt(e.tg, e.verb) });
  return cl.map((c): Clause => {
    switch (c.k) {
      case "act": return { ...c, eff: re(c.eff) };
      case "when": case "delay": return { ...c, effs: c.effs.map(re) } as Clause;
      case "status": return { ...c, tg: rt(c.tg, "status") };
      case "redirect": return { ...c, tg: rt(c.tg, "redir") };
      case "strip": return { ...c, tg: rt(c.tg, "strip") };
      default: return c;
    }
  });
}
export function canAfford(s: St, side: Side, cl: Sentence, unit = -1): { cost: number; nums: number[] } | null {
  if (P2.TGT_AT_DECL) cl = resolveTgs(s, side, cl);
  if (!legal(cl)) return null;
  for (const c of cl) if (c.k === "postpone" && !s.decl.some((d) => d.ord === c.ord && d.side !== side)) return null;   // 延后要选对方本轮已经宣告的一句
  const pos = posOf(unit);
  const cx = clsOf(s, side);
  const rej = (why: string) => { stat(s, `s${side}:rej:${why}`); return null; };
  if (cl.length > segCap(cx)) return rej("段数上限");
  const cp = classProblem(cl, cx);
  if (cp) return rej(cp);
  if (cx === "状态") {   // 同一轮对同一目标只能挂一种状态（含这一轮已经宣告的）
    const kinds = new Map<number, string>(); let bad = false;
    const note = (tgs: Sentence) => { for (const c of resolveTgs(s, side, tgs)) if (c.k === "status") for (const u of c.tg.t === "unit" ? [c.tg.u] : c.tg.t === "units" ? c.tg.us : []) { const k = kinds.get(u); if (k && k !== c.kind) bad = true; kinds.set(u, c.kind); } };
    for (const d of s.decl) if (d.side === side) note(d.cl);
    note(cl);
    if (bad) return rej("同轮同目标只能一种状态");
  }
  const cost = sentenceCost(cl, s.rnd, pos, cx);
  if (cost > s.side[side].ap) return null;
  const dk = s.deck[side];
  if (dk) for (const [w, n] of Object.entries(countOf(advFor(cl, pos)))) if ((dk[w] ?? 0) < n) return null;
  for (const [k, n] of Object.entries(countOf(refKindsOf(cl)))) if (!(pos === 2 && P2.POS3 === "ref") && s.refc[side][k].filter((cd) => cd === 0).length < n) return null;   // 引用位：引用词不冷却
  const bonus = pos === 1 ? P2.POS_NUM : 0;   // 数位：牌面 +N
  const raw = cl.flatMap((c) => numsOf(c, cx));
  const mx = Math.max(...raw, 0);
  let used = false;
  const nums = raw.map((n) => { if (P2.POS_NUM_ONE && bonus && n === mx && !used) { used = true; return n - bonus; } return P2.POS_NUM_ONE ? n : n - bonus; }).filter((n) => n >= 2);
  return pickCards(s, side, nums) === null ? null : { cost, nums };
}
const isStanding = (c: Clause) => (c.k === "when" && c.q.win.dir === "after") || c.k === "delay" || c.k === "ignore";
export function declare(s: St, side: Side, unit: number, cl: Sentence, start = windupFor(cl, unit, s)): boolean {
  if (P2.TGT_AT_DECL) cl = resolveTgs(s, side, cl);
  const a = canAfford(s, side, cl, unit);
  if (!a) return false;
  start = Math.max(start, windupFor(cl, unit, s));
  if (start > P.TL) return false;   // 时间轴只有 TL 秒（真实：start > TIMELINE 不能宣告）
  for (const i of pickCards(s, side, a.nums)!) s.side[side].cards[i].cd = 2;
  s.side[side].cards = s.side[side].cards.filter((c) => !(c.once && c.cd > 0));   // 一次性牌：用掉就消失
  const dk = s.deck[side];
  const adv = advFor(cl, posOf(unit));
  if (dk) for (const w of adv) dk[w]--;
  if (!(posOf(unit) === 2 && P2.POS3 === "ref")) for (const [k, n] of Object.entries(countOf(refKindsOf(cl)))) { let m = n; for (let i = 0; i < s.refc[side][k].length && m > 0; i++) if (s.refc[side][k][i] === 0) { s.refc[side][k][i] = clsOf(s, side) === "引用" ? 1 : 2; m--; } }
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
  { const cx = clsOf(s, side);   // 职业天赋的实际发挥（每局统计）
    if (cx === "并" && cl.length > 1) { stat(s, `s${side}:t:并多段`, cl.length - 1); stat(s, `s${side}:t:并省行动点`, cl.slice(1).filter((c) => !(c.k === "act" && c.ifPrev)).length * Math.max(0, P.AND - P2.AND_BING)); if (cl.length > P2.CLAUSE_MAX) stat(s, `s${side}:t:并超3段`); }
    if (cx === "引用") { stat(s, `s${side}:t:引用全程`, refKindsOf(cl).filter((k) => k === "all").length); stat(s, `s${side}:t:引用词`, refKindsOf(cl).length); }
    if (cx === "限制") stat(s, `s${side}:t:限制省牌`, cl.flatMap((c) => numsOf(c)).filter((n) => n >= 2).length - cl.flatMap((c) => numsOf(c, cx)).filter((n) => n >= 2).length);
    if (cx === "状态") stat(s, `s${side}:t:状态省点`, cl.filter((c) => c.k === "status").length * Math.min(P2.STATUS_AP, P2.ST_AP_MINUS)); }
  const pos = posOf(unit);
  if (pos >= 0) {
    stat(s, `s${side}:pos${pos}`);
    // 位置加成真的发挥了多少：词位少付的行动点 / 数位省下的数字牌 / 引用位免冷却的引用词与全程半价
    if (pos === 0) stat(s, `s${side}:bon0`, Math.max(0, cl.length - 1) * Math.min(P2.POS_WORD, Math.max(P.AND, 0)));
    if (pos === 1) stat(s, `s${side}:bon1`, cl.flatMap((c) => numsOf(c, clsOf(s, side))).filter((n) => n >= 2).length - a.nums.length);
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
const phaseOf = (c: Clause): number => c.k === "remove" || c.k === "strip" ? PH.remove : c.k === "redirect" ? PH.shield : c.k === "postpone" ? PH.dmg : c.k === "cash" ? PH.cash : c.k === "act" ? PH[c.eff.verb] : c.k === "when" ? PH[c.effs[0]?.verb ?? "dmg"] : PH.dmg;
function standingMatches(x: Standing, o: Obj) { return o.t === "word" ? x.words.includes(o.w) : o.t === "cat" ? (o.c === "any" || x.cats.includes(o.c)) : false; }
function cashStanding(s: St, st: Standing) {
  const c = st.c; if (c.k !== "delay") return;
  for (const e of c.effs) if (exec(s, st.owner, e, { src: -1, actor: st.unit, sord: st.sord, noTrig: true, ctx: sctx(st) })) stat(s, `s${st.owner}:burst`);
  st.left = -1;
}
/** 本轮正在结算的宣告（副本：延后会改它们的起手秒，不能动 s.decl 里共享的对象） */
let CUR: Decl[] = [];
const isDown = (s: St, u: number) => (P2.KOCHECK ? s.dead[u] : !alive(s, u));
function runClause(s: St, d: Decl, c: Clause, prev: { ok: boolean }) {
  if (P2.FIZZLE && !P2.ORDER && isDown(s, d.unit)) { stat(s, `s${d.side}:fizzle`); return; }   // 出手的人先倒下，这句落空
  const me = d.side, foe = (1 - me) as Side;
  const r: Run = { src: d.unit, actor: d.unit, sord: d.sord, noTrig: false, ctx: { owner: me, sord: d.sord } };
  if (c.k === "act") {
    if (c.ifPrev === "ok" && !prev.ok) return;
    if (c.ifPrev === "fail" && prev.ok) return;
    prev.ok = exec(s, me, c.eff, r, true);
  } else if (c.k === "status") {
    prev.ok = applyStatus(s, me, c, r);
  } else if (c.k === "redirect") {
    const tg = targets(s, me, "redir", c.tg, r);
    emit(s, { sord: d.sord, side: me, kind: "use", words: ["转移"], cats: ["def", "guard"], amt: 1, len: 0, segs: 0, src: d.unit, trig: false });
    for (const u of tg) s.redir[u] = true;
    stat(s, `s${me}:redir`); prev.ok = tg.length > 0;
  } else if (c.k === "postpone") {
    emit(s, { sord: d.sord, side: me, kind: "use", words: ["延后"], cats: ["struct"], amt: c.n, len: 0, segs: 0, src: d.unit, trig: false });
    const b = CUR.find((x) => x.ord === c.ord && x.side !== me && !x.fired && !x.gone);
    if (b) {
      b.start += c.n; stat(s, `s${me}:postpone`); prev.ok = true;
      if (b.start > P.TL) { b.gone = true; stat(s, `s${b.side}:fizzle`); stat(s, `s${me}:pushout`); }   // 推出时间轴：整句落空
    } else { stat(s, `s${me}:postponeMiss`); prev.ok = false; }
  } else if (c.k === "strip") {
    const u = targets(s, me, "strip", c.tg, r)[0];
    emit(s, { sord: d.sord, side: me, kind: "use", words: ["移除"], cats: ["struct"], amt: 1, len: 0, segs: 0, src: d.unit, trig: false });
    if (u === undefined) { prev.ok = false; return; }
    const had = s.sh[u] > 0 || s.redir[u] || s.stand.some((x) => x.owner === sideOf(u) && x.unit === u);
    s.sh[u] = 0; s.redir[u] = false;
    s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u));
    stat(s, had ? `s${me}:removed` : `s${me}:removeMiss`); prev.ok = had;
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
  type Job = { d: Decl; ph: number; ord: number; run: () => void };
  const jobs: Job[] = [];
  const ds: Decl[] = s.decl.map((d) => ({ ...d }));
  CUR = ds;
  for (const d of ds) {
    for (const st of s.stand.filter((x) => x.sord === d.sord && !x.active)) jobs.push({ d, ph: -1, ord: d.ord, run: () => { st.from = d.start; st.active = true; TR({ t: "standing", u: d.unit, c: st.c, side: d.side, sec: d.start }); st.fromSeq = s.seq; st.rseq = s.seq; st.fromRnd = s.rnd; } });
    if (P2.ORDER) {
      // 真实引擎：一句话整句一起生效；同一秒里纯防御句（减伤/转移/恢复）先，其余按宣告先后
      const runnable = d.cl.filter((c) => !isStanding(c));
      if (runnable.length) jobs.push({ d, ph: isDefSentence(d.cl) ? 0 : 1, ord: d.ord, run: () => {
        if (P2.FIZZLE && isDown(s, d.unit)) { stat(s, `s${d.side}:fizzle`); return; }
        const prev = { ok: true }; for (const c of runnable) runClause(s, d, c, prev);
      } });
      continue;
    }
    const chain = d.cl.some((c) => c.k === "act" && c.ifPrev);
    if (chain) { jobs.push({ d, ph: phaseOf(d.cl[0]), ord: d.ord, run: () => { const prev = { ok: true }; for (const c of d.cl) runClause(s, d, c, prev); } }); continue; }
    for (const c of d.cl) if (!isStanding(c)) jobs.push({ d, ph: c.k === "status" ? 0.5 : phaseOf(c), ord: d.ord, run: () => runClause(s, d, c, { ok: true }) });
  }
  // 按（起手秒, 阶段, 宣告序）依次跑；延后会在途中改起手秒，所以每次现挑
  let lastSec = -1;
  while (jobs.length) {
    let bi = -1;
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i]; if (j.d.gone) continue;
      if (bi < 0) { bi = i; continue; }
      const b = jobs[bi];
      if (j.d.start < b.d.start || (j.d.start === b.d.start && (j.ph < b.ph || (j.ph === b.ph && j.ord < b.ord)))) bi = i;
    }
    if (bi < 0) break;
    const j = jobs.splice(bi, 1)[0];
    if (P2.KOCHECK && lastSec >= 0 && j.d.start !== lastSec) koCheck(s);
    lastSec = j.d.start; s.sec = j.d.start; j.d.fired = true; TR({ t: "fire", u: j.d.unit, side: j.d.side, ord: j.d.ord, sec: j.d.start });
    j.run();
  }
  if (P2.KOCHECK) koCheck(s);
  CUR = [];
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
  if (s.rnd >= P.HEAT_FROM) {
    const hd = s.rnd - 2; TR({ t: "heat", amt: hd, sec: P.TL + 1 });
    for (let u = 0; u < 6; u++) {
      if (P2.KOCHECK) { if (s.dead[u]) continue; s.hp[u] -= hd; if (s.hp[u] <= 0) s.pend.push({ u, src: -1, sord: s.sord, trig: true }); continue; }
      if (s.hp[u] > 0) {
        if (s.hp[u] - hd <= 0 && endure(s, u)) continue;   // 不屈对过热也有效
        s.hp[u] = Math.max(0, s.hp[u] - hd);
        if (s.hp[u] <= 0) { s.dead[u] = true; s.redir[u] = false; rollDown(s, u); s.stand = s.stand.filter((x) => !(x.owner === sideOf(u) && x.unit === u)); s.sts = s.sts.filter((x) => x.unit !== u); }
      }
    }
  }
  if (P2.KOCHECK) koCheck(s);
  s.stand = s.stand.filter((x) => { if (x.left === -1) return false; if (x.c.k === "delay") return true; x.left--; return x.left > 0; });
  if (!P2.STAUTO) s.sts = s.sts.filter((x) => (x.left--, x.left > 0));
  const al = [nAlive(s, 0), nAlive(s, 1)];
  if (al[0] === 0 || al[1] === 0) s.win = al[0] === 0 && al[1] === 0 ? (pre[0] === pre[1] ? 2 : pre[0] > pre[1] ? 0 : 1) : al[0] === 0 ? 1 : 0;
  else if (s.rnd >= P.ROUNDS) { const h = [total(s, 0), total(s, 1)]; s.win = al[0] !== al[1] ? (al[0] > al[1] ? 0 : 1) : h[0] === h[1] ? 2 : h[0] > h[1] ? 0 : 1; }
}
export function nextRound(s: St) {
  s.rnd++; s.sec = 0; s.sh.fill(0); s.redir.fill(false); s.kwUsed.fill(false); s.pend = [];
  // 真实：状态每过一轮自动 +1 级；撑过了「结束轮」就消失
  if (P2.STAUTO) s.sts = s.sts.filter((x) => { if (s.rnd > (x.end ?? 0)) return false; x.lvl += 1; return true; });
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

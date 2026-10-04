// 挖掘工具链的共用库：句子变异/交叉/规范化/家族分类、局面特征、与 ai.ts 同逻辑的推演、电脑配置。
// 注意：规则参数全部来自 P / P2（由 mineenv 读 rules.json），这里不写死任何规则数值。
import "./mineenv";
import { P } from "../../lab/rules";
import { P2, ADV, type Deck } from "../params";
import {
  act, dmg, query, win, cat, word, ev, legal, advWordsOf, sentenceCost, isAll, sentenceText, wordsOf,
  type Sentence, type Clause, type Eff, type Obj, type Amt, type Side,
} from "../ast";
import { type St, newGame, clone, declare, passUnit, nextSide, resolveRound, nextRound, canAfford, windupFor, alive, unitsOf, total, nAlive } from "../interp";
import { evaluate, defaultMove, think, type AiCfg, AI_DEFAULT } from "../ai";
import { randDeck } from "../deck";
import { mulberry32, type Rng } from "../gen";

// ====================== 通用小工具 ======================
export const pick = <T>(r: Rng, xs: T[]): T => xs[Math.floor(r() * xs.length)];
export const rint = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const jclone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// ====================== 家族分类 ======================
export const FAMILIES = ["全程引用", "禁令", "连环", "接力", "读上一句", "状态连击", "状态", "定时兑现", "全体引用量", "引用量", "陷阱", "荆棘", "无人则", "无视长期", "移除", "多段攻防", "普通攻击", "自保", "其他"] as const;
export type Family = (typeof FAMILIES)[number] | "不出手";
const allQ = (cl: Sentence): { q: ReturnType<typeof query>; inAmt: boolean }[] => {
  const o: { q: ReturnType<typeof query>; inAmt: boolean }[] = [];
  const am = (a: Amt) => { if (typeof a !== "number") o.push({ q: a.q, inAmt: true }); };
  for (const c of cl) { if (c.k === "when") { o.push({ q: c.q, inAmt: false }); c.effs.forEach((e) => am(e.n)); } else if (c.k === "delay") c.effs.forEach((e) => am(e.n)); else if (c.k === "act") am(c.eff.n); }
  return o;
};
/** 句子的结构类别（主类别，按优先级；一句话只归一类） */
export function family(cl: Sentence): Family {
  const qs = allQ(cl);
  if (qs.some((x) => isAll(x.q))) return "全程引用";
  if (cl.some((c) => c.k === "when" && c.forbid)) return "禁令";
  if (cl.some((c) => c.k === "act" && c.ifPrev)) return "连环";
  const bef = cl.find((c) => c.k === "when" && c.q.win.dir === "before") as Extract<Clause, { k: "when" }> | undefined;
  if (bef && bef.q.who === "me") return "接力";
  if (bef) return "读上一句";
  const hasSt = cl.some((c) => c.k === "status");
  if (hasSt && cl.some((c) => c.k === "act")) return "状态连击";
  if (hasSt) return "状态";
  if (cl.some((c) => c.k === "delay" || c.k === "cash")) return "定时兑现";
  if (qs.some((x) => x.inAmt)) return cl.some((c) => effsOf(c).some((e) => e.verb === "dmg" && e.tg.t === "allFoe" && typeof e.n !== "number")) ? "全体引用量" : "引用量";
  const aft = cl.find((c) => c.k === "when" && c.q.win.dir === "after") as Extract<Clause, { k: "when" }> | undefined;
  if (aft && aft.judge === "absent") return "无人则";
  if (aft && aft.q.who === "foe") return "陷阱";
  if (aft) return "荆棘";
  if (cl.some((c) => c.k === "ignore")) return "无视长期";
  if (cl.some((c) => c.k === "remove")) return "移除";
  if (cl.every((c) => c.k === "act")) {
    if (cl.length > 1) return "多段攻防";
    const e = (cl[0] as Extract<Clause, { k: "act" }>).eff;
    return e.verb === "dmg" ? (typeof e.n === "number" && !e.ignore && e.tg.t !== "allFoe" ? "普通攻击" : "多段攻防") : "自保";
  }
  return "其他";
}

// ====================== 规范化与合法性 ======================
/** 结构规范化 key：去掉等价的可选字段；目标一律不指定具体随从（挖掘库里不含「随从N」） */
export function normKey(cl: Sentence): string {
  return JSON.stringify(cl, (k, v) => (k === "tight" && v === 1) || (k === "ifPrev" && v == null) || (k === "ignore" && v == null) ? undefined : v);
}
const FULL_DECK: Deck = Object.fromEntries(Object.entries(ADV).map(([w, a]) => [w, a.max]));
/** 参照资源状态：行动点拉满、数字牌全部到手（含各轮发的牌）、自指词全满；rnd 影响「全程」的价格 */
export function refState(rnd: number): St {
  const s = newGame(0, [FULL_DECK, FULL_DECK]);
  s.rnd = rnd; s.side[0].ap = P.APCAP; s.side[1].ap = P.APCAP;
  for (const v of Object.values(P.SCHEDULE).flat()) for (const sd of s.side) sd.cards.push({ v, cd: 0 });
  return s;
}
const REF_STATES = [refState(2), refState(8)];
/** 一句话原则上是否说得出口（任一参照状态下行动点、数字牌、自指词够；进阶词不超过单副卡组的限额与预算） */
export function playable(cl: Sentence): boolean {
  if (!legal(cl) || cl.length < 1 || cl.length > P.CLAUSE_MAX) return false;
  const cnt: Record<string, number> = {};
  for (const w of advWordsOf(cl)) cnt[w] = (cnt[w] ?? 0) + 1;
  let price = 0;
  for (const [w, n] of Object.entries(cnt)) { if (!ADV[w] || n > ADV[w].max) return false; price += ADV[w].price * n; }
  if (price > P2.BUDGET) return false;
  return REF_STATES.some((s) => !!canAfford(s, 0, cl, -1));
}
export const deckPrice = (cl: Sentence) => advWordsOf(cl).reduce((a, w) => a + (ADV[w]?.price ?? 0), 0);

// ====================== 变异 / 交叉 ======================
const CATS_Q = ["atk", "heal", "def", "dealt", "taken", "hpchg", "status", "any", "dmg", "guard"];
const EVS = ["down", "hurt", "healed", "decl"] as const;
const WORDS = ["造成", "恢复", "减伤", "灼烧", "易伤", "衰弱", "移除", "不得", "定时", "兑现", "无视"];
const AMT_OBJS: Obj[] = [cat("dealt"), cat("taken"), cat("heal"), cat("atk"), ev("hurt"), ev("healed"), ev("decl")];
export function randObj(r: Rng): Obj {
  const x = r();
  if (x < 0.5) return cat(pick(r, CATS_Q));
  if (x < 0.75) return ev(pick(r, [...EVS]));
  if (x < 0.95) return word(pick(r, WORDS));
  return { t: "order", a: pick(r, ["造成", "恢复", "减伤"]), b: pick(r, ["造成", "恢复", "减伤"]) };
}
function randAmtQuery(r: Rng): Amt {
  const o = pick(r, AMT_OBJS);
  const agg = o.t === "ev" && o.e === "decl" ? pick(r, ["len", "segs", "count"] as const) : pick(r, ["count", "sum"] as const);
  const all = r() < 0.2;
  return { q: query(win("before", all ? 99 : rint(r, 1, 2), all ? "round" : r() < 0.35 ? "sent" : "round"), pick(r, ["me", "foe"] as const), o, agg), mult: rint(r, 1, 2) };
}
/** 句子里所有「可以 ±1 的数字」 */
const slots = (cl: any): { o: any; k: string; lo: number; hi: number }[] => {
  const out: { o: any; k: string; lo: number; hi: number }[] = [];
  const walk = (o: any) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === "number" && v < 99) {
        if (k === "n" && ("verb" in o || "dir" in o)) out.push({ o, k, lo: 1, hi: 5 });
        else if (k === "lvl") out.push({ o, k, lo: 1, hi: P2.STATUS_MAX });
        else if (k === "dur") out.push({ o, k, lo: 1, hi: 4 });
        else if (k === "cap") out.push({ o, k, lo: 1, hi: 3 });
        else if (k === "wait") out.push({ o, k, lo: 1, hi: 4 });
        else if (k === "mult") out.push({ o, k, lo: 1, hi: 3 });
        else if (k === "tight") out.push({ o, k, lo: 1, hi: 4 });
        else if (k === "win" && "cat" in o) out.push({ o, k, lo: 1, hi: 3 });
      }
      walk(v);
    }
  };
  walk(cl);
  return out;
};
const effsOf = (c: Clause): Eff[] => (c.k === "act" ? [c.eff] : c.k === "when" || c.k === "delay" ? c.effs : []);
const queriesOf = (c: Clause): any[] => { const o: any[] = []; if (c.k === "when") o.push(c.q); effsOf(c).forEach((e) => typeof e.n !== "number" && o.push(e.n.q)); return o; };

/** 修补：保证变异结果的目标、窗口、数量合乎语法（修不了返回 null） */
export function fixup(cl: Sentence, r: Rng): Sentence | null {
  cl = cl.slice(0, P.CLAUSE_MAX);
  if (!cl.length) return null;
  const fixEff = (e: Eff, cond: Extract<Clause, { k: "when" }> | null, inDelay: boolean) => {
    if (e.verb === "dmg") {
      const okSrc = !!cond && cond.q.win.dir === "after" && cond.judge === "exist";
      if (!(e.tg.t === "lowFoe" || e.tg.t === "allFoe" || (e.tg.t === "src" && okSrc))) e.tg = { t: "lowFoe" };
    } else if (!(e.tg.t === "lowMe" || e.tg.t === "allMe")) e.tg = r() < 0.5 ? { t: "lowMe" } : { t: "allMe" };
    if (typeof e.n === "number") e.n = clamp(Math.round(e.n), 1, 5);
    else {
      const q = e.n.q;
      if (!inDelay) q.win = { dir: "before", n: q.win.n >= 99 ? 99 : clamp(q.win.n, 1, 3), unit: q.win.n >= 99 ? "round" : q.win.unit };
      else q.win = { dir: "after", n: 99, unit: "round" };
      if (q.obj.t === "order" || q.obj.t === "nth" || q.obj.t === "word") q.obj = pick(r, AMT_OBJS);
      if (q.obj.t === "ev" && q.obj.e === "decl") { if (q.agg === "sum") q.agg = "count"; } else if (q.agg === "len" || q.agg === "segs") q.agg = "count";
      e.n.mult = clamp(Math.round(e.n.mult), 1, 3);
    }
    if (e.verb !== "dmg") delete e.ignore;
  };
  for (let i = 0; i < cl.length; i++) {
    const c = cl[i];
    if (c.k === "act") {
      fixEff(c.eff, null, false);
      if (i === 0 || !c.ifPrev) delete c.ifPrev;
    } else if (c.k === "when") {
      if (c.forbid) {
        c.q = query(win("after", clamp(c.q.win.n, 1, 3), "round"), "foe", c.q.obj.t === "cat" || c.q.obj.t === "word" ? c.q.obj : cat("atk"), "count", 99);
        c.judge = "exist"; c.cap = clamp(c.cap, 1, 3);
        const pen = c.effs[0] && typeof c.effs[0].n === "number" ? c.effs[0].n : 2;
        c.effs = [dmg(clamp(pen, 1, 4), { t: "src" })];
        continue;
      }
      if (c.q.obj.t === "nth") c.q.obj = cat("atk");
      if (c.q.win.dir === "after") { c.q.win.n = c.q.win.n >= 99 ? 3 : clamp(c.q.win.n, 1, 4); c.cap = clamp(c.cap, 1, 3); if (c.q.win.unit === "sent" && c.judge === "absent") c.q.win.unit = "round"; }
      else { c.cap = 1; c.q.win.n = c.q.win.n >= 99 ? 99 : clamp(c.q.win.n, 1, 3); if (c.q.win.n >= 99) c.q.win.unit = "round"; }
      c.q.agg = "count";
      c.q.tight = clamp(c.q.tight ?? 1, 1, 4);
      if (!c.effs.length) return null;
      c.effs = c.effs.slice(0, 2);
      c.effs.forEach((e) => fixEff(e, c, false));
    } else if (c.k === "delay") {
      c.wait = clamp(c.wait, 1, 4);
      if (!c.effs.length) return null;
      c.effs = c.effs.slice(0, 1);
      if (typeof c.effs[0].n === "number") c.effs[0].n = { q: query(win("after", 99, "round"), "foe", cat("atk"), "count"), mult: 2 };
      fixEff(c.effs[0], null, true);
    } else if (c.k === "status") {
      c.lvl = clamp(c.lvl, 1, P2.STATUS_MAX); c.dur = clamp(c.dur, 1, 4);
      if (!(c.tg.t === "lowFoe" || c.tg.t === "allFoe")) c.tg = { t: "lowFoe" };
    } else if (c.k === "ignore") c.win = clamp(c.win, 1, 3);
    else if (c.k === "remove") { if (c.obj.t === "ev" || c.obj.t === "nth" || c.obj.t === "order") c.obj = cat("struct"); }
  }
  // 一句话里重复的长期效果没意义
  const sig = cl.filter((c) => c.k === "when" || c.k === "delay" || c.k === "ignore").map((c) => JSON.stringify(c));
  if (new Set(sig).size !== sig.length) return null;
  return cl;
}

/** 一次变异：换对象 / 改数字 / 加删一段 / 换窗口 / 换主体 / 换目标 / 换动词 / 引用量化 …… */
export function mutate(src: Sentence, r: Rng, pool: Clause[]): Sentence {
  const cl: Sentence = jclone(src);
  const op = r() * 100;
  const effs = cl.flatMap(effsOf), whens = cl.filter((c) => c.k === "when") as Extract<Clause, { k: "when" }>[];
  const qs = cl.flatMap(queriesOf);
  const acts = cl.filter((c) => c.k === "act") as Extract<Clause, { k: "act" }>[];
  if (op < 24) { const sl = slots(cl); if (sl.length) { const s = pick(r, sl); const d = (r() < 0.5 ? -1 : 1) * (r() < 0.8 ? 1 : 2); let v = clamp(s.o[s.k] + d, s.lo, s.hi); if (v === s.o[s.k]) v = clamp(s.o[s.k] - d, s.lo, s.hi); s.o[s.k] = v; } }       // 改数字
  else if (op < 33) { if (qs.length) { const q = pick(r, qs); q.obj = randObj(r); if (q.obj.t === "ev" && q.obj.e === "decl") q.agg = pick(r, ["count", "len", "segs"] as const); else if (q.agg === "len" || q.agg === "segs") q.agg = "count"; } }      // 换对象
  else if (op < 40) { if (qs.length) { const q = pick(r, qs); q.who = q.who === "me" ? "foe" : "me"; } }                                    // 换主体
  else if (op < 49) { if (qs.length) { const q = pick(r, qs); const x = r(); if (x < 0.4) q.win.unit = q.win.unit === "round" ? "sent" : "round"; else if (x < 0.6) q.win.dir = q.win.dir === "before" ? "after" : "before"; else if (x < 0.75) q.win.n = 99; else q.win.n = rint(r, 1, 3); } }   // 换窗口
  else if (op < 57) { if (effs.length) { const e = pick(r, effs); const x = r(); e.tg = e.verb === "dmg" ? (x < 0.4 ? { t: "allFoe" } : x < 0.7 ? { t: "src" } : { t: "lowFoe" }) : x < 0.5 ? { t: "allMe" } : { t: "lowMe" }; } }   // 换目标
  else if (op < 63) { if (effs.length) { const e = pick(r, effs); e.verb = pick(r, ["dmg", "heal", "shield"] as const); } }              // 换动词
  else if (op < 69) { if (effs.length) { const e = pick(r, effs); e.n = typeof e.n === "number" ? randAmtQuery(r) : rint(r, 1, 4); } }   // 数字 ↔ 引用量
  else if (op < 73) { if (acts.length) { const c = pick(r, acts); if (c.eff.verb === "dmg") c.eff.ignore = c.eff.ignore ? undefined : "shield"; } }   // 无视
  else if (op < 77) { const later = acts.filter((c) => cl.indexOf(c) > 0); if (later.length) pick(r, later).ifPrev = pick(r, ["ok", "fail", undefined] as const); }   // 连环
  else if (op < 80) { if (whens.length) { const c = pick(r, whens); c.judge = c.judge === "exist" ? "absent" : "exist"; } }
  else if (op < 83) { const st = cl.filter((c) => c.k === "status") as Extract<Clause, { k: "status" }>[]; if (st.length) pick(r, st).kind = pick(r, ["burn", "vuln", "weak"] as const); }
  else if (op < 91) { if (cl.length < P.CLAUSE_MAX && pool.length) cl.push(jclone(pick(r, pool))); else if (pool.length) cl[rint(r, 0, cl.length - 1)] = jclone(pick(r, pool)); }   // 加一段
  else if (op < 96) { if (cl.length > 1) cl.splice(rint(r, 0, cl.length - 1), 1); else if (pool.length) cl[0] = jclone(pick(r, pool)); }                      // 删一段
  else { if (cl.length > 1) { const i = rint(r, 0, cl.length - 2); [cl[i], cl[i + 1]] = [cl[i + 1], cl[i]]; } }                                   // 换序
  return cl;
}
export function crossover(a: Sentence, b: Sentence, r: Rng): Sentence {
  const i = rint(r, 1, a.length), j = rint(r, 0, b.length - 1);
  return jclone([...a.slice(0, i), ...b.slice(j)]);
}

// ====================== 电脑配置（评估用） ======================
/** 评估用的电脑配置：至少三种，估值权重和推演深度都不一样，防止结论只对某一种电脑成立。环境变量 EVAL_CFGS（JSON 数组，覆盖字段）可改 */
export function evalCfgs(): AiCfg[] {
  const base = { ...AI_DEFAULT, mode: "playbook" as const };
  const def: Partial<AiCfg>[] = [{ wCard: 0, wAp: 0.3, depth: 2 }, { wCard: 0.3, wAp: 0.3, depth: 2 }, { wCard: 0.6, wAp: 0.15, depth: 3 }];
  const ov: Partial<AiCfg>[] = process.env.EVAL_CFGS ? JSON.parse(process.env.EVAL_CFGS) : def;
  return ov.map((o) => ({ ...base, ...o }));
}
/** 自我对战采样局面用的电脑配置（更多样：含自由模式、普通模式） */
export function playCfgs(): AiCfg[] {
  const b = { ...AI_DEFAULT };
  return [{ ...b, mode: "playbook", wCard: 0.3 }, { ...b, mode: "free", wCard: 0 }, { ...b, mode: "playbook", wCard: 0.6 }, { ...b, mode: "plain", wCard: 0.3 }, { ...b, mode: "playbook", wCard: 0, depth: 1 }];
}

// ====================== 推演（与 ai.ts 的 rollout 同一逻辑；ai.ts 里它没有导出，这里复刻） ======================
function playOutRound(s: St) {
  for (let g = 0; g < 12; g++) {
    const sd = nextSide(s); if (sd === -1) break;
    const u = unitsOf(sd).find((x) => alive(s, x) && !s.done[x])!;
    if (!defaultMove(s, sd, u)) passUnit(s, u);
    s.turn = (1 - s.turn) as Side;
  }
}
export function rollout(s0: St, side: Side, unit: number, cl: Sentence | null, start: number, cfg: AiCfg): number {
  const s = clone(s0);
  if (cl) { if (!declare(s, side, unit, cl, start)) return -1e9; } else passUnit(s, unit);
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
/** 起手秒候选：最早 / 偏晚（让「读对方上一句」类有机会读到东西） */
export const startsFor = (cl: Sentence, unit: number): number[] => { const w = windupFor(cl, unit); const late = Math.max(w, 10); return late === w ? [w] : [w, late]; };
/** 一个局面点：局面 + 轮到谁 + 哪个随从 */
export interface Point { st: St; side: Side; unit: number; rndB: number }
/** 评估时的局面：双方卡组设成不限（只关心句子本身强不强，不关心卡组里有没有词） */
export function evalState(p: Point): St { const s = clone(p.st); s.deck = [null, null]; return s; }
/** 基线：「普通替代句」= 最好的朴素攻击 1~3（取最大推演值）；一条都说不出口时 = 这个随从不出手 */
export function baselineValue(s: St, side: Side, unit: number, cfg: AiCfg): number {
  let best = -Infinity;
  const maxN = Math.max(1, ...s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v));
  for (let n = Math.min(3, maxN); n >= 1; n--) {
    const cl: Sentence = [act(dmg(n, { t: "lowFoe" }))];
    if (!canAfford(s, side, cl, unit)) continue;
    for (const st of startsFor(cl, unit)) best = Math.max(best, rollout(s, side, unit, cl, st, cfg));
  }
  return best === -Infinity ? rollout(s, side, unit, null, 1, cfg) : best;
}
/** 一句话在一个局面点上的边际价值（比基线好多少）；说不出口返回 null */
export function marginal(s: St, side: Side, unit: number, cl: Sentence, cfg: AiCfg, base: number): number | null {
  if (!canAfford(s, side, cl, unit)) return null;
  let best = -Infinity;
  for (const st of startsFor(cl, unit)) best = Math.max(best, rollout(s, side, unit, cl, st, cfg));
  return best - base;
}

// ====================== 局面特征（决策表用） ======================
export interface FeatDef { key: string; zh: string; bool?: boolean }
export const FEATS: FeatDef[] = [
  { key: "rnd", zh: "轮数" }, { key: "pos", zh: "该随从的位置(0词位/1数位/2引用位)" }, { key: "first", zh: "本轮我先手", bool: true },
  { key: "myAlive", zh: "我方存活数" }, { key: "foeAlive", zh: "对方存活数" }, { key: "myHp", zh: "我方总血量" }, { key: "foeHp", zh: "对方总血量" }, { key: "hpDiff", zh: "血量差(我-对)" },
  { key: "myLow", zh: "我方最低血" }, { key: "foeLow", zh: "对方最低血" }, { key: "ap", zh: "行动点" },
  { key: "cardsN", zh: "可用数字牌张数" }, { key: "cardMax", zh: "最大可用牌面" }, { key: "cards3", zh: "牌面≥3的可用牌张数" },
  { key: "myLeft", zh: "我方还没说话的随从数" }, { key: "myDecl", zh: "我方本轮已说句数" }, { key: "foeDecl", zh: "对方本轮已说句数" },
  { key: "foeSaid", zh: "对方说过话", bool: true }, { key: "foeAtk", zh: "对方上一句有攻击", bool: true }, { key: "foeDef", zh: "对方上一句有减伤", bool: true }, { key: "foeHeal", zh: "对方上一句有恢复", bool: true }, { key: "foeStatus", zh: "对方上一句有状态词", bool: true }, { key: "foeLen", zh: "对方上一句词数" },
  { key: "foeStand", zh: "对方挂着的长期句数" }, { key: "foeForbid", zh: "对方挂着禁令数" }, { key: "foeTrap", zh: "对方挂着的陷阱/每当数" }, { key: "foeTimer", zh: "对方挂着的定时数" },
  { key: "myStand", zh: "我方挂着的长期句数" }, { key: "myForbid", zh: "我方挂着禁令数" }, { key: "myTrap", zh: "我方挂着的陷阱/每当数" }, { key: "myTimer", zh: "我方挂着的定时数" },
  { key: "foeStatusOnMe", zh: "我方身上的状态数" }, { key: "myStatusOnFoe", zh: "对方身上的状态数" },
  { key: "dkForbid", zh: "卡组有「不得」", bool: true }, { key: "dkRef", zh: "卡组有引用量词(次数/累计/词数/段数)", bool: true }, { key: "dkTimer", zh: "卡组有「定时」", bool: true }, { key: "dkStatus", zh: "卡组有状态词", bool: true }, { key: "dkAnd", zh: "卡组有「并」", bool: true }, { key: "dkMisc", zh: "卡组有移除/无视/兑现", bool: true },
];
export type Feat = Record<string, number>;
export function features(s: St, side: Side, unit: number): Feat {
  const foe = (1 - side) as Side;
  const mine = unitsOf(side), theirs = unitsOf(foe);
  const cards = s.side[side].cards.filter((c) => c.cd === 0);
  let lastFoe: { words: string[]; len: number } | null = null;
  for (let i = s.log.length - 1; i >= 0; i--) { const e = s.log[i]; if (e.kind === "decl" && e.side === foe) { lastFoe = e; break; } }
  const foeDecls = s.decl.filter((d) => d.side === foe), myDecls = s.decl.filter((d) => d.side === side);
  const sd = (own: Side) => s.stand.filter((x) => x.owner === own);
  type Stand = (typeof s.stand)[number];
  const nW = (xs: Stand[], f: (x: Stand) => boolean) => xs.filter(f).length;
  const isForbid = (x: Stand) => x.c.k === "when" && !!x.c.forbid;
  const isTrap = (x: Stand) => x.c.k === "when" && !x.c.forbid;
  const dk = s.deck[side] ?? {};
  const has = (...ws: string[]) => (ws.some((w) => (dk[w] ?? 0) > 0) ? 1 : 0);
  const hpOf = (us: number[]) => us.reduce((a, u) => a + Math.max(0, s.hp[u]), 0);
  const lowOf = (us: number[]) => Math.min(99, ...us.filter((u) => alive(s, u)).map((u) => s.hp[u]));
  return {
    rnd: s.rnd, pos: unit % 3, first: s.first === side ? 1 : 0,
    myAlive: nAlive(s, side), foeAlive: nAlive(s, foe), myHp: hpOf(mine), foeHp: hpOf(theirs), hpDiff: hpOf(mine) - hpOf(theirs), myLow: lowOf(mine), foeLow: lowOf(theirs), ap: s.side[side].ap,
    cardsN: cards.length, cardMax: Math.max(0, ...cards.map((c) => c.v)), cards3: cards.filter((c) => c.v >= 3).length,
    myLeft: mine.filter((u) => alive(s, u) && !s.done[u]).length, myDecl: myDecls.length, foeDecl: foeDecls.length,
    foeSaid: lastFoe ? 1 : 0, foeAtk: lastFoe?.words.includes("造成") ? 1 : 0, foeDef: lastFoe?.words.includes("减伤") ? 1 : 0, foeHeal: lastFoe?.words.includes("恢复") ? 1 : 0,
    foeStatus: lastFoe && lastFoe.words.some((w) => ["灼烧", "易伤", "衰弱"].includes(w)) ? 1 : 0, foeLen: lastFoe?.len ?? 0,
    foeStand: sd(foe).length, foeForbid: nW(sd(foe), isForbid), foeTrap: nW(sd(foe), isTrap), foeTimer: nW(sd(foe), (x) => x.c.k === "delay"),
    myStand: sd(side).length, myForbid: nW(sd(side), isForbid), myTrap: nW(sd(side), isTrap), myTimer: nW(sd(side), (x) => x.c.k === "delay"),
    foeStatusOnMe: s.sts.filter((x) => mine.includes(x.unit)).length, myStatusOnFoe: s.sts.filter((x) => theirs.includes(x.unit)).length,
    dkForbid: has("不得"), dkRef: has("次数", "累计", "词数", "段数"), dkTimer: has("定时"), dkStatus: has("灼烧", "易伤", "衰弱"), dkAnd: has("并"), dkMisc: has("移除", "无视", "兑现"),
  };
}

// ====================== 自我对战采样局面 ======================
export interface Snap { st: St; side: Side; units: number[]; seed: number; cfgA: number; cfgB: number }
/** 一局自我对战（两边随机卡组、随机电脑配置），按概率在每次「轮到某方宣告」之前存一份局面 */
export function selfplaySnaps(seed: number, pSnap: number): Snap[] {
  const r = mulberry32(seed), rd = mulberry32(seed ^ 0x9e3779b1);
  const cfgs = playCfgs();
  const ca = Math.floor(rd() * cfgs.length), cb = Math.floor(rd() * cfgs.length);
  const s = newGame((seed & 1) as Side, [randDeck(rd), randDeck(rd)]);
  const out: Snap[] = [];
  let guard = 0;
  while (s.win < 0 && guard++ < 40) {
    for (let g = 0; g < 14; g++) {
      const sd = nextSide(s); if (sd === -1) break;
      const units = unitsOf(sd).filter((x) => alive(s, x) && !s.done[x]);
      if (rd() < pSnap && units.length) out.push({ st: JSON.parse(JSON.stringify(s)), side: sd, units, seed, cfgA: ca, cfgB: cb });
      const m = think(s, sd, r, sd === 0 ? cfgs[ca] : cfgs[cb]);
      if (m.cl && declare(s, sd, m.unit, m.cl, m.start)) { /* ok */ } else passUnit(s, m.unit);
      s.turn = (1 - s.turn) as Side;
    }
    resolveRound(s);
    if (s.win < 0) nextRound(s);
  }
  return out;
}
export const rndBucket = (rnd: number) => (rnd <= 1 ? 0 : rnd === 2 ? 1 : rnd <= 4 ? 2 : rnd <= 6 ? 3 : 4);
export { sentenceText, wordsOf, sentenceCost, total };

// 句子即规则：共享语法树（AST）。原型解释器 interp.ts 直接解释它；之后真实引擎和界面也用同一份结构。
// 设计依据：设计与审计/数字牌模式/交接-句子语言设计总览.md §1、§5
import { P } from "../lab/rules";

export type Side = 0 | 1;
export type Who = "me" | "foe";

/** 被引用的东西：词 / 类别 / 事件 / 第 N 句 / 词序 */
export type Obj =
  | { t: "word"; w: string }
  | { t: "cat"; c: string }                              // atk dmg heal hpchg def guard struct any
  | { t: "ev"; e: "down" | "hurt" | "healed" | "decl" }
  | { t: "nth"; n: number }                              // 本轮第 N 句（按宣告顺序）
  | { t: "order"; a: string; b: string };                // 句子里 a 词在 b 词之前

/** 窗口 = 方向 + N + 单位；不写死「上一轮」「本局」 */
export interface Win { dir: "before" | "after"; n: number; unit: "round" | "sent" }

/** 对事件日志的一次查询 */
export interface Query {
  win: Win; who: Who; obj: Obj;
  agg: "count" | "sum" | "len" | "segs";                 // 次数 / 累计量 / 词数 / 段数
  tight?: number;                                        // 收紧 N：N 越大门槛越低，不说 = 1
}
/** 数字：写死的数 或「引用量 × 倍率」 */
export type Amt = number | { q: Query; mult: number };

export type Tg =
  | { t: "unit"; u: number }
  | { t: "src" }                                         // 触发这条长期句子的那个随从
  | { t: "lowFoe" } | { t: "lowMe" } | { t: "allMe" } | { t: "allFoe" };

export interface Eff { verb: "dmg" | "heal" | "shield"; n: Amt; tg: Tg; ignore?: "shield" }

export type Clause =
  | { k: "act"; eff: Eff; ifPrev?: "ok" | "fail" }       // 造成 / 恢复 / 减伤，可接「成功/失败」
  | { k: "when"; q: Query; judge: "exist" | "absent"; effs: Eff[]; cap: number }
  //    before 窗口：宣告生效那一刻判断一次；after 窗口：留在场上，窗口里发生了才触发（至多 cap 次/轮）
  | { k: "delay"; wait: number; effs: Eff[] }            // N 轮后结算；Eff 的 Amt 里可引用「等待期间」的量
  | { k: "ignore"; cat: "stand"; win: number }           // 无视：这几轮里对面长期句子的效果落不到我方
  | { k: "cash" }                                        // 兑现：提前结算我方定时句
  | { k: "remove"; obj: Obj };                           // 移除一句带有某词/类别的话（any 更贵）

export type Sentence = Clause[];

// ---------- 构造辅助 ----------
export const dmg = (n: Amt, tg: Tg = { t: "lowFoe" }, ignore?: "shield"): Eff => ({ verb: "dmg", n, tg, ignore });
export const heal = (n: Amt, tg: Tg = { t: "lowMe" }): Eff => ({ verb: "heal", n, tg });
export const shield = (n: Amt, tg: Tg = { t: "lowMe" }): Eff => ({ verb: "shield", n, tg });
export const act = (eff: Eff, ifPrev?: "ok" | "fail"): Clause => ({ k: "act", eff, ifPrev });
export const unit = (u: number): Tg => ({ t: "unit", u });
export const win = (dir: Win["dir"], n: number, u: Win["unit"] = "round"): Win => ({ dir, n, unit: u });
export const cat = (c: string): Obj => ({ t: "cat", c });
export const word = (w: string): Obj => ({ t: "word", w });
export const ev = (e: "down" | "hurt" | "healed" | "decl"): Obj => ({ t: "ev", e });
export const query = (w: Win, who: Who, obj: Obj, agg: Query["agg"] = "count", tight?: number): Query => ({ win: w, who, obj, agg, tight });
/** 每当（长期）：以后 N 轮里，who 的 obj 发生，则 effs（至多 cap 次/轮） */
export const whenever = (who: Who, obj: Obj, n: number, effs: Eff[], cap = 1, tight = 1): Clause =>
  ({ k: "when", q: query(win("after", n), who, obj, "count", tight), judge: "exist", effs, cap });
/** 若 不存在（长期）：以后 N 轮里每轮结束时，who 本轮没有 obj，则 effs */
export const unless = (who: Who, obj: Obj, n: number, effs: Eff[]): Clause =>
  ({ k: "when", q: query(win("after", n), who, obj), judge: "absent", effs, cap: 1 });
/** 不得：违者受罚。以后 N 轮里对方每次 obj，对其本人造成 pen 点（语法糖：每当 + 对来源造成） */
export const forbid = (obj: Obj, n: number, pen: number, cap = 1): Clause => whenever("foe", obj, n, [dmg(pen, { t: "src" })], cap, 99);
/** 定时：N 轮后，对面最低血量随从受到「等待期间 obj 次数 × mult」 */
export const timer = (wait: number, obj: Obj, who: Who, mult: number): Clause =>
  ({ k: "delay", wait, effs: [dmg({ q: query(win("after", 99), who, obj), mult })] });

// ---------- 词表与费用 ----------
/** 一个子句里出现的词（按出现顺序，用于「带有 xx 词的句子」「先于/后于」） */
export function wordsOf(c: Clause): string[] {
  const v = (e: Eff) => (e.verb === "dmg" ? "造成" : e.verb === "heal" ? "恢复" : "减伤");
  switch (c.k) {
    case "act": return [v(c.eff), ...(c.eff.ignore ? ["无视"] : [])];
    case "when": return [c.judge === "absent" ? "不存在" : "存在", c.q.win.dir === "after" ? "每当" : "若", ...c.effs.map(v)];
    case "delay": return ["定时", ...c.effs.map(v)];
    case "ignore": return ["无视"];
    case "cash": return ["兑现"];
    case "remove": return ["移除"];
  }
}
export function catsOf(c: Clause): string[] {
  const out = new Set<string>(["any"]);
  const e = (x: Eff) => (x.verb === "dmg" ? ["atk", "dmg", "hpchg"] : x.verb === "heal" ? ["heal", "hpchg"] : ["def", "guard"]).forEach((k) => out.add(k));
  if (c.k === "act") e(c.eff); else if (c.k === "when" || c.k === "delay") { out.add("struct"); c.effs.forEach(e); } else out.add("struct");
  return [...out];
}
/** 数字牌需求：所有 ≥2 的数字（Amt 引用量里的窗口 N、倍率也算） */
export function numsOf(c: Clause): number[] {
  const am = (a: Amt): number[] => (typeof a === "number" ? [a] : [a.q.win.n === 99 ? 1 : a.q.win.n, a.mult, a.q.tight ?? 1]);
  const ef = (x: Eff) => am(x.n);
  switch (c.k) {
    case "act": return ef(c.eff);
    case "when": return [c.q.win.n === 99 ? 1 : c.q.win.n, c.cap, c.q.tight === 99 ? 1 : c.q.tight ?? 1, ...c.effs.flatMap(ef)];
    case "delay": return [c.wait, ...c.effs.flatMap(ef)];
    case "ignore": return [c.win];
    default: return [];
  }
}
export function clauseCost(c: Clause): number {
  const ec = (x: Eff) => (x.verb === "dmg" ? P.BASE + (x.ignore ? P.PIERCE : 0) : x.verb === "heal" ? P.HEALC : P.SHC);
  switch (c.k) {
    case "act": return ec(c.eff);
    case "when": return P.STAND + (c.q.obj.t === "cat" && c.q.obj.c === "any" ? P.ANYCLS : 0);
    case "delay": case "ignore": return P.STAND;
    case "cash": return P.CASH;
    case "remove": return c.obj.t === "cat" && c.obj.c === "any" ? P.REMOVE_ANY : P.REMOVE;
  }
}
export function sentenceCost(cl: Sentence): number {
  return cl.reduce((t, c, i) => t + clauseCost(c) + (i > 0 && !(c.k === "act" && c.ifPrev) ? P.AND : 0), 0);
}
/** 起手时间：段越多、数字越大越晚 */
export function windup(cl: Sentence): number {
  const maxN = Math.max(1, ...cl.flatMap(numsOf));
  return Math.min(P.TL, 1 + (cl.length - 1) * P.WIND_CL + Math.floor((maxN - 1) * P.WIND_N));
}

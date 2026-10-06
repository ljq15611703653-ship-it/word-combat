// 自动同步自 lab2/ast.ts（scripts/sync-engine.mjs），请勿手改；补丁见 PATCHES.md
/* eslint-disable */
// @ts-nocheck
// 句子即规则：共享语法树（AST）。原型解释器 interp.ts 直接解释它；之后真实引擎和界面也用同一份结构。
// 设计依据：设计与审计/数字牌模式/交接-句子语言设计总览.md §1、§5
import { P } from "./lab-rules";
import { P2, type Cls } from "./params";

export type Side = 0 | 1;
export type Who = "me" | "foe";

/** 被引用的东西：词 / 类别 / 事件 / 第 N 句 / 词序 */
export type Obj =
  | { t: "word"; w: string }
  | { t: "cat"; c: string }                              // atk dmg heal hpchg def guard status struct any
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
  | { t: "lowFoe" } | { t: "lowMe" } | { t: "some"; n: number; side: "me" | "foe" }   // 选择 n 个（血最低的 n 个）；n 是数字，要写出来、占数字牌
  | { t: "units"; us: number[] }                                                       // 显式的一组随从（TGT_AT_DECL：宣告时把别名解析成具体随从）
  | { t: "allMe" } | { t: "allFoe" };                                                   // 旧写法，等同于选择 3 个（三个随从）

export interface Eff { verb: "dmg" | "heal" | "shield"; n: Amt; tg: Tg; ignore?: "shield"; rep?: number }   // rep = 重复 M（真实引擎：打 M 次每次 N，数字占牌）
export type StatusKind = "burn" | "vuln" | "weak";

/** 断言只判断一次；scope 决定先数双方句子，还是先筛选指定一方。 */
export interface Assertion {
  k: "assert"; win: Win; who: Who | "all"; scope: "all" | "side";
  obj: Obj; judge: "exist" | "absent"; effs: Eff[]; otherwise?: Eff[]; rewards?: Sentence; alternatives?: Sentence;
}
export const assertionBranch = (c: Assertion, yes: boolean): Sentence => yes ? (c.rewards ?? c.effs.map(eff => ({ k: "act", eff }))) : (c.alternatives ?? (c.otherwise ?? []).map(eff => ({ k: "act", eff })));
export const assertionClauses = (c: Assertion): Sentence => [...assertionBranch(c, true), ...assertionBranch(c, false)];
export const allClauses = (cl: Sentence): Sentence => cl.flatMap(c => c.k === "assert" ? [c, ...allClauses(assertionClauses(c))] : [c]);
/** 互斥分支分别检查，不能把奖励和否则当作同时挂上的状态。 */
export function statusPaths(cl: Sentence): Sentence[] {
  let paths: Sentence[] = [[]];
  for (const c of cl) {
    const parts = c.k === "assert" ? [...statusPaths(assertionBranch(c,true)), ...statusPaths(assertionBranch(c,false))] : [[c]];
    paths = paths.flatMap(path => parts.map(part => [...path,...part]));
  }
  return paths;
}
export const assertionEffs = (c: Assertion): Eff[] => assertionClauses(c).flatMap(x => x.k === "act" ? [x.eff] : x.k === "assert" ? assertionEffs(x) : x.k === "when" || x.k === "delay" ? x.effs : []);
export type Clause =
  | Assertion
  | { k: "act"; eff: Eff; ifPrev?: "ok" | "fail" }       // 造成 / 恢复 / 减伤，可接「成功/失败」
  | { k: "when"; q: Query; judge: "exist" | "absent"; effs: Eff[]; cap: number; forbid?: boolean }
  //    before 窗口：宣告生效那一刻判断一次；after 窗口：留在场上，窗口里发生了才触发（至多 cap 次/轮）
  | { k: "delay"; wait: number; effs: Eff[] }            // N 轮后结算；Eff 的 Amt 里可引用「等待期间」的量
  | { k: "status"; kind: StatusKind; lvl: number; dur: number; tg: Tg }   // 灼烧：轮末掉 lvl；易伤：受伤 +lvl；衰弱：出手伤害 −lvl
  | { k: "ignore"; cat: "stand"; win: number }           // 无视：这几轮里对面长期句子的效果落不到我方
  | { k: "cash" }                                        // 兑现：提前结算我方定时句
  | { k: "remove"; obj: Obj }                            // 移除一句带有某词/类别的话（any 更贵）；cat status = 清除我方身上的状态
  | { k: "redirect"; tg: Tg }                            // 转移（真实）：本轮打向这个随从的敌方伤害，改打在出手的人自己身上
  | { k: "postpone"; ord: number; n: number }            // 延后（真实）：把对方本轮第 ord 号宣告的那句往后推 n 秒
  | { k: "strip"; tg: Tg };                              // 移除（真实）：拆掉一个敌人身上的减伤、转移，掐断它挂着的长期句子

export type Sentence = Clause[];

// ---------- 构造辅助 ----------
export const dmg = (n: Amt, tg: Tg = { t: "lowFoe" }, ignore?: "shield", rep?: number): Eff => (rep && rep > 1 ? { verb: "dmg", n, tg, ignore, rep } : { verb: "dmg", n, tg, ignore });
export const heal = (n: Amt, tg: Tg = { t: "lowMe" }, rep?: number): Eff => (rep && rep > 1 ? { verb: "heal", n, tg, rep } : { verb: "heal", n, tg });
export const shield = (n: Amt, tg: Tg = { t: "lowMe" }): Eff => ({ verb: "shield", n, tg });
export const act = (eff: Eff, ifPrev?: "ok" | "fail"): Clause => ({ k: "act", eff, ifPrev });
export const status = (kind: StatusKind, lvl: number, dur: number, tg: Tg = { t: "lowFoe" }): Clause => ({ k: "status", kind, lvl, dur, tg });
export const unit = (u: number): Tg => ({ t: "unit", u });
export const units = (us: number[]): Tg => ({ t: "units", us });
export const redirect = (tg: Tg): Clause => ({ k: "redirect", tg });
export const postpone = (ord: number, n: number): Clause => ({ k: "postpone", ord, n });
export const strip = (tg: Tg): Clause => ({ k: "strip", tg });
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
/** 不得：违者受罚。以后 N 轮里对方每次 obj，对其本人造成 pen 点 */
export const forbid = (obj: Obj, n: number, pen: number, cap = 1): Clause =>
  ({ k: "when", q: query(win("after", n), "foe", obj, "count", 99), judge: "exist", effs: [dmg(pen, { t: "src" })], cap, forbid: true });
/** 定时：N 轮后，对面最低血量随从受到「等待期间 obj 次数 × mult」 */
export const timer = (wait: number, obj: Obj, who: Who, mult: number): Clause =>
  ({ k: "delay", wait, effs: [dmg({ q: query(win("after", 99), who, obj), mult })] });

// ---------- 词、类别、数字、费用 ----------
const STATUS_WORD: Record<StatusKind, string> = { burn: "灼烧", vuln: "易伤", weak: "衰弱" };
const verbWord = (e: Eff) => (e.verb === "dmg" ? "造成" : e.verb === "heal" ? "恢复" : "减伤");
const verbCats = (e: Eff) => (e.verb === "dmg" ? ["atk", "dmg", "hpchg"] : e.verb === "heal" ? ["heal", "hpchg"] : ["def", "guard"]);

/** 一个子句里出现的词（按出现顺序，用于「带有 xx 词的句子」「先于/后于」） */
export function wordsOf(c: Clause): string[] {
  switch (c.k) {
    case "assert": return ["断言", c.judge === "absent" ? "不存在" : "存在", "奖励", ...assertionBranch(c, true).flatMap(wordsOf), ...((c.otherwise || c.alternatives) ? ["否则", ...assertionBranch(c, false).flatMap(wordsOf)] : [])];
    case "act": return [verbWord(c.eff), ...(c.eff.ignore ? ["无视"] : [])];
    case "when": return [c.judge === "absent" ? "不存在" : "存在", c.forbid ? "不得" : c.q.win.dir === "after" ? "每当" : "若", ...c.effs.map(verbWord)];
    case "delay": return ["定时", ...c.effs.map(verbWord)];
    case "status": return [STATUS_WORD[c.kind]];
    case "ignore": return ["无视"];
    case "cash": return ["兑现"];
    case "remove": case "strip": return ["移除"];
    case "redirect": return ["转移"];
    case "postpone": return ["延后"];
  }
}
export function catsOf(c: Clause): string[] {
  const out = new Set<string>(["any"]);
  if (c.k === "act") verbCats(c.eff).forEach((k) => out.add(k));
  else if (c.k === "when" || c.k === "delay" || c.k === "assert") { out.add("struct"); if (c.k === "assert") assertionClauses(c).flatMap(catsOf).forEach(k => out.add(k)); else c.effs.forEach((e) => verbCats(e).forEach((k) => out.add(k))); }
  else if (c.k === "status") out.add("status");
  else if (c.k === "redirect") { out.add("def"); out.add("guard"); }
  else out.add("struct");
  return [...out];
}
/** 目标个数：选择 n 个就是 n；旧「全体」= 3；其余 = 1（免费） */
export const tgN = (t: Tg): number => (t.t === "units" ? Math.max(1, t.us.length) : t.t === "some" ? t.n : t.t === "allMe" || t.t === "allFoe" ? 3 : 1);
const effNums = (e: Eff): number[] => [...amNums(e.n), tgN(e.tg), e.rep ?? 1];
const amNums = (a: Amt): number[] => (typeof a === "number" ? [a] : [a.q.win.n >= 99 ? 1 : a.q.win.n, a.mult, a.q.tight ?? 1]);
/** 数字牌需求：所有 ≥2 的数字（Amt 引用量里的窗口 N、倍率也算） */
export function numsOf(c: Clause, cx?: Cls | null): number[] {
  const lim = cx === "限制";   // 限制流：「以后 N 轮 / 之前 N 句」的窗口数字、「至多」次数不占数字牌（flatMap 会把下标塞进第二个参数，所以要判类型）
  switch (c.k) {
    case "assert": return [lim ? 1 : c.win.n, ...assertionClauses(c).flatMap(x => numsOf(x,cx))];
    case "act": return effNums(c.eff);
    case "when": return [lim ? 1 : c.q.win.n === 99 ? 1 : c.q.win.n, lim ? 1 : c.cap, c.q.tight === 99 ? 1 : c.q.tight ?? 1, ...c.effs.flatMap(effNums)];
    case "delay": return [c.wait, ...c.effs.flatMap(effNums)];
    case "status": return P2.STAUTO ? [c.dur] : [c.lvl, c.dur];   // 真实：状态的数字只有持续轮数，级别每次施放 +1
    case "ignore": return [c.win];
    case "redirect": return [tgN(c.tg)];
    case "postpone": return [c.n];
    default: return [];
  }
}
export function clauseCost(c: Clause, cx?: Cls | null): number {
  const ec = (x: Eff) => (P2.COSTREAL ? (x.ignore ? P.PIERCE : 0) : x.verb === "dmg" ? P.BASE + (x.ignore ? P.PIERCE : 0) : x.verb === "heal" ? P.HEALC : P.SHC) + (tgN(x.tg) > 1 ? P2.AOE * (tgN(x.tg) - 1) : 0);
  switch (c.k) {
    case "assert": return P.STAND + Math.max(...[assertionBranch(c,true), assertionBranch(c,false)].map(cs => cs.reduce((n,x,i) => n + clauseCost(x,cx) + (i > 0 && !isChain(x) ? Math.max(0,P.AND - (cx === "并" ? P2.AND_BING : 0)) : 0), 0)));
    case "act": return ec(c.eff);
    case "when": return P.STAND + (c.q.obj.t === "cat" && c.q.obj.c === "any" ? P.ANYCLS : 0);
    case "delay": case "ignore": return P.STAND;
    case "status": return Math.max(0, P2.STATUS_AP - (cx === "状态" ? P2.ST_AP_MINUS : 0));
    case "cash": return P.CASH;
    case "remove": return c.obj.t === "cat" && c.obj.c === "any" ? P.REMOVE_ANY : P.REMOVE;
    case "redirect": return P2.AP_REDIR + (tgN(c.tg) > 1 ? P2.AOE * (tgN(c.tg) - 1) : 0);
    case "postpone": return P2.AP_POST;
    case "strip": return P.REMOVE;
  }
}
/** 真实引擎里的「纯防御句」：每一段都是减伤 / 转移 / 恢复。同一秒里它们先生效 */
export const isDefSentence = (cl: Sentence) => cl.every((c) => c.k === "redirect" || (c.k === "act" && c.eff.verb !== "dmg") || (c.k === "assert" && isDefSentence(assertionClauses(c))));
const isChain = (c: Clause) => c.k === "act" && !!c.ifPrev;
const AGG_WORD = { count: "次数", sum: "累计", len: "词数", segs: "段数" } as const;
/** 全程 = 之前窗口里的 99（只许「之前」）；价格 = 当前轮数，不低于 2 */
export const isAll = (q: Query) => q.win.dir === "before" && q.win.n >= 99;
/** 自指词用量：每种每用一次占一张（用完冷却一轮） */
export function refKindsOf(cl: Sentence): string[] {
  const out: string[] = [];
  const q = (x: Query) => {
    out.push("win");
    if (isAll(x)) out.push("all");
    if (x.agg !== "count" || x.obj.t === "order" || x.obj.t === "nth" || x.obj.t === "word" || x.obj.t === "ev" || (x.obj.t === "cat" && x.obj.c !== "any")) out.push("ref");
  };
  const am = (a: Amt) => { if (typeof a !== "number") q(a.q); };
  for (const c of cl) {
    if (c.k === "assert") { out.push("cond", "judge", "win", "ref", ...refKindsOf(assertionClauses(c))); }
    else if (c.k === "when") { out.push("cond", "judge"); q(c.q); c.effs.forEach((e) => am(e.n)); }
    else if (c.k === "delay") c.effs.forEach((e) => am(e.n));
    else if (c.k === "act") am(c.eff.n);
    else if (c.k === "remove" && !(c.obj.t === "cat" && c.obj.c === "any")) out.push("ref");
  }
  return out;
}
/** 一句话用掉的进阶词（卡组里要有） */
export function advWordsOf(cl: Sentence): string[] {
  const out: string[] = [];
  const am = (a: Amt) => { if (typeof a !== "number") out.push(AGG_WORD[a.q.agg]); };
  cl.forEach((c, i) => {
    if (c.k === "act") am(c.eff.n); else if (c.k === "when" || c.k === "delay") c.effs.forEach((e) => am(e.n));
    if (i > 0 && !isChain(c)) out.push("并");
    if (c.k === "act") { if (c.eff.verb === "shield") out.push("减伤"); if (c.eff.ignore) out.push("无视"); }
    else if (c.k === "assert") {
      out.push("断言");
      if (c.obj.t === "order") out.push("先后");
      out.push(...advWordsOf(assertionBranch(c,true)), ...advWordsOf(assertionBranch(c,false)));
    }
    else if (c.k === "when") {
      if (c.forbid) out.push("不得"); else if ((c.q.tight ?? 1) > 1) out.push("收紧");
      if (c.cap > 1) out.push("至多");
      if (c.q.obj.t === "order") out.push("先后");
      c.effs.forEach((e) => { if (e.verb === "shield") out.push("减伤"); });
    } else if (c.k === "delay") { out.push("定时"); c.effs.forEach((e) => { if (e.verb === "shield") out.push("减伤"); }); }
    else if (c.k === "status") out.push(STATUS_WORD[c.kind]);
    else if (c.k === "ignore") out.push("无视");
    else if (c.k === "cash") out.push("兑现");
    else if (c.k === "remove" || c.k === "strip") out.push("移除");
    else if (c.k === "redirect") out.push("转移");
    else if (c.k === "postpone") out.push("延后");
  });
  return out;
}
/** 句子里「累计」量出现几处（只数数值位置） */
export function sumCount(cl: Sentence): number {
  let n = cl.filter(c => c.k === "assert").reduce((n,c) => n + sumCount(assertionClauses(c as Assertion)),0);
  const am = (x: Amt) => { if (typeof x !== "number" && x.q.agg === "sum") n++; };
  for (const c of cl) { if (c.k === "act") am(c.eff.n); else if (c.k === "when" || c.k === "delay") c.effs.forEach((e) => am(e.n)); }
  return n;
}
/** pos：随从位置（0 词位 / 1 数位 / 2 引用位），-1 = 不分位置 */
export function sentenceCost(cl: Sentence, rnd = 1, pos = -1, cx: Cls | null = null): number {
  const ks = refKindsOf(cl);
  // 优先级：职业先定「每多一段」的底价（并流 AND_BING），位置（词位）再在上面减；全程半价只算一次（引用流 或 引用位，不叠加）
  const seg = (c: Clause) => { let x = isChain(c) ? P2.CHAINAP : P.AND; if (cx === "并") x = Math.min(x, P2.AND_BING); return pos === 0 ? Math.max(0, x - P2.POS_WORD) : x; };
  const allCost = (pos === 2 && P2.POS3 === "ref") || cx === "引用" ? Math.max(1, Math.ceil(Math.max(2, rnd) / 2)) : Math.max(2, rnd);
  return (P2.COSTREAL ? P.BASE : 0) + cl.reduce((t, c, i) => t + clauseCost(c, cx) + (i > 0 ? seg(c) : 0), 0) + ks.length * P2.REFAP + sumCount(cl) * P2.SUM_AP + ks.filter((k) => k === "all").length * allCost;
}
/** 起手时间：段越多、数字越大越晚 */
export function windup(cl: Sentence, extra = 0, cx: Cls | null = null): number {
  const maxN = Math.max(1, extra, ...cl.flatMap((c) => numsOf(c, cx)));
  const words = P2.WIND_WORD ? cl.filter((c) => c.k === "status" || c.k === "redirect" || c.k === "postpone" || c.k === "strip" || c.k === "remove").length * P2.WIND_WORD : 0;
  return Math.min(P.TL, 1 + (cx === "并" ? 0 : (cl.length - 1) * P.WIND_CL) + Math.floor((maxN - 1) * P.WIND_N) + words);
}

// ---------- 读成中文 ----------
const OBJ_ZH: Record<string, string> = { atk: "攻击词", dmg: "伤害", heal: "治疗词", hpchg: "生命变动", def: "防护词", guard: "防护", status: "状态词", struct: "结构词", any: "任意词", dealt: "造成的伤害", taken: "受到的伤害" };
const objText = (o: Obj) => o.t === "word" ? `「${o.w}」` : o.t === "cat" ? (OBJ_ZH[o.c] ?? o.c) : o.t === "ev" ? ({ down: "倒下", hurt: "受到伤害", healed: "被恢复", decl: "宣告" }[o.e]) : o.t === "nth" ? `第${o.n}句` : `「${o.a}」先于「${o.b}」`;
const whoText = (w: Who) => (w === "me" ? "我方" : "对方");
const winText = (w: Win) => `${w.dir === "before" ? "之前" : "以后"}${w.n === 99 ? "全程" : w.n}${w.unit === "round" ? "轮" : "句"}`;
const aggText = (a: Query["agg"]) => ({ count: "次数", sum: "累计", len: "词数", segs: "段数" }[a]);
/** 显式目标的可读名：甲/乙方（0~2 号随从是甲方，3~5 号是乙方）+ 位置名（词位/数位/速位）+ 序号 */
export const unitName = (u: number) => `${u < 3 ? "甲" : "乙"}方${u % 3 + 1}号${["词位", "数位", "速位"][u % 3]}随从`;
const tgText = (t: Tg) => t.t === "some" ? `选择${t.n}个${t.side === "foe" ? "敌方" : "我方"}随从` : t.t === "unit" ? unitName(t.u) : t.t === "units" ? t.us.map(unitName).join("、") : { src: "来源", lowFoe: "敌方最低血", lowMe: "我方最低血", allMe: "我方全体", allFoe: "敌方全体" }[t.t];
const amText = (a: Amt) => (typeof a === "number" ? String(a) : `${whoText(a.q.who)}${objText(a.q.obj)}${aggText(a.q.agg)}×${a.mult}`);
const effText = (e: Eff) => `${tgText(e.tg)}${{ dmg: "受伤", heal: "恢复", shield: "减伤" }[e.verb]}${amText(e.n)}${e.ignore ? "（无视减伤）" : ""}${(e.rep ?? 1) > 1 ? `重复${e.rep}次` : ""}`;
export function clauseText(c: Clause): string {
  switch (c.k) {
    case "assert": return `断言 ${c.scope === "side" ? `${whoText(c.who as Who)}${winText(c.win)}` : `${winText(c.win)}${c.who === "all" ? "全部" : whoText(c.who)}`} ${c.judge === "absent" ? "不存在" : "存在"}${objText(c.obj)}，奖励 ${assertionBranch(c,true).map(clauseText).join(" 并 ")}${c.otherwise || c.alternatives ? `；否则 ${assertionBranch(c,false).map(clauseText).join(" 并 ")}` : ""}`;
    case "act": return `${c.ifPrev ? (c.ifPrev === "ok" ? "若成功，" : "若失败，") : ""}${effText(c.eff)}`;
    case "when": return `${c.forbid ? "不得：" : c.q.win.dir === "after" ? "每当" : "若"} ${winText(c.q.win)} ${whoText(c.q.who)}${c.judge === "absent" ? "不存在" : "存在"}${objText(c.q.obj)}${(c.q.tight ?? 1) > 1 && !c.forbid ? `(收紧${c.q.tight})` : ""}，则 ${c.effs.map(effText).join("并")}${c.cap > 1 ? `（至多${c.cap}次）` : ""}`;
    case "delay": return `${c.wait}轮后：${c.effs.map(effText).join("并")}`;
    case "status": return `${tgText(c.tg)}${STATUS_WORD[c.kind]}${c.lvl}级持续${c.dur}轮`;
    case "ignore": return `无视 长期句子 ${c.win}轮`;
    case "cash": return "兑现";
    case "remove": return `移除 ${objText(c.obj)}`;
    case "redirect": return `${tgText(c.tg)}转移`;
    case "postpone": return `延后 第${c.ord + 1}句 ${c.n}秒`;
    case "strip": return `移除 ${tgText(c.tg)}的减伤/转移/长期句`;
  }
}
/** 玩家拼不出来的句子：「全程」只能读已发生的事，不能写成「以后全程」（长期句子的窗口 ≥99、无视 ≥99 都不合法）；定时内部用的 99 不算 */
export function legal(cl: Sentence): boolean {
  if (cl.some((c) => c.k === "assert" && (c.win.dir !== "after" || !Number.isInteger(c.win.n) || c.win.n < 1 || c.win.n >= 99 || !["all", "me", "foe"].includes(c.who) || !["all", "side"].includes(c.scope) || (c.scope === "side" && c.who === "all") || !assertionBranch(c,true).length || ((c.otherwise || c.alternatives) && !assertionBranch(c,false).length) || (c.win.unit === "sent" && c.obj.t === "ev" && c.obj.e !== "decl") || ![assertionBranch(c,true), assertionBranch(c,false)].every(cs => !cs.length || (legal(cs)))))) return false;
  return cl.every((c) => !(c.k === "when" && c.q.win.dir === "after" && c.q.win.n >= 99) && !(c.k === "ignore" && c.win >= 99) && !(c.k === "status" && c.dur >= 99)
    && !(c.k === "redirect" && !P2.REDIR) && !(c.k === "postpone" && !P2.POSTPONE) && !(c.k === "strip" && !P2.RMREAL) && !(c.k === "remove" && P2.RMREAL)
    && !((c.k === "act" && (c.eff.rep ?? 1) > 1 && !P2.REP) || (c.k === "act" && (c.eff.rep ?? 1) > 1 && c.eff.verb === "shield")));
}
export const sentenceText = (cl: Sentence) => cl.map(clauseText).join(" 并 ");

// ---------- 职业限制（只有 P2.CLASSES 开着、传了职业才会用到）----------
/** 一个子句的「动作词」：并流一句里同一个动作词只能出现一次 */
export function actionWordOf(c: Clause): string {
  switch (c.k) {
    case "assert": return "断言";
    case "act": return verbWord(c.eff);
    case "status": return STATUS_WORD[c.kind];
    case "redirect": return "转移";
    case "postpone": return "延后";
    case "remove": case "strip": return "移除";
    case "ignore": return "无视";
    case "cash": return "兑现";
    case "delay": return "定时";
    case "when": return c.forbid ? "不得" : c.q.win.dir === "after" ? (c.judge === "absent" ? "不存在" : "每当") : "若";
  }
}
const QUANT_WORDS = ["累计", "次数", "词数", "段数"];
/** 职业对句子的限制：返回拒绝原因（空串 = 通过） */
export function classProblem(cl: Sentence, cx: Cls | null): string {
  for (const c of cl) if (c.k === "assert") for (const branch of [assertionBranch(c,true),assertionBranch(c,false)]) if (branch.length > segCap(cx)) return "断言分支超过段数限制";
  if (!P2.CLASSES || !cx) return "";
  for (const c of cl) if (c.k === "assert") for (const branch of [assertionBranch(c,true),assertionBranch(c,false)]) { const problem = classProblem(branch,cx); if (branch.length > segCap(cx)) return "分支超过职业段数限制"; if (problem) return problem; }
  if (cx === "并") { const seen = new Set<string>(); for (const c of cl) { const w = actionWordOf(c); if (seen.has(w)) return "并流:同一动作词只能用一次"; seen.add(w); } }
  else if (cx === "引用") { if (advWordsOf(cl).filter((w) => QUANT_WORDS.includes(w)).length > 1) return "引用流:最多一个引用量词"; }
  else if (cx === "限制") { for (const c of cl) if (c.k === "act" && c.eff.verb === "dmg" && typeof c.eff.n === "number" && c.eff.n > P2.CAP_LIM) return "限制流:单次伤害不能超过上限"; }
  return "";
}
/** 一句最多几段（SEGCAP 关 = 不限） */
export const segCap = (cx: Cls | null): number => (!P2.SEGCAP ? Infinity : P2.CLASSES && cx === "并" ? P2.SEG_BING : P2.CLAUSE_MAX);

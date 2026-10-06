import { assertionBranch } from "../engine/ast";
// 逐词拼句的「词语言」：词序列 <-> lab2 语法树（AST）的双向转换 + nextLegal（此刻允许的下一个词）。
// 词（Token）就是字符串：数字 "3"、动词 "造成"、目标 "@4"（4 号随从）、对象 "类:atk" / "事:hurt" / "词:造成" / "第2句" 等。
// 词表与语法见 README.md。同一个递归下降解析器既负责 tokensToAst，也负责告诉你「接下来可以写什么」（Stop.opts）。
import type { Sentence, Clause, Eff, Tg, Amt, Obj, Win } from "../engine/ast";
import { legal, advWordsOf, refKindsOf, sentenceCost, numsOf, classProblem, segCap } from "../engine/ast";
import { P, P2, ADV } from "../engine/api";
import { canAfford, resolveTgs, statusConflict, pickCards, alive, unitsOf, windupFor, type St } from "../engine/interp";

export type Token = string;

// ---------------------------------------------------------------- 词表
export const VERBS = ["造成", "恢复", "减伤"] as const;
const VERB_OF: Record<string, Eff["verb"]> = { 造成: "dmg", 恢复: "heal", 减伤: "shield" };
const VERB_TOK: Record<Eff["verb"], string> = { dmg: "造成", heal: "恢复", shield: "减伤" };
export const STATUS_KINDS = ["灼烧", "易伤", "衰弱"] as const;
const STATUS_OF: Record<string, "burn" | "vuln" | "weak"> = { 灼烧: "burn", 易伤: "vuln", 衰弱: "weak" };
const STATUS_TOK = { burn: "灼烧", vuln: "易伤", weak: "衰弱" } as const;
export const AGGS = ["累计", "次数", "词数", "段数"] as const;
const AGG_OF: Record<string, "sum" | "count" | "len" | "segs"> = { 累计: "sum", 次数: "count", 词数: "len", 段数: "segs" };
const AGG_TOK = { sum: "累计", count: "次数", len: "词数", segs: "段数" } as const;
export const CATS = ["atk", "dmg", "heal", "hpchg", "def", "guard", "status", "struct", "any", "dealt", "taken"];
export const EVS = ["down", "hurt", "healed", "decl"];
export const OBJ_WORDS = ["造成", "恢复", "减伤", "灼烧", "易伤", "衰弱", "移除", "定时", "兑现", "不得", "转移", "延后", "无视", "断言", "奖励", "否则"];
export const NTHS = [1, 2, 3, 4, 5, 6];
// 已取消「全体」「最低血」关键词：想打多个目标 = 选择 N 个 + 点选 N 个随从。"敌方随从/我方随从" 只在非 TGT_AT_DECL（自动选血量最低的 N 个）下出现
const ALIAS = ["敌方随从", "我方随从"];
const isAliasTok = (t: Token) => ALIAS.includes(t);
const isUnitTok = (t: Token) => /^@[0-5]$/.test(t);
const isNum = (t: Token) => /^\d+$/.test(t);
/** 需要在卡组里占张数的词（进阶词） */
export const isAdvWord = (t: Token) => t in ADV;

// ---------------------------------------------------------------- 解析器
export type Spec = string | { c: "NUM"; min?: number; cap?: "foe" | "me" } | { c: "TGT"; side: "foe" | "me" | "any"; src?: boolean } | { c: "OBJ" } | { c: "WORD" } | { c: "NTH" };
export class Stop { constructor(public opts: Spec[], public req: Spec[] = []) {} }
export class PErr extends Error {}
export interface Parsed { ast: Sentence | null; opts: Spec[]; req: Spec[]; complete: boolean; err?: string }

const num = (min = 1): Spec => ({ c: "NUM", min });
class Parser {
  i = 0; acc: Spec[] = []; branchDepth = 0;
  ghosts: Record<number, string[]> = {};
  constructor(public t: Token[], private decorate = false) {}
  ghost(text: string, at = this.i) { if (this.decorate) (this.ghosts[at] ??= []).push(text); }
  private ok(s: Spec, tok: Token): boolean {
    if (typeof s === "string") return s === tok;
    switch (s.c) {
      case "NUM": return isNum(tok) && +tok >= (s.min ?? 1);
      case "TGT": return isUnitTok(tok) || isAliasTok(tok) || tok === "选择" || (!!s.src && tok === "来源");
      case "OBJ": return /^(词|类|事):/.test(tok) || /^第\d+句$/.test(tok) || tok === "先后";
      case "WORD": return tok.startsWith("词:");
      case "NTH": return /^第\d+句$/.test(tok);
    }
  }
  /** 必须有的下一个词：词用完就停下并报告可选项 */
  req(specs: Spec[]): Token {
    if (this.i >= this.t.length) { this.acc.push(...specs); throw new Stop(this.acc, specs); }
    const tok = this.t[this.i];
    if (!specs.some((s) => this.ok(s, tok))) throw new PErr(`第 ${this.i + 1} 个词「${tok}」放不到这里`);
    this.i++; return tok;
  }
  /** 可选的下一个词：词用完时把可选项记进 acc 并当作没有 */
  opt(specs: Spec[]): Token | null {
    if (this.i >= this.t.length) { this.acc.push(...specs); return null; }
    const tok = this.t[this.i];
    if (!specs.some((s) => this.ok(s, tok))) return null;
    this.i++; return tok;
  }
  n(min = 1): number { return +this.req([num(min)]); }
  tg(side: "foe" | "me", src = false): Tg {
    const tok = this.req([{ c: "TGT", side, src }]);
    if (isUnitTok(tok)) return { t: "unit", u: +tok[1] };
    switch (tok) {
      case "来源": return { t: "src" };
      case "选择": {
        const n = +this.req([{ c: "NUM", min: 2, cap: side }]);
        this.ghost("个目标：");
        const p = this.req([{ c: "TGT", side }, "敌方随从", "我方随从"]);
        if (p === "敌方随从" || p === "我方随从") return { t: "some", n, side: p === "敌方随从" ? "foe" : "me" };
        if (!isUnitTok(p)) throw new PErr("选择 N 个后面要接 N 个随从");
        const us = [+p[1]];
        while (us.length < n) { const q = this.req([{ c: "TGT", side }]); if (!isUnitTok(q)) throw new PErr("选择 N 个后面要接 N 个随从"); us.push(+q[1]); }
        return { t: "units", us };
      }
      default: throw new PErr("目标不对 " + tok);
    }
  }
  obj(): Obj {
    const tok = this.req([{ c: "OBJ" }]);
    if (tok === "先后") { const a = this.req([{ c: "WORD" }]).slice(2), b = this.req([{ c: "WORD" }]).slice(2); return { t: "order", a, b }; }
    if (tok.startsWith("词:")) return { t: "word", w: tok.slice(2) };
    if (tok.startsWith("类:")) return { t: "cat", c: tok.slice(2) };
    if (tok.startsWith("事:")) return { t: "ev", e: tok.slice(2) as "down" };
    return { t: "nth", n: +tok.slice(1, -1) };
  }
  /** 窗口里的「N 轮/句」或「全程 轮/句」 */
  winTail(dir: Win["dir"]): Win {
    const a = this.req([num(1), "全程"]);
    const unit = this.req(["轮", "句"]) === "轮" ? "round" : "sent";
    return { dir, n: a === "全程" ? 99 : +a, unit };
  }
  qTail(win: Win, who: "me" | "foe", agg: "count" | "sum" | "len" | "segs") {
    const obj = this.obj();
    const q: any = { win, who, obj, agg } as any;
    if (this.opt(["收紧"])) q.tight = this.n(2);
    return q;
  }
  amt(): Amt {
    const tok = this.req([num(1), ...AGGS]);
    if (isNum(tok)) return +tok;
    this.ghost("（", this.i - 1);
    const agg = AGG_OF[tok];
    const dir = this.req(["之前", "以后"]) === "之前" ? "before" : "after";
    const win = this.winTail(dir);
    const who = this.req(["我方", "对方"]) === "我方" ? "me" : "foe";
    const q = this.qTail(win, who, agg);
    let mult = 1;
    if (this.opt(["×"])) { mult = this.n(2); this.ghost("倍"); }
    this.ghost("）");
    return { q, mult };
  }
  /** 一个效果：动词已读，接 数字/引用量 + 目标 + [重复 n] + [无视] */
  eff(verbTok: string, src = this.branchDepth > 0): Eff {
    const verb = VERB_OF[verbTok];
    const n = this.amt();
    this.ghost(verb === "dmg" ? "点伤害，给予" : verb === "heal" ? "点生命，给予" : "点，给予");
    const tg = this.tg(verb === "dmg" ? "foe" : "me", src);
    const e: Eff = { verb, n, tg };
    if (this.opt(["重复"])) { e.rep = this.n(2); this.ghost("次（总次数）"); }
    if (this.opt(["无视"])) { e.ignore = "shield"; this.ghost("减伤"); }
    return e;
  }
  effs(src: boolean): Eff[] {
    const out = [this.eff(this.req([...VERBS]), src)];
    while (this.opt(["且"])) out.push(this.eff(this.req([...VERBS]), src));
    return out;
  }
  clause(): Clause {
    const tok = this.req([...VERBS, ...STATUS_KINDS, "断言", "每当", "若", "不得", "定时", "无视", "兑现", "移除", "转移", "延后"]);
    if (tok === "断言") {
      const head = this.req(["任意", "全部", "我方", "对方", "敌方", "以后"]);
      const scope = head === "我方" || head === "对方" || head === "敌方" ? "side" : "all";
      if (head !== "以后") this.req(["以后"]);
      const win = this.winTail("after");
      const whoTok = head === "以后" ? this.req(["任意", "全部", "我方", "对方", "敌方"]) : head;
      const who = whoTok === "任意" || whoTok === "全部" ? "all" : whoTok === "我方" ? "me" : "foe";
      const judge = this.req(["存在", "不存在"]) === "存在" ? "exist" : "absent";
      const obj = this.obj();
      this.req(["奖励"]);
      const rewards = this.branch();
      const alternatives = this.opt(["否则"]) ? this.branch() : undefined;
      return { k: "assert", win, who, scope, obj, judge, effs: [], rewards, ...(alternatives ? { alternatives } : {}) };
    }
    if (tok in VERB_OF) return { k: "act", eff: this.eff(tok) };
    if (tok in STATUS_OF) {
      const tg = this.tg("foe");
      const lvl = P2.STAUTO ? 1 : this.n(1);
      if (!P2.STAUTO) this.ghost("级");
      this.ghost("持续");
      const dur = this.n(1); this.ghost("轮（含本轮）");
      return { k: "status", kind: STATUS_OF[tok], lvl, dur, tg };
    }
    if (tok === "每当" || tok === "若") {
      this.ghost(tok === "每当" ? "生效后" : "之前");
      const win = this.winTail(tok === "每当" ? "after" : "before");
      const who = this.req(["我方", "对方"]) === "我方" ? "me" : "foe";
      const judge = this.req(["存在", "不存在"]) === "存在" ? "exist" : "absent";
      const aggTok = this.opt([...AGGS.filter((a) => a !== "次数")]);
      const q = this.qTail(win, who, aggTok ? AGG_OF[aggTok] : "count");
      this.req(["则"]);
      const effs = this.effs(true);
      const cap = this.opt(["至多"]) ? (() => { this.ghost("每轮"); const n = this.n(2); this.ghost("次"); return n; })() : 1;
      return { k: "when", q: { ...q, tight: q.tight }, judge, effs, cap } as Clause;
    }
    if (tok === "不得") {
      const n = this.n(1); this.ghost("轮内（含本轮），对方触发");
      const obj = this.obj();
      this.req(["罚"]);
      const pen = this.n(1); this.ghost("点伤害（由触发来源承受）");
      const cap = this.opt(["至多"]) ? (() => { this.ghost("每轮"); const n = this.n(2); this.ghost("次"); return n; })() : 1;
      return { k: "when", q: { win: { dir: "after", n, unit: "round" }, who: "foe", obj, agg: "count", tight: 99 }, judge: "exist", effs: [{ verb: "dmg", n: pen, tg: { t: "src" } }], cap, forbid: true };
    }
    if (tok === "定时") { this.ghost("生效后第"); const wait = this.n(1); this.ghost("次轮末："); return { k: "delay", wait, effs: this.effs(false) }; }
    if (tok === "无视") { this.ghost("敌方长期句伤害，持续"); const win = this.n(1); this.ghost("轮（含本轮）"); return { k: "ignore", cat: "stand", win }; }
    if (tok === "兑现") { this.ghost("我方已生效的所有定时句"); return { k: "cash" }; }
    if (tok === "转移") { const tg = this.tg("me"); this.ghost("的敌方受击余量，返还出手者"); return { k: "redirect", tg }; }
    if (tok === "延后") { const o = this.req([{ c: "NTH" }]); const n = this.n(1); this.ghost("秒"); return { k: "postpone", ord: +o.slice(1, -1) - 1, n }; }
    // 移除：后面是随从 = 拆敌人（strip）；是对象 = 删一句带该词的话（remove）
    const nx = this.req([{ c: "TGT", side: "foe" }, { c: "OBJ" }]);
    this.i--;
    if (isUnitTok(nx) || isAliasTok(nx) || nx === "选择") { const tg = this.tg("foe"); this.ghost("的防护与其施放的长期句"); return { k: "strip", tg }; }
    return { k: "remove", obj: this.obj() };
  }
  branch(): Sentence {
    this.branchDepth++;
    const cl = [this.clause()];
    for (;;) {
      const j = this.opt(["并", "且", "若成功", "若失败"]);
      if (!j) break;
      if (j === "并" || j === "且") cl.push(this.clause());
      else cl.push({ k: "act", eff: this.eff(this.req([...VERBS])), ifPrev: j === "若成功" ? "ok" : "fail" });
    }
    this.branchDepth--;
    return cl;
  }
  sentence(): Sentence {
    const cl: Clause[] = [this.clause()];
    for (;;) {
      const j = this.opt(["并", "若成功", "若失败"]);
      if (!j) break;
      if (j === "并") cl.push(this.clause());
      else { const v = this.req([...VERBS]); cl.push({ k: "act", eff: this.eff(v), ifPrev: j === "若成功" ? "ok" : "fail" }); }
    }
    return cl;
  }
}
/** 解析一串词。词用完且句子完整 → complete=true（opts 是还能接的词）；词用完但不完整 → opts 是必须接的词 */
export function parseTokens(tokens: Token[]): Parsed {
  const p = new Parser(tokens);
  try {
    const ast = p.sentence();
    if (p.i < tokens.length) return { ast: null, opts: [], req: [], complete: false, err: `多余的词「${tokens[p.i]}」` };
    return { ast, opts: p.acc, req: [], complete: true };
  } catch (e) {
    if (e instanceof Stop) return { ast: null, opts: e.opts, req: e.req, complete: false };
    if (e instanceof PErr) return { ast: null, opts: [], req: [], complete: false, err: e.message };
    throw e;
  }
}
/** 只装饰显示；解析器记录词的语法角色，灰字不进入词牌或资源计算。 */
export function ghostWords(tokens: Token[]): Record<number, string[]> {
  const p = new Parser(tokens, true);
  try { p.sentence(); } catch (e) { if (!(e instanceof Stop) && !(e instanceof PErr)) throw e; }
  return p.ghosts;
}
export function tokensToAst(tokens: Token[]): Sentence | null { const r = parseTokens(tokens); return r.complete ? r.ast : null; }
/** 只自动填无选择的连接词；条件对象没有写完时不会提前填。 */
export function fillAssertionReward(tokens: Token[]): Token[] {
  const p = parseTokens(tokens);
  return !p.complete && !p.err && p.req.length === 1 && p.req[0] === "奖励" ? [...tokens,"奖励"] : tokens;
}

// ---------------------------------------------------------------- AST -> 词
export class Unsupported extends Error {}
const tgTok = (t: Tg): Token[] => {
  switch (t.t) {
    case "unit": return ["@" + t.u];
    case "units": return t.us.length === 1 ? ["@" + t.us[0]] : ["选择", String(t.us.length), ...t.us.map((u) => "@" + u)];
    case "some": return ["选择", String(t.n), t.side === "foe" ? "敌方随从" : "我方随从"];
    case "src": return ["来源"];
    default: throw new Unsupported("已取消的目标写法 " + t.t);
  }
};
const objTok = (o: Obj): Token[] => o.t === "word" ? ["词:" + o.w] : o.t === "cat" ? ["类:" + o.c] : o.t === "ev" ? ["事:" + o.e] : o.t === "nth" ? [`第${o.n}句`] : ["先后", "词:" + o.a, "词:" + o.b];
const winTok = (w: Win): Token[] => [w.n >= 99 ? "全程" : String(w.n), w.unit === "round" ? "轮" : "句"];
const amtTok = (a: Amt): Token[] => {
  if (typeof a === "number") { if (!Number.isInteger(a) || a < 1) throw new Unsupported("非正整数数字"); return [String(a)]; }
  const q = a.q;
  if (!Number.isInteger(a.mult) || a.mult < 1) throw new Unsupported("引用量倍率非正整数");
  return [AGG_TOK[q.agg], q.win.dir === "before" ? "之前" : "以后", ...winTok(q.win), q.who === "me" ? "我方" : "对方", ...objTok(q.obj), ...((q.tight ?? 1) > 1 ? ["收紧", String(q.tight)] : []), ...(a.mult > 1 ? ["×", String(a.mult)] : [])];
};
const effTok = (e: Eff): Token[] => [VERB_TOK[e.verb], ...amtTok(e.n), ...tgTok(e.tg), ...((e.rep ?? 1) > 1 ? ["重复", String(e.rep)] : []), ...(e.ignore ? ["无视"] : [])];
const clauseTok = (c: Clause): Token[] => {
  switch (c.k) {
    case "assert": {
      const who = c.who === "all" ? "任意" : c.who === "me" ? "我方" : "对方";
      return ["断言", ...(c.scope === "side" ? [who, "以后", ...winTok(c.win)] : ["以后", ...winTok(c.win), who]), c.judge === "exist" ? "存在" : "不存在", ...objTok(c.obj), "奖励", ...astToTokens(assertionBranch(c,true)), ...(c.otherwise || c.alternatives ? ["否则", ...astToTokens(assertionBranch(c,false))] : [])];
    }
    case "act": return effTok(c.eff);
    case "status": return [STATUS_TOK[c.kind], ...tgTok(c.tg), ...(P2.STAUTO ? [] : [String(c.lvl)]), String(c.dur)];
    case "when": {
      if (c.forbid) {
        const e = c.effs[0];
        if (c.effs.length !== 1 || e.verb !== "dmg" || typeof e.n !== "number" || e.tg.t !== "src" || c.q.who !== "foe" || c.q.win.dir !== "after" || c.q.win.unit !== "round" || c.q.agg !== "count" || c.judge !== "exist") throw new Unsupported("不得：非标准形态");
        return ["不得", String(c.q.win.n), ...objTok(c.q.obj), "罚", String(e.n), ...(c.cap > 1 ? ["至多", String(c.cap)] : [])];
      }
      if (c.q.win.dir === "after" && c.q.win.n >= 99) throw new Unsupported("以后全程");
      const out = [c.q.win.dir === "after" ? "每当" : "若", ...winTok(c.q.win), c.q.who === "me" ? "我方" : "对方", c.judge === "exist" ? "存在" : "不存在"];
      if (c.q.agg !== "count") out.push(AGG_TOK[c.q.agg]);
      out.push(...objTok(c.q.obj));
      if ((c.q.tight ?? 1) > 1) out.push("收紧", String(c.q.tight));
      out.push("则", ...c.effs.flatMap((e, i) => (i ? ["且", ...effTok(e)] : effTok(e))));
      if (c.cap > 1) out.push("至多", String(c.cap));
      return out;
    }
    case "delay": return ["定时", String(c.wait), ...c.effs.flatMap((e, i) => (i ? ["且", ...effTok(e)] : effTok(e)))];
    case "ignore": return ["无视", String(c.win)];
    case "cash": return ["兑现"];
    case "remove": return ["移除", ...objTok(c.obj)];
    case "strip": return ["移除", ...tgTok(c.tg)];
    case "redirect": return ["转移", ...tgTok(c.tg)];
    case "postpone": return ["延后", `第${c.ord + 1}句`, String(c.n)];
  }
};
/** 语法树 → 词序列。没法表示的句子抛 Unsupported（往返测试里分类统计） */
export function astToTokens(cl: Sentence): Token[] {
  const out: Token[] = [];
  cl.forEach((c, i) => {
    if (i > 0) {
      if (c.k === "act" && c.ifPrev) { out.push(c.ifPrev === "ok" ? "若成功" : "若失败"); out.push(...effTok(c.eff)); return; }
      out.push("并");
    }
    out.push(...clauseTok(c));
  });
  return out;
}

// ---------------------------------------------------------------- 规范化（往返比较用）
export function normAst(cl: Sentence): string {
  const strip = (x: any): any => {
    if (Array.isArray(x)) return x.map(strip);
    if (x && typeof x === "object") {
      const o: any = {};
      for (const k of Object.keys(x).sort()) { const v = strip(x[k]); if (v !== undefined) o[k] = v; }
      if (o.t === "units" && o.us.length === 1) return { t: "unit", u: o.us[0] };
      if (o.verb && (o.rep ?? 1) <= 1) delete o.rep;
      if (o.q && (o.q.tight === undefined || o.q.tight === 1) && !o.forbid) delete o.q.tight;
      if (o.win && o.win.dir && o.q === undefined && o.verb === undefined && false) return o;
      if (o.k === "status" && P2.STAUTO) o.lvl = 1;
      if (o.k === "act" && !o.ifPrev) delete o.ifPrev;
      if (o.agg && o.win && o.who && o.tight === 1) delete o.tight;
      return o;
    }
    return x === null ? undefined : x;
  };
  return JSON.stringify(strip(cl));
}

// ---------------------------------------------------------------- nextLegal
export interface Ctx { s: St; side: 0 | 1; unit: number }
export interface Legal {
  /** 此刻能接的词 */
  ok: Set<Token>;
  /** 不能接的词 → 原因（全词表里除 ok 以外的都有） */
  why: Map<Token, string>;
  /** 现在就停笔能不能宣告（完整且付得起） */
  canEnd: boolean; endWhy?: string;
  /** 句子在语法上已完整 */
  complete: boolean;
  /** 语法上接下来需要什么（给人看的一句） */
  expect: string;
  /** 语法上此刻能接的词（含付不起的；手牌条只显示这些） */
  struct: Set<Token>;
  ast?: Sentence;
}
/** 全词表（palette 用）：按此刻的局面列出所有可能出现的词 */
export function vocabulary(): Token[] {
  const t: Token[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  t.push(...VERBS, ...STATUS_KINDS, "并", "断言", "奖励", "否则", "任意", "敌方", "若成功", "若失败", "重复", "无视", "兑现", "移除", "转移", "延后", "定时", "不得", "罚", "每当", "若", "存在", "不存在", "则", "且", "至多", "收紧", "×", "之前", "以后", "轮", "句", "全程", "我方", "对方", "选择", "来源", ...AGGS, "先后");
  for (let u = 0; u < 6; u++) t.push("@" + u);
  t.push(...CATS.map((c) => "类:" + c), ...EVS.map((e) => "事:" + e), ...OBJ_WORDS.map((w) => "词:" + w), ...NTHS.map((n) => `第${n}句`));
  return t;
}
const sideUnits = (ctx: Ctx, side: "foe" | "me") => unitsOf((side === "foe" ? 1 - ctx.side : ctx.side) as 0 | 1);
/** 把 Spec 展开成此刻结构上合法的具体词 */
function expand(specs: Spec[], ctx: Ctx, universe: Token[]): Set<Token> {
  const out = new Set<Token>();
  for (const sp of specs) {
    if (typeof sp === "string") { out.add(sp); continue; }
    for (const t of universe) {
      switch (sp.c) {
        case "NUM": if (isNum(t) && +t >= (sp.min ?? 1) && (sp.cap === undefined || +t <= sideUnits(ctx, sp.cap).filter((u) => alive(ctx.s, u)).length)) out.add(t); break;
        case "TGT":
          if (isUnitTok(t)) { const u = +t[1]; if ((sp.side === "any" || sideUnits(ctx, sp.side).includes(u))) out.add(t); }
          else if (!P2.TGT_AT_DECL && isAliasTok(t) && !["敌方随从", "我方随从"].includes(t)) out.add(t);
          else if (t === "选择") out.add(t);
          else if (sp.src && t === "来源") out.add(t);
          break;
        case "OBJ": if (/^(词|类|事):/.test(t) || /^第\d+句$/.test(t) || t === "先后") out.add(t); break;
        case "WORD": if (t.startsWith("词:")) out.add(t); break;
        case "NTH": if (/^第\d+句$/.test(t)) out.add(t); break;
      }
    }
  }
  // 敌方随从 / 我方随从 只在非 TGT_AT_DECL 下出现（「选择 N 个」自动取血量最低的）
  if (!P2.TGT_AT_DECL) for (const sp of specs) if (typeof sp === "string" && (sp === "敌方随从" || sp === "我方随从")) out.add(sp);
  if (P2.TGT_AT_DECL) { out.delete("敌方随从"); out.delete("我方随从"); }
  return out;
}
const U = vocabulary();
/** 候选数字：1 起到「最大可用牌面 + 加成」，补全时按从小到大试 */
function numVals(spec: { c: "NUM"; min?: number; cap?: "foe" | "me" }, ctx: Ctx): Token[] {
  const mx = Math.max(1, ...ctx.s.side[ctx.side].cards.filter((c) => c.cd === 0).map((c) => c.v)) + (P2.POS ? P2.POS_NUM : 0) + 1;
  return [...expand([spec], ctx, U)].filter((x) => +x <= Math.min(9, mx)).sort((x, y) => +x - +y);
}
/** Try alternative verbs, targets and numbers before rejecting an unfinished sentence.
 * A search limit is uncertainty, not proof that the user's continuation is illegal.
 * Completed sentences always go through the full diagnose check. */
function completeBest(prefix: Token[], ctx: Ctx): { ast: Sentence | null; reason: string | null } {
  let budget = 600, exhausted = false;
  let first: { ast: Sentence; reason: string | null } | null = null;
  let resourceReason: string | null = null;
  const rec = (tokens: Token[], depth = 0): Sentence | null => {
    if (--budget < 0 || depth > 80) { exhausted = true; return null; }
    // These already-entered words cannot disappear when a suffix is appended.
    // 收紧/至多 at value 1 are free, so leave those to the full AST check.
    const deck = ctx.s.deck[ctx.side];
    if (deck) {
      const used: Record<string, number> = {};
      for (const t of tokens) if (isAdvWord(t) && t !== '收紧' && t !== '至多') used[t] = (used[t] ?? 0) + 1;
      if (P2.POS && ctx.unit % 3 === 0 && P2.POS_WORD_FREE && used['并']) used['并']--;
      const shortage = Object.entries(used).find(([word, n]) => n > (deck[word] ?? 0));
      if (shortage) {
        const [word, n] = shortage, cds = ctx.s.advCooling?.[ctx.side]?.[word] ?? [];
        resourceReason ??= `「${word}」可用 ${deck[word] ?? 0} 张，这句至少要 ${n} 张${cds.length ? `；冷却中，最早第 ${ctx.s.rnd + Math.min(...cds)} 轮恢复` : ''}`;
        return null;
      }
    }
    const r = parseTokens(tokens);
    if (r.err) return null;
    if (r.complete) {
      const reason = diagnose(r.ast!, ctx);
      first ??= { ast: r.ast!, reason };
      return reason === null ? r.ast : null;
    }
    const choices = new Set<Token>();
    for (const spec of r.req) {
      const values = typeof spec === 'object' && spec.c === 'NUM'
        ? (spec.cap ? [...expand([spec], ctx, U)].filter(isNum).sort((a,b)=>+a-+b) : numVals(spec, ctx))
        : [...expand([spec], ctx, U)];
      for (const token of values) {
        if (isUnitTok(token) && !alive(ctx.s, +token[1])) continue;
        if (typeof spec === 'object' && spec.c === 'NTH' && !ctx.s.decl.some(d=>d.side!==ctx.side && token===`第${d.ord+1}句`)) continue;
        choices.add(token);
      }
    }
    for (const token of choices) {
      const found = rec([...tokens, token], depth + 1);
      if (found) return found;
      if (exhausted) break;
    }
    return null;
  };
  const ast = rec(prefix);
  if (ast) return { ast, reason: null };
  if (exhausted) return { ast: null, reason: null };
  return first ?? { ast: null, reason: resourceReason ?? '接上这个词之后写不下去（没有可支付的合法后续）' };
}

const CAT_ZH: Record<string, string> = { atk: "攻击词", dmg: "伤害", heal: "治疗词", hpchg: "生命变动", def: "防护词", guard: "防护", status: "状态词", struct: "结构词", any: "任意词", dealt: "造成的伤害", taken: "受到的伤害" };
const EV_ZH: Record<string, string> = { down: "倒下", hurt: "受到伤害", healed: "被恢复", decl: "宣告" };
/** 词的显示文字（句子条/手牌条） */
export function tokenLabel(t: Token, names?: (u: number) => string): string {
  if (isUnitTok(t)) return names ? names(+t[1]) : `${+t[1] < 3 ? "我" : "敌"}${(+t[1] % 3) + 1}`;
  if (t.startsWith("类:")) return CAT_ZH[t.slice(2)] ?? t.slice(2);
  if (t.startsWith("事:")) return EV_ZH[t.slice(2)] ?? t.slice(2);
  if (t.startsWith("词:")) return `「${t.slice(2)}」`;
  return t;
}
/** 语法上接下来需要什么（一句人话） */
export function expectText(specs: Spec[], complete: boolean): string {
  const names = new Set<string>();
  for (const sp of specs) {
    if (typeof sp === "string") names.add(sp);
    else names.add({ NUM: "数字", TGT: "目标", OBJ: "对象", WORD: "词", NTH: "第几句" }[sp.c]);
  }
  const l = [...names];
  return complete ? (l.length ? `可以结束，或接 ${l.join(" / ")}` : "可以结束") : `接下来需要：${l.join(" / ")}`;
}
/** 为什么这句话现在说不出口（与 canAfford 一一对应；null = 说得出口） */
export function diagnose(ast: Sentence, ctx: Ctx, forTok?: Token): string | null {
  const { s, side, unit } = ctx;
  const cl = P2.TGT_AT_DECL ? resolveTgs(s, side, ast) : ast;
  if (!legal(cl)) {
    for (const c of cl) {
      if (c.k === "when" && c.q.win.dir === "after" && c.q.win.n >= 99) return "「全程」只能看已经发生的事，不能写「以后全程」";
      if (c.k === "ignore" && c.win >= 99) return "「无视」不能写全程";
      if (c.k === "act" && (c.eff.rep ?? 1) > 1 && !P2.REP) return "当前规则没有「重复」";
      if (c.k === "act" && (c.eff.rep ?? 1) > 1 && c.eff.verb === "shield") return "「减伤」不能重复";
      if (c.k === "redirect" && !P2.REDIR) return "当前规则没有「转移」";
      if (c.k === "postpone" && !P2.POSTPONE) return "当前规则没有「延后」";
      if (c.k === "strip" && !P2.RMREAL) return "当前规则没有这种「移除」";
      if (c.k === "remove" && P2.RMREAL) return "「移除」后面要写要拆的敌方随从";
      if (c.k === "assert") return "断言需要有限的以后窗口和合法的两条效果分支；句子窗口只判断宣告内容，受伤/倒下等事件请用轮窗口";
    }
    return "这个写法在当前规则下不合法";
  }
  for (const c of cl) {
    if (c.k === "postpone" && !s.decl.some((d) => d.ord === c.ord && d.side !== side)) return `「延后」要选对方本轮已经宣告的一句（第${c.ord + 1}句 现在没有）`;
    if (c.k === "assert") for (const branch of [assertionBranch(c,true), assertionBranch(c,false)]) { if (!branch.length) continue; const err = diagnose(branch, ctx); if (err) return err; }
    const tgs: Tg[] = c.k === "act" ? [c.eff.tg] : c.k === "assert" ? [...c.effs, ...(c.otherwise ?? [])].map((e) => e.tg) : c.k === "when" || c.k === "delay" ? c.effs.map((e) => e.tg) : c.k === "status" || c.k === "redirect" || c.k === "strip" ? [c.tg] : [];
    for (const t of tgs) if (t.t === "unit" && !alive(s, t.u)) return "这个随从已经倒下，不能当目标";
  }
  const pos = P2.POS && unit >= 0 ? unit % 3 : -1;
  const cx = P2.CLASSES ? s.cls[side] : null;   // 职业：与 canAfford 一致
  if (cl.length > segCap(cx)) return `这一句最多 ${segCap(cx)} 段`;
  const cp = classProblem(cl, cx);
  if (cp) return cp.startsWith("限制流") ? `限制流：攻击句单次伤害最多 ${P2.CAP_LIM}（写成 ${P2.CAP_LIM} 以内，或用引用量——算出来的会被截到 ${P2.CAP_LIM}）` : cp.replace(":", "：");
  if (cx === "状态") {
    if (statusConflict(s,side,cl)) return "状态流：同一轮对同一个目标只能挂一种状态";
  }
  const cost = sentenceCost(cl, s.rnd, pos, cx);
  if (cost > s.side[side].ap) return `行动点不够（这句要 ${cost}，只有 ${s.side[side].ap}）`;
  const dk = s.deck[side];
  const need: Record<string, number> = {};
  const adv = advWordsOf(cl); if (pos === 0 && P2.POS_WORD_FREE) { const i = adv.indexOf("并"); if (i >= 0) adv.splice(i, 1); }
  for (const w of adv) need[w] = (need[w] ?? 0) + 1;
  if (dk) for (const [w, n] of Object.entries(need)) if ((dk[w] ?? 0) < n) {
    const cds = s.advCooling?.[side]?.[w] ?? [];
    if (cds.length) return `「${w}」可用 ${dk[w] ?? 0} 张，这句要 ${n} 张；${cds.length} 张冷却中，最早第 ${s.rnd + Math.min(...cds)} 轮恢复`;
    return `卡组里「${w}」可用 ${dk[w] ?? 0} 张，这句要 ${n} 张`;
  }
  const rk: Record<string, number> = {};
  for (const k of refKindsOf(cl)) rk[k] = (rk[k] ?? 0) + 1;
  if (!(pos === 2 && P2.POS3 === "ref")) for (const [k, n] of Object.entries(rk)) if (s.refc[side][k].filter((cd) => cd === 0).length < n) return k === "all" ? "「全程」这个词本轮用完了（冷却中）" : "引用词（次数/累计…/事件/类别）本轮用完了（冷却中）";
  const bonus = pos === 1 ? P2.POS_NUM : 0;
  const raw = cl.flatMap((c) => numsOf(c, cx)), mx = Math.max(...raw, 0);
  let used = false;
  const nums = raw.map((n) => { if (P2.POS_NUM_ONE && bonus && n === mx && !used) { used = true; return n - bonus; } return P2.POS_NUM_ONE ? n : n - bonus; }).filter((n) => n >= 2);
  if (pickCards(s, side, nums) === null) {
    const have = s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v).sort((a, b) => b - a);
    const big = Math.max(...nums);
    return have.length === 0 ? "数字牌都在冷却中" : have[0] < big ? `没有牌面 ≥${big} 的数字牌（可用：${have.join("、")}）` : `数字牌不够：这句要 ${nums.sort((a, b) => b - a).join("、")}，可用 ${have.join("、")}`;
  }
  if (windupFor(cl, unit, s) > P.TL) return `起手要 ${windupFor(cl, unit, s)} 秒，时间轴只有 ${P.TL} 秒，放不下`;
  return null;
}
/** 此刻允许的下一个词（及不允许的原因） */
export function nextLegal(prefix: Token[], ctx: Ctx): Legal {
  const r = parseTokens(prefix);
  const ok = new Set<Token>(), why = new Map<Token, string>();
  if (r.err) { for (const t of U) why.set(t, r.err); return { ok, why, canEnd: false, endWhy: r.err, complete: false, expect: r.err, struct: new Set() }; }
  const specs = r.opts;
  const struct = expand(specs, ctx, U);
  const expect = expectText(specs, r.complete);
  for (const t of U) {
    if (!struct.has(t)) {
      // 目标：对方/我方不对、已倒下
      if (isUnitTok(t) && specs.some((sp) => typeof sp !== "string" && sp.c === "TGT")) {
        
        const sp = specs.find((x) => typeof x !== "string" && x.c === "TGT") as { c: "TGT"; side: "foe" | "me" };
        why.set(t, `这里要选${sp.side === "foe" ? "敌方" : "我方"}随从`); continue;
      }
      why.set(t, `这里不能接「${tokenLabel(t)}」。${expect}`); continue;
    }
    if (isUnitTok(t) && !alive(ctx.s, +t[1])) { why.set(t, "这个随从已经倒下"); continue; }
    if (t === "选择" || (isUnitTok(t) && prefix.length && prefix.includes("选择") && false)) { /* 继续往下做可行性检查 */ }
    const cb = completeBest([...prefix, t], ctx);
    if (cb.reason) { why.set(t, cb.reason); continue; }
    ok.add(t);
  }
  let canEnd = false, endWhy: string | undefined;
  if (r.complete && r.ast) { endWhy = diagnose(r.ast, ctx) ?? undefined; canEnd = !endWhy; }
  else endWhy = prefix.length ? `句子还没写完。${expect}` : "先点一个词开始";
  return { ok, why, canEnd, endWhy, complete: r.complete, expect, struct, ast: r.ast ?? undefined };
}
/** 句子能不能付得起（= 引擎 canAfford）。canEnd 与它一致，测试里对拍 */
export const affordable = (ast: Sentence, ctx: Ctx) => !!canAfford(ctx.s, ctx.side, ast, ctx.unit);

// ---------------------------------------------------------------- 拖拽拼句用：任意位置插入/删除后的整句可行性
/** 词序列在语法上是不是合法前缀（不看行动点/卡组） */
export const structOk = (tokens: Token[]): boolean => !parseTokens(tokens).err;
/** 词序列作为「前缀」是否可行：语法合法 + 补全后说得出口。null = 可行，否则是原因 */
export function prefixWhy(tokens: Token[], ctx: Ctx): string | null {
  const r = parseTokens(tokens);
  if (r.err) return r.err;
  return completeBest(tokens, ctx).reason;
}

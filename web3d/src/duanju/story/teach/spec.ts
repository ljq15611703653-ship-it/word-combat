// 课程表里的「句子规格」：构造 AST（电脑脚本用）、匹配 AST（引导步骤用）、按允许词表过滤。
import { act, dmg, heal, shield, status, unit, redirect, postpone, strip, type Sentence, type Clause, type Tg } from "../../engine/ast";

export interface ClauseSpec {
  verb?: "dmg" | "heal" | "shield"; n?: number; rep?: number;
  /** 目标随从（绝对编号 0~5） */
  tg?: number;
  kind?: "status" | "redirect" | "postpone" | "strip" | "when" | "delay";
  status?: "burn" | "vuln" | "weak"; dur?: number;
  /** postpone：对方第几句（0 起）与推后秒数 */
  ord?: number; by?: number;
  /** 匹配用：when 类的子类型 */
  forbid?: boolean; standing?: boolean; quote?: boolean; chain?: boolean;
}
export interface Allow {
  verbs?: ("dmg" | "heal" | "shield")[];
  kinds?: ("status" | "redirect" | "postpone" | "strip" | "when" | "delay")[];
  statuses?: ("burn" | "vuln" | "weak")[];
  maxN?: number; maxClauses?: number; rep?: boolean; quote?: boolean;
  /** 允许的目标随从；空 = 不限 */
  tgs?: number[];
  /** true = 不限制（自由对打） */
  free?: boolean;
}

export function buildSentence(specs: ClauseSpec[]): Sentence {
  return specs.map((c): Clause => {
    if (c.kind === "status") return status(c.status!, 1, c.dur ?? 2, unit(c.tg!));
    if (c.kind === "redirect") return redirect(unit(c.tg!));
    if (c.kind === "postpone") return postpone(c.ord ?? 0, c.by ?? 8);
    if (c.kind === "strip") return strip(unit(c.tg!));
    const f = c.verb === "heal" ? heal : c.verb === "shield" ? shield : dmg;
    const eff = c.verb === "dmg" || !c.verb ? dmg(c.n ?? 1, unit(c.tg!), undefined, c.rep) : c.verb === "heal" ? heal(c.n ?? 1, unit(c.tg!), c.rep) : shield(c.n ?? 1, unit(c.tg!));
    void f;
    return act(eff, c.chain ? "ok" : undefined);
  });
}
const tgList = (t: Tg): number[] => (t.t === "unit" ? [t.u] : t.t === "units" ? t.us : []);
const numOf = (a: unknown) => (typeof a === "number" ? a : -1);

function matchClause(c: Clause, w: ClauseSpec): boolean {
  if (w.kind === "status") return c.k === "status" && (!w.status || c.kind === w.status) && (w.tg === undefined || tgList(c.tg).join() === String(w.tg));
  if (w.kind === "redirect") return c.k === "redirect" && (w.tg === undefined || tgList(c.tg).join() === String(w.tg));
  if (w.kind === "postpone") return c.k === "postpone";
  if (w.kind === "strip") return c.k === "strip" && (w.tg === undefined || tgList(c.tg).join() === String(w.tg));
  if (w.kind === "when" || w.kind === "delay") {
    if (w.kind === "delay") return c.k === "delay";
    if (c.k !== "when") return false;
    if (w.forbid !== undefined && !!c.forbid !== w.forbid) return false;
    if (w.standing && c.q.win.dir !== "after") return false;
    return true;
  }
  if (c.k !== "act") return false;
  if (w.verb && c.eff.verb !== w.verb) return false;
  if (w.n !== undefined && numOf(c.eff.n) !== w.n) return false;
  if (w.quote && typeof c.eff.n === "number") return false;
  if (w.rep !== undefined && (c.eff.rep ?? 1) !== w.rep) return false;
  if (w.tg !== undefined && tgList(c.eff.tg).join() !== String(w.tg)) return false;
  if (w.chain !== undefined && !!c.ifPrev !== w.chain) return false;
  return true;
}
/** 句子是否符合期望规格（逐段对应；cl 段数必须 ≥ 规格段数，minClauses 用多条空规格表示） */
export function matchSentence(cl: Sentence, want: ClauseSpec[]): boolean {
  if (cl.length !== want.length) return false;
  return want.every((w, i) => matchClause(cl[i], w));
}

/** 本关允许的句子：只用课程表开放的词 */
export function allowedFn(a: Allow): (cl: Sentence) => boolean {
  if (a.free) return () => true;
  return (cl) => {
    if (cl.length > (a.maxClauses ?? 1)) return false;
    return cl.every((c) => {
      if (c.k === "act") {
        if (!(a.verbs ?? ["dmg"]).includes(c.eff.verb)) return false;
        if (typeof c.eff.n !== "number") { if (!a.quote) return false; }
        else if (c.eff.n > (a.maxN ?? 1)) return false;
        if ((c.eff.rep ?? 1) > 1 && !a.rep) return false;
        if (c.eff.ignore) return false;
        const t = tgList(c.eff.tg);
        if (!t.length) return false;
        if (t.length > 1) return false;
        return !a.tgs || t.every((u) => a.tgs!.includes(u));
      }
      if (c.k === "status") return !!a.kinds?.includes("status") && (!a.statuses || a.statuses.includes(c.kind)) && tgList(c.tg).length === 1 && (!a.tgs || a.tgs.includes(tgList(c.tg)[0])) && c.dur <= (a.maxN ?? 3);
      if (c.k === "redirect") return !!a.kinds?.includes("redirect") && tgList(c.tg).length === 1;
      if (c.k === "postpone") return !!a.kinds?.includes("postpone");
      if (c.k === "strip") return !!a.kinds?.includes("strip") && tgList(c.tg).length === 1;
      if (c.k === "when") return !!a.kinds?.includes("when");
      if (c.k === "delay") return !!a.kinds?.includes("delay");
      return false;
    });
  };
}

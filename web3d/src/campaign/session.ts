// 关卡会话（不含界面）：把「玩家每一次点击」翻译成对局操作，并按 Guide 校验。
// 界面和命令行测试共用这一份：测试靠 expect() 知道下一步该点什么，再用同样的 click 函数执行。
import type { Match } from "../engine/match";
import { Composer } from "../engine/composer";
import { assignLate, choose } from "../engine/ai";
import { makeMatch, foePlan, foeStep } from "./runner";
import type { FoeAct, Guide, Level, RoundScript } from "./types";
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Exp =
  | { k: "unit"; uid: number; why?: string }
  | { k: "word"; w: string; note?: string }
  | { k: "num"; n: number; note?: string }
  | { k: "done"; why?: string }
  | { k: "target"; uid: number; note?: string }
  | { k: "act"; ord: number; note?: string }
  | { k: "time"; sec: number; why?: string }
  | { k: "late"; uid: number }
  | { k: "pass"; uid: number }
  | { k: "resolve" } | { k: "next" } | { k: "end" } | { k: "free" };

export type Stage = "pick" | "compose" | "target" | "timing" | "assign" | "resolve" | "round_end" | "over";

export class Session {
  M: Match;
  plan: FoeAct[] | null = null;
  queue: Guide[] = [];
  guided = false;
  cur: Guide | null = null;
  cmp: Composer | null = null;
  selUid = -1;
  pending: any[] = [];
  pendI = 0;
  sub: "pick" | "compose" | "target" | "timing" = "pick";
  lateQ: number[][] = [];
  latePick: number[] = [];
  foeErrors: string[] = [];
  /** 每轮结算产生的事件（界面逐条回放，测试用来确认教的规则真的发生了） */
  history: any[] = [];
  /** 对手本轮已宣告完，等玩家的回合时界面可以据此播放 */
  constructor(public lv: Level, seed?: number) {
    this.M = makeMatch(lv, seed ?? lv.seed ?? 1000 + lv.id);
    this.startRound();
  }

  get rs(): RoundScript | undefined { return this.lv.rounds[this.M.rnd]; }
  get free(): boolean { return !this.guided; }

  startRound() {
    const rs = this.rs;
    this.guided = !!rs?.guides;
    this.queue = (rs?.guides ?? []).map((g) => ({ ...g }));
    this.cur = null; this.cmp = null; this.pending = []; this.pendI = 0; this.sub = "pick"; this.lateQ = []; this.latePick = [];
    this.plan = foePlan(this.M, this.lv);
    this.pump();
  }

  /** 让对手把轮到它的招都宣告完；停在轮到玩家 / 该结算 / 该定目标处 */
  pump() {
    const M = this.M;
    for (let guard = 0; guard < 50; guard++) {
      if (M.phase === "declare") {
        const s = M.declareSide();
        if (s === 1) { const e = foeStep(M, this.lv, this.plan); if (e) this.foeErrors.push(e); continue; }
        return;
      }
      if (M.phase === "assign") {
        if (!M.pendingLate(0).length) { M.finishAssign(); continue; }
        return;
      }
      return;
    }
  }

  get stage(): Stage {
    const M = this.M;
    if (M.phase === "over") return "over";
    if (M.phase === "resolved") return "round_end";
    if (M.phase === "assign") return "assign";
    if (M.phase === "declare") return M.declareSide() === -1 ? "resolve" : this.sub;
    return "round_end";
  }
  get won() { return this.M.phase === "over" && this.M.winner === 0; }
  get lost() { return this.M.phase === "over" && this.M.winner !== 0; }

  // ------------------------------------------------------------ 下一步该点什么
  expect(): Exp {
    const M = this.M, st = this.stage, g = this.cur;
    switch (st) {
      case "over": return { k: "end" };
      case "round_end": return { k: "next" };
      case "resolve": return { k: "resolve" };
      case "pick": {
        if (!this.guided) return { k: "free" };
        const q = this.queue[0];
        if (q) return { k: "unit", uid: q.uid, why: q.why };
        return { k: "pass", uid: M.remaining[0][0] };
      }
      case "compose": {
        if (!g) return { k: "free" };
        const i = this.cmp!.tokens.length;
        if (i < g.tokens.length) {
          const t = g.tokens[i];
          return typeof t === "number" ? { k: "num", n: t, note: g.notes?.[i] } : { k: "word", w: t, note: g.notes?.[i] };
        }
        return { k: "done", why: "整句拼完了。点「拼好了」。" };
      }
      case "target": {
        if (!g) return { k: "free" };
        const c = this.pending[this.pendI];
        if (c.k === "delay") return { k: "act", ord: g.act ?? -1, note: "点要延后的那一句（对手已经宣告的）。" };
        const want = (g.targets?.[this.pendI] ?? []).filter((x) => !c.tg.includes(x));
        return { k: "target", uid: want[0], note: g.targetNote };
      }
      case "timing": return g ? { k: "time", sec: g.start, why: g.why } : { k: "free" };
      case "assign": {
        if (!this.lateQ.length) return { k: "free" };
        return { k: "late", uid: this.lateQ[0][this.latePick.length] };
      }
    }
  }

  private bad(e: Exp, got: string): string {
    return `这一步要照引导来：${describe(this, e)}（你点的是：${got}）`;
  }

  // ------------------------------------------------------------ 点击
  clickUnit(uid: number): string {
    if (this.stage !== "pick") return "现在不是选随从的时候";
    if (!this.M.remaining[0].includes(uid)) return "这个随从这一轮已经定过了";
    if (this.guided) {
      const e = this.expect();
      if (e.k !== "unit") return this.bad(e, "选随从");
      if (e.uid !== uid) return this.bad(e, this.M.R.U[uid].name);
      this.cur = this.queue.shift()!;
    } else this.cur = null;
    this.selUid = uid;
    this.cmp = new Composer(this.M, uid, 0, this.lv.player.allow);
    this.sub = "compose";
    return "";
  }
  clickPass(uid: number): string {
    if (this.stage !== "pick") return "现在不能不出手";
    if (this.guided) {
      const e = this.expect();
      if (e.k !== "pass") return this.bad(e, "不出手");
    }
    const r = this.M.submit(0, uid, null);
    if (r) return r;
    this.pump();
    return "";
  }
  clickWord(w: string): string {
    if (this.stage !== "compose") return "现在不是拼句的时候";
    const e = this.expect();
    if (this.cur && !(e.k === "word" && e.w === w)) return this.bad(e, w);
    return this.cmp!.addWord(w) ? "" : `【${w}】现在放不下`;
  }
  clickNum(n: number): string {
    if (this.stage !== "compose") return "现在不是拼句的时候";
    const e = this.expect();
    if (this.cur && !(e.k === "num" && e.n === n)) return this.bad(e, String(n));
    return this.cmp!.addNumber(n) ? "" : `数字 ${n} 现在放不下（没有这张牌，或这里不能放数字）`;
  }
  undo(): string {
    if (this.stage !== "compose") return "";
    this.cmp!.undo();
    return "";
  }
  /** 重新拼：回到选随从之前（引导的那一句放回队首） */
  restart(): string {
    if (!["compose", "target", "timing"].includes(this.stage)) return "";
    if (this.cur) this.queue.unshift(this.cur);
    this.cur = null; this.cmp = null; this.pending = []; this.pendI = 0; this.sub = "pick";
    return "";
  }
  clickDone(): string {
    if (this.stage !== "compose") return "";
    const e = this.expect();
    if (this.cur && e.k !== "done") return this.bad(e, "拼好了");
    const ci = this.cmp!.costInfo();
    if (ci.bad) return ci.text;
    const cl = this.cmp!.finish();
    if (!cl) return "句子还没拼完整";
    this.pending = cl;
    for (const c of cl) {
      if (c.tmode === "self") c.tg = [this.selUid];
      else if (c.k !== "delay" && !c.pre) c.tg = [];
    }
    this.pendI = 0;
    this.cmp = null;
    this.advance();
    return "";
  }
  private advance() {
    while (this.pendI < this.pending.length) {
      const c = this.pending[this.pendI];
      if (c.k === "delay") { if ((c.act ?? -1) >= 0) { this.pendI++; continue; } break; }
      if (c.tmode === "late" || (c.tg ?? []).length >= (c.count ?? 1)) { this.pendI++; continue; }
      break;
    }
    this.sub = this.pendI >= this.pending.length ? "timing" : "target";
  }
  targetOk(uid: number): boolean {
    if (this.stage !== "target") return false;
    const c = this.pending[this.pendI];
    if (!c || c.k === "delay") return false;
    const u = this.M.R.U[uid];
    if (u.down !== -1) return false;
    if ((u.side === 1) !== ((c.side ?? "enemy") === "enemy")) return false;
    return !c.tg.includes(uid);
  }
  clickTarget(uid: number): string {
    if (this.stage !== "target") return "现在不是选目标的时候";
    if (this.cur) {
      const e = this.expect();
      if (e.k !== "target") return this.bad(e, this.M.R.U[uid].name);
      if (e.uid !== uid) return this.bad(e, this.M.R.U[uid].name);
    }
    if (!this.targetOk(uid)) return "这个随从不能当目标";
    this.pending[this.pendI].tg.push(uid);
    this.advance();
    return "";
  }
  clickAct(ord: number): string {
    if (this.stage !== "target") return "现在不是选目标的时候";
    const c = this.pending[this.pendI];
    if (c.k !== "delay") return "这一段不是延后";
    if (this.cur) {
      const e = this.expect();
      if (e.k !== "act" || e.ord !== ord) return this.bad(e, `第 ${ord + 1} 句`);
    }
    if (!this.M.declared.some((a: any) => a.ord === ord && a.side === 1)) return "要选对方已经宣告的一句";
    c.act = ord;
    this.advance();
    return "";
  }
  clickTime(sec: number): string {
    if (this.stage !== "timing") return "现在不是定起手秒数的时候";
    if (this.cur) {
      const e = this.expect();
      if (e.k !== "time" || e.sec !== sec) return this.bad(e, `第 ${sec} 秒`);
    }
    const r = this.M.buildAction(0, this.selUid, this.pending, sec);
    if (r.err) return r.err;
    const e2 = this.M.submit(0, this.selUid, r.act!);
    if (e2) return e2;
    if (this.cur?.late) for (const l of this.cur.late) this.lateQ.push([...l]);
    this.cur = null; this.pending = []; this.sub = "pick";
    this.pump();
    return "";
  }
  // 择流宣告完以后定目标
  latePool(c: any): number[] {
    return this.M.R.U.filter((u: any) => u.down === -1 && ((u.side === 1) === (c.side === "enemy"))).map((u: any) => u.uid);
  }
  lateOk(uid: number): boolean {
    const pl = this.M.pendingLate(0);
    return this.stage === "assign" && !!pl.length && this.latePool(pl[0].cl).includes(uid) && !this.latePick.includes(uid);
  }
  clickLate(uid: number): string {
    if (this.stage !== "assign") return "现在不是定目标的时候";
    if (this.lateQ.length) {
      const e = this.expect();
      if (e.k !== "late" || e.uid !== uid) return this.bad(e, this.M.R.U[uid].name);
    }
    if (!this.lateOk(uid)) return "这个随从不能当目标";
    this.latePick.push(uid);
    const c = this.M.pendingLate(0)[0].cl;
    if (this.latePick.length >= Math.min(c.count, this.latePool(c).length)) this.commitLate();
    return "";
  }
  private commitLate() {
    const pl = this.M.pendingLate(0);
    if (!pl.length) return;
    this.M.setLate(pl[0].ord, pl[0].ci, this.latePick);
    this.latePick = [];
    if (this.lateQ.length) this.lateQ.shift();
    if (!this.M.pendingLate(0).length) { this.M.finishAssign(); this.pump(); }
  }
  /** 自由轮：剩下的待定段都用建议 */
  lateAuto() { assignLate(this.M, 0); this.latePick = []; this.lateQ = []; this.M.finishAssign(); this.pump(); }

  doResolve(): any[] {
    if (this.stage !== "resolve") return [];
    const ev = this.M.resolveRound();
    this.history.push(...ev);
    return ev;
  }
  nextRound(): string {
    if (this.stage !== "round_end") return "";
    this.M.nextRound();
    this.startRound();
    return "";
  }

  // ------------------------------------------------------------ 照期望自动点一步（测试 / 「替我点」用）
  autoStep(): string {
    const e = this.expect();
    switch (e.k) {
      case "unit": return this.clickUnit(e.uid);
      case "pass": return this.clickPass(e.uid);
      case "word": return this.clickWord(e.w);
      case "num": return this.clickNum(e.n);
      case "done": return this.clickDone();
      case "target": return this.clickTarget(e.uid);
      case "act": return this.clickAct(e.ord);
      case "time": return this.clickTime(e.sec);
      case "late": return this.clickLate(e.uid);
      case "resolve": this.doResolve(); return "";
      case "next": return this.nextRound();
      case "free": return this.freeStep();
      case "end": return "";
    }
  }
  /** 自由轮（没有引导）：用引擎的 AI 替玩家出一招 */
  private freeStep(): string {
    const M = this.M, st = this.stage;
    if (st === "assign") { this.lateAuto(); return ""; }
    if (st !== "pick") return "自由轮不应该停在这里：" + st;
    const pick = choose(M, 0);
    const e = M.submit(0, pick.uid, pick.act);
    if (e) return e;
    this.pump();
    return "";
  }
}

export function describe(S: Session, e: Exp): string {
  const nm = (u: number) => S.M.R.U[u]?.name ?? "?";
  switch (e.k) {
    case "unit": return `点你的【${nm(e.uid)}】`;
    case "pass": return `点「${nm(e.uid)} 不出手」`;
    case "word": return `点词牌【${e.w}】`;
    case "num": return `点数字牌 ${e.n}`;
    case "done": return "点「拼好了」";
    case "target": return `点目标【${nm(e.uid)}】`;
    case "act": return "点要延后的那一句";
    case "time": return `点第 ${e.sec} 秒`;
    case "late": return `点目标【${nm(e.uid)}】`;
    case "resolve": return "开始结算";
    case "next": return "进入下一轮";
    case "end": return "本关结束";
    case "free": return "自己选";
  }
}


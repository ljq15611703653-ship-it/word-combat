// 数字牌模式 · 拼句台的语法与选项（移植自 nc_composer.gd 的非界面部分）
import * as NR from "./rules";
import * as NE from "./engine";
import { clauseText, actionText } from "./text";
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Tok { t: "w" | "n"; v: string | number; free?: boolean }
export interface WordOpt { w: string; ok: boolean; why: string }
export interface Parsed {
  err?: string; clauses: any[]; done: any[]; cur: any | null; expect: string; complete: boolean; glue: string[];
}

export const BASIC_DESC: Record<string, string> = {
  选择: "选几个目标：后面放一张数字牌（几个），再说敌方还是友方",
  自身: "目标是出手的这个随从自己",
  敌方: "对方的随从", 友方: "自己这边的随从",
  造成: "打伤害：后面放数字牌（几点）",
  恢复: "回血：后面放数字牌（几点）",
  减伤: "本轮每次少受几点伤害：后面放数字牌",
  持续: "撑几轮：后面放数字牌",
  重复: "再来几次：后面放数字牌（一共几次）",
  并: "接着说下一段",
};

export const HELP: Record<string, string> = {
  count: "选几个目标？放一张数字牌：1 免费；2、3 要用手里的牌。",
  side: "选敌方还是友方？",
  action: "要做什么？（对敌方：造成伤害，或者直接放一个状态词；对友方：恢复、减伤、转移）",
  atk_n: "打几点？放一张数字牌。",
  heal_n: "回几点血？放一张数字牌。",
  mit_n: "本轮每次少受几点？放一张数字牌。",
  rep_n: "一共打几次？放一张数字牌。",
  dur_n: "持续几轮？放一张数字牌。",
  delay_n: `往后推几秒？放一张数字牌。推出第 ${NR.TIMELINE} 秒就落空。`,
};

const clean = (c: any) => { const d = { ...c }; delete d.rep_set; delete d.dur_set; if (!d.tg) d.tg = []; return d; };

export class Composer {
  tokens: Tok[] = [];
  cp: NR.Caps;
  sugg: { act: any; tokens: Tok[] } | null = null;
  /** 拖拽 / 框选定下的目标：第几个分句 → 随从编号（只对「选择」那种当场定目标的分句有效） */
  binds: Record<number, number[]> = {};
  /** 剧情关卡：只有这些词能用（没教到的词不出现） */
  allow: Set<string> | null = null;
  constructor(public M: any, public uid: number, public side = 0, allow?: string[]) { this.cp = M.caps(side); if (allow) this.allow = new Set(allow); }

  parse(toks: Tok[] = this.tokens): Parsed {
    const clauses: any[] = [];
    let cur: any = null, expect = "start";
    const glue: string[] = [];
    const late = !!this.cp.late;
    for (const tok of toks) {
      let g = "";
      const w = tok.t === "w" ? String(tok.v) : "";
      const n = tok.t === "n" ? Number(tok.v) : 0;
      switch (expect) {
        case "start":
          if (w === "选择") { cur = { tmode: late ? "late" : "choose" }; expect = "count"; }
          else if (w === "自身") { cur = { tmode: "self", side: "ally", count: 1 }; expect = "action"; g = "，"; }
          else if (w === "延后") { cur = { k: "delay", act: -1, tg: [] }; expect = "delay_n"; }
          else if (w === "移除") { cur = { k: "remove", tmode: "pick", side: "enemy", count: 1, tg: [] }; expect = "end"; g = "一个敌人身上的保护"; }
          else return { err: "这里要以【选择】【自身】【延后】【移除】开头", clauses: [], done: [], cur: null, expect, complete: false, glue };
          break;
        case "count": cur.count = n; expect = "side"; g = "个"; break;
        case "side": cur.side = w === "敌方" ? "enemy" : "ally"; expect = "action"; g = "随从，"; break;
        case "action":
          switch (w) {
            case "造成": cur.k = "atk"; expect = "atk_n"; break;
            case "恢复": cur.k = "heal"; expect = "heal_n"; break;
            case "减伤": cur.k = "mit"; expect = "mit_n"; break;
            case "易伤": case "灼烧": case "衰弱": cur.k = "st"; cur.st = w; cur.n = 1; expect = "end"; g = "（状态）"; break;
            case "转移": cur.k = "redirect"; expect = "end"; break;
          }
          break;
        case "atk_n": cur.n = n; cur.rep = 1; expect = "end"; g = "点伤害"; break;
        case "heal_n": cur.n = n; cur.rep = 1; expect = "end"; g = "点生命"; break;
        case "mit_n": cur.n = n; expect = "end"; g = "点"; break;
        case "rep_n": cur.rep = n; cur.rep_set = true; expect = "end"; g = "次"; break;
        case "dur_n":
          if (cur.k === "st") cur.n = n; else cur.cont = n;
          cur.dur_set = true; expect = "end"; g = "轮"; break;
        case "delay_n": cur.n = n; expect = "end"; g = "秒"; break;
        case "end":
          if (w === "重复") expect = "rep_n";
          else if (w === "持续") expect = "dur_n";
          else if (w === "并") { clauses.push(clean(cur)); cur = null; expect = "start"; }
          break;
      }
      glue.push(g);
    }
    const complete = cur !== null && expect === "end";
    const all = [...clauses];
    if (complete) all.push(clean(cur));
    return { clauses: all, done: clauses, cur, expect, complete, glue };
  }

  usedValues(): Record<number, number> {
    const out: Record<number, number> = {};
    for (const t of this.tokens) if (t.t === "n" && Number(t.v) > 1 && !t.free) out[+t.v] = (out[+t.v] ?? 0) + 1;
    return out;
  }
  usedWords(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const t of this.tokens) if (t.t === "w" && NR.WORDS[String(t.v)]) out[String(t.v)] = (out[String(t.v)] ?? 0) + 1;
    return out;
  }
  wordLeft(w: string) { return (this.M.res[this.side].words[w] ?? 0) - (this.usedWords()[w] ?? 0); }
  private alive(side: "enemy" | "ally") {
    return this.M.R.U.filter((u: any) => u.down === -1 && ((u.side !== this.side) === (side === "enemy"))).length;
  }
  private enemyDeclared() { return this.M.declared.some((a: any) => a.side !== this.side); }
  private contRoom() { return this.cp.slots - this.M.contsOf(this.side).length - this.M.res[this.side].conts; }

  options(): { words: WordOpt[]; num: boolean; parsed: Parsed } {
    const pr = this.parse();
    const e = pr.expect, cur = pr.cur;
    let ws: WordOpt[] = [];
    let needNum = false;
    const ncl = pr.done.length;
    const cp = this.cp;
    switch (e) {
      case "start": {
        const dOk = this.wordLeft("延后") > 0 && this.enemyDeclared();
        ws = [{ w: "选择", ok: true, why: "" }, { w: "自身", ok: true, why: "" },
          { w: "延后", ok: dOk, why: dOk ? "" : "要卡组里有【延后】，并且对手已经宣告过" },
          { w: "移除", ok: this.wordLeft("移除") > 0, why: this.wordLeft("移除") > 0 ? "" : "卡组里的【移除】用完了或在冷却" }];
        break;
      }
      case "count": case "atk_n": case "heal_n": case "mit_n": case "rep_n": case "dur_n": case "delay_n": needNum = true; break;
      case "side": {
        const cnt = cur.count ?? 1;
        const en = this.alive("enemy"), al = this.alive("ally");
        const late = cur.tmode === "late";
        ws = [{ w: "敌方", ok: en >= cnt || late, why: en >= cnt ? "" : `对面只剩 ${en} 个随从` },
          { w: "友方", ok: al >= cnt || late, why: al >= cnt ? "" : `你只剩 ${al} 个随从` }];
        break;
      }
      case "action":
        if ((cur.side ?? "enemy") === "enemy") {
          ws = [{ w: "造成", ok: true, why: "" }];
          for (const nm of NR.ENEMY_ST) ws.push({ w: nm, ok: this.wordLeft(nm) > 0, why: this.wordLeft(nm) > 0 ? "" : `卡组里的【${nm}】用完了或在冷却` });
        } else {
          ws = [{ w: "恢复", ok: true, why: "" }, { w: "减伤", ok: true, why: "" }, { w: "造成", ok: true, why: "（打自己人）" },
            { w: "转移", ok: this.wordLeft("转移") > 0, why: this.wordLeft("转移") > 0 ? "" : "【转移】用完了或在冷却" }];
        }
        break;
      case "end": {
        const k = cur.k;
        if (["atk", "heal"].includes(k) && !cur.rep_set) ws.push({ w: "重复", ok: true, why: "" });
        if (!cur.dur_set) {
          if (k === "st") ws.push({ w: "持续", ok: true, why: "" });
          else if (["atk", "heal", "mit"].includes(k) && cp.slots > 0) {
            const room = this.contRoom();
            ws.push({ w: "持续", ok: room > 0, why: room > 0 ? "" : `续挂满了（同时最多 ${cp.slots} 个）` });
          }
        }
        break;
      }
    }
    if (e === "end" && ncl + 1 < cp.clauses) {
      let ok = true, why = "";
      if (cp.cont_single) {
        let has = (cur.cont ?? 1) > 1 || (cur.dur_set && cur.k !== "st");
        for (const d of pr.done) if ((d.cont ?? 1) > 1) has = true;
        if (has) { ok = false; why = "续流：带【持续】的句子只能一段"; }
      }
      ws.push({ w: "并", ok, why });
    }
    const usedW = new Set(pr.done.map((d) => NE.clauseWord(d)));
    for (const it of ws) {
      if (cp.once && usedW.has(it.w) && it.ok) { it.ok = false; it.why = `并流：一句里【${it.w}】只能用一次`; }
      if (it.w === "重复" && cp.norep) { it.ok = false; it.why = "择流：句子里不能用【重复】"; }
      if (it.w === "持续" && cp.cont_single && ncl > 0 && cur?.k !== "st") { it.ok = false; it.why = "续流：带【持续】的句子只能一段"; }
    }
    if (this.allow) ws = ws.filter((it) => this.allow!.has(it.w));
    return { words: ws, num: needNum, parsed: pr };
  }

  freeCount() { return this.cp.freecount && this.parse().expect === "count"; }

  draftText(toks: Tok[] = this.tokens): string {
    const pr = this.parse(toks);
    if (pr.err) return pr.err;
    const parts: string[] = pr.done.map((c) => clauseText(this.M, c));
    const cur = pr.cur;
    if (cur) {
      const c2 = { ...cur };
      if (!c2.k) {
        let who = c2.tmode === "self" ? "自身" : `${c2.count !== undefined ? `${c2.count} 个` : "几个"}${c2.side ? (c2.side === "enemy" ? "敌方" : "友方") : "某方"}随从`;
        if (c2.tmode === "late" && c2.side) who += "（待定）";
        parts.push(`对${who}……`);
      } else {
        let s = clauseText(this.M, c2);
        if (pr.expect === "rep_n") s += "，一共 几 次";
        if (pr.expect === "dur_n") s += c2.k === "st" ? "，持续 几 轮" : "，以后每轮同一秒再来一次（共 几 轮）";
        parts.push(s);
      }
    }
    return parts.join("；并且") || "（空）";
  }
  previewWith(tok: Tok): string {
    const t2 = [...this.tokens, tok];
    const pr = this.parse(t2);
    return this.draftText(t2) + (pr.complete ? "。（到这里就能拼好）" : "");
  }

  addWord(w: string): boolean {
    const it = this.options().words.find((x) => x.w === w);
    if (!it || !it.ok) return false;
    this.tokens.push({ t: "w", v: w });
    return true;
  }
  addNumber(n: number): boolean {
    const op = this.options();
    if (!op.num) return false;
    const free = this.freeCount();
    if (n > 1 && !free) {
      const have = this.M.usableValues(this.side)[n] ?? 0;
      if ((this.usedValues()[n] ?? 0) >= have) return false;
    }
    this.tokens.push({ t: "n", v: n, free });
    return true;
  }
  undo() { this.tokens.pop(); this.pruneBinds(); }
  clear() { this.tokens = []; this.binds = {}; }

  // ---------------------------------------------------------------- 拖拽 / 框选（把「选择 几个 哪方」这几张词牌一次填好）
  /** 每个分句的起始词牌下标（用逐个前缀解析出来：前缀解析完恰好回到 start 的位置就是下一段开头） */
  clauseStarts(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.tokens.length; i++) if (this.parse(this.tokens.slice(0, i)).expect === "start") out.push(i);
    return out;
  }
  private pruneBinds() {
    const n = this.clauseStarts().length;
    for (const k of Object.keys(this.binds)) if (+k >= n) delete this.binds[+k];
  }
  /** 现在能不能开始新的一段（空句子，或者刚拼了「并」） */
  startsClause() { return this.parse().expect === "start"; }
  /** 拖到目标上：kind = 敌方 / 友方 / 自身；目标是敌方或队友时当场记下是谁。返回 "" = 成功，否则是不行的原因 */
  dragTo(kind: "enemy" | "ally" | "self", target: number): string {
    if (!this.startsClause()) return "要加一段，先拼「并」；要改目标，在人物外框选";
    const no = this.clauseStarts().length;
    const save = this.tokens.length;
    if (kind === "self") {
      if (!this.addWord("自身")) return "这里不能用【自身】";
      return "";
    }
    const bad = (m: string) => { this.tokens.length = save; return m; };
    if (!this.addWord("选择")) return bad("这里不能选【选择】");
    if (!this.addNumber(1)) return bad("数字牌放不下");
    if (!this.addWord(kind === "enemy" ? "敌方" : "友方")) {
      const w = this.options().words.find((x) => x.w === (kind === "enemy" ? "敌方" : "友方"));
      return bad(w?.why || "这一方现在没有可选的随从");
    }
    if (!this.cp.late) this.binds[no] = [target];
    return "";
  }
  /** 框选：把「当前这一段」的目标改成 uids（只检查这一段：都在场、方向对、人数和数字牌够）。返回 "" = 成功，否则是原因 */
  boxTargets(uids: number[]): string {
    const pr = this.parse();
    const no = this.clauseStarts().length - 1;
    const cl = pr.cur ?? pr.done[pr.done.length - 1];
    if (no < 0 || !cl) return "先拖一次选好这一段的对象（或者点「选择」）";
    if (cl.tmode === "self" || cl.k === "delay" || cl.k === "remove") return "这一段的对象不能框选";
    if (!cl.side) return "先选敌方还是友方，再框选";
    if (!uids.length) return "框里没有随从";
    const U = this.M.R.U;
    const wantEnemy = cl.side === "enemy";
    for (const u of uids) {
      const x = U[u];
      if (x.down !== -1) return `【${x.name}】已经倒下了`;
      if ((x.side !== this.side) !== wantEnemy) return `【${x.name}】不是${wantEnemy ? "敌方" : "友方"}，这一段要选${wantEnemy ? "敌方" : "友方"}`;
    }
    const n = uids.length;
    const start = this.clauseStarts()[no], ci = start + 1;   // 「选择」后面那一张是几个
    if (this.tokens[start]?.v !== "选择" || this.tokens[ci]?.t !== "n") return "这一段不是「选择」开头，不能框选";
    const free = this.cp.freecount || n === 1;
    if (!free) {
      const used = { ...this.usedValues() };
      const old = this.tokens[ci];
      if (old.t === "n" && Number(old.v) > 1 && !old.free) used[+old.v] = (used[+old.v] ?? 1) - 1;
      const have = this.M.usableValues(this.side)[n] ?? 0;
      if ((used[n] ?? 0) >= have) return `框了 ${n} 个，要一张数字牌 ${n}，你手里没有（或已经用在别处）`;
    }
    this.tokens[ci] = { t: "n", v: n, free: this.cp.freecount };
    if (this.cp.late) delete this.binds[no]; else this.binds[no] = [...uids];
    return "";
  }

  /** 拼好的句子；原样用了辅助轮建议时，目标和秒数一起带过去 */
  finish(): any[] | null {
    const pr = this.parse();
    if (!pr.complete) return null;
    const cl = structuredClone(pr.clauses);
    cl.forEach((c: any, i: number) => {
      const b = this.binds[i];
      if (b && c.tmode === "choose" && b.length === (c.count ?? 1)) { c.tg = [...b]; c.pre = true; }
    });
    if (this.sugg && JSON.stringify(this.sugg.tokens) === JSON.stringify(this.tokens) && cl.length === this.sugg.act.cl.length) {
      cl.forEach((c: any, i: number) => {
        const sc = this.sugg!.act.cl[i];
        if (sc.tmode === "choose" && (sc.tg ?? []).length) { c.tg = [...sc.tg]; c.pre = true; }
        if (sc.k === "delay") c.act = sc.act;
      });
      cl[0].sugg_start = this.sugg.act.start;
    }
    return cl;
  }

  /** 完整句子的费用说明；bad = 不能提交 */
  costInfo(): { text: string; bad: boolean; allLate: boolean } {
    const pr = this.parse();
    if (!pr.complete) return { text: "拼完整之后才能用。", bad: true, allLate: false };
    const cl = pr.clauses, cp = this.cp;
    const cost = NE.totalCost(cl, cp), ms = NE.actionWindup(cl, cp.wind);
    const tax = cost - NE.actionCost(cl, cp.and);
    const ap = this.M.res[this.side].ap, blood = Math.max(0, Math.ceil((cost - ap) / cp.bloodAp));
    const nums = NE.actionNumbers(cl, cp.freecount);
    let text = `花 ${cost} 行动点${tax > 0 ? `（含待定多目标 +${tax}）` : ""}（还剩 ${ap}）· 最早第 ${ms} 秒起效 · 用数字牌 ${nums.length ? `[${nums.join(", ")}]` : "无（全是 1）"}`;
    let bad = false;
    if (blood > 0) {
      if (cp.blood > 0) {
        const bad2 = cl.some((c: any) => (cp.noheal && c.k === "heal") || (cp.nodef && ["mit", "redirect"].includes(c.k)));
        if (bad2) { text += "  —— 行动点不够要用血付；用血付的句子不能有【恢复】【减伤】【转移】"; bad = true; }
        else if (blood > this.M.bloodRoom(this.side, this.uid)) { text += `  —— 差 ${cost - ap} 点行动点，要付 ${blood} 点生命，这个随从最多只能付 ${this.M.bloodRoom(this.side, this.uid)} 血`; bad = true; }
        else text += `  —— 差的 ${cost - ap} 点用【${this.M.R.U[this.uid].name}】的 ${blood} 点生命付${cp.bloodAp > 1 ? `（1 点生命顶 ${cp.bloodAp} 点）` : ""}`;
      } else { text += "  —— 行动点不够"; bad = true; }
    }
    const allLate = cl.every((c: any) => ["late", "self"].includes(c.tmode ?? "") || c.k === "delay");
    return { text, bad, allLate };
  }

  help(): string {
    const pr = this.parse();
    const e = pr.expect;
    if (e === "start") {
      let h = "第一张：【选择】几个目标 / 【自身】 / 【延后】对方的一句 / 【移除】敌人的保护。";
      if (this.cp.late) h += " 择流：选择的目标现在不用定，双方宣告完你再定（对手只看到“待定”）。";
      return h;
    }
    if (e === "end") {
      const parts = ["可以拼好了"];
      for (const it of this.options().words) {
        if (it.w === "重复") parts.push("接【重复】多打几次");
        else if (it.w === "持续") parts.push(pr.cur?.k === "st" ? "接【持续】让它多撑几轮" : "接【持续】让它以后每轮自动再来");
        else if (it.w === "并") parts.push("【并】接下一段");
      }
      return parts.join("；也可以") + "。";
    }
    return HELP[e] ?? "";
  }
}

// ---- 辅助轮：一段话 → 词牌
export function clauseTokens(c: any): Tok[] {
  const t: Tok[] = [];
  const W = (w: string) => t.push({ t: "w", v: w });
  const N = (n: number) => t.push({ t: "n", v: n });
  if (c.k === "delay") { W("延后"); N(c.n); return t; }
  if (c.k === "remove") { W("移除"); return t; }
  if (c.tmode === "self") W("自身");
  else { W("选择"); N(c.count ?? 1); W((c.side ?? "enemy") === "enemy" ? "敌方" : "友方"); }
  switch (c.k) {
    case "atk": W("造成"); N(c.n); break;
    case "heal": W("恢复"); N(c.n); break;
    case "mit": W("减伤"); N(c.n); break;
    case "st": W(c.st); if (c.n > 1) { W("持续"); N(c.n); } break;
    case "redirect": W("转移"); break;
  }
  if (["atk", "heal"].includes(c.k) && (c.rep ?? 1) > 1) { W("重复"); N(c.rep); }
  if ((c.cont ?? 1) > 1) { W("持续"); N(c.cont); }
  return t;
}
export function actTokens(cl: any[]): Tok[] {
  const out: Tok[] = [];
  cl.forEach((c, i) => { if (i > 0) out.push({ t: "w", v: "并" }); out.push(...clauseTokens(c)); });
  return out;
}
export { actionText };

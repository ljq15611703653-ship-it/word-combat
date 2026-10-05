// 词牌库 + 拖拽拼句（横版 3v3 布局用）。
//   右边常驻词牌库（.lib）；把词牌拖到我方随从头顶的句子条上拼句，拖出来 = 拿掉，拖到别的缝 = 换位置。
//   语法 / 合法性全部沿用 composer/grammar.ts（词序列 <-> 语法树，nextLegal / prefixWhy），规则没有改动；
//   这里只管：任意位置插入后整句还合不合法（prefixWhy）、手势、显示。
//   教程用 setGuide(Guide)：lockWords 之外的词拿不起来，hint 里的下一个词在词牌库里脉冲提示，句子条末尾亮「放这里」。
import { zh, unitLabel, sentenceText, P2, KIND_ORDER } from "./engine/api";
import { canAfford, windupFor, resolveTgs } from "./engine/interp";
import { astToTokens, nextLegal, tokenLabel, isAdvWord, prefixWhy, structOk, vocabulary, normAst, type Token } from "./composer/grammar";
import type { Guide, Match, Sentence } from "./types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const isNum = (t: Token) => /^\d+$/.test(t), isUnit = (t: Token) => /^@\d$/.test(t);
/** 词的类别：决定颜色。base 基础 / adv 进阶（占卡组张数）/ num 数字 / tgt 目标 / obj 对象 */
const kindOf = (t: Token) => (isNum(t) ? "num" : isUnit(t) || t === "选择" || t === "来源" || /^(我方|敌方)随从$/.test(t) ? "tgt" : /^(类|事|词):|^第\d+句$|^先后$/.test(t) ? "obj" : isAdvWord(t) ? "adv" : "base");
const GROUPS: [string, string][] = [["base", "基础"], ["adv", "进阶"], ["num", "数字"], ["tgt", "目标"], ["obj", "对象"]];
const U = vocabulary();

export interface DockApi {
  match: Match;
  stage: HTMLElement;
  unitEl(u: number): HTMLElement;
  label(u: number): string;
  /** 我方此刻能动的随从 */
  canPick(u: number): boolean;
  onDeclare(u: number, cl: Sentence, start: number): void;
  onPass(u: number): void;
  /** 教程：这个随从现在不许「不出手」时返回原因 */
  passDenied?(u: number): string | null;
  /** 教程：这个随从现在的引导（null = 自由） */
  guideFor?(u: number): Guide | null;
}

export class Dock {
  readonly el = document.createElement("div");
  unit = -1;
  tokens: Token[] = [];
  /** 最近一次刷新里的开始秒（测试用） */
  start = 1;
  private guide: Guide | null = null;
  private startTouched = false;
  private whyTxt = ""; private whyTimer = 0;
  private slots: Set<number> | null = null; private hot = -1; private lifted = -1;
  private ghost: HTMLElement | null = null;
  private busy = false;
  private sugOpen = false;
  private cache = new Map<string, { slots: number[]; why: string }>();
  private comp: HTMLElement | null = null;
  private off: (() => void) | null = null;

  constructor(private api: DockApi) {
    this.el.className = "lib";
    this.el.innerHTML = `<div class="lib-head"><b>词牌库</b><span class="lib-ap"></span><button class="lib-sugbtn" data-a="sug" title="列出此刻说得出口的几句话，点一句直接填进句子条">推荐句</button></div>
      <div class="lib-sug" hidden></div><div class="lib-why"></div><div class="lib-body"></div>`;
    api.stage.appendChild(this.el);
    this.el.addEventListener("click", (e) => this.onLibClick(e));
    this.el.addEventListener("pointerdown", (e) => this.onLibDown(e));
    this.el.addEventListener("mouseover", (e) => { const w = (e.target as HTMLElement).closest<HTMLElement>(".cw.off"); if (w) this.say(`「${tokenLabel(w.dataset.t!, (u) => unitLabel(u))}」现在放不进去：${this.reasonFor(w.dataset.t!)}`, 0); });
    this.el.addEventListener("mouseleave", () => this.say("", 0));
    const onKey = (e: KeyboardEvent) => {
      if (this.unit < 0) return;
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === "TEXTAREA" || (tg.tagName === "INPUT" && (tg as HTMLInputElement).type !== "range"))) return;
      if (e.key === "Backspace") { e.preventDefault(); this.back(); } else if (e.key === "Enter") { e.preventDefault(); this.confirm(); } else if (e.key === "Escape") this.cancel();
    };
    document.addEventListener("keydown", onKey);
    this.off = () => document.removeEventListener("keydown", onKey);
    api.stage.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const a = t.closest<HTMLElement>(".comp [data-a]")?.dataset.a;
      if (!a || this.unit < 0) return;
      if (a === "back") this.back(); else if (a === "clear") { this.tokens = []; this.say(""); this.refresh(); } else if (a === "pass") { const u = this.unit; const why = this.api.passDenied?.(u); if (why) { this.say(why, 4200); return; } this.cancel(); this.api.onPass(u); } else if (a === "go") this.confirm(); else if (a === "close") this.cancel();
    });
  }
  destroy() { this.off?.(); this.off = null; this.ghost?.remove(); this.el.remove(); }

  // ---------------------------------------------------------------- 状态
  setGuide(g: Guide | null) { this.guide = g; this.refresh(); }
  isEditing() { return this.unit >= 0; }
  private ctx(u: number) { return { s: this.api.match.s, side: 0 as const, unit: u }; }
  private probe(): number { if (this.unit >= 0) return this.unit; for (let u = 0; u < 3; u++) if (this.api.canPick(u)) return u; return -1; }
  /** 选中一个随从开始拼句 */
  begin(u: number): boolean {
    if (!this.api.canPick(u)) return false;
    if (this.unit === u) return true;
    this.unit = -1; this.clearUnitDom();
    this.unit = u; this.tokens = []; this.startTouched = false; this.sugOpen = false;
    this.guide = this.api.guideFor?.(u) ?? null;
    this.mkComp();
    this.refresh();
    return true;
  }
  cancel() { this.clearUnitDom(); this.unit = -1; this.tokens = []; this.guide = null; this.sugOpen = false; this.slots = null; this.hot = -1; this.refresh(); }
  /** 战斗界面回合变化时调用：没轮到我就收起 */
  sync() { if (this.unit >= 0 && !this.api.canPick(this.unit)) this.cancel(); else this.refresh(); }
  private clearUnitDom() {
    if (this.unit < 0) return;
    const el = this.api.unitEl(this.unit);
    el.classList.remove("editing"); this.comp?.remove(); this.comp = null;
    const d = el.querySelector<HTMLElement>(".decl"); if (d) d.innerHTML = "";
  }
  private say(t: string, ms = 3600) { this.whyTxt = t; clearTimeout(this.whyTimer); this.paintWhy(); if (t && ms) this.whyTimer = window.setTimeout(() => { this.whyTxt = ""; this.paintWhy(); }, ms); }
  private paintWhy() {
    const w = this.el.querySelector<HTMLElement>(".lib-why")!;
    const L = this.cur;
    w.textContent = this.whyTxt || (this.unit < 0 ? (this.probe() >= 0 ? "把词牌拖到我方随从头顶的句子条上" : "") : L ? (L.canEnd ? "句子完整，可以确认；也可以继续往后接" : L.expect) : "");
    w.classList.toggle("bad", !!this.whyTxt && /不|放不|✗|掉下来/.test(this.whyTxt));
  }

  // ---------------------------------------------------------------- 合法性
  private cur: ReturnType<typeof nextLegal> | null = null;
  private allowTok(t: Token): { ok: boolean; why?: string } {
    const lw = this.guide?.lockWords;
    if (lw && !lw.includes(t)) return { ok: false, why: this.guide?.denyText ?? "教程里这一步先不用这个词" };
    return { ok: true };
  }
  /** 这个词放进第 k 个缝（在 base 序列里插入）后整句是否可行；null = 可以 */
  private slotWhy(u: number, base: Token[], k: number, t: Token): string | null {
    const seq = base.slice(); seq.splice(k, 0, t);
    return prefixWhy(seq, this.ctx(u));
  }
  /** 一个词在 base 里所有语法上可放的缝，以及其中说得出口的缝 */
  private slotsFor(u: number, base: Token[], t: Token): { slots: number[]; why: string } {
    const key = `${u}|${base.join(" ")}|${t}`;
    const c = this.cache.get(key); if (c) return c;
    const slots: number[] = []; let why = "";
    const tryK = (k: number) => {
      const seq = base.slice(); seq.splice(k, 0, t);
      if (!structOk(seq)) return;
      const w = prefixWhy(seq, this.ctx(u));
      if (w === null) slots.push(k); else if (!why) why = w;
    };
    // 先试末尾（最常用），再试其余缝
    tryK(base.length);
    for (let k = 0; k < base.length; k++) tryK(k);
    slots.sort((a, b) => a - b);
    if (!slots.length && !why) why = base.length ? `这个词放在这句里哪儿都不合语法。${this.cur?.expect ?? ""}` : (nextLegal([], this.ctx(u)).why.get(t) ?? "现在不能用");
    const r = { slots, why }; this.cache.set(key, r); return r;
  }
  private reasonFor(t: Token): string {
    const u = this.probe(); if (u < 0) return "";
    const a = this.allowTok(t); if (!a.ok) return a.why ?? "";
    return this.slotsFor(u, this.unit >= 0 ? this.tokens : [], t).why;
  }

  // ---------------------------------------------------------------- 刷新
  refresh() {
    this.cache.clear();
    const m = this.api.match, pk = this.probe();
    const idle = pk < 0;
    const u = idle ? ([0, 1, 2].find((x) => m.unitAlive(x)) ?? 0) : pk;
    const my = m.hud().ap[0];
    this.el.querySelector<HTMLElement>(".lib-ap")!.textContent = `⚡ ${my}`;
    this.el.classList.toggle("idle", idle);
    const names = (x: number) => unitLabel(x).replace(/^我方·|^敌方·/, "");
    if (this.unit >= 0) {
      // 编辑中：合法性按「当前句」算；idle：按探测随从空句算
      this.cur = nextLegal(this.tokens, this.ctx(this.unit));
      this.paintUnit();
    } else this.cur = null;
    // 词牌库
    const body = this.el.querySelector<HTMLElement>(".lib-body")!;
    const base = this.unit >= 0 ? this.tokens : [];
    const cards = m.s.side[0].cards, left = m.myDeckLeft();
    const maxCard = Math.max(1, ...cards.map((c) => c.v)) + (P2.POS ? P2.POS_NUM : 0);
    const hint = this.guide?.hint; let nextHint: Token | undefined;
    if (hint && hint.length > base.length && base.every((t, i) => t === hint[i])) nextHint = hint[base.length];
    const buckets = new Map<string, Token[]>(GROUPS.map(([g]) => [g, []]));
    for (const t of U) {
      if (isNum(t) && +t > maxCard) continue;
      // 只摆语法上放得进当前句某个缝的词
      let any = false;
      for (let k = 0; k <= base.length && !any; k++) { const seq = base.slice(); seq.splice(k, 0, t); if (structOk(seq)) any = true; }
      if (any) buckets.get(kindOf(t))!.push(t);
    }
    buckets.set("num", buckets.get("num")!.sort((a, b) => +a - +b));
    buckets.set("tgt", buckets.get("tgt")!.sort((a, b) => (isUnit(a) ? +a[1] : 9) - (isUnit(b) ? +b[1] : 9)));
    // 词牌库分两排：「目标」单独一排，「其它」（基础/进阶/数字/对象）一排；各词仍按原类别着色
    const btns = (g: string) => buckets.get(g)!.map((t) => {
      const al = this.allowTok(t);
      const fz = al.ok && !idle ? this.slotsFor(u, base, t) : { slots: [] as number[], why: al.why ?? "" };
      const cnt = isAdvWord(t) ? `<small class="bd">×${left[t] ?? 0}</small>` : isNum(t) && +t >= 2 ? `<small class="bd">${cards.filter((c) => c.v >= +t && c.cd === 0).length}</small>` : "";
      return `<button class="cw k-${g}${fz.slots.length ? "" : " off"}${t === nextHint ? " hint" : ""}" data-t="${esc(t)}">${esc(tokenLabel(t, names))}${cnt}</button>`;
    }).join("");
    const OTHER = ["base", "adv", "num", "obj"];
    const tgtHtml = buckets.get("tgt")!.length ? `<div class="lib-grp g-tgt"><span class="gn">目标</span><div class="gc">${btns("tgt")}</div></div>` : "";
    const otherHtml = OTHER.some((g) => buckets.get(g)!.length) ? `<div class="lib-grp g-other"><span class="gn">其它</span><div class="gc">${OTHER.map(btns).join("")}</div></div>` : "";
    body.innerHTML = tgtHtml + otherHtml;
    this.paintWhy(); this.paintReady();
    this.el.querySelector<HTMLElement>(".lib-sugbtn")!.hidden = idle;
  }
  /** 便宜的状态同步（Battle.render 每次都会调）：没轮到我就收起；更新 ready/editing/idle 标记 */
  light() {
    if (this.unit >= 0 && !this.api.canPick(this.unit)) { this.cancel(); return; }
    this.el.classList.toggle("idle", this.probe() < 0); this.paintReady();
  }
  private paintReady() {
    for (let x = 0; x < 3; x++) { const el = this.api.unitEl(x); el.classList.toggle("ready", this.unit < 0 && this.api.canPick(x)); el.classList.toggle("editing", this.unit === x); }
  }
  // ---------------------------------------------------------------- 句子条（拼句中的随从头顶）
  private mkComp() {
    const el = this.api.unitEl(this.unit), panel = el.querySelector<HTMLElement>(".panel")!;
    const m = this.api.match;
    const c = document.createElement("div"); c.className = "comp";
    c.innerHTML = `<div class="cread"></div><div class="cmeta"></div>
      <div class="cstart"><label>起手 <b class="sv">1</b> 秒</label><input type="range" min="1" max="${m.tl()}" step="1" value="1" aria-label="起手秒" /><div class="ctl"></div></div>
      <div class="cbtns"><button data-a="back" title="退格 Backspace">退格</button><button data-a="clear">清空</button><button data-a="pass">不出手</button><button data-a="close" title="取消 Esc">取消</button><button class="go" data-a="go" disabled title="确认 Enter">确认宣告</button></div>`;
    panel.appendChild(c); this.comp = c;
    c.querySelector<HTMLInputElement>("input")!.addEventListener("input", (e) => { this.startTouched = true; this.start = +(e.target as HTMLInputElement).value; this.paintUnit(); });
    el.classList.add("editing");
  }
  private paintUnit() {
    if (this.unit < 0 || !this.comp) return;
    const m = this.api.match, u = this.unit, L = this.cur!;
    const el = this.api.unitEl(u), decl = el.querySelector<HTMLElement>(".decl")!;
    const names = (x: number) => unitLabel(x).replace(/^我方·|^敌方·/, "");
    // 句子条
    const hint = this.guide?.hint; const hinting = !!hint && hint.length > this.tokens.length && this.tokens.every((t, i) => t === hint[i]);
    let h = `<i>本轮</i><span class="strip${this.slots ? " dragon" : ""}">`;
    const slot = (i: number) => (this.slots?.has(i) ? `<i class="slot${i === this.hot ? " hot" : ""}" data-i="${i}"></i>` : "");
    if (!this.tokens.length) h += `${slot(0)}<span class="strip-empty">${this.api.match.s.done[u] ? "" : "把词牌拖到这里"}</span>`;
    else { this.tokens.forEach((t, i) => { h += `${slot(i)}<span class="w k-${kindOf(t)}${i === this.lifted ? " lifted" : ""}" data-i="${i}">${esc(tokenLabel(t, names))}</span>`; }); h += slot(this.tokens.length); }
    const GH: Record<string, string> = { 造成: "伤害", 恢复: "生命" }, nt = this.tokens.length;
    if (nt >= 2 && /^\d+$/.test(this.tokens[nt - 1]) && GH[this.tokens[nt - 2]]) h += `<span class="w-ghost" aria-hidden="true">${GH[this.tokens[nt - 2]]}</span>`;
    h += `<span class="cp-end${hinting ? " hint" : ""}"></span></span>`;
    decl.innerHTML = h;
    decl.querySelectorAll<HTMLElement>(".strip .w").forEach((w) => w.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); this.startDrag(e, this.tokens[+w.dataset.i!], { plate: +w.dataset.i! }, null); }));
    // 读法 / 花费 / 起手
    const c = this.comp, q = <T extends HTMLElement>(s: string) => c.querySelector<T>(s)!;
    const slider = q<HTMLInputElement>("input"), read = q(".cread"), meta = q(".cmeta"), go = q<HTMLButtonElement>(".go");
    let ok = L.canEnd, msg = L.endWhy ?? "";
    if (ok && this.guide?.allowed && !this.guide.allowed(L.ast!)) { ok = false; msg = this.guide.denyText ?? "教程要求：这句话不是现在该说的"; }
    meta.innerHTML = ""; read.className = "cread";
    if (L.ast) {
      read.textContent = zh(sentenceText(L.ast));
      const a = canAfford(m.s, 0, L.ast, u), ms = windupFor(L.ast, u, m.s);
      const adv = [...new Set(astToTokens(L.ast).filter(isAdvWord))];
      meta.innerHTML = a ? `<em class="cost">⚡ ${a.cost}</em>${a.nums.length ? `<em>数字牌 ${a.nums.join("·")}</em>` : ""}<em>最早 ${ms} 秒</em>${adv.length ? `<em class="adv">${adv.join("·")}</em>` : ""}` : `<em class="bad">现在说不了</em>`;
      if (!this.startTouched) this.start = ms; else this.start = Math.max(this.start, ms);
      slider.min = String(ms);
      if (!ok) { read.classList.add("warn"); read.textContent += "　✗ " + msg; }
    } else {
      read.textContent = this.tokens.length ? this.tokens.map((t) => tokenLabel(t, names)).join(" ") + " …" : "";
      slider.min = "1"; if (!this.startTouched) this.start = 1;
    }
    this.start = Math.max(+slider.min, Math.min(m.tl(), this.start)); slider.value = String(this.start); q(".sv").textContent = String(this.start);
    q(".ctl").innerHTML = Array.from({ length: m.tl() }, (_, i) => { const s = i + 1; const d = m.s.decl.filter((x) => x.start === s).map((x) => `d${x.side}`).join(" "); return `<i class="${s < +slider.min ? "early" : ""} ${s === this.start ? "me" : ""} ${d}" title="${s} 秒${d ? "：已有宣告" : ""}"></i>`; }).join("");
    go.disabled = !ok; go.title = ok ? "确认 Enter" : msg;
    q<HTMLButtonElement>('[data-a="back"]').disabled = !this.tokens.length;
    // 目标：场上能当目标的随从亮边
    this.api.stage.querySelectorAll<HTMLElement>(".unit").forEach((e) => { const t = "@" + e.dataset.u; e.classList.toggle("cp-tgt", this.cur!.ok.has(t) && (!this.guide?.lockWords || this.guide.lockWords.includes(t))); });
  }
  private back() { this.say(""); this.tokens.pop(); this.refresh(); }
  /** 程序化确认（测试/教程） */
  confirm(): boolean {
    if (this.unit < 0 || !this.comp) return false;
    const go = this.comp.querySelector<HTMLButtonElement>('[data-a="go"]')!; if (go.disabled) { this.say(go.title, 4200); return false; }
    const L = this.cur!, u = this.unit, cl = L.ast!, st = this.start;
    this.cancel(); this.api.onDeclare(u, cl, st); return true;
  }
  /** 程序化放词（测试/教程）：放进最后一个可行的缝。返回是否成功 */
  push(t: Token, u = this.unit >= 0 ? this.unit : this.probe()): boolean {
    if (u < 0) return false;
    if (this.unit !== u && !this.begin(u)) return false;
    return this.insert(t, -1);
  }
  private insert(t: Token, at: number): boolean {
    const a = this.allowTok(t); if (!a.ok) { this.say(a.why ?? ""); return false; }
    const fz = this.slotsFor(this.unit, this.tokens, t);
    if (!fz.slots.length) { this.say(`✗ 「${tokenLabel(t, (x) => unitLabel(x))}」放不进去：${fz.why}`); return false; }
    const k = at >= 0 && fz.slots.includes(at) ? at : at >= 0 ? -2 : fz.slots[fz.slots.length - 1];
    if (k === -2) { this.say(`✗ 这个缝放不进去：${this.slotWhy(this.unit, this.tokens, at, t) ?? ""}`); return false; }
    this.tokens.splice(k, 0, t); this.say(""); this.refresh();
    this.flash(k); return true;
  }
  private flash(i: number) { const w = this.api.unitEl(this.unit)?.querySelector<HTMLElement>(`.strip .w[data-i="${i}"]`); if (w) w.classList.add("fresh"); }
  private removeAt(i: number): Token[] {
    const dropped: Token[] = [];
    const seq = this.tokens.slice(); seq.splice(i, 1);
    // 后面依赖它的词一起掉下来：直到剩下的是合法前缀
    while (seq.length > i && !structOk(seq)) dropped.push(...seq.splice(i, 1));
    this.tokens = seq; return dropped;
  }

  // ---------------------------------------------------------------- 手势
  private onLibClick(e: Event) {
    const t = e.target as HTMLElement;
    const a = t.closest<HTMLElement>("[data-a]")?.dataset.a;
    if (a === "sug") { this.toggleSug(); return; }
    const sg = t.closest<HTMLElement>("[data-s]");
    if (sg) { const c = this.sugList[+sg.dataset.s!]; const u = this.probe(); if (c && u >= 0 && (this.unit === u || this.begin(u))) { try { this.tokens = astToTokens(c.cl); } catch { /* 不支持的句型不填 */ } this.startTouched = false; this.sugOpen = false; this.el.querySelector<HTMLElement>(".lib-sug")!.hidden = true; this.refresh(); } return; }
  }
  private sugList: ReturnType<Match["legalSentences"]> = [];
  private toggleSug() {
    const u = this.probe(); if (u < 0) return;
    this.sugOpen = !this.sugOpen;
    const box = this.el.querySelector<HTMLElement>(".lib-sug")!; box.hidden = !this.sugOpen;
    if (this.sugOpen) {
      this.sugList = this.api.match.legalSentences(u, 40).filter((c) => !this.guide?.allowed || this.guide.allowed(c.cl)).sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind)).slice(0, 14);
      box.innerHTML = this.sugList.map((c, i) => `<button data-s="${i}">${esc(c.text)}</button>`).join("") || "<i>没有推荐</i>";
    }
  }
  private onLibDown(e: PointerEvent) {
    const w = (e.target as HTMLElement).closest<HTMLElement>(".cw"); if (!w || e.button !== 0) return;
    if (w.classList.contains("off")) { this.say(`「${tokenLabel(w.dataset.t!, (u) => unitLabel(u))}」现在放不进去：${this.reasonFor(w.dataset.t!)}`, 4200); return; }
    this.startDrag(e, w.dataset.t!, { lib: true }, w);
  }
  /** 屏幕坐标落在哪个我方随从的句子条（含头顶一圈余量）；没有 = -1 */
  private plateAt(x: number, y: number, only = -1): number {
    let best = -1, bd = 1e9;
    // 正在拼的句子条优先（手机上它浮在最上层，会盖住别的随从的名牌）
    if (this.unit >= 0 && (only < 0 || only === this.unit)) {
      const r = this.api.unitEl(this.unit).querySelector<HTMLElement>(".panel")!.getBoundingClientRect();
      if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return this.unit;
    }
    for (let u = 0; u < 3; u++) {
      if (only >= 0 && u !== only) continue;
      if (only < 0 && !this.api.canPick(u)) continue;
      const el = this.api.unitEl(u); if (el.classList.contains("absent")) continue;
      const pr = el.querySelector<HTMLElement>(".panel")!.getBoundingClientRect(), fr = el.querySelector<HTMLElement>(".fig")!.getBoundingClientRect();
      const m = 24;
      const inP = x >= pr.left - m && x <= pr.right + m && y >= pr.top - m && y <= pr.bottom + m;
      const inF = x >= fr.left && x <= fr.right && y >= fr.top && y <= fr.bottom;
      if (inP || inF) { const d = Math.hypot(x - (pr.left + pr.right) / 2, y - (pr.top + pr.bottom) / 2); if (d < bd) { bd = d; best = u; } }
    }
    return best;
  }
  private nearestSlot(u: number, x: number, y: number): number {
    let best = -1, bd = 1e9;
    this.api.unitEl(u).querySelectorAll<HTMLElement>(".slot").forEach((el) => {
      const r = el.getBoundingClientRect(), d = Math.hypot(x - (r.left + r.width / 2), (y - (r.top + r.height / 2)) * 1.6);
      if (d < bd) { bd = d; best = +el.dataset.i!; }
    });
    return best;
  }
  private startDrag(e: PointerEvent, tok: Token, from: { lib: true } | { plate: number }, src: HTMLElement | null) {
    if (e.button !== 0 || this.busy) return;
    e.preventDefault();
    this.busy = true;
    const fromPlate = "plate" in from ? from.plate : -1;
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false, hot = -1, over = -1, legal: number[] = [];
    const ghost = document.createElement("div"); ghost.className = `hs-ghost k-${kindOf(tok)}`; ghost.textContent = tokenLabel(tok, (u) => unitLabel(u).replace(/^我方·|^敌方·/, ""));
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; this.ghost = ghost;
    // 能放的位置
    const legalFor = (u: number): number[] => {
      if (!this.allowTok(tok).ok) return [];
      if (fromPlate >= 0) {
        if (u !== this.unit) return [];
        const base = this.tokens.slice(); base.splice(fromPlate, 1);
        const out: number[] = [];
        for (let d = 0; d <= this.tokens.length; d++) {
          if (d === fromPlate || d === fromPlate + 1) continue;
          const k = d < fromPlate ? d : d - 1;
          if (this.slotWhy(u, base, k, tok) === null) out.push(d);
        }
        return out;
      }
      if (this.unit >= 0 && u !== this.unit) return [];
      return this.slotsFor(u, u === this.unit ? this.tokens : [], tok).slots;
    };
    const paint = (showSlots: boolean) => {
      this.hot = hot; this.slots = showSlots ? new Set(legal) : null; this.lifted = fromPlate;
      if (this.unit >= 0) this.paintUnit();
      // 空闲时：高亮能接这个词的随从
      for (let u = 0; u < 3; u++) { const el = this.api.unitEl(u); el.classList.toggle("drop-ok", this.unit < 0 && over === u && legal.length > 0); el.classList.toggle("drop-no", this.unit < 0 && over === u && legal.length === 0); el.classList.toggle("drop-cand", this.unit < 0 && this.api.canPick(u)); }
    };
    const legalEdit = this.unit >= 0 ? legalFor(this.unit) : [];
    const pickOnly = fromPlate >= 0 ? this.unit : -1;
    const move = (ev: PointerEvent) => {
      ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`;
      if (!moved) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        moved = true; document.body.appendChild(ghost); document.body.classList.add("hs-dragging"); src?.classList.add("lifted");
      }
      const o = this.plateAt(ev.clientX, ev.clientY, pickOnly);
      if (this.unit >= 0) {
        // 编辑中：句子条上的缝在整个拖动期间都显示（便于对准）；指针在句子条上才选最近的缝
        over = o === this.unit ? o : -1; legal = legalEdit;
        hot = over >= 0 && legal.length ? this.nearestSlot(over, ev.clientX, ev.clientY) : -1;
        paint(true);
      } else {
        if (o !== over) { over = o; legal = o >= 0 ? legalFor(o) : []; }
        hot = -1; paint(false);
      }
      ghost.classList.toggle("out", fromPlate >= 0 && over < 0);
      ghost.classList.toggle("ok", over >= 0 && legal.length > 0 && (this.unit < 0 || hot >= 0));
    };
    const finish = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      document.body.classList.remove("hs-dragging"); src?.classList.remove("lifted");
      ghost.remove(); this.ghost = null; this.busy = false; this.slots = null; this.hot = -1; this.lifted = -1;
      for (let u = 0; u < 3; u++) this.api.unitEl(u).classList.remove("drop-ok", "drop-no", "drop-cand");
    };
    const up = (ev: PointerEvent) => {
      const hs = hot;
      const o = ev.clientX < -100 ? -1 : this.plateAt(ev.clientX, ev.clientY, pickOnly);
      finish();
      if (!moved) {
        // 点一下词牌 = 放到最后一个能放的位置（编辑中），空闲时提示怎么拖
        if (fromPlate < 0) {
          if (this.unit >= 0) this.insert(tok, -1);
          else { const pick = [0, 1, 2].filter((u) => this.api.canPick(u)); if (pick.length === 1 && this.begin(pick[0])) this.insert(tok, -1); else { this.say("把词牌拖到我方随从头顶的句子条上（也可以先点一个随从）"); this.refresh(); } }
        }
        return;
      }
      if (fromPlate >= 0) {
        if (o < 0) {
          const dropped = this.removeAt(fromPlate);
          this.say(dropped.length ? `后面依赖它的 ${dropped.length} 张牌（${dropped.map((t) => tokenLabel(t)).join(" ")}）一起掉下来了` : "", 4200);
          this.refresh();
        } else if (hs >= 0) {
          const base = this.tokens.slice(); base.splice(fromPlate, 1); const k = hs < fromPlate ? hs : hs - 1;
          base.splice(k, 0, tok); this.tokens = base; this.refresh(); this.flash(k);
        } else this.refresh();
        return;
      }
      // 从词牌库拖到句子条
      if (o < 0) { this.refresh(); return; }
      if (this.unit >= 0 && o !== this.unit) { this.say("先确认或取消正在拼的这一句"); this.refresh(); return; }
      if (this.unit < 0 && !this.begin(o)) { this.refresh(); return; }
      if (!this.insert(tok, hs >= 0 ? hs : -1)) this.refresh();
    };
    const cancel = () => up(new PointerEvent("pointerup", { clientX: -999, clientY: -999 }));
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }
}
// 测试钩子（冒烟脚本在页面里用）
(window as any).__cp = { astToTokens, normAst, resolveTgs };

// 宣告输入 v2：逐词拼句。点随从 → 随从旁句子条；底部手牌条按「此刻合法」显示词，灰态悬停/点按看原因。
import "./composer.css";
import { zh, unitLabel, sentenceText, P2, KIND_ORDER } from "../engine/api";
import { canAfford, windupFor } from "../engine/interp";
import { MenuInput } from "../inputMenu";
import type { Guide, InputCtx, InputMode } from "../types";
import { astToTokens, nextLegal, tokenLabel, isAdvWord, type Token, type Legal } from "./grammar";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const isNum = (t: Token) => /^\d+$/.test(t), isUnit = (t: Token) => /^@\d$/.test(t);
const kindOf = (t: Token) => (isNum(t) ? "num" : isUnit(t) || t === "选择" || t === "来源" ? "tgt" : isAdvWord(t) ? "adv" : "");

export class ComposerInput implements InputMode {
  id = "composer"; label = "逐词拼句";
  private bar: HTMLElement | null = null; private hand: HTMLElement | null = null;
  private guide: Guide | null = null;
  private refresh: (() => void) | null = null;
  private off: (() => void) | null = null;
  private cur: Legal | null = null;
  private ctxRef: InputCtx | null = null;
  /** 当前词序列（测试/教程可读） */
  tokens: Token[] = [];
  /** 最近一次确认前的开始秒（测试用） */
  start = 1;
  isOpen() { return !!this.bar; }
  setGuide(g: Guide | null) { this.guide = g; this.refresh?.(); }
  /** 程序化点词（冒烟测试、教程演示用）：返回是否被接受 */
  push(t: Token): boolean { const L = this.cur; if (!L || !this.allow(t, L).ok) return false; this.tokens.push(t); this.refresh?.(); return true; }
  /** 重新计算并刷新界面（测试改了局面后用） */
  update() { this.refresh?.(); }
  /** 程序化确认宣告 */
  confirm(): boolean { const b = this.bar?.querySelector<HTMLButtonElement>('[data-a="go"]'); if (!b || b.disabled) return false; b.click(); return true; }
  private allow(t: Token, L: Legal): { ok: boolean; why?: string } {
    if (!L.ok.has(t)) return { ok: false, why: L.why.get(t) };
    const lw = this.guide?.lockWords;
    if (lw && !lw.includes(t)) return { ok: false, why: this.guide?.denyText ?? "教程里这一步先不用这个词" };
    return { ok: true };
  }
  close() {
    this.off?.(); this.off = null; this.bar?.remove(); this.hand?.remove(); this.bar = this.hand = null; this.refresh = null; this.cur = null;
    this.ctxRef?.host.querySelectorAll(".cp-tgt").forEach((e) => e.classList.remove("cp-tgt"));
  }
  open(ctx: InputCtx) {
    this.close(); this.ctxRef = ctx;
    const m = ctx.match, u = ctx.unit, host = ctx.host;
    this.tokens = [];
    let start = 1, startTouched = false, sugOpen = false, whyTxt = "";
    let sugList: ReturnType<typeof m.legalSentences> = [];
    const bar = document.createElement("div"); bar.className = "cp-bar"; this.bar = bar;
    const hand = document.createElement("div"); hand.className = "cp-hand"; this.hand = hand;
    bar.innerHTML = `<div class="cp-head"><b>${esc(ctx.label ?? "")} 说什么？</b><span class="ap"></span><button class="cp-tool" data-a="fold" aria-label="收起手牌条">手牌 ▾</button><button class="cp-x" data-a="close" aria-label="关闭">✕</button></div>
      <div class="cp-sent empty"></div><div class="cp-read"></div><div class="cp-meta"></div><div class="cp-why"></div>
      <div class="cp-start"><label>起手 <b class="sv">1</b> 秒</label><input type="range" min="1" max="${m.tl()}" step="1" value="1" /><div class="cp-tl"></div></div>
      <div class="cp-sug" hidden></div>
      <div class="cp-btns"><button data-a="back">退格</button><button data-a="clear">清空</button><button data-a="sug">推荐句</button><button data-a="pass">不出手</button><button class="go" data-a="go" disabled>确认宣告</button></div>`;
    const q = <T extends HTMLElement>(s: string) => bar.querySelector<T>(s)!;
    const sent = q(".cp-sent"), read = q(".cp-read"), meta = q(".cp-meta"), slider = q<HTMLInputElement>(".cp-start input"), tl = q(".cp-tl"), go = q<HTMLButtonElement>(".go"), sug = q(".cp-sug");
    const names = (x: number) => unitLabel(x);
    const ctxG = () => ({ s: m.s, side: 0 as const, unit: u });
    const render = () => {
      const L = nextLegal(this.tokens, ctxG()); this.cur = L;
      q(".ap").textContent = `行动点 ${m.hud().ap[0]}`;
      sent.classList.toggle("empty", !this.tokens.length);
      sent.innerHTML = this.tokens.map((t) => `<span class="cp-tk ${kindOf(t)}">${esc(tokenLabel(t, names))}</span>`).join("") + `<i class="cp-caret"></i>`;
      let ok = L.canEnd, msg = L.endWhy ?? "";
      if (ok && this.guide?.allowed && !this.guide.allowed(L.ast!)) { ok = false; msg = this.guide.denyText ?? "教程要求：这句话不是现在该说的"; }
      meta.innerHTML = ""; read.className = "cp-read";
      if (L.ast) {
        read.textContent = zh(sentenceText(L.ast));
        const a = canAfford(m.s, 0, L.ast, u), ms = windupFor(L.ast, u, m.s);
        const adv = [...new Set(astToTokens(L.ast).filter(isAdvWord))];
        meta.innerHTML = a ? `<em class="cost">⚡ ${a.cost}</em>${a.nums.length ? `<em>数字牌 ${a.nums.join("·")}</em>` : ""}<em>最早 ${ms} 秒</em>${adv.length ? `<em>${adv.join("·")}</em>` : ""}` : `<em class="bad">现在说不了</em>`;
        if (!startTouched) start = ms; else start = Math.max(start, ms);
        slider.min = String(ms);
        if (!ok) { read.classList.add("warn"); read.textContent += "　✗ " + msg; }
      } else { read.textContent = this.tokens.map((t) => tokenLabel(t, names)).join(" ") + (this.tokens.length ? " …" : ""); slider.min = "1"; if (!startTouched) start = 1; }
      start = Math.max(+slider.min, Math.min(m.tl(), start)); slider.value = String(start); this.start = start; q(".sv").textContent = String(start);
      const dec = m.s.decl;
      tl.innerHTML = Array.from({ length: m.tl() }, (_, i) => { const s = i + 1; const d = dec.filter((x) => x.start === s).map((x) => `d${x.side}`).join(" "); return `<i class="${s < +slider.min ? "early" : ""} ${s === start ? "me" : ""} ${d}" title="${s} 秒${d ? "：已有宣告" : ""}"></i>`; }).join("");
      go.disabled = !ok; go.title = ok ? "" : msg;
      q<HTMLButtonElement>('[data-a="back"]').disabled = !this.tokens.length;
      renderHand(L);
      host.querySelectorAll<HTMLElement>(".unit").forEach((e) => { const t = "@" + e.dataset.u; e.classList.toggle("cp-tgt", L.ok.has(t) && (!this.guide?.lockWords || this.guide.lockWords.includes(t))); });
      place();
    };
    const renderHand = (L: Legal) => {
      const hint = this.guide?.hint; let nextHint: Token | undefined;
      if (hint && hint.length > this.tokens.length && this.tokens.every((t, i) => t === hint[i])) nextHint = hint[this.tokens.length];
      const left = m.myDeckLeft(), cards = m.s.side[0].cards;
      const groups: [string, Token[]][] = [["基础", []], ["进阶", []], ["数字", []], ["目标", []], ["对象", []]];
      for (const t of L.struct) {
        const g = isNum(t) ? 2 : isUnit(t) || t === "选择" || t === "来源" ? 3 : /^(类|事|词):|^第\d+句$|^先后$/.test(t) ? 4 : isAdvWord(t) ? 1 : 0;
        groups[g][1].push(t);
      }
      const maxCard = Math.max(1, ...cards.map((c) => c.v)) + (P2.POS ? P2.POS_NUM : 0);
      groups[2][1] = groups[2][1].filter((t) => +t <= maxCard).sort((a, b) => +a - +b);
      groups[3][1].sort((a, b) => (isUnit(a) ? +a[1] : 9) - (isUnit(b) ? +b[1] : 9));
      const tip = whyTxt || (L.canEnd ? "句子完整，可以确认宣告；也可以继续往后接。" : L.expect);
      q(".cp-why").textContent = tip;
      hand.innerHTML = `` + groups.filter(([, l]) => l.length).map(([n, l]) => `<div class="cp-grp"><span>${n}</span>${l.map((t) => {
        const a = this.allow(t, L);
        const cnt = isAdvWord(t) ? `<small>×${left[t] ?? 0}</small>` : isNum(t) && +t >= 2 ? `<small>${cards.filter((c) => c.v >= +t && c.cd === 0).length}</small>` : "";
        return `<button class="cp-w ${kindOf(t)}${a.ok ? "" : " off"}${t === nextHint ? " hint" : ""}" data-t="${esc(t)}" title="${esc(a.ok ? "" : a.why ?? "")}">${esc(tokenLabel(t, names))}${cnt}</button>`;
      }).join("")}</div>`).join("") + `<div class="cp-tip" hidden></div>`;
    };
    const tryPush = (t: Token) => {
      const L = this.cur!, a = this.allow(t, L);
      if (!a.ok) { whyTxt = `✗ 「${tokenLabel(t, names)}」：${a.why ?? ""}`; renderHand(L); return; }
      whyTxt = ""; this.tokens.push(t); render();
    };
    const back = () => { whyTxt = ""; this.tokens.pop(); render(); };
    const declare = () => { const L = this.cur!; if (!L.ast || go.disabled) return; const cl = L.ast; this.close(); ctx.onDeclare(cl, start); };
    const onClick = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-a=fold]")) { hand.classList.toggle("fold"); place(); return; }
      const w = t.closest<HTMLElement>(".cp-w"); if (w) { tryPush(w.dataset.t!); if (w.classList.contains("off")) requestAnimationFrame(() => showTip(hand.querySelector<HTMLElement>(`.cp-w[data-t="${w.dataset.t}"]`))); return; }
      const sg = t.closest<HTMLElement>("[data-s]");
      if (sg) { const c = sugList[+sg.dataset.s!]; try { this.tokens = astToTokens(c.cl); } catch { /* 不支持的句型不填 */ } sugOpen = false; sug.hidden = true; startTouched = false; render(); return; }
      const a = t.closest<HTMLElement>("[data-a]")?.dataset.a;
      if (a === "close") { this.close(); ctx.onCancel(); } else if (a === "pass") { this.close(); ctx.onPass(); }
      else if (a === "back") back(); else if (a === "clear") { this.tokens = []; whyTxt = ""; render(); } else if (a === "go") declare();
      else if (a === "sug") {
        sugOpen = !sugOpen; sug.hidden = !sugOpen;
        if (sugOpen) { sugList = m.legalSentences(u, 40).filter((c) => !this.guide?.allowed || this.guide.allowed(c.cl)).sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind)).slice(0, 14); sug.innerHTML = sugList.map((c, i) => `<button data-s="${i}">${esc(c.text)}</button>`).join("") || "<i>没有推荐</i>"; }
      }
    };
    // 悬停/点按灰词：浮出原因（原生 title 在触屏和截图里不可见）
    const showTip = (w: HTMLElement | null) => {
      const tip = hand.querySelector<HTMLElement>(".cp-tip"); if (!tip) return;
      if (!w || !w.classList.contains("off")) { tip.hidden = true; return; }
      const a = this.allow(w.dataset.t!, this.cur!);
      tip.textContent = `「${tokenLabel(w.dataset.t!, names)}」现在不能用：${a.why ?? ""}`; tip.hidden = false;
      const r = w.getBoundingClientRect(), hr = hand.getBoundingClientRect();
      void hr; tip.style.left = Math.max(6, Math.min(r.left, innerWidth - tip.offsetWidth - 6)) + "px"; tip.style.top = Math.max(4, r.top - tip.offsetHeight - 6) + "px";
    };
    hand.addEventListener("mouseover", (e) => showTip((e.target as HTMLElement).closest<HTMLElement>(".cp-w")));
    hand.addEventListener("mouseleave", () => showTip(null));
    bar.addEventListener("click", onClick); hand.addEventListener("click", onClick);
    slider.addEventListener("input", () => { start = +slider.value; startTouched = true; render(); });
    // 点场上随从 = 选目标（捕获阶段，先于战斗界面自己的点击）
    const onStage = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(".unit"); if (!el || !this.cur) return;
      const t = "@" + el.dataset.u;
      if (this.cur.struct.has(t)) { e.stopPropagation(); e.preventDefault(); tryPush(t); }
    };
    host.addEventListener("click", onStage, true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" && (e.target as HTMLInputElement).type !== "range") return;
      if (e.key === "Backspace") { e.preventDefault(); back(); } else if (e.key === "Enter") { e.preventDefault(); declare(); } else if (e.key === "Escape") { this.close(); ctx.onCancel(); }
    };
    document.addEventListener("keydown", onKey);
    this.off = () => { host.removeEventListener("click", onStage, true); document.removeEventListener("keydown", onKey); };
    host.appendChild(bar); host.appendChild(hand);
    const place = () => {
      if (matchMedia("(max-width: 720px)").matches) { bar.style.left = bar.style.top = ""; return; }
      const a = ctx.anchor.getBoundingClientRect(), h = host.getBoundingClientRect();
      const w = bar.offsetWidth, hh = bar.offsetHeight;
      let x = a.right - h.left + 10; if (x + w > h.width - 8) x = Math.max(8, a.left - h.left - w - 10);
      let y = a.top - h.top; y = Math.max(8, Math.min(y, h.height - hh - hand.offsetHeight - 8));
      bar.style.left = x + "px"; bar.style.top = y + "px";
    };
    this.refresh = render; render(); requestAnimationFrame(place);
  }
}
/** 菜单版 + 逐词版，可切换；Battle.input 指向它。逐词版里有「推荐句」按钮，菜单版保留作整句挑选入口 */
export class SwitchInput implements InputMode {
  id = "switch"; label = "输入方式";
  composer = new ComposerInput(); menu = new MenuInput();
  mode: "composer" | "menu" = "composer";
  private get cur(): InputMode { return this.mode === "composer" ? this.composer : this.menu; }
  open(c: InputCtx) { this.cur.open(c); }
  close() { this.composer.close(); this.menu.close(); }
  isOpen() { return this.cur.isOpen(); }
  setGuide(g: Guide | null) { this.composer.setGuide(g); }
}
// 测试钩子（冒烟脚本在页面里用）
import { normAst } from "./grammar";
import { resolveTgs } from "../engine/interp";
(window as any).__cp = { astToTokens, normAst, resolveTgs };

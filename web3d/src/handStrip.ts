// 手牌条：拼句时在屏幕底部摆出所有能用的词牌和数字牌，像炉石那样拖到随从头顶的名牌（句子条）上装配，
// 拖出来就是拿掉（依赖它的牌一起掉下来），拖到别的缝里就是换位置。能放的位置会在句子条上亮成一个个缝。
// 规则全在 Composer（slotsFor / insertAt / removeAt / slotsForMove / moveTok），这里只管手势和显示。
import type { Composer, Tok } from "./engine/composer";
import type { SentencePanel } from "./sentencePanel";

export interface HandWord { w: string; tip: string; adv: boolean; group: number }
export interface HandNum { v: number; left: number | null; free: boolean }   // left = null 表示不限
export interface HandModel {
  words: HandWord[];
  nums: HandNum[];
  title: string;          // 「给【小剑】拼一句」
  info: string;           // 行动点之类的小字
  text: string;           // 「这句话：…」
  cost: string;
  canDone: boolean;
  doneLabel: string;
  doneHl: boolean;
  onUndo: () => void; onClear: () => void; onCancel: () => void; onDone: () => void;
}
export interface HandApi {
  cmp(): Composer | null;
  plate(): SentencePanel | null;
  /** 改完句子以后让界面重画 */
  refresh(): void;
  toast(m: string): void;
  /** 教程拦截：返回 false = 不让这么放 */
  allow(tok: Tok): boolean;
}

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class HandStrip {
  readonly el = h("div", "hs");
  private ghost: HTMLElement | null = null;
  private busy = false;
  constructor(private api: HandApi) { this.el.hidden = true; document.body.appendChild(this.el); }

  hide() { this.el.hidden = true; this.endGhost(); }

  render(m: HandModel) {
    const el = this.el;
    el.hidden = false; el.innerHTML = "";
    const top = h("div", "hs-top");
    top.append(h("b", "hs-title", m.title), h("span", "hs-info", m.info));
    const txt = h("div", "hs-text", m.text), cost = h("div", "hs-cost", m.cost);
    el.append(top, txt, cost);
    const cmp = this.api.cmp()!;
    const rows = h("div", "hs-rows");
    const row = (cls: string) => { const r = h("div", "hs-row " + cls); rows.append(r); return r; };
    const words = row("words"), nums = row("nums");
    let g = -1, wrow = h("div", "hs-grp");
    for (const it of m.words) {
      if (it.group !== g) { g = it.group; wrow = h("div", "hs-grp"); words.append(wrow); }
      const tok: Tok = { t: "w", v: it.w };
      const legal = cmp.slotsFor(tok).length > 0;
      const c = h("button", `hs-card w${it.adv ? " adv" : ""}${legal ? "" : " off"}`, it.w);
      c.title = it.tip + (legal ? "" : `\n（现在放不进去：${cmp.whyNot(tok)}）`);
      c.addEventListener("pointerdown", (e) => this.down(tok, { hand: true }, e, c));
      c.addEventListener("mouseenter", () => { txt.dataset.keep = txt.textContent ?? ""; txt.textContent = legal ? it.tip : `${it.tip}（现在放不进去：${cmp.whyNot(tok)}）`; txt.classList.add("hint"); });
      c.addEventListener("mouseleave", () => { txt.textContent = m.text; txt.classList.remove("hint"); });
      wrow.append(c);
    }
    for (const n of m.nums) {
      const tok: Tok = { t: "n", v: n.v, free: n.free };
      const legal = cmp.slotsFor(tok).length > 0 && (n.left === null || n.left > 0);
      const c = h("button", `hs-card n${n.v > 1 ? " big" : ""}${legal ? "" : " off"}`);
      c.append(h("b", "", String(n.v)), h("small", "", n.left === null ? "免费" : `×${n.left}`));
      c.title = n.v === 1 ? "1 免费、不限次数" : `数字牌 ${n.v}（放进句子本轮就用掉了）`;
      c.addEventListener("pointerdown", (e) => this.down(tok, { hand: true }, e, c));
      nums.append(c);
    }
    el.append(rows);
    const foot = h("div", "hs-foot");
    const b = (label: string, cls: string, f: () => void) => { const x = h("button", "hs-btn " + cls, label); x.addEventListener("click", f); return x; };
    const ok = b(m.doneLabel, "primary" + (m.doneHl ? " hl" : ""), m.onDone);
    ok.disabled = !m.canDone;
    foot.append(b("撤回", "ghost", m.onUndo), b("清空", "ghost", m.onClear), b("取消", "ghost", m.onCancel), ok);
    nums.append(foot);
    el.title = "把词牌拖到头顶的句子条上；亮起的缝就是能放的位置。把句子条里的牌拖出来就是拿掉（后面依赖它的牌一起掉下来）；拖到别的缝里换位置。";
  }

  /** 句子条上的牌被按下（SentencePanel.setEdit 的回调） */
  plateDown(i: number, e: PointerEvent) {
    const cmp = this.api.cmp();
    if (!cmp || !cmp.tokens[i]) return;
    this.down(cmp.tokens[i], { plate: i }, e, null);
  }

  private endGhost() { this.ghost?.remove(); this.ghost = null; this.busy = false; }

  private down(tok: Tok, from: { hand: true } | { plate: number }, e: PointerEvent, src: HTMLElement | null) {
    if (e.button !== 0 || this.busy) return;
    const cmp = this.api.cmp(), plate = this.api.plate();
    if (!cmp || !plate) return;
    e.preventDefault();
    this.busy = true;
    const fromPlate = "plate" in from ? from.plate : -1;
    // 能放的位置（显示用的下标 = 缝在第几张牌之前）
    let legal: number[];
    if (fromPlate >= 0) {
      const red = cmp.slotsForMove(fromPlate);
      legal = [];
      for (let k = 0; k <= cmp.tokens.length; k++) { if (k === fromPlate || k === fromPlate + 1) continue; if (red.includes(k < fromPlate ? k : k - 1)) legal.push(k); }
    } else legal = cmp.slotsFor(tok);
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false, hot = -1;
    const ghost = h("div", `hs-ghost${tok.t === "n" ? " n" : ""}`, String(tok.v));
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
    this.ghost = ghost;
    const overPlate = (ev: PointerEvent) => {
      const r = plate.el.getBoundingClientRect(), m = 28;
      return ev.clientX >= r.left - m && ev.clientX <= r.right + m && ev.clientY >= r.top - m && ev.clientY <= r.bottom + m;
    };
    const move = (ev: PointerEvent) => {
      ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`;
      if (!moved) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        moved = true; document.body.appendChild(ghost); document.body.classList.add("hs-dragging");
        src?.classList.add("lifted");
      }
      const over = overPlate(ev);
      const nh = over && legal.length ? plate.nearestSlot(ev.clientX, ev.clientY) : -1;
      if (nh !== hot || ev.type === "pointermove") { hot = nh; plate.showSlots(legal, hot, fromPlate); }
      ghost.classList.toggle("out", fromPlate >= 0 && !over);       // 句子条里的牌拖到外面 = 要拿掉
      ghost.classList.toggle("ok", over && hot >= 0);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      document.body.classList.remove("hs-dragging");
      const over = overPlate(ev);
      plate.showSlots(null);
      src?.classList.remove("lifted");
      this.endGhost();
      if (!moved) {
        // 点一下：手牌 = 装到最后一个能放的位置（懒人用法）；句子条里的牌没有点击含义
        if (fromPlate < 0) this.insert(tok, legal.length ? legal[legal.length - 1] : -1, cmp);
        return;
      }
      if (fromPlate >= 0) {
        if (!over) {
          const dropped = cmp.removeAt(fromPlate);
          if (dropped.length) this.api.toast(`后面依赖它的 ${dropped.length} 张牌（${dropped.map((t) => t.v).join(" ")}）一起掉下来了`);
          this.api.refresh();
        } else if (hot >= 0) {
          const j = hot < fromPlate ? hot : hot - 1;
          if (cmp.moveTok(fromPlate, j)) { this.api.refresh(); plate.flash(j); }
        }
        return;
      }
      if (over) this.insert(tok, hot, cmp);
    };
    const cancel = () => up(new PointerEvent("pointerup", { clientX: -999, clientY: -999 }));
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }

  private insert(tok: Tok, at: number, cmp: Composer) {
    if (at < 0) { this.api.toast(cmp.whyNot(tok)); return; }
    if (!this.api.allow(tok)) return;
    if (cmp.insertAt(at, tok)) { this.api.refresh(); this.api.plate()?.flash(at); }
    else this.api.toast(cmp.whyNot(tok));
  }
}

// 宣告输入 v1：「可说的句子」菜单。点随从后在其面板旁弹出，按类别分组、可搜索，选句子 + 拖起手秒 → 宣告。
import { KIND_ORDER, type Candidate } from "./engine/api";
import type { InputCtx, InputMode } from "./types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export class MenuInput implements InputMode {
  id = "menu"; label = "可说的句子";
  private el: HTMLElement | null = null;
  isOpen() { return !!this.el; }
  close() { this.el?.remove(); this.el = null; }
  open(ctx: InputCtx) {
    this.close();
    const m = ctx.match, u = ctx.unit;
    const all = m.legalSentences(u, 60);
    const el = document.createElement("div");
    el.className = "dj-menu";
    this.el = el;
    let kind = "全部", q = "", sel: Candidate | null = null, start = 1;
    const counts = new Map<string, number>(); all.forEach((c) => counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1));
    const kinds = ["全部", ...KIND_ORDER.filter((k) => counts.has(k))];
    const left = m.myDeckLeft();
    const deckTxt = Object.entries(left).filter(([, n]) => n > 0).map(([w, n]) => `${w}×${n}`).join("  ") || "（进阶词已用完）";
    const ap = m.hud().ap[0];
    el.innerHTML = `
      <div class="mn-head"><b>${esc(ctx.label ?? "")} 说什么？</b><span class="mn-ap">行动点 ${ap}</span><button class="mn-x" data-a="close" aria-label="关闭">✕</button></div>
      <div class="mn-tools"><input class="mn-q" type="search" placeholder="搜索句子 / 词…" /><button class="mn-pass" data-a="pass">不出手</button></div>
      <div class="mn-tabs"></div>
      <div class="mn-list" role="listbox"></div>
      <div class="mn-foot">
        <div class="mn-sel"><span class="mn-hint">点一句话选中</span></div>
        <div class="mn-start" hidden><label>起手秒 <b class="mn-sv">1</b></label><input class="mn-slider" type="range" min="1" max="${m.tl()}" step="1" value="1" /><span class="mn-min"></span></div>
        <button class="mn-go" data-a="go" disabled>宣告</button>
        <div class="mn-deck">我的进阶词：${esc(deckTxt)}</div>
      </div>`;
    const tabs = el.querySelector<HTMLElement>(".mn-tabs")!, list = el.querySelector<HTMLElement>(".mn-list")!;
    const slider = el.querySelector<HTMLInputElement>(".mn-slider")!, sv = el.querySelector<HTMLElement>(".mn-sv")!;
    const go = el.querySelector<HTMLButtonElement>(".mn-go")!;
    const renderTabs = () => { tabs.innerHTML = kinds.map((k) => `<button class="mn-tab${k === kind ? " on" : ""}" data-k="${esc(k)}">${esc(k)}<i>${k === "全部" ? all.length : counts.get(k)}</i></button>`).join(""); };
    const renderList = () => {
      const rows = all.filter((c) => (kind === "全部" || c.kind === kind) && (!q || c.text.includes(q) || c.adv.some((a) => a.includes(q))));
      rows.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.cost - b.cost || a.text.length - b.text.length);
      let html = "", last = "";
      rows.forEach((c) => {
        if (kind === "全部" && c.kind !== last) { html += `<div class="mn-grp">${esc(c.kind)}</div>`; last = c.kind; }
        const i = all.indexOf(c);
        const need = c.nums.length ? `牌 ${c.nums.join("·")}` : "";
        const adv = c.adv.length ? c.adv.join("·") : "";
        html += `<button class="mn-row${c === sel ? " on" : ""}" data-i="${i}" role="option"><span class="t">${esc(c.text)}</span><span class="m"><em class="cost">⚡${c.cost}</em>${need ? `<em class="need">${need}</em>` : ""}<em class="ws">≥${c.minStart}秒</em>${adv ? `<em class="adv">${esc(adv)}</em>` : ""}</span></button>`;
      });
      list.innerHTML = html || `<div class="mn-empty">没有合适的句子（行动点或数字牌不够？）</div>`;
    };
    const renderSel = () => {
      const box = el.querySelector<HTMLElement>(".mn-sel")!, st = el.querySelector<HTMLElement>(".mn-start")!;
      if (!sel) { box.innerHTML = `<span class="mn-hint">点一句话选中</span>`; st.hidden = true; go.disabled = true; return; }
      box.innerHTML = `<span class="mn-chosen">${esc(sel.text)}</span>`;
      st.hidden = false; slider.min = String(sel.minStart); start = Math.max(start, sel.minStart); slider.value = String(start); sv.textContent = String(start);
      el.querySelector<HTMLElement>(".mn-min")!.textContent = `最早 ${sel.minStart} 秒 · 越晚越能看清对手`;
      go.disabled = false;
    };
    renderTabs(); renderList();
    const declare = () => { if (!sel) return; this.close(); ctx.onDeclare(sel.cl, start); };
    el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest<HTMLElement>(".mn-row"); if (row) { sel = all[+row.dataset.i!]; start = Math.max(start, sel.minStart); renderList(); renderSel(); return; }
      const tab = t.closest<HTMLElement>(".mn-tab"); if (tab) { kind = tab.dataset.k!; renderTabs(); renderList(); return; }
      const a = t.closest<HTMLElement>("[data-a]")?.dataset.a;
      if (a === "close") { this.close(); ctx.onCancel(); } else if (a === "pass") { this.close(); ctx.onPass(); } else if (a === "go") declare();
    });
    el.addEventListener("dblclick", (e) => { if ((e.target as HTMLElement).closest(".mn-row")) declare(); });
    el.querySelector<HTMLInputElement>(".mn-q")!.addEventListener("input", (e) => { q = (e.target as HTMLInputElement).value.trim(); renderList(); });
    slider.addEventListener("input", () => { start = +slider.value; sv.textContent = String(start); });
    ctx.host.appendChild(el);
    // 定位：桌面贴着随从面板右侧；手机由 CSS 变成底部抽屉
    const place = () => {
      if (matchMedia("(max-width: 720px)").matches) { el.style.left = el.style.top = ""; return; }
      const a = ctx.anchor.getBoundingClientRect(), h = ctx.host.getBoundingClientRect();
      const w = el.offsetWidth, hh = el.offsetHeight;
      let x = a.right - h.left + 10; if (x + w > h.width - 8) x = Math.max(8, a.left - h.left - w - 10);
      let y = a.top - h.top; y = Math.max(8, Math.min(y, h.height - hh - 8));
      el.style.left = x + "px"; el.style.top = y + "px";
    };
    place(); requestAnimationFrame(place);
  }
}

// 载荷板（组牌界面）：移植自 D:/wc/deckbuilder/app.js，改成可多实例的组件。
// 词库按类别分组、拖入/吸附/旋转(R)/移除(Delete)、说明与示例、推荐配置、自动排布、JSON 导入导出、手机竖屏词库抽屉。
import "./deck.css";
import { CATEGORIES, KEYWORDS, PRESETS } from "./data";
import { addError, autoPack, canPlace, counts, dims, nearestSpot, usedArea, type Block, type Word } from "./layout";
import { boardSize, capacity, expandDeck, getWords, presetsNow, validateDeck, wordMap } from "./words";

export type Deck = Record<string, number>;
export interface BoardOpts {
  host: HTMLElement;
  /** 手机竖屏词库收成底部抽屉（同页只给一个板开，别的板词库内嵌） */
  drawer?: boolean;
  /** 每次卡组变化（含程序性重排）回调标准卡组对象 {词: 张数} */
  onChange(deck: Deck): void;
  /** 关键词选择器（不占载荷）。不传就不显示 */
  kws?: { names: string[]; sub?: string[]; values: string[]; onPick(i: number, k: string): void };
  /** 导入 JSON 里带 kws 字段时回调 */
  onImportKws?(kws: string[]): void;
  title?: string;
}
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const MSG = { full: (w: Word) => `「${w.name}」已满，最多 ${w.max} 张`, capacity: () => "载荷已满，装不下了", nospace: () => "载荷板没有足够连续空位，试试自动排布" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const area = (w: Word) => w.size[0] * w.size[1];
const sizeText = (w: Word) => `${w.size[1]}×${w.size[0]}`;

interface Drag { kind: "lib" | "block"; id?: number; word: Word; rot: boolean; sx: number; sy: number; active: boolean; spot: { x: number; y: number; rot: boolean } | null; off?: { x: number; y: number }; ghost?: HTMLElement; last?: PointerEvent }

export class DeckBoard {
  readonly el: HTMLElement;
  private o: BoardOpts;
  private words: Word[] = []; private bn: Record<string, Word> = {};
  private wsig = "";
  private cols = 6; private rows = 3;
  private blocks: Block[] = []; private nextId = 1;
  private selected: number | null = null; private hover: string | null = null;
  private cell = 64;
  private closed = new Set<string>();
  private drag: Drag | null = null;
  private active = false;
  private dead = false;
  private toastT = 0;
  private ro: ResizeObserver;
  private q = <T extends HTMLElement>(s: string) => this.el.querySelector<T>(s)!;
  private listeners: [EventTarget, string, EventListener][] = [];

  constructor(o: BoardOpts) {
    this.o = o;
    this.el = document.createElement("div");
    this.el.className = "dk" + (o.drawer ? " has-drawer" : "");
    this.el.innerHTML = `
      <div class="dk-bar">
        ${o.title ? `<b class="dk-title">${esc(o.title)}</b>` : ""}
        <select class="dk-preset" aria-label="推荐配置"><option value="">推荐配置…</option></select>
        <button type="button" class="dk-btn" data-a="auto">自动排布</button>
        <button type="button" class="dk-btn" data-a="clear">清空</button>
        <span class="dk-sp"></span>
        <button type="button" class="dk-btn" data-a="io">复制 / 导入 JSON</button>
      </div>
      <div class="dk-io" hidden>
        <textarea rows="2" spellcheck="false" placeholder="{&quot;并&quot;:2,&quot;减伤&quot;:2}"></textarea>
        <div class="dk-iorow"><button type="button" class="dk-btn" data-a="copy">复制</button><button type="button" class="dk-btn on" data-a="import">导入</button><span class="dk-ioerr"></span></div>
      </div>
      <div class="dk-app">
        <aside class="dk-lib dk-panel"><div class="dk-ph"><b>词库</b><span class="dk-mute">点击装入 · 拖入载荷板</span></div><div class="dk-liblist"></div></aside>
        <div class="dk-main">
          <div class="dk-usage"><span class="dk-cap">已装 <b class="dk-used">0</b> / <span class="dk-capn">18</span></span><div class="dk-meter"></div></div>
          <div class="dk-boardbox"><div class="dk-board"><div class="dk-preview"></div></div></div>
          <div class="dk-hint dk-mute">点击选中 · 拖动移动 · R 旋转 · Delete 移除</div>
          <div class="dk-kws" hidden></div>
        </div>
        <aside class="dk-side"><section class="dk-detail dk-panel"></section><section class="dk-summary dk-panel"></section></aside>
      </div>
      <button type="button" class="dk-drawerbtn">词库 ▴</button>
      <div class="dk-toast"></div>`;
    o.host.appendChild(this.el);
    this.refreshWords(true);
    this.bind();
    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(this.q(".dk-main"));
    this.renderAll(false);
    this.fit();
  }

  /* ---------- 对外 ---------- */
  getDeck(): Deck { const c = counts(this.blocks); const o: Deck = {}; for (const w of this.words) if (c[w.name]) o[w.name] = c[w.name]; return o; }
  /** 载入卡组（自动排布）。不合法返回错误文字，成功返回 null；quiet=不触发 onChange */
  setDeck(deck: Deck, quiet = false): string | null {
    const err = validateDeck(deck, this.bn);
    if (err) return err;
    const pl = autoPack(expandDeck(deck, this.bn), this.cols, this.rows)!;
    this.blocks = pl.map((p) => ({ id: this.nextId++, word: p.word, x: p.x, y: p.y, rot: p.rot }));
    this.selected = null; this.renderAll(!quiet); return null;
  }
  /** 规则配置变了（ADV 价格/张数/预算）：重建词表，已装的卡组裁剪到合法并重排 */
  refreshWords(init = false) {
    const ws = getWords();
    const sig = ws.map((w) => `${w.name}:${w.area}:${w.max}`).join("|") + "/" + capacity();
    if (sig === this.wsig && !init) return;
    const old = counts(this.blocks);
    this.words = ws; this.bn = wordMap(ws); this.wsig = sig;
    const b = boardSize(); this.cols = b.cols; this.rows = b.rows;
    const deck: Deck = {}; let total = 0;
    for (const w of ws) { const k = Math.min(old[w.name] ?? 0, w.max); for (let i = 0; i < k && total + w.area <= capacity(); i++) { deck[w.name] = (deck[w.name] ?? 0) + 1; total += w.area; } }
    const pl = autoPack(expandDeck(deck, this.bn), this.cols, this.rows);
    this.blocks = (pl ?? []).map((p) => ({ id: this.nextId++, word: p.word, x: p.x, y: p.y, rot: p.rot }));
    this.selected = null;
    const sel = this.q<HTMLSelectElement>(".dk-preset");
    sel.length = 1; for (const p of presetsNow()) sel.add(new Option(p.name, p.id));
    if (!init) { this.renderAll(true); this.fit(); }
  }
  setKws(names: string[], values: string[], sub?: string[]) {
    if (this.o.kws) { this.o.kws.names = names; this.o.kws.values = values; if (sub) this.o.kws.sub = sub; this.renderKws(); }
  }
  destroy() {
    this.dead = true; this.ro?.disconnect(); this.drag?.ghost?.remove(); this.drag = null;
    for (const [t, n, f] of this.listeners) t.removeEventListener(n, f);
    this.listeners = []; this.el.remove();
  }
  /** 测试/脚本用 */
  get debug() { return { blocks: this.blocks, cell: this.cell, selected: this.selected }; }

  /* ---------- 内部 ---------- */
  private on(t: EventTarget, n: string, f: (e: any) => void) { t.addEventListener(n, f as EventListener); this.listeners.push([t, n, f as EventListener]); }
  private alive() { if (this.dead) return false; if (!this.el.isConnected) { this.destroy(); return false; } return true; }
  private toast(msg: string) {
    const t = this.q(".dk-toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(this.toastT); this.toastT = window.setTimeout(() => t.classList.remove("show"), 1900);
  }
  private fit() {
    if (!this.alive()) return;
    const w = this.q(".dk-main").clientWidth;
    if (w <= 0) return;
    this.cell = Math.max(34, Math.min(92, Math.floor((w - 12) / this.cols)));
    this.el.style.setProperty("--cell", this.cell + "px");
    this.el.style.setProperty("--cols", String(this.cols));
    this.el.style.setProperty("--rows", String(this.rows));
    this.renderBlocks();
  }
  private faceHTML(w: Word, rot: boolean, k: number | "", withK = true) {
    const col = CAT[w.cat]?.color ?? "#fff"; const d = dims(w, rot);
    const vert = d.w === 1 && d.h > 1 ? "writing-mode:vertical-rl;" : "";
    return { col, html: `<div class="face"><span class="ic">${w.icon}</span><span class="bn" style="${vert}">${w.name}</span>${withK ? `<span class="bk">×${k}</span>` : ""}</div>` };
  }
  private renderBlocks() {
    const cnt = counts(this.blocks), board = this.q(".dk-board");
    board.querySelectorAll(".blk").forEach((e) => e.remove());
    for (const b of this.blocks) {
      const d = dims(b.word, b.rot), el = document.createElement("div"), f = this.faceHTML(b.word, b.rot, cnt[b.word.name]);
      el.className = "blk" + (b.id === this.selected ? " sel" : "");
      el.dataset.id = String(b.id);
      el.dataset.word = b.word.name;
      el.style.cssText = `--c:${f.col};left:${b.x * this.cell}px;top:${b.y * this.cell}px;width:${d.w * this.cell}px;height:${d.h * this.cell}px`;
      el.innerHTML = f.html; board.appendChild(el);
    }
  }
  private renderLib() {
    const cnt = counts(this.blocks), box = this.q(".dk-liblist"); box.innerHTML = "";
    for (const c of CATEGORIES) {
      const ws = this.words.filter((w) => w.cat === c.id); if (!ws.length) continue;
      const sec = document.createElement("div"), shut = this.closed.has(c.id);
      sec.className = "dk-cat" + (shut ? " closed" : ""); sec.style.setProperty("--c", c.color);
      sec.innerHTML = `<button type="button"><i></i>${c.name}<span>${ws.length} ${shut ? "▸" : "▾"}</span></button><div class="dk-items"></div>`;
      sec.querySelector("button")!.onclick = () => { shut ? this.closed.delete(c.id) : this.closed.add(c.id); this.renderLib(); };
      const items = sec.querySelector(".dk-items")!;
      for (const w of ws) {
        const k = cnt[w.name] || 0, full = k >= w.max, it = document.createElement("div");
        it.className = "witem" + (full ? " isfull" : ""); it.dataset.word = w.name; it.style.setProperty("--c", c.color); it.title = w.desc;
        it.innerHTML = `<span class="ic">${w.icon}</span><span class="nm">${w.name}</span><span class="sz">${full ? "已满" : sizeText(w)}</span><span class="k">×<b>${k}</b> / 最多 ${w.max}</span>`;
        items.appendChild(it);
      }
      box.appendChild(sec);
    }
  }
  private shapeHTML(w: Word, rot: boolean) { const d = dims(w, rot); return `<span class="shape" style="grid-template-columns:repeat(${d.w},8px)">${"<i></i>".repeat(d.w * d.h)}</span>`; }
  private renderDetail() {
    const el = this.q(".dk-detail"), sb = this.blocks.find((b) => b.id === this.selected);
    const w = sb ? sb.word : this.hover ? this.bn[this.hover] : null;
    if (!w) { el.innerHTML = '<div class="empty">选一块查看说明。<br>点击词库的词装入，或直接拖到载荷板上。<br>块越大越占地方，容量用完就装不下了。</div>'; return; }
    const c = CAT[w.cat], k = counts(this.blocks)[w.name] || 0, d = dims(w, sb ? sb.rot : false);
    el.style.setProperty("--c", c?.color ?? "#fff");
    el.innerHTML = `<div class="dn"><b>${w.name}</b><span class="tag">${c?.name ?? ""}</span></div>
      <p>${esc(w.desc)}</p><div class="ex">示例　${esc(w.example)}</div>
      <div class="meta"><span>${this.shapeHTML(w, sb ? sb.rot : false)} <b>${d.h}×${d.w}</b>（${area(w)} 格）</span><span>×<b>${k}</b> / 最多 <b>${w.max}</b></span></div>
      ${sb ? '<div class="acts"><button type="button" class="dk-btn" data-a="rot">旋转 R</button><button type="button" class="dk-btn on" data-a="del">移除</button></div>' : ""}`;
  }
  private renderSummary() {
    const cnt = counts(this.blocks), used = usedArea(this.blocks), CAP = this.cols * this.rows;
    const rowsH = this.words.filter((w) => cnt[w.name]).map((w) => `<div class="row" style="--c:${CAT[w.cat]?.color}"><i></i><b>${w.name}</b>×${cnt[w.name]}<em>${cnt[w.name] * area(w)} 格</em></div>`).join("");
    this.q(".dk-summary").innerHTML = `<div class="dk-ph"><b>卡组摘要</b><span class="dk-mute">${this.blocks.length} 张</span></div>${rowsH || '<div class="dk-mute" style="padding:6px 0">还没有装入任何词</div>'}<div class="tot"><span>总占用</span><b>${used} / ${CAP}</b></div>`;
    this.q(".dk-used").textContent = String(used); this.q(".dk-capn").textContent = String(CAP);
    this.q(".dk-cap").classList.toggle("full", used >= CAP);
    const m = this.q(".dk-meter");
    if (m.children.length !== CAP) m.innerHTML = "<i></i>".repeat(CAP);
    m.style.gridTemplateColumns = `repeat(${CAP},1fr)`;
    [...m.children].forEach((e, i) => e.classList.toggle("on", i < used));
    m.classList.toggle("full", used >= CAP);
  }
  private renderKws() {
    const k = this.o.kws, el = this.q(".dk-kws");
    if (!k) return;
    el.hidden = false;
    el.innerHTML = `<div class="dk-kwh"><b>关键词</b><span class="dk-mute">每个随从选一个 · 不占载荷</span></div><div class="dk-kwrow">${k.names.map((n, i) => `<div class="dk-kw"><span class="kn">${esc(n)}${k.sub?.[i] ? `<small>${esc(k.sub[i])}</small>` : ""}</span><div class="dk-kwp">${["random", ...KEYWORDS.map((x) => x.name)].map((kw) => `<button type="button" class="dk-pill${k.values[i] === kw ? " on" : ""}" data-kw="${i}:${kw}" title="${esc(kw === "random" ? "开局随机一个" : KEYWORDS.find((x) => x.name === kw)!.desc)}">${kw === "random" ? "随机" : kw}</button>`).join("")}</div></div>`).join("")}</div>
      <p class="dk-kwd">${KEYWORDS.map((x) => `<b>${x.name}</b>：${esc(x.desc)}`).join("<br>")}</p>`;
  }
  private renderAll(emit = true) {
    this.renderBlocks(); this.renderLib(); this.renderDetail(); this.renderSummary(); this.renderKws();
    if (emit) this.o.onChange(this.getDeck());
  }

  /* ---------- 操作 ---------- */
  private addWord(w: Word, spot?: { x: number; y: number; rot: boolean } | null): Block | null {
    const err = addError(this.blocks, this.cols, this.rows, w);
    if (err === "nospace") {
      // 面积够但被打散了：整体重新排布一次（所有合法卡组都装得下）
      const c = counts(this.blocks); c[w.name] = (c[w.name] || 0) + 1;
      const pl = autoPack(expandDeck(c, this.bn), this.cols, this.rows);
      if (pl) {
        this.blocks = pl.map((p) => ({ id: this.nextId++, word: p.word, x: p.x, y: p.y, rot: p.rot }));
        const nb = [...this.blocks].reverse().find((b) => b.word.name === w.name) ?? null;
        this.selected = nb?.id ?? null; this.renderAll(); this.toast("空位被打散了，已自动重新排布"); return nb;
      }
    }
    if (err) { this.toast(MSG[err](w)); return null; }
    const s = spot || nearestSpot(this.blocks, this.cols, this.rows, w, false, 0, 0, null, true);
    if (!s) { this.toast(MSG.nospace()); return null; }
    const b: Block = { id: this.nextId++, word: w, x: s.x, y: s.y, rot: s.rot };
    this.blocks.push(b); this.selected = b.id; this.renderAll(); return b;
  }
  private remove(id: number) { this.blocks = this.blocks.filter((b) => b.id !== id); if (this.selected === id) this.selected = null; this.renderAll(); }
  private rotate(id: number) {
    const b = this.blocks.find((x) => x.id === id); if (!b) return;
    if (b.word.size[0] === b.word.size[1]) { this.toast("方块不用旋转"); return; }
    const r = !b.rot;
    const s = canPlace(this.blocks, this.cols, this.rows, b.word, r, b.x, b.y, b.id) ? { x: b.x, y: b.y } : nearestSpot(this.blocks, this.cols, this.rows, b.word, r, b.x, b.y, b.id);
    if (!s || Math.abs(s.x - b.x) + Math.abs(s.y - b.y) > 2) { this.toast("这个方向放不下"); return; }
    b.rot = r; b.x = s.x; b.y = s.y; this.renderAll();
  }
  private deckJSON() { return JSON.stringify(this.getDeck()); }

  /* ---------- 拖拽 ---------- */
  private pointerCell(ev: PointerEvent, off: { x: number; y: number }) {
    const r = this.q(".dk-board").getBoundingClientRect(), c = this.cell;
    return { x: Math.round((ev.clientX - r.left - off.x) / c), y: Math.round((ev.clientY - r.top - off.y) / c), inside: ev.clientX > r.left - c && ev.clientX < r.right + c && ev.clientY > r.top - c && ev.clientY < r.bottom + c };
  }
  private ensureGhost() {
    const dg = this.drag!; if (dg.ghost) return;
    const d = dims(dg.word, dg.rot), g = document.createElement("div"), f = this.faceHTML(dg.word, dg.rot, "", false);
    g.className = "dk-ghost"; g.style.cssText = `--c:${f.col};width:${d.w * this.cell}px;height:${d.h * this.cell}px`;
    g.innerHTML = f.html; (g.firstChild as HTMLElement).style.inset = "3px";
    document.body.appendChild(g); dg.ghost = g;
    if (dg.id) this.q(".dk-board").querySelector(`.blk[data-id="${dg.id}"]`)?.classList.add("drag");
  }
  private updateDrag(ev: PointerEvent) {
    const dg = this.drag; if (!dg) return;
    if (!dg.active) { if (Math.hypot(ev.clientX - dg.sx, ev.clientY - dg.sy) < 6) return; dg.active = true; this.ensureGhost(); }
    const d = dims(dg.word, dg.rot), c = this.cell, pv = this.q(".dk-preview"); dg.last = ev;
    const g = dg.ghost!; g.style.width = d.w * c + "px"; g.style.height = d.h * c + "px";
    const off = dg.off || { x: (d.w * c) / 2, y: (d.h * c) / 2 };
    g.style.left = ev.clientX - off.x + "px"; g.style.top = ev.clientY - off.y + "px";
    const pc = this.pointerCell(ev, off);
    if (!pc.inside) { pv.style.display = "none"; dg.spot = null; return; }
    const spot = nearestSpot(this.blocks, this.cols, this.rows, dg.word, dg.rot, pc.x, pc.y, dg.id);
    dg.spot = spot;
    if (!spot) { pv.style.display = "block"; pv.className = "dk-preview bad"; Object.assign(pv.style, { left: pc.x * c + "px", top: pc.y * c + "px", width: d.w * c + "px", height: d.h * c + "px" }); return; }
    pv.className = "dk-preview";
    Object.assign(pv.style, { display: "block", left: spot.x * c + "px", top: spot.y * c + "px", width: d.w * c + "px", height: d.h * c + "px" });
  }
  private endDrag() {
    const dg = this.drag; if (!dg) return; this.drag = null;
    dg.ghost?.remove(); this.q(".dk-preview").style.display = "none";
    this.q(".dk-board").querySelectorAll(".drag").forEach((e) => e.classList.remove("drag"));
    if (!dg.active) { if (dg.kind === "lib") this.addWord(dg.word); else { this.selected = dg.id ?? null; this.renderAll(false); } return; }
    if (!dg.spot) { if (dg.kind === "lib" && dg.last) this.toast("这里放不下"); this.renderBlocks(); return; }
    if (dg.kind === "lib") {
      const err = addError(this.blocks, this.cols, this.rows, dg.word);
      if (err === "full" || err === "capacity") { this.toast(MSG[err](dg.word)); return; }
      this.addWord(dg.word, dg.spot);
    } else {
      const b = this.blocks.find((x) => x.id === dg.id)!;
      b.x = dg.spot.x; b.y = dg.spot.y; b.rot = dg.rot; this.selected = b.id; this.renderAll();
    }
  }

  private bind() {
    const board = this.q(".dk-board"), lib = this.q(".dk-liblist");
    this.on(window, "pointermove", (e: PointerEvent) => { if (this.alive()) this.updateDrag(e); });
    this.on(window, "pointerup", () => { if (this.alive()) this.endDrag(); });
    this.on(window, "pointercancel", () => { if (this.drag) { this.drag.ghost?.remove(); this.q(".dk-preview").style.display = "none"; this.drag = null; this.renderBlocks(); } });
    this.on(document, "pointerdown", (e: PointerEvent) => { this.active = this.el.contains(e.target as Node); });
    board.addEventListener("pointerdown", (ev: PointerEvent) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>(".blk");
      if (!el) { this.selected = null; this.renderDetail(); this.renderBlocks(); return; }
      const b = this.blocks.find((x) => x.id === +el.dataset.id!)!, r = el.getBoundingClientRect();
      this.selected = b.id; this.renderDetail();
      board.querySelectorAll<HTMLElement>(".blk").forEach((e) => e.classList.toggle("sel", +e.dataset.id! === b.id));
      this.drag = { kind: "block", id: b.id, word: b.word, rot: b.rot, sx: ev.clientX, sy: ev.clientY, active: false, spot: null, off: { x: ev.clientX - r.left, y: ev.clientY - r.top } };
      ev.preventDefault();
    });
    lib.addEventListener("pointerdown", (ev) => {
      const e = ev as PointerEvent, it = (e.target as HTMLElement).closest<HTMLElement>(".witem"); if (!it || e.button > 0) return;
      const w = this.bn[it.dataset.word!];
      if (it.classList.contains("isfull")) { this.toast(MSG.full(w)); return; }
      if (e.pointerType === "mouse") { this.drag = { kind: "lib", word: w, rot: false, sx: e.clientX, sy: e.clientY, active: false, spot: null }; e.preventDefault(); }
      else it.dataset.tap = "1";
    });
    lib.addEventListener("click", (e) => {
      const it = (e.target as HTMLElement).closest<HTMLElement>(".witem"); if (!it) return;
      if (it.dataset.tap) { delete it.dataset.tap; this.addWord(this.bn[it.dataset.word!]); }
    });
    lib.addEventListener("pointerover", (e) => {
      const it = (e.target as HTMLElement).closest<HTMLElement>(".witem"); if (!it || this.drag) return;
      this.hover = it.dataset.word!; if (this.selected == null) this.renderDetail();
    });
    lib.addEventListener("pointerleave", () => { this.hover = null; if (this.selected == null) this.renderDetail(); });
    this.on(window, "keydown", (ev: KeyboardEvent) => {
      if (!this.alive() || !this.active) return;
      if ((ev.target as HTMLElement).closest("input,textarea,select")) return;
      const k = ev.key.toLowerCase();
      if (k === "r") { if (this.drag?.active) { this.drag.rot = !this.drag.rot; this.updateDrag(this.drag.last!); } else if (this.selected != null) this.rotate(this.selected); }
      else if ((k === "delete" || k === "backspace") && this.selected != null) { this.remove(this.selected); ev.preventDefault(); }
      else if (k === "escape") { this.selected = null; this.renderAll(false); }
    });
    // 顶栏、详情按钮、关键词、抽屉
    this.el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("button"); if (!t) return;
      const a = t.dataset.a;
      if (t.dataset.kw) { const [i, k] = t.dataset.kw.split(":"); this.o.kws?.onPick(+i, k); if (this.o.kws) { this.o.kws.values[+i] = k; this.renderKws(); } return; }
      if (t.classList.contains("dk-drawerbtn")) { const o = this.el.classList.toggle("drawer"); t.textContent = o ? "收起 ▾" : "词库 ▴"; return; }
      if (a === "rot" && this.selected != null) this.rotate(this.selected);
      else if (a === "del" && this.selected != null) this.remove(this.selected);
      else if (a === "clear") { this.blocks = []; this.selected = null; this.renderAll(); }
      else if (a === "auto") {
        if (!this.blocks.length) { this.toast("还没有装入任何词"); return; }
        const err = this.setDeck(counts(this.blocks), false); this.toast(err ?? "已重新排布");
      }
      else if (a === "io") { const io = this.q(".dk-io"); io.hidden = !io.hidden; if (!io.hidden) { this.q<HTMLTextAreaElement>(".dk-io textarea").value = this.deckJSON(); this.q(".dk-ioerr").textContent = ""; } }
      else if (a === "copy") this.copyJSON();
      else if (a === "import") this.importJSON();
    });
    this.q<HTMLSelectElement>(".dk-preset").onchange = (e) => {
      const sel = e.target as HTMLSelectElement, p = PRESETS.find((x) => x.id === sel.value); sel.value = ""; if (!p) return;
      const err = this.setDeck(p.deck); if (err) this.toast("这套配置装不下：" + err); else this.toast(`已载入「${p.name}」`);
    };
  }
  private async copyJSON() {
    const s = this.deckJSON(), ta = this.q<HTMLTextAreaElement>(".dk-io textarea"); ta.value = s;
    try { await navigator.clipboard.writeText(s); this.toast("已复制：" + s); } catch { ta.select(); try { document.execCommand("copy"); this.toast("已复制：" + s); } catch { this.toast("请手动复制文本框内容"); } }
  }
  private importJSON() {
    const err = this.q(".dk-ioerr"), ta = this.q<HTMLTextAreaElement>(".dk-io textarea");
    let obj: any;
    try { obj = JSON.parse(ta.value); } catch { err.textContent = "JSON 解析失败"; return; }
    if (obj && typeof obj === "object" && !Array.isArray(obj) && ("deck" in obj || "kws" in obj)) {
      const kws = obj.kws; const deck = obj.deck ?? Object.fromEntries(Object.entries(obj).filter(([k]) => k !== "kws"));
      if (Array.isArray(kws) && kws.length === 3 && this.o.onImportKws) this.o.onImportKws(kws.map(String));
      obj = deck;
    }
    const bad = validateDeck(obj, this.bn); if (bad) { err.textContent = bad; return; }
    this.setDeck(obj); err.textContent = ""; this.toast("已导入");
  }
}

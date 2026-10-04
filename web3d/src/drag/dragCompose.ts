// 场景里的拖拽拼句：
//   · 从我方随从按住拖到另一个随从上 = 把「选择 1 敌方/友方」填进句子（拖到自己身上 / 双击自己 = 「自身」）；
//   · 面板开着时在人物外按住拖出一个框 = 把当前这一段的目标改成框到的随从（不合法就提示原因）。
// 只管鼠标和画线，规则都在 Composer.dragTo / boxTargets 里。拖的时候面板变半透明、不挡鼠标；
// 随从的「选取框」按它们在场上的屏幕位置算（底座 + 人物整体投到屏幕上的外接矩形）。
import * as THREE from "three";
import type { UnitCard } from "../unitCard";
import { FIG } from "../unitCard";
import { uidOfCard, type Game } from "../game";

export interface DragEnv {
  dom: HTMLElement;                       // 3D 画布
  camera: THREE.Camera;
  cards: UnitCard[];
  /** 当前取景下画布的宽高（CSS 像素） */
  size: () => [number, number];
  /** 屏幕上鼠标下面是哪张卡（没有 = null） */
  pick: (e: PointerEvent | MouseEvent) => UnitCard | null;
  game: () => { dragFromProblem(uid: number): string; dragDrop(a: number, t: number, self?: boolean): void; dragBox(u: number[]): void; active: boolean; ui?: string } | Game | null;
}

type Rect = { x0: number; y0: number; x1: number; y1: number };
const SVGNS = "http://www.w3.org/2000/svg";
let styled = false;
function css() {
  if (styled) return;
  styled = true;
  const s = document.createElement("style");
  s.textContent = `
.dc-layer { position: fixed; inset: 0; pointer-events: none; z-index: 7; }
.dc-layer svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.dc-link { stroke-width: 3; stroke-linecap: round; fill: none; filter: drop-shadow(0 0 6px currentColor); }
.dc-dot { filter: drop-shadow(0 0 6px currentColor); }
.dc-box { fill: rgba(120, 200, 255, 0.12); stroke: #8fd4ff; stroke-width: 1.5; stroke-dasharray: 6 4; }
.dc-tip { position: absolute; padding: 3px 10px; font: 600 12px "Noto Sans SC", sans-serif; color: #dff3ff; background: rgba(8, 18, 36, 0.85); border: 1px solid rgba(140, 200, 255, 0.5); transform: translate(-50%, -140%); white-space: nowrap; }
body.dc-dragging .gm-pop, body.dc-dragging .ro-layer .ro { opacity: 0.35 !important; pointer-events: none !important; transition: opacity 0.12s; }
body.dc-dragging { cursor: crosshair; }
`;
  document.head.appendChild(s);
}

export class DragCompose {
  private layer = document.createElement("div");
  private svg = document.createElementNS(SVGNS, "svg");
  private line = document.createElementNS(SVGNS, "line");
  private dot = document.createElementNS(SVGNS, "circle");
  private box = document.createElementNS(SVGNS, "rect");
  private tip = document.createElement("div");
  private st: null | { kind: "link" | "box"; actor: number; x0: number; y0: number; on: boolean; id: number } = null;
  private hot = new Set<UnitCard>();
  private swallow = false;
  private v = new THREE.Vector3();

  constructor(private env: DragEnv) {
    css();
    this.layer.className = "dc-layer";
    this.line.setAttribute("class", "dc-link"); this.dot.setAttribute("class", "dc-dot"); this.dot.setAttribute("r", "6");
    this.box.setAttribute("class", "dc-box");
    for (const e of [this.line, this.dot, this.box]) (e as SVGElement).style.display = "none";
    this.svg.append(this.box, this.line, this.dot);
    this.tip.className = "dc-tip"; this.tip.hidden = true;
    this.layer.append(this.svg, this.tip);
    document.body.appendChild(this.layer);
    const d = env.dom;
    d.addEventListener("pointerdown", (e) => this.down(e));
    d.addEventListener("pointermove", (e) => this.move(e));
    d.addEventListener("pointerup", (e) => this.up(e));
    d.addEventListener("pointercancel", () => this.end());
    d.addEventListener("dblclick", (e) => this.dbl(e));
    // 拖完松手会再触发一次 click：在捕获阶段吞掉，免得被当成「点空白处」或「点随从」
    d.addEventListener("click", (e) => { if (this.swallow) { this.swallow = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  private g() { const g = this.env.game() as any; return g && g.active ? g : null; }
  private rect(e: MouseEvent) { return this.env.dom.getBoundingClientRect(); }
  private xy(e: MouseEvent): [number, number] { const r = this.rect(e); return [e.clientX - r.left, e.clientY - r.top]; }
  private screenOf(uid: number): [number, number] {
    const c = this.env.cards[uid < 3 ? 3 + uid : uid - 3], p = c.root.position;
    const [w, h] = this.env.size();
    this.env.camera.updateMatrixWorld();
    this.v.set(p.x, 1.1, p.z).project(this.env.camera);
    return [((this.v.x + 1) / 2) * w, ((1 - this.v.y) / 2) * h];
  }
  /** 随从的选取框：底座 + 人物整体投到屏幕上的外接矩形 */
  private bbox(c: UnitCard): Rect {
    const p = c.root.position, [w, h] = this.env.size();
    this.env.camera.updateMatrixWorld();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const dx of [-1.2, 1.2]) for (const dz of [-0.95, 0.95]) for (const y of [0, FIG.h + 0.35]) {
      this.v.set(p.x + dx, y, p.z + dz).project(this.env.camera);
      const X = ((this.v.x + 1) / 2) * w, Y = ((1 - this.v.y) / 2) * h;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    return { x0, y0, x1, y1 };
  }
  private inBox(c: UnitCard, r: Rect): boolean {
    const b = this.bbox(c);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1) return true;     // 框住了它的中心
    const ix = Math.max(0, Math.min(b.x1, r.x1) - Math.max(b.x0, r.x0)), iy = Math.max(0, Math.min(b.y1, r.y1) - Math.max(b.y0, r.y0));
    return ix * iy >= 0.35 * (b.x1 - b.x0) * (b.y1 - b.y0);                       // 或者盖住了它的大半
  }

  private down(e: PointerEvent) {
    if (e.button !== 0) return;
    const g = this.g();
    if (!g) return;
    const [x, y] = this.xy(e);
    const hit = this.env.pick(e);
    if (hit) {
      const uid = uidOfCard(this.env.cards.indexOf(hit));
      if (uid < 3 && !g.dragFromProblem(uid)) { this.st = { kind: "link", actor: uid, x0: x, y0: y, on: false, id: e.pointerId }; this.env.dom.setPointerCapture(e.pointerId); }
    } else if (g.ui === "compose") {
      this.st = { kind: "box", actor: -1, x0: x, y0: y, on: false, id: e.pointerId };
      this.env.dom.setPointerCapture(e.pointerId);
    }
  }
  private move(e: PointerEvent) {
    const s = this.st;
    if (!s) return;
    const [x, y] = this.xy(e);
    if (!s.on) {
      if (Math.hypot(x - s.x0, y - s.y0) < 8) return;
      s.on = true;
      document.body.classList.add("dc-dragging");
    }
    this.clearHot();
    if (s.kind === "link") {
      const [ax, ay] = this.screenOf(s.actor);
      const over = this.env.pick(e);
      const tuid = over ? uidOfCard(this.env.cards.indexOf(over)) : -1;
      const col = tuid < 0 ? "#cfe6ff" : tuid === s.actor ? "#ffe08a" : this.env.cards.indexOf(over!) < 3 ? "#ff7a8a" : "#7affc8";
      this.line.setAttribute("x1", String(ax)); this.line.setAttribute("y1", String(ay)); this.line.setAttribute("x2", String(x)); this.line.setAttribute("y2", String(y));
      this.line.setAttribute("stroke", col); (this.line as SVGElement).style.color = col; (this.line as SVGElement).style.display = "";
      this.dot.setAttribute("cx", String(x)); this.dot.setAttribute("cy", String(y)); this.dot.setAttribute("fill", col); (this.dot as SVGElement).style.color = col; (this.dot as SVGElement).style.display = "";
      if (over) { over.setHover(true); this.hot.add(over); }
    } else {
      const r = { x0: Math.min(s.x0, x), y0: Math.min(s.y0, y), x1: Math.max(s.x0, x), y1: Math.max(s.y0, y) };
      this.box.setAttribute("x", String(r.x0)); this.box.setAttribute("y", String(r.y0)); this.box.setAttribute("width", String(r.x1 - r.x0)); this.box.setAttribute("height", String(r.y1 - r.y0));
      (this.box as SVGElement).style.display = "";
      for (const c of this.env.cards) if (this.inBox(c, r)) { c.setHover(true); this.hot.add(c); }
    }
  }
  private up(e: PointerEvent) {
    const s = this.st;
    if (!s) return;
    const g = this.g();
    const [x, y] = this.xy(e);
    const wasOn = s.on;
    if (wasOn && g) {
      this.swallow = true;
      if (s.kind === "link") {
        const over = this.env.pick(e);
        if (over) g.dragDrop(s.actor, uidOfCard(this.env.cards.indexOf(over)));
      } else {
        const r = { x0: Math.min(s.x0, x), y0: Math.min(s.y0, y), x1: Math.max(s.x0, x), y1: Math.max(s.y0, y) };
        const uids = this.env.cards.filter((c) => this.inBox(c, r)).map((c) => uidOfCard(this.env.cards.indexOf(c)));
        g.dragBox(uids);
      }
    }
    this.end();
  }
  private dbl(e: MouseEvent) {
    const g = this.g();
    if (!g || g.ui !== "compose") return;
    const hit = this.env.pick(e);
    if (!hit) return;
    const uid = uidOfCard(this.env.cards.indexOf(hit));
    if (uid < 3) g.dragDrop(uid, uid, true);
  }
  private clearHot() { for (const c of this.hot) c.setHover(false); this.hot.clear(); }
  private end() {
    const s = this.st;
    if (s) { try { this.env.dom.releasePointerCapture(s.id); } catch { /* 已经释放 */ } }
    this.st = null;
    this.clearHot();
    document.body.classList.remove("dc-dragging");
    for (const e of [this.line, this.dot, this.box]) (e as SVGElement).style.display = "none";
    this.tip.hidden = true;
  }
}

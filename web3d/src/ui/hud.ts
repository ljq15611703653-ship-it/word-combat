// 通用 HUD 小工具（配合 hud.css）：智能眼镜上的信息元素。DOM 部件 + Canvas 绘制函数，不依赖任何具体界面。
import "./hud.css";

export interface HudFrameOpts {
  /** 四角读数，每个是若干行文字（可含 <b>、<span class="ok">） */
  tl?: string[]; tr?: string[]; bl?: string[]; br?: string[];
  /** 中心准星 */
  reticle?: boolean;
  /** 扫描线（默认开） */
  scan?: boolean;
}
export interface HudFrame {
  el: HTMLElement;
  setReadout(corner: "tl" | "tr" | "bl" | "br", lines: string[]): void;
  glitch(): void;
  destroy(): void;
}

function div(cls: string) { const d = document.createElement("div"); d.className = cls; return d; }

/** 创建一整套 HUD 边框（扫描线、四角括号、读数、准星），append 到 parent 里。 */
export function createHudFrame(parent: HTMLElement, o: HudFrameOpts = {}): HudFrame {
  const el = div("hud-root");
  if (o.scan !== false) el.append(div("hud-scan"));
  for (const k of ["tl", "tr", "bl", "br"]) el.append(div(`hud-corner ${k}`));
  const reads: Record<string, HTMLElement> = {};
  for (const k of ["tl", "tr", "bl", "br"] as const) {
    const r = div(`hud-readout ${k}`); reads[k] = r; el.append(r);
    if (o[k]) r.innerHTML = o[k]!.join("\n");
  }
  if (o.reticle) { const r = div("hud-reticle"); r.innerHTML = "<i></i><i></i><i></i><i></i>"; el.append(r); }
  parent.append(el);
  return {
    el,
    setReadout(c, lines) { reads[c].innerHTML = lines.join("\n"); },
    glitch() { glitchOnce(el); },
    destroy() { el.remove(); },
  };
}

/** 一次性故障闪动 */
export function glitchOnce(el: HTMLElement) { el.classList.remove("hud-glitch"); void el.offsetWidth; el.classList.add("hud-glitch"); }

/** 分段读数条：返回 el 与 set(0~1) */
export function hudBar(segments = 10): { el: HTMLElement; set(v: number): void } {
  const el = div("hud-bar"); const us: HTMLElement[] = [];
  for (let i = 0; i < segments; i++) { const s = document.createElement("i"); const u = document.createElement("u"); s.append(u); el.append(s); us.push(u); }
  return { el, set(v) { us.forEach((u, i) => { u.style.transform = `scaleX(${Math.max(0, Math.min(1, v * segments - i))})`; }); } };
}

export interface LockBox { el: HTMLElement; show(x: number, y: number, w: number, h: number, label: string, info?: string, color?: string): void; hide(): void }
/** 目标锁定框。x/y/w/h 为占 parent 的百分比（0~100）。 */
export function hudLockBox(parent: HTMLElement): LockBox {
  const el = div("hud-lock"); el.innerHTML = "<i class=a></i><i class=b></i><span></span><em></em>"; parent.append(el);
  const span = el.querySelector("span")!, em = el.querySelector("em")!;
  let key = "";
  return {
    el,
    show(x, y, w, h, label, info = "", color = "") {
      el.style.left = `${x}%`; el.style.top = `${y}%`; el.style.width = `${w}%`; el.style.height = `${h}%`;
      if (color) el.style.setProperty("--lock-c", color); else el.style.removeProperty("--lock-c");
      const k = label + info;
      if (k !== key) { key = k; span.textContent = label; em.textContent = info; }
      if (!el.classList.contains("on")) { void el.offsetWidth; el.classList.add("on"); }
    },
    hide() { el.classList.remove("on"); key = ""; },
  };
}

// ---- Canvas 版：括号、准星 ----
export function drawBrackets(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = "#19e6ff", len = 20, lw = 3) {
  c.save(); c.strokeStyle = color; c.lineWidth = lw; c.shadowColor = color; c.shadowBlur = 8; c.beginPath();
  c.moveTo(x, y + len); c.lineTo(x, y); c.lineTo(x + len, y);
  c.moveTo(x + w - len, y); c.lineTo(x + w, y); c.lineTo(x + w, y + len);
  c.moveTo(x + w, y + h - len); c.lineTo(x + w, y + h); c.lineTo(x + w - len, y + h);
  c.moveTo(x + len, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - len);
  c.stroke(); c.restore();
}
export function drawReticle(c: CanvasRenderingContext2D, x: number, y: number, r = 26, color = "#19e6ff", rot = 0) {
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = 1.5; c.shadowColor = color; c.shadowBlur = 6;
  c.rotate(rot); c.beginPath(); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.moveTo(r, 0); c.arc(0, 0, r, 0, 0.9); }
  c.stroke(); c.rotate(-rot);
  c.beginPath(); c.moveTo(-r - 10, 0); c.lineTo(-r + 6, 0); c.moveTo(r + 10, 0); c.lineTo(r - 6, 0); c.moveTo(0, -r - 10); c.lineTo(0, -r + 6); c.moveTo(0, r + 10); c.lineTo(0, r - 6); c.stroke();
  c.fillStyle = color; c.beginPath(); c.arc(0, 0, 2, 0, 6.283); c.fill(); c.restore();
}

/** 画布故障：把当前画布内容横向切片错位（内部用像素坐标）。intensity 0~1，t 为秒，约 24Hz 变化。 */
export function canvasGlitch(c: CanvasRenderingContext2D, intensity: number, t: number) {
  if (intensity < 0.03) return;
  const cv = c.canvas, w = cv.width, h = cv.height;
  let a = (Math.floor(t * 24) * 2654435761) >>> 0; const R = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const n = Math.ceil(intensity * 7);
  for (let i = 0; i < n; i++) {
    const sh = h * (0.01 + R() * 0.07), sy = R() * (h - sh), dx = (R() - 0.5) * w * 0.07 * (0.3 + intensity);
    c.drawImage(cv, 0, sy, w, sh, dx, sy, w, sh);
  }
  c.restore();
}

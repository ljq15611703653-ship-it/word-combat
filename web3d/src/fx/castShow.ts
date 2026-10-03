// 技能演出（纯表现层）：结算回放时，每一句话演一遍——
//   镜头拉近出手随从的卡 → 这句的词牌从读数面板里飞起来 → 飞到随从身上的透明盔甲壳（armor.ts）并和它的动作绑在一起 →
//   按职业各自的方式拼装 / 循环 / 锁定 / 渗血 → 分句打出去（伤害打到目标、治疗落在友方……）→ 命中的同一刻才应用结算
//   （血条、伤害数字、击倒由 step() 同步出现，不演两次）→ 词牌飞回原位，镜头拉回。
// 不改规则、不改数值：事件序列原样交给 step()，只是把「什么时候交」和「交的时候放什么特效」排好。
// 接入：Game.playEvents()（game.ts）/ Live.resolve()（live.ts）。没有 cast 时行为和原来完全一样。
import * as THREE from "three";
import { FIG, EMIT, CARD, type UnitCard } from "../unitCard";
import { tokEl, type SentencePanel } from "../sentencePanel";
import { actionToks, cardIndex } from "../live";
import type { Tok } from "../words";
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CastView { look: THREE.Vector3; dist: number; offY: number; offX: number }
export interface CastEnv {
  camera: THREE.PerspectiveCamera;
  app: HTMLElement;
  cards: UnitCard[];
  panels: SentencePanel[];
  /** 场景当前的取景目标：演出往里写，场景自己平滑地追 */
  goal: CastView;
  /** 把这些世界坐标点塞进可用区，返回镜头参数 */
  solve: (pts: THREE.Vector3[]) => CastView;
  /** 回到默认取景（整桌） */
  release: () => void;
}
export interface CastRound {
  M: any;
  events: any[];
  /** 本轮宣告的句子（resolveRound 之前拷贝的 M.declared） */
  decl: any[];
  /** 应用一个事件：写日志 + 血条 + 受击。演出只决定什么时候调用它 */
  step: (ev: any) => void;
  alive: () => boolean;
  fast: () => boolean;
}

type Cls = "并" | "续" | "择" | "血";
const CLS_COL: Record<Cls, string> = { 并: "#d6e6ff", 续: "#ffd24a", 择: "#62ffb0", 血: "#ff4a5e" };
const KIND_COL: Record<string, string> = { atk: "#ff7a5c", heal: "#5dffb0", mit: "#5cc8ff", st: "#ff5dc8", redirect: "#ffd24a", delay: "#cfa37f", remove: "#e9fffb" };
const ST_COL: Record<string, string> = { 易伤: "#ff5d73", 灼烧: "#ffa23a", 衰弱: "#b58cff" };
const PAYLOAD = new Set(["造成", "伤害", "施加", "恢复", "减少", "增加", "转为", "自身", "移除", "延后", "重复", "持续", "易伤", "灼烧", "衰弱"]);
const KIND_OF_EV: Record<string, string> = { hit: "atk", redirected: "atk", heal: "heal", mit: "mit", status: "st", listen: "redirect", delay: "delay", remove: "remove" };
const EFFECT_EV = new Set(["hit", "redirected", "heal", "mit", "status", "listen", "delay", "remove", "lock", "cont_set", "ko", "endure"]);
const BASE = 0.8;       // 正常速度的整体系数（1 = 最慢最完整）
const FASTK = 0.36;     // 「动画：快」

// ------------------------------------------------------------ 数学小工具
const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  io: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t: number) => t * t * t,
  back: (t: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface P { x: number; y: number; s: number; r: number; o: number; fl: number }
type PF = (t: number) => P;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpP = (a: P, b: P, k: number): P => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k), r: lerp(a.r, b.r, k), o: lerp(a.o, b.o, k), fl: lerp(a.fl, b.fl, k) });

interface Chip {
  el: HTMLElement; face: HTMLElement; tok: Tok; i: number; w: number; h: number;
  f: PF; cur: P; payload: boolean; home: HTMLElement | null; panel: SentencePanel;
  trail?: { col: string; kind: string }; numV?: number; rest?: PF; flip: number;
}
interface Part {
  k: "spark" | "dot" | "ring" | "drop" | "line" | "ember" | "plus";
  x: number; y: number; vx: number; vy: number; g: number; t: number; life: number; size: number; col: string; x2?: number; y2?: number; r1?: number;
}
interface Bucket { kind: string; ci: number; evs: any[]; locks: any[]; first: number; last: number }

let styled = false;
function injectCss() {
  if (styled) return;
  styled = true;
  const s = document.createElement("style");
  s.textContent = `
.cs-layer { position: fixed; inset: 0; pointer-events: none; z-index: 4; overflow: hidden; }
.cs-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.cs-chip { position: absolute; left: 0; top: 0; will-change: transform, opacity; transform-style: preserve-3d; font: 700 18px "Noto Sans SC", "PingFang SC", sans-serif; }
.cs-chip .f, .cs-chip .b { padding: 3px 10px 4px; border-radius: 6px; white-space: nowrap; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  background: linear-gradient(180deg, rgba(16, 52, 46, 0.96), rgba(4, 24, 20, 0.96));
  border: 1px solid color-mix(in srgb, var(--c, #fff) 75%, #000);
  box-shadow: 0 0 14px color-mix(in srgb, var(--c, #fff) 42%, transparent), inset 0 0 8px color-mix(in srgb, var(--c, #fff) 24%, transparent); }
.cs-chip .b { position: absolute; inset: 0; transform: rotateY(180deg); display: flex; align-items: center; justify-content: center; color: var(--c, #fff); font-size: 15px; letter-spacing: 0.1em;
  background: repeating-linear-gradient(45deg, rgba(10, 46, 40, 0.98) 0 6px, rgba(4, 24, 20, 0.98) 6px 12px); }
.cs-chip .w { color: var(--c, #fff); text-shadow: 0 0 8px color-mix(in srgb, var(--c, #fff) 60%, transparent); }
.cs-chip .w[data-tier="3"] { background: linear-gradient(90deg, #ffc7f1, #bdeeff, #fff3b8, #c8ffe0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cs-chip .w.w-unit { border: 0; background: none; padding: 0; }
.cs-chip .w.w-num { color: #fff; font-family: "Chakra Petch", monospace; font-size: 1.12em; }
.cs-chip .w.fresh { animation: none; }
.cs-chip.pay .f { box-shadow: 0 0 22px color-mix(in srgb, var(--c, #fff) 70%, transparent), inset 0 0 10px color-mix(in srgb, var(--c, #fff) 38%, transparent); }
.cs-chip.metal .f { background: linear-gradient(180deg, #55606a, #1c2329 55%, #3b454e); border-color: #cfd8d6; box-shadow: 0 1px 0 #fff6 inset, 0 0 12px rgba(200, 220, 255, 0.35); }
.cs-chip.metal .w { text-shadow: 0 1px 0 #000; }
.cs-chip.crack .f { border-color: #ff4a5e; background: linear-gradient(180deg, rgba(70, 8, 16, 0.96), rgba(24, 2, 6, 0.96)); animation: cs-throb 0.42s ease-in-out infinite; }
.cs-chip.crack .f::after { content: ""; position: absolute; inset: 0; border-radius: 6px; pointer-events: none;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'><path d='M30 0 L38 14 L28 20 L40 32 L36 40 M72 0 L64 10 L74 18 L62 26 L68 40 M0 22 L16 18 L22 26' fill='none' stroke='%23ff6a7a' stroke-width='1.6'/></svg>") center/100% 100% no-repeat; filter: drop-shadow(0 0 3px #ff2a44); }
@keyframes cs-throb { 0%, 100% { box-shadow: 0 0 10px rgba(255, 60, 80, 0.5); } 50% { box-shadow: 0 0 24px rgba(255, 60, 80, 0.95); } }
.cs-chip.lock .f { border-color: #62ffb0; }
.cs-pop { position: absolute; left: 0; top: 0; font: 800 32px "Chakra Petch", "Noto Sans SC", monospace; white-space: nowrap; color: var(--c, #fff); text-shadow: 0 0 14px var(--c, #fff), 0 2px 3px #000; animation: cs-rise 1.05s cubic-bezier(.2, .8, .3, 1) both; }
.cs-pop small { font-size: 0.5em; margin-left: 5px; letter-spacing: 0.08em; opacity: 0.9; }
.cs-pop[data-cls="并"] { color: #fff2dc; text-shadow: 0 0 10px #ffb45a, 0 2px 0 #3a2410, 0 0 2px #fff; letter-spacing: 0.02em; }
.cs-pop[data-cls="续"] { color: #fff4b8; text-shadow: 0 0 14px #ffd24a, 0 0 4px #5cf; }
.cs-pop[data-cls="择"] { color: #d8fff0; text-shadow: 0 0 12px #2cff98, 0 0 2px #fff; }
.cs-pop[data-cls="血"] { color: #ffd6da; text-shadow: 0 0 12px #ff1f3d, 0 3px 0 #4a0510; }
.cs-pop.big { font-size: 44px; }
.cs-pop.tag { font-size: 24px; }
@keyframes cs-rise { 0% { opacity: 0; transform: translate(var(--x), calc(var(--y) + 10px)) translate(-50%, -50%) scale(0.4); }
  14% { opacity: 1; transform: translate(var(--x), var(--y)) translate(-50%, -50%) scale(1.3); }
  30% { transform: translate(var(--x), var(--y)) translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(var(--x), calc(var(--y) - 54px)) translate(-50%, -50%) scale(1); } }
.cs-hold .cs-pop { animation-play-state: paused; }
.cs-hint { position: absolute; left: 14px; bottom: 14px; padding: 3px 10px; font: 12px "Noto Sans SC", sans-serif; color: #a6f3e2; background: rgba(4, 28, 24, 0.7); border: 1px solid rgba(31, 214, 180, 0.35); border-radius: 12px; letter-spacing: 0.06em; }
`;
  document.head.appendChild(s);
}

export class CastShow {
  private layer = document.createElement("div");
  private canvas = document.createElement("canvas");
  private g = this.canvas.getContext("2d")!;
  private hint = document.createElement("div");
  private chips: Chip[] = [];
  private parts: Part[] = [];
  private layers: ((g: CanvasRenderingContext2D, t: number) => boolean | void)[] = [];
  private timers: { at: number; res: () => void }[] = [];
  private tw: { c: Chip; a: number; b: number; t0: number; d: number }[] = [];
  private fxActive = new Map<UnitCard, { k: number; swing: number }>();
  private clock = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private skipped = false;
  private holding = false;
  private speedFast: () => boolean = () => false;
  private t0 = 0;
  private v = new THREE.Vector3();
  private W = 1;
  private H = 1;
  /** 调试 / 自动化：window.__cast = { pauseAt: "assemble" } 会在该时刻冻结画面 */
  private dbg = () => (window as any).__cast as { pauseAt?: string | string[]; paused?: string; scale?: number; cur?: any } | undefined;

  constructor(private env: CastEnv) {
    injectCss();
    this.layer.className = "cs-layer";
    this.canvas.className = "cs-canvas";
    this.hint.className = "cs-hint";
    this.hint.textContent = "点击或按 Esc 跳过演出";
    this.layer.append(this.canvas, this.hint);
    this.layer.hidden = true;
    document.body.appendChild(this.layer);
  }

  get active() { return this.running; }
  skip() { if (!this.running || this.skipped) return; this.skipped = true; this.cleanup(); for (const t of this.timers.splice(0)) t.res(); }

  // ------------------------------------------------------------ 时间
  private get sp() { return (this.speedFast() ? FASTK : BASE) * (this.dbg()?.scale ?? 1); }
  private wait(ms: number): Promise<void> {
    if (this.skipped) return Promise.resolve();
    return new Promise((res) => this.timers.push({ at: this.clock + ms * this.sp, res }));
  }
  private async hold(name: string) {
    const d = this.dbg();
    const on = () => !!d && (Array.isArray(d.pauseAt) ? d.pauseAt.includes(name) : d.pauseAt === name);
    if (!d || !on() || this.skipped) return;
    if (name === "hit") await new Promise((r) => setTimeout(r, 320));   // 让命中数字先弹出来再冻结
    d.paused = name;
    this.holding = true;
    this.layer.classList.add("cs-hold");
    await new Promise<void>((res) => { const iv = setInterval(() => { if (!on() || this.skipped) { clearInterval(iv); res(); } }, 30); });
    this.holding = false;
    this.layer.classList.remove("cs-hold");
    d.paused = "";
  }
  private startLoop() {
    this.last = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = this.holding ? 0 : Math.min(ts - this.last, 50);
      this.last = ts;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ 屏幕坐标
  private scr(p: THREE.Vector3): [number, number] {
    this.v.copy(p).project(this.env.camera);
    return [((this.v.x + 1) / 2) * this.W, ((1 - this.v.y) / 2) * this.H];
  }
  private card(uid: number) { return this.env.cards[cardIndex(uid)]; }
  private anchor(uid: number, kind: "blade" | "shield" | "halo" | "gauge" | "chest"): [number, number] {
    return this.scr(this.card(uid).armor.anchorWorld(kind, new THREE.Vector3()));
  }
  private camUp() { return new THREE.Vector3(0, 1, 0).applyQuaternion(this.env.camera.quaternion); }
  private cardPts(uid: number, panel: boolean): THREE.Vector3[] {
    const c = this.card(uid), p = c.root.position, up = this.camUp(), pts: THREE.Vector3[] = [];
    const fig = (along: number, right: number) => new THREE.Vector3(p.x + right, 0.2, p.z + EMIT.z).addScaledVector(up, along);
    for (const sx of [-1, 1]) {
      pts.push(new THREE.Vector3(p.x + sx * 1.9, 0, p.z - 1.2), new THREE.Vector3(p.x + sx * 1.7, 0, p.z + CARD.d / 2 + 0.15), fig(FIG.h + 0.6, sx * 1.1));
    }
    if (panel) pts.push(fig(FIG.h * 0.5, 3.9));
    return pts;
  }
  private frame(uids: number[], panelOf?: number) {
    const pts: THREE.Vector3[] = [];
    for (const u of uids) pts.push(...this.cardPts(u, u === panelOf));
    const r = this.env.solve(pts);
    this.env.goal.look.copy(r.look);
    this.env.goal.dist = r.dist; this.env.goal.offY = r.offY; this.env.goal.offX = r.offX;
  }

  // ------------------------------------------------------------ 每帧
  private tick(dt: number) {
    this.clock += dt;
    const t = this.clock;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].at <= t) { const x = this.timers.splice(i, 1)[0]; x.res(); }
    // 盔甲壳的亢奋度
    const k = 1 - Math.exp(-dt / 1000 * 9);
    for (const [c, s] of this.fxActive) {
      const f = c.armor.fx;
      f.k += (s.k - f.k) * k;
      f.swing += (s.swing - f.swing) * (1 - Math.exp(-dt / 1000 * 16));
    }
    for (let i = this.tw.length - 1; i >= 0; i--) {
      const w = this.tw[i], k = clamp01((t - w.t0) / w.d);
      w.c.flip = lerp(w.a, w.b, ease.io(k));
      if (k >= 1) this.tw.splice(i, 1);
    }
    // 词牌
    for (const c of this.chips) {
      c.cur = c.f(t);
      const p = c.cur;
      p.fl += c.flip;
      c.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(3)}) perspective(520px) rotateY(${p.fl.toFixed(1)}deg)`;
      c.el.style.opacity = String(p.o);
      if (c.trail && dt > 0) {
        if (c.trail.kind === "metal") for (let i = 0; i < 2; i++) this.spark(p.x, p.y, c.trail.col, 1, 200);
        else if (c.trail.kind === "drip") { this.add({ k: "drop", x: p.x + rnd(-8, 8), y: p.y + 6, vx: rnd(-20, 20), vy: rnd(0, 60), g: 900, t: 0, life: 650, size: rnd(2, 4), col: "#ff2a44" }); this.glowDot(p.x, p.y, c.trail.col, 16, 260); }
        else this.glowDot(p.x, p.y, c.trail.col, 14 + (c.numV ?? 0) * 0.5, 320);
      }
    }
    this.draw(dt, t);
  }
  private add(p: Part) { this.parts.push(p); }
  private glowDot(x: number, y: number, col: string, size: number, life: number) { this.add({ k: "dot", x, y, vx: 0, vy: 0, g: 0, t: 0, life, size, col }); }
  private spark(x: number, y: number, col: string, n = 1, life = 380, spd = 260) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd); this.add({ k: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 500, t: 0, life: life * rnd(0.6, 1.1), size: rnd(1, 2.2), col }); }
  }
  private ring(x: number, y: number, col: string, r0: number, r1: number, life = 520, w = 3) { this.add({ k: "ring", x, y, vx: 0, vy: 0, g: 0, t: 0, life, size: w, col, r1: r1 }); this.parts[this.parts.length - 1].vx = r0; }

  private draw(dt: number, t: number) {
    const g = this.g;
    g.clearRect(0, 0, this.W, this.H);
    g.globalCompositeOperation = "lighter";
    for (let i = this.layers.length - 1; i >= 0; i--) if (this.layers[i](g, t) === false) this.layers.splice(i, 1);
    const ds = dt / 1000;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      const u = p.t / p.life;
      if (u >= 1) { this.parts.splice(i, 1); continue; }
      p.vy += p.g * ds; p.x += p.vx * ds * (p.k === "ring" ? 0 : 1); p.y += p.vy * ds * (p.k === "ring" ? 0 : 1);
      g.globalAlpha = 1 - u;
      switch (p.k) {
        case "spark":
          g.strokeStyle = p.col; g.lineWidth = p.size; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); g.stroke(); break;
        case "dot": {
          const r = p.size * (1 - u * 0.5), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          gr.addColorStop(0, p.col); gr.addColorStop(1, "transparent");
          g.fillStyle = gr; g.globalAlpha = (1 - u) * 0.8; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill(); break;
        }
        case "ring": {
          const r = lerp(p.vx, p.r1!, ease.out(u));
          g.strokeStyle = p.col; g.lineWidth = p.size * (1 - u) + 0.5; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.stroke(); break;
        }
        case "drop":
          g.globalCompositeOperation = "source-over"; g.fillStyle = p.col; g.beginPath(); g.ellipse(p.x, p.y, p.size * 0.7, p.size * 1.4, 0, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = "lighter"; break;
        case "ember":
          g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.size * (1 - u * 0.6), 0, Math.PI * 2); g.fill(); break;
        case "line":
          g.strokeStyle = p.col; g.lineWidth = p.size * (1 - u * 0.6); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x2!, p.y2!); g.stroke(); break;
        case "plus":
          g.strokeStyle = p.col; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x - p.size, p.y); g.lineTo(p.x + p.size, p.y); g.moveTo(p.x, p.y - p.size); g.lineTo(p.x, p.y + p.size); g.stroke(); break;
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  // ------------------------------------------------------------ 词牌
  private makeChips(toks: Tok[], panel: SentencePanel, payloadIdx: Set<number>): Chip[] {
    const homes = panel.el.querySelectorAll<HTMLElement>(".ro-body .w");
    const match = homes.length === toks.length;
    const out: Chip[] = [];
    toks.forEach((tok, i) => {
      const el = document.createElement("div");
      el.className = "cs-chip";
      const face = document.createElement("div");
      face.className = "f";
      const w = tokEl(tok, false);
      face.appendChild(w);
      const back = document.createElement("div");
      back.className = "b";
      back.textContent = "锁";
      el.append(face, back);
      const c = w.style.getPropertyValue("--c");
      if (c) el.style.setProperty("--c", c);
      if (tok.k === "num") el.style.setProperty("--c", "#ffffff");
      this.layer.appendChild(el);
      const home = match ? homes[i] : null;
      const chip: Chip = { el, face, tok, i, w: 0, h: 0, f: () => ({ x: -999, y: -999, s: 1, r: 0, o: 0, fl: 0 }), cur: { x: -999, y: -999, s: 1, r: 0, o: 0, fl: 0 }, payload: payloadIdx.has(i), home, panel, flip: 0 };
      if (chip.payload) el.classList.add("pay");
      if (tok.k === "num") chip.numV = tok.v;
      chip.f = this.homeFn(chip);
      out.push(chip);
      this.chips.push(chip);
    });
    // 量一下尺寸，并把原词藏起来（词牌飞走了，原位是空的）
    for (const c of out) { c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; if (c.home) c.home.style.visibility = "hidden"; }
    return out;
  }
  private homeFn(c: Chip): PF {
    return () => {
      const el = c.home && c.home.isConnected ? c.home : c.panel.el;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: 1, r: 0, o: 1, fl: 0 };
    };
  }
  /** 把词牌从当前位置过渡到 to；返回的 Promise 在到达时 resolve，之后词牌「钉」在 to 上 */
  private move(c: Chip, to: PF, ms: number, o: { e?: (t: number) => number; arc?: number; tick?: (e: number) => void } = {}): Promise<void> {
    if (this.skipped) { c.f = to; return Promise.resolve(); }
    const from = c.f, t0 = this.clock, dur = Math.max(1, ms * this.sp), e = o.e ?? ease.io, arc = o.arc ?? 0;
    c.f = (t) => {
      const k = clamp01((t - t0) / dur), ek = e(k);
      const p = lerpP(from(t), to(t), ek);   // 起点也是函数：词牌还在面板里时，面板随镜头动，它也跟着
      if (arc) p.y -= Math.sin(Math.PI * ek) * arc;
      o.tick?.(ek);
      return p;
    };
    return this.wait(ms).then(() => { c.f = to; o.tick?.(1); });
  }
  private setNum(c: Chip, k: number) {
    if (c.tok.k !== "num") return;
    const w = c.face.firstElementChild as HTMLElement;
    w.textContent = String(Math.round(c.tok.v * clamp01(k)));
  }
  /** 在当前运动上叠一段短动作（脉冲、抖动），结束后还原；期间如果又被 move 接管就不还原 */
  private overlay(c: Chip, ms: number, mod: (p: P, k: number) => void) {
    const base = c.f, t0 = this.clock, d = Math.max(1, ms * this.sp);
    const w: PF = (t) => { const p = base(t); mod(p, clamp01((t - t0) / d)); return p; };
    c.f = w;
    this.timers.push({ at: t0 + d, res: () => { if (c.f === w) c.f = base; } });
  }
  private lockPulse(c: Chip, scale = 1.25) { this.overlay(c, 160, (p, k) => { p.s *= 1 + (scale - 1) * (1 - ease.out(k)); }); }
  private flipTo(c: Chip, to: number, ms: number) { if (c.flip !== to) this.tw.push({ c, a: c.flip, b: to, t0: this.clock, d: Math.max(1, ms * this.sp) }); }

  // ------------------------------------------------------------ 弹出文字
  private popup(x: number, y: number, text: string, cls: Cls, col: string, o: { big?: boolean; tag?: boolean; small?: string } = {}) {
    if (this.skipped) return;
    const el = document.createElement("div");
    el.className = "cs-pop" + (o.big ? " big" : "") + (o.tag ? " tag" : "");
    el.dataset.cls = cls;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
    el.style.setProperty("--c", col);
    el.textContent = text;
    if (o.small) { const s = document.createElement("small"); s.textContent = o.small; el.appendChild(s); }
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // ------------------------------------------------------------ 一轮
  async playRound(r: CastRound): Promise<boolean> {
    this.speedFast = r.fast;
    const alive = () => r.alive();
    const step = (ev: any) => { if (alive()) r.step(ev); };
    if (document.hidden) { for (const ev of r.events) step(ev); return alive(); }
    this.W = this.env.app.clientWidth; this.H = this.env.app.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = `${this.W}px`; this.canvas.style.height = `${this.H}px`;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.skipped = false; this.running = true; this.layer.hidden = false;
    this.timers = []; this.clock = 0; this.t0 = performance.now();
    this.startLoop();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") this.skip(); };
    const onDown = () => { if (performance.now() - this.t0 > 300) this.skip(); };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    try {
      // 把「开打前付血」按 ord 挂到各自那句上
      const bloodByOrd = new Map<number, any[]>();
      const flow: ({ g: { fire: any; evs: any[] } } | { ev: any })[] = [];
      let cur: { fire: any; evs: any[] } | null = null;
      for (const ev of r.events) {
        if (ev.type === "blood") { const a = bloodByOrd.get(ev.ord) ?? []; a.push(ev); bloodByOrd.set(ev.ord, a); continue; }
        if (ev.type === "fire") { cur = { fire: ev, evs: [] }; flow.push({ g: cur }); continue; }
        if (cur && EFFECT_EV.has(ev.type)) { cur.evs.push(ev); continue; }
        cur = null;
        flow.push({ ev });
      }
      for (const it of flow) {
        if (!alive()) return false;
        if ("g" in it) await this.playGroup(r, it.g, bloodByOrd.get(it.g.fire.ord) ?? [], step);
        else await this.playSingle(r, it.ev, step);
      }
      for (const a of bloodByOrd.values()) for (const ev of a) if (!flow.some((f) => "g" in f && f.g.fire.ord === ev.ord)) step(ev);
      return alive();
    } finally {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
      this.cleanup();
      this.env.release();
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.layer.hidden = true;
      this.g.clearRect(0, 0, this.W, this.H);
    }
  }

  private cleanup() {
    for (const c of this.chips) { if (c.home) c.home.style.visibility = ""; c.el.remove(); }
    this.chips = []; this.parts = []; this.layers = [];
    for (const [c] of this.fxActive) { c.armor.fx.k = 0; c.armor.fx.swing = 0; c.armor.fx.kind = ""; }
    this.fxActive.clear();
    this.layer.querySelectorAll(".cs-pop").forEach((e) => e.remove());
    this.holding = false;
  }

  /** 组外的单个事件（轮末灼烧、落空、连段等） */
  private async playSingle(r: CastRound, ev: any, step: (e: any) => void) {
    if (ev.type === "burn" && !this.skipped) {
      const [x, y] = this.anchor(ev.tgt, "chest");
      this.frame([ev.tgt]);
      await this.wait(380);
      step(ev);
      const col = ST_COL["灼烧"];
      for (let i = 0; i < 22; i++) this.add({ k: "ember", x: x + rnd(-30, 30), y: y + rnd(0, 60), vx: rnd(-20, 20), vy: rnd(-160, -60), g: -40, t: 0, life: rnd(500, 900), size: rnd(2, 5), col: i % 2 ? "#ffcf6a" : col });
      this.popup(x, y - 30, `-${ev.dealt}`, "并", col, { small: "灼烧" });
      await this.wait(620);
      this.env.release();
      await this.wait(200);
      return;
    }
    step(ev);
    if (ev.type === "fizzle" && !this.skipped) {
      const [x, y] = this.anchor(ev.uid, "chest");
      this.popup(x, y - 20, "落空", "并", "#93a8c9", { tag: true });
      await this.wait(420);
    } else await this.wait(ev.type === "chain" ? 300 : 120);
  }

  // ------------------------------------------------------------ 一句话
  private async playGroup(r: CastRound, grp: { fire: any; evs: any[] }, bloods: any[], step: (e: any) => void) {
    const M = r.M, fire = grp.fire, uid = fire.uid;
    const U = M.R.U[uid];
    const act = fire.cont ? null : r.decl.find((a: any) => a.ord === fire.ord && a.uid === uid) ?? null;
    // 句子的词 + 每个词属于哪一分句
    let toks: Tok[] = [];
    const ranges: [number, number][] = [];
    let clauses: any[] = [];
    if (act) {
      clauses = act.cl;
      toks = actionToks(M, act, 0);
      let at = 0;
      act.cl.forEach((c: any, i: number) => {
        const n = actionToks(M, { ...act, cl: [c] }, 0).length;   // 单段的长度（不含并）
        const s = at + (i > 0 ? 1 : 0);
        ranges.push([s, s + n]);
        at = s + n;
      });
    } else {
      const e0 = grp.evs.find((e) => KIND_OF_EV[e.type]);
      const kind = e0 ? KIND_OF_EV[e0.type] : "atk";
      clauses = [{ k: kind }];
      toks = [{ k: "word", w: "持续" }];
      if (e0?.type === "hit") toks.push({ k: "word", w: "造成" }, { k: "num", v: e0.amount }, { k: "word", w: "伤害" });
      else if (e0?.type === "heal") toks.push({ k: "word", w: "恢复" }, { k: "num", v: e0.amount });
      else if (e0?.type === "mit") toks.push({ k: "word", w: "减少" }, { k: "word", w: "伤害" }, { k: "num", v: e0.amount });
      ranges.push([0, toks.length]);
    }
    // 事件 → 分句
    const buckets: Bucket[] = clauses.map((c, ci) => ({ kind: c.k, ci, evs: [], locks: [], first: ranges[ci]?.[0] ?? 0, last: ranges[ci]?.[1] ?? toks.length }));
    const tail: any[] = [];
    let pendLocks: any[] = [], curB = 0;
    for (const ev of grp.evs) {
      const k = KIND_OF_EV[ev.type];
      if (ev.type === "lock") pendLocks.push(ev);
      else if (k) {
        let j = buckets.findIndex((b, idx) => idx >= curB && b.kind === k);
        if (j < 0) j = buckets.findIndex((b) => b.kind === k);
        if (j < 0) j = Math.min(curB, buckets.length - 1);
        curB = j;
        buckets[j].evs.push(ev);
        if (pendLocks.length) { buckets[j].locks.push(...pendLocks); pendLocks = []; }
      } else tail.push(ev);
    }
    tail.unshift(...pendLocks);

    // 跳过 / 后台标签页：直接按顺序结算
    const finishPlain = () => { step(fire); for (const b of bloods) step(b); for (const b of buckets) { for (const l of b.locks) step(l); for (const e of b.evs) step(e); } for (const e of tail) step(e); };
    if (this.skipped) { finishPlain(); return; }

    const ci = cardIndex(uid), card = this.env.cards[ci], panel = this.env.panels[ci];
    const cls = (() => { try { return (M.clsOf(U.side) as Cls) ?? "并"; } catch { return "并" as Cls; } })();
    const ccol = CLS_COL[cls] ?? "#fff";
    { const d = this.dbg(); if (d) d.cur = { uid, cls, kinds: clauses.map((c: any) => c.k).join("+") }; }
    const payload = new Set<number>();
    toks.forEach((t, i) => { if (t.k === "num" || (t.k === "word" && PAYLOAD.has(t.w))) payload.add(i); });
    const fxs = { k: 0, swing: 0 };
    this.fxActive.set(card, fxs);
    card.armor.fx.kind = "asm"; card.armor.fx.col = ccol;

    step(fire);
    // ---- 1 拉近 + 词牌飞起来
    this.frame([uid], uid);
    const chips = this.makeChips(toks, panel, payload);
    chips.forEach((c, i) => {
      const home = c.f, t0 = this.clock + i * 22 * this.sp, d = 260 * this.sp;
      c.f = (t) => { const p = home(t), k = ease.back(clamp01((t - t0) / d)); p.y -= 26 * k; p.s = 1 + 0.18 * k; p.r = (i % 2 ? 1 : -1) * 3 * k; return p; };
    });
    if (bloods.length) for (const b of bloods) { step(b); const [x, y] = this.anchor(uid, "chest"); this.popup(x, y + 10, `-${b.amount}`, "血", "#ff4a5e", { small: "付血" }); }
    await this.wait(480);
    await this.hold("zoom");

    // ---- 2 飞向盔甲壳
    fxs.k = 1;
    const rc: PF = () => { const [x, y] = this.anchor(uid, "chest"); return { x, y: y - 6, s: 1, r: 0, o: 1, fl: 0 }; };
    await this.assemble(cls, chips, rc, uid, ccol, ranges);
    await this.hold("assemble");

    // ---- 3 逐分句打出
    const allTg = new Set<number>();
    for (const b of buckets) for (const e of b.evs) { const t = e.type === "delay" ? -1 : e.tgt; if (t !== undefined && t >= 0 && t !== uid) allTg.add(t); }
    if (allTg.size) { this.frame([uid, ...allTg], uid); await this.wait(420); }
    await this.hold("aim");
    for (const b of buckets) {
      if (this.skipped) { for (const l of b.locks) step(l); for (const e of b.evs) step(e); continue; }
      await this.strike(r, cls, uid, b, chips, rc, ccol, step);
    }
    // 尾巴：续挂上、击倒、不屈
    for (const e of tail) {
      step(e);
      if (this.skipped) continue;
      const [x, y] = e.type === "cont_set" ? this.anchor(uid, "halo") : this.anchor(e.tgt ?? uid, "chest");
      if (e.type === "ko") { this.popup(x, y, "击倒", cls, "#ff4a5e", { big: true }); this.burst(x, y, "#ff4a5e", 28); await this.wait(420); }
      else if (e.type === "endure") this.popup(x, y, "不屈", cls, "#ffd24a", { tag: true });
      else if (e.type === "cont_set") this.popup(x, y, `续 ×${e.rounds}`, cls, "#ffd24a", { tag: true });
    }
    await this.wait(150);

    // ---- 4 归位 + 拉回
    await this.hold("return");
    fxs.k = 0; fxs.swing = 0;
    this.env.release();
    for (const c of chips) this.flipTo(c, 0, 200);
    await Promise.all(chips.map((c, i) => this.wait(i * 18).then(() => this.move(c, this.homeFn(c), 430, { e: ease.io, arc: 22 }))));
    for (const c of chips) { if (c.home) c.home.style.visibility = ""; c.el.remove(); }
    this.chips = this.chips.filter((c) => !chips.includes(c));
    card.armor.fx.kind = "";
    await this.wait(120);
    this.fxActive.delete(card);
    card.armor.fx.k = 0; card.armor.fx.swing = 0;
    await this.hold("pullback");
  }

  private burst(x: number, y: number, col: string, n: number) { this.spark(x, y, col, n, 520, 380); this.ring(x, y, col, 8, 90, 480, 4); this.glowDot(x, y, col, 90, 380); }

  // ------------------------------------------------------------ 词牌拼装（职业各自的方式）
  private async assemble(cls: Cls, chips: Chip[], rc: PF, uid: number, ccol: string, _ranges: [number, number][]) {
    const n = chips.length;
    // 通用：先飞到盔甲壳附近的散点
    const spread = chips.map((c, i) => { const a = (i / n) * Math.PI * 2 + 0.6; return { x: Math.cos(a) * 150 + rnd(-20, 20), y: Math.sin(a) * 70 - 20 + rnd(-12, 12), r: rnd(-14, 14) }; });
    // 机架位置：每行最多 5 张，居中
    const perRow = 5, rows = Math.ceil(n / perRow), slots: { x: number; y: number }[] = [];
    for (let rI = 0; rI < rows; rI++) {
      const idx = chips.slice(rI * perRow, rI * perRow + perRow);
      const tw = idx.reduce((s, c) => s + c.w, 0) + (idx.length - 1) * 8;
      let x = -tw / 2;
      idx.forEach((c) => { slots[c.i] = { x: x + c.w / 2, y: (rI - (rows - 1) / 2) * 38 }; x += c.w + 8; });
    }
    const atRc = (dx: number, dy: number, s = 1, r = 0, fl = 0): PF => (t) => { const p = rc(t); return { x: p.x + dx, y: p.y + dy, s, r, o: 1, fl }; };
    const stagger = Math.min(70, 520 / Math.max(n, 1));

    if (cls === "并") {
      // 先散开到盔甲壳周围
      await Promise.all(chips.map((c, i) => this.wait(i * 25).then(() => this.move(c, atRc(spread[i].x, spread[i].y, 0.95, spread[i].r), 420, { e: ease.out, arc: 40 }))));
      await this.hold("fly");
      for (const c of chips) c.el.classList.add("metal");
      // 咔咔咔：逐张咬合进机架，每张带缩放过冲、位移过冲和火花
      for (let i = 0; i < n; i++) {
        const c = chips[i], sl = slots[c.i];
        const p = this.move(c, atRc(sl.x, sl.y, 1, 0), 150, { e: ease.in });
        void p.then(() => {
          if (this.skipped) return;
          const q = rc(this.clock);
          this.spark(q.x + sl.x, q.y + sl.y, "#ffe9b0", 9, 380, 300);
          this.spark(q.x + sl.x, q.y + sl.y, "#cfe3ff", 5, 300, 200);
          this.ring(q.x + sl.x, q.y + sl.y, "#e8f2ff", 6, 34, 260, 2);
          this.lockPulse(c, 1.32);
          this.overlay(c, 130, (pp, k) => { pp.x += Math.sin(k * Math.PI * 3) * 4 * (1 - k); pp.y += (1 - k) * 3; });
        });
        await this.wait(stagger + 40);
      }
      await this.wait(150);
      // 机架：钢轨亮起、整体「咔」一下锁死
      const t0 = this.clock;
      this.layers.push((g, t) => {
        const k = clamp01((t - t0) / (260 * this.sp)), q = rc(t);
        g.globalAlpha = 0.35 + 0.45 * (1 - ease.out(clamp01((t - t0 - 300) / 500)));
        g.strokeStyle = "#dbe9ff"; g.lineWidth = 2;
        for (let rI = 0; rI < rows; rI++) {
          const idx = chips.slice(rI * perRow, rI * perRow + perRow); if (!idx.length) continue;
          const tw = idx.reduce((s, c) => s + c.w, 0) + (idx.length - 1) * 8, y = q.y + (rI - (rows - 1) / 2) * 38 + 22;
          g.beginPath(); g.moveTo(q.x - tw / 2 - 6, y); g.lineTo(q.x - tw / 2 - 6 + (tw + 12) * k, y); g.stroke();
        }
        g.globalAlpha = 1;
        return t - t0 < 900;
      });
      chips.forEach((c) => this.lockPulse(c, 1.14));
      const q = rc(this.clock); this.ring(q.x, q.y, "#dbe9ff", 20, 140, 520, 3);
      chips.forEach((c) => { c.rest = atRc(slots[c.i].x, slots[c.i].y); });
      await this.wait(260);
    } else if (cls === "续") {
      // 直接进入环绕：词牌循环 + 回流光带
      const rx = 128, ry = 62, w0 = this.clock;
      const orbit = (i: number): PF => (t) => { const p = rc(t), a = (i / n) * Math.PI * 2 + ((t - w0) / 1000) * 2.6; return { x: p.x + Math.cos(a) * rx, y: p.y - 18 + Math.sin(a) * ry, s: 0.88 + 0.14 * Math.sin(a), r: 0, o: 1, fl: 0 }; };
      this.layers.push((g, t) => {
        const q = rc(t), a0 = ((t - w0) / 1000) * 2.6;
        g.lineWidth = 3;
        for (let s = 0; s < 3; s++) for (let k = 0; k < 30; k++) {
          const a1 = a0 + (s / 3) * Math.PI * 2 - k * 0.045, a2 = a1 - 0.05;
          g.strokeStyle = `rgba(255, 210, 74, ${(1 - k / 30) * 0.55})`;
          g.beginPath(); g.ellipse(q.x, q.y - 18, rx, ry, 0, a2, a1); g.stroke();
        }
        g.strokeStyle = "rgba(120, 220, 255, 0.18)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(q.x, q.y - 18, rx, ry, 0, 0, Math.PI * 2); g.stroke();
        return this.chips.some((c) => chips.includes(c));
      });
      await Promise.all(chips.map((c, i) => this.wait(i * 40).then(() => this.move(c, orbit(i), 480, { e: ease.out, arc: 30 }))));
      await this.hold("fly");
      chips.forEach((c, i) => { c.rest = orbit(i); });
      await this.wait(700);
    } else if (cls === "择") {
      // 悬空成弧，翻面（背面是「锁」），再在目标上锁定后翻正
      const arcAt = (i: number): PF => { const f = n === 1 ? 0 : i / (n - 1) - 0.5; return (t) => { const p = rc(t); return { x: p.x + f * Math.min(n * 66, 520), y: p.y - 98 - Math.cos(f * Math.PI) * 26 + Math.sin(t / 380 + i) * 4, s: 1, r: f * 10, o: 1, fl: 0 }; }; };
      await Promise.all(chips.map((c, i) => this.wait(i * 35).then(() => this.move(c, arcAt(i), 460, { e: ease.out, arc: 36 }))));
      chips.forEach((c, i) => { c.rest = arcAt(i); });
      await this.hold("fly");
      // 翻到背面（背面是「锁」）
      await Promise.all(chips.map((c, i) => this.wait(i * 45).then(() => { this.flipTo(c, 180, 300); this.overlay(c, 300, (p, k) => { p.s *= 1 + 0.15 * Math.sin(k * Math.PI); }); return this.wait(300); })));
      for (const c of chips) c.el.classList.add("lock");
      await this.wait(120);
    } else {
      // 血：沉重地落进机架，词牌裂开渗血
      await Promise.all(chips.map((c, i) => this.wait(i * 35).then(() => this.move(c, atRc(slots[c.i].x, slots[c.i].y, 1, rnd(-3, 3)), 520, { e: ease.in, arc: -18 }))));
      await this.hold("fly");
      for (const c of chips) { c.el.classList.add("crack"); c.rest = atRc(slots[c.i].x, slots[c.i].y); }
      const t0 = this.clock;
      this.layers.push((_g, t) => {
        for (const c of chips) if (Math.random() < 0.22) this.add({ k: "drop", x: c.cur.x + rnd(-c.w / 2, c.w / 2), y: c.cur.y + c.h / 2, vx: rnd(-10, 10), vy: rnd(10, 60), g: 900, t: 0, life: 700, size: rnd(2, 4), col: "#ff2a44" });
        return t - t0 < 1600 && this.chips.some((c) => chips.includes(c));
      });
      chips.forEach((c) => this.overlay(c, 700, (p) => { p.x += Math.sin(this.clock / 28) * 1.6; }));
      const q = rc(this.clock); this.ring(q.x, q.y, "#ff2a44", 10, 120, 620, 4); this.glowDot(q.x, q.y, "#ff1f3d", 130, 560);
      await this.wait(520);
    }
    void uid; void ccol;
  }

  // ------------------------------------------------------------ 一个分句打出去
  private async strike(r: CastRound, cls: Cls, uid: number, b: Bucket, chips: Chip[], rc: PF, ccol: string, step: (e: any) => void) {
    const card = this.card(uid), fx = card.armor.fx, fxs = this.fxActive.get(card)!;
    const kcol = KIND_COL[b.kind] ?? ccol;
    const mine = chips.filter((c) => c.i >= b.first && c.i < b.last);
    const pay = mine.filter((c) => c.payload);
    for (const l of b.locks) step(l);
    // 目标
    const tg: number[] = [];
    for (const e of b.evs) { const t = e.type === "delay" ? -1 : e.tgt; if (t !== undefined && t >= 0 && !tg.includes(t)) tg.push(t); }
    const delayEv = b.evs.find((e) => e.type === "delay");
    const delayUnit = delayEv ? (r.decl.find((a: any) => a.ord === delayEv.ord)?.uid ?? uid) : -1;
    fx.kind = b.kind; fx.col = kcol;

    // 择：目标上的锁定准星 + 词牌翻正
    if (cls === "择" && tg.length) {
      const t0 = this.clock, dur = 520 * this.sp;
      const pts = () => tg.map((t) => this.anchor(t, "chest"));
      this.layers.push((g, t) => {
        const k = clamp01((t - t0) / dur), lockk = clamp01((k - 0.7) / 0.3);
        g.strokeStyle = lockk > 0 ? "#c8ffe4" : "#62ffb0"; g.lineWidth = 2.5;
        for (const [x, y] of pts()) {
          const r0 = lerp(90, 40, ease.out(k)), jit = (1 - k) * 10;
          g.beginPath(); g.arc(x + Math.sin(t / 40) * jit, y + Math.cos(t / 33) * jit, r0, 0, Math.PI * 2); g.stroke();
          const s = r0 + 6;
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(x + sx * s, y + sy * (s - 14)); g.lineTo(x + sx * s, y + sy * s); g.lineTo(x + sx * (s - 14), y + sy * s); g.stroke(); }
          g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x, y - 10); g.lineTo(x, y + 10); g.stroke();
        }
        return t - t0 < dur + 520 * this.sp;
      });
      await this.wait(520);
      for (const c of mine) this.flipTo(c, 0, 260);
      await this.wait(280);
      const [tx, ty] = this.anchor(tg[0], "chest");
      this.popup(tx, ty - 70, "锁定", cls, "#62ffb0", { tag: true });
    }
    await this.hold("lock");

    if (!b.evs.length) {   // 落空：这一段没有目标 / 没有效果
      const [x, y] = this.anchor(uid, "chest");
      this.popup(x, y - 40, "落空", cls, "#93a8c9", { tag: true });
      await this.wait(300);
      return;
    }

    // 出手：刃挥动 / 盾竖起 / 核心亮；词牌从盔甲壳上射出
    fxs.swing = b.kind === "atk" ? 1 : 0;
    await this.wait(b.kind === "atk" ? 170 : 110);
    const tp = (uid2: number): PF => { const k = b.kind === "mit" ? "shield" : "chest"; return () => { const [x, y] = this.anchor(uid2, k); return { x, y, s: 1.1, r: 0, o: 1, fl: 0 }; }; };
    const dest = delayUnit >= 0 && !tg.length ? (() => { const pn = this.env.panels[cardIndex(delayUnit)].el; return (): P => { const q = pn.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, s: 1, r: 0, o: 1, fl: 0 }; }; })() : null;
    const flightMs = cls === "血" ? 560 : b.kind === "heal" ? 700 : b.kind === "redirect" ? 780 : cls === "续" ? 620 : 480;
    const flightE = cls === "血" ? ease.in : cls === "择" ? ease.io : b.kind === "heal" ? ease.io : ease.in;
    const trailCol = cls === "血" ? "#ff3a52" : cls === "并" ? "#e8f2ff" : cls === "择" ? "#62ffb0" : kcol;
    const trailKind = cls === "血" ? "drip" : cls === "并" ? "metal" : "glow";
    const targetF = dest ?? tp(tg[0] ?? uid);
    // 额外的目标：光屑飞过去
    for (let j = 1; j < tg.length; j++) this.comet(rc, tp(tg[j]), trailCol, flightMs);
    if (cls === "择") { const [ax, ay] = this.anchor(uid, "blade"), [bx, by] = this.anchor(tg[0] ?? uid, "chest"); this.add({ k: "line", x: ax, y: ay, x2: bx, y2: by, vx: 0, vy: 0, g: 0, t: 0, life: 260, size: 3, col: "#9dffd0" }); }
    const flights = Promise.all(pay.map((c, i) => this.wait(i * 45).then(async () => {
      c.trail = { col: trailCol, kind: trailKind };
      const scale = c.tok.k === "num" ? 1.2 + Math.min((c.tok as any).v, 24) * 0.035 : 1.1;
      const to: PF = (t) => { const p = targetF(t); const j = i - (pay.length - 1) / 2; return { ...p, x: p.x + j * 26, y: p.y + (cls === "血" ? 0 : j * 4) - 6, s: scale }; };
      const arc = cls === "续" ? 90 : b.kind === "heal" ? 110 : b.kind === "redirect" ? -120 : cls === "择" ? 0 : 44;
      await this.move(c, to, flightMs, { e: flightE, arc, tick: c.tok.k === "num" ? (e) => this.setNum(c, e) : undefined });
    })));
    await this.wait(flightMs * 0.6);
    await this.hold("flight");
    await flights;

    // ---- 命中：结算的变化（血条 / 数字 / 击倒）和词牌命中在同一帧
    const cntBy = new Map<number, number>();
    for (const ev of b.evs) {
      step(ev);
      this.impact(ev, cls, uid, delayUnit, cntBy);
    }
    for (const c of pay) { c.trail = undefined; c.el.style.filter = ""; }
    fxs.swing = 0;
    await this.hold("hit");
    await this.wait(cls === "续" ? 300 : 260);

    // 弹回盔甲壳，回到机架 / 环绕
    await Promise.all(pay.map((c, i) => this.wait(i * 30).then(async () => {
      if (c.tok.k === "num") this.setNum(c, 1);
      await this.move(c, c.rest ?? rc, cls === "续" ? 480 : 340, { e: ease.out, arc: cls === "续" ? -60 : 30 });
    })));
    fx.kind = "asm";
  }
  private comet(from: PF, to: PF, col: string, ms: number) {
    if (this.skipped) return;
    const t0 = this.clock, d = ms * this.sp;
    this.layers.push((_g, t) => {
      const k = clamp01((t - t0) / d), a = from(t), b = to(t), e = ease.in(k);
      const x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e) - Math.sin(Math.PI * e) * 40;
      this.glowDot(x, y, col, 26, 260);
      return k < 1;
    });
  }

  // ------------------------------------------------------------ 命中特效（按事件类型）
  private impact(ev: any, cls: Cls, uid: number, delayUnit: number, cnt: Map<number, number>) {
    if (this.skipped) return;
    const at = (u: number, kind: "chest" | "shield" = "chest"): [number, number] => this.anchor(u, kind);
    const stack = (u: number) => { const n = cnt.get(u) ?? 0; cnt.set(u, n + 1); return n * 30; };
    switch (ev.type) {
      case "hit": {
        const [x, y] = at(ev.tgt), dy = stack(ev.tgt), big = Math.min(ev.dealt, 24);
        const col = cls === "血" ? "#ff3a52" : cls === "择" ? "#62ffb0" : cls === "续" ? "#ffd24a" : "#ffb45a";
        this.burst(x, y, col, 10 + big);
        if (cls === "并") { this.spark(x, y, "#fff", 14, 420, 420); this.ring(x, y, "#fff", 4, 70, 300, 3); }
        else if (cls === "续") { this.ring(x, y, "#ffd24a", 10, 150, 700, 3); setTimeout(() => { if (!this.skipped && this.running) this.ring(x, y, "#7fe6ff", 6, 110, 520, 2); }, 160 * this.sp); }
        else if (cls === "择") { this.ring(x, y, "#fff", 40, 8, 320, 3); }
        else for (let i = 0; i < 18; i++) this.add({ k: "drop", x, y, vx: rnd(-220, 220), vy: rnd(-260, 40), g: 900, t: 0, life: rnd(500, 900), size: rnd(2, 5), col: "#d3162d" });
        this.popup(x, y - 30 - dy, `-${ev.dealt}`, cls, col, { big: ev.dealt >= 10, small: ev.dealt < ev.amount ? `挡${ev.amount - ev.dealt}` : ev.vuln > 0 ? "易伤" : cls === "续" ? "↻" : undefined });
        break;
      }
      case "redirected": {
        const [x, y] = at(ev.tgt), dy = stack(ev.tgt);
        this.burst(x, y, "#ffd24a", 14);
        this.popup(x, y - 30 - dy, `-${ev.dealt}`, cls, "#ffd24a", { small: "转移" });
        break;
      }
      case "heal": {
        const [x, y] = at(ev.tgt), dy = stack(ev.tgt);
        for (let i = 0; i < 14; i++) this.add({ k: "plus", x: x + rnd(-40, 40), y: y + rnd(0, 50), vx: rnd(-10, 10), vy: rnd(-120, -50), g: 0, t: 0, life: rnd(600, 1000), size: rnd(4, 8), col: "#5dffb0" });
        this.ring(x, y, "#5dffb0", 10, 110, 700, 3); this.glowDot(x, y, "#5dffb0", 120, 520);
        this.popup(x, y - 30 - dy, `+${ev.amount}`, cls, "#5dffb0");
        break;
      }
      case "mit": {
        const [x, y] = at(ev.tgt, "shield"), dy = stack(ev.tgt);
        this.ring(x, y, "#9fe0ff", 12, 100, 640, 4); this.ring(x, y, "#5cc8ff", 4, 70, 520, 2); this.glowDot(x, y, "#5cc8ff", 100, 480);
        this.popup(x, y - 56 - dy, `-${ev.amount}`, cls, "#7fd6ff", { small: "减伤" });
        break;
      }
      case "status": {
        const [x, y] = at(ev.tgt), dy = stack(ev.tgt), col = ST_COL[ev.st] ?? "#ff5dc8";
        if (ev.st === "灼烧") for (let i = 0; i < 20; i++) this.add({ k: "ember", x: x + rnd(-30, 30), y: y + rnd(0, 50), vx: rnd(-20, 20), vy: rnd(-170, -70), g: -40, t: 0, life: rnd(500, 900), size: rnd(2, 5), col: i % 2 ? "#ffcf6a" : col });
        else if (ev.st === "易伤") { this.spark(x, y, col, 18, 520, 340); for (let i = 0; i < 4; i++) { const a = rnd(0, 6.28); this.add({ k: "line", x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 8, x2: x + Math.cos(a) * 70, y2: y + Math.sin(a) * 70, vx: 0, vy: 0, g: 0, t: 0, life: 420, size: 3, col }); } }
        else for (let i = 0; i < 16; i++) this.add({ k: "ember", x: x + rnd(-36, 36), y: y - rnd(0, 40), vx: rnd(-10, 10), vy: rnd(40, 140), g: 60, t: 0, life: rnd(500, 900), size: rnd(2, 4), col });
        this.ring(x, y, col, 8, 90, 560, 3);
        this.popup(x, y - 40 - dy, ev.st, cls, col, { small: `Lv${ev.lv}` });
        break;
      }
      case "listen": {
        const [x, y] = at(ev.tgt);
        const [ox, oy] = at(uid);
        this.add({ k: "line", x, y, x2: ox, y2: oy, vx: 0, vy: 0, g: 0, t: 0, life: 520, size: 3, col: "#ffd24a" });
        this.ring(x, y, "#ffd24a", 10, 90, 560, 3);
        this.popup(x, y - 40, "转移", cls, "#ffd24a", { tag: true });
        break;
      }
      case "delay": {
        const pn = this.env.panels[cardIndex(delayUnit)].el.getBoundingClientRect();
        const x = pn.left + pn.width / 2, y = pn.top + pn.height / 2;
        this.ring(x, y, "#cfa37f", 10, 90, 600, 3);
        this.popup(x, y - 20, `延后 +${ev.sec}`, cls, "#e8c9a6", { tag: true, small: "秒" });
        break;
      }
      case "remove": {
        const [x, y] = at(ev.tgt);
        this.spark(x, y, "#e9fffb", 26, 600, 420); this.ring(x, y, "#e9fffb", 6, 100, 520, 3);
        this.popup(x, y - 40, "拆除", cls, "#e9fffb", { tag: true, small: ev.broke > 0 ? `断${ev.broke}续` : undefined });
        break;
      }
    }
  }
}

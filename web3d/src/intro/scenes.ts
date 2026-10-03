// 开场演出的画面：全部是 Canvas2D 程序化绘制（逻辑分辨率 1280x720），不依赖外部图片（零、小剑的立绘除外，可缺省）。
import type { SceneId } from "./script";

export const W = 1280, H = 720;
export const FONT = '"Chakra Petch","Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif';
export const COL = {
  cyan: "#19e6ff", magenta: "#ff2fa0", violet: "#8a4dff", amber: "#ffb02e", green: "#3cff9a", red: "#ff4560", white: "#f4f0ff",
};
type Ctx = CanvasRenderingContext2D;
type Cv = HTMLCanvasElement;

export interface Env {
  bgNormal: Cv; bgRuin: Cv; signs: Sign[];
  /** 黑客「零」、随从「小剑」的发光立绘；缺图时为 null（画面用剪影/发光体代替） */
  zero: Char | null; sword: Char | null;
}
export interface Char { glow: Cv; pw: number; ph: number; pad: number }
export interface Sign { x: number; y: number; w: number; h: number; color: string; seed: number }
// ---------- 小工具 ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const backOut = (t: number) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
/** 短促的脉冲：t0 时刻开始、持续 len 秒、线性衰减 */
const pulse = (t: number, t0: number, len: number) => (t >= t0 && t < t0 + len ? 1 - (t - t0) / len : 0);
function mk(w: number, h: number): [Cv, Ctx] { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!]; }
function hexA(hex: string, a: number) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// ---------- 精灵缓存（带发光，只画一次） ----------
const sprites = new Map<string, Cv>();
export function glyphSprite(text: string, color: string): Cv {
  const k = `g${text}${color}`; let s = sprites.get(k); if (s) return s;
  const [c, x] = mk(112, 112); s = c;
  x.translate(56, 56);
  x.shadowColor = color; x.shadowBlur = 16;
  x.beginPath(); x.moveTo(0, -42); x.lineTo(30, -6); x.lineTo(14, 38); x.lineTo(-18, 34); x.lineTo(-32, -4); x.closePath();
  const g = x.createLinearGradient(-30, -40, 30, 40); g.addColorStop(0, hexA(color, 0.5)); g.addColorStop(1, hexA(color, 0.08));
  x.fillStyle = g; x.fill(); x.lineWidth = 2; x.strokeStyle = color; x.stroke();
  x.shadowBlur = 0; x.fillStyle = "#fff"; x.font = `700 26px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
  x.shadowColor = color; x.shadowBlur = 8; x.fillText(text, 0, 0);
  sprites.set(k, c); return c;
}
export function tileSprite(text: string, color: string, big = false): Cv {
  const k = `t${text}${color}${big}`; let s = sprites.get(k); if (s) return s;
  const [c, x] = mk(240, 150); s = c;
  x.translate(120, 75);
  const w = big ? 176 : 150, h = big ? 92 : 76;
  x.shadowColor = color; x.shadowBlur = 22;
  x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 12);
  const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, "rgba(20,10,50,.92)"); g.addColorStop(1, "rgba(8,4,24,.92)");
  x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = color; x.stroke();
  x.shadowBlur = 0; x.lineWidth = 1; x.strokeStyle = hexA(color, 0.4); x.beginPath(); x.roundRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 8); x.stroke();
  x.fillStyle = "#fff"; x.font = `700 ${big ? 42 : 36}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle";
  x.shadowColor = color; x.shadowBlur = 12; x.fillText(text, 0, 2);
  sprites.set(k, c); return c;
}
function blit(c: Ctx, s: Cv, x: number, y: number, scale = 1, rot = 0, alpha = 1) {
  if (alpha <= 0.003 || scale <= 0.003) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(rot); c.scale(scale, scale);
  c.drawImage(s, -s.width / 2, -s.height / 2); c.restore();
}
function glow(c: Ctx, x: number, y: number, r: number, color: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- 背景（预渲染） ----------
const BW = 1536, BH = 864, HZ = 520;
export function buildCity(ruin: boolean, seed: number): { cv: Cv; signs: Sign[] } {
  const [cv, c] = mk(BW, BH);
  const R = rng(seed); const signs: Sign[] = [];
  let g = c.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, "#05010f"); g.addColorStop(0.55, ruin ? "#150628" : "#1f0840"); g.addColorStop(1, ruin ? "#3a0a44" : "#6a1262");
  c.fillStyle = g; c.fillRect(0, 0, BW, HZ);
  c.globalCompositeOperation = "lighter";
  glow(c, BW / 2, HZ, 700, ruin ? COL.violet : COL.magenta, 0.35);
  glow(c, 380, 300, 420, COL.violet, 0.12); glow(c, 1150, 260, 380, COL.cyan, 0.1);
  c.globalCompositeOperation = "source-over";
  const palette = [COL.cyan, COL.magenta, COL.amber, COL.violet, COL.green];
  const layers = [
    { base: "#150c30", hmin: 140, hmax: 300, wmin: 50, wmax: 100, win: 0.08, ws: 3 },
    { base: "#0c0624", hmin: 220, hmax: 430, wmin: 80, wmax: 150, win: ruin ? 0.1 : 0.3, ws: 5 },
  ];
  for (const L of layers) {
    let x = -40;
    while (x < BW + 40) {
      const w = L.wmin + R() * (L.wmax - L.wmin), h = L.hmin + R() * (L.hmax - L.hmin), top = HZ - h;
      c.fillStyle = L.base;
      c.beginPath(); c.moveTo(x, HZ); c.lineTo(x, top);
      if (ruin && R() < 0.5) { const n = 4; for (let i = 1; i <= n; i++) c.lineTo(x + (w * i) / n, top + R() * 46 * (i % 2 ? 1 : 0.2)); } else c.lineTo(x + w, top);
      c.lineTo(x + w, HZ); c.closePath(); c.fill();
      c.fillStyle = "rgba(120,80,255,.1)"; c.fillRect(x, top, 2, h);
      for (let wy = top + 14; wy < HZ - 10; wy += L.ws * 3.4) for (let wx = x + 8; wx < x + w - 8; wx += L.ws * 2.6) {
        if (R() < L.win) { c.fillStyle = hexA(palette[(R() * 5) | 0], 0.55 + R() * 0.4); c.fillRect(wx, wy, L.ws, L.ws * 1.3); }
      }
      x += w + 4 + R() * 10;
    }
  }
  // 近景高塔 + 霓虹招牌
  const towers = [{ x: -20, w: 250, h: 560 }, { x: 1290, w: 270, h: 600 }, { x: 640, w: 120, h: 380 }];
  for (const t of towers) {
    c.fillStyle = "#07031a"; c.fillRect(t.x, HZ - t.h, t.w, t.h);
    c.fillStyle = "rgba(138,77,255,.18)"; c.fillRect(t.x + (t.x < 700 ? t.w - 3 : 0), HZ - t.h, 3, t.h);
  }
  const addSign = (x: number, y: number, w: number, h: number, color: string, txt: string, vertical: boolean) => {
    const dead = ruin && R() < 0.35; const col = dead ? "#3a3350" : color;
    c.save(); c.shadowColor = col; c.shadowBlur = dead ? 0 : 24;
    c.strokeStyle = col; c.lineWidth = 4; c.strokeRect(x, y, w, h);
    c.fillStyle = hexA(col, dead ? 0.05 : 0.14); c.fillRect(x, y, w, h);
    c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle";
    if (vertical) { c.font = `700 ${w * 0.62}px ${FONT}`; const n = txt.length; for (let i = 0; i < n; i++) c.fillText(txt[i], x + w / 2, y + (h / n) * (i + 0.5)); }
    else { c.font = `700 ${h * 0.62}px ${FONT}`; c.fillText(txt, x + w / 2, y + h / 2 + 2); }
    c.restore();
    if (!dead) signs.push({ x, y, w, h, color: col, seed: R() * 100 });
  };
  addSign(40, 170, 64, 200, COL.magenta, "词语库", true);
  addSign(120, 300, 70, 160, COL.cyan, "词战场", true);
  addSign(1330, 130, 70, 230, COL.cyan, "拼句台", true);
  addSign(1420, 330, 86, 112, COL.amber, "夜", true);
  addSign(1280, 440, 130, 46, COL.magenta, "BAR", false);
  addSign(660, 330, 80, 40, COL.green, "词库", false);
  addSign(190, 410, 150, 44, COL.violet, "NEON", false);
  // 地面：天际线的倒影 + 湿沥青
  g = c.createLinearGradient(0, HZ, 0, BH); g.addColorStop(0, "#1b0a33"); g.addColorStop(1, "#06020f");
  c.fillStyle = g; c.fillRect(0, HZ, BW, BH - HZ);
  c.save(); c.translate(0, HZ * 2); c.scale(1, -1); c.globalAlpha = 0.3; c.drawImage(cv, 0, HZ - 330, BW, 330, 0, HZ - 330, BW, 330); c.restore();
  g = c.createLinearGradient(0, HZ, 0, BH); g.addColorStop(0, "rgba(6,2,16,0)"); g.addColorStop(0.7, "rgba(6,2,16,.78)"); g.addColorStop(1, "rgba(3,1,8,.95)");
  c.fillStyle = g; c.fillRect(0, HZ, BW, BH - HZ);
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) { const x = R() * BW, y = HZ + 8 + R() * 300; c.fillStyle = hexA(palette[(R() * 5) | 0], 0.05 + R() * 0.07); c.fillRect(x, y, 30 + R() * 160, 2 + R() * 2); }
  c.strokeStyle = "rgba(138,77,255,.1)"; c.lineWidth = 1;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(BW / 2 + i * 20, HZ); c.lineTo(BW / 2 + i * 190, BH); c.stroke(); }
  c.globalCompositeOperation = "source-over";
  if (ruin) { c.fillStyle = "rgba(4,1,12,.4)"; c.fillRect(0, 0, BW, BH); }
  return { cv, signs };
}

/** 招牌闪烁：在背景上叠一层加亮；与 drawBg 同一相机 */
function flicker(c: Ctx, signs: Sign[], t: number, s: number, dx: number, dy: number, k = 1) {
  c.save(); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(dx, dy); c.translate(-BW / 2, -BH / 2);
  c.globalCompositeOperation = "lighter";
  for (const g of signs) {
    const f = Math.sin(t * 2 + g.seed) * 0.5 + 0.5, bad = Math.sin(t * 23 + g.seed * 7) > 0.93 ? -0.5 : 0;
    const a = clamp(0.08 + f * 0.18 + bad * 0.3, 0, 0.4) * k;
    c.fillStyle = hexA(g.color, a); c.fillRect(g.x - 4, g.y - 4, g.w + 8, g.h + 8);
    glow(c, g.x + g.w / 2, g.y + g.h / 2, 90, g.color, a * 0.5);
  }
  c.restore();
}

const DROPS = (() => { const R = rng(7); return Array.from({ length: 170 }, () => ({ x: R() * (W + 200), y: R() * H, sp: 900 + R() * 600, len: 14 + R() * 20 })); })();
function rain(c: Ctx, t: number, k = 1) {
  c.save(); c.lineWidth = 1.2; c.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = pass; i < DROPS.length; i += 2) {
      const d = DROPS[i]; const y = ((d.y + d.sp * t) % (H + 60)) - 30, x = d.x - y * 0.14 - 100;
      c.moveTo(x, y); c.lineTo(x - d.len * 0.14, y + d.len);
    }
    c.strokeStyle = pass ? `rgba(160,225,255,${0.2 * k})` : `rgba(255,170,230,${0.14 * k})`; c.stroke();
  }
  c.restore();
}
function ripples(c: Ctx, t: number) {
  c.save(); c.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    const per = 1.1, ph = (t + i * 0.43) / per, n = Math.floor(ph), p = ph - n, R = rng(n * 31 + i * 977);
    const x = 40 + R() * (W - 80), y = 565 + R() * 130, r = 4 + p * 34;
    c.strokeStyle = `rgba(190,170,255,${(1 - p) * 0.35})`; c.beginPath(); c.ellipse(x, y, r, r * 0.28, 0, 0, 6.283); c.stroke();
  }
  c.restore();
}
function fog(c: Ctx, t: number, color = COL.violet, k = 1) {
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) glow(c, ((i * 380 + t * (14 + i * 4)) % (W + 600)) - 300, 470 + Math.sin(t * 0.4 + i) * 40, 340, color, 0.07 * k);
  c.restore();
}
function dim(c: Ctx, a: number) { c.fillStyle = `rgba(3,1,10,${a})`; c.fillRect(0, 0, W, H); }
function text(c: Ctx, s: string, x: number, y: number, size: number, color: string, alpha = 1, blur = 14, weight = 700) {
  c.save(); c.globalAlpha = alpha; c.font = `${weight} ${size}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
  c.shadowColor = color; c.shadowBlur = blur; c.fillStyle = "#fff"; c.fillText(s, x, y); c.restore();
}

// ---------- 各场景 ----------

// ---------- 各场景 ----------
type Draw = (c: Ctx, ts: number, dur: number, e: Env) => void;

/** 镜头：以世界坐标 (fx,fy) 为焦点缩放 s，并把焦点放到屏幕 (tx,ty)。需配合 c.restore() */
function cam(c: Ctx, s: number, fx: number, fy: number, tx = fx, ty = fy) { c.save(); c.translate(tx, ty); c.scale(s, s); c.translate(-fx, -fy); }
function bgWorld(c: Ctx, bg: Cv) { c.drawImage(bg, W / 2 - BW / 2, H / 2 - BH / 2); }
function black(c: Ctx) { c.fillStyle = "#000"; c.fillRect(-W, -H, W * 3, H * 3); }

/** 立绘：cx 为水平中心，topY 为图顶，hh 为图高；alpha 透明度 */
function drawChar(c: Ctx, ch: Char, cx: number, topY: number, hh: number, alpha = 1) {
  const k = hh / ch.ph, dw = ch.pw * k, pad = ch.pad * k;
  c.save(); c.globalAlpha = alpha; c.drawImage(ch.glow, cx - dw / 2 - pad, topY - pad, ch.glow.width * k, ch.glow.height * k); c.restore();
}

/** 人形剪影（行人 / 街头对峙者）。(x,y) 为腰部，k 为缩放，rim 为轮廓光色，umbrella 打伞，flip 朝左 */
function figure(c: Ctx, x: number, y: number, k: number, rim: string, flip = false, umbrella = false, step = 0) {
  c.save(); c.translate(x, y); c.scale(flip ? -k : k, k); c.fillStyle = "#050210";
  const sw = Math.sin(step) * 7;
  c.beginPath(); c.arc(0, -112, 12, 0, 6.283); c.fill();
  c.fillRect(-5, -102, 10, 12);
  c.beginPath(); c.moveTo(-22, -92); c.lineTo(22, -92); c.lineTo(25, -34); c.lineTo(30, 14); c.lineTo(-30, 14); c.lineTo(-25, -34); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-14, 8); c.lineTo(-9 + sw, 44); c.lineTo(-3 + sw, 44); c.lineTo(0, 8); c.fill();
  c.beginPath(); c.moveTo(14, 8); c.lineTo(9 - sw, 44); c.lineTo(3 - sw, 44); c.lineTo(0, 8); c.fill();
  c.strokeStyle = "#050210"; c.lineWidth = 8; c.lineCap = "round";
  c.beginPath(); c.moveTo(-22, -88); c.lineTo(-30, -40); c.moveTo(22, -88); c.lineTo(umbrella ? 30 : 30, umbrella ? -100 : -40); c.stroke();
  c.strokeStyle = hexA(rim, 0.6); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-30, 12); c.lineTo(-25, -34); c.lineTo(-22, -92); c.lineTo(22, -92); c.stroke();
  if (umbrella) {
    c.fillStyle = "#0a0420"; c.strokeStyle = hexA(rim, 0.6); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-50, -126); c.quadraticCurveTo(0, -186, 50, -126); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(30, -100); c.lineTo(30, -150); c.stroke();
  }
  c.restore();
}

/** 披斗篷的词师阿词，脚底在 (x,y)。f：0 背对镜头，1 正对镜头（转身中间会收窄） */
function mentor(c: Ctx, x: number, y: number, k: number, f: number, t: number) {
  const sx = f <= 0 ? 1 : Math.max(0.08, Math.abs(Math.cos(f * Math.PI)));
  c.save(); c.translate(x, y); c.scale(k * sx, k);
  c.save(); c.fillStyle = "rgba(0,0,0,.5)"; c.beginPath(); c.ellipse(0, 4, 78, 12, 0, 0, 6.283); c.fill(); c.restore();
  const sway = Math.sin(t * 1.4) * 2;
  c.fillStyle = "#07031a"; c.strokeStyle = hexA(COL.cyan, 0.7); c.lineWidth = 3; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-74, 0); c.quadraticCurveTo(-54, -150, -36, -250); c.lineTo(36, -250); c.quadraticCurveTo(56, -150, 76 + sway, 0); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-40, -250); c.quadraticCurveTo(0, -330, 40, -250); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -282, 30, 0, 6.283); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-52, -296); c.quadraticCurveTo(0, -352, 52, -296); c.quadraticCurveTo(0, -318, -52, -296); c.fill(); c.stroke();
  if (f > 0.5) { c.save(); c.shadowColor = COL.cyan; c.shadowBlur = 14; c.fillStyle = COL.cyan; c.fillRect(-14, -280, 10, 4); c.fillRect(6, -280, 10, 4); c.restore(); }
  c.strokeStyle = hexA(COL.amber, 0.9); c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(-96, 4); c.lineTo(-92, -300); c.stroke();
  c.restore();
}

/** 零（背影）：连帽衫、双马尾、护目镜已戴上。脚底在 (x,y) */
function zeroBack(c: Ctx, x: number, y: number, k: number, t: number, walk: number) {
  const sw = Math.sin(walk) * 10, bob = Math.abs(Math.sin(walk)) * 3;
  c.save(); c.translate(x, y - bob); c.scale(k, k); c.fillStyle = "#06030f"; c.strokeStyle = hexA(COL.cyan, 0.6); c.lineWidth = 2.5; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-18, -70); c.lineTo(-10 + sw, 0); c.lineTo(-24 + sw, 0); c.lineTo(-30, -70); c.fill();
  c.beginPath(); c.moveTo(18, -70); c.lineTo(10 - sw, 0); c.lineTo(24 - sw, 0); c.lineTo(30, -70); c.fill();
  c.beginPath(); c.moveTo(-40, -40); c.quadraticCurveTo(-52, -190, -30, -214); c.lineTo(30, -214); c.quadraticCurveTo(52, -190, 40, -40); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -246, 28, 0, 6.283); c.fill(); c.stroke();
  const tail = Math.sin(t * 3.1) * 4;
  for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 20, -258); c.quadraticCurveTo(d * (52 + tail), -240, d * (44 + tail), -196); c.quadraticCurveTo(d * 34, -226, d * 18, -240); c.closePath(); c.fill(); c.stroke(); }
  c.save(); c.shadowColor = COL.cyan; c.shadowBlur = 10; c.strokeStyle = COL.cyan; c.lineWidth = 3; c.beginPath(); c.moveTo(-27, -250); c.lineTo(27, -250); c.stroke(); c.restore();
  c.restore();
}

/** 稻草人，脚底在 (x,y)，lit 为眼睛亮起的程度 0~1 */
function scarecrow(c: Ctx, x: number, y: number, k: number, lit: number, t: number) {
  c.save(); c.translate(x, y); c.scale(k, k); c.translate(-600, -610);
  c.fillStyle = "#06020d"; c.strokeStyle = "rgba(255,176,46,.55)"; c.lineWidth = 2;
  c.beginPath(); c.roundRect(588, 330, 24, 280, 6); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(480, 380, 240, 18, 8); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(540, 396, 120, 110, 20); c.fill(); c.stroke();
  c.beginPath(); c.arc(600, 322, 38, 0, 6.283); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(552, 306); c.lineTo(648, 306); c.lineTo(618, 262); c.lineTo(582, 262); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = hexA(COL.red, 0.9 * (1 - lit)); c.lineWidth = 3;
  for (const ex of [-14, 14]) { c.beginPath(); c.moveTo(600 + ex - 6, 314); c.lineTo(600 + ex + 6, 326); c.moveTo(600 + ex + 6, 314); c.lineTo(600 + ex - 6, 326); c.stroke(); }
  c.strokeStyle = hexA(COL.red, 0.9); c.beginPath(); c.moveTo(584, 342); c.lineTo(616, 342); c.stroke();
  c.strokeStyle = "rgba(255,176,46,.6)"; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const sx = 482 + i * 3, sy = 398; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 12 - i * 2, sy + 22 + i * 2); c.moveTo(718 - i * 3, sy); c.lineTo(730 + i * 2, sy + 22 + i * 2); c.stroke(); }
  if (lit > 0) {
    c.save(); c.globalCompositeOperation = "lighter";
    const fl = lit * (0.85 + Math.sin(t * 9) * 0.1);
    for (const ex of [-14, 14]) { glow(c, 600 + ex, 320, 70 * lit, COL.cyan, 0.7 * fl); c.fillStyle = hexA("#d8fbff", fl); c.beginPath(); c.arc(600 + ex, 320, 6.5, 0, 6.283); c.fill(); }
    glow(c, 600, 330, 220 * lit, COL.cyan, 0.18 * fl);
    c.restore();
  }
  c.restore();
}

/** 暗巷背景：透视的两面墙、地面、灯，消失点 (640,330)；near 越大越近 */
function alleyBg(c: Ctx, ts: number) {
  black(c);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#06020f"); g.addColorStop(0.5, "#160628"); g.addColorStop(1, "#05010c");
  c.fillStyle = g; c.fillRect(-W, -H, W * 3, H * 3);
  const wall = (side: number) => {
    const sx = side < 0 ? 0 : W;
    c.beginPath(); c.moveTo(sx, -60); c.lineTo(side < 0 ? 520 : 760, 250); c.lineTo(side < 0 ? 520 : 760, 420); c.lineTo(sx, 780); c.closePath();
    const wg = c.createLinearGradient(sx, 0, 640, 0); wg.addColorStop(0, "#0b0420"); wg.addColorStop(1, "#1a0a34"); c.fillStyle = wg; c.fill();
    c.strokeStyle = "rgba(138,77,255,.22)"; c.lineWidth = 1.5; c.stroke();
    // 砖缝
    c.save(); c.clip(); c.strokeStyle = "rgba(138,77,255,.1)";
    for (let i = 0; i < 9; i++) { const d = i / 9; c.beginPath(); c.moveTo(sx, lerp(-60, 780, d)); c.lineTo(side < 0 ? 520 : 760, lerp(250, 420, d)); c.stroke(); }
    c.restore();
  };
  wall(-1); wall(1);
  c.beginPath(); c.moveTo(0, 780); c.lineTo(W, 780); c.lineTo(760, 420); c.lineTo(520, 420); c.closePath();
  const fg = c.createLinearGradient(0, 420, 0, 780); fg.addColorStop(0, "#1b0a33"); fg.addColorStop(1, "#06020f"); c.fillStyle = fg; c.fill();
  // 沿墙的霓虹条与灯（越靠近消失点越小）
  c.save(); c.globalCompositeOperation = "lighter";
  const cols = [COL.magenta, COL.cyan, COL.violet, COL.amber, COL.cyan];
  for (let i = 0; i < 5; i++) {
    const d = i / 5, x = lerp(70, 500, d), y = lerp(180, 300, d), r = lerp(70, 18, d);
    for (const side of [-1, 1]) {
      const px = side < 0 ? x : W - x; const f = 0.75 + Math.sin(ts * 2 + i * 1.7 + side) * 0.2 + (Math.sin(ts * 21 + i * 5) > 0.95 ? -0.4 : 0);
      glow(c, px, y, r * 4, cols[(i + (side < 0 ? 0 : 2)) % 5], 0.22 * f);
      c.fillStyle = hexA(cols[(i + (side < 0 ? 0 : 2)) % 5], 0.8 * f); c.fillRect(px - r * 0.14, y - r * 1.5, r * 0.28, r * 3);
    }
  }
  glow(c, 640, 360, 300, COL.magenta, 0.35); glow(c, 640, 380, 120, COL.white, 0.14);
  // 地面湿反光
  for (let i = -6; i <= 6; i++) { c.strokeStyle = hexA(i % 2 ? COL.cyan : COL.magenta, 0.06); c.lineWidth = 2; c.beginPath(); c.moveTo(640 + i * 12, 420); c.lineTo(640 + i * 150, 780); c.stroke(); }
  c.restore();
}

/** S1 街头：两个人互相把词吐出来砸向对方，围观者照常走路 */
const street: Draw = (c, ts, dur, e) => {
  const p = ts / dur, s = lerp(1.0, 1.22, easeInOut(p)), fx = lerp(560, 640, p);
  black(c); cam(c, s, fx, 330, 640, 360);
  bgWorld(c, e.bgNormal); flicker(c, e.signs, ts, 1, 0, 0, 1); fog(c, ts, COL.magenta, 0.8);
  // 路人：在后面一层，照常走过去，打伞，看都不看
  const walkers: [number, number, number, boolean][] = [[-100, 60, 0, false], [1380, -48, 1.7, true], [-500, 74, 3.1, false], [1900, -64, 5, true]];
  walkers.forEach(([x0, sp, off, flip], i) => {
    const x = x0 + sp * (ts + off), y = 458 + (i % 2) * 8, k = 0.95 - (i % 2) * 0.08;
    figure(c, x, y, k, i % 2 ? COL.magenta : COL.cyan, sp < 0, i % 2 === 0, ts * 6 + i);
    void flip;
  });
  // 两个对峙的人
  const L = { x: 450, col: COL.cyan }, R = { x: 830, col: COL.magenta }, y = 470, k = 1.45;
  const volleys: [number, boolean, string][] = [[0.9, true, "闭嘴"], [2.5, false, "你错了"], [4.1, true, "滚开"], [5.5, false, "胡说"], [6.9, true, "认输"], [8.0, false, "你输了"]];
  let recoilL = 0, recoilR = 0;
  const flights: (() => void)[] = [];
  for (const [t0, fromL, word] of volleys) {
    const q = (ts - t0) / 0.8; if (q < 0) continue;
    const ax = fromL ? L.x + 22 * k : R.x - 22 * k, bx = fromL ? R.x - 14 * k : L.x + 14 * k, my = y - 108 * k, by = y - 70 * k;
    if (q < 1) {
      const px = lerp(ax, bx, easeInOut(q)), py = lerp(my, by, q) - Math.sin(q * Math.PI) * 60, sc = lerp(0.2, 0.6, easeOut(q * 1.5));
      flights.push(() => { c.save(); c.globalCompositeOperation = "lighter"; glow(c, px, py, 70, fromL ? COL.cyan : COL.magenta, 0.5); c.restore(); blit(c, tileSprite(word, fromL ? COL.cyan : COL.magenta), px, py, sc, (fromL ? 1 : -1) * 0.25 * (1 - q), 1); });
    } else if (q < 1.9) {
      const h = q - 1; const col = fromL ? COL.cyan : COL.magenta;
      flights.push(() => { c.save(); c.globalCompositeOperation = "lighter"; glow(c, bx, by, 150 * (1 + h * 0.6), col, 0.6 * (1 - h / 0.9)); c.restore(); blit(c, tileSprite(word, col), bx + (fromL ? 1 : -1) * h * 30, by + h * 24, 0.6 - h * 0.15, (fromL ? 1 : -1) * h * 0.6, 1 - h / 0.9); });
      if (fromL) recoilR = Math.max(recoilR, (1 - h / 0.9) * 16); else recoilL = Math.max(recoilL, (1 - h / 0.9) * 16);
    }
  }
  figure(c, L.x - recoilL, y, k, L.col, false, false, 0);
  figure(c, R.x + recoilR, y, k, R.col, true, false, 0);
  flights.forEach((f) => f());
  c.restore();
  ripples(c, ts); rain(c, ts, 1);
  dim(c, 0.08);
};

/** 屋顶底图：夜城远景 + 天台边缘。zoom 与焦点由调用方给 */
function roofBack(c: Ctx, ts: number, e: Env) {
  bgWorld(c, e.bgRuin); flicker(c, e.signs, ts, 1, 0, 0, 0.5); fog(c, ts, COL.cyan, 0.7);
  c.fillStyle = "rgba(3,1,10,.45)"; c.fillRect(-W, -H, W * 3, H * 3);
  // 天线与水塔剪影
  c.fillStyle = "#050210"; c.fillRect(1010, 330, 5, 230); c.fillRect(990, 380, 45, 3); c.fillRect(1000, 420, 25, 3);
  c.beginPath(); c.roundRect(90, 440, 150, 130, 6); c.fill(); c.fillRect(110, 560, 6, 30); c.fillRect(214, 560, 6, 30);
  c.save(); c.globalCompositeOperation = "lighter"; glow(c, 1012, 330, 20, COL.red, 0.5 + Math.sin(ts * 3) * 0.4); c.restore();
}
function roofFront(c: Ctx) {
  const g = c.createLinearGradient(0, 505, 0, 700); g.addColorStop(0, "#150a2e"); g.addColorStop(1, "#030108");
  c.fillStyle = g; c.fillRect(-W, 505, W * 3, 500);
  c.fillStyle = "rgba(138,77,255,.5)"; c.fillRect(-W, 505, W * 3, 3);
}

/** S2 天台：零独自坐着，身边只剩三个字 */
const rooftop: Draw = (c, ts, dur, e) => {
  const p = ts / dur, s = lerp(1.0, 1.22, easeInOut(p));
  black(c); cam(c, s, 640, 330, 640, 360);
  roofBack(c, ts, e);
  // 空空的词牌轮廓：淡淡地飘散
  const R = rng(21);
  c.save(); c.setLineDash([6, 6]); c.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const x = 160 + R() * 960, y0 = 140 + R() * 330, ph = R() * 6, q = ts * 0.12 + R();
    c.strokeStyle = `rgba(184,168,255,${0.2 * clamp(1 - ts / 5.5) * (0.6 + Math.sin(ts + ph) * 0.4)})`;
    c.beginPath(); c.roundRect(x + Math.sin(q * 5 + ph) * 18, y0 - ts * 8, 78, 44, 7); c.stroke();
  }
  c.restore();
  const bob = Math.sin(ts * 1.2) * 2.5;
  const topY = 70 + bob, hh = 500;
  if (e.zero) {
    c.save(); c.globalCompositeOperation = "lighter"; glow(c, 640, 360, 300, COL.cyan, 0.13); c.restore();
    drawChar(c, e.zero, 640, topY, hh, easeOut(ts / 1.2));
  } else text(c, "零", 640, 360, 120, COL.cyan, 0.8);
  roofFront(c);
  // 三个字：在她头顶一张张亮起
  const k = hh / 1216, ux = (u: number) => 640 - (832 * k) / 2 + u * k, vy = (v: number) => topY + v * k;
  const tri: [string, string, number, number, number][] = [["选择", COL.cyan, 4.6, ux(130), vy(130)], ["敌方", COL.magenta, 5.4, ux(420), vy(30)], ["造成", COL.red, 6.2, ux(710), vy(130)]];
  for (const [tx, col, t0, x, y] of tri) {
    const q = ts - t0; if (q < 0) continue;
    const fl = Math.sin(ts * 1.5 + x) * 6;
    blit(c, tileSprite(tx, col), x, y + fl, backOut(q / 0.5) * 0.9, (1 - clamp(q / 0.5)) * -0.3, clamp(q / 0.25));
    c.save(); c.globalCompositeOperation = "lighter"; glow(c, x, y + fl, 120 * (1 + pulse(q, 0, 0.5)), col, 0.12 + pulse(q, 0, 0.6) * 0.5); c.restore();
  }
  c.restore();
  ripples(c, ts * 0.0 + 1); rain(c, ts, 0.8);
  dim(c, 0.1);
};

/** S3 键盘旁亮起一道光，随从小剑出现 */
const sword: Draw = (c, ts, dur, e) => {
  const p = ts / dur, s = lerp(1.1, 1.0, easeOut(p));
  black(c); cam(c, s, 640, 330, 640, 360);
  roofBack(c, ts, e);
  const zx = 470, topY = 70, hh = 500, k = hh / 1216;
  const kbx = zx - (832 * k) / 2 + 520 * k, kby = topY + 780 * k; // 键盘位置
  const lightT = 4.6;
  if (e.zero) { c.save(); c.globalCompositeOperation = "lighter"; glow(c, zx, 360, 280, COL.cyan, 0.12); c.restore(); drawChar(c, e.zero, zx, topY, hh, 1); }
  else text(c, "零", zx, 360, 120, COL.cyan, 0.8);
  roofFront(c);
  // 亮光：从键盘旁升起，凝成小剑
  const q = ts - lightT;
  if (q > 0) {
    const rise = easeOut(q / 1.0), swx = lerp(kbx + 80, 900, easeOut(q / 1.6)), swy = lerp(kby, 330, rise);
    c.save(); c.globalCompositeOperation = "lighter";
    glow(c, kbx, kby, 130 * (1 + pulse(q, 0, 0.8) * 0.8), COL.amber, 0.4 * clamp(q / 0.2) * (1 - clamp((q - 1.4) / 1.2) * 0.6));
    const bw = 90 * (1 - clamp(q / 1.4)); if (bw > 1) { const bg = c.createLinearGradient(kbx - bw, 0, kbx + bw, 0); bg.addColorStop(0, hexA(COL.amber, 0)); bg.addColorStop(0.5, hexA(COL.amber, 0.45)); bg.addColorStop(1, hexA(COL.amber, 0)); c.fillStyle = bg; c.fillRect(kbx - bw, kby - 300, bw * 2, 300); }
    c.restore();
    if (e.sword) {
      const a = clamp((q - 0.5) / 0.9), shh = lerp(280, 400, easeOut((q - 0.5) / 1.6));
      c.save(); c.globalCompositeOperation = "lighter"; glow(c, swx, swy + 60, 240, COL.amber, 0.3 * a); c.restore();
      drawChar(c, e.sword, swx, swy - shh * 0.35 + Math.sin(ts * 1.6) * 4, shh, a);
    } else {
      c.save(); c.globalCompositeOperation = "lighter"; glow(c, swx, swy, 140, COL.amber, 0.5 * clamp(q / 0.8)); c.restore();
    }
    const fl = pulse(q, 0, 0.5); if (fl > 0) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = hexA(COL.amber, fl * 0.2); c.fillRect(-W, -H, W * 3, H * 3); c.restore(); }
  }
  c.restore();
  rain(c, ts, 0.8);
  dim(c, 0.08);
};

/** S4 屏幕跳出匿名消息；零犹豫，戴上护目镜，站起来 */
const message: Draw = (c, ts, dur, e) => {
  black(c);
  // 背景：天台，慢推向消息卡片所在的位置
  const s = lerp(1.0, 1.12, easeInOut(ts / dur));
  cam(c, s, 640, 360, 640, 360);
  roofBack(c, ts, e); roofFront(c);
  c.fillStyle = "rgba(3,1,10,.55)"; c.fillRect(-W, -H, W * 3, H * 3);
  // 零：近景，低头看屏幕 -> 抬头 -> 护目镜落下 -> 站起
  const rise = easeInOut((ts - 5.8) / 1.8), hh = 520, topY = lerp(60, 30, rise), cx = 360;
  if (e.zero) {
    drawChar(c, e.zero, cx, topY, hh, 1 - clamp((ts - 7.0) / 0.8) * 0.0);
    const g = clamp((ts - 4.6) / 0.5);
    if (g > 0) { // 护目镜：镜片先亮起一道光，再落到眼前
      const k = hh / 1216, ux = (u: number) => cx - (832 * k) / 2 + u * k, vy = (v: number) => topY + v * k;
      c.save(); c.globalCompositeOperation = "lighter"; glow(c, ux(530), vy(245), 150 * k * 2, COL.cyan, 0.5 * pulse(ts, 4.6, 1.2)); c.restore();
      const dn = easeOut((ts - 5.0) / 0.5);
      if (dn > 0) {
        c.save(); c.globalAlpha = 0.3 * dn; c.fillStyle = hexA(COL.cyan, 0.8); c.shadowColor = COL.cyan; c.shadowBlur = 10;
        c.beginPath(); c.roundRect(ux(300), vy(lerp(300, 345, dn)), 215 * k, 50 * k, 12 * k); c.fill(); c.restore();
      }
    }
  }
  c.restore();
  // 消息卡片（屏幕上弹出的一条）
  const q = ts - 0.6;
  if (q > 0) {
    const a = easeOut(q / 0.5) * (1 - clamp((ts - 5.2) / 0.5)), py = 365 + (1 - easeOut(q / 0.5)) * 40 + clamp((ts - 5.2) / 0.5) * 20;
    c.save(); c.globalAlpha = a; c.translate(900, py);
    c.shadowColor = COL.cyan; c.shadowBlur = 26;
    c.beginPath(); c.roundRect(-250, -118, 500, 236, 14);
    const g2 = c.createLinearGradient(0, -118, 0, 118); g2.addColorStop(0, "rgba(10,28,44,.94)"); g2.addColorStop(1, "rgba(6,12,28,.94)");
    c.fillStyle = g2; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.cyan; c.stroke(); c.shadowBlur = 0;
    c.textAlign = "left"; c.textBaseline = "middle";
    c.font = `500 20px ${FONT}`; c.fillStyle = hexA(COL.cyan, 0.85); c.fillText("匿名消息", -218, -80);
    c.strokeStyle = "rgba(25,230,255,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-218, -56); c.lineTo(218, -56); c.stroke();
    c.font = `700 30px ${FONT}`; c.fillStyle = "#fff";
    const body = "想要回你的词，";
    const body2 = "到巷子最深处。";
    const n1 = Math.floor(clamp((ts - 1.2) / 1.4) * body.length), n2 = Math.floor(clamp((ts - 2.6) / 1.4) * body2.length);
    c.fillText(body.slice(0, n1), -218, -14); c.fillText(body2.slice(0, n2), -218, 30);
    if (ts > 4.0) { c.font = `500 24px ${FONT}`; c.fillStyle = hexA(COL.cyan, clamp((ts - 4.0) / 0.5)); c.textAlign = "right"; c.fillText("——阿词", 218, 82); }
    c.restore();
  }
  rain(c, ts, 0.6);
  dim(c, 0.06);
};

/** S5 暗巷：零一步步走进雨里，尽头披斗篷的阿词背对着她，身旁立着稻草人 */
const alley: Draw = (c, ts, dur, _e) => {
  const p = ts / dur, z = lerp(1.0, 1.5, easeInOut(p));
  black(c); cam(c, z, 640, 400, 640, 430);
  alleyBg(c, ts);
  // 尽头的两个人
  mentor(c, 620, 405, 0.42, 0, ts); scarecrow(c, 722, 405, 0.4, 0, ts);
  // 零：背影，越走越远
  const q = easeInOut(ts / (dur - 0.5)), y = lerp(640, 470, q), k = lerp(1.15, 0.62, q);
  zeroBack(c, lerp(480, 530, q), y, k, ts, ts * 5.2 * lerp(1, 0.7, q));
  c.restore();
  ripples(c, ts); rain(c, ts, 1); fog(c, ts, COL.magenta, 0.5);
  dim(c, lerp(0.15, 0.0, p));
};

/** S6 阿词转身；零的背影在前景，稻草人的眼睛亮起 */
const turn: Draw = (c, ts, dur, e) => {
  const p = ts / dur, z = lerp(2.3, 2.55, easeInOut(p));
  black(c); cam(c, z, 660, 400, 720, 470);
  alleyBg(c, ts);
  const f = easeInOut((ts - 0.5) / 1.0), lit = easeOut((ts - 5.8) / 1.2);
  mentor(c, 620, 405, 0.42, f, ts); scarecrow(c, 722, 405, 0.4, lit, ts);
  c.restore();
  // 前景：零的背影（越肩镜头）
  zeroBack(c, 150, 930, 2.6, ts, 0);
  c.save(); c.globalCompositeOperation = "lighter"; glow(c, 880, 330, 340, COL.cyan, 0.1 + lit * 0.12); c.restore();
  void e;
  rain(c, ts, 1); fog(c, ts, COL.magenta, 0.4);
  dim(c, 0.05);
};

/** S7 稻草人的光漫开，化为标题《词战》 */
const title: Draw = (c, ts, dur, e) => {
  black(c);
  const z = lerp(2.55, 3.4, easeInOut(ts / dur));
  cam(c, z, 722, 330, 640, 330);
  alleyBg(c, ts); scarecrow(c, 722, 405, 0.4, 1, ts);
  c.restore();
  const wash = clamp(ts / 2.6);
  c.fillStyle = `rgba(3,1,10,${lerp(0.1, 0.86, easeInOut(wash))})`; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = "lighter"; glow(c, 640, 300, 460 + Math.sin(ts * 2) * 20, COL.cyan, 0.16 * easeInOut(wash)); glow(c, 640, 300, 320, COL.magenta, 0.12 * easeInOut(wash)); c.restore();
  // 三个字缓缓升空
  const tri: [string, string, number, number][] = [["选择", COL.cyan, 0, 230], ["敌方", COL.magenta, 0.35, 1040], ["造成", COL.red, 0.7, 150]];
  for (const [tx, col, d, bx] of tri) { const q = (ts - 0.4 - d) / 3.4; if (q > 0 && q < 1) blit(c, tileSprite(tx, col), bx + Math.sin(q * 4) * 20, 600 - q * 420, 0.8, 0.2 * (d - 0.35), Math.sin(q * Math.PI) * 0.7); }
  const q = ts - 1.2;
  if (q > 0) {
    c.save(); c.globalAlpha = clamp((q - 0.8) / 0.6); c.font = `700 24px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = COL.cyan; c.shadowColor = COL.cyan; c.shadowBlur = 14;
    if ("letterSpacing" in c) (c as unknown as { letterSpacing: string }).letterSpacing = "14px";
    c.fillText("WORD  COMBAT", 640 + 7, 452); c.restore();
    c.save(); c.globalAlpha = clamp((q - 1) / 0.6) * 0.8; c.strokeStyle = COL.magenta; c.shadowColor = COL.magenta; c.shadowBlur = 12; c.lineWidth = 2;
    const L = 220 * easeOut((q - 1) / 0.8); c.beginPath(); c.moveTo(640 - L, 480); c.lineTo(640 + L, 480); c.stroke(); c.restore();
  }
  rain(c, ts, 0.6);
  void e;
};

export const SCENES: Record<SceneId, Draw> = { street, rooftop, sword, message, alley, turn, title };

// ---------- 环境构建（一次） ----------
function loadImg(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
}
/** 立绘 -> 带描边发光的精灵 */
function makeChar(img: HTMLImageElement | null, color: string, rim: [string, string]): Char | null {
  if (!img) return null;
  const pw = 460, ph = Math.round((460 * img.height) / img.width), pad = 30;
  const [gc, g] = mk(pw + pad * 2, ph + pad * 2);
  const [tc, t] = mk(pw, ph); t.drawImage(img, 0, 0, pw, ph); t.globalCompositeOperation = "source-in"; t.fillStyle = color; t.fillRect(0, 0, pw, ph);
  g.filter = "blur(10px)"; g.globalAlpha = 0.85; g.drawImage(tc, pad, pad); g.filter = "none"; g.globalAlpha = 1;
  g.drawImage(img, pad, pad, pw, ph);
  const [rc, r] = mk(pw, ph); r.drawImage(img, 0, 0, pw, ph); r.globalCompositeOperation = "source-in";
  const lg = r.createLinearGradient(0, 0, pw, 0); lg.addColorStop(0, rim[0]); lg.addColorStop(0.5, "rgba(0,0,0,0)"); lg.addColorStop(1, rim[1]);
  r.fillStyle = lg; r.fillRect(0, 0, pw, ph);
  g.globalCompositeOperation = "lighter"; g.drawImage(rc, pad, pad); g.globalCompositeOperation = "source-over";
  return { glow: gc, pw, ph, pad };
}
export async function buildEnv(zeroUrl: string | null, swordUrl: string | null): Promise<Env> {
  const a = buildCity(false, 11), b = buildCity(true, 11);
  const [zi, si] = await Promise.all([loadImg(zeroUrl), loadImg(swordUrl)]);
  return {
    bgNormal: a.cv, bgRuin: b.cv, signs: a.signs,
    zero: makeChar(zi, COL.cyan, ["rgba(255,47,160,.55)", "rgba(25,230,255,.4)"]),
    sword: makeChar(si, COL.amber, ["rgba(255,176,46,.5)", "rgba(255,47,160,.3)"]),
  };
}

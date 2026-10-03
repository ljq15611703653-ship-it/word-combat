// 开场演出的画面：全部是 Canvas2D 程序化绘制（逻辑分辨率 1280x720），不依赖外部图片（黑客立绘除外，可缺省）。
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
  portrait: HTMLImageElement | null; portraitGlow: Cv | null;
}
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

function drawBg(c: Ctx, bg: Cv, s = 1, dx = 0, dy = 0) {
  c.save(); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(dx, dy); c.drawImage(bg, -BW / 2, -BH / 2); c.restore();
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
function beam(c: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, t: number, a = 1) {
  c.save(); c.globalAlpha = a; c.lineCap = "round";
  c.shadowColor = color; c.shadowBlur = 16; c.strokeStyle = color; c.lineWidth = 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.shadowBlur = 0; c.strokeStyle = "#fff"; c.lineWidth = 1.2; c.stroke();
  const p = (t * 1.2) % 1;
  c.fillStyle = "#fff"; c.shadowColor = color; c.shadowBlur = 12; c.beginPath(); c.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 3.2, 0, 6.283); c.fill();
  c.restore();
}
const POOL = ["选择", "造成", "恢复", "友方", "敌方", "减伤", "重复", "延后", "并", "持续", "转移", "移除", "灼烧", "易伤"];
const POOLC = [COL.cyan, COL.magenta, COL.amber, COL.green, COL.violet];

// ---------- 各场景 ----------
type Draw = (c: Ctx, ts: number, dur: number, e: Env) => void;

/** S1 夜城：雨、霓虹、缓慢推进 */
const city: Draw = (c, ts, dur, e) => {
  const p = ts / dur, s = lerp(1, 1.14, easeInOut(p)), dy = lerp(18, -14, p), dx = Math.sin(ts * 0.3) * 10;
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  drawBg(c, e.bgNormal, s, dx, dy);
  flicker(c, e.signs, ts, s, dx, dy, 1);
  fog(c, ts, COL.magenta, 0.9);
  const vx = ((ts * 70 + 200) % 1500) - 100;
  c.save(); c.globalCompositeOperation = "lighter"; glow(c, vx, 190 + Math.sin(ts) * 6, 26, COL.cyan, 0.9); c.fillStyle = hexA(COL.red, 0.9); c.fillRect(vx + 7, 188, 3, 3); glow(c, vx - 40, 192, 70, COL.cyan, 0.12); c.restore();
  ripples(c, ts); rain(c, ts, 1);
};

/** S2 词牌升空：行人头顶飞出词牌，天空里漂满发光的词 */
const words: Draw = (c, ts, dur, e) => {
  const p = ts / dur; const s = lerp(1.1, 1.0, easeOut(p * 1.4));
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  drawBg(c, e.bgNormal, s);
  c.globalAlpha = clamp((p - 0.15) / 0.6) * 0.8; drawBg(c, e.bgRuin, s); c.globalAlpha = 1;
  flicker(c, e.signs, ts, s, 0, 0, lerp(1, 0.6, p));
  const R = rng(55);
  for (let i = 0; i < 6; i++) {
    const x = 120 + i * 200 + R() * 60, y = 640 + R() * 40, k = 0.8 + R() * 0.5, t0 = 0.6 + i * 0.7;
    c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = "#050210";
    c.beginPath(); c.arc(0, -108, 13, 0, 6.283); c.fill();
    c.beginPath(); c.moveTo(-18, -92); c.lineTo(18, -92); c.lineTo(24, -10); c.lineTo(-24, -10); c.closePath(); c.fill();
    c.fillRect(-14, -12, 10, 60); c.fillRect(4, -12, 10, 60);
    c.strokeStyle = "rgba(25,230,255,.35)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-24, -10); c.lineTo(-18, -92); c.lineTo(18, -92); c.stroke();
    c.restore();
    const q = (ts - t0) / 3.6;
    if (q > 0 && q < 1) {
      const gx = x + Math.sin(q * 5 + i) * 26, gy = y - 120 * k - q * 520;
      c.save(); c.globalCompositeOperation = "lighter"; blit(c, glyphSprite(POOL[(i * 2) % POOL.length], POOLC[i % 5]), gx, gy, 0.8 + q * 0.7, q * 3 * (i % 2 ? 1 : -1), 1 - q * q);
      c.restore();
    }
  }
  const R2 = rng(3);
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 42; i++) {
    const x0 = R2() * W, y0 = 120 + R2() * 520, sp = 20 + R2() * 70, t0 = R2() * 7, sz = 0.5 + R2() * 0.9, ph = R2() * 6;
    const q = ts - t0; if (q < 0) continue;
    const a = clamp(q / 0.8) * clamp(1.2 - (y0 - sp * q) / 700);
    blit(c, glyphSprite(POOL[i % POOL.length], POOLC[i % 5]), x0 + Math.sin(q * 0.8 + ph) * 30, y0 - sp * q, sz, q * 0.6 * (i % 2 ? 1 : -1) + ph, a * 0.9);
  }
  c.restore();
  ripples(c, ts); rain(c, ts, 1); fog(c, ts, COL.cyan, 0.5);
  dim(c, lerp(0.05, 0.25, p));
};

/** S3 黑客立绘 + 词牌拼成一句 */
const hacker: Draw = (c, ts, dur, e) => {
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  const s = lerp(1.05, 1.0, ts / dur);
  drawBg(c, e.bgRuin, s, -20, 0);
  flicker(c, e.signs, ts, s, -20, 0, 0.7);
  fog(c, ts, COL.cyan, 0.8);
  c.save(); c.globalCompositeOperation = "lighter"; glow(c, 930, 690, 330, COL.cyan, 0.12); glow(c, 320, 650, 300, COL.magenta, 0.1); c.restore();
  const pin = easeOut(ts / 1.4), bob = Math.sin(ts * 1.3) * 3;
  const hh = 660, ww = hh * (832 / 1216);
  if (e.portraitGlow && e.portrait) {
    const px = 940 + (1 - pin) * 80, py = H - hh + 24 + bob;
    c.save(); c.globalAlpha = pin; c.globalCompositeOperation = "lighter"; glow(c, px, py + hh * 0.45, 330, COL.cyan, 0.16); c.restore();
    c.save(); c.globalAlpha = pin;
    c.drawImage(e.portraitGlow, px - ww / 2 - 30, py - 30, ww + 60, hh + 60);
    c.restore();
  } else text(c, "黑客", 940, 360, 90, COL.cyan, 0.8);
  const tiles: [string, string, number, number, number][] = [["选择", COL.cyan, 1.2, 250, 250], ["敌方", COL.magenta, 2.4, 400, 370], ["造成", COL.red, 3.6, 550, 490]];
  const ready = tiles.filter((t) => ts > t[2]);
  for (let i = 1; i < ready.length; i++) beam(c, ready[i - 1][3], ready[i - 1][4], ready[i][3], ready[i][4], COL.violet, ts + i, clamp((ts - ready[i][2]) / 0.3));
  for (const [tx, col, t0, x, y] of tiles) {
    const q = ts - t0; if (q < 0) continue;
    const fl = Math.sin(ts * 1.6 + x) * 5;
    blit(c, tileSprite(tx, col, true), x, y + fl, backOut(q / 0.5), (1 - clamp(q / 0.5)) * -0.3, clamp(q / 0.2));
    c.save(); c.globalCompositeOperation = "lighter"; glow(c, x, y + fl, 160 * (1 + pulse(q, 0, 0.5)), col, 0.12 + pulse(q, 0, 0.5) * 0.5); c.restore();
  }
  // 拼成之后：一道光沿着连线冲向立绘
  if (ts > 6.6) { const q = clamp((ts - 6.6) / 1.2); const x = lerp(550, 820, q), y = lerp(490, 430, q); c.save(); c.globalCompositeOperation = "lighter"; glow(c, x, y, 120, COL.white, 0.5 * (1 - q * 0.5)); c.restore(); }
  ripples(c, ts); rain(c, ts, 0.9);
  dim(c, 0.12);
};

/** S4 暗巷训练场：稻草人，词师阿词的全息影像 */
const mentor: Draw = (c, ts) => {
  const wake = 5.0;
  c.fillStyle = "#020008"; c.fillRect(0, 0, W, H);
  const near = easeInOut(ts / 5.0), back = easeInOut((ts - 5.4) / 2.2), z = 1 + (lerp(0, 0.45, near)) * (1 - back);
  const fx = lerp(640, 380, near * (1 - back)), fy = lerp(360, 380, near * (1 - back));
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-fx, -fy);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#07020f"); g.addColorStop(1, "#150628");
  c.fillStyle = g; c.fillRect(-300, -300, W + 600, H + 600);
  c.strokeStyle = "rgba(138,77,255,.07)"; c.lineWidth = 1;
  for (let y = -200; y < 620; y += 26) { c.beginPath(); c.moveTo(-300, y); c.lineTo(W + 300, y); c.stroke(); }
  for (let y = -200, r = 0; y < 620; y += 26, r++) for (let x = -300 + (r % 2) * 30; x < W + 300; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 26); c.stroke(); }
  c.fillStyle = "#0c0520"; c.fillRect(-300, 600, W + 600, 400);
  c.save(); c.globalCompositeOperation = "lighter"; glow(c, 640, 200, 520, COL.magenta, 0.2); glow(c, 260, 600, 380, COL.cyan, 0.08); glow(c, 600, 620, 300, COL.magenta, 0.12); c.restore();
  c.save(); c.shadowColor = COL.magenta; c.shadowBlur = 22; c.strokeStyle = COL.magenta; c.lineWidth = 4; c.strokeRect(540, 90, 190, 60);
  c.fillStyle = COL.magenta; c.font = `700 34px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.globalAlpha = Math.sin(ts * 27) > 0.9 ? 0.4 : 1; c.fillText("训练场", 635, 121); c.restore();
  // 稻草人：木桩 + 横杆 + 麻袋头，缝线眼睛
  c.save(); c.translate(-220, 0); c.fillStyle = "#06020d"; c.strokeStyle = "rgba(255,176,46,.55)"; c.lineWidth = 2;
  c.beginPath(); c.roundRect(588, 330, 24, 280, 6); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(480, 380, 240, 18, 8); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(540, 396, 120, 110, 20); c.fill(); c.stroke();
  c.beginPath(); c.arc(600, 322, 38, 0, 6.283); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(552, 306); c.lineTo(648, 306); c.lineTo(618, 262); c.lineTo(582, 262); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = hexA(COL.red, 0.9); c.lineWidth = 3;
  for (const ex of [-14, 14]) { c.beginPath(); c.moveTo(600 + ex - 6, 314); c.lineTo(600 + ex + 6, 326); c.moveTo(600 + ex + 6, 314); c.lineTo(600 + ex - 6, 326); c.stroke(); }
  c.beginPath(); c.moveTo(584, 342); c.lineTo(616, 342); c.stroke();
  c.strokeStyle = "rgba(255,176,46,.6)"; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const sx = 482 + i * 3, sy = 398; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 12 - i * 2, sy + 22 + i * 2); c.moveTo(718 - i * 3, sy); c.lineTo(730 + i * 2, sy + 22 + i * 2); c.stroke(); }
  c.restore();
  c.save(); c.translate(-220, 0); // 头顶 2 点生命
  for (let i = 0; i < 2; i++) { c.save(); c.shadowColor = COL.green; c.shadowBlur = 10; c.fillStyle = COL.green; c.beginPath(); c.arc(582 + i * 36, 238, 9, 0, 6.283); c.fill(); c.restore(); }
  text(c, "HP 2", 600, 212, 20, COL.green, 0.9, 8, 500);
  c.restore();
  c.restore();
  // 阿词：披斗篷的词师，从巷口的阴影里走进霓虹光里
  if (ts > 5.0) {
    const q = ts - 5.0, walk = easeOut(q / 2.6), x = lerp(1180, 900, walk), a = clamp(q / 0.8);
    const step = walk < 0.98 ? Math.abs(Math.sin(q * 5.5)) * 5 : Math.sin(ts * 1.4) * 1.5, y = 596 - step;
    c.save(); c.globalAlpha = a; c.translate(x, y);
    c.save(); c.fillStyle = "rgba(0,0,0,.5)"; c.beginPath(); c.ellipse(0, 4, 78, 12, 0, 0, 6.283); c.fill(); c.restore();
    c.fillStyle = "#07031a"; c.strokeStyle = hexA(COL.cyan, 0.7); c.lineWidth = 3; c.lineJoin = "round";
    c.beginPath(); c.moveTo(-74, 0); c.quadraticCurveTo(-54, -150, -36, -250); c.lineTo(36, -250); c.quadraticCurveTo(56, -150, 76, 0); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-40, -250); c.quadraticCurveTo(0, -330, 40, -250); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -282, 30, 0, 6.283); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-52, -296); c.quadraticCurveTo(0, -352, 52, -296); c.quadraticCurveTo(0, -318, -52, -296); c.fill(); c.stroke();
    c.save(); c.shadowColor = COL.cyan; c.shadowBlur = 14; c.fillStyle = COL.cyan; c.fillRect(-14, -280, 10, 4); c.fillRect(6, -280, 10, 4); c.restore();
    c.strokeStyle = hexA(COL.amber, 0.9); c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(-96, 4); c.lineTo(-92, -300); c.stroke();
    c.restore();
    c.save(); c.globalCompositeOperation = "lighter"; glow(c, x + 96, y - 190, 150, COL.cyan, 0.3 * a); c.restore();
    blit(c, tileSprite("词", COL.cyan, true), x + 96, y - 190 + Math.sin(ts * 2.2) * 8, 0.8, 0.12, a);
  }
  rain(c, ts, 0.6); fog(c, ts, COL.magenta, 0.6);
  dim(c, 0.1 * (1 - clamp((ts - wake) / 1)));
};

/** S5 时间轴：双方每秒各说一句，先出手的先落下 */
const timeline: Draw = (c, ts, _dur, e) => {
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  drawBg(c, e.bgNormal, 1.0); dim(c, 0.8);
  flicker(c, e.signs, ts, 1, 0, 0, 0.25);
  const x0 = 110, step = 106, yb = 380;
  const xOf = (s: number) => x0 + (s - 0.5) * step;
  const cur = x0 + clamp((ts - 0.8) / 6.6) * step * 10;
  const appear = clamp(ts / 0.6);
  // 轴
  c.save(); c.globalAlpha = appear;
  c.shadowColor = COL.violet; c.shadowBlur = 14; c.strokeStyle = COL.violet; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, yb); c.lineTo(x0 + step * 10, yb); c.stroke(); c.shadowBlur = 0;
  c.font = `500 18px ${FONT}`; c.textAlign = "center"; c.fillStyle = "#b8a8ff";
  for (let i = 0; i <= 10; i++) { c.strokeStyle = "rgba(184,168,255,.6)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0 + i * step, yb - 8); c.lineTo(x0 + i * step, yb + 8); c.stroke(); if (i) c.fillText(`${i}`, xOf(i), yb + 34); }
  c.restore();
  text(c, "我方", 62, 300, 22, COL.cyan, appear, 8); text(c, "敌方", 62, 460, 22, COL.red, appear, 8);
  const ev: [number, string, string, boolean, number, string][] = [
    [1, "造成 3", COL.cyan, true, 0.5, "-3"], [3, "造成 3", COL.red, false, 1.0, "-3"], [4, "恢复 2", COL.green, true, 1.5, "+2"], [6, "造成 4", COL.red, false, 2.0, "-4"],
  ];
  for (const [sec, label, col, mine, t0, num] of ev) {
    const q = ts - t0; if (q < 0) continue; const p = easeOut(q / 0.5);
    const x = xOf(sec), y = (mine ? 300 : 460) + (1 - p) * (mine ? -40 : 40);
    const hitT = 0.8 + (sec - 0.5) / 10 * 6.6, hq = ts - hitT, done = hq >= 0;
    c.save(); c.globalAlpha = p;
    c.shadowColor = col; c.shadowBlur = done ? 26 : 12;
    c.beginPath(); c.roundRect(x - 46, y - 22, 92, 44, 8); c.fillStyle = done ? hexA(col, 0.35) : "rgba(10,5,30,.85)"; c.fill(); c.lineWidth = 2.5; c.strokeStyle = col; c.stroke();
    c.shadowBlur = 0; c.font = `700 20px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText(label, x, y + 1);
    c.strokeStyle = hexA(col, 0.5); c.lineWidth = 1.5; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(x, mine ? y + 22 : y - 22); c.lineTo(x, yb); c.stroke();
    c.restore();
    if (done && hq < 1.4) {
      c.save(); c.globalCompositeOperation = "lighter"; glow(c, x, yb, 120 * (1 + pulse(hq, 0, 0.5)), col, 0.5 * (1 - hq / 1.4)); c.restore();
      text(c, num, x, yb + (mine ? -90 : 90) - hq * 30 * (mine ? 1 : -1) * -1 * 0 + (mine ? -hq * 30 : hq * 30), 44, col, 1 - hq / 1.4, 18);
    }
  }
  // 游标
  if (ts > 0.8) {
    c.save(); c.shadowColor = COL.white; c.shadowBlur = 20; c.strokeStyle = "#fff"; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(cur, 230); c.lineTo(cur, 530); c.stroke(); c.restore();
    c.save(); c.globalCompositeOperation = "lighter"; const lg = c.createLinearGradient(cur - 120, 0, cur, 0); lg.addColorStop(0, "rgba(138,77,255,0)"); lg.addColorStop(1, "rgba(138,77,255,.28)"); c.fillStyle = lg; c.fillRect(cur - 120, 230, 120, 300); c.restore();
  }
  rain(c, ts, 0.4);
  let gl = 0.04; for (const [sec] of ev) gl = Math.max(gl, pulse(ts, 0.8 + (sec - 0.5) / 10 * 6.6, 0.2) * 0.5);
};

const FAM: [string, string, string, string][] = [["并", COL.cyan, "把句子接长", "并流"], ["续", COL.green, "让效果持续", "续流"], ["择", COL.amber, "目标事后再定", "择流"], ["血", COL.red, "以血换行动", "血流"]];
/** S6 四个职业 */
const families: Draw = (c, ts, _dur, e) => {
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  drawBg(c, e.bgNormal, 1.0); dim(c, 0.72);
  flicker(c, e.signs, ts, 1, 0, 0, 0.3);
  c.save(); c.strokeStyle = "rgba(138,77,255,.22)"; c.lineWidth = 1;
  for (let i = 0; i < 12; i++) { const y = 420 + Math.pow(i / 11, 2) * 300 + ((ts * 20) % 1); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.restore();
  const xs = [0, 1, 2, 3].map((i) => 190 + i * 300);
  FAM.forEach(([ch, col, sub, name], i) => {
    const t0 = 0.6 + i, q = ts - t0, x = xs[i], y = 330;
    const on = clamp(q / 0.35), kick = pulse(q, 0, 0.5);
    c.save(); c.translate(x, y + (1 - easeOut(q / 0.5)) * 40); c.globalAlpha = 0.25 + on * 0.75;
    const w = 220, h = 380;
    c.shadowColor = col; c.shadowBlur = on * (22 + kick * 30);
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 16);
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, hexA(col, 0.18 * on)); g.addColorStop(1, "rgba(8,4,24,.85)");
    c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = on > 0.1 ? col : "#3a3350"; c.stroke();
    c.restore();
    if (on > 0) {
      text(c, ch, x, y - 40, 150 + kick * 20, col, on, 30);
      text(c, name, x, y + 80, 28, col, on, 10);
      text(c, sub, x, y + 128, 22, "#d8d0ff", on * 0.9, 4, 500);
      c.save(); c.globalCompositeOperation = "lighter"; glow(c, x, y - 40, 190 * (1 + kick * 0.5), col, 0.15 + kick * 0.3); c.restore();
    }
  });
  if (ts > 4.1) for (let i = 0; i < 3; i++) beam(c, xs[i] + 112, 330, xs[i + 1] - 112, 330, COL.violet, ts + i * 0.3, clamp((ts - 4.1) / 0.5));
  rain(c, ts, 0.4);
};

/** S7 拼出第一句「选择 1 敌方 造成 1」，标题《词战》 */
const assemble: Draw = (c, ts, dur, e) => {
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  const zoom = 1 + easeOut(ts / dur) * 0.06;
  drawBg(c, e.bgNormal, zoom); dim(c, lerp(0.7, 0.45, clamp(ts / 5)));
  flicker(c, e.signs, ts, zoom, 0, 0, 0.6);
  fog(c, ts, COL.cyan, 0.7);
  const seq: [string, string, number][] = [["选择", COL.cyan, 1.2], ["1", COL.white, 1.9], ["敌方", COL.magenta, 2.6], ["造成", COL.red, 3.3], ["1", COL.white, 4.0]];
  const xs = seq.map((_, i) => 160 + i * 240), y = 330;
  const disp = clamp((ts - 5.0) / 0.5);
  const fire = pulse(ts, 4.5, 0.6);
  for (let i = 1; i < 5; i++) if (ts > seq[i][2]) beam(c, xs[i - 1] + 70, y, xs[i] - 70, y, COL.violet, ts + i, clamp((ts - seq[i][2]) / 0.3) * (1 - disp));
  seq.forEach(([tx, col, t0], i) => {
    const q = ts - t0; if (q < 0) return;
    const fromX = i % 2 ? W + 120 : -120, fromY = i % 2 ? 80 : 640;
    const p = easeOut(q / 0.55);
    const x = lerp(fromX, xs[i], p), yy = lerp(fromY, y, p) + Math.sin(ts * 2 + i) * 3 * p;
    blit(c, tileSprite(tx, col, true), lerp(x, 640, disp), lerp(yy, y, disp), (1 + pulse(q - 0.5, 0, 0.3) * 0.25 + fire * 0.12) * (1 - disp * 0.6), (1 - p) * (i % 2 ? 0.8 : -0.8), 1 - disp);
    c.save(); c.globalCompositeOperation = "lighter"; glow(c, x, yy, 180 * (1 + pulse(q - 0.5, 0, 0.5)), col, 0.12 + pulse(q - 0.5, 0, 0.5) * 0.45 + fire * 0.2); c.restore();
  });
  const fl = pulse(ts, 5.0, 0.8);
  if (fl > 0) { c.fillStyle = `rgba(255,245,255,${fl * 0.85})`; c.fillRect(0, 0, W, H); }
  if (ts > 5.1) {
    const q = ts - 5.1;
    c.save(); c.globalCompositeOperation = "lighter";
    glow(c, 640, 300, 420 + Math.sin(ts * 2) * 20, COL.magenta, 0.2); glow(c, 640, 300, 300, COL.cyan, 0.16);
    c.restore();
    c.save(); c.globalAlpha = clamp((q - 0.8) / 0.6); c.font = `700 24px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = COL.cyan; c.shadowColor = COL.cyan; c.shadowBlur = 14;
    if ("letterSpacing" in c) (c as unknown as { letterSpacing: string }).letterSpacing = "14px";
    c.fillText("WORD  COMBAT", 640 + 7, 452); c.restore();
    c.save(); c.globalAlpha = clamp((q - 1) / 0.6) * 0.8; c.strokeStyle = COL.magenta; c.shadowColor = COL.magenta; c.shadowBlur = 12; c.lineWidth = 2;
    const L = 220 * easeOut((q - 1) / 0.8); c.beginPath(); c.moveTo(640 - L, 480); c.lineTo(640 + L, 480); c.stroke(); c.restore();
  }
  rain(c, ts, 0.5);
};

export const SCENES: Record<SceneId, Draw> = { city, words, hacker, mentor, timeline, families, assemble };

// ---------- 环境构建（一次） ----------
export async function buildEnv(portraitUrl: string | null): Promise<Env> {
  const a = buildCity(false, 11), b = buildCity(true, 11);
  let portrait: HTMLImageElement | null = null, portraitGlow: Cv | null = null;
  if (portraitUrl) {
    portrait = await new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = portraitUrl; });
    if (portrait) {
      const pw = 460, ph = Math.round((460 * portrait.height) / portrait.width), pad = 30;
      const [gc, g] = mk(pw + pad * 2, ph + pad * 2);
      const [tc, t] = mk(pw, ph); t.drawImage(portrait, 0, 0, pw, ph); t.globalCompositeOperation = "source-in"; t.fillStyle = COL.cyan; t.fillRect(0, 0, pw, ph);
      g.filter = "blur(10px)"; g.globalAlpha = 0.85; g.drawImage(tc, pad, pad); g.filter = "none"; g.globalAlpha = 1;
      g.drawImage(portrait, pad, pad, pw, ph);
      const [rc, r] = mk(pw, ph); r.drawImage(portrait, 0, 0, pw, ph); r.globalCompositeOperation = "source-in";
      const lg = r.createLinearGradient(0, 0, pw, 0); lg.addColorStop(0, "rgba(255,47,160,.55)"); lg.addColorStop(0.5, "rgba(255,47,160,0)"); lg.addColorStop(1, "rgba(25,230,255,.4)");
      r.fillStyle = lg; r.fillRect(0, 0, pw, ph);
      g.globalCompositeOperation = "lighter"; g.drawImage(rc, pad, pad); g.globalCompositeOperation = "source-over";
      portraitGlow = gc;
    }
  }
  return { bgNormal: a.cv, bgRuin: b.cv, signs: a.signs, portrait, portraitGlow };
}

// 用 canvas 现画的贴图：电路板、卡内走线、文字面板。都不依赖外部素材。
import * as THREE from "three";
import { CSS, FONT_CN, FONT_NUM } from "./theme";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 走 45°/90° 折线的随机走线，末端画焊盘。返回画好的 ctx 便于叠加。 */
function drawTraces(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, color: string, width: number) {
  const r = rng(seed);
  const grid = Math.max(8, Math.round(width * 4));
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < n; i++) {
    let x = Math.round((r() * w) / grid) * grid;
    let y = Math.round((r() * h) / grid) * grid;
    ctx.lineWidth = width * (r() < 0.2 ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 2 + Math.floor(r() * 4);
    let dir = Math.floor(r() * 4);
    for (let s = 0; s < segs; s++) {
      const len = (2 + Math.floor(r() * 10)) * grid;
      const diag = r() < 0.35;
      const dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir];
      if (diag) {
        x += (dx || (r() < 0.5 ? 1 : -1)) * len * 0.5;
        y += (dy || (r() < 0.5 ? 1 : -1)) * len * 0.5;
      } else {
        x += dx * len;
        y += dy * len;
      }
      ctx.lineTo(x, y);
      dir = (dir + (r() < 0.5 ? 1 : 3)) % 4;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, width * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 地面电路板：底色 + 暗走线 + 亮走线 + 芯片焊盘阵列。返回 [颜色贴图, 发光贴图]。 */
export function pcbTextures(): [THREE.Texture, THREE.Texture] {
  const S = 2048;
  const [c, x] = canvas(S, S);
  x.fillStyle = "#04211d";
  x.fillRect(0, 0, S, S);
  // 细网格
  x.strokeStyle = "rgba(31,214,180,0.05)";
  x.lineWidth = 1;
  for (let i = 0; i < S; i += 32) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
  }
  drawTraces(x, S, S, 260, 7, "#0b4a40", 3);
  // 焊盘阵列（像 QFP 芯片的脚）
  const r = rng(3);
  for (let k = 0; k < 18; k++) {
    const cx = r() * S, cy = r() * S, n = 6 + Math.floor(r() * 10);
    x.fillStyle = "#0a3a33";
    x.fillRect(cx - 8, cy - 8, n * 14 + 16, n * 14 + 16);
    x.fillStyle = "#6b5a3a";
    for (let i = 0; i < n; i++) {
      x.fillRect(cx + i * 14, cy - 18, 6, 12);
      x.fillRect(cx + i * 14, cy + n * 14 + 6, 6, 12);
    }
  }
  const [e, ex] = canvas(S, S);
  ex.fillStyle = "#000";
  ex.fillRect(0, 0, S, S);
  drawTraces(ex, S, S, 70, 11, "#1fd6b4", 2.5);
  // 过孔
  const r2 = rng(19);
  ex.fillStyle = "#7ff5df";
  for (let i = 0; i < 400; i++) {
    ex.beginPath();
    ex.arc(r2() * S, r2() * S, 2.5, 0, Math.PI * 2);
    ex.fill();
  }
  const ct = tex(c), et = tex(e);
  for (const t of [ct, et]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
  }
  return [ct, et];
}

/** 卡体里的走线层（透明底，只有线），用作发光遮罩。 */
export function cardCircuitTexture(seed: number, clear?: [number, number, number, number]): THREE.Texture {
  const [c, x] = canvas(512, 768);
  drawTraces(x, 512, 768, 46, seed, "#ffffff", 2.2);
  if (clear) x.clearRect(...clear);
  // 一圈内边框和四角的安装孔
  x.strokeStyle = "#ffffff";
  x.lineWidth = 3;
  x.strokeRect(14, 14, 512 - 28, 768 - 28);
  for (const [px, py] of [[30, 30], [482, 30], [30, 738], [482, 738]]) {
    x.beginPath(); x.arc(px, py, 9, 0, Math.PI * 2); x.stroke();
  }
  return tex(c, false);
}

/** 底座正面的显示屏：编号、名字、血量大数字。 */
export function plateTexture(name: string, side: "b" | "r", cur: number, max: number, incoming: number) {
  const W = 512, H = 128;
  const [c, x] = canvas(W, H);
  x.fillStyle = "#021612";
  x.fillRect(0, 0, W, H);
  // 扫描线
  x.fillStyle = "rgba(127,245,223,0.05)";
  for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  // 阵营六边形 + 编号
  const sc = CSS.side[side];
  x.fillStyle = sc;
  x.beginPath();
  const hx = 54, hy = 64, hr = 40;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    x.lineTo(hx + hr * Math.cos(a), hy + hr * Math.sin(a));
  }
  x.fill();
  x.fillStyle = "#021612";
  x.font = `700 40px ${FONT_CN}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(name.slice(1), hx, hy + 2);
  x.textAlign = "left";
  x.fillStyle = "#e9fffb";
  x.font = `700 38px ${FONT_CN}`;
  x.fillText(name, 108, 64);
  // 血量
  const after = cur - incoming;
  const low = cur / max <= 0.45;
  const col = low ? CSS.hpLow : CSS.hp;
  x.textAlign = "right";
  x.font = `700 64px ${FONT_NUM}`;
  x.fillStyle = col;
  x.shadowColor = col;
  x.shadowBlur = 16;
  const curText = String(cur);
  x.fillText(curText, 420, 70);
  x.shadowBlur = 0;
  x.font = `500 28px ${FONT_NUM}`;
  x.fillStyle = "#6fa59a";
  x.textAlign = "left";
  x.fillText("/" + max, 426, 80);
  if (incoming) {
    x.textAlign = "right";
    x.font = `700 22px ${FONT_NUM}`;
    x.fillStyle = after <= 0 ? "#ffd24a" : "#e9fffb";
    x.fillText(after <= 0 ? "✕ KO" : `−${incoming}→${after}`, 500, 24);
  }
  return tex(c);
}

/** 悬浮在卡顶的预警牌（「−12 → 8」/「✕ 击倒」）。 */
export function warnTexture(text: string, ko: boolean) {
  const [c, x] = canvas(256, 64);
  x.fillStyle = ko ? "#ffd24a" : "rgba(2,22,18,0.85)";
  x.beginPath();
  x.moveTo(12, 0); x.lineTo(256, 0); x.lineTo(244, 64); x.lineTo(0, 64); x.closePath();
  x.fill();
  if (!ko) {
    x.strokeStyle = "#e9fffb";
    x.lineWidth = 2;
    x.stroke();
  }
  x.fillStyle = ko ? "#081210" : "#e9fffb";
  x.font = `700 34px ${FONT_NUM}, ${FONT_CN}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text, 128, 34);
  return tex(c);
}

/** 时间轴全息条：刻度与秒数。 */
export function timelineTexture() {
  const W = 2048, H = 128;
  const [c, x] = canvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(31,214,180,0)");
  g.addColorStop(0.5, "rgba(31,214,180,0.22)");
  g.addColorStop(1, "rgba(31,214,180,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#7ff5df";
  x.font = `500 30px ${FONT_NUM}`;
  x.textAlign = "center";
  for (let s = 0; s <= 20; s++) {
    const px = 40 + (s / 20) * (W - 80);
    const big = s % 5 === 0;
    x.fillRect(px - 1, big ? 34 : 48, 2, big ? 60 : 32);
    if (big) x.fillText(s + (s === 20 ? "s" : ""), px, 26);
  }
  x.fillRect(40, 62, W - 80, 4);
  return tex(c);
}

// 占位背景：赛博朋克霓虹室内，像素风 480x270 → public/duanju/bg/placeholder.png（正式图到位后直接覆盖同名文件）
// 用法：node scripts/duanju-gen-bg.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const W = 480, H = 270;
const buf = new Float32Array(W * H * 3);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const put = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; for (let k = 0; k < 3; k++) buf[i + k] = buf[i + k] * (1 - a) + c[k] * a; };
const add = (x, y, c, a) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; for (let k = 0; k < 3; k++) buf[i + k] = Math.min(255, buf[i + k] + c[k] * a); };
const rect = (x, y, w, h, c, a = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c, a); };
const glow = (cx, cy, rx, ry, c, p = 1) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); if (d < 1) add(x, y, c, (1 - d) ** 2 * p); } };
const line = (x0, y0, x1, y1, c, a = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a); };
const MAG = hex(0xff2d95), CY = hex(0x00e5ff), YE = hex(0xffd23f), VIO = hex(0x7a3cff);

// 墙与地：竖向渐变，墙地交界在 y=170
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const t = y / H, wall = y < 170;
  const c = wall ? [10 + 22 * t, 4 + 8 * t, 26 + 30 * t] : [16 - 8 * ((y - 170) / 100), 6 - 3 * ((y - 170) / 100), 28 - 12 * ((y - 170) / 100)];
  const i = (y * W + x) * 3; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
// 墙板：竖缝
for (let x = 0; x < W; x += 40) rect(x, 0, 1, 170, [4, 2, 12], 0.8);
for (let y = 40; y < 170; y += 44) rect(0, y, W, 1, [30, 12, 56], 0.7);
// 顶部管线（左右各两根，中间留空）
for (const [y, c] of [[10, MAG], [18, CY]]) { rect(0, y, 150, 3, [30, 14, 52]); rect(0, y, 150, 1, c, 0.7); rect(W - 150, y, 150, 3, [30, 14, 52]); rect(W - 150, y, 150, 1, c, 0.7); }
for (let x = 20; x < 150; x += 38) { rect(x, 6, 3, 18, [24, 10, 44]); rect(W - x - 3, 6, 3, 18, [24, 10, 44]); }
// 左窗：城市剪影 + 青色辉光
glow(70, 95, 90, 70, CY, 0.35);
rect(26, 48, 88, 92, [4, 2, 14]); rect(29, 51, 82, 86, [10, 40, 66]);
for (let x = 29; x < 111; x += 6) { const h = 14 + Math.floor(rnd() * 46); rect(x, 137 - h, 5, h, [6, 12, 30]); if (rnd() < 0.7) for (let k = 0; k < 4; k++) if (rnd() < 0.5) put(x + 1 + (k & 1) * 2, 137 - h + 3 + k * 5, YE, 0.9); }
rect(70, 51, 1, 86, [4, 2, 14]); rect(29, 94, 82, 1, [4, 2, 14]);
// 右侧霓虹招牌：框 + 竖条 + 辉光
glow(410, 90, 80, 66, MAG, 0.4);
rect(372, 44, 74, 96, [6, 2, 16]); rect(374, 46, 70, 92, [24, 6, 40]);
for (let k = 0; k < 5; k++) { rect(382, 56 + k * 16, 54, 6, k % 2 ? MAG : CY, 0.9); rect(382, 56 + k * 16, 20, 6, [255, 255, 255], 0.25); }
rect(396, 140, 3, 30, [20, 8, 36]); rect(420, 140, 3, 30, [20, 8, 36]);
// 中后：暗门 + 小指示灯
rect(214, 70, 52, 100, [6, 3, 16]); rect(216, 72, 48, 98, [14, 6, 30]); rect(239, 72, 2, 98, [4, 2, 10]);
for (let k = 0; k < 3; k++) { put(222 + k * 4, 64, [MAG, CY, YE][k], 1); add(222 + k * 4, 64, [MAG, CY, YE][k], 0.5); }
glow(240, 64, 22, 8, VIO, 0.3);
// 墙上小灯带 & 电缆
line(0, 150, 120, 150, MAG, 0.5); line(W - 120, 150, W, 150, CY, 0.5);
for (let i = 0; i < 6; i++) { const x = 130 + i * 52; line(x, 0, x + 6, 36 + (i % 3) * 14, [28, 12, 50], 1); }
// 地面：透视线（只在两侧强，中部暗）
for (let k = -10; k <= 10; k++) { const x0 = 240 + k * 12, x1 = 240 + k * 70; line(x0, 170, x1, H, k % 2 ? hex(0x4a1a7a) : hex(0x24408a), 0.35); }
for (let i = 1; i < 9; i++) { const y = 170 + Math.pow(i / 9, 1.8) * 100; line(0, y, W, y, hex(0x3a1566), 0.3); }
glow(60, 215, 90, 28, MAG, 0.18); glow(420, 215, 90, 28, CY, 0.16);
// 中下留空区压暗一点，让随从站得住
for (let y = 150; y < H; y++) for (let x = 110; x < 370; x++) { const d = Math.hypot((x - 240) / 130, (y - 215) / 60); if (d < 1) put(x, y, [8, 3, 18], (1 - d) * 0.45); }
// 屏幕角落小招牌剪影
rect(8, 190, 30, 6, MAG, 0.7); rect(8, 200, 18, 4, CY, 0.6); rect(W - 40, 196, 32, 5, YE, 0.6);
// 半色调点阵：沿对角线
for (let y = 0; y < H; y += 3) for (let x = (y / 3) % 2 ? 0 : 1; x < W; x += 3) { const d = (x + y * 0.5) / (W + H * 0.5); if (d < 0.18 || d > 0.85) add(x, y, MAG, 0.07); }
// 颗粒
for (let i = 0; i < W * H * 0.15; i++) { const x = rnd() * W, y = rnd() * H; const v = rnd() < 0.5 ? -9 : 9; add(x, y, [v, v, v], 1); }
// 暗角
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot((x - W / 2) / (W * 0.62), (y - H / 2) / (H * 0.68)); if (d > 0.7) put(x, y, [2, 0, 8], Math.min(0.7, (d - 0.7) * 1.3)); }

// PNG 编码
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(buf[y * W * 3 + x]))); }
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/duanju/bg/placeholder.png");
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, png);
console.log("写入", out, png.length, "bytes");

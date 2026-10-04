// @ts-nocheck
// 移植自 D:/wc/comic/player.js（行为一致；类型宽松，对外类型见 ./index.ts）
// 词战 · 动态漫画页播放器 —— 核心模块(原生 ES 模块,无依赖)
// 导出: playComic, validate, renderLayoutGallery, paintPlaceholder
const W = 1600, H = 900;           // 舞台逻辑尺寸,整体用 CSS transform 缩放
const INK = '#0e0c14', PAPER = '#f3ecdc';
const LOWRES = 0.6;
const MOVES = ['push-in', 'pan-left', 'pan-right', 'hold', 'shake'];
const ACCENTS = ['#ff2d95', '#00b8d9', '#ffc400', '#7c4dff', '#2ee59d'];

/* ------------------------------ 样式 ------------------------------ */
const CSS = `
.wc-root{position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:#07060b;color:${PAPER};
 font-family:"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none;outline:none}
.wc-view{position:relative;flex:1;min-height:0;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wc-world{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;overflow:hidden;background:#0d0b14;
 box-shadow:0 0 0 1px #2a2438}
.wc-world.pan{transition:transform .7s cubic-bezier(.5,0,.2,1)}
.wc-page{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 28% 18%,#1f1936 0,#0e0c16 72%)}
.wc-page::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(243,236,220,.07) 1.4px,transparent 1.9px) 0 0/13px 13px;pointer-events:none}
.wc-page::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:400;
 box-shadow:inset 5px 0 0 rgba(0,229,255,.5),inset -5px 0 0 rgba(255,45,149,.5),inset 0 -4px 0 rgba(255,255,255,.05)}
.wc-slot{position:absolute;inset:0;pointer-events:none;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.5))}
.wc-clip,.wc-bl{position:absolute;inset:0}
.wc-wipe{position:absolute;overflow:hidden}
.wc-cam{position:absolute;left:-10%;top:-10%;width:120%;height:120%;will-change:transform}
.wc-cam>*{width:100%;height:100%;object-fit:cover;display:block}
.wc-slot svg,.wc-dbg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.wc-block{position:absolute;pointer-events:none}
.wc-block canvas,.wc-block .f{position:absolute;display:block}
.wc-pop{position:absolute;pointer-events:none;filter:drop-shadow(6px 8px 0 rgba(0,0,0,.5))}
.wc-pop>*{display:block;width:100%;height:auto}
.wc-sfx{position:absolute;font-weight:900;font-style:italic;line-height:1;white-space:nowrap;pointer-events:none;letter-spacing:.04em;
 color:#ffd23f;-webkit-text-stroke:9px ${INK};paint-order:stroke fill;text-shadow:5px 6px 0 ${INK};
 font-family:"Alibaba PuHuiTi","Noto Sans SC","Microsoft YaHei",sans-serif}
.wc-caps{position:absolute;inset:0;z-index:200;pointer-events:none}
.wc-cap{position:absolute;box-sizing:border-box;color:${INK};font-weight:700;font-size:27px;line-height:1.5;letter-spacing:.03em;text-align:left}
.wc-cap.say{background:#fffaf0;border:3px solid ${INK};border-radius:20px 24px 18px 22px;padding:11px 20px 12px;box-shadow:5px 6px 0 rgba(0,0,0,.4)}
.wc-cap.nar{background:#ffd84a;border:3px solid ${INK};padding:10px 18px 11px;font-size:24px;font-weight:600;box-shadow:5px 6px 0 rgba(0,0,0,.4)}
.wc-cap .who{position:absolute;top:-15px;left:14px;font-size:15px;line-height:1;font-weight:800;color:#fff;padding:4px 10px 5px;border:2px solid ${INK};transform:rotate(-2deg);letter-spacing:.08em}
.wc-cap .tl{position:absolute;width:18px;height:18px;background:#fffaf0;transform:rotate(45deg);border:0 solid ${INK}}
.wc-cap .tl.b{bottom:-11px;border-right-width:3px;border-bottom-width:3px}
.wc-cap .tl.t{top:-11px;border-left-width:3px;border-top-width:3px}
.wc-cap .tl.l{left:-11px;border-left-width:3px;border-bottom-width:3px}
.wc-cap .tl.r{right:-11px;border-right-width:3px;border-top-width:3px}
.wc-dbg{display:none;z-index:300}
.wc-debug .wc-dbg{display:block}
.wc-hint{position:absolute;right:14px;bottom:12px;font-size:12px;letter-spacing:.14em;color:${PAPER};background:rgba(7,6,11,.88);padding:5px 10px;border-left:3px solid #ff2d95;pointer-events:none;animation:wcblink 1.6s ease-in-out infinite;z-index:5}
@keyframes wcblink{50%{opacity:.35}}
.wc-bar{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:0 12px;min-height:44px;background:#0d0b14;border-top:1px solid #2a2438;font-size:13px;flex-wrap:wrap}
.wc-btn{background:transparent;color:${PAPER};border:1px solid #3b3350;border-radius:3px;padding:6px 13px;font:inherit;cursor:pointer;letter-spacing:.06em}
.wc-btn:hover{border-color:#ff2d95}
.wc-btn.on{background:#ff2d95;color:${INK};border-color:#ff2d95;font-weight:700}
.wc-spd{display:flex;align-items:center;gap:8px;color:#9a93ad}
.wc-spd input{width:90px;accent-color:#ff2d95}
.wc-stat{margin-left:auto;color:#9a93ad;font-variant-numeric:tabular-nums}
.wc-dock{display:none;flex:1;min-height:100px;overflow:auto;padding:16px 18px 12px;background:#0d0b14;border-top:3px solid #ff2d95;font-size:19px;line-height:1.65;font-weight:600;cursor:pointer}
.wc-dock .who{display:inline-block;font-size:13px;font-weight:800;color:#fff;padding:3px 9px;margin-bottom:6px;letter-spacing:.08em}
.wc-dock .tx.nar{color:#ffd84a}
.wc-root.portrait .wc-dock{display:block}
.wc-root.portrait .wc-view{flex:0 0 auto}
.wc-root.portrait .wc-hint{display:none}
.wc-root.portrait .wc-bar{gap:6px;padding:4px 10px}
.wc-root.portrait .wc-stat{width:100%;margin:0}
`;
function injectCss() {
  if (document.getElementById('wc-player-css')) return;
  const s = document.createElement('style'); s.id = 'wc-player-css'; s.textContent = CSS; document.head.appendChild(s);
}

/* ------------------------------ 工具 ------------------------------ */
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const toPx = poly => poly.map(([x, y]) => [x * W, y * H]);
const clipStr = p => 'polygon(' + p.map(q => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(',') + ')';
function bboxOf(p) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const ovl = (a, b) => { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w * h : 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = hash(String(seed)); return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const whoColor = who => ACCENTS[hash(who || '') % 3 === 0 ? 0 : hash(who) % ACCENTS.length];
const isNarr = who => !who || /^(旁白|叙述|NARRATOR)$/i.test(who);
function parseRatio(r, fb) { const m = /^([\d.]+)\s*:\s*([\d.]+)$/.exec(r || ''); return m ? (+m[1]) / (+m[2]) : fb; }

/* 斜切擦入:dir 0 左→右 1 右→左 2 上→下 3 下→上, a: 0..140 */
function wedge(dir, a) {
  const base = [[0, 0], [a, 0], [a - 30, 100], [0, 100]];
  const pts = base.map(([x, y]) => dir === 0 ? [x, y] : dir === 1 ? [100 - x, y] : dir === 2 ? [y, x] : [y, 100 - x]);
  return 'polygon(' + pts.map(p => `${p[0]}% ${p[1]}%`).join(',') + ')';
}

/* ------------------------------ 占位画 ------------------------------ */
const PALS = [
  { a: '#1b1140', b: '#ff2d95', c: '#ffd23f', d: '#00e5ff' },
  { a: '#06222e', b: '#00b8d9', c: '#ff6b35', d: '#f3ecdc' },
  { a: '#2a0f1e', b: '#ff4d6d', c: '#ffe66d', d: '#7c4dff' },
  { a: '#0f1d3a', b: '#5b8cff', c: '#ff2d95', d: '#ffd23f' },
  { a: '#201a0e', b: '#ffc400', c: '#e63946', d: '#00e5ff' },
  { a: '#0e2219', b: '#2ee59d', c: '#ff2d95', d: '#f3ecdc' },
  { a: '#25103a', b: '#7c4dff', c: '#ff9f1c', d: '#00e5ff' },
];
function figure(ctx, x, y, k, pal, r, outline) {
  // 人物剪影:x,y 为腰线中点,k 为身高基准
  const sh = k * 0.34, hr = k * 0.1, pose = r();
  const parts = [];
  parts.push(() => { ctx.beginPath(); ctx.moveTo(x - sh, y + k * .6); ctx.lineTo(x - sh * .8, y - k * .2); ctx.quadraticCurveTo(x - sh * .5, y - k * .38, x - hr * .5, y - k * .4); ctx.lineTo(x + hr * .5, y - k * .4); ctx.quadraticCurveTo(x + sh * .5, y - k * .38, x + sh * .8, y - k * .2); ctx.lineTo(x + sh, y + k * .6); ctx.closePath(); });
  parts.push(() => { ctx.beginPath(); ctx.arc(x, y - k * .52, hr, 0, 7); });
  const spikes = 5 + (r() * 4 | 0);
  parts.push(() => { ctx.beginPath(); ctx.moveTo(x - hr * 1.05, y - k * .52); for (let i = 0; i < spikes; i++) { const t = i / (spikes - 1), ang = Math.PI * (1.05 + t * .9); const rr = hr * (1.5 + r() * .7); ctx.lineTo(x + Math.cos(ang) * hr, y - k * .52 + Math.sin(ang) * hr); ctx.lineTo(x + Math.cos(ang + .09) * rr, y - k * .52 + Math.sin(ang + .09) * rr); } ctx.lineTo(x + hr * 1.05, y - k * .52); ctx.closePath(); });
  const arm = pose > .5;
  parts.push(() => { ctx.beginPath(); ctx.moveTo(x + sh * .7, y - k * .22); ctx.lineTo(x + sh * (arm ? 1.5 : 1.15), y + (arm ? -k * .6 : k * .1)); ctx.lineTo(x + sh * (arm ? 1.7 : 1.3), y + (arm ? -k * .55 : k * .12)); ctx.lineTo(x + sh * .95, y - k * .1); ctx.closePath(); });
  if (outline) { ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = k * .06; parts.forEach(f => { f(); ctx.stroke(); }); }
  ctx.fillStyle = pal.c; ctx.save(); ctx.translate(-k * .028, -k * .02); parts.forEach(f => { f(); ctx.fill(); }); ctx.restore();
  ctx.fillStyle = '#0a0810'; parts.forEach(f => { f(); ctx.fill(); });
  ctx.strokeStyle = pal.d; ctx.lineWidth = Math.max(2, k * .012); ctx.beginPath(); ctx.moveTo(x - hr * .55, y - k * .535); ctx.lineTo(x - hr * .15, y - k * .52); ctx.moveTo(x + hr * .15, y - k * .52); ctx.lineTo(x + hr * .55, y - k * .535); ctx.stroke();
  if (arm) { ctx.strokeStyle = pal.d; ctx.lineWidth = k * .018; ctx.beginPath(); ctx.moveTo(x + sh * 1.6, y - k * .58); ctx.lineTo(x + sh * 2.3, y - k * 1.1); ctx.stroke(); }
}
const phCache = new Map();
/** 程序生成漫画感占位图。seed 决定配色/构图;focal 为主体归一化位置[0..1,0..1]。kind 'pop' 为透明贴纸。 */
export function paintPlaceholder(seed, w, h, focal = [0.5, 0.55], kind = 'panel', label = '', fs = 1) {
  const key = [seed, w | 0, h | 0, focal.map(v => v.toFixed(2)), kind, fs].join('|');
  if (phCache.has(key)) { const c = phCache.get(key); const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; o.getContext('2d').drawImage(c, 0, 0); return o; }
  w = Math.round(w); h = Math.round(h);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d');
  const r = rng(seed), pal = PALS[hash(String(seed)) % PALS.length];
  const fx = focal[0] * w, fy = focal[1] * h;
  if (kind === 'pop') {
    figure(ctx, w * .5, h * .56, h * .72, pal, r, true);
    phCache.set(key, cv); return cv;
  }
  let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal.a); g.addColorStop(1, '#0a0810'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  g = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(w, h) * .75); g.addColorStop(0, pal.b + 'cc'); g.addColorStop(.5, pal.b + '33'); g.addColorStop(1, '#0000'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 大圆(月/日)
  ctx.fillStyle = pal.c; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(w * (.2 + r() * .6), h * (.2 + r() * .22), h * (.14 + r() * .1), 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  // 放射速度线
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 64; i++) { const a = r() * 6.283, l = Math.max(w, h) * 1.3, wd = .004 + r() * .022; ctx.globalAlpha = .05 + r() * .12; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * h * .3, fy + Math.sin(a) * h * .3); ctx.lineTo(fx + Math.cos(a - wd) * l, fy + Math.sin(a - wd) * l); ctx.lineTo(fx + Math.cos(a + wd) * l, fy + Math.sin(a + wd) * l); ctx.fill(); }
  ctx.globalAlpha = 1;
  // 天际线两层
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? '#0a0810' : pal.a; ctx.globalAlpha = layer ? 1 : .8;
    let x = -20; const base = h * (layer ? .93 : .8);
    ctx.beginPath(); ctx.moveTo(0, h);
    while (x < w + 40) { const bw = w * (.05 + r() * .09), bh = h * (layer ? .1 + r() * .22 : .16 + r() * .3); ctx.lineTo(x, base - bh); ctx.lineTo(x + bw * (.3 + r() * .6), base - bh - (r() > .6 ? h * .04 : 0)); ctx.lineTo(x + bw, base - bh); x += bw; }
    ctx.lineTo(w + 40, h); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 半色调网点(远离主体一角)
  const sp = Math.max(9, h / 36), cx = fx > w / 2 ? 0 : w, cy = fy > h / 2 ? 0 : h, md = Math.hypot(w, h) * .85;
  ctx.fillStyle = pal.d; ctx.globalAlpha = .5; ctx.save(); ctx.translate(cx, cy); ctx.rotate(.785);
  for (let i = -60; i < 60; i++) for (let j = -60; j < 60; j++) {
    const x = i * sp, y = j * sp, d = Math.hypot(x, y); const rr = sp * .55 * Math.max(0, 1 - d / md);
    if (rr > .6) { ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // 人物
  const n = r() > .7 ? 2 : 1;
  if (n === 2) figure(ctx, fx + h * .27, fy + h * .2, h * .34, PALS[(hash(String(seed)) + 2) % PALS.length], r, false);
  figure(ctx, fx, fy + h * .16 * fs, h * .52 * fs, pal, r, false);
  // 暗角 + 颗粒
  g = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, Math.hypot(w, h) * .6); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff'; for (let i = 0; i < 260; i++) { ctx.globalAlpha = r() * .12; ctx.fillRect(r() * w, r() * h, 1.6, 1.6); }
  ctx.globalAlpha = .45; ctx.fillStyle = PAPER; ctx.font = `${Math.max(10, h / 46)}px monospace`; ctx.fillText('PLACEHOLDER ' + (label || seed), h / 40, h - h / 40); ctx.globalAlpha = 1;
  phCache.set(key, cv); return cv;
}

/* 半色调色块画布 */
function halftoneCanvas(bb, color, towards, scale = 0.6) {
  const cw = Math.max(8, Math.round(bb.w * scale)), ch = Math.max(8, Math.round(bb.h * scale));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const ctx = cv.getContext('2d');
  const sp = 14 * scale * 1.35; ctx.fillStyle = color;
  const dx = towards[0], dy = towards[1], len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, proj = (x, y) => (x * ux + y * uy);
  const ps = [proj(0, 0), proj(cw, 0), proj(0, ch), proj(cw, ch)], p0 = Math.min(...ps), p1 = Math.max(...ps);
  ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.rotate(.785); const R = Math.hypot(cw, ch) / sp / 2 + 2;
  for (let i = -R; i < R; i++) for (let j = -R; j < R; j++) {
    const lx = i * sp, ly = j * sp, ca = Math.cos(.785), sa = Math.sin(.785);
    const x = cw / 2 + lx * ca - ly * sa, y = ch / 2 + lx * sa + ly * ca;
    if (x < -sp || y < -sp || x > cw + sp || y > ch + sp) continue;
    const t = (proj(x, y) - p0) / (p1 - p0 || 1), rr = sp * .72 * Math.pow(clamp(t, 0, 1), .85) + .3;
    if (rr > .5) { ctx.beginPath(); ctx.arc(lx, ly, rr, 0, 7); ctx.fill(); }
  }
  ctx.restore(); return cv;
}


/* ------------------------------ 原图 + 裁剪框 ------------------------------ */
const imgCache = new Map();
export function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; }));
  return imgCache.get(src);
}
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
/** 绿幕抠色:按与键色的距离出 alpha,去绿边(despill),再对 alpha 做 3x3 轻微羽化 */
export function chromaKey(cv, hex = '#00ff00') {
  const w = cv.width, h = cv.height, ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, w, h), p = d.data, k = hex2rgb(hex);
  const green = k[1] > k[0] + 40 && k[1] > k[2] + 40, A = new Float32Array(w * h);
  for (let i = 0, n = w * h; i < n; i++) {
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
    const dist = Math.hypot(r - k[0], g - k[1], b - k[2]);
    const t = clamp((dist - 70) / 80, 0, 1), a = t * t * (3 - 2 * t);
    A[i] = a * p[i * 4 + 3];
    if (green) { const m = Math.max(r, b); if (g > m) p[i * 4 + 1] = m; }
  }
  const B = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += A[yy * w + xx]; c++; } }
    B[y * w + x] = s / c;
  }
  for (let i = 0, n = w * h; i < n; i++) p[i * 4 + 3] = B[i] < 6 ? 0 : B[i];
  ctx.putImageData(d, 0, 0); return cv;
}
/** 从源图按归一化 crop 裁出画布(最宽 maxW);chroma 可选 */
export function cropToCanvas(img, crop, maxW = 1600, chroma) {
  const sx = crop[0] * img.naturalWidth, sy = crop[1] * img.naturalHeight, sw = crop[2] * img.naturalWidth, sh = crop[3] * img.naturalHeight;
  const k = Math.min(1, maxW / sw), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(sw * k)); cv.height = Math.max(1, Math.round(sh * k));
  cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return chroma ? chromaKey(cv, chroma) : cv;
}
/** 读取源图尺寸:返回 {src:{w,h}};失败的 src 不在表中 */
export async function loadAssetInfo(assets, base = '') {
  const out = {}; const srcs = [...new Set(Object.values(assets || {}).map(a => a.src))];
  await Promise.all(srcs.map(s => loadImg(base + s).then(i => { out[s] = { w: i.naturalWidth, h: i.naturalHeight }; }).catch(() => { })));
  return out;
}

/* ------------------------------ 数据校验 ------------------------------ */
export function validate(data, assets, info) {
  const out = [], add = (t, m) => out.push(`[${t}] ${m}`);
  if (!data || typeof data !== 'object') return ['[错误] 数据不是对象'];
  const L = data.layouts || {}, P = data.panels || [];
  if (!Object.keys(L).length) add('错误', '缺少 layouts');
  if (!P.length) add('错误', '缺少 panels');
  const polyOk = (p, lo, hi) => Array.isArray(p) && p.length >= 3 && p.every(q => Array.isArray(q) && q.length === 2 && q.every(v => typeof v === 'number' && v >= lo && v <= hi));
  for (const [k, l] of Object.entries(L)) {
    if (!Array.isArray(l.slots) || !l.slots.length) add('错误', `布局 ${k} 没有 slots`);
    (l.slots || []).forEach((s, i) => {
      if (!polyOk(s.polygon, -0.05, 1.05)) add('错误', `布局 ${k} slot ${i + 1} polygon 无效(>=3 点,坐标 0~1)`);
      else if (s.safe) {
        const bb = bboxOf(s.polygon), [x, y, w, h] = s.safe;
        if (x < bb.x - .01 || y < bb.y - .01 || x + w > bb.x + bb.w + .01 || y + h > bb.y + bb.h + .01) add('警告', `布局 ${k} slot ${i + 1} safe 超出多边形包围盒`);
      } else add('提示', `布局 ${k} slot ${i + 1} 缺 safe,字幕避让只能按包围盒`);
    });
    (l.blocks || []).forEach((b, i) => { if (!polyOk(b.polygon, -0.3, 1.3)) add('错误', `布局 ${k} block ${i + 1} polygon 无效`); if (b.fill && !['halftone', 'solid', 'offset'].includes(b.fill)) add('警告', `布局 ${k} block ${i + 1} fill 未知: ${b.fill}`); });
  }
  const ids = new Set(), pageSlots = new Map(), segs = new Map();
  P.forEach((p, i) => {
    const tag = `panel ${p.id || '#' + i}`;
    if (!p.id) add('错误', `panels[${i}] 缺 id`); else if (ids.has(p.id)) add('错误', `${tag} id 重复`); else ids.add(p.id);
    const l = L[p.layout];
    if (!l) { add('错误', `${tag} 引用了不存在的布局 ${p.layout}`); }
    else if (!(p.slot >= 1 && p.slot <= l.slots.length)) add('错误', `${tag} slot=${p.slot} 超出布局 ${p.layout} 的 ${l.slots.length} 个格`);
    const pk = `${p.level}|${p.when}|${p.page}`, sk = `${p.level}|${p.when}`;
    const ss = pageSlots.get(pk) || new Set(); if (ss.has(p.slot)) add('错误', `${tag} 同页 slot ${p.slot} 被重复使用`); ss.add(p.slot); pageSlots.set(pk, ss);
    if (!segs.has(sk)) segs.set(sk, new Set()); segs.get(sk).add(p.page);
    const first = P.find(q => `${q.level}|${q.when}|${q.page}` === pk); if (first && first.layout !== p.layout) add('警告', `${tag} 与同页其它格布局不同(以第一格为准)`);
    if (p.camera && !MOVES.includes(p.camera.move)) add('警告', `${tag} camera.move 未知: ${p.camera.move}`);
    if (p.camera && !(p.camera.dur > 0)) add('警告', `${tag} camera.dur 应为正数`);
    if (p.ratio && !/^[\d.]+:[\d.]+$/.test(p.ratio)) add('警告', `${tag} ratio 格式应为 w:h`);
    (p.lines || []).forEach((ln, j) => { if (!ln.text) add('错误', `${tag} lines[${j}] 缺 text`); else if (ln.text.length > 60) add('警告', `${tag} lines[${j}] 超过 60 字,字幕可能过大`); });
    if (p.pop) { if (!p.pop.image && !p.pop.placeholder) add('警告', `${tag} pop 缺 image`); if (!Array.isArray(p.pop.pos) || p.pop.pos.length !== 2) add('错误', `${tag} pop.pos 应为 [x,y]`); (p.pop.over || []).forEach(o => { if (l && !(o >= 1 && o <= l.slots.length)) add('错误', `${tag} pop.over 含无效 slot ${o}`); }); }
    if (!p.image) add('提示', `${tag} 没有 image,将用占位图`);
  });
  for (const [sk, pages] of segs) {
    const n = pages.size; if (n > 4) add('提示', `段 ${sk} 有 ${n} 页(常规 2~3 页;序章/结局可更长)`);
    for (const pg of pages) { const c = pageSlots.get(`${sk}|${pg}`).size; if (c > 5) add('警告', `段 ${sk} 第 ${pg} 页有 ${c} 格,偏多`); }
  }
  if (assets) {
    const byId = new Map(P.map(p => [p.id, p]));
    for (const [key, a] of Object.entries(assets)) {
      const isPop = key.endsWith('_pop'), pid = isPop ? key.slice(0, -4) : key, p = byId.get(pid), tag = `assets[${key}]`;
      if (!p) { add('警告', `${tag} 对应的格 ${pid} 不存在于 panels`); continue; }
      if (!a.src) { add('错误', `${tag} 缺 src`); continue; }
      if (isPop && !p.pop) add('提示', `${tag} 该格数据里没有 pop 字段,出框层不会显示`);
      const c = a.crop; let okc = true;
      if (c && !(Array.isArray(c) && c.length === 4 && c.every(v => typeof v === 'number'))) { add('错误', `${tag} crop 应为 [x,y,w,h]`); continue; }
      if (c && (c[0] < -1e-6 || c[1] < -1e-6 || c[2] <= 0 || c[3] <= 0 || c[0] + c[2] > 1 + 1e-6 || c[1] + c[3] > 1 + 1e-6)) { add('错误', `${tag} crop 越界(应在 0~1 内)`); okc = false; }
      const im = info && info[a.src];
      if (info && !im) { add('错误', `${tag} 引用的源图 ${a.src} 不存在或无法加载`); continue; }
      if (!isPop && c && okc) {
        const l = L[p.layout], s = l && l.slots[p.slot - 1];
        if (s) {
          const bb = bboxOf(s.polygon), want = (bb.w * 16) / (bb.h * 9);
          const got = im ? (c[2] * im.w) / (c[3] * im.h) : null;
          if (got && Math.abs(got / want - 1) > 0.08) add('警告', `${tag} 裁剪比例 ${got.toFixed(2)} 与格子比例 ${want.toFixed(2)} 偏差 ${(Math.abs(got / want - 1) * 100).toFixed(0)}%,画面会被拉伸裁切`);
          if (im && c[2] * im.w < bb.w * W * LOWRES) add('警告', `${tag} 裁剪区域仅 ${Math.round(c[2] * im.w)}px 宽,低于格子逻辑宽 ${Math.round(bb.w * W)}px 的 ${LOWRES * 100}%,分辨率不足:播放时将降级为静态(无推拉)`);
        }
      }
      if (isPop && c && okc && im && c[2] * im.w < 200) add('警告', `${tag} 出框层裁剪过小(${Math.round(c[2] * im.w)}px 宽)`);
    }
    P.forEach(p => { if (!p.image && !assets[p.id]) add('提示', `panel ${p.id} 既无 image 也无 assets 条目,将用占位图`); });
  }
  return out;
}

/* ------------------------------ 布局缩略图 ------------------------------ */
export function renderLayoutGallery(container, data, opts = {}) {
  injectCss(); container.innerHTML = '';
  const grid = el('div', 'wc-gallery', container);
  Object.entries(data.layouts).forEach(([name, l], li) => {
    const card = el('button', 'wc-gcard', grid); card.type = 'button';
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'wc-gsvg' }, card);
    const defs = sv('defs', {}, svg);
    sv('rect', { width: W, height: H, fill: '#0e0c16' }, svg);
    (l.blocks || []).forEach(b => sv('polygon', { points: toPx(b.polygon).map(p => p.join(',')).join(' '), fill: b.color, opacity: .85 }, svg));
    l.slots.forEach((s, i) => {
      const pal = PALS[(li + i * 2) % PALS.length], id = `g${li}_${i}`;
      const lg = sv('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
      sv('stop', { offset: 0, 'stop-color': pal.a }, lg); sv('stop', { offset: 1, 'stop-color': pal.b }, lg);
      const pts = toPx(s.polygon).map(p => p.join(',')).join(' ');
      sv('polygon', { points: pts, fill: `url(#${id})`, stroke: PAPER, 'stroke-width': 7, 'stroke-linejoin': 'miter' }, svg);
      const bb = bboxOf(toPx(s.polygon)), cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
      const t = sv('text', { x: cx, y: cy + 36, 'text-anchor': 'middle', 'font-size': 110, 'font-weight': 800, fill: PAPER, opacity: .85, 'font-family': 'monospace' }, svg); t.textContent = i + 1;
    });
    const cap = el('div', 'wc-gname', card); cap.innerHTML = `<b>${name}</b> ${l.name || ''}<span>${l.slots.length} 格</span>`;
    card.addEventListener('click', () => opts.onPick && opts.onPick(name));
  });
}

/* ------------------------------ 播放器 ------------------------------ */
export function playComic(container, data, opts = {}) {
  injectCss();
  const seg = opts.segment || {};
  const all = (data.panels || []).filter(p => (seg.level === undefined || p.level === seg.level) && (!seg.when || p.when === seg.when));
  const pageNos = [...new Set(all.map(p => p.page))].sort((a, b) => a - b);
  const pages = pageNos.map(n => { const ps = all.filter(p => p.page === n); return { n, layout: data.layouts[ps[0].layout], layoutName: ps[0].layout, panels: ps }; }).filter(p => p.layout);
  const S = { speed: opts.speed || 1, auto: !!opts.auto, pi: -1, ci: -1, li: 0, done: false, lock: false, timer: 0, portrait: false, debug: !!opts.debug, pg: null };
  const assets = opts.assets || data.assets || null, aBase = opts.assetBase || '';
  if (assets) all.forEach(p => { for (const k of [p.id, p.id + '_pop']) if (assets[k]) loadImg(aBase + assets[k].src).catch(() => { }); });
  container.innerHTML = '';
  const root = el('div', 'wc-root', container); root.tabIndex = 0;
  const view = el('div', 'wc-view', root), world = el('div', 'wc-world', view);
  const hint = el('div', 'wc-hint', view); hint.textContent = '点击 / 空格 继续';
  const dock = el('div', 'wc-dock', root);
  const bar = el('div', 'wc-bar', root);
  const bSkip = el('button', 'wc-btn', bar); bSkip.textContent = '跳过 Esc';
  const bAuto = el('button', 'wc-btn', bar); bAuto.textContent = '自动播放';
  const spd = el('label', 'wc-spd', bar); spd.innerHTML = '速度 <input type="range" min="0.5" max="3" step="0.25" value="1"><b>1.0×</b>';
  const stat = el('span', 'wc-stat', bar);
  if (S.debug) root.classList.add('wc-debug');
  if (!pages.length) { world.textContent = '没有匹配的页'; return { destroy() { } }; }

  const speedInput = spd.querySelector('input'), speedLabel = spd.querySelector('b');
  speedInput.value = S.speed; speedLabel.textContent = S.speed.toFixed(1) + '×';
  bAuto.classList.toggle('on', S.auto);

  /* ---------- 尺寸适配 ---------- */
  function layoutSize() {
    const rw = root.clientWidth, rh = root.clientHeight;
    S.portrait = rw < 700 && rw / rh < 0.8;
    root.classList.toggle('portrait', S.portrait);
    if (S.portrait) view.style.height = Math.min(rw * 1.08, rh * 0.6) + 'px'; else view.style.height = '';
    const vw = view.clientWidth, vh = view.clientHeight;
    if (S.portrait) { S.s = Math.max(vh / H, vw / W); S.vw = vw; S.vh = vh; focusPan(true); }
    else { S.s = Math.min(vw / W, vh / H); world.classList.remove('pan'); world.style.transform = `translate(${(vw - W * S.s) / 2}px,${(vh - H * S.s) / 2}px) scale(${S.s})`; }
  }
  function focusPan(instant, bb) {
    if (!S.portrait) return;
    bb = bb || S.focusBB || { x: 0, y: 0, w: W, h: H }; S.focusBB = bb;
    const cx = (bb.x + bb.w / 2) * S.s;
    const tx = clamp(S.vw / 2 - cx, S.vw - W * S.s, 0), ty = (S.vh - H * S.s) / 2;
    world.classList.toggle('pan', !instant); world.style.transform = `translate(${tx}px,${ty}px) scale(${S.s})`;
  }
  const ro = new ResizeObserver(layoutSize); ro.observe(root);

  /* ---------- 色块 ---------- */
  function addBlock(pg, b, z) {
    const poly = toPx(b.polygon), bb = bboxOf(poly);
    const d = el('div', 'wc-block', pg.el); d.style.cssText += `inset:0;z-index:${z};clip-path:${clipStr(poly)};mix-blend-mode:${b.blend || 'normal'}`;
    const col = b.color || '#ff2d95', fill = b.fill || 'solid';
    const toward = [bb.x + bb.w / 2 - W / 2, bb.y + bb.h / 2 - H / 2];
    const mk = (parent, c, ox, oy, blend, alpha) => {
      const box = el('div', 'f', parent); box.style.cssText = `left:${bb.x + ox}px;top:${bb.y + oy}px;width:${bb.w}px;height:${bb.h}px;${blend ? 'mix-blend-mode:' + blend + ';' : ''}opacity:${alpha ?? 1}`;
      if (fill === 'halftone') { const cv = halftoneCanvas(bb, c, toward); cv.style.cssText = 'width:100%;height:100%;position:absolute;left:0;top:0'; box.appendChild(cv); }
      else box.style.background = c;
      return box;
    };
    if (fill === 'offset') {
      // 错版:青/品红鬼影 + 主色。鬼影不受 clip 影响所以放在单独图层
      d.style.clipPath = 'none';
      for (const [c, ox, oy] of [['#00e5ff', -9, -4], ['#ff2d95', 9, 5]]) {
        const g = el('div', 'wc-block', pg.el); g.style.cssText = `inset:0;z-index:${z};mix-blend-mode:screen;clip-path:${clipStr(poly)};transform:translate(${ox}px,${oy}px);opacity:.7`;
        const f = el('div', 'f', g); f.style.cssText = `left:${bb.x}px;top:${bb.y}px;width:${bb.w}px;height:${bb.h}px;background:${c}`;
        popIn(g);
      }
      d.style.clipPath = clipStr(poly); mk(d, col, 0, 0); pg.el.appendChild(d);
    } else mk(d, col, 0, 0);
    popIn(d);
    return d;
  }
  function popIn(node) {
    node.animate([{ clipPath: node.style.clipPath, opacity: 0, transform: node.style.transform || 'none' }, { clipPath: node.style.clipPath, opacity: 1, transform: node.style.transform || 'none' }], { duration: 380 / S.speed, easing: 'ease-out' });
  }

  /* ---------- 页 ---------- */
  function buildPage(idx) {
    const pgData = pages[idx], layout = pgData.layout;
    const pe = el('div', 'wc-page', world);
    const pg = { el: pe, data: pgData, avoid: [], caps: null, dbg: null, revealed: [] };
    (layout.blocks || []).forEach(b => addBlock(pg, b, b.bleed ? 150 : 5));
    pg.caps = el('div', 'wc-caps', pe);
    const d = sv('svg', { class: 'wc-dbg', viewBox: `0 0 ${W} ${H}` }, pe); pg.dbg = d;
    layout.slots.forEach((s, i) => {
      const pp = toPx(s.polygon);
      sv('polygon', { points: pp.map(p => p.join(',')).join(' '), fill: 'rgba(0,229,255,.08)', stroke: '#00e5ff', 'stroke-width': 3 }, d);
      const bb = bboxOf(pp), t = sv('text', { x: bb.x + 14, y: bb.y + 34, fill: '#00e5ff', 'font-size': 28, 'font-family': 'monospace', 'font-weight': 700 }, d); t.textContent = `#${i + 1} z${s.z || 1} ${s.ratio || ''}`;
      if (s.safe) sv('rect', { x: s.safe[0] * W, y: s.safe[1] * H, width: s.safe[2] * W, height: s.safe[3] * H, fill: 'none', stroke: '#ff5a5a', 'stroke-width': 3, 'stroke-dasharray': '10 7' }, d);
    });
    (layout.blocks || []).forEach(b => sv('polygon', { points: toPx(b.polygon).map(p => p.join(',')).join(' '), fill: 'none', stroke: '#b6ff3b', 'stroke-width': 3, 'stroke-dasharray': '4 6' }, d));
    return pg;
  }
  function showPage(idx, animate) {
    const old = S.pg, pg = buildPage(idx); S.pg = pg; S.pi = idx; S.ci = -1; S.li = 0;
    if (S.portrait) { S.focusBB = null; focusPan(!old); }
    if (animate && old) {
      S.lock = true; const dir = idx % 2 ? 2 : 0, dur = 650 / S.speed;
      pg.el.style.clipPath = wedge(dir, 0);
      const bar = el('div', 'wc-block', world); bar.style.cssText = 'inset:0;z-index:999;background:#ff2d95;pointer-events:none;clip-path:' + wedge(dir, 0);
      const bar2 = el('div', 'wc-block', world); bar2.style.cssText = 'inset:0;z-index:998;background:#00e5ff;pointer-events:none;clip-path:' + wedge(dir, 0);
      const ease = 'cubic-bezier(.7,0,.25,1)', f = { duration: dur, easing: ease, fill: 'forwards' };
      // 彩色斜带领先于新页边缘
      const band = a => { const p = wedge(dir, a); return p; };
      pg.el.animate([{ clipPath: wedge(dir, 0) }, { clipPath: wedge(dir, 140) }], f);
      bar.animate([{ clipPath: bandPoly(dir, -10, 0), opacity: 1 }, { clipPath: bandPoly(dir, 150, 12), opacity: 1 }], { duration: dur, easing: ease, fill: 'forwards' });
      bar2.animate([{ clipPath: bandPoly(dir, -16, -5), opacity: 1 }, { clipPath: bandPoly(dir, 144, 8), opacity: 1 }], { duration: dur, easing: ease, fill: 'forwards' });
      setTimeout(() => { old.el.remove(); bar.remove(); bar2.remove(); pg.el.style.clipPath = ''; pg.el.getAnimations().forEach(a => a.cancel()); S.lock = false; }, dur + 40);
    } else if (old) old.el.remove();
    updateStat();
  }
  function bandPoly(dir, a, w) { // 斜带:位于擦除边缘前方 w% 处
    const base = [[a + 30 * 0, 0], [a + 14, 0], [a + 14 - 30, 100], [a - 30 + 0, 100]];
    const pts = base.map(([x, y]) => dir === 0 ? [x, y] : dir === 1 ? [100 - x, y] : dir === 2 ? [y, x] : [y, 100 - x]);
    return 'polygon(' + pts.map(p => `${p[0] + (dir <= 1 ? w : 0)}% ${p[1] + (dir > 1 ? w : 0)}%`).join(',') + ')';
  }

  /* ---------- 格 ---------- */
  function buildImage(panel, slot, bb, safeC) {
    const fb = bb.w / bb.h, ratio = parseRatio(panel.ratio, fb);
    const A = assets && assets[panel.id];
    if (A && A.src) {
      const cv = document.createElement('canvas'); cv.width = 4; cv.height = 4;
      loadImg(aBase + A.src).then(img => {
        const c = A.crop || [0, 0, 1, 1], low = c[2] * img.naturalWidth < bb.w * W * LOWRES;
        const out = cropToCanvas(img, c, 1600); cv.width = out.width; cv.height = out.height; cv.getContext('2d').drawImage(out, 0, 0);
        if (low && cv.onlow) cv.onlow();
      }).catch(() => { const ph = paintPlaceholder(panel.id, 900, 900 / fb, safeC, 'panel', panel.id + ' (src missing)'); cv.width = ph.width; cv.height = ph.height; cv.getContext('2d').drawImage(ph, 0, 0); });
      return cv;
    }
    const mkPH = () => paintPlaceholder(panel.id, 900, 900 / (opts.useRatio ? ratio : fb), safeC, 'panel', panel.id);
    if (!panel.image || opts.forcePlaceholder) return mkPH();
    const img = new Image(); img.src = (opts.imageBase || '') + panel.image; img.draggable = false;
    const ph = mkPH(); ph.style.cssText = ''; // 占位先顶着,图片加载成功再替换
    const holder = el('div'); holder.style.cssText = 'width:100%;height:100%;position:relative'; holder.appendChild(ph);
    img.onload = () => { img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0'; holder.appendChild(img); };
    return holder;
  }
  function cameraKF(c, safeO) {
    const mv = (c && c.move) || 'hold';
    switch (mv) {
      case 'push-in': return [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }];
      case 'pan-left': return [{ transform: 'translateX(5%) scale(1.04)' }, { transform: 'translateX(-5%) scale(1.04)' }];
      case 'pan-right': return [{ transform: 'translateX(-5%) scale(1.04)' }, { transform: 'translateX(5%) scale(1.04)' }];
      case 'shake': {
        const k = [], r = rng('shake' + Math.random()); for (let i = 0; i < 14; i++) { const a = 1 - i / 14; k.push({ transform: `translate(${((r() - .5) * 5 * a).toFixed(2)}%,${((r() - .5) * 4 * a).toFixed(2)}%) scale(1.07)` }); }
        k.push({ transform: 'translate(0,0) scale(1.07)' }); return k;
      }
      default: return [{ transform: 'scale(1.02)' }, { transform: 'scale(1.07)' }];
    }
  }
  function revealPanel(pg, panel, idx) {
    const layout = pg.data.layout, slot = layout.slots[panel.slot - 1];
    if (!slot) { console.warn('slot missing', panel.id); return; }
    const poly = toPx(slot.polygon), bb = bboxOf(poly), sp = S.speed;
    const safe = slot.safe ? { x: slot.safe[0] * W, y: slot.safe[1] * H, w: slot.safe[2] * W, h: slot.safe[3] * H } : { x: bb.x + bb.w * .25, y: bb.y + bb.h * .2, w: bb.w * .5, h: bb.h * .6 };
    const safeC = [(safe.x + safe.w / 2 - bb.x) / bb.w, (safe.y + safe.h / 2 - bb.y) / bb.h];
    const wrap = el('div', 'wc-slot', pg.el); wrap.style.zIndex = (slot.z || 1) * 10 + 10; wrap.style.transformOrigin = `${bb.x + bb.w / 2}px ${bb.y + bb.h / 2}px`;
    const clip = el('div', 'wc-clip', wrap); clip.style.clipPath = clipStr(poly);
    const wipe = el('div', 'wc-wipe', clip); wipe.style.cssText += `left:${bb.x}px;top:${bb.y}px;width:${bb.w}px;height:${bb.h}px;clip-path:${wedge(0, 0)}`;
    const cam = el('div', 'wc-cam', wipe); cam.style.transformOrigin = `${(safeC[0] * 100).toFixed(0)}% ${(safeC[1] * 100).toFixed(0)}%`;
    const imgEl = buildImage(panel, slot, bb, safeC); cam.appendChild(imgEl);
    imgEl.onlow = () => { cam.getAnimations().forEach(a => a.cancel()); cam.style.transform = 'scale(1)'; };
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}` }, wrap);
    const ol = sv('polygon', { points: poly.map(p => p.join(',')).join(' '), fill: 'none', stroke: PAPER, 'stroke-width': 6, 'stroke-linejoin': 'miter', 'stroke-miterlimit': 8, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, svg);
    const dir = (panel.slot + pg.data.n) % 4, wd = 560 / sp;
    wipe.animate([{ clipPath: wedge(dir, 0) }, { clipPath: wedge(dir, 140) }], { duration: wd, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' }).finished.then(() => { wipe.style.clipPath = 'none'; }).catch(() => { });
    ol.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: wd + 120 / sp, easing: 'ease-out', fill: 'forwards' });
    wrap.animate([{ transform: 'translate(-9px,6px) scale(1.035)', offset: 0 }, { transform: 'translate(2px,-1px) scale(.995)', offset: .55 }, { transform: 'none', offset: 1 }], { duration: 420 / sp, delay: wd * .35, easing: 'ease-out' });
    const cdur = ((panel.camera && panel.camera.dur) || 3.5) * 1000 / sp;
    cam.animate(cameraKF(panel.camera), { duration: (panel.camera && panel.camera.move === 'shake') ? 700 / sp : cdur, easing: (panel.camera && panel.camera.move === 'shake') ? 'linear' : 'ease-in-out', fill: 'forwards' });
    (panel.blocks || []).forEach(b => addBlock(pg, b, b.bleed ? 150 : 5));
    if (S.portrait) focusPan(false, bb);

    // 出框层
    if (panel.pop && panel.pop.pos) {
      const po = panel.pop, pw = (po.scale || .3) * W, ph = pw * 1.25, cx = po.pos[0] * W, cy = po.pos[1] * H;
      const over = (po.over && po.over.length ? po.over : [panel.slot]).map(n => (layout.slots[n - 1] || {}).z || 1);
      const z = Math.max(...over) * 10 + 15;
      const pe = el('div', 'wc-pop', pg.el); pe.style.cssText += `left:${cx - pw / 2}px;top:${cy - ph / 2}px;width:${pw}px;z-index:${z};`;
      let content;
      const PA = assets && assets[panel.id + '_pop'];
      if (PA && PA.src) {
        content = document.createElement('canvas'); content.width = 4; content.height = 5;
        loadImg(aBase + PA.src).then(img => { const o = cropToCanvas(img, PA.crop || [0, 0, 1, 1], 1000, PA.chroma); content.width = o.width; content.height = o.height; content.getContext('2d').drawImage(o, 0, 0); const hh = pw * o.height / o.width; const rr = pg.avoid.find(a => a.pop === po); if (rr) { rr.h = hh; rr.y = cy - hh / 2; } pe.style.top = (cy - hh / 2) + 'px'; }).catch(() => { });
      } else if (!po.image || opts.forcePlaceholder) { content = paintPlaceholder(panel.id + '-pop', 480, 600, [.5, .5], 'pop'); }
      else { content = new Image(); content.src = (opts.imageBase || '') + po.image; }
      pe.appendChild(content);
      pg.avoid.push({ x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph, soft: true, pop: po });
      const inner = pe; inner.style.opacity = 0;
      setTimeout(() => { inner.style.opacity = 1; inner.animate([{ transform: 'scale(.55) rotate(-6deg)', opacity: 0 }, { transform: 'scale(1.08) rotate(1.5deg)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 440 / sp, easing: 'cubic-bezier(.2,.9,.3,1)' }); }, wd * .55);
    }
    // 拟声词
    if (panel.sfx) {
      const sf = el('div', 'wc-sfx', pg.el); sf.textContent = panel.sfx; sf.style.zIndex = 190;
      const fs = clamp(Math.min(bb.w, bb.h) * .24, 56, 120); sf.style.fontSize = fs + 'px';
      const rot = (hash(panel.id) % 2 ? -1 : 1) * (5 + hash(panel.id + 'r') % 8);
      sf.style.visibility = 'hidden';
      const sw = sf.offsetWidth, sh = sf.offsetHeight;
      const pos = place(sw, sh, { poly, bb, safe, avoid: pg.avoid, loose: true, noTopBias: true });
      sf.style.left = pos.x + 'px'; sf.style.top = pos.y + 'px'; sf.style.visibility = 'visible'; sf.style.opacity = 0; sf.style.transform = `rotate(${rot}deg)`;
      pg.avoid.push({ x: pos.x, y: pos.y, w: sw, h: sh });
      setTimeout(() => { sf.style.opacity = 1; sf.animate([{ transform: `rotate(${rot * 3}deg) scale(.1)`, opacity: 0 }, { transform: `rotate(${rot}deg) scale(1.3)`, opacity: 1, offset: .55 }, { transform: `rotate(${rot}deg) scale(1)`, opacity: 1 }], { duration: 420 / sp, easing: 'cubic-bezier(.2,1,.3,1)' }); }, wd * .6);
    }
    pg.revealed[idx] = { poly, bb, safe, panel };
  }

  /* ---------- 字幕 ---------- */
  function place(w, h, o) {
    const pad = o.loose ? 50 : 0, step = 20, bb = o.bb;
    let best = null, bc = 1e18;
    const x0 = Math.max(12, bb.x - pad), x1 = Math.min(W - w - 12, bb.x + bb.w - w + pad);
    const y0 = Math.max(12, bb.y - pad), y1 = Math.min(H - h - 12, bb.y + bb.h - h + pad);
    const sf = o.safe ? { x: o.safe.x - 12, y: o.safe.y - 12, w: o.safe.w + 24, h: o.safe.h + 24 } : null;
    for (let y = y0; y <= Math.max(y0, y1); y += step) for (let x = x0; x <= Math.max(x0, x1); x += step) {
      let out = 0;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (!inPoly(x + 8 + (w - 16) * i / 2, y + 8 + (h - 16) * j / 2, o.poly)) out++; }
      const rc = { x, y, w, h };
      let c = out * (o.loose ? 150 : 5000);
      if (sf) c += ovl(rc, sf) / 40;
      for (const a of o.avoid) c += ovl(rc, a) / (a.soft ? 80 : 4);
      if (!o.noTopBias) c += (y - bb.y) * .6 + Math.abs(x + w / 2 - (bb.x + bb.w / 2)) * .05; else c += (bb.y + bb.h - y - h) * .5;
      if (c < bc) { bc = c; best = { x, y }; }
    }
    return best || { x: clamp(bb.x, 12, W - w - 12), y: clamp(bb.y, 12, H - h - 12) };
  }
  function showLine(pg, rev, line) {
    if (S.portrait) { dock.innerHTML = ''; const nar = isNarr(line.who); if (!nar) { const w = el('div', 'who', dock); w.textContent = line.who; w.style.background = whoColor(line.who); dock.appendChild(document.createElement('br')); } const t = el('span', 'tx' + (nar ? ' nar' : ''), dock); t.textContent = line.text; dock.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240 / S.speed }); return; }
    const nar = isNarr(line.who), c = el('div', 'wc-cap ' + (nar ? 'nar' : 'say'), pg.caps);
    c.style.visibility = 'hidden';
    const maxW = clamp(rev.bb.w * .62, 300, 540); c.style.maxWidth = maxW + 'px'; c.style.width = 'max-content';
    if (!nar) { const w = el('span', 'who', c); w.textContent = line.who; w.style.background = whoColor(line.who); }
    const tx = el('span', '', c); tx.textContent = line.text;
    const tl = nar ? null : el('i', 'tl', c);
    const w = c.offsetWidth, h = c.offsetHeight;
    const pos = place(w, h, { poly: rev.poly, bb: rev.bb, safe: rev.safe, avoid: pg.avoid });
    c.style.left = pos.x + 'px'; c.style.top = pos.y + 'px';
    if (tl) { // 气泡尖角指向主体
      const dx = rev.safe.x + rev.safe.w / 2 - (pos.x + w / 2), dy = rev.safe.y + rev.safe.h / 2 - (pos.y + h / 2);
      const side = Math.abs(dy) * 1.2 > Math.abs(dx) ? (dy > 0 ? 'b' : 't') : (dx > 0 ? 'r' : 'l');
      tl.classList.add(side);
      if (side === 'b' || side === 't') tl.style.left = clamp(w / 2 + dx * .25 - 9, 22, w - 40) + 'px'; else tl.style.top = clamp(h / 2 + dy * .25 - 9, 18, h - 36) + 'px';
    }
    pg.avoid.push({ x: pos.x, y: pos.y, w, h });
    c.style.visibility = 'visible';
    c.animate([{ transform: 'scale(.82) translateY(8px)', opacity: 0 }, { transform: 'scale(1.03)', opacity: 1, offset: .65 }, { transform: 'none', opacity: 1 }], { duration: 260 / S.speed, easing: 'ease-out' });
  }

  /* ---------- 推进 ---------- */
  function updateStat() {
    const pg = S.pg; if (!pg) return;
    stat.textContent = `第 ${S.pi + 1}/${pages.length} 页 · 格 ${Math.max(S.ci + 1, 0)}/${pg.data.panels.length}`;
    const last = S.pi === pages.length - 1 && S.ci >= pg.data.panels.length - 1 && S.li >= ((pg.data.panels[S.ci] || {}).lines || []).length;
    hint.textContent = last ? '点击结束' : (S.ci >= pg.data.panels.length - 1 && S.li >= ((pg.data.panels[S.ci] || {}).lines || []).length ? '点击翻页' : '点击 / 空格 继续');
  }
  function textLen() { const p = S.pg.data.panels[S.ci]; const l = p && p.lines && p.lines[S.li - 1]; return l ? l.text.length : 0; }
  function advance(fromAuto) {
    if (S.done || S.lock) return;
    clearTimeout(S.timer);
    const pg = S.pg, panels = pg.data.panels;
    const cur = panels[S.ci];
    if (cur && S.li < (cur.lines || []).length) { showLine(pg, pg.revealed[S.ci], cur.lines[S.li]); S.li++; }
    else if (S.ci + 1 < panels.length) { S.ci++; const p = panels[S.ci]; revealPanel(pg, p, S.ci); S.li = 0; if (S.portrait) dock.innerHTML = ''; if (p.lines && p.lines.length) { const rv = pg.revealed[S.ci]; setTimeout(() => { if (S.pg === pg && rv) showLine(pg, rv, p.lines[0]); }, 520 / S.speed); S.li = 1; } }
    else if (S.pi + 1 < pages.length) { showPage(S.pi + 1, true); if (S.portrait) dock.innerHTML = ''; S.lock = true; setTimeout(() => { S.lock = false; advance(true); }, 700 / S.speed); return; }
    else { finish(); return; }
    updateStat(); schedule();
  }
  function schedule() {
    clearTimeout(S.timer); if (!S.auto || S.done) return;
    S.timer = setTimeout(() => advance(true), (1700 + textLen() * 110) / S.speed);
  }
  function finish() { if (S.done) return; S.done = true; destroy(); opts.onDone && opts.onDone(); }
  function destroy() { clearTimeout(S.timer); ro.disconnect(); document.removeEventListener('keydown', onKey); }

  function onKey(e) {
    if (!root.isConnected) return destroy();
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Escape') return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
    else if (e.key === 'Escape') { finish(); }
  }
  document.addEventListener('keydown', onKey);
  view.addEventListener('click', () => advance());
  dock.addEventListener('click', () => advance());
  bSkip.addEventListener('click', e => { e.stopPropagation(); finish(); });
  bAuto.addEventListener('click', e => { e.stopPropagation(); S.auto = !S.auto; bAuto.classList.toggle('on', S.auto); schedule(); });
  speedInput.addEventListener('input', () => { S.speed = +speedInput.value; speedLabel.textContent = S.speed.toFixed(1) + '×'; });

  layoutSize();
  showPage(0, false);
  setTimeout(() => advance(), 250);

  return {
    next: () => advance(), skip: finish, destroy,
    setAuto(v) { S.auto = !!v; bAuto.classList.toggle('on', S.auto); schedule(); },
    setSpeed(v) { S.speed = v; speedInput.value = v; speedLabel.textContent = (+v).toFixed(1) + '×'; },
    setDebug(v) { S.debug = !!v; root.classList.toggle('wc-debug', S.debug); },
    get state() { return { page: S.pi, panel: S.ci, line: S.li, done: S.done }; },
  };
}

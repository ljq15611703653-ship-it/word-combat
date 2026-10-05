S[14] = () => { // 毕业：带层次的纯白舱，边缘像纸一样撕开，露出真实大厅
  let wl = g.createLinearGradient(0, 0, 0, GY); wl.addColorStop(0, "#d8f2ff"); wl.addColorStop(.5, "#f4fcff"); wl.addColorStop(1, "#dff3fb"); g.fillStyle = wl; g.fillRect(0, 0, W, GY);
  bokeh(W / 2, 360, 900, "#ffffff", .95);
  // 墙板：竖向分块，交替明暗，细青边
  for (let i = 0; i < 8; i++) { const x = i * 240; g.fillStyle = i % 2 ? "rgba(120,190,225,.10)" : "rgba(255,255,255,.35)"; g.fillRect(x, 0, 240, GY); glow(CY, 6, () => { g.fillStyle = "rgba(47,200,224,.45)"; g.fillRect(x, 0, 2, GY); }); }
  g.strokeStyle = "rgba(60,170,210,.2)"; g.lineWidth = 2; for (const y of [150, 420]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // 上缘暗角，下缘柔雾
  const tg = g.createLinearGradient(0, 0, 0, 220); tg.addColorStop(0, "rgba(40,120,170,.35)"); tg.addColorStop(1, "rgba(40,120,170,0)"); g.fillStyle = tg; g.fillRect(0, 0, W, 220);
  // 光束
  for (const x of [380, 960, 1540]) { const gr = g.createLinearGradient(x - 70, 0, x + 70, 0); gr.addColorStop(0, "rgba(160,230,255,0)"); gr.addColorStop(.5, "rgba(160,230,255,.45)"); gr.addColorStop(1, "rgba(160,230,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 20, 0); g.lineTo(x + 20, 0); g.lineTo(x + 70, GY); g.lineTo(x - 70, GY); g.fill(); }
  // 撕边：对多边形边细分并加锯齿
  function jag(poly) { const out = []; for (let i = 0; i < poly.length; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]; const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22)); for (let k = 0; k < n; k++) { const t = k / n, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1, o = k ? RI(-9, 9) : 0; out.push([x0 + (x1 - x0) * t + nx / nl * o, y0 + (y1 - y0) * t + ny / nl * o]); } } return out; }
  // 大厅内景：深青到蓝的渐变 + 光斑 + 圆润躺椅剪影(虚化) + 垂缆 + 顶灯
  function hall(ox, oy) { let hl = g.createLinearGradient(0, 0, 0, H); hl.addColorStop(0, "#06303a"); hl.addColorStop(.6, "#0b4a58"); hl.addColorStop(1, "#06222c"); g.fillStyle = hl; g.fillRect(0, 0, W, H);
    bokeh(ox + 160, oy - 60, 260, "#3fe0d0", .35);
    g.save(); g.filter = "blur(1.5px)";
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) { const x = ox + k * 150 - r * 30, y = oy + r * 110, s = 1 - r * .12;
      g.fillStyle = `rgba(${40 + r * 12},${120 + r * 10},${135 + r * 8},${.85 - r * .15})`; g.beginPath(); g.moveTo(x, y + 20 * s); g.quadraticCurveTo(x - 4, y - 50 * s, x + 30 * s, y - 52 * s); g.quadraticCurveTo(x + 52 * s, y - 40 * s, x + 56 * s, y + 4 * s); g.lineTo(x + 120 * s, y + 4 * s); g.quadraticCurveTo(x + 132 * s, y + 6 * s, x + 128 * s, y + 24 * s); g.lineTo(x, y + 28 * s); g.fill();
      g.fillStyle = "rgba(6,40,50,.85)"; g.fillRect(x + 20 * s, y + 28 * s, 8 * s, 30 * s); g.fillRect(x + 100 * s, y + 28 * s, 8 * s, 30 * s);
      g.fillStyle = "rgba(120,240,240,.55)"; g.fillRect(x + 4, y - 44 * s, 3, 40 * s); }
    g.restore();
    g.strokeStyle = "rgba(20,100,110,.9)"; g.lineWidth = 3; for (let k = 0; k < 7; k++) { const x = ox + k * 80; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 24, oy * .5, x - 10, oy - 60); g.stroke(); }
    glow("#2fe8d8", 22, () => { g.fillStyle = "rgba(90,240,225,.85)"; for (let k = 0; k < 4; k++) g.fillRect(ox + 40 + k * 150, 24, 70, 7); }); }
  function peel(poly, ox, oy) { const pj = jag(poly), p = new Path2D(); pj.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath();
    g.save(); g.shadowColor = "rgba(0,60,90,.55)"; g.shadowBlur = 30; g.shadowOffsetX = 6; g.shadowOffsetY = 6; g.fillStyle = "#000"; g.fill(p); g.restore();
    g.save(); g.clip(p); hall(ox, oy); g.restore();
    // 纸边：内侧白色厚边 + 外侧细青线
    g.save(); g.clip(p); glow("#ffffff", 8, () => { g.strokeStyle = "rgba(255,255,255,.98)"; g.lineWidth = 10; g.stroke(p); }); g.restore(); g.save(); g.strokeStyle = "rgba(60,170,210,.7)"; g.lineWidth = 1.5; g.stroke(p); g.restore(); }
  peel([[0, 0], [250, 0], [190, 70], [215, 150], [120, 210], [80, 330], [0, 400]], 0, 200);
  peel([[1920, 330], [1830, 380], [1860, 470], [1780, 560], [1830, 700], [1920, 760]], 1560, 480);
  peel([[1680, 0], [1920, 0], [1920, 110], [1830, 80], [1770, 40]], 1560, 80);
  // 翘起的碎片（白色，带投影）
  for (const [x, y, s] of [[300, 120, 26], [250, 330, 18], [1650, 240, 22], [1710, 480, 16], [1560, 60, 20]]) { g.save(); g.translate(x, y); g.rotate(R() * 3); g.shadowColor = "rgba(0,60,90,.4)"; g.shadowBlur = 10; g.shadowOffsetY = 4; g.fillStyle = "#fff"; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .9, s * .4); g.lineTo(-s * .5, s * .8); g.closePath(); g.fill(); g.restore(); }
  g.fillStyle = "#cfeef8"; g.fillRect(0, GY, W, 34); glow(CY, 10, () => { g.fillStyle = hex(CY, .7); g.fillRect(0, GY + 33, W, 3); });
  gridFloor("rgba(47,200,224,.4)", "#f4fcff", "#a6dcec"); reflect(.18, 160, 8);
  g.save(); g.globalAlpha = .5; const rg = g.createRadialGradient(W / 2, GY + 80, 0, W / 2, GY + 80, 800); rg.addColorStop(0, "rgba(255,255,255,.9)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(0, GY + 36, W, H); g.restore();
  for (const [x, sg] of [[0, 1], [W, -1]]) { const gr = g.createLinearGradient(x, 0, x + sg * 300, 0); gr.addColorStop(0, "rgba(20,130,140,.6)"); gr.addColorStop(1, "rgba(20,130,140,0)"); g.fillStyle = gr; g.fillRect(Math.min(x, x + sg * 300), GY + 36, 300, H - GY - 36); }
};

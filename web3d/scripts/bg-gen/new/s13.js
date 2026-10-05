S[13] = () => { // 赤红竞技场：红主调、弧形看台+观众剪影+过道+旗幕+两侧灯塔、聚光灯
  let sk = g.createLinearGradient(0, 0, 0, GY); [0, .5, .85, 1].forEach((t, i) => sk.addColorStop(t, P.sky[i])); g.fillStyle = sk; g.fillRect(0, 0, W, GY);
  bokeh(W / 2, GY - 150, 1000, "#ff3040", .4);
  // 顶部灯桁架
  g.fillStyle = "#12030a"; g.fillRect(0, 0, W, 64); g.fillRect(0, 86, W, 4);
  for (let x = 0; x < W; x += 120) g.fillRect(x, 0, 5, 90);
  for (let x = 140; x < W; x += 320) { glow("#ff5a4a", 16, () => { g.fillStyle = hex("#ff5a4a", .9); g.fillRect(x - 30, 64, 60, 12); }); }
  // 看台层
  const tiers = [[120, "#2a060e"], [210, "#3a0a14"], [300, "#4a0e1a"], [390, "#5a1220"], [480, "#6a1826"], [570, "#7a1e2e"]];
  const curve = (x, y) => y + 30 - 56 * Math.sin(Math.PI * x / W) * .5 + 0;
  tiers.forEach(([y, col], i) => { const hh = 100 + i * 4;
    const tg = g.createLinearGradient(0, y - 20, 0, y + hh); tg.addColorStop(0, col); tg.addColorStop(1, "#16040a"); g.fillStyle = tg;
    g.beginPath(); g.moveTo(0, y + 30); g.quadraticCurveTo(W / 2, y - 26, W, y + 30); g.lineTo(W, y + hh); g.quadraticCurveTo(W / 2, y + hh - 56, 0, y + hh); g.fill();
    // 观众剪影：沿弧线的圆头+肩，亮暗相间的低对比
    g.save(); g.clip(); for (let x = 10; x < W; x += 34 + ((i * 7) % 5)) { const yy = y + 30 - 56 * Math.sin(Math.PI * x / W) * .5 + 40 + (x * 13 % 9); g.fillStyle = (x / 34 | 0) % 3 ? "rgba(10,0,6,.55)" : "rgba(10,0,6,.35)"; g.beginPath(); g.arc(x, yy, 7, 0, 7); g.fill(); g.fillRect(x - 12, yy + 7, 24, 40); }
    g.restore();
    glow("#ff4a40", 12, () => { g.strokeStyle = hex("#ff5a4a", .6 + i * .05); g.lineWidth = 3; g.beginPath(); g.moveTo(0, y + 30); g.quadraticCurveTo(W / 2, y - 26, W, y + 30); g.stroke(); }); });
  // 放射状过道楼梯（从中心灭点向外）
  g.save(); g.strokeStyle = "rgba(255,90,80,.28)"; g.lineWidth = 3; for (let k = -6; k <= 6; k++) { if (!k) continue; g.beginPath(); g.moveTo(W / 2 + k * 40, 130); g.lineTo(W / 2 + k * 190, GY - 20); g.stroke(); } g.restore();
  // 悬挂旗幕
  for (const x of [360, 620, 1300, 1560]) { glow("#ff2a3a", 18, () => { g.fillStyle = "#3a060e"; g.fillRect(x - 3, 90, 6, 60); const bg2 = g.createLinearGradient(0, 150, 0, 330); bg2.addColorStop(0, "#d42a3a"); bg2.addColorStop(1, "#6a0e1c"); g.fillStyle = bg2; g.beginPath(); g.moveTo(x - 36, 150); g.lineTo(x + 36, 150); g.lineTo(x + 36, 320); g.lineTo(x, 345); g.lineTo(x - 36, 320); g.fill(); }); g.strokeStyle = "rgba(255,230,230,.85)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 20, 190); g.lineTo(x, 235); g.lineTo(x + 20, 190); g.stroke(); }
  // 两侧灯塔（近景，同其他关的近楼体量）
  for (const [x0, w0, sg] of [[0, 300, 1], [W, 300, -1]]) { const tx = x0 + sg * w0 / 2; const tg = g.createLinearGradient(0, 0, 0, GY); tg.addColorStop(0, "#160308"); tg.addColorStop(1, "#2a0610"); g.fillStyle = tg; g.fillRect(Math.min(x0, x0 + sg * w0), 0, w0, GY); g.fillStyle = "rgba(255,120,110,.1)"; g.fillRect(x0 + sg * w0 - (sg > 0 ? 70 : 0), 0, 70, GY);
    glow("#ff2a3a", 22, () => { g.fillStyle = "#ff3a4a"; g.fillRect(tx + sg * 40, 80, 5, 520); g.fillStyle = "#fff"; g.fillRect(tx - sg * 70, 40, 4, 420); }); g.strokeStyle = "rgba(255,90,90,.6)"; g.lineWidth = 2; g.strokeRect(Math.min(x0, x0 + sg * w0), -4, w0, GY + 4); }
  neonRect(40, 160, 190, 110, "#ff2a3a", .6); neonRect(1690, 160, 190, 110, "#ff2a3a", .6);
  // 聚光灯锥
  for (const [x0, x1, a] of [[W / 2, W / 2, .3], [520, 800, .13], [1400, 1120, .13]]) { const gr = g.createLinearGradient(0, 70, 0, GY + 260); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - 16, 80); g.lineTo(x0 + 16, 80); g.lineTo(x1 + 230, GY + 260); g.lineTo(x1 - 230, GY + 260); g.fill(); }
  glow("#ffffff", 30, () => { g.fillStyle = "#fff"; g.fillRect(W / 2 - 22, 64, 44, 14); });
  // 围栏
  g.fillStyle = "#12030a"; g.fillRect(0, GY - 14, W, 48); glow("#ff2a3a", 12, () => { g.fillStyle = "#ff4a50"; g.fillRect(0, GY + 33, W, 3); g.fillRect(0, GY - 14, W, 2); });
  let rd = g.createLinearGradient(0, GY + 36, 0, H); rd.addColorStop(0, "#5a1220"); rd.addColorStop(.5, "#2e0a12"); rd.addColorStop(1, "#0e0206"); g.fillStyle = rd; g.fillRect(0, GY + 36, W, H - GY - 36);
  g.save(); g.beginPath(); g.rect(0, GY + 36, W, H - GY - 36); g.clip(); glow("#ff5a4a", 12, () => { g.strokeStyle = hex("#ff6a5a", .6); g.lineWidth = 4; g.beginPath(); g.ellipse(W / 2, GY + 400, 1500, 330, 0, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, GY + 400, 900, 190, 0, 0, 7); g.stroke(); }); g.restore();
  let sp = g.createRadialGradient(W / 2, GY + 150, 0, W / 2, GY + 150, 500); sp.addColorStop(0, "rgba(255,240,240,.4)"); sp.addColorStop(1, "rgba(255,240,240,0)"); g.save(); g.translate(W / 2, GY + 150); g.scale(1, .24); g.translate(-W / 2, -GY - 150); g.fillStyle = sp; g.fillRect(0, GY - 400, W, 1100); g.restore();
  reflect(.3, 240, 8); pools(5, ["#ff3a4a", "#ffb0a0"]);
  sparks(70, 0, W, 60, H, ["#ff6a3a", "#ffb040", "#ff3a4a"], false);
  glow("#ff2a3a", 16, () => { g.fillStyle = hex("#ff2a3a", .8); g.fillRect(0, H - 20, W, 4); });
};

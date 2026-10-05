S[3] = () => { // 简报厅：落地窗外是夜城，窗前悬浮全息屏、投影光柱、断联红点
  skyline(LAY.B, {});
  g.fillStyle = "rgba(0,0,40,.22)"; g.fillRect(0, 0, W, GY);
  bokeh(W / 2, 330, 900, CY, .16);
  const tb = g.createLinearGradient(0, 0, 0, 96); tb.addColorStop(0, "#03061c"); tb.addColorStop(1, "#0a1450"); g.fillStyle = tb; g.fillRect(0, 0, W, 96);
  glow(CY, 14, () => { g.fillStyle = hex(CY, .9); g.fillRect(0, 94, W, 3); });
  for (let x = 160; x < W; x += 320) glow(CY, 18, () => { g.fillStyle = hex(CY, .7); g.fillRect(x - 70, 40, 140, 8); });
  for (const x of [330, 1590]) { g.fillStyle = "#050a34"; g.fillRect(x - 10, 96, 20, GY - 96); g.fillStyle = "rgba(160,200,255,.12)"; g.fillRect(x - 10, 96, 5, GY - 96); glow(CY, 10, () => { g.fillStyle = hex(CY, .6); g.fillRect(x + 10, 96, 2, GY - 96); }); }
  for (const [x0, x1, y1] of [[420, 180, GY + 150], [1500, 1740, GY + 150], [960, 960, 560]]) { const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, hex(CY, .32)); gr.addColorStop(1, hex(CY, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - 20, 96); g.lineTo(x0 + 20, 96); g.lineTo(x1 + 120, y1); g.lineTo(x1 - 120, y1); g.fill(); }
  const sx = 560, sy = 130, sw = 800, sh = 400;
  glow(CY, 40, () => { g.fillStyle = hex("#0a2a70", .55); g.fillRect(sx, sy, sw, sh); g.strokeStyle = hex(CY, .95); g.lineWidth = 3; g.strokeRect(sx, sy, sw, sh); });
  g.fillStyle = "rgba(0,0,40,.22)"; for (let y = sy + 6; y < sy + sh; y += 8) g.fillRect(sx, y, sw, 2);
  glow(CY, 12, () => { g.strokeStyle = CY; g.lineWidth = 3; g.beginPath(); g.moveTo(sx + 50, sy + 310); for (let i = 1; i < 12; i++) g.lineTo(sx + 50 + i * 40, sy + 310 - 40 - 90 * Math.abs(Math.sin(i * .7))); g.stroke();
    g.beginPath(); g.arc(sx + 640, sy + 130, 80, 0, 7); g.stroke(); g.beginPath(); g.arc(sx + 640, sy + 130, 50, .5, 5.2); g.stroke(); });
  g.fillStyle = hex(CY, .5); for (let i = 0; i < 9; i++) g.fillRect(sx + 60 + i * 34, sy + 360 - RI(20, 80), 22, RI(20, 80));
  for (let i = 0; i < 6; i++) g.fillRect(sx + 60 + i * 34, sy + 50, RI(60, 160), 8);
  glow("#ff3355", 24, () => { g.strokeStyle = "#ff3355"; g.lineWidth = 6; for (const r of [26, 50, 74]) { g.beginPath(); g.arc(sx + 690, sy + 340, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } g.beginPath(); g.moveTo(sx + 630, sy + 380); g.lineTo(sx + 750, sy + 270); g.stroke(); g.fillStyle = "#ff3355"; g.beginPath(); g.arc(sx + 690, sy + 346, 8, 0, 7); g.fill(); });
  for (let i = 0; i < 9; i++) glow("#ff3355", 16, () => { g.fillStyle = i % 3 === 1 ? "#ff3355" : "#6a1a34"; g.beginPath(); g.arc(sx + 40 + i * 90, sy - 20, 7, 0, 7); g.fill(); });
  glow("#ff3355", 12, () => { g.fillStyle = hex("#ff3355", .75); g.fillRect(sx, sy + sh + 10, sw, 4); });
  for (const x of [0, 1780]) { const pg = g.createLinearGradient(x, 0, x + 140, 0); pg.addColorStop(x ? 1 : 0, "#050a34"); pg.addColorStop(x ? 0 : 1, "#10206a"); g.fillStyle = pg; g.fillRect(x, 0, 140, GY); const col = x ? PI : CY; glow(col, 22, () => { g.fillStyle = col; g.fillRect(x + (x ? 24 : 110), 120, 5, 460); }); g.fillStyle = "rgba(160,200,255,.1)"; g.fillRect(x + (x ? 0 : 100), 0, 40, GY); }
  for (const [x, y] of [[100, 150], [1820, 150], [100, 280], [1820, 280]]) glow("#ff3355", 14, () => { g.fillStyle = "#ff3355"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); });
  curb(); roadBase(); streaks(70); reflect(.5, 320, 4);
  for (let k = 0; k < 6; k++) { g.fillStyle = hex(CY, .12); g.fillRect(0, GY + 100 + k * 60, W, 2); }
  glow(CY, 14, () => { g.fillStyle = hex(CY, .6); g.fillRect(0, H - 22, W, 3); }); pools(5, [CY]);
};

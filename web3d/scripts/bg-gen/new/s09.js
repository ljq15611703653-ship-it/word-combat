S[9] = () => { // 暗处：窄巷，少量灯光，但仍有清晰层次
  skyline(LAY.D, { density: .7, nofloat: 1, noledge: 1 });
  g.fillStyle = "rgba(0,0,30,.2)"; g.fillRect(0, 0, W, GY);
  for (const [x0, x1] of [[0, 560], [1360, 1920]]) { const gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, "#0c1654"); gr.addColorStop(1, "#060a30"); g.fillStyle = gr; g.fillRect(x0, 0, x1 - x0, GY); g.fillStyle = "rgba(120,170,255,.09)"; g.fillRect(x0 === 0 ? 420 : 1360, 0, 140, GY); g.fillStyle = "rgba(160,200,255,.08)"; for (let y = 120; y < GY; y += 100) g.fillRect(x0, y, x1 - x0, 2); }
  glow(CY, 16, () => { g.fillStyle = hex(CY, .85); g.fillRect(560, 0, 3, GY); g.fillStyle = hex(PI, .85); g.fillRect(1357, 0, 3, GY); });
  g.fillStyle = "#040728"; for (const x of [60, 100, 140, 1760, 1810, 1860]) g.fillRect(x, 0, 14, GY); for (const x of [470, 520, 1400, 1450]) g.fillRect(x, 0, 10, GY);
  g.fillRect(0, 200, 560, 22); g.fillRect(1360, 260, 560, 22); g.fillRect(0, 440, 560, 14);
  g.fillStyle = "rgba(47,216,255,.35)"; g.fillRect(0, 200, 560, 2); g.fillRect(1360, 260, 560, 2);
  g.strokeStyle = "#040728"; g.lineWidth = 5; for (const [y0, dip] of [[210, 70], [270, 110], [160, 40]]) { g.beginPath(); g.moveTo(560, y0); g.quadraticCurveTo(960, y0 + dip, 1360, y0 + 40); g.stroke(); }
  neonRect(130, 220, 180, 90, CY, .75); neonRect(1480, 200, 40, 220, PI, .8, false); neonRect(240, 360, 30, 140, PI, .6, false);
  glow("#ffb35a", 18, () => { g.fillStyle = "#ffb35a"; g.fillRect(1380, 470, 8, 8); }); bokeh(1384, 474, 110, "#ffb35a", .35);
  glow(CY, 26, () => { g.fillStyle = "#040728"; g.fillRect(900, GY - 190, 5, 190); g.fillStyle = hex(CY, .95); g.fillRect(884, GY - 194, 34, 5); }); bokeh(902, GY - 120, 190, CY, .22);
  for (let i = 0; i < 7; i++) smoke(RI(560, 1360), RI(GY - 260, GY - 20), RI(70, 130), "#8ea8e8", .14);
  curb(); roadBase();
  reflect(.5, 280, 5); streaks(50);
  g.save(); g.fillStyle = hex(PI, .2); g.beginPath(); g.ellipse(1480, GY + 130, 240, 28, 0, 0, 7); g.fill(); g.fillStyle = hex(CY, .2); g.beginPath(); g.ellipse(210, GY + 160, 210, 26, 0, 0, 7); g.fill(); g.restore();
  g.save(); g.globalAlpha = .35; lanes(.3, "rgba(255,210,31,.5)", false); g.restore(); pools(4, [CY, PI]);
  glow(PI, 14, () => { g.fillStyle = hex(PI, .7); g.fillRect(0, H - 18, W, 3); });
};

function cube(cx, cy, sz, col, pipsOn = true) { // 等距骰子：渐变面+高光棱+各面点数+地面光晕
  const a = sz, hx = a * .87;
  const faces = { t: { o: [0, -a], u: [hx, a / 2], v: [-hx, a / 2], c0: .78, c1: .42, n: 5 }, l: { o: [-hx, -a / 2], u: [hx, a / 2], v: [0, a], c0: .5, c1: .12, n: 3 }, r: { o: [0, 0], u: [hx, -a / 2], v: [0, a], c0: .62, c1: .2, n: 6 } };
  bokeh(cx, cy, a * 1.9, col, .3);
  // 投影椭圆
  g.save(); g.translate(cx, cy + a * 1.9); g.scale(1, .22); const sg = g.createRadialGradient(0, 0, 0, 0, 0, a * 1.1); sg.addColorStop(0, hex(col, .35)); sg.addColorStop(1, hex(col, 0)); g.fillStyle = sg; g.beginPath(); g.arc(0, 0, a * 1.1, 0, 7); g.fill(); g.restore();
  const grid = { 1: [[.5, .5]], 3: [[.22, .22], [.5, .5], [.78, .78]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .22], [.27, .5], [.27, .78], [.73, .22], [.73, .5], [.73, .78]] };
  for (const f of ["l", "r", "t"]) { const F = faces[f], P0 = [cx + F.o[0], cy + F.o[1]], P1 = [P0[0] + F.u[0], P0[1] + F.u[1]], P2 = [P1[0] + F.v[0], P1[1] + F.v[1]], P3 = [P0[0] + F.v[0], P0[1] + F.v[1]];
    g.beginPath(); g.moveTo(...P0); g.lineTo(...P1); g.lineTo(...P2); g.lineTo(...P3); g.closePath();
    const gr = g.createLinearGradient(P0[0], P0[1], P2[0], P2[1]); gr.addColorStop(0, hex(col, F.c0)); gr.addColorStop(1, hex(col, F.c1)); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.fillStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.moveTo(...P0); g.lineTo(...P1); g.lineTo(P1[0] * .55 + P2[0] * .45, P1[1] * .55 + P2[1] * .45); g.lineTo(P0[0] * .6 + P3[0] * .4, P0[1] * .6 + P3[1] * .4); g.fill();
    if (pipsOn) { g.save(); g.setTransform(F.u[0], F.u[1], F.v[0], F.v[1], P0[0], P0[1]); for (const [s, t] of grid[F.n]) { g.shadowColor = "#fff"; g.shadowBlur = 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(s, t, .085, 0, 7); g.fill(); g.fillStyle = hex(col, .9); g.beginPath(); g.arc(s, t, .045, 0, 7); g.fill(); } g.restore(); }
    g.restore(); glow(col, 16, () => { g.strokeStyle = hex(col, .95); g.lineWidth = 2.5; g.beginPath(); g.moveTo(...P0); g.lineTo(...P1); g.lineTo(...P2); g.lineTo(...P3); g.closePath(); g.stroke(); }); }
  glow("#ffffff", 8, () => { g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-hx + cx, cy - a / 2); g.lineTo(cx, cy - a); g.lineTo(cx + hx, cy - a / 2); g.stroke(); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + a); g.stroke(); });
}

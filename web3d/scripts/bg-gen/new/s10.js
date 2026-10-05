S[10] = () => { // 镜厅：左右镜像（青/橙），中线是面具般裂开的缝
  skyline(LAY.A, { nofloat: 1 });
  g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(c, 0, 0, W / 2, GY, 0, 0, W / 2, GY); g.restore();
  let hl = g.createLinearGradient(0, 0, W, 0); hl.addColorStop(0, "rgba(40,200,255,.16)"); hl.addColorStop(.48, "rgba(40,200,255,.04)"); hl.addColorStop(.52, "rgba(255,140,40,.04)"); hl.addColorStop(1, "rgba(255,140,40,.2)"); g.fillStyle = hl; g.fillRect(0, 0, W, GY);
  curb(); roadBase(); lanes(.45, "rgba(255,210,31,.8)", false); streaks(90, [CY, "#ff8a2f", CY, "#ff8a2f"]); reflect(.6, 320, 4);
  g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(c, 0, GY, W / 2, H - GY, 0, GY, W / 2, H - GY); g.restore();
  let hl2 = g.createLinearGradient(0, 0, W, 0); hl2.addColorStop(0, "rgba(40,200,255,.14)"); hl2.addColorStop(.5, "rgba(0,0,0,0)"); hl2.addColorStop(1, "rgba(255,140,40,.18)"); g.fillStyle = hl2; g.fillRect(0, GY, W, H - GY);
  // 面具裂开：冲击点在上方，主缝是有宽度的暗缝，两侧各亮一边(青/橙)，放射细纹+碎片
  const cx0 = W / 2, hit = 300;
  function line(pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); }
  const up = [[cx0, hit]], dn = [[cx0, hit]]; let xu = cx0, xd = cx0;
  for (let y = hit - 36; y > -30; y -= 36) { xu += RI(-22, 22); up.push([xu, y]); }
  for (let y = hit + 36; y < H + 30; y += 36) { xd += RI(-20, 20); dn.push([xd, y]); }
  const full = up.slice().reverse().concat(dn.slice(1));
  const wd = (y) => y < hit ? 5 + 10 * (1 - Math.abs(y - hit) / hit) : Math.max(3, 15 - (y - hit) * .02);
  const L = [], Rr = []; full.forEach(([x, y]) => { const w = wd(y); L.push([x - w, y]); Rr.push([x + w, y]); });
  g.save(); g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); Rr.slice().reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
  g.fillStyle = "#04041a"; g.fill(); g.restore();
  glow("#ffffff", 14, () => { g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.5; line(full); g.stroke(); });
  glow(CY, 18, () => { g.strokeStyle = hex(CY, .95); g.lineWidth = 3; line(L); g.stroke(); });
  glow("#ff8a2f", 18, () => { g.strokeStyle = "#ffa04a"; g.lineWidth = 3; line(Rr); g.stroke(); });
  for (let i = 0; i < 14; i++) { const ang = (i / 14) * Math.PI * 2 + RI(-.15, .15); if (Math.abs(Math.cos(ang)) < .3) continue; let px = cx0, py = hit, a = ang; const n = 3 + ((R() * 4) | 0), col = Math.cos(ang) < 0 ? CY : "#ff9a3a"; const pts = [[px, py]]; for (let k = 0; k < n; k++) { a += RI(-.35, .35); const l = RI(30, 70); px += Math.cos(a) * l; py += Math.sin(a) * l; pts.push([px, py]); }
    g.save(); g.lineCap = "round"; g.strokeStyle = "#04041a"; g.lineWidth = 4; line(pts); g.stroke(); glow(col, 10, () => { g.strokeStyle = hex(col, .8); g.lineWidth = 1.4; line(pts); g.stroke(); }); g.restore(); }
  glow("#ffffff", 22, () => { g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx0, hit, 38, 38, 0, 0, 7); g.stroke(); g.strokeStyle = hex(CY, .5); g.beginPath(); g.ellipse(cx0, hit, 66, 66, 0, 0, 7); g.stroke(); });
  for (let i = 0; i < 10; i++) { const x = cx0 + RI(-170, 170), y = RI(60, 560), s = RI(8, 22); g.save(); g.translate(x, y); g.rotate(R() * 6); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, s * .5); g.lineTo(-s * .6, s * .6); g.closePath(); g.fillStyle = x < cx0 ? hex(CY, .5) : "rgba(255,150,60,.5)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.2; g.stroke(); g.restore(); }
  pools(4, [CY, "#ff8a2f"]);
};

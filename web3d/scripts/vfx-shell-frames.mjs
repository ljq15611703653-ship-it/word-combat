// 盔甲壳演出抽帧：node scripts/vfx-shell-frames.mjs <端口> <输出目录> [职业=bing] [播放次数=2]
// 电脑代打开局(正常速度)，每次演出(.vx-layer 出现→消失)连续截桌面 1280x720 帧，并记录每帧壳(.vx-shell)与施法随从 .fig 的矩形，供 PIL 联系表使用
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, sleep } from "./vfx-lib.mjs";
const PORT = process.argv[2], OUT = process.argv[3] ?? "D:/wc/polish2/shell", STYLE = process.argv[4] ?? "bing", PLAYS = +(process.argv[5] ?? 2);
mkdirSync(OUT, { recursive: true });
const c = await launch(9461 + Math.floor(Math.random() * 30), 1280, 720, "D:/wc/tmp/ud_shell" + Date.now() + "_");
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html` }); await sleep(1200);
await c.ev(`localStorage.setItem('duanju.settings', JSON.stringify({styleId:'${STYLE}',tier:'进阶',rules:'default'}))`);
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?auto=1&speed=1` }); await sleep(1500);
await c.ev("document.querySelector('.su-go').click()");
const META = `(()=>{const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]};
 const sh=document.querySelector('.vx-shell'); const units=[...document.querySelectorAll('.unit')].map(u=>r(u.querySelector('.fig')));
 return JSON.stringify({layer:!!document.querySelector('.vx-layer'),shell:r(sh),op:sh?getComputedStyle(sh).opacity:null,units,toks:document.querySelectorAll('.vx-tok').length,cam:document.querySelector('.cam')?.style.transform||''})})()`;
let play = 0, frames = [], inPlay = false, idle = 0; const t0 = Date.now();
while (play < PLAYS && Date.now() - t0 < 300000) {
  const m = JSON.parse(await c.ev(META));
  if (m.layer) {
    inPlay = true; idle = 0;
    const r = await c.cdp("Page.captureScreenshot", { format: "jpeg", quality: 72 });
    const n = String(frames.length).padStart(3, "0"); writeFileSync(`${OUT}/p${play}_${n}.jpg`, Buffer.from(r.result.data, "base64")); frames.push({ n, ...m });
  } else if (inPlay && ++idle > 2) { writeFileSync(`${OUT}/p${play}_meta.json`, JSON.stringify(frames)); console.log("play", play, "frames", frames.length); play++; frames = []; inPlay = false; }
  else await sleep(60);
}
console.log("errors", await c.ev("JSON.stringify(__dj.errors)"), c.errs.slice(0, 3));
c.proc.kill(); process.exit(0);

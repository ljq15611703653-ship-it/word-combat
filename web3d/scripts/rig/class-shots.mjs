// 职业小人在开局页/对战里的截图：node scripts/rig/class-shots.mjs <端口> <职业id> [输出目录] [对手职业id]
//   产出: setup_<id>.png(开局页) battle_<id>_idle/cast/hurt.png (桌面 1280x720)
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, sleep } from "../vfx-lib.mjs";
const PORT = process.argv[2] ?? "5611", CLS = process.argv[3] ?? "bing", OUT = process.argv[4] ?? "D:/wc/art/rig2/_sheets", FOE = process.argv[5];
mkdirSync(OUT, { recursive: true });
const c = await launch(9435, 1280, 720, "D:/wc/ud_rig2");
const shot = async (n) => { const r = await c.cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", n); };
const until = async (cond, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await c.ev(cond)) return true; await sleep(100); } return false; };
const url = `http://127.0.0.1:${PORT}/duanju.html?unlock=all`;
await c.cdp("Page.navigate", { url }); await sleep(1200);
await c.ev(`localStorage.setItem('duanju.settings', JSON.stringify({styleId:'${CLS}',tier:'普通',rules:'default',first:'me'${FOE ? `,foe:{mode:'random',preset:'newbie',deck:{},styleId:'${FOE}'}` : ""}}))`);
await c.cdp("Page.navigate", { url }); await sleep(1500);
await until("!!document.querySelector('.su-go')"); await sleep(1500);
await shot(`setup_${CLS}`);
await c.ev("document.querySelector('.su-go').click()");
await until("document.querySelector('[data-a=main]')?.textContent.includes('结束宣告')", 40000); await sleep(2000);
await shot(`battle_${CLS}_idle`);
console.log("rig canvases:", await c.ev("document.querySelectorAll('.fig canvas.rig').length"), "dirs:", await c.ev("JSON.stringify([...document.querySelectorAll('.unit')].map(u=>u.dataset.style))"));
await c.ev("__dj.battle.view.flash(0,'cast')"); await sleep(380); await shot(`battle_${CLS}_cast`);
await c.ev("__dj.battle.view.flash(3,'hit')"); await sleep(120); await shot(`battle_${CLS}_hurt`);
console.log("页面错误:", await c.ev("JSON.stringify(__dj.errors)"), c.errs.slice(0, 3));
c.proc.kill(); process.exit(0);

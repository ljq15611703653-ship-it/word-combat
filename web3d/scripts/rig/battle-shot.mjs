// 对战里骨骼小人截图：node scripts/rig/battle-shot.mjs <端口> [输出目录]  （地址栏 ?rig=1 让我方换成主角骨骼）
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, sleep } from "../vfx-lib.mjs";
const PORT = process.argv[2] ?? "5473", OUT = process.argv[3] ?? "D:/wc/art/rig/_sheets";
mkdirSync(OUT, { recursive: true });
const c = await launch(9434, 1280, 720, "D:/wc/ud_rigb");
const shot = async (n) => { const r = await c.cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", n); };
const until = async (cond, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await c.ev(cond)) return true; await sleep(100); } return false; };
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?rig=1&unlock=all` }); await sleep(1200);
await c.ev("localStorage.setItem('duanju.settings', JSON.stringify({styleId:'yin',tier:'普通',rules:'default',first:'me'}))");
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?rig=1&unlock=all` }); await sleep(1000);
await until("!!document.querySelector('.su-go')");
await c.ev("document.querySelector('.su-go').click()");
await until("document.querySelector('[data-a=main]')?.textContent.includes('结束宣告')", 40000); await sleep(1500);
await shot("battle_rig_idle");
console.log("canvases:", await c.ev("document.querySelectorAll('.fig canvas.rig').length"));
// 触发出手 / 受击姿态（直接调战斗对象的 pose，经 flash 钩子）
await c.ev("__dj.battle.view.flash(0,'cast')"); await sleep(380); await shot("battle_rig_cast");
await c.ev("__dj.battle.view.flash(3,'hit')"); await sleep(120); await shot("battle_rig_hurt");
console.log("页面错误:", await c.ev("JSON.stringify(__dj.errors)"), c.errs.slice(0, 3));
c.proc.kill(); process.exit(0);

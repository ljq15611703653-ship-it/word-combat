// 《断·句》横版布局截图自查（无头 Chrome + CDP，拖拽用真实鼠标事件）
// 用法：node scripts/duanju-layout-shots.mjs [端口=5301] [输出目录=D:/wc/duanju_layout_shots]
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, sleep } from "./vfx-lib.mjs";
const PORT = process.argv[2] ?? "5301", OUT = process.argv[3] ?? "D:/wc/duanju_layout_shots";
mkdirSync(OUT, { recursive: true });
const VIEWS = [["1280x720", 1280, 720, false], ["390x844", 390, 844, true]];
const c = await launch(9421, 1280, 720, "D:/wc/ud_dj_layout");
const shot = async (n) => { const r = await c.cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", n); };
const rect = (sel) => c.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,t:r.top,w:r.width,h:r.height}})()`);
const mouse = (type, x, y) => c.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
/** 真实鼠标：从 a 拖到 b（中途多走几步，让缝显示出来），返回释放前的快照回调 */
async function drag(a, b, mid) {
  await mouse("mouseMoved", a.x, a.y); await mouse("mousePressed", a.x, a.y);
  for (let i = 1; i <= 6; i++) { await mouse("mouseMoved", a.x + (b.x - a.x) * i / 6, a.y + (b.y - a.y) * i / 6); await sleep(30); }
  if (mid) await mid();
  await mouse("mouseReleased", b.x, b.y); await sleep(120);
}
const until = async (cond, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await c.ev(cond)) return true; await sleep(100); } return false; };
for (const [name, w, h, mobile] of VIEWS.filter((v) => !process.env.VIEW || v[0] === process.env.VIEW)) {
  await c.cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html` }); await sleep(1200);
  await c.ev("localStorage.setItem('duanju.settings', JSON.stringify({styleId:'yin',tier:'普通',rules:'default',first:'me'}))");
  await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html` }); await sleep(1000);
  await until("!!document.querySelector('.su-go')");
  await shot(`${name}_1_setup`);
  await c.ev("document.querySelector('.su-go').click()");
  await until("document.querySelector('[data-a=main]')?.textContent.includes('结束宣告')", 40000); await sleep(800);
  await shot(`${name}_2_battle_idle`);
  // 拖第一张能用的词牌到我方前排随从头顶
  const card = await rect(".lib .cw:not(.off)"); const plate = await rect(".unit.me.pos0 .panel");
  await drag(card, plate, async () => shot(`${name}_3_dragging`));
  await shot(`${name}_4_dropped`);
  // 继续拖：造成 → 数字 → 目标
  for (let k = 0; k < 3; k++) {
    const sel = await c.ev(`(()=>{const e=[...document.querySelectorAll('.lib .cw:not(.off)')].find(x=>!x.classList.contains('k-adv'));return e?e.dataset.t:null})()`);
    if (!sel) break;
    const a = await rect(`.lib .cw[data-t="${sel}"]`);
    const pr = await rect(".unit.editing .strip");
    if (!a || !pr) break;
    await drag(a, { x: pr.l + pr.w - 6, y: pr.y }, k === 1 ? async () => shot(`${name}_5_dragging_mid`) : null);
  }
  await shot(`${name}_6_composed`);
  console.log("tokens:", await c.ev("JSON.stringify(__dj.battle.dock.tokens)"));
  if (await c.ev("__dj.battle.dock.confirm()")) { await sleep(300); await shot(`${name}_7_declared`); }
  await until("(()=>{const b=document.querySelector('[data-a=main]');return b&&!b.disabled&&b.textContent.includes('结束宣告')})()", 60000);
  await c.ev("document.querySelector('[data-a=main]').click()");
  let typing = false;
  for (let i = 0; i < 200; i++) { if (await c.ev("!!document.querySelector('.caret')")) { await shot(`${name}_8_foe_typing`); typing = true; break; } if (await c.ev("document.querySelector('[data-a=main]')?.textContent.includes('结算')")) break; await sleep(25); }
  if (!typing) console.log("没抓到逐词");
  await until("document.querySelector('[data-a=main]')?.textContent.includes('结算')", 60000); await sleep(300);
  await shot(`${name}_9_ready_resolve`);
  await c.ev("document.querySelector('[data-a=main]').click()");
  for (let i = 0; i < 80; i++) { if (await c.ev("!!document.querySelector('.vx-layer')")) { await sleep(500); await shot(`${name}_10_cast`); break; } await sleep(50); }
}
console.log("页面错误:", await c.ev("JSON.stringify(__dj.errors)"), c.errs.slice(0, 3));
c.proc.kill(); process.exit(0);

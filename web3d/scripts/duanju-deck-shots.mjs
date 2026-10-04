// 组牌板：页面冒烟 + 截图（无头 Chrome / CDP）。用法：node scripts/duanju-deck-shots.mjs [端口=5183] [输出目录=D:/wc/wt_deck_shots]
import { spawn } from "node:child_process";
import fs from "node:fs";
const PORT = process.argv[2] ?? "5183", OUT = process.argv[3] ?? "D:/wc/wt_deck_shots", DBG = 9391;
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=D:/wc/ud_deck_shots", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const shot = async (name) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64")); };
const click = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, buttons: type === "mousePressed" ? 1 : 0, pointerType: "mouse" }); await sleep(150); };
const center = (sel, i = 0) => ev(`(()=>{const e=document.querySelectorAll(${JSON.stringify(sel)})[${i}];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
const clickSel = async (sel, i = 0) => { const c = await center(sel, i); if (!c) throw new Error("no " + sel); await sleep(80); const c2 = await center(sel, i); await click(c2[0], c2[1]); };
const scrollTo = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'start'})`);
await cdp("Runtime.enable"); await cdp("Page.enable");
let fail = 0; const check = (ok, msg) => { console.log((ok ? "OK   " : "FAIL ") + msg); if (!ok) fail++; };
const url = `http://127.0.0.1:${PORT}/duanju.html`;
for (const [tag, w, h, mobile] of [["1440", 1440, 810, false], ["1280", 1280, 720, false], ["390", 390, 844, true]]) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  await cdp("Page.navigate", { url }); await sleep(800);
  await ev("localStorage.clear()");
  await cdp("Page.navigate", { url }); await sleep(1200);
  await shot(`${tag}_1_top`);
  await clickSel('[data-style="yin"]');
  const deck = await ev("JSON.parse(localStorage.getItem('duanju.settings')).deck");
  check(JSON.stringify(deck) === JSON.stringify({ 并: 1, 词数: 1, 次数: 1, 累计: 1, 定时: 1 }) || Object.keys(deck).length === 5, `${tag} 引用流推荐卡组载入 ${JSON.stringify(deck)}`);
  await scrollTo(".su-decksec"); await sleep(300);
  await shot(`${tag}_2_board`);
  if (mobile) { await clickSel(".dk-drawerbtn"); await sleep(400); await shot(`${tag}_3_drawer`); await clickSel(".dk-drawerbtn"); await sleep(300); }
  // 选中一块
  await clickSel(".dk-board .blk", 0); await sleep(200);
  await shot(`${tag}_4_selected`);
  // 改动：删除选中，再点库里的词装入
  await ev("document.querySelector('.dk-detail [data-a=del]')?.click()"); await sleep(100);
  const n0 = await ev("document.querySelectorAll('.dk-board .blk').length");
  if (mobile) await clickSel(".dk-drawerbtn");
  await ev("document.querySelectorAll('.dk .dk-cat.closed').forEach(e=>e.querySelector('button').click())");
  await clickSel('.dk .witem[data-word="减伤"]'); await sleep(200);
  if (mobile) await ev("document.querySelector('.dk-drawerbtn').click()");
  const n1 = await ev("document.querySelectorAll('.dk-board .blk').length");
  check(n1 === n0 + 1, `${tag} 删一块再点库装入一块 ${n0}->${n1}`);
  // 真实拖拽：从库拖「并」到板上
  if (!mobile) {
    const a = await center('.dk .witem[data-word="并"]'), b = await center(".dk-board");
    await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: a[0], y: a[1] }); await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: a[0], y: a[1], button: "left", clickCount: 1 });
    for (let i = 1; i <= 8; i++) await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: a[0] + (b[0] - a[0]) * i / 8, y: a[1] + (b[1] - a[1]) * i / 8, buttons: 1 });
    await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: b[0], y: b[1], button: "left", clickCount: 1 }); await sleep(200);
    const n2 = await ev("document.querySelectorAll('.dk-board .blk').length");
    check(n2 >= n1, `${tag} 拖入板子 ${n1}->${n2}（容量满则不增）`);
  }
  // 关键词：点首挡
  await scrollTo(".dk-kws"); await clickSel('.dk-kws [data-kw="0:首挡"]'); await clickSel('.dk-kws [data-kw="1:不屈"]'); await sleep(150);
  await shot(`${tag}_5_kws`);
  check((await ev("JSON.parse(localStorage.getItem('duanju.settings')).kws.join()")) .startsWith("首挡,不屈"), `${tag} 关键词写入设置`);
  // 对手卡组
  await clickSel('[data-foe="preset"]'); await sleep(150); await scrollTo('[data-foe="random"]'); await shot(`${tag}_6_foe_preset`);
  await clickSel('[data-foe="custom"]'); await sleep(300); await scrollTo('[data-foe="random"]'); await shot(`${tag}_7_foe_custom`);
  // 开局 → 战斗
  await clickSel('[data-foe="preset"]');
  await clickSel(".su-go"); await sleep(2500);
  const st = await ev("__dj.state"), er = await ev("JSON.stringify(__dj.errors)");
  check(st === "battle" && er === "[]", `${tag} 开局进入战斗 state=${st} errors=${er}`);
  await shot(`${tag}_8_battle`);
}
console.log("异常事件:", errs.length, errs.slice(0, 2));
proc.kill(); process.exit(fail || errs.length ? 1 : 0);

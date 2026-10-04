// 截图：node scripts/composer-shots.mjs [端口=5181] [输出目录=D:/wc/composer_shots]
import { spawn } from "node:child_process"; import fs from "node:fs";
const PORT = process.argv[2] ?? "5181", OUT = process.argv[3] ?? "D:/wc/composer_shots", DBG = 9392;
const proc = spawn(process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=D:/wc/ud_composer_shots", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64")); console.log(name); };
const js = (tokens) => `(()=>{const c=__dj.battle.input.composer;${tokens.map((t) => `c.push(${JSON.stringify(t)});`).join("")}})()`;
const scenes = [[1440, 810, false, "1440"], [1280, 720, false, "1280"], [390, 844, true, "390"]];
for (const [w, h, mob, tag] of scenes) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: mob });
  await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?start=1` }); await sleep(2500);
  for (let i = 0; i < 60 && (await ev("__dj.battle?.mainState")) !== "end"; i++) await sleep(300);
  await ev(`document.querySelector('.unit[data-u="1"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await sleep(400);
  await shot(`${tag}_1_empty`);
  await ev(js(["造成", "2"])); await sleep(300); await shot(`${tag}_2_half`);
  await ev(js(["@3"])); await sleep(300); await shot(`${tag}_4_complete`);
  // 灰态原因三场景：行动点不够 / 没有可用的数字牌 / 卡组里没有这个词（悬停；手机上用点按）
  const hover = async (t) => {
    const r = await ev(`(()=>{const e=document.querySelector('.cp-w[data-t="${t}"]');if(!e)return null;const b=e.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]})()`);
    if (!r) { console.log("找不到词", t); return; }
    if (mob) await ev(`document.querySelector('.cp-w[data-t="${t}"]').click()`);
    else { await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: r[0] - 3, y: r[1] }); await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: r[0], y: r[1] }); }
    await sleep(300);
  };
  const clear = `document.querySelector('.cp-bar [data-a=clear]').click()`;
  await ev(clear); await ev("(()=>{const b=__dj.battle;b.m.s.side[0].ap=0;b.input.composer.update()})()"); await sleep(200); await hover("造成"); await shot(`${tag}_5_why_ap`);
  await ev("(()=>{const b=__dj.battle;b.m.s.side[0].ap=5;b.m.s.side[0].cards.forEach((c)=>c.cd=2);b.input.composer.update()})()"); await ev(js(["造成"])); await sleep(200); await hover("3"); await shot(`${tag}_6_why_cards`);
  await ev(clear); await ev("(()=>{const b=__dj.battle;b.m.s.side[0].cards.forEach((c)=>c.cd=0);b.m.s.deck[0]={};b.input.composer.update()})()"); await sleep(200); await hover("灼烧"); await shot(`${tag}_7_why_deck`);
}
proc.kill();

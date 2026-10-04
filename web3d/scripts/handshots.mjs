// 手牌条拼句的真鼠标测试（静态包 + CDP）：node scripts/handshots.mjs <端口> <输出目录>
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = process.argv[2] ?? "5195", OUT = process.argv[3] ?? "hshots", DBG = 9366;
mkdirSync(OUT, { recursive: true });
const T0 = Date.now(); const proc = spawn(process.env.CHROME ?? "/opt/pw-browsers/chromium", ["--no-sandbox", "--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=" + (process.env.TMPDIR ?? "/tmp") + "/ud_hand", "--window-size=1440,810", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.length) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
const shot = async (n) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", n); };
const mouse = (type, x, y, extra = {}) => cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1, ...extra });
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
for (let i = 0; i < 80; i++) { if (await ev("!!window.__gm")) break; await sleep(500); } await sleep(1500);
await ev(`window.__sleep=(ms)=>new Promise(r=>setTimeout(r,ms));window.__btn=(t)=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t)&&!b.disabled);{const m=document.querySelector('.mn');if(m)m.hidden=true;}__gm.open();1`);
await sleep(400); await ev(`document.querySelectorAll('.cls')[0].click();1`); await sleep(200); await ev(`__btn('开始对局').click();1`); await sleep(2500);
for (let i = 0; i < 60 && (await ev("__gm.ui")) !== "pick_unit"; i++) await sleep(500);
console.log("ui", await ev("__gm.ui"));
await ev("__gm.cardClicked(0);1"); await sleep(600);
console.log("ui", await ev("__gm.ui"), "hand", await ev("!!document.querySelector('.hs:not([hidden])')"));
await shot("1_strip");
const rect = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll('${sel}')].find(x=>!${JSON.stringify(txt)}||x.textContent.trim().startsWith(${JSON.stringify(txt)}));if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
const drag = async (txt, shotName) => {
  const c = await rect(".hs-card", txt), p = await rect(".ro.edit", "");
  if (!c || !p) { console.log("找不到", txt, c, p); return; }
  await mouse("mouseMoved", c[0], c[1], { button: "none", buttons: 0 }); await sleep(60); await mouse("mousePressed", c[0], c[1]);
  for (let i = 1; i <= 8; i++) { await mouse("mouseMoved", c[0] + (p[0] - c[0]) * i / 8, c[1] + (p[1] - c[1]) * i / 8); await sleep(40); }
  if (shotName) await shot(shotName);
  await mouse("mouseReleased", p[0], p[1]); await sleep(250);
  console.log(txt, "→", await ev("JSON.stringify(__gm.cmp.tokens.map(t=>t.v))"));
};
await drag("选择", "2_dragging"); await drag("1"); await drag("敌方"); await drag("造成"); await drag("1");
await shot("3_built");
// 把「敌方」（第 3 张）拖出句子条：后面的「造成 2」跟着掉下来
const t = await ev(`(()=>{const e=document.querySelector('.ro.edit .w[data-i="2"]');if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
if (t) { await mouse("mouseMoved", t[0], t[1], { button: "none", buttons: 0 }); await mouse("mousePressed", t[0], t[1]); for (let i = 1; i <= 8; i++) { await mouse("mouseMoved", t[0] + 40 * i, t[1] - 90 * i / 8 - 150 * i / 8); await sleep(40); } await shot("4_pullout"); await mouse("mouseReleased", t[0] + 320, t[1] - 240); await sleep(300); }
console.log("拉下以后", await ev("JSON.stringify(__gm.cmp.tokens.map(t=>t.v))"), "toast", await ev("document.querySelector('.toast,.gm-toast')?.textContent"));
await shot("5_pulled");
proc.kill(); process.exit(0);

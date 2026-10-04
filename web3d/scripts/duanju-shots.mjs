// 《断·句》截图自查（无头 Chrome + CDP）：node scripts/duanju-shots.mjs <端口> <输出目录>
// 每个视口：开局页、战场(我的回合)、句子菜单、电脑逐词宣告中、结算中、终局页
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = process.argv[2] ?? "5199", OUT = process.argv[3] ?? "D:/wc/game_shots", DBG = 9377;
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=D:/wc/ud_duanju", "--window-size=1440,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
await cdp("Runtime.enable");
const shot = async (n) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", n); };
const until = async (cond, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(100); } return false; };
const click = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`);
const VIEWS = [["1440x810", 1440, 810, false], ["1280x720", 1280, 720, false], ["390x844", 390, 844, true]];
for (const [name, w, h, mobile] of VIEWS.filter((v) => !process.env.VIEW || v[0] === process.env.VIEW)) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html` }); await sleep(1200);
  await ev("localStorage.clear()"); await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html` }); await sleep(1000);
  await until("!!document.querySelector('.su-go')");
  await shot(`${name}_1_setup`);
  await ev("document.querySelector('.su-style[data-style=yin]').click()"); await sleep(150);
  await ev("window.scrollTo(0, 0); document.querySelector('.dj-root').scrollTop = 99999"); await sleep(200); await shot(`${name}_1b_setup_bottom`);
  await click(".su-go");
  await until("document.querySelector('[data-a=main]')?.textContent.includes('结束宣告')", 40000);
  await sleep(900);
  await shot(`${name}_2_battle`);
  // 点第一个能出手的随从
  await ev("document.querySelector('.unit.me.ready')?.click()"); await sleep(500);
  await ev("document.querySelector('.mn-row')?.click()"); await sleep(200);
  await shot(`${name}_3_menu`);
  // 宣告：随便选一句并确认
  await ev("document.querySelector('.mn-go')?.click()"); await sleep(300);
  // 其余全不出手 → 电脑出手；抓逐词打字
  await until("(()=>{const b=document.querySelector('[data-a=main]');return b&&!b.disabled&&b.textContent.includes('结束宣告')})()", 60000);
  await ev("document.querySelector('[data-a=main]').click()");
  let shotTyping = false;
  for (let i = 0; i < 200; i++) { if (await ev("!!document.querySelector('.caret')")) { await shot(`${name}_4_typing`); shotTyping = true; break; } if (await ev("document.querySelector('[data-a=main]')?.textContent.includes('结算')")) break; await sleep(25); }
  if (!shotTyping) console.log("没抓到逐词");
  await until("document.querySelector('[data-a=main]')?.textContent.includes('结算')", 60000); await sleep(400);
  await shot(`${name}_4b_declared`);
  await ev("document.querySelector('[data-a=main]').click()");
  for (let i = 0; i < 80; i++) { if (await ev("!!document.querySelector('.fl')")) { await sleep(120); await shot(`${name}_5_cast`); break; } await sleep(50); }
  // 剩下的交给电脑代打并快进，到终局页
  await until("document.querySelector('[data-a=main]')?.textContent.includes('下一轮')||!!document.querySelector('.dj-end')", 60000);
  await ev("(()=>{const b=__dj.battle; if(b){b.auto=true;b.speedIdx=3;}})()");
  await click("[data-a=main]");
  await until("!!document.querySelector('.dj-end')", 120000); await sleep(300);
  await shot(`${name}_6_end`);
}
console.log("页面异常:", errs.length, errs.slice(0, 3));
proc.kill(); process.exit(0);

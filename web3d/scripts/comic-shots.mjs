// 漫画逐页截图（无头 Chrome + CDP）：node scripts/comic-shots.mjs <端口> <输出目录> <前缀> "<query>" [宽x高=1440x810]
// 例：node scripts/comic-shots.mjs 5920 D:/wc/art/comic_shots L0 "beat=0&unlock=all&comic=L0-pre"
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const [PORT, OUT, PFX, QUERY, SIZE = "1440x810"] = process.argv.slice(2);
const [W, H] = SIZE.split("x").map(Number), DBG = 9400 + Math.floor(Math.random() * 300);
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=D:/wc/tmp/ud_comic${DBG}`, `--window-size=${W},${H}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errs = [], bad = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); else if (m.method === "Network.responseReceived" && m.params.response.status >= 400) bad.push(m.params.response.status + " " + m.params.response.url); });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
await cdp("Runtime.enable"); await cdp("Network.enable"); await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju-story.html?${QUERY}` });
const shot = async (n) => { const r = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 80 }); writeFileSync(`${OUT}/${PFX}_${n}.jpg`, Buffer.from(r.result.data, "base64")); };
const until = async (c, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(c)) return true; await sleep(150); } return false; };
if (QUERY.includes("beat=") && !QUERY.includes("comic=")) await ev("document.querySelector('.st-title')?.click()").catch(() => {});
if (!(await until("!!document.querySelector('.wc-root .wc-stat')"))) { console.log("no comic root"); await shot("noroot"); proc.kill(); process.exit(1); }
let n = 0;
for (let guard = 0; guard < 400; guard++) {
  const st = await ev("(()=>{const h=document.querySelector('.wc-hint'),s=document.querySelector('.wc-stat');return h?h.textContent+'|'+s.textContent:null})()");
  if (st === null) {
    const door = process.env.DOOR; // 终章：揭示播完出现三道门，点 A/B 继续播结局
    if (door && await until("!!document.querySelector('.st-door [data-k]')", 4000)) { await shot("door"); await ev(`document.querySelector('.st-door [data-k=${door}]').click()`); await until("!!document.querySelector('.wc-root .wc-stat')", 8000); continue; }
    break;
  }
  if (/翻页|结束/.test(st.split("|")[0])) { await sleep(1300); await shot(String(++n).padStart(2, "0")); console.log("page", st.split("|")[1]); }
  await ev("document.querySelector('.wc-view').click()");
  await sleep(/翻页|结束/.test(st.split("|")[0]) ? 1100 : 650);
}
console.log("shots", n, "http>=400:", JSON.stringify([...new Set(bad)]), "errs", JSON.stringify(errs.slice(0, 3)), await ev("JSON.stringify(window.__dj?.errors)").catch(() => ""));
proc.kill(); process.exit(0);

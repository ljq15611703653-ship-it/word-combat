// 开场动画逐镜头截图（不装依赖，用 Chrome DevTools 协议）。用法：
//   npm run dev -- --port 5201   （另一个终端）
//   node scripts/intro-shots.mjs [输出目录] [端口]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = process.argv[2] ?? "shots", PORT = process.argv[3] ?? "5201";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DBG = 9334;
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), "intro-shots-ud")}`, "--window-size=1440,810", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.length) break; } catch { /* 等待 */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/intro.html?t=0&pause=1` });
for (let i = 0; i < 60; i++) { if (await ev("!!window.__intro")) break; await sleep(500); }
await sleep(800);
const TIMES = [1, 2.5, 4, 7, 9.5, 11, 13, 15.5, 18.5, 20, 22, 24.5, 28, 31, 32.5, 33.5, 35, 37.5, 39, 41, 43, 45.5, 47, 48.5, 50, 52, 53.5, 55, 57, 59];
for (const t of TIMES) {
  await ev(`window.__intro.seek(${t})`); await sleep(500);
  const r = await cdp("Page.captureScreenshot", { format: "png" });
  const name = `t${String(t).padStart(4, "0").replace(".", "_")}.png`;
  writeFileSync(join(OUT, name), Buffer.from(r.result.data, "base64")); console.log("shot", name);
}
ws.close(); proc.kill();
process.exit(0);

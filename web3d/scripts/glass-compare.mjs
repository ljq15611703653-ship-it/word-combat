// 把 shots 里 NAME-classic.png / NAME-glass.png 拼成并排图（左旧右新）到 shots/compare/。
import { spawn } from "node:child_process";
import { readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const DIR = resolve(process.argv[2] ?? "shots"), OUT = join(DIR, "compare"); mkdirSync(OUT, { recursive: true });
const DIRF = DIR.split("\\").join("/");
const names = readdirSync(DIR).filter((f) => f.endsWith("-glass.png")).map((f) => f.slice(0, -10));
const ud = join(tmpdir(), "glass-cmp-ud");
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=9355", `--user-data-dir=${ud}`, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch("http://127.0.0.1:9355/json")).json(); if (tabs.length) break; } catch {} await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await cdp("Emulation.setDeviceMetricsOverride", { width: 2890, height: 830, deviceScaleFactor: 1, mobile: false });
for (const n of names) {
  const html = join(OUT, "_c.html");
  writeFileSync(html, `<body style="margin:0;background:#888;display:flex;gap:10px"><div><img src="file:///${DIRF}/${n}-classic.png"><div style="font:14px sans-serif">classic</div></div><div><img src="file:///${DIRF}/${n}-glass.png"><div style="font:14px sans-serif">glass</div></div></body>`);
  await cdp("Page.navigate", { url: "file:///" + html.split("\\").join("/") }); await sleep(500);
  const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(join(OUT, `${n}.png`), Buffer.from(r.result.data, "base64")); console.log(n);
}
rmSync(join(OUT, "_c.html")); ws.close(); proc.kill(); try { rmSync(ud, { recursive: true, force: true }); } catch {}

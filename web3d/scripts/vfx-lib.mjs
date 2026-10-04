// CDP 小工具（vfx 脚本共用）
import { spawn } from "node:child_process";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch(dbg, w = 1280, h = 720, ud = "D:/wc/ud_vfx") {
  const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${dbg}`, `--user-data-dir=${ud}${dbg}`, `--window-size=${w},${h}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
  const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pend = new Map(); const errs = [];
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push("console.error " + JSON.stringify(m.params.args.map((a) => a.value ?? a.description)).slice(0, 300)); });
  const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
  await cdp("Runtime.enable"); await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  return { proc, cdp, ev, errs, shot: async (path) => { const r = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 70 }); (await import("node:fs")).writeFileSync(path, Buffer.from(r.result.data, "base64")); } };
}

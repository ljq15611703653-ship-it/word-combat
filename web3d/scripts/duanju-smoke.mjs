// 《断·句》冒烟：无头 Chrome 打开 duanju.html?auto=N，真点开局按钮，电脑代打 N 局，要求不崩、全部打完。
// 用法：node scripts/duanju-smoke.mjs [端口=5199] [局数=10]    （先起 dev：node node_modules/vite/bin/vite.js --port 5199）
// 纯引擎 headless：node node_modules/tsx/dist/cli.mjs scripts/duanju-engine-test.ts 200
import { spawn } from "node:child_process";
const PORT = process.argv[2] ?? "5199", N = +(process.argv[3] ?? 10), DBG = 9378;
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=D:/wc/ud_duanju_smoke", "--window-size=1280,720", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
await cdp("Runtime.enable");
let fail = 0;
for (const [i, cfg] of [["default", 0], ["legacy", 1], ["real", 2]].entries()) {
  const [rules] = cfg; const games = i === 0 ? N : 3;
  await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?auto=${games}` }); await sleep(1200);
  await ev(`localStorage.setItem('duanju.settings', JSON.stringify({styleId:'${["bing", "yin", "xian", "zhuang"][i % 4]}',tier:'${["普通", "入门", "进阶", "大师"][i]}',rules:'${rules}'}))`);
  await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?auto=${games}` }); await sleep(1200);
  await ev("document.querySelector('.su-go').click()");
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 300000) { n = await ev("__dj.games.length"); if (n >= games || (await ev("__dj.errors.length")) > 0) break; await sleep(500); }
  const e = await ev("JSON.stringify(__dj.errors)");
  console.log(`规则 ${rules}: 打完 ${n}/${games} 局，结果 ${await ev("JSON.stringify(__dj.games)")}，页面错误 ${e}`);
  if (n < games || e !== "[]") fail++;
}
console.log("异常事件:", errs.length, errs.slice(0, 2));
proc.kill();
process.exit(fail || errs.length ? 1 : 0);

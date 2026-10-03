// 玻璃界面 vs ?style=classic 截图对比。用法：先 vite --port 5199，然后
//   node scripts/glass-shots.mjs <输出目录> [端口] [only]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const OUT = process.argv[2] ?? "shots", PORT = process.argv[3] ?? "5199", ONLY = process.argv[4] ?? "";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DBG = 9344; mkdirSync(OUT, { recursive: true });
const ud = join(tmpdir(), "glass-shots-ud");
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${ud}`, "--window-size=1440,810", "--hide-scrollbars", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.length) break; } catch {} await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
let SUF = "";
const shot = async (name) => { await sleep(1100); const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(join(OUT, `${name}-${SUF}.png`), Buffer.from(r.result.data, "base64")); console.log("shot", name, SUF); };
const click = (sel, text) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => !${JSON.stringify(text ?? "")} || x.textContent.includes(${JSON.stringify(text ?? "")})); if (!e) return false; e.click(); return true; })()`);
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
const go = async (path, ready) => { await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/${path}${SUF === "classic" ? (path.includes("?") ? "&" : "?") + "style=classic" : ""}` }); for (let i = 0; i < 60; i++) { if (await ev(ready)) break; await sleep(400); } await sleep(1500); };
const tools = `window.__t = {
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  say() { const b = document.querySelector('.cg-backdrop:not([hidden]) .cg-say button:last-child'); if (b) { b.click(); return true; } return false; },
  hl() { const h = document.querySelector('.gm .hl'); if (h) { h.click(); return 'btn'; } const g = window.__cg.ctx.game; if (g.hlCards.length) { window.__cg.cardClicked(g.hlCards[0]); return 'card'; } return ''; },
  async skipDialogs() { for (let i = 0; i < 12; i++) { await this.sleep(250); if (!this.say()) { if (document.querySelector('.cg-backdrop').hidden) break; } } },
  async clicks(n, until) { for (let i = 0; i < n; i++) { await this.sleep(300); if (this.say()) { i--; continue; } if (until && window.__cg.ctx.game.ui === until) return; this.hl(); } await this.sleep(400); },
}; 1`;
const cstart = async (lv) => { await ev(`document.querySelector('.cg-res').hidden = true; window.__cg.start(${lv}); window.__cg.ctx.game.fast = true; 1`); await sleep(1500); };

for (const style of (process.env.STYLES ?? "glass,classic").split(",")) {
  SUF = style;
  if (!ONLY || ONLY === "main") {
    await go("", "!!document.querySelector('.mn-btn')");
    await shot("01-main-menu");
    await click(".mn-btn", "打真人"); await shot("02-deck-custom");
    await click(".mn-tabs button", "预设"); await shot("02b-deck-preset");
    await go("", "!!document.querySelector('.mn-btn')");
    await click(".mn-btn", "打电脑"); await shot("03-setup");
    await click(".gm-modal button.primary", "开始对局"); await sleep(2500); await shot("04-battle");
    await click(".gm-act button.primary", "拼一句"); await sleep(600); await shot("05-compose");
  }
  if (!ONLY || ONLY === "cg") {
    await go("campaign.html", "!!window.__cg");
    await ev(tools);
    await shot("10-tutorial-select");
    await cstart(1); await shot("11-lv1-dialog");
    await ev(`__t.skipDialogs()`); await shot("12-lv1-spot");
    await ev(`__t.clicks(1)`); await shot("13-lv1-compose-bubble");
    await ev(`__t.clicks(11, 'target')`); await shot("14-lv1-target");
    await ev(`__t.clicks(2, 'timing')`); await shot("15-lv1-timing");
    await ev(`document.querySelector('.cg-tr button')?.click(); 1`); await shot("16-tutorial-minimenu");
    await ev(`const p=document.querySelector('.cg-tr .pp'); if(p) p.hidden=true; document.querySelector('.cg-bubble').hidden=true; document.querySelector('.cg-spot').hidden=true; const g=__cg.ctx.game; g.hooks=null; g.showOver(); 1`); await shot("17-settle-panel");
    await ev(`document.querySelector('.gm-overlay').hidden=true; __cg.showResult(__cg.ctx.game.M); 1`); await shot("18-tutorial-result");
    await cstart(3); await ev(`__t.skipDialogs()`); await sleep(600); await ev(`__t.clicks(4)`); await shot("19-lv3-bubble");
  }
}
ws.close(); proc.kill(); try { rmSync(ud, { recursive: true, force: true }); } catch {}
process.exit(0);

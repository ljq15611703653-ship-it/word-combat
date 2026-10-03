// 教程截图 + 第 14 关自动通关验证（不进入页面代码）。用法：
//   npm run dev -- --port 5201   （另一个终端）
//   node scripts/shots.mjs [输出目录] [端口]
// 用 Chrome 的 DevTools 协议（Node 自带 WebSocket，不装依赖）：1440x810，真实点击发光的按钮，截图。
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = process.argv[2] ?? "shots";
const PORT = process.argv[3] ?? "5201";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DBG = 9333;
mkdirSync(OUT, { recursive: true });
const ud = join(tmpdir(), "cg-shots-ud");
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${ud}`, "--window-size=1440,810", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.length) break; } catch { /* 还没起来 */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
const shot = async (name) => { await sleep(900); const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(join(OUT, name + ".png"), Buffer.from(r.result.data, "base64")); console.log("shot", name); };

await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/campaign.html` });
for (let i = 0; i < 60; i++) { if (await ev("!!window.__cg")) break; await sleep(500); }
await sleep(1500);

// 页面里的小工具：点掉对话、点一下发光的东西
await ev(`window.__t = {
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  say() { const b = document.querySelector('.cg-backdrop:not([hidden]) .cg-say button:last-child'); if (b) { b.click(); return true; } return false; },
  hl() { const h = document.querySelector('.gm .hl'); if (h) { h.click(); return 'btn'; } const g = window.__cg.ctx.game; if (g.hlCards.length) { window.__cg.cardClicked(g.hlCards[0]); return 'card'; } return ''; },
  async skipDialogs() { for (let i = 0; i < 12; i++) { await this.sleep(250); if (!this.say()) { if (document.querySelector('.cg-backdrop').hidden) break; } } },
  async clicks(n, until) { for (let i = 0; i < n; i++) { await this.sleep(300); if (this.say()) { i--; continue; } if (until && window.__cg.ctx.game.ui === until) return; this.hl(); } await this.sleep(400); },
  ui: () => window.__cg.ctx.game.ui,
}; 1`);
const start = async (lv) => { await ev(`document.querySelector('.cg-res').hidden = true; window.__cg.start(${lv}); window.__cg.ctx.game.fast = true; 1`); await sleep(1500); };

// 第 1 关（聚光灯）
await start(1);
await ev(`__t.skipDialogs()`);
await shot("10-lv1-spot-pick-unit");               // 聚光灯：只有小剑亮着
await ev(`__t.clicks(1)`);                          // 点小剑，进拼句
await shot("11-lv1-spot-compose-first-word");      // 拼句界面：【选择】发光 + 气泡 + 压暗
await ev(`__t.clicks(5)`);
await shot("12-lv1-spot-compose-mid");
await ev(`__t.clicks(6, 'target')`);
await ev(`__t.clicks(2, 'timing')`);
await shot("13-lv1-spot-timing");                   // 起手秒数界面

// 第 3 关（去掉压暗，只留发光 + 气泡）
await start(3);
await ev(`__t.skipDialogs()`);
await sleep(600);
await ev(`__t.clicks(4)`);
await shot("14-lv3-bubble");

// 第 5 关（状态）
await start(5);
await ev(`__t.skipDialogs()`);
await sleep(600);
await ev(`__t.clicks(8)`);
await shot("15-lv5-status-compose");

// 第 14 关：自由拼句，用引擎 AI 代打，要求打到结果页并且获胜
await start(14);
await ev(`__t.skipDialogs()`);
const r14 = await ev(`(async () => {
  const T = __t, g = __cg.ctx.game;
  const { choose, assignLate } = await import('/src/engine/ai.ts');
  const { actTokens } = await import('/src/engine/composer.ts');
  let cur = null, steps = 0, shotAt = -1;
  while (steps++ < 4000) {
    await T.sleep(25);
    if (!document.querySelector('.cg-res').hidden) break;
    if (T.say()) continue;
    const ui = g.ui, M = g.M;
    if (ui === 'pick_unit') {
      const p = choose(M, 0);
      if (!p.act) g.pass(p.uid);
      else { g.openComposer(p.uid); const t = actTokens(p.act.cl); g.cmp.tokens = structuredClone(t); g.cmp.sugg = { act: p.act, tokens: structuredClone(t) }; cur = window.__cur = p.act; g.renderAct(); window.__free = (window.__free ?? 0) + 1; await T.sleep(300); }
    } else if (ui === 'compose') { if (window.__free === 3 && !window.__shot) { window.__shot = 1; return { snap: true }; } const b = document.querySelector('.gm-act .cmp-foot .primary'); if (b && !b.disabled) b.click(); else g.cmp = null, g.setUi('pick_unit'), g.renderAct(); }
    else if (ui === 'target') { const w = document.querySelector('.gm-act .opts .w, .gm-act .sug'); if (w) w.click(); else break; }
    else if (ui === 'timing') g.declare(cur ? cur.start : 1);
    else if (ui === 'assign') { assignLate(M, 0); g.finishAssign(); }
    else if (ui === 'round_end') { const b = [...document.querySelectorAll('.gm-act button')].find((x) => x.textContent.includes('下一轮') || x.textContent.includes('看结果')); if (b) b.click(); }
  }
  return { done: true, steps };
})()`);
if (r14?.snap) {
  await shot("16-lv14-free-compose");
  await ev(`window.__shot = 2; document.querySelector('.gm-act .cmp-foot .primary').click(); 1`);
}
// 继续打到结算（上面的循环在 snap 处提前返回，再跑一遍）
const r14b = await ev(`(async () => {
  const T = __t, g = __cg.ctx.game;
  const { choose, assignLate } = await import('/src/engine/ai.ts');
  const { actTokens } = await import('/src/engine/composer.ts');
  let cur = window.__cur, steps = 0;
  while (steps++ < 6000) {
    await T.sleep(25);
    if (!document.querySelector('.cg-res').hidden) break;
    if (T.say()) continue;
    const ui = g.ui, M = g.M;
    if (ui === 'pick_unit') {
      const p = choose(M, 0);
      if (!p.act) g.pass(p.uid);
      else { g.openComposer(p.uid); const t = actTokens(p.act.cl); g.cmp.tokens = structuredClone(t); g.cmp.sugg = { act: p.act, tokens: structuredClone(t) }; cur = window.__cur = p.act; g.renderAct(); await T.sleep(60); }
    } else if (ui === 'compose') { const b = document.querySelector('.gm-act .cmp-foot .primary'); if (b && !b.disabled) b.click(); else { g.cmp = null; g.setUi('pick_unit'); g.renderAct(); } }
    else if (ui === 'target') { const w = document.querySelector('.gm-act .opts .w, .gm-act .sug'); if (w) w.click(); }
    else if (ui === 'timing') g.declare(cur ? cur.start : 1);
    else if (ui === 'assign') { assignLate(M, 0); g.finishAssign(); }
    else if (ui === 'round_end') { const b = [...document.querySelectorAll('.gm-act button')].find((x) => x.textContent.includes('下一轮') || x.textContent.includes('看结果')); if (b) b.click(); }
  }
  return { steps, res: document.querySelector('.cg-res h1')?.textContent, round: g.M.rnd, winner: g.M.winner, text: document.querySelector('.cg-res')?.innerText.slice(0, 80) };
})()`);
console.log("第 14 关:", JSON.stringify(r14b));
await shot("17-lv14-result");
ws.close(); proc.kill(); try { rmSync(ud, { recursive: true, force: true }); } catch { /* ignore */ }
process.exit(r14b?.winner === 0 ? 0 : 1);

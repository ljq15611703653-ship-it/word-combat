// 逐词拼句冒烟：无头 Chrome 真点界面（点随从→点手牌条里的词→确认宣告），回放引擎生成的句子，
// 验证「逐词输入」与「一次性宣告」的结果一致。用法：node scripts/composer-smoke.mjs [端口=5181] [局数=10]
import { spawn } from "node:child_process";
const PORT = process.argv[2] ?? "5181", N = +(process.argv[3] ?? 10), DBG = 9391;
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=D:/wc/ud_composer_smoke", "--window-size=1280,720", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
await cdp("Runtime.enable");
const DRIVER = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = __dj.battle, m = b.m, cp = __cp; let stats = { sent: 0, same: 0, diff: [], passes: 0, rejected: 0 };
  const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  for (let g = 0; g < 4000 && __dj.state === 'battle'; g++) {
    const st = b.mainState;
    if (st === 'end') {
      const us = m.myUnits().filter((u) => m.canAct(u));
      if (!us.length) { click(document.querySelector('[data-a=main]')); await sleep(5); continue; }
      const u = us[Math.floor(Math.random() * us.length)];
      const cands = m.legalSentences(u, 40).filter((c) => c.minStart <= m.tl());
      click(document.querySelector('.unit[data-u="' + u + '"]')); await sleep(5);
      if (!document.querySelector('.cp-bar')) { stats.rejected++; continue; }
      if (!cands.length || Math.random() < 0.12) { click(document.querySelector('.cp-bar [data-a=pass]')); stats.passes++; await sleep(5); continue; }
      const c = cands[Math.floor(Math.random() * cands.length)];
      const toks = cp.astToTokens(c.cl); let bad = false;
      for (const t of toks) { const btn = document.querySelector('.cp-w[data-t="' + t + '"]'); if (!btn || btn.classList.contains('off')) { bad = true; stats.diff.push('按钮缺失/灰: ' + t + ' in ' + toks.join(' ')); break; } click(btn); }
      if (bad) { click(document.querySelector('.cp-bar [data-a=close]')); continue; }
      const go = document.querySelector('.cp-bar [data-a=go]');
      if (go.disabled) { stats.diff.push('确认键灰: ' + toks.join(' ') + ' ' + go.title); click(document.querySelector('.cp-bar [data-a=close]')); continue; }
      const want = cp.normAst(cp.resolveTgs(m.s, 0, c.cl));
      click(go); await sleep(5); stats.sent++;
      const d = m.s.decl.filter((x) => x.unit === u && x.side === 0).pop();
      if (d && cp.normAst(d.cl) === want) stats.same++; else stats.diff.push('结果不同: ' + toks.join(' '));
    } else if (st === 'resolve' || st === 'next') { click(document.querySelector('[data-a=main]')); await sleep(5); }
    else await sleep(20);
  }
  return JSON.stringify(stats);
})()`;
let fail = 0;
for (let i = 0; i < N; i++) {
  await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?start=1&fast=1` }); await sleep(1500);
  const t0 = Date.now();
  const r = JSON.parse(await ev(DRIVER));
  const e = await ev("JSON.stringify(__dj.errors)");
  console.log(`第 ${i + 1} 局：逐词宣告 ${r.sent} 句，与一次性宣告一致 ${r.same}，不出手 ${r.passes}，结果 ${await ev("JSON.stringify(__dj.games)")}，页面错误 ${e}，${((Date.now() - t0) / 1000).toFixed(0)}s`);
  r.diff.slice(0, 3).forEach((d) => console.log("   !", d));
  if (r.same !== r.sent || e !== "[]" || r.diff.length) fail++;
}
console.log("页面异常事件:", errs.length, errs.slice(0, 2));
proc.kill(); process.exit(fail || errs.length ? 1 : 0);

// 故事模式端到端 + 截图（无头 Chrome + CDP）：node scripts/story-shots.mjs <端口> <输出目录> [beats=1]
// 用真实点击按引导高亮走完关卡：标题卡 → 漫画 → 对话 → 教学战斗 → 对话 → 漫画 → 选关页。
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = process.argv[2] ?? "5184", OUT = process.argv[3] ?? "D:/wc/story_shots", BEATS = (process.argv[4] ?? "1").split(",").map(Number), DBG = 9388;
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, "--user-data-dir=D:/wc/ud_story", "--window-size=1440,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.some((t) => t.type === "page")) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") errs.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300)); });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const r = await cdp("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
await cdp("Runtime.enable");
const only = process.env.VIEW;
const shot = async (n) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", n); };
const until = async (cond, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(100); } return false; };
const clickEl = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`);
const key = (k) => ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true}))`);

// 一步：按引导做下一件事。返回描述字符串
const STEP = `(()=>{
  const $=s=>document.querySelector(s);
  if($('.st-retry')) return 'RETRY';
  if($('.sd-root')){ $('.sd-root').click(); return 'dialog'; }
  if($('.wc-root')){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return 'comic-skip'; }
  if($('.st-title')){ $('.st-title').click(); return 'title'; }
  if($('.st-select')) return 'SELECT';
  const b=window.__tb, ses=window.__ses; if(!b||!ses) return 'wait';
  const main=$('[data-a=main]'); const t=main?main.textContent:'';
  const menu=$('.dj-menu');
  if(menu){
    const u=+($('.unit.me.open')?.dataset.u??-1); const st=ses.stepFor(b.m,u);
    const sel=menu.querySelector('.mn-sel .mn-chosen');
    if(!sel){ const r=menu.querySelector('.mn-row.guide')||menu.querySelector('.mn-row'); if(!r) return 'NOROW'; r.click(); return 'pick'; }
    const sl=menu.querySelector('.mn-slider'); let v=+sl.value; const lo=+sl.min;
    if(st){ if(st.startMin!==undefined) v=Math.max(v,st.startMin); if(st.startMax!==undefined) v=Math.min(v,st.startMax); }
    v=Math.max(v,lo); if(+sl.value!==v){ sl.value=v; sl.dispatchEvent(new Event('input',{bubbles:true})); }
    menu.querySelector('.mn-go').click(); return 'declare';
  }
  if(t.includes('结束宣告')){
    const p=ses.pending(b.m);
    if(p.length){ const e=$('.unit[data-u="'+p[0].unit+'"]'); e.click(); return 'unit'+p[0].unit; }
    if(!ses.scripted){ const us=b.m.myUnits().filter(u=>b.m.canAct(u)); if(us.length){ const e=$('.unit[data-u="'+us[0]+'"]'); e.click(); if(!$('.dj-menu')) return 'unit?'; return 'unit'; } }
    main.click(); return 'end';
  }
  if(main&&!main.disabled&&(t.includes('结算')||t.includes('下一轮'))){ main.click(); return 'main'; }
  return 'wait';
})()`;

const VIEWS = [["1440x810", 1440, 810, false], ["390x844", 390, 844, true]].filter((v) => !only || v[0] === only);
for (const [name, w, h, mobile] of VIEWS) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  const url = (qs) => `http://127.0.0.1:${PORT}/duanju-story.html?${qs || process.env.QS || ""}`;
  await cdp("Page.navigate", { url: url("") }); await sleep(800);
  await ev("localStorage.clear()");
  await cdp("Page.navigate", { url: url("") }); await sleep(1200);
  if (process.env.QS) { await until("!!document.querySelector('.st-select')"); } else {
  await until("!!document.querySelector('.wc-root')");
  for (let i = 0; i < 4; i++) { await ev("document.querySelector('.wc-view')?.click()"); await sleep(900); }
  await sleep(700); await shot(`${name}_1_comic`);
  await until("(()=>{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return !!document.querySelector('.st-select'); })()");
  await sleep(500); await shot(`${name}_2_select`); }
  for (const n of BEATS) {
    await clickEl(`.st-card[data-n="${n}"]`);
    await until("!!document.querySelector('.st-title')"); await sleep(500); if (n === BEATS[0]) await shot(`${name}_3_title`);
    await until("!!document.querySelector('.wc-root')", 8000);
    if (n === BEATS[0]) { for (let i = 0; i < 3; i++) { await ev("document.querySelector('.wc-view')?.click()"); await sleep(1000); } await shot(`${name}_3b_comic_beat`); }
    let steps = 0, last = "", shotDlg = false, shotGuide = false, shotMenu = false, shotAfter = false, shotRes = false, sawBattle = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      const r = await ev(STEP); if (process.env.TRACE) console.log("  step", r);
      if (r === "SELECT") break;
      if (r === "RETRY") { console.log("!! 失败重来出现 beat", n); await shot(`${name}_FAIL_${n}`); break; }
      if (r === "NOROW") { console.log("!! 菜单无句子"); await shot(`${name}_NOROW_${n}`); break; }
      if (r === "dialog" && n === BEATS[0] && !shotDlg) { await sleep(900); await shot(`${name}_4_dialog${sawBattle ? "_after" : ""}`); shotDlg = !sawBattle ? true : shotDlg; if (sawBattle) shotAfter = true; }
      if (r.startsWith("unit") && n === BEATS[0] && !shotGuide) { sawBattle = true; await sleep(600); await shot(`${name}_5_battle_guide`); shotGuide = true; }
      if (r === "pick" && n === BEATS[0] && !shotMenu) { await sleep(300); await shot(`${name}_6_menu`); shotMenu = true; }
      if (r === "main" && n === BEATS[0] && !shotRes) { const tx = await ev("document.querySelector('[data-a=main]').textContent"); void tx; }
      if (r === "dialog") { if (n === BEATS[0] && sawBattle && !shotAfter) { await sleep(500); await shot(`${name}_7_dialog_after`); shotAfter = true; } }
      last = r; steps++;
      await sleep(r === "wait" ? 250 : r === "dialog" ? 60 : 160);
    }
    console.log(name, "beat", n, "steps", steps, "last", last, "errors", await ev("__dj.errors.length"));
    if (n === BEATS[0]) { await sleep(400); await shot(`${name}_8_select_after`); }
  }
}
console.log("页面异常:", errs.length, errs.slice(0, 3), await ev("JSON.stringify(__dj.errors.slice(0,3))"));
proc.kill(); process.exit(0);

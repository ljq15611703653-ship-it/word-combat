// 技能演出截帧：headless Chrome + CDP（不装依赖）。window.__cast.pauseAt 让演出在各关键时刻冻结，逐个截图。
// 用法：npm run dev -- --port 5191；node scripts/castshots.mjs <输出目录> <端口> [职业下标 0-3 …]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = process.argv[2] ?? "shots";
const PORT = process.argv[3] ?? "5191";
const CLS = process.argv.slice(4).length ? process.argv.slice(4).map(Number) : [0, 1, 2, 3];
const NAMES = ["bing", "xu", "ze", "xue"];
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DBG = 9344;
mkdirSync(OUT, { recursive: true });
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${join(tmpdir(), "cast-shots-ud")}`, "--window-size=1440,810", "--hide-scrollbars", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); if (tabs.length) break; } catch { /* */ } await sleep(300); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500)); return r.result?.result?.value; };
const shot = async (name) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(join(OUT, name + ".png"), Buffer.from(r.result.data, "base64")); console.log("shot", name); };

await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
for (let i = 0; i < 80; i++) { if (await ev("!!window.__gm")) break; await sleep(500); }
await sleep(1500);

await ev(`window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
window.__btn = (txt) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(txt) && !b.disabled);
window.__start = async (ci) => { document.querySelector('.mn').hidden = true; __gm.open(); await __sleep(200); document.querySelectorAll('.cls')[ci].click(); await __sleep(100); __btn('开始对局').click(); await __sleep(1200); };
window.__declare = async (prefs) => {
  const gm = __gm; let i = 0;
  while (gm.ui === 'pick_unit' || gm.ui === 'foe') {
    if (gm.ui === 'foe') { await __sleep(300); continue; }
    if (!gm.M.remaining[0].length) break;
    if (gm.M.res[0].ap <= 0) { __btn('它这轮不出手').click(); await __sleep(200); i++; continue; }
    __btn('给【').click(); await __sleep(120); __btn('辅助轮').click(); await __sleep(120);
    const all = [...document.querySelectorAll('.sugg .sug')];
    if (!all.length) { __btn('取消').click(); await __sleep(150); __btn('它这轮不出手').click(); await __sleep(200); i++; continue; }
    const rx = prefs[i] ? new RegExp(prefs[i]) : null;
    (all.find((b) => rx && rx.test(b.textContent)) || all[0]).click(); await __sleep(120);
    __btn('拼好了').click(); await __sleep(120);
    let g = 0;
    while (gm.ui === 'target' && g++ < 6) { const c = gm.pending[gm.pendI]; const pool = gm.M.R.U.filter((u) => u.down === -1 && ((u.side === 1) === ((c.side ?? 'enemy') === 'enemy'))).map((u) => u.uid); gm.cardClicked(pool.find((x) => !c.tg.includes(x))); await __sleep(80); }
    if (gm.ui === 'timing') { (document.querySelector('.opts .w.primary') || document.querySelector('.opts .w')).click(); await __sleep(300); }
    i++;
  }
};
window.__fps = { n: 0, on: false };
(function f() { if (window.__fps.on) window.__fps.n++; requestAnimationFrame(f); })();
1`);

const ALL = ["zoom", "fly", "assemble", "aim", "lock", "flight", "hit", "return", "pullback"];
for (const ci of CLS) {
  const tag = NAMES[ci];
  await ev(`window.__cast = { snap: true, pauseAt: ["zoom"] }; 1`);
  await ev(`__start(${ci})`);
  // 第 1 轮：随从 1 偏好灼烧，随从 2 偏好治疗
  await ev(`__declare(['灼烧', '恢复|治疗'])`);
  let captured = 0, remaining = [...ALL], lastKey = "", t0 = Date.now(), rounds = 0;
  for (let k = 0; k < 4000; k++) {
    await sleep(60);
    const st = await ev(`JSON.stringify({ p: __cast.paused || '', cur: __cast.cur || null, ui: __gm.ui })`);
    const s = JSON.parse(st);
    if (!s.p) { if (s.ui === 'round_end' || s.ui === 'over') break; if (Date.now() - t0 > 180000) break; continue; }
    const mine = s.cur && s.cur.uid < 3;
    if (s.p === "zoom" && !(mine && captured < 1)) { await ev(`__cast.pauseAt = ['zoom']; 1`); const key = JSON.stringify(s.cur) + k; void key; await sleep(30); await ev(`__cast.pauseAt = ['zoom']; 1`); continue; }
    if (s.p === "zoom") { remaining = [...ALL]; console.log(await ev(`(()=>{const c=document.querySelector(".cs-canvas");const a=document.getElementById("app");return [a.clientWidth,innerWidth,c.width,c.height,c.style.width,c.getBoundingClientRect().width].join(" ")})()`)); }
    const key = `${tag}_g${captured}_${ALL.indexOf(s.p)}${s.p}_${s.cur?.kinds ?? ""}`;
    if (key !== lastKey) { await sleep(800); await shot(key.replace(/\+/g, "-")); lastKey = key; }
    remaining = remaining.filter((x) => x !== s.p);
    if (s.p === "pullback") { captured++; await ev(`__cast.pauseAt = []; 1`); break; }
    await ev(`__cast.pauseAt = ${JSON.stringify(remaining)}; 1`);
  }
  await ev(`__cast.pauseAt = []; 1`);
  console.log("class", tag, "groups captured", captured);
  // 帧率：放开暂停，数一段时间的 rAF
  await sleep(100);
  await ev(`__fps.n = 0; __fps.on = true; 1`);
  await sleep(2000);
  console.log("fps", tag, (await ev(`__fps.n`)) / 2);
  await ev(`__fps.on = false; 1`);
}
proc.kill();
process.exit(0);

// 教程 10~13 关逐步引导端到端：node scripts/tut-steps.mjs <端口> <输出目录> [beats=10,11,12,13]
// （基于 story-shots：用 ?beat=N&skip=1 直接进关，按引导真的拖拽词牌走完每一轮，每步截图。）
// 故事模式端到端 + 截图（无头 Chrome + CDP）：node scripts/story-shots.mjs <端口> <输出目录> [beats=1]
// 按引导高亮走完关卡（拖拽拼句）：标题卡 → 漫画 → 对话 → 教学战斗 → 对话 → 漫画 → 选关页。
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = process.argv[2] ?? "5184", OUT = process.argv[3] ?? "D:/wc/story_shots", BEATS = (process.argv[4] ?? "10,11,12,13").split(",").map(Number), DBG = +(process.env.DBG ?? 9391);
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${process.env.UD ?? "D:/wc/ud_tut"}`, "--window-size=1440,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
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

// 一步：按引导做下一件事。返回描述字符串。拼句用指针事件把词牌从词牌库拖到句子条（同真人拖拽走同一套手势）
const STEP = `(async()=>{
  const $=s=>document.querySelector(s); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  if($('.st-retry')) return 'RETRY';
  if($('.sd-root')){ $('.sd-root').click(); return 'dialog'; }
  if($('.wc-root')){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return 'comic-skip'; }
  if($('.st-title')){ $('.st-title').click(); return 'title'; }
  if($('.st-select')) return 'SELECT';
  const b=window.__tb, ses=window.__ses; if(!b||!ses) return 'wait';
  const main=$('[data-a=main]'); const t=main?main.textContent:'';
  const ctr=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}};
  const ptr=(ty,x,y,tgt)=>tgt.dispatchEvent(new PointerEvent(ty,{bubbles:true,clientX:x,clientY:y,button:0,buttons:ty==='pointerup'?0:1,pointerId:1,isPrimary:true}));
  const edit=$('.unit.me.editing');
  if(edit&&window.__cheat){ edit.querySelector('.pass').click(); return 'pass'; }
  if(edit){
    const u=+edit.dataset.u; const st=ses.stepFor(b.m,u);
    const go=edit.querySelector('.comp [data-a=go]');
    if(!go.disabled){
      const sl=edit.querySelector('.comp input[type=range]'); let v=+sl.value; const lo=+sl.min;
      if(window.__plan&&window.__plan.unit===u){ v=Math.max(+sl.min,window.__plan.start); } else
      if(st){ if(st.startMin!==undefined) v=Math.max(v,st.startMin); if(st.startMax!==undefined) v=Math.min(v,st.startMax); }
      v=Math.max(v,lo); if(+sl.value!==v){ sl.value=v; sl.dispatchEvent(new Event('input',{bubbles:true})); }
      go.click(); window.__plan=null; return 'declare';
    }
    // 目标词序列：提示里的整句，没有就取第一条允许的句子
    if(window.__plan&&window.__plan.unit===u&&!window.__plan.cl){ window.__plan=null; edit.querySelector('.pass').click(); return 'pass'; }
    let toks=st&&st.words; if(window.__plan&&window.__plan.unit===u) toks=__cp.astToTokens(window.__plan.cl);
    if(!toks){
      const al=ses.allowed(b.m,u), wf=ses.wantsFn(b.m,u);
      const ls=b.m.legalSentences(u,400).filter(x=>al(x.cl)&&(!wf||wf(x.cl)));
      const good=window.__smart?ls.filter(x=>/敌方·[^，；]*受伤/.test(x.text)&&!/我方·[^，；]*受伤/.test(x.text)):[];
      const c=(good.length?good[Math.floor(Math.random()*Math.min(good.length,6))]:ls[0]);
      if(!c) return 'NOROW';
      toks=__cp.astToTokens(c.cl);
    }
    const n=b.dock.tokens.length;
    if(n>=toks.length) return 'NOGO';
    const card=$('.lib .cw[data-t="'+toks[n]+'"]'); if(!card||card.classList.contains('off')) return 'NOCARD '+toks[n];
    const a=ctr(card); ptr('pointerdown',a.x,a.y,card); ptr('pointermove',a.x+12,a.y+12,window);
    const p=ctr(edit.querySelector('.panel')); ptr('pointermove',p.x,p.y,window);
    const sls=[...edit.querySelectorAll('.slot')]; const sp=sls.length?ctr(sls[sls.length-1]):p; ptr('pointermove',sp.x,sp.y,window);
    if(window.__holdOnce){ window.__holdOnce=false; window.__rel=()=>ptr('pointerup',sp.x,sp.y,window); return 'holding'; }
    ptr('pointerup',sp.x,sp.y,window); await sleep(30); return 'pick';
  }
  if(t.includes('结束宣告')){
    const p=ses.pending(b.m);
    if(p.length){ const e=$('.unit[data-u="'+p[0].unit+'"]'); e.click(); return 'unit'+p[0].unit; }
    if(!ses.scripted&&window.__smart){
      if(!window.__plan){
        const sn=b.m.snap(), ns=b.m.s.decl.length, dn=b.m.s.done.slice(); b.m.autoMyMove();
        const d=b.m.s.decl.length>ns?b.m.s.decl[b.m.s.decl.length-1]:null;
        const u=d?d.unit:b.m.s.done.findIndex((x,i)=>x&&!dn[i]);
        window.__plan={unit:u,cl:d?d.cl:null,start:d?d.start:0}; b.m.restore(sn);
      }
      const e=$('.unit[data-u="'+window.__plan.unit+'"]'); if(e){ e.click(); return 'unit'+window.__plan.unit; }
    }
    if(!ses.scripted){ const us=b.m.myUnits().filter(u=>b.m.canAct(u)); if(us.length){ const e=$('.unit[data-u="'+us[0]+'"]'); e.click(); return 'unit'; } }
    main.click(); return 'end';
  }
  if(main&&!main.disabled&&(t.includes('结算')||t.includes('下一轮'))){ main.click(); return t.includes('结算')?'mainS':'mainN'; }
  return 'wait';
})()`;


const W = +(process.env.W ?? 1440), H = +(process.env.H ?? 810), tag = process.env.TAG ?? `${W}x${H}`;
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: !!process.env.MOBILE });
const seen = new Set(); let allOk = true;
for (const n of BEATS) {
  await cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju-story.html?beat=${n}&skip=1&unlock=all${process.env.FAST ? "&fast=1" : ""}` }); await sleep(1200);
  let steps = 0, last = "", prevRnd = 0; const t0 = Date.now(); let bg = "", art = "";
  while (Date.now() - t0 < +(process.env.BEAT_MS ?? 120000)) {
    { const mt0 = await ev("document.querySelector('[data-a=main]')?.textContent ?? ''"), rn0 = await ev("window.__tb?.m?.rnd ?? 0"); const k0 = `b${n}_r${rn0}_presettle`;
      if (mt0.includes("结算") && !seen.has(k0)) { seen.add(k0); await sleep(500); await shot(`${tag}_${k0}`); } }
    if (process.env.FAILTEST && !seen.has("ft" + n) && await ev("!!document.querySelector('.unit.me.ready')")) {
      seen.add("ft" + n);
      // 失败路径：点随从 → 拖一个被锁的词 → 拼一句不对的话再确认 → 看提示，再取消，不应卡死
      await ev("document.querySelector('.unit.me.ready').click()"); await sleep(300);
      const locked = await ev("(()=>{const d=__tb.dock; const ok=d.push('恢复'); return {ok, why:document.querySelector('.lib-why').textContent, toks:d.tokens.join(' ')}})()");
      const wrong = await ev("(()=>{const d=__tb.dock; d.tokens=[]; d.refresh(); const a=['造成','1','@4'].map(t=>d.push(t)); const ok=d.confirm(); return {pushed:a.join(','), confirmed:ok, why:document.querySelector('.lib-why').textContent, status:document.querySelector('.status')?.textContent, bubble:document.querySelector('.tb-bubble')?.textContent, bubbleWarn:document.querySelector('.tb-bubble')?.classList.contains('warn')}})()");
      await sleep(400); await shot(`${tag}_b${n}_failtest`);
      console.log("FAILTEST beat", n, JSON.stringify(locked), JSON.stringify(wrong));
      await ev("__tb.dock.cancel(); __tb.render()"); await sleep(300);
    }
    if (process.env.SMART) await ev("window.__smart=1");
    if (process.env.CHEAT && !seen.has("cheat") && await ev("!!window.__tb && !!document.querySelector('.unit.me.ready')")) { seen.add("cheat"); await ev("[3,4,5].forEach(u=>__tb.m.removeUnit(u)); __tb.render()"); await ev("window.__cheat=1"); console.log("CHEAT: foes removed"); }
    if (process.env.VFXLOG && !(await ev("!!window.__vfxLog"))) await ev("window.__vfxLog=[]; window.__vfxMark=" + (process.env.MARK ? 1 : 0));
    const r = await ev(STEP); if (r === "mainS" && process.env.VFXLOG && !process.env.DENSE) { await sleep(9000); console.log("VFXLOG", await ev("JSON.stringify(window.__vfxLog.splice(0))")); }
    if (r === "holding") { await sleep(350); await shot(`${tag}_b${n}_dragging`); await ev("window.__rel()"); }
    if (process.env.DRAGSHOT && !(await ev("!!window.__holdSet"))) await ev("window.__holdSet=1; window.__holdOnce=true");
    if (process.env.TRACE) console.log("  step", r);
    if (r === "SELECT") break;
    if (r === "RETRY") { console.log("!! 失败重来出现 beat", n); await shot(`${tag}_b${n}_FAIL`); allOk = false; break; }
    if (r === "NOROW" || r === "NOGO" || r.startsWith("NOCARD")) { console.log("!! 拖拽拼句卡住", r); await shot(`${tag}_b${n}_STUCK`); allOk = false; break; }
    if (!bg) { bg = await ev("getComputedStyle(document.documentElement).getPropertyValue('--bg-url')"); art = await ev("[...document.querySelectorAll('.unit.me img')].map(i=>i.src.split('/').slice(-2).join('/')).join(',')"); }
    const rn = await ev("window.__tb?.m?.rnd ?? 0");
    if (await ev("!!document.querySelector('.unit.me.editing') && !!window.__tb?.dock?.tokens.includes('奖励')")) {
      const auto = await ev("[...document.querySelectorAll('.strip .w-ghost')].some(e=>e.textContent==='奖励') && !document.querySelector('.lib [data-t=奖励]')");
      if (!auto) { console.log("!! 奖励未作为自动灰色提示词显示"); allOk = false; break; }
      const ak = `auto-reward-${rn}`;
      if (!seen.has(ak)) { seen.add(ak); console.log("自动灰色奖励 OK", rn); await shot(`${tag}_b${n}_r${rn}_auto_reward`); }
    }
    const t = r === "mainS" ? "settle" : r === "mainN" ? "next" : r.startsWith("unit") ? "guide" : r;
    const key = `b${n}_r${rn}_${t}`;
    if (r === "pick") { const k = await ev("(window.__tb?.dock?.tokens?.length ?? 0)"); const kk = `${key}${k}`; if ((k === 1 || k === 3) && !seen.has(kk)) { seen.add(kk); await sleep(250); await shot(`${tag}_${kk}`); } }
    else if (["guide", "declare"].includes(t) && !seen.has(key)) { seen.add(key); await sleep(350); await shot(`${tag}_${key}`); }
    else if (t === "settle" && !seen.has(key) && process.env.DENSE) { seen.add(key); for (let q = 0; q < 16; q++) { await sleep(q === 0 ? 400 : 260); await shot(`${tag}_${key}_p${String(q).padStart(2, "0")}`); } }
    else if (t === "settle" && !seen.has(key)) { seen.add(key); await sleep(1300); await shot(`${tag}_${key}_playing`); await sleep(2500); await shot(`${tag}_${key}_after`); }
    if (rn !== prevRnd) prevRnd = rn;
    last = r; steps++;
    await sleep(r === "wait" ? 250 : r === "dialog" ? 60 : 140);
  }
  if (last !== "SELECT" && !(await ev("!!document.querySelector('.st-select')"))) { allOk = false; console.log("!! 未完成关卡", n, last); }
  console.log("beat", n, "steps", steps, "last", last, "bg", bg, "art", art, "errors", await ev("__dj.errors.length"));
}
console.log(allOk ? "ALL OK" : "有失败", errs.length, await ev("JSON.stringify(__dj.errors.slice(0,3))"));
proc.kill(); process.exit(allOk ? 0 : 1);

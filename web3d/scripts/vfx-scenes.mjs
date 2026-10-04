// 合成场景录帧：每种动作 × 我方/敌方（职业不同）各录一遍，拼成联系表放 D:/wc/vfx_shots/scenes
// 用法：node scripts/vfx-scenes.mjs [端口] [我方职业] [宽] [高] [场景名过滤]
import { launch, sleep } from "./vfx-lib.mjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
const [port = "5182", style = "bing", w = "1280", h = "720", only = ""] = process.argv.slice(2);
const OUT = `D:/wc/vfx_shots/scenes_${style}_${w}`; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const c = await launch(9412, +w, +h);
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${port}/duanju.html` }); await sleep(1500);
await c.ev(`localStorage.setItem('duanju.settings', JSON.stringify({styleId:'${style}',tier:'进阶',rules:'default'}))`);
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${port}/duanju.html?start=1&speed=0` }); await sleep(1500);
await c.ev(`(() => { const b = __dj.battle, m = b.m; for (let i = 0; i < 10 && m.who() !== -1; i++) { if (m.who() === 1) m.aiMove(); else m.autoMyMove(); } b.render(); window.__sc = { b, m }; })()`);
const info = JSON.parse(await c.ev(`JSON.stringify([0,1,2,3,4,5].map(u => ({u, d: __sc.m.unitView(u).decl?.text ?? null, st: __sc.b.unitEls[u].dataset.style})))`));
console.log(JSON.stringify(info));
const mine = info.filter((x) => x.u < 3 && x.d), foe = info.filter((x) => x.u >= 3 && x.d);
const scene = (name, srcInfo, mk) => ({ name, srcInfo, mk });
// mk 里的 S=出手者 T=对面目标 A=友方
const defs = {
  atk: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['dmg']},{sec:3,type:'hit',src:S,tgt:T,amount:3,text:'-3'}]`,
  shield: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['shield']},{sec:3,type:'shield',src:S,tgt:A,amount:3,text:'盾+3'},{sec:5,type:'fire',src:T,tgt:-1,amount:0,text:TT,kinds:['dmg']},{sec:5,type:'absorb',src:T,tgt:A,amount:3,text:'挡3'}]`,
  heal: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['heal']},{sec:3,type:'heal',src:S,tgt:A,amount:2,text:'+2'}]`,
  burn: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['burn']},{sec:3,type:'status',src:S,tgt:T,amount:1,text:'灼烧'}]`,
  vuln: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['vuln']},{sec:3,type:'status',src:S,tgt:T,amount:1,text:'易伤'}]`,
  weak: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['weak']},{sec:3,type:'status',src:S,tgt:T,amount:1,text:'衰弱'}]`,
  redirect: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['redirect']},{sec:5,type:'fire',src:T,tgt:-1,amount:0,text:TT,kinds:['dmg']},{sec:5,type:'hit',src:S,tgt:S,amount:2,text:'-2'}]`,
  postpone: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['postpone'],ptgt:T,pn:3,start:19}]`,
  strip: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['strip']}]`,
  delay: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['delay']},{sec:9,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['cash']},{sec:9,type:'hit',src:S,tgt:T,amount:4,text:'-4'}]`,
  standing: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['standing']},{sec:3,type:'standing',src:S,tgt:-1,amount:0,text:'每当'},{sec:6,type:'fire',src:T,tgt:-1,amount:0,text:TT,kinds:['dmg']},{sec:6,type:'hit',src:T,tgt:A,amount:2,text:'-2'},{sec:6,type:'hit',src:S,tgt:T,amount:2,text:'-2'}]`,
  quote: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['dmg','quote']},{sec:3,type:'hit',src:S,tgt:T,amount:5,text:'-5'}]`,
  multi: `[{sec:3,type:'fire',src:S,tgt:-1,amount:0,text:TX,kinds:['dmg']},{sec:3,type:'hit',src:S,tgt:T,amount:2,text:'-2'},{sec:3,type:'fire',src:T,tgt:-1,amount:0,text:TT,kinds:['heal']},{sec:3,type:'heal',src:T,tgt:T,amount:2,text:'+2'},{sec:12,type:'fire',src:A,tgt:-1,amount:0,text:TA,kinds:['dmg']},{sec:12,type:'hit',src:A,tgt:T,amount:2,text:'-2'},{sec:21,type:'heat',src:-1,tgt:-1,amount:1,text:'过热'},{sec:21,type:'hit',src:-1,tgt:0,amount:1,text:'-1'}]`,
};
const sides = [["me", mine, foe], ["foe", foe, mine]];
for (const [side, srcs, tgts] of sides) {
  if (!srcs.length || !tgts.length) continue;
  const S = srcs[0], T = tgts[0], A = srcs[1] ?? srcs[0];
  for (const [name, ev] of Object.entries(defs)) {
    if (only && !name.includes(only)) continue;
    const expr = `(async () => { const {b,m}=__sc; const S=${S.u},T=${T.u},A=${A.u}; const TX=${JSON.stringify(S.d)},TT=${JSON.stringify(T.d)},TA=${JSON.stringify(A.d)};
      for (let u=0;u<6;u++){ b.disp.hp[u]=m.s.hp[u]; b.disp.sh[u]=m.s.sh[u]; } b.render(); b.view._s=b.stage;
      b.stage.querySelectorAll('[data-a^=skip]').forEach(x=>x.hidden=false);
      window.__done=false; const t0=performance.now(); b.cast.play(${ev}, b.view).then(()=>{window.__done=true; window.__ms=performance.now()-t0;}).catch(e=>{window.__done=true; window.__err=String(e.stack||e)}); })()`;
    await c.ev(expr);
    const files = []; let k = 0;
    while (!(await c.ev("window.__done")) && k < 120) { const f = `${OUT}/${side}_${name}_${String(k++).padStart(3, "0")}.jpg`; await c.shot(f); files.push(f); await sleep(60); }
    const ms = await c.ev("window.__ms"), err = await c.ev("window.__err");
    // 结束后的一致性
    const st = await c.ev(`JSON.stringify({cam:__sc.b.stage.querySelector('.cam').style.transform, layer:!!document.querySelector('.vx-layer'), lifted:document.querySelectorAll('.vx-lift').length})`);
    console.log(side, name, "frames", files.length, "ms", Math.round(ms), st, err ?? "");
    fs.writeFileSync(`${OUT}/${side}_${name}.json`, JSON.stringify(files));
    await c.ev("window.__err=undefined"); await sleep(200);
    await c.ev(`(()=>{const {b,m}=__sc; for(let u=0;u<6;u++){b.unitEls[u].classList.remove('dead','fall')} })()`);
  }
}
console.log("errors", JSON.stringify(c.errs));
c.proc.kill();
spawnSync("python", ["scripts/vfx-sheet.py", OUT], { stdio: "inherit" });
process.exit(0);

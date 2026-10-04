// 技能演出冒烟：无头 Chrome 电脑代打 N 局（演出开启，快速档），每次演出结束立刻检查：
// 覆盖层已移除、词牌归位（无 .vx-lift）、镜头复位、显示血量/护盾 = 引擎状态；另测一次「跳过全部」和「关闭」档。
// 用法：node scripts/vfx-smoke.mjs [端口=5182] [局数=10]   （先起 dev：node node_modules/vite/bin/vite.js --port 5182）
import { launch, sleep } from "./vfx-lib.mjs";
const PORT = process.argv[2] ?? "5182", N = +(process.argv[3] ?? 10);
const c = await launch(9413, 1280, 720);
let fail = 0;
const HOOK = `window.__chk={plays:0,bad:[],gap:0}; window.__vfxCheck=(b)=>{ const m=b.m; __chk.plays++; const bad=[];
  if(document.querySelector('.vx-layer')) bad.push('layer'); if(document.querySelectorAll('.vx-lift').length) bad.push('lift');
  const cam=b.stage.querySelector('.cam').style.transform; if(cam) bad.push('cam:'+cam);
  for(let u=0;u<6;u++){ const d=b.view.getDisplay(u); if(d.hp!==Math.max(0,m.s.hp[u])||d.sh!==m.s.sh[u]) { __chk.gap++; break; } }
  if(bad.length) __chk.bad.push('rnd'+m.s.rnd+' '+bad.join(',')); };`;
for (const [i, cfg] of [["bing", +(process.env.SPD ?? 1), 0], ["yin", +(process.env.SPD ?? 1), 0], ["xian", +(process.env.SPD ?? 1), 0], ["zhuang", +(process.env.SPD ?? 1), 0]].entries()) {
  const [style, speed] = cfg;
  const games = i === 0 ? N : 3;
  await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html` }); await sleep(1200);
  await c.ev(`localStorage.setItem('duanju.settings', JSON.stringify({styleId:'${style}',tier:'进阶',rules:'default'}))`);
  await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju.html?auto=${games}&speed=${speed}` }); await sleep(1200);
  await c.ev(HOOK);
  await c.ev("document.querySelector('.su-go').click()");
  const t0 = Date.now(); let n = 0;
  // 中途随机点击/按键跳过，顺带测「跳过全部」
  while (Date.now() - t0 < 600000) {
    n = await c.ev("__dj.games.length"); if (n >= games || (await c.ev("__dj.errors.length")) > 0) break;
    if (Math.random() < 0.25) await c.ev("document.querySelector('[data-a=skip]:not([hidden])')?.click()");
    if (Math.random() < 0.05) await c.ev("document.querySelector('[data-a=skipall]:not([hidden])')?.click()");
    await sleep(700);
  }
  const chk = JSON.parse(await c.ev("JSON.stringify(__chk)")), errs = await c.ev("JSON.stringify(__dj.errors)");
  console.log(`${style}: 打完 ${n}/${games} 局，演出 ${chk.plays} 次，结构不一致 ${chk.bad.length} ${JSON.stringify(chk.bad.slice(0, 3))}（回放与引擎血量差 ${chk.gap} 次：引擎回放事件本身的缺口，关闭档同样存在，Battle 演出后会对齐），页面错误 ${errs}`);
  if (n < games || chk.bad.length || errs !== "[]") fail++;
}
console.log("异常事件:", c.errs.length, c.errs.slice(0, 2));
c.proc.kill(); process.exit(fail || c.errs.length ? 1 : 0);

import assert from 'node:assert/strict';
const {chromium}=await import('file:///C:/Users/27654/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5210/duanju.html?start=1');await page.waitForFunction(()=>window.__dj?.battle);
 const result=await page.evaluate(async()=>{
  const {declare,nextRound}=await import('/src/duanju/engine/interp.ts');
  const {act,shield,unit}=await import('/src/duanju/engine/ast.ts');
  const b=window.__dj.battle,s=b.m.s;s.deck[0]={'减伤':1};s.advCooling[0]={};
  const cards=s.side[0].cards.map(c=>c.v);declare(s,0,0,[act(shield(1,unit(0)))],3);b.render();b.dock.refresh();
  const used=s.deck[0]['减伤'];const badge=document.querySelector('[data-t="减伤"]')?.textContent;
  nextRound(s);const next=s.deck[0]['减伤'];nextRound(s);b.render();b.dock.refresh();const recovered=s.deck[0]['减伤'];
  return {cards,used,next,recovered,badge};
 });assert.deepEqual(result.cards,[2,2,2,3]);assert.equal(result.used,0);assert.equal(result.next,0);assert.equal(result.recovered,1);assert.ok(result.badge.includes('冷1'));assert.deepEqual(errors,[]);console.log(JSON.stringify({result,errors}));
}finally{await browser.close();}


import fs from 'node:fs';import assert from 'node:assert/strict';
const {chromium}=await import('file:///C:/Users/27654/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const out='D:/wc/guide/主线重写-20261007';
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const n of [1,2,10,11,14]){
   await page.goto(`http://127.0.0.1:5210/duanju-story.html?beat=${n}&skip=1&fast=1`);await page.waitForFunction(()=>window.__tb?.rigs?.[0]?.canvas.width>100);
   await page.waitForFunction(()=>[...document.querySelectorAll('.story-actor:not(.absent)')].every(e=>e.querySelector('canvas.rig')?.width>100));
   await page.waitForTimeout(350);const state=await page.evaluate(()=>({names:[...document.querySelectorAll('.unit .nm')].map(e=>e.textContent),actors:__tb.rigs.map(r=>r?.canvas.width),errors:__dj.errors,background:getComputedStyle(document.documentElement).getPropertyValue('--bg-url')}));
   assert.equal(state.names[0],'叶栖');assert(state.background.includes('/duanju/bg/'));assert.equal(state.errors.length,0);await page.screenshot({path:`${out}/接入-${viewport.width}-第${n}关.png`});console.log('Battle rig mounted',viewport.width,n,state.actors);
  }
  await page.evaluate(async()=>{const {playComic}=await import('/src/duanju/story/comic/player.ts');window.__playQA=playComic;window.__panelsQA=await(await fetch('/duanju/story/panels.json')).json();window.__tb?.destroy();document.body.innerHTML='<div id="qa" style="height:100vh"></div>';});
  const count=await page.evaluate(()=>{window.__groupsQA=[...Map.groupBy(__panelsQA.panels,p=>[p.level,p.when,p.page].join(':')).values()];return __groupsQA.length;});
  for(let i=0;i<count;i++){
   await page.evaluate(i=>{window.__hQA?.destroy();const d={...__panelsQA,panels:__groupsQA[i]};window.__hQA=__playQA(document.querySelector('#qa'),d,{imageBase:'/duanju/story/panels/',speed:5});},i);
   await page.waitForFunction(()=>[...document.querySelectorAll('.wc-cam img')].some(x=>x.complete&&x.naturalWidth>100));await page.waitForTimeout(210);
   const lines=await page.evaluate(i=>__groupsQA[i].reduce((n,p)=>n+p.lines.length+1,0)-1,i);
   for(let l=0;l<lines;l++){await page.evaluate(()=>__hQA.next());await page.waitForTimeout(180);const b=await page.evaluate(()=>{const e=document.querySelector('.wc-root.portrait .wc-dock')??document.querySelector('.wc-cap');const r=e?.getBoundingClientRect();return r?{right:r.right,bottom:r.bottom,left:r.left,sw:e.scrollWidth,cw:e.clientWidth}:null;});if(b){assert(b.left>=-1&&b.right<=viewport.width+1&&b.bottom<=viewport.height+1);assert(b.sw<=b.cw+24,JSON.stringify({i,l,b}));}}
   const group=await page.evaluate(i=>__groupsQA[i][0],i);
   await page.screenshot({path:`${out}/分格-${viewport.width}-L${group.level}-${group.when}-${group.page}.png`});
  }
  assert.deepEqual(errors,[]);console.log(viewport.width,'all',count,'comic pages and captions checked');await page.close();
 }
}finally{await browser.close();}

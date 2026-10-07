import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=await import('file:///C:/Users/27654/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='D:/wc/guide/主线重写-20261007';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:5210/duanju.html?start=1&unlock=all');
 const names=process.argv.slice(2);if(!names.length)names.push('ye_qing','a_dou','lao_cai','tong_qiao');
 await page.evaluate(async names=>{
  const {createRig,loadRig}=await import('/src/duanju/rig/rig.ts');document.body.innerHTML='';document.body.style.cssText='background:#182330;color:white;display:flex;gap:20px;padding:30px';window.__rigs=[];
  for(const n of names){const a=await loadRig('story_'+n);if(!a)throw Error('Missing rig '+n);const box=document.createElement('div');box.style.cssText='width:310px;height:720px;text-align:center';box.textContent=n;document.body.append(box);const r=createRig('story_'+n,box,{paused:true,scale:.5});window.__rigs.push(r);}
 },names);
 await page.waitForFunction(()=>__rigs.every(r=>r.canvas.width>300));
 const frames=[];
 for(const [anim,t] of [['idle',0],['cast',.50],['hurt',.12]]){
  const result=await page.evaluate(([anim,t])=>{for(const r of __rigs)r.seek(anim,t);return __rigs.map(r=>({png:r.canvas.toDataURL(),hand:r.anchor('hand',{anim,t}),head:r.anchor('head',{anim,t})}));},[anim,t]);
  for(const [i,r] of result.entries()){assert(r.hand&&r.head);assert(r.png.length>10000);fs.writeFileSync(`${out}/${names[i]}-${anim}.png`,Buffer.from(r.png.split(',')[1],'base64'));}
  frames.push(result);await page.screenshot({path:`${out}/骨骼-${anim}.png`});
 }
 for(let i=0;i<names.length;i++){assert.notEqual(frames[0][i].png,frames[1][i].png);assert.notEqual(frames[0][i].png,frames[2][i].png);}
 console.log('Real skeletal idle/cast/hurt frames and anchors OK',names);
}finally{await browser.close();}

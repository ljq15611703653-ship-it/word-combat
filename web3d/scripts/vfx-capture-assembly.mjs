import {mkdirSync} from 'node:fs';
const {chromium}=await import('file:///C:/Users/27654/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='D:/wc/guide/词牌组合演出截图';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
for(const [name,type,src,tgt,amount,text] of [['01-攻击词牌飞行','hit',0,3,3,'造成3'],['02-减伤屏障留场','shield',0,0,2,'减伤2'],['03-恢复词牌','heal',1,0,2,'恢复2']]){
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:5210/duanju.html?start=1&unlock=all');await page.waitForFunction(()=>window.__dj?.battle);
 await page.evaluate(async({type,src,tgt,amount,text})=>{const b=window.__dj.battle;b.busy=true;b.view._s=b.stage;b.view.speed=()=>1;b.view.sentenceWords=()=>[{token:type==="hit"?"造成":type==="heal"?"恢复":"减伤",label:type==="hit"?"造成":type==="heal"?"恢复":"减伤"},{token:String(amount),label:String(amount)},{token:"选择",label:"选择"},{token:"1",label:"1"},{token:"@"+tgt,label:"目标随从"}];const {VfxCastPlayer}=await import('/src/duanju/vfx/player.ts');window.shotPlayer=new VfxCastPlayer();b.unitEls[src].querySelector('.decl').innerHTML='<i>本轮</i><span class="tx">'+text+'</span>';const e={sec:1,type,src,tgt,amount,text:type==='hit'?'-3':text};window.shotDone=shotPlayer.play([{sec:1,type:'fire',src,tgt:-1,amount:0,text},e],b.view);},{type,src,tgt,amount,text});
 if(type==='shield'){await page.waitForSelector('.vx-resident[data-kind="shield"]');}
 else {await page.waitForSelector(type==='hit'?'.vx-launched':'.vx-repair-cross');await page.waitForTimeout(300);}
 await page.screenshot({path:out+'/'+name+'.png'});console.log(name);await page.close();
}
}finally{await browser.close()}




// 拖拽拼句的真鼠标测试：先 vite build 出静态包并起静态服务，node scripts/dragshots.mjs <端口> <输出目录>
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
mkdirSync(process.argv[3] ?? "dshots", { recursive: true });
const PORT = process.argv[2] ?? "5195", DBG = 9355;
const proc = spawn(process.env.CHROME ?? "/opt/pw-browsers/chromium", ["--no-sandbox","--headless=new",`--remote-debugging-port=${DBG}`,"--user-data-dir="+(process.env.TMPDIR??"/tmp")+"/ud_drag","--window-size=1440,810","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","about:blank"],{stdio:"ignore"});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let tabs; for(let i=0;i<50;i++){try{tabs=await(await fetch(`http://127.0.0.1:${DBG}/json`)).json();if(tabs.length)break}catch{}await sleep(300)}
const ws=new WebSocket(tabs.find(t=>t.type==="page").webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener("open",r));
let id=0;const pend=new Map();ws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}});
const cdp=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}))});
const ev=async(x)=>{const r=await cdp("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true});if(r.result?.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,400));return r.result?.result?.value};
const shot=async(n)=>{const r=await cdp("Page.captureScreenshot",{format:"png"});writeFileSync(`"+(process.argv[3]??"dshots")+"/${n}.png`,Buffer.from(r.result.data,"base64"));console.log("shot",n)};
const mouse=(type,x,y,extra={})=>cdp("Input.dispatchMouseEvent",{type,x,y,button:"left",buttons:type==="mouseReleased"?0:1,clickCount:1,...extra});
await cdp("Emulation.setDeviceMetricsOverride",{width:1440,height:810,deviceScaleFactor:1,mobile:false});
await cdp("Page.navigate",{url:`http://127.0.0.1:${PORT}/`});
for(let i=0;i<80;i++){if(await ev("!!window.__gm"))break;await sleep(500)} await sleep(1500);
await ev(`window.__sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
window.__btn=(t)=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t)&&!b.disabled);
window.__scr=(uid)=>{const c=__cards[uid<3?3+uid:uid-3];const v=c.root.position.clone();v.y=1.1;v.project(__cam);const r=document.querySelector('canvas').getBoundingClientRect();return [r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height]};1`);
await ev(`{const m=document.querySelector('.mn');if(m)m.hidden=true;}__gm.open();__sleep(200)`);await sleep(400);
await ev(`document.querySelectorAll('.cls')[0].click();1`);await sleep(200);
await ev(`__btn('开始对局').click();1`);await sleep(2500);
console.log("ui",await ev("__gm.ui"));
const drag=async(a,b,steps=8)=>{const [x0,y0]=await ev(`__scr(${a})`),[x1,y1]=await ev(`__scr(${b})`);
 await mouse("mouseMoved",x0,y0,{button:"none",buttons:0});await sleep(100);await mouse("mousePressed",x0,y0);
 for(let i=1;i<=steps;i++){await mouse("mouseMoved",x0+(x1-x0)*i/steps,y0+(y1-y0)*i/steps);await sleep(60)}
 return async()=>{await mouse("mouseReleased",x1,y1);await sleep(300)}};
// 1) 我方 0 拖到敌方 3
let rel=await drag(0,3); await shot("1_dragging"); await rel();
console.log("ui",await ev("__gm.ui"),"tokens",await ev("JSON.stringify(__gm.cmp?.tokens)"),"binds",await ev("JSON.stringify(__gm.cmp?.binds)"));
await shot("2_dropped");
// 2) 面板开着：在空白处拖框，框住两个敌方
const [ax,ay]=await ev("__scr(3)"),[bx,by]=await ev("__scr(4)");
const x0=Math.min(ax,bx)-120,y0=Math.min(ay,by)-150,x1=Math.max(ax,bx)+120,y1=Math.max(ay,by)+90;
await mouse("mouseMoved",x0,y0,{button:"none",buttons:0});await mouse("mousePressed",x0,y0);
for(let i=1;i<=8;i++){await mouse("mouseMoved",x0+(x1-x0)*i/8,y0+(y1-y0)*i/8);await sleep(60)}
await shot("3_boxing");await mouse("mouseReleased",x1,y1);await sleep(300);
console.log("tokens",await ev("JSON.stringify(__gm.cmp?.tokens)"),"binds",await ev("JSON.stringify(__gm.cmp?.binds)"),"toast",await ev("document.querySelector('.toast,.gm-toast')?.textContent"));
await shot("4_boxed");
proc.kill();process.exit(0);

// 头/脖子检查联系表：node scripts/rig/neckcheck.mjs <端口> <输出目录> [角色逗号表]
// 每个角色一行: idle 0/0.8/1.6/2.4, cast 0.28/0.5/0.75, hurt 0.07/0.2 的头颈区域放大裁切(设计坐标 330..930 x 200..640)，xN=每行角色数
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, sleep } from "../vfx-lib.mjs";
const PORT = process.argv[2], OUT = process.argv[3] ?? "D:/wc/polish2/neck", CH = (process.argv[4] ?? "ye_qi,lu_xiaoman,ke_qian,bing_ci,bing_shu,bing_su,yin_ci,yin_shu,yin_su,xian_ci,xian_shu,xian_su,zhuang_ci,zhuang_shu,zhuang_su,mask").split(",");
const BOX = (process.env.BOX ?? "340,260,940,640").split(",").map(Number);
mkdirSync(OUT, { recursive: true });
const c = await launch(9441 + Math.floor(Math.random() * 40), 1280, 720, "D:/wc/tmp/ud_neck" + Date.now());
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${PORT}/duanju-rig.html?c=none` }); await sleep(1500);
const FR = [["idle", 0], ["idle", 0.8], ["cast", 0.28], ["cast", 0.5], ["hurt", 0.07], ["hurt", 0.2]];
for (let i = 0; i < CH.length; i += 4) {
  const grp = CH.slice(i, i + 4);
  const data = await c.ev(`(async()=>{
    const {createRig}=await import('/src/duanju/rig/rig.ts'); const BOX=${JSON.stringify(BOX)}, FR=${JSON.stringify(FR)}, S=${process.env.S ?? 0.7};
    const cw=Math.round((BOX[2]-BOX[0])*S), ch=Math.round((BOX[3]-BOX[1])*S);
    const out=document.createElement('canvas'); out.width=cw*FR.length; out.height=ch*${grp.length}; const g=out.getContext('2d'); g.fillStyle='#3a3f4a'; g.fillRect(0,0,out.width,out.height);
    const holder=document.createElement('div'); document.body.appendChild(holder);
    const chars=${JSON.stringify(grp)};
    for(let r=0;r<chars.length;r++){
      const cell=document.createElement('div'); holder.appendChild(cell); const f=createRig(chars[r],cell,{scale:1,paused:true});
      for(let k=0;k<150&&!(f.canvas.width>300);k++) await new Promise(x=>setTimeout(x,60));
      for(let j=0;j<FR.length;j++){ f.seek(FR[j][0],FR[j][1]); const cv=f.canvas, sc=cv.width/780; g.drawImage(cv,(BOX[0]-195)*sc,BOX[1]*sc,(BOX[2]-BOX[0])*sc,(BOX[3]-BOX[1])*sc,j*cw,r*ch,cw,ch); g.fillStyle='#ff0'; g.font='12px sans-serif'; g.fillText(chars[r]+' '+FR[j][0]+FR[j][1],j*cw+4,r*ch+14); }
      f.destroy();
    } return out.toDataURL('image/png'); })()`);
  writeFileSync(`${OUT}/neck_${String(i / 4)}.png`, Buffer.from(data.split(",")[1], "base64")); console.log("sheet", i / 4, grp.join(","));
}
c.proc.kill(); process.exit(0);

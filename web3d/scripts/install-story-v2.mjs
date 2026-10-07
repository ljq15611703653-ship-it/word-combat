import fs from 'node:fs';
import {opening,chapters,ending} from './story-v2-content.mjs';
const dir='public/duanju/story/';
const cur=JSON.parse(fs.readFileSync(dir+'curriculum.json','utf8'));
cur.base.me=['叶栖','辅助机甲','辅助机乙'];
for(const b of cur.beats){
  const c=chapters.find(x=>x.n===b.beat);b.name=c.title;
  const oldFoe=b.foeNames.slice();
  b.foeNames=['机械甲','机械乙','机械丙'];
  const replacements=[['小满','辅助机甲'],['柯谦','辅助机乙'],['靶体甲','机械甲'],['靶体乙','机械乙'],['靶体丙','机械丙'],['受伤','造成'],...oldFoe.map((n,i)=>[n,b.foeNames[i]])];
  const replace=v=>typeof v==='string'?replacements.reduce((s,[a,z])=>s.replaceAll(a,z),v):Array.isArray(v)?v.map(replace):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,replace(x)])):v;
  Object.assign(b,replace(b));
  delete b.background;
}
const a=cur.beats[0];a.meNames=['叶栖','叶晴','侦察机'];a.meArt=['ye_qi','story_ye_qing','mask'];a.foeNames=['护卫甲','护卫乙','护卫丙'];a.background='duanju/bg/bg_05_streetlamp.webp';a.me.units=[0,1,2];a.me.deck={'减伤':2};
a.rounds[0].steps[0].say.menu='拼句就是给机械下指令。依次拖「造成」「1」「护卫甲」，拼完会让护卫甲受到1点伤害。灰色连接词自动补齐，不用拖。伤害数字1免费，不消耗数字牌。';
for(const r of a.rounds)r.allies=[{unit:1,s:[{verb:'shield',n:1,tg:0}],start:1}];
a.rounds[0].steps[1].say={unit:'侦察机受损，只剩1点生命。点它，查看攻击指令。',menu:'侦察机先传送撤离路线，攻击只能排在第8秒以后。护卫第6秒就会击毁它：未完成的句子会落空，随后投出应急骰牌。',wrong:'选护卫乙，造成1点伤害。',start:'侦察机这次行动从第8秒开始，起手秒设为8或更晚。'};
for(const r of a.rounds)for(const s of r.steps){for(const k in s.say)s.say[k]=s.say[k].replaceAll('靶体甲','护卫甲').replaceAll('靶体乙','护卫乙').replaceAll('机械甲','护卫甲').replaceAll('机械乙','护卫乙');}
const b=cur.beats[1];b.meNames=['叶栖','老蔡','童乔'];b.meArt=['ye_qi','story_lao_cai','story_tong_qiao'];b.foeNames=['追兵甲','追兵乙','追兵丙'];b.background='duanju/bg/bg_08_oldfactory.webp';b.me.units=[0,1,2];b.me.deck={'延后':2};
for(const r of b.rounds){r.allies=[{unit:1,s:[{kind:'postpone',ord:0,by:1}],start:1},{unit:2,s:[{verb:'heal',n:1,tg:0}],start:7}];}
const write=(file,data)=>fs.writeFileSync(dir+file,JSON.stringify(data,null,2)+'\n');
cur.beats[9].foeArt=['story_lao_cai_masked','mask','mask'];
cur.beats[10].foeArt=['story_ye_qing_masked','story_a_dou_masked','mask'];
cur.beats[13].foeArt=['story_tong_qiao_masked','mask','mask'];
write('curriculum.json',cur);
// 文字只在漫画层演一次；关内提示仍使用教学对白，避免漫画后再重复整段。
write('dialog.json',chapters.map(c=>({level:c.n,beat:c.n,intro:[],outro:[],rounds:c.rounds.map(r=>({...r,say:r.say?.map(l=>({...l,expr:'neutral',side:l.who==='叶栖'?'left':'right'})),after:r.after?.map(l=>({...l,expr:'neutral',side:l.who==='叶栖'?'left':'right'}))}))})));
const square=[[0,0],[1,0],[1,1],[0,1]];
const {layouts,sequences,frames}=JSON.parse(fs.readFileSync('../art/story-v2/layout-reference.json','utf8'));
const panels=[];
const page=(level,when,n,item)=>{
 const layout=sequences[level]?.[when]?.[(n-1)%sequences[level][when].length]??'H';
 const slots=layouts[layout].slots;const count=slots.length;
 for(let i=0;i<count;i++){
  const lines=item.lines.slice(Math.ceil(i*item.lines.length/count),Math.ceil((i+1)*item.lines.length/count));
  const who=lines.find(l=>l.who!=='旁白')?.who??'';
  const focus=item.art==='home'?({叶栖:.12,叶晴:.66,阿豆:.31,老蔡:.48,童乔:.88}[who]??(i===0?.12:i===1?.88:.5)):item.art==='raid'?({叶栖:.40,叶晴:.14,阿豆:.68}[who]??(i?.65:.28)):item.art==='pump'?({叶栖:.50,老蔡:.21,童乔:.76}[who]??(i?.72:.3)):(i%2?.66:.34);
  const original=frames.find(p=>p.level===level&&p.when===when&&p.page===n&&p.slot===i+1);
  const shot=(n-1)*2+i+1;
  const special=`v2-L${level}-${when}-page${n}-slot${i+1}.webp`;
  const image=fs.existsSync(dir+'panels/'+special)?special:level>=1&&level<=14&&fs.existsSync(dir+`panels/v2-L${level}-${when}-${shot}.webp`)?`v2-L${level}-${when}-${shot}.webp`:`v2-${item.art}.webp`;
  panels.push({id:`V2-L${level}-${when}-${n}-${i+1}`,chapter:item.title,level,beat:level,when,page:n,layout,...slots[i],...(original??{}),image,focus:image.startsWith('v2-L')?[.5,.5]:[focus,.45],camera:original?.camera??{move:i?'push-in':'hold',dur:4},lines,blocks:[]});
 }
};
opening.forEach((p,i)=>page(0,'pre',i+1,p));
for(const c of chapters)for(const when of ['pre','post']){
 const lines=c[when],art=c[when+'Art'];
 // 沿用旧版每关关前、关后各两页及 F/H 分格顺序。
 for(let n=1;n<=2;n++)page(c.n,when,n,{title:c.title,art,lines:lines.slice(Math.ceil((n-1)*lines.length/2),Math.ceil(n*lines.length/2))});
}
ending.forEach((p,i)=>page(15,'post',i+1,p));
write('panels.json',{version:2,presentation:'clean-comic',layouts,panels});
console.log(`Installed ${cur.beats.length} beats, ${new Set(panels.map(p=>[p.level,p.when,p.page].join(':'))).size} pages, ${panels.length} comic panels`);

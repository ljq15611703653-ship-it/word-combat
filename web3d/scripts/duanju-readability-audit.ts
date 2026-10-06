// 只生成审查资料，不修改游戏文字或发布。运行：tsx scripts/duanju-readability-audit.ts [数量] [输出目录]
import { mkdirSync, openSync, writeSync, closeSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { configureRules, deckOk, zh, setUnitNames } from "../src/duanju/engine/api";
import { newGame, canAfford, windupFor } from "../src/duanju/engine/interp";
import { mulberry32 } from "../src/duanju/engine/gen";
import { act, dmg, heal, unit, status, query, win, word, cat, ev, forbid, allClauses, legal, advWordsOf, sentenceText, type Clause, type Sentence, type Eff, type Obj, type Amt } from "../src/duanju/engine/ast";
import { astToTokens, tokensToAst, normAst, tokenLabel, ghostWords } from "../src/duanju/composer/grammar";

const N = +(process.argv[2] ?? 100000), OUT = resolve(process.argv[3] ?? "D:/wc/guide/灰色词审查");
mkdirSync(OUT,{recursive:true}); configureRules("default");
const r=mulberry32(20261006), pick=<T>(a:T[]):T=>a[Math.floor(r()*a.length)];
const names=["叶栖","陆小满","柯谦","长明甲","长明乙","长明丙"];
setUnitNames(["叶栖","陆小满","柯谦"],["长明甲","长明乙","长明丙"]);
const s=newGame(0), pool:Clause[]=[], seen=new Set<string>();
s.sord=2; s.decl=[{side:1,unit:3,ord:0,sord:0,cl:[act(dmg(1,unit(0)))],cost:1,nums:[],start:8},{side:1,unit:4,ord:1,sord:1,cl:[act(heal(1,unit(3)))],cost:1,nums:[],start:9}];
const objects:Obj[]=[word("造成"),word("恢复"),word("减伤"),word("灼烧"),word("定时"),cat("atk"),cat("def"),cat("status"),cat("any"),cat("dealt"),cat("taken"),ev("hurt"),ev("healed"),ev("down"),ev("decl"),{t:"order",a:"恢复",b:"造成"},{t:"nth",n:1},{t:"nth",n:2}];
for(const verb of ["dmg","heal","shield"] as const) for(const n of [1,2,3,4,5,6]) for(const u of verb==="dmg"?[3,4,5]:[0,1,2]) for(const rep of verb==="shield"?[1]:[1,2,3]) {
  pool.push(act({verb,n,tg:unit(u),...(rep>1?{rep}:{} )}));
  if(verb==="dmg") pool.push(act(dmg(n,unit(u),"shield",rep)));
}
for(const kind of ["burn","vuln","weak"] as const) for(const dur of [1,2,3,4]) for(const u of [3,4,5]) pool.push(status(kind,1,dur,unit(u)));
for(let i=0;i<1800;i++) {
  const obj=pick(objects),agg=pick(["count","sum","len","segs"] as const as any) as "count"|"sum"|"len"|"segs";
  const a:Amt={q:query(win("before",pick([1,2,3,99]),pick(["round","sent"])),pick(["me","foe"]),obj,agg),mult:pick([1,2,3])};
  const verb=pick(["dmg","heal","shield"] as const as any) as Eff["verb"];
  pool.push(act({verb,n:a,tg:unit(pick(verb==="dmg"?[3,4,5]:[0,1,2]))}));
}
const literal=pool.filter(c=>c.k==="act"&&typeof c.eff.n==="number"&&c.eff.n<=3);
for(let i=0;i<900;i++) {
  const obj=pick(objects),after=r()<.5;
  const c:Clause={k:"when",q:query(win(after?"after":"before",pick(after?[1,2,3]:[1,2,3,99]),pick(["round","sent"])),pick(["me","foe"]),obj,"count",pick([1,2,3])),judge:r()<.8?"exist":"absent",effs:[(pick(literal) as any).eff],cap:pick([1,2])};
  pool.push(c);
}
for(const n of [1,2,3]) for(const pen of [1,2,3]) for(const obj of objects.slice(0,9)) pool.push(forbid(obj,n,pen));
for(const n of [1,2,3,4]) {
  for(const e of literal.slice(0,30)) pool.push({k:"delay",wait:n,effs:[(e as any).eff]});
  pool.push({k:"ignore",cat:"stand",win:n});
  for(const ord of [0,1]) pool.push({k:"postpone",ord,n});
}
for(const u of [0,1,2]) pool.push({k:"redirect",tg:unit(u)});
for(const u of [3,4,5]) pool.push({k:"strip",tg:unit(u)});
pool.push({k:"cash"});
for(const verb of ["dmg","heal","shield"] as const) for(const count of [2,3]) for(const n of [1,2,3]) pool.push(act({verb,n,tg:{t:"units",us:(verb==="dmg"?[3,4,5]:[0,1,2]).slice(0,count)}}));

type Group={id:string;title:string;priority:string;proposal:string;why:string;count:number;usable:number;examples:any[]};
const groups:Group[]=[
 {id:"action",title:"伤害／生命的灰字应留到目标拼完",priority:"推荐",proposal:"造成3〔点伤害；目标：〕长明甲；恢复2〔点生命；目标：〕叶栖",why:"现有伤害/生命灰字只在句尾恰为动作+数字时出现；继续放目标便消失。先延续现有灰字，胜过另造术语。"},
 {id:"repeat",title:"重复次数、倍率的单位",priority:"推荐",proposal:"重复2〔次〕；×2〔倍〕",why:"灰字补单位，不增加牌或重复次数。倍率只能出现在引用数值里。"},
 {id:"status",title:"状态数字是持续轮数",priority:"推荐",proposal:"灼烧〔施加于〕长明甲〔，持续〕2〔轮〕",why:"默认规则里的2是持续轮数，不是灼烧等级或当场伤害。只加轮仍不足，建议持续也补。"},
 {id:"timer",title:"定时的数字与轮末边界",priority:"先审语义",proposal:"定时〔在第〕2〔次轮末结算：〕造成3〔伤害〕……",why:"引擎含当前轮：定时1在本轮末，定时2在下轮末。现有完成句写2轮后，不能沿用这个灰字而扩大误解。"},
 {id:"forbid",title:"不得的期限与罚谁",priority:"推荐",proposal:"不得2〔轮内使用〕「造成」，罚3〔点伤害，由使用者承受〕",why:"不得是违者受罚；不封死动作。灰字应补轮数、使用对象与受罚来源，不写禁止生效。"},
 {id:"ignore",title:"单独无视与伤害后的无视",priority:"推荐",proposal:"单独：无视〔敌方长期句对我方的效果，持续〕2〔轮〕；伤害后：无视〔减伤〕",why:"同一个词在两处意义不同。仅补无视2轮仍没有说明无视什么。建议短灰字加提示，不把整段解释塞进牌条。"},
 {id:"redirect",title:"转移的对象是受保护者",priority:"推荐",proposal:"转移〔打向〕叶栖〔的敌方伤害，返还来源〕",why:"转移叶栖可能被读成移动叶栖。至少要说明转移的是伤害。"},
 {id:"strip",title:"移除实际拆掉什么",priority:"推荐",proposal:"移除〔防护与其施放的长期句；目标：〕长明甲",why:"当前默认规则拆减伤、转移和该目标的长期句；不清除灼烧/易伤/衰弱。不建议加状态二字。"},
 {id:"postpone",title:"延后缺秒的单位",priority:"推荐",proposal:"延后 第1句 2〔秒〕",why:"这是起手秒延后；不是延后2轮。第N句为当前轮的宣告编号，不能灰字偷换成对方独立计数。"},
 {id:"multi",title:"多目标个数与各自的量",priority:"推荐",proposal:"选择2〔个目标：〕长明甲 长明乙；成句时加〔各〕受伤3",why:"伤害/恢复/减伤逐个施加同样的量，3不是被两人平分。个和各分别补目标数与分配含义。"},
 {id:"condition",title:"条件里区分宣告与实际使用",priority:"谨慎",proposal:"若〔之前〕1轮……；断言以后1句〔宣告〕……；词对象加〔使用〕，事件对象不加",why:"词在句窗口读宣告，在轮窗口读实际使用；不能一律加使用。对方优先与以后优先也必须保留，不能因美化改词序。"},
 {id:"quote",title:"引用量读起来仍像公式",priority:"需独立预览",proposal:"在预览里读作：对方上一轮使用「造成」的次数×2；词牌条仅考虑括号与单位",why:"大量次数/累计/词数/段数+窗口+对象组合，单靠几枚灰词无法顺读。需要按AST生成预览，保留真实牌序；这次不实施。"},
 {id:"cap",title:"至多是每轮上限，收紧不是倍数",priority:"谨慎",proposal:"〔每轮〕至多2〔次〕；收紧用提示说明实际门槛，不补倍或轮",why:"至多与重复不同：前者限制每轮触发次数，后者重复单段动作。收紧的数字会调整触发门槛，不宜凭字面补一个单位。"},
 {id:"cash",title:"兑现要说明兑现什么",priority:"推荐",proposal:"兑现〔我方所有已生效的定时句〕",why:"兑现是提前结算我方定时句，不是把所有长期句兑现。建议短灰词定时句，完整范围放提示。"},
].map(x=>({...x,count:0,usable:0,examples:[]}));
let attempted=0,accepted=0,roundtripBad=0,usable=0,deckFeasible=0;
const kinds:Record<string,number>={}, fd=openSync(resolve(OUT,"句子组合.jsonl"),"w"), rejected:any[]=[];
const t0=Date.now();
const previews=new Map<string,{first:any;count:number}>(),collisions:any[]=[];
function inspect(cl:Sentence) {
  attempted++;
  if(!legal(cl))return;
  let tokens:string[]; try{tokens=astToTokens(cl);}catch{return;}
  const key=tokens.join("\u001f");if(seen.has(key))return;
  const parsed=tokensToAst(tokens); if(!parsed||normAst(parsed)!==normAst(cl)){roundtripBad++;if(rejected.length<8)rejected.push({tokens,parsed});return;}
  const before = JSON.stringify(parsed);
  const ghosts = ghostWords(tokens);
  if (Object.keys(ghosts).some(at => +at < 0 || +at > tokens.length) || JSON.stringify(tokensToAst(tokens)) !== before) throw new Error("灰词影响了真实语法");
  seen.add(key);accepted++;
  const requirements:Record<string,number>={}; for(const w of advWordsOf(parsed)) requirements[w]=(requirements[w]??0)+1;
  const deckFits=deckOk(requirements);if(deckFits)deckFeasible++;
  let canStart=false;
  if(deckFits)for(const cx of ["并","引用","限制","状态"] as const){s.cls[0]=cx;for(const u of [0,1,2])if(canAfford(s,0,parsed,u)&&windupFor(parsed,u,s)<=13){canStart=true;break;}if(canStart)break;}
  if(canStart)usable++;
  const clauses=allClauses(parsed),effs=clauses.flatMap(c=>c.k==="act"?[c.eff]:c.k==="when"||c.k==="delay"?c.effs:[]);
  for(const c of clauses) kinds[c.k]=(kinds[c.k]??0)+1;
  const contains=(k:string)=>clauses.some(c=>c.k===k);
  const flags=[effs.some(e=>e.verb==="dmg"||e.verb==="heal"),effs.some(e=>(e.rep??1)>1||typeof e.n!=="number"&&e.n.mult>1),contains("status"),contains("delay"),clauses.some(c=>c.k==="when"&&c.forbid),contains("ignore")||effs.some(e=>!!e.ignore),contains("redirect"),contains("strip"),contains("postpone"),effs.some(e=>e.tg.t==="units"&&e.tg.us.length>1),contains("when")||contains("assert"),effs.some(e=>typeof e.n!=="number"),clauses.some(c=>c.k==="when"&&(c.cap>1||(c.q.tight??1)>1)&&!c.forbid),contains("cash")];
  const sample={id:accepted,strip:tokens.map(t=>tokenLabel(t,u=>names[u])).join(" "),preview:zh(sentenceText(parsed)),deckFits,canStart};
  const prev=previews.get(sample.preview);
  if(prev){prev.count++;if(collisions.length<12&&parsed.length===1&&flags[11])collisions.push({first:prev.first,next:sample});}
  else previews.set(sample.preview,{first:sample,count:1});
  groups.forEach((g,i)=>{if(!flags[i])return;g.count++;if(canStart)g.usable++;if(g.examples.length<4&&canStart)g.examples.push(sample);});
  writeSync(fd,JSON.stringify({...sample,tokens,ast:parsed})+"\n");
  if(accepted%10000===0)console.log(`组合 ${accepted}/${N}，开局资源可支付 ${usable}，${Math.round((Date.now()-t0)/1000)}秒`);
}
// 各单句家族先覆盖，避免抽样稀释少见词。
for(const c of pool)inspect([c]);
while(accepted<N&&attempted<N*30){
  if(r()<.28){
    const who=pick(["all","me","foe"] as const as any) as "all"|"me"|"foe",scope=who!=="all"&&r()<.5?"side":"all",unitWin=pick(["round","sent"] as const as any) as "round"|"sent";
    const obj=unitWin==="sent"?pick(objects.filter(o=>o.t==="word"||o.t==="cat"||o.t==="ev"&&o.e==="decl")):pick(objects);
    const rewards=[pick(pool)],alternatives=[pick(pool)];if(r()<.18)alternatives.push(pick(pool));
    inspect([{k:"assert",scope,who,win:win("after",pick([1,2,3]),unitWin),judge:r()<.8?"exist":"absent",obj,effs:[],rewards,alternatives}]);
  }else{
    const cl=[pick(pool),pick(pool)];if(r()<.35)cl.push(pick(pool));
    if(r()<.15)cl[1]=act((pick(literal) as any).eff,r()<.5?"ok":"fail");
    inspect(cl);
  }
}
closeSync(fd);
const summary={seed:20261006,requested:N,attempted,uniqueSyntaxValid:accepted,roundtripBad,deckFeasible,initialPlayableInSomeClassAndPosition:usable,seconds:Math.round((Date.now()-t0)/1000),kinds,groups,rejected,previewCollisionGroups:[...previews.values()].filter(v=>v.count>1).length,previewCollisions:collisions,method:"默认规则；去重语法往返；卡组预算/张数；四职业×三位置的开局资源与13秒窗口静态检查。假设对方已宣告两句供延后选择；不检查实际轮到谁，不模拟100000场战斗。引用量未造完整历史，能付得起不代表当场有效。覆盖是系统抽样，不代表穷尽全部规则。灰词顺读由人工审查家族例句，计数是候选覆盖数，不能当作语言错误率。"};
writeFileSync(resolve(OUT,"审查统计.json"),JSON.stringify(summary,null,2));
const esc=(s:string)=>s.replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!));
const gray=(s:string)=>esc(s).replace(/〔(.*?)〕/g,'<span class="gray">$1</span>');
const windows=[
 ["造成","次数","之前","1","轮","对方","词:造成","@3"],
 ["造成","次数","之前","1","句","对方","词:造成","@3"],
 ["造成","次数","之前","全程","轮","对方","词:造成","@3"],
].map(tokens=>({strip:tokens.map(t=>tokenLabel(t,u=>names[u])).join(" "),preview:zh(sentenceText(tokensToAst(tokens)!))}));
const windowSection=`<article><div class="meta">需审核 · 是显示遗漏，尚未修改游戏</div><h2>三个不同窗口，完成预览却相同</h2>${windows.map(x=>`<div class="example"><p>${esc(x.strip)}</p><p class="preview">现有完成预览：${esc(x.preview)}</p></div>`).join("")}<p>上轮、之前一条宣告、全程不是同一统计范围。建议完整预览保留窗口；灰色词只能辅助，不能替代这个缺失信息。</p></article>`;
const cards=groups.map(g=>`<article data-priority="${g.priority}"><div class="meta">${esc(g.priority)} · 覆盖 ${g.count.toLocaleString()} 句 · 开局资源可支付 ${g.usable.toLocaleString()} 句</div><h2>${esc(g.title)}</h2><p>${esc(g.why)}</p><div class="proposal">${gray(g.proposal)}</div><details><summary>查看真实组合例句（词牌序列／现有完成预览）</summary>${g.examples.map(e=>`<div class="example"><b>#${e.id}</b><p>${esc(e.strip)}</p><p class="preview">${esc(e.preview)}</p></div>`).join("")}</details><label><input type="checkbox"> 我认可这个方向（只作本页标记，不会发布或改代码）</label></article>`).join("");
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>灰色词审查 · 未发布</title><style>body{margin:0;background:#10131b;color:#e8edf5;font:16px/1.65 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1080px;margin:auto;padding:40px 24px}h1{font-size:30px;margin:8px 0}h2{font-size:21px}.badge,.meta{color:#67dce2}.stats{display:flex;gap:16px;flex-wrap:wrap}.stats div{padding:14px 22px;background:#1e2532;border-radius:10px}.stats strong{font-size:25px;display:block}article{margin:22px 0;padding:22px;border:1px solid #334052;border-radius:12px;background:#161c27}.proposal{background:#0d121a;padding:14px;border-radius:8px}.gray{display:inline-block;color:#a5adb8;background:#282e39;border:1px dashed #596170;border-radius:4px;padding:0 5px;margin:0 3px}.example{border-top:1px solid #334052;padding:8px 0}.preview{color:#95d7c0}.note{border-left:3px solid #edc871;padding-left:16px;color:#cbd0db}label{display:block;margin-top:16px;font-size:14px}button{background:#243648;border:1px solid #607587;color:#e8edf5;padding:8px 14px;border-radius:6px;cursor:pointer}details{margin-top:15px}summary{cursor:pointer;color:#a9bfd7}@media print{body{background:white;color:black}article{break-inside:avoid;background:white}.gray{color:#555;background:#eee}button{display:none}}</style><main><div class="badge">2026-10-06 · 审核稿 · 尚未发布 · 尚未实施这些额外灰词</div><h1>句子组合的灰色补词审查</h1><p>观察双方的词已按要求改为「任意」。现有断言改动只在本机，main 与 Pages 均未推送。本页列出额外灰词候选；勾选不会产生写入或发布。</p><div class="stats"><div><strong>${accepted.toLocaleString()}</strong>去重语法合法组合</div><div><strong>${usable.toLocaleString()}</strong>某职业/位置开局资源可支付</div><div><strong>${roundtripBad}</strong>往返异常</div><div><strong>${groups.length}</strong>人工审查家族</div></div><p class="note">${esc(summary.method)}<br>〔灰字〕仅表示审查提案。建议只影响显示，不占数字/进阶词牌，不增加行动点，不改变词数、段数、目标、时间或条件判定。长解释应放提示或完成预览，不宜全塞进句子条。</p><p><button onclick="document.querySelectorAll('article').forEach(e=>e.hidden=false)">全部候选</button> <button onclick="document.querySelectorAll('article').forEach(e=>e.hidden=e.dataset.priority!=='推荐')">只看推荐</button> <button onclick="window.print()">打印审核稿</button></p>${cards}<p class="note">特别留意：定时的轮末计数是语义对齐问题，不应靠随手加「轮后」掩盖；引用量需要观察对象和统计窗口的解释，也不是统一插「使用」就能解决。引用数值的现有完成预览未显示窗口（之前/以后、N轮/N句/全程），统计中记录了不同组合共用相同预览的碰撞例。逐行组合与AST保存在同目录「句子组合.jsonl」，统计保存在「审查统计.json」。</p></main></html>`;
const installed = html.replace('</main>',windowSection+'</main>')
  .replaceAll("灰色词审查 · 未发布", "灰色词验收")
  .replaceAll("审核稿 · 尚未发布 · 尚未实施这些额外灰词", "安装验收 · 灰词与完整预览已实施")
  .replaceAll("现有断言改动只在本机，main 与 Pages 均未推送。本页列出额外灰词候选；勾选不会产生写入或发布。", "本页保存安装后系统抽样结果。例句预览直接来自游戏，原提案保留作对照；复选框只作本页标记。")
  .replaceAll("需审核 · 是显示遗漏，尚未修改游戏", "已修复 · 完整预览保留窗口")
  .replaceAll("三个不同窗口，完成预览却相同", "三个不同窗口，完成预览已区分")
  .replaceAll("现有完成预览：", "安装后完成预览：")
  .replaceAll("这次不实施", "已通过AST完整预览实现")
  .replaceAll("建议完整预览保留窗口；灰色词只能辅助，不能替代这个缺失信息。", "完成预览已保留窗口，不再合并这些不同范围。")
  .replaceAll("引用数值的现有完成预览未显示窗口（之前/以后、N轮/N句/全程），统计中记录了不同组合共用相同预览的碰撞例。", "引用预览已保留方向、长度与轮／句，真实查询结果另有结算测试核对。");
writeFileSync(resolve(OUT,"灰色词审查.html"),installed);
console.log(JSON.stringify({OUT,accepted,attempted,usable,deckFeasible,roundtripBad,seconds:summary.seconds}));

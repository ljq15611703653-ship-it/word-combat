// 100 局“胜负优先”真实引擎对战：我方与电脑都用大师推演，我方轮换四职业。
import { mkdirSync, writeFileSync } from "node:fs";
import { configureRules, DECK_WORDS, sentenceText } from "../src/duanju/engine/api";
import { newGame, declare, passUnit, nextSide, resolveRound, nextRound } from "../src/duanju/engine/interp";
import { mulberry32 } from "../src/duanju/engine/gen";
import { think, TIERS } from "../src/duanju/engine/ai2";
import { randKws } from "../src/duanju/engine/deck";
import { advWordsOf, type Cls, type Side } from "../src/duanju/engine/ast";
const OUT=process.argv[2]??"C:/Users/27654/Documents/New project/review/duanju-100k-200games";mkdirSync(OUT,{recursive:true});configureRules("default");
const C:Cls[]=["并","引用","限制","状态"],P=Object.fromEntries(DECK_WORDS.presets.map(p=>[p.id,p.deck]));
const D:Record<Cls,Record<string,number>>={并:P.newbie,引用:P.quote,限制:P.forbid,状态:P.state};
const games:any[]=[];
for(let index=1;index<=100;index++){
 const my=C[(index-1)%4],foe=C[(index+1)%4],seed=880000+index,r=mulberry32(seed),s=newGame((index%2) as Side,[{...D[my]},{...D[foe]}],false,[randKws(r),randKws(r)],[my,foe]);s.rs=(seed^0x5bd1e995)>>>0;
 const declarations:any[]=[],roundLog:any[]=[];let guard=0;
 while(s.win<0&&guard++<40){const before=s.hp.slice();for(let z=0;z<14;z++){const sd=nextSide(s);if(sd===-1)break;const m=think(s,sd,r,TIERS["大师"]);if(m.cl&&declare(s,sd,m.unit,m.cl,m.start))declarations.push({round:s.rnd,side:sd,unit:m.unit,text:sentenceText(m.cl),start:m.start,advanced:advWordsOf(m.cl)});else passUnit(s,m.unit);s.turn=(1-s.turn) as Side;}resolveRound(s);roundLog.push({round:s.rnd,before,hp:s.hp.slice(),delta:before.map((x,i)=>s.hp[i]-x)});if(s.win<0)nextRound(s);}
 const myHp=s.hp.slice(0,3).reduce((a,x)=>a+Math.max(0,x),0),foeHp=s.hp.slice(3).reduce((a,x)=>a+Math.max(0,x),0),mine=declarations.filter(d=>d.side===0),last=mine.at(-1);
 const outcome=s.win===0?"win":s.win===1?"lose":"draw";
 const debrief=`第${index}局${outcome==="win"?"胜":outcome==="lose"?"负":"平"}，${s.rnd}轮，末局总血${myHp}:${foeHp}。${last?`最后宣告「${last.text}」；`:"末轮没有有效宣告；"}${outcome==="win"?"推演把资源兑现成了击倒。":"对方在起手、集火或资源效率上占优。"}`;
 games.push({index,seed,myClass:my,foeClass:foe,outcome,rounds:s.rnd,hp:s.hp,declarations,roundLog,debrief});
}
writeFileSync(`${OUT}/vs-computer-strong-100.json`,JSON.stringify(games,null,2));
const byText=new Map<string,any>();for(const g of games)for(const d of g.declarations.filter((x:any)=>x.side===0)){const x=byText.get(d.text)??{text:d.text,uses:0,wins:0,classes:{},advanced:d.advanced};x.uses++;if(g.outcome==="win")x.wins++;x.classes[g.myClass]=(x.classes[g.myClass]??0)+1;byText.set(d.text,x);}
const sentenceStats=[...byText.values()].map(x=>({...x,winRate:x.wins/x.uses})).sort((a,b)=>b.uses-a.uses||b.winRate-a.winRate);
const summary={games:100,wins:games.filter(g=>g.outcome==="win").length,losses:games.filter(g=>g.outcome==="lose").length,draws:games.filter(g=>g.outcome==="draw").length,avgRounds:games.reduce((a,g)=>a+g.rounds,0)/100,byClass:Object.fromEntries(C.map(c=>[c,{n:games.filter(g=>g.myClass===c).length,w:games.filter(g=>g.myClass===c&&g.outcome==="win").length}]))};
writeFileSync(`${OUT}/vs-computer-strong-summary.json`,JSON.stringify({...summary,sentenceStats:sentenceStats.slice(0,100)},null,2));console.log(JSON.stringify(summary,null,2));

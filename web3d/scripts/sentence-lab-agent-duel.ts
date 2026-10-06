// 主 agent（并流） vs 子 agent“墨律”（限制流）100 局；双方逐局独立复盘。
import { mkdirSync, writeFileSync } from "node:fs";
import { configureRules, DECK_WORDS, sentenceText } from "../src/duanju/engine/api";
import { newGame, declare, passUnit, nextSide, resolveRound, nextRound } from "../src/duanju/engine/interp";
import { mulberry32 } from "../src/duanju/engine/gen";
import { think, TIERS } from "../src/duanju/engine/ai2";
import { randKws } from "../src/duanju/engine/deck";
import { advWordsOf, type Side } from "../src/duanju/engine/ast";
import { opponentMover, opponentClass, opponentDeck, opponentName, agentDebrief } from "./duanju-agent-opponent";
const OUT=process.argv[2]??"C:/Users/27654/Documents/New project/review/duanju-100k-200games";mkdirSync(OUT,{recursive:true});configureRules("default");
const P=Object.fromEntries(DECK_WORDS.presets.map(p=>[p.id,p.deck]));
const myClass="并" as const,myDeck={...P.newbie},myName="沈砚";
const games:any[]=[];
for(let index=1;index<=100;index++){
 const seed=990000+index,r=mulberry32(seed),mySide=(index%2) as Side,agentSide=(1-mySide) as Side;
 const decks:any=mySide===0?[myDeck,opponentDeck]:[opponentDeck,myDeck],classes:any=mySide===0?[myClass,opponentClass]:[opponentClass,myClass];
 const s=newGame((Math.floor((index-1)/2)%2) as Side,decks,false,[randKws(r),randKws(r)],classes);s.rs=(seed^0x5bd1e995)>>>0;
 const declarations:any[]=[],roundLog:any[]=[];let guard=0;
 while(s.win<0&&guard++<40){const before=s.hp.slice();for(let z=0;z<14;z++){const sd=nextSide(s);if(sd===-1)break;const m=sd===mySide?think(s,sd,r,TIERS["大师"]):opponentMover(s,sd,r);if(m.cl&&declare(s,sd,m.unit,m.cl,m.start))declarations.push({round:s.rnd,side:sd,unit:m.unit,text:sentenceText(m.cl),start:m.start,advanced:advWordsOf(m.cl)});else passUnit(s,m.unit);s.turn=(1-s.turn) as Side;}resolveRound(s);roundLog.push({round:s.rnd,before,hp:s.hp.slice(),delta:before.map((x,i)=>s.hp[i]-x)});if(s.win<0)nextRound(s);}
 const result=s.win===2?"draw":s.win===mySide?"win":"lose";
 const mine=mySide===0?[0,1,2]:[3,4,5],foe=mySide===0?[3,4,5]:[0,1,2],sum=(us:number[])=>us.reduce((a,u)=>a+Math.max(0,s.hp[u]),0);
 const myLast=declarations.filter(d=>d.side===mySide).at(-1),foeLast=declarations.filter(d=>d.side===agentSide).at(-1);
 const myDebrief=`第${index}局我方${result==="win"?"胜":result==="lose"?"负":"平"}，${s.rnd}轮，终局${sum(mine)}:${sum(foe)}血。${myLast?`我最后说「${myLast.text}」（${myLast.start}秒）`:"我末轮没有有效宣告"}；${foeLast?`墨律最后说「${foeLast.text}」（${foeLast.start}秒）`:"墨律末轮没有有效宣告"}。${result==="win"?"并流把多段效率兑现成击倒。":"限制流令我的进攻付出额外代价，末轮交换不够。"}`;
 const base:any={index,seed,myName,opponentName,mySide,agentSide,opponentSide:agentSide,first:s.first,outcome:result,opponentOutcome:result==="win"?"lose":result==="lose"?"win":"draw",win:s.win,rounds:s.rnd,hp:s.hp,declarations,roundLog,myDebrief};
 base.agentDebrief=agentDebrief(base,agentSide);games.push(base);
}
writeFileSync(`${OUT}/agent-duel-100.json`,JSON.stringify(games,null,2));
const summary={games:100,myName,opponentName,myClass,opponentClass,wins:games.filter(g=>g.outcome==="win").length,losses:games.filter(g=>g.outcome==="lose").length,draws:games.filter(g=>g.outcome==="draw").length,avgRounds:games.reduce((a,g)=>a+g.rounds,0)/100};
writeFileSync(`${OUT}/agent-duel-summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));

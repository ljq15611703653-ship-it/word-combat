// 十万句规则压力测试 + 100 局探索型策略对大师电脑。
// 输出到用户指定目录，所有对战使用正式 default 规则和同一套引擎结算。
import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { configureRules, DECK_WORDS, deckCost, sentenceText } from "../src/duanju/engine/api";
import { newGame, declare, passUnit, nextSide, resolveRound, nextRound, canAfford, alive, unitsOf, windupFor, clone } from "../src/duanju/engine/interp";
import { genSentence, mulberry32, candidates, type Rng } from "../src/duanju/engine/gen";
import { expandTg } from "../src/duanju/engine/playbook";
import { astToTokens, tokensToAst, normAst } from "../src/duanju/composer/grammar";
import { legal, classProblem, advWordsOf, numsOf, wordsOf, type Sentence, type Cls, type Side } from "../src/duanju/engine/ast";
import { think, TIERS, type Ai2Cfg } from "../src/duanju/engine/ai2";
import { randKws } from "../src/duanju/engine/deck";

const OUT = process.argv[2] ?? "C:/Users/27654/Documents/New project/review/duanju-100k-200games";
mkdirSync(OUT, { recursive: true });
configureRules("default");
const CLASSES: Cls[] = ["并", "引用", "限制", "状态"];
const PRE = Object.fromEntries(DECK_WORDS.presets.map((p) => [p.id, p.deck]));
const DECKS: Record<Cls, Record<string, number>> = { 并: PRE.newbie, 引用: PRE.quote, 限制: PRE.forbid, 状态: PRE.state };
const wordInfo = new Map(DECK_WORDS.words.map((w) => [w.name, w]));

function shape(cl: Sentence) {
  return cl.map((c) => c.k === "act" ? `act:${c.eff.verb}${c.ifPrev ? ":if" + c.ifPrev : ""}` : c.k === "when" ? `when:${c.forbid ? "forbid" : c.q.win.dir}:${c.judge}` : c.k).join("+");
}
function deckFeasible(cl: Sentence) {
  const counts: Record<string, number> = {};
  for (const w of advWordsOf(cl)) counts[w] = (counts[w] ?? 0) + 1;
  for (const [w, n] of Object.entries(counts)) { const d = wordInfo.get(w); if (!d || n > d.max) return false; }
  return deckCost(counts) <= 18;
}
function numberFeasible(cl: Sentence, cx: Cls) {
  const ns = cl.flatMap((c) => numsOf(c, cx)).filter((n) => n >= 2);
  // 实战中可经击倒骰扩到 9 张；数位可将一个最大的需求减 1。这里只判“存在可达牌组”。
  if (ns.length > 9 || ns.some((n) => n > 6)) return false;
  const sorted = [...ns].sort((a,b)=>b-a); if (sorted.length) sorted[0]--;
  return sorted.every((n) => n <= 6);
}
function necessity(cl: Sentence) {
  const sig = shape(cl);
  const structural = cl.some((c) => c.k !== "act") || cl.length > 1 || cl.some((c) => c.k === "act" && (c.ifPrev || c.eff.ignore || (c.eff.rep ?? 1) > 1 || typeof c.eff.n !== "number"));
  return { sig, necessary: structural, reason: structural ? "改变时机、目标、条件或资源关系" : "基础数值/目标变体，可由同类句覆盖" };
}

const seedState = newGame(0, [DECKS.并, DECKS.限制], false, [["首挡","不屈","不屈"],["不屈","首挡","不屈"]], ["并","限制"]);
const corpus = createWriteStream(`${OUT}/sentences-100000.jsonl`, { encoding: "utf8" });
const seen = new Set<string>(), stats: any = { total: 0, roundtrip: 0, deckFeasible: 0, combatFeasible: 0, necessary: 0, byClass: {}, byShape: {}, failures: {}, examples: { high: [], rejected: [] } };
const rng = mulberry32(20261006);
let attempts = 0;
while (seen.size < 100000 && attempts++ < 3000000) {
  const cx = CLASSES[attempts % 4], unit = attempts % 3;
  const e: any = { s: seedState, side: 0, unit, r: rng, maxN: 6, foes: [3,4,5], mine: [0,1,2] };
  const raw = genSentence(e, true);
  const variants = expandTg(e, raw, true);
  for (const cl of variants) {
    if (seen.size >= 100000) break;
    const key = JSON.stringify(cl); if (seen.has(key)) continue; seen.add(key);
    const cxOk = !classProblem(cl, cx), legalOk = legal(cl);
    let rt = false, toks: string[] = [], rtErr = "";
    try { toks = astToTokens(cl); const back = tokensToAst(toks); rt = !!back && normAst(back) === normAst(cl); if (!rt) rtErr = "roundtrip-mismatch"; } catch (e) { rtErr = String((e as Error).message ?? e); }
    const df = deckFeasible(cl), nf = numberFeasible(cl, cx);
    const apApprox = (() => { try { const ss = clone(seedState); (ss as any).cls = [cx, "限制"]; ss.side[0].ap = 10; ss.side[0].deck = Object.fromEntries(DECK_WORDS.words.map(w=>[w.name,w.max])); return canAfford(ss,0,cl,unit)?.cost ?? 99; } catch { return 99; } })();
    const combat = legalOk && cxOk && rt && df && nf && apApprox <= 10;
    const nec = necessity(cl);
    const value = (combat ? 2 : 0) + (nec.necessary ? 2 : 0) + new Set(cl.flatMap(wordsOf)).size * .15 + cl.length * .25 - Math.max(0, apApprox - 5) * .2;
    const rec = { id: seen.size, class: cx, text: sentenceText(cl), tokens: toks, ast: cl, shape: nec.sig, checks: { legal: legalOk, class: cxOk, roundtrip: rt, deck: df, numbers: nf, apAt10: apApprox, combat }, necessity: { needed: nec.necessary, reason: nec.reason }, value: +value.toFixed(2) };
    corpus.write(JSON.stringify(rec) + "\n");
    stats.total++; if (rt) stats.roundtrip++; if (df) stats.deckFeasible++; if (combat) stats.combatFeasible++; if (nec.necessary) stats.necessary++;
    stats.byClass[cx] = (stats.byClass[cx] ?? 0) + 1; stats.byShape[nec.sig] = (stats.byShape[nec.sig] ?? 0) + 1;
    if (!combat) { const why = !legalOk?"规则非法":!cxOk?"职业限制":!rt?"编辑器不可往返":!df?"卡组容量":!nf?"数字牌不可达":"行动点超限"; stats.failures[why]=(stats.failures[why]??0)+1; if(stats.examples.rejected.length<30)stats.examples.rejected.push({text:rec.text,why}); }
    else if(value>=4.5&&stats.examples.high.length<100) stats.examples.high.push({id:rec.id,class:cx,text:rec.text,value:rec.value});
  }
}
await new Promise<void>((res, rej) => { corpus.end(res); corpus.on("error", rej); });
if (seen.size < 100000) throw new Error(`只生成 ${seen.size} 个不同句子`);
writeFileSync(`${OUT}/corpus-summary.json`, JSON.stringify(stats,null,2));

type Move={unit:number;cl:Sentence|null;start:number};
function explorer(s:any, side:Side, r:Rng):Move {
  const us=unitsOf(side).filter((u)=>alive(s,u)&&!s.done[u]); let pool:{score:number,m:Move}[]=[];
  for(const u of us){
    for(const cl of candidates(s,side,u,r,48,"playbook")){
      const a=canAfford(s,side,cl,u); if(!a)continue;
      const complex=advWordsOf(cl).length*1.2+cl.length*.8+new Set(cl.flatMap(wordsOf)).size*.12;
      const attack=cl.some((c:any)=>c.k==="act"&&c.eff.verb==="dmg")?1:0;
      const survival=Math.min(...unitsOf(side).filter((x)=>alive(s,x)).map((x)=>s.hp[x]))<=3&&cl.some((c:any)=>c.k==="act"&&c.eff.verb!=="dmg")?3:0;
      pool.push({score:complex+attack+survival-r()*.6,m:{unit:u,cl,start:windupFor(cl,u,s)}});
    }
  }
  if(!pool.length)return{unit:us[0],cl:null,start:1}; pool.sort((a,b)=>b.score-a.score); return pool[Math.floor(r()*Math.min(3,pool.length))].m;
}
function playRecorded(index:number, cls:Cls){
  const seed=700000+index, r=mulberry32(seed), foeCls=CLASSES[(index+1)%4];
  const s=newGame((index%2) as Side,[{...DECKS[cls]},{...DECKS[foeCls]}],false,[randKws(r),randKws(r)],[cls,foeCls]); s.rs=(seed^0x5bd1e995)>>>0;
  const declarations:any[]=[], rounds:any[]=[]; let guard=0;
  while(s.win<0&&guard++<40){
    const before=s.hp.slice();
    for(let g=0;g<14;g++){const sd=nextSide(s);if(sd===-1)break;const mv=sd===0?explorer(s,0,r):think(s,1,r,TIERS["大师"]);if(mv.cl&&declare(s,sd,mv.unit,mv.cl,mv.start)){declarations.push({round:s.rnd,side:sd,unit:mv.unit,text:sentenceText(mv.cl),start:mv.start,advanced:advWordsOf(mv.cl)});}else passUnit(s,mv.unit);s.turn=(1-s.turn) as Side;}
    resolveRound(s); const delta=before.map((x,i)=>s.hp[i]-x); rounds.push({round:s.rnd,hp:s.hp.slice(),delta}); if(s.win<0)nextRound(s);
  }
  const mine=declarations.filter(x=>x.side===0), fancy=mine.filter(x=>x.advanced.length||x.text.includes("若成功")||x.text.includes("若失败"));
  const last=rounds.at(-1), myHp=[0,1,2].reduce((a,u)=>a+Math.max(0,s.hp[u]),0), foeHp=[3,4,5].reduce((a,u)=>a+Math.max(0,s.hp[u]),0);
  const debrief=`第${index}局${s.win===0?"胜":"负"}，${s.rnd}轮。末轮我方总血${myHp}、对方${foeHp}；本局用了${fancy.length}句进阶句。${fancy.length?`代表句：「${fancy.at(-1).text}」。`:"主要靠基础句。"}${s.win===0?"资源转换及时，斩杀成立。":"复杂度没有换成足够生存或伤害，残局被收掉。"}`;
  return{index,seed,myClass:cls,foeClass:foeCls,first:index%2===0?"我":"电脑",outcome:s.win===0?"win":s.win===1?"lose":"draw",rounds:s.rnd,hp:s.hp,declarations,roundLog:rounds,debrief,last};
}
const games=[];for(let i=1;i<=100;i++)games.push(playRecorded(i,CLASSES[(i-1)%4]));
writeFileSync(`${OUT}/vs-computer-100.json`,JSON.stringify(games,null,2));
const gsum={games:100,wins:games.filter(g=>g.outcome==="win").length,losses:games.filter(g=>g.outcome==="lose").length,draws:games.filter(g=>g.outcome==="draw").length,avgRounds:games.reduce((a,g)=>a+g.rounds,0)/100,advancedSentences:games.reduce((a,g)=>a+g.declarations.filter((d:any)=>d.side===0&&d.advanced.length).length,0),byClass:Object.fromEntries(CLASSES.map(c=>[c,{w:games.filter(g=>g.myClass===c&&g.outcome==="win").length,n:games.filter(g=>g.myClass===c).length}]))};
writeFileSync(`${OUT}/vs-computer-summary.json`,JSON.stringify(gsum,null,2));
console.log(JSON.stringify({corpus:{...stats,byShape:Object.keys(stats.byShape).length,examples:undefined},games:gsum},null,2));

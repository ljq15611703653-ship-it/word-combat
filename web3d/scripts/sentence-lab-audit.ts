import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { sentenceCost, windup, classProblem, legal, type Sentence, type Cls } from '../src/duanju/engine/ast';
const root=process.argv[2]!;const f=root+'/sentences-100000.jsonl';
const st:any={total:0,editorRoundtrip:0,staticReachable:0,byClass:{},apTooHigh:0,windupTooLate:0,classIllegal:0,other:0,shapes:new Set<string>()};
for await(const line of createInterface({input:createReadStream(f),crlfDelay:Infinity})){const r=JSON.parse(line),cl=r.ast as Sentence,cx=r.class as Cls;st.total++;if(r.checks.roundtrip)st.editorRoundtrip++;st.shapes.add(r.shape);const costs=[0,1,2].map(p=>sentenceCost(cl,5,p,cx)),winds=[0,1,2].map(p=>windup(cl,p===2?-2:0,cx));const ok=legal(cl)&&!classProblem(cl,cx)&&r.checks.deck&&r.checks.numbers&&Math.min(...costs)<=10&&Math.min(...winds)<=10;if(ok){st.staticReachable++;st.byClass[cx]=(st.byClass[cx]??0)+1;}else if(classProblem(cl,cx))st.classIllegal++;else if(Math.min(...costs)>10)st.apTooHigh++;else if(Math.min(...winds)>10)st.windupTooLate++;else st.other++;}
st.semanticShapes=st.shapes.size;delete st.shapes;writeFileSync(root+'/implementation-audit.json',JSON.stringify(st,null,2));console.log(JSON.stringify(st,null,2));

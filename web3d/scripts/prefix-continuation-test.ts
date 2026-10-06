import assert from 'node:assert/strict';
import {configureRules} from '../src/duanju/engine/api';
import {newGame,declare} from '../src/duanju/engine/interp';
import {nextLegal,tokensToAst,type Ctx} from '../src/duanju/composer/grammar';
import {status,unit} from '../src/duanju/engine/ast';
configureRules('default');
let checks=0;
const check=(tokens:string[],ctx:Ctx)=>{for(let i=0;i<tokens.length;i++){const r=nextLegal(tokens.slice(0,i),ctx);assert.ok(r.ok.has(tokens[i]),`${tokens.slice(0,i+1).join(' ')}: ${r.why.get(tokens[i])}`);checks++;}assert.ok(nextLegal(tokens,ctx).canEnd);};
const s=newGame(0,[{'并':3,'减伤':2},{}],false,undefined,['并','并']);
for(const t of [
 ['造成','1','@3','并','恢复','1','@0'],
 ['造成','1','@3','若成功','恢复','1','@0'],
 ['造成','1','@3','若失败','恢复','1','@0'],
 ['恢复','1','@0','并','减伤','1','@0','并','造成','1','@3']
])check(t,{s,side:0,unit:0});
assert.equal(nextLegal(['造成','1','@3','并','造成','1','@4'],{s,side:0,unit:0}).canEnd,false);
assert.equal(nextLegal(['造成','9','@3'],{s,side:0,unit:0}).canEnd,false);
const state=newGame(0,[{'易伤':1,'衰弱':1},{}],false,undefined,['状态','状态']);
assert.ok(declare(state,0,0,[status('weak',1,1,unit(3))],2));
check(['易伤','@4','1'],{s:state,side:0,unit:1});
assert.equal(nextLegal(['易伤','@3','1'],{s:state,side:0,unit:1}).canEnd,false);
const exhausted=newGame(0,[{},{}]);
assert.equal(nextLegal(['减伤','1','@0'],{s:exhausted,side:0,unit:0}).canEnd,false);
assert.ok(tokensToAst(['造成','1','@3','若失败','恢复','1','@0']));
console.log(`逐词后续检查通过：${checks}个合法步骤；重复动作、数字超支、状态冲突与缺牌仍不能宣告。`);

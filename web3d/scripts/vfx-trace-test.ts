import assert from 'node:assert/strict';
import {Match,configureRules} from '../src/duanju/engine/api';
import {act,dmg,unit,strip,redirect,postpone,query,win,cat} from '../src/duanju/engine/ast';
function game(){configureRules('custom',JSON.stringify({P:{HP:12,AP0:30,APCAP:30,HEAT_FROM:99,CARDS0:[2,2,3,4,4],TL:10},P2:{RMREAL:1,POS:0,KW:0,CLASSES:0,DICE:0,REDIR:1,POSTPONE:1}}));const m=new Match({first:0,tier:'普通',myDeck:{},foeDeck:{},seed:42});m.s.deck=[null,null];return m;}
let m=game();m.s.sh[5]=2;m.s.sh[3]=5;assert(m.declare(0,[strip(unit(5))],1));let ev=m.resolve();assert(ev.some(e=>e.effect==='strip'&&e.tgt===5));assert.equal(m.s.sh[5],0);assert.equal(m.s.sh[3],5);
m=game();assert(m.foeDeclare(5,[act(dmg(1,unit(0)))],5));const ord=m.s.decl[0].ord;assert(m.declare(0,[postpone(ord,2)],1));ev=m.resolve();assert(ev.some(e=>e.effect==='postpone'&&e.tgt===5&&e.end===7));
m=game();assert(m.declare(0,[redirect(unit(1))],1));assert(m.foeDeclare(3,[act(dmg(2,unit(1)))],5));ev=m.resolve();assert(ev.some(e=>e.effect==='redirect'&&e.tgt===1));assert(ev.some(e=>e.effect==='reflect'&&e.src===1&&e.tgt===3));assert.equal(m.s.hp[1],12);assert.equal(m.s.hp[3],10);
m=game();assert(m.declare(0,[act(dmg({q:query(win('before',1,'round'),'foe',cat('atk'),'count'),mult:1},unit(3)))],1));ev=m.resolve();assert(ev.some(e=>e.effect==='quote'&&e.amount===0));
console.log('4 actual-engine trace cases passed: exact strip target, global sentence postpone, reflection, quote');


import assert from "node:assert/strict";
import { configureRules, Match, ADV, deckOk } from "../src/duanju/engine/api";
import { newGame, declare, resolveRound, nextRound, clone, canAfford, type St } from "../src/duanju/engine/interp";
import { act, dmg, heal, shield, unit, sentenceText, legal, advWordsOf, numsOf, type Assertion, type Sentence } from "../src/duanju/engine/ast";
import { tokensToAst, astToTokens, normAst, nextLegal, diagnose, fillAssertionReward } from "../src/duanju/composer/grammar";

let checks = 0;
const test = (name: string, fn: () => void) => { fn(); checks++; console.log("OK", name); };
function game(): St {
  configureRules("custom", JSON.stringify({ P: { HP: 12, HEAT_FROM: 99, AP0: 30, APCAP: 30, WIND_N: 0, TL: 10, CARDS0: [2,2,2,2,3,3,4,4,5,5] }, P2: { POS: 0, KW: 0, COSTREAL: 1, ORDER: 1, REP: 1, KOCHECK: 1, FIZZLE: 1, STRICT_TG: 1, TGT_AT_DECL: 1, CLASSES: 0, DICE: 0, STAUTO: 1, RMREAL: 1, REDIR: 1, POSTPONE: 1 } }));
  return newGame(0);
}
function prediction(who: Assertion["who"] = "foe", scope: Assertion["scope"] = "side", n = 1): Assertion {
  return { k: "assert", win: { dir: "after", unit: "sent", n }, who, scope, obj: { t: "word", w: "造成" }, judge: "exist", effs: [dmg(3, unit(4))], otherwise: [heal(2, unit(0))] };
}
const say = (s: St, u: number, cl: Sentence, start = 1) => assert.equal(declare(s, u < 3 ? 0 : 1, u, cl, start), true, sentenceText(cl));

test("enemy next sentence selects true branch exactly once", () => {
  const s = game(); s.hp[0] = 6;
  say(s, 0, [prediction()]); say(s, 3, [act(dmg(1, unit(1)))]); say(s, 5, [act(dmg(1, unit(1)))]);
  resolveRound(s); assert.equal(s.hp[4], 9); assert.equal(s.hp[0], 6); assert.equal(s.stand.length, 0);
});
test("nonattack selects otherwise; source is not caster", () => {
  const s = game(); s.hp[0] = 6; say(s, 0, [prediction()]); say(s, 3, [act(heal(1, unit(3)))]);
  resolveRound(s); assert.equal(s.hp[0], 8); assert.equal(s.hp[4], 12);
});
test("side first skips our declaration", () => {
  const s = game(); s.hp[0] = 6; say(s, 0, [prediction()]); say(s, 2, [act(heal(1, unit(2)))]); say(s, 3, [act(dmg(1, unit(1)))]);
  resolveRound(s); assert.equal(s.hp[4], 9); assert.equal(s.hp[0], 6);
});
test("window first counts our declaration then filters enemy", () => {
  const s = game(); s.hp[0] = 6; say(s, 0, [prediction("foe", "all")]); say(s, 2, [act(heal(1, unit(2)))]); say(s, 3, [act(dmg(1, unit(1)))]);
  resolveRound(s); assert.equal(s.hp[0], 8); assert.equal(s.hp[4], 12);
});
test("all matches either side", () => {
  const s = game(); say(s, 0, [prediction("all", "all")]); say(s, 2, [act(dmg(1, unit(5)))]);
  resolveRound(s); assert.equal(s.hp[4], 9);
});
test("our next sentence skips enemy declarations", () => {
  const s = game(); say(s, 0, [prediction("me")]); say(s, 3, [act(heal(1, unit(3)))]); say(s, 2, [act(dmg(1, unit(5)))]);
  resolveRound(s); assert.equal(s.hp[4], 9);
});
test("already declared sentence is not next", () => {
  const s = game(); s.hp[0] = 6; say(s, 3, [act(dmg(1, unit(1)))]); say(s, 0, [prediction()]); say(s, 5, [act(heal(1, unit(5)))]);
  resolveRound(s); assert.equal(s.hp[0], 8); assert.equal(s.hp[4], 12);
});
test("no next declaration expires without either branch", () => {
  const s = game(); s.hp[0] = 6; say(s, 0, [prediction()]); resolveRound(s);
  assert.equal(s.hp[0], 6); assert.equal(s.hp[4], 12); assert.equal(s.stand.length, 0);
  nextRound(s); say(s, 3, [act(dmg(1, unit(1)))]); resolveRound(s); assert.equal(s.hp[4], 12);
});
test("incomplete two-sentence window expires", () => {
  const s = game(); say(s, 0, [prediction("foe", "side", 2)]); say(s, 3, [act(dmg(1, unit(1)))]); resolveRound(s); assert.equal(s.hp[4], 12);
});
test("complete two-sentence window checks both", () => {
  const s = game(); say(s, 0, [prediction("foe", "side", 2)]); say(s, 3, [act(heal(1, unit(3)))]); say(s, 5, [act(dmg(1, unit(1)))]); resolveRound(s); assert.equal(s.hp[4], 9);
});
test("attack class reads declaration categories", () => {
  const s = game(); const c = prediction(); c.obj = { t: "cat", c: "atk" };
  say(s, 0, [c]); say(s, 3, [act(dmg(1, unit(1)))]); resolveRound(s); assert.equal(s.hp[4], 9);
});
test("absent negates the same condition", () => {
  const s = game(); const c = prediction(); c.judge = "absent";
  say(s, 0, [c]); say(s, 3, [act(heal(1, unit(3)))]); resolveRound(s); assert.equal(s.hp[4], 9);
});
test("blocked true effect never switches to otherwise", () => {
  const s = game(); s.hp[0] = 6; say(s, 4, [act(shield(5, unit(4)))]);
  say(s, 0, [prediction()]); say(s, 3, [act(dmg(1, unit(1)))]); resolveRound(s);
  assert.equal(s.hp[4], 12); assert.equal(s.hp[0], 6);
});
test("caster killed before windup fizzles", () => {
  const s = game(); s.hp[0] = 1; say(s, 0, [prediction()], 4); say(s, 3, [act(dmg(3, unit(0)))]); resolveRound(s); assert.equal(s.hp[4], 12); assert.equal(s.stand.length, 0);
});
test("pure defensive assertion can protect at the same second", () => {
  const s = game(); const c = prediction(); c.effs = [shield(2, unit(0))]; c.otherwise = [heal(2, unit(0))];
  say(s, 0, [c]); say(s, 3, [act(dmg(2, unit(0)))]); resolveRound(s); assert.equal(s.hp[0], 12);
});
test("round assertion waits for actual effects", () => {
  const s = game(); const c = prediction(); c.win.unit = "round";
  say(s, 0, [c]); say(s, 3, [act(dmg(1, unit(1)))], 5); resolveRound(s); assert.equal(s.hp[4], 9);
});
test("round no-action legitimately takes otherwise", () => {
  const s = game(); s.hp[0] = 6; const c = prediction(); c.win.unit = "round"; say(s, 0, [c]); resolveRound(s); assert.equal(s.hp[0], 8);
});
test("two-round assertion persists then resolves only once", () => {
  const s = game(); s.hp[0] = 6; const c = prediction(); c.win = { dir: "after", n: 2, unit: "round" };
  say(s, 0, [c]); resolveRound(s); assert.equal(s.hp[0], 6); assert.equal(s.stand.length, 1);
  nextRound(s); resolveRound(s); assert.equal(s.hp[0], 8); assert.equal(s.stand.length, 0);
});
test("clone evaluation does not consume live assertion", () => {
  const s = game(); say(s, 0, [prediction()]); say(s, 3, [act(dmg(1, unit(1)))]);
  resolveRound(clone(s)); assert.equal(s.stand[0].fired, 0); assert.equal(s.hp[4], 12); resolveRound(s); assert.equal(s.hp[4], 9);
});
const suffix = ["存在", "词:造成", "奖励", "造成", "1", "@4", "否则", "恢复", "1", "@0"];
for (const head of [["对方", "以后", "1", "句"], ["我方", "以后", "1", "句"], ["以后", "1", "句", "对方"], ["以后", "1", "句", "任意"], ["任意", "以后", "1", "轮"]]) {
  test("grammar roundtrip " + head.join(" "), () => {
    game(); const ts = ["断言", ...head, ...suffix]; const cl = tokensToAst(ts)!; assert.ok(cl);
    assert.equal(normAst(tokensToAst(astToTokens(cl))!), normAst(cl));
    const s = game(); for (let i = 0; i < ts.length; i++) assert.ok(nextLegal(ts.slice(0, i), { s, side: 0, unit: 0 }).ok.has(ts[i]), "rejected prefix " + ts.slice(0, i+1).join(" "));
    assert.equal(diagnose(cl, { s, side: 0, unit: 0 }), null); assert.ok(canAfford(s, 0, cl, 0));
  });
}
test("otherwise is rejected outside assertion", () => {
  game(); for (const ts of [["造成", "1", "@4"], ["若", "1", "句", "对方", ...suffix.slice(0, 6).map(t => t === "奖励" ? "则" : t)], ["每当", "1", "轮", "对方", ...suffix.slice(0, 6).map(t => t === "奖励" ? "则" : t)]]) assert.equal(tokensToAst([...ts, "否则", "恢复", "1", "@0"]), null);
});
test("otherwise is optional, cannot be empty or repeated", () => {
  game(); const ts = ["断言", "对方", "以后", "1", "句", ...suffix]; assert.ok(tokensToAst(ts.slice(0, -4)));
  assert.equal(tokensToAst([...ts, "否则", "造成", "1", "@4"]), null); assert.equal(tokensToAst(ts.slice(0, -3)), null);
});
test("branches reserve numbers and advanced words up front", () => {
  const s = game(); const c = prediction(); c.otherwise = [shield(2, unit(0))];
  assert.deepEqual(advWordsOf([c]), ["断言", "减伤"]); assert.ok(numsOf(c).includes(2));
  s.deck[0] = { 断言: 1 }; assert.equal(canAfford(s, 0, [c], 0), null); s.deck[0].减伤 = 1; say(s, 0, [c]); assert.equal(s.deck[0].断言, 0); assert.equal(s.deck[0].减伤, 0);
});
test("invalid assertion windows and repeating shield are rejected", () => {
  game(); const c = prediction(); for (const n of [0, 99]) assert.equal(legal([{ ...c, win: { ...c.win, n } }]), false);
  assert.equal(legal([{ ...c, otherwise: [{ ...shield(2, unit(0)), rep: 2 }] }]), false);
});
test("match replay exposes branch outcome and deck accepts assertion", () => {
  configureRules("default"); assert.equal(ADV.断言.price, 3); assert.ok(deckOk({ 断言: 2, 减伤: 2 }));
  const m = new Match({ first: 0, myDeck: { 断言: 1 }, foeDeck: {}, tier: "入门", kws: ["", "", ""], seed: 2 });
  const c = prediction(); c.effs = [dmg(1, unit(4))]; c.otherwise = [heal(1, unit(0))];
  assert.ok(m.declare(0, [c], 1)); assert.ok(m.foeDeclare(3, [act(heal(1, unit(3)))], 1));
  assert.ok(m.resolve().some((e) => e.text === "断言不成立：执行否则分支"));
});
const prefix = ["断言","对方","以后","1","句","存在","词:造成","奖励","恢复","1","@0","否则"];
for (const tail of [
  ["灼烧","@4","1"], ["易伤","@4","1"], ["衰弱","@4","1"],
  ["定时","1","造成","1","@4"], ["每当","1","轮","对方","存在","词:造成","则","造成","1","@4"],
  ["不得","1","词:造成","罚","1"], ["转移","@0"], ["移除","@4"], ["延后","第1句","1"], ["兑现"],
  ["造成","1","@4","并","恢复","1","@0"],
  ["断言","我方","以后","1","句","存在","词:恢复","奖励","造成","1","@4","否则","恢复","1","@0"],
]) test("otherwise accepts legal consequence " + tail.join(" "), () => {
  const s = game(); const ts = [...prefix,...tail]; const cl = tokensToAst(ts);
  assert.ok(cl, ts.join(" ")); assert.ok(legal(cl));
  assert.equal(normAst(tokensToAst(astToTokens(cl))!),normAst(cl));
  if (tail[0] === "延后") say(s,5,[act(dmg(1,unit(1)))],5);
  say(s,0,cl); say(s,3,[act(heal(1,unit(3)))]); resolveRound(s);
});
test("otherwise status and redirect both take effect", () => {
  const s=game(); const cl=tokensToAst([...prefix,"灼烧","@4","2","并","转移","@0"])!;
  say(s,0,cl); say(s,3,[act(heal(1,unit(3)))]); say(s,5,[act(dmg(2,unit(0)))],4); resolveRound(s);
  assert.equal(s.hp[0],12); assert.equal(s.hp[5],10); assert.equal(s.hp[4],11);
});
test("otherwise delayed sentence starts when selected", () => {
  const s=game(); const cl=tokensToAst([...prefix,"定时","2","造成","3","@4"])!;
  say(s,0,cl); say(s,3,[act(heal(1,unit(3)))]); resolveRound(s);
  assert.equal(s.hp[4],12); assert.equal(s.stand.filter(x=>x.c.k==="delay").length,1);
  nextRound(s); resolveRound(s); assert.equal(s.hp[4],9);
});
test("otherwise resources are reserved even when unused", () => {
  const s=game(); s.deck[0]={断言:1}; const cl=tokensToAst([...prefix,"灼烧","@4","1"])!;
  assert.equal(canAfford(s,0,cl,0),null); s.deck[0].灼烧=1; say(s,0,cl); say(s,3,[act(dmg(1,unit(1)))]); resolveRound(s);
  assert.equal(s.deck[0].灼烧,0); assert.equal(s.sts.length,0);
});
test("otherwise does not bypass repetition restriction", () => {
  game(); const cl=tokensToAst([...prefix,"减伤","2","@0","重复","2"])!; assert.ok(cl); assert.equal(legal(cl),false);
});
test("nested sentence assertion born at round end observes next round", () => {
  const s=game(); const inner=tokensToAst(["断言","对方","以后","1","句","存在","词:造成","奖励","造成","1","@4","否则","恢复","1","@0"])!;
  const outer=prediction(); outer.win.unit="round"; outer.alternatives=inner;
  say(s,0,[outer]); resolveRound(s); assert.equal(s.hp[4],12);
  nextRound(s); say(s,3,[act(dmg(1,unit(1)))]); resolveRound(s); assert.equal(s.hp[4],11);
});
test("otherwise standing listens only after selection", () => {
  const s=game(); const cl=tokensToAst([...prefix,"每当","1","轮","对方","存在","词:造成","则","造成","1","@4"])!;
  say(s,0,cl); say(s,3,[act(heal(1,unit(3)))]); say(s,4,[act(dmg(1,unit(1)))],5); say(s,5,[act(dmg(1,unit(1)))],6); resolveRound(s);
  assert.equal(s.hp[4],11); assert.equal(s.hp[1],10);
});
test("both branches may independently use the same action in 并 class", () => {
  const s=game(); configureRules("custom",JSON.stringify({P2:{CLASSES:1}})); s.cls[0]="并";
  const cl=tokensToAst([...prefix.slice(0,8),"造成","1","@4","否则","造成","1","@5"])!;
  assert.ok(cl); assert.equal(diagnose(cl,{s,side:0,unit:0}),null);
});
test("奖励 autofills only when the complete assertion condition is ready", () => {
  game(); const ts=prefix.slice(0,7);
  assert.deepEqual(fillAssertionReward(ts),[...ts,"奖励"]);
  assert.deepEqual(fillAssertionReward(ts.slice(0,-1)),ts.slice(0,-1));
  assert.deepEqual(fillAssertionReward([...ts,"奖励"]),[...ts,"奖励"]);
  assert.deepEqual(fillAssertionReward(["若","1","轮","对方","存在","词:造成"]),["若","1","轮","对方","存在","词:造成"]);
});
test("状态 class checks each exclusive branch without mixing them", () => {
  const s=game(); configureRules("custom",JSON.stringify({P2:{CLASSES:1,STAUTO:1}})); s.cls[0]="状态";
  const cl=tokensToAst(["断言","对方","以后","1","句","存在","词:造成","奖励","灼烧","@4","1","否则","易伤","@4","1"])!;
  assert.ok(canAfford(s,0,cl,0));
  const bad=tokensToAst([...prefix,"灼烧","@4","1","并","易伤","@4","1"])!;
  assert.equal(canAfford(s,0,bad,0),null);
});
test("otherwise 不得 preserves legal punishment above direct-attack cap", () => {
  const s=game(); configureRules("custom",JSON.stringify({P2:{CLASSES:1,CAP_LIM:2}})); s.cls[0]="限制";
  const cl=tokensToAst([...prefix,"不得","1","词:造成","罚","3"])!;
  assert.ok(canAfford(s,0,cl,0));
  assert.equal(canAfford(s,0,tokensToAst([...prefix,"造成","3","@4"])!,0),null);
});
console.log(`断言测试通过：${checks} 项`);

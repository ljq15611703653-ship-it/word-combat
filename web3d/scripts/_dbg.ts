import { configureRules, sentenceText } from "../src/duanju/engine/api";
import { newGame, declare, passUnit, nextSide, resolveRound, nextRound } from "../src/duanju/engine/interp";
import { mulberry32 } from "../src/duanju/engine/gen";
import { aiNew, aiOld, naive, deckOfClass } from "./duanju-ai-lib";
configureRules("default");
const [,, ca="并", cb="并", tier="大师", sd="5"] = process.argv;
const r = mulberry32(+sd);
const s = newGame(0, [deckOfClass(ca as any), deckOfClass(cb as any)], false, [null, null]);
const mv = [aiNew(tier), aiNew(tier)];
const nm=(u:number)=>`${u<3?"甲":"乙"}${u%3+1}`;
for (let g = 0; g < 8 && s.win < 0; g++) {
  for (let k = 0; k < 14; k++) { const w = nextSide(s); if (w === -1) break; const m = mv[w](s, w as 0|1, r);
    console.log(`  ${nm(m.unit)}@${m.start}`, m.cl ? sentenceText(m.cl).replace(/([甲乙])方(\d)号\S{2}随从/g,(_,a,b)=>a+b) : "pass");
    if (m.cl && declare(s, w as 0|1, m.unit, m.cl, m.start)) {} else passUnit(s, m.unit); s.turn = (1 - s.turn) as 0|1; }
  const cd=(x:number)=>s.side[x as 0|1].cards.map(c=>c.v+(c.cd?"'":"")).join("");
  resolveRound(s); console.log("rnd", s.rnd, "hp", s.hp.join(","), "win", s.win, "ap", s.side[0].ap, s.side[1].ap, "cards", cd(0), cd(1)); if (s.win < 0) nextRound(s);
}

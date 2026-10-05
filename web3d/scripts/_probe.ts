// 探针（不提交）：node node_modules/tsx/dist/cli.mjs scripts/_probe.ts <deckjson> <句子词序列...>
import { Match, configureRules, setUnitNames, sentenceText } from "../src/duanju/engine/api";
import { parseTokens } from "../src/duanju/composer/grammar";
import { canAfford, windupFor } from "../src/duanju/engine/interp";
import rulesDefault from "../src/duanju/engine/rules.default.json";
const j = JSON.parse(JSON.stringify(rulesDefault));
Object.assign(j.P, { HEAT_FROM: 99, SCHEDULE: {}, CARDS0: [2, 3] }); Object.assign(j.P2, { POS: 0, KW: 0 });
configureRules("custom", JSON.stringify(j));
setUnitNames(["叶栖", "小满", "柯谦"], ["甲", "乙", "丙"]);
const deck = JSON.parse(process.argv[2]);
const m = new Match({ first: 0, myDeck: deck, tier: "入门", seed: 1, foeDeck: {} });
m.s.deck[0] = deck;
for (const sent of process.argv.slice(3)) {
  const toks = sent.split(" ");
  const p = parseTokens(toks);
  if (!p.ast) { console.log("PARSE FAIL", sent, p.err, p.complete); continue; }
  const a = canAfford(m.s, 0, p.ast, 0);
  console.log(sent, "=>", sentenceText(p.ast), "| afford", JSON.stringify(a), "windup", windupFor(p.ast, 0, m.s));
}

// 最终规则回归：1) 引擎能生成/展示的所有文本不含「全体」「最低血」 2) 累计 +2 行动点 3) 数字牌节奏 4) 倒下投骰（可复现、一次性牌）
// 用法：node node_modules/tsx/dist/cli.mjs scripts/duanju-rules-test.ts [局数=12]
import { readFileSync } from "node:fs";
import { Match, configureRules, DECK_WORDS, TIER_NAMES, P, P2, sentenceText, type Sentence } from "../src/duanju/engine/api";
import { sentenceCost } from "../src/duanju/engine/ast";
import { candidates, mulberry32 } from "../src/duanju/engine/gen";
import { vocabulary, tokenLabel, astToTokens } from "../src/duanju/composer/grammar";
import { newGame, resolveRound, declare, nextRound, pickCards } from "../src/duanju/engine/interp";

const BAD = /全体|最低血/;
let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.error("FAIL", m); } else console.log("ok  ", m); };
configureRules("default");

// ---- 规则落点
ok(JSON.stringify(P.CARDS0) === "[2,2,2,2,3]" && JSON.stringify(P.SCHEDULE) === '{"3":[2],"5":[3],"7":[3]}', "默认规则：开局牌 [2,2,2,2,3]，第3/5/7轮发 2/3/3");
ok(P2.SUM_AP === 2 && P2.DICE === 1, "默认规则：SUM_AP=2，DICE=1");
const qsum = { q: { win: { dir: "before", n: 1, unit: "round" }, who: "foe", obj: { t: "cat", c: "dealt" }, agg: "sum", tight: 1 }, mult: 1 } as any;
const withSum: Sentence = [{ k: "act", eff: { verb: "dmg", n: qsum, tg: { t: "unit", u: 3 } } }] as any;
const withCnt: Sentence = [{ k: "act", eff: { verb: "dmg", n: { ...qsum, q: { ...qsum.q, agg: "count" } }, tg: { t: "unit", u: 3 } } }] as any;
ok(sentenceCost(withSum, 2) - sentenceCost(withCnt, 2) === 2, `累计比次数多 2 点行动点（${sentenceCost(withSum, 2)} vs ${sentenceCost(withCnt, 2)}）`);

// ---- 文本扫描
const texts: string[] = [];
const rec = (t: string) => { texts.push(t); };
for (const t of vocabulary()) rec(tokenLabel(t)), rec(t);
for (const w of DECK_WORDS.words) rec(w.desc), rec(w.example), rec(w.name);
rec(readFileSync("public/duanju/story/curriculum.json", "utf8"));
const N = +(process.argv[2] ?? 12);
const r = mulberry32(5);
for (let i = 0; i < N; i++) {
  configureRules("default");
  const m = new Match({ first: (i % 2) as 0 | 1, myDeck: { 并: 3, 减伤: 3, 累计: 2, 次数: 2, 不得: 2, 定时: 2 }, tier: TIER_NAMES[i % 4], seed: 300 + i });
  let guard = 0;
  while (!m.over() && guard++ < 30) {
    for (let g = 0; g < 14; g++) {
      const w = m.who(); if (w === -1) break;
      if (w === 1) { const a = m.aiMove(); rec(a.text); continue; }
      const u = m.myUnits().find((x) => m.canAct(x))!;
      for (const c of m.legalSentences(u, 40)) { rec(c.text); try { astToTokens(c.cl).forEach((t) => rec(tokenLabel(t))); } catch { /* Unsupported */ } if (/@/.test(sentenceText(c.cl))) rec(sentenceText(c.cl)); }
      for (const mode of ["free", "playbook", "plain", "basic"] as const) for (const cl of candidates(m.s, 0, u, r, 30, mode)) rec(sentenceText(cl)), rec(m.legalSentences(u, 1)[0]?.text ?? "");
      const c = m.legalSentences(u, 30);
      if (c.length && r() < 0.8) { const x = c[Math.floor(r() * c.length)]; if (!m.declare(u, x.cl, x.minStart)) m.pass(u); } else m.pass(u);
    }
    for (const e of m.resolve()) rec(e.text);
    for (const h of m.history) rec(h.text);
    if (!m.over()) m.nextRound();
  }
}
const bad = texts.filter((t) => BAD.test(t));
ok(bad.length === 0, `扫描 ${texts.length} 段文本（词表/词牌库/教程/候选句/电脑出句/回放），无「全体」「最低血」${bad.length ? "：" + bad.slice(0, 3).join(" | ") : ""}`);

// ---- 数字牌节奏
{
  const s = newGame(0);
  ok(s.side[0].cards.map((c) => c.v).join() === "2,2,2,2,3", "开局手牌 2,2,2,2,3");
  const got: string[] = [];
  for (let k = 0; k < 8; k++) { nextRound(s); got.push(`${s.rnd}:${s.side[0].cards.length}`); }
  ok(got.join(" ") === "2:5 3:6 4:6 5:7 6:7 7:8 8:8 9:8", "发牌：仅第 3/5/7 轮各发 1 张 → " + got.join(" "));
}
// ---- 骰子
const play = (seed: number) => {
  const m = new Match({ first: 0, myDeck: {}, tier: "入门", seed });
  const dice: string[] = []; let guard = 0;
  while (!m.over() && guard++ < 14) {
    for (let g = 0; g < 14; g++) { const w = m.who(); if (w === -1) break; if (w === 1) m.aiMove(); else m.autoMyMove(); }
    for (const e of m.resolve()) if (e.type === "dice") dice.push(`${m.rnd}:${e.tgt}:${e.amount}`);
    if (!m.over()) m.nextRound();
  }
  return dice.join(",");
};
const d1 = play(11), d2 = play(11);
ok(d1 === d2 && d1.length > 0, "同种子骰子结果可复现：" + d1);
{
  const s = newGame(0); const before = s.side[0].cards.length;
  s.hp[1] = 0; s.dead[1] = true;   // 手动制造一次倒下走不到 koNow，改用 rollDown
  const { rollDown } = await import("../src/duanju/engine/interp");
  rollDown(s, 1); rollDown(s, 2);
  const nw = s.side[0].cards.slice(before);
  ok(nw.length === 2 && nw.every((c) => c.once && c.v >= 1 && c.v <= 6), "每倒下一个随从各投一次，得到一次性牌 " + nw.map((c) => c.v).join("+"));
  // 一次性牌被用掉后消失（不是冷却）
  s.side[0].cards = [{ v: 6, cd: 0, once: true }]; s.side[0].ap = 9;
  const cl: Sentence = [{ k: "act", eff: { verb: "dmg", n: 5, tg: { t: "unit", u: 3 } } }] as any;
  ok(declare(s, 0, 0, cl, 2) && s.side[0].cards.length === 0, "骰牌 6 满足「牌面≥数字」(伤害5)，用掉后直接消失");
}
console.log(fails ? `${fails} 项失败` : "全部通过"); process.exit(fails ? 1 : 0);

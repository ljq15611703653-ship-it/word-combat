// 按句型专项往返：对 when 引用量词(累计/词数/段数)、延后、转移、重复、定时、兑现、无视、移除(拆) 各至少 50 条不同句子，
// 句子来自 genSentence（随机语法）+ playbook（手册）在多个局面上生成（只测往返，不要求付得起）。
// 用法：node node_modules/tsx/dist/cli.mjs scripts/composer-coverage.ts
import { Match, configureRules, DECK_WORDS, deckOk, P } from "../src/duanju/engine/api";
import { genSentence, mulberry32 } from "../src/duanju/engine/gen";
import { expandTg, playbook } from "../src/duanju/engine/playbook";
import { postpone, redirect, unit, type Sentence, type Clause } from "../src/duanju/engine/ast";
import { astToTokens, tokensToAst, normAst } from "../src/duanju/composer/grammar";
import { unitsOf } from "../src/duanju/engine/interp";

const feats: Record<string, (cl: Sentence) => boolean> = {
  "when·引用量词(累计/词数/段数)": (cl) => cl.some((c) => (c.k === "when" && c.q.agg !== "count") || (c.k === "act" && typeof c.eff.n !== "number" && c.eff.n.q.agg !== "count") || (c.k === "when" && c.effs.some((e) => typeof e.n !== "number" && e.n.q.agg !== "count"))),
  "引用量(任意 agg)作数字": (cl) => cl.some((c) => (c.k === "act" && typeof c.eff.n !== "number") || ((c.k === "when" || c.k === "delay") && c.effs.some((e) => typeof e.n !== "number"))),
  "延后": (cl) => cl.some((c) => c.k === "postpone"),
  "转移": (cl) => cl.some((c) => c.k === "redirect"),
  "重复": (cl) => cl.some((c) => c.k === "act" && (c.eff.rep ?? 1) > 1),
  "定时": (cl) => cl.some((c) => c.k === "delay"),
  "兑现": (cl) => cl.some((c) => c.k === "cash"),
  "无视(长期句)": (cl) => cl.some((c) => c.k === "ignore"),
  "无视(穿透减伤)": (cl) => cl.some((c) => c.k === "act" && c.eff.ignore),
  "移除(拆敌人)": (cl) => cl.some((c) => c.k === "strip"),
  "每当(以后窗口)": (cl) => cl.some((c) => c.k === "when" && c.q.win.dir === "after" && !c.forbid),
  "若(之前窗口,含全程)": (cl) => cl.some((c) => c.k === "when" && c.q.win.dir === "before"),
  "不得": (cl) => cl.some((c) => c.k === "when" && c.forbid),
  "若成功/若失败": (cl) => cl.some((c) => c.k === "act" && c.ifPrev),
  "并(多段)": (cl) => cl.length > 1,
  "状态词": (cl) => cl.some((c) => c.k === "status"),
};
const sets = Object.fromEntries(Object.keys(feats).map((k) => [k, new Map<string, Sentence>()])) as Record<string, Map<string, Sentence>>;
const add = (cl: Sentence) => { const key = JSON.stringify(cl); for (const [f, t] of Object.entries(feats)) if (t(cl) && sets[f].size < 400 && !sets[f].has(key)) sets[f].set(key, cl); };
configureRules("default");
const ps = DECK_WORDS.presets.filter((p) => deckOk(p.deck));
for (let i = 0; i < 40; i++) {
  const m = new Match({ first: 0, myDeck: ps[i % ps.length].deck, tier: "普通", seed: 900 + i });
  const r = mulberry32(77 + i);
  for (let round = 0; round < 3; round++) { m.aiMove(); }
  const foes = unitsOf(1), mine = unitsOf(0);
  const e = { s: m.s, side: 0 as const, unit: i % 3, r, maxN: 4, foes, mine };
  for (let k = 0; k < 900; k++) { const g = genSentence(e as any, true); expandTg(e as any, g, true).forEach(add); }
  playbook(e as any).forEach((x: any) => expandTg(e as any, x.cl ?? x, true).forEach(add));
  for (const d of m.s.decl) for (let n = 1; n <= 4; n++) add([postpone(d.ord, n)]);
  for (let o = 0; o < 6; o++) for (let n = 1; n <= P.TL; n += 3) add([postpone(o, n)]);
  for (const u of mine) { add([redirect(unit(u))]); add([redirect({ t: "units", us: mine })]); add([redirect({ t: "units", us: mine.slice(0, 2) })]); }
  m.resolve();
}
let allOk = true; let tot = 0, ok = 0;
for (const [f, mp] of Object.entries(sets)) {
  let good = 0; const bad: string[] = [];
  for (const cl of mp.values()) { let t: string[] | null = null; try { t = astToTokens(cl); } catch (e) { bad.push("不支持 " + String((e as Error).message)); continue; } const b = tokensToAst(t); if (b && normAst(b) === normAst(cl)) good++; else bad.push(t.join(" ")); }
  tot += mp.size; ok += good;
  console.log(`${f.padEnd(26)} 句子 ${String(mp.size).padStart(3)}  往返等价 ${good}（${((good / Math.max(1, mp.size)) * 100).toFixed(1)}%）${mp.size < 50 ? "  ※不足 50 条" : ""}${bad.length ? "  失败例：" + bad[0].slice(0, 120) : ""}`);
  if (good < mp.size) allOk = false;
}
console.log(`合计 ${tot} 条，往返等价 ${ok}`);
process.exit(allOk ? 0 : 1);

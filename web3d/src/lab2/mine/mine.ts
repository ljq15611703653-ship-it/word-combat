// 海量句子挖掘：以手册句 + gen.ts 语法片段为种子，做变异/交叉，按结构规范化 key 去重，只留「说得出口」的句子。
// 运行：node --import tsx src/lab2/mine/mine.ts            环境变量 N=10000 SEED=1 OUT=D:/wc/mine
// 输出：$OUT/sentences.jsonl（一行一句：id、规范化 key、中文、家族、用到的进阶词、费用、长度、AST）与 sentences.meta.json
import { writeFileSync, createWriteStream } from "node:fs";
import { OUT } from "./mineenv";
import { playbookNamed } from "../playbook";
import { genSentence, mulberry32, type Env } from "../gen";
import { advWordsOf, sentenceCost, type Sentence, type Clause } from "../ast";
import { family, fixup, mutate, crossover, normKey, playable, pick, jclone, deckPrice, refState, fullText, FAMILIES } from "./minelib";

export interface SentRec { id: number; key: string; text: string; family: string; adv: string[]; cost: number; len: number; deck: number; src: string; cl: Sentence }

const N = +(process.env.N ?? 10000), SEED = +(process.env.SEED ?? 1);
const PLAIN_CAP = +(process.env.PLAIN_CAP ?? 0.04);       // 「普通攻击/自保」两类各自不超过总量的这个比例（它们是基线，不需要海量）
const r = mulberry32(SEED);
const t0 = Date.now();

// ---- 种子：手册句 + gen 语法随机句（假装一个资源充足的局面，让 gen 的数字范围放开）
const seeds: { cl: Sentence; src: string }[] = [];
for (const x of playbookNamed()) seeds.push({ cl: jclone(x.cl), src: "手册:" + x.name });
{
  const s = refState(8);
  const e: Env = { s, side: 0, unit: 0, r, maxN: 4, foes: [3, 4, 5], mine: [0, 1, 2] };
  for (let i = 0; i < 3000; i++) seeds.push({ cl: genSentence(e, true), src: "语法" });
}
const lib = new Map<string, SentRec>();
const byFam: Record<string, SentRec[]> = {};
let attempts = 0, invalid = 0, dup = 0;
function tryAdd(cl0: Sentence | null, src: string): boolean {
  attempts++;
  if (!cl0) { invalid++; return false; }
  const cl = fixup(jclone(cl0), r);
  if (!cl || !playable(cl)) { invalid++; return false; }
  const key = normKey(cl);
  if (lib.has(key)) { dup++; return false; }
  const fam = family(cl);
  const cap = (fam === "普通攻击" || fam === "自保") ? Math.max(20, Math.floor(N * PLAIN_CAP)) : Infinity;
  if ((byFam[fam]?.length ?? 0) >= cap) { invalid++; return false; }
  const rec: SentRec = { id: lib.size, key, text: fullText(cl), family: fam, adv: advWordsOf(cl), cost: sentenceCost(cl, 1, -1), len: cl.length, deck: deckPrice(cl), src, cl };
  lib.set(key, rec); (byFam[fam] ??= []).push(rec);
  return true;
}
for (const sd of seeds) tryAdd(sd.cl, sd.src);
const nSeed = lib.size;
const pool: Clause[] = [...lib.values()].flatMap((x) => x.cl);
const all = () => [...lib.values()];
// ---- 变异 / 交叉：父代 = 先均匀挑家族、再在家族里挑个体（保证稀有家族也被充分扩展）；手册句权重加倍
let arr = all();
const pbRecs = arr.filter((x) => x.src.startsWith("手册"));
let stall = 0;
while (lib.size < N && attempts < N * 400 && stall < N * 60) {
  const before = lib.size;
  const fams = Object.keys(byFam).filter((f) => byFam[f].length);
  const parent = r() < 0.15 && pbRecs.length ? pick(r, pbRecs) : pick(r, byFam[pick(r, fams)]);
  let child: Sentence;
  if (r() < 0.2) { const o = pick(r, byFam[pick(r, fams)]); child = crossover(parent.cl, o.cl, r); }
  else { child = mutate(parent.cl, r, pool); const k = r(); if (k < 0.35) child = mutate(child, r, pool); if (k < 0.1) child = mutate(child, r, pool); }
  tryAdd(child, "变异");
  stall = lib.size > before ? 0 : stall + 1;
  if (lib.size % 2000 === 0 && lib.size > before) { /* 进度点 */ }
}
const recs = all();
const ws = createWriteStream(`${OUT}/sentences.jsonl`);
for (const x of recs) ws.write(JSON.stringify(x) + "\n");
ws.end();
const famCount: Record<string, number> = {};
for (const x of recs) famCount[x.family] = (famCount[x.family] ?? 0) + 1;
const meta = {
  n: recs.length, seeds: nSeed, attempts, invalid, dup, seconds: +((Date.now() - t0) / 1000).toFixed(1), seed: SEED,
  rules: { LAB: process.env.LAB ?? "", LAB2: process.env.LAB2 ?? "" },
  families: Object.fromEntries(FAMILIES.map((f) => [f, famCount[f] ?? 0])),
  avgLen: +(recs.reduce((a, x) => a + x.len, 0) / recs.length).toFixed(2),
  avgCost: +(recs.reduce((a, x) => a + x.cost, 0) / recs.length).toFixed(2),
};
writeFileSync(`${OUT}/sentences.meta.json`, JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta));

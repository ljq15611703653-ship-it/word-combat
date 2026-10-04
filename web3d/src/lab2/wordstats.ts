// 逐词体检：随机卡组大量对战，按词统计「被用了多少」「用过它的局胜率」「实际拼出的句子」。给人读，不打分。
// 运行：node --import tsx src/lab2/wordstats.ts   （环境变量 OUT BASE ND K WORKERS SEED RULES）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const OUT = process.env.OUT ?? "D:/wc/out8";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "D:/wc/out";
if (existsSync(`${BASE}/rules.json`)) process.env.LAB = readFileSync(`${BASE}/rules.json`, "utf8");
if (existsSync(`${BASE}/rules2.json`)) process.env.LAB2 = readFileSync(`${BASE}/rules2.json`, "utf8");
const { Pool } = await import("./pool");
const { ADV, ADV_WORDS, applyRules } = await import("./params");
const { randDeck, deckKey } = await import("./deck");
const { mulberry32 } = await import("./gen");
const { sentenceText } = await import("./ast");
type Task = import("./worker").Task;
type Rules = import("./params").Rules;

const ND = +(process.env.ND ?? 80), K = +(process.env.K ?? 40), SEED = +(process.env.SEED ?? 5);
const rules: Rules | undefined = process.env.RULES ? JSON.parse(process.env.RULES) : undefined;
const CFG = { k: 8, depth: 2, w: [1, 0.7, 0.5], passBias: 0, mode: "playbook" as const, wAp: 0.3, wCard: 0.4, recBonus: 0.5 };
const shape = (t: string) => t.replace(/\d+(?=级|轮|句|次|条)/g, "N").replace(/随从\d/g, "随从").replace(/\d+/g, "N");

if (rules) applyRules(rules);
const r = mulberry32(SEED);
const decks = Array.from({ length: ND }, () => randDeck(r));
const tasks: (Task & { i: number; j: number })[] = [];
let id = 0;
for (let i = 0; i < ND; i++) for (let g = 0; g < K / 2; g++) { let j = Math.floor(r() * (ND - 1)); if (j >= i) j++; tasks.push({ id: id++, i, j, a: decks[i], b: decks[j], seed: SEED * 1000 + id * 7, first: (g % 2) as 0 | 1, cfg: CFG, rec: true, rules }); }
const pool = new Pool(+(process.env.WORKERS ?? 18));
const t0 = Date.now();
const outs = await pool.run(tasks);
pool.close();

interface Acc { used: number; usedWin: number; games: number; uses: number; inDeck: number; inDeckWin: number; inDeckGames: number; shapes: Record<string, number> }
const acc: Record<string, Acc> = Object.fromEntries(ADV_WORDS.map((w) => [w, { used: 0, usedWin: 0, games: 0, uses: 0, inDeck: 0, inDeckWin: 0, inDeckGames: 0, shapes: {} }]));
let rounds = 0, firstWon = 0, decided = 0, sides = 0, wins = 0;
const lenByWin: number[] = [];
for (const o of outs) {
  const t = tasks[o.id]; rounds += o.rounds;
  if (o.win === 0 || o.win === 1) { decided++; if (o.win === t.first) firstWon++; }
  for (const side of [0, 1] as const) {
    const deck = side === 0 ? t.a : t.b; const score = o.win === side ? 1 : o.win === 2 || o.win < 0 ? 0.5 : 0; sides++; wins += score;
    for (const w of ADV_WORDS) {
      const a = acc[w], used = o.stats[`s${side}:w:${w}`] ?? 0;
      a.games++; a.uses += used;
      if (used > 0) { a.used++; a.usedWin += score; }
      if ((deck[w] ?? 0) > 0) { a.inDeckGames++; a.inDeckWin += score; }
    }
    for (const [k, v] of Object.entries(o.shapes![side])) for (const w of ADV_WORDS) if (k.includes(w === "并" ? " 并 " : w) ) { acc[w].shapes[k] = (acc[w].shapes[k] ?? 0) + v; }
  }
  lenByWin.push(o.rounds);
}
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
let md = `# 逐词体检（${ND} 副随机卡组，约 ${tasks.length} 局，${((Date.now() - t0) / 1000).toFixed(0)} 秒；平均 ${(rounds / tasks.length).toFixed(1)} 轮，先手方胜率 ${pct(firstWon / Math.max(1, decided))}）\n\n规则：${JSON.stringify(rules ?? {})}；基线 LAB=${process.env.LAB ?? ""} LAB2=${process.env.LAB2 ?? ""}\n\n| 词 | 价格×最多 | 带它的卡组胜率 | 实际用过的局占比 | 每局平均用几次 | 用过它的局胜率 |\n|---|---|---|---|---|---|\n`;
for (const w of ADV_WORDS) {
  const a = acc[w];
  md += `| ${w} | ${ADV[w].price}×${ADV[w].max} | ${pct(a.inDeckWin / Math.max(1, a.inDeckGames))}（${a.inDeckGames}局） | ${pct(a.used / a.games)} | ${(a.uses / a.games).toFixed(2)} | ${a.used ? pct(a.usedWin / a.used) : "-"}（${a.used}局） |\n`;
}
md += `\n## 各词最常见的实际句子（前 3 条）\n`;
for (const w of ADV_WORDS) { const top = Object.entries(acc[w].shapes).sort((a, b) => b[1] - a[1]).slice(0, 3); md += `- **${w}**：${top.map(([k, v]) => `${k}（${v}）`).join("；") || "（几乎没出现）"}\n`; }
writeFileSync(`${OUT}/逐词体检.md`, md);
console.log(md.split("\n## ")[0]);
void sentenceText; void deckKey; void wins; void sides; void lenByWin;
process.exit(0);

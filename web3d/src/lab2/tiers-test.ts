// 难度分级验证：同一副卡组，四档互打（先后手各半）。运行：node --import tsx src/lab2/tiers-test.ts
import { readFileSync, existsSync } from "node:fs";
const OUT = process.env.OUT ?? "D:/wc/out";
if (existsSync(`${OUT}/rules.json`)) process.env.LAB = readFileSync(`${OUT}/rules.json`, "utf8");
if (existsSync(`${OUT}/rules2.json`)) process.env.LAB2 = readFileSync(`${OUT}/rules2.json`, "utf8");
const { Pool } = await import("./pool");
const { TIERS, TIER_NAMES } = await import("./tiers");
type Task = import("./worker").Task;
const deck = { 并: 2, 减伤: 2, 无视: 1, 收紧: 1, 定时: 1 };
const N = +(process.env.N ?? 40);
const pool = new Pool(+(process.env.WORKERS ?? 6));
const tasks: (Task & { i: number; j: number })[] = [];
let id = 0;
for (let i = 0; i < TIER_NAMES.length; i++) for (let j = i + 1; j < TIER_NAMES.length; j++) for (let g = 0; g < N; g++)
  tasks.push({ id: id++, i, j, a: deck, b: deck, seed: 52000 + id * 13, first: (g % 2) as 0 | 1, cfg: [TIERS[TIER_NAMES[i]], TIERS[TIER_NAMES[j]]] });
const outs = await pool.run(tasks); pool.close();
const n = TIER_NAMES.length, sc = Array.from({ length: n }, () => Array(n).fill(0)), cnt = Array.from({ length: n }, () => Array(n).fill(0)); const rounds = Array(n).fill(0), games = Array(n).fill(0);
for (const o of outs) { const t = tasks[o.id]; const a = o.win === 0 ? 1 : o.win === 1 ? 0 : 0.5; sc[t.i][t.j] += a; sc[t.j][t.i] += 1 - a; cnt[t.i][t.j]++; cnt[t.j][t.i]++; rounds[t.i] += o.rounds; rounds[t.j] += o.rounds; games[t.i]++; games[t.j]++; }
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
let md = `| | ${TIER_NAMES.join(" | ")} | 总 | 平均轮数 |
|---|${TIER_NAMES.map(() => "---").join("|")}|---|---|
`;
TIER_NAMES.forEach((nm, i) => { md += `| ${nm} | ${TIER_NAMES.map((_, j) => (i === j ? "—" : pct(sc[i][j] / cnt[i][j]))).join(" | ")} | **${pct(sc[i].reduce((a, b) => a + b, 0) / cnt[i].reduce((a, b) => a + b, 0))}** | ${(rounds[i] / games[i]).toFixed(1)} |
`; });
console.log(md);

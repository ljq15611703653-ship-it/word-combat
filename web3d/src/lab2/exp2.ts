// 迭代实验：普通攻防 vs 限制/引用/状态（手册）。规则读 D:/wc/out/rules.json；每轮结果追加到 迭代日志.md
// 运行：node --import tsx src/lab2/exp2.ts   （环境变量 N LABEL）
import { readFileSync, appendFileSync, existsSync } from "node:fs";
const OUT = process.env.OUT ?? "D:/wc/out";
if (existsSync(`${OUT}/rules.json`)) process.env.LAB = readFileSync(`${OUT}/rules.json`, "utf8");
if (existsSync(`${OUT}/rules2.json`)) process.env.LAB2 = readFileSync(`${OUT}/rules2.json`, "utf8");
const { Pool } = await import("./pool");
const { playbookNamed } = await import("./playbook");
const { sentenceText } = await import("./ast");
const { AI_DEFAULT } = await import("./ai");
const { deckKey } = await import("./deck");
type Task = import("./worker").Task;
type AiCfg = import("./ai").AiCfg;
const shape = (cl: import("./ast").Sentence) => sentenceText(cl).replace(/\d+(?=级|轮|句|次|条)/g, "N").replace(/随从\d/g, "随从").replace(/\d+/g, "N");
const N = +(process.env.N ?? 30), LABEL = process.env.LABEL ?? "";
const cfg = (mode: AiCfg["mode"], depth = 2): AiCfg => ({ ...AI_DEFAULT, mode, depth });
type Deck = Record<string, number>;
const players: { name: string; deck: Deck; cfg: AiCfg }[] = [
  { name: "普攻", deck: { 并: 3, 无视: 2 }, cfg: cfg("plain") },
  { name: "普防", deck: { 减伤: 3, 并: 3 }, cfg: cfg("plain") },
  { name: "攻防", deck: { 并: 2, 减伤: 2, 无视: 1 }, cfg: cfg("plain") },
  { name: "禁令", deck: { 不得: 2, 收紧: 2, 至多: 2, 移除: 1 }, cfg: cfg("playbook") },
  { name: "引用", deck: { 定时: 1, 次数: 1, 累计: 1, 收紧: 2, 移除: 1 }, cfg: cfg("playbook") },
  { name: "状态", deck: { 易伤: 2, 衰弱: 2, 灼烧: 2, 并: 2 }, cfg: cfg("playbook") },
  { name: "混合", deck: { 不得: 1, 并: 2, 易伤: 1, 定时: 1, 次数: 1, 移除: 1 }, cfg: cfg("playbook") },
];
const pool = new Pool(16);
const tasks: (Task & { i: number; j: number })[] = [];
let id = 0;
for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) for (let g = 0; g < N; g++)
  tasks.push({ id: id++, i, j, a: players[i].deck, b: players[j].deck, seed: 31000 + id * 17, first: (g % 2) as 0 | 1, rec: true, cfg: [players[i].cfg, players[j].cfg] });
const t0 = Date.now();
const outs = await pool.run(tasks);
pool.close();
const n = players.length, sc = Array.from({ length: n }, () => Array(n).fill(0)), cnt = Array.from({ length: n }, () => Array(n).fill(0));
const rounds = Array(n).fill(0), games = Array(n).fill(0);
let firstWon = 0, decided = 0;
const nameOf = new Map<string, string>();
for (const x of playbookNamed()) nameOf.set(shape(x.cl), x.name);
const eff: Record<string, { g: number; w: number }> = {};
const shapes: Record<string, number>[] = Array.from({ length: n }, () => ({}));
const agg: Record<string, number>[] = Array.from({ length: n }, () => ({}));
for (const o of outs) {
  const t = tasks[o.id]; const a = o.win === 0 ? 1 : o.win === 2 || o.win < 0 ? 0.5 : 0;
  if (o.win === 0 || o.win === 1) { decided++; if (o.win === t.first) firstWon++; }
  sc[t.i][t.j] += a; sc[t.j][t.i] += 1 - a; cnt[t.i][t.j]++; cnt[t.j][t.i]++;
  rounds[t.i] += o.rounds; rounds[t.j] += o.rounds; games[t.i]++; games[t.j]++;
  for (const [pi, side] of [[t.i, 0], [t.j, 1]] as [number, 0 | 1][]) {
    const score = side === 0 ? a : 1 - a;
    for (const k of Object.keys(o.shapes![side])) { const nm = nameOf.get(k); if (nm) { const e = (eff[nm] ??= { g: 0, w: 0 }); e.g++; e.w += score; } }
    for (const [k, v] of Object.entries(o.stats)) if (k.startsWith(`s${side}:`)) agg[pi][k.slice(3)] = (agg[pi][k.slice(3)] ?? 0) + v;
    for (const [k, v] of Object.entries(o.shapes![side])) shapes[pi][k] = (shapes[pi][k] ?? 0) + v;
  }
}
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const tot = players.map((_, i) => sc[i].reduce((a, b) => a + b, 0) / cnt[i].reduce((a, b) => a + b, 0));
let md = `\n## ${LABEL}\n规则 ${process.env.LAB ?? "{}"} ${process.env.LAB2 ?? ""}；每对 ${N} 局，共 ${tasks.length} 局，${((Date.now() - t0) / 1000).toFixed(0)} 秒\n\n| | ${players.map((p) => p.name).join(" | ")} | 总 | 轮数 |\n|---|${players.map(() => "---").join("|")}|---|---|\n`;
players.forEach((p, i) => { md += `| ${p.name} | ${players.map((_, j) => (i === j ? "—" : pct(sc[i][j] / cnt[i][j]))).join(" | ")} | **${pct(tot[i])}** | ${(rounds[i] / games[i]).toFixed(1)} |\n`; });
players.forEach((p, i) => {
  const all = Object.values(shapes[i]).reduce((a, b) => a + b, 0);
  const plain = Object.entries(shapes[i]).filter(([k]) => /^(敌方最低血|随从N)受伤N$/.test(k)).reduce((a, [, v]) => a + v, 0);
  const byName: Record<string, number> = {}; let pb = 0;
  for (const [k, v] of Object.entries(shapes[i])) { const nm = nameOf.get(k); if (nm) { byName[nm] = (byName[nm] ?? 0) + v; pb += v; } }
  const top = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}${pct(v / all)}`).join("、");
  md += `- **${p.name}**（${deckKey(p.deck)}）纯攻击${pct(plain / all)} 手册句${pct(pb / all)} 触发${((agg[i].fire ?? 0) / games[i]).toFixed(1)}/局 引爆${((agg[i].burst ?? 0) / games[i]).toFixed(1)}/局 ｜ ${top}\n`;
});
const effRows = Object.entries(eff).filter(([, v]) => v.g >= 25).sort((a, b) => b[1].g - a[1].g).slice(0, 14).map(([k, v]) => `${k}：${v.g}局用过，用过时胜率${pct(v.w / v.g)}`);
md += "\n手册句效率（用过它的对局里该方胜率；样本≥25局）：\n" + effRows.map((r) => "- " + r).join("\n") + "\n";
md += `先手方胜率（越接近 50% 越不受先后手影响）：${pct(firstWon / Math.max(1, decided))}
`;
const posLines = players.map((p, i) => { const a = agg[i], sent = Math.max(1, a.sent ?? 0); const d = [0, 1, 2].map((k) => a[`dealt:pos${k}`] ?? 0), dt = Math.max(1, d[0] + d[1] + d[2]);
  return `- ${p.name}：三个位置各说了 ${[0, 1, 2].map((k) => pct((a[`pos${k}`] ?? 0) / sent)).join("/")}，各自打出伤害 ${d.map((x) => pct(x / dt)).join("/")}；加成发挥 词位少付${((a.bon0 ?? 0) / games[i]).toFixed(1)}点AP、数位省${((a.bon1 ?? 0) / games[i]).toFixed(1)}张牌、引用位免冷却${((a.bon2 ?? 0) / games[i]).toFixed(1)}词（每局）`; });
md += "\n位置使用（词位/数位/第三位）：\n" + posLines.join("\n") + "\n";
const spread = Math.max(...tot) - Math.min(...tot);
md += `\n总胜率极差 ${pct(spread)}（最高 ${players[tot.indexOf(Math.max(...tot))].name} ${pct(Math.max(...tot))}，最低 ${players[tot.indexOf(Math.min(...tot))].name} ${pct(Math.min(...tot))}）\n`;
appendFileSync(`${OUT}/迭代日志.md`, md);
console.log(md);

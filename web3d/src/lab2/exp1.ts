// 实验 1：普通攻防 vs 限制/引用（手册）流派。规则：并收费、数字牌更充裕、血量提高。
// 运行：LAB='{...}' node --import tsx src/lab2/exp1.ts
import { writeFileSync } from "node:fs";
import { Pool } from "./pool";
import { playbookNamed } from "./playbook";
import { sentenceText, type Sentence } from "./ast";
import { AI_DEFAULT, type AiCfg } from "./ai";
import { deckKey } from "./deck";
import type { Deck } from "./params";
import type { Task } from "./worker";

const shape = (cl: Sentence) => sentenceText(cl).replace(/\d+(?=级|轮|句|次|条)/g, "N").replace(/随从\d/g, "随从").replace(/\d+/g, "N");
const OUT = process.env.OUT ?? "D:/wc/out";
const N = +(process.env.N ?? 40);
const cfg = (mode: AiCfg["mode"], depth = 2): AiCfg => ({ ...AI_DEFAULT, mode, depth });
interface Player { name: string; deck: Deck; cfg: AiCfg }
const players: Player[] = [
  { name: "普攻", deck: { 并: 3, 无视: 2 }, cfg: cfg("plain") },
  { name: "普防", deck: { 减伤: 3, 并: 3 }, cfg: cfg("plain") },
  { name: "攻防", deck: { 并: 2, 减伤: 2, 无视: 1 }, cfg: cfg("plain") },
  { name: "禁令·手册", deck: { 不得: 2, 收紧: 2, 至多: 2, 移除: 1 }, cfg: cfg("playbook") },
  { name: "引用·手册", deck: { 定时: 1, 收紧: 3, 先后: 1, 移除: 1, 至多: 1 }, cfg: cfg("playbook") },
  { name: "混合·手册", deck: { 不得: 1, 并: 2, 易伤: 1, 定时: 1, 收紧: 1, 移除: 1 }, cfg: cfg("playbook") },
  { name: "状态·手册", deck: { 易伤: 2, 衰弱: 2, 灼烧: 2, 并: 2 }, cfg: cfg("playbook") },
  { name: "禁令·自由", deck: { 不得: 2, 收紧: 2, 至多: 2, 移除: 1 }, cfg: cfg("free") },
  { name: "引用·自由", deck: { 定时: 1, 收紧: 3, 先后: 1, 移除: 1, 至多: 1 }, cfg: cfg("free") },
  { name: "引用·手册·深推演", deck: { 定时: 1, 收紧: 3, 先后: 1, 移除: 1, 至多: 1 }, cfg: cfg("playbook", 3) },
];
async function main() {
  const pool = new Pool(+(process.env.WORKERS ?? 16));
  const tasks: (Task & { i: number; j: number })[] = [];
  let id = 0;
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) for (let g = 0; g < N; g++)
    tasks.push({ id: id++, i, j, a: players[i].deck, b: players[j].deck, seed: 9000 + id * 17, first: (g % 2) as 0 | 1, rec: true, cfg: [players[i].cfg, players[j].cfg] });
  const t0 = Date.now();
  const outs = await pool.run(tasks);
  pool.close();
  const n = players.length, sc = Array.from({ length: n }, () => Array(n).fill(0)), cnt = Array.from({ length: n }, () => Array(n).fill(0));
  const rounds = Array(n).fill(0), games = Array(n).fill(0);
  const shapes: Record<string, number>[] = Array.from({ length: n }, () => ({}));
  const agg: Record<string, number>[] = Array.from({ length: n }, () => ({}));
  for (const o of outs) {
    const t = tasks[o.id]; const a = o.win === 0 ? 1 : o.win === 2 || o.win < 0 ? 0.5 : 0;
    sc[t.i][t.j] += a; sc[t.j][t.i] += 1 - a; cnt[t.i][t.j]++; cnt[t.j][t.i]++;
    rounds[t.i] += o.rounds; rounds[t.j] += o.rounds; games[t.i]++; games[t.j]++;
    for (const [pi, side] of [[t.i, 0], [t.j, 1]] as [number, 0 | 1][]) {
      for (const [k, v] of Object.entries(o.stats)) if (k.startsWith(`s${side}:`)) agg[pi][k.slice(3)] = (agg[pi][k.slice(3)] ?? 0) + v;
      for (const [k, v] of Object.entries(o.shapes![side])) shapes[pi][k] = (shapes[pi][k] ?? 0) + v;
    }
  }
  const nameOf = new Map<string, string>();
  for (const x of playbookNamed()) nameOf.set(shape(x.cl), x.name);
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  let md = `# 实验 1：普通攻防 vs 限制/引用\n\n规则：LAB=${process.env.LAB ?? "{}"}；每对 ${N} 局（先后手各半），共 ${tasks.length} 局，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒。\n\n## 胜率矩阵（行 打 列，行方得分）\n| | ${players.map((p) => p.name).join(" | ")} | 总 | 平均轮数 |\n|---|${players.map(() => "---").join("|")}|---|---|\n`;
  players.forEach((p, i) => { const tot = sc[i].reduce((a, b) => a + b, 0) / cnt[i].reduce((a, b) => a + b, 0); md += `| ${p.name} | ${players.map((_, j) => (i === j ? "—" : pct(sc[i][j] / cnt[i][j]))).join(" | ")} | **${pct(tot)}** | ${(rounds[i] / games[i]).toFixed(1)} |\n`; });
  md += `\n## 各流派用了什么（占该方全部宣告的比例）\n`;
  players.forEach((p, i) => {
    const tot = Object.values(shapes[i]).reduce((a, b) => a + b, 0);
    const plain = Object.entries(shapes[i]).filter(([k]) => /^(敌方最低血|随从N)受伤N$/.test(k)).reduce((a, [, v]) => a + v, 0);
    const byName: Record<string, number> = {}; let pb = 0;
    for (const [k, v] of Object.entries(shapes[i])) { const nm = nameOf.get(k); if (nm) { byName[nm] = (byName[nm] ?? 0) + v; pb += v; } }
    md += `\n**${p.name}**（${deckKey(p.deck)}；${p.cfg.mode}，推演 ${p.cfg.depth} 轮）：共 ${tot} 句，纯攻击 ${pct(plain / tot)}，手册句 ${pct(pb / tot)}；不出手率 ${pct((agg[i].pass ?? 0) / ((agg[i].pass ?? 0) + (agg[i].sent ?? 1)))}；平均每局触发 ${((agg[i].fire ?? 0) / games[i]).toFixed(2)} 次、引爆 ${((agg[i].burst ?? 0) / games[i]).toFixed(2)} 次\n`;
    const top = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) md += `- 最常用手册句：${top.map(([k, v]) => `${k}(${pct(v / tot)})`).join("、")}\n`;
  });
  writeFileSync(`${OUT}/实验1.md`, md);
  console.log(md);
}
main();

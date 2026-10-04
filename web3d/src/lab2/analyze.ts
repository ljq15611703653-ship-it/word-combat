// 进化结果分析：大循环赛 → 聚成 4 大类 × 2 小类 → 流派报告（Markdown）
// 运行：node --import tsx src/lab2/analyze.ts   （环境变量 OUT GPP MAXDECKS）
import { readFileSync, writeFileSync, existsSync } from "node:fs";
if (existsSync((process.env.OUT ?? "D:/wc/out") + "/rules.json")) process.env.LAB = readFileSync((process.env.OUT ?? "D:/wc/out") + "/rules.json", "utf8");
if (existsSync((process.env.OUT ?? "D:/wc/out") + "/rules2.json")) process.env.LAB2 = readFileSync((process.env.OUT ?? "D:/wc/out") + "/rules2.json", "utf8");
import { playbookNamed } from "./playbook";
import { sentenceText as stext, type Sentence } from "./ast";
const shapeOf = (cl: Sentence) => stext(cl).replace(/\d+(?=级|轮|句|次|条)/g, "N").replace(/随从\d/g, "随从").replace(/\d+/g, "N");
const NAMES = new Map<string, string>(playbookNamed().map((x) => [shapeOf(x.cl), x.name]));
import { Pool } from "./pool";
import { roundRobin } from "./evolve";
import { deckKey, DESC_NAMES, dist } from "./deck";
import { ADV_WORDS, deckCost, type Deck } from "./params";
import { mulberry32 } from "./gen";

const OUT = process.env.OUT ?? "D:/wc/out", GPP = +(process.env.GPP ?? 6), MAXD = +(process.env.MAXDECKS ?? 64);

function kmeans(X: number[][], K: number, seed: number): { lab: number[]; cen: number[][]; inertia: number } {
  const r = mulberry32(seed); let best: { lab: number[]; cen: number[][]; inertia: number } | null = null;
  for (let rs = 0; rs < 40; rs++) {
    const cen: number[][] = [X[Math.floor(r() * X.length)].slice()];
    while (cen.length < K) {
      const d2 = X.map((x) => Math.min(...cen.map((c) => dist(x, c) ** 2)));
      let t = r() * d2.reduce((a, b) => a + b, 0), i = 0;
      for (; i < X.length - 1; i++) { t -= d2[i]; if (t <= 0) break; }
      cen.push(X[i].slice());
    }
    let lab: number[] = Array(X.length).fill(0);
    for (let it = 0; it < 60; it++) {
      lab = X.map((x) => cen.reduce((b, c, k) => (dist(x, c) < dist(x, cen[b]) ? k : b), 0));
      for (let k = 0; k < K; k++) { const m = X.filter((_, i) => lab[i] === k); if (m.length) cen[k] = X[0].map((_, d) => m.reduce((a, x) => a + x[d], 0) / m.length); }
    }
    const inertia = X.reduce((a, x, i) => a + dist(x, cen[lab[i]]) ** 2, 0);
    if (!best || inertia < best.inertia) best = { lab, cen: cen.map((c) => c.slice()), inertia };
  }
  return best!;
}
function silhouette(X: number[][], lab: number[], K: number): number {
  let s = 0;
  X.forEach((x, i) => {
    const mean = (k: number) => { const m = X.filter((_, j) => lab[j] === k && j !== i); return m.length ? m.reduce((a, y) => a + dist(x, y), 0) / m.length : Infinity; };
    const a = mean(lab[i]); let b = Infinity;
    for (let k = 0; k < K; k++) if (k !== lab[i]) b = Math.min(b, mean(k));
    s += isFinite(a) && isFinite(b) ? (b - a) / Math.max(a, b) : 0;
  });
  return s / X.length;
}
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main() {
  const st = JSON.parse(readFileSync(`${OUT}/evo_state.json`, "utf8")) as { gen: number; pop: Deck[]; hall: { deck: Deck; gen: number; fit: number }[] };
  const seen = new Set<string>(), cand: Deck[] = [];
  const add = (d: Deck) => { const k = deckKey(d); if (!seen.has(k) && deckCost(d) > 0) { seen.add(k); cand.push(d); } };
  st.pop.forEach(add);
  [...st.hall].filter((h) => h.gen > st.gen * 0.5).sort((a, b) => b.fit - a.fit).forEach((h) => add(h.deck));
  const decks = cand.slice(0, MAXD);
  console.log(`参赛卡组 ${decks.length} 副，每对 ${GPP} 局`);
  const pool = new Pool(+(process.env.WORKERS ?? 8));
  const { ev, shapes } = await roundRobin(pool, decks, GPP, 777000, true);
  pool.close();
  const n = decks.length;
  const winRate = ev.agg.map((g) => (g.won ?? 0) / Math.max(1, g.games ?? 1));
  const D = ev.desc[0].length;
  const mu = Array.from({ length: D }, (_, d) => ev.desc.reduce((a, x) => a + x[d], 0) / n);
  const sd = mu.map((m, d) => Math.sqrt(ev.desc.reduce((a, x) => a + (x[d] - m) ** 2, 0) / n) || 1);
  const Z = ev.desc.map((x) => x.map((v, d) => (v - mu[d]) / sd[d]));
  const sil: Record<number, number> = {};
  for (const K of [2, 3, 4, 5, 6, 8]) sil[K] = silhouette(Z, kmeans(Z, K, 11).lab, K);
  const top = kmeans(Z, 4, 11);
  const groups = [0, 1, 2, 3].map((k) => Z.map((_, i) => i).filter((i) => top.lab[i] === k)).filter((g) => g.length);
  const subs = groups.map((g) => {
    if (g.length < 4) return [g];
    const s = kmeans(g.map((i) => Z[i]), 2, 5);
    return [0, 1].map((k) => g.filter((_, ii) => s.lab[ii] === k)).filter((x) => x.length);
  });
  const avgW = (A: number[], B: number[]) => { let s = 0, c = 0; for (const i of A) for (const j of B) if (i !== j) { s += ev.W[i][j]; c++; } return c ? s / c : 0.5; };
  const label = (members: number[], all: number[]) => {
    const cen = Z[0].map((_, d) => members.reduce((a, i) => a + Z[i][d], 0) / members.length);
    const base = Z[0].map((_, d) => all.reduce((a, i) => a + Z[i][d], 0) / all.length);
    const diff = cen.map((c, d) => ({ d, v: c - base[d] })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3);
    return diff.map((x) => `${x.v > 0 ? "高" : "低"}${DESC_NAMES[x.d]}`).join("、");
  };
  const wordProfile = (members: number[]) => ADV_WORDS.map((w) => ({ w, mine: members.reduce((a, i) => a + (decks[i][w] ?? 0), 0) / members.length, all: decks.reduce((a, d) => a + (d[w] ?? 0), 0) / n })).sort((a, b) => (b.mine - b.all) - (a.mine - a.all));
  const topShapes = (members: number[], k = 6) => {
    const m: Record<string, number> = {}; let tot = 0;
    for (const i of members) for (const [s, v] of Object.entries(shapes[i])) { m[s] = (m[s] ?? 0) + v; tot += v; }
    return { tot, list: Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, k) };
  };
  const all = decks.map((_, i) => i);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

  let md = `# 新原型流派分析报告\n\n> 自动生成。引擎：句子语法树 + 事件日志解释器（\`web3d/src/lab2/\`）。卡组由进化长出，电脑不分流派，只用语法生成候选 + 推演。\n\n`;
  md += `## 1. 做了什么\n- 进化：每代 40 副卡组（预算 18 点），共 **${st.gen} 代**；每代循环赛（先后手各一局），适应度 = 竞争性共享（打赢少有人能赢的对手更值钱）+ 新颖度（行为描述符离别人远）；互相太像的只保留一个。\n`;
  md += `- 分析：取进化后期的 **${n} 副**不同卡组，大循环赛每对 ${GPP} 局（共 ${(n * (n - 1) / 2 * GPP).toLocaleString()} 局），记录所有宣告的句子；按行为描述符（${DESC_NAMES.length} 维）聚类。\n`;
  md += `- 平均每局 **${ev.rounds.toFixed(1)} 轮**（目标 4.5～6.2）。\n\n`;
  md += `## 2. 元目标检查\n`;
  const wr = [...winRate].sort((a, b) => b - a);
  md += `- **没有通吃**：最强卡组总胜率 ${pct(wr[0])}，前 5 名 ${wr.slice(0, 5).map(pct).join("、")}；胜率标准差 ${pct(Math.sqrt(mean(winRate.map((x) => (x - 0.5) ** 2))))}。\n`;
  md += `- 大类平均胜率：${groups.map((g, k) => `类${k + 1}=${pct(mean(g.map((i) => winRate[i])))}`).join("，")}。\n`;
  md += `- 轮廓系数（越高分得越开）：${Object.entries(sil).map(([k, v]) => `K=${k}:${v.toFixed(2)}`).join("，")}。${Math.max(...Object.values(sil)) < 0.2 ? "**数值偏低：流派之间是连续过渡，不是壁垒分明的几堆（见第 6 节）。**" : ""}\n`;
  const used: Record<string, number> = {}; let tw = 0;
  for (const g of ev.agg) for (const [k, v] of Object.entries(g)) if (k.startsWith("w:")) { used[k.slice(2)] = (used[k.slice(2)] ?? 0) + v; tw += v; }
  const ent = -Object.values(used).reduce((a, v) => a + (v / tw) * Math.log(v / tw), 0);
  md += `- 进阶词使用分布熵 ${ent.toFixed(2)}（最大 ${Math.log(ADV_WORDS.length).toFixed(2)}）；使用占比：${Object.entries(used).sort((a, b) => b[1] - a[1]).map(([w, v]) => `${w}${pct(v / tw)}`).join("、")}。${ADV_WORDS.filter((w) => !used[w]).length ? "**从没被用到的词：" + ADV_WORDS.filter((w) => !used[w]).join("、") + "**" : ""}\n\n`;

  md += `## 3. 4 大类 × 2 小类\n`;
  groups.forEach((g, k) => {
    md += `\n### 大类 ${k + 1}：${label(g, all)}（${g.length} 副，平均胜率 ${pct(mean(g.map((i) => winRate[i])))}）\n`;
    const wp = wordProfile(g);
    md += `- 招牌词（比全体平均多）：${wp.slice(0, 3).map((x) => `${x.w} ${x.mine.toFixed(1)}张(平均${x.all.toFixed(1)})`).join("、")}；少用：${wp.slice(-2).map((x) => x.w).join("、")}。\n`;
    const prey: string[] = [], pred: string[] = [];
    groups.forEach((h, k2) => { if (k2 === k) return; const w = avgW(g, h); if (w >= 0.55) prey.push(`类${k2 + 1}(${pct(w)})`); else if (w <= 0.45) pred.push(`类${k2 + 1}(${pct(1 - w)})`); });
    md += `- 猎物：${prey.join("、") || "无明显"}；天敌：${pred.join("、") || "无明显"}。\n`;
    const ts = topShapes(g, 5);
    md += `- 最常宣告的句子形状（共 ${ts.tot} 句）：\n${ts.list.map(([s, v]) => `  - ${s}（${pct(v / ts.tot)}）`).join("\n")}\n`;
    subs[k].forEach((sg, kk) => {
      const wp2 = wordProfile(sg);
      md += `- **小类 ${k + 1}.${kk + 1}**（${sg.length} 副，胜率 ${pct(mean(sg.map((i) => winRate[i])))}）：${label(sg, g)}；招牌词 ${wp2.slice(0, 3).map((x) => x.w).join("、")}；代表卡组：${deckKey(decks[sg.slice().sort((a, b) => winRate[b] - winRate[a])[0]])}\n`;
    });
  });
  md += `\n## 4. 大类之间的胜率（行 打 列，行方得分）\n| | ${groups.map((_, k) => `类${k + 1}`).join(" | ")} |\n|---|${groups.map(() => "---").join("|")}|\n`;
  groups.forEach((g, k) => { md += `| 类${k + 1} | ${groups.map((h, k2) => (k === k2 ? "—" : pct(avgW(g, h)))).join(" | ")} |\n`; });
  const cyc: string[] = [];
  for (let a = 0; a < groups.length; a++) for (let b = 0; b < groups.length; b++) for (let c = 0; c < groups.length; c++) {
    if (a < b && a < c && b !== c && avgW(groups[a], groups[b]) > 0.52 && avgW(groups[b], groups[c]) > 0.52 && avgW(groups[c], groups[a]) > 0.52) cyc.push(`类${a + 1} > 类${b + 1} > 类${c + 1} > 类${a + 1}`);
  }
  md += `\n- 循环克制：${cyc.join("；") || "没有找到 >52% 的三角克制"}。\n\n`;
  md += `## 5. 排行榜（总胜率前 10）\n| 卡组 | 胜率 | 描述 |\n|---|---|---|\n`;
  all.slice().sort((a, b) => winRate[b] - winRate[a]).slice(0, 10).forEach((i) => { md += `| ${deckKey(decks[i])} | ${pct(winRate[i])} | ${label([i], all)} |\n`; });
  md += `\n## 6. 局限与诚实说明\n- 电脑的推演只看 2 轮，候选句是随机采样的，所以**没有出现的句式，不等于它不强，只是电脑没找到**。\n- 描述符是我选的 ${DESC_NAMES.length} 个统计量，聚类结果依赖这个选择。\n- 默认策略（给对手代打）很朴素，长期句子的价值可能被低估。\n- 每对 ${GPP} 局，每副卡组打 ${(n - 1) * GPP} 局，胜率噪声约 ±${(100 * 0.5 / Math.sqrt((n - 1) * GPP)).toFixed(0)}%。\n- 词表只含已实现的词：并、减伤、定时、移除、兑现、无视、不得、收紧、至多、先后、灼烧、易伤、衰弱；重复、持续、转移、延后没有进入这一版。\n`;
  writeFileSync(`${OUT}/流派分析报告.md`, md);
  writeFileSync(`${OUT}/analysis.json`, JSON.stringify({ decks, winRate, groups, subs, W: ev.W, sil }));
  console.log(md.slice(0, 1800));
  console.log(`\n报告已写入 ${OUT}/流派分析报告.md`);
}
main();

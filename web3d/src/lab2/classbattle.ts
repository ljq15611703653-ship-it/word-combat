// 职业循环赛：四个职业 × 各自推荐卡组 + 手册电脑，每对 N 局（先后手各半）。只如实报告，不调参数。
// node --import tsx src/lab2/classbattle.ts [每对局数，默认 200] [配置 json，默认 D:/wc/out_real/duanju.json] [进程数 ≤6，默认 5]
import { readFileSync, writeFileSync } from "node:fs";
import { applyRules, type Cls, type Rules, CLASSES_ALL } from "./params";
import { Pool } from "./pool";
import { AI_DEFAULT } from "./ai";
import { mulberry32 } from "./gen";
import { randKws } from "./deck";
import type { Task } from "./worker";

const N = +(process.argv[2] ?? 200), CFG = process.argv[3] ?? "D:/wc/out_real/duanju.json", W = Math.min(6, +(process.argv[4] ?? 5));
const j = JSON.parse(readFileSync(CFG, "utf8")) as { LAB: Record<string, unknown>; LAB2: Record<string, unknown> };
const { ADVO, ...p2 } = j.LAB2 as { ADVO?: Record<string, { price?: number; max?: number }> } & Record<string, unknown>;
const rules: Rules = { P: j.LAB, P2: { ...p2, TGT_AT_DECL: 1, CLASSES: 1 }, ADV: ADVO };
applyRules(rules);

const DECKS: Record<Cls, Record<string, number>> = {   // = deckbuilder/words.js 的 PRESETS（cls-*）
  并: { 并: 3, 减伤: 2, 易伤: 2, 灼烧: 1, 衰弱: 1 },
  引用: { 累计: 1, 次数: 1, 定时: 1, 词数: 1, 并: 1 },
  限制: { 不得: 2, 收紧: 2, 至多: 2, 移除: 1 },
  状态: { 灼烧: 2, 易伤: 2, 衰弱: 2, 并: 3 },
};
const cfg = { ...AI_DEFAULT, mode: "playbook" as const };
const pool = new Pool(W);
const pairs: [Cls, Cls][] = [];
CLASSES_ALL.forEach((a, i) => CLASSES_ALL.forEach((b, k) => { if (i <= k) pairs.push([a, b]); }));
const tasks: (Task & { pair: number })[] = [];
const r = mulberry32(2026);
pairs.forEach(([a, b], pi) => { for (let g = 0; g < N; g++) tasks.push({ id: tasks.length, pair: pi, a: DECKS[a], b: DECKS[b], seed: 5000 + g * 7 + pi, first: (g % 2) as 0 | 1, cfg, rules, kws: [randKws(r), randKws(r)], cls: [a, b], rec: true }); });
const t0 = Date.now();
const outs = await pool.run(tasks);
pool.close();
const dt = (Date.now() - t0) / 1000;

interface Cell { a: number; b: number; d: number; rounds: number; firstW: number; dec: number; n: number }
const cell: Cell[] = pairs.map(() => ({ a: 0, b: 0, d: 0, rounds: 0, firstW: 0, dec: 0, n: 0 }));
const use: Record<Cls, { games: number; st: Record<string, number>; shapes: Record<string, number> }> = Object.fromEntries(CLASSES_ALL.map((c) => [c, { games: 0, st: {}, shapes: {} }])) as never;
let unfinished = 0, totRounds = 0, totDone = 0, totFirstW = 0, totDec = 0;
for (const o of outs) {
  const t = tasks[o.id], c = cell[t.pair]; c.n++;
  if (o.win < 0) { unfinished++; continue; }
  c.rounds += o.rounds; totRounds += o.rounds; totDone++;
  if (o.win === 2) c.d++; else { c.dec++; totDec++; if (o.win === 0) c.a++; else c.b++; if (o.win === t.first) { c.firstW++; totFirstW++; } }
  for (const side of [0, 1] as const) {
    const cl = t.cls![side]!, u = use[cl]; u.games++;
    for (const [k, v] of Object.entries(o.stats)) if (k.startsWith(`s${side}:`)) { const kk = k.slice(3); u.st[kk] = (u.st[kk] ?? 0) + v; }
    for (const [k, v] of Object.entries(o.shapes?.[side] ?? {})) u.shapes[k] = (u.shapes[k] ?? 0) + v;
  }
}
const pct = (x: number) => (x * 100).toFixed(1) + "%";
const idx = (a: Cls, b: Cls) => pairs.findIndex((p) => p[0] === a && p[1] === b);
let md = `# 职业对战 第 1 版（${new Date().toISOString().slice(0, 10)}）\n\n`;
md += `配置：\`${CFG}\`（REAL 规则 + 三个位置 POS=1/速位 + 累计价 8）+ \`TGT_AT_DECL=1\` + \`CLASSES=1\`；职业数值全是草案默认值（并流 7 段/多一段 +${1}/起手不变晚；引用流全程半价/自指词 +1 张不冷却；限制流不得 +1、窗口与至多不占牌、单次伤害 ≤3；状态流状态词 −1 点、初始 +1 级）。\n`;
md += `每个职业用各自推荐卡组（deckbuilder/words.js 的 cls-*）+ 手册电脑（playbook，含职业针对性补充），随机关键词；每对 ${N} 局，先后手各半；共 ${tasks.length} 局，${dt.toFixed(0)} 秒；**没有调任何参数**。\n\n`;
md += `总体：打完 ${totDone}/${tasks.length} 局，平均 **${(totRounds / totDone).toFixed(2)} 轮**，先手方胜率 **${pct(totFirstW / totDec)}**（只算分出胜负；平局 ${outs.filter((o) => o.win === 2).length} 局）。\n\n`;
md += `## 胜率矩阵（行 对 列，平局算半场；对角线是镜像局）\n\n| 行\\列 | ${CLASSES_ALL.join(" | ")} | 合计 |\n|---|${CLASSES_ALL.map(() => "---").join("|")}|---|\n`;
const wr = (a: Cls, b: Cls) => { const i = idx(a, b); if (i >= 0) { const c = cell[i]; return (c.a + c.d / 2) / c.n; } const c = cell[idx(b, a)]; return (c.b + c.d / 2) / c.n; };
for (const a of CLASSES_ALL) { const cells = CLASSES_ALL.map((b) => pct(wr(a, b))); const tot = CLASSES_ALL.filter((b) => b !== a).reduce((s, b) => s + wr(a, b), 0) / 3; md += `| ${a} | ${cells.join(" | ")} | ${pct(tot)}（不含镜像） |\n`; }
md += `\n## 每对明细\n\n| 对阵 | 局数 | A 胜 | B 胜 | 平 | 平均轮数 | 先手方胜率 |\n|---|---|---|---|---|---|---|\n`;
pairs.forEach(([a, b], i) => { const c = cell[i]; md += `| ${a} vs ${b} | ${c.n} | ${c.a} | ${c.b} | ${c.d} | ${(c.rounds / Math.max(1, c.n - 0)).toFixed(2)} | ${c.dec ? pct(c.firstW / c.dec) : "-"} |\n`; });
md += `\n## 各职业天赋 / 限制的实际使用（每局每方平均；「拒绝」是电脑生成候选句时被职业限制拒绝的次数，不是玩家操作）\n\n`;
const TKEYS: Record<Cls, [string, string][]> = {
  并: [["t:并多段", "并流：额外段数"], ["t:并省行动点", "并流：省下的行动点"], ["t:并超3段", "并流：说了几句超过 3 段的"], ["rej:并流:同一动作词只能用一次", "拒绝：同一动作词重复"]],
  引用: [["t:引用全程", "引用流：用了几次全程"], ["t:引用词", "引用流：自指词用了几张"], ["rej:引用流:最多一个引用量词", "拒绝：多个引用量词"]],
  限制: [["t:不得加罚", "限制流：不得惩罚 +1 触发次数"], ["t:限制省牌", "限制流：省下的数字牌张数"], ["t:限制封顶", "限制流：伤害被封顶 3 的次数"], ["rej:限制流:单次伤害不能超过上限", "拒绝：单次伤害 > 3"]],
  状态: [["t:状态省点", "状态流：省下的行动点"], ["w:灼烧", "灼烧句数"], ["w:易伤", "易伤句数"], ["w:衰弱", "衰弱句数"], ["rej:同轮同目标只能一种状态", "拒绝：同轮同目标第二种状态"]],
};
for (const c of CLASSES_ALL) {
  const u = use[c], g = Math.max(1, u.games), f = (k: string) => ((u.st[k] ?? 0) / g).toFixed(2);
  md += `### ${c}流（${u.games} 方·局）\n\n- 通用：每局句子 ${f("sent")}、平均句长 ${((u.st.len ?? 0) / Math.max(1, u.st.sent ?? 0)).toFixed(2)} 段、不出手 ${f("pass")}、行动点 ${f("ap")}、实际打掉 ${f("dealt")}、转移 ${f("redir")}、首挡 ${f("firstblock")}、不屈 ${f("endure")}、落空 ${f("fizzle")}\n`;
  for (const [k, name] of TKEYS[c]) md += `- ${name}：${f(k)}\n`;
  md += `- 总拒绝（全部原因）：${Object.entries(u.st).filter(([k]) => k.startsWith("rej:")).map(([k, v]) => `${k.slice(4)} ${(v / g).toFixed(1)}`).join("；") || "无"}\n`;
  md += `- 最常用的 5 种句子：\n${Object.entries(u.shapes).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `  - ${(v / g).toFixed(2)} 次/局：${k}`).join("\n")}\n\n`;
}
writeFileSync("D:/wc/nc_lab/设计与审计/数字牌模式/新原型报告/职业对战_第1版.md", md);
console.log(md.split("## 每对明细")[0]);

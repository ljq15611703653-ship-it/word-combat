// REAL 配置冒烟对局：随机卡组（含关键词）、电脑用自由 / 手册模式，统计平均轮数、先手方胜率、新词使用情况
// node --import tsx src/lab2/realsmoke.ts [局数，默认 300] [自由|手册|both] [进程数，默认 4，最多 6]
import { mkdirSync, writeFileSync } from "node:fs";
import { useReal, realRules } from "./realprofile";
import { Pool } from "./pool";
import { AI_DEFAULT, type AiCfg } from "./ai";
import { mulberry32 } from "./gen";
import { randDeck, randKws } from "./deck";
import type { Task } from "./worker";

useReal();
const N = +(process.argv[2] ?? 300), which = process.argv[3] ?? "both", W = Math.min(6, +(process.argv[4] ?? 4));
const OUT = process.env.OUT ?? "D:/wc/out_real";
mkdirSync(OUT, { recursive: true });
const pool = new Pool(W);
const modes: [string, AiCfg][] = [];
if (which !== "手册") modes.push(["自由", { ...AI_DEFAULT, mode: "free" }]);
if (which !== "自由") modes.push(["手册", { ...AI_DEFAULT, mode: "playbook" }]);
let report = `# REAL 配置冒烟对局（${new Date().toISOString().slice(0, 10)}）\n\n`;
for (const [name, cfg] of modes) {
  const r = mulberry32(777), tasks: Task[] = [];
  for (let i = 0; i < N; i++) tasks.push({ id: i, a: randDeck(r), b: randDeck(r), seed: 1000 + i, first: (i % 2) as 0 | 1, cfg, rules: realRules(), kws: [randKws(r), randKws(r)] });
  const t0 = Date.now();
  const outs = await pool.run(tasks);
  const dt = (Date.now() - t0) / 1000;
  let rounds = 0, firstWin = 0, secondWin = 0, draw = 0, unfinished = 0; const hist: Record<number, number> = {}; const st: Record<string, number> = {};
  for (const o of outs) {
    const t = tasks[o.id];
    if (o.win < 0) { unfinished++; continue; }
    rounds += o.rounds; hist[o.rounds] = (hist[o.rounds] ?? 0) + 1;
    if (o.win === 2) draw++; else if (o.win === t.first) firstWin++; else secondWin++;
    for (const [k, v] of Object.entries(o.stats)) { const kk = k.replace(/^s[01]:/, ""); st[kk] = (st[kk] ?? 0) + v; }
  }
  const done = N - unfinished, dec = firstWin + secondWin;
  const line = `${name}电脑 ${N} 局（${dt.toFixed(0)} 秒）：打完 ${done} 局，平均 ${(rounds / done).toFixed(2)} 轮；先手方胜 ${firstWin}、后手方胜 ${secondWin}、平局 ${draw}（先手胜率 ${((firstWin / dec) * 100).toFixed(1)}%，只算分出胜负的局）`;
  const use = ["redir", "redirect", "postpone", "pushout", "postponeMiss", "removed", "removeMiss", "firstblock", "endure", "fizzle", "status", "sent", "pass"].map((k) => `${k}=${((st[k] ?? 0) / done).toFixed(2)}`).join("  ");
  console.log(line); console.log("  每局平均：" + use); console.log("  轮数分布：" + Object.entries(hist).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}轮:${v}`).join(" "));
  report += `- ${line}\n  - 每局平均（双方合计）：${use}\n  - 轮数分布：${Object.entries(hist).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}轮:${v}`).join(" ")}\n`;
}
writeFileSync(OUT + "/冒烟对局.md", report);
pool.close();

// 漏斗评估：句子库 × 局面样本库，算每句话「比普通替代句好多少」（边际价值 = 该句推演估值 − 最好的朴素攻击的推演估值）。
// 分三层：①少量局面、浅推演、一种电脑 粗筛（留前 F1）→ ②更多局面、深一点 精筛（留前 F2）→ ③全部局面 × 至少 3 种电脑配置 复验；
// 只保留在「所有配置下都排前列」的句子（robust = 各配置排名百分位的最小值）。
// 运行：node --import tsx src/lab2/mine/funnel.ts     环境变量：
//   P1=40 D1=1 F1=0.08      第 1 层：局面数、推演深度、保留比例（全局前 F1，另外每个家族至少保留前 FF 比例）
//   P2=120 D2=2 F2=0.3      第 2 层
//   ROBUST=0.4              第 3 层：每种配置下都要排进前 40%
//   MINAPP=8                适用点数下限（太少的结论不可信）
// 输出：$OUT/funnel.json、$OUT/pass.jsonl（通过复验的精选句子库，供 distill.ts 用）、$OUT/leaderboard.md
import { readFileSync, writeFileSync } from "node:fs";
import { OUT } from "./mineenv";
import { MPool } from "./mpool";
import { evalCfgs, FAMILIES } from "./minelib";
import type { SentRec } from "./mine";
import type { Point } from "./minelib";

const SENT = process.env.SENT ?? `${OUT}/sentences.jsonl`, POINTS = process.env.POINTS ?? `${OUT}/points.jsonl`;
const E = (k: string, d: number) => +(process.env[k] ?? d);
const P1 = E("P1", 40), D1 = E("D1", 1), F1 = E("F1", 0.08), FF1 = E("FF1", 0.04), P2 = E("P2", 120), D2 = E("D2", 2), F2 = E("F2", 0.3), FF2 = E("FF2", 0.15), ROBUST = E("ROBUST", 0.4), MINAPP = E("MINAPP", 8);
const sents: SentRec[] = readFileSync(SENT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const pts: Point[] = readFileSync(POINTS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const cfgs = evalCfgs();
const t0 = Date.now();
const log = (m: string) => { console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`); };
log(`句子 ${sents.length}，局面 ${pts.length}，配置 ${cfgs.length} 种：${cfgs.map((c) => `wCard${c.wCard}/wAp${c.wAp}/d${c.depth}`).join("  ")}`);
const pool = new MPool();
type Agg = number[];
/** 对一批句子 × 一批局面点 × 一种配置 算聚合；句子分成许多小任务给进程池 */
async function stage(ids: number[], ptIdx: number[], cfg: number, depth: number | undefined, label: string): Promise<Map<number, Agg>> {
  const chunk = Math.max(5, Math.ceil(ids.length / (6 * 12)));
  const args: { sentFile: string; ids: number[]; pointFile: string; pts: number[]; cfg: number; depth: number | undefined }[] = []; for (let i = 0; i < ids.length; i += chunk) args.push({ sentFile: SENT, ids: ids.slice(i, i + chunk), pointFile: POINTS, pts: ptIdx, cfg, depth });
  const res = await pool.run<Agg[]>("eval", args, (d, t) => { if (d % Math.max(1, Math.floor(t / 8)) === 0 || d === t) log(`${label} ${d}/${t}`); });
  const m = new Map<number, Agg>();
  res.forEach((r, i) => r.forEach((a, j) => m.set(args[i].ids[j], a)));
  return m;
}
/** 取前 frac（全局）∪ 每个家族取前 famFrac（保证稀有家族不被一刀切） */
function keepTop(ids: number[], score: (id: number) => number, frac: number, famFrac: number): number[] {
  const sorted = ids.slice().sort((a, b) => score(b) - score(a));
  const keep = new Set(sorted.slice(0, Math.max(1, Math.ceil(ids.length * frac))));
  const byFam = new Map<string, number[]>();
  for (const id of sorted) (byFam.get(sents[id].family) ?? byFam.set(sents[id].family, []).get(sents[id].family)!).push(id);
  for (const l of byFam.values()) l.slice(0, Math.max(1, Math.ceil(l.length * famFrac))).forEach((id) => keep.add(id));
  return [...keep];
}
const evenPts = (n: number) => { const k = Math.min(n, pts.length); return Array.from({ length: k }, (_, i) => Math.floor((i * pts.length) / k)); };   // 局面库已打乱，前 n 个即均匀样本；这里取等距
const opt = (a: Agg, n: number) => a[2] / n;

// ---- 第 1 层
const all = sents.map((_, i) => i);
const p1 = evenPts(P1);
const s1 = await stage(all, p1, 0, D1, "第1层");
const keep1 = keepTop(all, (id) => opt(s1.get(id)!, p1.length), F1, FF1);
log(`第1层：${all.length} → ${keep1.length}`);
// ---- 第 2 层
const p2 = evenPts(P2);
const s2 = await stage(keep1, p2, 0, D2, "第2层");
const keep2 = keepTop(keep1, (id) => opt(s2.get(id)!, p2.length), F2, FF2);
log(`第2层：${keep1.length} → ${keep2.length}`);
// ---- 第 3 层：全部局面 × 每种配置
const p3 = pts.map((_, i) => i);
const s3: Map<number, Agg>[] = [];
for (let c = 0; c < cfgs.length; c++) s3.push(await stage(keep2, p3, c, undefined, `第3层 配置${c + 1}`));
pool.close();
const posN = [0, 1, 2].map((k) => pts.filter((p) => p.unit % 3 === k).length);
// 每种配置下的排名百分位（1 = 最好）
const pct: Map<number, number>[] = s3.map((m) => {
  const order = keep2.slice().sort((a, b) => opt(m.get(b)!, pts.length) - opt(m.get(a)!, pts.length));
  const r = new Map<number, number>(); order.forEach((id, i) => r.set(id, 1 - i / Math.max(1, order.length - 1))); return r;
});
interface Row { id: number; text: string; family: string; adv: string[]; cost: number; len: number; opt: number[]; mean: number[]; win: number[]; app: number; pctl: number[]; robust: number; pass: boolean; posOpt: number[]; posApp: number[]; stage2: number }
const rows: Row[] = keep2.map((id) => {
  const a0 = s3[0].get(id)!;
  const optv = s3.map((m) => opt(m.get(id)!, pts.length));
  const mean = s3.map((m) => { const a = m.get(id)!; return a[0] ? a[1] / a[0] : 0; });
  const win = s3.map((m) => { const a = m.get(id)!; return a[0] ? a[3] / a[0] : 0; });
  const robust = Math.min(...pct.map((p) => p.get(id)!));
  const pass = a0[0] >= MINAPP && robust >= 1 - ROBUST && mean.every((x) => x > 0);
  const posOpt = [0, 1, 2].map((k) => s3.reduce((t, m) => t + m.get(id)![6 + k * 3], 0) / s3.length / Math.max(1, posN[k]));
  const posApp = [0, 1, 2].map((k) => a0[4 + k * 3]);
  return { id, text: sents[id].text, family: sents[id].family, adv: sents[id].adv, cost: sents[id].cost, len: sents[id].len, opt: optv, mean, win, app: a0[0] / pts.length, pctl: pct.map((p) => p.get(id)!), robust, pass, posOpt, posApp, stage2: opt(s2.get(id)!, p2.length) };
});
rows.sort((a, b) => b.robust - a.robust || Math.min(...b.opt) - Math.min(...a.opt));
const passRows = rows.filter((r) => r.pass);
log(`第3层：${keep2.length} → 复验通过 ${passRows.length}`);
writeFileSync(`${OUT}/funnel.json`, JSON.stringify({
  meta: { sentences: sents.length, points: pts.length, cfgs, stages: { s1: [all.length, keep1.length, P1, D1], s2: [keep1.length, keep2.length, P2, D2], s3: [keep2.length, passRows.length, pts.length] }, robust: ROBUST, minApp: MINAPP, seconds: +((Date.now() - t0) / 1000).toFixed(0), rules: { LAB: process.env.LAB ?? "", LAB2: process.env.LAB2 ?? "" } },
  rows,
}));
writeFileSync(`${OUT}/pass.jsonl`, passRows.map((r) => JSON.stringify(sents[r.id])).join("\n") + "\n");

// ---- 排行榜
const f2 = (x: number) => x.toFixed(2);
const pc = (x: number) => `${(x * 100).toFixed(0)}%`;
const tbl = (rs: Row[], posK = -1) => `| # | 句子 | 家族 | 进阶词 | 费 | 选项价值×配置 | 适用时平均边际 | 胜普通句 | 适用率 | 排名百分位 |\n|---|---|---|---|---|---|---|---|---|---|\n` + rs.map((r, i) => `| ${i + 1} | ${r.text} | ${r.family} | ${[...new Set(r.adv)].join("")} | ${r.cost} | ${posK >= 0 ? f2(r.posOpt[posK]) : r.opt.map(f2).join(" / ")} | ${r.mean.map(f2).join(" / ")} | ${r.win.map(pc).join(" / ")} | ${pc(r.app)} | ${r.pctl.map(f2).join(" / ")} |`).join("\n");
const famSum = FAMILIES.map((f) => {
  const n0 = sents.filter((x) => x.family === f).length, n1 = keep1.filter((id) => sents[id].family === f).length, n2 = keep2.filter((id) => sents[id].family === f).length, rs = rows.filter((r) => r.family === f), ps = rs.filter((r) => r.pass);
  return { f, n0, n1, n2, ps: ps.length, topOpt: rs.length ? Math.max(...rs.map((r) => Math.min(...r.opt))) : 0, medOpt: rs.length ? rs.map((r) => Math.min(...r.opt)).sort((a, b) => a - b)[Math.floor(rs.length / 2)] : 0 };
}).filter((x) => x.n0);
let md = `# 句子挖掘排行榜\n\n规则 LAB=${process.env.LAB?.trim() ?? ""} LAB2=${process.env.LAB2?.trim() ?? ""}\n\n句子库 ${sents.length} 句；局面 ${pts.length} 个；电脑配置 ${cfgs.length} 种：${cfgs.map((c, i) => `配置${i + 1}=留牌权重${c.wCard}/留行动点${c.wAp}/推演深度${c.depth}`).join("；")}。\n\n` +
  `**指标说明**：边际价值 = 该句推演估值 − 同局面同随从下「最好的朴素攻击」的推演估值（估值单位：1 个存活随从差=10，1 点总血量差=1.2，另含行动点/数字牌留存）。选项价值 = 全部局面上 max(0, 边际价值) 的平均（说不出口的局面按 0，所以它同时反映「强」和「常用得上」）。` +
  `「×配置」三个数依次是三种电脑配置下的值；排名百分位 1.00 = 复验集中最好。**通过复验** = 每种配置下排名都在前 ${pc(ROBUST)}、适用点数 ≥ ${MINAPP}、且每种配置下适用时平均边际 > 0。\n\n` +
  `注意：边际价值是「电脑推演」的结论（对手和己方后续都按朴素默认策略代打、只看 ${cfgs.map((c) => c.depth).join("/")} 轮），对 ±噪声很敏感；局面只有 ${pts.length} 个，位置榜每个位置约 ${posN.join("/")} 个点。\n\n## 漏斗\n\n` +
  `| 层 | 输入 | 输出 | 局面数 | 推演深度 |\n|---|---|---|---|---|\n| 1 粗筛 | ${all.length} | ${keep1.length} | ${p1.length} | ${D1} |\n| 2 精筛 | ${keep1.length} | ${keep2.length} | ${p2.length} | ${D2} |\n| 3 复验(×${cfgs.length}配置) | ${keep2.length} | **${passRows.length}** | ${pts.length} | 各配置自带 |\n\n` +
  `## 家族概览\n\n| 家族 | 库内 | 过第1层 | 过第2层 | 通过复验 | 复验集最高(取各配置最小选项价值) | 中位 |\n|---|---|---|---|---|---|---|\n` + famSum.map((x) => `| ${x.f} | ${x.n0} | ${x.n1} | ${x.n2} | ${x.ps} | ${f2(x.topOpt)} | ${f2(x.medOpt)} |`).join("\n") +
  `\n\n## 总榜（通过复验，按 robust 排序，前 30）\n\n${tbl(passRows.slice(0, 30))}\n\n## 按家族排行（每家族前 6，含未通过复验的也标出）\n\n`;
for (const x of famSum) {
  const rs = rows.filter((r) => r.family === x.f).sort((a, b) => Math.min(...b.opt) - Math.min(...a.opt)).slice(0, 6);
  if (rs.length) md += `### ${x.f}（复验集 ${rows.filter((r) => r.family === x.f).length}，通过 ${x.ps}）\n\n${tbl(rs)}\n\n`;
}
md += `## 按位置排行（词位=0 / 数位=1 / 第三位=2；每位置前 10；选项价值按该位置的局面计，三种配置取平均；该位置适用点数 ≥ ${Math.max(3, Math.floor(MINAPP / 2))}）\n\n`;
const POSN = ["词位(0)", "数位(1)", "第三位(2)"];
for (let k = 0; k < 3; k++) {
  const rs = rows.filter((r) => r.posApp[k] >= Math.max(3, Math.floor(MINAPP / 2)) && r.pass).sort((a, b) => b.posOpt[k] - a.posOpt[k]).slice(0, 10);
  md += `### ${POSN[k]}（该位置局面 ${posN[k]} 个）\n\n${rs.length ? tbl(rs, k).replace("选项价值×配置", "该位置选项价值(三配置均值)") : "（无通过复验的句子在该位置有足够样本）"}\n\n`;
}
writeFileSync(`${OUT}/leaderboard.md`, md);
log(`完成。排行榜 ${OUT}/leaderboard.md`);

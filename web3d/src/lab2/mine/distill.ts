// 决策表蒸馏：让「带推演的电脑」在大量局面里从（基础句 + 手册句 + 精选句子库）里选句子，把每次选择归到句子家族，
// 再用自己写的 CART 决策树把「什么局面用哪类句子」蒸馏成人能读的规则。
// 运行：node --import tsx src/lab2/mine/distill.ts      环境变量：
//   POINTS=$OUT/points_big.jsonl   局面库（建议用比漏斗更大的一份：NAME=points_big N=1500 node …/states.ts）
//   LIB=$OUT/pass.jsonl            精选句子库（funnel.ts 的产物；空串 = 只用基础句+手册句）
//   K=16 每次决策从库里随机抽几句候选   CFGS=0,1,2 用哪几种电脑配置（evalCfgs 下标）  DEPTH=3 树最大深度  MINLEAF=20
// 输出：$OUT/decisions.jsonl（原始决策）、$OUT/distill.json（机器可读：树/规则/准确率）、$OUT/decision_table.md（中文规则清单）
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { OUT } from "./mineenv";
import { MPool } from "./mpool";
import { FEATS, evalCfgs } from "./minelib";
import { sentenceText } from "../ast";
import { mulberry32 } from "../gen";

const E = (k: string, d: number) => +(process.env[k] ?? d);
const POINTS = process.env.POINTS ?? `${OUT}/points_big.jsonl`, LIB = process.env.LIB ?? `${OUT}/pass.jsonl`;
const K = E("K", 16), DEPTH = E("DEPTH", 4), MINLEAF = E("MINLEAF", 20);
const CFGS = (process.env.CFGS ?? "0,1,2").split(",").map(Number);
const nPts = readFileSync(POINTS, "utf8").split("\n").filter(Boolean).length;
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
const useLib = LIB && existsSync(LIB) ? LIB : "";
log(`局面 ${nPts}，配置 ${CFGS.join(",")}，精选库 ${useLib || "（无）"}，每次抽 ${K} 句`);

// ---------- 1 让电脑做决策 ----------
interface Dec { feat: Record<string, number>; fam: string; text: string; name: string; unit: number; gap: number; nApp: number; pt: number; cfg: number }
const pool = new MPool();
const chunk = 6;
const args: any[] = [];
for (const cfg of CFGS) for (let i = 0; i < nPts; i += chunk) args.push({ pointFile: POINTS, pts: Array.from({ length: Math.min(chunk, nPts - i) }, (_, j) => i + j), libFile: useLib, k: K, cfg, seed: 7000 + cfg * 100003 + i });
const res = await pool.run<Omit<Dec, "cfg">[]>("decide", args, (d, t) => { if (d % Math.max(1, Math.floor(t / 10)) === 0 || d === t) log(`决策 ${d}/${t}`); });
pool.close();
const decs: Dec[] = [];
res.forEach((r, ai) => r.forEach((d) => decs.push({ ...d, cfg: args[ai].cfg } as Dec)));
writeFileSync(`${OUT}/decisions.jsonl`, decs.map((d) => JSON.stringify(d)).join("\n") + "\n");
log(`决策 ${decs.length} 条`);

// ---------- 2 家族归类 ----------
const famCnt: Record<string, number> = {};
for (const d of decs) famCnt[d.fam] = (famCnt[d.fam] ?? 0) + 1;
const MINCLASS = Math.max(10, Math.floor(decs.length * 0.01));
const classes = Object.keys(famCnt).filter((f) => famCnt[f] >= MINCLASS).sort((a, b) => famCnt[b] - famCnt[a]);
if (!classes.includes("其他")) classes.push("其他");
const lab = (f: string) => (classes.includes(f) ? f : "其他");
const y = decs.map((d) => classes.indexOf(lab(d.fam)));
const X = decs.map((d) => FEATS.map((f) => d.feat[f.key] ?? 0));

// ---------- 3 CART ----------
interface Node { dist: number[]; n: number; f?: number; thr?: number; l?: Node; r?: Node }
const gini = (c: number[], n: number) => (n ? 1 - c.reduce((a, v) => a + (v / n) ** 2, 0) : 0);
function fit(idx: number[], yy: number[], K_: number, depth: number, maxD: number, minLeaf: number): Node {
  const dist = Array(K_).fill(0); for (const i of idx) dist[yy[i]]++;
  const node: Node = { dist, n: idx.length };
  const g0 = gini(dist, idx.length);
  if (depth >= maxD || idx.length < 2 * minLeaf || g0 < 1e-9) return node;
  let best = { gain: 1e-4, f: -1, thr: 0 };
  for (let f = 0; f < FEATS.length; f++) {
    const ord = idx.slice().sort((a, b) => X[a][f] - X[b][f]);
    const left = Array(K_).fill(0), right = dist.slice();
    for (let p = 0; p < ord.length - 1; p++) {
      const c = yy[ord[p]]; left[c]++; right[c]--;
      const v = X[ord[p]][f], nv = X[ord[p + 1]][f];
      if (v === nv) continue;
      const nl = p + 1, nr = ord.length - nl;
      if (nl < minLeaf || nr < minLeaf) continue;
      const gain = g0 - (nl / ord.length) * gini(left, nl) - (nr / ord.length) * gini(right, nr);
      if (gain > best.gain) best = { gain, f, thr: (v + nv) / 2 };
    }
  }
  if (best.f < 0) return node;
  node.f = best.f; node.thr = best.thr;
  node.l = fit(idx.filter((i) => X[i][best.f] <= best.thr), yy, K_, depth + 1, maxD, minLeaf);
  node.r = fit(idx.filter((i) => X[i][best.f] > best.thr), yy, K_, depth + 1, maxD, minLeaf);
  return node;
}
const leafOf = (n: Node, x: number[]): Node => (n.f === undefined ? n : leafOf(x[n.f] <= n.thr! ? n.l! : n.r!, x));
const argmax = (a: number[]) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);
const predict = (n: Node, x: number[]) => argmax(leafOf(n, x).dist);

// 训练/测试划分：按局面划分（同一局面在不同配置下的决策一定在同一边，避免泄漏）
const r = mulberry32(99);
const ptSet = [...new Set(decs.map((d) => d.pt))], isTest = new Set<number>();
for (const p of ptSet) if (r() < 0.3) isTest.add(p);
const trI: number[] = [], teI: number[] = [];
decs.forEach((d, i) => (isTest.has(d.pt) ? teI : trI).push(i));
const tree = fit(trI, y, classes.length, 0, DEPTH, MINLEAF);
const acc = (idx: number[], f: (i: number) => number) => (idx.length ? idx.filter((i) => f(i) === y[i]).length / idx.length : 0);
const baseCls = argmax(trI.reduce((a, i) => (a[y[i]]++, a), Array(classes.length).fill(0)));
const accTree = acc(teI, (i) => predict(tree, X[i])), accBase = acc(teI, () => baseCls);
const top2 = teI.filter((i) => { const d = leafOf(tree, X[i]).dist.map((v, c) => [v, c]).sort((a, b) => b[0] - a[0]); return d.slice(0, 2).some((z) => z[1] === y[i]); }).length / Math.max(1, teI.length);
const depthTable = [2, 3, 4, 5, 6].map((dd) => { const t = fit(trI, y, classes.length, 0, dd, MINLEAF); return { depth: dd, test: acc(teI, (i) => predict(t, X[i])), train: acc(trI, (i) => predict(t, X[i])) }; });
const perCfg = CFGS.map((c) => { const ii = teI.filter((i) => decs[i].cfg === c); return { cfg: c, n: ii.length, acc: acc(ii, (i) => predict(tree, X[i])), base: acc(ii, () => baseCls) }; });
// 跨配置一致性：同一局面在各配置下选的家族是否一致
const byPt = new Map<number, string[]>();
for (const d of decs) (byPt.get(d.pt) ?? byPt.set(d.pt, []).get(d.pt)!).push(lab(d.fam));
const multi = [...byPt.values()].filter((v) => v.length === CFGS.length);
const agree = multi.filter((v) => v.every((x) => x === v[0])).length / Math.max(1, multi.length);
// 随机基线（按训练集类别频率随机猜）的期望准确率
const prior = classes.map((_, c) => trI.filter((i) => y[i] === c).length / trI.length), testShare = classes.map((_, c) => teI.filter((i) => y[i] === c).length / Math.max(1, teI.length));
const randAcc = prior.reduce((a, p, c) => a + p * testShare[c], 0);
log(`决策树：测试准确率 ${(accTree * 100).toFixed(1)}%（多数类 ${(accBase * 100).toFixed(1)}%，随机按频率猜 ${(randAcc * 100).toFixed(1)}%）`);

// ---------- 4 读成中文规则 ----------
type Cond = { f: number; le: boolean; thr: number };
const feat = (f: number) => FEATS[f];
function condText(cs: Cond[]): string {
  // 同一特征的条件合并成区间
  const by = new Map<number, { lo: number; hi: number }>();
  for (const c of cs) { const o = by.get(c.f) ?? { lo: -Infinity, hi: Infinity }; if (c.le) o.hi = Math.min(o.hi, c.thr); else o.lo = Math.max(o.lo, c.thr); by.set(c.f, o); }
  const parts: string[] = [];
  for (const [f, o] of by) {
    const d = feat(f), lo = o.lo === -Infinity ? null : Math.floor(o.lo) + 1, hi = o.hi === Infinity ? null : Math.floor(o.hi);
    if (d.bool) parts.push(`${d.zh}：${lo !== null ? "是" : "否"}`);
    else if (lo !== null && hi !== null) parts.push(lo === hi ? `${d.zh} = ${lo}` : `${d.zh} ${lo}~${hi}`);
    else if (lo !== null) parts.push(`${d.zh} ≥ ${lo}`);
    else parts.push(`${d.zh} ≤ ${hi}`);
  }
  return parts.join("，且 ") || "任何局面";
}
const zhText = (j: string) => { try { return sentenceText(JSON.parse(j)); } catch { return j; } };
interface Leaf { cond: string; conds: Cond[]; node: Node }
function leaves(n: Node, path: Cond[] = []): Leaf[] {
  if (n.f === undefined) return [{ cond: condText(path), conds: path, node: n }];
  return [...leaves(n.l!, [...path, { f: n.f, le: true, thr: n.thr! }]), ...leaves(n.r!, [...path, { f: n.f, le: false, thr: n.thr! }])];
}
const inLeaf = (l: Leaf, x: number[]) => l.conds.every((c) => (c.le ? x[c.f] <= c.thr : x[c.f] > c.thr));
/** 叶子里最常被选中的具体句子（对多数家族） */
function topSentences(idx: number[], fam: string, k = 3): string[] {
  const cnt = new Map<string, number>();
  for (const i of idx) if (lab(decs[i].fam) === fam && decs[i].text) { const t = decs[i].name ? `【${decs[i].name}】` : zhText(decs[i].text); cnt.set(t, (cnt.get(t) ?? 0) + 1); }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([t, c]) => `${t}×${c}`);
}
const allLeaves = leaves(tree).map((l) => {
  const inTrain = trI.filter((i) => inLeaf(l, X[i])), inTest = teI.filter((i) => inLeaf(l, X[i]));
  const d = l.node.dist, tot = d.reduce((a, b) => a + b, 0), order = d.map((v, c) => [v, c]).sort((a, b) => b[0] - a[0]);
  const maj = order[0][1];
  return {
    cond: l.cond, n: tot, major: classes[maj], share: order[0][0] / tot, second: order[1] && order[1][0] ? classes[order[1][1]] : null, secondShare: order[1] ? order[1][0] / tot : 0,
    testN: inTest.length, testAcc: inTest.length ? inTest.filter((i) => y[i] === maj).length / inTest.length : null, lift: order[0][0] / tot / Math.max(1e-9, prior[maj]),
    examples: topSentences(inTrain, classes[maj]), conds: l.conds, node: l.node,
  };
}).sort((a, b) => b.n - a.n);

// 「什么时候倾向用 X」：每个主要家族一棵一对多的小树（深度 3），列出命中率显著高于该家族总体占比的叶子
interface Ovr { fam: string; base: number; rules: { cond: string; n: number; precision: number; lift: number; testN: number; testPrecision: number | null }[]; testAuc: number }
const ovr: Ovr[] = [];
for (const [c, fam] of classes.entries()) {
  if (fam === "其他" || prior[c] < 0.04) continue;
  const yb = decs.map((_, i) => (y[i] === c ? 1 : 0));
  const t2 = fit(trI, yb, 2, 0, 3, MINLEAF);
  const base = prior[c];
  const rules = leaves(t2).map((l) => {
    const inTrain = trI.filter((i) => inLeaf(l, X[i])), inTest = teI.filter((i) => inLeaf(l, X[i]));
    const p = l.node.dist[1] / l.node.n;
    return { cond: l.cond, n: l.node.n, precision: p, lift: p / base, testN: inTest.length, testPrecision: inTest.length ? inTest.filter((i) => yb[i] === 1).length / inTest.length : null, _inTrain: inTrain.length };
  }).filter((x) => x.lift >= 1.6 && x.n >= MINLEAF).sort((a, b) => b.lift - a.lift).map(({ _inTrain, ...x }) => x);
  // 测试集上的 AUC（用叶子精度做分数）
  const sc = teI.map((i) => leafOf(t2, X[i]).dist[1] / leafOf(t2, X[i]).n);
  const pos = teI.filter((i) => yb[i] === 1).map((i) => leafOf(t2, X[i]).dist[1] / leafOf(t2, X[i]).n), neg = teI.filter((i) => yb[i] === 0).map((i) => leafOf(t2, X[i]).dist[1] / leafOf(t2, X[i]).n);
  let w = 0; for (const a of pos) for (const b of neg) w += a > b ? 1 : a === b ? 0.5 : 0;
  void sc;
  ovr.push({ fam, base, rules, testAuc: pos.length && neg.length ? w / (pos.length * neg.length) : NaN });
}

// ---------- 5 输出 ----------
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(0)}%`);
const treeJson = (n: Node): any => (n.f === undefined ? { leaf: true, n: n.n, major: classes[argmax(n.dist)], dist: Object.fromEntries(classes.map((c, i) => [c, n.dist[i]])) } : { feat: FEATS[n.f].key, zh: FEATS[n.f].zh, le: n.thr, l: treeJson(n.l!), r: treeJson(n.r!) });
const cfgs = evalCfgs();
const summary = {
  decisions: decs.length, points: ptSet.length, cfgs: CFGS.map((c) => ({ idx: c, ...cfgs[c] })), library: useLib, k: K, classes, classShare: Object.fromEntries(classes.map((c, i) => [c, prior[i]])),
  acc: { tree: accTree, majority: accBase, randomByFreq: randAcc, top2, depthTable, perCfg, crossCfgAgreement: agree, nTrain: trI.length, nTest: teI.length },
  rules: allLeaves.map(({ node, conds, ...x }) => x), oneVsRest: ovr, tree: treeJson(tree), seconds: +((Date.now() - t0) / 1000).toFixed(0), rules2: { LAB: process.env.LAB ?? "", LAB2: process.env.LAB2 ?? "" },
};
writeFileSync(`${OUT}/distill.json`, JSON.stringify(summary, null, 1));
let md = `# 决策表（从「电脑打电脑」蒸馏）\n\n` +
  `> **适用范围（务必先读）**：这张表只描述「带推演的电脑」（${CFGS.map((c) => `配置${c + 1}=留牌权重${cfgs[c].wCard}/留行动点${cfgs[c].wAp}/深度${cfgs[c].depth}`).join("；")}）在这套规则（LAB/LAB2 见 distill.json）下、面对「朴素默认策略代打的对手和后续」时，**倾向于**选哪类句子。` +
  `它不是「人类最优打法」，也不是「对着会反制的对手最优」；电脑一旦换了估值权重（比如留牌权重 0→0.6），选择会明显变。本次共 ${decs.length} 条决策（${ptSet.length} 个局面 × ${CFGS.length} 种配置；精选句子库 ${useLib ? "已启用" : "未启用"}，每次决策从库里随机抽 ${K} 句 + 基础句 + 手册句）。\n\n` +
  `## 准确率（诚实报告）\n\n` +
  `- 类别（句子家族）共 ${classes.length} 个：${classes.map((c, i) => `${c} ${pct(prior[i])}`).join("、")}\n` +
  `- 测试集（按局面划分的 ${teI.length} 条，训练集看不到这些局面）：**决策树准确率 ${pct(accTree)}**；永远猜最常见类（${classes[baseCls]}）= ${pct(accBase)}；按类别频率随机猜 = ${pct(randAcc)}；决策树的前两名命中 = ${pct(top2)}。提升（对多数类基线）= ${((accTree - accBase) * 100).toFixed(1)} 个百分点，对随机基线 = ${((accTree - randAcc) * 100).toFixed(1)} 个百分点。\n` +
  `- 树深对比（测试/训练）：${depthTable.map((d) => `深${d.depth}: ${pct(d.test)}/${pct(d.train)}`).join("；")}。深度越大训练越高而测试不一定涨 = 过拟合；下面规则用深度 ${DEPTH}。\n` +
  `- 分配置的测试准确率：${perCfg.map((c) => `配置${c.cfg + 1}: ${pct(c.acc)}（多数类基线 ${pct(c.base)}，n=${c.n}）`).join("；")}\n` +
  `- **同一局面在各配置下选同一家族的比例：${pct(agree)}**。这个数越低，说明「该用哪句」越依赖电脑的估值偏好，规则越不能当成通用结论。\n\n` +
  `## 一、决策规则（按覆盖样本数排序）\n\n形式：局面条件 → 倾向的家族（占比、样本数、测试集命中）。「提升」= 叶子里该家族占比 ÷ 全体里该家族占比。\n\n`;
for (const l of allLeaves) {
  md += `- **${l.cond}** → 倾向【${l.major}】（占 ${pct(l.share)}，样本 ${l.n}；测试集 ${l.testN} 条中命中 ${pct(l.testAcc)}；提升 ×${l.lift.toFixed(1)}）${l.second ? `；次选【${l.second}】${pct(l.secondShare)}` : ""}${l.examples.length ? `\n  - 常选的具体句子：${l.examples.join("；")}` : ""}\n`;
}
md += `\n## 二、「什么时候倾向用某类句子」（每个主要家族一棵一对多的小树，只列命中率比总体高 1.6 倍以上的叶子）\n\n`;
for (const o of ovr) {
  md += `### ${o.fam}（总体占 ${pct(o.base)}；测试集 AUC=${isNaN(o.testAuc) ? "—" : o.testAuc.toFixed(2)}，0.5=瞎猜）\n\n`;
  md += o.rules.length ? o.rules.map((x) => `- ${x.cond} → 选它的概率 ${pct(x.precision)}（总体 ${pct(o.base)}，×${x.lift.toFixed(1)}；样本 ${x.n}；测试集 ${x.testN} 条中 ${pct(x.testPrecision)}）`).join("\n") + "\n\n" : "（没有找到明显比总体高的局面条件——这类句子的使用几乎不取决于这些特征）\n\n";
}
md += `## 三、局面特征表\n\n${FEATS.map((f) => `- ${f.zh}（${f.key}${f.bool ? "，是/否" : ""}）`).join("\n")}\n\n` +
  `## 四、局限\n\n- 只代表「电脑打电脑」：对手是朴素默认策略的推演模型，不会反制；真人对局里信息、心理、卡组构成都不同。\n- 家族是按结构硬分的，一个具体句子可能跨家族特征；类别里「普通攻击」常占多数，导致多数类基线很高。\n- 局面来自随机卡组的自我对战，卡组特征（dk*）会直接限制能选什么，规则里出现它们是「没有词就不能说」而不是策略。\n`;
writeFileSync(`${OUT}/decision_table.md`, md);
log(`完成：${OUT}/decision_table.md`);

// 自动调参（外层）：只调数值参数，不改玩法。目标 = 各词「价格值不值」均衡、卡组胜率离散小、局长合理、先后手公平。
// 运行：node --import tsx src/lab2/tune2.ts   （环境变量 OUT ITERS LAMBDA ND K WORKERS SEED）
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
const OUT = process.env.OUT ?? "D:/wc/out6";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "D:/wc/out";
if (existsSync(`${BASE}/rules.json`)) process.env.LAB = readFileSync(`${BASE}/rules.json`, "utf8");
if (existsSync(`${BASE}/rules2.json`)) process.env.LAB2 = readFileSync(`${BASE}/rules2.json`, "utf8");
const { Pool } = await import("./pool");
const { P } = await import("../lab/rules");
const { P2, ADV, ADV_WORDS, applyRules } = await import("./params");
const { randDeck } = await import("./deck");
const { mulberry32 } = await import("./gen");
type Rules = import("./params").Rules;
type Task = import("./worker").Task;

const ITERS = +(process.env.ITERS ?? 20), LAMBDA = +(process.env.LAMBDA ?? 4), ND = +(process.env.ND ?? 64), K = +(process.env.K ?? 24), SEED = +(process.env.SEED ?? 1);
const CFG = { k: 8, depth: 2, w: [1, 0.7, 0.5], passBias: 0, mode: "playbook" as const, wAp: 0.3, wCard: 0.4, recBonus: 0.5 };

// ---------- 可调参数空间（只有数值；玩法结构开关不在这里） ----------
interface Spec { key: string; scope: "P" | "P2" | "ADV"; name: string; sub?: "price" | "max"; values: unknown[] }
const specs: Spec[] = [];
const addP = (name: string, values: unknown[]) => specs.push({ key: `P.${name}`, scope: "P", name, values });
const addP2 = (name: string, values: unknown[]) => specs.push({ key: `P2.${name}`, scope: "P2", name, values });
const rng = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
addP("HP", [12, 14, 16, 18, 20, 22]); addP("AP0", [4, 5, 6]); addP("APINC", [4, 5, 6]); addP("APCAP", [8, 10, 12]); addP("HEAT_FROM", [4, 5, 6]);
addP("HEALC", [1, 2, 3]); addP("SHC", [2, 3, 4]); addP("STAND", [1, 2, 3]); addP("AND", [0, 1, 2]); addP("PIERCE", [1, 2, 3]); addP("REMOVE", [1, 2]); addP("REMOVE_ANY", [3, 4, 5]); addP("CASH", [1, 2]);
addP("WIND_CL", [0, 1, 2]); addP("WIND_N", [0, 1]); addP("THR0", [1, 2]);
addP("CARDS0", [[2, 2, 3, 3, 4], [2, 3, 3, 4, 4], [2, 2, 3, 4], [2, 2, 2, 3, 3, 4]]);
addP("SCHEDULE", [{ 2: [2], 3: [3], 4: [4], 5: [2], 6: [3], 7: [4], 8: [3] }, { 3: [3], 5: [3], 7: [4] }, { 2: [2], 3: [3], 4: [3], 5: [4], 6: [3], 7: [4], 8: [4] }, { 2: [3], 4: [3], 6: [4] }]);
addP2("CHAINAP", [0, 1, 2]); addP2("POS_WORD", [1, 2]); addP2("POS_NUM", [1, 2]); addP2("POS_SPEED", [1, 2, 3]); addP2("STATUS_AP", [1, 2]); addP2("STATUS_MAX", [2, 3, 4]);
addP2("THR_SUM", [2, 3, 4, 5]); addP2("THR_LEN", [2, 3, 4, 5]); addP2("THR_SEGS", [1, 2]); addP2("REFAP", [0, 1]); addP2("REFCOPIES", [1, 2, 3]); addP2("AOE", [0, 1, 2]);
for (const w of ADV_WORDS) { specs.push({ key: `ADV.${w}.price`, scope: "ADV", name: w, sub: "price", values: rng(1, 9) }); specs.push({ key: `ADV.${w}.max`, scope: "ADV", name: w, sub: "max", values: rng(1, 4) }); }

type Cfg = Record<string, unknown>;      // key -> 值
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function baseCfg(): Cfg {
  applyRules({});
  const c: Cfg = {};
  for (const s of specs) c[s.key] = s.scope === "P" ? (P as Record<string, unknown>)[s.name] : s.scope === "P2" ? (P2 as Record<string, unknown>)[s.name] : (ADV[s.name] as Record<string, unknown>)[s.sub!];
  return c;
}
function toRules(c: Cfg): Rules {
  const r: Rules = { P: {}, P2: {}, ADV: {} };
  for (const s of specs) {
    const v = c[s.key];
    if (s.scope === "P") r.P![s.name] = v; else if (s.scope === "P2") r.P2![s.name] = v;
    else { r.ADV![s.name] = { ...(r.ADV![s.name] ?? {}), [s.sub!]: v as number }; }
  }
  return r;
}
function mutate(c: Cfg, r: () => number): { cfg: Cfg; changes: string[] } {
  const n = 2 + Math.floor(r() * 2), out = { ...c }, changes: string[] = [];
  for (let i = 0; i < n; i++) {
    const adv = r() < 0.45, pool = specs.filter((s) => (s.scope === "ADV") === adv);
    const s = pool[Math.floor(r() * pool.length)];
    let idx = s.values.findIndex((v) => same(v, out[s.key])); if (idx < 0) idx = 0;
    let ni = idx + (r() < 0.5 ? -1 : 1); if (ni < 0 || ni >= s.values.length) ni = idx + (ni < 0 ? 1 : -1);
    if (ni < 0 || ni >= s.values.length || ni === idx) continue;
    changes.push(`${s.key}: ${JSON.stringify(out[s.key])}→${JSON.stringify(s.values[ni])}`);
    out[s.key] = s.values[ni];
  }
  return { cfg: out, changes };
}

// ---------- 评估一组参数 ----------
interface Metrics { score: number; spread: number; eff: number; rounds: number; first: number; coef: Record<string, number>; resid: Record<string, number> }
function solve(A: number[][], b: number[]): number[] {   // 高斯消元
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    for (let j = i + 1; j < n; j++) { const f = M[j][i] / M[i][i]; for (let k = i; k <= n; k++) M[j][k] -= f * M[i][k]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return x;
}
async function evaluate(pool: InstanceType<typeof Pool>, cfg: Cfg, seed: number): Promise<Metrics> {
  const rules = toRules(cfg);
  applyRules(rules);
  const r = mulberry32(seed);
  const decks = Array.from({ length: ND }, () => randDeck(r));
  const tasks: Task[] = []; const pairs: [number, number][] = [];
  let id = 0;
  for (let i = 0; i < ND; i++) for (let g = 0; g < K / 2; g++) {
    let j = Math.floor(r() * (ND - 1)); if (j >= i) j++;
    tasks.push({ id: id++, a: decks[i], b: decks[j], seed: seed * 1000 + id * 7, first: (g % 2) as 0 | 1, cfg: CFG, rules }); pairs.push([i, j]);
  }
  const outs = await pool.run(tasks);
  const score = Array(ND).fill(0), cnt = Array(ND).fill(0); let rounds = 0, firstWon = 0, decided = 0;
  for (const o of outs) {
    const [i, j] = pairs[o.id], t = tasks[o.id]; const a = o.win === 0 ? 1 : o.win === 1 ? 0 : 0.5;
    score[i] += a; score[j] += 1 - a; cnt[i]++; cnt[j]++; rounds += o.rounds;
    if (o.win === 0 || o.win === 1) { decided++; if (o.win === t.first) firstWon++; }
  }
  const y = score.map((s, i) => s / cnt[i]);
  const mean = y.reduce((a, b) => a + b, 0) / ND;
  const varAll = y.reduce((a, b) => a + (b - mean) ** 2, 0) / ND, noise = y.reduce((a, p, i) => a + (p * (1 - p)) / cnt[i], 0) / ND;
  const spread = Math.sqrt(Math.max(0, varAll - noise));
  // 岭回归：卡组胜率 ~ 各词张数；每词的「每张贡献」应与价格成比例
  const W = ADV_WORDS.length, X = decks.map((d) => ADV_WORDS.map((w) => d[w] ?? 0));
  const xm = ADV_WORDS.map((_, k) => X.reduce((a, row) => a + row[k], 0) / ND);
  const A = Array.from({ length: W }, () => Array(W).fill(0)), b = Array(W).fill(0), lam = ND * 0.04;
  for (let i = 0; i < ND; i++) for (let p = 0; p < W; p++) { const xp = X[i][p] - xm[p]; b[p] += xp * (y[i] - mean); for (let q = 0; q < W; q++) A[p][q] += xp * (X[i][q] - xm[q]); }
  for (let p = 0; p < W; p++) A[p][p] += lam;
  const coef = solve(A, b);
  const price = ADV_WORDS.map((w) => ADV[w].price);
  const c = coef.reduce((a, v, k) => a + v * price[k], 0) / price.reduce((a, v) => a + v * v, 0);
  const res = coef.map((v, k) => v - c * price[k]);
  const eff = Math.sqrt(res.reduce((a, v) => a + v * v, 0) / W);
  const avgRounds = rounds / outs.length, first = firstWon / Math.max(1, decided);
  const s = 3 * spread + 4 * eff + 0.12 * Math.abs(avgRounds - 5.6) + 1.0 * Math.abs(first - 0.5) + (avgRounds < 4 ? 0.5 : 0) + (avgRounds > 8 ? 0.3 : 0);
  const coefO: Record<string, number> = {}, resO: Record<string, number> = {};
  ADV_WORDS.forEach((w, k) => { coefO[w] = coef[k]; resO[w] = res[k]; });
  return { score: s, spread, eff, rounds: avgRounds, first, coef: coefO, resid: resO };
}

const fmt = (m: Metrics) => `分${m.score.toFixed(3)}｜离散${(m.spread * 100).toFixed(1)}｜词效率偏差${(m.eff * 100).toFixed(1)}｜局长${m.rounds.toFixed(1)}｜先手${(m.first * 100).toFixed(0)}%`;
async function main() {
  const pool = new Pool(+(process.env.WORKERS ?? 18));
  const r = mulberry32(SEED * 7777);
  let best = baseCfg();
  const log = (s: string) => { console.log(s); appendFileSync(`${OUT}/tune.log`, s + "\n"); };
  const t0 = Date.now();
  let bm = await evaluate(pool, best, 1);
  log(`起点：${fmt(bm)}`);
  const history: { it: number; changes: string[]; before: string; after: string }[] = [];
  for (let it = 1; it <= ITERS; it++) {
    const seed = 100 + it;
    const parent = await evaluate(pool, best, seed);          // 同一批随机种子下重新量父代，配对比较
    let cand: { cfg: Cfg; changes: string[]; m: Metrics } | null = null;
    for (let l = 0; l < LAMBDA; l++) {
      const mu = mutate(best, r); const m = await evaluate(pool, mu.cfg, seed);
      if (!cand || m.score < cand.m.score) cand = { ...mu, m };
    }
    const ok = cand && cand.m.score < parent.score - 0.004;
    log(`第${it}轮 ${((Date.now() - t0) / 60000).toFixed(1)}分｜父代 ${fmt(parent)}｜最好子代 ${cand ? fmt(cand.m) : "-"}｜${ok ? "采纳：" + cand!.changes.join("；") : "不采纳"}`);
    if (ok) { best = cand!.cfg; bm = cand!.m; history.push({ it, changes: cand!.changes, before: fmt(parent), after: fmt(cand!.m) }); writeFileSync(`${OUT}/best.json`, JSON.stringify({ cfg: best, rules: toRules(best), metrics: bm, history }, null, 1)); }
  }
  writeFileSync(`${OUT}/best.json`, JSON.stringify({ cfg: best, rules: toRules(best), metrics: bm, history }, null, 1));
  pool.close();
  log(`完成，用时 ${((Date.now() - t0) / 60000).toFixed(1)} 分；采纳 ${history.length} 次`);
  process.exit(0);
}
main();

// 卡组自动进化：预算内随机抽进阶词卡组 → 循环赛 → 竞争性适应度共享 + 新颖度（行为描述符）→ 选择、变异、交叉。
// 运行：node --import tsx src/lab2/evolve.ts   （环境变量 POP GENS OUT SEED WORKERS）
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
if (existsSync((process.env.OUT ?? "D:/wc/out") + "/rules.json")) process.env.LAB = readFileSync((process.env.OUT ?? "D:/wc/out") + "/rules.json", "utf8");
if (existsSync((process.env.OUT ?? "D:/wc/out") + "/rules2.json")) process.env.LAB2 = readFileSync((process.env.OUT ?? "D:/wc/out") + "/rules2.json", "utf8");
import { Pool } from "./pool";
import { mulberry32 } from "./gen";
import { randDeck, mutate, cross, deckKey, addStats, descriptor, dist, type Agg } from "./deck";
import type { Deck } from "./params";
import type { Task } from "./worker";

const POP = +(process.env.POP ?? 40), GENS = +(process.env.GENS ?? 60), OUT = process.env.OUT ?? "D:/wc/out", SEED = +(process.env.SEED ?? 1), WORKERS = +(process.env.WORKERS ?? 8);
const GPP = 2;   // 每对卡组打几局（先后手各一）
mkdirSync(OUT, { recursive: true });
const r = mulberry32(SEED * 7919);

export interface Eval { W: number[][]; agg: Agg[]; desc: number[][]; rounds: number }
export async function roundRobin(pool: Pool, decks: Deck[], gpp: number, seed0: number, rec = false): Promise<{ ev: Eval; shapes: Record<string, number>[] }> {
  const tasks: (Task & { i: number; j: number })[] = [];
  let id = 0;
  for (let i = 0; i < decks.length; i++) for (let j = i + 1; j < decks.length; j++) for (let g = 0; g < gpp; g++) tasks.push({ id: id++, i, j, a: decks[i], b: decks[j], seed: seed0 + id * 31, first: (g % 2) as 0 | 1, rec });
  const outs = await pool.run(tasks);
  const n = decks.length, sc = Array.from({ length: n }, () => Array(n).fill(0)), cnt = Array.from({ length: n }, () => Array(n).fill(0));
  const agg: Agg[] = Array.from({ length: n }, () => ({})), shapes: Record<string, number>[] = Array.from({ length: n }, () => ({}));
  let rounds = 0;
  for (const o of outs) {
    const t = tasks[o.id]; const a = o.win === 0 ? 1 : o.win === 2 || o.win < 0 ? 0.5 : 0;
    sc[t.i][t.j] += a; sc[t.j][t.i] += 1 - a; cnt[t.i][t.j]++; cnt[t.j][t.i]++; rounds += o.rounds;
    addStats(agg[t.i], o.stats, 0, o.rounds, a); addStats(agg[t.j], o.stats, 1, o.rounds, 1 - a);
    if (o.shapes) for (const [s, m] of [[t.i, o.shapes[0]], [t.j, o.shapes[1]]] as [number, Record<string, number>][]) for (const [k, v] of Object.entries(m)) shapes[s][k] = (shapes[s][k] ?? 0) + v;
  }
  const W = sc.map((row, i) => row.map((v, j) => (i === j ? 0 : v / Math.max(1, cnt[i][j]))));
  return { ev: { W, agg, desc: agg.map(descriptor), rounds: rounds / Math.max(1, outs.length) }, shapes };
}
const norm = (xs: number[]) => { const lo = Math.min(...xs), hi = Math.max(...xs); return xs.map((x) => (hi > lo ? (x - lo) / (hi - lo) : 0.5)); };
/** 适应度：竞争性共享（打赢「很少有人能赢」的对手更值钱）+ 新颖度（描述符离别人远） */
export function fitness(ev: Eval): { fit: number[]; shared: number[]; nov: number[] } {
  const n = ev.W.length;
  const colSum = Array.from({ length: n }, (_, j) => ev.W.reduce((a, row, i) => a + (i === j ? 0 : row[j]), 0));
  const shared = ev.W.map((row) => row.reduce((a, v, j) => a + v / Math.max(0.5, colSum[j]), 0));
  const nov = ev.desc.map((d, i) => { const ds = ev.desc.map((e, j) => (i === j ? Infinity : dist(d, e))).sort((a, b) => a - b); return (ds[0] + ds[1] + ds[2]) / 3; });
  const a = norm(shared), b = norm(nov);
  const lenPen = ev.agg.map((g) => { const L = (g.rounds ?? 0) / Math.max(1, g.games ?? 1); return L < 3.5 || L > 8 ? 0.15 : 0; });
  return { fit: a.map((x, i) => x + 0.6 * b[i] - lenPen[i]), shared, nov };
}

async function main() {
  const pool = new Pool(WORKERS);
  let pop: Deck[] = Array.from({ length: POP }, () => randDeck(r));
  const hall: { deck: Deck; gen: number; fit: number; shared: number }[] = [];
  const t0 = Date.now();
  for (let gen = 1; gen <= GENS; gen++) {
    const { ev } = await roundRobin(pool, pop, GPP, SEED * 100000 + gen * 1000);
    const { fit, shared, nov } = fitness(ev);
    const order = pop.map((_, i) => i).sort((a, b) => fit[b] - fit[a]);
    const winRate = ev.agg.map((g) => (g.won ?? 0) / Math.max(1, g.games ?? 1));
    const bestWin = Math.max(...winRate), spread = Math.sqrt(winRate.reduce((a, x) => a + (x - 0.5) ** 2, 0) / POP);
    const div = nov.reduce((a, b) => a + b, 0) / POP;
    console.log(`第${gen}代 ${((Date.now() - t0) / 1000).toFixed(0)}s｜平均${ev.rounds.toFixed(1)}轮｜最高胜率${(bestWin * 100).toFixed(0)}%｜胜率离散${(spread * 100).toFixed(1)}｜多样度${div.toFixed(3)}｜头名 ${deckKey(pop[order[0]])}`);
    for (const i of order.slice(0, 3)) hall.push({ deck: pop[i], gen, fit: fit[i], shared: shared[i] });
    writeFileSync(`${OUT}/evo_state.json`, JSON.stringify({ gen, pop, hall }, null, 0));
    if (gen === GENS) break;
    // 选择：按适应度取，但互相太像的只留一个（多样性保护）
    const elites: number[] = [];
    for (const i of order) { if (elites.every((e) => dist(ev.desc[i], ev.desc[e]) > 0.06) || elites.length < 3) elites.push(i); if (elites.length >= Math.floor(POP * 0.35)) break; }
    for (const i of order) { if (elites.length >= Math.floor(POP * 0.35)) break; if (!elites.includes(i)) elites.push(i); }
    const next: Deck[] = elites.map((i) => pop[i]);
    const tour = () => { const a = elites[Math.floor(r() * elites.length)], b = elites[Math.floor(r() * elites.length)]; return fit[a] > fit[b] ? a : b; };
    while (next.length < POP - 2) { const p = pop[tour()]; next.push(r() < 0.5 ? mutate(p, r) : cross(p, pop[tour()], r)); }
    while (next.length < POP) next.push(randDeck(r));
    pop = next;
  }
  pool.close();
  console.log(`完成，用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒，结果在 ${OUT}/evo_state.json`);
}
if (process.argv[1]?.endsWith("evolve.ts")) main();

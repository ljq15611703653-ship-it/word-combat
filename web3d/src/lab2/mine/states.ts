// 局面样本库：多种电脑配置、随机卡组的自我对战，在「轮到某方宣告」之前存局面，再按（轮次段 × 位置 × 对方有无长期句）分层抽样。
// 运行：node --import tsx src/lab2/mine/states.ts      环境变量 N=300（局面数） OUT SEED=100 P=0.25 GAMES=（自我对战局数，默认自动）
// 输出：$OUT/points.jsonl（一行一个局面点：st=整个对局状态的 JSON，可直接还原成 St；side=轮到谁；unit=哪个随从）与 points.meta.json
import { createWriteStream, writeFileSync } from "node:fs";
import { OUT } from "./mineenv";
import { MPool } from "./mpool";
import { mulberry32 } from "../gen";
import { rndBucket, pick, type Snap, type Point } from "./minelib";

const N = +(process.env.N ?? 300), SEED = +(process.env.SEED ?? 100), PSNAP = +(process.env.P ?? 0.25);
const GAMES = +(process.env.GAMES ?? Math.ceil(N * 0.5));
const NAME = process.env.NAME ?? "points";     // 输出文件名（不含扩展名）
const t0 = Date.now();
const pool = new MPool();
const per = 2;
const argsList = Array.from({ length: Math.ceil(GAMES / per) }, (_, i) => ({ seeds: Array.from({ length: per }, (_, j) => SEED + i * per + j), p: PSNAP }));
const snaps = (await pool.run<Snap[]>("snaps", argsList, (d, t) => { if (d % 10 === 0 || d === t) process.stderr.write(`\r自我对战 ${d}/${t}`); })).flat();
pool.close();
process.stderr.write("\n");
const r = mulberry32(SEED ^ 0x1234567);
// 每个快照随机挑一个还没说话的随从；分层
const cands: Point[] = snaps.map((x) => { const ps = [...new Set(x.units.map((v) => v % 3))], pp = pick(r, ps); return { st: x.st, side: x.side, unit: pick(r, x.units.filter((u) => u % 3 === pp)), rndB: rndBucket(x.st.rnd) }; });   // 先均匀挑位置、再挑随从
const keyOf = (p: Point) => `${p.rndB}|${p.unit % 3}|${p.st.stand.some((s) => s.owner !== p.side) ? 1 : 0}`;
const buckets = new Map<string, Point[]>();
for (const p of cands) { const k = keyOf(p); (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(p); }
for (const b of buckets.values()) for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
const chosen: Point[] = [];
for (let round = 0; chosen.length < Math.min(N, cands.length); round++) {
  let any = false;
  for (const b of [...buckets.values()]) { if (round < b.length && chosen.length < N) { chosen.push(b[round]); any = true; } }
  if (!any) break;
}
for (let i = chosen.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [chosen[i], chosen[j]] = [chosen[j], chosen[i]]; }   // 打乱，让「取前 K 个」也是均匀样本
const ws = createWriteStream(`${OUT}/${NAME}.jsonl`);
for (const p of chosen) ws.write(JSON.stringify(p) + "\n");
ws.end();
const cnt = (f: (p: Point) => string | number) => { const m: Record<string, number> = {}; for (const p of chosen) { const k = String(f(p)); m[k] = (m[k] ?? 0) + 1; } return m; };
const meta = {
  n: chosen.length, snapshots: snaps.length, games: GAMES, seconds: +((Date.now() - t0) / 1000).toFixed(1),
  byRound: cnt((p) => p.st.rnd), byPos: cnt((p) => p.unit % 3), foeStanding: cnt((p) => (p.st.stand.some((s) => s.owner !== p.side) ? "对方有长期句" : "对方无")),
  mineStanding: cnt((p) => (p.st.stand.some((s) => s.owner === p.side) ? "我方有长期句" : "我方无")), side: cnt((p) => p.side),
  apBand: cnt((p) => { const a = p.st.side[p.side].ap; return a <= 3 ? "低(≤3)" : a <= 6 ? "中" : "高(≥7)"; }),
  hpBand: cnt((p) => { const h = p.st.hp.slice(p.side * 3, p.side * 3 + 3).reduce((a, b) => a + Math.max(0, b), 0); return h < 15 ? "我方低血" : h < 30 ? "中" : "高"; }),
  rules: { LAB: process.env.LAB ?? "", LAB2: process.env.LAB2 ?? "" },
};
writeFileSync(`${OUT}/${NAME}.meta.json`, JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta));

// 随机搜索参数：tsx src/lab/tune.ts <次数> <每对局数> [基础JSON] ；结果追加到 /tmp/claude-0/tune.ndjson
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { rngOf } from "./ai";
const [N, G] = [+(process.argv[2] ?? 20), +(process.argv[3] ?? 40)];
const base = JSON.parse(process.argv[4] ?? "{}");
const rng = rngOf(+(process.argv[5] ?? 11));
const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const SCHEDS = [{ 3: [2], 5: [3], 7: [4] }, { 2: [2], 3: [3], 5: [3], 7: [4] }, { 2: [2], 4: [3], 6: [4], 8: [4] }, { 2: [2], 3: [2], 4: [3], 5: [3], 6: [4], 7: [4] }];
const CARDS = [[2, 3], [2, 2, 3], [2, 3, 3], [3, 4]];
const ST = ["ATK", "TURTLE", "TRAP", "BURST", "FULL"];
let cur: any = process.env.CLIMB ? { ...base } : null;
function mutate(b: any) {
  const q = { ...b };
  const keys = ["PIERCE", "WIND_CL", "WIND_N", "HP", "AP0", "APINC", "APCAP", "HEAT_FROM", "HEALC", "SHC", "STAND", "THR0", "AND", "CASH", "REMOVE", "REMOVE_ANY", "SPEC", "HEALPEN", "CARDS0", "SCHEDULE"];
  const lim: Record<string, [number, number]> = { HP: [6, 14], AP0: [3, 8], APINC: [2, 7], APCAP: [8, 14], HEAT_FROM: [2, 6], HEALC: [1, 4], SHC: [1, 4], STAND: [1, 3], THR0: [1, 3], AND: [0, 2], CASH: [0, 3], REMOVE: [1, 3], REMOVE_ANY: [1, 5], HEALPEN: [0, 2], PIERCE: [0, 3], WIND_CL: [0, 3], WIND_N: [0, 2] };
  for (let i = 0; i < int(1, 3); i++) {
    const k = pick(keys);
    if (k === "SPEC") q.SPEC = pick([2, 3, 4, 6, 99]);
    else if (k === "CARDS0") q.CARDS0 = pick(CARDS);
    else if (k === "SCHEDULE") q.SCHEDULE = pick(SCHEDS);
    else q[k] = Math.min(lim[k][1], Math.max(lim[k][0], q[k] + pick([-1, 1])));
  }
  return q;
}
function sample() {
  if (cur) return mutate(cur);
  return { ...base, HP: int(6, 12), AP0: int(3, 7), APINC: int(2, 6), APCAP: int(8, 12), HEAT_FROM: int(3, 5), HEALC: int(1, 3), SHC: int(1, 3), STAND: int(1, 2), THR0: int(1, 3), AND: int(0, 2), CASH: int(0, 2), REMOVE: int(1, 3), REMOVE_ANY: int(2, 4), SPEC: pick([2, 3, 4, 6, 99]), HEALPEN: pick([0, 0, 1]), EXACT: false, CARDS0: pick(CARDS), SCHEDULE: pick(SCHEDS) };
}
function score(out: string) {
  const lines = out.split("\n");
  const m: Record<string, Record<string, number>> = {};
  for (const l of lines) { const mm = l.match(/^(ATK|TURTLE|TRAP|BURST|FULL)\s+(.*%.*|-.*)$/); if (!mm || !l.includes("%") && !l.includes(" - ")) continue; if (l.includes("每局")) continue; const cells = l.trim().split(/\s+/).slice(1); const row: Record<string, number> = {}; ST.forEach((c, i) => { const v = cells[i]; if (v && v.endsWith("%")) row[c] = +v.slice(0, -1); }); m[mm[1]] = row; }
  const rounds = +(out.match(/平均轮数 ([\d.]+)/)?.[1] ?? 9);
  const usage = (sty: string, key: string) => +(out.match(new RegExp(sty + "\\s+每局：[^\\n]*?" + key + "([\\d.]+)"))?.[1] ?? 0);
  const S = ST.slice(0, 4);
  let loss = 0;
  const notes: string[] = [];
  for (const a of S) {
    const vs = S.filter((b) => b !== a).map((b) => m[a]?.[b] ?? 50);
    const avg = vs.reduce((x, y) => x + y, 0) / vs.length;
    loss += Math.max(0, Math.abs(avg - 50) - 4) * 1.5;
    if (!vs.some((v) => v >= 60)) { loss += 6; notes.push(a + "无猎物"); }
    if (!vs.some((v) => v <= 40)) { loss += 6; notes.push(a + "无天敌"); }
    for (const v of vs) if (v > 80 || v < 20) loss += (Math.abs(v - 50) - 30) * 1.2;
  }
  const fullAvg = S.map((b) => 100 - (m[b]?.FULL ?? 50)).reduce((x, y) => x + y, 0) / 4;
  if (fullAvg < 50 || fullAvg > 65) loss += Math.abs(fullAvg - 57) * 0.8;
  if (rounds < 4.5 || rounds > 6.2) loss += Math.abs(rounds - 5.3) * 8;
  if (usage("TRAP", "触发") < 1.5) loss += 6;
  if (usage("BURST", "爆发") < 1.0) loss += 6;
  return { loss: +loss.toFixed(1), rounds, notes, m, fullAvg: +fullAvg.toFixed(0) };
}
let bestLoss = 1e9;
if (cur) bestLoss = Infinity;
for (let i = 0; i < N; i++) {
  const p = sample();
  const r = spawnSync("node_modules/.bin/tsx", ["src/lab/run.ts", "all", String(G)], { env: { ...process.env, LAB: JSON.stringify(p) }, encoding: "utf8" });
  const sc = score(r.stdout);
  const line = JSON.stringify({ ...sc, p });
  appendFileSync("/tmp/claude-0/tune.ndjson", line + "\n");
  if (cur && sc.loss < bestLoss) { bestLoss = sc.loss; cur = p; console.log("  ↑ 新最优"); }
  console.log(`#${i} loss ${sc.loss} rounds ${sc.rounds.toFixed(2)} ${sc.notes.join(",")}`);
}

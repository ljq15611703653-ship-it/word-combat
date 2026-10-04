// 原型模拟入口：tsx src/lab/run.ts all <局数>   或   tsx src/lab/run.ts one <A> <B> <局数> [seed]
import { spawn } from "node:child_process";
import { choose, rngOf, STYLES, type Style } from "./ai";
import { declare, newGame, nextRound, nextSide, passUnit, resolveRound, alive, unitsOf } from "./sim";

function play(a: Style, b: Style, seed: number) {
  const rng = rngOf(seed);
  const s = newGame((seed & 1) as 0 | 1);
  const st = [a, b];
  for (let g = 0; g < 400 && s.win < 0; g++) {
    const ns = nextSide(s);
    if (ns === -1) { resolveRound(s); if (s.win < 0) nextRound(s); continue; }
    const c = choose(s, ns, st[ns], rng);
    if (c && c.cl.length) declare(s, ns, c.unit, c.cl, c.start);
    else { const u = unitsOf(ns).find((x) => alive(s, x) && !s.done[x])!; passUnit(s, u); }
    s.turn = (1 - ns) as 0 | 1;
  }
  return s;
}
const mode = process.argv[2];
if (mode === "one") {
  const [A, B, N, seed0] = [process.argv[3] as Style, process.argv[4] as Style, +process.argv[5], +(process.argv[6] ?? 1)];
  const r = { A, B, n: N, w: [0, 0, 0], rounds: 0, stats: {} as Record<string, number> };
  for (let i = 0; i < N; i++) {
    const s = play(A, B, seed0 * 1000 + i);
    r.w[s.win === 2 || s.win < 0 ? 2 : s.win]++; r.rounds += s.rnd;
    for (const [k, v] of Object.entries(s.stats)) r.stats[k] = (r.stats[k] ?? 0) + v;
  }
  console.log(JSON.stringify(r));
} else {
  const N = +(process.argv[3] ?? 60);
  const pairs: [Style, Style][] = [];
  for (let i = 0; i < STYLES.length; i++) for (let j = i; j < STYLES.length; j++) pairs.push([STYLES[i], STYLES[j]]);
  const results: any[] = [];
  let running = 0, idx = 0;
  const next = () => {
    while (running < 4 && idx < pairs.length) {
      const [A, B] = pairs[idx++];
      running++;
      const p = spawn("node_modules/.bin/tsx", ["src/lab/run.ts", "one", A, B, String(N), "7"], { stdio: ["ignore", "pipe", "inherit"] });
      let buf = ""; p.stdout.on("data", (d) => (buf += d));
      p.on("close", () => { try { results.push(JSON.parse(buf.trim().split("\n").pop()!)); } catch { console.error("fail", A, B, buf); } running--; if (idx >= pairs.length && running === 0) report(results); else next(); });
    }
  };
  next();
}
function report(rs: any[]) {
  const get = (A: string, B: string) => { const r = rs.find((x) => x.A === A && x.B === B); if (r) return r.w[0] / Math.max(1, r.w[0] + r.w[1]); const q = rs.find((x) => x.A === B && x.B === A); return q ? q.w[1] / Math.max(1, q.w[0] + q.w[1]) : NaN; };
  console.log("胜率矩阵（行 对 列，只算分出胜负的局）");
  console.log("      " + STYLES.map((s) => s.padStart(7)).join(""));
  for (const a of STYLES) console.log(a.padEnd(6) + STYLES.map((b) => (a === b ? "     - " : (get(a, b) * 100).toFixed(0).padStart(6) + "%")).join(""));
  const tot = rs.reduce((a, r) => ({ n: a.n + r.n, rounds: a.rounds + r.rounds }), { n: 0, rounds: 0 });
  console.log(`平均轮数 ${(tot.rounds / tot.n).toFixed(2)}，平局 ${(rs.reduce((a, r) => a + r.w[2], 0) / tot.n * 100).toFixed(0)}%`);
  for (const sty of STYLES) {
    const agg: Record<string, number> = {}; let games = 0;
    for (const r of rs) { for (const [sd, who] of [["s0", r.A], ["s1", r.B]] as const) if (who === sty) { games += r.n; for (const [k, v] of Object.entries(r.stats as Record<string, number>)) if (k.startsWith(sd + ":")) agg[k.slice(3)] = (agg[k.slice(3)] ?? 0) + v; } }
    const f = (k: string) => ((agg[k] ?? 0) / Math.max(1, games)).toFixed(2);
    console.log(`${sty.padEnd(6)} 每局：句${f("sent")} 段${f("len")} 不出手${f("pass")} 行动点${f("ap")} | dmg段${f("dmg")} 打掉${f("dealt")} 恢复${f("healed")} 触发${f("fire")} 爆发${f("burst")} 移除${f("removed")}/落空${f("removeMiss")} 挂句：trig${f("trig")} absent${f("absent")} delay${f("delay")}`);
  }
}

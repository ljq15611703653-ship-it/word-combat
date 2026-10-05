// 并行对战：node scripts/duanju-ai-par.mjs <A规格> <B规格> [局数=200] [进程数=16] [种子=1]
// 规格 impl:tier:class，例 new:大师:* old:大师:~ ；输出 A 方的 胜/平/负/胜率
import { spawn } from "node:child_process";
const [, , A, B, N = "200", W = "16", seed = "1"] = process.argv;
const n = +N, w = Math.min(+W, Math.ceil(n / 16));
const per = Math.ceil(n / w / 16) * 16;
const jobs = [];
for (let o = 0; o < n; o += per) jobs.push(new Promise((res, rej) => {
  const c = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/duanju-ai-cell.ts", A, B, String(Math.min(per, n - o)), seed, String(o)], { env: { ...process.env, TEMP: "D:/wc/tmp", TMP: "D:/wc/tmp" } });
  let out = "", err = ""; c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (err += d));
  c.on("close", (code) => { try { res(JSON.parse(out.trim().split("\n").pop())); } catch { rej(new Error(err.slice(0, 500) || out)); } });
}));
const rs = await Promise.all(jobs);
const t = rs.reduce((a, r, i) => { const m = Math.min(per, n - i * per); a.w += r.w; a.d += r.d; a.l += r.l; a.rounds += r.rounds * m; a.n += m; return a; }, { w: 0, d: 0, l: 0, rounds: 0, n: 0 });
console.log(`${A}  vs  ${B}: A胜率 ${((t.w + t.d / 2) / t.n * 100).toFixed(1)}%  (胜${t.w} 平${t.d} 负${t.l}, ${t.n}局, 均${(t.rounds / t.n).toFixed(1)}轮)`);

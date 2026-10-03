// 全灭即胜模式的平衡模拟：node_modules/.bin/tsx src/engine/simwipe.ts [局数] [env: NODEF=1 一方只进攻]
declare const process: { argv: string[]; env: Record<string, string | undefined> };
import { Match } from "./match";
import { CLASSES, presetDeck, type Cls } from "./rules";
import { choose, assignLate } from "./ai";

const n = +(process.argv[2] ?? 200);
const mode = process.env.MODE ?? "wipe";            // wipe | old
const noDef0 = process.env.NODEF === "1";           // 0 号位只进攻（对照组）
const kinds = ["atk", "heal", "mit", "st", "redirect", "delay", "remove"];
const KN: Record<string, string> = { atk: "伤害", heal: "恢复", mit: "减伤", st: "状态", redirect: "转移", delay: "延后", remove: "移除" };

const wins: Record<string, number> = {}, games: Record<string, number> = {};
for (const c of CLASSES) { wins[c] = 0; games[c] = 0; }
const clauseCnt: Record<string, Record<string, number>> = {}, apSpent: Record<string, Record<string, number>> = {};
for (const c of CLASSES) { clauseCnt[c] = {}; apSpent[c] = {}; for (const k of kinds) { clauseCnt[c][k] = 0; apSpent[c][k] = 0; } }
let rounds = 0, decided = 0, timeouts = 0, draws = 0, firstW = 0, seat0W = 0, seat0N = 0, koSum = 0, passN = 0, actN = 0;
const lens: number[] = [];
const pw: Record<string, number> = {}, pg: Record<string, number> = {};
const koRound: number[] = [];                       // 第几轮倒下了人
const t0 = Date.now();
for (let g = 0; g < n; g++) {
  const nc = CLASSES.length;
  const c0 = CLASSES[g % nc] as Cls, c1 = CLASSES[(g + 1 + (Math.floor(g / nc) % (nc - 1))) % nc] as Cls;
  const m = new Match() as any;
  if (noDef0) m.aiNoDef = [true, false];
  m.start(presetDeck(c0, mode === "wipe"), presetDeck(c1, mode === "wipe"), 1 + g, false, false, mode === "wipe" ? { wipe: true } : {});
  let steps = 0;
  while (m.phase !== "over" && steps++ < 4000) {
    if (m.phase === "declare") {
      const s = m.declareSide();
      if (s === -1) {
        m.resolveRound();
        for (const a of m.lastDeclared) {
          const cls = m.clsOf(a.side);
          for (const c of a.cl) { clauseCnt[cls][c.k]++; apSpent[cls][c.k] += a.cost / a.cl.length; }
          actN++;
        }
        passN += m.passed[0].length + m.passed[1].length;
        for (const e of m.lastEvents) if (e.type === "ko") { koSum++; koRound.push(m.rnd); }
      } else { const pick = choose(m, s); m.submit(s, pick.uid, pick.act); }
    } else if (m.phase === "assign") {
      for (let s2 = 0; s2 < 2; s2++) if (m.clsOf(s2) === "择") assignLate(m, s2);
      m.finishAssign();
    } else if (m.phase === "resolved") m.nextRound();
  }
  rounds += m.rnd; lens.push(m.rnd);
  if (m.winner === -2) draws++;
  if (m.winner >= 0) {
    decided++;
    if (m.winner === m.first0) firstW++;
    seat0N++; if (m.winner === 0) seat0W++;
    if (c0 !== c1) { wins[m.clsOf(m.winner)]++; const l = m.clsOf(1 - m.winner); pw[m.clsOf(m.winner) + l] = (pw[m.clsOf(m.winner) + l] ?? 0) + 1; }
  }
  if (c0 !== c1) { pg[c0 + c1] = (pg[c0 + c1] ?? 0) + 1; pg[c1 + c0] = (pg[c1 + c0] ?? 0) + 1; }
  if (m.rnd >= 12 && m.winner !== -1) { const dead = [0, 1].map((s: number) => m.R.U.filter((u: any) => u.side === s).every((u: any) => u.down !== -1)); if (!dead[0] && !dead[1]) timeouts++; }
  if (c0 !== c1) { games[c0]++; games[c1]++; }
}
lens.sort((a, b) => a - b);
const pct = (x: number, t: number) => `${((100 * x) / Math.max(1, t)).toFixed(0)}%`;
console.log(`[${mode}${noDef0 ? " · 0号位只进攻" : ""}] ${n} 局 平均 ${(rounds / n).toFixed(1)} 轮（中位 ${lens[Math.floor(n / 2)]}，最短 ${lens[0]}，最长 ${lens[n - 1]}）超时判定 ${timeouts} 局 平局 ${draws} 先手胜 ${pct(firstW, decided)} 0号位胜 ${pct(seat0W, seat0N)} 用时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log("职业胜率：" + CLASSES.map((c) => `${c} ${pct(wins[c], games[c])}`).join("  "));
const tot = (o: Record<string, number>) => kinds.reduce((a, k) => a + o[k], 0);
for (const c of CLASSES) {
  const t = tot(clauseCnt[c]), ta = tot(apSpent[c]);
  console.log(`  ${c}流 句段占比：` + kinds.map((k) => `${KN[k]} ${pct(clauseCnt[c][k], t)}`).join(" ") + `　｜行动点占比：伤害 ${pct(apSpent[c].atk, ta)} 防御(恢复+减伤+转移) ${pct(apSpent[c].heal + apSpent[c].mit + apSpent[c].redirect, ta)}`);
}
console.log("对阵（行 vs 列，行方胜率）：    " + CLASSES.join("     "));
for (const a of CLASSES) console.log(`  ${a}  ` + CLASSES.map((b) => (a === b ? "  -  " : pct(pw[a + b] ?? 0, pg[a + b] ?? 0).padStart(4) + " ")).join("   "));
const kr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => koRound.filter((x) => x === r).length);
console.log(`每局倒下 ${(koSum / n).toFixed(2)} 个随从；第 1~12 轮倒下的人数：${kr.join(" ")}；每轮平均宣告 ${(actN / rounds / 2).toFixed(2)} 句/方、不出手 ${(passN / rounds / 2).toFixed(2)} 个/方`);

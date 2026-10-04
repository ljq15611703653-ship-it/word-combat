// 挖掘工具链的工作进程：按 job 名分派。大数据（句子库、局面库）由工作进程自己读文件缓存，消息里只传下标，避免 IPC 传几十 MB。
import "./mineenv";
import { readFileSync } from "node:fs";
import { clone, canAfford, alive, unitsOf, type St } from "../interp";
import { act, dmg, heal, shield, type Sentence } from "../ast";
import { playbookNamed } from "../playbook";
import { mulberry32 } from "../gen";
import { selfplaySnaps, evalCfgs, evalState, baselineValue, marginal, features, family, startsFor, rollout, pick, type Point, type Family } from "./minelib";
import type { SentRec } from "./mine";
import type { AiCfg } from "../ai";

const readLines = <T>(f: string): T[] => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const cache = new Map<string, any>();
const load = <T>(f: string): T[] => { if (!cache.has(f)) cache.set(f, readLines<T>(f)); return cache.get(f); };
const evalSt = new Map<string, St>();
const baseCache = new Map<string, number>();

// ---------- job: snaps ----------
function jobSnaps(a: { seeds: number[]; p: number }) { return a.seeds.flatMap((s) => selfplaySnaps(s, a.p)); }

// ---------- job: eval ----------
/** 每句话一行聚合：[适用点数, 边际总和, 正边际总和(选项价值), 胜过基线点数, 位置0:(点数,边际,选项), 位置1:…, 位置2:…] */
function jobEval(a: { sentFile: string; ids: number[]; pointFile: string; pts: number[]; cfg: number; depth?: number }) {
  const sents = load<SentRec>(a.sentFile), pts = load<Point>(a.pointFile);
  const cfg0 = evalCfgs()[a.cfg];
  const cfg: AiCfg = a.depth ? { ...cfg0, depth: a.depth } : cfg0;
  const out: number[][] = a.ids.map(() => Array(13).fill(0));
  for (const pi of a.pts) {
    const p = pts[pi], ek = `${a.pointFile}#${pi}`;
    let s = evalSt.get(ek); if (!s) { s = evalState(p); if (evalSt.size > 4000) evalSt.clear(); evalSt.set(ek, s); }
    const bk = `${a.cfg}:${cfg.depth}:${ek}`;
    let base = baseCache.get(bk); if (base === undefined) { base = baselineValue(s, p.side, p.unit, cfg); if (baseCache.size > 200000) baseCache.clear(); baseCache.set(bk, base); }
    const pos = p.unit % 3;
    a.ids.forEach((id, i) => {
      const g = marginal(s!, p.side, p.unit, sents[id].cl, cfg, base!);
      if (g === null) return;
      const o = out[i], opt = Math.max(0, g);
      o[0]++; o[1] += g; o[2] += opt; if (g > 0.5) o[3]++;
      o[4 + pos * 3]++; o[5 + pos * 3] += g; o[6 + pos * 3] += opt;
    });
  }
  return out;
}

// ---------- job: decide（带推演的电脑在库里选句子；记录特征与选择的家族） ----------
const nameOfKey = (() => { const m = new Map<string, string>(); for (const x of playbookNamed()) m.set(JSON.stringify(x.cl), x.name); return m; })();
interface Dec { feat: Record<string, number>; fam: Family; text: string; name: string; unit: number; gap: number; nApp: number; pt: number }
/** 复刻 ai.think 的流程，但候选句子 = 基础句 + 手册句 + 从「精选句子库」里随机抽的 K 句（只取当前说得出口的） */
function jobDecide(a: { pointFile: string; pts: number[]; libFile: string; k: number; cfg: number; seed: number }) {
  const pts = load<Point>(a.pointFile), lib = a.libFile ? load<SentRec>(a.libFile) : [];
  const cfg = evalCfgs()[a.cfg];
  const r = mulberry32(a.seed);
  const out: Dec[] = [];
  for (const pi of a.pts) {
    const p = pts[pi];
    const s = clone(p.st); // 保留真实卡组：电脑只能说卡组里有词的句子
    const side = p.side;
    const us = unitsOf(side).filter((x) => alive(s, x) && !s.done[x]);
    if (!us.length) continue;
    const maxN = Math.max(1, ...s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v));
    let best: { u: number; cl: Sentence | null; start: number } = { u: us[0], cl: null, start: 1 }, bestV = -Infinity, second = -Infinity, nApp = 0;
    for (const u of us) {
      const v0 = rollout(s, side, u, null, 1, cfg);
      if (v0 > bestV) { second = bestV; bestV = v0; best = { u, cl: null, start: 1 }; } else if (v0 > second) second = v0;
      const cands: Sentence[] = [];
      const seen = new Set<string>();
      const add = (cl: Sentence) => { const k = JSON.stringify(cl); if (!seen.has(k) && canAfford(s, side, cl, u)) { seen.add(k); cands.push(cl); } };
      for (let n = 1; n <= Math.min(3, maxN); n++) add([act(dmg(n, { t: "lowFoe" }))]);
      if (s.hp.slice(side * 3, side * 3 + 3).some((h) => h > 0 && h < 99)) { add([act(heal(2, { t: "lowMe" }))]); add([act(shield(Math.min(2, maxN), { t: "lowMe" }))]); }
      playbookNamed().forEach((x) => add(x.cl));
      if (lib.length) for (let t = 0, got = 0; t < a.k * 25 && got < a.k; t++) { const x = pick(r, lib); const before = cands.length; add(x.cl); if (cands.length > before) got++; }
      nApp += cands.length;
      for (const cl of cands) for (const st of startsFor(cl, u)) {
        const v = rollout(s, side, u, cl, st, cfg) + (cl.length > 1 || cl.some((c) => c.k !== "act" || typeof c.eff.n !== "number") ? cfg.recBonus : 0);
        if (v > bestV) { second = bestV; bestV = v; best = { u, cl, start: st }; } else if (v > second && !(best.cl === cl)) second = v;
      }
    }
    const fam: Family = best.cl ? family(best.cl) : "不出手";
    const text = best.cl ? JSON.stringify(best.cl) : "";
    out.push({ feat: features(s, side, best.u), fam, text, name: best.cl ? nameOfKey.get(text) ?? "" : "", unit: best.u, gap: bestV - second, nApp, pt: pi });
  }
  return out;
}

const jobs: Record<string, (a: any) => any> = { snaps: jobSnaps, eval: jobEval, decide: jobDecide };
process.on("message", (m: { id: number; job: string; args: any }) => {
  try { process.send!({ id: m.id, result: jobs[m.job](m.args) }); }
  catch (e: any) { process.send!({ id: m.id, error: String(e?.stack ?? e) }); }
});

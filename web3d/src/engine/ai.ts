// 数字牌模式 · 电脑（移植自 nc_ai.gd）：每个候选放进“这一轮已宣告的所有句子”里模拟一遍，按估值挑最好的
import * as NR from "./rules";
import * as NE from "./engine";
import type { Act, Clause, RState } from "./engine";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const PASS_GAIN = 0.3;
const KO_LOOK = 0.5, DANGER_HP = 4, DANGER_W = 1.0, CONT_LOOK = 0.6, COMBO_K = 6, REP_MAX = 3;
const WIPE_PROG = 20, WIPE_UNIT = 7, WIPE_HP = 1.2, WIPE_DANGER = 0.8;

export function statValue(R: RState, s: number): number {
  let v = 0;
  for (const u of R.U) {
    if (u.down !== -1) continue;
    for (const nm in u.st) if (u.st[nm][2] === s) v += u.st[nm][0];
  }
  return v;
}

export function contValue(R: RState, s: number): number {
  let v = 0;
  for (const c of R.conts) {
    if (c.side !== s) continue;
    const cl = c.cl;
    const cnt = cl.count ?? (cl.tg ?? [1]).length;
    v += (cl.n ?? 1) * Math.max(1, cnt) * (cl.rep ?? 1) * c.left;
  }
  return v * CONT_LOOK;
}

/** 全灭即胜的估值：活着的随从才是本钱（倒下不再回来），完成度只剩「解锁数字牌」的意义 */
function utilWipe(M: any, R: RState, s: number): number {
  const c0 = M.clsOf(s), c1 = M.clsOf(1 - s);
  const ps = NE.prog(R, s, c0), po = NE.prog(R, 1 - s, c1);
  let u = WIPE_PROG * (ps - po);
  let mine = 0, theirs = 0;
  for (const x of R.U) {
    if (x.perma) continue;
    if (x.down === -1) {
      const v = WIPE_UNIT + WIPE_HP * x.hp + WIPE_DANGER * Math.max(0, DANGER_HP - x.hp);
      if (x.side === s) { u += v; mine++; } else { u -= v; theirs++; }
    }
  }
  u += 0.6 * (statValue(R, s) - statValue(R, 1 - s));
  const w0 = c0 === "续" ? 100 / NR.TARGET[c0 as NR.Cls] : 0.5;
  const w1 = c1 === "续" ? 100 / NR.TARGET[c1 as NR.Cls] : 0.5;
  u += (contValue(R, s) * w0 - contValue(R, 1 - s) * w1) * 0.5;
  if (!theirs && !mine) return 0;
  if (!theirs) u += 1000;
  if (!mine) u -= 1000;
  return u;
}

export function util(M: any, R: RState, s: number): number {
  if (M.opts?.wipe) return utilWipe(M, R, s);
  const c0 = M.clsOf(s), c1 = M.clsOf(1 - s);
  const ps = NE.prog(R, s, c0), po = NE.prog(R, 1 - s, c1);
  let u = 100 * (ps - po);
  let hs = 0, ho = 0;
  for (const x of R.U) if (x.down === -1) { if (x.side === s) hs += x.hp; else ho += x.hp; }
  u += 0.8 * (hs - ho);
  u += 0.6 * (statValue(R, s) - statValue(R, 1 - s));
  const w0 = c0 === "续" ? 100 / NR.TARGET[c0 as NR.Cls] : 0.5;
  const w1 = c1 === "续" ? 100 / NR.TARGET[c1 as NR.Cls] : 0.5;
  u += contValue(R, s) * w0 - contValue(R, 1 - s) * w1;
  const kp = NR.KO_PCT * 100 * KO_LOOK;
  for (const x2 of R.U) {
    if (x2.down !== -1) continue;
    const frac = 1 - x2.hp / x2.mx;
    const danger = Math.max(0, (DANGER_HP - x2.hp) / DANGER_HP) * DANGER_W;
    u += x2.side !== s ? kp * (frac + danger) : -kp * (frac + danger);
  }
  if (ps >= 1 || po >= 1) u += ps > po ? 500 : po > ps ? -500 : 0;
  return u;
}

const ids = (pool: any[]) => pool.map((u) => u.uid as number);

function tsets(pool: any[], n: number, late: boolean): (number[] | null)[] {
  if (late) return [null];
  const id = ids(pool);
  if (!id.length) return [];
  if (n >= id.length) return [id];
  if (n === 1) {
    const o = [[id[0]], [id[id.length - 1]]];
    if (id.length > 2) o.push([id[1]]);
    return o;
  }
  return [[id[0], id[1]], [id[0], id[id.length - 1]]];
}

function mkcl(k: string, side: string, tg: number[] | null, n: number, extra: any): Clause {
  const d: any = { k, side, count: n };
  if (tg === null) { d.tmode = "late"; d.tg = []; } else { d.tmode = "choose"; d.tg = tg; }
  return Object.assign(d, extra);
}

function singles(M: any, s: number, cp: any): [Clause[], number][] {
  const R: RState = M.R;
  const late = !!cp.late;
  const E: any[] = [], F: any[] = [];
  for (const u of R.U) if (u.down === -1) (u.side !== s ? E : F).push(u);
  E.sort((a, b) => a.hp - b.hp);
  const vals: number[] = Object.keys(M.usableValues(s)).map(Number).sort((a, b) => b - a);
  const opts = [1];
  for (let i = 0; i < Math.min(2, vals.length); i++) opts.push(vals[i]);
  const copts = cp.freecount ? [1, 2, 3] : opts;
  const enemyActs: Act[] = M.declared.filter((a: Act) => a.side !== s);
  const thr: Record<number, number> = {};
  for (const a2 of enemyActs) for (const c of a2.cl) {
    if (c.k !== "atk") continue;
    if (c.tmode === "late") for (const u0 of F) thr[u0.uid] = (thr[u0.uid] ?? 0) + 1;
    for (const t of c.tg ?? []) thr[t] = (thr[t] ?? 0) + 1;
  }
  const fs = [...F].sort((a, b) => {
    const ta = thr[a.uid] ?? 0, tb = thr[b.uid] ?? 0;
    return ta !== tb ? tb - ta : a.hp - b.hp;
  });
  const threatOrder = ids(fs);
  const conts = [1];
  if (cp.slots > 0) for (let i = 0; i < Math.min(2, vals.length); i++) if (vals[i] > 1) conts.push(vals[i]);
  const words = M.res[s].words;
  const out: [Clause[], number][] = [];
  if (E.length) {
    for (const n of copts) {
      if (n > E.length) continue;
      for (const d of opts) {
        const reps = [1];
        if (!cp.norep && vals.length && vals[0] > 1 && vals[0] <= REP_MAX) reps.push(vals[0]);
        for (const r of reps) for (const tg of tsets(E, n, late)) for (const ct of conts)
          out.push([[mkcl("atk", "enemy", tg, n, { n: d, rep: r, cont: ct })], -1]);
      }
    }
  }
  const hurt = F.filter((u) => u.hp < u.mx).sort((a, b) => (a.hp - a.mx) - (b.hp - b.mx));
  const noDef = !!M.aiNoDef?.[s];   // 平衡测试用：只进攻不防守的对照组
  if (!noDef && (hurt.length || cp.slots > 0)) {
    for (const n2 of copts) {
      if (n2 > F.length) continue;
      for (const amt of opts) {
        const tg2: number[] = [];
        for (const u4 of hurt) if (tg2.length < n2) tg2.push(u4.uid);
        for (const u5 of F) if (tg2.length < n2 && !tg2.includes(u5.uid)) tg2.push(u5.uid);
        for (const ct2 of conts) {
          if (!hurt.length && ct2 === 1) continue;
          out.push([[mkcl("heal", "ally", late ? null : tg2, n2, { n: amt, rep: 1, cont: ct2 })], -1]);
        }
      }
    }
  }
  if (!noDef && (enemyActs.length || cp.slots > 0 || cp.once)) {
    for (const n3 of copts) {
      if (n3 > F.length) continue;
      for (const amt2 of opts) for (const ct3 of conts)
        out.push([[mkcl("mit", "ally", late ? null : threatOrder.slice(0, n3), n3, { n: amt2, cont: ct3 })], -1]);
    }
  }
  for (const nm of NR.ENEMY_ST) {
    if ((words[nm] ?? 0) <= 0 || !E.length) continue;
    for (const n4 of copts) {
      if (n4 > E.length) continue;
      for (const dur of opts) for (const tg3 of tsets(E, n4, late))
        out.push([[mkcl("st", "enemy", tg3, n4, { st: nm, n: dur })], -1]);
    }
  }
  if (!noDef && (words["转移"] ?? 0) > 0 && (enemyActs.length || cp.once)) {
    for (const n5 of copts) {
      if (n5 > F.length) continue;
      out.push([[mkcl("redirect", "ally", late ? null : threatOrder.slice(0, n5), n5, {})], -1]);
    }
  }
  if ((words["延后"] ?? 0) > 0) {
    for (const a4 of enemyActs) for (const sec of opts)
      if (2 < a4.start) out.push([[{ k: "delay", act: a4.ord, n: sec, tg: [], side: "enemy", count: 1 }], 2]);
  }
  if ((words["移除"] ?? 0) > 0) {
    for (const u7 of E) {
      const hasCont = R.conts.some((c3: any) => c3.uid === u7.uid);
      if (u7.lis.length || u7.mit > 0 || hasCont)
        out.push([[{ k: "remove", tg: [u7.uid], tmode: "pick", side: "enemy", count: 1 }], -1]);
    }
    for (const a5 of enemyActs) for (const c2 of a5.cl)
      if (["mit", "redirect"].includes(c2.k) && (c2.tg ?? []).length && a5.start + 1 <= NR.TIMELINE)
        out.push([[{ k: "remove", tg: [c2.tg[0]], tmode: "pick", side: "enemy", count: 1 }], a5.start + 1]);
  }
  return out;
}

function make(M: any, s: number, uid: number, clList: Clause[], start: number): Act | null {
  const ms = NE.actionWindup(clList, M.caps(s).wind);
  const st = start < 0 ? ms : Math.max(start, ms);
  if (st > NR.TIMELINE) return null;
  const r = M.buildAction(s, uid, clList, st);
  return r.err ? null : r.act;
}
const kindOf = (c: Clause) => (c.k === "st" ? c.st : c.k);

function combos(n: number, k: number): number[][] {
  const out: number[][] = [], cur: number[] = [];
  const rec = (i: number) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let j = i; j < n; j++) { cur.push(j); rec(j + 1); cur.pop(); }
  };
  rec(0);
  return out;
}

export function candidates(M: any, s: number, uid: number, noise = true): [number, Act][] {
  const R0: RState = M.R, cp = M.caps(s), cards = M.sides[s].cards;
  const enemyStarts: number[] = [];
  for (const a of M.declared) if (a.side !== s && !enemyStarts.includes(a.start)) enemyStarts.push(a.start);
  const evaluate = (act: Act): number => {
    act.ord = M.declared.length;
    const R2 = NE.cloneR(R0);
    NE.resolve(R2, [...M.declared, act], M.rnd);
    let v = util(M, R2, s) - 0.6 * act.cost;
    for (const i of act.cards) v -= (cards[i].once ? 0.5 : 0.25) * cards[i].v;
    return v + (noise ? M.rng.randf() * 0.3 : 0);
  };
  let local: [number, Act][] = [];
  for (const [cl, st] of singles(M, s, cp)) {
    const a = make(M, s, uid, cl, st);
    if (a) local.push([evaluate(a), a]);
  }
  local.sort((x, y) => y[0] - x[0]);
  if (cp.clauses >= 2) {
    const top: Act[] = [], kinds = new Set<string>();
    for (const it of local) {
      const c0 = it[1].cl[0];
      if (c0.k === "delay" || kinds.has(kindOf(c0)) || top.length >= COMBO_K) continue;
      kinds.add(kindOf(c0));
      top.push(it[1]);
    }
    for (const it2 of local) {
      if (top.length >= COMBO_K) break;
      if (it2[1].cl[0].k === "delay" || top.includes(it2[1])) continue;
      top.push(it2[1]);
    }
    for (let size = 2; size <= Math.min(cp.clauses, top.length); size++) {
      for (const comb of combos(top.length, size)) {
        const clList: Clause[] = [];
        for (const idx of comb) for (const c1 of top[idx].cl) clList.push(structuredClone(c1));
        const a2 = make(M, s, uid, clList, -1);
        if (a2) local.push([evaluate(a2), a2]);
      }
    }
    const E = R0.U.filter((u: any) => u.side !== s && u.down === -1).sort((x: any, y: any) => x.hp - y.hp);
    if (E.length) {
      for (let kk = 2; kk <= cp.clauses; kk++) {
        const chain: Clause[] = [];
        for (let j = 0; j < kk; j++) chain.push(mkcl("atk", "enemy", cp.late ? null : [E[j % E.length].uid], 1, { n: 1, rep: 1 }));
        const a3 = make(M, s, uid, chain, -1);
        if (a3) local.push([evaluate(a3), a3]);
      }
    }
  }
  local.sort((x, y) => y[0] - x[0]);
  const extra: [number, Act][] = [];
  for (const it3 of local.slice(0, 4)) {
    const a4 = it3[1];
    if (a4.cl[0].k === "delay") continue;
    const sts = new Set<number>([a4.ms + 1]);
    for (const t of enemyStarts) {
      if (t >= a4.ms) sts.add(t);
      if (t - 1 >= a4.ms) sts.add(t - 1);
    }
    for (const st of sts) {
      if (st > NR.TIMELINE || st === a4.start) continue;
      const b = { ...a4, start: st };
      extra.push([evaluate(b), b]);
    }
  }
  local = local.concat(extra);
  local.sort((x, y) => y[0] - x[0]);
  return local;
}

export function baseUtil(M: any, s: number): number {
  const R = NE.cloneR(M.R);
  NE.resolve(R, M.declared, M.rnd);
  return util(M, R, s);
}

export function choose(M: any, s: number): { uid: number; act: Act | null } {
  const u0 = baseUtil(M, s);
  let best: Act | null = null, bestV = -1e9, worstUid = -1, worstGain = 1e9;
  for (const uid of M.remaining[s]) {
    const local = candidates(M, s, uid);
    const lb = local.length ? local[0][0] : -1e9;
    if (local.length && lb > bestV) { bestV = lb; best = local[0][1]; }
    const g = lb - u0;
    if (g < worstGain) { worstGain = g; worstUid = uid; }
  }
  if (best === null || bestV - u0 < PASS_GAIN) return { uid: worstUid !== -1 ? worstUid : M.remaining[s][0], act: null };
  return { uid: best.uid, act: best };
}

export function suggest(M: any, s: number, uid: number, k = 3): { act: Act; gain: number }[] {
  const u0 = baseUtil(M, s);
  const out: { act: Act; gain: number }[] = [], seen = new Set<string>();
  for (const it of candidates(M, s, uid, false)) {
    const key = JSON.stringify(it[1].cl);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ act: it[1], gain: it[0] - u0 });
    if (out.length >= k) break;
  }
  return out;
}

function bestTargets(M: any, s: number, c: Clause): number[] {
  const pool: number[] = M.R.U.filter((u: any) => u.down === -1 && ((u.side !== s) === (c.side === "enemy"))).map((u: any) => u.uid);
  const n = Math.min(c.count, pool.length);
  let best: number[] = [], bv = -1e9;
  for (const comb of combos(pool.length, n)) {
    const tg = comb.map((i) => pool[i]);
    c.tg = tg;
    const R2 = NE.cloneR(M.R);
    NE.resolve(R2, M.declared, M.rnd);
    const v = util(M, R2, s);
    if (v > bv) { bv = v; best = tg; }
  }
  return best;
}

export function assignLate(M: any, s: number) {
  const order = M.declared.filter((a: Act) => a.side === s).sort((x: Act, y: Act) => (x.start !== y.start ? x.start - y.start : x.ord - y.ord));
  for (const a2 of order) for (const c of a2.cl) {
    if (c.tmode !== "late" || c.locked) continue;
    c.tg = bestTargets(M, s, c);
    c.locked = true;
  }
}

export function suggestLate(M: any, s: number, ord: number, ci: number): number[] {
  for (const a of M.declared) {
    if (a.ord !== ord) continue;
    const c = a.cl[ci], keep = [...(c.tg ?? [])];
    const best = bestTargets(M, s, c);
    c.tg = keep;
    return best;
  }
  return [];
}

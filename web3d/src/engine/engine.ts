// 数字牌模式 · 结算引擎（移植自 godot/scripts/numcard/nc_engine.gd）
import * as NR from "./rules";
import type { Caps, Cls } from "./rules";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Unit = any;
export type Clause = any;
export type Act = any;
export type RState = any;

export const metric0 = () => ({ chain: 0, cont: 0, pick: 0, blood: 0, dmg: 0 });

export function newR(U: Unit[], cls: Cls[]): RState {
  return { U, M: [metric0(), metric0()], cls: [...cls], kob: [0, 0], kos: [0, 0], fz: [0, 0], lost: [0, 0], maxhit: 0, conts: [], eff: {}, retarget: [0, 0], ev: null };
}
export function cloneR(R: RState): RState {
  const U = R.U.map((u: Unit) => {
    const st: any = {};
    for (const k in u.st) st[k] = [...u.st[k]];
    return { ...u, st, lis: u.lis.map((l: any) => ({ ...l })), msrc: [...u.msrc] };
  });
  return {
    U, M: [{ ...R.M[0] }, { ...R.M[1] }], cls: R.cls, kob: [...R.kob], kos: [0, 0], fz: [0, 0], lost: [0, 0], maxhit: 0,
    conts: R.conts.map((c: any) => structuredClone(c)), eff: {}, retarget: [0, 0], ev: null, wipe: !!R.wipe,
  };
}
export const prog = (R: RState, s: number, cls: Cls) => R.M[s][NR.METRIC[cls]] / NR.TARGET[cls] + R.kob[s];

const ev = (R: RState, d: any) => { if (R.ev) R.ev.push(d); };
const credit = (R: RState, s: number, key: string, v: number) => { if (v > 0) R.M[s][key] += v; };
const ekey = (ord: number, ci: number) => `${ord}:${ci}`;
const alive = (u: Unit) => u.down === -1 && u.hp > 0;
const same = (a: any[], b: any[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function dmgTo(R: RState, src: number, tu: Unit, amt: number): number {
  if (amt <= 0 || tu.down !== -1) return 0;
  const dealt = tu.hp > 0 ? Math.min(amt, tu.hp) : 0;
  tu.hp -= amt;
  tu.last = src;
  if (src !== tu.side) { R.M[src].dmg += dealt; R.lost[tu.side] += dealt; }
  return dealt;
}

export function hit(R: RState, a: Act, ci: number, cu: Unit, tu: Unit, base: number, t: number): number {
  const s = a.side, o = tu.side;
  if (tu.down !== -1 || tu.hp <= 0) return 0;
  const cls = R.cls;
  const isCont = !!a.is_cont, enemy = s !== o;
  let amt = base;
  const v = tu.st["易伤"];
  const vl = v ? v[0] : 0;
  amt += vl;
  const parts: any = {};
  const wk = cu.st["衰弱"];
  if (wk && amt > 0) {
    const r = Math.min(wk[0], amt);
    amt -= r;
    if (enemy && wk[2] === o && cls[o] === "续") credit(R, o, "cont", r);
    if (r > 0) parts["衰弱"] = r;
  }
  if (tu.mit > 0 && amt > 0) {
    const r3 = Math.min(tu.mit, amt);
    amt -= r3;
    if (enemy) {
      for (const key of tu.msrc) R.eff[key] = true;
      if (cls[o] === "续" && tu.mitc > 0) credit(R, o, "cont", Math.min(r3, tu.mitc));
    }
    if (r3 > 0) parts["减伤"] = r3;
  }
  if (amt > 0 && enemy && (tu.shield ?? 0) > 0) {
    const r4 = Math.min(tu.shield, amt);
    tu.shield -= r4; amt -= r4; parts["血痂"] = r4;
  }
  if (amt > 0 && enemy && tu.kw === "首挡" && !tu.kws) { tu.kws = true; parts["首挡"] = amt; amt = 0; }
  let back = 0;
  if (amt > 0 && enemy) {
    for (const l of tu.lis) if (l.k === "redirect") { back = amt; amt = 0; R.eff[l.src] = true; parts["转移"] = back; break; }
  }
  const dealt = dmgTo(R, s, tu, amt);
  if (enemy && dealt > 0) {
    R.eff[ekey(a.ord, ci)] = true;
    switch (cls[s]) {
      case "择": credit(R, s, "pick", dealt); break;
      case "血": if ((a.blood ?? 0) > 0) credit(R, s, "blood", dealt); break;
      case "续":
        if (isCont) credit(R, s, "cont", dealt);
        else if (vl > 0 && v[2] === s) credit(R, s, "cont", Math.min(vl, dealt));
        break;
    }
  }
  ev(R, { t, type: "hit", src: cu.uid, tgt: tu.uid, amount: amt, dealt, parts, vuln: vl, cont: isCont });
  if (back > 0 && cu.down === -1 && cu.hp > 0) {
    const d2 = dmgTo(R, o, cu, back);
    if (cls[o] === "择") credit(R, o, "pick", d2);
    ev(R, { t, type: "redirected", src: tu.uid, tgt: cu.uid, amount: back, dealt: d2 });
  }
  return dealt;
}

export function fizzle(R: RState, a: Act, t: number, why: string) {
  R.fz[a.side]++;
  ev(R, { t, type: "fizzle", ord: a.ord, uid: a.uid, why, cont: !!a.is_cont });
}

export function lateTargets(R: RState, a: Act, cl: Clause, acts: Act[]): number[] {
  const s = a.side;
  const wantEnemy = (cl.side ?? "enemy") === "enemy";
  const pool: Unit[] = R.U.filter((u: Unit) => alive(u) && ((u.side !== s) === wantEnemy));
  const n = Math.min(cl.count ?? 1, pool.length);
  const pre: number[] = [];
  for (const x of cl.tg ?? []) {
    const uu = R.U[x];
    if (alive(uu) && pool.includes(uu) && !pre.includes(x) && pre.length < n) pre.push(x);
  }
  if (pre.length >= n) return pre;
  if ((cl.tg ?? []).length > 0) R.retarget[s]++;
  const rest = pool.filter((u) => !pre.includes(u.uid));
  const score: Record<number, number> = {};
  switch (cl.k) {
    case "atk": {
      const pend: Record<number, number> = {};
      for (const b of acts) if (!b.done && b.side !== s) pend[b.uid] = (pend[b.uid] ?? 0) + 1;
      const rep = cl.rep ?? 1;
      for (const u3 of rest) {
        const vv = u3.st["易伤"];
        const eff = (cl.n + (vv ? vv[0] : 0) - u3.mit) * rep;
        const kill = eff >= u3.hp && !(u3.kw === "首挡" && !u3.kws);
        score[u3.uid] = (kill ? 1000 : 0) + (kill ? 100 * (pend[u3.uid] ?? 0) : 0) - u3.hp;
      }
      break;
    }
    case "heal": for (const u of rest) score[u.uid] = u.mx - u.hp; break;
    case "mit": {
      const thr: Record<number, number> = {};
      for (const b2 of acts) {
        if (!b2.done && b2.side !== s) {
          for (const c2 of b2.cl) if (c2.k === "atk") for (const x2 of c2.tg ?? []) thr[x2] = (thr[x2] ?? 0) + c2.n * (c2.rep ?? 1);
        }
      }
      for (const u of rest) score[u.uid] = 10 * (thr[u.uid] ?? 0) - u.hp;
      break;
    }
    case "st": for (const u of rest) { const e = u.st[cl.st]; score[u.uid] = -10 * (e ? e[0] : 0) - u.hp; } break;
    default: for (const u of rest) score[u.uid] = -u.hp;
  }
  rest.sort((x, y) => score[y.uid] - score[x.uid]);
  for (const u8 of rest) { if (pre.length >= n) break; pre.push(u8.uid); }
  return pre;
}

export function fire(R: RState, a: Act, acts: Act[], rnd: number, t: number) {
  const s = a.side, U = R.U, cu = U[a.uid], cls = R.cls, isCont = !!a.is_cont;
  let tot = 0;
  ev(R, { t, type: "fire", ord: a.ord, uid: a.uid, cont: isCont, side: s });
  a.cl.forEach((cl: Clause, ci: number) => {
    let tg: number[] = cl.tg ?? [];
    if (cl.tmode === "late") {
      const before = [...tg];
      tg = lateTargets(R, a, cl, acts);
      ev(R, { t, type: "lock", ord: a.ord, uid: a.uid, tgts: tg, changed: !same(before, tg) && before.length > 0 });
    }
    switch (cl.k) {
      case "atk":
        for (let r = 0; r < cl.rep; r++) for (const tid of tg) tot += hit(R, a, ci, cu, U[tid], cl.n, t);
        break;
      case "heal":
        for (let r = 0; r < cl.rep; r++) for (const tid of tg) {
          const tu = U[tid];
          if (tu.down !== -1) continue;
          const eff = Math.min(cl.n, tu.mx - tu.hp);
          if (eff > 0) {
            tu.hp += eff;
            if (tu.side === s) {
              R.eff[ekey(a.ord, ci)] = true;
              if (cls[s] === "续" && isCont) credit(R, s, "cont", eff);
            }
            ev(R, { t, type: "heal", src: cu.uid, tgt: tu.uid, amount: eff, cont: isCont });
          }
        }
        break;
      case "mit":
        for (const tid of tg) {
          const tu = U[tid];
          if (tu.down === -1) {
            tu.mit += cl.n;
            if (isCont) tu.mitc += cl.n;
            tu.msrc.push(ekey(a.ord, ci));
            ev(R, { t, type: "mit", tgt: tu.uid, amount: cl.n, cont: isCont });
          }
        }
        break;
      case "st":
        for (const tid of tg) {
          const tu = U[tid];
          if (tu.down !== -1) continue;
          const e = tu.st[cl.st];
          if (e) { e[0] += 1; e[1] = Math.max(e[1], rnd + cl.n - 1); }
          else tu.st[cl.st] = [1, rnd + cl.n - 1, s];
          R.eff[ekey(a.ord, ci)] = true;
          ev(R, { t, type: "status", tgt: tu.uid, st: cl.st, lv: tu.st[cl.st][0], end: tu.st[cl.st][1] });
        }
        break;
      case "redirect":
        for (const tid of tg) {
          const tu = U[tid];
          if (tu.down === -1) { tu.lis.push({ k: "redirect", side: s, src: ekey(a.ord, ci) }); ev(R, { t, type: "listen", tgt: tu.uid, k: "redirect" }); }
        }
        break;
      case "delay":
        for (const b of acts) {
          if (b.ord === cl.act && !b.done) {
            b.start += cl.n;
            R.eff[ekey(a.ord, ci)] = true;
            ev(R, { t, type: "delay", ord: b.ord, sec: cl.n, to: b.start });
            if (b.start > NR.TIMELINE) { b.done = true; fizzle(R, b, t, "被推出了时间轴"); }
          }
        }
        break;
      case "remove":
        if (tg.length > 0) {
          const tu = U[tg[0]];
          if (tu.down === -1) {
            const had = tu.mit > 0 || tu.lis.length > 0;
            const broke = R.conts.filter((c: any) => c.uid === tu.uid).length;
            R.conts = R.conts.filter((c: any) => c.uid !== tu.uid);
            tu.lis = []; tu.mit = 0; tu.mitc = 0; tu.msrc = [];
            if (had || broke > 0) R.eff[ekey(a.ord, ci)] = true;
            ev(R, { t, type: "remove", tgt: tu.uid, broke });
          }
        }
        break;
    }
    if ((cl.cont ?? 1) > 1 && !isCont) {
      const c2 = structuredClone(cl);
      delete c2.cont;
      c2.tg = [...tg];
      if (c2.tmode === "late") c2.tmode = "choose";
      R.conts.push({ side: s, uid: a.uid, cl: c2, start: a.start, left: cl.cont - 1 });
      ev(R, { t, type: "cont_set", uid: a.uid, rounds: cl.cont - 1 });
    }
  });
  if (tot > R.maxhit) R.maxhit = tot;
}

export function koCheck(R: RState, rnd: number, t: number) {
  for (const u of R.U) {
    if (u.down === -1 && u.hp <= 0) {
      if (u.kw === "不屈" && !u.kws) { u.kws = true; u.hp = 1; ev(R, { t, type: "endure", tgt: u.uid }); continue; }
      u.down = rnd; u.hp = 0; u.st = {}; u.lis = []; u.mit = 0; u.mitc = 0; u.msrc = [];
      const broke = R.conts.filter((c: any) => c.uid === u.uid).length;
      R.conts = R.conts.filter((c: any) => c.uid !== u.uid);
      const k = u.last;
      if (k != null && k !== u.side) R.kob[k] += NR.KO_PCT;
      R.kos[u.side]++;
      ev(R, { t, type: "ko", tgt: u.uid, by: k ?? -1, broke });
    }
  }
}

export function contActs(R: RState): Act[] {
  return R.conts.map((c: any, i: number) => ({
    side: c.side, uid: c.uid, start: c.start, cl: [c.cl], is_cont: true, ord: 1000 + i,
    def: ["mit", "heal"].includes(c.cl.k), blood: 0, cost: 0,
  }));
}

const KIND_NAME: any = { atk: "伤害", heal: "恢复", mit: "减伤", st: "状态", redirect: "转移", delay: "延后", remove: "移除" };

export function resolve(R: RState, actsIn: Act[], rnd: number) {
  const acts: Act[] = actsIn.map((a) => ({ ...a, done: false }));
  for (const a0 of contActs(R)) { a0.done = false; acts.push(a0); }
  R.conts = R.conts.filter((c: any) => (c.left -= 1) > 0);
  for (const a1 of acts) {
    const bl = a1.blood ?? 0;
    if (bl > 0) {
      R.U[a1.uid].hp -= bl;
      credit(R, a1.side, "blood", bl);
      ev(R, { t: 0, type: "blood", uid: a1.uid, amount: bl, ord: a1.ord });
    }
  }
  for (let t = 0; t <= NR.TIMELINE; t++) {
    const firing = acts.filter((a) => !a.done && a.start === t);
    if (!firing.length) continue;
    firing.sort((x, y) => {
      const dx = x.def ? 0 : 1, dy = y.def ? 0 : 1;
      return dx !== dy ? dx - dy : x.ord - y.ord;
    });
    for (const a3 of firing) {
      if (a3.done || a3.start !== t) continue;
      a3.done = true;
      if (R.U[a3.uid].down !== -1) { fizzle(R, a3, t, "出手的随从已经倒下"); continue; }
      fire(R, a3, acts, rnd, t);
    }
    koCheck(R, rnd, t);
  }
  for (const a4 of acts) if (!a4.done) { a4.done = true; fizzle(R, a4, NR.TIMELINE, "没赶上"); }
  for (const u2 of R.U) {
    if (u2.down !== -1) continue;
    const bu = u2.st["灼烧"];
    if (bu) {
      const d = dmgTo(R, bu[2], u2, bu[0]);
      if (bu[2] !== u2.side) {
        const c = R.cls[bu[2]];
        if (c === "续") credit(R, bu[2], "cont", d);
        else if (c === "择") credit(R, bu[2], "pick", d);
      }
      ev(R, { t: NR.TIMELINE + 1, type: "burn", tgt: u2.uid, amount: bu[0], dealt: d });
    }
  }
  if (R.wipe && rnd >= NR.W.HEAT_FROM) {
    // 过热：轮末全场每个随从受一次挡不住的伤害（第 HEAT_FROM 轮 1 点，之后每轮多 1 点）；不记击倒功劳
    R.preHeat = [0, 0];
    for (const uh of R.U) if (uh.down === -1 && !uh.perma && uh.hp > 0) R.preHeat[uh.side] += uh.hp;
    const hd = rnd - NR.W.HEAT_FROM + 1;
    for (const uh of R.U) {
      if (uh.down !== -1 || uh.perma) continue;
      const dealt = Math.max(0, Math.min(hd, uh.hp));
      uh.hp -= hd; uh.last = null;
      ev(R, { t: NR.TIMELINE + 1, type: "heat", tgt: uh.uid, amount: hd, dealt });
    }
  }
  koCheck(R, rnd, NR.TIMELINE + 1);
  for (const a5 of actsIn) {
    const s = a5.side;
    if (R.cls[s] !== "并" || a5.cl.length < 2) continue;
    const kinds = new Set<string>();
    let landed = 0;
    a5.cl.forEach((c5: Clause, ci: number) => {
      if (R.eff[ekey(a5.ord, ci)]) { landed++; kinds.add(KIND_NAME[c5.k] ?? c5.k); }
    });
    const all = landed === a5.cl.length;
    const pts = landed + (all ? NR.B_BONUS + NR.B_LEN * Math.max(0, a5.cl.length - 2) : 0);
    if (pts > 0) {
      credit(R, s, "chain", pts);
      ev(R, { t: NR.TIMELINE + 1, type: "chain", ord: a5.ord, uid: a5.uid, kinds: [...kinds], landed, points: pts, all });
    }
  }
}

// ---- 句子的花费、起手、数字
export function clauseWords(c: Clause): string[] {
  switch (c.k) {
    case "st": return [c.st];
    case "redirect": return ["转移"];
    case "delay": return ["延后"];
    case "remove": return ["移除"];
  }
  return [];
}
export const actionWords = (cls: Clause[]) => cls.flatMap(clauseWords);
const cnt = (c: Clause) => {
  const m = c.tmode ?? "choose";
  if (m === "self" || m === "pick") return 1;
  if (c.count !== undefined) return c.count;
  return (c.tg ?? []).length;
};
export function actionNumbers(cls: Clause[], freecount = false): number[] {
  const out: number[] = [];
  for (const c of cls) {
    const n = freecount && c.tmode === "late" ? 1 : cnt(c);
    switch (c.k) {
      case "atk": case "heal": out.push(n, c.n, c.rep ?? 1); break;
      case "mit": case "st": out.push(n, c.n); break;
      case "redirect": out.push(n); break;
      case "delay": out.push(c.n); break;
    }
    if ((c.cont ?? 1) > 1) out.push(c.cont);
  }
  return out.filter((v) => v > 1);
}
export function actionCost(cls: Clause[], andCost: number = NR.AND_COST): number {
  let cost = NR.BASE_COST + (cls.length - 1) * andCost;
  for (const w of actionWords(cls)) cost += NR.WORDS[w].price;
  return cost;
}
/** 实际要花的行动点：基础花费 + 择流的「待定多目标」附加费（全灭模式） */
export function totalCost(cls: Clause[], cp: NR.Caps): number {
  const tax = cp.lateTax > 0 && cls.some((c: any) => c.tmode === "late" && (c.count ?? 1) >= 2) ? cp.lateTax : 0;
  return actionCost(cls, cp.and) + tax;
}
export const actionWindup = (cls: Clause[], perClause = 1) => 1 + actionWords(cls).length + (cls.length - 1) * perClause;
export const isDef = (cls: Clause[]) => cls.every((c) => ["mit", "redirect", "heal"].includes(c.k));
export function clauseWord(c: Clause): string {
  if (c.k === "st") return c.st;
  return ({ atk: "造成", heal: "恢复", mit: "减伤", redirect: "转移", delay: "延后", remove: "移除" } as any)[c.k] ?? c.k;
}
export const contCount = (cls: Clause[]) => cls.filter((c) => (c.cont ?? 1) > 1).length;
export function wordRuleProblem(cls: Clause[], cp: Caps): string {
  if (cp.once) {
    const seen = new Set<string>();
    for (const c of cls) {
      const w = clauseWord(c);
      if (seen.has(w)) return `并流：一句里【${w}】只能用一次（换一个词接上去）`;
      seen.add(w);
    }
  }
  if (cp.cont_single && cls.length > 1 && contCount(cls) > 0) return "续流：带【持续】的句子只能一段，不能接【并】";
  if (cp.norep && cls.some((c) => (c.rep ?? 1) > 1)) return "择流：句子里不能用【重复】";
  return "";
}

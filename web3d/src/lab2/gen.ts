// 从语法自动生成候选句子（不再手写模板）。只生成「现在真的说得出口」的句子：行动点、数字牌、卡组、自指词都够。
import { P } from "../lab/rules";
import {
  act, dmg, heal, shield, status, unit, win, cat, word, ev, query, unless, forbid, timer, redirect, postpone, strip,
  type Sentence, type Clause, type Eff, type Obj, type Tg, type Amt, type StatusKind,
} from "./ast";
import { type St, alive, unitsOf, canAfford } from "./interp";
import type { Side } from "./ast";
import { playbook } from "./playbook";
import { P2 } from "./params";

export type Rng = () => number;
export function mulberry32(a: number): Rng {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T>(r: Rng, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const chance = (r: Rng, p: number) => r() < p;

const CATS = ["atk", "atk", "heal", "def", "dealt", "taken", "hpchg", "status", "any"];
const EVS = ["down", "hurt", "hurt", "healed"] as const;
const WORDS = ["造成", "恢复", "减伤", "灼烧", "易伤", "衰弱", "移除", "不得", "定时", "兑现"];

export interface Env { s: St; side: Side; unit: number; r: Rng; maxN: number; foes: number[]; mine: number[] }
const num = (e: Env, hi = e.maxN) => 1 + Math.floor(e.r() * Math.max(1, Math.min(hi, e.maxN)));
const foeTg = (e: Env): Tg => (chance(e.r, 0.6) ? { t: "lowFoe" } : { t: "unit", u: pick(e.r, e.foes) });
const mineTg = (e: Env): Tg => (chance(e.r, 0.5) ? { t: "lowMe" } : chance(e.r, 0.5) ? { t: "allMe" } : { t: "unit", u: pick(e.r, e.mine) });

function genObj(e: Env): Obj {
  const x = e.r();
  if (x < 0.5) return cat(pick(e.r, CATS));
  if (x < 0.75) return ev(pick(e.r, [...EVS]));
  if (x < 0.95) return word(pick(e.r, WORDS));
  return { t: "order", a: pick(e.r, ["造成", "恢复", "减伤"]), b: pick(e.r, ["造成", "恢复", "减伤"]) };
}
function genAmt(e: Env, hi: number): Amt {
  if (chance(e.r, 0.12)) return { q: query(win("before", 1 + Math.floor(e.r() * 2), chance(e.r, 0.3) ? "sent" : "round"), pick(e.r, ["me", "foe"] as const), cat(pick(e.r, ["dealt", "taken", "heal"])), pick(e.r, ["count", "sum"] as const)), mult: 1 };
  return num(e, hi);
}
/** 与「谁触发」相称的效果：对方的事 → 反击来源或我方防护；我方的事 → 追加进攻或自保 */
function genEffFor(e: Env, who: "me" | "foe"): Eff {
  const x = e.r();
  if (who === "foe") return x < 0.45 ? dmg(genAmt(e, 3), { t: "src" }) : x < 0.75 ? heal(num(e, 3), { t: "allMe" }) : shield(num(e, 3), { t: "allMe" });
  return x < 0.55 ? dmg(genAmt(e, 3), { t: "lowFoe" }, chance(e.r, 0.2) ? "shield" : undefined) : x < 0.8 ? heal(num(e, 3), { t: "lowMe" }) : shield(num(e, 3), { t: "lowMe" });
}
function genWin(e: Env, dir: "before" | "after") { return win(dir, 1 + Math.floor(e.r() * 3), chance(e.r, dir === "after" ? 0.15 : 0.4) ? "sent" : "round"); }

const REALGEN = () => P2.REDIR || P2.RMREAL || P2.REP;
function genClause(e: Env, allowStanding: boolean): Clause {
  const x = e.r() * 100;
  if (REALGEN()) {   // 真实规则的词（开关没开时一次随机数都不多抽，旧实验的随机序列不变）
    const y = e.r();
    if (P2.REDIR && y < 0.08) return redirect(mineTg(e));
    if (P2.RMREAL && y >= 0.08 && y < 0.16) return strip(foeTg(e));
    if (P2.REP && x < 30 && y >= 0.16 && y < 0.4) return act(dmg(num(e, 2), foeTg(e), undefined, 2 + Math.floor(e.r() * Math.max(1, Math.min(2, e.maxN - 1)))));
  }
  if (x < 30) return act(dmg(genAmt(e, 3), foeTg(e), chance(e.r, 0.15) ? "shield" : undefined));
  if (x < 38) return act(heal(num(e, 3), mineTg(e)));
  if (x < 46) return act(shield(num(e, 3), mineTg(e)));
  if (x < 56) return status(pick(e.r, ["burn", "vuln", "weak"] as StatusKind[]), num(e, 3), 1 + Math.floor(e.r() * 3), foeTg(e));
  if (!allowStanding) return act(dmg(num(e, 3), foeTg(e)));
  if (x < 70) {            // 每当（长期）
    const w = genWin(e, "after"), who = pick(e.r, ["me", "foe", "foe"] as const);
    return { k: "when", q: query(w, who, genObj(e), "count", 1 + Math.floor(e.r() * 3)), judge: "exist", effs: [genEffFor(e, who)], cap: 1 + Math.floor(e.r() * 2) };
  }
  if (x < 76) { const who = pick(e.r, ["me", "foe"] as const); return { k: "when", q: query(genWin(e, "before"), who, genObj(e), "count", 1 + Math.floor(e.r() * 3)), judge: pick(e.r, ["exist", "absent"] as const), effs: [genEffFor(e, who === "foe" ? "me" : "foe")], cap: 1 }; }
  if (x < 80) { const who = pick(e.r, ["me", "foe"] as const); return unless(who, cat(pick(e.r, CATS)), 1 + Math.floor(e.r() * 3), [genEffFor(e, who === "foe" ? "foe" : "me")]); }
  if (x < 85) return timer(1 + Math.floor(e.r() * 3), cat(pick(e.r, ["atk", "dmg", "heal", "status"])), pick(e.r, ["me", "foe"] as const), 1 + Math.floor(e.r() * 2));
  if (x < 89) return forbid(cat(pick(e.r, ["atk", "heal", "def", "status"])), 1 + Math.floor(e.r() * 3), num(e, 3), 1 + Math.floor(e.r() * 2));
  if (x < 93) return P2.RMREAL ? strip(foeTg(e)) : { k: "remove", obj: chance(e.r, 0.4) ? cat("any") : genObj(e) };
  if (x < 96) return { k: "ignore", cat: "stand", win: 1 + Math.floor(e.r() * 3) };
  return { k: "cash" };
}
export function genSentence(e: Env, standing = true): Sentence {
  const first = genClause(e, standing);
  const cl: Clause[] = [first];
  if (first.k === "act" && first.eff.verb === "dmg" && chance(e.r, 0.15)) cl.push(act(chance(e.r, 0.5) ? dmg(num(e, 3), foeTg(e)) : heal(num(e, 3), mineTg(e)), pick(e.r, ["ok", "fail"] as const)));   // 成功/失败
  if (chance(e.r, 0.22)) cl.push(genClause(e, standing));      // 并
  if (chance(e.r, 0.05)) cl.push(genClause(e, false));
  return cl;
}

/** 基础句：打最低血量 / 打指定敌人 / 回血 / 减伤——保证电脑永远有像样的朴素选项 */
function basics(e: Env): Sentence[] {
  const out: Sentence[] = [];
  for (let n = 1; n <= e.maxN && n <= 3; n++) {
    out.push([act(dmg(n, { t: "lowFoe" }))]);
    for (const f of e.foes) out.push([act(dmg(n, unit(f)))]);
  }
  const hurt = e.mine.filter((u) => e.s.hp[u] < P.HP);
  if (hurt.length) { out.push([act(heal(2, { t: "lowMe" }))]); out.push([act(shield(Math.min(2, e.maxN), { t: "lowMe" }))]); }
  return out;
}

/** 真实引擎的词：转移（保护）、延后（把对方已宣告的一句推后）、移除（拆敌人的保护） */
function realBasics(e: Env): Sentence[] {
  const out: Sentence[] = [];
  if (P2.POSTPONE) for (const d of e.s.decl.filter((x) => x.side !== e.side)) for (const n of new Set([P.TL - d.start + 1, 1, 2, 3])) if (n >= 1) out.push([postpone(d.ord, n)]);
  if (P2.REDIR) for (const m of e.mine) out.push([redirect(unit(m))]);
  if (P2.RMREAL) for (const f of e.foes) out.push([strip(unit(f))]);
  return out;
}
/** STAUTO：状态的级别不再是数字（每次施放 +1 级），统一写 1，免得同一句因为级别不同重复出现 */
const normStatus = (cl: Sentence): Sentence => (P2.STAUTO && cl.some((c) => c.k === "status" && c.lvl !== 1) ? cl.map((c) => (c.k === "status" ? { ...c, lvl: 1 } : c)) : cl);

export type Mode = "free" | "plain" | "playbook" | "basic";
export function candidates(s: St, side: Side, u: number, r: Rng, k: number, mode: Mode = "free"): Sentence[] {
  const foes = unitsOf((1 - side) as Side).filter((x) => alive(s, x));
  const mine = unitsOf(side).filter((x) => alive(s, x));

  const maxN = Math.max(1, ...s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v)) + (P2.POS && u % 3 === 1 ? P2.POS_NUM : 0);
  const e: Env = { s, side, unit: u, r, maxN, foes, mine };
  const out: Sentence[] = [];
  const seen = new Set<string>();
  // 教电脑：不要重复铺同一个长期效果（我方已经挂着，或本轮别的随从刚说过一样的）
  const mineStand = s.stand.filter((x) => x.owner === side).map((x) => JSON.stringify(x.c));
  const pending = s.decl.filter((d) => d.side === side).flatMap((d) => d.cl).map((c) => JSON.stringify(c));
  const dup = (cl: Sentence) => cl.some((c) => (c.k === "ignore" || c.k === "when" || c.k === "delay") && (c.k === "ignore" ? s.stand.some((x) => x.owner === side && x.c.k === "ignore") || s.decl.some((d) => d.side === side && d.cl.some((z) => z.k === "ignore")) : mineStand.includes(JSON.stringify(c)) || pending.includes(JSON.stringify(c))));
  const add = (cl0: Sentence) => { const cl = normStatus(cl0); const key = JSON.stringify(cl); if (!seen.has(key) && !dup(cl) && canAfford(s, side, cl, u)) { seen.add(key); out.push(cl); } };
  basics(e).forEach(add);
  if (mode === "basic") return out;   // 入门：只会朴素的攻击/治疗/减伤
  realBasics(e).forEach(add);
  if (mode === "playbook") playbook(e).forEach(add);
  else if (mode === "plain") playbook(e, "atkdef").forEach(add);
  for (let i = 0; i < k * 3 && out.length < k + 6; i++) add(genSentence(e, mode === "free"));
  return out;
}

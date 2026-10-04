// 从语法自动生成候选句子（不再手写模板）。只生成「现在真的说得出口」的句子：行动点、数字牌、卡组、自指词都够。
import { P } from "../lab/rules";
import {
  act, dmg, heal, shield, status, unit, win, cat, word, ev, query, whenever, unless, forbid, timer,
  type Sentence, type Clause, type Eff, type Obj, type Tg, type Amt, type StatusKind,
} from "./ast";
import { type St, alive, unitsOf, canAfford } from "./interp";
import type { Side } from "./ast";

export type Rng = () => number;
export function mulberry32(a: number): Rng {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T>(r: Rng, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const chance = (r: Rng, p: number) => r() < p;

const CATS = ["atk", "atk", "heal", "def", "dmg", "hpchg", "status", "any"];
const EVS = ["down", "hurt", "hurt", "healed"] as const;
const WORDS = ["造成", "恢复", "减伤", "灼烧", "易伤", "衰弱", "移除", "不得", "定时", "兑现"];

interface Env { s: St; side: Side; unit: number; r: Rng; maxN: number; foes: number[]; mine: number[] }
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
  if (chance(e.r, 0.12)) return { q: query(win("before", 1 + Math.floor(e.r() * 2), chance(e.r, 0.3) ? "sent" : "round"), pick(e.r, ["me", "foe"] as const), cat(pick(e.r, ["dmg", "heal", "atk"])), pick(e.r, ["count", "sum"] as const)), mult: 1 };
  return num(e, hi);
}
function genEff(e: Env, onSrc: boolean): Eff {
  const x = e.r();
  if (x < 0.5) return dmg(genAmt(e, 3), onSrc ? { t: "src" } : foeTg(e), chance(e.r, 0.1) ? "shield" : undefined);
  if (x < 0.75) return heal(num(e, 3), mineTg(e));
  return shield(num(e, 3), mineTg(e));
}
function genWin(e: Env, dir: "before" | "after") { return win(dir, 1 + Math.floor(e.r() * 3), chance(e.r, dir === "after" ? 0.15 : 0.4) ? "sent" : "round"); }

function genClause(e: Env, allowStanding: boolean): Clause {
  const x = e.r() * 100;
  if (x < 30) return act(dmg(genAmt(e, 3), foeTg(e), chance(e.r, 0.15) ? "shield" : undefined));
  if (x < 38) return act(heal(num(e, 3), mineTg(e)));
  if (x < 46) return act(shield(num(e, 3), mineTg(e)));
  if (x < 56) return status(pick(e.r, ["burn", "vuln", "weak"] as StatusKind[]), num(e, 3), 1 + Math.floor(e.r() * 3), foeTg(e));
  if (!allowStanding) return act(dmg(num(e, 3), foeTg(e)));
  if (x < 70) {            // 每当（长期）
    const w = genWin(e, "after");
    return { k: "when", q: query(w, pick(e.r, ["me", "foe", "foe"] as const), genObj(e), "count", 1 + Math.floor(e.r() * 3)), judge: "exist", effs: [genEff(e, chance(e.r, 0.5))], cap: 1 + Math.floor(e.r() * 2) };
  }
  if (x < 76) return { k: "when", q: query(genWin(e, "before"), pick(e.r, ["me", "foe"] as const), genObj(e), "count", 1 + Math.floor(e.r() * 3)), judge: pick(e.r, ["exist", "absent"] as const), effs: [genEff(e, false)], cap: 1 };
  if (x < 80) return unless(pick(e.r, ["me", "foe"] as const), cat(pick(e.r, CATS)), 1 + Math.floor(e.r() * 3), [genEff(e, false)]);
  if (x < 85) return timer(1 + Math.floor(e.r() * 3), cat(pick(e.r, ["atk", "dmg", "heal", "status"])), pick(e.r, ["me", "foe"] as const), 1 + Math.floor(e.r() * 2));
  if (x < 89) return forbid(cat(pick(e.r, ["atk", "heal", "def", "status"])), 1 + Math.floor(e.r() * 3), num(e, 3), 1 + Math.floor(e.r() * 2));
  if (x < 93) return { k: "remove", obj: chance(e.r, 0.4) ? cat("any") : genObj(e) };
  if (x < 96) return { k: "ignore", cat: "stand", win: 1 + Math.floor(e.r() * 3) };
  return { k: "cash" };
}
export function genSentence(e: Env): Sentence {
  const first = genClause(e, true);
  const cl: Clause[] = [first];
  if (first.k === "act" && first.eff.verb === "dmg" && chance(e.r, 0.15)) cl.push(act(chance(e.r, 0.5) ? dmg(num(e, 3), foeTg(e)) : heal(num(e, 3), mineTg(e)), pick(e.r, ["ok", "fail"] as const)));   // 成功/失败
  if (chance(e.r, 0.22)) cl.push(genClause(e, true));      // 并
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

export function candidates(s: St, side: Side, u: number, r: Rng, k: number): Sentence[] {
  const foes = unitsOf((1 - side) as Side).filter((x) => alive(s, x));
  const mine = unitsOf(side).filter((x) => alive(s, x));
  const maxN = Math.max(1, ...s.side[side].cards.filter((c) => c.cd === 0).map((c) => c.v));
  const e: Env = { s, side, unit: u, r, maxN, foes, mine };
  const out: Sentence[] = [];
  const seen = new Set<string>();
  const add = (cl: Sentence) => { const key = JSON.stringify(cl); if (!seen.has(key) && canAfford(s, side, cl)) { seen.add(key); out.push(cl); } };
  basics(e).forEach(add);
  for (let i = 0; i < k * 3 && out.length < k + 6; i++) add(genSentence(e));
  return out;
}

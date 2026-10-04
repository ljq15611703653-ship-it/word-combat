// lab2 的「REAL 配置」与真实引擎（web3d/src/engine，全灭模式）对照测试：
// 同一个小场景，分别交给真实 Match（直接塞 declared，跳过卡牌/行动点校验）和 lab2 解释器，逐轮比较每个随从的血量、状态、胜负。
// 运行：node --import tsx src/lab2/realtest.ts [模糊测试局数，默认 400]
import { Match } from "../engine/match";
import * as NE from "../engine/engine";
import * as NR from "../engine/rules";
import { P } from "../lab/rules";
import { act, dmg, heal, shield, status, unit, redirect, postpone, strip, type Sentence, type StatusKind } from "./ast";
import { newGame, declare, resolveRound, nextRound, canAfford, type St } from "./interp";
import { applyRules, ADV_WORDS } from "./params";
import { windupFor } from "./interp";
import { query, win } from "./ast";
import { forbid } from "./ast";
import { whenever, cat } from "./ast";
import { randDeck } from "./deck";
import { candidates } from "./gen";
import { P2 } from "./params";
import { sentenceText } from "./ast";
import { mulberry32 } from "./gen";
import { useReal } from "./realprofile";
import { sentenceCost, windup, numsOf } from "./ast";

useReal();
// 变异检验：NOFLAG=ORDER,KOCHECK 把这些开关关掉，模糊对照应当立刻报不一致（证明对照不是空转）
if (process.env.NOFLAG) { const { P2 } = await import("./params"); for (const f of process.env.NOFLAG.split(",")) (P2 as unknown as Record<string, number>)[f] = 0; }

// ---------- 场景描述（用真实引擎的句式写） ----------
export type RC =
  | { k: "atk"; n: number; tg: number; rep?: number } | { k: "heal"; n: number; tg: number } | { k: "mit"; n: number; tg: number }
  | { k: "st"; st: "易伤" | "灼烧" | "衰弱"; n: number; tg: number } | { k: "redirect"; tg: number }
  | { k: "delay"; n: number; act: number } | { k: "remove"; tg: number };
export interface RAct { u: number; start: number; cl: RC[] }
export interface Sc { name?: string; kws?: string[]; hp?: Record<number, number>; rounds: RAct[][] }
const ST: Record<string, StatusKind> = { 易伤: "vuln", 灼烧: "burn", 衰弱: "weak" };
const STN: Record<string, string> = { vuln: "易伤", burn: "灼烧", weak: "衰弱" };

const toReal = (a: RAct, ord: number): NE.Act => {
  const cl = a.cl.map((c) => {
    switch (c.k) {
      case "atk": return { k: "atk", n: c.n, rep: c.rep ?? 1, tg: [c.tg], tmode: "choose" };
      case "heal": return { k: "heal", n: c.n, rep: 1, tg: [c.tg], tmode: "choose" };
      case "mit": return { k: "mit", n: c.n, tg: [c.tg], tmode: "choose" };
      case "st": return { k: "st", st: c.st, n: c.n, tg: [c.tg], tmode: "choose" };
      case "redirect": return { k: "redirect", tg: [c.tg], tmode: "choose" };
      case "delay": return { k: "delay", n: c.n, act: c.act, tg: [] };
      case "remove": return { k: "remove", tg: [c.tg], tmode: "choose" };
    }
  });
  const side = a.u < 3 ? 0 : 1;
  return { side, uid: a.u, start: a.start, cl, def: NE.isDef(cl), ord, cost: 0, blood: 0, cards: [], words: [], cv: [], ms: 1 };
};
const toLab: (c: RC) => ReturnType<typeof act> = (c) => {
  switch (c.k) {
    case "atk": return act(dmg(c.n, unit(c.tg), undefined, c.rep));
    case "heal": return act(heal(c.n, unit(c.tg)));
    case "mit": return act(shield(c.n, unit(c.tg)));
    case "st": return status(ST[c.st], 1, c.n, unit(c.tg)) as never;
    case "redirect": return redirect(unit(c.tg)) as never;
    case "delay": return postpone(c.act, c.n) as never;
    case "remove": return strip(unit(c.tg)) as never;
  }
};
export const toSentence = (cl: RC[]): Sentence => cl.map(toLab);

interface Snap { hp: number[]; st: string[][]; win: number; stand?: number }
function runReal(sc: Sc): Snap[] {
  const m = new Match();
  const mk = (kws: string[]): NR.Deck => ({ cls: "并", words: {}, kws, hp: [6, 6, 6] });
  m.start(mk(sc.kws?.slice(0, 3) ?? ["", "", ""]), mk(sc.kws?.slice(3, 6) ?? ["", "", ""]), 1, false, false, { wipe: true, first: 0 });
  for (const [u, h] of Object.entries(sc.hp ?? {})) m.R.U[+u].hp = h;
  const out: Snap[] = [];
  for (const acts of sc.rounds) {
    m.declared = acts.map((a, i) => toReal(a, i));
    m.resolveRound();
    out.push({ hp: m.R.U.map((u: NE.Unit) => Math.max(0, u.hp)), st: m.R.U.map((u: NE.Unit) => Object.entries(u.st).map(([k, v]: [string, any]) => `${k}${v[0]}/${v[1]}`).sort()), win: m.winner });
    if (m.phase === "over") break;
    m.nextRound();
  }
  return out;
}
function refill(s: St) { for (const sd of s.side) { sd.ap = 99; sd.cards = []; for (let i = 0; i < 12; i++) for (const v of [2, 3, 4, 5, 6]) sd.cards.push({ v, cd: 0 }); } }
function runLab(sc: Sc): Snap[] {
  const s = newGame(0, [null, null], false, [sc.kws?.slice(0, 3) ?? null, sc.kws?.slice(3, 6) ?? null]);
  for (const [u, h] of Object.entries(sc.hp ?? {})) s.hp[+u] = h;
  const out: Snap[] = [];
  for (const acts of sc.rounds) {
    refill(s);
    for (const a of acts) if (!declare(s, a.u < 3 ? 0 : 1, a.u, toSentence(a.cl), a.start)) throw new Error(`lab2 宣告失败 u${a.u} ${JSON.stringify(a.cl)}`);
    resolveRound(s);
    const alive = (u: number) => s.hp[u] > 0;
    out.push({ hp: s.hp.map((h) => Math.max(0, h)), st: [0, 1, 2, 3, 4, 5].map((u) => (alive(u) ? s.sts.filter((x) => x.unit === u).map((x) => `${STN[x.kind]}${x.lvl}/${x.end}`).sort() : [])), win: s.win === 2 ? -2 : s.win });
    if (s.win >= 0) break;
    nextRound(s);
  }
  return out;
}
let bad = 0, total = 0;
const check = (ok: boolean, name: string, extra = "") => { total++; if (!ok) { bad++; console.log("✗", name, extra); } else console.log("✓", name); };
const same = (a: Snap[], b: Snap[]) => JSON.stringify(a) === JSON.stringify(b);
/** 对照：两个引擎结果一致；expect 里写「从真实代码读出来的」预期，用来防止两边一起错 */
function cmp(name: string, sc: Sc, expect?: (r: Snap[]) => boolean, why = "") {
  const r = runReal(sc), l = runLab(sc);
  const eq = same(r, l);
  check(eq, `${name}`, eq ? "" : `\n   真实 ${JSON.stringify(r)}\n   lab2 ${JSON.stringify(l)}`);
  if (expect) check(expect(r), `${name}（预期：${why}）`, JSON.stringify(r));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("lab2/realtest.ts")) {
  const A = (u: number, start: number, ...cl: RC[]): RAct => ({ u, start, cl });
  // ===== 1 转移（engine.ts hit：首挡之后、enemy 且 amt>0：back = amt，amt = 0，再 dmgTo(出手的人, back)；back 不经过对方的减伤、衰弱、易伤）=====
  cmp("转移：打向 u3 的 3 点伤害，改打在出手的 u0 身上", { rounds: [[A(3, 4, { k: "redirect", tg: 3 }), A(0, 6, { k: "atk", n: 3, tg: 3 })]] },
    (r) => r[0].hp[3] === 6 && r[0].hp[0] === 3, "u3 不受伤、u0 掉 3");
  cmp("转移：出手人自己的减伤不挡弹回来的伤害", { rounds: [[A(0, 2, { k: "mit", n: 2, tg: 0 }), A(3, 4, { k: "redirect", tg: 3 }), A(0, 6, { k: "atk", n: 3, tg: 3 })]] },
    (r) => r[0].hp[0] === 3, "弹回 3 点（不被 u0 的减伤 2 减掉）");
  cmp("转移 + 重复：两次打击都被弹回", { rounds: [[A(3, 4, { k: "redirect", tg: 3 }), A(0, 6, { k: "atk", n: 2, tg: 3, rep: 2 })]] }, (r) => r[0].hp[0] === 2 && r[0].hp[3] === 6, "u0 掉 4");
  cmp("转移：弹回的伤害算上易伤", { rounds: [[A(1, 2, { k: "st", st: "易伤", n: 1, tg: 3 }), A(3, 4, { k: "redirect", tg: 3 }), A(0, 6, { k: "atk", n: 2, tg: 3 })]] }, (r) => r[0].hp[0] === 3, "2+1 点易伤 = 3 点弹回");
  cmp("转移：下一轮就失效", { rounds: [[A(3, 4, { k: "redirect", tg: 3 })], [A(0, 6, { k: "atk", n: 3, tg: 3 })]] }, (r) => r[1].hp[3] === 3 && r[1].hp[0] === 6, "第 2 轮正常打中");
  cmp("转移 + 首挡：第一击被首挡整下挡掉，第二击才被弹回", { kws: ["", "", "", "首挡", "", ""], rounds: [[A(3, 4, { k: "redirect", tg: 3 }), A(0, 5, { k: "atk", n: 3, tg: 3 }), A(1, 7, { k: "atk", n: 2, tg: 3 })]] },
    (r) => r[0].hp[3] === 6 && r[0].hp[0] === 6 && r[0].hp[1] === 4, "u0 的第一击被首挡吃掉、u1 的第二击弹回自己");
  cmp("转移：出手者已倒下则弹不回（伤害落空）", { hp: { 0: 1 }, rounds: [[A(3, 4, { k: "redirect", tg: 3 }), A(0, 6, { k: "atk", n: 3, tg: 3 })]] }, (r) => r[0].hp[3] === 6 && r[0].hp[0] === 0, "u0 被自己的招打倒");
  // ===== 2 延后（engine.ts fire delay：b.start += n；> TIMELINE 就 fizzle；已经生效的不受影响）=====
  cmp("延后：把对方起手 3 秒的招推到第 5 秒，让减伤先生效", { rounds: [[A(0, 3, { k: "atk", n: 4, tg: 3 }), A(3, 2, { k: "mit", n: 4, tg: 3 }), A(4, 2, { k: "delay", n: 2, act: 0 })]] }, undefined);
  cmp("延后：起手 3 秒的招推 2 秒到 5 秒，躲开 4 秒的减伤也一样（减伤 4 秒才开）", { rounds: [[A(0, 3, { k: "atk", n: 3, tg: 3 }), A(3, 4, { k: "mit", n: 3, tg: 3 }), A(4, 2, { k: "delay", n: 2, act: 0 })]] },
    (r) => r[0].hp[3] === 6, "被推到第 5 秒时减伤已经在了，全挡掉");
  cmp("延后：推出时间轴整句落空", { rounds: [[A(0, 8, { k: "atk", n: 3, tg: 3 }), A(4, 2, { k: "delay", n: 3, act: 0 })]] }, (r) => r[0].hp[3] === 6, "8+3=11 > 10，落空");
  cmp("延后：刚好 10 秒还能生效", { rounds: [[A(0, 8, { k: "atk", n: 3, tg: 3 }), A(4, 2, { k: "delay", n: 2, act: 0 })]] }, (r) => r[0].hp[3] === 3, "8+2=10，还能打");
  cmp("延后：对方那一句已经生效就没用", { rounds: [[A(0, 3, { k: "atk", n: 3, tg: 3 }), A(4, 6, { k: "delay", n: 5, act: 0 })]] }, (r) => r[0].hp[3] === 3, "第 3 秒已经打完");
  cmp("延后：推到出手随从倒下之后，落空", { rounds: [[A(0, 3, { k: "atk", n: 3, tg: 3 }), A(3, 3, { k: "atk", n: 6, tg: 0 }), A(4, 2, { k: "delay", n: 4, act: 0 })]] }, undefined);
  // ===== 3 首挡 =====
  cmp("首挡：每轮第一次被敌人打中整下挡掉，第二次才受伤", { kws: ["", "", "", "首挡", "", ""], rounds: [[A(0, 4, { k: "atk", n: 5, tg: 3 }), A(1, 6, { k: "atk", n: 2, tg: 3 })]] }, (r) => r[0].hp[3] === 4, "第一击 5 点被挡掉，第二击 2 点受伤");
  cmp("首挡：下一轮刷新", { kws: ["", "", "", "首挡", "", ""], rounds: [[A(0, 4, { k: "atk", n: 5, tg: 3 })], [A(0, 4, { k: "atk", n: 5, tg: 3 })]] }, (r) => r[1].hp[3] === 6, "两轮都挡");
  cmp("首挡：重复攻击只挡第一下", { kws: ["", "", "", "首挡", "", ""], rounds: [[A(0, 4, { k: "atk", n: 2, tg: 3, rep: 3 })]] }, (r) => r[0].hp[3] === 2, "3 下打了 2 下");
  cmp("首挡：灼烧、过热不被挡", { kws: ["", "", "", "首挡", "", ""], rounds: [[A(0, 4, { k: "st", st: "灼烧", n: 2, tg: 3 })]] }, (r) => r[0].hp[3] === 5, "灼烧 1 点照掉");
  cmp("首挡：先被减伤减到 0 就没有「被打中」，首挡留着", { kws: ["", "", "", "首挡", "", ""], rounds: [[A(3, 2, { k: "mit", n: 3, tg: 3 }), A(0, 4, { k: "atk", n: 3, tg: 3 }), A(1, 6, { k: "atk", n: 5, tg: 3 })]] }, (r) => r[0].hp[3] === 6, "减伤 3 把第一击减成 0（不算被打中），第二击 5−3=2 点被首挡整下挡掉");
  // ===== 4 不屈（koCheck：hp ≤ 0 且不屈未用 → hp = 1；过热后也会判）=====
  cmp("不屈：被打到 0 血留 1 血", { kws: ["", "", "", "不屈", "", ""], hp: { 3: 2 }, rounds: [[A(0, 4, { k: "atk", n: 5, tg: 3 })]] }, (r) => r[0].hp[3] === 1, "留 1 血");
  cmp("不屈：同一秒里后面的一击打不动（hp ≤ 0 的等秒末判定）", { kws: ["", "", "", "不屈", "", ""], hp: { 3: 2 }, rounds: [[A(0, 4, { k: "atk", n: 5, tg: 3 }), A(1, 4, { k: "atk", n: 1, tg: 3 })]] }, (r) => r[0].hp[3] === 1, "仍是 1 血");
  cmp("不屈：不同秒的第二次致命伤才倒下", { kws: ["", "", "", "不屈", "", ""], hp: { 3: 2 }, rounds: [[A(0, 4, { k: "atk", n: 5, tg: 3 }), A(1, 5, { k: "atk", n: 1, tg: 3 })]] }, (r) => r[0].hp[3] === 0, "倒下");
  cmp("不屈：下一轮刷新", { kws: ["", "", "", "不屈", "", ""], hp: { 3: 2 }, rounds: [[A(0, 4, { k: "atk", n: 5, tg: 3 })], [A(0, 4, { k: "atk", n: 5, tg: 3 })]] }, (r) => r[1].hp[3] === 1, "第 2 轮仍能留 1 血");
  cmp("不屈 + 过热：第 3 轮轮末过热 1 点也能留 1 血", { kws: ["", "", "", "不屈", "", ""], hp: { 3: 1 }, rounds: [[], [], []] }, (r) => r[2].hp[3] === 1, "过热 1 点把 1 血打到 0，不屈留 1 血");
  cmp("不屈：灼烧打到 0 也留 1 血", { kws: ["", "", "", "不屈", "", ""], hp: { 3: 1 }, rounds: [[A(0, 4, { k: "st", st: "灼烧", n: 1, tg: 3 })]] }, (r) => r[0].hp[3] === 1, "灼烧 1 点，不屈");
  cmp("同一秒被打倒的随从照样出手，之后的秒才落空", { hp: { 3: 2 }, rounds: [[A(0, 5, { k: "atk", n: 6, tg: 3 }), A(3, 5, { k: "atk", n: 4, tg: 0 }), A(3 + 1, 7, { k: "atk", n: 1, tg: 0 }), A(4, 3, { k: "heal", n: 1, tg: 4 })]] }, (r) => r[0].hp[3] === 0 && r[0].hp[0] === 1, "u3 同一秒还能打 u0 4 点，u4 第 7 秒再打 1 点");
  cmp("落空：出手的随从第 5 秒倒下，它第 7 秒的招落空", { hp: { 3: 2 }, rounds: [[A(0, 5, { k: "atk", n: 6, tg: 3 }), A(3, 7, { k: "atk", n: 4, tg: 0 })]] }, (r) => r[0].hp[0] === 6, "u0 没受伤");
  // ===== 5 状态（engine fire st：已有 → 级别 +1、end = max(end, rnd + n − 1)；没有 → [1, rnd + n − 1]；match.beginRound：rnd > end 删除，否则 +1 级；灼烧轮末掉 lvl）=====
  cmp("状态：易伤持续 3 轮，每过一轮 +1 级", { rounds: [[A(0, 3, { k: "st", st: "易伤", n: 3, tg: 3 })], [A(1, 4, { k: "atk", n: 1, tg: 3 })], [A(1, 4, { k: "atk", n: 1, tg: 3 })], [A(1, 4, { k: "atk", n: 1, tg: 3 })]] },
    (r) => r[1].hp[3] === 3 && r[2].hp[3] === 0, "第 2 轮 2 级：1+2=3 点；第 3 轮 3 级：1+3=4 点");
  cmp("状态：持续 1 轮，下一轮就没了", { rounds: [[A(0, 3, { k: "st", st: "衰弱", n: 1, tg: 3 })], [A(3, 4, { k: "atk", n: 3, tg: 0 })]] }, (r) => r[1].hp[0] === 3, "第 2 轮衰弱已消失");
  cmp("状态：灼烧每轮轮末掉 级别 点（1 → 2 → 3）", { rounds: [[A(0, 3, { k: "st", st: "灼烧", n: 3, tg: 3 })], [], []] }, (r) => r[0].hp[3] === 5 && r[1].hp[3] === 3, "1 点、2 点");
  cmp("状态：同一轮再施放一次，级别 +1", { rounds: [[A(0, 3, { k: "st", st: "易伤", n: 2, tg: 3 }), A(1, 4, { k: "st", st: "易伤", n: 2, tg: 3 }), A(2, 6, { k: "atk", n: 1, tg: 3 })]] }, (r) => r[0].hp[3] === 3, "2 级：1+2");
  cmp("状态：再施放把结束轮延长", { rounds: [[A(0, 3, { k: "st", st: "灼烧", n: 1, tg: 3 })], [A(1, 3, { k: "st", st: "灼烧", n: 2, tg: 3 })], [], []] }, undefined);
  cmp("衰弱：出手的伤害少级别点（不低于 0）", { rounds: [[A(0, 3, { k: "st", st: "衰弱", n: 2, tg: 3 })], [A(3, 4, { k: "atk", n: 3, tg: 0 }), A(3, 5, { k: "atk", n: 1, tg: 1 })]] }, (r) => r[1].hp[0] === 5 && r[1].hp[1] === 6, "衰弱 2 级：3→1、1→0");
  cmp("易伤 + 重复：每一击都加易伤", { rounds: [[A(0, 3, { k: "st", st: "易伤", n: 2, tg: 3 })], [A(1, 4, { k: "atk", n: 1, tg: 3, rep: 2 })]] }, (r) => r[1].hp[3] === 0, "2 级易伤：2 击 × 3 点 = 6");
  cmp("衰弱 + 重复：每一击都减", { rounds: [[A(0, 3, { k: "st", st: "衰弱", n: 2, tg: 3 })], [A(3, 4, { k: "atk", n: 3, tg: 0, rep: 2 })]] }, (r) => r[1].hp[0] === 4, "每击 3−2=1，共 2 点");
  // ===== 6 移除（engine remove：tu.lis = []; mit = 0; 并且删掉它的 conts）=====
  cmp("移除：拆掉减伤，后面的伤害照打", { rounds: [[A(3, 2, { k: "mit", n: 3, tg: 3 }), A(0, 5, { k: "remove", tg: 3 }), A(1, 7, { k: "atk", n: 3, tg: 3 })]] }, (r) => r[0].hp[3] === 3, "减伤没了");
  cmp("移除：拆掉转移", { rounds: [[A(3, 2, { k: "redirect", tg: 3 }), A(0, 5, { k: "remove", tg: 3 }), A(1, 7, { k: "atk", n: 3, tg: 3 })]] }, (r) => r[0].hp[3] === 3 && r[0].hp[1] === 6, "转移没了");
  cmp("移除：不拆状态", { rounds: [[A(0, 2, { k: "st", st: "易伤", n: 2, tg: 3 }), A(0 + 1, 5, { k: "remove", tg: 3 }), A(2, 7, { k: "atk", n: 1, tg: 3 })]] }, (r) => r[0].hp[3] === 4, "易伤还在：1+1");
  cmp("移除：对方先拆再保护 → 保护仍有效（同一秒纯防御先生效）", { rounds: [[A(0, 5, { k: "remove", tg: 3 }), A(3, 5, { k: "mit", n: 3, tg: 3 }), A(1, 7, { k: "atk", n: 3, tg: 3 })]] }, undefined);
  // ===== 7 重复 =====
  cmp("重复：2 点打 3 次", { rounds: [[A(0, 4, { k: "atk", n: 2, tg: 3, rep: 3 })]] }, (r) => r[0].hp[3] === 0, "共 6 点");
  cmp("重复 + 减伤：每一击都减", { rounds: [[A(3, 2, { k: "mit", n: 1, tg: 3 }), A(0, 4, { k: "atk", n: 2, tg: 3, rep: 3 })]] }, (r) => r[0].hp[3] === 3, "每击 2−1 = 1，共 3");
  cmp("重复：治疗二连", { hp: { 0: 1 }, rounds: [[A(0 + 1, 4, { k: "heal", n: 2, tg: 0 })]] }, undefined);
  // ===== 8 同一秒的顺序与整句生效 =====
  cmp("同一秒：纯防御句先于攻击（即使宣告得晚）", { rounds: [[A(0, 5, { k: "atk", n: 3, tg: 3 }), A(3, 5, { k: "mit", n: 3, tg: 3 })]] }, (r) => r[0].hp[3] === 6, "减伤先生效，全挡掉");
  cmp("同一秒：含状态的句子不算纯防御，按宣告先后", { rounds: [[A(0, 5, { k: "atk", n: 3, tg: 3 }), A(3, 5, { k: "mit", n: 3, tg: 3 }, { k: "st", st: "衰弱", n: 1, tg: 0 })]] }, (r) => r[0].hp[3] === 3, "宣告在后，攻击先打");
  cmp("同一句里先后：先打后减伤", { rounds: [[A(3, 5, { k: "atk", n: 3, tg: 0 }, { k: "mit", n: 3, tg: 3 }), A(0, 5, { k: "atk", n: 3, tg: 3 })]] }, undefined);
  cmp("同一秒互相打倒：都能出手（倒下在秒末判定）", { rounds: [[A(0, 5, { k: "atk", n: 6, tg: 3 }), A(3, 5, { k: "atk", n: 6, tg: 0 })]] }, (r) => r[0].hp[0] === 0 && r[0].hp[3] === 0, "u0、u3 都倒");
  cmp("治疗在同一秒内先于攻击，能把血加回去", { hp: { 3: 2 }, rounds: [[A(0, 5, { k: "atk", n: 3, tg: 3 }), A(4, 5, { k: "heal", n: 4, tg: 3 })]] }, undefined);
  // ===== 9 过热、胜负 =====
  cmp("过热：第 3 轮 1 点、第 4 轮 2 点、第 5 轮 3 点（全员 6 血：5→3→0）", { rounds: [[], [], [], [], []] }, (r) => r[2].hp[0] === 5 && r[3].hp[0] === 3 && r[4].hp[0] === 0, "5、3、0");
  cmp("胜负：全部倒下的一方输", { hp: { 3: 1, 4: 1, 5: 1 }, rounds: [[A(0, 4, { k: "atk", n: 2, tg: 3 }), A(1, 4, { k: "atk", n: 2, tg: 4 }), A(2, 4, { k: "atk", n: 2, tg: 5 })]] }, (r) => r[0].win === 0, "side0 赢");
  cmp("胜负：双方同时全倒，过热前总生命多的赢", { hp: { 0: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 2 }, rounds: [[], [], [], [], []] }, undefined);

  // ===== 10 费用 / 起手 / 数字（对照 engine.ts 的 actionCost / actionWindup / actionNumbers）=====
  {
    const shapes: RC[][] = [
      [{ k: "atk", n: 3, tg: 3 }], [{ k: "atk", n: 2, tg: 3, rep: 3 }], [{ k: "heal", n: 2, tg: 0, }], [{ k: "mit", n: 4, tg: 0 }],
      [{ k: "st", st: "易伤", n: 3, tg: 3 }], [{ k: "redirect", tg: 0 }], [{ k: "delay", n: 3, act: 0 }], [{ k: "remove", tg: 3 }],
      [{ k: "atk", n: 2, tg: 3 }, { k: "heal", n: 3, tg: 0 }], [{ k: "st", st: "灼烧", n: 2, tg: 3 }, { k: "atk", n: 3, tg: 3, rep: 2 }, { k: "redirect", tg: 0 }],
      [{ k: "remove", tg: 3 }, { k: "delay", n: 2, act: 0 }, { k: "st", st: "衰弱", n: 1, tg: 3 }],
    ];
    let allOk = true;
    for (const cl of shapes) {
      const rc = toReal({ u: 0, start: 1, cl }, 0).cl;
      const sentence = toSentence(cl);
      const rCost = NE.actionCost(rc, NR.AND_COST), rWind = NE.actionWindup(rc, 1), rNums = NE.actionNumbers(rc, false).sort().join(",");
      const lCost = sentenceCost(sentence), lWind = windup(sentence), lNums = sentence.flatMap((c) => numsOf(c)).filter((n) => n >= 2).sort().join(",");
      const ok = rCost === lCost && rWind === lWind && rNums === lNums;
      if (!ok) { allOk = false; console.log("   不一致", JSON.stringify(cl), { rCost, lCost, rWind, lWind, rNums, lNums }); }
    }
    check(allOk, `费用 / 起手 / 数字牌需求：${shapes.length} 种句子与真实 actionCost / actionWindup / actionNumbers 一致`);
  }
  // ===== 11 行动点、保底牌、先后手（对照 match.ts beginRound）=====
  {
    const m = new Match();
    const mk = (): NR.Deck => ({ cls: "并", words: {}, kws: ["", "", ""], hp: [6, 6, 6] });
    m.start(mk(), mk(), 1, false, false, { wipe: true, first: 1 });
    const s = newGame(1);
    let okAp = true, okCards = true, okFirst = true;
    for (let rnd = 1; rnd <= 9; rnd++) {
      if (m.sides[0].ap !== s.side[0].ap) okAp = false;
      const rc = (m.sides[0].cards as { v: number }[]).map((c) => c.v).sort().join(","), lc = s.side[0].cards.map((c) => c.v).sort().join(",");
      if (rc !== lc) okCards = false;
      if (m.firstSide() !== s.first) okFirst = false;
      m.declared = []; m.resolveRound(); s.decl = []; resolveRound(s);
      if (m.phase === "over" || s.win >= 0) break;
      m.nextRound(); nextRound(s);
    }
    check(okAp, "行动点：开局 5、每轮 +4、上限 10，与 match.ts 一致");
    check(okCards, "保底数字牌：第 3/5/7 轮各发 2/3/4，开局没有牌，与 match.ts 一致");
    check(okFirst, "先后手：第 1 轮先手可指定，每轮交替，与 match.ts 一致");
    check(P.TL === NR.TIMELINE && P.HP === NR.W.HP && P.AND === NR.AND_COST && P.BASE === NR.BASE_COST && P.APCAP === NR.W.AP_CAP && P.APINC === NR.W.AP_INCOME && P.AP0 === NR.W.AP_START && P.HEAT_FROM === NR.W.HEAT_FROM, "REAL 数值与 rules.ts（W、TIMELINE、AND_COST、BASE_COST）逐项一致");
  }

  // ===== 11b lab2 自己的补充（真实引擎里没有直接对应物，依据写在注释里）=====
  {
    const s = newGame(0, [null, null], false, [null, null]); refill(s);
    // engine.ts remove：R.conts 里 uid === 目标 的全部删掉（掐断它挂着的续）；lab2 里「挂着的长期句子」就是 stand
    declare(s, 1, 3, [whenever("foe", cat("atk"), 2, [dmg(1, { t: "src" })], 1, 2)], 1);
    check(s.stand.some((x) => x.unit === 3), "（准备）u3 挂着一句长期句子");
    declare(s, 0, 0, [strip(unit(3))], 4); resolveRound(s);
    check(!s.stand.some((x) => x.unit === 3), "移除（真实）：掐断目标随从挂着的长期句子（engine.ts remove 删 R.conts）");
    // match.ts buildAction：延后要选「对方已经宣告」的一句；自己的不行，还没宣告的不行
    const s2 = newGame(0, [null, null], false, [null, null]); refill(s2);
    declare(s2, 0, 0, [act(dmg(1, unit(3)))], 3);
    check(!canAfford(s2, 0, [postpone(0, 1)], 1) && !!canAfford(s2, 1, [postpone(0, 1)], 3) && !canAfford(s2, 1, [postpone(5, 1)], 3), "延后：只能选对方已宣告的一句（match.ts buildAction）");
    // 关闭开关后新词全部不合法、不进随机卡组（旧实验不变）
    applyRules();
    const s3 = newGame(0, [null, null], false, [null, null]); refill(s3); declare(s3, 0, 0, [act(dmg(1, unit(3)))], 3);
    const rr = mulberry32(5); const ds = Array.from({ length: 200 }, () => randDeck(rr));
    check(!canAfford(s3, 1, [redirect(unit(3))], 3) && !canAfford(s3, 1, [postpone(0, 1)], 3) && !canAfford(s3, 1, [strip(unit(0))], 3) && !canAfford(s3, 0, [act(dmg(1, unit(3), undefined, 2))], 3)
      && !ADV_WORDS.includes("转移") && !ADV_WORDS.includes("延后") && ds.every((d) => !d["转移"] && !d["延后"]), "默认配置：转移/延后/移除（真实）/重复 全部不合法，不进随机卡组");
    useReal();
    check(ADV_WORDS.includes("转移") && ADV_WORDS.includes("延后"), "REAL 配置：转移、延后进词表");
    // match.ts：指定的随从已倒下 → 这一段落空（不换人）；旧配置下改打最低血量
    const sx = newGame(0, [null, null], false, [null, null]); refill(sx); sx.hp[3] = 1;
    declare(sx, 0, 0, [act(dmg(6, unit(3)))], 4); declare(sx, 0, 1, [act(dmg(2, unit(3)))], 6); resolveRound(sx);
    check(sx.hp[4] === 6 && sx.hp[5] === 6, "REAL：指定的目标已倒下，后一句落空，不换人");
  }
  // ===== 11c 目标在宣告时定（TGT_AT_DECL）：别名在 declare 时解析成具体随从；生效时它已倒下 → 落空（真实：tg 是宣告时点选的，hit 对已倒下的目标返回 0）=====
  {
    const alias = (cl: Sentence) => cl;
    const mk = () => { const s = newGame(0, [null, null], false, [null, null]); refill(s); s.hp[3] = 1; return s; };
    const run = (flag: number) => {
      P2.TGT_AT_DECL = flag; const s = mk();
      declare(s, 0, 1, alias([act(dmg(2, { t: "lowFoe" }))]), 6);           // 宣告时最低血是 u3（1 血）
      declare(s, 0, 0, alias([act(dmg(3, unit(3)))]), 4);                      // 第 4 秒先把 u3 打倒
      resolveRound(s); return s;
    };
    const s1 = run(1), s0 = run(0);
    check(s1.decl[0].cl[0].k === "act" && (s1.decl[0].cl[0] as { eff: { tg: { t: string; u?: number } } }).eff.tg.t === "unit" && (s1.decl[0].cl[0] as { eff: { tg: { u?: number } } }).eff.tg.u === 3, "宣告时 lowFoe 被解析成具体随从（u3）");
    check(s1.hp[4] === 6 && s1.hp[5] === 6 && s1.hp[3] === 0, "目标已倒下 → 这一段落空，不换人（与真实引擎 tg 固定一致）");
    check(s0.hp[3] === 0 && s0.hp[4] === 4, "开关关：生效时才取最低血（旧行为不变）");
    // 与真实引擎对照：宣告时的最低血是 u3，换成真实的固定 tg
    P2.TGT_AT_DECL = 1;
    const sc: Sc = { hp: { 3: 1 }, rounds: [[A(1, 6, { k: "atk", n: 2, tg: 3 }), A(0, 4, { k: "atk", n: 3, tg: 3 })]] };
    const rr = runReal(sc);
    check(rr[0].hp[4] === s1.hp[4] && rr[0].hp[3] === s1.hp[3], "与真实引擎一致（u4 不受伤）");
    // 全体 / 选择 N 个：宣告时定下一组
    const sa = mk(); sa.hp[3] = 6; declare(sa, 0, 0, [act(dmg(2, { t: "allFoe" }))], 4); declare(sa, 0, 1, [act(dmg(1, { t: "some", n: 2, side: "foe" }))], 5);
    const tgs = sa.decl.map((d) => JSON.stringify((d.cl[0] as { eff: { tg: unknown } }).eff.tg));
    check(tgs[0] === '{"t":"units","us":[3,4,5]}' && JSON.parse(tgs[1]).t === "units" && JSON.parse(tgs[1]).us.length === 2, "全体 / 选择 2 个 被解析成显式随从组");
    check(sentenceText(sa.decl[0].cl).includes("乙方1号词位随从") && !sentenceText([act(dmg(2, unit(4)))]).includes("敌方最低"), "显式目标读成「乙方N号位置名随从」");
    // 生成器：开关开时不再出现任何别名目标；延后只出「刚好推出时间轴」的最小 N 且只在来得及时出现
    const aliasT = new Set(["lowFoe", "lowMe", "allMe", "allFoe", "some"]);
    let nAlias = 0, nCand = 0, postBad = 0, postN = 0;
    const rg = mulberry32(99);
    for (let g = 0; g < 60; g++) {
      const s = newGame((g % 2) as 0 | 1, [null, null], false, [["首挡", "不屈", "首挡"], ["不屈", "首挡", "不屈"]]); refill(s); s.rnd = 1 + (g % 5);
      declare(s, 1, 3, [act(dmg(3 + (g % 3), unit(0)))], 3 + (g % 7)); if (g % 2) declare(s, 1, 4, [act(heal(2, unit(4)))], 5);
      for (const mode of ["free", "playbook"] as const) for (const cl of candidates(s, 0, 0, rg, 12, mode)) {
        nCand++;
        const tgOf = (c: Sentence[number]) => (c.k === "act" ? [c.eff.tg] : c.k === "when" || c.k === "delay" ? c.effs.map((x) => x.tg) : "tg" in c ? [c.tg] : []);
        for (const c of cl) { for (const tg of tgOf(c)) if (aliasT.has(tg.t)) nAlias++; if (c.k === "postpone") { postN++; const d = s.decl.find((x) => x.ord === c.ord)!; if (c.n !== P.TL - d.start + 1 || !d.cl.some((z) => z.k === "act")) postBad++; } }
      }
    }
    check(nCand > 100 && nAlias === 0, `开关开：${nCand} 个候选句里没有任何别名目标（lowFoe 等）`, `（别名 ${nAlias}）`);
    check(postN > 0 && postBad === 0, `延后候选 ${postN} 条：N 都是刚好推出时间轴的最小值`);
  }
  // ===== 11d 职业（P2.CLASSES，草案）：天赋与限制 =====
  {
    P2.CLASSES = 1;
    const mk = (c0: "并" | "引用" | "限制" | "状态" | null, c1: "并" | "引用" | "限制" | "状态" | null = null) => { const s = newGame(0, [null, null], false, [null, null], [c0, c1]); refill(s); return s; };
    // 并流：多一段只加 1 点；起手不变晚；同一动作词不能重复；最多 7 段（其他 3 段，SEGCAP 开）
    const three = [act(dmg(1, unit(3))), act(heal(1, unit(0))), act(shield(1, unit(0)))];
    check(canAfford(mk("并"), 0, three, 0)!.cost === canAfford(mk("引用"), 0, three, 0)!.cost - 2, "并流：多一段只加 1 点行动点（其他职业加 2），3 段省 2 点");
    { const s = mk("并"), o = mk("引用"); check(windupFor(three, 0, s) === windupFor(three, 0, o) - 2, "并流：起手不因段数变晚"); }
    check(canAfford(mk("并"), 0, [act(dmg(1, unit(3))), act(dmg(1, unit(4)))], 0) === null && canAfford(mk("引用"), 0, [act(dmg(1, unit(3))), act(dmg(1, unit(4)))], 0) !== null, "并流：同一动作词（造成）一句里只能一次");
    P2.SEGCAP = 1;
    const seven = [status("vuln", 1, 2, unit(3)), status("weak", 1, 2, unit(4)), status("burn", 1, 2, unit(5)), act(dmg(1, unit(3))), act(heal(1, unit(0))), act(shield(1, unit(0))), redirect(unit(1))];
    check(canAfford(mk("并"), 0, seven, 0) !== null && canAfford(mk("并"), 0, [...seven, strip(unit(3))], 0) === null && canAfford(mk("引用"), 0, seven.slice(0, 3), 0) !== null && canAfford(mk("引用"), 0, seven.slice(0, 4), 0) === null, "段数上限：并流 7 段，其他职业 3 段（SEGCAP）");
    P2.SEGCAP = 0;
    // 引用流：全程半价；自指词多 1 张且当轮用完下一轮立刻恢复；最多一个引用量词
    { const all = [act(dmg({ q: query(win("before", 99), "me", cat("dealt"), "sum"), mult: 1 }, unit(3)))]; const a = mk("引用"), b = mk("限制"); a.rnd = b.rnd = 6;
      check(canAfford(a, 0, all, 0)!.cost < canAfford(b, 0, all, 0)!.cost, "引用流：全程价格减半"); }
    { const w = () => [whenever("foe", cat("atk"), 2, [dmg(1, { t: "src" })], 1, 2)]; const s = mk("引用"), o = mk("状态");
      for (let i = 0; i < 3; i++) declare(s, 0, i, w(), 1 + i); for (let i = 0; i < 2; i++) declare(o, 0, i, w(), 1 + i);
      check(canAfford(s, 0, w()) === null && canAfford(o, 0, w()) === null, "自指词：用完本轮就没了");
      const s2 = mk("引用"); declare(s2, 0, 0, w(), 1); declare(s2, 0, 1, w(), 2); check(canAfford(s2, 0, w(), 2) !== null, "引用流：多带 1 张（别的职业 2 张用完）");
      resolveRound(s); nextRound(s); resolveRound(o); nextRound(o);
      check(canAfford(s, 0, w()) !== null && canAfford(o, 0, w()) === null, "引用流：下一轮立刻恢复（不进冷却），别的职业还在冷却"); }
    { const q2 = [act(dmg({ q: query(win("before", 1), "me", cat("dealt"), "sum"), mult: 1 }, unit(3))), act(dmg({ q: query(win("before", 1), "me", cat("dealt"), "count"), mult: 1 }, unit(3)))];
      const s = mk("引用"); check(canAfford(s, 0, q2, 0) === null, "引用流：一句最多一个引用量词"); }
    // 限制流：窗口数字与至多不占牌；单次伤害 ≤3；不得惩罚 +1
    { const f = [forbid(cat("atk"), 3, 1, 2)]; const a = mk("限制"), b = mk("状态"); a.side[0].cards = []; b.side[0].cards = [];
      check(canAfford(a, 0, f, 0) !== null && canAfford(b, 0, f, 0) === null, "限制流：以后 3 轮、至多 2 次不占数字牌（没有数字牌也能写；其他职业写不出）"); }
    { const a = mk("限制"); check(canAfford(a, 0, [act(dmg(4, unit(3)))], 0) === null && canAfford(a, 0, [act(dmg(3, unit(3)))], 0) !== null, "限制流：攻击句写出来的单次伤害 > 3 不合法");
      declare(a, 0, 0, [act(dmg({ q: query(win("before", 1), "me", cat("dealt"), "sum"), mult: 3 }, unit(3)))], 6); a.log.push({ seq: 99, rnd: 0, sord: 0, rord: 0, side: 0, kind: "dealt", words: [], cats: ["dealt"], amt: 3, len: 0, segs: 0, src: 0, trig: false });
      const b = mk("限制"); declare(b, 0, 0, [forbid(cat("atk"), 2, 2, 1)], 1); declare(b, 1, 3, [act(dmg(1, unit(0)))], 4); resolveRound(b);
      check(b.hp[3] === P.HP - 3, "限制流：不得的惩罚 +1（写 2 点，实际 3 点）"); }
    // 状态流：状态词行动点 −1；初始级别 +1；同一轮同一目标只能一种
    { const st = [status("vuln", 1, 2, unit(3))]; check(canAfford(mk("状态"), 0, st, 0)!.cost === canAfford(mk("并"), 0, st, 0)!.cost - 1, "状态流：状态词行动点 −1");
      const s = mk("状态"); declare(s, 0, 0, [status("vuln", 1, 2, unit(3))], 3); declare(s, 0, 1, [act(dmg(1, unit(3)))], 6); resolveRound(s);
      check(s.sts[0].lvl === 2 && s.hp[3] === P.HP - 3, "状态流：状态初始级别 +1（1 点伤害吃 2 级易伤 = 3）");
      const t = mk("状态"); declare(t, 0, 0, [status("vuln", 1, 2, unit(3))], 3);
      check(canAfford(t, 0, [status("burn", 1, 2, unit(3))], 1) === null && canAfford(t, 0, [status("burn", 1, 2, unit(4))], 1) !== null && canAfford(t, 0, [status("vuln", 1, 2, unit(3))], 1) !== null, "状态流：同一轮同一目标只能挂一种状态（不同目标、同一种可以）"); }
    P2.CLASSES = 0;
    check(canAfford(mk("并"), 0, [act(dmg(1, unit(3))), act(dmg(1, unit(4)))], 0) !== null, "CLASSES 关：职业限制全部不起作用");
    useReal();
  }
  // ===== 12 模糊对照：随机场景、三轮，逐轮比较血量/状态/胜负 =====
  const N = +(process.argv[2] ?? 400);
  let mism = 0, shown = 0;
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ri = (n: number) => Math.floor(rnd() * n);
  for (let g = 0; g < N; g++) {
    const kws = [0, 1, 2, 3, 4, 5].map(() => ["", "首挡", "不屈"][ri(3)]);
    const hp: Record<number, number> = {}; for (let u = 0; u < 6; u++) if (rnd() < 0.4) hp[u] = 1 + ri(6);
    // 先随机生成，再按真实规则的前提过滤（目标必须是出手时活着的、延后只能选对方已宣告的）
    const rounds: RAct[][] = [];
    const alive = Array(6).fill(true); const cur = { ...hp };
    // 为了知道谁活着，边生成边用真实引擎推演
    const skeleton: Sc = { kws, hp, rounds };
    for (let r = 0; r < 3; r++) {
      const snap = r === 0 ? null : runReal({ ...skeleton, rounds: rounds.slice(0, r) });
      const hpNow = snap ? snap[snap.length - 1].hp : [0, 1, 2, 3, 4, 5].map((u) => cur[u] ?? 6);
      if (snap && (snap.length < r || snap[snap.length - 1].win !== -1)) break;
      for (let u = 0; u < 6; u++) alive[u] = hpNow[u] > 0;
      const acts: RAct[] = [];
      const order = [0, 1, 2, 3, 4, 5].filter((u) => alive[u]).sort(() => rnd() - 0.5);
      for (const u of order) {
        if (rnd() < 0.2) continue;
        const foes = (u < 3 ? [3, 4, 5] : [0, 1, 2]).filter((x) => alive[x]), mine = (u < 3 ? [0, 1, 2] : [3, 4, 5]).filter((x) => alive[x]);
        if (!foes.length) continue;
        const pick = <T,>(xs: T[]) => xs[ri(xs.length)];
        const cl: RC[] = [];
        for (let k = 0, nc = 1 + (rnd() < 0.3 ? 1 : 0); k < nc; k++) {
          const x = rnd();
          if (x < 0.34) cl.push({ k: "atk", n: 1 + ri(3), tg: pick(foes), rep: rnd() < 0.3 ? 2 : 1 });
          else if (x < 0.46) cl.push({ k: "heal", n: 1 + ri(3), tg: pick(mine) });
          else if (x < 0.58) cl.push({ k: "mit", n: 1 + ri(2), tg: pick(mine) });
          else if (x < 0.72) cl.push({ k: "st", st: pick(["易伤", "灼烧", "衰弱"] as const), n: 1 + ri(3), tg: pick(foes) });
          else if (x < 0.82) cl.push({ k: "redirect", tg: pick(mine) });
          else if (x < 0.92) { const ds = acts.map((a, i) => ({ a, i })).filter((q) => (q.a.u < 3) !== (u < 3)); if (ds.length) cl.push({ k: "delay", n: 1 + ri(4), act: pick(ds).i }); }
          else cl.push({ k: "remove", tg: pick(foes) });
        }
        if (!cl.length) continue;
        const minStart = 1 + cl.filter((c) => ["st", "redirect", "delay", "remove"].includes(c.k)).length + (cl.length - 1);
        acts.push({ u, start: Math.min(10, minStart + ri(10)), cl });
      }
      rounds.push(acts);
    }
    const sc: Sc = { kws, hp, rounds };
    let r: Snap[], l: Snap[];
    try { r = runReal(sc); l = runLab(sc); } catch (e) { mism++; console.log("✗ 模糊 异常", (e as Error).message, JSON.stringify(sc)); continue; }
    if (!same(r, l)) { mism++; if (shown++ < 6) console.log("✗ 模糊不一致", JSON.stringify(sc), "\n   真实", JSON.stringify(r), "\n   lab2", JSON.stringify(l)); }
  }
  check(mism === 0, `模糊对照 ${N} 个随机场景（每个至多 3 轮）全部一致`, `（${mism} 个不一致）`);
  console.log(bad ? `失败 ${bad}/${total} 项` : `全部通过（${total} 项）`);
  process.exit(bad ? 1 : 0);
}

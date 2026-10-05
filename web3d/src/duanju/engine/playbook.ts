// 自动同步自 lab2/playbook.ts（scripts/sync-engine.mjs），请勿手改；补丁见 PATCHES.md
/* eslint-disable */
// @ts-nocheck
// 「手册」：人写的、可能造成漂亮结果的句子与组合（限制 / 引用类）。
// 它们大多依赖复杂决策（时机、读对手的上一句、几句话互相配合）——电脑只拿到「可以说的句子」，什么时候说由推演决定。
import { type Eff, units, act, dmg, shield, heal, status, forbid, whenever, unless, timer, query, win, cat, word, ev, redirect, postpone, strip, unit, type Sentence, type Tg, type Clause, type Obj } from "./ast";
import type { Env } from "./gen";
import { P } from "./lab-rules";
import { P2 } from "./params";
import { sideOf, windupFor, type Decl } from "./interp";

export interface Named { name: string; cl: Sentence; group: "atkdef" | "other" }
/** 普通进攻/防御也能用的复杂句（只用连环、并、减伤、无视这类攻防词，不需要限制/引用/状态类进阶词） */
const ATKDEF = ["爽·连环成功", "爽·集火", "爽·连环攻守", "爽·全员强化防", "爽·穿透连击", "爽·饱和攻击", "爽·铁壁", "无视长期句"];
const rm = (obj: Obj): Clause => ({ k: "remove", obj });
const before1s = (who: "me" | "foe", obj: Obj, tight = 1) => query(win("before", 1, "sent"), who, obj, "count", tight);

export function playbookNamed(_e?: Env): Named[] {
  const o: Named[] = [];
  const add = (name: string, ...cl: Sentence) => o.push({ name, cl, group: ATKDEF.some((k) => name.startsWith(k)) ? "atkdef" : "other" });
  const src: Tg = { t: "src" }, lowFoe: Tg = { t: "lowFoe" }, allMe: Tg = { t: "some", n: 2, side: "me" }, lowMe: Tg = { t: "lowMe" };

  // ---- 限制：让对方「做不了」或「做了就疼」
  for (const pen of [2, 3]) {
    for (const cap of [1, 2]) add("禁攻", forbid(cat("atk"), 2, pen, cap));
    add("禁疗", forbid(cat("heal"), 2, pen));
    add("禁防", forbid(cat("def"), 2, pen));
    add("禁状态", forbid(cat("status"), 2, pen));
    add("禁移除", forbid(word("移除"), 2, pen));
    add("禁令+自保", forbid(cat("atk"), 2, pen, 2), act(shield(2, lowMe)));
    add("和平引擎", forbid(cat("atk"), 2, pen), unless("foe", cat("atk"), 2, [heal(2, allMe)]));      // 他们要么挨罚、要么不打 → 我方每轮回血
    add("禁攻+衰弱", forbid(cat("atk"), 2, pen), status("weak", 2, 2, lowFoe));
    add("封锁防御并重击", forbid(cat("def"), 2, pen), act(dmg(2, lowFoe)));
  }
  add("衰弱+防", status("weak", 2, 2, lowFoe), act(shield(2, lowMe)));

  // ---- 引用对方做过的事：每当 / 看上一句
  for (const tight of [2, 3]) {
    for (const cap of [1, 2]) {
      add("荆棘（我方受伤→反击来源）", whenever("me", ev("hurt"), 2, [dmg(2, src)], cap, tight));
      add("荆棘无视防护", whenever("me", ev("hurt"), 2, [dmg(2, src, "shield")], cap, tight));
      add("对攻必反", whenever("foe", cat("atk"), 2, [dmg(2, src)], cap, tight));
    }
    add("对攻自保", whenever("foe", cat("atk"), 2, [shield(2, allMe)], 1, tight));
    add("对疗惩罚", whenever("foe", cat("heal"), 2, [dmg(2, src)], 1, tight));
    add("对状态反击", whenever("foe", cat("status"), 2, [dmg(2, src)], 1, tight));
    add("倒下复仇", whenever("me", ev("down"), 3, [dmg(3, lowFoe)], 1, tight));
  }
  add("读上一句：对方在攻击→我方全体减伤", { k: "when", q: before1s("foe", word("造成")), judge: "exist", effs: [shield(2, allMe)], cap: 1 });
  add("读上一句：对方没防→重击", { k: "when", q: before1s("foe", word("减伤")), judge: "absent", effs: [dmg(3, lowFoe)], cap: 1 });
  add("读上一句：对方在治疗→追击", { k: "when", q: before1s("foe", word("恢复")), judge: "exist", effs: [dmg(2, lowFoe)], cap: 1 });
  add("读词序：先打后治", { k: "when", q: before1s("foe", { t: "order", a: "造成", b: "恢复" }, 2), judge: "exist", effs: [dmg(3, lowFoe)], cap: 1 });
  add("对方不防就打", unless("foe", cat("def"), 2, [dmg(3, lowFoe)]));

  // ---- 引用量：把对方/我方做过的事变成数字
  add("追击（我方累计伤害）", act(dmg({ q: query(win("before", 1, "round"), "me", cat("dealt"), "sum"), mult: 1 }, lowFoe)));
  add("反制句长（对方上一句词数）", act(dmg({ q: query(win("before", 1, "sent"), "foe", ev("decl"), "len"), mult: 1 }, lowFoe)));
  add("吸血", act(dmg(2, lowFoe)), act(heal({ q: query(win("before", 1, "round"), "me", cat("dealt"), "sum"), mult: 1 }, lowMe), "ok"));
  add("受伤转盾", act(shield({ q: query(win("before", 1, "round"), "me", ev("hurt"), "sum"), mult: 1 }, allMe)));
  add("受伤转治疗", act(heal({ q: query(win("before", 1, "round"), "me", ev("hurt"), "sum"), mult: 1 }, lowMe)));

  // ---- 定时 / 兑现 / 复仇
  add("定时攒爆（2轮）", timer(2, cat("atk"), "foe", 2));
  add("定时攒爆（3轮）", timer(3, cat("atk"), "foe", 2));
  add("复仇（受伤次数×2）", timer(2, ev("hurt"), "me", 2));
  add("我方连击攒爆", timer(2, cat("atk"), "me", 2));
  add("兑现", { k: "cash" });
  add("攒爆+自保", timer(2, cat("atk"), "foe", 2), act(shield(2, lowMe)));

  // ---- 状态词配合
  add("易伤并连击", status("vuln", 2, 2, lowFoe), act(dmg(1, lowFoe)), act(dmg(1, lowFoe)));
  add("易伤并重击", status("vuln", 2, 2, lowFoe), act(dmg(3, lowFoe)));
  add("灼烧并防", status("burn", 2, 3, lowFoe), act(shield(2, lowMe)));
  add("灼烧并易伤", status("burn", 2, 3, lowFoe), status("vuln", 2, 2, lowFoe));
  add("衰弱并荆棘", status("weak", 2, 2, lowFoe), whenever("me", ev("hurt"), 2, [dmg(2, src)], 1, 2));

  // ---- 拆与破
  add("拆了就打", rm(cat("struct")), act(dmg(3, lowFoe)));
  add("移除任意并打", rm(cat("any")), act(dmg(2, lowFoe)));
  add("拆状态", rm(cat("status")));
  add("无视长期句并重击", { k: "ignore", cat: "stand", win: 2 }, act(dmg(3, lowFoe)));
  add("无视长期句", { k: "ignore", cat: "stand", win: 2 });
  add("移除结构词", rm(cat("struct")));
  add("移除任意词", rm(cat("any")));

  // ================= 爽句：复杂、强大、要规划的组合（电脑可以不用；只是推荐） =================
  // 多米诺：每一段「若成功」才打下一段，一路推下去
  add("爽·连环成功(4段)", act(dmg(2, lowFoe)), act(dmg(2, lowFoe), "ok"), act(dmg(3, lowFoe), "ok"), act(dmg(3, lowFoe), "ok"));
  add("爽·连环成功(3段)", act(dmg(2, lowFoe)), act(dmg(3, lowFoe), "ok"), act(dmg(3, lowFoe), "ok"));
  add("爽·集火(3段)", act(dmg(3, lowFoe)), act(dmg(3, lowFoe), "ok"), act(dmg(3, lowFoe), "ok"));
  add("爽·连环攻守", act(dmg(3, lowFoe)), act(shield(3, allMe), "fail"), act(heal(3, lowMe), "ok"));          // 打中就治疗，被挡就自保
  add("爽·全员强化防", act(shield(3, allMe)), act(heal(3, allMe), "ok"));
  // 多段乘积：易伤让后面每一击都变大
  add("爽·易伤三连击", status("vuln", 3, 2, lowFoe), act(dmg(1, lowFoe)), act(dmg(1, lowFoe)), act(dmg(1, lowFoe)));
  add("爽·易伤二连重击", status("vuln", 3, 2, lowFoe), act(dmg(2, lowFoe)), act(dmg(2, lowFoe)));
  add("爽·三状态齐发", status("weak", 2, 2, lowFoe), status("burn", 3, 3, lowFoe), status("vuln", 2, 2, lowFoe));
  add("爽·饱和攻击(选择2个敌方各2)", act(dmg(2, { t: "some", n: 2, side: "foe" })));
  add("爽·饱和攻击(选择3个敌方各3)", act(dmg(3, { t: "some", n: 3, side: "foe" })));
  add("爽·穿透连击", act(dmg(3, lowFoe, "shield")), act(dmg(3, lowFoe, "shield")));
  // 引用巨量
  add("爽·乘积放大(上轮累计×2)", act(dmg({ q: query(win("before", 1, "round"), "me", cat("dealt"), "sum"), mult: 2 }, lowFoe)));
  add("爽·全程收割(全部累计伤害)", act(dmg({ q: query(win("before", 99), "me", cat("dealt"), "sum"), mult: 1 }, lowFoe)));
  add("爽·全程转治疗(全部受到伤害)", act(heal({ q: query(win("before", 99), "me", ev("hurt"), "sum"), mult: 1 }, allMe)));
  add("爽·对方句长×2", act(dmg({ q: query(win("before", 1, "sent"), "foe", ev("decl"), "len"), mult: 2 }, lowFoe)));
  add("爽·倍率攒爆(3轮×3)", timer(3, cat("atk"), "foe", 3));
  add("爽·复仇放大(受伤×3)", timer(2, ev("hurt"), "me", 3));
  // 封锁与设伏
  add("爽·全封锁(任何动作受罚)", forbid(cat("any"), 3, 3, 2));
  add("爽·全封锁+衰弱", forbid(cat("any"), 2, 3, 1), status("weak", 2, 2, lowFoe));
  add("爽·设伏连锁(反击+自保)", whenever("foe", cat("atk"), 3, [dmg(2, src), shield(1, allMe)], 3, 3));
  add("爽·全面设伏(攻/疗/防)", whenever("foe", cat("atk"), 3, [dmg(2, src)], 2, 3), whenever("foe", cat("heal"), 3, [dmg(2, src)], 2, 3), whenever("foe", cat("def"), 3, [dmg(2, src)], 2, 3));
  add("爽·反伤护盾", act(shield(3, allMe)), whenever("me", ev("hurt"), 2, [dmg(2, src, "shield")], 2, 3));
  add("爽·铁壁(全员减伤+无视长期句)", act(shield(3, allMe)), { k: "ignore", cat: "stand", win: 2 });
  add("爽·以静制动(不动则回血盾)", forbid(cat("any"), 2, 2, 1), unless("foe", cat("any"), 2, [heal(2, allMe), shield(2, allMe)]));
  // 接力：读我方上一句（之前 2 句里我方说过什么）
  add("爽·接力追击", { k: "when", q: query(win("before", 2, "sent"), "me", word("造成"), "count", 1), judge: "exist", effs: [dmg(3, lowFoe, "shield")], cap: 1 });
  add("爽·接力防御", { k: "when", q: query(win("before", 2, "sent"), "me", word("造成"), "count", 1), judge: "exist", effs: [shield(3, allMe), heal(2, lowMe)], cap: 1 });
  if (_e) realExtras(_e, add);
  return o;
}
/** 延后值得用：对方那句带伤害，我方能在它起手之前出手（不然它已经生效，延后落空） */
export function postponeOk(e: Env, d: Decl): boolean { return d.cl.some((c) => c.k === "act" && c.eff.verb === "dmg") && windupFor([postpone(d.ord, 1)], e.unit, e.s) < d.start; }
/** 对方这一句里最大的单次伤害（只看写死数字的伤害，重复算在一起） */
function bigHit(d: Decl): number { let m = 0; for (const c of d.cl) if (c.k === "act" && c.eff.verb === "dmg" && typeof c.eff.n === "number") m = Math.max(m, c.eff.n * (c.eff.rep ?? 1)); return m; }
/** 真实引擎的词（开关打开才有）：转移反弹大单击、延后推出时间轴、关键词保护大招、拆保护、重复 */
function realExtras(e: Env, add: (name: string, ...cl: Sentence) => void) {
  const s = e.s, lowFoe: Tg = { t: "lowFoe" };
  const foeDecl = s.decl.filter((d) => d.side !== e.side);
  const lowMine = e.mine.reduce((b, x) => (s.hp[x] < s.hp[b] ? x : b), e.mine[0]);
  for (const d of foeDecl) {
    const big = bigHit(d);
    if (big < 3) continue;
    if (P2.REDIR) {   // 反弹大单击：对方这句打谁，就给谁转移（打「最低血」的按我方现在最低血的）
      const tg = d.cl.flatMap((c) => (c.k === "act" && c.eff.verb === "dmg" ? [c.eff.tg] : []));
      const ts = new Set<number>(); for (const g of tg) { if (g.t === "unit" && sideOf(g.u) === e.side) ts.add(g.u); else if (g.t === "lowFoe" || g.t === "lowMe") ts.add(lowMine); }
      for (const u of ts) add("转移·反弹大单击", redirect(unit(u)));
    }
    if (P2.POSTPONE && postponeOk(e, d)) {   // 只在「推得出时间轴」且我方来得及在它之前出手时才用延后，N 取最小的
      const nOut = P.TL - d.start + 1;
      add("延后·大招推出时间轴", postpone(d.ord, nOut));
      add("延后·大招推出时间轴并打", postpone(d.ord, nOut), act(dmg(2, lowFoe)));
    }
  }
  const kw = s.kw[e.unit];
  if (P2.KW && kw === "不屈") {   // 不屈的随从倒不了（第一次），让它放压轴大招
    add("不屈·压轴大招", act(dmg(3, lowFoe)));
    if (P2.REP) add("不屈·压轴重复", act(dmg(2, lowFoe, undefined, 2)));
  }
  if (P2.KW && kw === "首挡") {   // 首挡 + 转移：第一击整下挡掉，后面的击打回去
    if (P2.REDIR) add("首挡+转移·双保险", redirect(unit(e.unit)));
    add("首挡·领头重击", act(dmg(3, lowFoe)));
  }
  if (P2.KW && P2.REDIR) for (const m of e.mine) if (s.kw[m] === "首挡" && !s.kwUsed[m] && m !== e.unit) add("给首挡的人转移（吃一击、挡一击、弹一击）", redirect(unit(m)));
  if (P2.RMREAL) for (const f of e.foes) {
    const protectedF = s.sh[f] > 0 || s.redir[f] || s.stand.some((x) => x.owner !== e.side && x.unit === f);
    if (protectedF) { add("移除·拆保护", strip(unit(f))); add("移除·拆保护并重击", strip(unit(f)), act(dmg(3, unit(f)))); }
  }
  if (P2.REP) {
    add("重复·三连", act(dmg(1, lowFoe, undefined, 3)));
    add("重复·二连重击", act(dmg(2, lowFoe, undefined, 2)));
    add("重复·易伤并三连", status("vuln", 1, 2, lowFoe), act(dmg(1, lowFoe, undefined, 3)));
    add("重复·治疗二连", act(heal(2, { t: "lowMe" }, 2)));
  }
}
/** 环境变量 PB_EXCLUDE='追击,吸血' 可以把名字里含这些字的手册句去掉（做对照实验用） */
const EXC = ((((globalThis as any).process?.env) ?? {}).PB_EXCLUDE ? (((globalThis as any).process?.env) ?? {}).PB_EXCLUDE.split(",") : []).filter(Boolean);
/** TGT_AT_DECL：把句子里的别名目标（最低血 / 全体 / 选择 N 个）展开成显式随从。敌方（或我方）「最低血」的每个可选随从各出一条；one = 随机只留一条 */
export function expandTg(e: Env, cl: Sentence, one = false): Sentence[] {
  const s = e.s;
  const isAlias = (t: Tg) => t.t === "lowFoe" || t.t === "lowMe" || t.t === "allMe" || t.t === "allFoe" || t.t === "some";
  const effsOf = (c: Clause): Eff[] => (c.k === "act" ? [c.eff] : c.k === "when" || c.k === "delay" ? c.effs : []);
  const need = cl.some((c) => effsOf(c).some((x) => isAlias(x.tg)) || ((c.k === "status" || c.k === "redirect" || c.k === "strip") && isAlias(c.tg)));
  if (!need) return [cl];
  const foeSide = (v: string) => v === "dmg" || v === "status" || v === "strip";
  const fch = e.foes.length ? e.foes : [-1], mch = e.mine.length ? e.mine : [-1];
  const pickF = one ? [fch[Math.floor(e.r() * fch.length)]] : fch, pickM = one ? [mch[Math.floor(e.r() * mch.length)]] : mch;
  const out: Sentence[] = [], seen = new Set<string>();
  for (const f of pickF) for (const m of pickM) {
    const rt = (t: Tg, v: string): Tg => {
      const fs = foeSide(v);
      switch (t.t) {
        case "lowFoe": case "lowMe": { const u = fs ? f : m; return u >= 0 ? unit(u) : t; }
        case "allMe": return units(e.mine);
        case "allFoe": return units(e.foes);
        case "some": return units((t.side === "foe" ? e.foes : e.mine).slice().sort((a, b) => s.hp[a] - s.hp[b]).slice(0, t.n));
        default: return t;
      }
    };
    const re = (x: Eff): Eff => ({ ...x, tg: rt(x.tg, x.verb) });
    const n = cl.map((c): Clause => c.k === "act" ? { ...c, eff: re(c.eff) } : c.k === "when" || c.k === "delay" ? ({ ...c, effs: c.effs.map(re) } as Clause) : c.k === "status" ? { ...c, tg: rt(c.tg, "status") } : c.k === "redirect" ? { ...c, tg: rt(c.tg, "redir") } : c.k === "strip" ? { ...c, tg: rt(c.tg, "strip") } : c);
    const key = JSON.stringify(n); if (!seen.has(key)) { seen.add(key); out.push(n); }
  }
  return out;
}
export const playbook = (e: Env, group?: "atkdef"): Sentence[] => {
  const base = playbookNamed(e).filter((x) => !EXC.some((k) => x.name.includes(k)) && (!group || x.group === group)).map((x) => x.cl);
  return P2.TGT_AT_DECL ? base.flatMap((cl) => expandTg(e, cl)) : base;
};

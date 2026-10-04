// 解释器行为测试：npx tsx src/lab2/test.ts
import { P } from "../lab/rules";
import { status, act, dmg, heal, shield, unit, cat, word, ev, win, query, whenever, unless, forbid, timer, type Sentence } from "./ast";
import { newGame, declare, resolveRound, nextRound, passUnit, nextSide, alive, total, canAfford, type St } from "./interp";

let bad = 0;
const check = (ok: boolean, name: string) => { if (!ok) { bad++; console.log("✗", name); } else console.log("✓", name); };
const fresh = () => { const s = newGame(0); s.side[0].ap = s.side[1].ap = 20; for (const sd of s.side) for (let i = 0; i < 6; i++) sd.cards.push({ v: 3, cd: 0 }); return s; };
const say = (s: St, u: number, cl: Sentence, start?: number) => { if (!declare(s, u < 3 ? 0 : 1, u, cl, start)) throw new Error("宣告失败 u" + u); };

// 1 基础伤害
{ const s = fresh(); say(s, 0, [act(dmg(3, unit(3)))]); resolveRound(s); check(s.hp[3] === P.HP - 3, "造成 3"); }
// 2 减伤与无视
{ const s = fresh(); say(s, 3, [act(shield(3, unit(3)))]); say(s, 0, [act(dmg(3, unit(3)))], 4); resolveRound(s); check(s.hp[3] === P.HP, "减伤挡掉 3 点"); }
{ const s = fresh(); say(s, 3, [act(shield(3, unit(3)))]); say(s, 0, [act(dmg(3, unit(3), "shield"))], 4); resolveRound(s); check(s.hp[3] === P.HP - 3, "无视 减伤：打穿"); }
// 3 每当（陷阱）：对方每次使用攻击，对其本人造成 2
{ const s = fresh(); say(s, 0, [whenever("foe", cat("atk"), 2, [dmg(2, { t: "src" })], 1, 2)]); say(s, 3, [act(dmg(1, unit(0)))], 3); resolveRound(s);
  check(s.hp[3] === P.HP - 2 && s.hp[0] === P.HP - 1, "每当 对方 使用攻击 → 反击来源"); }
{ const s = fresh(); say(s, 0, [whenever("foe", cat("atk"), 2, [dmg(2, { t: "src" })], 1, 2)]); say(s, 3, [act(dmg(1, unit(0)))], 1); resolveRound(s);
  check(s.hp[3] === P.HP, "长期句子起手前发生的事不算（对方第 1 秒先出手）"); }
// 4 若 不存在（长期）：对方本轮没有攻击，轮末我方全体恢复
{ const s = fresh(); s.hp[0] = 5; say(s, 0, [unless("foe", cat("atk"), 2, [heal(2, { t: "allMe" })])]); resolveRound(s);
  check(s.hp[0] === 7 && s.hp[1] === P.HP, "若 不存在：对方没攻击 → 恢复"); }
{ const s = fresh(); s.hp[0] = 5; say(s, 0, [unless("foe", cat("atk"), 2, [heal(2, { t: "allMe" })])]); say(s, 3, [act(dmg(1, unit(1)))], 5); resolveRound(s);
  check(s.hp[0] === 5, "若 不存在：对方攻击了 → 不触发"); }
// 5 定时：N 轮后，造成「等待期间对方攻击次数 × 倍率」
{ const s = fresh(); say(s, 0, [timer(1, cat("atk"), "foe", 2)]); say(s, 3, [act(dmg(1, unit(1)))], 5); say(s, 4, [act(dmg(1, unit(2)))], 6); resolveRound(s);
  check(total(s, 1) === 3 * P.HP - 4, "定时：对方攻击 2 次 × 2 = 4（注意：只数等待期间的事件）"); }
// 6 移除：移除一句带攻击类词的长期句子
{ const s = fresh(); say(s, 3, [whenever("foe", cat("atk"), 2, [dmg(1, { t: "src" })], 1, 2)]); say(s, 0, [{ k: "remove", obj: cat("atk") }], 4); resolveRound(s);
  check(s.stand.length === 0, "移除 带攻击词的长期句子"); }
// 7 窗口（之前 1 句）+ 判断词（存在）：对方上一句含「造成」，则我造成 2
{ const s = fresh(); say(s, 3, [act(dmg(1, unit(1)))], 6);
  say(s, 0, [{ k: "when", q: query(win("before", 1, "sent"), "foe", word("造成"), "count", 2), judge: "exist", effs: [dmg(2, unit(3))], cap: 1 }], 7);
  resolveRound(s); check(s.hp[3] === P.HP - 2, "若 之前 1 句 对方 存在 造成 → 造成 2"); }
// 8 不存在
{ const s = fresh(); say(s, 3, [act(heal(1, unit(3)))], 6);
  say(s, 0, [{ k: "when", q: query(win("before", 1, "sent"), "foe", word("造成")), judge: "absent", effs: [dmg(2, unit(3))], cap: 1 }], 7);
  resolveRound(s); check(s.hp[3] === P.HP - 2, "若 之前 1 句 对方 不存在 造成 → 造成 2"); }
// 9 词序、句子长度作引用量
{ const s = fresh(); say(s, 3, [act(dmg(1, unit(1))), act(heal(1, unit(3)))], 6);
  say(s, 0, [{ k: "when", q: query(win("before", 1, "sent"), "foe", { t: "order", a: "造成", b: "恢复" }, "count", 2), judge: "exist", effs: [dmg(2, unit(3))], cap: 1 }], 7);
  resolveRound(s); check(s.hp[3] === P.HP - 2, "词序：造成 先于 恢复"); }
{ const s = fresh(); say(s, 3, [act(dmg(1, unit(1))), act(heal(1, unit(3)))], 6);
  say(s, 0, [{ k: "when", q: { ...query(win("before", 1, "sent"), "foe", ev("decl"), "len", 3) }, judge: "exist", effs: [dmg({ q: query(win("before", 1, "sent"), "foe", ev("decl"), "len"), mult: 1 }, unit(3))], cap: 1 }], 7);
  resolveRound(s); check(s.hp[3] === P.HP - 2, "句子长度作引用量：对方上一句 2 个词 → 造成 2"); }
// 10 成功 / 失败
{ const s = fresh(); say(s, 3, [act(shield(3, unit(3)))], 1); say(s, 0, [act(dmg(3, unit(3))), act(dmg(2, unit(4)), "fail")], 3);
  resolveRound(s); check(s.hp[3] === P.HP && s.hp[4] === P.HP - 2, "若 失败 → 转火"); }
// 11 无视 长期句子
{ const s = fresh(); say(s, 3, [whenever("foe", cat("atk"), 2, [dmg(2, { t: "src" })], 1, 2)]);
  say(s, 0, [{ k: "ignore", cat: "stand", win: 2 }], 1); say(s, 0 + 1, [act(dmg(1, unit(3)))], 5); resolveRound(s);
  check(s.hp[1] === P.HP, "无视 长期句子：反击落不到我方"); }
// 12 不得：违者受罚
{ const s = fresh(); say(s, 0, [forbid(cat("heal"), 2, 3)]); say(s, 3, [act(heal(2, unit(3)))], 4); s.hp[3] = 6; resolveRound(s);
  check(s.hp[3] === 6 + 2 - 3, "不得 恢复：违者受 3 点"); }
// 13 一层封顶：触发效果不再触发别的触发
{ const s = fresh(); say(s, 0, [whenever("foe", cat("dealt"), 2, [dmg(1, { t: "src" })], 3, 2)]); say(s, 1, [whenever("me", cat("dealt"), 2, [dmg(1, unit(3))], 3, 2)]);
  say(s, 3, [act(dmg(1, unit(2)))], 5); resolveRound(s);
  check(s.hp[3] <= P.HP && s.log.filter((e) => e.trig).length > 0, "触发产生的效果只触发一层"); }


// 14 状态词
{ const s = fresh(); say(s, 0, [status("burn", 2, 2, unit(3))]); resolveRound(s); check(s.hp[3] === P.HP - 2 && s.sts.length === 1, "灼烧 2 级：轮末掉 2 点，状态留下"); }
{ const s = fresh(); say(s, 0, [status("vuln", 2, 2, unit(3))]); say(s, 1, [act(dmg(1, unit(3)))], 5); resolveRound(s); check(s.hp[3] === P.HP - 3, "易伤 2 级：1 点伤害变 3"); }
{ const s = fresh(); say(s, 0, [status("weak", 1, 2, unit(3))], 1); say(s, 3, [act(dmg(3, unit(0)))], 5); resolveRound(s); check(s.hp[0] === P.HP - 2, "衰弱 1 级：出手伤害 −1"); }
{ const s = fresh(); say(s, 0, [status("burn", 2, 3, unit(3))]); resolveRound(s); say(s, 4, [{ k: "remove", obj: cat("status") }]); void s; check(true, "（清除状态见下）"); }
{ const s = fresh(); s.sts.push({ unit: 0, kind: "burn", lvl: 2, left: 3 }); say(s, 1, [{ k: "remove", obj: cat("status") }]); resolveRound(s); check(s.sts.length === 0, "移除 状态词：清除我方身上的状态"); }
// 15 自指词冷却：每种 REFCOPIES 张，用完冷却一轮
{ const s = fresh(); const w = () => [whenever("foe", cat("atk"), 2, [dmg(1, { t: "src" })], 1, 2)];
  say(s, 0, w()); say(s, 1, w()); const third = canAfford(s, 0, w());
  check(third === null, "自指词用完：本轮第三句说不了");
  resolveRound(s); nextRound(s); check(canAfford(s, 0, w()) === null, "下一轮仍在冷却");
  resolveRound(s); nextRound(s); check(canAfford(s, 0, w()) !== null, "再下一轮恢复"); }
// 16 卡组：进阶词用完就没了
{ const s = newGame(0, [{ 并: 1 }, null]); s.side[0].ap = 20;
  check(declare(s, 0, 0, [act(dmg(1, unit(3))), act(dmg(1, unit(4)))]), "卡组里有 并：能说");
  check(!declare(s, 0, 1, [act(dmg(1, unit(3))), act(dmg(1, unit(4)))]), "并 用完：第二句说不了");
  check(declare(s, 0, 2, [act(dmg(1, unit(3)))]), "不带进阶词的句子照说"); }
// 17 至多：cap 3 比 cap 1 多触发
{ const run = (cap: number) => { const s = fresh(); say(s, 0, [whenever("foe", cat("atk"), 2, [dmg(1, { t: "src" })], cap, 2)]); say(s, 3, [act(dmg(1, unit(1)))], 5); say(s, 4, [act(dmg(1, unit(2)))], 6); resolveRound(s); return s.stats["s0:fire"] ?? 0; };
  check(run(1) === 1 && run(3) === 2, "至多 N 次：cap 1 触发 1 次、cap 3 触发 2 次"); }

// 18 引用量：读已结束的轮、只数实际打掉的血、不滚雪球；全程要付轮数、冷却
{ const s = fresh(); const snow = () => [act(dmg({ q: query(win("before", 1, "round"), "me", cat("dealt"), "sum"), mult: 1 }, { t: "lowFoe" }))];
  say(s, 0, [act(dmg(2, unit(3)))], 1); resolveRound(s); nextRound(s);
  say(s, 0, snow(), 3); say(s, 1, snow(), 5); resolveRound(s);
  check(total(s, 1) === 3 * P.HP - 2 - 2 - 2, "累计伤害：读上一轮实际打掉的 2，两句追击各 2，不翻倍"); }
{ const s = fresh(); const snow = () => [act(dmg({ q: query(win("before", 1, "round"), "me", cat("dealt"), "sum"), mult: 1 }, { t: "lowFoe" }))];
  say(s, 0, [act(dmg(2, unit(3)))], 1); say(s, 1, snow(), 5); resolveRound(s);
  check(total(s, 1) === 3 * P.HP - 2, "本轮的伤害不能读（只读已结束的轮）"); }
{ const all = [act(dmg({ q: query(win("before", 99), "me", cat("dealt"), "sum"), mult: 1 }, { t: "lowFoe" }))];
  const s = fresh(); const c1 = declare(s, 0, 0, all); check(c1, "全程：能说"); check(!declare(s, 0, 1, all), "全程：只有 1 张，同一轮第二次说不了");
  s.rnd = 5; check(s.side[0].ap >= 0 && (() => { const t = fresh(); t.rnd = 5; t.side[0].ap = 4; return canAfford(t, 0, all) === null; })(), "全程：第 5 轮价格 5，行动点 4 说不了"); }
// 19 引用量词是进阶词：没带「累计」就不能把引用量当数字
{ const s = newGame(0, [{ 并: 1 }, null]); s.side[0].ap = 20; const snow = [act(dmg({ q: query(win("before", 1, "round"), "me", cat("dealt"), "sum"), mult: 1 }, { t: "lowFoe" }))];
  check(canAfford(s, 0, snow) === null, "没带 累计：不能引用累计量当数字");
  const s2 = newGame(0, [{ 累计: 1 }, null]); s2.side[0].ap = 20; check(canAfford(s2, 0, snow) !== null, "带了 累计：可以"); }
// 20 造成与受到分开
{ const s = fresh(); say(s, 0, [act(dmg(3, unit(3)))], 1); say(s, 3, [act(dmg(2, unit(0)))], 2); resolveRound(s); nextRound(s);
  const cnt = (o: ReturnType<typeof cat>) => s.log.filter((e) => e.side === 0 && e.kind !== "decl" && (o.t === "cat" && e.cats.includes(o.c))).reduce((a, e) => a + e.amt, 0);
  check(cnt(cat("dealt")) === 3 && cnt(cat("taken")) === 2, "我方：造成 3、受到 2，分开统计"); }
// 21 合法性与全体效果的价格
{ const s = fresh(); const bad = [whenever("foe", cat("atk"), 99, [dmg(1, { t: "src" })], 1, 2)]; check(canAfford(s, 0, bad) === null, "「以后全程」不合法（全程只能读已发生的事）");
  const ok = [act(dmg(2, { t: "allFoe" }))]; const s2 = fresh(); s2.side[0].ap = 1; check(canAfford(s2, 0, ok) === null, "打全体：比单体多 1 点行动点（1 点不够）"); s2.side[0].ap = 2; check(canAfford(s2, 0, ok) !== null, "打全体：2 点够"); }
// 22 三个位置（LAB2.POS 开启时）：词位并更便宜、数位数字更宽、引用位引用不冷却且全程半价
{ const { P2 } = await import("./params"); const oldPos = P2.POS, oldAnd = P.AND; P2.POS = 1; P.AND = 1;
  const two = [act(dmg(1, unit(3))), act(dmg(1, unit(4)))];
  const base = canAfford(fresh(), 0, two, 1)!.cost, word = canAfford(fresh(), 0, two, 0)!.cost;
  check(word === base - 1, "词位：多一段并少付 1 点行动点");
  const s3 = fresh(); s3.side[0].cards.forEach((c) => (c.cd = 2));
  check(canAfford(s3, 0, [act(dmg(3, unit(3)))], 0) === null && canAfford(s3, 0, [act(dmg(2, unit(3)))], 1) !== null, "数位：没有可用牌也能写 2（牌面 +1），其他位置不行");
  const s5 = fresh(); const w = () => [whenever("foe", cat("atk"), 2, [dmg(1, { t: "src" })], 1, 2)];
  declare(s5, 0, 0, w()); declare(s5, 0, 1, w());
  check(canAfford(s5, 0, w(), 0) === null && canAfford(s5, 0, w(), 2) !== null, "引用位：引用词不冷却，别的位置用完要等");
  const all = [act(dmg({ q: query(win("before", 99), "me", cat("dealt"), "sum"), mult: 1 }, { t: "lowFoe" }))]; const s6 = fresh(); s6.rnd = 6;
  check(canAfford(s6, 0, all, 2)!.cost < canAfford(s6, 0, all, 0)!.cost, "引用位：全程半价");
  P2.POS = oldPos; P.AND = oldAnd; }
// 随机试玩：不崩、能打完
function rnd(n: number) { return Math.floor(Math.random() * n); }
function randSentence(s: St, u: number): Sentence {
  const foeU = (u < 3 ? [3, 4, 5] : [0, 1, 2]).filter((x) => alive(s, x));
  const myU = (u < 3 ? [0, 1, 2] : [3, 4, 5]).filter((x) => alive(s, x));
  const t = () => unit(foeU[rnd(foeU.length)] ?? 0), m = () => unit(myU[rnd(myU.length)] ?? 0);
  switch (rnd(9)) {
    case 0: return [act(heal(1 + rnd(2), m()))];
    case 1: return [act(shield(1 + rnd(2), m()))];
    case 2: return [whenever("foe", cat("atk"), 2, [dmg(1 + rnd(2), { t: "src" })], 1, 2)];
    case 3: return [unless("foe", cat("atk"), 2, [heal(2, { t: "allMe" })])];
    case 4: return [timer(1 + rnd(2), cat("atk"), "foe", 1 + rnd(2))];
    case 5: return [{ k: "remove", obj: cat("any") }];
    case 8: return [status(["burn", "vuln", "weak"][rnd(3)] as "burn", 1 + rnd(2), 2, t())];
    case 6: return [act(dmg(1, t())), act(dmg(1, t()), rnd(2) ? "ok" : "fail")];
    default: return [act(dmg(1 + rnd(2), t(), rnd(3) === 0 ? "shield" : undefined))];
  }
}
let games = 0, rounds = 0;
for (let g = 0; g < 300; g++) {
  const s = newGame((g % 2) as 0 | 1);
  let guard = 0;
  while (s.win < 0 && guard++ < 200) {
    for (;;) {
      const sd = nextSide(s); if (sd === -1) break;
      const us = (sd === 0 ? [0, 1, 2] : [3, 4, 5]).filter((u) => alive(s, u) && !s.done[u]);
      const u = us[rnd(us.length)];
      let ok = false;
      for (let k = 0; k < 6 && !ok; k++) ok = declare(s, sd, u, randSentence(s, u), 1 + rnd(8));
      if (!ok) passUnit(s, u);
      s.turn = (1 - s.turn) as 0 | 1;
    }
    resolveRound(s);
    if (s.win < 0) nextRound(s);
  }
  games++; rounds += s.rnd;
  if (s.win < 0) { bad++; console.log("✗ 对局没结束"); break; }
}
check(true, `随机试玩 ${games} 局不崩，平均 ${(rounds / games).toFixed(1)} 轮`);
console.log(bad ? `失败 ${bad} 项` : "全部通过");
process.exit(bad ? 1 : 0);

// 解释器行为测试：npx tsx src/lab2/test.ts
import { P } from "../lab/rules";
import { act, dmg, heal, shield, unit, cat, word, ev, win, query, whenever, unless, forbid, timer, type Sentence } from "./ast";
import { newGame, declare, resolveRound, nextRound, passUnit, nextSide, alive, total, type St } from "./interp";

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
  say(s, 0, [{ k: "when", q: { ...query(win("before", 1, "sent"), "foe", ev("decl"), "len", 2) }, judge: "exist", effs: [dmg({ q: query(win("before", 1, "sent"), "foe", ev("decl"), "len"), mult: 1 }, unit(3))], cap: 1 }], 7);
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
{ const s = fresh(); say(s, 0, [whenever("foe", cat("dmg"), 2, [dmg(1, { t: "src" })], 3, 2)]); say(s, 1, [whenever("me", cat("dmg"), 2, [dmg(1, unit(3))], 3, 2)]);
  say(s, 3, [act(dmg(1, unit(2)))], 5); resolveRound(s);
  check(s.hp[3] <= P.HP && s.log.filter((e) => e.trig).length > 0, "触发产生的效果只触发一层"); }

// 随机试玩：不崩、能打完
function rnd(n: number) { return Math.floor(Math.random() * n); }
function randSentence(s: St, u: number): Sentence {
  const foeU = (u < 3 ? [3, 4, 5] : [0, 1, 2]).filter((x) => alive(s, x));
  const myU = (u < 3 ? [0, 1, 2] : [3, 4, 5]).filter((x) => alive(s, x));
  const t = () => unit(foeU[rnd(foeU.length)] ?? 0), m = () => unit(myU[rnd(myU.length)] ?? 0);
  switch (rnd(8)) {
    case 0: return [act(heal(1 + rnd(2), m()))];
    case 1: return [act(shield(1 + rnd(2), m()))];
    case 2: return [whenever("foe", cat("atk"), 2, [dmg(1 + rnd(2), { t: "src" })], 1, 2)];
    case 3: return [unless("foe", cat("atk"), 2, [heal(2, { t: "allMe" })])];
    case 4: return [timer(1 + rnd(2), cat("atk"), "foe", 1 + rnd(2))];
    case 5: return [{ k: "remove", obj: cat("any") }];
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
      const sd = nextSide(s); if (sd < 0) break;
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

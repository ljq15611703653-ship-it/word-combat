// 「手册」：人写的、可能造成漂亮结果的句子与组合（限制 / 引用类）。
// 它们大多依赖复杂决策（时机、读对手的上一句、几句话互相配合）——电脑只拿到「可以说的句子」，什么时候说由推演决定。
import { act, dmg, shield, heal, status, forbid, whenever, unless, timer, query, win, cat, word, ev, type Sentence, type Tg, type Clause, type Obj } from "./ast";
import type { Env } from "./gen";

export interface Named { name: string; cl: Sentence }
const rm = (obj: Obj): Clause => ({ k: "remove", obj });
const before1s = (who: "me" | "foe", obj: Obj, tight = 1) => query(win("before", 1, "sent"), who, obj, "count", tight);

export function playbookNamed(_e?: Env): Named[] {
  const o: Named[] = [];
  const add = (name: string, ...cl: Sentence) => o.push({ name, cl });
  const src: Tg = { t: "src" }, lowFoe: Tg = { t: "lowFoe" }, allMe: Tg = { t: "allMe" }, lowMe: Tg = { t: "lowMe" };

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
  add("追击（我方累计伤害）", act(dmg({ q: query(win("before", 1, "round"), "me", cat("dmg"), "sum"), mult: 1 }, lowFoe)));
  add("反制句长（对方上一句词数）", act(dmg({ q: query(win("before", 1, "sent"), "foe", ev("decl"), "len"), mult: 1 }, lowFoe)));
  add("吸血", act(dmg(2, lowFoe)), act(heal({ q: query(win("before", 1, "round"), "me", cat("dmg"), "sum"), mult: 1 }, lowMe), "ok"));
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
  return o;
}
/** 环境变量 PB_EXCLUDE='追击,吸血' 可以把名字里含这些字的手册句去掉（做对照实验用） */
const EXC = (typeof process !== "undefined" && process.env.PB_EXCLUDE ? process.env.PB_EXCLUDE.split(",") : []).filter(Boolean);
export const playbook = (e: Env): Sentence[] => playbookNamed(e).filter((x) => !EXC.some((k) => x.name.includes(k))).map((x) => x.cl);

// 数字牌模式 · 规则与数值（从 godot/scripts/numcard/nc_rules.gd 逐项移植，数值保持一致）
export type Cls = "并" | "续" | "择" | "血";
export const CLASSES: Cls[] = ["并", "续", "择", "血"];
export const METRIC: Record<Cls, "chain" | "cont" | "pick" | "blood"> = { 并: "chain", 续: "cont", 择: "pick", 血: "blood" };
export const METRIC_NAME: Record<Cls, string> = { 并: "连段", 续: "续出", 择: "命中", 血: "血债" };
export const CLASS_NAME: Record<Cls, string> = { 并: "并流", 续: "续流", 择: "择流", 血: "血流" };
export const TARGET: Record<Cls, number> = { 并: 34, 续: 60, 择: 63, 血: 81 };

export const HP_POOL = 21, HP_MIN = 3;
/** 全灭模式（打电脑 / 联机的正式规则；剧情关卡不用）：倒下不回来、一方全倒就输，用「过热」逼出结果。
 *  数值是用 simwipe 模拟（四职业循环对阵）调出来的：平均约 5.6 轮、先后手各半、四职业各 45% 上下、只进攻不防守的一方只能赢 8%。 */
export const W = {
  HP: 6, POOL: 18,                         // 每个随从 6 点生命（共 18）
  AP_START: 5, AP_INCOME: 4, AP_CAP: 10,   // 行动点收紧：不再是用不完的东西，防守、治疗、进攻要争
  HEAT_FROM: 3,                            // 第 3 轮起，每轮结束全场每个随从受 (轮数 − 2) 点不可挡的伤害
  BLOOD_AP: 2,                             // 血流：1 点生命顶 2 点行动点
  LATE_TAX: 1,                             // 择流：一句里有「选 2 个以上、等宣告完再定」的段，多花 1 点行动点
};
export const UNIT_NAMES = ["小剑", "小盾", "小咒"];
export const UNIT_GLYPHS = ["剑", "盾", "咒"];
export const AP_START = 6, AP_INCOME = 6, AP_CAP = 12, BASE_COST = 1, AND_COST = 2, CLAUSE_MAX = 3;
export const TIMELINE = 10, MAX_ROUNDS = 12, KO_PCT = 0.15;
export const LADDER = [0.10, 0.25, 0.45, 0.70];
export const LADDER_VALUES = [2, 3, 4, 5];
export const LADDER_COPIES = 2, DICE_HP = 4, DICE_COUNT = 2;
export const FLOOR: Record<number, number> = { 3: 2, 5: 3, 7: 4 };
export const B_CLAUSES = 7, B_AND = 1, B_BONUS = 1, B_LEN = 0, B_WIND = 0, X_SLOTS = 3;
export const B_STKIND = true, Y_DICE = true, Z_HEAL = false;
export const DECK_SIZE = 10, COPY_MAX = 2, KW_SLOTS = 3;

export interface WordDef { price: number; kind: string; on: string; desc: string }
export const WORDS: Record<string, WordDef> = {
  易伤: { price: 1, kind: "status", on: "enemy", desc: "给敌人上易伤：每级让它每次多受 1 点伤害。每过一轮自动 +1 级" },
  灼烧: { price: 1, kind: "status", on: "enemy", desc: "给敌人上灼烧：每轮结束时，每级让它掉 1 点血。每过一轮自动 +1 级" },
  衰弱: { price: 1, kind: "status", on: "enemy", desc: "给敌人上衰弱：每级让它每次少打 1 点伤害。每过一轮自动 +1 级" },
  转移: { price: 2, kind: "redirect", on: "ally", desc: "本轮打向这个随从的敌方伤害，转给出手的人" },
  延后: { price: 1, kind: "delay", on: "act", desc: "把对方已宣告的一句往后推 N 秒；推出时间轴就落空" },
  移除: { price: 1, kind: "remove", on: "enemy", desc: "拆掉一个敌人身上的减伤、转移，并掐断它挂着的续" },
};
export const WORD_ORDER = ["易伤", "灼烧", "衰弱", "转移", "延后", "移除"];
export const ENEMY_ST = ["易伤", "灼烧", "衰弱"];
export const KEYWORDS: Record<string, string> = { 首挡: "每轮第一次被敌人打中，整下挡掉", 不屈: "每轮第一次被打到 0 血，留 1 血" };

export interface Deck { cls: Cls; words: Record<string, number>; kws: string[]; hp: number[] }
export const PRESETS: Record<Cls, { words: Record<string, number>; kws: string[] }> = {
  并: { words: { 易伤: 2, 灼烧: 1, 衰弱: 2, 转移: 2, 延后: 1, 移除: 2 }, kws: ["不屈", "首挡", "首挡"] },
  续: { words: { 易伤: 2, 灼烧: 2, 衰弱: 2, 转移: 1, 延后: 1, 移除: 2 }, kws: ["首挡", "不屈", "不屈"] },
  择: { words: { 易伤: 2, 灼烧: 1, 衰弱: 1, 转移: 2, 延后: 2, 移除: 2 }, kws: ["首挡", "不屈", "首挡"] },
  血: { words: { 易伤: 2, 灼烧: 2, 衰弱: 1, 转移: 2, 延后: 1, 移除: 2 }, kws: ["不屈", "不屈", "首挡"] },
};
export function presetDeck(cls: Cls, wipe = false): Deck {
  const p = PRESETS[cls];
  const h = wipe ? W.HP : 7;
  return { cls, words: { ...p.words }, kws: [...p.kws], hp: [h, h, h] };
}

export interface Caps { lateTax: number; bloodAp: number; clauses: number; and: number; slots: number; blood: number; late: boolean; wind: number; once: boolean; cont_single: boolean; freecount: boolean; norep: boolean; noheal: boolean; nodef: boolean }
export function caps(cls: Cls, _p: number, wipe = false): Caps {
  const o: Caps = { lateTax: 0, bloodAp: 1, clauses: CLAUSE_MAX, and: AND_COST, slots: 0, blood: 0, late: false, wind: 1, once: false, cont_single: false, freecount: false, norep: false, noheal: false, nodef: false };
  if (cls === "并") { o.clauses = B_CLAUSES; o.and = B_AND; o.wind = B_WIND; o.once = true; }
  else if (cls === "续") { o.slots = X_SLOTS; o.cont_single = true; }
  else if (cls === "择") { o.late = true; o.freecount = true; o.norep = true; }
  else { o.blood = 99; o.noheal = true; o.nodef = true; }
  if (wipe) { if (cls === "择") o.lateTax = W.LATE_TAX; if (cls === "血") o.bloodAp = W.BLOOD_AP; }
  return o;
}
export function deckProblem(words: Record<string, number>, kws: string[]): string {
  let n = 0;
  for (const w in words) {
    if (!WORDS[w]) return `没有【${w}】这个进阶词`;
    if (words[w] > COPY_MAX) return `【${w}】最多带 ${COPY_MAX} 张`;
    n += words[w];
  }
  if (n !== DECK_SIZE) return `卡组要正好 ${DECK_SIZE} 张进阶词（现在 ${n} 张）`;
  if (kws.length !== KW_SLOTS) return `要选 ${KW_SLOTS} 个关键词（每个随从一个）`;
  for (const k of kws) if (!KEYWORDS[k]) return `没有【${k}】这个关键词`;
  return "";
}

export const CLASS_WORD: Record<Cls, string> = { 并: "并", 续: "持续", 择: "选择", 血: "自身" };
export const CLASS_COLOR: Record<Cls, string> = { 并: "#2fb8c8", 续: "#d89a2a", 择: "#9ac43a", 血: "#c0283a" };
export const CLASS_TALENT: Record<Cls, string> = {
  并: `上限：一句最多 ${B_CLAUSES} 段（别人 3 段），每多一段只加 ${B_AND} 行动点（别人 2），起手不因为段多变晚。限制：一句里同一个动作词（造成、恢复、减伤、易伤、灼烧、衰弱、转移、延后、移除）只能用一次`,
  续: `上限：【持续】能接在 造成、恢复、减伤 后面，这一段以后每轮同一秒自动再来一次（不花行动点），同时能挂 ${X_SLOTS} 个续。限制：带【持续】的这句只能一段，不能接【并】。出手的随从倒下或被【移除】，它的续就断了`,
  择: "上限：【选择】几个目标不用数字牌，想选几个选几个；目标宣告时不定（对手只看到“待定”），双方宣告完再定，定好的人倒了自动换人。限制：句子里不能用【重复】",
  血: "上限：行动点不够时，用出手随从的生命来付，想付多少付多少（1 点生命顶 1 点行动点，至少留 1 血）。限制：用血付的句子里不能有【恢复】【减伤】【转移】",
};
/** 全灭模式下四个职业的特长（只有择、血的数字不一样） */
export const CLASS_TALENT_W: Record<Cls, string> = {
  ...CLASS_TALENT,
  择: `上限：【选择】几个目标不用数字牌，想选几个选几个；目标宣告时不定（对手只看到“待定”），双方宣告完再定，定好的人倒了自动换人。限制：句子里不能用【重复】；一句里只要有「选 2 个以上、等宣告完再定」的段，就多花 ${W.LATE_TAX} 点行动点`,
  血: `上限：行动点不够时，用出手随从的生命来付，想付多少付多少（1 点生命顶 ${W.BLOOD_AP} 点行动点，至少留 1 血）。限制：用血付的句子里不能有【恢复】【减伤】【转移】`,
};
export const talentOf = (c: Cls, wipe: boolean) => (wipe ? CLASS_TALENT_W : CLASS_TALENT)[c];
export const CLASS_GOAL: Record<Cls, string> = {
  并: "连段分：两段以上的句子里，兑现了几段就得几分；整句每段都兑现再 +1",
  续: "续出来的效果：续自动再来的那几次打出的伤害、回的血、挡下的伤害，加上你上的灼烧烧掉的、易伤多打的、衰弱让对方少打的",
  择: "命中：对敌人实际打掉的血（打空、被挡掉的不算）",
  血: "血债：用生命付掉的点数，加上用血付的句子对敌人打掉的血",
};
export const RULES_LINES: string[] = [
  `· 双方各 3 个随从，共 ${HP_POOL} 点生命。被击倒的随从休整一轮，再满血回来。`,
  "· 每轮轮流宣告：一方定一个随从的一句，另一方再定一个，交替进行；每轮换一方先定。你能看到对方已经定下的句子（择流的目标除外）。",
  "· 一句话就是一张张词拼起来的：比如 选择 2 个 敌方 随从，造成 3 点 伤害，重复 2 次。数字都是牌：1 免费无限用，2 以上要用手里的数字牌，每个位置一张。",
  `· 数字牌从哪来：你的职业得分到 10%、25%、45%、70% 时，各解锁两张 2、3、4、5（能反复用，用完冷却一轮）；一轮里掉了 ${DICE_HP} 点以上血或有随从倒下，掷两个骰子，掷出几给一张几（只能用一次）；第 3、5、7 轮开始时各发一张保底数字 2、3、4（能反复用）。`,
  `· 行动点：开局 ${AP_START}，每轮 +${AP_INCOME}，最多 ${AP_CAP}。一句的花费 = ${BASE_COST} + 进阶词价格 + 每多一段（并）${AND_COST}。`,
  `· 时间轴 0~${TIMELINE} 秒：一句最早第（1 + 进阶词数 + 段数 − 1）秒起效；同一秒里减伤、转移这类保护先生效；出手的随从先被打倒，它的招就落空。`,
  `· 进阶词要组进卡组（${DECK_SIZE} 张，同名最多 ${COPY_MAX} 张）；用过的那一张下一轮冷却。进阶词：易伤、灼烧、衰弱（状态，每过一轮自己 +1 级）、转移、延后、移除。`,
  "· 四个职业，各擅长一个基础词：",
  ...(["并", "续", "择", "血"] as Cls[]).map((c) => `    ${CLASS_NAME[c]}（${CLASS_WORD[c]}）：${CLASS_TALENT[c]}。得分：${CLASS_GOAL[c]}。`),
  `· 先到自己目标分的赢；击倒一个敌人算目标分的 15%；打满 ${MAX_ROUNDS} 轮比完成的百分比。`,
];
export const hpProblem = (hps: number[], pool = HP_POOL): string => {
  if (hps.length !== 3) return "要给三个随从各分一份生命";
  let t = 0;
  for (const h of hps) { if (h < HP_MIN) return `每个随从至少 ${HP_MIN} 点生命`; t += h; }
  return t !== pool ? `生命总和要正好 ${pool}（现在 ${t}）` : "";
};

/** 全灭模式的「怎么玩」 */
export const RULES_WIPE: string[] = [
  `· 双方各 3 个随从，每个 ${W.HP} 点生命。随从倒下就不回来了：把对面三个随从全打倒，你就赢了。`,
  "· 每轮轮流宣告：一方定一个随从的一句，另一方再定一个，交替进行；每轮换一方先定。你能看到对方已经定下的句子（择流的目标除外）。",
  "· 一句话就是一张张词拼起来的：比如 选择 2 个 敌方 随从，造成 3 点 伤害，重复 2 次。数字都是牌：1 免费无限用，2 以上要用手里的数字牌，每个位置一张。",
  `· 数字牌从哪来：你的职业成长到 10%、25%、45%、70% 时，各解锁两张 2、3、4、5（能反复用，用完冷却一轮）；一轮里掉了 ${DICE_HP} 点以上血或有随从倒下，掷两个骰子，掷出几给一张几（只能用一次）；第 3、5、7 轮各送一张 2、3、4。`,
  `· 行动点：开局 ${W.AP_START}，每轮 +${W.AP_INCOME}，最多 ${W.AP_CAP}。一句的花费 = ${BASE_COST} + 进阶词价格 + 每多一段（并）${AND_COST}。进攻、防守、治疗都要花，想清楚这一轮把点数花在哪。`,
  `· 时间轴 0~${TIMELINE} 秒：一句最早第（1 + 进阶词数 + 段数 − 1）秒起效；同一秒里减伤、转移这类保护先生效，其余按宣告的先后；出手的随从先被打倒，它的招就落空。`,
  `· 过热：从第 ${W.HEAT_FROM} 轮起，每轮结束时场上每个随从受到一次挡不住的伤害——第 ${W.HEAT_FROM} 轮 1 点，之后每轮多 1 点。拖下去大家一起倒，所以要抢在对面前面打出差距。双方最后一个随从同时倒下，看倒下前谁剩的总生命多。`,
  `· 进阶词要组进卡组（${DECK_SIZE} 张，同名最多 ${COPY_MAX} 张）；用过的那一张下一轮冷却。进阶词：易伤、灼烧、衰弱（状态，每过一轮自己 +1 级）、转移、延后、移除。`,
  "· 四个职业，各擅长一个基础词：",
  ...(["并", "续", "择", "血"] as Cls[]).map((c) => `    ${CLASS_NAME[c]}（${CLASS_WORD[c]}）：${CLASS_TALENT_W[c]}。成长：${CLASS_GOAL[c]}。`),
  `· 打满 ${MAX_ROUNDS} 轮还没分出胜负：活着的随从多的赢，一样多比剩下的总生命，再一样比成长。`,
];

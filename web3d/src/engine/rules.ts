// 数字牌模式 · 规则与数值（从 godot/scripts/numcard/nc_rules.gd 逐项移植，数值保持一致）
export type Cls = "并" | "续" | "择" | "血";
export const CLASSES: Cls[] = ["并", "续", "择", "血"];
export const METRIC: Record<Cls, "chain" | "cont" | "pick" | "blood"> = { 并: "chain", 续: "cont", 择: "pick", 血: "blood" };
export const METRIC_NAME: Record<Cls, string> = { 并: "连段", 续: "续出", 择: "命中", 血: "血债" };
export const CLASS_NAME: Record<Cls, string> = { 并: "并流", 续: "续流", 择: "择流", 血: "血流" };
export const TARGET: Record<Cls, number> = { 并: 34, 续: 60, 择: 63, 血: 81 };

export const HP_POOL = 21, HP_MIN = 3;
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
export function presetDeck(cls: Cls): Deck {
  const p = PRESETS[cls];
  return { cls, words: { ...p.words }, kws: [...p.kws], hp: [7, 7, 7] };
}

export interface Caps { clauses: number; and: number; slots: number; blood: number; late: boolean; wind: number; once: boolean; cont_single: boolean; freecount: boolean; norep: boolean; noheal: boolean; nodef: boolean }
export function caps(cls: Cls, _p: number): Caps {
  const o: Caps = { clauses: CLAUSE_MAX, and: AND_COST, slots: 0, blood: 0, late: false, wind: 1, once: false, cont_single: false, freecount: false, norep: false, noheal: false, nodef: false };
  if (cls === "并") { o.clauses = B_CLAUSES; o.and = B_AND; o.wind = B_WIND; o.once = true; }
  else if (cls === "续") { o.slots = X_SLOTS; o.cont_single = true; }
  else if (cls === "择") { o.late = true; o.freecount = true; o.norep = true; }
  else { o.blood = 99; o.noheal = true; o.nodef = true; }
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

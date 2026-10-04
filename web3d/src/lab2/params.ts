import { P } from "../lab/rules";
// lab2 的额外参数（lab/rules.ts 的 P 继续用于血量、行动点、过热、数字牌）。环境变量 LAB2='{"BUDGET":18}' 可覆盖
export const P2 = {
  BUDGET: 18,                 // 卡组预算
  REFCOPIES: 2,               // 每种自指词每方有几张（用完冷却一轮，和数字牌同一套）
  REFAP: 0,                   // 每张自指词额外花几点行动点
  STATUS_AP: 1,               // 状态词（灼烧/易伤/衰弱）这句的行动点
  THR_SUM: 3, THR_LEN: 3, THR_SEGS: 1,   // 累计量/词数/段数的触发基线（收紧每 +1 降低 1）
  CHAINAP: 0,                 // 连环（若成功/失败）每多一段额外行动点（不占「并」词的张数）
  POS: 0,                     // 三个位置：0 关，1 开（词位 0 / 数位 1 / 引用位 2，按随从序号 %3）
  POS_WORD: 1,                // 词位：每多一段（并/连环）少付的行动点
  POS3: "ref" as "ref" | "speed",   // 第三位置：ref 引用位 / speed 速位
  POS_NUM_ONE: 0,             // 数位的牌面加成只作用于句子里最大的一个数字（1 = 是）
  POS_WORD_FREE: 0,           // 词位：每句第一个「并」不占卡组张数（1 = 是）
  FIZZLE: 0,                  // 出手的随从在这句生效前倒下，这句落空（真实游戏里的规则；1 = 开）
  QWIND: 0,                   // 引用量算出的数字计入起手时间（越大的数越晚；1 = 开）
  QCAP: 99,                   // 引用量算出来的数字上限（累计×倍率等最多是多少）
  POS_SPEED: 2,               // 速位：起手最早时间提前几秒
  POS_NUM: 1,                 // 数位：用牌时牌面 +N（所以数字 ≤N+1 免费）
  AOE: 1,                     // 打/治/护「全体」的额外行动点
  STATUS_MAX: 3,              // 状态级别上限
  // ---- 与真实引擎（web3d/src/engine）对齐的规则，默认全关（旧实验不变）；REAL 配置一键全开，见 realprofile.ts
  REDIR: 0,                   // 转移：本轮打向该随从的敌方伤害，改打在出手的人自己身上（AP 价 AP_REDIR）
  POSTPONE: 0,                // 延后：把对方本轮已宣告的一句往后推 N 秒，推出时间轴就落空（AP 价 AP_POST）
  KW: 0,                      // 关键词：每个随从 1 个（首挡 / 不屈），需要 newGame 传入 kws
  STAUTO: 0,                  // 状态真实规则：每次施放 +1 级（句子里的级别数字不再用）、持续到「当前轮 + 持续数 − 1」、每过一轮自动 +1 级
  RMREAL: 0,                  // 移除真实规则：拆掉一个敌人身上的减伤、转移，掐断它挂着的长期句子（旧的「删对方一句长期句」不再合法）
  REP: 0,                     // 重复：造成/恢复可以写「重复 M」，打 M 次每次 N，数字占牌
  ORDER: 0,                   // 同一秒真实顺序：纯防御句（减伤/转移/恢复）先、其余按宣告先后，一句话整句一起生效
  KOCHECK: 0,                 // 倒下在「每一秒结束」才判定（同一秒里被打到 0 血的随从还能出手；不屈在这里生效；过热、灼烧之后再判一次）
  COSTREAL: 0,                // 行动点按真实算：整句 BASE + 各进阶词价格 + 每多一段 AND，造成/恢复/减伤本身不再各收费
  STRICT_TG: 0,               // 指定的随从在这句生效前已倒下：这一段落空（真实）；0 = 改打最低血量的（旧行为）
  TGT_AT_DECL: 0,             // 目标在宣告时就定下来：lowFoe/lowMe/全体/选择N个 在 declare 时解析成具体随从（真实：玩家点选目标）；生效时该随从已倒下 → 这一段落空
  MITHIT: 0,                  // 减伤按真实算：本轮每一次受击都少 N 点（可叠加），不是一次性的挡伤池
  AP_REDIR: 2,                // 转移的行动点（真实 2）
  AP_POST: 1,                 // 延后的行动点（真实 1）
  WIND_WORD: 0,               // 起手：每个「词类段」（状态/转移/延后/移除）晚 1 秒（真实：1 + 词数 + 段数 − 1）
};
if (typeof process !== "undefined" && process.env.LAB2) Object.assign(P2, JSON.parse(process.env.LAB2));

/** 进阶词：价格 / 每副卡组最多几张 */
export const ADV: Record<string, { price: number; max: number }> = {
  并: { price: 2, max: 3 }, 减伤: { price: 2, max: 3 }, 定时: { price: 3, max: 2 }, 移除: { price: 3, max: 2 },
  兑现: { price: 2, max: 1 }, 无视: { price: 3, max: 2 }, 不得: { price: 3, max: 2 }, 收紧: { price: 2, max: 3 },
  至多: { price: 2, max: 2 }, 先后: { price: 3, max: 1 }, 灼烧: { price: 2, max: 2 }, 易伤: { price: 2, max: 2 }, 衰弱: { price: 2, max: 2 },
  // 引用量词：把引用到的量放进数字位置（追击、吸血、攒爆…）。正常写数字不收费
  累计: { price: 3, max: 2 }, 次数: { price: 3, max: 2 }, 词数: { price: 2, max: 2 }, 段数: { price: 2, max: 1 },
  // 真实引擎的两个进阶词（临时载荷面积，之后可调）：只有对应开关打开才进随机卡组 / 词表
  转移: { price: 3, max: 2 }, 延后: { price: 2, max: 2 },
};
/** 开关没开时不进词表的词 */
const GATED: Record<string, "REDIR" | "POSTPONE"> = { 转移: "REDIR", 延后: "POSTPONE" };
// 环境变量 LAB2 里的 ADVO 可以改某个词的价格/张数，例如 {"ADVO":{"累计":{"price":8,"max":1}}}
const ADVO = (P2 as unknown as { ADVO?: Record<string, { price?: number; max?: number }> }).ADVO;
if (ADVO) for (const [w, o] of Object.entries(ADVO)) ADV[w] = { ...ADV[w], ...o };
export const ADV_WORDS: string[] = [];
/** 按当前开关重算词表（原地改，别的模块拿到的引用依然有效） */
export function refreshAdvWords() { ADV_WORDS.length = 0; for (const w of Object.keys(ADV)) if (!GATED[w] || P2[GATED[w]]) ADV_WORDS.push(w); }
refreshAdvWords();
// ---- 运行中切换参数（自动调参用）：先恢复默认（含环境变量里的覆盖），再套上 rules ----
const D_P = JSON.parse(JSON.stringify(P)), D_P2 = { ...P2 }, D_ADV = JSON.parse(JSON.stringify(ADV));
export interface Rules { P?: Record<string, unknown>; P2?: Record<string, unknown>; ADV?: Record<string, { price?: number; max?: number }> }
export function applyRules(r: Rules = {}) {
  Object.assign(P, JSON.parse(JSON.stringify(D_P))); Object.assign(P2, D_P2);
  for (const w of Object.keys(D_ADV)) ADV[w] = { ...D_ADV[w] };
  if (r.P) Object.assign(P, JSON.parse(JSON.stringify(r.P)));
  if (r.P2) Object.assign(P2, r.P2);
  if (r.ADV) for (const [w, o] of Object.entries(r.ADV)) ADV[w] = { ...ADV[w], ...o };
  refreshAdvWords();
}
export type Deck = Record<string, number>;
export const deckCost = (d: Deck) => Object.entries(d).reduce((a, [w, n]) => a + (ADV[w]?.price ?? 0) * n, 0);
export const deckOk = (d: Deck) => deckCost(d) <= P2.BUDGET && Object.entries(d).every(([w, n]) => n >= 0 && n <= (ADV[w]?.max ?? 0));

// lab2 的额外参数（lab/rules.ts 的 P 继续用于血量、行动点、过热、数字牌）。环境变量 LAB2='{"BUDGET":18}' 可覆盖
export const P2 = {
  BUDGET: 18,                 // 卡组预算
  REFCOPIES: 2,               // 每种自指词每方有几张（用完冷却一轮，和数字牌同一套）
  REFAP: 0,                   // 每张自指词额外花几点行动点
  STATUS_AP: 1,               // 状态词（灼烧/易伤/衰弱）这句的行动点
  THR_SUM: 3, THR_LEN: 3, THR_SEGS: 1,   // 累计量/词数/段数的触发基线（收紧每 +1 降低 1）
  CHAINAP: 0,                 // 连环（若成功/失败）每多一段额外行动点（不占「并」词的张数）
  AOE: 1,                     // 打/治/护「全体」的额外行动点
  STATUS_MAX: 3,              // 状态级别上限
};
if (typeof process !== "undefined" && process.env.LAB2) Object.assign(P2, JSON.parse(process.env.LAB2));

/** 进阶词：价格 / 每副卡组最多几张 */
export const ADV: Record<string, { price: number; max: number }> = {
  并: { price: 2, max: 3 }, 减伤: { price: 2, max: 3 }, 定时: { price: 3, max: 2 }, 移除: { price: 3, max: 2 },
  兑现: { price: 2, max: 1 }, 无视: { price: 3, max: 2 }, 不得: { price: 3, max: 2 }, 收紧: { price: 2, max: 3 },
  至多: { price: 2, max: 2 }, 先后: { price: 3, max: 1 }, 灼烧: { price: 2, max: 2 }, 易伤: { price: 2, max: 2 }, 衰弱: { price: 2, max: 2 },
  // 引用量词：把引用到的量放进数字位置（追击、吸血、攒爆…）。正常写数字不收费
  累计: { price: 3, max: 2 }, 次数: { price: 3, max: 2 }, 词数: { price: 2, max: 2 }, 段数: { price: 2, max: 1 },
};
export const ADV_WORDS = Object.keys(ADV);
export type Deck = Record<string, number>;
export const deckCost = (d: Deck) => Object.entries(d).reduce((a, [w, n]) => a + (ADV[w]?.price ?? 0) * n, 0);
export const deckOk = (d: Deck) => deckCost(d) <= P2.BUDGET && Object.entries(d).every(([w, n]) => n >= 0 && n <= (ADV[w]?.max ?? 0));

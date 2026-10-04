// 句子规则原型的参数与类型（实验用，见 设计与审计/数字牌模式/句子规则原型.md）
// 默认值 = 前 8 轮迭代（自动搜参 + 爬山）得到的最优一组
export const P = {
  HP: 11, AP0: 5, APINC: 5, APCAP: 10, HEAT_FROM: 4, ROUNDS: 12,
  BASE: 1, HEALC: 2, SHC: 3, HEALPEN: 0, AND: 0, STAND: 1, ANYCLS: 1, REMOVE: 1, REMOVE_ANY: 4, CASH: 1, PIERCE: 1,
  SPEC: 99,   // 每方每局最多宣告几句「特殊句」（每当/若没有/定时/移除/兑现/无视）= 能带的进阶词数量
  THR0: 1, CLAUSE_MAX: 3,
  CARDS0: [2, 2, 3] as number[],
  SCHEDULE: { 3: [2], 5: [3], 7: [4] } as Record<number, number[]>,
  EXACT: false as boolean,   // 数字牌必须同面值；false = 牌面 ≥ 数字即可
  // ---- 时间轴：每轮 TL 秒，句子在「起手秒数」生效；起手秒数不能早于「起手时间」
  TL: 20, WIND_CL: 1, WIND_N: 1,
};
// 迭代时用环境变量覆盖：LAB='{"HP":8,"THR0":2}'
if (typeof process !== "undefined" && process.env.LAB) Object.assign(P, JSON.parse(process.env.LAB));
export type Cls = "atk" | "heal" | "def";
export type Who = "me" | "foe";
export type Ev = { t: "use"; cls: Cls | "any" } | { t: "down" } | { t: "hurt" };
export type Eff =
  | { t: "dmgSrc"; n: number }    // 对触发源造成伤害（只配「使用」事件）
  | { t: "healAll"; n: number }   // 我方全体恢复
  | { t: "shieldAll"; n: number } // 我方全体本轮减伤
  | { t: "dmgLow"; n: number };   // 对面最低血量的随从造成伤害
export type Clause =
  | { k: "dmg" | "heal" | "shield"; n: number; tg: number; ifPrev?: "ok" | "fail"; pierce?: boolean }
  | { k: "trig"; who: Who; ev: Ev; eff: Eff; win: number; cap: number; tight: number }
  | { k: "absent"; who: Who; cls: Cls; win: number; eff: Eff }
  | { k: "delay"; wait: number; mult: number; ref: "rounds" | "count"; cnt?: { who: Who; ev: Ev } }
  | { k: "immune"; win: number }   // 无视：这几轮里对面长期句子的效果对我方无效
  | { k: "cash" }
  | { k: "remove"; cls: Cls | "any" };
export interface Sentence { side: 0 | 1; unit: number; cl: Clause[]; ord: number; cost: number; nums: number[]; start: number }
export interface Standing { owner: 0 | 1; unit: number; c: Clause; left: number; fired: number; age: number; cnt: number; from: number; lcnt: Record<string, number> }
export interface Card { v: number; cd: number }
export interface SideState { ap: number; cards: Card[] }

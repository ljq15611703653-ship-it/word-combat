// 词战冒险：关卡数据的类型。一关 = 剧情 + 开局设置 + 对手脚本 + 每一轮的引导。
import type { Cls } from "../engine/rules";

export interface Line { who: string; text: string }

/** 强制跟做的一句：玩家只能按这个顺序点词，按钮会高亮并写出每一步为什么 */
export interface Guide {
  uid: number;
  tokens: (string | number)[];       // 词用字符串，数字用 number
  notes?: Record<number, string>;    // 第几张牌的说明（下标从 0 开始）
  targets?: number[][];              // 每一段要点的目标（引擎编号）；择流的待定段不用写
  act?: number;                      // 延后：要延后的那一句的宣告序号
  start: number;                     // 起手秒数
  why?: string;                      // 起手秒数为什么这么选
  late?: number[][];                 // 择流：每个待定段，宣告完以后要点的目标（按宣告顺序）
  targetNote?: string;
}

export interface RoundScript {
  say?: Line[];                      // 这一轮开始前的对话
  guides?: Guide[];                  // 这一轮强制跟做的句子（没写到的随从可以不出手）
  tip?: string;                      // 操作栏里的提示
  after?: Line[];                    // 结算完以后的对话（解释刚才发生了什么）
}

export interface UnitDef { name: string; hp: number; kw?: string; art: string; flip?: boolean }
export interface FoeAct { uid: number; cl: any[]; start: number }

export interface Level {
  id: number;
  chapter: string;
  title: string;
  goal: string;
  learn: string[];                   // 这关学会什么
  intro: Line[];
  outro: Line[];
  player: { cls: Cls; units: UnitDef[]; words: Record<string, number>; allow: string[]; give?: number[]; ap?: number };
  foe: { cls: Cls; units: UnitDef[]; words: Record<string, number>; give?: number[]; ap?: number; ai?: boolean; script?: (M: any, round: number) => FoeAct[] };
  first?: number;                    // 第 1 轮谁先宣告（0 = 你）
  maxRounds: number;
  rounds: Record<number, RoundScript>;
  freeTip?: string;                  // 没有专门引导的轮次的提示
  full?: boolean;                    // 完整规则（按完成度分胜负）
  seed?: number;                     // 固定随机种子，关卡可重复
  showClass?: boolean;               // 是否显示职业（前几关不提）
}

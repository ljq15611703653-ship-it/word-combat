// 《断·句》打电脑页的可替换模块接口
import type { Match, Candidate, Sentence, ReplayEvent } from "./engine/api";

/** 宣告输入方式。第 1 版 = 「可说的句子」菜单（inputMenu.ts）；第 2 版换成逐词拼句 composer2，只要实现这个接口 */
export interface InputCtx {
  match: Match;
  unit: number;
  /** 面板标题里显示的名字，如「回声（词位）」 */
  label?: string;
  /** 弹出面板应当贴着的元素（随从面板） */
  anchor: HTMLElement;
  /** 可以往里挂 DOM 的舞台容器 */
  host: HTMLElement;
  /** 确认宣告：句子 + 起手秒 */
  onDeclare(cl: Sentence, start: number): void;
  /** 这个随从本轮不出手 */
  onPass(): void;
  /** 关闭面板，什么都不做 */
  onCancel(): void;
}
export interface InputMode {
  id: string;
  label: string;
  open(ctx: InputCtx): void;
  close(): void;
  isOpen(): boolean;
}

/** 结算演出的画面接口：CastPlayer 只通过它改画面，不碰引擎 */
export interface BattleView {
  /** 随从的舞台元素（演出可以拿它的位置做飞行起点/终点） */
  unitEl(u: number): HTMLElement;
  stageEl: HTMLElement;
  /** 设置显示用的血量/护盾（和引擎状态分开，演出中逐步变化） */
  setDisplay(u: number, hp: number, sh: number): void;
  getDisplay(u: number): { hp: number; sh: number };
  float(u: number, text: string, cls: "hit" | "heal" | "shield" | "status" | "info"): void;
  flash(u: number, cls: "hit" | "heal" | "shield" | "cast"): void;
  markDown(u: number): void;
  banner(text: string, sub?: string): void;
  clock(sec: number | null): void;
  /** 动画速度倍率（>1 更快） */
  speed(): number;
}
/** 结算演出。别的助手会实现「词牌飞来飞去」的完整版；接口保持 play(events) */
export interface CastPlayer {
  play(events: ReplayEvent[], view: BattleView): Promise<void>;
  /** 立刻跳到结尾 */
  skip(): void;
}
export type { Match, Candidate, Sentence, ReplayEvent };

export interface Settings {
  styleId: string;
  deck: Record<string, number>;
  tier: string;
  first: "random" | "me" | "foe";
  rules: "default" | "legacy" | "real" | "custom";
  /** 每个随从的关键词：random / 首挡 / 不屈 */
  kws: string[];
  customRules: string;
  /** 对手卡组：random（每局 randDeck）/ preset（选一套推荐）/ custom（自定义 deck） */
  foe: { mode: "random" | "preset" | "custom"; preset: string; deck: Record<string, number> };
}

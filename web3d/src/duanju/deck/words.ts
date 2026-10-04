// 词表：价格（= 面积）、张数取自引擎当前生效的 ADV（随规则配置变）；说明/示例取自 data.ts。
import { ADV, ADV_WORDS, P2, deckCost, deckOk } from "../engine/api";
import { WORD_INFO, PRESETS } from "./data";
import { shapeFor } from "./shapes";
import { autoPack, type Word } from "./layout";

export const BOARD_COLS = 6;
/** 载荷板尺寸：容量 = 引擎卡组预算（默认 18 → 6×3） */
export function boardSize() { return { cols: BOARD_COLS, rows: Math.max(1, Math.ceil(P2.BUDGET / BOARD_COLS)) }; }
export const capacity = () => P2.BUDGET;

export function getWords(): Word[] {
  return ADV_WORDS.map((name) => {
    const a = ADV[name]; const i = WORD_INFO[name];
    return { name, area: a.price, max: a.max, cat: i?.cat ?? "core", icon: i?.icon ?? "◇", size: shapeFor(a.price), desc: i?.desc ?? "（暂无说明）", example: i?.example ?? "" };
  });
}
export const wordMap = (ws = getWords()) => Object.fromEntries(ws.map((w) => [w.name, w])) as Record<string, Word>;
export const expandDeck = (deck: Record<string, number>, bn = wordMap()) => Object.entries(deck).flatMap(([n, k]) => (bn[n] ? Array<Word>(k).fill(bn[n]) : []));

/** 校验卡组对象，返回错误文字或 null */
export function validateDeck(obj: unknown, bn = wordMap()): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "格式应为 {\"词\":张数}";
  let total = 0;
  for (const [n, k] of Object.entries(obj as Record<string, unknown>)) {
    const w = bn[n];
    if (!w) return `未知的词：${n}`;
    if (typeof k !== "number" || !Number.isInteger(k) || k < 0) return `张数不合法：${n}`;
    if (k > w.max) return `「${n}」最多 ${w.max} 张`;
    total += k * w.area;
  }
  if (total > capacity()) return `占用 ${total} 超过容量 ${capacity()}`;
  const { cols, rows } = boardSize();
  if (!autoPack(expandDeck(obj as Record<string, number>, bn), cols, rows)) return "排不进载荷板（形状无法拼合）";
  return null;
}
/** 当前规则下可用的推荐配置 */
export const presetsNow = () => PRESETS.filter((p) => deckOk(p.deck) && Object.keys(p.deck).every((n) => n in ADV && ADV_WORDS.includes(n)));
export const presetDeck = (id: string): Record<string, number> => ({ ...(PRESETS.find((p) => p.id === id)?.deck ?? {}) });
export { deckCost, deckOk };

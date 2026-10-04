// 卡组（基因）：预算内的进阶词张数。随机生成、变异、交叉、行为描述符。
import { ADV, ADV_WORDS, P2, deckCost, type Deck } from "./params";
import type { Rng } from "./gen";

const pick = <T>(r: Rng, xs: T[]): T => xs[Math.floor(r() * xs.length)];
export function fill(d: Deck, r: Rng): Deck {
  for (let t = 0; t < 60; t++) {
    const w = pick(r, ADV_WORDS);
    if ((d[w] ?? 0) >= ADV[w].max || deckCost(d) + ADV[w].price > P2.BUDGET) continue;
    d[w] = (d[w] ?? 0) + 1;
  }
  return d;
}
export const randDeck = (r: Rng): Deck => fill({}, r);
export function mutate(d: Deck, r: Rng): Deck {
  const n: Deck = { ...d };
  const removes = 1 + Math.floor(r() * 4);
  for (let i = 0; i < removes; i++) { const have = Object.keys(n).filter((w) => n[w] > 0); if (!have.length) break; const w = pick(r, have); n[w]--; }
  return fill(n, r);
}
export function cross(a: Deck, b: Deck, r: Rng): Deck {
  const n: Deck = {};
  for (const w of ADV_WORDS) { const v = r() < 0.5 ? a[w] ?? 0 : b[w] ?? 0; if (v) n[w] = v; }
  while (deckCost(n) > P2.BUDGET) { const have = Object.keys(n).filter((w) => n[w] > 0); n[pick(r, have)]--; }
  return fill(n, r);
}
export const deckKey = (d: Deck) => ADV_WORDS.filter((w) => d[w]).map((w) => `${w}${d[w]}`).join(" ");

/** 行为统计累加（一方一局） */
export type Agg = Record<string, number>;
export function addStats(agg: Agg, st: Record<string, number>, side: 0 | 1, rounds: number, won: number) {
  agg.games = (agg.games ?? 0) + 1; agg.rounds = (agg.rounds ?? 0) + rounds; agg.won = (agg.won ?? 0) + won;
  const p = `s${side}:`;
  for (const [k, v] of Object.entries(st)) if (k.startsWith(p)) agg[k.slice(p.length)] = (agg[k.slice(p.length)] ?? 0) + v;
}
export const DESC_NAMES = ["普通攻击占比", "长期句占比", "定时占比", "状态占比", "移除占比", "无视占比", "平均句长", "不出手率", "平均起手秒", "治疗占伤害治疗比", "减伤使用", "触发/句", "引爆/句", "并/句", "无视被挡次数"];
/** 描述符：全是 0~1 左右的比例，方便做距离和聚类 */
export function descriptor(a: Agg): number[] {
  const sent = Math.max(1, a.sent ?? 0), cl = Math.max(1, a.len ?? 0), g = Math.max(1, a.games ?? 1);
  const dh = (a.dealt ?? 0) + (a.healed ?? 0) || 1;
  return [
    (a.act ?? 0) / cl, ((a.when ?? 0) + (a.ignore ?? 0)) / cl, (a.delay ?? 0) / cl, (a.status ?? 0) / cl, (a.remove ?? 0) / cl,
    (a["w:无视"] ?? 0) / sent, (cl / sent - 1) / 2, (a.pass ?? 0) / Math.max(1, (a.pass ?? 0) + sent), (a.start ?? 0) / sent / 20,
    (a.healed ?? 0) / dh, (a["w:减伤"] ?? 0) / sent, (a.fire ?? 0) / sent, (a.burst ?? 0) / g, (a["w:并"] ?? 0) / sent, (a.ignored ?? 0) / g,
  ];
}
export const dist = (x: number[], y: number[]) => Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));

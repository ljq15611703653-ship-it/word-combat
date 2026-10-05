// 教学引导：把课程表里「本关允许的句子 / 这一步想让玩家说的句子」变成拖拽拼句的 Guide（types.ts）。
//   allowed  —— 整句过滤（不满足不能确认宣告）；
//   lockWords —— 只许拿本关用得上的词（候选句里出现过的词的并集），其余词牌灰掉并说明；
//   hint     —— 这一步想要的句子的词序列：下一张该拖的词牌在词牌库里脉冲，句子条末尾亮「放这里」。
import type { Match } from "../../engine/api";
import type { Guide } from "../../types";
import { astToTokens } from "../../composer/grammar";
import type { TeachSession } from "./session";

export function guideFor(ses: TeachSession, m: Match, u: number): Guide {
  const allowed = ses.allowed(m, u), want = ses.wantsFn(m, u);
  const fixed = ses.stepFor(m, u)?.words;
  if (fixed) return { allowed, hint: fixed.slice(), lockWords: [...new Set(fixed)], denyText: "这一步只用发亮的那几张词牌，一张一张拖到句子条上。" };
  const all = m.legalSentences(u, 400).filter((c) => allowed(c.cl));
  const pool = want ? all.filter((c) => want(c.cl)) : all;
  const use = pool.length ? pool : all;
  const toks = (cl: (typeof all)[number]["cl"]): string[] | null => { try { return astToTokens(cl); } catch { return null; } };
  const g: Guide = { allowed };
  if (use.length && (want || all.length < 400)) {
    const set = new Set<string>();
    for (const c of use) toks(c.cl)?.forEach((t) => set.add(t));
    if (set.size) g.lockWords = [...set];
  }
  if (want && pool.length) {
    const best = pool.map((c) => toks(c.cl)).filter((x): x is string[] => !!x).sort((a, b) => a.length - b.length)[0];
    if (best) g.hint = best;
  }
  return g;
}

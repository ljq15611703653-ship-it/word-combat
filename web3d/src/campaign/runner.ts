// 关卡的逻辑（不含界面）：开局、对手脚本。界面和命令行测试共用这一份。
import { Match } from "../engine/match";
import * as NR from "../engine/rules";
import type { FoeAct, Level, UnitDef } from "./types";
/* eslint-disable @typescript-eslint/no-explicit-any */

const pad = (units: UnitDef[], mk: (u: UnitDef | null, i: number) => any) => [0, 1, 2].map((i) => mk(units[i] ?? null, i));
const units3 = (u: UnitDef[]) => Math.min(3, u.length);

export function makeMatch(lv: Level, seed: number): Match {
  const mk = (cls: NR.Cls, units: UnitDef[], words: Record<string, number>): NR.Deck => ({
    cls, words: { ...words }, kws: pad(units, (u) => u?.kw ?? "无"), hp: pad(units, (u) => u?.hp ?? 3),
  });
  const P = lv.player, F = lv.foe;
  const perma: number[] = [];
  for (let i = units3(P.units); i < 3; i++) perma.push(i);
  for (let i = units3(F.units); i < 3; i++) perma.push(3 + i);
  const M = new Match();
  M.start(mk(P.cls, P.units, P.words), mk(F.cls, F.units, F.words), seed, true, false, {
    koWin: !lv.full, maxRounds: lv.maxRounds, perma,
    names: [pad(P.units, (u) => u?.name ?? "—"), pad(F.units, (u) => u?.name ?? "—")],
    glyphs: [pad(P.units, (u) => u?.name?.[0] ?? "—"), pad(F.units, (u) => u?.name?.[0] ?? "—")],
    give: [P.give ?? [], F.give ?? []], ap: [P.ap ?? NR.AP_START, F.ap ?? NR.AP_START], first: lv.first ?? 0,
  });
  return M;
}

/** 对手这一轮要出的招（脚本关卡）；AI 关卡返回 null */
export function foePlan(M: Match, lv: Level): FoeAct[] | null {
  if (lv.foe.ai || !lv.foe.script) return null;
  return lv.foe.script(M, M.rnd).map((a) => ({ ...a }));
}

/** 对手轮到宣告时调用：脚本关卡按计划出一招（出不了就不出手），AI 关卡走电脑。返回错误说明（测试用） */
export function foeStep(M: Match, lv: Level, plan: FoeAct[] | null): string {
  if (M.declareSide() !== 1) return "";
  if (!plan) { M.aiStep(); return ""; }
  const next = plan.shift();
  if (!next || !M.remaining[1].includes(next.uid)) {
    M.submit(1, M.remaining[1][0], null);
    return "";
  }
  const r = M.buildAction(1, next.uid, next.cl, next.start);
  if (r.err) { M.submit(1, next.uid, null); return `脚本出招失败：${r.err}`; }
  M.submit(1, next.uid, r.act!);
  return "";
}

// ---- 对手脚本里常用的句子零件（站在对手的角度：enemy = 你这边）
export const alive = (M: any, side: number) => M.R.U.filter((u: any) => u.side === side && u.down === -1);
export const lowest = (M: any, side: number) => [...alive(M, side)].sort((a: any, b: any) => a.hp - b.hp)[0];
export const front = (M: any, side: number) => alive(M, side)[0];
export const cA = (tg: number[], n = 1, rep = 1, extra: any = {}) => ({ k: "atk", tmode: "choose", side: "enemy", count: tg.length, tg, n, rep, ...extra });
export const cH = (tg: number[], n = 1) => ({ k: "heal", tmode: "choose", side: "ally", count: tg.length, tg, n, rep: 1 });
export const cM = (tg: number[], n = 1) => ({ k: "mit", tmode: "choose", side: "ally", count: tg.length, tg, n });
export const cS = (st: string, tg: number[], n = 1) => ({ k: "st", tmode: "choose", side: "enemy", count: tg.length, tg, st, n });
export const cR = (tg: number[]) => ({ k: "redirect", tmode: "choose", side: "ally", count: tg.length, tg });
export const cRm = (tg: number) => ({ k: "remove", tmode: "pick", side: "enemy", count: 1, tg: [tg] });

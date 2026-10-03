// 校验客户端送来的「一句话」：只放行已知字段、整数范围、目标合法；其余交给 Match.buildAction 做规则校验。
import * as NR from "../src/engine/rules";
import type { Match } from "../src/engine/match";
import type { Caps } from "../src/engine/rules";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KINDS = ["atk", "heal", "mit", "st", "redirect", "delay", "remove"];
// 每个词允许的阵营：打人既能打敌人也能打自己人（拼句器允许“打自己人”）；状态、延后、移除只对敌方；恢复、减伤、转移只对己方
const SIDES: Record<string, ("enemy" | "ally")[]> = { atk: ["enemy", "ally"], heal: ["ally"], mit: ["ally"], st: ["enemy"], redirect: ["ally"], delay: ["enemy"], remove: ["enemy"] };
const isInt = (x: any, lo: number, hi: number) => Number.isInteger(x) && x >= lo && x <= hi;

/** 返回净化后的 Clause[]，或 { err }。uid 是出手的随从（“自身”句只能指向它） */
export function sanitizeClauses(M: Match, s: number, raw: any, cp: Caps, uid = -1): { cls?: any[]; err?: string } {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 12) return { err: "句子格式不对" };
  const out: any[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return { err: "句子格式不对" };
    const k = r.k;
    if (!KINDS.includes(k)) return { err: `不认识的词类型 ${String(k).slice(0, 8)}` };
    const okSides = SIDES[k];
    const side: "enemy" | "ally" = r.side === undefined ? okSides[0] : r.side;
    if (!okSides.includes(side)) return { err: "目标阵营和这个词对不上" };
    const c: any = { k, side };
    let tmode = r.tmode ?? "choose";
    if (!["choose", "pick", "late", "self"].includes(tmode)) return { err: "不认识的选目标方式" };
    if (k === "remove") tmode = "pick";
    if (tmode === "pick" && k !== "remove") return { err: "只有【移除】能用单选目标" };
    if (tmode === "late" && !cp.late) return { err: "只有择流能把目标留到宣告完再定" };
    if (tmode === "late" && ["delay", "remove"].includes(k)) return { err: "这个词不能待定目标" };
    if (tmode === "self" && (side !== "ally" || k === "delay")) return { err: "【自身】只能用在己方的词上" };
    c.tmode = tmode;
    const pool = M.R.U.filter((u: any) => (u.side !== s) === (side === "enemy"));
    if (k === "delay") {
      if (!isInt(r.act, 0, 999)) return { err: "延后要选对方已宣告的一句" };
      c.act = r.act; c.tg = []; c.count = 1; c.tmode = "choose";
    } else if (tmode === "self") {
      if (!isInt(uid, 0, 5) || M.R.U[uid]?.side !== s) return { err: "自身指向的随从不对" };
      c.tg = [uid]; c.count = 1;
    } else if (tmode === "late") {
      if (!isInt(r.count, 1, pool.length)) return { err: "目标个数不对" };
      c.count = r.count; c.tg = [];
    } else {
      const tg = r.tg;
      if (!Array.isArray(tg) || !tg.every((x) => isInt(x, 0, 5)) || new Set(tg).size !== tg.length) return { err: "目标不对" };
      if (!tg.every((x: number) => pool.some((u: any) => u.uid === x))) return { err: "目标阵营不对" };
      const want = tmode === "pick" ? 1 : tg.length;
      if (tg.length !== want || want < 1) return { err: "目标个数不对" };
      c.tg = [...tg]; c.count = tg.length;
    }
    if (k === "atk" || k === "heal") {
      if (!isInt(r.n, 1, 6) || !isInt(r.rep ?? 1, 1, 6)) return { err: "数字不对" };
      c.n = r.n; c.rep = r.rep ?? 1;
    } else if (k === "mit") {
      if (!isInt(r.n, 1, 6)) return { err: "数字不对" };
      c.n = r.n;
    } else if (k === "st") {
      if (NR.WORDS[r.st]?.kind !== "status" || !isInt(r.n, 1, 6)) return { err: "状态词不对" };
      c.st = r.st; c.n = r.n;
    } else if (k === "delay") {
      if (!isInt(r.n, 1, 6)) return { err: "数字不对" };
      c.n = r.n;
    }
    if (r.cont !== undefined) {
      if (!isInt(r.cont, 1, 6)) return { err: "持续轮数不对" };
      if (r.cont > 1) {
        if (!["atk", "heal", "mit"].includes(k)) return { err: "【持续】只能接在伤害、恢复、减伤后面" };
        c.cont = r.cont;
      }
    }
    out.push(c);
  }
  return { cls: out };
}

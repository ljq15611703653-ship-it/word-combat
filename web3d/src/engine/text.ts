// 数字牌模式 · 把句子翻译成人话（移植自 nc_text.gd）
/* eslint-disable @typescript-eslint/no-explicit-any */
export function unitName(M: any, uid: number): string {
  if (!M) return "某某";
  const u = M.R.U[uid];
  return (u.side === 0 ? "你的" : "对手的") + u.name;
}

function targets(M: any, c: any, viewer = 0, owner = 0): string {
  const tg: number[] = c.tg ?? [];
  const mode = c.tmode ?? "choose";
  if (mode === "self") return "自身";
  const n = c.count ?? tg.length;
  const side = (c.side ?? "enemy") === "enemy" ? "敌方" : "友方";
  const ncount = c.count !== undefined && n > 0 ? `${n} 个` : "几个";
  if (mode === "late" && (!tg.length || (M && viewer !== owner && !c.shown))) return `${ncount}${side}随从（待定：宣告完再定）`;
  if (tg.length && M) return tg.map((t) => unitName(M, t)).join("、");
  return `${ncount}${side}随从`;
}
const num = (c: any, key: string) => (c[key] !== undefined ? String(c[key]) : "几");

export function clauseText(M: any, c: any, viewer = 0, owner = 0): string {
  const who = targets(M, c, viewer, owner);
  const cont = c.cont ?? 1;
  const tail = cont > 1 ? `，以后每轮同一秒再来一次（共 ${cont} 轮）` : "";
  switch (c.k) {
    case "atk": return `对${who}造成 ${num(c, "n")} 点伤害${(c.rep ?? 1) > 1 ? `，一共打 ${c.rep} 次` : ""}${tail}`;
    case "heal": return `使${who}恢复 ${num(c, "n")} 点生命${(c.rep ?? 1) > 1 ? `，一共 ${c.rep} 次` : ""}${tail}`;
    case "mit": return `本轮${who}每次受到的伤害少 ${num(c, "n")} 点${tail}`;
    case "st": {
      const dur = c.n ?? 1;
      return `给${who}施加【${c.st ?? "某个状态"}】${dur > 1 ? `（持续 ${dur} 轮，每过一轮 +1 级）` : "（只撑本轮）"}`;
    }
    case "redirect": return `本轮打向${who}的敌方伤害，转给出手的人`;
    case "delay": {
      let a = "";
      if (M && (c.act ?? -1) >= 0) for (const b of M.declared) if (b.ord === c.act) a = `（${unitName(M, b.uid)} 第 ${b.start} 秒那句）`;
      return `把对方的一句${a}往后推 ${num(c, "n")} 秒`;
    }
    case "remove": return `拆掉${(c.tg ?? []).length ? who : "一个敌人"}身上的减伤、转移，掐断它的续`;
  }
  return "……";
}
export const actionText = (M: any, cls: any[], viewer = 0, owner = 0) => cls.map((c) => clauseText(M, c, viewer, owner)).join("；并且");
export const statusChip = (nm: string, e: number[], rnd: number) => `${nm}${e[0]}级·剩${Math.max(e[1] - rnd + 1, 0)}轮`;

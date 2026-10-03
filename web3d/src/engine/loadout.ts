// 从对局状态算出一个随从“装备了什么”，供外壳装甲显示
import type { Loadout } from "../armor";
/* eslint-disable @typescript-eslint/no-explicit-any */
const KIND_LABEL: Record<string, (c: any) => string> = {
  atk: (c) => String(c.n * (c.rep ?? 1)),
  heal: (c) => String(c.n * (c.rep ?? 1)),
  mit: (c) => String(c.n),
  st: (c) => c.st[0],
  redirect: () => "",
  delay: (c) => `+${c.n}`,
  remove: () => "",
};

export function loadoutOf(M: any, uid: number): Loadout {
  const u = M.R.U[uid];
  const ld: Loadout = { atk: 0, block: 0, heal: 0, redirect: false, delay: 0, blood: 0, bloodRoom: 7, conts: 0, contLeft: 0, clauses: [], statuses: [] };
  if (u.down !== -1) { ld.down = true; return ld; }
  for (const a of M.declared) {
    if (a.uid !== uid) continue;
    ld.blood += a.blood ?? 0;
    for (const c of a.cl) {
      const cnt = c.count ?? (c.tg ?? []).length ?? 1;
      if (c.k === "atk") ld.atk += c.n * (c.rep ?? 1) * Math.max(1, cnt);
      if (c.k === "mit") ld.block += c.n;
      if (c.k === "heal") ld.heal += c.n * (c.rep ?? 1);
      if (c.k === "redirect") ld.redirect = true;
      if (c.k === "delay") ld.delay += c.n;
      ld.clauses.push({ kind: c.k, label: KIND_LABEL[c.k]?.(c) ?? "" });
    }
  }
  for (const c of M.R.conts) if (c.uid === uid) { ld.conts++; ld.contLeft = Math.max(ld.contLeft, c.left); }
  for (const nm of Object.keys(u.st)) ld.statuses.push({ name: nm, lv: u.st[nm][0] });
  ld.kw = u.kw;
  ld.kwSpent = !!u.kws;
  ld.bloodRoom = Math.max(1, u.hp);
  return ld;
}

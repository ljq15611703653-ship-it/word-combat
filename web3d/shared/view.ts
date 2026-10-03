// viewFor：把权威对局状态过滤成某一方能看到的视图。对手的待定目标、手牌、词库、种子、令牌都不出现。
import type { Match } from "../src/engine/match";
import type { Cls } from "../src/engine/rules";
import type { GameView, PubAct, PubUnit, Note, PendingLate } from "./protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RoomMeta {
  room: string; rev: number; names: string[]; connected: boolean[]; ready: boolean[];
  assignDone: boolean[]; deadline: number; noteSplit: number;
}

const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** 把一句话变成公开版。reveal=true 时（结算后）待定目标全部揭示。 */
export function pubAct(a: any, viewer: number, reveal: boolean, lockQ?: Record<number, number[][]>): PubAct {
  const cl = copy(a.cl).map((c: any) => { delete c.locked; return c; });
  const q = lockQ?.[a.ord];
  for (const c of cl) {
    if (c.tmode !== "late") continue;
    if (reveal) { c.shown = true; if (!(c.tg ?? []).length && q?.length) c.tg = q.shift(); }
    else if (a.side !== viewer) { c.tg = []; c.hidden = true; }
  }
  return { ord: a.ord, side: a.side, uid: a.uid, start: a.start, cl, cost: a.cost, blood: a.blood ?? 0, words: [...a.words], def: !!a.def, ms: a.ms };
}

export function viewFor(M: Match, side: number, meta: RoomMeta, events?: any[]): GameView {
  const reveal = M.phase === "resolved" || M.phase === "over";
  const lockQ: Record<number, number[][]> = {};
  if (reveal && events) for (const e of events) if (e.type === "lock") (lockQ[e.ord] ??= []).push([...e.tgts]);
  const src = reveal ? M.lastDeclared : M.declared;
  const acts = src.map((a: any) => pubAct(a, side, reveal, lockQ));
  const units: PubUnit[] = M.R.U.map((u: any) => ({
    uid: u.uid, side: u.side, name: u.name, glyph: u.glyph, hp: u.hp, mx: u.mx, down: u.down,
    st: copy(u.st), kw: u.kw, kws: !!u.kws, mit: u.mit,
  }));
  const sides = [0, 1].map((s) => ({
    name: meta.names[s], cls: M.clsOf(s) as Cls, ap: M.res[s].ap ?? M.sides[s].ap, prog: M.progress(s),
    cardCount: M.sides[s].cards.length, connected: meta.connected[s], ready: meta.ready[s],
  }));
  const usable = new Set(M.usableCards(side));
  const pending: PendingLate[] = [];
  if (M.phase === "assign") {
    for (const a of M.declared) {
      if (a.side !== side) continue;
      a.cl.forEach((c: any, ci: number) => {
        if (c.tmode === "late") pending.push({ ord: a.ord, ci, k: c.k, side: c.side ?? "enemy", count: c.count ?? 1, targets: [...(c.tg ?? [])] });
      });
    }
  }
  const notes: Note[] = reveal ? M.roundNotes.slice(meta.noteSplit) : M.roundNotes.slice(0, meta.noteSplit);
  return {
    phase: M.phase as any, rev: meta.rev, room: meta.room, you: side, round: M.rnd,
    turn: M.phase === "declare" ? M.declareSide() : -1, first: M.firstSide(), winner: M.winner,
    units, sides, remaining: [[...M.remaining[0]], [...M.remaining[1]]], acts,
    conts: M.R.conts.map((c: any) => ({ side: c.side, uid: c.uid, cl: copy(c.cl), left: c.left, start: c.start })),
    notes: copy(notes),
    me: {
      ap: M.res[side].ap, words: { ...M.res[side].words }, cooling: M.coolingWords(side),
      cards: M.sides[side].cards.map((c: any, i: number) => ({ i, v: c.v, once: !!c.once, src: c.src, usable: usable.has(i) && !M.res[side].cards.includes(i) })),
      caps: M.caps(side), pending, assignDone: meta.assignDone[side],
    },
    oppAssignDone: meta.assignDone[1 - side],
    deadline: meta.deadline,
  };
}

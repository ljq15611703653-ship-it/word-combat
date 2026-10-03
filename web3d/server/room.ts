// 一个房间 = 两个玩家 + 一个权威 Match。客户端只发意图，这里校验、改状态、按视角广播。
import { randomBytes, randomInt } from "node:crypto";
import type { WebSocket } from "ws";
import { Match } from "../src/engine/match";
import { suggestLate } from "../src/engine/ai";
import * as NR from "../src/engine/rules";
import type { Deck } from "../src/engine/rules";
import type { C2S, DeckSpec, S2C, LobbyView, View } from "../shared/protocol";
import { viewFor, type RoomMeta } from "../shared/view";
import { sanitizeClauses } from "./sanitize";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ASSIGN_MS = +(process.env.ASSIGN_MS ?? 90_000);
export const NEXT_MS = +(process.env.NEXT_MS ?? 30_000);
export const reconnectMs = () => +(process.env.RECONNECT_MS ?? 90_000); // 对局中掉线超过这么久算认输

interface Player { name: string; token: string; deck: Deck; ws: WebSocket | null; ready: boolean; lastSeen: number; left: boolean; dc: NodeJS.Timeout | null }

export class RoomError extends Error { constructor(public code: string, msg: string) { super(msg); } }
const fail = (code: string, msg: string): never => { throw new RoomError(code, msg); };

export function deckFromSpec(d?: DeckSpec): Deck {
  const cls = d?.cls ?? "并";
  if (!NR.CLASSES.includes(cls)) return fail("bad_deck", "没有这个流派");
  const base = NR.presetDeck(cls, true);
  if (d && (d.words || d.kws || d.hp)) {
    const words = d.words ?? base.words, kws = d.kws ?? base.kws, hp = d.hp ?? base.hp;
    if (typeof words !== "object" || !Array.isArray(kws) || !Array.isArray(hp)) return fail("bad_deck", "卡组格式不对");
    for (const w in words) if (!Number.isInteger(words[w]) || words[w] < 0) return fail("bad_deck", "卡组张数不对");
    if (!hp.every((x) => Number.isInteger(x))) return fail("bad_deck", "生命分配不对");
    const p = NR.deckProblem(words, kws) || NR.hpProblem(hp, NR.W.POOL);
    if (p) fail("bad_deck", p);
    return { cls, words: { ...words }, kws: [...kws], hp: [...hp] };
  }
  return base;
}

export class Room {
  players: (Player | null)[] = [null, null];
  M: Match | null = null;
  rev = 0;
  assignDone = [false, false];
  nextReady = [false, false];
  deadline = 0;
  noteSplit = 0;
  lastEvents: any[] = [];
  timer: NodeJS.Timeout | null = null;
  seed = 0;
  created = Date.now();

  constructor(public id: string) {}

  get playing() { return !!this.M; }
  idleMs() { return Date.now() - Math.max(this.created, ...this.players.map((p) => p?.lastSeen ?? 0)); }
  anyConnected() { return this.players.some((p) => p?.ws); }
  private connected() { return this.players.map((p) => !!p?.ws && !p.left); }

  private meta(): RoomMeta {
    const inRound = this.M && (this.M.phase === "resolved" || this.M.phase === "over");
    return {
      room: this.id, rev: this.rev, names: this.players.map((p) => p?.name ?? "?"), connected: this.connected(),
      ready: inRound ? [...this.nextReady] : this.players.map((p) => !!p?.ready),
      assignDone: [...this.assignDone], deadline: this.deadline, noteSplit: this.noteSplit,
    };
  }
  viewOf(side: number): View {
    if (!this.M) {
      const v: LobbyView = {
        phase: "lobby", rev: this.rev, room: this.id, you: side,
        players: this.players.map((p) => (p ? { name: p.name, cls: p.deck.cls, ready: p.ready, connected: !!p.ws && !p.left } : null)),
      };
      return v;
    }
    return viewFor(this.M, side, this.meta(), this.lastEvents);
  }
  private send(side: number, m: S2C) {
    const ws = this.players[side]?.ws;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
  }
  /** 递增 rev 并向双方发各自视角的快照；传入 events 则发 resolved（一次性揭示） */
  private broadcast(resolvedEvents?: any[]) {
    this.rev++;
    for (let s = 0; s < 2; s++) {
      if (resolvedEvents) this.send(s, { t: "resolved", rev: this.rev, events: resolvedEvents, view: this.viewOf(s) as any });
      else this.send(s, { t: "state", rev: this.rev, view: this.viewOf(s) });
    }
  }

  // ---------- 入退房 ----------
  join(ws: WebSocket, name: string, deck?: DeckSpec): number {
    if (this.playing) fail("full", "这个房间已经在打了（断线的人请用重连）");
    const side = !this.players[0] ? 0 : !this.players[1] ? 1 : -1;
    if (side < 0) return fail("full", "房间已满");
    const nm = String(name || "").trim().slice(0, 12) || `玩家${side + 1}`;
    const p: Player = { name: nm, token: randomBytes(16).toString("hex"), deck: deckFromSpec(deck), ws, ready: false, lastSeen: Date.now(), left: false, dc: null };
    this.players[side] = p;
    this.send(side, { t: "joined", side, token: p.token, room: this.id });
    this.send(1 - side, { t: "peer", status: "joined", name: p.name });
    this.broadcast();
    return side;
  }
  rejoin(ws: WebSocket, token: string): number {
    const side = this.players.findIndex((p) => p && p.token === token);
    if (side < 0) return fail("bad_token", "重连凭证不对");
    const p = this.players[side]!;
    if (p.left) return fail("bad_token", "你已经离开了这一局");
    if (p.dc) { clearTimeout(p.dc); p.dc = null; }
    if (p.ws && p.ws !== ws) { try { p.ws.close(4000, "replaced"); } catch { /* ignore */ } }
    p.ws = ws; p.lastSeen = Date.now();
    this.send(side, { t: "joined", side, token: p.token, room: this.id });
    this.send(1 - side, { t: "peer", status: "back", name: p.name });
    this.broadcast();
    return side;
  }
  disconnect(ws: WebSocket) {
    const side = this.players.findIndex((p) => p && p.ws === ws);
    if (side < 0) return;
    const p = this.players[side]!;
    p.ws = null; p.lastSeen = Date.now();
    if (!this.playing) this.players[side] = null; // 大厅里走了就腾位置；开打后保留位置等重连
    else if (this.M!.phase !== "over" && !p.left) {
      if (p.dc) clearTimeout(p.dc);
      p.dc = setTimeout(() => { p.dc = null; if (!p.ws) this.forfeit(side); }, reconnectMs());
    }
    this.send(1 - side, { t: "peer", status: "left", name: p.name });
    this.broadcast();
  }

  /** 两个人都进来之后直接开打（匹配队列用，不需要再点准备） */
  begin() {
    if (this.playing || !this.players[0] || !this.players[1]) return;
    this.startGame();
  }
  /** 主动离开：对局进行中视为认输；对局结束/大厅里就是单纯走人 */
  leave(ws: WebSocket) {
    const side = this.players.findIndex((p) => p && p.ws === ws);
    if (side < 0) return;
    const p = this.players[side]!;
    if (!this.playing) { this.disconnect(ws); return; }
    if (this.M!.phase !== "over") this.forfeit(side);
    p.left = true; p.ws = null;
    if (p.dc) { clearTimeout(p.dc); p.dc = null; }
    this.send(1 - side, { t: "peer", status: "left", name: p.name, quit: true });
    this.broadcast();
  }
  /** 认输（主动退出、或掉线超时）：对手获胜，对局进入 over */
  forfeit(side: number) {
    const M = this.M;
    if (!M || M.phase === "over") return;
    this.clearTimer();
    M.winner = 1 - side; M.phase = "over";
    this.lastEvents = []; this.nextReady = [false, false];
    this.noteSplit = M.roundNotes.length;
    this.broadcast();
  }

  // ---------- 处理客户端意图（非法的抛 RoomError，不改状态） ----------
  handle(side: number, m: C2S) {
    this.players[side]!.lastSeen = Date.now();
    switch (m.t) {
      case "ready": return this.onReady(side);
      case "declare": return this.onDeclare(side, m.uid, m.cls, m.start);
      case "pass": return this.onPass(side, m.uid);
      case "assign_late": return this.onAssign(side, m.ord, m.ci, m.targets);
      case "confirm_assign": return this.onConfirm(side);
    }
  }
  private game(): Match { return this.M ?? fail("phase", "对局还没开始"); }

  private onReady(side: number) {
    if (!this.M) {
      this.players[side]!.ready = true;
      if (this.players[0]?.ready && this.players[1]?.ready) this.startGame(); else this.broadcast();
      return;
    }
    const ph = this.M.phase;
    if (ph !== "resolved" && ph !== "over") fail("phase", "现在不用准备");
    this.nextReady[side] = true;
    if (this.nextReady[0] && this.nextReady[1]) { if (ph === "over") this.startGame(); else this.nextRound(); }
    else this.broadcast();
  }
  private startGame() {
    this.clearTimer();
    this.seed = randomInt(1, 2 ** 31 - 1); // 种子只留在服务端
    const M = new Match();
    M.start(this.players[0]!.deck, this.players[1]!.deck, this.seed, true, true, { wipe: true });
    this.M = M;
    this.resetRound();
    this.broadcast();
  }
  private resetRound() {
    this.noteSplit = this.M!.roundNotes.length;
    this.assignDone = [false, false]; this.nextReady = [false, false]; this.lastEvents = [];
  }
  private nextRound() {
    this.clearTimer();
    this.M!.nextRound();
    this.resetRound();
    this.broadcast();
  }

  private onDeclare(s: number, uid: any, cls: any, start: any) {
    const M = this.game();
    if (M.phase !== "declare") fail("phase", "现在不是宣告阶段");
    if (M.declareSide() !== s) fail("turn", "还没轮到你");
    if (!Number.isInteger(uid) || uid < 0 || uid > 5) fail("bad_unit", "随从不对");
    if (!M.remaining[s].includes(uid)) fail("bad_unit", "这个随从这一轮已经定过了");
    if (!Number.isInteger(start)) fail("bad_start", "起手秒数不对");
    const sc = sanitizeClauses(M, s, cls, M.caps(s), uid);
    if (sc.err) fail("bad_act", sc.err);
    const r = M.buildAction(s, uid, sc.cls!, start);
    if (r.err || !r.act) return fail("rule", r.err ?? "不行");
    const e = M.submit(s, uid, r.act);
    if (e) fail("rule", e);
    this.advance();
  }
  private onPass(s: number, uid: any) {
    const M = this.game();
    if (M.phase !== "declare") fail("phase", "现在不是宣告阶段");
    if (M.declareSide() !== s) fail("turn", "还没轮到你");
    if (!Number.isInteger(uid) || !M.remaining[s].includes(uid)) fail("bad_unit", "这个随从这一轮已经定过了");
    const e = M.submit(s, uid, null);
    if (e) fail("rule", e);
    this.advance();
  }
  private lateClauses(s: number) {
    const out: { a: any; ci: number; c: any }[] = [];
    for (const a of this.M!.declared) if (a.side === s) a.cl.forEach((c: any, ci: number) => { if (c.tmode === "late") out.push({ a, ci, c }); });
    return out;
  }
  private onAssign(s: number, ord: any, ci: any, targets: any) {
    const M = this.game();
    if (M.phase !== "assign") fail("phase", "现在不是定目标阶段");
    if (this.assignDone[s]) fail("done", "你已经确认过了");
    const hit = this.lateClauses(s).find((x) => x.a.ord === ord && x.ci === ci);
    if (!hit) return fail("bad_clause", "没有这段待定目标（或者不是你的）");
    if (!Array.isArray(targets) || !targets.every((x) => Number.isInteger(x) && x >= 0 && x <= 5) || new Set(targets).size !== targets.length) fail("bad_target", "目标不对");
    const wantEnemy = (hit.c.side ?? "enemy") === "enemy";
    const pool = M.R.U.filter((u: any) => u.down === -1 && ((u.side !== s) === wantEnemy));
    const need = Math.min(hit.c.count ?? 1, pool.length);
    if (targets.length !== need) fail("bad_target", `要选 ${need} 个目标`);
    if (!targets.every((x: number) => pool.some((u: any) => u.uid === x))) fail("bad_target", "目标阵营不对或已倒下");
    M.setLate(ord, ci, targets);
    // 只回给本人：对手的快照不变（rev 也不用涨）
    this.rev++;
    const ws = this.players[s]?.ws;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "state", rev: this.rev, view: this.viewOf(s) } satisfies S2C));
  }
  private onConfirm(s: number) {
    const M = this.game();
    if (M.phase !== "assign") fail("phase", "现在不是定目标阶段");
    if (this.assignDone[s]) fail("done", "你已经确认过了");
    this.finishSide(s);
    this.advance();
  }
  /** 没填的待定段自动补上建议目标，然后标记该方已确认 */
  private finishSide(s: number) {
    const M = this.M!;
    for (const { a, ci, c } of this.lateClauses(s)) {
      if (!c.locked) M.setLate(a.ord, ci, suggestLate(M, s, a.ord, ci));
    }
    this.assignDone[s] = true;
  }

  // ---------- 推进 ----------
  private advance() {
    const M = this.M!;
    if (M.phase === "assign") {
      for (let s = 0; s < 2; s++) if (!this.assignDone[s] && !this.lateClauses(s).length) this.assignDone[s] = true;
      if (this.assignDone[0] && this.assignDone[1]) M.finishAssign();
      else if (!this.timer) this.armTimer(ASSIGN_MS, () => this.timeoutAssign());
    }
    if (M.phase === "declare" && M.declareSide() === -1) {
      this.clearTimer();
      this.noteSplit = M.roundNotes.length;
      const ev = M.resolveRound();
      this.lastEvents = ev;
      this.nextReady = [false, false];
      if ((M.phase as string) === "resolved") this.armTimer(NEXT_MS, () => this.timeoutNext());
      this.broadcast(ev);
      return;
    }
    this.broadcast();
  }
  private timeoutAssign() {
    if (this.M?.phase !== "assign") return;
    for (let s = 0; s < 2; s++) if (!this.assignDone[s]) this.finishSide(s);
    this.advance();
  }
  private timeoutNext() {
    if (this.M?.phase === "resolved") this.nextRound();
  }
  private armTimer(ms: number, f: () => void) {
    this.clearTimer();
    this.deadline = Date.now() + ms;
    this.timer = setTimeout(() => { this.timer = null; this.deadline = 0; try { f(); } catch (e) { console.error(e); } }, ms);
  }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; this.deadline = 0; }
  dispose() { this.clearTimer(); for (const p of this.players) if (p?.dc) { clearTimeout(p.dc); p.dc = null; } }
}

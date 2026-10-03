// 联机协议（服务端权威）。所有消息都是 JSON，字段 t 是类型。
// 客户端只发「意图」，服务端校验后改状态，并按接收者视角过滤后广播。
import type { Cls } from "../src/engine/rules";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** 一段话（Clause）和一句话（Act）沿用引擎的形状，故用 any */
export type Clause = any;

export interface DeckSpec { cls: Cls; words?: Record<string, number>; kws?: string[] }

// ---------- 客户端 → 服务端 ----------
export type C2S =
  | { t: "join"; room: string; name: string; deck?: DeckSpec; seq?: number }       // 首人建房，次人入房
  | { t: "rejoin"; room: string; token: string; seq?: number }                      // 断线重连
  | { t: "ready"; seq?: number }       // 大厅：准备；resolved 阶段：进入下一轮；over 阶段：再来一局
  | { t: "declare"; uid: number; cls: Clause[]; start: number; seq?: number }     // 提交已构造好的一句话（唯一的出招接口）
  | { t: "pass"; uid: number; seq?: number }                                        // 这个随从这一轮不出手
  | { t: "assign_late"; ord: number; ci: number; targets: number[]; seq?: number } // 择流：定待定目标（对手看不到）
  | { t: "confirm_assign"; seq?: number }                                           // 择流：确认（没填的自动补）
  | { t: "ping"; seq?: number };

// ---------- 服务端 → 客户端 ----------
export interface PubUnit {
  uid: number; side: number; name: string; glyph: string; hp: number; mx: number;
  down: number; st: Record<string, number[]>; kw: string; kws: boolean; mit: number;
}
export interface PubAct {
  ord: number; side: number; uid: number; start: number; cl: Clause[]; cost: number; blood: number;
  words: string[]; def: boolean; ms: number;
}
export interface PubCont { side: number; uid: number; cl: Clause; left: number; start: number }
export interface MyCard { i: number; v: number; once: boolean; src: string; usable: boolean }
export interface PubSide { name: string; cls: Cls; ap: number; prog: number; cardCount: number; connected: boolean; ready: boolean }
export interface Note { side: number; type: string; [k: string]: any }
export interface PendingLate { ord: number; ci: number; k: string; side: string; count: number; targets: number[] }

export interface LobbyView {
  phase: "lobby"; rev: number; room: string; you: number;
  players: ({ name: string; cls: Cls; ready: boolean; connected: boolean } | null)[];
}
export interface GameView {
  phase: "declare" | "assign" | "resolved" | "over";
  rev: number; room: string; you: number; round: number;
  turn: number;                       // 当前该谁宣告（-1：没有）
  first: number;                      // 本轮先手方
  winner: number;                     // -1 进行中；0/1；-2 平局
  units: PubUnit[];
  sides: PubSide[];
  remaining: number[][];              // 还没定下的随从（公开信息）
  acts: PubAct[];                     // 本轮已宣告；对手待定目标已被隐藏（clause.hidden=true, tg=[]）
  conts: PubCont[];                   // 场上续挂
  notes: Note[];                      // 本轮事件：保底/骰子/阶梯
  me: {
    ap: number; words: Record<string, number>; cooling: Record<string, number>;
    cards: MyCard[]; caps: any;
    pending: PendingLate[];           // 己方待定段（仅 assign 阶段非空）
    assignDone: boolean;
  };
  oppAssignDone: boolean;
  deadline: number;                   // 阶段超时时刻（毫秒时间戳，0 表示无）
}
export type View = LobbyView | GameView;

export type S2C =
  | { t: "joined"; side: number; token: string; room: string }
  | { t: "state"; rev: number; view: View }
  | { t: "resolved"; rev: number; events: any[]; view: GameView }
  | { t: "err"; code: string; msg: string; seq?: number }
  | { t: "peer"; status: "joined" | "left" | "back"; name: string }
  | { t: "pong"; seq?: number };

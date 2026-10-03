// 联机客户端网络层。UI 只通过这里收发：收到的是「按我的视角过滤好的快照」，发出去的是「意图」。
// 出招的唯一入口是 submitAct(act)——act 由任何 UI（按钮 / 键盘拼句 / 辅助轮）构造好后交进来即可。
import type { C2S, DeckSpec, GameView, S2C, View } from "../../shared/protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Act { uid: number; cls: any[]; start: number }
export type NetStatus = "idle" | "connecting" | "open" | "lost";

export interface NetHandlers {
  state?: (v: View) => void;
  resolved?: (events: any[], v: GameView) => void;
  err?: (code: string, msg: string) => void;
  peer?: (status: string, name: string) => void;
  status?: (s: NetStatus) => void;
  joined?: (side: number, room: string) => void;
}

const KEY = "nc.session";

export class Net {
  private ws: WebSocket | null = null;
  private lastRev = 0;
  private retry = 0;
  private timer = 0;
  private want = false;
  private queue: C2S[] = [];
  status: NetStatus = "idle";
  room = "";
  token = "";
  side = -1;
  seq = 1;

  constructor(private h: NetHandlers = {}) {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (s?.room && s?.token) { this.room = s.room; this.token = s.token; }
    } catch { /* 存储不可用就算了 */ }
  }
  get hasSession() { return !!(this.room && this.token); }
  on(h: NetHandlers) { Object.assign(this.h, h); }
  private setStatus(s: NetStatus) { this.status = s; this.h.status?.(s); }
  private url() { return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`; }

  /** 连接。已有会话（room+token）则自动 rejoin，否则等 join。 */
  connect() {
    this.want = true;
    if (this.ws && this.ws.readyState <= 1) return;
    this.setStatus("connecting");
    const ws = new WebSocket(this.url());
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus("open");
      if (this.hasSession) this.raw({ t: "rejoin", room: this.room, token: this.token });
      for (const m of this.queue.splice(0)) this.raw(m);
    };
    ws.onmessage = (e) => this.onMsg(JSON.parse(e.data as string) as S2C);
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setStatus("lost");
      if (this.want) this.timer = window.setTimeout(() => this.connect(), Math.min(4000, 400 * 2 ** this.retry++));
    };
    ws.onerror = () => { /* onclose 处理 */ };
  }
  private onMsg(m: S2C) {
    switch (m.t) {
      case "joined":
        this.side = m.side; this.token = m.token; this.room = m.room;
        try { sessionStorage.setItem(KEY, JSON.stringify({ room: m.room, token: m.token })); } catch { /* */ }
        this.h.joined?.(m.side, m.room);
        break;
      case "state":
        if (m.rev <= this.lastRev) return; // 丢弃旧快照
        this.lastRev = m.rev; this.h.state?.(m.view); break;
      case "resolved":
        if (m.rev <= this.lastRev) return;
        this.lastRev = m.rev; this.h.resolved?.(m.events, m.view); break;
      case "err":
        if (m.code === "no_room" || m.code === "bad_token") this.forget();
        this.h.err?.(m.code, m.msg); break;
      case "peer": this.h.peer?.(m.status, m.name); break;
    }
  }
  forget() { this.token = ""; this.room = ""; this.lastRev = 0; try { sessionStorage.removeItem(KEY); } catch { /* */ } }
  private raw(m: C2S) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ ...m, seq: this.seq++ })); else this.queue.push(m); }

  join(room: string, name: string, deck?: DeckSpec) { this.forget(); this.raw({ t: "join", room, name, deck }); }
  ready() { this.raw({ t: "ready" }); }
  /** 唯一的出招接口：提交一个已构造好的句子（随从、一串 Clause、起手秒数）。校验结果通过 err 回调返回。 */
  submitAct(act: Act) { this.raw({ t: "declare", uid: act.uid, cls: act.cls, start: act.start }); }
  pass(uid: number) { this.raw({ t: "pass", uid }); }
  assignLate(ord: number, ci: number, targets: number[]) { this.raw({ t: "assign_late", ord, ci, targets }); }
  confirmAssign() { this.raw({ t: "confirm_assign" }); }
  leave() { this.want = false; clearTimeout(this.timer); this.forget(); this.ws?.close(); this.ws = null; this.setStatus("idle"); }
}

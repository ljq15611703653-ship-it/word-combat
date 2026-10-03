// 联机对局：和本地「打电脑」是同一套 3D 场景、同一个拼句器（Composer）、同一个操作栏。
// 区别只有一处：对手和结算由服务端驱动——我这边只发「意图」（出一句 / 不出手 / 定目标 / 下一轮），
// 服务端校验后把「按我视角过滤好的快照」推回来，镜像成本地 Match（见 mirror.ts）后用原来的画面代码渲染。
import { Game, type GameCtx } from "../game";
import { MirrorMatch } from "./mirror";
import { Net } from "./net";
import * as NR from "../engine/rules";
import type { DeckSpec, GameView, View } from "../../shared/protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
const KEEP_UI = ["pick_unit", "compose", "target", "timing"]; // 轮到我时，这些界面状态不被快照打断

type Mode = "idle" | "matching" | "resuming" | "playing";

export class OnlineGame extends Game {
  net: Net;
  private mm = new MirrorMatch();
  private mode: Mode = "idle";
  private view: GameView | null = null;
  private deck: DeckSpec | undefined;
  private name = "玩家";
  private busy = false;
  private nextSent = false;
  private rematchSent = false;
  private confirmSent = false;
  private lastProgBefore: number[] = [0, 0];
  private chain: Promise<void> = Promise.resolve();
  private since = 0;
  private lastPhase = "";
  private lastRnd = 0;
  private status = "idle";
  private peerNote = "";
  /** 取消匹配 / 匹配失败：回到选卡组界面 */
  onCancel: (msg?: string) => void = () => { /* 由菜单接上 */ };
  /** 离开联机（回主菜单） */
  onLeave: (msg?: string) => void = () => { /* 由菜单接上 */ };

  constructor(ctx: GameCtx) {
    super(ctx);
    this.M = this.mm;
    this.foeName = "对手";
    this.net = new Net({
      status: (s) => this.onStatus(s),
      queued: (n) => { if (this.mode === "matching") this.showMatching(n); },
      joined: () => { if (this.mode === "matching" || this.mode === "resuming") this.mode = "playing"; },
      state: (v) => this.enqueue(() => this.onState(v)),
      resolved: (ev, v) => this.enqueue(() => this.onResolved(ev, v)),
      err: (code, msg) => this.onErr(code, msg),
      peer: (st, name, quit) => this.onPeer(st, name, quit),
    });
    setInterval(() => this.tick(), 500);
  }

  private enqueue(f: () => void | Promise<void>) {
    this.chain = this.chain.then(f).catch((e) => console.error(e));
  }

  // ------------------------------------------------------------ 进出
  get hasSession() { return this.net.hasSession; }

  /** 开始匹配：只要同一服务器上还有另一个人也在「开始匹配」，就会自动配对开打 */
  findMatch(deck: DeckSpec, name: string) {
    this.deck = deck; this.name = name || "玩家";
    this.mode = "matching"; this.since = Date.now();
    this.active = true;
    this.root.hidden = true;
    this.showMatching(0);
    this.net.connect();
    if (this.net.status === "open") this.sendQueue();
  }
  /** 页面刷新后用保存的凭证接回正在打的这一局 */
  resume() {
    this.mode = "resuming"; this.active = true;
    this.root.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = "";
    const m = h("div", "gm-modal");
    m.append(h("h2", "", "正在接回对局……"), h("p", "dim", "找不到的话会自动回到主菜单。"));
    this.overlay.append(m);
    this.net.connect();
  }
  private sendQueue() { this.net.queue(this.name, this.deck); }

  private showMatching(n: number) {
    const o = this.overlay;
    o.hidden = false;
    const lost = this.status === "lost";
    const text = lost ? "和服务器断开了，正在重连……" : n > 1 ? `队列里有 ${n} 人` : "等另一位玩家点「开始匹配」，凑齐就自动开打。";
    const tip = o.querySelector(".mm-tip");
    if (tip && o.querySelector(".mm-box")) { tip.textContent = text; return; } // 已经画好了就只改字，别重建按钮（会吞点击）
    o.innerHTML = "";
    const m = h("div", "gm-modal mm-box");
    m.append(h("h2", "", "匹配中……"), h("p", "mm-tip", text), h("p", "dim mm-time", "已等待 0 秒"), h("div", "mm-spin"));
    const foot = h("div", "foot");
    foot.append(btn("取消匹配", "ghost", () => this.cancelMatch()));
    m.append(foot);
    o.append(m);
  }
  private cancelMatch() {
    if (this.mode !== "matching") return;
    this.net.leave();
    this.mode = "idle"; this.active = false;
    this.overlay.hidden = true;
    document.body.classList.remove("game");
    this.onCancel();
  }

  open() { /* 联机入口是 findMatch / resume，不走本地的开局设置 */ }

  close() {
    if (this.mode === "playing" && this.mm.phase !== "over" && !confirm("现在退出会算认输，确定吗？")) return;
    this.leaveToMenu();
  }
  private leaveToMenu(msg?: string) {
    this.token++;
    this.net.leave();
    this.mode = "idle"; this.view = null; this.busy = false;
    super.close();
    this.onLeave(msg);
  }

  // ------------------------------------------------------------ 网络事件
  private onStatus(s: string) {
    this.status = s;
    if (s === "open" && this.mode === "matching") this.sendQueue();
    if (this.mode === "matching") this.showMatching(0);
    if (this.mode === "playing") this.renderTop();
  }
  private onErr(code: string, msg: string) {
    if (code === "no_room" || code === "bad_token") {
      if (this.mode === "resuming" || this.mode === "playing") this.leaveToMenu("这一局已经结束或服务器重启过了");
      return;
    }
    if (code === "bad_deck" && this.mode === "matching") {
      this.mode = "idle"; this.active = false; this.net.leave();
      this.overlay.hidden = true; document.body.classList.remove("game");
      this.onCancel(`卡组被服务器拒绝：${msg}`);
      return;
    }
    this.toast(msg);
    if (this.busy && this.view) { this.busy = false; this.applyView(this.view, true); }
  }
  private onPeer(st: string, name: string, quit?: boolean) {
    if (this.mode !== "playing") return;
    if (st === "left") this.peerNote = quit ? `${name} 离开了对局` : `${name} 掉线了，等他重连`;
    else if (st === "back") this.peerNote = "";
    else if (st === "joined") this.peerNote = "";
    this.log(quit ? `${name} 离开了` : st === "left" ? `${name} 掉线了` : st === "back" ? `${name} 回来了` : "", "dim");
    this.renderTop();
  }
  private tick() {
    if (this.mode === "matching") {
      const t = this.overlay.querySelector(".mm-time");
      if (t) t.textContent = `已等待 ${Math.round((Date.now() - this.since) / 1000)} 秒`;
    }
    if (this.mode === "playing" && this.view) {
      const el = this.root.querySelector(".gm-count");
      if (el) el.textContent = this.countText();
    }
  }
  private countText() {
    const d = this.view?.deadline ?? 0;
    if (!d) return "";
    const left = Math.max(0, Math.round((d - Date.now()) / 1000));
    return this.mm.phase === "assign" ? `定目标还剩 ${left} 秒（超时自动用建议）` : this.mm.phase === "resolved" ? `${left} 秒后自动开始下一轮` : "";
  }

  // ------------------------------------------------------------ 快照 → 画面
  private async onState(v: View) {
    if (v.phase === "lobby") return;
    const first = this.mode !== "playing" || !this.view;
    this.mode = "playing";
    this.applyView(v, first);
  }

  /** 把快照镜像成本地 Match 并刷新画面。resetUi：强制重判界面状态（出错回退时用） */
  private applyView(v: GameView, resetUi = false) {
    const phaseChanged = v.phase !== this.lastPhase || v.round !== this.lastRnd;
    this.busy = false;
    if (phaseChanged) { this.nextSent = false; this.confirmSent = false; }
    if (v.phase === "declare" && (this.lastPhase === "over" || this.lastPhase === "")) {
      this.elLog.innerHTML = "";
      this.log(`对局开始：你 ${v.sides[v.you].cls} 对 ${v.sides[1 - v.you].name} ${v.sides[1 - v.you].cls}`);
      this.rematchSent = false;
    }
    if (phaseChanged && v.phase === "declare" && this.lastPhase === "resolved") this.log(`—— 第 ${v.round} 轮 ——`, "gold");
    this.lastPhase = v.phase; this.lastRnd = v.round;
    this.mm.apply(v);
    this.view = v;
    this.foeName = v.sides[1 - v.you].name;
    this.root.hidden = false;
    document.body.classList.add("game");
    this.refreshAll(true);
    const M = this.mm;
    if (v.phase !== "over") this.overlay.hidden = true;
    switch (v.phase) {
      case "declare":
        if (v.turn === v.you) {
          if (resetUi || phaseChanged || !KEEP_UI.includes(this.ui)) { this.selUid = -1; this.cmp = null; this.setUi("pick_unit"); this.renderAct(); }
        } else { this.setUi("foe"); this.renderAct(); }
        break;
      case "assign":
        if (!M.pendingLate(0).length || v.me.assignDone) {
          if (!v.me.assignDone && !this.confirmSent) { this.confirmSent = true; this.net.confirmAssign(); }
          this.setUi("waitassign"); this.renderAct();
        } else if (this.ui !== "assign" || resetUi || phaseChanged) this.beginAssign();
        else { this.highlight(); this.renderAct(); }
        break;
      case "resolved":
        if (this.ui !== "round_end" || phaseChanged) this.lastProgBefore = [M.progress(0), M.progress(1)];
        this.roundSummary(this.lastProgBefore);
        break;
      case "over":
        this.showOver();
        break;
    }
  }

  private async onResolved(events: any[], v: GameView) {
    const tk = this.token;
    const M = this.mm;
    const before: Record<number, [number, boolean]> = {};
    for (const u of M.R.U) if (u) before[u.uid] = [u.hp, u.down !== -1];
    const progBefore = [M.progress(0), M.progress(1)];
    const hadView = !!this.view && this.mode === "playing";
    this.mode = "playing";
    this.busy = false; this.overlay.hidden = true; this.root.hidden = false;
    document.body.classList.add("game");
    this.lastPhase = v.phase; this.lastRnd = v.round;
    M.apply(v);
    this.view = v;
    this.foeName = v.sides[1 - v.you].name;
    if (!hadView) { this.refreshAll(true); this.lastProgBefore = progBefore; this.roundSummary(progBefore); return; }
    this.setUi("resolving"); this.renderAct();
    this.shown = before;
    this.elLog.innerHTML = "";
    this.log(`—— 第 ${v.round} 轮结算 ——`, "gold");
    for (const raw of events) {
      const ev = M.ev(raw);
      const line = this.eventText(ev, []);
      if (line) this.log(line.text, line.cls);
      this.applyShown(ev);
      if (!this.fast) await sleep(350);
      if (tk !== this.token) return;
    }
    this.refreshAll(true);
    this.lastProgBefore = progBefore;
    this.nextSent = false;
    this.roundSummary(progBefore);
  }

  // ------------------------------------------------------------ 操作：全部变成「发给服务端的意图」
  protected async step() { /* 流程由服务端快照驱动 */ }

  cardClicked(uid: number) {
    if (this.busy) return;
    super.cardClicked(uid);
  }

  protected pass(uid: number) {
    this.busy = true;
    this.net.pass(this.mm.uid(uid));
    this.setUi("sending"); this.renderAct();
  }

  protected declare(start: number) {
    const M = this.mm;
    const r = M.buildAction(0, this.selUid, this.pending, start);
    if (r.err) { this.toast(r.err); return; }
    this.busy = true;
    this.net.submitAct({ uid: M.uid(this.selUid), cls: M.toServer(this.pending), start });
    this.pending = [];
    this.setUi("sending"); this.renderAct();
  }

  protected commitLate() {
    const M = this.mm;
    const pl = M.pendingLate(0);
    if (!pl.length) return;
    this.busy = true;
    this.net.assignLate(pl[0].ord, pl[0].ci, this.latePick.map((x) => M.uid(x)));
    this.latePick = [];
  }
  protected finishAssign() {
    this.busy = true;
    if (!this.confirmSent) { this.confirmSent = true; this.net.confirmAssign(); }
    this.setUi("waitassign"); this.renderAct();
  }
  protected nextRoundClicked() {
    if (this.nextSent) return;
    this.nextSent = true;
    this.net.ready();
    this.roundSummary(this.lastProgBefore);
  }

  // ------------------------------------------------------------ 界面细节
  protected renderTop() {
    super.renderTop();
    const el = this.elTop, v = this.view;
    if (!v) return;
    const opp = v.sides[1 - v.you];
    el.firstElementChild?.replaceChildren(`第 ${v.round} / ${NR.MAX_ROUNDS} 轮 · 联机 · 本轮先宣告：${v.first === v.you ? "你" : opp.name}`);
    const warn: string[] = [];
    if (this.status === "lost") warn.push("和服务器断开了，重连中……");
    if (!opp.connected) warn.push(this.peerNote || "对手已掉线或离开");
    for (const w of warn) el.append(h("div", "gm-warn", w));
    el.append(h("div", "gm-count dim", this.countText()));
  }

  protected roundSummary(progBefore: number[]) {
    super.roundSummary(progBefore);
    const b = this.elAct.querySelector("button.big") as HTMLButtonElement | null;
    if (b && this.nextSent) { b.disabled = true; b.textContent = "等对手点「下一轮」……"; }
  }

  protected renderAct() {
    if (this.ui === "waitassign") {
      this.elAct.innerHTML = "";
      this.elAct.append(h("h3", "green", "目标已定，等对手定目标……"), h("small", "dim", "对手也在偷偷定，双方都确认（或超时）后一起揭晓。"));
      return;
    }
    if (this.ui === "sending") {
      this.elAct.innerHTML = "";
      this.elAct.append(h("h3", "gold", "已提交，等服务器确认……"));
      return;
    }
    super.renderAct();
  }

  protected showOver() {
    const M = this.mm, o = this.overlay, v = this.view;
    this.setUi("over");
    o.hidden = false; o.innerHTML = "";
    const m = h("div", "gm-modal");
    const w = M.winner;
    m.append(h("h1", w === 0 ? "win" : w === 1 ? "lose" : "", w === 0 ? "胜利！" : w === 1 ? "落败" : "平局"));
    const opp = v ? v.sides[1 - v.you] : null;
    if (opp && !opp.connected) m.append(h("p", "red", this.peerNote || "对手已经离开了"));
    for (let s = 0; s < 2; s++) m.append(h("p", "", `${s === 0 ? "你" : this.foeName}（${M.clsOf(s)}）完成度 ${Math.round(M.progress(s) * 100)}%`));
    m.append(h("p", "dim", `共 ${M.rnd} 轮`));
    const row = h("div", "foot");
    const again = btn(this.rematchSent ? "等对手点「再来一局」……" : "再来一局", "primary", () => {
      if (this.rematchSent) return;
      this.rematchSent = true; this.net.ready(); this.showOver();
    });
    again.disabled = this.rematchSent || !!(opp && !opp.connected);
    row.append(again, btn("回到主菜单", "ghost", () => this.leaveToMenu()));
    m.append(row);
    o.append(m);
  }
}

function btn(text: string, cls: string, on: () => void) {
  const b = h("button", cls, text);
  b.addEventListener("click", on);
  return b;
}

// 战斗界面：简化版。所有信息放在随从旁边的面板里；右上角回合/行动点/数字牌；右下角操作按钮。只显示双方公开信息。
import { Match, P2, configureRules, setUnitNames, type ReplayEvent } from "./engine/api";
import { KW_TIP } from "./setup";
import { randDeck } from "./engine/deck";
import { deckOk } from "./engine/api";
import { presetDeck } from "./deck/words";
import { STYLES, styleOf, type StyleDef } from "./styles";
import { loadArt, type ArtSet } from "./art";
import { Dock } from "./dock";
import { VfxCastPlayer } from "./vfx/player";
import "./layout.css";
import type { BattleView, CastPlayer, Guide, Settings } from "./types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const POS_NAME = ["词位", "数位", "速位"];
const POS_GLYPH = ["词", "数", "速"];
function posTip(i: number): string {
  if (!P2.POS) return "";
  if (i === 0) return `词位：每多一段（并/连环）少付 ${P2.POS_WORD} 点行动点${P2.POS_WORD_FREE ? "；第一个「并」不占词牌" : ""}`;
  if (i === 1) return `数位：用数字牌时牌面 +${P2.POS_NUM}（数字 ≤${P2.POS_NUM + 1} 免牌）${P2.POS_NUM_ONE ? "，只作用于最大的数字" : ""}`;
  return P2.POS3 === "speed" ? `速位：起手最早时间提前 ${P2.POS_SPEED} 秒` : "引用位：引用词不冷却，「全程」半价";
}
/** 教学/剧情钩子（story/ 用）。全部可选；不传则行为与原来完全一致 */
export interface BattleHooks {
  /** 自定义风格（随从名字/配色）：替代随机的 foe 风格 */
  styles?: { me: StyleDef; foe: StyleDef };
  foeDeck?: Record<string, number>;
  /** Match 建好后调用（改血量/行动点/数字牌/让随从缺席） */
  setup?(m: Match): void;
  /** 不上场的随从（隐藏） */
  absent?: number[];
  /** 教程引导：某个随从开始拼句时返回当前的 Guide（限制可用词 / 高亮下一张词牌）；null = 自由 */
  guide?: (m: Match, u: number) => Guide | null;
  /** 脚本化电脑：返回 null 则走默认 AI */
  foeMove?(m: Match): { unit: number; passed: boolean; text: string; start: number } | null;
  onMount?(b: Battle): void;
  /** 每轮宣告开始前 / 结算演出之后（可 await 对话） */
  onRoundStart?(b: Battle): Promise<void> | void;
  onRoundEnd?(b: Battle): Promise<void> | void;
  /** 玩家点「宣告」：返回字符串 = 拒绝并显示提示 */
  beforeDeclare?(u: number, cl: import("./engine/api").Sentence, start: number, m: Match): string | null;
  afterDeclare?(u: number, m: Match): void;
  /** 点「不出手」：返回字符串 = 拒绝（教程里有引导步骤的随从不许跳过） */
  beforePass?(u: number, m: Match): string | null;
  /** 点「结束宣告」：返回字符串 = 拒绝 */
  beforeEnd?(m: Match): string | null;
  /** 允许「撤回」按钮 */
  undo?: boolean;
  /** 速度默认值 0..3 */
  onTick?(b: Battle): void;
}
export interface BattleResult { match: Match; won: "win" | "lose" | "draw" }

export class Battle {
  m: Match;
  root: HTMLElement;
  stage!: HTMLElement;
  dock!: Dock;
  cast: CastPlayer = new VfxCastPlayer();
  private disp = { hp: Array(6).fill(0) as number[], sh: Array(6).fill(0) as number[] };
  private typing = new Map<number, string>();
  private unitEls: HTMLElement[] = [];
  private foeStyle: StyleDef;
  private myStyle: StyleDef;
  private speedIdx = 0;
  private arts: ArtSet[] = [];
  private waitHuman: ((a: "act" | "end") => void) | null = null;
  private waitBtn: ((v: void) => void) | null = null;
  hooks?: BattleHooks;
  private snaps: unknown[] = [];
  private busy = false;
  private aborted = false;
  private collapsed = new Set<number>();
  auto: boolean;
  onEnd: (r: BattleResult) => void;
  onExit: () => void;
  constructor(root: HTMLElement, st: Settings, opts: { auto?: boolean; fast?: boolean; speed?: number; onEnd: (r: BattleResult) => void; onExit: () => void; seed?: number; hooks?: BattleHooks }) {
    this.hooks = opts.hooks;
    this.root = root; this.onEnd = opts.onEnd; this.onExit = opts.onExit; this.auto = !!opts.auto;
    if (opts.fast) this.speedIdx = 2;
    if (opts.speed !== undefined) this.speedIdx = opts.speed;
    configureRules(st.rules, st.customRules);
    const first = st.first === "random" ? (Math.random() < 0.5 ? 0 : 1) : st.first === "me" ? 0 : 1;
    this.myStyle = styleOf(st.styleId);
    const others = STYLES.filter((s) => s.id !== st.styleId);
    this.foeStyle = opts.hooks?.styles?.foe ?? others[Math.floor(Math.random() * others.length)];
    if (opts.hooks?.styles) this.myStyle = opts.hooks.styles.me;
    setUnitNames(this.myStyle.names, this.foeStyle.names);
    const kws = (st.kws ?? []).map((k) => (k === "首挡" || k === "不屈" ? k : ["首挡", "不屈"][Math.floor(Math.random() * 2)]));
    const foe = st.foe ?? { mode: "random", preset: "", deck: {} };
    const pd = foe.mode === "preset" ? presetDeck(foe.preset) : null;
    const foeDeck = foe.mode === "custom" ? foe.deck : pd && deckOk(pd) && Object.keys(pd).length ? pd : randDeck(Math.random);
    const foeDeckF = opts.hooks?.foeDeck ?? foeDeck;
    this.m = new Match({ first, myDeck: st.deck, foeDeck: foeDeckF, tier: st.tier, seed: opts.seed, kws: kws.length === 3 ? kws : null });
    opts.hooks?.setup?.(this.m);
    this.m.rulesKind = st.rules;
    this.hp0 = Math.max(...this.m.s.hp);
    for (let u = 0; u < 6; u++) { this.disp.hp[u] = this.m.s.hp[u]; this.disp.sh[u] = this.m.s.sh[u]; }
  }
  destroy() { this.aborted = true; this.dock?.destroy(); this.root.innerHTML = ""; this.waitHuman?.("end"); this.waitBtn?.(); }

  // ---------- 视图 ----------
  private styleFor(u: number) { return u < 3 ? this.myStyle : this.foeStyle; }
  mount() {
    const r = this.root; r.innerHTML = "";
    const st = document.createElement("div"); st.className = "dj-stage"; this.stage = st; if (this.hooks) st.classList.add("teach");
    st.style.setProperty("--me", this.myStyle.accent); st.style.setProperty("--foe", this.foeStyle.accent);
    st.innerHTML = `<div class="cam"><div class="bg"></div><div class="vig"></div>
      <div class="field"><div class="col me"></div><div class="col foe"></div></div></div>
      <div class="center"><div class="clock" hidden></div><div class="banner" hidden><b></b><span></span></div></div>
      <div class="hud"></div>
      <div class="acts"><button class="bt undo" data-a="undo" hidden>撤回 ↶</button><button class="bt skip" data-a="skip" hidden>跳过本句 ⏭</button><button class="bt skip" data-a="skipall" hidden>跳过全部</button><button class="bt main" data-a="main"></button><div class="menuwrap"><button class="bt" data-a="menu">菜单 ☰</button><div class="pop" hidden>
        <button data-a="speed">动画速度：<b class="spd"></b></button><button data-a="auto">电脑代打：<b class="autov"></b></button><button data-a="rules">规则说明</button><button data-a="exit">退出对局</button></div></div></div>
      <div class="status" aria-live="polite"></div>`;
    r.appendChild(st);
    const mk = (u: number) => {
      const s = this.styleFor(u), side = u < 3 ? "me" : "foe";
      const d = document.createElement("div");
      d.className = `unit ${side} pos${u % 3}`; d.dataset.u = String(u); d.dataset.style = s.id;
      d.style.setProperty("--c", s.accent); d.style.setProperty("--c2", s.accent2);
      d.innerHTML = `<div class="panel"><div class="p-head"><span class="pos" title="${esc(posTip(u % 3))}">${P2.POS ? POS_NAME[u % 3] : ""}</span><b class="nm">${s.names[u % 3]}</b>${side === "me" ? `<button class="pass" title="这个随从本轮不出手">不出手</button>` : ""}<button class="fold" aria-label="折叠">▾</button></div>
        <div class="hpbar"><i class="hpfill"></i><i class="shfill"></i><b class="hptxt"></b></div>
        <div class="chips"></div><div class="stand"></div><div class="decl"></div></div>
        <div class="fig"><img alt="" draggable="false" /><i class="base"></i><span class="floats"></span></div>`;
      (side === "me" ? st.querySelector(".col.me") : st.querySelector(".col.foe"))!.appendChild(d);
      this.unitEls[u] = d;
      loadArt(s.unitArt?.[u % 3] ?? s.artDir, s.accent, s.accent2, u % 3, POS_GLYPH[u % 3]).then((a) => { this.arts[u] = a; d.querySelector("img")!.src = a.idle; });
      d.addEventListener("click", (e) => this.onUnitClick(u, e));
    };
    [0, 1, 2, 3, 4, 5].forEach(mk);
    this.dock = new Dock({
      match: this.m, stage: st, unitEl: (u) => this.unitEls[u], label: (u) => `${this.styleFor(u).names[u % 3]}${P2.POS ? "·" + POS_NAME[u % 3] : ""}`,
      canPick: (u) => this.canPick(u),
      onDeclare: (u, cl, start) => this.handleDeclare(u, cl, start),
      onPass: (u) => { this.m.pass(u); this.render(); this.waitHuman?.("act"); },
      guideFor: (u) => this.hooks?.guide?.(this.m, u) ?? null,
      passDenied: (u) => this.hooks?.beforePass?.(u, this.m) ?? null,
    });
    st.addEventListener("click", (e) => { const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a; if (a) this.onAct(a); else st.querySelector<HTMLElement>(".pop")!.hidden = true; });
    this.render();
    this.hooks?.onMount?.(this);
  }
  render() {
    const m = this.m;
    for (let u = 0; u < 6; u++) {
      const el = this.unitEls[u], v = m.unitView(u), side = u < 3 ? 0 : 1;
      const hp = this.disp.hp[u], sh = this.disp.sh[u];
      const mx = Math.max(this.hp0, hp);
      el.classList.toggle("absent", !!this.hooks?.absent?.includes(u));
      el.classList.toggle("dead", hp <= 0 && !v.alive);
      el.querySelector<HTMLElement>(".hpfill")!.style.width = `${Math.max(0, Math.min(100, (hp / mx) * 100))}%`;
      const shEl = el.querySelector<HTMLElement>(".shfill")!; shEl.style.width = `${Math.min(100, (sh / mx) * 100)}%`;
      el.querySelector<HTMLElement>(".hptxt")!.textContent = `${Math.max(0, hp)}/${mx}${sh > 0 ? `  盾${sh}` : ""}`;
      const chips: string[] = [];
      if (v.kw) chips.push(`<em class="kw${v.kwUsed ? " used" : ""}" title="关键词：${KW_TIP[v.kw] ?? ""}${v.kwUsed ? "（本轮已用）" : ""}">${v.kw}</em>`);
      for (const s of v.sts) chips.push(`<em class="st" title="状态：${s.kind} ${s.lvl}级，还剩 ${s.left} 轮">${s.kind}${s.lvl}<small>${s.left}轮</small></em>`);
      if (v.redir) chips.push(`<em class="st" title="转移：打向它的伤害改打出手的人">转移</em>`);
      el.querySelector<HTMLElement>(".chips")!.innerHTML = chips.join("");
      el.querySelector<HTMLElement>(".stand")!.innerHTML = v.standing.map((s) => `<div class="sl" title="长期句子"><i>长期</i>${esc(s.text)}<small>${s.left >= 99 ? "" : `${s.left}轮`}</small></div>`).join("");
      const dec = el.querySelector<HTMLElement>(".decl")!;
      const typed = this.typing.get(u);
      if (this.dock?.unit === u) { /* 拼句中：句子条由 Dock 管 */ }
      else if (typed !== undefined) dec.innerHTML = `<i>拼句中</i><span class="tx">${esc(typed)}</span><span class="caret"></span>`;
      else if (v.decl) dec.innerHTML = `<i>本轮</i><span class="tx">${esc(v.decl.text)}</span><small>起手 ${v.decl.start} 秒 · ⚡${v.decl.cost}</small>`;
      else if (v.done && v.alive) dec.innerHTML = `<i class="np">本轮不出手</i>`;
      else dec.innerHTML = "";
      el.classList.toggle("ready", side === 0 && this.canPick(u) && (this.dock?.unit ?? -1) < 0);
      el.classList.toggle("folded", this.collapsed.has(u));
    }
    // 右上角：轮数 / 行动点 / 数字牌
    const h = m.hud();
    this.stage.querySelector<HTMLElement>(".hud")!.innerHTML = `
      <div class="h-top"><b>第 ${h.rnd}<small>/${h.rounds}</small> 轮</b><span class="fst">${h.first === 0 ? "我先手" : "电脑先手"}</span>${h.heat ? `<span class="heat" title="过热：每轮每个随从受伤">过热 −${h.heat}</span>` : ""}</div>
      <div class="h-ap"><span class="me">我 ⚡<b>${h.ap[0]}</b></span><span class="foe">敌 ⚡<b>${h.ap[1]}</b></span></div>
      <div class="h-cards"><span class="lb">我方数字牌</span>${h.myCards.map((c) => `<i class="card${c.cd ? " cd" : ""}" title="${c.cd ? `冷却 ${c.cd} 轮` : "可用"}">${c.v}${c.cd ? `<small>${c.cd}</small>` : ""}</i>`).join("")}</div>
      <div class="h-foe"><span class="lb">对手数字牌</span><b>${h.foeCards}</b> 张</div>`;
    this.renderMain();
  }
  private hp0 = 16;
  private mainState: "none" | "end" | "resolve" | "next" | "wait" = "none";
  private renderMain() {
    const b = this.stage.querySelector<HTMLButtonElement>('[data-a="main"]')!;
    const labels = { none: "…", end: "结束宣告", resolve: "结算 ▶", next: "下一轮 ▶", wait: "电脑出手中…" } as const;
    b.textContent = labels[this.mainState]; b.disabled = this.mainState === "none" || this.mainState === "wait"; b.classList.toggle("go", this.mainState === "resolve" || this.mainState === "next");
    this.stage.querySelector<HTMLElement>('[data-a="undo"]')!.hidden = !(this.hooks?.undo && this.snaps.length && this.mainState === "end");
    this.stage.querySelector<HTMLElement>(".spd")!.textContent = ["正常", "快", "关闭"][this.speedIdx];
    this.stage.querySelector<HTMLElement>(".autov")!.textContent = this.auto ? "开" : "关";
    this.dock?.light();
  }
  private setStatus(t: string) { this.stage.querySelector<HTMLElement>(".status")!.textContent = t; }
  private canPick(u: number) { return this.mainState === "end" && u < 3 && this.m.canAct(u) && !this.busy; }

  // ---------- BattleView（给 CastPlayer 用） ----------
  view: BattleView = {
    unitEl: (u) => this.unitEls[u], get stageEl() { return (this as any)._s; },
    setDisplay: (u, hp, sh) => { this.disp.hp[u] = hp; this.disp.sh[u] = sh; this.render(); },
    getDisplay: (u) => ({ hp: this.disp.hp[u], sh: this.disp.sh[u] }),
    float: (u, text, cls) => { const f = document.createElement("span"); f.className = `fl ${cls}`; f.textContent = text; f.style.setProperty("--dx", `${(Math.random() - 0.5) * 36}px`); this.unitEls[u].querySelector(".floats")!.appendChild(f); setTimeout(() => f.remove(), 1400 / this.view.speed() + 300); },
    flash: (u, cls) => { const el = this.unitEls[u]; el.classList.remove("fx-hit", "fx-heal", "fx-shield", "fx-cast"); void el.offsetWidth; el.classList.add("fx-" + cls); if (cls === "hit") this.pose(u, "hurt", 600); else if (cls === "cast") this.pose(u, "cast", 600); setTimeout(() => el.classList.remove("fx-" + cls), 600); },
    markDown: (u) => { this.unitEls[u].classList.add("dead", "fall"); },
    banner: (text, sub) => { const b = this.stage.querySelector<HTMLElement>(".banner")!; b.hidden = false; b.querySelector("b")!.textContent = text; b.querySelector("span")!.textContent = sub ?? ""; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); },
    clock: (sec) => { const c = this.stage.querySelector<HTMLElement>(".clock")!; if (sec === null) { c.hidden = true; this.stage.querySelector<HTMLElement>(".banner")!.hidden = true; } else { c.hidden = false; c.textContent = `第 ${sec} 秒`; } },
    speed: () => [1, 2, 12][this.speedIdx],
  };

  // ---------- 交互 ----------
  /** 2D Q 版立绘有 cast / hurt 单张时临时换图，没有就保持 idle */
  private pose(u: number, p: "cast" | "hurt", ms: number) {
    const a = this.arts[u], img = this.unitEls[u]?.querySelector("img"); const url = a?.[p];
    if (!a || !img || !url) return;
    img.src = url; setTimeout(() => { img.src = a.idle; }, ms);
  }
  private onUnitClick(u: number, e: Event) {
    const t = e.target as HTMLElement;
    if (t.closest(".fold")) { this.collapsed.has(u) ? this.collapsed.delete(u) : this.collapsed.add(u); this.render(); e.stopPropagation(); return; }
    if (t.closest(".pass")) { e.stopPropagation(); const why = this.canPick(u) ? this.hooks?.beforePass?.(u, this.m) : null; if (why) { this.setStatus(why); this.hooks?.onTick?.(this); return; } if (this.canPick(u)) { this.dock.cancel(); this.m.pass(u); this.render(); this.waitHuman?.("act"); } return; }
    if (t.closest(".comp, .strip")) return;
    if (!this.canPick(u)) return;
    if (this.dock.unit === u) { this.dock.cancel(); this.render(); return; }
    this.dock.begin(u); this.render();
  }
  private handleDeclare(u: number, cl: import("./engine/api").Sentence, start: number) {
    const err = this.hooks?.beforeDeclare?.(u, cl, start, this.m);
    if (err) { this.setStatus(err); this.render(); this.hooks?.onTick?.(this); return; }
    const snap = this.hooks?.undo ? this.m.snap() : null;
    if (this.m.declare(u, cl, start)) { if (snap) this.snaps.push(snap); this.hooks?.afterDeclare?.(u, this.m); this.render(); this.waitHuman?.("act"); } else { this.setStatus("这句现在说不了"); this.render(); }
  }
  /** 撤回最近一句（只在宣告阶段、电脑没动之前） */
  undo() {
    const sn = this.snaps.pop(); if (!sn || this.mainState !== "end") return;
    this.dock.cancel(); this.m.restore(sn); this.render(); this.waitHuman?.("act");
  }
  private onAct(a: string) {
    const pop = this.stage.querySelector<HTMLElement>(".pop")!;
    if (a !== "menu") pop.hidden = true;
    if (a === "menu") pop.hidden = !pop.hidden;
    else if (a === "main") {
      if (this.mainState === "end") { const err = this.hooks?.beforeEnd?.(this.m); if (err) { this.setStatus(err); this.hooks?.onTick?.(this); return; } this.dock.cancel(); this.m.passRest(); this.render(); this.waitHuman?.("end"); }
      else if (this.mainState === "resolve" || this.mainState === "next") this.waitBtn?.();
    }
    else if (a === "skip") this.cast.skip();
    else if (a === "skipall") this.cast.skipAll?.();
    else if (a === "undo") this.undo();
    else if (a === "speed") { this.speedIdx = (this.speedIdx + 1) % 3; this.renderMain(); }
    else if (a === "auto") { this.auto = !this.auto; this.renderMain(); if (this.auto) { this.dock.cancel(); this.waitHuman?.("act"); } }
    else if (a === "rules") this.showRules();
    else if (a === "exit") { if (confirm("退出这局？")) { this.destroy(); this.onExit(); } }
  }
  private showRules() {
    const d = document.createElement("div"); d.className = "dj-modal";
    d.innerHTML = `<div class="box"><h3>规则说明</h3><ul>
      <li>每轮双方交替给随从宣告一句话（或不出手），宣告后按「起手秒」从早到晚依次生效。</li>
      <li>句子要花行动点；数字大于 1 要用数字牌（用过冷却 2 轮）；带「并 / 减伤 / 定时…」的要消耗卡组里的进阶词。</li>
      <li>起手秒不能早于该句的最早起手秒；起手越晚，越能看清对手本轮在说什么。</li>
      <li>随从站位：词位 / 数位 / 速位，各有小加成（悬停徽章看说明）。</li>
      <li>长期句子会挂在随从身上，之后每轮触发；随从倒下就消失。</li>
      <li>过热：到一定轮数后每轮所有随从掉血，越来越多。</li>
      <li>消灭对方 3 个随从获胜；打满轮数则比活着的随从与总血量。</li></ul><button data-close>知道了</button></div>`;
    d.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-close]") || e.target === d) d.remove(); });
    this.stage.appendChild(d);
  }

  // ---------- 流程 ----------
  private async typeInto(u: number, text: string) {
    this.typing.set(u, "");
    const chunks = text.match(/「[^」]*」|\d+|[^\s\d「」]{1,2}|\s+|./g) ?? [text];
    let acc = "";
    const el = this.unitEls[u];
    el.classList.add("fx-cast");
    for (const c of chunks) { acc += c; this.typing.set(u, acc); this.render(); await sleep(this.speedIdx === 2 ? 1 : 45 / this.view.speed()); }
    this.typing.delete(u);
    el.classList.remove("fx-cast"); this.render();
  }
  private humanTurn(): Promise<"act" | "end"> {
    this.mainState = "end"; this.setStatus("轮到你：把词牌拖到随从头顶的句子条上"); this.render(); this.dock.refresh();
    return new Promise((res) => { this.waitHuman = (a) => { this.waitHuman = null; res(a); }; });
  }
  private button(state: "resolve" | "next", label: string): Promise<void> {
    this.mainState = state; this.setStatus(label); this.dock.cancel(); this.render();
    return new Promise((res) => { this.waitBtn = () => { this.waitBtn = null; res(); }; });
  }
  private autoHuman() {
    const m = this.m;
    const us = m.myUnits().filter((u) => m.canAct(u));
    // 随机挑一个随从，随机挑一句可说的话（走和手点同一条 declare 路径）
    const u = us[Math.floor(Math.random() * us.length)];
    const cands = m.legalSentences(u, 24);
    if (cands.length && Math.random() < 0.85) { const c = cands[Math.floor(Math.random() * cands.length)]; if (m.declare(u, c.cl, Math.min(m.tl(), c.minStart + Math.floor(Math.random() * 3)))) return; }
    m.pass(u);
  }
  async run() {
    this.mount();
    const m = this.m;
    this.hp0 = Math.max(...m.s.hp);
    this.render();
    while (!this.aborted) {
      this.snaps.length = 0;
      if (this.hooks?.onRoundStart) { this.mainState = "none"; this.render(); await this.hooks.onRoundStart(this); if (this.aborted) return; }
      // ---- 宣告阶段 ----
      for (let g = 0; g < 40 && !this.aborted; g++) {
        const w = m.who(); if (w === -1) break;
        if (w === 1) {
          this.mainState = "wait"; this.setStatus("电脑在想…"); this.dock.cancel(); this.render();
          this.busy = true;
          await sleep(this.speedIdx === 2 ? 0 : 380 / this.view.speed());
          this.snaps.length = 0;
          const mv = this.hooks?.foeMove?.(m) ?? m.aiMove();
          if (mv.passed) { this.render(); await sleep(this.speedIdx === 2 ? 0 : 260 / this.view.speed()); }
          else { await this.typeInto(mv.unit, mv.text); await sleep(this.speedIdx === 2 ? 0 : 220 / this.view.speed()); }
          this.busy = false;
        } else {
          if (this.auto) { this.autoHuman(); this.render(); await sleep(this.speedIdx === 2 ? 0 : 200); continue; }
          const a = await this.humanTurn();
          if (this.aborted) return;
          if (a === "end") continue;
        }
      }
      if (this.aborted) return;
      // ---- 结算 ----
      this.render();
      if (this.auto) await sleep(this.speedIdx === 2 ? 0 : 400); else await this.button("resolve", "双方宣告完毕，点「结算」开始演出");
      if (this.aborted) return;
      this.mainState = "none"; this.setStatus(""); this.busy = true;
      const pre = { hp: m.s.hp.slice(), sh: m.s.sh.slice() };
      for (let u = 0; u < 6; u++) { this.disp.hp[u] = pre.hp[u]; this.disp.sh[u] = pre.sh[u]; }
      const events: ReplayEvent[] = m.resolve();
      this.stage.querySelectorAll<HTMLElement>('[data-a^="skip"]').forEach((b) => (b.hidden = false)); this.render();
      (this.view as any)._s = this.stage;
      await this.cast.play(events, this.view);
      (window as any).__vfxCheck?.(this);
      this.stage.querySelectorAll<HTMLElement>('[data-a^="skip"]').forEach((b) => (b.hidden = true));
      for (let u = 0; u < 6; u++) { this.disp.hp[u] = Math.max(0, m.s.hp[u]); this.disp.sh[u] = m.s.sh[u]; }
      this.unitEls.forEach((el, u) => el.classList.toggle("fall", !m.unitAlive(u)));
      this.busy = false; this.render();
      if (this.hooks?.onRoundEnd) { await this.hooks.onRoundEnd(this); if (this.aborted) return; }
      if (m.over()) {
        this.mainState = "none"; this.render();
        await sleep(this.speedIdx === 2 ? 0 : 1100);
        if (!this.aborted) this.onEnd({ match: m, won: m.outcome()! });
        return;
      }
      if (this.auto) await sleep(this.speedIdx === 2 ? 0 : 300); else await this.button("next", "本轮结算完了，点「下一轮」");
      if (this.aborted) return;
      m.nextRound();
      for (let u = 0; u < 6; u++) { this.disp.hp[u] = m.s.hp[u]; this.disp.sh[u] = m.s.sh[u]; }
      this.render();
    }
  }
}

// 数字牌模式 · 真人对电脑的完整对局流程（移植自 nc_battle.gd + nc_setup.gd）：
// 开局设置 → 每轮轮流宣告（拼句 + 辅助轮 → 选目标 → 定起手秒数）→（择流定目标）→ 结算回放 → 轮末 → 胜负
// 画面是 3D 场景里的卡（血量、外壳、读数面板），操作都在右侧的操作栏里。
import type { UnitCard } from "./unitCard";
import type { SentencePanel } from "./sentencePanel";
import { Match } from "./engine/match";
import * as NR from "./engine/rules";
import * as NE from "./engine/engine";
import * as NT from "./engine/text";
import { Composer, BASIC_DESC, actTokens, type Tok } from "./engine/composer";
import { suggest, suggestLate, assignLate, PASS_GAIN } from "./engine/ai";
import { loadoutOf } from "./engine/loadout";
import { actionToks, cardIndex } from "./live";
import type { CastShow } from "./fx/castShow";
import "./game.css";
/* eslint-disable @typescript-eslint/no-explicit-any */

const MARK = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
const mk = (n: number) => MARK[Math.min(n, MARK.length - 1)];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const uidOfCard = (i: number) => (i >= 3 ? i - 3 : i + 3);

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function btn(text: string, cls = "", on?: (e: MouseEvent) => void) {
  const b = h("button", cls, text);
  if (on) b.addEventListener("click", on);
  return b;
}

interface Settings { cls: NR.Cls; words: Record<string, number>; kws: string[]; hp: number[]; foe: NR.Cls | "随机" }
const DEFAULT: Settings = { cls: "并", words: { ...NR.PRESETS["并"].words }, kws: [...NR.PRESETS["并"].kws], hp: [NR.W.HP, NR.W.HP, NR.W.HP], foe: "随机" };

export interface GameCtx {
  cards: UnitCard[];
  panels: SentencePanel[];
  onChange: () => void;     // 时间轴等要重画
  onToggle: (on: boolean) => void;
  /** 技能演出（可选）：结算回放时每一句演一遍；不传 = 原来的逐事件回放 */
  cast?: CastShow;
  /** 随从在屏幕上的位置（悬浮面板贴着它弹出）；不传 = 面板放在屏幕中间 */
  anchor?: (uid: number) => [number, number];
  /** "top" = 横版布局：没有右边的栏，只有顶部一小块（回合、双方生命/成长/行动点、数字牌）+ 底部中间的操作卡；
   *  不传 = 原来的右侧窄条（教程页还在用） */
  layout?: "strip" | "top";
}

// ---- [campaign hook] 可选钩子：教程盖在正常对局上用。不传 hooks 时行为和原来完全一样。
export type GameClickKind = "unit" | "pass" | "word" | "num" | "undo" | "clear" | "restart" | "assist" | "done" | "target" | "act" | "time" | "late" | "drag" | "box";
export interface GameClick { kind: GameClickKind; value?: string | number; uid?: number; stage: string; tokens: number; clause: number; picked: number[]; latePick: number[] }
/** 当前该点什么（高亮用） */
export interface GameHl { kind: GameClickKind; value?: string | number; uid?: number; drag?: { from: number; to: number } }
export interface GameHooks {
  /** 拼句台只开放这些词（没教到的词不出现） */
  allow?: string[];
  /** 对手轮到宣告时接管；返回 true = 已经宣告（不再走电脑 AI） */
  foeStep?: (M: Match) => boolean;
  /** 点击拦截：返回字符串 = 拒绝并弹出这句提示；返回 null = 放行 */
  before?: (c: GameClick) => string | null;
  /** 当前该点什么；返回 null = 不高亮（自由操作） */
  expect?: (c: GameClick) => GameHl | null;
  /** 每一轮开始（宣告之前）调用，go() 之后才开始这一轮的宣告；可用来放剧情对话 */
  roundStart?: (M: Match, go: () => void) => void;
  /** 一轮结算完、轮末面板画好之后调用 */
  roundEnd?: (M: Match) => void;
  /** 每次操作栏画完之后调用（教程据此摆气泡 / 聚光灯） */
  rendered?: (c: GameClick) => void;
  /** 对局结束；返回 true = 教程接管结果页（不弹默认的结果弹窗） */
  over?: (M: Match) => boolean;
  /** 点「退出」时调用，代替默认的退出 */
  exit?: () => void;
}

export class Game {
  active = false;
  protected foeName = "电脑";
  hooks: GameHooks | null = null;
  /** 当前高亮的随从卡（教程摆气泡用） */
  hlCards: number[] = [];
  M = new Match();
  protected ui = "idle";
  protected S: Settings = structuredClone(DEFAULT);
  protected root = h("aside", "gm");
  protected elTop = h("div", "gm-top");
  protected elUnits = h("div", "gm-units");
  protected elHand = h("div", "gm-hand");
  protected elAct = h("div", "gm-act");
  protected elDecl = h("div", "gm-decl");
  protected elLog = h("div", "gm-log");
  protected overlay = h("div", "gm-overlay");
  protected selUid = -1;
  protected pending: any[] = [];
  protected pendI = 0;
  protected cmp: Composer | null = null;
  protected shown: Record<number, [number, boolean]> = {};
  protected latePick: number[] = [];
  protected fast = false;
  protected token = 0;
  // ---- 新界面：右边缘窄条（回合/得分/行动点/血条/数字牌，底部是当前操作卡）+ 随从旁的悬浮面板 + 日志抽屉。
  //      ?style=classic 时保持原来的右侧操作栏（pl = false）。
  protected pl = !document.documentElement.classList.contains("classic");
  protected float = h("div", "gm gm-float");
  protected elPop = h("div", "gm-pop");
  protected elPopHead = h("div", "gm-pop-head");
  protected elPopBody = h("div", "gm-pop-body");
  protected elDock = h("div", "gm-dock");
  protected elDrawer = h("div", "gm-drawer");
  protected popUid = -1;
  protected popMode: "" | "info" | "act" = "";
  protected popMax = false;
  /** 横版布局：顶部一小块代替右栏 */
  protected topLayout = false;
  protected elRound = h("div", "gm-roundbar");
  protected elMenu = h("div", "gm-menubar");

  constructor(protected ctx: GameCtx) {
    this.root.hidden = true;
    this.overlay.hidden = true;
    if (this.pl) {
      this.topLayout = ctx.layout === "top";
      this.root.classList.add("pl");
      if (this.topLayout) this.root.classList.add("tp");
      this.elDock.append(this.elAct);
      this.elDock.hidden = true;
      if (this.topLayout) this.root.append(this.elTop);                 // 顶部一小块；人物列表不要了（头顶名牌里有血条）
      else this.root.append(this.elTop, this.elUnits, this.elHand, this.elDock);
      this.elPop.append(this.elPopHead, this.elPopBody);
      this.elPop.hidden = true;
      this.elDrawer.append(this.elDecl, this.elLog);
      this.elDrawer.hidden = true;
      if (this.topLayout) this.float.append(this.elRound, this.elMenu, this.elDock, this.elPop, this.elDrawer); else this.float.append(this.elPop, this.elDrawer);
      this.elPop.addEventListener("animationend", () => this.elPop.classList.remove("nudge"));
      document.body.append(this.root, this.float, this.overlay);
      window.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || !this.active || !this.popMode || !this.overlay.hidden || this.ctx.cast?.active) return;
        this.dismissPop();
      });
      window.addEventListener("resize", () => this.placePop());
    } else {
      this.root.append(this.elTop, this.elUnits, this.elHand, this.elAct, this.elDecl, this.elLog);
      document.body.append(this.root, this.overlay);
    }
    try { const s = localStorage.getItem("nc-settings"); if (s) this.S = { ...DEFAULT, ...JSON.parse(s) }; } catch { /* 没有存储也能用 */ }
    if (NR.hpProblem(this.S.hp, NR.W.POOL)) this.S.hp = [...DEFAULT.hp];   // 旧版存的是总和 21 的分配
  }

  // ------------------------------------------------------------ 进出
  /** 进入 / 离开对局界面时给 body 打标记（横版布局再多一个 gm-top：去掉右栏占的宽度） */
  protected enterBody() { document.body.classList.add("game"); document.body.classList.toggle("gm-top", this.topLayout); }
  protected leaveBody() { document.body.classList.remove("game", "gm-top"); }
  open() {
    this.hooks = null;
    this.active = true;
    this.enterBody();
    this.root.hidden = false;
    this.ctx.onToggle(true);
    this.showSetup();
  }
  /** [campaign hook] 用给定的对局直接开始（跳过开局设置），并挂上钩子 */
  startLevel(match: Match, hooks: GameHooks) {
    this.hooks = hooks;
    this.active = true;
    document.body.classList.add("game");
    this.root.hidden = false;
    this.overlay.hidden = true;
    this.ctx.onToggle(true);
    this.M = match;
    this.token++;
    this.ui = "idle";
    this.fast = false;
    this.elLog.innerHTML = "";
    this.refreshAll(true);
    this.roundBegin();
  }
  private roundBegin() {
    const hk = this.hooks;
    if (hk?.roundStart) hk.roundStart(this.M, () => { this.refreshAll(true); void this.step(); });
    else void this.step();
  }
  private clickInfo(kind: GameClickKind, extra: Partial<GameClick> = {}): GameClick {
    const pr = this.pending[this.pendI];
    return { kind, stage: this.ui, tokens: this.cmp?.tokens.length ?? 0, clause: this.pendI, picked: pr?.tg ? [...pr.tg] : [], latePick: [...this.latePick], ...extra };
  }
  /** 拦截：返回 false = 被教程拒绝（已弹提示） */
  private gate(kind: GameClickKind, extra: Partial<GameClick> = {}): boolean {
    const e = this.hooks?.before?.(this.clickInfo(kind, extra));
    if (e) { this.toast(e); return false; }
    return true;
  }
  private hl(kind: GameClickKind, value?: string | number, uid?: number): boolean {
    const x = this.hooks?.expect?.(this.clickInfo(kind));
    return !!x && x.kind === kind && (value === undefined || x.value === value) && (uid === undefined || x.uid === uid);
  }
  /** 引导里：这一类按钮当前有发光的 */
  private hlKind(kind: GameClickKind): boolean { return this.hooks?.expect?.(this.clickInfo(kind))?.kind === kind; }
  close() {
    this.closePop();
    this.token++;
    this.active = false;
    document.body.classList.remove("game", "gm-top");
    this.root.hidden = true;
    this.overlay.hidden = true;
    this.ctx.cards.forEach((c) => c.setSelected(false));
    this.ctx.onToggle(false);
  }

  // ------------------------------------------------------------ 开局设置
  protected save() { try { localStorage.setItem("nc-settings", JSON.stringify(this.S)); } catch { /* ignore */ } }

  protected showSetup() {
    const o = this.overlay;
    o.hidden = false;
    o.innerHTML = "";
    const S = this.S;
    const box = h("div", "gm-modal wide");
    box.append(h("h2", "", "数字牌模式 · 开局"));
    const render = () => {
      box.querySelectorAll(".sec").forEach((e) => e.remove());
      // 职业
      const s1 = h("section", "sec"); s1.append(h("h3", "", "1 · 选职业"));
      const row = h("div", "cls-row");
      for (const c of NR.CLASSES) {
        const b = h("button", "cls" + (S.cls === c ? " on" : ""));
        b.style.setProperty("--c", NR.CLASS_COLOR[c]);
        b.innerHTML = `<b>${NR.CLASS_NAME[c]}</b><small>${NR.talentOf(c, true)}</small><em>成长：${NR.CLASS_GOAL[c]}（目标 ${NR.TARGET[c]}，用来解锁数字牌）</em>`;
        b.addEventListener("click", () => { S.cls = c; S.words = { ...NR.PRESETS[c].words }; S.kws = [...NR.PRESETS[c].kws]; render(); });
        row.append(b);
      }
      s1.append(row);
      // 卡组
      const s2 = h("section", "sec");
      const total = NR.WORD_ORDER.reduce((a, w) => a + (S.words[w] ?? 0), 0);
      s2.append(h("h3", "", `2 · 进阶词卡组（${total}/${NR.DECK_SIZE} 张，同名最多 ${NR.COPY_MAX} 张）`));
      const grid = h("div", "deck");
      for (const w of NR.WORD_ORDER) {
        const d = NR.WORDS[w], n = S.words[w] ?? 0;
        const r = h("div", "dw");
        r.append(h("b", "", w), h("small", "", `价 ${d.price} · ${d.desc}`));
        const ctl = h("span", "ctl");
        ctl.append(btn("−", "", () => { if (n > 0) { S.words[w] = n - 1; render(); } }), h("i", "", String(n)), btn("+", "", () => { if (n < NR.COPY_MAX && total < NR.DECK_SIZE) { S.words[w] = n + 1; render(); } }));
        r.append(ctl);
        grid.append(r);
      }
      s2.append(grid, btn("用这个职业的建议卡组", "ghost", () => { S.words = { ...NR.PRESETS[S.cls].words }; S.kws = [...NR.PRESETS[S.cls].kws]; render(); }));
      // 关键词和生命
      const s3 = h("section", "sec"); s3.append(h("h3", "", `3 · 每个随从的关键词和生命（总共 ${NR.W.POOL} 点，每个至少 ${NR.HP_MIN}）`));
      const g3 = h("div", "units3");
      for (let i = 0; i < 3; i++) {
        const r = h("div", "u3");
        r.append(h("b", "", `${NR.UNIT_GLYPHS[i]} ${NR.UNIT_NAMES[i]}`));
        const sel = h("select");
        for (const k of Object.keys(NR.KEYWORDS)) { const op = h("option", "", `${k}：${NR.KEYWORDS[k]}`); op.value = k; if (S.kws[i] === k) op.selected = true; sel.append(op); }
        sel.addEventListener("change", () => { S.kws[i] = sel.value; });
        const ctl = h("span", "ctl");
        const bump = (d: number) => {
          const j = (i + 1) % 3;
          if (S.hp[i] + d < NR.HP_MIN || S.hp[j] - d < NR.HP_MIN) return;
          S.hp[i] += d; S.hp[j] -= d; render();
        };
        ctl.append(btn("−", "", () => bump(-1)), h("i", "", `${S.hp[i]} 血`), btn("+", "", () => bump(1)));
        r.append(sel, ctl);
        g3.append(r);
      }
      s3.append(g3);
      // 对手
      const s4 = h("section", "sec"); s4.append(h("h3", "", "4 · 对手（电脑）的职业"));
      const r4 = h("div", "foe-row");
      for (const f of ["随机", ...NR.CLASSES] as (NR.Cls | "随机")[]) r4.append(btn(f === "随机" ? "随机" : NR.CLASS_NAME[f], S.foe === f ? "on" : "", () => { S.foe = f; render(); }));
      s4.append(r4);
      const bad = NR.deckProblem(S.words, S.kws) || NR.hpProblem(S.hp, NR.W.POOL);
      const foot = h("div", "foot");
      foot.append(h("span", "err", bad), btn("怎么玩", "ghost", () => this.showRules()), btn("退出对局模式", "ghost", () => { this.overlay.hidden = true; this.close(); }));
      const go = btn("开始对局 →", "primary", () => this.begin());
      go.disabled = !!bad;
      foot.append(go);
      box.append(s1, s2, s3, s4, foot);
    };
    render();
    o.append(box);
  }

  showRules() {
    const m = h("div", "gm-modal");
    m.append(h("h2", "", "数字牌模式 · 怎么玩"));
    for (const l of this.hooks ? NR.RULES_LINES : NR.RULES_WIPE) m.append(h("p", "", l));
    const prev = this.overlay.innerHTML, wasHidden = this.overlay.hidden;
    const bg = h("div", "gm-overlay top");
    bg.append(m);
    m.append(btn("知道了", "primary", () => { bg.remove(); void prev; void wasHidden; }));
    bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
    document.body.append(bg);
  }

  // ------------------------------------------------------------ 一局
  protected begin() {
    const S = this.S;
    this.save();
    this.overlay.hidden = true;
    const foe: NR.Cls = S.foe === "随机" ? NR.CLASSES[Math.floor(Math.random() * 4)] : S.foe;
    const mine: NR.Deck = { cls: S.cls, words: { ...S.words }, kws: [...S.kws], hp: [...S.hp] };
    const theirs = NR.presetDeck(foe, true);
    this.M = new Match();
    this.M.start(mine, theirs, Math.floor(Math.random() * 1e9), true, false, { wipe: true });
    this.token++;
    this.ui = "idle";
    this.elLog.innerHTML = "";
    this.log(`对局开始：你 ${NR.CLASS_NAME[S.cls]} 对 电脑 ${NR.CLASS_NAME[foe]}`);
    this.refreshAll(true);
    void this.step();
  }

  protected setUi(ui: string) { this.ui = ui; this.highlight(); }

  protected refreshAll(resetShown = false) {
    const M = this.M;
    if (resetShown) { this.shown = {}; for (const u of M.R.U) this.shown[u.uid] = [u.hp, u.down !== -1]; }
    this.renderTop(); this.renderUnits(); this.renderHand(); this.renderDecl(); this.syncCards();
    if (this.pl && this.popMode) this.renderPop();
  }

  protected syncCards() {
    const M = this.M;
    for (const u of M.R.U) {
      if (u.perma) continue;
      const card = this.ctx.cards[cardIndex(u.uid)];
      const sh = this.shown[u.uid] ?? [u.hp, u.down !== -1];
      card.syncHp(sh[1] ? 0 : sh[0], u.mx);
      card.setLoadout(loadoutOf(M, u.uid));
      // 句子读数面板：本轮宣告的句子
      const panel = this.ctx.panels[cardIndex(u.uid)];
      if (this.topLayout) { panel.setName(u.name); card.setName(u.name); }   // 横版：名牌写真名（小剑/小盾/小咒），不是「蓝一」
      const list = M.phase === "declare" || M.phase === "assign" ? M.declared : M.lastDeclared;
      const a = list.find((x: any) => x.uid === u.uid);
      if (a) panel.set(actionToks(M as any, a, 0), a.start);
      else panel.set([], null);
    }
    this.ctx.onChange();
  }

  protected highlight() {
    const M = this.M;
    this.hlCards = [];
    const guide = this.hooks?.expect ? this.hooks.expect(this.clickInfo("unit")) : null;
    this.ctx.cards.forEach((card, i) => {
      const uid = uidOfCard(i);
      let on = false;
      if (this.ui === "pick_unit") on = uid < 3 && M.remaining[0].includes(uid);
      else if (this.ui === "target") on = this.targetOk(uid);
      else if (this.ui === "assign") on = this.lateOk(uid);
      if (this.hooks?.expect && on && guide && guide.uid !== undefined && ["unit", "pass", "target", "late"].includes(guide.kind)) on = guide.uid === uid;
      else if (this.hooks?.expect && guide && !["unit", "pass", "target", "late"].includes(guide.kind)) on = false;
      if (on && guide && guide.uid === uid) this.hlCards.push(uid);
      card.setSelected(on);
    });
    // 教程：这一步可以拖（从出手的随从拖到目标），把两头都亮出来
    if (guide?.drag) for (const uid of [guide.drag.from, guide.drag.to]) { this.ctx.cards[cardIndex(uid)].setSelected(true); this.hlCards.push(uid); }
  }

  // ------------------------------------------------------------ 顶栏、单位、手牌、宣告
  /** 横版布局的顶部一小块：回合 + 双方（生命 / 存活 / 成长 / 行动点）+ 我方数字牌 + 小工具 */
  protected renderTopHud() {
    const M = this.M, el = this.elTop, wipe = !!M.opts.wipe;
    if (!M.sides.length || !M.R) return;       // 联机：对手刚进房间、第一份快照还没到
    el.innerHTML = "";
    // 右上角：只有行动点和数字牌（我方 + 对手一行）；整局的信息（轮数、过热）在屏幕上方中间；菜单在左上角
    const ap = (s: number) => (M.phase === "declare" ? M.res[s].ap : M.sides[s].ap);
    const apMax = wipe ? NR.W.AP_CAP : NR.AP_CAP;
    const me = h("div", "sv-me");
    me.append(h("span", "ap", `行动点 ${ap(0)}/${apMax}`), this.elHand);
    const foe = h("div", "sv-foe dim", `${this.foeName}：行动点 ${ap(1)}/${apMax} · 数字牌 ${M.sides[1].cards.length} 张`);
    el.append(me, foe);
    const rb = this.elRound;
    rb.innerHTML = "";
    rb.append(h("span", "", `第 ${M.rnd} / ${NR.MAX_ROUNDS} 轮 · 本轮先宣告：${M.firstSide() === 0 ? "你" : this.foeName}`));
    if (wipe) {
      const hf = NR.W.HEAT_FROM;
      rb.append(h("span", M.rnd >= hf ? "heat on" : "heat", M.rnd >= hf ? `本轮末过热：每个随从 −${M.rnd - hf + 1}` : `第 ${hf} 轮起过热`));
    }
    const mn = this.elMenu;
    mn.innerHTML = "";
    mn.append(btn("怎么玩", "ghost", () => this.showRules()), btn(this.fast ? "动画：快" : "动画：正常", "ghost", (e) => { this.fast = !this.fast; (e.target as HTMLElement).textContent = this.fast ? "动画：快" : "动画：正常"; }),
      btn("日志", "ghost" + (this.elDrawer.hidden ? "" : " on"), (e) => { this.elDrawer.hidden = !this.elDrawer.hidden; (e.target as HTMLElement).classList.toggle("on", !this.elDrawer.hidden); }),
      btn("退出", "ghost", () => (this.hooks?.exit ? this.hooks.exit() : this.close())));
  }

  protected renderTop() {
    if (this.topLayout) { this.renderTopHud(); return; }
    const M = this.M, el = this.elTop;
    if (!M.sides.length || !M.R) return;
    el.innerHTML = "";
    const first = M.firstSide();
    el.append(h("div", "gm-round", `第 ${M.rnd} / ${NR.MAX_ROUNDS} 轮 · 本轮先宣告：${first === 0 ? "你" : this.foeName}`));
    for (let s = 0; s < 2; s++) {
      const c = M.clsOf(s), p = M.progress(s);
      const row = h("div", "gm-prog");
      row.title = `得分：${NR.CLASS_GOAL[c]}\n特长：${NR.CLASS_TALENT[c]}`;
      const chip = h("span", "chip", `${s === 0 ? "你" : this.foeName} · ${NR.CLASS_NAME[c]}`); chip.style.background = NR.CLASS_COLOR[c];
      const bar = h("span", "bar"), fill = h("i"); fill.style.width = `${Math.min(100, p * 100)}%`; fill.style.background = NR.CLASS_COLOR[c];
      bar.append(fill);
      const ap = M.phase === "declare" ? M.res[s].ap : M.sides[s].ap;
      row.append(chip, bar, h("small", "", `${Math.round(p * 100)}%（${NR.METRIC_NAME[c]} ${M.R.M[s][NR.METRIC[c]]}/${NR.TARGET[c]}，击倒 +${Math.round(M.R.kob[s] * 100)}%） · 行动点 ${ap}/${NR.AP_CAP}`));
      el.append(row);
    }
    const bar = h("div", "gm-tools");
    bar.append(btn("怎么玩", "ghost", () => this.showRules()), btn(this.fast ? "动画：快" : "动画：正常", "ghost", (e) => { this.fast = !this.fast; (e.target as HTMLElement).textContent = this.fast ? "动画：快" : "动画：正常"; }));
    if (this.pl) bar.append(btn("日志", "ghost" + (this.elDrawer.hidden ? "" : " on"), (e) => { this.elDrawer.hidden = !this.elDrawer.hidden; (e.target as HTMLElement).classList.toggle("on", !this.elDrawer.hidden); }));
    bar.append(btn("退出", "ghost", () => (this.hooks?.exit ? this.hooks.exit() : this.close())));
    el.append(bar);
  }

  protected renderUnits() {
    const M = this.M, el = this.elUnits;
    el.innerHTML = "";
    for (const u of M.R.U) {
      if (u.perma) continue;
      const sh = this.shown[u.uid] ?? [u.hp, u.down !== -1];
      const r = h("div", `gm-u ${u.side === 0 ? "me" : "foe"}${sh[1] ? " down" : ""}`);
      const chips: string[] = [];
      for (const nm of Object.keys(u.st)) chips.push(NT.statusChip(nm, u.st[nm], M.rnd));
      if (u.mit > 0) chips.push(`减伤${u.mit}`);
      if (u.shield > 0) chips.push(`血痂${u.shield}`);
      for (const _l of u.lis) { void _l; chips.push("转移"); }
      for (const c of M.R.conts) if (c.uid === u.uid) chips.push(`续·${c.cl.k === "atk" ? "打" : c.cl.k === "heal" ? "奶" : "减伤"}${c.cl.n}·第${c.start}秒·还${c.left}轮`);
      if (M.phase === "declare") {
        if (M.passed[u.side].includes(u.uid)) chips.push("本轮不出手");
        else { const a = M.declared.find((x: any) => x.uid === u.uid); if (a) chips.push(`已宣告${mk(a.ord)}`); }
      }
      const hpPct = sh[1] ? 0 : (100 * sh[0]) / u.mx;
      r.innerHTML = `<b>${u.side === 0 ? "你的" : "对手的"}${u.name}</b><span class="hp"><i style="width:${hpPct}%"></i></span><em>${sh[1] ? "倒下·休整" : `${sh[0]}/${u.mx}`}</em><small>【${u.kw}】${u.kws ? "已用" : ""}</small>${chips.map((c) => `<span class="chip">${c}</span>`).join("")}`;
      r.addEventListener("click", () => this.cardClicked(u.uid));
      r.addEventListener("contextmenu", (e) => { e.preventDefault(); this.cardContext(u.uid); });
      el.append(r);
    }
  }

  protected renderHand() {
    const M = this.M, el = this.elHand;
    el.innerHTML = "";
    el.append(h("span", "dim", this.topLayout ? "数字牌：" : "你的数字牌："), h("span", "chip gray", this.topLayout ? "1 · 免费" : "1 · 免费无限"));
    const reserved: number[] = M.phase === "declare" ? M.res[0].cards : [];
    M.sides[0].cards.forEach((c: any, i: number) => {
      const cooling = !c.once && M.rnd - c.last < 2;
      let t = `${c.v} · ${c.once ? "骰子·一次性" : "阶梯"}`, cls = c.once ? "chip dice" : "chip gold";
      if (cooling) { t += "（冷却）"; cls = "chip gray"; } else if (reserved.includes(i)) { t += "（本轮已用）"; cls = "chip gray"; }
      el.append(h("span", cls, t));
    });
    if (!this.topLayout) el.append(h("small", "dim", `${this.foeName}有 ${M.sides[1].cards.length} 张数字牌`));
  }

  protected renderDecl() {
    const M = this.M, el = this.elDecl;
    el.innerHTML = "";
    el.append(h("div", "dim", M.phase === "declare" || M.phase === "assign" ? "本轮已宣告（你看得到对方定下的每一句）" : "上一轮的宣告"));
    const list = M.phase === "declare" || M.phase === "assign" ? M.declared : M.lastDeclared;
    if (!list.length) el.append(h("small", "dim", "（还没有）"));
    for (const a of list) {
      const mine = a.side === 0;
      const t = `${mk(a.ord)} ${mine ? "你" : this.foeName} · ${M.R.U[a.uid].name} · 第 ${a.start} 秒 · 花 ${a.cost} 点${a.blood > 0 ? `（其中 ${a.blood} 点用血付）` : ""}${a.cv.length ? `，数字牌 [${a.cv.join(", ")}]` : ""}：${NT.actionText(M as any, a.cl, 0, a.side)}`;
      el.append(h("div", "decl " + (mine ? "me" : "foe"), t));
    }
    if (M.phase === "declare") for (let s = 0; s < 2; s++) for (const uid of M.passed[s]) el.append(h("small", "dim", `${s === 0 ? "你" : this.foeName}的${M.R.U[uid].name} 本轮不出手`));
  }

  protected log(t: string, cls = "") { const d = h("div", cls, t); this.elLog.append(d); this.elLog.scrollTop = this.elLog.scrollHeight; }

  // ------------------------------------------------------------ 流程
  protected async step() {
    const M = this.M, tk = this.token;
    if (M.phase === "over") { this.showOver(); return; }
    if (M.phase === "assign") { this.beginAssign(); return; }
    if (M.phase !== "declare") return;
    const s = M.declareSide();
    if (s === -1) { void this.resolve(); return; }
    if (s === 0) { this.selUid = -1; this.setUi("pick_unit"); this.renderAct(); return; }
    this.setUi("foe"); this.renderAct();
    await sleep(this.fast ? 50 : 600);
    if (tk !== this.token) return;
    if (!this.hooks?.foeStep?.(M)) M.aiStep();
    this.refreshAll();
    void this.step();
  }

  cardClicked(uid: number) {
    if (!this.active) return;
    if (this.ui === "pick_unit" && this.M.remaining[0].includes(uid)) { if (this.gate("unit", { uid })) this.openComposer(uid); }
    else if (this.ui === "target") this.pickTarget(uid);
    else if (this.ui === "assign") this.pickLate(uid);
    else if (this.pl && (this.ui === "pick_unit" || this.ui === "foe" || this.ui === "round_end")) this.cardContext(uid);
  }

  protected pass(uid: number) {
    if (!this.gate("pass", { uid })) return;
    const e = this.M.submit(0, uid, null);
    if (e) { this.toast(e); return; }
    this.refreshAll(); void this.step();
  }

  // ------------------------------------------------------------ 拼句
  protected openComposer(uid: number) {
    this.selUid = uid;
    this.cmp = new Composer(this.M, uid, 0, this.hooks?.allow);
    this.setUi("compose");
    this.renderAct();
  }

  protected renderComposer() {
    const el = this.elAct, M = this.M, cmp = this.cmp!;
    el.innerHTML = "";
    const op = cmp.options(), pr = op.parsed;
    const cls = M.clsOf(0), u = M.R.U[this.selUid];
    const head = h("div", "cmp-head");
    head.append(h("h3", "", `给【${u.name}】拼一句`), h("span", "chip", `本轮还剩行动点 ${M.res[0].ap}`));
    if (cmp.cp.blood > 0) head.append(h("span", "chip red", `不够可用血付，最多 ${M.bloodRoom(0, this.selUid)}`));
    el.append(head, h("small", "talent", `职业特长：${NR.talentOf(cls, !!M.opts.wipe)}`));
    // 辅助轮
    const sugg = h("div", "sugg");
    sugg.append(btn(this.pl ? "辅助轮：让电脑出几个主意" : "辅助轮：让电脑出几个主意（先看人话，点一下装进来）", "ghost", () => { if (this.gate("assist")) this.showSuggestions(sugg); }));
    el.append(sugg);
    // 句子轨
    const rail = h("div", "rail");
    cmp.tokens.forEach((t, i) => {
      const tile = h("span", t.t === "n" ? `tile num${Number(t.v) > 1 ? " big" : ""}` : `tile${NR.WORDS[String(t.v)] ? " adv" : ""}`, String(t.v));
      rail.append(tile);
      if (pr.glue[i]) rail.append(h("span", "glue", pr.glue[i]));
    });
    rail.append(h("span", "tile ghost", "?"));
    el.append(rail);
    el.append(h("p", "cmp-text", pr.err ? pr.err : pr.complete ? `这句话：${NT.actionText(M as any, pr.clauses)}。` : !cmp.tokens.length ? "这句话：（还是空的，从下面挑第一张）" : `拼到这里：${cmp.draftText()}（还没拼完）`));
    const pv = h("p", "cmp-preview"); el.append(pv);
    el.append(h("p", "cmp-help", cmp.help()));
    // 词
    const words = h("div", "opts");
    for (const it of op.words) {
      const hlW = this.hl("word", it.w);
      const b = h("button", hlW ? "w hl" : this.hlKind("word") ? "w dimmed" : it.ok && (NR.WORDS[it.w] || it.w === NR.CLASS_WORD[cls]) ? "w primary" : "w", it.w);
      b.disabled = !it.ok;
      let tip = NR.WORDS[it.w] ? NR.WORDS[it.w].desc : BASIC_DESC[it.w] ?? "";
      if (it.w === "并") tip += `（每多一段 +${cmp.cp.and} 行动点，最多 ${cmp.cp.clauses} 段）`;
      if (it.w === "持续" && pr.cur?.k !== "st") tip = "续流特长：这一段以后每轮同一秒自动再来一次，后面放数字牌（一共几轮）";
      if (NR.WORDS[it.w]) tip += `（进阶词：卡组里还能用 ${cmp.wordLeft(it.w)} 张，价格 ${NR.WORDS[it.w].price}）`;
      if (it.why) tip += ` ${it.why}`;
      const pvt = cmp.previewWith({ t: "w", v: it.w });
      b.title = `${tip}\n接上以后：${pvt}`;
      const show = () => { pv.textContent = it.ok ? `接上它：${pvt}` : it.why; };
      b.addEventListener("mouseenter", show); b.addEventListener("focus", show);
      b.addEventListener("mouseleave", () => { pv.textContent = ""; });
      b.addEventListener("click", () => { if (!this.gate("word", { value: it.w })) return; if (cmp.addWord(it.w)) this.renderAct(); });
      words.append(b);
    }
    if (!op.words.length && !op.num) words.append(h("small", "dim", "（这一段拼完了）"));
    el.append(h("small", "dim", "下一张可以接（鼠标移上去，先看接上以后这句话怎么说）"), words);
    // 数字牌
    el.append(h("small", "dim", "你的数字牌（1 免费无限用；放进句子里的那张本轮就用掉了）"));
    const nums = h("div", "opts");
    const have = M.usableValues(0), used = cmp.usedValues();
    const nb = (label: string, n: number, ok: boolean, hint = "") => {
      const b = h("button", this.hl("num", n) ? "w hl" : this.hlKind("num") ? "w dimmed" : ok ? "w primary" : "w", label);
      b.disabled = !ok;
      if (ok) {
        const pvt = cmp.previewWith({ t: "n", v: n, free: !!hint });
        b.title = `${hint}接上以后：${pvt}`;
        const show = () => { pv.textContent = `接上它：${pvt}`; };
        b.addEventListener("mouseenter", show); b.addEventListener("focus", show); b.addEventListener("mouseleave", () => { pv.textContent = ""; });
      }
      b.addEventListener("click", () => { if (!this.gate("num", { value: n })) return; if (cmp.addNumber(n)) this.renderAct(); });
      nums.append(b);
    };
    nb("1（免费）", 1, op.num);
    if (cmp.freeCount()) for (const fv of [2, 3]) nb(`${fv}（择流免费）`, fv, true, "择流选几个目标不用数字牌\n");
    for (const v of Object.keys(have).map(Number).sort((a, b) => a - b)) {
      const left = have[v] - (used[v] ?? 0);
      nb(`${v} ×${left}`, v, op.num && left > 0);
    }
    const cooling = M.sides[0].cards.filter((c: any) => !c.once && M.rnd - c.last < 2).length;
    if (cooling) nums.append(h("span", "chip gray", `另有 ${cooling} 张在冷却（上一轮用过的阶梯牌）`));
    el.append(nums);
    // 底栏
    const ci = cmp.costInfo();
    el.append(h("p", "cmp-cost", ci.text));
    const foot = h("div", "cmp-foot");
    foot.append(btn("撤回一张", "ghost", () => { if (!this.gate("undo")) return; cmp.undo(); this.renderAct(); }), btn("全部拿下", "ghost", () => { if (!this.gate("clear")) return; cmp.clear(); this.renderAct(); }),
      btn("取消", "ghost", () => { if (!this.gate("restart")) return; this.cmp = null; this.setUi("pick_unit"); this.renderAct(); }));
    const ok = btn(ci.allLate ? "拼好了 → 定起手秒数" : "拼好了 → 去选目标", "primary" + (this.hl("done") ? " hl" : ""), () => { if (this.gate("done")) this.composerDone(); });
    ok.disabled = ci.bad || !pr.complete;
    foot.append(ok);
    el.append(foot);
  }

  protected showSuggestions(box: HTMLElement) {
    const M = this.M, cmp = this.cmp!;
    box.innerHTML = "";
    const list = suggest(M, 0, this.selUid, 3);
    if (!list.length) { box.append(h("small", "dim", "辅助轮：这个随从现在没什么好打的，可以让它这轮不出手。")); return; }
    box.append(h("small", "dim", "辅助轮 · 电脑会这样拼（按它的估值排；点一下装进句子，还能接着改）："));
    for (const it of list) {
      const a = it.act;
      let extra = `第 ${a.start} 秒 · 花 ${a.cost} 点${a.blood > 0 ? `（${a.blood} 点用血付）` : ""}`;
      if (it.gain < PASS_GAIN) extra += " · 电脑觉得不太值";
      const b = btn(`${NT.actionText(M as any, a.cl)}  （${extra}）`, "sug", () => {
        const toks = actTokens(a.cl) as Tok[];
        cmp.tokens = structuredClone(toks);
        cmp.sugg = { act: a, tokens: structuredClone(toks) };
        this.renderAct();
      });
      box.append(b);
    }
  }

  protected composerDone() {
    const cl = this.cmp?.finish();
    if (!cl) return;
    this.cmp = null;
    this.pending = cl;
    for (const c of cl) {
      if (c.tmode === "self") c.tg = [this.selUid];
      else if (c.k !== "delay" && !c.pre) c.tg = [];
    }
    this.pendI = 0;
    this.advanceTargets();
  }

  // ------------------------------------------------------------ 拖拽 / 框选（场景里的鼠标操作，见 drag/dragCompose.ts）
  /** 能不能从这个随从开始拖：返回 "" = 能，否则是原因（空字符串之外的都是提示） */
  dragFromProblem(uid: number): string {
    if (!this.active || this.M.R.U[uid]?.side !== 0) return "只能从我方随从开始拖";
    if (this.ui === "pick_unit") return this.M.remaining[0].includes(uid) ? "" : "这个随从这一轮已经定过了";
    if (this.ui === "compose") return uid === this.selUid ? "" : "这一句是别的随从的；要换人先取消";
    return "现在不能拖";
  }
  /** 从 actor 拖到 target（self = 双击自己）。必要时先替它打开拼句面板，然后把「选择 1 敌方/友方」或「自身」填进去 */
  dragDrop(actor: number, target: number, self = false) {
    const bad = this.dragFromProblem(actor);
    if (bad) { this.toast(bad); return; }
    const U = this.M.R.U;
    if (U[target].down !== -1) { this.toast(`【${U[target].name}】已经倒下了`); return; }
    const kind: "enemy" | "ally" | "self" = self || target === actor ? "self" : U[target].side === 0 ? "ally" : "enemy";
    if (this.ui === "pick_unit") { if (!this.gate("unit", { uid: actor })) return; this.openComposer(actor); }
    if (!this.cmp) return;
    if (!this.gate("drag", { uid: target, value: kind })) return;
    const e = this.cmp.dragTo(kind, target);
    if (e) { this.toast(e); return; }
    this.renderAct();
  }
  /** 在人物外框选：把当前这一段的目标改成框到的随从 */
  dragBox(uids: number[]) {
    if (this.ui !== "compose" || !this.cmp) return;
    if (!this.gate("box", { value: uids.length })) return;
    const e = this.cmp.boxTargets(uids);
    if (e) { this.toast(e); return; }
    this.renderAct();
  }

  // ------------------------------------------------------------ 选目标 / 起手秒数
  protected advanceTargets() {
    while (this.pendI < this.pending.length) {
      const c = this.pending[this.pendI];
      if (c.k === "delay") { if ((c.act ?? -1) >= 0) { this.pendI++; continue; } break; }
      if (c.tmode === "late" || (c.tg ?? []).length >= (c.count ?? 1)) { this.pendI++; continue; }
      break;
    }
    this.setUi(this.pendI >= this.pending.length ? "timing" : "target");
    this.renderAct();
  }

  protected targetOk(uid: number): boolean {
    if (this.ui !== "target" || this.pendI >= this.pending.length) return false;
    const c = this.pending[this.pendI];
    if (c.k === "delay") return false;
    const u = this.M.R.U[uid];
    if (u.down !== -1) return false;
    if ((u.side === 1) !== ((c.side ?? "enemy") === "enemy")) return false;
    return !c.tg.includes(uid);
  }
  protected pickTarget(uid: number) {
    if (!this.targetOk(uid)) return;
    if (!this.gate("target", { uid })) return;
    this.pending[this.pendI].tg.push(uid);
    this.advanceTargets();
  }

  protected declare(start: number) {
    const M = this.M;
    const r = M.buildAction(0, this.selUid, this.pending, start);
    if (r.err) { this.toast(r.err); return; }
    const e = M.submit(0, this.selUid, r.act!);
    if (e) { this.toast(e); return; }
    this.pending = [];
    this.refreshAll(); void this.step();
  }

  // ------------------------------------------------------------ 择流定目标
  protected latePool(c: any): number[] {
    return this.M.R.U.filter((u: any) => u.down === -1 && ((u.side === 1) === (c.side === "enemy"))).map((u: any) => u.uid);
  }
  protected lateOk(uid: number) {
    const pl = this.M.pendingLate(0);
    return !!pl.length && this.latePool(pl[0].cl).includes(uid) && !this.latePick.includes(uid);
  }
  protected beginAssign() {
    if (!this.M.pendingLate(0).length) { this.finishAssign(); return; }
    this.latePick = [];
    this.setUi("assign");
    this.renderAct();
  }
  protected pickLate(uid: number) {
    if (!this.lateOk(uid)) return;
    if (!this.gate("late", { uid })) return;
    this.latePick.push(uid);
    const c = this.M.pendingLate(0)[0].cl;
    if (this.latePick.length >= Math.min(c.count, this.latePool(c).length)) this.commitLate();
    else { this.highlight(); this.renderAct(); }
  }
  protected commitLate() {
    const pl = this.M.pendingLate(0);
    if (!pl.length) return;
    this.M.setLate(pl[0].ord, pl[0].ci, this.latePick);
    this.latePick = [];
    if (!this.M.pendingLate(0).length) this.finishAssign(); else { this.highlight(); this.renderAct(); }
  }
  protected finishAssign() { this.M.finishAssign(); this.refreshAll(); void this.step(); }

  // ------------------------------------------------------------ 结算回放
  protected async resolve() {
    const M = this.M, tk = this.token;
    this.setUi("resolving"); this.renderAct();
    const before: Record<number, [number, boolean]> = {};
    for (const u of M.R.U) before[u.uid] = [u.hp, u.down !== -1];
    const progBefore = [M.progress(0), M.progress(1)];
    const declCopy = [...M.declared];
    const events = M.resolveRound();
    this.shown = before;
    this.elLog.innerHTML = "";
    this.log(`—— 第 ${M.rnd} 轮结算 ——`, "gold");
    if (!(await this.playEvents(events, declCopy, tk))) return;
    this.refreshAll(true);
    this.roundSummary(progBefore);
  }

  /** 播放一轮结算事件：有技能演出就交给它（它在命中的那一刻才调用 step），否则逐事件 + 停顿。返回 false = 中途退出了 */
  protected async playEvents(events: any[], decl: any[], tk: number): Promise<boolean> {
    const step = (ev: any) => {
      const line = this.eventText(ev, decl);
      if (line) this.log(line.text, line.cls);
      this.applyShown(ev);
    };
    const cast = this.ctx.cast;
    if (cast) return cast.playRound({ M: this.M, events, decl, step, alive: () => tk === this.token, fast: () => this.fast });
    for (const ev of events) {
      step(ev);
      if (!this.fast) await sleep(350);
      if (tk !== this.token) return false;
    }
    return true;
  }

  protected applyShown(ev: any) {
    let uid = -1, delta = 0;
    switch (ev.type) {
      case "hit": case "redirected": case "burn": case "heat": uid = ev.tgt; delta = -ev.dealt; break;
      case "heal": uid = ev.tgt; delta = ev.amount; break;
      case "blood": uid = ev.uid; delta = -ev.amount; break;
      case "ko": uid = ev.tgt; this.shown[uid] = [0, true]; break;
      case "endure": uid = ev.tgt; this.shown[uid] = [1, false]; break;
    }
    if (uid >= 0 && delta !== 0 && this.shown[uid]) {
      const cur = this.shown[uid];
      this.shown[uid] = [Math.max(0, cur[0] + delta), cur[1]];
    }
    if (uid >= 0) {
      const card = this.ctx.cards[cardIndex(uid)];
      if (delta < 0 || ev.type === "ko") card.hit(0);
      card.syncHp(this.shown[uid][1] ? 0 : this.shown[uid][0], this.M.R.U[uid].mx);
      this.renderUnits();
    }
  }

  protected eventText(ev: any, _decl: any[]): { text: string; cls: string } | null {
    const M = this.M as any;
    const nm = (u: number) => NT.unitName(M, u);
    const r = (text: string, cls = "") => ({ text, cls });
    switch (ev.type) {
      case "fire": return ev.cont ? r(`第 ${ev.t} 秒 ${nm(ev.uid)} 的续自动再来一次`, "amber") : r(`第 ${ev.t} 秒 ${mk(ev.ord)} ${nm(ev.uid)}出手`);
      case "blood": return r(`开打前 ${nm(ev.uid)} 用 ${ev.amount} 点生命付了 ${mk(ev.ord)} 的行动点`, "red");
      case "lock": return r(`    择定目标：${ev.tgts.map(nm).join("、")}${ev.changed ? "（原定的倒了，换人）" : ""}`, "green");
      case "cont_set": return r(`    → 挂上续：以后 ${ev.rounds} 轮每轮同一秒再来一次`, "amber");
      case "chain": return r(`${mk(ev.ord)} 连段：兑现 ${ev.landed} 段（${ev.kinds.join("、")}），得 ${ev.points} 分${ev.all ? "（整句全中）" : ""}`, "cyan");
      case "hit": {
        const ex: string[] = [];
        if (ev.vuln > 0) ex.push(`易伤 +${ev.vuln}`);
        for (const k of Object.keys(ev.parts)) ex.push(`${k} −${ev.parts[k]}`);
        return r(`    → ${nm(ev.tgt)} 受到 ${ev.amount} 点${ex.length ? `（${ex.join("、")}）` : ""}`);
      }
      case "redirected": return r(`    → 转移：${ev.amount} 点转给 ${nm(ev.tgt)}`);
      case "heal": return r(`    → ${nm(ev.tgt)} 恢复 ${ev.amount} 点`);
      case "mit": return r(`    → ${nm(ev.tgt)} 本轮每次少受 ${ev.amount}`);
      case "status": return r(`    → ${nm(ev.tgt)}【${ev.st}】${ev.lv} 级（撑到第 ${ev.end} 轮）`);
      case "listen": return r(`    → ${nm(ev.tgt)} 本轮受到的伤害会转给出手的人`);
      case "delay": return r(`    → 把 ${mk(ev.ord)} 推到第 ${ev.to} 秒`);
      case "remove": return r(`    → 拆掉了 ${nm(ev.tgt)} 的保护${ev.broke > 0 ? `，掐断 ${ev.broke} 个续` : ""}`);
      case "fizzle": return r(`${mk(ev.ord)} 落空：${ev.why}`, "dim");
      case "ko": return r(`${nm(ev.tgt)} 倒下了！${ev.broke > 0 ? `它的 ${ev.broke} 个续断了` : ""}`, "red");
      case "endure": return r(`    → ${nm(ev.tgt)}【不屈】留了 1 血`);
      case "burn": return r(`轮末 ${nm(ev.tgt)} 灼烧掉 ${ev.dealt} 血`);
      case "heat": return r(`轮末过热：${nm(ev.tgt)} 受到 ${ev.amount} 点（挡不住）`, "red");
    }
    return null;
  }

  /** 全灭模式：一方还活着几个随从、剩多少生命 */
  protected teamStatus(s: number): string {
    const M = this.M;
    let alive = 0, hp = 0, mx = 0;
    for (const u of M.R.U) { if (u.side !== s || u.perma) continue; mx += u.mx; if (u.down === -1) { alive++; hp += u.hp; } }
    return `存活 ${alive}/3 · 生命 ${hp}/${mx}`;
  }

  protected roundSummary(progBefore: number[]) {
    const M = this.M, el = this.elAct, wipe = !!M.opts.wipe;
    this.setUi("round_end");
    el.innerHTML = "";
    el.append(h("h3", "", `第 ${M.rnd} 轮结束`));
    if (wipe) {
      for (let s = 0; s < 2; s++) el.append(h("p", "", `${s === 0 ? "你" : this.foeName}：${this.teamStatus(s)} · 成长 ${Math.round(progBefore[s] * 100)}% → ${Math.round(M.progress(s) * 100)}%`));
      if (M.phase !== "over") {
        const nx = M.rnd + 2 - NR.W.HEAT_FROM;      // 下一轮结束时的过热点数
        el.append(h("small", "dim", nx >= 1 ? `下一轮结束时过热：每个随从 −${nx}` : `第 ${NR.W.HEAT_FROM} 轮起过热`));
      }
    } else for (let s = 0; s < 2; s++) el.append(h("p", "", `${s === 0 ? "你" : this.foeName}：完成度 ${Math.round(progBefore[s] * 100)}% → ${Math.round(M.progress(s) * 100)}%`));
    for (const n of M.roundNotes) {
      const who = n.side === 0 ? "你" : this.foeName;
      if (n.type === "dice") {
        const got = n.rolls.filter((x: number) => x > 1);
        el.append(h("p", "gold", `${who} ${n.why}，掷骰子：${n.rolls.join("、")} → ${got.length ? `得到一次性数字牌 ${got.join("、")}` : "运气不好，都是 1"}`));
      } else if (n.type === "floor") el.append(h("p", "gold", `${who} 得到保底数字【${n.value}】（能反复用）`));
      else if (n.type === "ladder") el.append(h("p", "green", `${who} ${wipe ? "成长" : "得分"}到 ${Math.round(n.at * 100)}%：解锁 ${n.copies} 张【${n.value}】（能反复用，用完冷却一轮）`));
    }
    if (M.phase === "over") { el.append(btn("看结果", "primary", () => this.showOver())); if (this.pl) this.placeAct(); return; }
    el.append(btn("下一轮 →", "primary big" + (this.hooks ? " hl" : ""), () => this.nextRoundClicked()));
    if (this.pl) this.placeAct();
    this.hooks?.roundEnd?.(M);
  }

  /** 点「下一轮」：本地直接开下一轮；联机版改成通知服务端 */
  protected nextRoundClicked() { const M = this.M; M.nextRound(); this.refreshAll(true); this.log(`—— 第 ${M.rnd} 轮 ——`, "gold"); this.roundBegin(); }

  protected showOver() {
    const M = this.M, o = this.overlay;
    this.setUi("over");
    if (this.hooks?.over?.(M)) return;
    o.hidden = false; o.innerHTML = "";
    const m = h("div", "gm-modal");
    const w = M.winner;
    const t = h("h1", w === 0 ? "win" : w === 1 ? "lose" : "", w === 0 ? "胜利！" : w === 1 ? "落败" : "平局");
    m.append(t);
    for (let s = 0; s < 2; s++) m.append(h("p", "", M.opts.wipe ? `${s === 0 ? "你" : this.foeName}（${M.clsOf(s)}）${this.teamStatus(s)}` : `${s === 0 ? "你" : this.foeName}（${M.clsOf(s)}）完成度 ${Math.round(M.progress(s) * 100)}%`));
    m.append(h("p", "dim", `共 ${M.rnd} 轮`));
    const row = h("div", "foot");
    row.append(btn("再来一局", "primary", () => { o.hidden = true; this.begin(); }), btn("改设置", "ghost", () => this.showSetup()), btn("退出", "ghost", () => { o.hidden = true; this.close(); }));
    m.append(row);
    o.append(m);
  }

  // ------------------------------------------------------------ 操作栏
  protected renderAct() {
    this.renderAct0();
    if (this.pl) this.placeAct();
    this.highlight();
    this.hooks?.rendered?.(this.clickInfo("unit"));
  }
  protected renderAct0() {
    const M = this.M, el = this.elAct;
    if (this.ui === "compose") { this.renderComposer(); return; }
    el.innerHTML = "";
    switch (this.ui) {
      case "foe": if (!this.topLayout) el.append(h("h3", "dim", `${this.foeName}在想……`)); break;
      case "pick_unit": {
        if (this.topLayout) break;     // 横版：直接点随从（或头顶小框的「＋ 拼一句」/「不出手」），右下角不放东西
        el.append(h("h3", "gold", this.pl ? "轮到你：点随从拼一句" : "轮到你：选一个随从，给它拼一句"));
        el.append(h("small", "dim", this.pl ? "左键点随从＝在它旁边拼一句；右键＝看它的详情。每个随从一轮一句。" : "点下面的按钮（或点你的随从卡）。每个随从一轮一句；可以先让一个随从出手，看看对方怎么接，再定下一个。"));
        for (const uid of M.remaining[0]) {
          const u = M.R.U[uid], row = h("div", "row2");
          row.append(btn(`给【${u.name}】拼一句`, "primary" + (this.hl("unit", undefined, uid) ? " hl" : ""), () => { if (this.gate("unit", { uid })) this.openComposer(uid); }), btn("它这轮不出手", "ghost" + (this.hl("pass", undefined, uid) ? " hl" : ""), () => this.pass(uid)));
          el.append(row);
        }
        el.append(h("p", "", `本轮行动点还剩 ${M.res[0].ap}`));
        break;
      }
      case "target": {
        const c = this.pending[this.pendI];
        el.append(h("h3", "gold", `选目标（第 ${this.pendI + 1} / ${this.pending.length} 段）`), h("p", "", NT.clauseText(null, c)));
        if (c.k === "delay") {
          el.append(h("p", "", "要延后对方的哪一句？"));
          for (const a of M.declared) if (a.side === 1) el.append(btn(`${mk(a.ord)} ${this.foeName}·${M.R.U[a.uid].name} 第 ${a.start} 秒：${NT.actionText(M as any, a.cl)}`, "sug" + (this.hl("act", a.ord) ? " hl" : ""), () => { if (!this.gate("act", { value: a.ord })) return; c.act = a.ord; this.advanceTargets(); }));
        } else el.append(h("p", "", `点 ${c.count ?? 1} 个${(c.side ?? "enemy") === "enemy" ? "敌方" : "你的"}随从（已选 ${c.tg.length} 个）——直接点场上的卡`));
        el.append(btn("重新拼", "ghost", () => { if (this.gate("restart")) this.openComposer(this.selUid); }));
        break;
      }
      case "timing": {
        const ms = NE.actionWindup(this.pending, M.caps(0).wind);
        el.append(h("h3", "gold", "第几秒起效？"), h("p", "", NT.actionText(M as any, this.pending)));
        el.append(h("small", "dim", `这句最早第 ${ms} 秒。越早越不容易被打断；对方的招落在哪一秒，看上面的时间轴。`));
        const cp0 = M.caps(0), cst = NE.totalCost(this.pending, cp0);
        if (cst > M.res[0].ap) {
          const need = cst - M.res[0].ap, hpPay = Math.ceil(need / cp0.bloodAp);
          el.append(h("p", "red", `行动点差 ${need}：开打时先从【${M.R.U[this.selUid].name}】身上扣 ${hpPay} 点生命付掉${cp0.bloodAp > 1 ? `（1 点生命顶 ${cp0.bloodAp} 点）` : ""}。`));
        }
        const best = this.pending[0]?.sugg_start ?? ms;
        if (best !== ms) el.append(h("p", "green", `辅助轮建议第 ${best} 秒。`));
        const foe = new Set(M.declared.filter((a: any) => a.side === 1).map((a: any) => a.start));
        const flow = h("div", "opts");
        for (let t = ms; t <= NR.TIMELINE; t++) flow.append(btn(`${t} 秒${foe.has(t) ? "·对方" : ""}`, this.hl("time", t) ? "w hl" : this.hlKind("time") ? "w dimmed" : t === best ? "w primary" : "w", () => { if (this.gate("time", { value: t })) this.declare(t); }));
        el.append(flow, btn("重新拼", "ghost", () => { if (this.gate("restart")) this.openComposer(this.selUid); }));
        break;
      }
      case "assign": {
        const pl = M.pendingLate(0);
        if (!pl.length) return;
        const item = pl[0], c2 = item.cl;
        const need = Math.min(c2.count, this.latePool(c2).length);
        el.append(h("h3", "green", `择流 · 定目标（还剩 ${pl.length} 段）`));
        el.append(h("p", "", `双方都宣告完了，对手看不到你的目标。现在点 ${need} 个${c2.side === "enemy" ? "敌方" : "你的"}随从（已点 ${this.latePick.length} 个）。出手前目标倒了会自动换人。`));
        const a = M.declared.find((x: any) => x.ord === item.ord);
        if (a) el.append(h("p", "decl me", `${mk(a.ord)} ${M.R.U[a.uid].name} 第 ${a.start} 秒：${NT.clauseText(M as any, c2)}`));
        const sug = suggestLate(M, 0, item.ord, item.ci);
        el.append(btn(`用建议：${sug.map((x) => M.R.U[x].name).join("、")}`, "ghost", () => { if (!this.gate("late", { value: "auto" })) return; this.latePick = [...sug]; this.commitLate(); }),
          btn("剩下的全部用建议", "ghost", () => { if (!this.gate("late", { value: "auto" })) return; assignLate(M, 0); this.finishAssign(); }));
        break;
      }
      case "resolving":
        el.append(h("h3", "gold", "结算中……"), btn("跳过动画", "ghost", () => { this.fast = true; this.ctx.cast?.skip(); }));
        break;
    }
  }

  // ------------------------------------------------------------ 新界面：悬浮面板 / 操作卡
  /** 正在为某个随从拼句 / 选目标 / 定秒数：操作放进它旁边的悬浮面板；其余时候放在窄条底部的操作卡里 */
  /** 横版：「不出手」按钮挂在我方随从头顶的小框上（轮到我选随从时才出现） */
  protected syncPass() {
    if (!this.topLayout) return;
    const M = this.M;
    for (const u of M.R.U) {
      if (u.perma || u.side !== 0) continue;
      const on = this.ui === "pick_unit" && M.remaining[0].includes(u.uid);
      this.ctx.panels[cardIndex(u.uid)]?.setPass(on ? () => this.pass(u.uid) : null);
    }
  }
  protected placeAct() {
    this.syncPass();
    const inPop = (this.ui === "compose" || this.ui === "target" || this.ui === "timing") && this.selUid >= 0;
    if (inPop) {
      if (this.popMode !== "act" || this.popUid !== this.selUid) this.popMax = false;
      this.popUid = this.selUid; this.popMode = "act";
      if (this.elAct.parentElement !== this.elPopBody) { this.elPopBody.innerHTML = ""; this.elPopBody.append(this.elAct); }
      this.elDock.hidden = true;
    } else {
      if (this.popMode === "act" || this.ui === "resolving") this.closePop();
      if (this.elAct.parentElement !== this.elDock) this.elDock.append(this.elAct);
      this.elDock.hidden = !this.elAct.childElementCount;
    }
    this.renderPop();
  }
  /** 右键随从：弹出它的详情（我方能直接拼一句 / 不出手；对手只显示公开信息） */
  cardContext(uid: number) {
    if (!this.active || !this.pl) return;
    if (["compose", "target", "timing", "assign", "resolving", "sending"].includes(this.ui)) return;
    if (this.popMode === "info" && this.popUid === uid) { this.closePop(); return; }
    this.popUid = uid; this.popMode = "info"; this.popMax = false;
    this.renderPop();
  }
  /** 点 3D 场景的空白处：详情面板直接关；拼句面板只在还没放进任何牌时关，拼了一半的不因误点丢掉（面板抖一下，提示用 ✕ / Esc） */
  blankClicked() {
    if (!this.active || !this.pl || !this.popMode) return;
    if (this.popMode === "info") { this.closePop(); return; }
    if (this.ui === "compose" && !this.cmp?.tokens.length) { this.dismissPop(); return; }
    const pop = this.elPop;
    pop.classList.remove("nudge"); void pop.offsetWidth; pop.classList.add("nudge");
  }
  /** ✕ / Esc：关掉悬浮面板；正在拼的这一句作废（和「取消」一样，教程不让取消时不关） */
  dismissPop() {
    if (!this.active || !this.popMode) return;
    if (this.popMode === "info") { this.closePop(); return; }
    if (!this.gate("restart")) return;
    this.cmp = null; this.pending = [];
    this.closePop();
    this.setUi("pick_unit");
    this.renderAct();
  }
  protected closePop() {
    this.popMode = ""; this.popUid = -1; this.popMax = false;
    this.elPop.hidden = true; this.elPop.classList.remove("nudge");
    if (this.elAct.parentElement === this.elPopBody) { this.elDock.append(this.elAct); this.elDock.hidden = !this.elAct.childElementCount; }
  }
  protected renderPop() {
    const pop = this.elPop, M = this.M;
    const u = this.popUid >= 0 ? M.R.U[this.popUid] : null;
    if (!this.popMode || !u) { pop.hidden = true; return; }
    pop.hidden = false;
    pop.classList.toggle("max", this.popMax);
    pop.classList.toggle("foe", u.side !== 0);
    const hd = this.elPopHead;
    hd.innerHTML = "";
    const sh = this.shown[u.uid] ?? [u.hp, u.down !== -1];
    const title = h("div", "pp-title");
    title.append(h("b", "", `${u.side === 0 ? "你的" : "对手的"}${u.name}`), h("span", `chip ${sh[1] ? "gray" : u.side === 0 ? "" : "red"}`, sh[1] ? (M.opts.wipe ? "已倒下" : "倒下·休整中") : `生命 ${sh[0]}/${u.mx}`), h("span", "chip", `【${u.kw}】${u.kws ? "本轮已用" : ""}`));
    title.append(h("span", "sp"), btn(this.popMax ? "恢复" : "最大化", "ghost pp-max", () => { this.popMax = !this.popMax; this.renderPop(); }), btn("✕", "ghost pp-x", () => this.dismissPop()));
    hd.append(title);
    const bar = h("div", `pp-hp${u.side === 0 ? "" : " foe"}`), fill = h("i");
    fill.style.width = `${sh[1] ? 0 : (100 * sh[0]) / u.mx}%`;
    bar.append(fill);
    hd.append(bar);
    const chips: string[] = [];
    for (const nm of Object.keys(u.st)) chips.push(NT.statusChip(nm, u.st[nm], M.rnd));
    if (u.mit > 0) chips.push(`减伤${u.mit}`);
    if (u.shield > 0) chips.push(`血痂${u.shield}`);
    for (const _l of u.lis) { void _l; chips.push("转移"); }
    for (const c of M.R.conts) if (c.uid === u.uid) chips.push(`续·${c.cl.k === "atk" ? "打" : c.cl.k === "heal" ? "奶" : "减伤"}${c.cl.n}·第${c.start}秒·还${c.left}轮`);
    if (chips.length) { const row = h("div", "pp-chips"); for (const c of chips) row.append(h("span", "chip", c)); hd.append(row); }
    const now = M.phase === "declare" || M.phase === "assign";
    const a = (now ? M.declared : M.lastDeclared).find((x: any) => x.uid === u.uid);
    if (a) hd.append(h("p", "pp-decl", `${now ? "本轮" : "上一轮"}宣告 ${mk(a.ord)} · 第 ${a.start} 秒 · 花 ${a.cost} 点${a.blood > 0 ? `（${a.blood} 点用血付）` : ""}：${NT.actionText(M as any, a.cl, 0, a.side)}`));
    else if (M.phase === "declare" && M.passed[u.side].includes(u.uid)) hd.append(h("p", "pp-decl dim", "本轮不出手"));
    if (this.popMode === "info") {
      const body = this.elPopBody;
      body.innerHTML = "";
      if (u.side === 0 && this.ui === "pick_unit" && M.remaining[0].includes(u.uid)) {
        const row = h("div", "row2");
        row.append(btn("拼一句", "primary" + (this.hl("unit", undefined, u.uid) ? " hl" : ""), () => { if (this.gate("unit", { uid: u.uid })) this.openComposer(u.uid); }),
          btn("它这轮不出手", "ghost" + (this.hl("pass", undefined, u.uid) ? " hl" : ""), () => { this.closePop(); this.pass(u.uid); }));
        body.append(row);
      } else if (u.side !== 0) body.append(h("small", "dim", "只显示公开信息：它这轮宣告的句子看得到；对手的数字牌、卡组和择流的待定目标看不到。"));
      if (this.topLayout) {
        const c0 = M.clsOf(u.side), p0 = M.progress(u.side);
        body.append(h("small", "dim", `${u.side === 0 ? "你" : this.foeName} · ${NR.CLASS_NAME[c0]} · 成长 ${Math.round(p0 * 100)}%（${NR.METRIC_NAME[c0]} ${M.R.M[u.side][NR.METRIC[c0]]}/${NR.TARGET[c0]}，用来解锁数字牌）`));
      }
      if (this.popMax) {
        const c = M.clsOf(u.side);
        body.append(h("p", "", `${u.side === 0 ? "你" : this.foeName}的职业：${NR.CLASS_NAME[c]}`), h("small", "talent", `特长：${NR.CLASS_TALENT[c]}`), h("small", "dim", `得分：${NR.CLASS_GOAL[c]}`));
      }
    }
    this.placePop();
  }
  protected placePop() {
    const pop = this.elPop;
    if (pop.hidden) return;
    if (this.popMax) { pop.style.left = ""; pop.style.top = ""; return; }
    // 可用区域：窄条在右边时是它左边；窄屏时窄条在底部，就是它上面
    const r = this.root.getBoundingClientRect(), onRight = !this.topLayout && !this.root.hidden && r.width < innerWidth * 0.6;
    const right = onRight ? r.left : innerWidth, bottom = onRight || this.root.hidden || this.topLayout ? innerHeight : r.top;
    const [ax, ay] = this.ctx.anchor ? this.ctx.anchor(this.popUid) : [right / 2, bottom / 2];
    const w = pop.offsetWidth, ht = pop.offsetHeight;
    let left = ax + 110;
    if (left + w > right - 8) left = ax - 110 - w;
    left = Math.max(8, Math.min(left, right - w - 8));
    const top = Math.max(this.topLayout ? 120 : 64, Math.min(ay - ht / 2, bottom - ht - 10));
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }

  protected toast(text: string) {
    const t = h("div", "gm-toast", text);
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }
}

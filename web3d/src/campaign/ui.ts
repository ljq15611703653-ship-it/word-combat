// 词战冒险的界面层：盖在正常对局（game.ts 的「打电脑」界面）上。
// 战斗画面、拼句、选目标、结算回放都是 Game 自己的实现；这里只做：
//   关卡选择（大卡片 / 章节）、底部对话栏、引导气泡、第 1~2 关的聚光灯、右上角的目标标签和小菜单、通关记录。
// 关卡规则（固定开局、对手脚本、胜负）通过 Game 的可选钩子接进去，见 game.ts 的 GameHooks。
import type { UnitCard } from "../unitCard";
import type { SentencePanel } from "../sentencePanel";
import type { Game, GameClick, GameHooks } from "../game";
import { setLabelOverride } from "../live";
import * as NR from "../engine/rules";
import { LEVELS } from "./levels";
import { GuideTracker } from "./guide";
import { foePlan, foeStep, makeMatch } from "./runner";
import { loadProgress, markDone, saveProgress, unlocked, type Progress } from "./progress";
import type { FoeAct, Level, Line } from "./types";
import "./campaign.css";
/* eslint-disable @typescript-eslint/no-explicit-any */

const cardIndex = (uid: number) => (uid < 3 ? 3 + uid : uid - 3);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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

export interface UiCtx {
  cards: UnitCard[];
  panels: SentencePanel[];
  game: Game;
  onLevel: (lv: Level | null) => void;
  /** 随从卡在屏幕上的位置（像素） */
  anchor: (uid: number) => [number, number];
  /** 菜单「重看开场」 */
  onReplayIntro?: () => void;
}

export class CampaignUI {
  lv!: Level;
  prog: Progress = loadProgress();
  private tracker!: GuideTracker;
  private plan: FoeAct[] | null = null;
  private tr = h("div", "cg-tr");
  private goalPop = h("div", "pp");
  private menuPop = h("div", "pp");
  private bubble = h("div", "cg-bubble");
  private spotEl = h("div", "cg-spot");
  private backdrop = h("div", "cg-backdrop");
  private menu = h("div", "cg-menu");
  private res = h("div", "cg-res");
  private spot = false;
  private last: GameClick | undefined;
  private token = 0;
  private dlgKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(private ctx: UiCtx) {
    const wrap = h("div"); wrap.style.position = "relative";
    wrap.append(btn("本关目标 ▾", "", () => { this.menuPop.hidden = true; this.goalPop.hidden = !this.goalPop.hidden; }), this.goalPop);
    const wrap2 = h("div"); wrap2.style.position = "relative";
    wrap2.append(btn("☰", "", () => { this.goalPop.hidden = true; this.menuPop.hidden = !this.menuPop.hidden; this.renderMenuPop(); }), this.menuPop);
    this.tr.append(wrap, wrap2);
    this.goalPop.hidden = true; this.menuPop.hidden = true; this.tr.hidden = true;
    this.bubble.hidden = true; this.spotEl.hidden = true; this.backdrop.hidden = true; this.res.hidden = true; this.menu.hidden = true;
    document.body.append(this.tr, this.spotEl, this.bubble, this.backdrop, this.menu, this.res);
    addEventListener("resize", () => this.layout());
  }

  // ------------------------------------------------------------ 关卡选择（大卡片 + 章节分组）
  showMenu() {
    this.token++;
    if (this.ctx.game.active) this.ctx.game.close();
    setLabelOverride(null);
    this.tr.hidden = true; this.bubble.hidden = true; this.spotEl.hidden = true;
    this.backdrop.hidden = true; this.res.hidden = true;
    document.body.classList.remove("spotlight");
    this.ctx.onLevel(null);
    const m = this.menu;
    m.hidden = false; m.innerHTML = "";
    const n = Object.keys(this.prog.done).length;
    m.append(h("h1", "", "词战冒险"), h("div", "stat", `新手教程 · 已通关 ${n} / ${LEVELS.length}`));
    const bar = h("div", "cg-bar"), fill = h("i"); fill.style.width = `${(100 * n) / LEVELS.length}%`; bar.append(fill); m.append(bar);
    let grid: HTMLElement | null = null, ch = "";
    for (const lv of LEVELS) {
      if (lv.chapter !== ch) { ch = lv.chapter; m.append(h("div", "cg-ch", ch)); grid = h("div", "cg-grid"); m.append(grid); }
      const rec = this.prog.done[lv.id], open = unlocked(this.prog, lv.id);
      const b = h("button", "cg-card" + (rec ? " done" : ""));
      b.disabled = !open;
      b.innerHTML = `<span class="n">${lv.id}</span>${rec ? `<span class="ok">✓ ${rec.rounds || "—"} 轮</span>` : open ? "" : `<span class="lk">🔒</span>`}<b>${lv.title}</b><small>${lv.goal}</small>`;
      b.addEventListener("click", () => this.start(lv.id));
      grid!.append(b);
    }
    const foot = h("div", "foot");
    foot.append(btn("重看开场", "", () => this.ctx.onReplayIntro?.()), btn("清除通关记录", "", () => { if (confirm("清除全部通关记录？")) { this.prog = { done: {} }; saveProgress(this.prog); this.showMenu(); } }),
      btn("解锁全部（跳关）", "", () => { LEVELS.forEach((l) => { if (!this.prog.done[l.id]) this.prog.done[l.id] = { rounds: 0, at: Date.now() }; }); this.showMenu(); }));
    m.append(foot);
  }

  // ------------------------------------------------------------ 对话（底部半透明对话栏，点击 / 空格翻页，可跳过）
  say(lines: Line[], done: () => void) {
    if (!lines.length) { done(); return; }
    const tk = this.token;
    let i = 0;
    const bd = this.backdrop;
    bd.hidden = false;
    bd.style.background = this.spot ? "rgba(0,0,0,0.74)" : "transparent";
    this.layout();
    const finish = () => {
      bd.hidden = true; bd.innerHTML = "";
      if (this.dlgKey) removeEventListener("keydown", this.dlgKey);
      this.dlgKey = null;
      this.layout();
      if (tk === this.token) done();
    };
    const next = () => { i++; if (i >= lines.length) finish(); else show(); };
    const show = () => {
      bd.innerHTML = "";
      const l = lines[i], box = h("div", "cg-say");
      box.append(h("div", "who", l.who), h("div", "txt", l.text));
      const row = h("div", "row"), right = h("span");
      row.append(h("span", "dim", `${i + 1} / ${lines.length}　点击 / 空格 继续`));
      if (lines.length > 1 && i < lines.length - 1) right.append(btn("跳过", "skip", (e) => { e.stopPropagation(); finish(); }));
      right.append(btn(i < lines.length - 1 ? "▶" : "好的", "", (e) => { e.stopPropagation(); next(); }));
      row.append(right); box.append(row);
      box.addEventListener("click", next);
      bd.append(box);
    };
    if (this.dlgKey) removeEventListener("keydown", this.dlgKey);
    this.dlgKey = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); next(); } };
    addEventListener("keydown", this.dlgKey);
    show();
  }

  // ------------------------------------------------------------ 开一关：固定开局 + 钩子
  start(id: number) {
    this.token++;
    const lv = LEVELS.find((l) => l.id === id)!;
    this.lv = lv;
    this.spot = lv.id <= 2;
    document.body.classList.toggle("spotlight", this.spot);
    this.tracker = new GuideTracker(lv);
    this.plan = null;
    this.menu.hidden = true; this.res.hidden = true;
    this.goalPop.hidden = true; this.menuPop.hidden = true; this.tr.hidden = false;
    this.goalPop.innerHTML = `<div><b class="gold">目标</b>　${lv.goal}${lv.full ? "" : `（${lv.maxRounds} 轮内）`}</div><div class="dim">这一关学会：</div><ul>${lv.learn.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    document.getElementById("cg-title")!.textContent = `第 ${lv.id} 关 · ${lv.title}`;
    document.getElementById("cg-sub")!.textContent = lv.chapter;
    this.ctx.onLevel(lv);
    this.setupScene();
    setLabelOverride((M, uid) => M.R.U[uid]?.name ?? null);
    const M = makeMatch(lv, lv.seed ?? 1000 + lv.id);
    const hooks: GameHooks = {
      allow: lv.player.allow,
      foeStep: (mm) => { if (mm.declareSide() !== 1) return false; foeStep(mm, lv, this.plan); return true; },
      before: (c) => this.tracker.before(c),
      expect: (c) => this.tracker.expect(c),
      roundStart: (mm, go) => {
        this.plan = foePlan(mm, lv);
        this.tracker.startRound(mm);
        const rs = lv.rounds[mm.rnd];
        this.say([...(mm.rnd === 1 ? lv.intro : []), ...(rs?.say ?? [])], go);
      },
      rendered: (c) => this.layout(c),
      roundEnd: (mm) => { const after = lv.rounds[mm.rnd]?.after ?? []; if (after.length && mm.phase !== "over") this.say(after, () => this.layout()); },
      over: (mm) => { this.finish(mm); return true; },
      exit: () => this.showMenu(),
    };
    this.ctx.game.startLevel(M, hooks);
  }

  private setupScene() {
    const lv = this.lv;
    const sides = [lv.player.units, lv.foe.units];
    for (let s = 0; s < 2; s++) for (let i = 0; i < 3; i++) {
      const def = sides[s][i];
      const ci = cardIndex(s * 3 + i), card = this.ctx.cards[ci], panel = this.ctx.panels[ci];
      card.setActive(!!def);
      panel.el.style.display = def ? "" : "none";
      if (!def) continue;
      card.setArt(def.art, !!def.flip);
      card.setName(def.name);
      const nm = panel.el.querySelector(".ro-name");
      if (nm) nm.textContent = def.name;
    }
  }

  private renderMenuPop() {
    const p = this.menuPop;
    p.innerHTML = "";
    p.append(btn("规则速查", "ghost", () => { p.hidden = true; this.showRules(); }),
      btn("重来本关", "ghost", () => { p.hidden = true; this.start(this.lv.id); }),
      btn("关卡选择", "ghost", () => { p.hidden = true; this.showMenu(); }),
      btn("重看开场", "ghost", () => { p.hidden = true; this.ctx.onReplayIntro?.(); }));
  }

  private showRules() {
    const bg = h("div", "gm-overlay top"), m = h("div", "gm-modal");
    m.append(h("h2", "", "规则速查"));
    for (const l of NR.RULES_LINES) m.append(h("p", "", l));
    m.append(btn("知道了", "primary", () => bg.remove()));
    bg.append(m);
    bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
    document.body.append(bg);
  }

  cardClicked(uid: number) {
    if (!this.backdrop.hidden || !this.menu.hidden || !this.res.hidden) return;
    this.ctx.game.cardClicked(uid);
  }

  // ------------------------------------------------------------ 气泡 + 聚光灯：发光的东西旁边写「为什么点它」
  private layout(c0?: GameClick) {
    if (c0) this.last = c0;
    const c = c0 ?? this.last;
    const bub = this.bubble, sp = this.spotEl, game = this.ctx.game;
    const inGame = this.menu.hidden && game.active && !!this.tracker;
    const dlg = !this.backdrop.hidden;
    if (!inGame) { bub.hidden = true; sp.hidden = true; return; }
    const info = c ?? ({ kind: "unit", stage: "", tokens: 0, clause: 0, picked: [], latePick: [] } as GameClick);
    let rect: { left: number; top: number; right: number; bottom: number } | null = null;
    let onPanel = false;
    const hl = document.querySelector(".gm .hl") as HTMLElement | null;
    if (hl) { const r = hl.getBoundingClientRect(); rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; onPanel = true; }
    else if (game.hlCards.length) { const [x, y] = this.ctx.anchor(game.hlCards[0]); rect = { left: x - 62, top: y - 80, right: x + 62, bottom: y + 50 }; }
    const html = c && this.tracker.guided ? this.tracker.hint(c) : "";
    if (rect && html && !dlg) {
      bub.hidden = false; bub.innerHTML = html;
      const bw = bub.offsetWidth, bh = bub.offsetHeight;
      let left: number, side: string;
      if (onPanel) { left = rect.left - bw - 16; side = "l"; } else { left = rect.right + 14; side = "r"; if (left + bw > innerWidth - 8) { left = rect.left - bw - 14; side = "l"; } }
      bub.className = `cg-bubble ${side}`;
      bub.style.left = `${Math.max(8, left)}px`;
      bub.style.top = `${clamp((rect.top + rect.bottom) / 2 - 20, 56, innerHeight - bh - 8)}px`;
    } else bub.hidden = true;
    if (this.spot) {
      if (dlg) { sp.hidden = false; sp.style.cssText = `left:${innerWidth / 2}px;top:${innerHeight / 2}px;width:0;height:0;box-shadow:0 0 0 200vmax rgba(0,0,0,0)`; }
      else if (rect && this.tracker.guided) { sp.hidden = false; sp.style.cssText = `left:${rect.left - 8}px;top:${rect.top - 8}px;width:${rect.right - rect.left + 16}px;height:${rect.bottom - rect.top + 16}px`; }
      else sp.hidden = true;
    } else sp.hidden = true;
    void info;
  }

  // ------------------------------------------------------------ 通关 / 失败
  private finish(M: any) {
    const win = M.winner === 0;
    if (win) {
      this.prog = markDone(this.prog, this.lv.id, M.rnd);
      saveProgress(this.prog);
      this.say([...(this.lv.rounds[M.rnd]?.after ?? []), ...this.lv.outro], () => this.showResult(M));
    } else this.showResult(M);
  }

  private showResult(M: any) {
    const win = M.winner === 0, o = this.res;
    this.bubble.hidden = true; this.spotEl.hidden = true;
    o.hidden = false; o.innerHTML = "";
    const m = h("div", "gm-modal");
    m.append(h("h1", win ? "win" : "lose", win ? "通关！" : M.winner === -2 ? "平局" : "没成功"));
    m.append(h("p", "", win ? `「${this.lv.title}」用了 ${M.rnd} 轮。` : this.lv.full ? "电脑先到了目标。再来一次，试试辅助轮，或者换个打法。" : `${this.lv.maxRounds} 轮内没能完成目标。再来一次。`));
    if (this.lv.full) for (let s = 0; s < 2; s++) m.append(h("p", "dim", `${s === 0 ? "你" : "电脑"}（${M.clsOf(s)}）完成度 ${Math.round(M.progress(s) * 100)}%`));
    const foot = h("div", "foot");
    const next = LEVELS.find((l) => l.id === this.lv.id + 1);
    if (win && next) foot.append(btn(`下一关：${next.title} →`, "primary", () => { o.hidden = true; this.start(next.id); }));
    foot.append(btn("再玩一次", "", () => { o.hidden = true; this.start(this.lv.id); }), btn("关卡选择", "", () => { o.hidden = true; this.showMenu(); }));
    if (win && !next) m.append(h("p", "gold", "教程全部通关！"));
    m.append(foot);
    o.append(m);
  }
}

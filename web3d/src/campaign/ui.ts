// 词战冒险的界面：对话、关卡选择、右侧操作栏（引导高亮 + 每步原因）、结算回放、通关记录。
// 逻辑都在 session.ts；这里只负责把会话的状态画出来，并把点击交给会话。
import type { UnitCard } from "../unitCard";
import type { SentencePanel } from "../sentencePanel";
import type { Tok } from "../words";
import * as NR from "../engine/rules";
import * as NE from "../engine/engine";
import * as NT from "../engine/text";
import { BASIC_DESC, actTokens, type Tok as CTok } from "../engine/composer";
import { suggest, suggestLate, PASS_GAIN } from "../engine/ai";
import { loadoutOf } from "../engine/loadout";
import { actionToks, cardIndex, unitLabel } from "../live";
import { LEVELS } from "./levels";
import { Session } from "./session";
import { loadProgress, markDone, saveProgress, unlocked, type Progress } from "./progress";
import type { Level, Line } from "./types";
import "../game.css";
import "./campaign.css";
/* eslint-disable @typescript-eslint/no-explicit-any */

const MARK = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
const mk = (n: number) => MARK[Math.min(n, MARK.length - 1)];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  onChange: () => void;
  onLevel: (lv: Level | null) => void;
}

export class CampaignUI {
  S!: Session;
  lv!: Level;
  prog: Progress = loadProgress();
  private root = h("aside", "gm");
  private elTop = h("div", "gm-top");
  private elGoal = h("div", "cg-goal");
  private elUnits = h("div", "gm-units");
  private elHand = h("div", "gm-hand");
  private elAct = h("div", "gm-act");
  private elDecl = h("div", "gm-decl");
  private elLog = h("div", "gm-log");
  private backdrop = h("div", "cg-backdrop");
  private menu = h("div", "cg-menu");
  private res = h("div", "cg-res");
  private shown: Record<number, [number, boolean]> = {};
  private token = 0;
  private busy = false;
  private fast = false;
  private dlgKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(private ctx: UiCtx) {
    this.root.append(this.elTop, this.elGoal, this.elUnits, this.elHand, this.elAct, this.elDecl, this.elLog);
    this.root.hidden = true;
    this.backdrop.hidden = true; this.res.hidden = true; this.menu.hidden = true;
    document.body.append(this.root, this.backdrop, this.menu, this.res);
  }

  // ------------------------------------------------------------ 关卡选择
  showMenu() {
    this.token++;
    this.busy = false;
    this.root.hidden = true;
    this.backdrop.hidden = true; this.res.hidden = true;
    this.ctx.cards.forEach((c) => c.setSelected(false));
    this.ctx.onLevel(null);
    const m = this.menu;
    m.hidden = false; m.innerHTML = "";
    const n = Object.keys(this.prog.done).length;
    m.append(h("h1", "", "词战冒险 · 新手教程"), h("div", "stat", `已通关 ${n} / ${LEVELS.length} 关。每一关都会教一个新规则，按顺序解锁；通关记录保存在这台设备的浏览器里。`));
    const grid = h("div", "cg-grid");
    let ch = "";
    for (const lv of LEVELS) {
      if (lv.chapter !== ch) { ch = lv.chapter; grid.append(h("div", "cg-ch", ch)); }
      const rec = this.prog.done[lv.id], open = unlocked(this.prog, lv.id);
      const b = h("button", "cg-card" + (rec ? " done" : ""));
      b.disabled = !open;
      b.innerHTML = `<span class="n">第 ${lv.id} 关${open ? "" : " · 未解锁"}</span><b>${lv.title}</b><small>目标：${lv.goal}</small><small>学会：${lv.learn.join("；")}</small>${rec ? `<span class="ok">✓ 已通关 · ${rec.rounds} 轮</span>` : ""}`;
      b.addEventListener("click", () => this.start(lv.id));
      grid.append(b);
    }
    m.append(grid);
    const foot = h("div", "foot");
    foot.append(btn("清除通关记录", "", () => { if (confirm("清除全部通关记录？")) { this.prog = { done: {} }; saveProgress(this.prog); this.showMenu(); } }), btn("解锁全部关卡（跳关）", "", () => { LEVELS.forEach((l) => { if (!this.prog.done[l.id]) this.prog.done[l.id] = { rounds: 0, at: Date.now() }; }); this.showMenu(); }));
    m.append(foot);
  }

  // ------------------------------------------------------------ 对话
  say(lines: Line[], done: () => void) {
    if (!lines.length) { done(); return; }
    const tk = this.token;
    let i = 0;
    const bd = this.backdrop;
    bd.hidden = false;
    const finish = () => { bd.hidden = true; bd.innerHTML = ""; if (this.dlgKey) removeEventListener("keydown", this.dlgKey); this.dlgKey = null; if (tk === this.token) done(); };
    const show = () => {
      bd.innerHTML = "";
      const l = lines[i], box = h("div", "cg-say");
      box.append(h("div", "who", l.who), h("div", "txt", l.text));
      const row = h("div", "row"), right = h("span");
      row.append(h("span", "dim", `${i + 1} / ${lines.length}　空格 / 回车 继续`));
      if (lines.length > 1 && i < lines.length - 1) right.append(btn("跳过对话", "skip", finish));
      right.append(btn(i < lines.length - 1 ? "继续 ▶" : "好的", "", next));
      row.append(right); box.append(row); bd.append(box);
    };
    const next = () => { i++; if (i >= lines.length) finish(); else show(); };
    if (this.dlgKey) removeEventListener("keydown", this.dlgKey);
    this.dlgKey = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); next(); } };
    addEventListener("keydown", this.dlgKey);
    show();
  }

  // ------------------------------------------------------------ 开一关
  start(id: number) {
    this.token++;
    const lv = LEVELS.find((l) => l.id === id)!;
    this.lv = lv;
    this.S = new Session(lv);
    this.menu.hidden = true; this.res.hidden = true;
    this.root.hidden = false;
    this.busy = false;
    this.elLog.innerHTML = "";
    this.ctx.onLevel(lv);
    this.setupScene();
    this.refreshAll(true);
    this.say(lv.intro, () => this.roundIntro());
  }

  private setupScene() {
    const lv = this.lv, M = this.S.M;
    const sides = [lv.player.units, lv.foe.units];
    for (let s = 0; s < 2; s++) for (let i = 0; i < 3; i++) {
      const uid = s * 3 + i, def = sides[s][i];
      const ci = cardIndex(uid), card = this.ctx.cards[ci], panel = this.ctx.panels[ci];
      card.setActive(!!def);
      panel.el.style.display = def ? "" : "none";
      if (!def) continue;
      card.setArt(def.art, !!def.flip);
      card.setName(def.name);
      const nm = panel.el.querySelector(".ro-name");
      if (nm) nm.textContent = def.name;
      void M;
    }
  }

  private roundIntro() {
    const rs = this.S.rs;
    this.refreshAll(true);
    this.log(`—— 第 ${this.S.M.rnd} 轮 ——`, "gold");
    if (rs?.say?.length) this.say(rs.say, () => this.step());
    else this.step();
  }

  // ------------------------------------------------------------ 画面刷新
  private refreshAll(resetShown = false) {
    const M = this.S.M;
    if (resetShown) { this.shown = {}; for (const u of M.R.U) this.shown[u.uid] = [u.hp, u.down !== -1]; }
    this.renderTop(); this.renderUnits(); this.renderHand(); this.renderDecl(); this.syncCards();
    document.getElementById("cg-title")!.textContent = `第 ${this.lv.id} 关 · ${this.lv.title}`;
    document.getElementById("cg-sub")!.textContent = `${this.lv.chapter}`;
  }

  private tokens(a: any): Tok[] {
    const M = this.S.M;
    const names = new Map<string, { name: string; side: "r" | "b" }>();
    for (const u of M.R.U) names.set(unitLabel(u.uid), { name: u.name, side: u.side === 0 ? "b" : "r" });
    return actionToks(M, a, 0).map((t) => {
      if (t.k === "unit") { const x = names.get(t.name); if (x) return { k: "unit", name: x.name, side: x.side } as Tok; }
      return t;
    });
  }

  private syncCards() {
    const M = this.S.M;
    for (const u of M.R.U) {
      if (u.perma) continue;
      const ci = cardIndex(u.uid), card = this.ctx.cards[ci], panel = this.ctx.panels[ci];
      const sh = this.shown[u.uid] ?? [u.hp, u.down !== -1];
      card.syncHp(sh[1] ? 0 : sh[0], u.mx);
      card.setLoadout(loadoutOf(M, u.uid));
      const list = M.phase === "declare" || M.phase === "assign" ? M.declared : M.lastDeclared;
      const a = list.find((x: any) => x.uid === u.uid);
      if (a) panel.set(this.tokens(a), a.start); else panel.set([], null);
    }
    this.ctx.onChange();
  }

  private highlight() {
    const S = this.S, st = S.stage;
    this.ctx.cards.forEach((card, i) => {
      const uid = i >= 3 ? i - 3 : i + 3;
      let on = false;
      const e = S.expect();
      if (st === "pick") on = e.k === "unit" ? e.uid === uid : e.k === "free" && uid < 3 && S.M.remaining[0].includes(uid);
      else if (st === "target") on = e.k === "target" ? e.uid === uid : e.k === "free" && S.targetOk(uid);
      else if (st === "assign") on = e.k === "late" ? e.uid === uid : e.k === "free" && S.lateOk(uid);
      card.setSelected(on);
    });
  }

  private renderTop() {
    const S = this.S, M = S.M, el = this.elTop, lv = this.lv;
    el.innerHTML = "";
    const first = M.firstSide();
    el.append(h("div", "gm-round", `第 ${M.rnd} / ${lv.full ? NR.MAX_ROUNDS : lv.maxRounds} 轮 · 本轮先宣告：${first === 0 ? "你" : "对手"}`));
    const row = h("div", "gm-prog");
    const ap = M.phase === "declare" ? M.res[0].ap : M.sides[0].ap;
    if (lv.showClass) {
      const c = M.clsOf(0);
      const chip = h("span", "chip", `你 · ${NR.CLASS_NAME[c]}`); chip.style.background = NR.CLASS_COLOR[c];
      chip.title = `特长：${NR.CLASS_TALENT[c]}\n得分：${NR.CLASS_GOAL[c]}`;
      row.append(chip);
    }
    row.append(h("span", "chip gold", `行动点 ${ap}/${NR.AP_CAP}`));
    el.append(row);
    if (lv.full) {
      for (let s = 0; s < 2; s++) {
        const c = M.clsOf(s), p = M.progress(s);
        const r2 = h("div", "gm-prog");
        const chip = h("span", "chip", `${s === 0 ? "你" : "电脑"} · ${NR.CLASS_NAME[c]}`); chip.style.background = NR.CLASS_COLOR[c];
        const bar = h("span", "bar"), fill = h("i"); fill.style.width = `${Math.min(100, p * 100)}%`; fill.style.background = NR.CLASS_COLOR[c];
        bar.append(fill);
        r2.append(chip, bar, h("small", "", `${Math.round(p * 100)}%（${NR.METRIC_NAME[c]} ${M.R.M[s][NR.METRIC[c]]}/${NR.TARGET[c]}）`));
        el.append(r2);
      }
    }
    const bar = h("div", "gm-tools");
    bar.append(btn("规则速查", "ghost", () => this.showRules()), btn("重来本关", "ghost", () => this.start(lv.id)), btn(this.fast ? "动画：快" : "动画：正常", "ghost", (e) => { this.fast = !this.fast; (e.target as HTMLElement).textContent = this.fast ? "动画：快" : "动画：正常"; }), btn("关卡选择", "ghost", () => this.showMenu()));
    el.append(bar);
    this.elGoal.innerHTML = `<b>目标：</b>${lv.goal}${lv.full ? "" : `（${lv.maxRounds} 轮内）`}<ul class="cg-learn">${lv.learn.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  }

  private renderUnits() {
    const M = this.S.M, el = this.elUnits;
    el.innerHTML = "";
    for (const u of M.R.U) {
      if (u.perma) continue;
      const sh = this.shown[u.uid] ?? [u.hp, u.down !== -1];
      const r = h("div", `gm-u ${u.side === 0 ? "me" : "foe"}${sh[1] ? " down" : ""}`);
      const chips: string[] = [];
      for (const nm of Object.keys(u.st)) chips.push(NT.statusChip(nm, u.st[nm], M.rnd));
      if (u.mit > 0) chips.push(`减伤${u.mit}`);
      for (const _l of u.lis) { void _l; chips.push("转移"); }
      for (const c of M.R.conts) if (c.uid === u.uid) chips.push(`续·${c.cl.k === "atk" ? "打" : c.cl.k === "heal" ? "奶" : "减伤"}${c.cl.n}·第${c.start}秒·还${c.left}轮`);
      if (M.phase === "declare") {
        if (M.passed[u.side].includes(u.uid)) chips.push("本轮不出手");
        else { const a = M.declared.find((x: any) => x.uid === u.uid); if (a) chips.push(`已宣告${mk(a.ord)}`); }
      }
      const hpPct = sh[1] ? 0 : (100 * sh[0]) / u.mx;
      const kw = u.kw && u.kw !== "无" ? `<small>【${u.kw}】${u.kws ? "已用" : ""}</small>` : "";
      r.innerHTML = `<b>${u.side === 0 ? "你的" : "对手的"}${u.name}</b><span class="hp"><i style="width:${hpPct}%"></i></span><em>${sh[1] ? "倒下·休整" : `${sh[0]}/${u.mx}`}</em>${kw}${chips.map((c) => `<span class="chip">${c}</span>`).join("")}`;
      r.addEventListener("click", () => this.cardClicked(u.uid));
      el.append(r);
    }
  }

  private renderHand() {
    const M = this.S.M, el = this.elHand;
    el.innerHTML = "";
    el.append(h("span", "dim", "你的数字牌："), h("span", "chip gray", "1 · 免费无限"));
    const reserved: number[] = M.phase === "declare" ? M.res[0].cards : [];
    M.sides[0].cards.forEach((c: any, i: number) => {
      const cooling = !c.once && M.rnd - c.last < 2;
      let t = `${c.v} · ${c.once ? "骰子·一次性" : c.src === "赠" ? "教练借你" : "能反复用"}`, cls = c.once ? "chip dice" : "chip gold";
      if (cooling) { t += "（冷却）"; cls = "chip gray"; } else if (reserved.includes(i)) { t += "（本轮已用）"; cls = "chip gray"; }
      el.append(h("span", cls, t));
    });
  }

  private renderDecl() {
    const M = this.S.M, el = this.elDecl;
    el.innerHTML = "";
    el.append(h("div", "dim", M.phase === "declare" || M.phase === "assign" ? "本轮已宣告（你看得到对方定下的每一句）" : "上一轮的宣告"));
    const list = M.phase === "declare" || M.phase === "assign" ? M.declared : M.lastDeclared;
    if (!list.length) el.append(h("small", "dim", "（还没有）"));
    for (const a of list) {
      const mine = a.side === 0;
      const t = `${mk(a.ord)} ${mine ? "你" : "对手"} · ${M.R.U[a.uid].name} · 第 ${a.start} 秒 · 花 ${a.cost} 点${a.blood > 0 ? `（其中 ${a.blood} 点用血付）` : ""}${a.cv.length ? `，数字牌 [${a.cv.join(", ")}]` : ""}：${NT.actionText(M as any, a.cl, 0, a.side)}`;
      el.append(h("div", "decl " + (mine ? "me" : "foe"), t));
    }
    if (M.phase === "declare") for (let s = 0; s < 2; s++) for (const uid of M.passed[s]) el.append(h("small", "dim", `${s === 0 ? "你" : "对手"}的${M.R.U[uid].name} 本轮不出手`));
  }

  private log(t: string, cls = "") { const d = h("div", cls, t); this.elLog.append(d); this.elLog.scrollTop = this.elLog.scrollHeight; }
  private toast(text: string) { const t = h("div", "gm-toast", text); document.body.append(t); setTimeout(() => t.remove(), 2800); }

  showRules() {
    const bg = h("div", "gm-overlay top"), m = h("div", "gm-modal");
    m.append(h("h2", "", "规则速查"));
    for (const l of NR.RULES_LINES) m.append(h("p", "", l));
    m.append(btn("知道了", "primary", () => bg.remove()));
    bg.append(m);
    bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
    document.body.append(bg);
  }

  // ------------------------------------------------------------ 流程
  cardClicked(uid: number) {
    if (this.busy || !this.backdrop.hidden || !this.S) return;
    const S = this.S, st = S.stage;
    let err = "";
    if (st === "pick") err = S.clickUnit(uid);
    else if (st === "target") err = S.clickTarget(uid);
    else if (st === "assign") err = S.clickLate(uid);
    else return;
    this.after(err);
  }

  private after(err: string) {
    if (err) { this.toast(err); this.renderAct(); return; }
    this.step();
  }

  /** 会话停在哪，就把那一步画出来；该结算就自动结算 */
  private step() {
    const S = this.S;
    this.refreshAll();
    if (S.stage === "resolve") { void this.runResolve(); return; }
    if (S.stage === "round_end" || S.stage === "over") return;
    this.renderAct();
    this.highlight();
  }

  private guideBox(e: any): HTMLElement | null {
    const S = this.S;
    if (S.free) return null;
    const box = h("div", "cg-guide");
    switch (e.k) {
      case "unit": box.innerHTML = `<b>轮到你：</b>点高亮的随从【${S.M.R.U[e.uid].name}】。${e.why ? "" : ""}`; break;
      case "pass": box.innerHTML = `<b>这个随从这一轮不出手：</b>点高亮的「不出手」。引导里没有它的句子，该说的话都说完了。`; break;
      case "word": box.innerHTML = `<b>下一张：【${e.w}】</b>　${e.note ?? NR.WORDS[e.w]?.desc ?? BASIC_DESC[e.w] ?? ""}`; break;
      case "num": box.innerHTML = `<b>下一张：数字牌 ${e.n}</b>　${e.note ?? (e.n === 1 ? "1 是免费的。" : "2 以上要用手里的数字牌。")}`; break;
      case "done": box.innerHTML = `<b>句子拼完了。</b>点高亮的「拼好了」。`; break;
      case "target": box.innerHTML = `<b>点目标：【${S.M.R.U[e.uid]?.name ?? ""}】</b>　${e.note ?? "直接点场上高亮的那张卡，或右侧列表里的名字。"}`; break;
      case "act": box.innerHTML = `<b>选要延后的那一句：</b>${e.note ?? ""}`; break;
      case "time": box.innerHTML = `<b>起手第 ${e.sec} 秒：</b>${e.why ?? ""}`; break;
      case "late": box.innerHTML = `<b>现在才定目标：</b>双方都宣告完了。点高亮的【${S.M.R.U[e.uid].name}】。`; break;
      default: return null;
    }
    return box;
  }

  private renderAct() {
    const S = this.S, M = S.M, el = this.elAct, st = S.stage;
    el.innerHTML = "";
    const e = S.expect();
    const g = this.guideBox(e);
    switch (st) {
      case "pick": {
        el.append(h("h3", "gold", "轮到你：选一个随从，给它拼一句"));
        if (g) el.append(g);
        else el.append(h("small", "dim", this.lv.freeTip ?? this.S.rs?.tip ?? "每个随从一轮一句；可以先让一个随从出手，看看对方怎么接，再定下一个。"));
        if (S.rs?.tip && S.guided) el.append(h("small", "dim", S.rs.tip));
        for (const uid of M.remaining[0]) {
          const u = M.R.U[uid], row = h("div", "row2");
          const goB = btn(`给【${u.name}】拼一句`, "primary" + (e.k === "unit" && e.uid === uid ? " hl" : e.k === "unit" ? " dimmed" : ""), () => this.after(S.clickUnit(uid)));
          const passB = btn("它这轮不出手", "ghost" + (e.k === "pass" && e.uid === uid ? " hl" : e.k === "pass" || e.k === "unit" ? " dimmed" : ""), () => this.after(S.clickPass(uid)));
          row.append(goB, passB);
          el.append(row);
        }
        el.append(h("p", "", `本轮行动点还剩 ${M.res[0].ap}`));
        break;
      }
      case "compose": this.renderComposer(e, g); break;
      case "target": {
        const c = S.pending[S.pendI];
        el.append(h("h3", "gold", `选目标（第 ${S.pendI + 1} / ${S.pending.length} 段）`), h("p", "", NT.clauseText(null, c)));
        if (g) el.append(g);
        if (c.k === "delay") {
          el.append(h("p", "", "要延后对方的哪一句？"));
          for (const a of M.declared) if (a.side === 1) el.append(btn(`${mk(a.ord)} 对手·${M.R.U[a.uid].name} 第 ${a.start} 秒：${NT.actionText(M as any, a.cl)}`, "sug" + (e.k === "act" && e.ord === a.ord ? " hl" : ""), () => this.after(S.clickAct(a.ord))));
        } else {
          el.append(h("p", "", `点 ${c.count ?? 1} 个${(c.side ?? "enemy") === "enemy" ? "敌方" : "你的"}随从（已选 ${c.tg.length} 个）——直接点场上高亮的卡，或点下面的名字`));
          const row = h("div", "opts");
          for (const u of M.R.U) if (!u.perma && S.targetOk(u.uid)) row.append(btn(`${u.side === 0 ? "你的" : "对手的"}${u.name}`, "w" + (e.k === "target" && e.uid === u.uid ? " hl" : ""), () => this.after(S.clickTarget(u.uid))));
          el.append(row);
        }
        el.append(btn("重新拼", "ghost", () => { S.restart(); this.step(); }));
        break;
      }
      case "timing": {
        const ms = NE.actionWindup(S.pending, M.caps(0).wind);
        el.append(h("h3", "gold", "第几秒起效？"), h("p", "", NT.actionText(M as any, S.pending)));
        if (g) el.append(g);
        el.append(h("small", "dim", `这句最早第 ${ms} 秒。越早越不容易被打断；对方的招落在哪一秒，看上面的时间轴。`));
        const cst = NE.actionCost(S.pending, M.caps(0).and);
        if (cst > M.res[0].ap) el.append(h("p", "red", `行动点差 ${cst - M.res[0].ap}：开打时先从【${M.R.U[S.selUid].name}】身上扣 ${cst - M.res[0].ap} 点生命付掉。`));
        const best = S.pending[0]?.sugg_start ?? ms;
        if (S.free && best !== ms) el.append(h("p", "green", `辅助轮建议第 ${best} 秒。`));
        const foe = new Set(M.declared.filter((a: any) => a.side === 1).map((a: any) => a.start));
        const flow = h("div", "opts");
        for (let t = ms; t <= NR.TIMELINE; t++) flow.append(btn(`${t} 秒${foe.has(t) ? "·对方" : ""}`, "w" + (e.k === "time" ? (e.sec === t ? " hl" : " dimmed") : t === best ? " primary" : ""), () => this.after(S.clickTime(t))));
        el.append(flow, btn("重新拼", "ghost", () => { S.restart(); this.step(); }));
        break;
      }
      case "assign": {
        const pl = M.pendingLate(0);
        if (!pl.length) return;
        const item = pl[0], c2 = item.cl;
        const need = Math.min(c2.count, S.latePool(c2).length);
        el.append(h("h3", "green", `择流 · 定目标（还剩 ${pl.length} 段）`));
        if (g) el.append(g);
        el.append(h("p", "", `双方都宣告完了，对手看不到你的目标。现在点 ${need} 个${c2.side === "enemy" ? "敌方" : "你的"}随从（已点 ${S.latePick.length} 个）。出手前目标倒了会自动换人。`));
        const a = M.declared.find((x: any) => x.ord === item.ord);
        if (a) el.append(h("p", "decl me", `${mk(a.ord)} ${M.R.U[a.uid].name} 第 ${a.start} 秒：${NT.clauseText(M as any, c2)}`));
        const row = h("div", "opts");
        for (const uid of S.latePool(c2)) if (S.lateOk(uid)) row.append(btn(`${M.R.U[uid].name}`, "w" + (e.k === "late" && e.uid === uid ? " hl" : ""), () => this.after(S.clickLate(uid))));
        el.append(row);
        if (S.free) {
          const sug = suggestLate(M, 0, item.ord, item.ci);
          el.append(btn(`用建议：${sug.map((x) => M.R.U[x].name).join("、")}`, "ghost", () => { S.latePick = []; for (const x of sug) S.clickLate(x); this.step(); }), btn("剩下的全部用建议", "ghost", () => { S.lateAuto(); this.step(); }));
        }
        break;
      }
    }
  }

  private renderComposer(e: any, g: HTMLElement | null) {
    const S = this.S, M = S.M, el = this.elAct, cmp = S.cmp!;
    const op = cmp.options(), pr = op.parsed;
    const cls = M.clsOf(0), u = M.R.U[S.selUid];
    const head = h("div", "cmp-head");
    head.append(h("h3", "", `给【${u.name}】拼一句`), h("span", "chip", `本轮还剩行动点 ${M.res[0].ap}`));
    if (cmp.cp.blood > 0) head.append(h("span", "chip red", `不够可用血付，最多 ${M.bloodRoom(0, S.selUid)}`));
    el.append(head);
    if (this.lv.showClass) el.append(h("small", "talent", `职业特长：${NR.CLASS_TALENT[cls]}`));
    if (g) el.append(g);
    if (S.free) {
      const sugg = h("div", "sugg");
      sugg.append(btn("辅助轮：让电脑出几个主意（点一下装进来）", "ghost", () => this.showSuggestions(sugg)));
      el.append(sugg);
    }
    const rail = h("div", "rail");
    cmp.tokens.forEach((t, i) => {
      rail.append(h("span", t.t === "n" ? `tile num${Number(t.v) > 1 ? " big" : ""}` : `tile${NR.WORDS[String(t.v)] ? " adv" : ""}`, String(t.v)));
      if (pr.glue[i]) rail.append(h("span", "glue", pr.glue[i]));
    });
    rail.append(h("span", "tile ghost", "?"));
    el.append(rail);
    el.append(h("p", "cmp-text", pr.err ? pr.err : pr.complete ? `这句话：${NT.actionText(M as any, pr.clauses)}。` : !cmp.tokens.length ? "这句话：（还是空的，从下面挑第一张）" : `拼到这里：${cmp.draftText()}（还没拼完）`));
    const pv = h("p", "cmp-preview"); el.append(pv);
    if (S.free) el.append(h("p", "cmp-help", cmp.help()));
    const words = h("div", "opts");
    for (const it of op.words) {
      const isHl = e.k === "word" && e.w === it.w;
      const b = h("button", "w" + (isHl ? " hl" : e.k === "word" ? " dimmed" : it.ok && NR.WORDS[it.w] ? " primary" : ""), it.w);
      b.disabled = !it.ok;
      let tip = NR.WORDS[it.w] ? NR.WORDS[it.w].desc : BASIC_DESC[it.w] ?? "";
      if (it.w === "并") tip += `（每多一段 +${cmp.cp.and} 行动点，最多 ${cmp.cp.clauses} 段）`;
      if (it.w === "持续" && pr.cur?.k !== "st") tip = "续流特长：这一段以后每轮同一秒自动再来一次，后面放数字牌（一共几轮）";
      if (NR.WORDS[it.w]) tip += `（进阶词：卡组里还能用 ${cmp.wordLeft(it.w)} 张，价格 ${NR.WORDS[it.w].price}）`;
      if (it.why) tip += ` ${it.why}`;
      const pvt = cmp.previewWith({ t: "w", v: it.w });
      b.title = `${tip}\n接上以后：${pvt}`;
      const show = () => { pv.textContent = it.ok ? `接上它：${pvt}` : it.why; };
      b.addEventListener("mouseenter", show); b.addEventListener("focus", show); b.addEventListener("mouseleave", () => { pv.textContent = ""; });
      b.addEventListener("click", () => this.after(S.clickWord(it.w)));
      words.append(b);
    }
    if (!op.words.length && !op.num) words.append(h("small", "dim", "（这一段拼完了）"));
    el.append(h("small", "dim", "下一张可以接（鼠标移上去，先看接上以后这句话怎么说）"), words);
    el.append(h("small", "dim", "你的数字牌（1 免费无限用；放进句子里的那张本轮就用掉了）"));
    const nums = h("div", "opts");
    const have = M.usableValues(0), used = cmp.usedValues();
    const nb = (label: string, n: number, ok: boolean, hint = "") => {
      const isHl = e.k === "num" && e.n === n;
      const b = h("button", "w" + (isHl ? " hl" : e.k === "num" ? " dimmed" : ok ? " primary" : ""), label);
      b.disabled = !ok;
      if (ok) {
        const pvt = cmp.previewWith({ t: "n", v: n, free: !!hint });
        b.title = `${hint}接上以后：${pvt}`;
        const show = () => { pv.textContent = `接上它：${pvt}`; };
        b.addEventListener("mouseenter", show); b.addEventListener("focus", show); b.addEventListener("mouseleave", () => { pv.textContent = ""; });
      }
      b.addEventListener("click", () => this.after(S.clickNum(n)));
      nums.append(b);
    };
    nb("1（免费）", 1, op.num);
    if (cmp.freeCount()) for (const fv of [2, 3]) nb(`${fv}（择流免费）`, fv, true, "择流选几个目标不用数字牌\n");
    for (const v of Object.keys(have).map(Number).sort((a, b) => a - b)) nb(`${v} ×${have[v] - (used[v] ?? 0)}`, v, op.num && have[v] - (used[v] ?? 0) > 0);
    el.append(nums);
    const ci = cmp.costInfo();
    el.append(h("p", "cmp-cost", ci.text));
    const foot = h("div", "cmp-foot");
    foot.append(btn("撤回一张", "ghost", () => { S.undo(); this.step(); }), btn("取消", "ghost", () => { S.restart(); this.step(); }));
    const ok = btn("拼好了 → 下一步", "primary" + (e.k === "done" ? " hl" : ""), () => this.after(S.clickDone()));
    ok.disabled = ci.bad || !pr.complete;
    foot.append(ok);
    el.append(foot);
  }

  private showSuggestions(box: HTMLElement) {
    const S = this.S, M = S.M, cmp = S.cmp!;
    box.innerHTML = "";
    const list = suggest(M, 0, S.selUid, 3);
    if (!list.length) { box.append(h("small", "dim", "辅助轮：这个随从现在没什么好打的，可以让它这轮不出手。")); return; }
    box.append(h("small", "dim", "辅助轮 · 电脑会这样拼（点一下装进句子，还能接着改）："));
    for (const it of list) {
      const a = it.act;
      let extra = `第 ${a.start} 秒 · 花 ${a.cost} 点${a.blood > 0 ? `（${a.blood} 点用血付）` : ""}`;
      if (it.gain < PASS_GAIN) extra += " · 电脑觉得不太值";
      box.append(btn(`${NT.actionText(M as any, a.cl)}  （${extra}）`, "sug", () => {
        const toks = actTokens(a.cl) as CTok[];
        cmp.tokens = structuredClone(toks);
        cmp.sugg = { act: a, tokens: structuredClone(toks) };
        this.step();
      }));
    }
  }

  // ------------------------------------------------------------ 结算回放
  private async runResolve() {
    const S = this.S, M = S.M, tk = this.token;
    this.busy = true;
    this.elAct.innerHTML = "";
    this.elAct.append(h("h3", "gold", "结算中……"), btn("跳过动画", "ghost", () => { this.fast = true; }));
    this.ctx.cards.forEach((c) => c.setSelected(false));
    const before: Record<number, [number, boolean]> = {};
    for (const u of M.R.U) before[u.uid] = [u.hp, u.down !== -1];
    const progBefore = [M.progress(0), M.progress(1)];
    const events = S.doResolve();
    this.shown = before;
    this.elLog.innerHTML = "";
    this.log(`—— 第 ${M.rnd} 轮结算 ——`, "gold");
    await sleep(this.fast ? 20 : 400);
    for (const ev of events) {
      const line = this.eventText(ev);
      if (line) this.log(line.text, line.cls);
      this.applyShown(ev);
      if (!this.fast) await sleep(350);
      if (tk !== this.token) return;
    }
    this.busy = false;
    this.refreshAll(true);
    this.roundEnd(progBefore);
  }

  private applyShown(ev: any) {
    let uid = -1, delta = 0;
    switch (ev.type) {
      case "hit": case "redirected": case "burn": uid = ev.tgt; delta = -ev.dealt; break;
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
      card.syncHp(this.shown[uid][1] ? 0 : this.shown[uid][0], this.S.M.R.U[uid].mx);
      this.renderUnits();
    }
  }

  private eventText(ev: any): { text: string; cls: string } | null {
    const M = this.S.M as any;
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
    }
    return null;
  }

  private roundEnd(progBefore: number[]) {
    const S = this.S, M = S.M, el = this.elAct;
    el.innerHTML = "";
    const done = M.phase === "over";
    const after = S.lv.rounds[M.rnd]?.after ?? [];
    const draw = () => {
      el.innerHTML = "";
      el.append(h("h3", "", `第 ${M.rnd} 轮结束`));
      if (this.lv.full) for (let s = 0; s < 2; s++) el.append(h("p", "", `${s === 0 ? "你" : "电脑"}：完成度 ${Math.round(progBefore[s] * 100)}% → ${Math.round(M.progress(s) * 100)}%`));
      for (const n of M.roundNotes) {
        const who = n.side === 0 ? "你" : "对手";
        if (n.type === "dice") {
          const got = n.rolls.filter((x: number) => x > 1);
          el.append(h("p", "gold", `${who} ${n.why}，掷骰子：${n.rolls.join("、")} → ${got.length ? `得到一次性数字牌 ${got.join("、")}` : "运气不好，都是 1"}`));
        } else if (n.type === "floor") el.append(h("p", "gold", `${who} 得到保底数字【${n.value}】（能反复用）`));
        else if (n.type === "ladder") el.append(h("p", "green", `${who} 得分到 ${Math.round(n.at * 100)}%：解锁 ${n.copies} 张【${n.value}】`));
      }
      if (done) { el.append(btn("看结果", "primary big", () => this.finish())); return; }
      el.append(btn("下一轮 →", "primary big hl", () => { S.nextRound(); this.refreshAll(true); this.roundIntro(); }));
    };
    draw();
    if (after.length && !done) this.say(after, () => undefined);
  }

  // ------------------------------------------------------------ 通关 / 失败
  private finish() {
    const S = this.S, M = S.M;
    if (S.won) {
      this.prog = markDone(this.prog, this.lv.id, M.rnd);
      saveProgress(this.prog);
      this.say([...(S.lv.rounds[M.rnd]?.after ?? []), ...this.lv.outro], () => this.showResult(true));
    } else this.showResult(false);
  }

  private showResult(win: boolean) {
    const M = this.S.M, o = this.res;
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


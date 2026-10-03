// 把规则引擎接到场景：电脑对电脑逐句宣告 → 结算 → 下一轮；句子进读数面板，装备变成立绘外壳。
import type { UnitCard } from "./unitCard";
import type { SentencePanel } from "./sentencePanel";
import type { Tok } from "./words";
import { Match } from "./engine/match";
import { presetDeck, type Cls } from "./engine/rules";
import { loadoutOf } from "./engine/loadout";
import type { CastShow } from "./fx/castShow";
/* eslint-disable @typescript-eslint/no-explicit-any */

const NUM = ["一", "二", "三"];
/** 引擎的随从编号 → 场景里卡的下标（场景：0-2 红上排，3-5 蓝下排；引擎：0 方 = 蓝，1 方 = 红） */
export const cardIndex = (uid: number) => (uid < 3 ? 3 + uid : uid - 3);
export const unitLabel = (uid: number) => (uid < 3 ? "蓝" : "红") + NUM[uid % 3];
/** [campaign hook] 剧情关卡里随从有自己的名字：设置后句子里的目标用它。默认 null = 原来的「蓝一 / 红二」 */
export let labelOverride: ((M: Match, uid: number) => string | null) | null = null;
export const setLabelOverride = (f: typeof labelOverride) => { labelOverride = f; };

function targetToks(M: Match, c: any, owner: number, viewer: number): Tok[] {
  const toks: Tok[] = [{ k: "word", w: "选择" }];
  const side = c.side === "enemy" ? 1 - owner : owner;
  if (c.tmode === "late" && viewer !== owner && !c.shown) {
    toks.push({ k: "word", w: "一个" }, { k: "side", side: side === 0 ? "b" : "r" }, { k: "word", w: "随从" }, { k: "word", w: "待定" });
    return toks;
  }
  toks.push({ k: "side", side: side === 0 ? "b" : "r" }, { k: "word", w: "随从" });
  for (const t of c.tg ?? []) toks.push({ k: "unit", name: labelOverride?.(M, t) ?? unitLabel(t), side: t < 3 ? "b" : "r" });

  return toks;
}

export function clauseToks(M: Match, c: any, owner: number, viewer = 0): Tok[] {
  const out: Tok[] = [];
  switch (c.k) {
    case "atk":
      out.push(...targetToks(M, c, owner, viewer), { k: "word", w: "造成" }, { k: "num", v: c.n }, { k: "word", w: "伤害" });
      if ((c.rep ?? 1) > 1) out.push({ k: "word", w: "重复" }, { k: "num", v: c.rep });
      break;
    case "heal":
      out.push(...targetToks(M, c, owner, viewer), { k: "word", w: "恢复" }, { k: "num", v: c.n });
      break;
    case "mit":
      out.push(...targetToks(M, c, owner, viewer), { k: "word", w: "减少" }, { k: "word", w: "伤害" }, { k: "num", v: c.n });
      break;
    case "st":
      out.push(...targetToks(M, c, owner, viewer), { k: "word", w: "施加" }, { k: "word", w: c.st });
      break;
    case "redirect":
      out.push(...targetToks(M, c, owner, viewer), { k: "word", w: "转为" }, { k: "word", w: "自身" });
      break;
    case "delay":
      out.push({ k: "word", w: "延后" }, { k: "num", v: c.n });
      break;
    case "remove":
      out.push(...targetToks(M, c, owner, viewer), { k: "word", w: "移除" });
      break;
  }
  if ((c.cont ?? 1) > 1) out.push({ k: "word", w: "持续" }, { k: "num", v: c.cont });
  return out;
}

export function actionToks(M: Match, a: any, viewer = 0): Tok[] {
  const out: Tok[] = [];
  a.cl.forEach((c: any, i: number) => {
    if (i > 0) out.push({ k: "word", w: "并" });
    out.push(...clauseToks(M, c, a.side, viewer));
  });
  return out;
}

export interface LiveCtx {
  cards: UnitCard[];
  panels: SentencePanel[];
  onChange?: () => void;
  say?: (msg: string) => void;
  /** 技能演出（可选） */
  cast?: CastShow;
}

export class Live {
  M = new Match();
  private timer = 0;
  private busy = false;
  private seed = 1;
  constructor(private ctx: LiveCtx) {}

  /** 开一局：两边都由电脑打，职业随机（也可指定） */
  begin(c0?: Cls, c1?: Cls) {
    const cs: Cls[] = ["并", "续", "择", "血"];
    const a = c0 ?? cs[Math.floor(Math.random() * 4)], b = c1 ?? cs[Math.floor(Math.random() * 4)];
    this.seed = Math.floor(Math.random() * 1e6);
    this.M = new Match();
    this.M.start(presetDeck(a), presetDeck(b), this.seed, false, false);
    this.ctx.say?.(`第 1 轮：蓝方 ${a}流 对 红方 ${b}流`);
    this.syncAll(true);
  }

  start() { if (!this.timer) this.timer = window.setInterval(() => this.tick(), 1100); }
  stop() { clearInterval(this.timer); this.timer = 0; }
  get running() { return !!this.timer; }

  private syncAll(clearPanels: boolean) {
    const M = this.M;
    for (const u of M.R.U) {
      const card = this.ctx.cards[cardIndex(u.uid)];
      card.syncHp(u.hp, u.mx);
      card.setLoadout(loadoutOf(M, u.uid));
      if (clearPanels) {
        this.ctx.panels[cardIndex(u.uid)].set([], null);
      }
    }
    this.ctx.onChange?.();
  }

  private tick() {
    if (this.busy) return;
    const M = this.M;
    if (M.phase === "over") { this.stop(); return; }
    if (M.phase === "declare") {
      const s = M.declareSide();
      if (s === -1) { this.resolve(); return; }
      const before = M.declared.length;
      M.aiStep();
      if (M.declared.length > before) {
        const a = M.declared[M.declared.length - 1];
        this.ctx.panels[cardIndex(a.uid)].set(actionToks(M, a, 0), a.start, true);
      }
      this.syncAll(false);
    } else if (M.phase === "assign") {
      M.runToEnd(1);
    } else if (M.phase === "resolved") {
      M.nextRound();
      this.ctx.say?.(`第 ${M.rnd} 轮`);
      this.syncAll(true);
    }
  }

  private resolve() {
    const M = this.M;
    this.busy = true;
    const decl = [...M.declared];
    const evs = M.resolveRound();
    const cast = this.ctx.cast;
    if (cast) {
      // 技能演出：命中的那一刻才受击；演完同步血量
      void cast.playRound({
        M, events: evs, decl, alive: () => true, fast: () => false,
        step: (e: any) => { if (e.type === "hit" && e.dealt > 0) this.ctx.cards[cardIndex(e.tgt)].hit(0); },
      }).then(() => {
        this.syncAll(false);
        this.ctx.say?.(`完成度 蓝 ${(M.progress(0) * 100).toFixed(0)}% · 红 ${(M.progress(1) * 100).toFixed(0)}%`);
        if (M.phase === "over") this.ctx.say?.(M.winner === -2 ? "平局" : `${["蓝", "红"][M.winner]}方获胜`);
        this.busy = false;
      });
      return;
    }
    // 受击动画：按事件的秒数错开
    let i = 0;
    for (const e of evs) {
      if (e.type === "hit" && e.dealt > 0) {
        const card = this.ctx.cards[cardIndex(e.tgt)];
        setTimeout(() => card.hit(0), 120 * i++);
      }
    }
    setTimeout(() => {
      this.syncAll(false);
      const names = ["蓝", "红"];
      this.ctx.say?.(`完成度 蓝 ${(M.progress(0) * 100).toFixed(0)}% · 红 ${(M.progress(1) * 100).toFixed(0)}%`);
      if (M.phase === "over") this.ctx.say?.(M.winner === -2 ? "平局" : `${names[M.winner]}方获胜`);
      this.busy = false;
    }, 120 * i + 700);
  }
}

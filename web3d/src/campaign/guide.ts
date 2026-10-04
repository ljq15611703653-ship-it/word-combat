// 引导跟踪器（不含界面）：盖在正常对局（game.ts）上，告诉它「现在该点什么」，并拦住点错的操作。
// 数据来自关卡的 Guide；和 session.ts 里的期望逻辑等价，但不持有对局，由 Game 的钩子喂状态。
import type { Match } from "../engine/match";
import type { GameClick, GameHl } from "../game";
import { BASIC_DESC } from "../engine/composer";
import { WORDS } from "../engine/rules";
import type { Guide, Level, RoundScript } from "./types";

export class GuideTracker {
  M!: Match;
  guided = false;
  queue: Guide[] = [];
  cur: Guide | null = null;
  lateQ: number[][] = [];
  rs: RoundScript | undefined;
  constructor(public lv: Level) {}

  startRound(M: Match) {
    this.M = M;
    this.rs = this.lv.rounds[M.rnd];
    this.guided = !!this.rs?.guides;
    this.queue = (this.rs?.guides ?? []).map((g) => ({ ...g }));
    this.cur = null;
    this.lateQ = [];
  }

  private nm(u: number) { return this.M.R.U[u]?.name ?? ""; }

  /** 现在该点什么；null = 不强制（自由轮 / 没有对应的引导） */
  expect(c: GameClick): GameHl | null {
    if (!this.guided) return null;
    const g = this.cur;
    switch (c.stage) {
      case "pick_unit": {
        const q = this.queue[0];
        // 第一关第一轮：教「从随从拖到目标」（点随从再拼也照样可以）
        const d = q && this.lv.id === 1 && this.M.rnd === 1 ? this.dragPlan(q) : null;
        if (d) return { kind: "drag", uid: q.uid, drag: d };
        if (q) return { kind: "unit", uid: q.uid };
        return { kind: "pass", uid: this.M.remaining[0][0] };
      }
      case "compose": {
        if (!g) return null;
        if (c.tokens < g.tokens.length) { const t = g.tokens[c.tokens]; return typeof t === "number" ? { kind: "num", value: t } : { kind: "word", value: t }; }
        return { kind: "done" };
      }
      case "target": {
        if (!g) return null;
        const want = g.targets?.[c.clause];
        if (want) { const u = want.find((x) => !c.picked.includes(x)); return u === undefined ? null : { kind: "target", uid: u }; }
        if (g.act !== undefined) return { kind: "act", value: g.act };
        return null;
      }
      case "timing": return g ? { kind: "time", value: g.start } : null;
      case "assign": return this.lateQ.length ? { kind: "late", uid: this.lateQ[0][c.latePick.length] } : null;
    }
    return null;
  }

  /** 这一句开头是「选择 1 敌方/友方/自身」且目标是单个时，可以用拖拽一步填好 */
  private dragPlan(g: Guide): { from: number; to: number } | null {
    const t = g.tokens;
    if (t[0] !== "选择" || t[1] !== 1 || !["敌方", "友方", "自身"].includes(String(t[2]))) return null;
    const to = t[2] === "自身" ? g.uid : g.targets?.[0]?.[0];
    return to === undefined ? null : { from: g.uid, to };
  }

  /** 点击拦截：返回字符串 = 拒绝；null = 放行（同时推进内部状态） */
  before(c: GameClick): string | null {
    if (!this.guided) return null;
    if (c.kind === "undo") return null;
    if (c.kind === "restart") { if (this.cur) this.queue.unshift(this.cur); this.cur = null; return null; }
    if (c.kind === "clear") return "引导里请用「撤回一张」，一步步来。";
    if (c.kind === "assist") return "这一关是跟着引导学，先不用辅助轮。";
    if (c.kind === "box") return "引导里这一步先不框选，照高亮的来。";
    if (c.kind === "drag") {
      const g = this.cur;
      const d = g && c.tokens === 0 ? this.dragPlan(g) : null;
      const kindWord = c.value === "enemy" ? "敌方" : c.value === "ally" ? "友方" : "自身";
      if (d && g!.tokens[2] === kindWord && d.to === c.uid) return null;
      return "这一步要照引导来：拖到的目标不对，或者这一句不是这样开头的。";
    }
    const e = this.expect(c);
    if (!e) return null;
    if (e.kind === "drag" && c.kind === "unit" && c.uid === e.uid) { this.cur = this.queue.shift() ?? null; return null; }
    const same = e.kind === c.kind && (e.value === undefined || e.value === c.value) && (e.uid === undefined || e.uid === c.uid);
    if (!same) return `这一步要照引导来：${this.describe(e)}`;
    if (c.kind === "unit") this.cur = this.queue.shift() ?? null;
    else if (c.kind === "time") { for (const l of this.cur?.late ?? []) this.lateQ.push([...l]); this.cur = null; }
    else if (c.kind === "late" && c.latePick.length + 1 >= (this.lateQ[0]?.length ?? 0)) this.lateQ.shift();
    return null;
  }

  private describe(e: GameHl): string {
    switch (e.kind) {
      case "drag": return `从发光的随从【${this.nm(e.uid!)}】按住拖到发光的目标上（或点随从再拼）`;
      case "unit": return `点发光的随从【${this.nm(e.uid!)}】`;
      case "pass": return `点【${this.nm(e.uid!)}】的「它这轮不出手」`;
      case "word": return `点词牌【${e.value}】`;
      case "num": return `点数字牌 ${e.value}`;
      case "done": return "点「拼好了」";
      case "target": case "late": return `点目标【${this.nm(e.uid!)}】`;
      case "act": return "点要延后的那一句";
      case "time": return `点第 ${e.value} 秒`;
    }
    return "";
  }

  /** 说明文字开头如果又写了「【词】：」就去掉（标题里已经有词名） */
  private body(w: string | number | undefined, s: string): string { return s.replace(new RegExp("^【" + String(w) + "】[：:]?\s*"), ""); }

  /** 气泡里的「为什么点它」 */
  hint(c: GameClick): string {
    const e = this.expect(c), g = this.cur;
    if (!e) return "";
    const tip = this.rs?.tip ? `<br><span style="opacity:.8">${this.rs.tip}</span>` : "";
    switch (e.kind) {
      case "drag": return `<b>拖一下：${this.nm(e.uid!)} → 目标</b><br>按住发光的随从，拖到发光的目标上松手，「选择 1 敌方」就自动填好了；剩下的词牌自己拼。<br>也可以像平常一样点随从再拼。${tip}`;
      case "unit": return `<b>先点它：${this.nm(e.uid!)}</b><br>让它出手，给它拼一句。${tip}`;
      case "pass": return `<b>点它：${this.nm(e.uid!)}</b><br>这个随从这一轮不出手（引导里没有它的句子）。${tip}`;
      case "word": return `<b>【${e.value}】</b><br>${this.body(e.value, g?.notes?.[c.tokens] ?? WORDS[String(e.value)]?.desc ?? BASIC_DESC[String(e.value)] ?? "")}`;
      case "num": return `<b>数字牌 ${e.value}</b><br>${g?.notes?.[c.tokens] ?? (e.value === 1 ? "1 是免费的。" : "2 以上要用手里的数字牌。")}`;
      case "done": return `<b>拼完了</b><br>点这里确认这一句。`;
      case "target": return `<b>点目标：${this.nm(e.uid!)}</b><br>${g?.targetNote ?? "直接点场上发光的那张卡，或右边列表。"}`;
      case "act": return `<b>选这一句</b><br>对手已经宣告的这一句，就是要延后的目标。`;
      case "time": return `<b>第 ${e.value} 秒</b><br>${g?.why ?? ""}`;
      case "late": return `<b>现在才定目标：${this.nm(e.uid!)}</b><br>双方都宣告完了，对手看不到你的选择。`;
    }
    return "";
  }
}

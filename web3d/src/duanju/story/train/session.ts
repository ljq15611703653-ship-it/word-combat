// 四职业特训：在教程的 TeachSession 上加一点点——指定我方数字牌 / 行动点、开放关（不给分步引导，只有目标条）。
import type { Match, Sentence } from "../../engine/api";
import rulesDefault from "../../engine/rules.default.json";
import { TeachSession, type Beat, type Curriculum, type RoundScript, type Step } from "../teach/session";
import { tokensToAst } from "../../composer/grammar";

/** 特训的对手出手：既可以写 ClauseSpec（s），也可以直接写词序列（words，能写「不得 / 每当 / 引用」这类） */
export interface TrainFoeMove { unit: number; words?: string[]; start: number }
export interface TrainBeat extends Beat {
  /** 我方开局数字牌（缺省走规则里的 CARDS0） / 开局行动点 / 对手开局行动点 */
  meCards?: number[]; meAp?: number; foeAp?: number;
  /** 职业配色（styles.ts 的 id） */
  meStyle?: string; foeStyle?: string;
  /** 开放关：不给分步引导（对手仍按脚本出手）。solution 只给自动测试用，界面不显示 */
  open?: boolean; solution?: RoundScript[];
}
export interface Pattern { name: string; sentence: string; tokens?: string[]; explain: string; why: string; need: string }
export interface TrainLevel {
  id: string; cls: string; n: number; name: string; teach: string[];
  /** 战前简报：1~3 句 */
  brief: string[]; goal: string;
  patterns: Pattern[]; hints: string[];
  beat: TrainBeat;
}
export interface TrainClass { id: string; name: string; glyph: string; tag: string; perks: string[]; style: string; names: [string, string, string]; bg: number }
export interface Training { version: number; base: Curriculum["base"]; classes: TrainClass[]; levels: TrainLevel[] }

export class TrainSession extends TeachSession {
  declare beat: TrainBeat;
  constructor(beat: TrainBeat, cur: Curriculum) { super(beat, cur); }
  get scripted() { return !!this.beat.rounds && !this.beat.open; }
  /** 特训用真实对局的规则（rules.default.json，CLASSES 开着），不做任何规则开关；beat.rules 不应再覆盖参数 */
  rulesJson(): string {
    const j = JSON.parse(JSON.stringify(rulesDefault)) as { P: Record<string, unknown>; P2: Record<string, unknown> };
    const r = typeof this.beat.rules === "object" ? this.beat.rules : {};
    Object.assign(j.P, this.cur.base.rules.P, r.P ?? {}); Object.assign(j.P2, this.cur.base.rules.P2, r.P2 ?? {});
    return JSON.stringify(j);
  }
  setup(m: Match) {
    const b = this.beat;
    super.setup(m);
    m.s.kw = m.s.kw.map(() => "");   // 关键词是装备选择不是规则：特训不带（关卡数据级差异）
    if (b.rounds) m.s.side[1].cards = [4, 4, 4, 4, 4].map((v) => ({ v, cd: 0 }));
    if (b.meCards) m.s.side[0].cards = b.meCards.map((v) => ({ v, cd: 0 }));
    if (b.meAp !== undefined) m.s.side[0].ap = b.meAp;
    if (b.foeAp !== undefined) m.s.side[1].ap = b.foeAp;
  }
  foeMove(m: Match) {
    const rs = this.round(m), u = [3, 4, 5].find((x) => m.canAct(x));
    const mv = rs && u !== undefined ? (rs.foe.find((f) => f.unit === u) as unknown as TrainFoeMove | undefined) : undefined;
    if (!mv?.words) return super.foeMove(m);
    const cl = tokensToAst(mv.words);
    if (cl && m.foeDeclare(mv.unit, cl, mv.start)) return { unit: mv.unit, passed: false, text: m.history[m.history.length - 1].text, start: mv.start };
    (globalThis as any).__storyErr?.(`脚本宣告失败 r${m.rnd} u${mv.unit} ${mv.words.join(" ")}`);
    m.pass(mv.unit);
    return { unit: mv.unit, passed: true, text: "", start: 0 };
  }
  /** 这一步只针对已经倒下的敌人（比如职业天赋让罚款/状态提前把它打倒了）→ 这一步作废，免得卡住 */
  private void_(st: Step | null, m: Match): boolean {
    if (!st) return false;
    const foes = (st.words ?? []).filter((w) => /^@[3-5]$/.test(w)).map((w) => +w[1]);
    return foes.length > 0 && foes.every((u) => !m.unitAlive(u));
  }
  stepFor(m: Match, u: number): Step | null { if (this.beat.open) return null; const st = super.stepFor(m, u); return this.void_(st, m) ? null : st; }
  pending(m: Match): Step[] { return this.beat.open ? [] : super.pending(m).filter((s) => !this.void_(s, m)); }
  allowed(m: Match, u: number): (cl: Sentence) => boolean { return this.beat.open ? this.allow : super.allowed(m, u); }
  check(u: number, cl: Sentence, start: number, m: Match): string | null {
    if (this.beat.open) return this.allow(cl) ? null : "这句话这一关还用不上。";
    return super.check(u, cl, start, m);
  }
  beforePass(u: number, m: Match): string | null { return this.beat.open ? null : super.beforePass(u, m); }
  beforeEnd(m: Match): string | null { return this.beat.open ? null : super.beforeEnd(m); }
}

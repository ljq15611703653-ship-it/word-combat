// 教学战斗的纯逻辑（无 DOM）：规则配置、开局调整、脚本化对手、引导步骤校验。浏览器与 scripts/story-smoke 共用。
import { DECK_WORDS, type Match, type Sentence } from "../../engine/api";
import rulesDefault from "../../engine/rules.default.json";
import { astToTokens } from "../../composer/grammar";
import { buildSentence, matchSentence, allowedFn, type Allow, type ClauseSpec } from "./spec";
import type { Settings } from "../../types";

export interface StepSay { unit?: string; menu?: string; wrong?: string; start?: string; end?: string }
/** words：整句的词序列（拖拽用的词牌，目标写 "@3"）。适合「并 / 每当 / 不得 / 引用量词」这类 ClauseSpec 写不下的句子；有 words 时 want 可省略 */
export interface Step { unit: number; want?: ClauseSpec[]; words?: string[]; startMin?: number; startMax?: number; say?: StepSay }
export interface FoeMove { unit: number; s: ClauseSpec[]; start: number }
/** goal：这一轮的小目标（战斗界面左上角的目标条，如「拼出带「并」的两段句」） */
export interface RoundScript { foe: FoeMove[]; steps?: Step[]; goal?: string }
export interface Beat {
  beat: number; name: string; teach: string[]; foeNames: string[]; first: "me" | "foe"; seed: number;
  rules?: string | { P?: Record<string, unknown>; P2?: Record<string, unknown> };
  me?: { units: number[]; hp?: Record<string, number>; deck?: Record<string, number> };
  foe?: { units: number[]; hp?: Record<string, number>; deck?: Record<string, number> };
  allow?: Allow; rounds?: RoundScript[]; fallback?: string;
  /** 10~14：自由对打用 */
  tier?: string; meDeck?: string; foeDeck?: string; foeHp?: number; hintKind?: "chain" | "standing" | "forbid" | "quote" | null; intro?: string;
}
export interface Curriculum { base: { rules: { P: Record<string, unknown>; P2: Record<string, unknown> }; me: string[] }; beats: Beat[] }

const preset = (id?: string) => ({ ...(DECK_WORDS.presets.find((p) => p.id === id)?.deck ?? {}) });
const KINDS: Record<string, (cl: Sentence) => boolean> = {
  chain: (cl) => cl.length > 1,
  standing: (cl) => cl.some((c) => c.k === "when" && c.q.win.dir === "after"),
  forbid: (cl) => cl.some((c) => c.k === "when" && !!c.forbid),
  quote: (cl) => cl.some((c) => (c.k === "act" && typeof c.eff.n !== "number")),
};

const sameWords = (cl: Sentence, words: string[]): boolean => { try { const t = astToTokens(cl); return t.length === words.length && t.every((x, i) => x === words[i]); } catch { return false; } };

export class TeachSession {
  allow: (cl: Sentence) => boolean;
  constructor(public beat: Beat, public cur: Curriculum) {
    this.allow = beat.allow ? allowedFn(beat.allow) : () => true;
  }
  get scripted() { return !!this.beat.rounds; }
  /** 引擎规则（custom JSON） */
  rulesJson(): string {
    const b = this.beat;
    if (b.rules === "default") return JSON.stringify(rulesDefault);
    const r = typeof b.rules === "object" ? b.rules : {};
    const j = JSON.parse(JSON.stringify(rulesDefault));
    Object.assign(j.P, this.cur.base.rules.P, r.P ?? {}); Object.assign(j.P2, this.cur.base.rules.P2, r.P2 ?? {});
    return JSON.stringify(j);
  }
  settings(): Settings {
    return { styleId: "yin", deck: {}, tier: this.beat.tier ?? "入门", first: this.beat.first, rules: "custom", customRules: this.rulesJson(), kws: [], foe: { mode: "random", preset: "", deck: {} } };
  }
  absent(): number[] {
    const b = this.beat; if (!b.me || !b.foe) return [];
    return [0, 1, 2, 3, 4, 5].filter((u) => !b.me!.units.includes(u) && !b.foe!.units.includes(u));
  }
  foeDeck() { return this.beat.foe ? { ...(this.beat.foe.deck ?? {}) } : preset(this.beat.foeDeck); }
  myDeck() { return this.beat.me ? { ...(this.beat.me.deck ?? {}) } : preset(this.beat.meDeck); }
  setup(m: Match) {
    const b = this.beat;
    m.s.deck[0] = this.myDeck(); m.s.deck[1] = this.foeDeck();
    if (this.scripted) m.s.side[1].cards = [4, 4, 4, 4, 4].map((v) => ({ v, cd: 0 }));   // 电脑方牌充足：脚本里的数字不受冷却限制
    if (b.foeHp) for (const u of [3, 4, 5]) m.s.hp[u] = b.foeHp;
    if (b.me) for (const u of this.absent()) m.removeUnit(u);
    for (const [u, hp] of Object.entries({ ...(b.me?.hp ?? {}), ...(b.foe?.hp ?? {}) })) m.s.hp[+u] = hp;
  }
  round(m: Match): RoundScript | null {
    const rs = this.beat.rounds; if (!rs) return null;
    return rs[Math.min(m.rnd, rs.length) - 1];
  }
  /** 脚本之外的轮（玩家没能在脚本轮里赢）：自由，对手重复最后一轮的脚本 */
  inScript(m: Match) { return !!this.beat.rounds && m.rnd <= this.beat.rounds.length; }
  foeMove(m: Match) {
    const rs = this.round(m); if (!rs) return null;
    const u = [3, 4, 5].find((x) => m.canAct(x));
    if (u === undefined) return null;
    const mv = rs.foe.find((f) => f.unit === u);
    if (mv) {
      const cl = buildSentence(mv.s);
      if (m.foeDeclare(u, cl, mv.start)) return { unit: u, passed: false, text: m.history[m.history.length - 1].text, start: mv.start };
      (globalThis as any).__storyErr?.(`脚本宣告失败 beat${this.beat.beat} r${m.rnd} u${u}`);
    }
    m.pass(u);
    return { unit: u, passed: true, text: "", start: 0 };
  }
  stepFor(m: Match, u: number): Step | null {
    if (!this.inScript(m)) return null;
    return this.round(m)?.steps?.find((s) => s.unit === u) ?? null;
  }
  /** 本轮还没说话、有步骤的我方随从 */
  pending(m: Match): Step[] {
    if (!this.inScript(m)) return [];
    return (this.round(m)?.steps ?? []).filter((s) => m.canAct(s.unit));
  }
  wantsFn(m: Match, u: number): ((cl: Sentence) => boolean) | null {
    const st = this.stepFor(m, u);
    if (st?.words) return (cl) => sameWords(cl, st.words!);
    if (st?.want) return (cl) => matchSentence(cl, st.want!);
    const k = this.beat.hintKind; if (k && KINDS[k] && !this.scripted) return KINDS[k];
    return null;
  }
  /** 菜单/拼句允许的句子（课程表开放的词） */
  allowed(m: Match, u: number): (cl: Sentence) => boolean {
    if (this.scripted && this.inScript(m) && !this.stepFor(m, u)) return () => false;
    const w = this.stepFor(m, u)?.words;
    if (w) return (cl) => sameWords(cl, w);
    return this.allow;
  }
  check(u: number, cl: Sentence, start: number, m: Match): string | null {
    if (!this.allowed(m, u)(cl)) return this.scripted && this.inScript(m) && !this.stepFor(m, u) ? "这轮这位先不说话，点「不出手」。" : "这句话这一关还用不上。";
    const st = this.stepFor(m, u);
    if (st) {
      if (st.words && !sameWords(cl, st.words)) return st.say?.wrong ?? "这一轮要说另一句话，照着高亮的词牌一张一张拖。";
      if (st.want && !matchSentence(cl, st.want)) return st.say?.wrong ?? "这一轮要说另一句话，看高亮的那条。";
      if (st.startMin !== undefined && start < st.startMin) return st.say?.start ?? `起手秒要 ≥ ${st.startMin}。`;
      if (st.startMax !== undefined && start > st.startMax) return st.say?.start ?? `起手秒要 ≤ ${st.startMax}。`;
    } else {
      const k = this.beat.hintKind;
      if (k && !this.scripted && m.rnd === 1 && !m.history.some((h) => h.side === 0 && h.rnd === 1) && !KINDS[k](cl)) return this.beat.intro ?? "先试试这一关要学的那种句子。";
    }
    return null;
  }
  /** 有引导步骤的随从不许「不出手」（否则这一步的教学就被跳过了） */
  beforePass(u: number, m: Match): string | null {
    return this.stepFor(m, u) ? "这一步就是要这位说话，照着发亮的词牌拼，别跳过。" : null;
  }
  beforeEnd(m: Match): string | null {
    const p = this.pending(m);
    if (p.length) return "还有随从要说话：点高亮的那位。";
    return null;
  }
  /** 给 composer 的 hint 词序列（目标用 "@编号"） */
  hintWords(m: Match, u: number): string[] | undefined {
    const sw = this.stepFor(m, u); if (sw?.words) return sw.words.slice();
    const w = sw?.want; if (!w) return undefined;
    const out: string[] = [];
    for (const c of w) {
      if (c.kind === "status") out.push(c.status === "burn" ? "灼烧" : c.status === "vuln" ? "易伤" : "衰弱");
      else if (c.kind === "redirect") out.push("转移"); else if (c.kind === "postpone") out.push("延后"); else if (c.kind === "strip") out.push("移除");
      else out.push(c.verb === "heal" ? "恢复" : c.verb === "shield" ? "减伤" : "造成");
      if (c.tg !== undefined) out.push(`@${c.tg}`);
      if (c.n !== undefined) out.push(String(c.n));
      if (c.rep) out.push("重复", String(c.rep));
    }
    return out;
  }
}

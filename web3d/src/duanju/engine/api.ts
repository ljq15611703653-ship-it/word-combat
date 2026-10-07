// 引擎薄封装：对战流程、合法句子、结算回放事件。UI 只通过这里碰引擎。
import { applyRules, ADV, ADV_WORDS, P2, deckOk, deckCost, CLASSES_ALL, type Deck, type Rules, type Cls } from "./params";
import { P } from "./lab-rules";
import {
  newGame, declare, passUnit, nextSide, resolveRound, nextRound, canAfford, windupFor, alive, unitsOf, setTrace, type St,
} from "./interp";
import { sentenceText, clauseText, advWordsOf, assertionClauses, type Sentence, type Clause } from "./ast";
import { candidates, mulberry32, type Rng } from "./gen";
import { think, TIERS, TIER_NAMES, type Ai2Cfg as AiCfg } from "./ai2";
import { randDeck, randKws } from "./deck";
import rulesDefault from "./rules.default.json";
import rulesReal from "./rules.real.json";
import rulesLegacy from "./rules.legacy.json";
import words from "./deck-words.json";

export { P, P2, ADV, ADV_WORDS, deckOk, deckCost, TIER_NAMES, sentenceText, clauseText };
export { CLASSES_ALL };
export type { Deck, Sentence, St, Cls };
export const DECK_WORDS = words as unknown as { presets: { id: string; name: string; deck: Deck }[]; words: { name: string; area: number; max: number; cat: string; desc: string; example: string }[]; cats: { id: string; name: string; color: string }[] };

export type RulesKind = "default" | "legacy" | "real" | "custom";
/** 切换规则配置。custom 接受 {P,P2,ADV} 或 real.json 的 {LAB,LAB2} 格式。成功返回 null，失败返回错误文字 */
export function configureRules(kind: RulesKind, custom = ""): string | null {
  try {
    if (kind === "default") applyRules(rulesDefault as Rules);
    else if (kind === "real") applyRules(rulesReal as Rules);
    else if (kind === "legacy") applyRules(rulesLegacy as Rules);
    else {
      const j = JSON.parse(custom);
      if (!(j.P ?? j.LAB) && !(j.P2 ?? j.LAB2)) throw new Error("需要 {P,P2,ADV} 或 {LAB,LAB2}");
      applyRules({ P: j.P ?? j.LAB, P2: j.P2 ?? j.LAB2, ADV: j.ADV });
    }
    return null;
  } catch (e) { return String((e as Error).message ?? e); }
}

export type ReplayType = "hit" | "heal" | "shield" | "absorb" | "status" | "down" | "standing" | "fire" | "heat" | "dice" | "cue";
export interface ReplayEvent {
  sec: number; type: ReplayType; src: number; tgt: number; amount: number; text: string;
  effect?: string;
  end?: number;
  /** 仅 fire：这句话含哪些动作（dmg/heal/shield/burn/vuln/weak/redirect/postpone/strip/nullify/delay/cash/forbid/standing/cond/quote） */
  kinds?: string[];
  /** 仅 fire：宣告的起手秒 */
  start?: number;
  /** 仅 fire 且含延后：被延后的那句的出手随从（猜测，按对方宣告序）与延后秒数 */
  ptgt?: number; pn?: number;
}

export interface Candidate { cl: Sentence; text: string; kind: string; cost: number; nums: number[]; minStart: number; adv: string[] }
export interface MatchOpts { /** 职业（[我方, 电脑]）；规则里 CLASSES 关或传 null = 无职业（教程） */ cls?: [Cls | null, Cls | null]; kws?: string[] | null; first: 0 | 1; myDeck: Deck; foeDeck?: Deck; seed?: number; tier: string }
export interface DeclView { side: 0 | 1; unit: number; text: string; start: number; cost: number }

/** 句子里的「甲方1号词位随从」读成「我方·名字」（名字由 UI 设置） */
let NAMES: [string[], string[]] = [["甲1", "甲2", "甲3"], ["乙1", "乙2", "乙3"]];
export function setUnitNames(me: string[], foe: string[]) { NAMES = [me, foe]; }
export const unitLabel = (u: number) => `${u < 3 ? "我方" : "敌方"}·${NAMES[u < 3 ? 0 : 1][u % 3]}`;
export const zh = (s: string) => s.replace(/([甲乙])方(\d)号(?:词位|数位|速位)随从/g, (_, sd, n) => `${sd === "甲" ? "我方" : "敌方"}·${NAMES[sd === "甲" ? 0 : 1][+n - 1]}`);
const sText = (cl: Sentence) => zh(sentenceText(cl));
const STATUS_ZH = { burn: "灼烧", vuln: "易伤", weak: "衰弱" } as const;

export function sentenceKind(cl: Sentence): string {
  if (cl.some((c) => c.k === "assert")) return "条件";
  if (cl.some((c: Clause) => c.k === "when" && c.forbid)) return "限制";
  if (cl.some((c) => c.k === "when" && c.q.win.dir === "after")) return "长期";
  if (cl.some((c) => c.k === "when")) return "条件";
  if (cl.some((c) => c.k === "delay")) return "定时";
  if (cl.some((c) => c.k === "status")) return "状态";
  if (cl.some((c) => c.k === "ignore" || c.k === "cash" || c.k === "remove" || c.k === "strip")) return "清除/无视";
  if (cl.some((c) => c.k === "redirect" || c.k === "postpone")) return "转移/延后";
  if (cl.length > 1) return "并/连环";
  const c = cl[0];
  if (c.k === "act") return c.eff.verb === "dmg" ? "进攻" : c.eff.verb === "heal" ? "治疗" : "减伤";
  return "其他";
}
export const KIND_ORDER = ["进攻", "治疗", "减伤", "并/连环", "状态", "长期", "条件", "定时", "限制", "清除/无视", "转移/延后", "其他"];

export interface HistoryRec { rnd: number; side: 0 | 1; unit: number; text: string; start: number }

export class Match {
  s: St;
  rng: Rng;
  cfg: AiCfg;
  tier: string;
  history: HistoryRec[] = [];
  usedAdv: Record<string, number> = {};
  myDeck0: Deck; foeDeck0: Deck;
  seed: number;
  rulesKind = "default";
  constructor(o: MatchOpts) {
    this.seed = o.seed ?? Math.floor(Math.random() * 1e9);
    this.rng = mulberry32(this.seed);
    this.tier = o.tier; this.cfg = TIERS[o.tier] ?? TIERS["普通"];
    this.myDeck0 = { ...o.myDeck };
    this.foeDeck0 = o.foeDeck ? { ...o.foeDeck } : pickFoeDeck(this.rng);
    this.s = newGame(o.first, [{ ...this.myDeck0 }, { ...this.foeDeck0 }], false, [o.kws && o.kws.length === 3 ? o.kws : randKws(this.rng), randKws(this.rng)], o.cls);
    this.s.rs = (this.seed ^ 0x5bd1e995) >>> 0;   // 骰子的种子随机数（同 seed 同结果）
  }
  get rnd() { return this.s.rnd; }
  /** 轮到谁：0 我 / 1 电脑 / -1 本轮全部宣告完，可以结算 */
  who(): 0 | 1 | -1 { return nextSide(this.s); }
  private flip() { this.s.turn = (1 - this.s.turn) as 0 | 1; }
  unitAlive(u: number) { return alive(this.s, u); }
  canAct(u: number) { return alive(this.s, u) && !this.s.done[u]; }
  myUnits() { return unitsOf(0); }
  /** 电脑出手一次（可能是某随从不出手）。返回宣告的内容 */
  aiMove(): { unit: number; passed: boolean; text: string; start: number } {
    const m = think(this.s, 1, this.rng, this.cfg);
    if (m.cl && declare(this.s, 1, m.unit, m.cl, m.start)) {
      const d = this.s.decl[this.s.decl.length - 1];
      const text = sText(m.cl);
      this.history.push({ rnd: this.s.rnd, side: 1, unit: m.unit, text, start: d.start });
      this.flip();
      return { unit: m.unit, passed: false, text, start: d.start };
    }
    passUnit(this.s, m.unit); this.flip();
    return { unit: m.unit, passed: true, text: "", start: 0 };
  }
  /** 电脑代我出手（自动测试用） */
  autoMyMove(): void {
    const m = think(this.s, 0, this.rng, this.cfg);
    if (m.cl && declare(this.s, 0, m.unit, m.cl, m.start)) { this.noteMine(m.cl, m.unit, m.start); this.flip(); } else { passUnit(this.s, m.unit); this.flip(); }
  }
  private noteMine(cl: Sentence, unit: number, start: number) {
    const text = sText(cl);
    this.history.push({ rnd: this.s.rnd, side: 0, unit, text, start });
    for (const w of advWordsOf(cl)) this.usedAdv[w] = (this.usedAdv[w] ?? 0) + 1;
  }
  declare(unit: number, cl: Sentence, start: number): boolean {
    if (this.s.done[unit] || !alive(this.s, unit)) return false;
    if (!declare(this.s, 0, unit, cl, start)) return false;
    this.noteMine(cl, unit, this.s.decl[this.s.decl.length - 1].start);
    this.flip(); return true;
  }
  pass(unit: number) { passUnit(this.s, unit); this.flip(); }
  /** 教学/脚本用：指定电脑方（1）的某个随从宣告 cl。成功返回 true，并记入历史 */
  foeDeclare(unit: number, cl: Sentence, start: number): boolean {
    if (this.s.done[unit] || !alive(this.s, unit)) return false;
    if (!declare(this.s, 1, unit, cl, start)) return false;
    const d = this.s.decl[this.s.decl.length - 1];
    this.history.push({ rnd: this.s.rnd, side: 1, unit, text: sText(cl), start: d.start });
    this.flip(); return true;
  }
  /** 撤回用快照：宣告阶段（结算前）可整体回退 */
  snap(): unknown { return structuredClone({ s: this.s, history: this.history, usedAdv: this.usedAdv }); }
  restore(snap: unknown) { const o = structuredClone(snap) as { s: St; history: HistoryRec[]; usedAdv: Record<string, number> }; this.s = o.s; this.history = o.history; this.usedAdv = o.usedAdv; }
  /** 教学场景用：某个随从直接缺席（血量 0、记为已倒下，不参与胜负） */
  removeUnit(u: number) { this.s.hp[u] = 0; this.s.dead[u] = true; this.s.done[u] = true; }
  /** 我方剩下的随从全部不出手（「结束本轮」） */
  passRest() { for (const u of unitsOf(0)) if (this.canAct(u)) passUnit(this.s, u); this.s.turn = 1; }
  minStart(cl: Sentence, unit: number) { return windupFor(cl, unit, this.s); }
  tl() { return P.TL; }

  legalSentences(unit: number, k = 60): Candidate[] {
    const rng = mulberry32((this.seed ^ (this.s.rnd * 7919) ^ (unit * 104729)) >>> 0);
    const out: Candidate[] = [];
    for (const cl of candidates(this.s, 0, unit, rng, k, "playbook")) {
      const a = canAfford(this.s, 0, cl, unit);
      if (!a) continue;
      out.push({ cl, text: sText(cl), kind: sentenceKind(cl), cost: a.cost, nums: a.nums, minStart: windupFor(cl, unit, this.s), adv: advWordsOf(cl) });
    }
    return out;
  }

  /** 结算本轮并返回回放事件（引擎状态已经是结算后的；UI 自己按事件逐步展示） */
  resolve(): ReplayEvent[] {
    const s = this.s;
    const pre = { hp: s.hp.slice() };
    const raw: any[] = []; let n = 0;
    const decls = s.decl.map((d) => ({ unit: d.unit, side: d.side, cl: d.cl, start: d.start, ord: d.ord }));   // VFX：结算前拷贝，演出要知道每句的动作种类
    setTrace((e) => raw.push({ ...e, _i: n++ }));
    try { resolveRound(s); } finally { setTrace(null); }
    raw.sort((a, b) => a.sec - b.sec || a._i - b._i);
    const ev: ReplayEvent[] = [];
    const hp = pre.hp.slice(); const downed = new Set<number>(); const diceOf = new Map<number, ReplayEvent>();
    for (const e of raw) {
      switch (e.t) {
        case "vfx": ev.push({sec:e.sec,type:"cue",src:e.src,tgt:e.u,amount:e.amt,text:({redirect:"转移",reflect:"反弹",postpone:"延后",strip:"移除",remove:"移除",cleanse:"净化",cash:"兑现",quote:"引用",pierce:"无视",nullify:"阻断",condition:e.amt?"条件成立":"条件不成立"} as Record<string,string>)[e.effect]??e.effect,effect:e.effect,end:e.end}); break;
        case "fire": {
          const d = this.history.slice().reverse().find((h) => h.unit === e.u && h.rnd === s.rnd);
          const dc = decls.find((x) => x.unit === e.u);
          const fe: ReplayEvent = { sec: e.sec, type: "fire", src: e.u, tgt: -1, amount: 0, text: d?.text ?? "" };
          if (dc) {
            fe.kinds = clauseKinds(dc.cl); fe.start = dc.start;
            const pp = dc.cl.find((c: Clause) => c.k === "postpone") as any;
            if (pp) {
              const foes = decls.filter((x) => x.side !== dc.side).sort((a, b) => a.ord - b.ord);
              const t = foes[Math.max(0, Math.min(foes.length - 1, (pp.ord ?? 1) - 1))];
              if (t) { fe.ptgt = t.unit; fe.pn = pp.n; }
            }
          }
          ev.push(fe); break;
        }
        case "hit": hp[e.u] = Math.max(0, hp[e.u] - e.amt); ev.push({ sec: e.sec, type: "hit", src: e.src, tgt: e.u, amount: e.amt, text: `-${e.amt}` }); break;
        case "heal": hp[e.u] += e.amt; ev.push({ sec: e.sec, type: "heal", src: e.src, tgt: e.u, amount: e.amt, text: `+${e.amt}` }); break;
        case "shield": ev.push({ sec: e.sec, type: "shield", src: e.src, tgt: e.u, amount: e.amt, text: `盾+${e.amt}` }); break;
        case "absorb": ev.push({ sec: e.sec, type: "absorb", src: e.src, tgt: e.u, amount: e.amt, text: `挡${e.amt}` }); break;
        case "status": ev.push({ sec: e.sec, type: "status", src: e.src, tgt: e.u, amount: 1, text: STATUS_ZH[e.kind as keyof typeof STATUS_ZH] ?? e.kind }); break;
        case "standing": ev.push({ sec: e.sec, type: "standing", src: e.u, tgt: -1, amount: 0, text: zh(clauseText(e.c)), effect:e.c.k === "when" ? e.c.forbid ? "forbid" : "watch" : e.c.k }); break;
        case "assertion": ev.push({ sec: e.sec, type: "cue", src: e.u, tgt: e.u, amount: e.yes ? 1 : 0, text: e.yes ? "断言成立：执行奖励分支" : "断言不成立：执行否则分支",effect:"assertion" }); break;
        case "down": downed.add(e.u); hp[e.u] = 0; ev.push({ sec: e.sec, type: "down", src: e.src, tgt: e.u, amount: 0, text: "倒下" }); if (diceOf.has(e.u)) { ev.push(diceOf.get(e.u)!); diceOf.delete(e.u); } break;
        case "dice": diceOf.set(e.u, { sec: e.sec, type: "dice", src: -1, tgt: e.u, amount: e.roll, text: `投骰 ${e.roll} → 获得数字牌 ${e.roll}` }); break;   // 等该随从的「倒下」事件之后再放
        case "heat":
          ev.push({ sec: e.sec, type: "heat", src: -1, tgt: -1, amount: e.amt, text: `过热 -${e.amt}` });
          for (let u = 0; u < 6; u++) if (hp[u] > 0) { const d = Math.min(hp[u], e.amt); hp[u] -= d; ev.push({ sec: e.sec, type: "hit", src: -1, tgt: u, amount: d, text: `-${d}` }); }
          break;
      }
    }
    for (let u = 0; u < 6; u++) if (s.hp[u] <= 0 && pre.hp[u] > 0 && !downed.has(u)) ev.push({ sec: P.TL + 1, type: "down", src: -1, tgt: u, amount: 0, text: "倒下" });
    for (const d of diceOf.values()) ev.push(d);
    return ev;
  }
  nextRound() { nextRound(this.s); }
  over() { return this.s.win >= 0; }
  outcome(): "win" | "lose" | "draw" | null { const w = this.s.win; return w < 0 ? null : w === 2 ? "draw" : w === 0 ? "win" : "lose"; }

  // ---- 公开信息（UI 只读这些；对手卡组、剩余进阶词张数不在这里）----
  unitView(u: number) {
    const s = this.s;
    return {
      hp: s.hp[u], sh: s.sh[u], alive: s.hp[u] > 0, kw: s.kw[u] || "", kwUsed: s.kwUsed[u], redir: s.redir[u],
      sts: s.sts.filter((x) => x.unit === u).map((x) => ({ kind: STATUS_ZH[x.kind], lvl: x.lvl, left: P2.STAUTO ? Math.max(0, (x.end ?? 0) - s.rnd + 1) : x.left })),
      standing: s.stand.filter((x) => x.owner === (u < 3 ? 0 : 1) && x.unit === u && x.left !== -1).map((x) => ({ text: zh(clauseText(x.c)), left: x.left, active: x.active })),
      decl: s.decl.filter((d) => d.unit === u).map((d): DeclView => ({ side: d.side, unit: d.unit, text: sText(d.cl), start: d.start, cost: d.cost }))[0] ?? null,
      done: s.done[u],
    };
  }
  hud() {
    const s = this.s;
    return { rnd: s.rnd, rounds: P.ROUNDS, ap: [s.side[0].ap, s.side[1].ap], myCards: s.side[0].cards.map((c) => ({ v: c.v, cd: c.cd, once: !!c.once })), foeCards: s.side[1].cards.length, first: s.first, heat: s.rnd >= P.HEAT_FROM ? s.rnd - 2 : 0 };
  }
  myDeckLeft(): Deck { return { ...(this.s.deck[0] ?? {}) }; }
  record() {
    return { version: 1, seed: this.seed, tier: this.tier, rules: this.rulesKind, P: { ...P }, P2: { ...P2 }, myDeck: this.myDeck0, foeDeck: this.foeDeck0, rounds: this.s.rnd, outcome: this.outcome(), hp: [0, 1, 2, 3, 4, 5].map((u) => this.s.hp[u]), usedAdv: this.usedAdv, history: this.history };
  }
}

/** VFX 用：一句话里有哪些动作 */
function clauseKinds(cl: Sentence): string[] {
  const out: string[] = [];
  const eff = (e: any) => { out.push(e.verb); if (typeof e.n !== "number") out.push("quote"); if (e.ignore) out.push("nullify"); };
  for (const c of cl as any[]) {
    switch (c.k) {
      case "assert": out.push("cond", ...clauseKinds(assertionClauses(c))); break;
      case "act": eff(c.eff); break;
      case "when": out.push(c.forbid ? "forbid" : c.q.win.dir === "after" ? "standing" : "cond"); c.effs.forEach(eff); break;
      case "delay": out.push("delay"); c.effs.forEach(eff); break;
      case "status": out.push(c.kind); break;
      case "ignore": out.push("nullify"); break;
      case "cash": out.push("cash"); break;
      case "remove": case "strip": out.push("strip"); break;
      case "redirect": out.push("redirect"); break;
      case "postpone": out.push("postpone"); break;
    }
  }
  return [...new Set(out)];
}
function pickFoeDeck(r: Rng): Deck {
  const pool = DECK_WORDS.presets.map((p) => p.deck).filter((d) => deckOk(d));
  if (pool.length && r() < 0.7) return { ...pool[Math.floor(r() * pool.length)] };
  return randDeck(r);
}

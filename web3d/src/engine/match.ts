// 数字牌模式 · 一局的流程（移植自 nc_match.gd）：开局 → 每轮：轮流宣告 →（择流定目标）→ 结算 → 轮末
import * as NR from "./rules";
import * as NE from "./engine";
import type { Act, Clause, RState } from "./engine";
import type { Cls, Deck } from "./rules";
import { choose, assignLate } from "./ai";

/* eslint-disable @typescript-eslint/no-explicit-any */
export class Rng {
  private a: number;
  constructor(seed: number) { this.a = seed >>> 0; }
  randf(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    let t = this.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo: number, hi: number) { return lo + Math.floor(this.randf() * (hi - lo + 1)); }
}

export type Phase = "setup" | "declare" | "assign" | "resolved" | "over";

export class Match {
  rng = new Rng(1);
  rnd = 0;
  first0 = 0;
  sides: any[] = [];
  R!: RState;
  human: boolean[] = [true, false];
  phase: Phase = "setup";
  declared: Act[] = [];
  remaining: number[][] = [[], []];
  passed: number[][] = [[], []];
  turn = 0;
  res: any[] = [{}, {}];
  winner = -1; // -1 进行中；0/1；-2 平局
  lastEvents: any[] = [];
  roundNotes: any[] = [];
  lastDeclared: Act[] = [];
  stats: any[] = [{}, {}];

  start(d0: Deck, d1: Deck, seed = 1, human0 = true, human1 = false) {
    this.rng = new Rng(seed);
    this.human = [human0, human1];
    this.first0 = this.rng.int(0, 1);
    this.rnd = 0;
    this.winner = -1;
    this.sides = [];
    this.stats = [{}, {}];
    const U: any[] = [];
    for (let s = 0; s < 2; s++) {
      const d = s === 0 ? d0 : d1;
      this.sides.push({ cls: d.cls, ap: NR.AP_START, deck: { ...d.words }, used: {}, prev: {}, cards: [], lad: [] });
      for (let i = 0; i < 3; i++) {
        U.push({ uid: s * 3 + i, side: s, name: NR.UNIT_NAMES[i], glyph: NR.UNIT_GLYPHS[i], hp: d.hp[i], mx: d.hp[i],
          down: -1, st: {}, kw: d.kws[i], kws: false, mit: 0, mitc: 0, shield: 0, msrc: [], lis: [], last: null });
      }
    }
    this.R = NE.newR(U, [d0.cls, d1.cls]);
    this.beginRound();
  }

  clsOf(s: number): Cls { return this.sides[s].cls; }
  progress(s: number) { return NE.prog(this.R, s, this.clsOf(s)); }
  caps(s: number) { return NR.caps(this.clsOf(s), this.progress(s)); }
  firstSide() { return (this.first0 + this.rnd - 1) % 2; }
  private stat(s: number, key: string, v = 1) { this.stats[s][key] = (this.stats[s][key] ?? 0) + v; }
  contsOf(s: number) { return this.R.conts.filter((c: any) => c.side === s); }

  beginRound() {
    this.rnd++;
    for (const u of this.R.U) {
      u.mit = 0; u.mitc = 0; u.msrc = []; u.lis = []; u.kws = false; u.shield = 0;
      if (u.down !== -1 && this.rnd >= u.down + 2) { u.down = -1; u.hp = u.mx; u.st = {}; }
      else if (u.down === -1) {
        for (const nm of Object.keys(u.st)) {
          const e = u.st[nm];
          if (this.rnd > e[1]) delete u.st[nm]; else e[0] += 1;
        }
      }
    }
    this.roundNotes = [];
    for (let s = 0; s < 2; s++) {
      const sd = this.sides[s];
      if (this.rnd > 1) sd.ap = Math.min(sd.ap + NR.AP_INCOME, NR.AP_CAP);
      sd.prev = sd.used;
      sd.used = {};
      if (NR.FLOOR[this.rnd]) {
        sd.cards.push({ v: NR.FLOOR[this.rnd], once: false, last: -9, src: "保底" });
        this.roundNotes.push({ side: s, type: "floor", value: NR.FLOOR[this.rnd] });
      }
      this.res[s] = { ap: sd.ap, words: this.availWordsBase(s), cards: [], conts: 0 };
    }
    this.declared = [];
    this.passed = [[], []];
    this.remaining = [[], []];
    for (const u of this.R.U) if (u.down === -1) this.remaining[u.side].push(u.uid);
    this.turn = this.firstSide();
    this.phase = "declare";
  }

  availWordsBase(s: number): Record<string, number> {
    const sd = this.sides[s], out: Record<string, number> = {};
    for (const w of NR.WORD_ORDER) out[w] = (sd.deck[w] ?? 0) - (sd.prev[w] ?? 0);
    return out;
  }
  coolingWords(s: number) { return { ...this.sides[s].prev }; }

  usableCards(s: number): number[] {
    const out: number[] = [];
    const reserved: number[] = this.res[s].cards;
    this.sides[s].cards.forEach((c: any, i: number) => {
      if (reserved.includes(i)) return;
      if (c.once || this.rnd - c.last >= 2) out.push(i);
    });
    return out;
  }
  usableValues(s: number): Record<number, number> {
    const out: Record<number, number> = {};
    for (const i of this.usableCards(s)) { const v = this.sides[s].cards[i].v; out[v] = (out[v] ?? 0) + 1; }
    return out;
  }
  pickCards(s: number, values: number[]): number[] | null {
    const need: Record<number, number> = {};
    for (const v of values) if (v > 1) need[v] = (need[v] ?? 0) + 1;
    if (!Object.keys(need).length) return [];
    const avail = this.usableCards(s), cards = this.sides[s].cards, used: number[] = [];
    for (const vs of Object.keys(need)) {
      const v = +vs;
      const cand = avail.filter((i) => cards[i].v === v && !used.includes(i));
      cand.sort((a, b) => (cards[a].once ? 1 : 0) - (cards[b].once ? 1 : 0));
      if (cand.length < need[v]) return null;
      for (let k = 0; k < need[v]; k++) used.push(cand[k]);
    }
    return used;
  }
  bloodRoom(s: number, uid: number) {
    const cp = this.caps(s);
    if (cp.blood <= 0) return 0;
    return Math.max(0, Math.min(cp.blood, this.R.U[uid].hp - 1));
  }

  declareSide(): number {
    if (this.phase !== "declare") return -1;
    if (!this.remaining[0].length && !this.remaining[1].length) return -1;
    if (!this.remaining[this.turn].length) return 1 - this.turn;
    return this.turn;
  }
  publicDeclared(s: number) { return this.declared.filter((a) => a.side === s); }

  buildAction(s: number, uid: number, cls: Clause[], start: number): { act?: Act; err?: string } {
    if (!cls.length) return { err: "这句话是空的" };
    const cp = this.caps(s);
    if (cls.length > cp.clauses) return { err: `一句最多 ${cp.clauses} 段` };
    const u = this.R.U[uid];
    if (u.side !== s || u.down !== -1) return { err: "这个随从现在不能出手" };
    const rule = NE.wordRuleProblem(cls, cp);
    if (rule) return { err: rule };
    const words = NE.actionWords(cls);
    const need: Record<string, number> = {};
    for (const w of words) need[w] = (need[w] ?? 0) + 1;
    for (const w in need) if ((this.res[s].words[w] ?? 0) < need[w]) return { err: `【${w}】不够用（卡组里的张数用完了，或者在冷却）` };
    const cost = NE.actionCost(cls, cp.and);
    let blood = 0;
    if (cost > this.res[s].ap) {
      blood = cost - this.res[s].ap;
      if (cp.blood <= 0) return { err: `行动点不够（要 ${cost}，还剩 ${this.res[s].ap}）` };
      if (blood > this.bloodRoom(s, uid)) return { err: `行动点不够，用血也付不起（差 ${blood}，这个随从最多能付 ${this.bloodRoom(s, uid)} 血）` };
      for (const c0 of cls) {
        if (cp.noheal && c0.k === "heal") return { err: "用血付的句子里不能有【恢复】" };
        if (cp.nodef && ["mit", "redirect"].includes(c0.k)) return { err: "用血付的句子里不能有【减伤】【转移】" };
      }
    }
    const nc = NE.contCount(cls);
    if (nc > 0) {
      if (cp.slots <= 0) return { err: "只有续流能把【持续】接在伤害、恢复、减伤后面" };
      if (this.contsOf(s).length + this.res[s].conts + nc > cp.slots) return { err: `续挂满了（同时最多 ${cp.slots} 个）` };
    }
    const nums = NE.actionNumbers(cls, cp.freecount);
    const cards = this.pickCards(s, nums);
    if (cards === null) return { err: `数字牌不够：这句要用 [${nums.join(", ")}]` };
    const ms = NE.actionWindup(cls, cp.wind);
    if (start < ms) return { err: `这句最早第 ${ms} 秒才能起效` };
    if (start > NR.TIMELINE) return { err: `时间轴只有 ${NR.TIMELINE} 秒` };
    for (const c of cls) {
      if (c.tmode === "late") continue;
      for (const tid of c.tg ?? []) if (this.R.U[tid].down !== -1) return { err: "目标已经倒下了" };
      if (c.k === "delay" && !this.declared.some((b) => b.ord === c.act && b.side !== s)) return { err: "延后要选对方已经宣告的一句" };
    }
    return { act: { side: s, uid, start, cl: cls, cost, blood, cards, words, def: NE.isDef(cls), ms, cv: nums, ord: this.declared.length } };
  }

  submit(s: number, uid: number, act: Act | null): string {
    if (this.declareSide() !== s) return "还没轮到你";
    if (!this.remaining[s].includes(uid)) return "这个随从这一轮已经定过了";
    if (act) {
      act.ord = this.declared.length;
      this.declared.push(act);
      this.res[s].ap -= Math.min(act.cost, this.res[s].ap);
      for (const w of act.words) this.res[s].words[w] = (this.res[s].words[w] ?? 0) - 1;
      for (const i of act.cards) this.res[s].cards.push(i);
      this.res[s].conts += NE.contCount(act.cl);
    } else this.passed[s].push(uid);
    this.remaining[s].splice(this.remaining[s].indexOf(uid), 1);
    this.turn = 1 - s;
    if (!this.remaining[0].length && !this.remaining[1].length) this.afterDeclare();
    return "";
  }

  pendingLate(s: number) {
    const out: { ord: number; ci: number; cl: Clause }[] = [];
    for (const a of this.declared) {
      if (a.side !== s) continue;
      a.cl.forEach((c: Clause, ci: number) => { if (c.tmode === "late" && !c.locked) out.push({ ord: a.ord, ci, cl: c }); });
    }
    return out;
  }
  private afterDeclare() {
    for (let s = 0; s < 2; s++) if (!this.human[s] && this.clsOf(s) === "择") assignLate(this, s);
    for (let s = 0; s < 2; s++) if (this.human[s] && this.clsOf(s) === "择" && this.pendingLate(s).length) this.phase = "assign";
  }
  setLate(ord: number, ci: number, tg: number[]) {
    for (const a of this.declared) if (a.ord === ord) { a.cl[ci].tg = [...tg]; a.cl[ci].locked = true; }
  }
  finishAssign() { if (this.phase === "assign") this.phase = "declare"; }

  aiStep() {
    const s = this.declareSide();
    if (s === -1 || this.human[s]) return;
    const pick = choose(this, s);
    this.submit(s, pick.uid, pick.act);
  }

  resolveRound(): any[] {
    const R = this.R;
    R.kos = [0, 0]; R.lost = [0, 0]; R.fz = [0, 0]; R.maxhit = 0; R.eff = {}; R.retarget = [0, 0]; R.ev = [];
    NE.resolve(R, this.declared, this.rnd);
    this.lastEvents = R.ev;
    R.ev = null;
    this.lastDeclared = [...this.declared];
    const bloodPaid = [0, 0];
    for (const a of this.declared) {
      const s = a.side, sd = this.sides[s];
      sd.ap -= Math.min(a.cost, sd.ap);
      bloodPaid[s] += a.blood ?? 0;
      if ((a.blood ?? 0) > 0) { this.stat(s, "血句"); this.stat(s, "血付", a.blood); }
      if (NE.contCount(a.cl) > 0) this.stat(s, "续句");
      if (a.cl.length > NR.CLAUSE_MAX) this.stat(s, "超长句");
      for (const c of a.cl) if (c.tmode === "late") this.stat(s, "待定段");
      for (const w of a.words) sd.used[w] = (sd.used[w] ?? 0) + 1;
      for (const i of a.cards) {
        const c2 = sd.cards[i];
        if (c2.once) c2.gone = true; else c2.last = this.rnd;
      }
    }
    for (let s = 0; s < 2; s++) if (R.retarget[s] > 0) this.stat(s, "择换人", R.retarget[s]);
    for (let s = 0; s < 2; s++) this.sides[s].cards = this.sides[s].cards.filter((c: any) => !c.gone);
    for (let s2 = 0; s2 < 2; s2++) {
      const sd2 = this.sides[s2];
      const lost = R.lost[s2] + (NR.Y_DICE ? bloodPaid[s2] : 0);
      if (lost >= NR.DICE_HP || R.kos[s2] > 0) {
        const rolls: number[] = [];
        for (let i = 0; i < NR.DICE_COUNT; i++) {
          const v = this.rng.int(1, 6);
          rolls.push(v);
          if (v > 1) sd2.cards.push({ v, once: true, last: -9, src: "骰子" });
        }
        this.roundNotes.push({ side: s2, type: "dice", rolls, why: R.kos[s2] > 0 ? "有随从倒下" : `这一轮掉了 ${lost} 点血` });
      }
      const p = this.progress(s2);
      NR.LADDER.forEach((at, i) => {
        if (p >= at && !sd2.lad.includes(i)) {
          sd2.lad.push(i);
          for (let k = 0; k < NR.LADDER_COPIES; k++) sd2.cards.push({ v: NR.LADDER_VALUES[i], once: false, last: -9, src: "阶梯" });
          this.roundNotes.push({ side: s2, type: "ladder", value: NR.LADDER_VALUES[i], copies: NR.LADDER_COPIES, at });
        }
      });
    }
    const p0 = this.progress(0), p1 = this.progress(1);
    if (p0 >= 1 || p1 >= 1 || this.rnd >= NR.MAX_ROUNDS) this.winner = p0 > p1 ? 0 : p1 > p0 ? 1 : -2;
    this.phase = this.winner !== -1 ? "over" : "resolved";
    return this.lastEvents;
  }

  nextRound() { if (this.phase === "resolved") this.beginRound(); }

  runToEnd(maxSteps = 2000) {
    let n = 0;
    while (this.phase !== "over" && n++ < maxSteps) {
      if (this.phase === "declare") {
        const s = this.declareSide();
        if (s === -1) this.resolveRound();
        else { const pick = choose(this, s); this.submit(s, pick.uid, pick.act); }
      } else if (this.phase === "assign") {
        for (let s2 = 0; s2 < 2; s2++) if (this.clsOf(s2) === "择") assignLate(this, s2);
        this.finishAssign();
      } else if (this.phase === "resolved") this.nextRound();
    }
  }
}

// 联机时本地用的「镜像对局」：服务端只发按我的视角过滤好的快照（GameView），
// 这里把它还原成一个和本地 Match 同形状的对象，这样本地的拼句器、辅助轮、3D 卡面、文字描述全部原样复用。
// 坐标约定与本地一致：我方 = side 0 / uid 0..2，对手 = side 1 / uid 3..5；
// 服务端的 uid/side 用 (x + 3*you) % 6 与本地互换（这个映射是自己的逆）。
import { Match } from "../engine/match";
import * as NE from "../engine/engine";
import * as NR from "../engine/rules";
import type { GameView } from "../../shared/protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export class MirrorMatch extends Match {
  you = 0;
  opts = { wipe: true };       // 联机一律是全灭模式：费用、血付换算要和服务端一致
  private first = 0;
  /** 服务端 uid ↔ 本地 uid（互为逆映射） */
  uid = (u: number) => (u < 0 ? u : (u + 3 * this.you) % 6);
  sd = (s: number) => (s < 0 ? s : s === this.you ? 0 : 1);
  firstSide() { return this.first; }

  /** 把一个事件里的 uid 换成本地的 */
  ev(e: any): any {
    const o = { ...e };
    for (const k of ["uid", "tgt", "src"]) if (typeof o[k] === "number") o[k] = this.uid(o[k]);
    if (Array.isArray(o.tgts)) o.tgts = o.tgts.map((x: number) => this.uid(x));
    if (typeof o.side === "number") o.side = this.sd(o.side);
    return o;
  }
  /** 把本地拼好的一串 Clause 换成服务端的 uid（发出去前） */
  toServer(cls: any[]): any[] {
    return cls.map((c) => ({ ...c, tg: (c.tg ?? []).map((x: number) => this.uid(x)) }));
  }
  private clauseIn(c: any) {
    const o = copy(c);
    if (Array.isArray(o.tg)) o.tg = o.tg.map((x: number) => this.uid(x));
    return o;
  }

  apply(v: GameView) {
    this.you = v.you;
    const me = v.you, opp = 1 - v.you;
    this.rnd = v.round;
    this.phase = v.phase as any;
    this.first = this.sd(v.first);
    this.winner = v.winner < 0 ? v.winner : this.sd(v.winner);
    this.turn = v.turn >= 0 ? this.sd(v.turn) : 0;

    const U: any[] = [];
    for (const p of v.units) {
      const lu = this.uid(p.uid);
      U[lu] = { uid: lu, side: this.sd(p.side), name: p.name, glyph: p.glyph, hp: p.hp, mx: p.mx, down: p.down, st: copy(p.st), kw: p.kw, kws: p.kws, mit: p.mit, mitc: 0, shield: 0, msrc: [], lis: [], last: null };
    }
    const cls = [v.sides[me].cls, v.sides[opp].cls];
    this.R = NE.newR(U, cls);
    this.R.wipe = true;
    for (let s = 0; s < 2; s++) {
      const ps = v.sides[s === 0 ? me : opp];
      (this.R.M[s] as any)[NR.METRIC[ps.cls]] = ps.metric;
      this.R.kob[s] = ps.kob;
    }
    this.R.conts = v.conts.map((c) => ({ side: this.sd(c.side), uid: this.uid(c.uid), cl: this.clauseIn(c.cl), left: c.left, start: c.start }));

    this.sides = [
      { cls: cls[0], ap: v.sides[me].ap, deck: {}, used: {}, prev: {}, lad: [], cards: v.me.cards.map((c) => ({ v: c.v, once: c.once, src: c.src, last: c.last })) },
      { cls: cls[1], ap: v.sides[opp].ap, deck: {}, used: {}, prev: {}, lad: [], cards: Array.from({ length: v.sides[opp].cardCount }, () => ({ v: 1, once: false, last: -9, src: "" })) },
    ];

    // 本轮宣告的句子（对手待定目标已被服务端藏掉）
    const reveal = v.phase === "resolved" || v.phase === "over";
    const pend = new Map<string, any>();
    for (const p of v.me.pending) pend.set(`${p.ord}:${p.ci}`, p);
    const acts = v.acts.map((a) => {
      const side = this.sd(a.side);
      const cl = a.cl.map((c: any, ci: number) => {
        const o = this.clauseIn(c);
        const p = pend.get(`${a.ord}:${ci}`);
        if (p) { o.tg = p.targets.map((x: number) => this.uid(x)); o.locked = p.locked; }
        return o;
      });
      const caps = NR.caps(cls[side], 0);
      return { ord: a.ord, side, uid: this.uid(a.uid), start: a.start, cl, cost: a.cost, blood: a.blood, cards: [] as number[], words: [...a.words], def: a.def, ms: a.ms, cv: NE.actionNumbers(cl, caps.freecount) };
    }).sort((x, y) => x.ord - y.ord);
    this.declared = acts as any;
    if (reveal) this.lastDeclared = acts as any;
    else if (!this.lastDeclared) this.lastDeclared = [];

    this.remaining = [v.remaining[me].map((x) => this.uid(x)), v.remaining[opp].map((x) => this.uid(x))];
    // 没有宣告、也不在「还没定」里的活人 = 这一轮不出手
    this.passed = [[], []];
    for (const u of U) {
      if (!u || u.down !== -1) continue;
      if (this.remaining[u.side].includes(u.uid)) continue;
      if (!acts.some((a) => a.uid === u.uid)) this.passed[u.side].push(u.uid);
    }
    const myConts = acts.filter((a) => a.side === 0).reduce((n, a) => n + NE.contCount(a.cl), 0);
    this.res = [
      { ap: v.me.ap, words: { ...v.me.words }, cards: v.me.cards.filter((c) => c.reserved).map((c) => c.i), conts: myConts },
      { ap: v.sides[opp].ap, words: {}, cards: [], conts: 0 },
    ];
    this.roundNotes = v.notes.map((n) => ({ ...n, side: this.sd(n.side) }));
  }
}

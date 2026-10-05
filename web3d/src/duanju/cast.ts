// 最小可用的结算动画：按秒推进，命中数字飘出、血条变化、受击闪动、倒下。
// 词牌飞来飞去的完整演出由别的实现接，保持 CastPlayer.play(events, view) 接口即可替换（见 types.ts）。
import { playDice } from "./dice";
import type { BattleView, CastPlayer, ReplayEvent } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const UNIT_NAME = (u: number) => (u < 3 ? "我方" : "敌方");

export class SimpleCastPlayer implements CastPlayer {
  private skipping = false;
  skip() { this.skipping = true; }
  async play(events: ReplayEvent[], view: BattleView) {
    this.skipping = false;
    const wait = async (ms: number) => { if (!this.skipping) await sleep(ms / view.speed()); };
    let lastSec = -1;
    for (const e of events) {
      if (!this.skipping && e.sec !== lastSec && e.sec <= 20) { view.clock(e.sec); lastSec = e.sec; }
      switch (e.type) {
        case "fire":
          if (e.src >= 0) { view.flash(e.src, "cast"); view.banner(e.text || "…", `${UNIT_NAME(e.src)} · 第 ${e.sec} 秒`); await wait(620); }
          break;
        case "standing":
          view.float(e.src, "长期句生效", "info"); await wait(260); break;
        case "shield": {
          const d = view.getDisplay(e.tgt); view.setDisplay(e.tgt, d.hp, d.sh + e.amount);
          view.float(e.tgt, e.text, "shield"); view.flash(e.tgt, "shield"); await wait(340); break;
        }
        case "absorb": {
          const d = view.getDisplay(e.tgt); view.setDisplay(e.tgt, d.hp, Math.max(0, d.sh - e.amount));
          view.float(e.tgt, e.text, "shield"); await wait(240); break;
        }
        case "hit": {
          const d = view.getDisplay(e.tgt); view.setDisplay(e.tgt, Math.max(0, d.hp - e.amount), d.sh);
          view.float(e.tgt, e.text, "hit"); view.flash(e.tgt, "hit"); await wait(420); break;
        }
        case "heal": {
          const d = view.getDisplay(e.tgt); view.setDisplay(e.tgt, d.hp + e.amount, d.sh);
          view.float(e.tgt, e.text, "heal"); view.flash(e.tgt, "heal"); await wait(380); break;
        }
        case "status": view.float(e.tgt, e.text, "status"); await wait(300); break;
        case "heat": view.banner("过热", `每个随从 −${e.amount}`); await wait(520); break;
        case "down": view.markDown(e.tgt); view.float(e.tgt, "倒下", "info"); await wait(520); break;
        case "dice": if (!this.skipping) await playDice(view, e, (ms) => wait(ms)); break;
      }
    }
    view.clock(null);
    await wait(250);
  }
}

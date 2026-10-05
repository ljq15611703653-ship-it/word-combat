// 倒下投骰的演出：随从头顶弹出一个缺角方块骰子，数字滚动几下停在点数上，再飘字「投骰 N → 获得数字牌 N」。
// 被 cast.ts（简易演出）和 vfx/player.ts（完整演出）共用；只动 DOM，不碰引擎。
import type { BattleView, ReplayEvent } from "./types";

export async function playDice(view: BattleView, e: ReplayEvent, sleep: (ms: number) => Promise<void>) {
  const host = view.unitEl(e.tgt).querySelector<HTMLElement>(".floats") ?? view.unitEl(e.tgt);
  const die = document.createElement("div");
  die.className = `dice-roll ${e.tgt < 3 ? "mine" : "foe"}`;
  die.textContent = "?";
  host.appendChild(die);
  const faces = [3, 5, 1, 6, 2, 4, 3, 5];
  for (const f of faces) { die.textContent = String(f); await sleep(70); }
  die.textContent = String(e.amount); die.classList.add("stop");
  view.float(e.tgt, e.tgt < 3 ? e.text : `敌方投骰 ${e.amount}`, "info");
  await sleep(480);
  die.remove();
}

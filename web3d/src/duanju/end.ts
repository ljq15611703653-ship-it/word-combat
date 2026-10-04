// 终局页：胜负、轮数、用过的进阶词、再来一局、导出本局记录
import type { Match } from "./engine/api";
import { styleOf } from "./styles";
import type { Settings } from "./types";

export function mountEnd(root: HTMLElement, m: Match, won: "win" | "lose" | "draw", st: Settings, act: { again(): void; back(): void }) {
  const sty = styleOf(st.styleId);
  const used = Object.entries(m.usedAdv).sort((a, b) => b[1] - a[1]);
  const hp = (us: number[]) => us.map((u) => m.s.hp[u]);
  const title = won === "win" ? "胜利" : won === "lose" ? "落败" : "平局";
  root.innerHTML = `<div class="dj-end ${won}" style="--accent:${sty.accent}">
    <div class="en-card"><div class="en-title"><span>${title}</span></div>
      <p class="en-sub">第 ${m.rnd} 轮结束 · 难度 ${m.tier}</p>
      <div class="en-hp"><div><b>我方</b>${hp([0, 1, 2]).map((h) => `<i class="${h > 0 ? "" : "x"}">${Math.max(0, h)}</i>`).join("")}</div><div><b>电脑</b>${hp([3, 4, 5]).map((h) => `<i class="${h > 0 ? "" : "x"}">${Math.max(0, h)}</i>`).join("")}</div></div>
      <h3>本局用过的进阶词</h3>
      <div class="en-words">${used.length ? used.map(([w, n]) => `<span>${w}<small>×${n}</small></span>`).join("") : "<em>一个也没用——全靠朴素的攻防</em>"}</div>
      <div class="en-btns"><button class="su-go" data-a="again">再来一局 ▶</button><button class="bt" data-a="export">导出本局记录 JSON</button><button class="bt" data-a="back">回开局页</button></div>
    </div></div>`;
  root.querySelector(".dj-end")!.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a;
    if (a === "again") act.again(); else if (a === "back") act.back();
    else if (a === "export") {
      const blob = new Blob([JSON.stringify(m.record(), null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob), el = document.createElement("a");
      el.href = url; el.download = `duanju-${m.seed}.json`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  });
}

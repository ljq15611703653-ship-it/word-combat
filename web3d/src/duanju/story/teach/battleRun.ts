// 教学战斗：用现有 Battle，通过 hooks 接入受限词表 / 脚本对手 / 引导气泡 / 关内对话。不复制战斗代码。
import { Battle, type BattleHooks } from "../../battle";
import { STYLES } from "../../styles";
import { backgroundFor } from "../../art";
import { playDialog, type Line } from "../dialog/dialog";
import { guideFor } from "./guided";
import type { TeachSession } from "./session";

export interface LevelDialog { level: number; beat: number; intro: Line[]; outro: Line[]; rounds: { round: number; say?: Line[]; after?: Line[] }[] }
export type BattleOutcome = "win" | "lose" | "exit";

export function runTeachBattle(host: HTMLElement, ses: TeachSession, dlg: LevelDialog | undefined, hist: Line[], o: { onSkipAll?: () => void; fast?: boolean } = {}): Promise<BattleOutcome> {
  return new Promise((resolve) => {
    const beat = ses.beat;
    document.documentElement.style.setProperty("--bg-url", `url(${backgroundFor(beat.beat)})`);
    const holder = document.createElement("div"); holder.className = "dj-root battle story-battle"; holder.style.position = "absolute";
    host.appendChild(holder);
    const me = { ...STYLES.find((s) => s.id === "yin")!, names: ses.cur.base.me as [string, string, string] };
    const foe = { ...STYLES.find((s) => s.id === "zhuang")!, names: beat.foeNames as [string, string, string] };
    let warn: { text: string; t: number } | null = null;
    let timer = 0, finished = false;
    const done = (r: BattleOutcome) => { if (finished) return; finished = true; clearInterval(timer); b.destroy(); holder.remove(); resolve(r); };
    const dlgOpts = { history: hist, onSkipAll: o.onSkipAll, speed: o.fast ? 0 : 1 };
    const bubble = document.createElement("div"); bubble.className = "tb-bubble"; bubble.hidden = true;
    const goal = document.createElement("div"); goal.className = "tb-goal"; goal.hidden = true;
    const hooks: BattleHooks = {
      styles: { me, foe }, foeDeck: ses.foeDeck(), absent: ses.absent(), guide: (m, u) => guideFor(ses, m, u),
      setup: (m) => ses.setup(m),
      foeMove: (m) => ses.foeMove(m),
      beforeDeclare: (u, cl, start, m) => { const e = ses.check(u, cl, start, m); if (e) warn = { text: e, t: Date.now() }; else warn = null; return e; },
      beforeEnd: (m) => { const e = ses.beforeEnd(m); if (e) warn = { text: e, t: Date.now() }; return e; },
      undo: true,
      onMount: (bb) => { bb.stage.appendChild(bubble); bb.stage.appendChild(goal); timer = window.setInterval(() => tick(bb), 200); },
      onTick: (bb) => tick(bb),
      onRoundStart: async (bb) => {
        const r = dlg?.rounds.find((x) => x.round === bb.m.rnd);
        if (r?.say?.length) await playDialog(bb.root, r.say, dlgOpts);
      },
      onRoundEnd: async (bb) => {
        const r = dlg?.rounds.find((x) => x.round === bb.m.rnd);
        if (r?.after?.length) await playDialog(bb.root, r.after, dlgOpts);
      },
    };
    const b: Battle = new Battle(holder, ses.settings(), {
      seed: beat.seed, fast: o.fast, hooks,
      onEnd: ({ won }) => done(won === "win" ? "win" : "lose"),
      onExit: () => done("exit"),
    });
    (window as any).__tb = b; (window as any).__ses = ses;
    b.run().catch((e) => { (window as any).__dj?.errors.push(String(e?.stack ?? e)); console.error(e); });

    // ---- 小目标条：脚本关每一轮一个小目标（左上角），声明完这一轮的步骤后打勾 ----
    function paintGoal(bb: Battle) {
      const m = bb.m, rs = ses.beat.rounds, g = ses.inScript(m) ? ses.round(m)?.goal : undefined;
      if (!rs || !g) { goal.hidden = true; return; }
      goal.hidden = false;
      const done = ses.pending(m).length === 0 && !!ses.round(m)?.steps?.length;
      goal.classList.toggle("done", done);
      goal.classList.toggle("end", !!bb.stage.querySelector('[data-a="main"]')?.textContent?.includes("结束宣告"));
      const txt = `<small>小目标 ${Math.min(m.rnd, rs.length)}/${rs.length}</small><b>${g}</b>`;
      if (goal.dataset.t !== txt) { goal.dataset.t = txt; goal.innerHTML = txt; }
    }
    // ---- 引导气泡 ----
    function tick(bb: Battle) {
      const st = bb.stage; if (!st || !st.isConnected) return;
      const clearHl = () => st.querySelectorAll(".guide-hl").forEach((e) => e.classList.remove("guide-hl"));
      if (document.querySelector(".sd-root")) { bubble.hidden = true; goal.hidden = true; clearHl(); return; }
      paintGoal(bb);
      const m = bb.m;
      const main = st.querySelector<HTMLElement>('[data-a="main"]')!;
      const mt = main?.textContent ?? "";
      const edit = st.querySelector<HTMLElement>(".unit.me.editing");
      const menu = edit; // 拼句中：气泡指向词牌库里该拖的那张（没有提示词时指向句子条）
      let text = "", target: HTMLElement | null = null;
      if (edit) {
        const u = +(edit.dataset.u ?? -1);
        const stp = ses.stepFor(m, u);
        text = stp?.say?.menu ?? (ses.beat.intro ?? "");
        target = st.querySelector<HTMLElement>(".lib .cw.hint") ?? edit.querySelector<HTMLElement>(".comp .go:not(:disabled)") ?? edit.querySelector<HTMLElement>(".panel");
      } else if (mt.includes("结束宣告")) {
        const pend = ses.pending(m);
        if (pend.length) { const s0 = pend[0]; text = s0.say?.unit ?? "点高亮的随从。"; target = st.querySelector<HTMLElement>(`.unit[data-u="${s0.unit}"] .panel`); target?.closest(".unit")?.classList.add("guide-hl"); }
        else if (ses.scripted) { text = "这轮说完了，点「结束宣告」。"; target = main; }
        else { text = m.rnd === 1 && !m.history.some((h) => h.side === 0) ? (ses.beat.intro ?? "") : ""; target = text ? st.querySelector<HTMLElement>(".unit.me.ready .panel") : null; }
      } else if (mt.includes("结算")) { text = "双方说完了。点「结算」：起手秒小的先生效。"; target = main; }
      else if (mt.includes("下一轮")) { text = "点「下一轮」。"; target = main; }
      clearHl();
      if (target && target.classList.contains("unit")) target.classList.add("guide-hl");
      else if (target === main) main.classList.add("guide-hl");
      st.querySelectorAll<HTMLElement>(".unit.me.guide-hl").forEach(() => 0);
      const w = warn && Date.now() - warn.t < 4500 ? warn.text : null;
      const shown = w ?? text;
      if (!shown) { bubble.hidden = true; return; }
      bubble.hidden = false; bubble.classList.toggle("warn", !!w);
      if (bubble.dataset.t !== shown) { bubble.dataset.t = shown; bubble.textContent = shown; }
      // 定位：靠近目标；没有目标就放在顶部中间
      const sr = st.getBoundingClientRect(), bw = Math.min(300, sr.width - 16);
      bubble.style.width = bw + "px";
      let x = sr.width / 2 - bw / 2, y = 56, arrow = "none";
      if (target) {
        const r = target.getBoundingClientRect(), bh = bubble.offsetHeight || 70;
        const left = r.left - sr.left;
        if (menu && target !== main) { x = left - bw - 14; if (x < 8) x = Math.min(sr.width - bw - 8, r.right - sr.left + 14); y = Math.max(8, r.top - sr.top); arrow = x < left ? "right" : "left"; }
        else { x = Math.max(8, Math.min(sr.width - bw - 8, left + r.width / 2 - bw / 2)); const below = r.top - sr.top < bh + 24; y = below ? r.bottom - sr.top + 12 : r.top - sr.top - bh - 12; arrow = below ? "up" : "down"; }
      }
      bubble.style.left = x + "px"; bubble.style.top = y + "px"; bubble.dataset.arrow = arrow;
    }
  });
}

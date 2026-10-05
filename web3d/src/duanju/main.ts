// 《断·句》打电脑页入口：开局页 → 战斗 → 终局页
import "./ui.css";
import { mountSetup, loadSettings, saveSettings } from "./setup";
import { Battle } from "./battle";
import { mountEnd } from "./end";
import { bgUrl } from "./art";
import type { Settings } from "./types";

const root = document.getElementById("app")!;
document.documentElement.style.setProperty("--bg-url", `url(${bgUrl()})`);
const q = new URLSearchParams(location.search);
const AUTO_GAMES = +(q.get("auto") ?? 0);          // ?auto=N：电脑代打 N 局（冒烟测试用）
const FAST = q.get("fast") === "1" || AUTO_GAMES > 0;
const dj: { games: string[]; errors: string[]; state: string; battle: Battle | null } = { games: [], errors: [], state: "setup", battle: null };
(window as any).__dj = dj;
addEventListener("error", (e) => dj.errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => dj.errors.push(String((e as PromiseRejectionEvent).reason)));

let st: Settings = loadSettings();
let battle: Battle | null = null;

// 教程通关（第 14 关毕业）之前不能打电脑；?unlock=all / 自动测试可绕过
function tutorialDone(): boolean {
  if (q.get("unlock") === "all" || AUTO_GAMES > 0 || q.get("start") === "1") return true;
  try { return (JSON.parse(localStorage.getItem("duanju.story.v1") ?? "null")?.done ?? []).includes(14); } catch { return false; }
}
function mountLocked() {
  dj.state = "locked"; root.className = "dj-root setup";
  root.innerHTML = `<div class="dj-setup"><header class="su-title"><h1><span>断</span><i>·</i><span>句</span></h1><p>先完成教程，才能打电脑</p></header><div class="su-lock"><p>从第 1 关开始，一步步学会「说一句话就是出招」。通关第 14 关后，这里就会解锁。</p><a class="su-go" href="duanju-story.html">进入教程</a></div></div>`;
}
function setup() {
  if (!tutorialDone()) { mountLocked(); return; }
  battle?.destroy(); battle = null; dj.battle = null; dj.state = "setup";
  root.className = "dj-root setup";
  mountSetup(root, st, (s) => { st = s; saveSettings(st); play(); });
}
function play() {
  battle?.destroy();
  dj.state = "battle"; root.className = "dj-root battle";
  const b = new Battle(root, st, {
    auto: AUTO_GAMES > 0, fast: FAST && q.get("speed") === null, speed: q.get("speed") === null ? undefined : +q.get("speed")!,
    onExit: setup,
    onEnd: ({ match, won }) => {
      dj.games.push(won); dj.state = "end"; root.className = "dj-root end";
      if (AUTO_GAMES > 0 && dj.games.length < AUTO_GAMES) { setTimeout(play, 0); return; }
      mountEnd(root, match, won, st, { again: play, back: setup });
    },
  });
  battle = b; dj.battle = b;
  b.run().catch((e) => { dj.errors.push(String(e?.stack ?? e)); console.error(e); });
}
setup();
if (q.get("start") === "1") play();

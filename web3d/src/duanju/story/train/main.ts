// 《断·句》四职业特训：选关页（四栏×5关）→ 战前简报 → 教学战斗 → 回选关页。存档 duanju.train.v1，与教程分开。
import "../../ui.css";
import "../story.css";
import "../../skin.css";
import "./train.css";
import { STYLES } from "../../styles";
import { runTeachBattle } from "../teach/battleRun";
import { TrainSession, type Training, type TrainLevel } from "./session";

const BASE: string = (import.meta as any).env?.BASE_URL ?? "/";
const root = document.getElementById("app")!;
const q = new URLSearchParams(location.search);
const fast = q.get("fast") === "1";
const sj: { errors: string[]; state: string; level: string } = { errors: [], state: "init", level: "" };
(window as any).__dj = sj;
(globalThis as any).__storyErr = (e: string) => sj.errors.push(e);
addEventListener("error", (e) => sj.errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => sj.errors.push(String((e as PromiseRejectionEvent).reason)));

const KEY = "duanju.train.v1";
interface Prog { done: string[] }
const loadP = (): Prog => { try { const j = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (j) return { done: j.done ?? [] }; } catch { /* */ } return { done: [] }; };
const saveP = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch { /* */ } };
let prog = loadP();
let T: Training;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const all = q.get("unlock") === "all";
const tutorialDone = () => { if (all) return true; try { return (JSON.parse(localStorage.getItem("duanju.story.v1") ?? "null")?.done ?? []).includes(14); } catch { return false; } };
const clsLevels = (c: string) => T.levels.filter((l) => l.cls === c).sort((a, b) => a.n - b.n);
const unlocked = (l: TrainLevel) => all || l.n === 1 || prog.done.includes(`${l.cls}-${l.n - 1}`);
const accent = (style: string) => STYLES.find((s) => s.id === style)?.accent ?? "#27d9f5";

function layer(cls: string): HTMLElement { const d = document.createElement("div"); d.className = cls; root.appendChild(d); return d; }
const patHtml = (l: TrainLevel) => l.patterns.map((p) => `<div class="pt"><b>${esc(p.name)}</b><code>${esc(p.sentence)}</code>${esc(p.explain)}<br><small>${esc(p.why)}　需要：${esc(p.need)}</small></div>`).join("");

function brief(l: TrainLevel): Promise<boolean> {
  return new Promise((res) => {
    const c = T.classes.find((x) => x.id === l.cls)!;
    const el = layer("tr-brief"); el.style.setProperty("--c", accent(c.style));
    el.innerHTML = `<div class="box"><small>${esc(c.name)} · 第 ${l.n} 关</small><h2>${esc(l.name)}</h2>
      ${l.brief.map((b) => `<p>${esc(b)}</p>`).join("")}
      ${l.n === 1 ? `<p><b>职业特色</b></p><ul>${c.perks.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      <p><b>本关目标：</b>${esc(l.goal)}</p>${patHtml(l)}
      <div class="btns"><button class="bt" data-r="0">返回</button><button class="bt main" data-r="1">开始</button></div></div>`;
    el.addEventListener("click", (e) => { const r = (e.target as HTMLElement).closest<HTMLElement>("[data-r]")?.dataset.r; if (r) { el.remove(); res(r === "1"); } });
    if (fast) { el.remove(); res(true); }
  });
}
function lostPrompt(l: TrainLevel): Promise<"retry" | "quit"> {
  return new Promise((res) => {
    const el = layer("st-retry");
    el.innerHTML = `<div class="box"><h2>没打赢</h2><p>${l.hints.map(esc).join("<br>")}</p><div><button class="bt go" data-r="retry">再来一次</button><button class="bt" data-r="quit">回选关页</button></div></div>`;
    el.addEventListener("click", (e) => { const r = (e.target as HTMLElement).closest<HTMLElement>("[data-r]")?.dataset.r; if (r) { el.remove(); res(r as "retry" | "quit"); } });
    if (fast) { el.remove(); res("quit"); }
  });
}
function winCard(l: TrainLevel, clsDone: boolean): Promise<void> {
  return new Promise((res) => {
    const c = T.classes.find((x) => x.id === l.cls)!;
    const el = layer("tr-brief"); el.style.setProperty("--c", accent(c.style));
    el.innerHTML = `<div class="box"><h2>过关 ✓ ${esc(l.name)}</h2>${clsDone ? `<p><span class="tr-done" style="background:var(--ok);color:#031018;padding:2px 8px">★ ${esc(c.name)}特训完成</span></p>` : ""}<p>这一关学到的句式：</p>${patHtml(l)}<div class="btns"><button class="bt main" data-r="1">回选关页</button></div></div>`;
    el.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-r]")) { el.remove(); res(); } });
    if (fast) { el.remove(); res(); }
  });
}

async function playLevel(l: TrainLevel) {
  sj.state = "level"; sj.level = l.id;
  root.className = "dj-root story";
  if (!(await brief(l))) return selectPage();
  const c = T.classes.find((x) => x.id === l.cls)!;
  const cur = { base: { rules: T.base.rules, me: c.names }, beats: [l.beat] } as any;
  for (;;) {
    sj.state = "battle";
    const ses = new TrainSession(l.beat, cur);
    const host = layer("st-battle");
    const r = await runTeachBattle(host, ses, undefined, [], { fast });
    host.remove();
    if (r === "exit") return selectPage();
    if (r === "win") break;
    if ((await lostPrompt(l)) === "quit") return selectPage();
  }
  const before = clsLevels(l.cls).every((x) => prog.done.includes(x.id));
  if (!prog.done.includes(l.id)) { prog.done.push(l.id); saveP(); }
  const after = clsLevels(l.cls).every((x) => prog.done.includes(x.id));
  sj.state = "after";
  await winCard(l, after && !before);
  selectPage(l.id);
}

function book() {
  const el = layer("tr-book");
  el.innerHTML = `<div class="box"><h2>句式清单</h2>${T.classes.map((c) => `<h3 style="color:${accent(c.style)}">${esc(c.name)}</h3>${clsLevels(c.id).map((l) => `<p><small>第 ${l.n} 关 · ${esc(l.name)}</small></p>${patHtml(l)}`).join("")}`).join("")}<div class="btns" style="margin-top:10px"><button class="bt main" data-r="1">关闭</button></div></div>`;
  el.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-r]") || e.target === el) el.remove(); });
}

function selectPage(just?: string) {
  sj.state = "select"; root.className = "dj-root story select"; root.innerHTML = "";
  const el = document.createElement("div"); el.className = "st-select"; root.appendChild(el);
  if (!tutorialDone()) {
    sj.state = "locked";
    el.innerHTML = `<header><h1><span>特</span>训 <small>四职业</small></h1></header><div class="tr-lock"><button class="bt" disabled>四职业特训 · 通关教程后开放</button><p>先把教程打到第 14 关毕业，这里就会开放。</p><a class="bt main" href="duanju-story.html">进入教程</a> <a class="bt" href="duanju.html">回主界面</a></div>`;
    return;
  }
  const total = T.levels.length, n = T.levels.filter((l) => prog.done.includes(l.id)).length;
  el.innerHTML = `<header><h1><span>特</span>训 <small>四职业</small></h1><p>每个职业 5 关：第 1 关认识特色，后 4 关由浅入深学长难句。</p>
    <div class="tr-total"><b>${n} / ${total}</b><i><u style="width:${(n / total) * 100}%"></u></i></div>
    <div class="st-tools"><a class="bt" href="duanju.html">回主界面</a><button class="bt" data-a="book">句式清单</button><button class="bt" data-a="reset">清除进度</button></div></header>
    <div class="tr-cols">${T.classes.map((c) => {
      const ls = clsLevels(c.id), d = ls.filter((l) => prog.done.includes(l.id)).length;
      const next = ls.find((l) => !prog.done.includes(l.id));
      return `<section class="tr-col${d === ls.length ? " full" : ""}" style="--c:${accent(c.style)}"><h2><span>${c.glyph}</span>${esc(c.name)}<em>${d}/${ls.length}</em></h2><p>${esc(c.tag)}</p>${d === ls.length ? `<div class="tr-done">★ 特训完成</div>` : ""}
        ${ls.map((l) => { const done = prog.done.includes(l.id), open = unlocked(l), now = l === next; return `<button class="st-card${done ? " done" : ""}${open ? "" : " lock"}${now ? " now" : ""}${l.id === just ? " just" : ""}" data-id="${l.id}" ${open ? "" : "disabled"}>
          <span class="no">${String(l.n).padStart(2, "0")}</span><b>${esc(l.name)}</b><span class="tg">${l.teach.map((t) => `<i>${esc(t)}</i>`).join("")}</span>
          <em>${done ? "已通关 ✓" : open ? (now ? "下一关 ▶" : "可重玩") : "未解锁"}</em></button>`; }).join("")}</section>`;
    }).join("")}</div>`;
  el.addEventListener("click", async (e) => {
    const t = e.target as HTMLElement;
    const c = t.closest<HTMLElement>(".st-card");
    if (c && !c.hasAttribute("disabled")) { root.innerHTML = ""; await playLevel(T.levels.find((l) => l.id === c.dataset.id)!); return; }
    const a = t.closest<HTMLElement>("[data-a]")?.dataset.a;
    if (a === "book") book();
    else if (a === "reset" && confirm("清除特训进度？")) { prog = { done: [] }; saveP(); selectPage(); }
  });
}

async function boot() {
  T = await fetch(`${BASE}duanju/story/training.json`).then((r) => r.json());
  const jump = q.get("level");
  if (jump && tutorialDone()) { const l = T.levels.find((x) => x.id === jump); if (l) { await playLevel(l); return; } }
  selectPage();
}
boot().catch((e) => { sj.errors.push(String(e?.stack ?? e)); console.error(e); });

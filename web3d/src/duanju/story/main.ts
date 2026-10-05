// 《断·句》故事模式入口：序章漫画 → 选关页 → 每关（标题卡 → 关前漫画 → 对话 → 教学战斗 → 对话 → 关后漫画）。
import "../ui.css";
import "./story.css";
import "../skin.css";
import { backgroundFor } from "../art";
import { loadComicData, playSegment, type ComicData } from "./comic";
import { playDialog, type Line } from "./dialog/dialog";
import { runTeachBattle, type LevelDialog } from "./teach/battleRun";
import { TeachSession, type Curriculum } from "./teach/session";

const BASE: string = (import.meta as any).env?.BASE_URL ?? "/";
const root = document.getElementById("app")!;
const q = new URLSearchParams(location.search);
const sj: { errors: string[]; state: string; beat: number } = { errors: [], state: "init", beat: 0 };
(window as any).__dj = sj;
(globalThis as any).__storyErr = (e: string) => sj.errors.push(e);
addEventListener("error", (e) => sj.errors.push(String(e.message)));
addEventListener("unhandledrejection", (e) => sj.errors.push(String((e as PromiseRejectionEvent).reason)));

interface Progress { prologue: boolean; done: number[]; ending?: "A" | "B" }
const KEY = "duanju.story.v1";
const loadP = (): Progress => { try { const j = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (j) return { prologue: !!j.prologue, done: j.done ?? [], ending: j.ending }; } catch { /* */ } return { prologue: false, done: [] }; };
const saveP = (p: Progress) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* */ } };
let prog = loadP();
const fast = q.get("fast") === "1";
let skipStory = q.get("skip") === "1";

let cur: Curriculum, dialogs: LevelDialog[], comic: ComicData;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const unlocked = (n: number) => q.get("unlock") === "all" || n === 1 || prog.done.includes(n - 1);

function layer(cls: string): HTMLElement { const d = document.createElement("div"); d.className = cls; root.appendChild(d); return d; }
async function comicSeg(level: number, when: "pre" | "post", idPrefix?: string) {
  if (skipStory) return;
  const l = layer("st-comic");
  const data = idPrefix ? { ...comic, panels: comic.panels.filter((p) => String(p.id).startsWith(idPrefix)) } : comic;
  const { done } = playSegment(l, data, level, when, { auto: false });
  await done; l.remove();
}
async function dialogSeg(lines: Line[] | undefined, hist: Line[], n = 0) {
  if (skipStory || !lines?.length) return;
  const l = layer("st-dlg"); if (n) l.style.backgroundImage = `linear-gradient(180deg, rgba(8,3,18,.35), rgba(8,3,18,.7)), url(${backgroundFor(n)})`;
  await playDialog(l, lines, { history: hist, onSkipAll: () => { skipStory = true; }, speed: fast ? 0 : 1 });
  l.remove();
}
async function titleCard(n: number, name: string, teach: string[]) {
  const l = layer("st-title");
  l.innerHTML = `<div class="tt"><small>节拍 ${String(n).padStart(2, "0")}</small><h1>${esc(name)}</h1><p>${teach.map((t) => `<i>${esc(t)}</i>`).join("")}</p></div>`;
  await Promise.race([sleep(fast ? 50 : 1900), new Promise<void>((r) => l.addEventListener("click", () => r()))]);
  l.remove();
}
function retryPrompt(): Promise<"retry" | "quit"> {
  return new Promise((res) => {
    const l = layer("st-retry");
    l.innerHTML = `<div class="box"><h2>没打赢</h2><p>没关系，这一关可以重来。想想高亮的提示。</p><div><button class="bt go" data-r="retry">再来一次</button><button class="bt" data-r="quit">回选关页</button></div></div>`;
    l.addEventListener("click", (e) => { const r = (e.target as HTMLElement).closest<HTMLElement>("[data-r]")?.dataset.r; if (r) { l.remove(); res(r as "retry" | "quit"); } });
  });
}

async function playLevel(n: number) {
  const beat = cur.beats.find((b) => b.beat === n)!;
  const dlg = dialogs.find((d) => d.level === n);
  const hist: Line[] = [];
  sj.state = "level"; sj.beat = n;
  skipStory = q.get("skip") === "1";
  root.className = "dj-root story";
  await titleCard(n, beat.name, beat.teach);
  await comicSeg(n, "pre");
  await dialogSeg(dlg?.intro, hist, n);
  let lost = 0;
  for (;;) {
    sj.state = "battle";
    const ses = new TeachSession(beat, cur);
    const host = layer("st-battle");
    const r = await runTeachBattle(host, ses, skipStory ? undefined : dlg, hist, { onSkipAll: () => { skipStory = true; }, fast });
    host.remove();
    if (r === "exit") return selectPage();
    if (r === "win") break;
    const a = await retryPrompt();
    if (a === "quit") return selectPage();
    // 毕业考不能卡死玩家：连输两次后对手换成最朴素的卡组
    if (n === 14 && ++lost >= 2) (beat as any).foeDeck = "newbie";
  }
  sj.state = "after";
  await dialogSeg(dlg?.outro, hist, n);
  await comicSeg(n, "post");
  if (!prog.done.includes(n)) { prog.done.push(n); saveP(prog); }
  if (n === 14 && !q.get("nofinale")) { await finale(); return; }
  selectPage(n);
}

// 终章：揭示 → 三道门 → 结局 A/B（C 暂未开放）→ 回选关页
function chooseDoor(): Promise<"A" | "B"> {
  return new Promise((res) => {
    const l = layer("st-door"); l.className = "st-door";
    l.innerHTML = `<div class="box"><h2>请选择</h2>
      <button class="bt door" data-k="A">跪下。做公司的狗。</button>
      <button class="bt door" data-k="B">假装顺从，暗中破坏。</button>
      <button class="bt door" disabled>拒绝。<small>（之后开放）</small></button></div>`;
    l.addEventListener("click", (e) => { const k = (e.target as HTMLElement).closest<HTMLElement>("[data-k]")?.dataset.k as "A" | "B" | undefined; if (k) { l.remove(); res(k); } });
  });
}
async function finale() {
  sj.state = "finale";
  await comicSeg(15, "post", "L15-reveal");
  const k = await chooseDoor();
  await comicSeg(15, "post", k === "A" ? "L15-endA" : "L15-endB");
  prog.ending = k; saveP(prog);
  selectPage(14);
}

function selectPage(justDone?: number) {
  sj.state = "select"; root.className = "dj-root story select"; root.innerHTML = "";
  const el = document.createElement("div"); el.className = "st-select"; root.appendChild(el);
  const nextN = cur.beats.find((b) => !prog.done.includes(b.beat))?.beat;
  el.innerHTML = `<header><h1><span>断</span>·句 <small>余烬</small></h1><p>十四次“模拟实验”。每一关教一个新东西。</p>
    <div class="st-tools"><button class="bt" data-a="prologue">重看序章</button><button class="bt" data-a="reset">清除进度</button></div></header>
    <div class="st-grid">${cur.beats.map((b) => {
      const done = prog.done.includes(b.beat), open = unlocked(b.beat), now = b.beat === nextN;
      return `<button class="st-card${done ? " done" : ""}${open ? "" : " lock"}${now ? " now" : ""}${b.beat === justDone ? " just" : ""}" data-n="${b.beat}" ${open ? "" : "disabled"}>
        <span class="no">${String(b.beat).padStart(2, "0")}</span><b>${esc(b.name)}</b><span class="tg">${b.teach.map((t) => `<i>${esc(t)}</i>`).join("")}</span>
        <em>${done ? "已通关 ✓" : open ? (now ? "下一关 ▶" : "可重玩") : "未解锁"}</em></button>`;
    }).join("")}</div>`;
  el.addEventListener("click", async (e) => {
    const t = e.target as HTMLElement;
    const c = t.closest<HTMLElement>(".st-card");
    if (c && !c.hasAttribute("disabled")) { root.innerHTML = ""; await playLevel(+c.dataset.n!); return; }
    const a = t.closest<HTMLElement>("[data-a]")?.dataset.a;
    if (a === "prologue") { root.innerHTML = ""; await comicSeg(0, "pre"); selectPage(); }
    else if (a === "reset" && confirm("清除所有进度？")) { prog = { prologue: false, done: [] }; saveP(prog); selectPage(); }
  });
}

async function boot() {
  [cur, dialogs, comic] = await Promise.all([
    fetch(`${BASE}duanju/story/curriculum.json`).then((r) => r.json()),
    fetch(`${BASE}duanju/story/dialog.json`).then((r) => r.json()),
    loadComicData(),
  ]);
  const jump = +(q.get("beat") ?? 0);
  if (q.get("finale") === "1") { root.className = "dj-root story"; await finale(); return; }
  const cs = /^L(\d+)-(pre|post)$/.exec(q.get("comic") ?? ""); // 调试：?comic=L5-post 直接播某段漫画
  if (cs) { root.className = "dj-root story"; await comicSeg(+cs[1], cs[2] as "pre" | "post"); selectPage(); return; }
  if (q.get("unlock") === "all") { /* 调试：全部解锁 */ }
  if (!prog.prologue && !skipStory && !jump) {
    root.className = "dj-root story";
    await comicSeg(0, "pre");
    prog.prologue = true; saveP(prog);
  }
  if (jump) { await playLevel(jump); return; }
  selectPage();
}
boot().catch((e) => { sj.errors.push(String(e?.stack ?? e)); console.error(e); });

// 局域网联机客户端（最简按钮版）：随从 → 词 → 目标 → 数字 → 起手秒数 → 提交。
// 出招只经 net.submitAct()；以后换成键盘拼句 / 辅助轮，只要构造同样的 { uid, cls, start } 即可。
import "./online.css";
import { Net, type NetStatus } from "./net";
import * as NR from "../engine/rules";
import * as NE from "../engine/engine";
import type { GameView, LobbyView, PubAct, PubUnit, View } from "../../shared/protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */
const $root = document.getElementById("root")!;
const esc = (s: any) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const store = {
  get(k: string, d = "") { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* */ } },
};

// ---------------- 状态 ----------------
let view: View | null = null;
let netStatus: NetStatus = "idle";
let toast = "", toastTimer = 0;
let peerNote = "";
let entryName = store.get("nc.name", ""), entryRoom = store.get("nc.room", ""), entryCls = (store.get("nc.cls", "并") as NR.Cls);
let busy = false;                       // 结算动画播放中
let shown: GameView | null = null;      // 动画中显示的视图（单位血量逐步变化）
let flash: Record<number, { cls: string; pop: string }> = {};
let evLog: string[] = [];
let skipAnim = false;
let now = Date.now();

interface Draft { k: string; st?: string; late: boolean; tg: number[]; count: number; n: number; rep: number; cont: number; act?: number }
let comp: { uid: number; cls: Draft[]; start: number } | null = null;   // start 0 = 自动（最早）
let assignDraft: Record<string, number[]> = {};
let lastPhaseKey = "";

const net = new Net({
  state: (v) => { if (busy) { pending = { v }; return; } apply(v); },
  resolved: (events, v) => { void playResolved(events, v); },
  err: (code, msg) => { say(`⚠ ${msg}`); if (code === "no_room" || code === "bad_token") { view = null; render(); } },
  peer: (st, name) => { peerNote = st === "left" ? `${name} 掉线了，等他重连……` : st === "back" ? `${name} 回来了` : `${name} 进房了`; render(); },
  status: (s) => { netStatus = s; render(); },
});
let pending: { v: View } | null = null;

function say(msg: string) { toast = msg; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast = ""; render(); }, 5000); render(); }

function apply(v: View) {
  view = v; shown = null;
  if (v.phase !== "lobby") {
    const g = v as GameView;
    const key = `${g.round}:${g.phase}:${g.turn}:${g.acts.length}`;
    if (key !== lastPhaseKey) { lastPhaseKey = key; if (g.phase !== "declare" || g.turn !== g.you) comp = null; }
    if (comp && (g.phase !== "declare" || g.turn !== g.you || !g.remaining[g.you].includes(comp.uid))) comp = null;
    if (g.phase === "assign") for (const p of g.me.pending) { const k = `${p.ord}:${p.ci}`; if (p.targets.length && !assignDraft[k]) assignDraft[k] = [...p.targets]; }
    else assignDraft = {};
  }
  render();
}

// ---------------- 文字 ----------------
const uname = (g: GameView, uid: number) => { const u = g.units[uid]; return `${u.side === g.you ? "我方" : "对方"}${u.name}`; };
function tgText(g: GameView, c: any, owner: number) {
  const tside = c.side === "enemy" ? 1 - owner : owner;
  const sideName = tside === g.you ? "我方" : "对方";
  if (c.tmode === "late" && (c.hidden || !(c.tg ?? []).length)) return `${c.count} 个${sideName}随从（待定）`;
  return (c.tg ?? []).map((t: number) => uname(g, t)).join("、") || `${sideName}随从`;
}
function clauseText(g: GameView, c: any, owner: number): string {
  const who = tgText(g, c, owner);
  const tail = (c.cont ?? 1) > 1 ? `，持续 ${c.cont} 轮` : "";
  switch (c.k) {
    case "atk": return `对${who}造成 ${c.n} 点伤害${(c.rep ?? 1) > 1 ? ` ×${c.rep}` : ""}${tail}`;
    case "heal": return `使${who}恢复 ${c.n} 点${(c.rep ?? 1) > 1 ? ` ×${c.rep}` : ""}${tail}`;
    case "mit": return `${who}本轮每次少受 ${c.n} 点伤害${tail}`;
    case "st": return `给${who}施加【${c.st}】${c.n > 1 ? `（${c.n} 轮）` : ""}`;
    case "redirect": return `${who}受到的敌方伤害转给出手者`;
    case "delay": return `把对方第 ${(c.act ?? 0) + 1} 句往后推 ${c.n} 秒`;
    case "remove": return `拆掉${who}的减伤、转移、续`;
  }
  return "…";
}
const actText = (g: GameView, a: PubAct) => a.cl.map((c) => clauseText(g, c, a.side)).join("；并且");

// ---------------- 渲染 ----------------
function render() {
  const sc = scrollSave();
  if (!view) $root.innerHTML = entryHtml();
  else if (view.phase === "lobby") $root.innerHTML = lobbyHtml(view as LobbyView);
  else $root.innerHTML = gameHtml((shown ?? view) as GameView);
  scrollRestore(sc);
}
function scrollSave() { return Array.from($root.querySelectorAll<HTMLElement>("[data-keep]")).map((e) => e.scrollTop); }
function scrollRestore(v: number[]) { Array.from($root.querySelectorAll<HTMLElement>("[data-keep]")).forEach((e, i) => { e.scrollTop = v[i] ?? e.scrollHeight; }); }

const netBadge = () => `<span class="net ${netStatus}">${{ idle: "未连接", connecting: "连接中…", open: "已连接", lost: "断线，重连中…" }[netStatus]}</span>`;

function entryHtml() {
  const rnd = entryRoom || Math.random().toString(36).slice(2, 6).toUpperCase();
  return `<main class="entry">
    <h1>词战 · 数字牌 · 局域网联机</h1>${netBadge()}
    <p class="dim">一人取个房间号建房，另一人输入同一个房间号加入。两人都点「准备」开打。</p>
    <label>你的名字 <input id="name" maxlength="12" value="${esc(entryName)}" placeholder="例如 小明"></label>
    <label>房间号 <input id="room" maxlength="12" value="${esc(rnd)}"></label>
    <div class="cls">选流派：${NR.CLASSES.map((c) => `<button class="chip ${c === entryCls ? "on" : ""}" data-cls="${c}" title="${esc(NR.METRIC_NAME[c])}">${NR.CLASS_NAME[c]}</button>`).join("")}</div>
    <p class="dim">${esc(clsHelp(entryCls))}</p>
    <button class="primary" data-a="join" ${netStatus !== "open" ? "disabled" : ""}>建房 / 加入</button>
    <p class="toast">${esc(toast)}</p>
  </main>`;
}
function clsHelp(c: NR.Cls) {
  return ({ 并: "并流：一句话最多 7 段，每多一段只多花 1 点；一句里每种词只能用一次。胜利看「连段」。",
    续: "续流：把【持续】接在伤害/恢复/减伤后面，之后每轮自动再来一次。胜利看「续出」。",
    择: "择流：目标可以先留「待定」，宣告完再偷偷定，对手看不到。胜利看「命中」。",
    血: "血流：行动点不够可以用血付，但句子里不能有恢复/减伤/转移。胜利看「血债」。" } as any)[c];
}

function lobbyHtml(v: LobbyView) {
  const me = v.players[v.you];
  const rows = v.players.map((p, i) => `<li>${p ? `${esc(p.name)}（${NR.CLASS_NAME[p.cls]}）${i === v.you ? " ← 你" : ""} ${p.ready ? "<b class=ok>已准备</b>" : "<span class=dim>未准备</span>"} ${p.connected ? "" : "<span class=warn>掉线</span>"}` : `<span class="dim">等待对手加入…</span>`}</li>`).join("");
  return `<main class="entry"><h1>房间 ${esc(v.room)}</h1>${netBadge()}
    <p class="dim">把房间号告诉对方，在他的浏览器输入同一个房间号。当前地址：<code>${esc(location.host)}</code></p>
    <ul class="players">${rows}</ul>
    <button class="primary" data-a="ready" ${me?.ready || !v.players[0] || !v.players[1] ? "disabled" : ""}>${me?.ready ? "等对手准备…" : "准备"}</button>
    <button data-a="leave">退出房间</button>
    <p class="note">${esc(peerNote)}</p><p class="toast">${esc(toast)}</p></main>`;
}

function bar(hp: number, mx: number) { const p = Math.max(0, Math.min(100, (100 * hp) / mx)); return `<div class="hp"><i style="width:${p}%" class="${p < 35 ? "low" : ""}"></i><span>${Math.max(0, hp)}/${mx}</span></div>`; }

function unitHtml(g: GameView, u: PubUnit) {
  const acts = g.acts.filter((a) => a.uid === u.uid);
  const f = flash[u.uid];
  const sts = Object.keys(u.st).map((n) => `<span class="st">${n}${u.st[n][0]}级</span>`).join("");
  const rem = g.remaining[u.side].includes(u.uid);
  const sel = comp?.uid === u.uid;
  const canPick = g.phase === "declare" && g.turn === g.you && u.side === g.you && rem && !busy;
  return `<div class="unit s${u.side === g.you ? "me" : "opp"} ${u.down !== -1 ? "down" : ""} ${f?.cls ?? ""} ${sel ? "sel" : ""} ${canPick ? "pick" : ""}" ${canPick ? `data-a="pickunit" data-uid="${u.uid}"` : ""}>
    <div class="uh"><b>${u.glyph} ${esc(u.name)}</b><span class="kw ${u.kws ? "spent" : ""}">${esc(u.kw)}</span></div>
    ${bar(u.hp, u.mx)}
    <div class="sts">${sts}${u.mit > 0 ? `<span class="st">减伤${u.mit}</span>` : ""}${u.down !== -1 ? `<span class="st dead">倒下（${u.down + 2 > g.round ? "下一轮起复活" : "即将复活"}）</span>` : ""}</div>
    <div class="acts">${acts.map((a) => `<div class="act ${a.side === g.you ? "mine" : ""}"><em>#${a.ord + 1} · 第 ${a.start} 秒</em> ${esc(actText(g, a))}${a.blood ? `<span class="blood"> 付血 ${a.blood}</span>` : ""}</div>`).join("")}${g.phase === "declare" && !rem && !acts.length && u.down === -1 ? `<div class="act dim">本轮不出手</div>` : ""}</div>
    ${f?.pop ? `<span class="pop">${esc(f.pop)}</span>` : ""}
  </div>`;
}

function timelineHtml(g: GameView) {
  const cells = [];
  for (let t = 1; t <= NR.TIMELINE; t++) {
    const here = g.acts.filter((a) => a.start === t);
    cells.push(`<div class="tick"><span>${t}</span>${here.map((a) => `<i class="${a.side === g.you ? "mine" : "theirs"}" title="${esc(actText(g, a))}">${g.units[a.uid].glyph}</i>`).join("")}</div>`);
  }
  return `<div class="timeline">${cells.join("")}</div>`;
}

function progHtml(g: GameView) {
  const row = (s: number) => {
    const sd = g.sides[s];
    return `<div class="prog"><span>${s === g.you ? "我" : "对手"} ${esc(sd.name)}（${NR.CLASS_NAME[sd.cls]}）${sd.connected ? "" : "<b class=warn>掉线</b>"}</span><div class="pbar"><i style="width:${Math.min(100, sd.prog * 100)}%"></i></div><span>${NR.METRIC_NAME[sd.cls]} ${Math.round(sd.prog * 100)}%　行动点 ${sd.ap}　数字牌 ${sd.cardCount}</span></div>`;
  };
  return row(1 - g.you) + row(g.you);
}

function statusLine(g: GameView): string {
  if (g.phase === "over") return g.winner === g.you ? "你赢了！" : g.winner === -2 ? "平局" : "你输了";
  if (busy) return "结算中…";
  if (g.phase === "assign") return g.me.assignDone ? "已确认，等对手定目标…" : "择流：给你的待定目标挑人，然后确认";
  if (g.phase === "resolved") return "本轮结算完毕";
  if (g.turn === g.you) return "轮到你：选一个随从出手，或者让他不出手";
  return g.turn === -1 ? "…" : "等对手宣告…";
}
function countdown(g: GameView) { return g.deadline && g.deadline > now ? ` · ${Math.ceil((g.deadline - now) / 1000)} 秒` : ""; }

function gameHtml(g: GameView) {
  const opp = g.units.filter((u) => u.side !== g.you), mine = g.units.filter((u) => u.side === g.you);
  const over = g.phase === "over";
  return `<div class="game">
    <header><b>第 ${g.round}/${NR.MAX_ROUNDS} 轮</b><span>先手：${g.first === g.you ? "你" : "对手"}</span><span class="status">${esc(statusLine(g))}${countdown(g)}</span>${netBadge()}<button data-a="leave" class="mini">退出</button></header>
    <section class="progs">${progHtml(g)}</section>
    <section class="board"><div class="row">${opp.map((u) => unitHtml(g, u)).join("")}</div>${timelineHtml(g)}<div class="row">${mine.map((u) => unitHtml(g, u)).join("")}</div></section>
    <section class="hand">${handHtml(g)}</section>
    ${g.phase === "declare" && g.turn === g.you && !busy ? composerHtml(g) : ""}
    ${g.phase === "assign" && !g.me.assignDone ? assignHtml(g) : ""}
    ${(g.phase === "resolved" || over) && !busy ? afterHtml(g) : ""}
    <p class="note">${esc(peerNote)}</p><p class="toast">${esc(toast)}</p>
    <section class="log" data-keep>${evLog.map((l) => `<div>${esc(l)}</div>`).join("")}</section>
  </div>`;
}

function handHtml(g: GameView) {
  const cards = g.me.cards.map((c) => `<span class="num ${c.usable ? "" : "off"} ${c.once ? "once" : ""}" title="${esc(c.src)}${c.once ? "（一次性）" : ""}${c.usable ? "" : "（这轮用不了）"}">${c.v}</span>`).join("") || `<span class="dim">没有</span>`;
  const words = NR.WORD_ORDER.map((w) => `<span class="wd ${(g.me.words[w] ?? 0) > 0 ? "" : "off"}" title="${esc(NR.WORDS[w].desc)}">${w}×${g.me.words[w] ?? 0}</span>`).join("");
  return `<div>行动点 <b>${g.me.ap}</b>　数字牌 ${cards}</div><div>进阶词 ${words}${Object.keys(g.me.cooling).length ? `<span class="dim">　冷却：${Object.entries(g.me.cooling).map(([k, v]) => `${k}×${v}`).join(" ")}</span>` : ""}</div>`;
}

// ---- 拼句面板 ----
const KIND_BTNS: { id: string; label: string; k: string; st?: string; need?: string }[] = [
  { id: "atk", label: "造成伤害", k: "atk" }, { id: "heal", label: "恢复", k: "heal" }, { id: "mit", label: "减伤", k: "mit" },
  { id: "易伤", label: "易伤", k: "st", st: "易伤", need: "易伤" }, { id: "灼烧", label: "灼烧", k: "st", st: "灼烧", need: "灼烧" }, { id: "衰弱", label: "衰弱", k: "st", st: "衰弱", need: "衰弱" },
  { id: "转移", label: "转移", k: "redirect", need: "转移" }, { id: "延后", label: "延后", k: "delay", need: "延后" }, { id: "移除", label: "移除", k: "remove", need: "移除" },
];
const sideOfKind = (k: string) => (["atk", "st", "delay", "remove"].includes(k) ? "enemy" : "ally");
const toClause = (d: Draft) => {
  const c: any = { k: d.k, side: sideOfKind(d.k) };
  if (d.k === "delay") { c.act = d.act ?? 0; c.n = d.n; c.tg = []; c.count = 1; return c; }
  if (d.k === "remove") { c.tmode = "pick"; c.tg = d.tg.slice(0, 1); c.count = 1; return c; }
  c.tmode = d.late ? "late" : "choose";
  c.tg = d.late ? [] : [...d.tg]; c.count = d.late ? d.count : d.tg.length;
  if (["atk", "heal"].includes(d.k)) { c.n = d.n; c.rep = d.rep; }
  if (d.k === "mit") c.n = d.n;
  if (d.k === "st") { c.st = d.st; c.n = d.n; }
  if (["atk", "heal", "mit"].includes(d.k) && d.cont > 1) c.cont = d.cont;
  return c;
};
const newDraft = (k: string, st?: string): Draft => ({ k, st, late: false, tg: [], count: 1, n: 1, rep: 1, cont: 1 });

function composerHtml(g: GameView) {
  const cp = g.me.caps;
  const myUnits = g.units.filter((u) => u.side === g.you && g.remaining[g.you].includes(u.uid));
  if (!comp) {
    return `<section class="composer"><h3>选一个随从</h3><div class="btns">${myUnits.map((u) => `<button data-a="pickunit" data-uid="${u.uid}">${u.glyph} ${esc(u.name)}</button>`).join("")}</div>
      <p class="dim">也可以直接点上面的我方随从卡。选了之后拼一句话；或者让他这轮不出手。</p></section>`;
  }
  const u = g.units[comp.uid];
  const vals = [...new Set(g.me.cards.filter((c) => c.usable && c.v > 1).map((c) => c.v))].sort((a, b) => a - b);
  const numOpts = [1, ...vals];
  const oppActs = g.acts.filter((a) => a.side !== g.you);
  const clauses = comp.cls.map((d, i) => {
    const targetSide = sideOfKind(d.k) === "enemy" ? 1 - g.you : g.you;
    const pool = g.units.filter((x) => x.side === targetSide && x.down === -1);
    const kindLabel = KIND_BTNS.find((b) => b.k === d.k && b.st === d.st)?.label ?? d.k;
    const parts: string[] = [];
    if (d.k === "delay") {
      parts.push(`<div>延后哪一句：${oppActs.length ? oppActs.map((a) => `<button class="chip ${d.act === a.ord ? "on" : ""}" data-a="dact" data-i="${i}" data-v="${a.ord}">#${a.ord + 1} ${esc(g.units[a.uid].name)}·第${a.start}秒</button>`).join("") : "<span class=warn>对方还没宣告</span>"}</div>`);
    } else {
      if (cp.late && d.k !== "remove") parts.push(`<div>目标：<button class="chip ${d.late ? "on" : ""}" data-a="late" data-i="${i}">待定（宣告完再选，对手看不到）</button></div>`);
      if (d.late) parts.push(`<div>待定几个：${[1, 2, 3].filter((x) => x <= pool.length).map((x) => `<button class="chip ${d.count === x ? "on" : ""}" data-a="count" data-i="${i}" data-v="${x}">${x}</button>`).join("")}</div>`);
      else parts.push(`<div>${d.k === "remove" ? "选一个" : "点选"}目标：${pool.map((x) => `<button class="chip ${d.tg.includes(x.uid) ? "on" : ""}" data-a="tg" data-i="${i}" data-v="${x.uid}">${x.glyph}${esc(x.name)}</button>`).join("")}</div>`);
    }
    if (["atk", "heal", "mit", "st", "delay"].includes(d.k)) {
      const lab = d.k === "atk" ? "伤害" : d.k === "heal" ? "恢复" : d.k === "mit" ? "减伤" : d.k === "st" ? "持续轮数" : "秒数";
      parts.push(`<div>${lab}：${numOpts.map((x) => `<button class="chip ${d.n === x ? "on" : ""}" data-a="n" data-i="${i}" data-v="${x}">${x}</button>`).join("")}</div>`);
    }
    if (["atk", "heal"].includes(d.k) && !cp.norep) parts.push(`<div>重复：${numOpts.map((x) => `<button class="chip ${d.rep === x ? "on" : ""}" data-a="rep" data-i="${i}" data-v="${x}">${x}</button>`).join("")}</div>`);
    if (["atk", "heal", "mit"].includes(d.k) && cp.slots > 0) parts.push(`<div>持续：${numOpts.map((x) => `<button class="chip ${d.cont === x ? "on" : ""}" data-a="cont" data-i="${i}" data-v="${x}">${x === 1 ? "不持续" : x + " 轮"}</button>`).join("")}</div>`);
    return `<div class="clause"><div class="ch"><b>第 ${i + 1} 段：${esc(kindLabel)}</b>${comp!.cls.length > 1 ? `<button class="mini" data-a="delclause" data-i="${i}">删除</button>` : ""}</div>${parts.join("")}</div>`;
  }).join("");
  const addable = comp.cls.length < cp.clauses;
  const acts = comp.cls.map(toClause);
  const words = NE.actionWords(acts);
  const cost = NE.actionCost(acts, cp.and);
  const minStart = NE.actionWindup(acts, cp.wind);
  const startOpts = Array.from({ length: NR.TIMELINE - minStart + 1 }, (_, i) => minStart + i);
  const text = acts.map((c) => clauseText(g, { ...c, hidden: c.tmode === "late" }, g.you)).join("；并且");
  return `<section class="composer"><h3>${u.glyph} ${esc(u.name)} 出手${comp.cls.length ? "" : " —— 选第一个词"}</h3>
    ${clauses}
    <div class="kinds">${comp.cls.length ? (addable ? "并且 " : "") : ""}${addable ? KIND_BTNS.map((b) => {
      const off = !!b.need && (g.me.words[b.need] ?? 0) <= 0;
      return `<button class="chip ${off ? "off" : ""}" data-a="addkind" data-id="${b.id}" ${off ? "disabled" : ""}>${b.label}</button>`;
    }).join("") : `<span class="dim">已经是最长的句子了（最多 ${cp.clauses} 段）</span>`}</div>
    ${comp.cls.length ? `<div class="preview">${esc(text)}<br><span class="dim">估算：花 ${cost} 点行动点（现有 ${g.me.ap}${cost > g.me.ap && cp.blood > 0 ? "，差额用血付" : ""}）${words.length ? `，用词 ${words.join("、")}` : ""}，最早第 ${minStart} 秒</span></div>
      <div>起手：<button class="chip ${comp.start === 0 ? "on" : ""}" data-a="start" data-v="0">最早（第 ${minStart} 秒）</button>${startOpts.slice(1).map((t) => `<button class="chip ${comp!.start === t ? "on" : ""}" data-a="start" data-v="${t}">${t}</button>`).join("")}</div>
      <div class="btns"><button class="primary" data-a="submit">宣告这句</button></div>` : ""}
    <div class="btns"><button data-a="passunit">让他这轮不出手</button><button data-a="cancel">换个随从</button></div>
  </section>`;
}

function assignHtml(g: GameView) {
  const rows = g.me.pending.map((p) => {
    const k = `${p.ord}:${p.ci}`;
    const pool = g.units.filter((u) => (u.side !== g.you) === (p.side === "enemy") && u.down === -1);
    const need = Math.min(p.count, pool.length);
    const sel = assignDraft[k] ?? [];
    const a = g.acts.find((x) => x.ord === p.ord)!;
    return `<div class="clause"><div>#${p.ord + 1}（${esc(g.units[a.uid].name)} 第 ${a.start} 秒）：${esc(clauseText(g, a.cl[p.ci], g.you))} —— 选 ${need} 个 ${sel.length === need ? "<b class=ok>已定</b>" : ""}</div>
      <div>${pool.map((u) => `<button class="chip ${sel.includes(u.uid) ? "on" : ""}" data-a="atg" data-ord="${p.ord}" data-ci="${p.ci}" data-need="${need}" data-v="${u.uid}">${u.glyph}${esc(u.name)}（${u.side === g.you ? "我方" : "对方"} ${u.hp}/${u.mx}）</button>`).join("")}</div></div>`;
  }).join("");
  return `<section class="composer"><h3>择流：定待定目标（对手看不到）</h3>${rows}<div class="btns"><button class="primary" data-a="confirm">确认（没选的自动补）</button></div></section>`;
}

function afterHtml(g: GameView) {
  const notes = g.notes.map((n) => `${n.side === g.you ? "你" : "对手"}：${noteText(n)}`).join("；");
  const me = g.sides[g.you], opp = g.sides[1 - g.you];
  const btn = g.phase === "over"
    ? `<button class="primary" data-a="ready" ${me.ready ? "disabled" : ""}>${me.ready ? "等对手…" : "再来一局"}</button>`
    : `<button class="primary" data-a="ready" ${me.ready ? "disabled" : ""}>${me.ready ? "等对手…" : "下一轮"}</button>`;
  return `<section class="composer"><h3>${g.phase === "over" ? esc(statusLine(g)) : "本轮结束"}</h3>${notes ? `<p>${esc(notes)}</p>` : ""}<div class="btns">${btn}<span class="dim">${opp.ready ? "对手已准备" : ""}</span></div></section>`;
}
function noteText(n: any) {
  if (n.type === "floor") return `领到保底数字牌 ${n.value}`;
  if (n.type === "dice") return `${n.why}，掷骰 ${n.rolls.join("、")}（大于 1 的变成一次性数字牌）`;
  if (n.type === "ladder") return `进度到 ${Math.round(n.at * 100)}%，领到阶梯数字牌 ${n.value}×${n.copies}`;
  return n.type;
}

// ---------------- 结算动画 ----------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function evText(g: GameView, e: any): string {
  const un = (id: number) => uname(g, id);
  switch (e.type) {
    case "blood": return `第 0 秒 ${un(e.uid)} 付血 ${e.amount}`;
    case "fire": return `第 ${e.t} 秒 ${un(e.uid)} 出手${e.cont ? "（续）" : `（#${e.ord + 1}）`}`;
    case "lock": return `　目标锁定：${e.tgts.map(un).join("、") || "无"}${e.changed ? "（原目标失效，已改选）" : ""}`;
    case "hit": return `　${un(e.src)} → ${un(e.tgt)}：打 ${e.amount}，实际 ${e.dealt}${Object.keys(e.parts ?? {}).length ? `（${Object.entries(e.parts).map(([k, v]) => `${k}${v}`).join(" ")}）` : ""}`;
    case "redirected": return `　转移：${un(e.tgt)} 吃到 ${e.dealt}`;
    case "heal": return `　${un(e.tgt)} 恢复 ${e.amount}`;
    case "mit": return `　${un(e.tgt)} 获得减伤 ${e.amount}`;
    case "status": return `　${un(e.tgt)} 【${e.st}】${e.lv} 级`;
    case "listen": return `　${un(e.tgt)} 挂上转移`;
    case "delay": return `　对方第 ${e.ord + 1} 句被推到第 ${e.to} 秒`;
    case "remove": return `　${un(e.tgt)} 的减伤/转移被拆${e.broke ? `，断了 ${e.broke} 个续` : ""}`;
    case "cont_set": return `　续：之后 ${e.rounds} 轮每轮再来一次`;
    case "endure": return `　${un(e.tgt)} 不屈，留 1 血`;
    case "ko": return `第 ${e.t} 秒 ${un(e.tgt)} 倒下！`;
    case "burn": return `轮末 ${un(e.tgt)} 灼烧 ${e.dealt}`;
    case "chain": return `连段：${e.uid >= 0 ? un(e.uid) : ""}（${e.kinds.join("、")}）+${e.points}${e.all ? "（全中）" : ""}`;
    case "fizzle": return `　${un(e.uid)} 的一句落空：${e.why}`;
  }
  return "";
}
async function playResolved(events: any[], final: GameView) {
  busy = true; skipAnim = false;
  const prev = (view && view.phase !== "lobby" ? (view as GameView) : final);
  const disp: GameView = JSON.parse(JSON.stringify({ ...final, units: prev.units, acts: final.acts }));
  shown = disp;
  evLog.push(`—— 第 ${final.round} 轮结算 ——`);
  render();
  for (const e of events) {
    const line = evText(final, e);
    const set = (id: number, cls: string, pop: string) => { flash[id] = { cls, pop }; };
    const u = (id: number) => disp.units[id];
    flash = {};
    switch (e.type) {
      case "hit": u(e.tgt).hp -= e.dealt; if (e.dealt > 0) set(e.tgt, "hurt", `-${e.dealt}`); else set(e.tgt, "block", "挡"); break;
      case "redirected": u(e.tgt).hp -= e.dealt; set(e.tgt, "hurt", `-${e.dealt}`); break;
      case "heal": u(e.tgt).hp += e.amount; set(e.tgt, "heal", `+${e.amount}`); break;
      case "blood": u(e.uid).hp -= e.amount; set(e.uid, "hurt", `血-${e.amount}`); break;
      case "burn": u(e.tgt).hp -= e.dealt; set(e.tgt, "hurt", `烧-${e.dealt}`); break;
      case "endure": u(e.tgt).hp = 1; set(e.tgt, "block", "不屈"); break;
      case "ko": u(e.tgt).hp = 0; u(e.tgt).down = final.round; set(e.tgt, "hurt", "倒下"); break;
      case "status": set(e.tgt, "buff", e.st); break;
      case "mit": set(e.tgt, "buff", `减伤${e.amount}`); break;
    }
    if (line) evLog.push(line);
    render();
    if (!skipAnim && line) await sleep(e.type === "fire" ? 380 : 260);
  }
  flash = {};
  for (const n of final.notes) evLog.push(`${n.side === final.you ? "你" : "对手"}：${noteText(n)}`);
  if (evLog.length > 300) evLog = evLog.slice(-200);
  busy = false;
  const p = pending; pending = null;
  apply(p ? p.v : final);
}

// ---------------- 事件 ----------------
$root.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-a],[data-cls]");
  if (!el) { if (busy) { skipAnim = true; } return; }
  if (busy) { skipAnim = true; return; }
  const d = el.dataset;
  if (d.cls) { entryCls = d.cls as NR.Cls; readEntry(); render(); return; }
  const g = view && view.phase !== "lobby" ? (view as GameView) : null;
  const i = d.i !== undefined ? +d.i : -1, v = d.v !== undefined ? +d.v : 0;
  const cl = comp && i >= 0 ? comp.cls[i] : null;
  switch (d.a) {
    case "join": {
      readEntry();
      const room = entryRoom.trim().toUpperCase();
      if (!room) return say("房间号不能为空");
      store.set("nc.name", entryName); store.set("nc.room", room); store.set("nc.cls", entryCls);
      peerNote = ""; evLog = [];
      net.join(room, entryName.trim() || "玩家", { cls: entryCls });
      return;
    }
    case "ready": net.ready(); return;
    case "leave": net.leave(); view = null; shown = null; comp = null; evLog = []; peerNote = ""; net.connect(); render(); return;
    case "pickunit": if (g) { comp = { uid: +d.uid!, cls: [], start: 0 }; render(); } return;
    case "cancel": comp = null; render(); return;
    case "passunit": if (comp) { net.pass(comp.uid); comp = null; } return;
    case "addkind": if (comp) { const b = KIND_BTNS.find((x) => x.id === d.id)!; comp.cls.push(newDraft(b.k, b.st)); render(); } return;
    case "delclause": if (comp) { comp.cls.splice(i, 1); render(); } return;
    case "late": if (cl) { cl.late = !cl.late; cl.tg = []; render(); } return;
    case "count": if (cl) { cl.count = v; render(); } return;
    case "tg": if (cl) {
      if (cl.k === "remove") cl.tg = [v];
      else cl.tg = cl.tg.includes(v) ? cl.tg.filter((x) => x !== v) : [...cl.tg, v];
      render();
    } return;
    case "n": if (cl) { cl.n = v; render(); } return;
    case "rep": if (cl) { cl.rep = v; render(); } return;
    case "cont": if (cl) { cl.cont = v; render(); } return;
    case "dact": if (cl) { cl.act = v; render(); } return;
    case "start": if (comp) { comp.start = v; render(); } return;
    case "submit": if (comp && g) {
      const acts = comp.cls.map(toClause);
      const start = comp.start || NE.actionWindup(acts, g.me.caps.wind);
      net.submitAct({ uid: comp.uid, cls: acts, start });
    } return;
    case "atg": {
      const key = `${d.ord}:${d.ci}`, need = +d.need!;
      const cur = assignDraft[key] ?? [];
      const nxt = cur.includes(v) ? cur.filter((x) => x !== v) : need === 1 ? [v] : [...cur, v].slice(-need);
      assignDraft[key] = nxt;
      if (nxt.length === need) net.assignLate(+d.ord!, +d.ci!, nxt);
      render(); return;
    }
    case "confirm": net.confirmAssign(); return;
  }
});
function readEntry() {
  const n = document.getElementById("name") as HTMLInputElement | null, r = document.getElementById("room") as HTMLInputElement | null;
  if (n) entryName = n.value; if (r) entryRoom = r.value;
}
$root.addEventListener("input", () => readEntry());

setInterval(() => { now = Date.now(); const g = view && view.phase !== "lobby" ? (view as GameView) : null; if (g?.deadline) { const s = $root.querySelector(".status"); if (s) s.textContent = `${statusLine(g)}${countdown(g)}`; } }, 500);

// 调试/替换 UI 用：window.__nc.net.submitAct({uid, cls, start})
(window as any).__nc = { net, get view() { return view; } };
net.connect();
render();

// 开局页：队伍配色 → 卡组 → 难度 → 先后手 → 规则配置 → 开始
import { TIER_NAMES, configureRules, P2, type Deck } from "./engine/api";
import { DeckBoard } from "./deck/board";
import { presetDeck, presetsNow } from "./deck/words";
import { STYLES, TIER_DESC, styleOf } from "./styles";
import { talentOf } from "./talents";
import { loadArt } from "./art";
import type { Settings } from "./types";

export const KW_TIP: Record<string, string> = { 首挡: "每轮第一次受到的伤害无效", 不屈: "每轮第一次被打到 0 血时留 1 血" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function defaultSettings(): Settings {
  return { styleId: "bing", deck: presetDeck(styleOf("bing").deckPreset) as Deck, tier: "普通", first: "random", rules: "default", customRules: "", kws: ["random", "random", "random"], foe: { mode: "random", preset: "newbie", deck: {} } };
}
export function loadSettings(): Settings {
  const d = defaultSettings();
  try { const j = JSON.parse(localStorage.getItem("duanju.settings") ?? "null"); if (j && typeof j === "object") return { ...d, ...j }; } catch { /* */ }
  return d;
}
export function saveSettings(s: Settings) { try { localStorage.setItem("duanju.settings", JSON.stringify(s)); } catch { /* */ } }

let boards: DeckBoard[] = [];
export function mountSetup(root: HTMLElement, st: Settings, onStart: (s: Settings) => void) {
  root.innerHTML = "";
  const el = document.createElement("div"); el.className = "dj-setup";
  root.appendChild(el);
  boards.forEach((b) => b.destroy()); boards = [];
  if (!st.foe) st.foe = { mode: "random", preset: "newbie", deck: {} };
  if (!Array.isArray(st.kws) || st.kws.length !== 3) st.kws = ["random", "random", "random"];
  let rulesErr: string | null = null;
  const applyRules = () => { rulesErr = configureRules(st.rules, st.customRules); if (rulesErr) configureRules("default"); };
  const subs = () => (P2.POS ? ["词位", "数位", "速位"] : undefined);
  const setCost = () => { const c = el.querySelector(".su-cost"); if (c) c.textContent = `已选 ${Object.values(st.deck).reduce((a, n) => a + n, 0)} 张进阶词`; };
  applyRules();
  const deckHost = document.createElement("div"); deckHost.className = "su-deckhost";
  const foeHost = document.createElement("div"); foeHost.className = "su-deckhost";
  const board: DeckBoard = new DeckBoard({
    host: deckHost, drawer: true,
    onChange: (d) => { st.deck = d; saveSettings(st); setCost(); },
    kws: { names: [...styleOf(st.styleId).names], sub: subs(), values: st.kws, onPick: (i, k) => { st.kws[i] = k; saveSettings(st); } },
    onImportKws: (k) => { k.forEach((x, i) => { st.kws[i] = x === "首挡" || x === "不屈" ? x : "random"; }); board.setKws([...styleOf(st.styleId).names], st.kws, subs()); },
  });
  boards.push(board);
  if (board.setDeck(st.deck, true)) board.setDeck(presetDeck(styleOf(st.styleId).deckPreset), true);
  st.deck = board.getDeck();
  let foeBoard: DeckBoard | null = null;
  const ensureFoe = () => {
    if (foeBoard) return;
    foeBoard = new DeckBoard({ host: foeHost, onChange: (d) => { st.foe.deck = d; saveSettings(st); } });
    boards.push(foeBoard);
    if (foeBoard.setDeck(st.foe.deck ?? {}, true)) foeBoard.setDeck({}, true);
    st.foe.deck = foeBoard.getDeck();
  };
  const render = () => {
    applyRules();
    board.refreshWords(); foeBoard?.refreshWords();
    const sty = styleOf(st.styleId);
    board.setKws([...sty.names], st.kws, subs());
    const pre = presetsNow();
    if (!pre.some((p) => p.id === st.foe.preset)) st.foe.preset = pre[0]?.id ?? "";
    el.style.setProperty("--accent", sty.accent);
    el.innerHTML = `
    <header class="su-title"><h1><span>断</span><i>·</i><span>句</span></h1><p>用句子当规则，打一局电脑</p></header>
    <section class="su-sec"><h2><b>01</b>队伍配色</h2>
      <div class="su-styles">${STYLES.map((s) => `<button class="su-style${s.id === st.styleId ? " on" : ""}" data-style="${s.id}" style="--c:${s.accent};--c2:${s.accent2}"><img alt="" data-art="${s.id}" /><span class="n">${s.name}</span><span class="t">${esc(s.tag)}</span></button>`).join("")}</div>
      ${P2.CLASSES ? `<p class="su-talent" data-cls="${sty.cls}"><b>${esc(sty.cls)}流</b><span class="tl">天赋　${esc(talentOf(sty.cls).talent)}</span><span class="lm">限制　${esc(talentOf(sty.cls).limit)}</span></p><p class="su-note">选一组配色与立绘：载入对应的推荐卡组，并让你的随从获得该职业的天赋与限制；电脑按它自己的那一组。</p>` : `<p class="su-note">选一组配色与立绘，会载入对应的推荐卡组；当前规则没有开启职业，各组规则相同。</p>`}</section>
    <section class="su-sec su-decksec"><h2><b>02</b>卡组与关键词 <small class="su-cost ok"></small></h2><p class="su-note">进阶词按携带张数分别冷却：本轮用后，下一轮不可用，再下一轮恢复；基础词不限次数。默认开局数字牌为2、2、2、3，数字牌同样隔一轮恢复，骰牌用后消失。</p><div class="su-slot" data-slot="deck"></div></section>
    <section class="su-sec"><h2><b>03</b>对手卡组 <small>开局后战斗中看不到</small></h2>
      <div class="su-pills">${([["random", "随机"], ["preset", "选一套推荐"], ["custom", "自定义"]] as const).map(([k, l]) => `<button class="su-pill${st.foe.mode === k ? " on" : ""}" data-foe="${k}">${l}</button>`).join("")}</div>
      ${st.foe.mode === "preset" ? `<div class="su-presets" style="margin-top:10px">${pre.map((p) => `<button class="su-chip${st.foe.preset === p.id ? " on" : ""}" data-foepre="${p.id}">${esc(p.name)}</button>`).join("")}</div><p class="su-note">${esc(Object.entries(pre.find((p) => p.id === st.foe.preset)?.deck ?? {}).map(([w, n]) => `${w}×${n}`).join("　"))}</p>` : ""}
      ${st.foe.mode === "custom" ? `<div class="su-slot" data-slot="foe" style="margin-top:10px"></div>` : ""}
      ${st.foe.mode === "random" ? `<p class="su-note">每局随机抽一套预算内的卡组。</p>` : ""}
    </section>
    <section class="su-sec"><h2><b>04</b>难度</h2>
      <div class="su-tiers">${TIER_NAMES.map((t) => `<button class="su-tier${t === st.tier ? " on" : ""}" data-tier="${t}"><span class="n">${t}</span><span class="t">${esc(TIER_DESC[t] ?? "")}</span></button>`).join("")}</div></section>
    <section class="su-sec su-two"><div><h2><b>05</b>先后手</h2>
      <div class="su-pills">${([["random", "随机"], ["me", "我先"], ["foe", "电脑先"]] as const).map(([k, l]) => `<button class="su-pill${st.first === k ? " on" : ""}" data-first="${k}">${l}</button>`).join("")}</div></div>
      <div><h2><b>06</b>规则配置</h2>
      <div class="su-pills">${([["default", "断·句默认"], ["legacy", "旧版"], ["real", "纯REAL"], ["custom", "自定义"]] as const).map(([k, l]) => `<button class="su-pill${st.rules === k ? " on" : ""}" data-rules="${k}">${l}</button>`).join("")}</div></div></section>
    ${st.rules === "custom" ? `<section class="su-sec"><textarea class="su-rules" rows="4" spellcheck="false" placeholder='{"P":{...},"P2":{...},"ADV":{...}}  或 {"LAB":{...},"LAB2":{...}}'>${esc(st.customRules)}</textarea>${rulesErr ? `<p class="bad">规则解析失败：${esc(rulesErr)}，已回退默认</p>` : ""}</section>` : ""}
    <footer class="su-foot"><button class="su-go" data-act="start">开始对局 ▶</button><span class="su-sum">${sty.name} · ${st.tier} · 每方 3 个随从 · 规则 ${({ default: "断·句默认", legacy: "旧版", real: "纯REAL", custom: "自定义" })[st.rules]}</span></footer>`;
    el.querySelector('[data-slot="deck"]')!.appendChild(deckHost);
    if (st.foe.mode === "custom") { ensureFoe(); el.querySelector('[data-slot="foe"]')!.appendChild(foeHost); }
    setCost();
    el.querySelectorAll<HTMLImageElement>("img[data-art]").forEach((im) => { const s = styleOf(im.dataset.art!); loadArt(s.artDir, s.accent, s.accent2, 0, s.glyph).then((u) => (im.src = u.idle)); });
    const ta = el.querySelector<HTMLTextAreaElement>(".su-rules");
    if (ta) ta.addEventListener("input", () => { st.customRules = ta.value; });
    if (ta) ta.addEventListener("change", () => { st.customRules = ta.value; render(); });
  };
  el.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("button"); if (!t || t.closest(".dk")) return;
    const d = t.dataset;
    if (d.style) { st.styleId = d.style; board.setDeck(presetDeck(styleOf(d.style).deckPreset), true); st.deck = board.getDeck(); }
    else if (d.foe) { st.foe.mode = d.foe as Settings["foe"]["mode"]; }
    else if (d.foepre) st.foe.preset = d.foepre;
    else if (d.tier) st.tier = d.tier;
    else if (d.first) st.first = d.first as Settings["first"];
    else if (d.rules) st.rules = d.rules as Settings["rules"];
    else if (d.act === "start") { st.deck = board.getDeck(); saveSettings(st); onStart(st); return; }
    else return;
    saveSettings(st); render();
  });
  render();
}

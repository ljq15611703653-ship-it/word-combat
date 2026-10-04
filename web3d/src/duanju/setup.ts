// 开局页：职业风格 → 卡组 → 难度 → 先后手 → 规则配置 → 开始
import { ADV, ADV_WORDS, DECK_WORDS, TIER_NAMES, configureRules, deckCost, deckOk, P2, type Deck } from "./engine/api";
import { STYLES, TIER_DESC, styleOf } from "./styles";
import { loadArt } from "./art";
import type { Settings } from "./types";

export const KW_TIP: Record<string, string> = { 首挡: "每轮第一次受到的伤害无效", 不屈: "每轮第一次被打到 0 血时留 1 血" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const presetDeck = (id: string): Deck => ({ ...(DECK_WORDS.presets.find((p) => p.id === id)?.deck ?? {}) });

export function defaultSettings(): Settings {
  return { styleId: "bing", deck: presetDeck("newbie"), tier: "普通", first: "random", rules: "default", customRules: "", kws: ["random", "random", "random"] };
}
export function loadSettings(): Settings {
  const d = defaultSettings();
  try { const j = JSON.parse(localStorage.getItem("duanju.settings") ?? "null"); if (j && typeof j === "object") return { ...d, ...j }; } catch { /* */ }
  return d;
}
export function saveSettings(s: Settings) { try { localStorage.setItem("duanju.settings", JSON.stringify(s)); } catch { /* */ } }

export function mountSetup(root: HTMLElement, st: Settings, onStart: (s: Settings) => void) {
  root.innerHTML = "";
  const el = document.createElement("div"); el.className = "dj-setup";
  root.appendChild(el);
  let rulesErr: string | null = null;
  const applyRules = () => { rulesErr = configureRules(st.rules, st.customRules); if (rulesErr) configureRules("default"); };
  const render = () => {
    applyRules();
    const ok = deckOk(st.deck);
    const cost = deckCost(st.deck), budget = P2.BUDGET;
    const sty = styleOf(st.styleId);
    el.style.setProperty("--accent", sty.accent);
    el.innerHTML = `
    <header class="su-title"><h1><span>断</span><i>·</i><span>句</span></h1><p>用句子当规则，打一局电脑</p></header>
    <section class="su-sec"><h2><b>01</b>职业风格</h2>
      <div class="su-styles">${STYLES.map((s) => `<button class="su-style${s.id === st.styleId ? " on" : ""}" data-style="${s.id}" style="--c:${s.accent};--c2:${s.accent2}"><img alt="" data-art="${s.id}" /><span class="n">${s.name}</span><span class="t">${esc(s.tag)}</span></button>`).join("")}</div>
      <p class="su-note">现在只改配色与立绘，规则暂不分职业。</p></section>
    <section class="su-sec"><h2><b>02</b>卡组 <small class="${ok ? "ok" : "bad"}">进阶词预算 ${cost} / ${budget}</small></h2>
      <div class="su-presets">${DECK_WORDS.presets.map((p) => `<button class="su-chip" data-preset="${p.id}">${esc(p.name)}</button>`).join("")}<button class="su-chip" data-act="clear">清空</button></div>
      <div class="su-words">${ADV_WORDS.map((w) => { const n = st.deck[w] ?? 0, a = ADV[w]; const info = DECK_WORDS.words.find((x) => x.name === w); return `<div class="su-w${n ? " has" : ""}" title="${esc(info?.desc ?? "")}"><span class="wn">${w}</span><span class="wp">${a.price}格</span><button data-w="${w}" data-d="-1" ${n <= 0 ? "disabled" : ""}>−</button><b>${n}</b><button data-w="${w}" data-d="1" ${n >= a.max || cost + a.price > budget ? "disabled" : ""}>＋</button><span class="wm">≤${a.max}</span></div>`; }).join("")}</div>
      <details class="su-json"><summary>粘贴卡组 JSON</summary><textarea rows="2" spellcheck="false" placeholder='{"并":2,"减伤":2}'></textarea><button class="su-chip" data-act="applyjson">应用</button> <span class="su-jerr"></span></details>
    </section>
    ${P2.KW ? `<section class="su-sec"><h2><b>03</b>关键词 <small>每个随从一个</small></h2><div class="su-kws">${[0, 1, 2].map((i) => `<div class="su-kw"><span class="kn">${sty.names[i]}${P2.POS ? `<small>${["词位", "数位", "速位"][i]}</small>` : ""}</span>${["random", "首挡", "不屈"].map((k) => `<button class="su-pill${st.kws[i] === k ? " on" : ""}" data-kw="${i}:${k}" title="${KW_TIP[k] ?? "开局随机一个"}">${k === "random" ? "随机" : k}</button>`).join("")}</div>`).join("")}</div></section>` : ""}
    <section class="su-sec"><h2><b>04</b>难度</h2>
      <div class="su-tiers">${TIER_NAMES.map((t) => `<button class="su-tier${t === st.tier ? " on" : ""}" data-tier="${t}"><span class="n">${t}</span><span class="t">${esc(TIER_DESC[t] ?? "")}</span></button>`).join("")}</div></section>
    <section class="su-sec su-two"><div><h2><b>05</b>先后手</h2>
      <div class="su-pills">${([["random", "随机"], ["me", "我先"], ["foe", "电脑先"]] as const).map(([k, l]) => `<button class="su-pill${st.first === k ? " on" : ""}" data-first="${k}">${l}</button>`).join("")}</div></div>
      <div><h2><b>06</b>规则配置</h2>
      <div class="su-pills">${([["default", "断·句默认"], ["legacy", "旧版"], ["real", "纯REAL"], ["custom", "自定义"]] as const).map(([k, l]) => `<button class="su-pill${st.rules === k ? " on" : ""}" data-rules="${k}">${l}</button>`).join("")}</div></div></section>
    ${st.rules === "custom" ? `<section class="su-sec"><textarea class="su-rules" rows="4" spellcheck="false" placeholder='{"P":{...},"P2":{...},"ADV":{...}}  或 {"LAB":{...},"LAB2":{...}}'>${esc(st.customRules)}</textarea>${rulesErr ? `<p class="bad">规则解析失败：${esc(rulesErr)}，已回退默认</p>` : ""}</section>` : ""}
    <footer class="su-foot"><button class="su-go" data-act="start" ${ok ? "" : "disabled"}>${ok ? "开始对局 ▶" : "卡组超出预算"}</button><span class="su-sum">${sty.name} · ${st.tier} · 每方 3 个随从 · 规则 ${({ default: "断·句默认", legacy: "旧版", real: "纯REAL", custom: "自定义" })[st.rules]}</span></footer>`;
    el.querySelectorAll<HTMLImageElement>("img[data-art]").forEach((im) => { const s = styleOf(im.dataset.art!); loadArt(s.artDir, s.accent, s.accent2, 0, s.glyph).then((u) => (im.src = u)); });
    const ta = el.querySelector<HTMLTextAreaElement>(".su-rules");
    if (ta) ta.addEventListener("input", () => { st.customRules = ta.value; });
    if (ta) ta.addEventListener("change", () => { st.customRules = ta.value; render(); });
  };
  el.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("button"); if (!t) return;
    const d = t.dataset;
    if (d.style) { st.styleId = d.style; st.deck = presetDeck(styleOf(d.style).deckPreset); }
    else if (d.preset) st.deck = presetDeck(d.preset);
    else if (d.w) { const n = (st.deck[d.w] ?? 0) + +d.d!; if (n > 0) st.deck[d.w] = n; else delete st.deck[d.w]; }
    else if (d.kw) { const [i, k] = d.kw.split(":"); st.kws[+i] = k; }
    else if (d.tier) st.tier = d.tier;
    else if (d.first) st.first = d.first as Settings["first"];
    else if (d.rules) st.rules = d.rules as Settings["rules"];
    else if (d.act === "clear") st.deck = {};
    else if (d.act === "applyjson") {
      const err = el.querySelector<HTMLElement>(".su-jerr")!;
      try {
        const j = JSON.parse(el.querySelector<HTMLTextAreaElement>(".su-json textarea")!.value);
        const deck: Deck = {};
        for (const [k, v] of Object.entries(j.deck ?? j)) { if (!(k in ADV)) throw new Error(`没有这个词：${k}`); if (typeof v === "number" && v > 0) deck[k] = v; }
        if (!deckOk(deck)) throw new Error(`超出预算或张数上限（${deckCost(deck)}/${P2.BUDGET}）`);
        st.deck = deck;
      } catch (x) { err.textContent = String((x as Error).message); err.className = "su-jerr bad"; return; }
    }
    else if (d.act === "start") { if (deckOk(st.deck)) { saveSettings(st); onStart(st); } return; }
    else return;
    saveSettings(st); render();
  });
  render();
}

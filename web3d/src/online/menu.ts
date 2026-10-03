// 主菜单（炉石风格）：打电脑 / 打真人。点「打真人」进入选卡组界面（我的卡组 | 预设卡组），选好点「开始匹配」。
import * as NR from "../engine/rules";
import type { DeckSpec } from "../../shared/protocol";
import type { Game } from "../game";
import type { OnlineGame } from "./netGame";
import "./online.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Settings { cls: NR.Cls; words: Record<string, number>; kws: string[]; hp: number[]; foe: NR.Cls | "随机" }
const DEFAULT: Settings = { cls: "并", words: { ...NR.PRESETS["并"].words }, kws: [...NR.PRESETS["并"].kws], hp: [NR.W.HP, NR.W.HP, NR.W.HP], foe: "随机" };
/** 旧版存的设置里生命总和是 21：和现在的 18 对不上就换回默认分配 */
const fixHp = <T extends { hp: number[] }>(s: T): T => (NR.hpProblem(s.hp, NR.W.POOL) ? { ...s, hp: [...DEFAULT.hp] } : s);
type Choice = { src: "custom" } | { src: "preset"; cls: NR.Cls };

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function btn(text: string, cls = "", on?: () => void) {
  const b = h("button", cls, text);
  if (on) b.addEventListener("click", on);
  return b;
}
const store = {
  get<T>(k: string, d: T): T { try { const s = localStorage.getItem(k); return s ? { ...d, ...JSON.parse(s) } : d; } catch { return d; } },
  raw(k: string): string { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); } catch { /* 没有存储也能用 */ } },
};

const STATIC_MSG = "网页版没有联机服务器。联机请下载「局域网联机版」：房主电脑解压后双击 start.bat，朋友在同一个局域网里用浏览器打开房主显示的地址。";

export function mountMenu(game: Game, online: OnlineGame) {
  const menu = h("div", "mn");
  const deckLayer = h("div", "gm-overlay mn-deck-layer");
  const home = btn("☰ 主菜单", "mn-home", () => show());
  deckLayer.hidden = true; menu.hidden = true; home.hidden = true;
  document.body.append(menu, deckLayer, home);

  let S: Settings = fixHp(store.get<Settings>("nc-settings", structuredClone(DEFAULT)));
  let choice: Choice = (() => { try { const c = JSON.parse(store.raw("nc-online-choice")); if (c?.src === "preset" && NR.CLASSES.includes(c.cls)) return c as Choice; } catch { /* */ } return { src: "custom" } as Choice; })();
  let tab: "custom" | "preset" = choice.src === "custom" ? "custom" : "preset";
  let nick = store.raw("nc-name");
  let note = "";

  const saveS = () => store.set("nc-settings", S);
  const saveChoice = () => store.set("nc-online-choice", choice);
  const customProblem = () => NR.deckProblem(S.words, S.kws) || NR.hpProblem(S.hp, NR.W.POOL);

  // ------------------------------------------------------------ 主菜单
  function show(msg = "") {
    deckLayer.hidden = true; home.hidden = true; menu.hidden = false;
    menu.innerHTML = "";
    const box = h("div", "mn-box");
    box.append(h("div", "mn-logo", "词 战"), h("div", "mn-sub", "用词拼句，用句子决斗"));
    const list = h("div", "mn-list");
    // 静态网页版（GitHub Pages）没有联机服务：打真人改成提示去下载局域网联机版
    const STATIC = import.meta.env.VITE_STATIC === "1";
    list.append(
      btn("打电脑", "mn-btn", () => { menu.hidden = true; game.open(); }),
      btn("打真人", "mn-btn", () => (STATIC ? show(STATIC_MSG) : showDeck())),
      btn("新手教程", "mn-btn", () => { location.href = `${import.meta.env.BASE_URL}campaign.html`; }),
      btn("原型演示台", "mn-btn small", () => { menu.hidden = true; home.hidden = false; }),
    );
    box.append(list);
    if (msg) box.append(h("div", "mn-msg", msg));
    if (msg === STATIC_MSG) {
      const a = h("a", "mn-btn small", "下载局域网联机版（zip）");
      a.setAttribute("href", `${import.meta.env.BASE_URL}lan/ci-zhan-lan.zip?v=${encodeURIComponent(import.meta.env.VITE_BUILD ?? "")}`); // 带版本号，免得浏览器拿缓存里的旧包
      a.setAttribute("download", "");
      box.append(a);
    }
    box.append(h("div", "mn-foot", (STATIC
      ? "这是网页版：打电脑、新手教程随便玩。和朋友联机请用局域网联机版（房主电脑运行，朋友用浏览器打开房主的地址）"
      : "打真人：局域网内，两个人都点「开始匹配」就自动配对开打，不用房间号") + `　·　版本 ${import.meta.env.VITE_BUILD ?? "开发版"}`));
    menu.append(box);
  }

  // ------------------------------------------------------------ 选卡组
  function showDeck() {
    S = fixHp(store.get<Settings>("nc-settings", structuredClone(DEFAULT)));
    menu.hidden = true; home.hidden = true; deckLayer.hidden = false;
    renderDeck();
  }
  function renderDeck() {
    deckLayer.innerHTML = "";
    const box = h("div", "gm-modal wide mn-deck");
    box.append(h("h2", "", "选择卡组"));
    const tabs = h("div", "mn-tabs");
    tabs.append(
      btn("我的卡组", tab === "custom" ? "on" : "", () => { tab = "custom"; choice = { src: "custom" }; saveChoice(); renderDeck(); }),
      btn("预设卡组", tab === "preset" ? "on" : "", () => { tab = "preset"; if (choice.src !== "preset") choice = { src: "preset", cls: S.cls }; saveChoice(); renderDeck(); }),
    );
    box.append(tabs);
    const body = h("div", "mn-body");
    if (tab === "custom") customBody(body); else presetBody(body);
    box.append(body);

    // 底栏：昵称、当前选择、开始匹配
    const bad = choice.src === "custom" ? customProblem() : "";
    const foot = h("div", "foot mn-foot2");
    const nameIn = h("input", "mn-name") as HTMLInputElement;
    nameIn.placeholder = "你的昵称"; nameIn.maxLength = 12; nameIn.value = nick;
    nameIn.addEventListener("input", () => { nick = nameIn.value.trim(); store.set("nc-name", nick); });
    const cur = choice.src === "custom" ? `我的卡组（${NR.CLASS_NAME[S.cls]}）` : `预设 · ${NR.CLASS_NAME[choice.cls]}`;
    foot.append(nameIn, h("span", "mn-cur", `将使用：${cur}`), h("span", "err", bad || note));
    foot.append(btn("返回", "ghost", () => show()));
    const go = btn("开始匹配 →", "primary", () => start());
    go.disabled = !!bad;
    foot.append(go);
    box.append(foot);
    deckLayer.append(box);
  }

  function presetBody(body: HTMLElement) {
    body.append(h("p", "dim", "四个现成的卡组，直接选一个就能打。想自己配的话去「我的卡组」。"));
    const row = h("div", "cls-row");
    for (const c of NR.CLASSES) {
      const on = choice.src === "preset" && choice.cls === c;
      const b = h("button", "cls" + (on ? " on" : ""));
      b.style.setProperty("--c", NR.CLASS_COLOR[c]);
      const p = NR.PRESETS[c];
      const words = NR.WORD_ORDER.filter((w) => p.words[w]).map((w) => `${w}×${p.words[w]}`).join(" ");
      b.innerHTML = `<b>${NR.CLASS_NAME[c]}</b><small>${NR.talentOf(c, true)}</small><em>成长：${NR.CLASS_GOAL[c]}（目标 ${NR.TARGET[c]}，用来解锁数字牌）</em><small>进阶词：${words}</small><small>关键词：${p.kws.join(" / ")} · 生命 ${NR.W.HP}/${NR.W.HP}/${NR.W.HP}</small>`;
      b.addEventListener("click", () => { choice = { src: "preset", cls: c }; saveChoice(); renderDeck(); });
      row.append(b);
    }
    body.append(row);
  }

  // 「我的卡组」：和本地「打电脑」的开局设置是同一份数据（localStorage: nc-settings），两边通用
  function customBody(body: HTMLElement) {
    body.append(h("p", "dim", "这就是「打电脑」里用的那套自定义卡组；在这里改了，打电脑也会跟着变。"));
    const s1 = h("section", "sec"); s1.append(h("h3", "", "1 · 流派"));
    const row = h("div", "cls-row");
    for (const c of NR.CLASSES) {
      const b = h("button", "cls" + (S.cls === c ? " on" : ""));
      b.style.setProperty("--c", NR.CLASS_COLOR[c]);
      b.innerHTML = `<b>${NR.CLASS_NAME[c]}</b><small>${NR.talentOf(c, true)}</small><em>成长：${NR.CLASS_GOAL[c]}（目标 ${NR.TARGET[c]}，用来解锁数字牌）</em>`;
      b.addEventListener("click", () => { S.cls = c; S.words = { ...NR.PRESETS[c].words }; S.kws = [...NR.PRESETS[c].kws]; saveS(); renderDeck(); });
      row.append(b);
    }
    s1.append(row);
    const total = NR.WORD_ORDER.reduce((a, w) => a + (S.words[w] ?? 0), 0);
    const s2 = h("section", "sec"); s2.append(h("h3", "", `2 · 进阶词卡组（${total}/${NR.DECK_SIZE} 张，同名最多 ${NR.COPY_MAX} 张）`));
    const grid = h("div", "deck");
    for (const w of NR.WORD_ORDER) {
      const d = NR.WORDS[w], n = S.words[w] ?? 0;
      const r = h("div", "dw");
      r.append(h("b", "", w), h("small", "", `价 ${d.price} · ${d.desc}`));
      const ctl = h("span", "ctl");
      ctl.append(btn("−", "", () => { if (n > 0) { S.words[w] = n - 1; saveS(); renderDeck(); } }), h("i", "", String(n)),
        btn("+", "", () => { if (n < NR.COPY_MAX && total < NR.DECK_SIZE) { S.words[w] = n + 1; saveS(); renderDeck(); } }));
      r.append(ctl);
      grid.append(r);
    }
    s2.append(grid, btn("用这个流派的建议卡组", "ghost", () => { S.words = { ...NR.PRESETS[S.cls].words }; S.kws = [...NR.PRESETS[S.cls].kws]; saveS(); renderDeck(); }));
    const s3 = h("section", "sec"); s3.append(h("h3", "", `3 · 每个随从的关键词和生命（总共 ${NR.W.POOL} 点，每个至少 ${NR.HP_MIN}）`));
    const g3 = h("div", "units3");
    for (let i = 0; i < 3; i++) {
      const r = h("div", "u3");
      r.append(h("b", "", `${NR.UNIT_GLYPHS[i]} ${NR.UNIT_NAMES[i]}`));
      const sel = h("select");
      for (const k of Object.keys(NR.KEYWORDS)) { const op = h("option", "", `${k}：${NR.KEYWORDS[k]}`); op.value = k; if (S.kws[i] === k) op.selected = true; sel.append(op); }
      sel.addEventListener("change", () => { S.kws[i] = sel.value; saveS(); renderDeck(); });
      const ctl = h("span", "ctl");
      const bump = (d: number) => {
        const j = (i + 1) % 3;
        if (S.hp[i] + d < NR.HP_MIN || S.hp[j] - d < NR.HP_MIN) return;
        S.hp[i] += d; S.hp[j] -= d; saveS(); renderDeck();
      };
      ctl.append(btn("−", "", () => bump(-1)), h("i", "", `${S.hp[i]} 血`), btn("+", "", () => bump(1)));
      r.append(sel, ctl);
      g3.append(r);
    }
    s3.append(g3);
    body.append(s1, s2, s3);
  }

  function spec(): DeckSpec {
    if (choice.src === "custom") return { cls: S.cls, words: { ...S.words }, kws: [...S.kws], hp: [...S.hp] };
    const d = NR.presetDeck(choice.cls, true);
    return { cls: d.cls, words: d.words, kws: d.kws, hp: d.hp };
  }
  function start() {
    if (choice.src === "custom" && customProblem()) return;
    note = "";
    deckLayer.hidden = true;
    online.findMatch(spec(), nick || "玩家" + Math.floor(100 + Math.random() * 900));
  }

  online.onCancel = (msg) => { note = msg ?? ""; showDeck(); };
  online.onLeave = (msg) => show(msg ?? "");

  if (online.hasSession) online.resume(); else show();
  return { show };
}

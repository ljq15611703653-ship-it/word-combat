// 视觉小说式对话框：底部文字框 + 左/右半身像；点击/空格推进，跳过，历史回看。
import { colorOf, isNarrator, portraitUrl } from "./portrait";

export interface Line { who: string; text: string; expr?: string; side?: "left" | "right" }
export interface DialogOpts {
  /** 共享的历史记录（跨多段对话累积） */
  history?: Line[];
  /** 「跳过剧情」：整个关卡的剧情都不看了 */
  onSkipAll?: () => void;
  /** 打字机速度倍率，0 = 立刻显示 */
  speed?: number;
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** 在 host 上播一段对话，播完（或跳过）resolve。host 里原有内容保留，对话层叠在最上面 */
export function playDialog(host: HTMLElement, lines: Line[], opts: DialogOpts = {}): Promise<void> {
  if (!lines.length) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const hist = opts.history ?? [];
    const root = document.createElement("div"); root.className = "sd-root"; root.tabIndex = 0;
    root.innerHTML = `<div class="sd-stage"><div class="sd-pt left"><img alt="" draggable="false"></div><div class="sd-pt right"><img alt="" draggable="false"></div></div>
      <div class="sd-box"><div class="sd-name"></div><div class="sd-text"></div><div class="sd-next">▼</div></div>
      <div class="sd-bar"><button data-a="log">历史</button><button data-a="skip">跳过本段</button>${opts.onSkipAll ? `<button data-a="skipall">跳过剧情</button>` : ""}</div>`;
    host.appendChild(root);
    const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    const pts = { left: $(".sd-pt.left"), right: $(".sd-pt.right") };
    const nameEl = $(".sd-name"), textEl = $(".sd-text"), box = $(".sd-box");
    let i = -1, typing = 0, full = "", done = false, logEl: HTMLElement | null = null;
    const speed = opts.speed ?? 1;
    const finish = () => { if (done) return; done = true; clearInterval(typing); document.removeEventListener("keydown", onKey, true); root.remove(); resolve(); };
    const showText = (t: string) => {
      full = t; clearInterval(typing); box.classList.remove("full");
      if (!speed) { textEl.textContent = t; box.classList.add("full"); return; }
      let n = 0; textEl.textContent = "";
      typing = window.setInterval(() => { n++; textEl.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); box.classList.add("full"); } }, 32 / speed);
    };
    const step = () => {
      if (++i >= lines.length) return finish();
      const l = lines[i]; hist.push(l);
      const narr = isNarrator(l.who), side = l.side === "left" ? "left" : "right";
      nameEl.hidden = narr; nameEl.textContent = l.who; nameEl.style.setProperty("--c", colorOf(l.who));
      box.classList.toggle("narr", narr); box.classList.toggle("paren", /^[（(]/.test(l.text));
      box.style.setProperty("--c", narr ? "#9a8bbd" : colorOf(l.who));
      box.dataset.side = side;
      for (const k of ["left", "right"] as const) pts[k].classList.toggle("on", !narr && k === side);
      if (!narr) {
        const el = pts[side]; const img = el.querySelector("img")!;
        portraitUrl(l.who.replace(/（.*）/, ""), l.expr ?? "neutral").then((u) => { if (lines[i] === l) img.src = u; });
        el.style.setProperty("--c", colorOf(l.who)); el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter");
      }
      showText(l.text);
    };
    const advance = () => {
      if (logEl) return;
      if (!box.classList.contains("full")) { clearInterval(typing); textEl.textContent = full; box.classList.add("full"); return; }
      step();
    };
    const openLog = () => {
      if (logEl) { logEl.remove(); logEl = null; return; }
      logEl = document.createElement("div"); logEl.className = "sd-log";
      logEl.innerHTML = `<div class="sd-logbox"><h3>对话历史<button data-a="closelog">✕</button></h3><div class="sd-logl">${hist.map((h) => `<p><b style="color:${colorOf(h.who)}">${esc(h.who || "旁白")}</b>${esc(h.text)}</p>`).join("")}</div></div>`;
      root.appendChild(logEl); const l = logEl.querySelector(".sd-logl")!; l.scrollTop = l.scrollHeight;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!root.isConnected) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); advance(); }
      else if (e.key === "Escape") { e.stopPropagation(); if (logEl) openLog(); else finish(); }
      else if (e.key.toLowerCase() === "h") openLog();
    };
    document.addEventListener("keydown", onKey, true);
    root.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a;
      if (a === "log" || a === "closelog") { openLog(); return; }
      if (a === "skip") { finish(); return; }
      if (a === "skipall") { opts.onSkipAll?.(); finish(); return; }
      if (logEl && !(e.target as HTMLElement).closest(".sd-logbox")) { openLog(); return; }
      advance();
    });
    step();
  });
}

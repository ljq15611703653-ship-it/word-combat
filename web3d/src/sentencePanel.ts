// 句子标注：屏幕空间的 DOM，浮在每个人物右侧的空位里，用一根引线连到人物身上
// （由 main 每帧摆放）。字不进 3D，不受透视影响。句子按「时间码 + 一行字」排版，
// 类别用文字颜色，强度用字重 / 底光 / 全息渐变，具体随从是小胶囊，数字等宽。
import { CAT_COLOR, WORDS, type Tok } from "./words";

const SIDE = { r: "#ff5a6e", b: "#2fd8ff" } as const;

export function tokEl(t: Tok, fresh: boolean): HTMLElement {
  const el = document.createElement("span");
  el.className = "w";
  if (fresh) el.classList.add("fresh");
  switch (t.k) {
    case "word": {
      const info = WORDS[t.w];
      el.textContent = t.w;
      el.style.setProperty("--c", info ? CAT_COLOR[info[0]] : "#93a8c9");
      el.dataset.tier = String(info?.[1] ?? 1);
      if (t.auto) el.classList.add("w-auto");
      break;
    }
    case "side":
      el.textContent = t.side === "r" ? "红方" : "蓝方";
      el.style.setProperty("--c", SIDE[t.side]);
      el.classList.add("w-side");
      if (t.auto) el.classList.add("w-auto");
      break;
    case "unit":
      el.textContent = t.name;
      el.style.setProperty("--c", SIDE[t.side ?? (t.name[0] === "红" ? "r" : "b")]);
      el.classList.add("w-unit");
      break;
    case "num":
      el.textContent = String(t.v);
      el.classList.add("w-num");
      break;
    case "time":
      el.textContent = "";
      break;
  }
  return el;
}

export class SentencePanel {
  readonly el: HTMLElement;
  private body: HTMLElement;
  private code: HTMLElement;
  private hpBar: HTMLElement; private hpFill: HTMLElement; private hpNum: HTMLElement; private chips: HTMLElement;
  private hpSig = "";
  private toks: Tok[] = [];
  private sec: number | null = null;

  constructor(side: "r" | "b", name: string, private emptyText: string, onClick?: () => void) {
    this.el = document.createElement("div");
    this.el.className = `ro ro-${side}`;
    this.el.innerHTML = `<i class="ro-lead"></i><div class="ro-head"><span class="ro-name">${name}</span><span class="ro-code"></span></div><div class="ro-hp" hidden><i></i><b></b></div><div class="ro-chips" hidden></div><div class="ro-body"></div>`;
    this.hpBar = this.el.querySelector(".ro-hp")!;
    this.hpFill = this.hpBar.querySelector("i")!;
    this.hpNum = this.hpBar.querySelector("b")!;
    this.chips = this.el.querySelector(".ro-chips")!;
    this.body = this.el.querySelector(".ro-body")!;
    this.code = this.el.querySelector(".ro-code")!;
    if (onClick) {
      this.el.classList.add("clickable");
      this.el.addEventListener("click", onClick);
    }
    this.render(false);
  }

  get tokens() { return this.toks; }
  get time() { return this.sec; }

  set(toks: Tok[], sec: number | null = null, animate = false) {
    this.toks = toks.filter((t) => t.k !== "time");
    this.sec = sec;
    this.render(animate);
  }

  push(t: Tok) {
    this.toks.push(t);
    this.body.querySelector(".ro-empty")?.remove();
    this.body.appendChild(tokEl(t, true));
  }

  pop() {
    this.toks.pop();
    this.render(false);
  }

  /** 头顶名牌：血条 + 状态小标（横版布局用；不调用就不显示） */
  setHp(hp: number, max: number, chips: string[] = []) {
    const sig = `${hp}/${max}|${chips.join(",")}`;
    if (sig === this.hpSig) return;
    this.hpSig = sig;
    this.hpBar.hidden = false;
    this.hpFill.style.width = `${max ? (100 * hp) / max : 0}%`;
    this.hpBar.classList.toggle("low", hp > 0 && hp / max < 0.35);
    this.hpNum.textContent = hp > 0 ? `${hp}/${max}` : "倒下";
    this.chips.hidden = !chips.length;
    this.chips.innerHTML = chips.map((c) => `<span>${c}</span>`).join("");
  }
  setName(name: string) { const e = this.el.querySelector(".ro-name"); if (e && e.textContent !== name) e.textContent = name; }
  setActive(v: boolean) { this.el.classList.toggle("active", v); }
  setFocus(v: boolean) { this.el.classList.toggle("focus", v); }
  setDead(v: boolean) { this.el.classList.toggle("dead", v); }

  private render(animate: boolean) {
    this.code.textContent = this.sec === null ? "" : `T+${String(this.sec).padStart(2, "0")}s`;
    this.body.innerHTML = "";
    if (!this.toks.length) {
      const e = document.createElement("span");
      e.className = "ro-empty";
      e.textContent = this.emptyText;
      this.body.appendChild(e);
      return;
    }
    this.toks.forEach((t, i) => {
      const el = tokEl(t, animate);
      if (animate) el.style.animationDelay = `${i * 40}ms`;
      this.body.appendChild(el);
    });
  }
}

export const sideColor = SIDE;

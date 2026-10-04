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
  private passBtn!: HTMLButtonElement;
  private passCb: (() => void) | null = null;
  private toks: Tok[] = [];
  private sec: number | null = null;
  /** 手牌条拼句：名牌就是句子条，牌可以拖出来 / 拖进来 */
  private edit = false;
  private onTok: ((i: number, e: PointerEvent) => void) | null = null;
  private slots: Set<number> | null = null;
  private hot = -1;
  private hide = -1;
  get editing() { return this.edit; }

  constructor(side: "r" | "b", name: string, private emptyText: string, onClick?: () => void) {
    this.el = document.createElement("div");
    this.el.className = `ro ro-${side}`;
    this.el.innerHTML = `<i class="ro-lead"></i><div class="ro-head"><span class="ro-name">${name}</span><span class="ro-code"></span></div><div class="ro-hp" hidden><i></i><b></b></div><div class="ro-chips" hidden></div><div class="ro-body"></div><button class="ro-pass" hidden>不出手</button>`;
    this.passBtn = this.el.querySelector(".ro-pass")!;
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

  /** 进入 / 退出「句子条」编辑状态；onTok = 按住某张牌时的回调（用来拖出去 / 换位置） */
  setEdit(on: boolean, onTok: ((i: number, e: PointerEvent) => void) | null = null) {
    this.edit = on; this.onTok = on ? onTok : null;
    if (!on) { this.slots = null; this.hot = -1; this.hide = -1; }
    this.el.classList.toggle("edit", on);
    this.render(false);
  }
  /** 拖牌时：把能放的位置显示成一个个缝；hot = 最近的那个；hide = 正在被拖的那张（先淡掉） */
  showSlots(legal: number[] | null, hot = -1, hide = -1) {
    this.slots = legal ? new Set(legal) : null; this.hot = hot; this.hide = hide;
    this.el.classList.toggle("dragon", !!legal);
    this.render(false);
  }
  /** 离屏幕坐标最近的缝（没有缝返回 -1） */
  nearestSlot(x: number, y: number): number {
    let best = -1, bd = 1e9;
    this.body.querySelectorAll<HTMLElement>(".slot").forEach((el) => {
      const r = el.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = (y - (r.top + r.height / 2)) * 1.6;
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = +el.dataset.i!; }
    });
    return best;
  }
  /** 新装上的那张闪一下 */
  flash(i: number) { const el = this.body.querySelector<HTMLElement>(`.w[data-i="${i}"]`); if (el) { el.classList.remove("fresh"); void el.offsetWidth; el.classList.add("fresh"); } }

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
  /** 「不出手」小按钮（横版：轮到我选随从时才有） */
  setPass(cb: (() => void) | null) {
    this.passCb = cb;
    this.passBtn.hidden = !cb;
    this.passBtn.onclick = (e) => { e.stopPropagation(); this.passCb?.(); };
  }
  setName(name: string) { const e = this.el.querySelector(".ro-name"); if (e && e.textContent !== name) e.textContent = name; }
  setActive(v: boolean) { this.el.classList.toggle("active", v); }
  setFocus(v: boolean) { this.el.classList.toggle("focus", v); }
  setDead(v: boolean) { this.el.classList.toggle("dead", v); }

  private render(animate: boolean) {
    this.code.textContent = this.sec === null ? "" : `T+${String(this.sec).padStart(2, "0")}s`;
    this.body.innerHTML = "";
    const slot = (i: number) => {
      if (!this.slots?.has(i)) return;
      const e = document.createElement("i");
      e.className = "slot" + (i === this.hot ? " hot" : ""); e.dataset.i = String(i);
      this.body.appendChild(e);
    };
    if (!this.toks.length) {
      if (this.edit) {
        slot(0);
        const e = document.createElement("span");
        e.className = "ro-empty";
        e.textContent = "把词牌拖到这里";
        this.body.appendChild(e);
        return;
      }
      const e = document.createElement("span");
      e.className = "ro-empty";
      e.textContent = this.emptyText;
      this.body.appendChild(e);
      return;
    }
    this.toks.forEach((t, i) => {
      slot(i);
      const el = tokEl(t, animate);
      if (animate) el.style.animationDelay = `${i * 40}ms`;
      if (this.edit) {
        el.dataset.i = String(i);
        el.classList.add("grab");
        if (i === this.hide) el.classList.add("lifted");
        el.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); this.onTok?.(i, e); });
      }
      this.body.appendChild(el);
    });
    slot(this.toks.length);
  }
}

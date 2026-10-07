// 词牌飞来飞去：结算回放的完整演出（DOM + CSS + SVG 覆盖层，没有 three.js）。
// 每个宣告句（起手秒顺序；同秒合并成一次镜头）：镜头拉近出手随从 → 句子条里的词牌被「拿起」→ 飞到盔甲壳旁，按职业的方式拼装 →
// 按动作变成刃/护盾/光点/光环…… → 命中那一刻才应用结算（血条/数字/倒下）→ 词牌飞回句子条归位 → 镜头拉回。
// 只通过 BattleView 改显示，不碰引擎状态。详见 README.md。
import { playDice } from "../dice";
import "./vfx.css";
import { unitLabel, P2, P } from "../engine/api";
import { isAdvWord } from "../composer/grammar";
import type { BattleView, CastPlayer, ReplayEvent } from "../types";



interface Pt { x: number; y: number }
interface Rc { x: number; y: number; w: number; h: number }
interface Cam { s: number; tx: number; ty: number }
interface Tok { el: HTMLElement; home: Pt; pos: Pt; w: number; h: number; text: string }
interface Seg { fire?: ReplayEvent; evs: ReplayEvent[]; sec: number }
interface Group { sec: number; segs: Seg[] }
type Frame = Record<string, string | number>;
const EFFECT = new Set(["hit", "heal", "shield", "absorb", "status", "standing"]);
const ST_COL: Record<string, string> = { 灼烧: "#ff9a3c", 易伤: "#ff5c7a", 衰弱: "#b388ff" };
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const px = (p: Pt, extra = "") => `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)${extra}`;

export type VfxMode = "normal" | "fast" | "off";
export function modeOf(speed: number): VfxMode { return speed >= 10 ? "off" : speed >= 1.5 ? "fast" : "normal"; }

export class VfxCastPlayer implements CastPlayer {
  private view!: BattleView;
  private stage!: HTMLElement;
  private camEl: HTMLElement | null = null;
  private layer!: HTMLElement;
  private cam: Cam = { s: 1, tx: 0, ty: 0 };
  private tf = 1;
  private skipS = false;
  private skipA = false;
  private anims = new Set<Animation>();
  private waiters = new Set<() => void>();
  private temps: HTMLElement[] = [];
  private lifted: HTMLElement[] = [];
  private hinted = new Set<string>();
  private machine: Tok[] = [];
  private machineSrc = -1;
  /** 给测试用：最近一次播放的统计 */
  stats = { groups: 0, sentences: 0, ms: 0 };

  skip() { this.skipS = true; this.anims.forEach((a) => { try { a.finish(); } catch { /* */ } }); [...this.waiters].forEach((f) => f()); }
  skipAll() { this.skipA = true; this.skip(); }

  // ------------------------------------------------------------ 入口
  async play(events: ReplayEvent[], view: BattleView): Promise<void> {
    this.view = view; this.stage = view.stageEl;
    const t0 = performance.now();
    this.skipS = false; this.skipA = false; this.hinted.clear();
    const mode = modeOf(view.speed());
    this.camEl = this.stage.querySelector<HTMLElement>(".cam");
    this.cam = { s: 1, tx: 0, ty: 0 }; this.applyCam();
    if (mode === "off" || !this.camEl) {
      for (const e of events) this.apply(e);
      view.clock(null);
      await new Promise((r) => setTimeout(r, mode === "off" ? 120 : 0));
      return;
    }
    this.stage.classList.add("vx-playing");
    this.layer = document.createElement("div"); this.layer.className = "vx-layer"; this.camEl.appendChild(this.layer);
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); this.skip(); } else if (e.key === "Escape") this.skipAll(); };
    const onDown = (e: Event) => { if (!(e.target as HTMLElement).closest("[data-a],.pop")) this.skip(); };
    addEventListener("keydown", onKey); this.stage.addEventListener("pointerdown", onDown);
    try {
      const groups = this.group(this.segment(events));

      this.tf = mode === "fast" ? 0.55 : 1.35;
      this.tf = Math.max(0.2, this.tf);
      this.stats = { groups: groups.length, sentences: 0, ms: 0 };
      for (const g of groups) {
        if (this.skipA) { for (const s of g.segs) { if (s.fire) this.apply(s.fire); s.evs.forEach((e) => this.apply(e)); } continue; }
        view.clock(g.sec <= P.TL ? g.sec : null);
        for (let i = 0; i < g.segs.length; i++) {
          const seg = g.segs[i];
          this.skipS = this.skipA;
          try { await this.sentence(seg, g, i); } catch (err) { console.error(err); seg.evs.forEach((e) => this.apply(e)); }
          this.cleanup(); this.stats.sentences++;
        }
        if (g.segs.some((s) => !s.fire)) await this.camTo({ s: 1, tx: 0, ty: 0 }, 260);
      }
      this.skipS = this.skipA;
      await this.camTo({ s: 1, tx: 0, ty: 0 }, 320);
    } finally {
      this.stage.classList.remove("vx-playing");
      removeEventListener("keydown", onKey); this.stage.removeEventListener("pointerdown", onDown);
      this.cleanup(); this.layer.remove();
      this.cam = { s: 1, tx: 0, ty: 0 }; this.applyCam();
      view.clock(null);
      this.stats.ms = performance.now() - t0;
    }
  }

  /** 把回放事件切成「一句话一段」：fire 开头；过热、回合末（灼烧/定时）单独成段 */
  private segment(evs: ReplayEvent[]): Seg[] {
    const out: Seg[] = []; let cur: Seg | null = null;
    for (const e of evs) {
      if (e.type === "fire") { cur = { fire: e, evs: [], sec: e.sec }; out.push(cur); continue; }
      const endish = e.sec > P.TL || e.type === "heat";
      if (!cur || (endish && cur.fire)) { cur = { evs: [], sec: e.sec }; out.push(cur); }
      cur.evs.push(e);
    }
    return out;
  }
  private group(segs: Seg[]): Group[] {
    const out: Group[] = [];
    for (const s of segs) {
      const last = out[out.length - 1];
      if (last && s.fire && last.segs[0].fire && last.sec === s.sec) last.segs.push(s); else out.push({ sec: s.sec, segs: [s] });
    }
    return out;
  }

  // ------------------------------------------------------------ 时间与动画小工具
  private T(ms: number) { return this.skipS ? 0 : ms * this.tf; }
  private wait(ms: number): Promise<void> {
    const t = this.T(ms); if (t <= 0) return Promise.resolve();
    return new Promise((res) => { const done = () => { clearTimeout(h); this.waiters.delete(done); res(); }; const h = setTimeout(done, t); this.waiters.add(done); });
  }
  private A(el: HTMLElement, kf: Frame[], ms: number, o: { delay?: number; easing?: string; keep?: boolean } = {}): Promise<void> {
    const last = kf[kf.length - 1];
    const commit = () => { if (o.keep === false) return; for (const k in last) if (k !== "offset" && k !== "easing") (el.style as any)[k] = last[k]; };
    const dur = this.T(ms);
    if (dur <= 0) { commit(); return Promise.resolve(); }
    const a = el.animate(kf as Keyframe[], { duration: dur, delay: this.T(o.delay ?? 0), easing: o.easing ?? "cubic-bezier(.3,.7,.3,1)", fill: "both" });
    this.anims.add(a);
    return a.finished.then(() => { commit(); this.anims.delete(a); a.cancel(); }, () => { this.anims.delete(a); });
  }
  private mk(cls: string, html = "", at?: Pt, parent?: HTMLElement): HTMLElement {
    const d = document.createElement("div"); d.className = cls; if (html) d.innerHTML = html;
    if (at) d.style.transform = px(at);
    (parent ?? this.layer).appendChild(d); this.temps.push(d); return d;
  }
  private cleanup() {
    this.stage.querySelectorAll(".vx-casting").forEach(el=>el.classList.remove("vx-casting"));
    this.anims.forEach((a) => { try { a.cancel(); } catch { /* */ } }); this.anims.clear();
    this.temps.forEach((t) => t.remove()); this.temps = [];
    this.lifted.forEach((t) => t.classList.remove("vx-lift")); this.lifted = [];
    for (let u = 0; u < 6; u++) this.view.unitEl(u).querySelector(".fig")?.getAnimations().forEach((a) => a.cancel());
  }

  // ------------------------------------------------------------ 镜头
  private applyCam() { if (this.camEl) this.camEl.style.transform = this.cam.s === 1 && !this.cam.tx && !this.cam.ty ? "" : `translate(${this.cam.tx.toFixed(1)}px,${this.cam.ty.toFixed(1)}px) scale(${this.cam.s.toFixed(3)})`; }
  private camTo(t: Cam, ms: number): Promise<void> {
    const dur = this.T(ms);
    if (dur <= 0 || !this.camEl) { this.cam = t; this.applyCam(); return Promise.resolve(); }
    const from = { ...this.cam }; const t0 = performance.now();
    return new Promise((res) => {
      const step = (now: number) => {
        if (this.skipS) { this.cam = t; this.applyCam(); res(); return; }
        const k = Math.min(1, (now - t0) / dur), e = ease(k);
        this.cam = { s: from.s + (t.s - from.s) * e, tx: from.tx + (t.tx - from.tx) * e, ty: from.ty + (t.ty - from.ty) * e };
        this.applyCam(); if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }
  /** 屏幕元素 → 覆盖层（镜头内）坐标 */
  private R(el: Element): Rc {
    const r = el.getBoundingClientRect(), sr = this.stage.getBoundingClientRect(), c = this.cam;
    return { x: (r.left - sr.left - c.tx) / c.s, y: (r.top - sr.top - c.ty) / c.s, w: r.width / c.s, h: r.height / c.s };
  }
  private frame(units: number[], maxZoom = 1.45): Cam {
    const W = this.stage.clientWidth, H = this.stage.clientHeight, [VT, VB] = this.visibleY(), HV = VB - VT;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const u of units) { const r = this.R(this.view.unitEl(u)); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
    const uw = Math.max(40, x1 - x0), uh = Math.max(40, y1 - y0);
    const s = Math.max(1, Math.min(maxZoom, (W * 0.88) / uw, (HV * 0.84) / uh));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return { s, tx: Math.min(0, Math.max(W - W * s, W / 2 - cx * s)), ty: Math.min(0, Math.max(H - H * s, VT + HV * 0.48 - cy * s)) };
  }
  /** 舞台里没被遮住的纵向范围 [上, 下]：手机竖屏下 HUD/操作条/小目标条盖在顶部、词牌库抽屉盖在底部，镜头要把随从框在中间（桌面是右侧栏，整高都可用） */
  private visibleY(): [number, number] {
    const H = this.stage.clientHeight, lib = this.stage.querySelector<HTMLElement>(".lib");
    const sr = this.stage.getBoundingClientRect();
    if (!lib) return [0, H];
    const r = lib.getBoundingClientRect();
    if (!(r.width > sr.width * 0.8 && r.top > sr.top)) return [0, H];
    let top = 0;
    for (const el of this.stage.querySelectorAll<HTMLElement>(".acts, .tb-goal")) { if (el.hidden) continue; const b = el.getBoundingClientRect(); if (b.width) top = Math.max(top, b.bottom - sr.top + 6); }
    const bot = this.stage.classList.contains("vx-playing") ? H : Math.max(H * 0.5, r.top - sr.top);   // 演出时抽屉收起（vfx.css）
    return [Math.min(top, bot - 120), bot];
  }

  // ------------------------------------------------------------ 取单位信息
  private styleId(u: number) { return this.view.unitEl(u).dataset.style ?? "bing"; }
  private col(u: number): [string, string] {
    const st = this.view.unitEl(u).style;
    return [st.getPropertyValue("--c").trim() || "#ff2d95", st.getPropertyValue("--c2").trim() || "#ffd23f"];
  }
  private geo(u: number) {
    const f = this.R(this.view.unitEl(u).querySelector(".fig")!);
    const w = f.w * 1.18, h = f.h * 1.02;
    return { cx: f.x + f.w / 2, cy: f.y + f.h * 0.5, w, h, rx: w / 2, ry: h / 2, fig: f };
  }
  private dir(a: number, b: number): Pt { const A = this.geo(a), B = this.geo(b); const dx = B.cx - A.cx, dy = B.cy - A.cy, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; }
  private tgtPt(u: number): Pt { const tp = this.rigPt(u, "torso"); if (tp) return tp; const g = this.geo(u); return { x: g.cx, y: g.cy - g.ry * 0.1 }; }

  // ------------------------------------------------------------ 一句话
  private effTargets(seg: Seg): number[] {
    const s = new Set<number>();
    for (const e of seg.evs) { if (e.tgt >= 0 && e.type !== "down") s.add(e.tgt); if (e.src >= 0) s.add(e.src); }
    if (seg.fire?.ptgt !== undefined) s.add(seg.fire.ptgt);
    return [...s];
  }
  private async sentence(seg: Seg, grp: Group, idx: number) {
    const f = seg.fire;
    if (!f) { await this.roundEnd(seg); return; }
    const src = f.src, sty = this.styleId(src), [c, c2] = this.col(src);
    // 1 镜头拉近（同秒合并：只在第一句动镜头，框住本秒所有出手者）
    if (idx === 0) await this.camTo(this.frame(grp.segs.map((s) => s.fire!.src)), 330);
    if (!this.view.castMoments?.(src)) this.view.flash(src, "cast");   // 有骨骼小人：cast 动作推迟到出手前（deliver），与弹道同步
    // Keep the sentence intact: only the effect currently executing leaves it.
    const targets = [...new Set([src, ...this.effTargets(seg)])];
    await this.camTo(this.frame(targets, 1.2), 300);
    const grpEl = this.mk("vx-grp");
    this.view.unitEl(src).classList.add("vx-casting");
    this.castRings(src, c);
    this.machine = await this.buildMachine(src, f.text, c);
    await this.deliver(seg, f, [], sty, c, c2, grpEl);
    await Promise.all(this.machine.map(t => this.A(t.el, [{transform:px(t.pos),opacity:1},{transform:px(t.home),opacity:0}],420)));
    this.machine = [];
    this.view.unitEl(src).classList.remove("vx-casting");
  }

  private castRings(src:number,c:string) {
    const g=this.geo(src), width=g.fig.w*1.45;
    const start={x:g.cx-width/2,y:g.fig.y+g.fig.h-14};
    for(let i=0;i<4;i++){
      const ring=this.mk("vx-rise-ring","",start);ring.style.width=`${width}px`;ring.style.height=`${Math.max(14,width*.22)}px`;ring.style.setProperty("--mc",c);
      void this.A(ring,[{transform:px(start)+" scale(.65)",opacity:0},{transform:px({x:start.x,y:start.y-18})+" scale(1)",opacity:.85,offset:.2},{transform:px({x:start.x,y:start.y-g.fig.h*.9})+" scale(.82)",opacity:0}],1400,{delay:i*220,easing:"linear"}).then(()=>ring.remove());
    }
  }
  private async buildMachine(src:number, text:string, c:string):Promise<Tok[]> {
    this.machineSrc=src;
    const real=this.view.sentenceWords?.(src) ?? [];
    // Fallback is limited to actual library words, never arbitrary text slices.
    const words=real.length?real:Array.from(this.stage.querySelectorAll<HTMLElement>(".lib .cw[data-t]")).filter(el=>el.dataset.t!=="奖励"&&text.includes(el.textContent?.replace(/×.*$/,"").trim()??"\0")).map(el=>({token:el.dataset.t!,label:el.childNodes[0]?.textContent??el.dataset.t!}));
    const panel=this.R(this.view.unitEl(src).querySelector(".decl")??this.view.unitEl(src));
    const g=this.geo(src);
    const cards:Tok[]=words.map((w,i)=>{
      const kind=/^\d+$/.test(w.token)?"num":/^@|选择|来源/.test(w.token)?"tgt":isAdvWord(w.token)?"adv":"base";
      const home={x:panel.x+Math.min(panel.w-35,(i%5)*30),y:panel.y};
      const el=this.mk(`cw vx-machine-word k-${kind}`,"",home);el.textContent=w.label;el.dataset.token=w.token;el.style.setProperty("--word-color",c);el.style.opacity="0";
      return {el,home,pos:{x:0,y:0},w:el.offsetWidth,h:el.offsetHeight,text:w.label};
    });
    const maxWidth=Math.min(300,this.stage.clientWidth-24), gap=5;
    const lines:Tok[][]=[[]];let used=0;
    for(const card of cards){if(used+card.w>maxWidth&&lines.at(-1)!.length){lines.push([]);used=0;}lines.at(-1)!.push(card);used+=card.w+gap;}
    const top=Math.max(32,g.fig.y-lines.length*32-18);
    lines.forEach((line,row)=>{const width=line.reduce((n,t)=>n+t.w,0)+gap*(line.length-1);let x=Math.max(12,Math.min(this.stage.clientWidth-width-12,g.cx-width/2));for(const card of line){card.pos={x,y:top+row*32};x+=card.w+gap;}});
    const attack=words.some(w=>w.token==="造成");
    if(attack){
      // Action card is the receiver, number is the chamber; targeting cards dock
      // below as a stabilizer. Every card moves, rather than a frame assembling.
      const center={x:Math.max(110,Math.min(this.stage.clientWidth-110,g.cx)),y:Math.max(100,g.fig.y-72)};
      const action=cards.find(t=>t.el.dataset.token==="造成");
      const number=cards.find(t=>/^\d+$/.test(t.el.dataset.token??""));
      if(action)action.pos={x:center.x-action.w*.5,y:center.y-32};
      if(number)number.pos={x:center.x-number.w*.5,y:center.y-7};
      const rest=cards.filter(t=>t!==action&&t!==number);
      rest.forEach((t,i)=>{
        const left=i%2===0, tier=Math.floor(i/2);
        t.pos={x:center.x+(left?-t.w+8: -8),y:center.y+12+tier*22};
        t.el.style.transformOrigin=left?"right center":"left center";
        t.el.dataset.wing=left?"left":"right";
        t.el.style.zIndex=String(4-tier);
      });

    }
    await Promise.all(cards.map((t,i)=>{const scatter={x:t.pos.x+(i%2?-42:42),y:t.pos.y-42-i*4};return this.A(t.el,[{transform:px(t.home)+" scale(.6)",opacity:0},{transform:px(scatter)+` rotate(${i%2?20:-20}deg)`,opacity:1,offset:.6},{transform:px(scatter)+" rotate(0deg)",opacity:1}],480,{delay:i*45});}));
    await Promise.all(cards.map((t,i)=>this.A(t.el,[{transform:t.el.style.transform,opacity:1},{transform:px(t.pos)+` rotate(${t.el.dataset.wing==="left"?-12:t.el.dataset.wing==="right"?12:0}deg) scale(1.12)`,opacity:1,offset:.85},{transform:px(t.pos)+` rotate(${t.el.dataset.wing==="left"?-12:t.el.dataset.wing==="right"?12:0}deg)`,opacity:1}],220,{delay:i*90,easing:"cubic-bezier(.6,0,.8,1)"}).then(()=>{this.sparks({x:t.pos.x+t.w,y:t.pos.y+t.h/2},c,4,"sq");})));
    await this.wait(350);
    return cards;
  }

  /** 演出期间壳的脉动：花纹绕中心缓慢转动，整体一呼一吸 + 描边明暗（只在演出时存在，随演出清理；关闭档/跳过时不加） */
  pulseShell(shell: HTMLElement, g: ReturnType<VfxCastPlayer["geo"]>) {
    if (this.T(1000) <= 0) return;
    const svg = shell.querySelector<SVGElement>(".vx-shell-svg"), pat = shell.querySelector<SVGElement>(".vx-pat");
    if (pat) {
      (pat.style as any).transformOrigin = `${g.w / 2}px ${g.h / 2}px`;
      this.anims.add(pat.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: this.T(9000), iterations: Infinity }));
    }
    if (svg) {
      svg.style.transformOrigin = "50% 55%";
      this.anims.add(svg.animate([{ transform: "scale(1)", filter: "brightness(1) drop-shadow(0 0 6px currentColor)" }, { transform: "scale(1.035)", filter: "brightness(1.5) drop-shadow(0 0 14px currentColor)" }, { transform: "scale(1)", filter: "brightness(1) drop-shadow(0 0 6px currentColor)" }], { duration: this.T(900), iterations: Infinity, easing: "ease-in-out" }));
    }
  }

  /** 词牌飞回句子条，壳收起 */
  async returnHome(toks: Tok[], shell: HTMLElement, g: ReturnType<VfxCastPlayer["geo"]>, grpEl: HTMLElement) {
    void g;
    for (const t of toks) t.el.classList.remove("fired");
    const sty = toks.length ? toks[0].el.className.match(/s-(\w+)/)?.[1] ?? "bing" : "bing";
    void this.A(shell, [{ opacity: 1 }, { opacity: 0 }], 260);
    await Promise.all(toks.map((t, i) => { const from = t.pos; t.pos = { ...t.home }; return this.A(t.el, [{ transform: px(from) + " scale(1.05)" }, { transform: px({ x: (from.x + t.home.x) / 2, y: Math.min(from.y, t.home.y) - 12 }) + " scale(1.1)", offset: 0.5 }, { transform: px(t.home) + " scale(1)" }], 300, { delay: i * 25, easing: "cubic-bezier(.4,0,.2,1)" }); }));
    void sty; void grpEl;
    await Promise.all(toks.map((t) => this.A(t.el, [{ opacity: 1 }, { opacity: 0 }], 90)));
  }

  // ---- 词牌：从随从面板的句子条里拿起
  private tokenize(text: string): string[] {
    const names = [0, 1, 2, 3, 4, 5].map((u) => unitLabel(u)).sort((a, b) => b.length - a.length);
    const out: string[] = []; let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (/\s/.test(ch)) { i++; continue; }
      const nm = names.find((n) => text.startsWith(n, i));
      let tk: string;
      if (nm) tk = nm;
      else if (/\d/.test(ch)) { tk = /^\d+/.exec(text.slice(i))![0]; }
      else if (ch === "「") { const j = text.indexOf("」", i); tk = text.slice(i, j < 0 ? i + 4 : j + 1); }
      else if (/[，。；、]/.test(ch)) { i++; continue; }
      else { let j = i + 1; while (j < text.length && j - i < 2 && !/[\s\d「，。；、]/.test(text[j]) && !names.some((n) => text.startsWith(n, j))) j++; tk = text.slice(i, j); }
      out.push(tk); i += tk.length;
    }
    if (out.length > 9) { const keep = out.slice(0, 8); keep.push(out.slice(8).join("")); return keep; }
    return out;
  }
  pickup(u: number, text: string, sty: string): Tok[] {
    const unit = this.view.unitEl(u);
    const tx = unit.querySelector<HTMLElement>(".decl .tx");
    const panel = this.R(unit.querySelector(".panel") ?? unit);
    const words = this.tokenize(text);
    const homes: Pt[] = []; let usedRange = false;
    const node = tx?.firstChild;
    if (tx && node && node.nodeType === 3 && (node as Text).data === text) {
      let idx = 0; const rg = document.createRange();
      for (const w of words) {
        const at = text.indexOf(w, idx); if (at < 0) { usedRange = false; break; }
        rg.setStart(node, at); rg.setEnd(node, at + w.length); idx = at + w.length;
        const r = rg.getBoundingClientRect(), sr = this.stage.getBoundingClientRect();
        homes.push({ x: (r.left - sr.left - this.cam.tx) / this.cam.s, y: (r.top - sr.top - this.cam.ty) / this.cam.s - 1 }); usedRange = true;
      }
      if (homes.length !== words.length) usedRange = false;
    }
    if (!usedRange) { homes.length = 0; words.forEach((_, i) => homes.push({ x: panel.x + 10 + i * 28, y: panel.y + panel.h * 0.62 })); }
    if (tx) { tx.classList.add("vx-lift"); this.lifted.push(tx); }
    return words.map((w, i) => {
      const el = this.mk(`vx-tok s-${sty}`, "", homes[i]); el.textContent = w;
      return { el, home: homes[i], pos: { ...homes[i] }, w: el.offsetWidth, h: el.offsetHeight, text: w };
    });
  }
  slots(toks: Tok[], g: ReturnType<VfxCastPlayer["geo"]>, u: number): Pt[] {
    const W = this.stage.clientWidth, c = this.cam, vx0 = -c.tx / c.s + 8, vx1 = (W - c.tx) / c.s - 8;   // 镜头里看得见的横向范围
    const maxRow = Math.min(Math.max(g.w * 1.25, 150), vx1 - vx0), gap = 12;
    const rows: Tok[][] = [[]]; let rw = 0;
    for (const t of toks) { if (rw + t.w > maxRow && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(t); rw += t.w + gap; }
    const rh = 30;
    // 词牌行放在头顶上方(盔甲壳穹顶顶部)，不盖住施法随从的脸；头顶没位置(贴近舞台顶)再退回壳内
    const above = g.fig.y - rows.length * rh - 4, top = above >= 4 ? above : g.cy - g.ry * 0.5 - (rows.length * rh) / 2 + 2, off = (u < 3 ? 1 : -1) * g.w * 0.28;
    const out = new Map<Tok, Pt>();
    rows.forEach((row, ri) => {
      const tw = row.reduce((a, t) => a + t.w, 0) + gap * (row.length - 1); let x = Math.max(vx0, Math.min(vx1 - tw, g.cx + off - tw / 2));
      for (const t of row) { out.set(t, { x, y: top + ri * rh }); x += t.w + gap; }
    });
    return toks.map((t) => out.get(t)!);
  }
  flyTo(t: Tok, to: Pt, ms: number, delay: number, sty: string, c: string, parent?: HTMLElement): Promise<void> {
    const from = t.pos; t.pos = { ...to };
    if (parent && t.el.parentElement !== parent) parent.appendChild(t.el);
    const mid: Pt = { x: (from.x + to.x) / 2 + (sty === "zhuang" ? 0 : rnd(-18, 18)), y: Math.min(from.y, to.y) - (sty === "bing" ? 8 : 34) };
    if (sty === "yin") for (let k = 1; k <= 3; k++) {
      const gh = this.mk(`vx-tok ghost s-${sty}`, "", from, parent); gh.textContent = t.text;
      void this.A(gh, [{ transform: px(from), opacity: 0 }, { transform: px(mid), opacity: 0.45 / k, offset: 0.5 }, { transform: px(to), opacity: 0 }], ms, { delay: delay + k * 55 }).then(() => gh.remove());
    }
    return this.A(t.el, [{ transform: px(from) + " scale(1)" }, { transform: px(mid) + " scale(1.2) rotate(-4deg)", offset: 0.55 }, { transform: px(to) + " scale(1.08)" }], ms, { delay, easing: sty === "bing" ? "cubic-bezier(.5,0,.2,1.3)" : "cubic-bezier(.3,.7,.3,1)" }).then(() => {
      if (sty === "bing") this.sparks({ x: to.x + t.w / 2, y: to.y + t.h / 2 }, c, 4, "sq");
      if (sty === "zhuang") this.drip({ x: to.x + t.w / 2, y: to.y + t.h }, c);
    });
  }

  // ---- 四种职业的拼装
  async assemble(sty: string, toks: Tok[], g: ReturnType<VfxCastPlayer["geo"]>, grp: HTMLElement, c: string, c2: string, kinds: string[]) {
    if (!toks.length) return;
    const rowY = toks.map((t) => t.pos.y);
    if (sty === "bing") {
      // 机械拼装：逐块咔哒吸到一起，接缝处火花，最后一道扫光
      const byRow = new Map<number, Tok[]>(); toks.forEach((t, i) => { const k = rowY[i]; byRow.set(k, [...(byRow.get(k) ?? []), t]); });
      const ps: Promise<void>[] = [];
      for (const row of byRow.values()) {
        const tw = row.reduce((a, t) => a + t.w, 0) + 2 * (row.length - 1); const rc = (row[0].pos.x + row[row.length - 1].pos.x + row[row.length - 1].w) / 2; let x = rc - tw / 2; let k = 0;
        for (const t of row) {
          const to = { x, y: t.pos.y }; x += t.w + 2;
          const from = t.pos; t.pos = to;
          ps.push(this.A(t.el, [{ transform: px(from) + " scale(1.08)" }, { transform: px({ x: to.x, y: to.y - 5 }) + " scale(1.12)", offset: 0.5 }, { transform: px(to) + " scale(1)" }], 200, { delay: k++ * 70, easing: "cubic-bezier(.6,0,.3,1.4)" }).then(() => { t.el.classList.add("snap"); this.sparks({ x: to.x, y: to.y + t.h / 2 }, c2, 4, "sq"); }));
        }
      }
      await Promise.all(ps);
      const b = this.mk("vx-scan", "", { x: g.cx - g.w * 0.7, y: g.cy - g.h * 0.45 }, grp); b.style.height = `${g.h * 0.9}px`;
      await this.A(b, [{ opacity: 0.9, transform: px({ x: g.cx - g.w * 0.7, y: g.cy - g.h * 0.45 }) }, { opacity: 0, transform: px({ x: g.cx + g.w * 0.7, y: g.cy - g.h * 0.45 }) }], 240, { easing: "linear" });
    } else if (sty === "yin") {
      // 调取：一条数据线从词牌依次串过，词牌依次亮起；引用句再抽出数字
      const pts = toks.map((t) => ({ x: t.pos.x + t.w / 2, y: t.pos.y + t.h / 2 }));
      const ln = this.mk("vx-link", "", { x: 0, y: 0 }, grp);
      ln.innerHTML = `<svg width="${this.stage.clientWidth * 2}" height="${this.stage.clientHeight * 2}" style="overflow:visible"><polyline points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="4 4"/></svg>`;
      void this.A(ln, [{ opacity: 0 }, { opacity: 1 }], 160);
      for (const t of toks) { t.el.classList.add("lit"); await this.wait(45); }
      if (kinds.includes("quote")) await this.quoteCue(toks, g, grp, c2);
      else await this.wait(120);
    } else if (sty === "xian") {
      // 锁链：链条缠过词牌，锁扣「咔」一声合上
      const pts = toks.map((t) => ({ x: t.pos.x + t.w / 2, y: t.pos.y + t.h / 2 }));
      const ln = this.mk("vx-link chain", "", { x: 0, y: 0 }, grp);
      ln.innerHTML = `<svg width="${this.stage.clientWidth * 2}" height="${this.stage.clientHeight * 2}" style="overflow:visible"><polyline points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${c2}" stroke-width="3.5" stroke-dasharray="9 5" stroke-linecap="round"/></svg>`;
      await this.A(ln, [{ opacity: 0, clipPath: "inset(0 100% 0 0)" }, { opacity: 1, clipPath: "inset(0 0% 0 0)" }], 260, { easing: "linear" });
      const last = pts[pts.length - 1];
      const lock = this.mk("vx-lock", `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="${c2}" stroke-width="2.4"/><rect x="5" y="11" width="14" height="10" fill="${c}" stroke="#fff" stroke-width="1.4"/></svg>`, { x: last.x + toks[toks.length - 1].w / 2 + 2, y: last.y - 14 }, grp);
      await this.A(lock, [{ opacity: 0, transform: px({ x: last.x + 40, y: last.y - 40 }) + " scale(2)" }, { opacity: 1, transform: px({ x: last.x + toks[toks.length - 1].w / 2 + 2, y: last.y - 14 }) + " scale(1)" }], 170, { easing: "cubic-bezier(.5,0,.3,1.5)" });
      toks.forEach((t) => t.el.classList.add("locked")); this.sparks({ x: last.x + toks[toks.length - 1].w / 2 + 14, y: last.y }, c, 5, "x");
      await this.wait(90);
    } else {
      // 状态流：渗透——词牌糊开再析出，壳面蚀出裂纹
      await Promise.all(toks.map((t, i) => this.A(t.el, [{ transform: px(t.pos) + " scale(1.08)", filter: "blur(3px)" }, { transform: px(t.pos) + " scale(1.0)", filter: "blur(0px)" }], 320, { delay: i * 40 })));
      await this.wait(60);
    }
  }

  // ---- 前置演出（按动作种类）
  async cues(seg: Seg, f: ReplayEvent, toks: Tok[], g: ReturnType<VfxCastPlayer["geo"]>, sty: string, c: string, c2: string) {
    const kinds = f.kinds ?? [];
    const hasEffect = seg.evs.some((e) => EFFECT.has(e.type));
    const ps: Promise<void>[] = [];
    if (kinds.includes("redirect")) ps.push(this.reflectCue(g, c2));
    if (kinds.includes("postpone") && f.ptgt !== undefined) ps.push(this.postponeCue(f.ptgt, f.pn ?? 1, f.start ?? 0, c));
    if (kinds.includes("strip")) ps.push(this.stripCue(f.src, c));
    if (kinds.includes("delay")) ps.push(this.chargeCue(g, c, c2, true));
    if (kinds.includes("cash")) ps.push(this.chargeCue(g, c, c2, false));
    if (kinds.includes("cond") || kinds.includes("forbid")) this.view.float(f.src, hasEffect || kinds.includes("forbid") ? "条件成立" : "条件不成立", hasEffect ? "info" : "status");
    else if (!hasEffect && !kinds.some((k) => ["redirect", "postpone", "strip", "delay", "cash", "nullify", "standing"].includes(k))) this.view.float(f.src, "没有效果", "info");
    await Promise.all(ps);
    void toks; void sty;
  }
  private reflectCue(g: ReturnType<VfxCastPlayer["geo"]>, c2: string): Promise<void> {
    const r = Math.max(34, g.rx * 0.62);
    const e = this.mk("vx-reflect", `<svg viewBox="-50 -50 100 100" width="${r * 2}" height="${r * 2}"><path d="M-34,-8 A36,36 0 0 1 24,-26" fill="none" stroke="${c2}" stroke-width="5" stroke-linecap="round"/><path d="M34,8 A36,36 0 0 1 -24,26" fill="none" stroke="${c2}" stroke-width="5" stroke-linecap="round"/><path d="M14,-34 L30,-22 L12,-14Z" fill="${c2}"/><path d="M-14,34 L-30,22 L-12,14Z" fill="${c2}"/></svg>`, { x: g.cx - r, y: g.cy - r });
    return this.A(e, [{ opacity: 0, transform: px({ x: g.cx - r, y: g.cy - r }) + " scale(.5) rotate(-90deg)" }, { opacity: 1, transform: px({ x: g.cx - r, y: g.cy - r }) + " scale(1) rotate(0)", offset: 0.5 }, { opacity: 0.0, transform: px({ x: g.cx - r, y: g.cy - r }) + " scale(1.15) rotate(40deg)" }], 520);
  }
  private chargeCue(g: ReturnType<VfxCastPlayer["geo"]>, c: string, c2: string, hold: boolean): Promise<void> {
    const r = 18, at = { x: g.cx - r, y: g.cy - r };
    const o = this.mk("vx-orb"); o.style.setProperty("--oc", c); o.style.setProperty("--oc2", c2);
    return this.A(o, hold
      ? [{ opacity: 0, transform: px(at) + " scale(.3)" }, { opacity: 1, transform: px(at) + " scale(1.2)", offset: 0.6 }, { opacity: 0.6, transform: px(at) + " scale(.7)" }]
      : [{ opacity: 0, transform: px(at) + " scale(.6)" }, { opacity: 1, transform: px(at) + " scale(1.6)", offset: 0.5 }, { opacity: 0, transform: px(at) + " scale(4.2)" }], hold ? 520 : 460);
  }
  private async postponeCue(tu: number, n: number, start: number, c: string) {
    const unit = this.view.unitEl(tu), tx = unit.querySelector<HTMLElement>(".decl .tx");
    const g = this.geo(tu);
    const r = tx ? this.R(tx) : { x: g.cx - 40, y: g.cy, w: 80, h: 18 };
    const text = tx?.textContent || "…";
    const el = this.mk("vx-tok victim", "", { x: r.x, y: r.y }); el.textContent = text.length > 14 ? text.slice(0, 13) + "…" : text;
    if (tx) { tx.classList.add("vx-lift"); this.lifted.push(tx); }
    const shatter = start + n > P.TL;
    const arrow = this.mk("vx-pushtag", `+${n}秒 ›››`, { x: r.x, y: r.y - 20 }); arrow.style.color = c;
    const dx = 46 + n * 14;
    await this.A(el, [{ transform: px({ x: r.x, y: r.y }) }, { transform: px({ x: r.x + dx, y: r.y }), offset: 0.7 }, { transform: px({ x: r.x + dx * (shatter ? 1.4 : 1), y: r.y }) }], 420, { easing: "cubic-bezier(.5,0,.2,1)" });
    if (shatter) {
      this.sparks({ x: r.x + dx + 20, y: r.y + 8 }, "#fff", 9, "sq");
      await this.A(el, [{ opacity: 1, transform: px({ x: r.x + dx * 1.4, y: r.y }) }, { opacity: 0, transform: px({ x: r.x + dx * 1.4 + 14, y: r.y + 24 }) + " rotate(14deg)" }], 220);
      this.view.float(tu, "被推出时间轴", "status");
    } else await this.wait(120);
  }
  private async stripCue(from: number, c: string) {
    const foes = [3, 4, 5].filter((u) => !this.view.unitEl(u).classList.contains("dead")); if (from >= 3) foes.splice(0, foes.length, 0, 1, 2);
    const tgt = foes.find((u) => this.view.getDisplay(u).sh > 0) ?? foes[0]; if (tgt === undefined) return;
    const g = this.geo(tgt);
    const tiles: Promise<void>[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, at = { x: g.cx + Math.cos(a) * g.rx * 0.7 - 7, y: g.cy + Math.sin(a) * g.ry * 0.7 - 7 };
      const t = this.mk("vx-hex", "", at); t.style.background = c;
      tiles.push(this.A(t, [{ opacity: 0.9, transform: px(at) }, { opacity: 0, transform: px({ x: at.x + Math.cos(a) * 26, y: at.y + Math.sin(a) * 26 + 22 }) + " rotate(120deg) scale(.5)" }], 520, { delay: i * 25 }));
    }
    this.view.float(tgt, "被拆除", "status");
    await Promise.all(tiles);
  }
  private async quoteCue(toks: Tok[], g: ReturnType<VfxCastPlayer["geo"]>, grp: HTMLElement, c2: string) {
    const numTok = toks.find((t) => /^\d/.test(t.text)) ?? toks[toks.length - 1];
    const y = numTok.pos.y - 2, ps: Promise<void>[] = [];
    for (let i = 0; i < 6; i++) {
      const chip = this.mk("vx-ghostnum", String(1 + ((i * 5) % 7)), undefined, grp);
      const from = { x: g.cx - g.w * 0.9 - i * 20, y: y + rnd(-6, 6) }, to = { x: numTok.pos.x, y };
      ps.push(this.A(chip, [{ opacity: 0, transform: px(from) }, { opacity: 0.8, transform: px({ x: (from.x + to.x) / 2, y }), offset: 0.5 }, { opacity: 0, transform: px(to) + " scale(.5)" }], 380, { delay: i * 50, easing: "linear" }));
    }
    await Promise.all(ps);
    numTok.el.classList.add("pulse"); this.sparks({ x: numTok.pos.x + numTok.w / 2, y: y + 10 }, c2, 6, "bit");
    await this.wait(80);
  }

  // ------------------------------------------------------------ 打出去
  private async deliver(seg: Seg, f: ReplayEvent, toks: Tok[], sty: string, c: string, c2: string, grpEl: HTMLElement) {
    const evs = [...seg.evs]; const src = f.src;
    // Engine logs the remaining damage before its absorb record. Present the
    // incoming attack and interception first, without changing final values.
    for (let i = 0; i + 1 < evs.length; i++) {
      const a = evs[i], b = evs[i + 1];
      if (a.type === "hit" && b.type === "absorb" && a.src === b.src && a.tgt === b.tgt) { evs[i] = b; evs[i + 1] = a; i++; }
    }
    if (!evs.length) { this.view.float(src,"没有生效","info"); await this.wait(300); return; }
    const lungeDir = evs.find((e) => e.type === "hit" && e.tgt >= 0 && e.tgt !== src);
    if (lungeDir) this.lunge(src, lungeDir.tgt, grpEl);
    // 触发提示：别的随从的长期句亮起
    const trig = new Set<number>();
    for (const e of evs) if (e.src >= 0 && e.src !== src && EFFECT.has(e.type) && e.type !== "standing") trig.add(e.src);
    for (const u of trig) this.trigCue(u);
    if (trig.size) await this.wait(280);
    toks.forEach((t) => t.el.classList.add("fired"));
    await this.handCast(src, sty, c, c2);
    // Follow trace order. No cascade of overlapping animations hiding results.
    let blocked = "";
    for (const e of evs) {
      const key = `${e.src}:${e.tgt}`;
      if (e.type === "cue") { await this.effectCard(e,f,e.text,c); } else if (e.type === "absorb" && e.src >= 0) {
        const next = evs[evs.indexOf(e) + 1];
        const remaining = next?.type === "hit" && next.src === e.src && next.tgt === e.tgt ? next.amount : 0;
        await this.effectCard({...e, amount:e.amount + remaining}, f, "造成", c);
        blocked = key;
        await this.domeFlash(e.tgt);
      } else if (e.type === "hit" && blocked === key) {
        blocked = ""; // The incoming attack was already shown at the shield.
      } else if (["hit", "heal", "shield", "status", "standing"].includes(e.type)) {
        if (e.src >= 0) await this.effectCard(e, f, e.type === "hit" ? "造成" : e.type === "heal" ? "恢复" : e.type === "shield" ? "减伤" : e.type === "status" ? e.text : "长期", c);
        else await this.wait(220);
      }
      this.apply(e);
      this.after(e, sty, c);
      await this.wait(e.type === "down" ? 400 : 180);
    }
  }
  private async morphMachine(kind:string,src:number,c:string){
    const g=this.geo(src), center={x:Math.max(120,Math.min(this.stage.clientWidth-120,g.cx)),y:Math.max(95,g.fig.y-58)};
    const count=Math.max(1,this.machine.length);
    await Promise.all(this.machine.map((t,i)=>{
      const from={...t.pos};let x=0,y=0,rotation=0;
      if(["hit","absorb","reflect","pierce"].includes(kind)){const wing=i%2?-1:1;x=wing*Math.min(55,i*13)-t.w/2;y=-24+Math.floor(i/2)*21;rotation=i<2?0:wing*12;}
      else if(kind==="shield"){const a=(i/(Math.max(1,count-1))-.5)*Math.PI*.85;x=Math.sin(a)*70-t.w/2;y=-Math.cos(a)*32;rotation=a*15;}
      else if(kind==="heal"||kind==="cleanse"){const pts=[[0,-29],[-44,0],[0,0],[44,0],[0,29]];[x,y]=pts[i%5];x-=t.w/2;y+=Math.floor(i/5)*24;}
      else if(["strip","remove"].includes(kind)){x=(i%2?36:-36)-t.w/2;y=Math.floor(i/2)*24-25;rotation=i%2?-15:15;}
      else if(["postpone","quote"].includes(kind)){x=(i%3-1)*34-t.w/2;y=Math.floor(i/3)*24+(i%3)*9-28;}
      else {const a=i/count*Math.PI*2-Math.PI/2;x=Math.cos(a)*48-t.w/2;y=Math.sin(a)*31;rotation=Math.cos(a)*10;}
      t.pos={x:center.x+x,y:center.y+y};t.el.style.setProperty("--word-color",c);
      return this.A(t.el,[{transform:px(from)},{transform:px({x:t.pos.x,y:t.pos.y-8})+` rotate(${rotation}deg) scale(1.08)`,offset:.8},{transform:px(t.pos)+` rotate(${rotation}deg)`}],360,{delay:i*25});
    }));
    this.sparks(center,c,5,"sq");await this.wait(150);
  }
  private async logicEffect(e:ReplayEvent,src:number,origin:Pt,target:Pt,c:string){
    const kind=e.effect??"watch";
    const labels:Record<string,string>={redirect:"转移",reflect:"反弹",postpone:"延后",strip:"移除",remove:"移除",cleanse:"净化",cash:"兑现",quote:"引用",condition:e.amount?"成立":"不成立",assertion:e.amount?"成立":"否则",pierce:"无视",nullify:"阻断",forbid:"不得",watch:"每当",delay:"定时",assert:"断言",ignore:"无视"};
    const visual=this.mk(`vx-logic-effect fx-${kind}`,"",{x:target.x-40,y:target.y-30});visual.textContent=labels[kind]??kind;visual.style.setProperty("--mc",c);
    if(kind==="postpone"){
      const tx=this.view.unitEl(e.tgt).querySelector<HTMLElement>(".decl");if(tx)await this.A(tx,[{transform:"translateX(0)"},{transform:"translateX(20px)",opacity:.45},{transform:"translateX(0)",opacity:1}],650);
      visual.textContent=e.end!==undefined&&e.end>P.TL?"移出时间轴":`延后 +${e.amount}秒`;
    }
    if(["strip","remove","cleanse"].includes(kind))this.sparks(target,c,12,"sq");
    if(kind==="reflect"||kind==="redirect")await this.reflectCue(this.geo(e.tgt>=0?e.tgt:src),c);
    if(kind==="quote"){visual.textContent=`引用 → ${e.amount}`;for(let i=0;i<3;i++){const bit=this.mk("vx-ghostnum",String(Math.max(0,e.amount-i)),{x:origin.x-55-i*22,y:origin.y-25});await this.A(bit,[{transform:px({x:origin.x-55-i*22,y:origin.y-25}),opacity:0},{transform:px(origin),opacity:1}],180);bit.remove();}}
    await this.A(visual,[{transform:px({x:target.x-40,y:target.y-30})+" scale(.6)",opacity:0},{transform:px({x:target.x-40,y:target.y-30}),opacity:1,offset:.3},{transform:px({x:target.x-40,y:target.y-45}),opacity:0}],750);
    visual.remove();
  }
  private async effectCard(e: ReplayEvent, f: ReplayEvent, word: string, c: string) {
    const src=e.src>=0?e.src:f.src;
    const kind=e.effect??(e.type==="status"?e.text:e.type);
    c=this.col(src)[0];
    if(this.machineSrc!==src||!this.machine.length){await Promise.all(this.machine.map(t=>this.A(t.el,[{opacity:1},{opacity:0}],180)));this.machine=await this.buildMachine(src,f.text,c);this.castRings(src,c);}

    await this.morphMachine(kind,src,c);

    const module=this.machine.filter(t=>t.text.includes(word));
    const number=this.machine.find(t=>/^\d+$/.test(t.text));
    const core=module[0]??this.machine[0];
    const origin=core?{x:core.pos.x+core.w/2,y:core.pos.y+core.h/2}:this.anchorPt(src,e.tgt>=0?e.tgt:src);
    const target=e.tgt>=0?this.tgtPt(e.tgt):this.tgtPt(src);
    module.forEach(t=>t.el.classList.add("vx-module-active"));
    const col=c;
    const charge=this.mk("vx-machine-charge","",{x:origin.x-32,y:origin.y-32});charge.style.setProperty("--mc",col);
    await this.A(charge,[{transform:px({x:origin.x-32,y:origin.y-32})+" scale(.4) rotate(-45deg)",opacity:0},{transform:px({x:origin.x-32,y:origin.y-32})+" scale(1) rotate(0deg)",opacity:1}],450);
    if(["hit","absorb"].includes(e.type)){
      const rail=this.mk("vx-machine-rail","",{x:origin.x,y:origin.y});const dx=target.x-origin.x,dy=target.y-origin.y;rail.style.width=`${Math.hypot(dx,dy)}px`;rail.style.transform=px(origin)+` rotate(${Math.atan2(dy,dx)}rad)`;rail.style.setProperty("--mc",col);
      const shot=number?.el??this.mk("cw k-num vx-machine-shot","",origin);
      shot.classList.add("vx-launched");
      const launchFrom=number?{...number.pos}:origin;
      shot.style.setProperty("--word-color",col);
      if(!number)shot.textContent=String(e.amount);
      const to={x:target.x-shot.offsetWidth/2,y:target.y-shot.offsetHeight/2};
      // Mask only the corresponding numeric substring, leaving the rest readable.
      const tx=this.view.unitEl(src).querySelector<HTMLElement>(".decl .tx");
      const original=tx?.textContent??"";
      if(tx&&number){const node=document.createTextNode(original),at=original.indexOf(number.text);if(at>=0){tx.replaceChildren(document.createTextNode(original.slice(0,at)));const mask=document.createElement("span");mask.className="vx-number-away";mask.textContent=number.text;tx.append(mask,document.createTextNode(original.slice(at+number.text.length)));}else tx.replaceChildren(node);}

      if(number)number.el.classList.add("vx-module-active");
      const angle=Math.atan2(dy,dx);
      const flash=this.mk("vx-muzzle","",{x:origin.x-25,y:origin.y-25});flash.style.setProperty("--mc",col);
      void this.A(flash,[{transform:px({x:origin.x-25,y:origin.y-25})+" scale(.3)",opacity:1},{transform:px({x:origin.x-25,y:origin.y-25})+" scale(1.7)",opacity:0}],320);
      for(const t of this.machine.filter(t=>t!==number))void this.A(t.el,[{transform:px(t.pos)},{transform:px({x:t.pos.x-Math.cos(angle)*10,y:t.pos.y-Math.sin(angle)*10}),offset:.3},{transform:px(t.pos)}],350);
      for(let k=0;k<4;k++){const trail=this.mk("vx-attack-trail","",origin);trail.style.setProperty("--mc",col);void this.A(trail,[{transform:px(origin)+` rotate(${angle}rad)`,opacity:.8},{transform:px(target)+` rotate(${angle}rad)`,opacity:0}],700,{delay:k*45});}

      await this.A(shot,[{transform:px(launchFrom)+" scale(1)",opacity:1},{transform:px(to)+" scale(1.25)",opacity:1}],700,{easing:"cubic-bezier(.5,0,.7,1)"});
      this.sparks(target,col,18,"sq");const burst=this.mk("vx-muzzle vx-hit-burst","",{x:target.x-30,y:target.y-30});burst.style.setProperty("--mc",col);void this.A(burst,[{transform:px({x:target.x-30,y:target.y-30})+" scale(.3)",opacity:1},{transform:px({x:target.x-30,y:target.y-30})+" scale(2)",opacity:0}],400);await this.A(shot,[{transform:px(to)+" scale(1.25)",opacity:1},{transform:px(to)+" scale(1.8)",opacity:0}],240);if(number){await this.A(shot,[{transform:px(to),opacity:0},{transform:px(number.pos),opacity:1}],260);}else shot.remove();
      shot.classList.remove("vx-launched");
      if(tx)tx.textContent=original;
      rail.remove();
    }else if(e.type==="shield"){
      // Plates fan out from the assembled shield module and dock around the ally.
      await Promise.all([-1,0,1].map((i)=>{const plate=this.mk("vx-shield-plate","",origin);plate.style.setProperty("--mc",col);const to={x:target.x+i*27-12,y:target.y-38};return this.A(plate,[{transform:px(origin)+" scale(.3)",opacity:0},{transform:px(to),opacity:1}],700).then(()=>plate.remove());}));
    }else if(e.type==="heal"){
      const cross=this.mk("vx-repair-cross","+",origin);cross.style.setProperty("--mc",col);await this.A(cross,[{transform:px(origin),opacity:1},{transform:px({x:target.x-20,y:target.y-20})+" rotate(90deg)",opacity:1}],700);this.sparks(target,col,10,"plus");cross.remove();
    }else if(e.type==="cue"||e.type==="standing"){
      await this.logicEffect(e,src,origin,target,col);
    }else if(e.type==="status"){
      const stamp=this.mk("vx-state-stamp","",origin);stamp.textContent=e.text;stamp.style.setProperty("--mc",col);await this.A(stamp,[{transform:px(origin)+" scale(.5)",opacity:0},{transform:px({x:target.x-30,y:target.y-18}),opacity:1}],700);stamp.remove();
    }else await this.wait(350);
    charge.remove();module.forEach(t=>t.el.classList.remove("vx-module-active"));number?.el.classList.remove("vx-module-active");
  }
  /** 骨骼小人 cast：动作与光效一起开始，蓄力 → 在「出手帧」才继续（弹道从手腕发出）。没有骨骼小人时立即返回 */
  private async handCast(src: number, sty: string, c: string, c2: string) {
    const mm = this.view.castMoments?.(src);
    if (!mm || this.skipS) return;
    this.view.flash(src, "cast");
    (globalThis as any).__vfxLog?.push({ ev: "cast", t: performance.now(), src, release: mm.release });
    const h0 = this.rigPt(src, "hand", true);
    if (h0) {
      const r = 18, at = { x: h0.x - r, y: h0.y - r }, o = this.mk("vx-orb"); o.style.setProperty("--oc", c); o.style.setProperty("--oc2", c2);
      void this.A(o, [{ opacity: 0, transform: px(at) + " scale(.2)" }, { opacity: 1, transform: px(at) + " scale(.9)", offset: 0.7 }, { opacity: 0, transform: px(at) + " scale(1.5)" }], mm.release * 1000 / this.tf * 1.05).then(() => o.remove());
    }
    await this.waitReal(mm.release * 1000);
    const h = this.rigPt(src, "hand", true);
    if (h) this.sparks(h, c, 6, sty === "bing" ? "sq" : sty === "yin" ? "bit" : sty === "xian" ? "x" : "blob");
  }
  private waitReal(ms: number): Promise<void> {
    if (this.skipS || ms <= 0) return Promise.resolve();
    return new Promise((res) => { const done = () => { clearTimeout(h); this.waiters.delete(done); res(); }; const h = setTimeout(done, ms); this.waiters.add(done); });
  }
  /** 骨骼小人锚点 → 覆盖层（镜头内）坐标；没有骨骼小人返回 null */
  private rigPt(u: number, which: "hand" | "torso" | "head", atRelease = false): Pt | null {
    const p = this.view.anchor?.(u, which, atRelease); if (!p) return null;
    const sr = this.stage.getBoundingClientRect(), c = this.cam;
    return { x: (p.x - sr.left - c.tx) / c.s, y: (p.y - sr.top - c.ty) / c.s };
  }
  private lunge(u: number, to: number, grpEl: HTMLElement) {
    const d = this.dir(u, to), mv = { x: d.x * 16, y: d.y * 6 };
    const fig = this.view.unitEl(u).querySelector<HTMLElement>(".fig")!;
    const kf = [{ transform: "translate(0,0)" }, { transform: `translate(${mv.x}px,${mv.y}px)`, offset: 0.35 }, { transform: "translate(0,0)" }] as Keyframe[];
    if (this.skipS) return;
    const d1 = this.T(300); fig.animate(kf, { duration: d1, easing: "ease-out" }); grpEl.animate(kf, { duration: d1, easing: "ease-out" });
  }
  private trigCue(u: number) {
    const unit = this.view.unitEl(u);
    unit.querySelectorAll(".stand .sl").forEach((s) => { s.classList.remove("vx-trig"); void (s as HTMLElement).offsetWidth; s.classList.add("vx-trig"); });
    const g = this.geo(u), t = this.mk("vx-tok trig", "触发", { x: g.cx - 18, y: g.cy - g.ry - 4 });
    void this.A(t, [{ opacity: 0, transform: px({ x: g.cx - 18, y: g.cy - g.ry + 6 }) }, { opacity: 1, transform: px({ x: g.cx - 18, y: g.cy - g.ry - 10 }), offset: 0.3 }, { opacity: 0, transform: px({ x: g.cx - 18, y: g.cy - g.ry - 18 }) }], 600);
  }

  /** 事件的「飞行」部分：返回时刻 = 命中时刻 */
  async launch(e: ReplayEvent, sty: string, [c, c2]: string[], toks: Tok[], f: ReplayEvent): Promise<void> {
    const src = e.src;
    switch (e.type) {
      case "hit": {
        if (src < 0) { await this.wait(160); return; }                        // 过热/灼烧：没有出手者
        if (src === e.tgt) { await this.reflectHit(e.tgt, c2); return; }
        await this.projectile(src, e.tgt, sty, c, c2, (f.kinds ?? []).includes("nullify") && src === f.src); return;
      }
      case "heal": await this.motes(src < 0 ? e.tgt : src, e.tgt, "#5eead4"); return;
      case "shield": await this.motes(src < 0 ? e.tgt : src, e.tgt, "#00e5ff", true); return;
      case "status": await this.seed(src < 0 ? e.tgt : src, e.tgt, ST_COL[e.text] ?? c, c2); return;
      case "standing": await this.pin(src, toks, c, c2); return;
      case "absorb": await this.domeFlash(e.tgt); return;
      case "down": await this.wait(80); return;
      case "heat": await this.wait(120); return;
      default: await this.wait(60);
    }
  }
  /** 落点：命中数字、飘字、特效 */
  private apply(e: ReplayEvent) {
    const v = this.view;
    switch (e.type) {
      case "cue": v.float(e.tgt>=0?e.tgt:e.src, e.text, "info"); if(["strip","remove","cleanse"].includes(e.effect??"")) this.view.unitEl(e.tgt).querySelectorAll(".vx-resident").forEach(x=>{const k=(x as HTMLElement).dataset.kind??"";if(e.effect==="cleanse"?["灼烧","易伤","衰弱"].includes(k):e.effect==="strip"?["shield","redirect","standing"].includes(k):k==="standing")x.remove();}); if(e.effect==="strip") {const d=v.getDisplay(e.tgt);v.setDisplay(e.tgt,d.hp,0);} if(e.effect==="redirect")this.marker(e.tgt,"redirect","转移"); break;
      case "fire": break;
      case "standing": v.float(e.src, e.text, "info"); this.marker(e.src, "standing", ({delay:"定时",assert:"断言",forbid:"不得",watch:"每当",ignore:"无视"} as Record<string,string>)[e.effect??""]??"长期"); break;
      case "shield": { const d = v.getDisplay(e.tgt); v.setDisplay(e.tgt, d.hp, d.sh + e.amount); v.float(e.tgt, e.text, "shield"); v.flash(e.tgt, "shield"); this.marker(e.tgt, "shield", "减伤"); break; }
      case "absorb": {
        const d = v.getDisplay(e.tgt); v.setDisplay(e.tgt, d.hp, P2.MITHIT ? d.sh : Math.max(0, d.sh - e.amount)); v.float(e.tgt, e.text, "shield");
        this.hint(e.tgt, "首挡"); break;
      }
      case "hit": {
        (globalThis as any).__vfxLog?.push({ ev: "hit", t: performance.now(), tgt: e.tgt });
        const d = v.getDisplay(e.tgt); const hp = Math.max(0, d.hp - e.amount); v.setDisplay(e.tgt, hp, d.sh); v.float(e.tgt, e.text, "hit"); v.flash(e.tgt, "hit");
        if (hp === 1) this.hint(e.tgt, "不屈"); break;
      }
      case "heal": { const d = v.getDisplay(e.tgt); v.setDisplay(e.tgt, d.hp + e.amount, d.sh); v.float(e.tgt, e.text, "heal"); v.flash(e.tgt, "heal"); break; }
      case "status": v.float(e.tgt, e.text, "status"); this.marker(e.tgt, e.text, e.text); break;
      case "heat": v.banner("过热", `每个随从 −${e.amount}`); break;
      case "down": this.view.unitEl(e.tgt).querySelectorAll(".vx-resident").forEach(x=>x.remove()); v.markDown(e.tgt); v.float(e.tgt, "倒下", "info"); break;
      case "dice": void playDice(v, e, (ms) => this.wait(ms)); break;
    }
  }
  private marker(u:number, kind:string, text:string) {
    const host=this.view.unitEl(u);
    let el=Array.from(host.querySelectorAll<HTMLElement>(".vx-resident")).find(x=>x.dataset.kind===kind);
    if(!el){el=document.createElement("div");el.className="vx-resident";el.dataset.kind=kind;host.appendChild(el);}
    el.textContent=text;el.style.setProperty("--resident-color",this.col(u)[0]);
  }
  /** 首挡 / 不屈 触发提示（根据面板上关键词标签是否已用判断，每个随从每轮只提示一次） */
  private hint(u: number, kw: string) {
    const chip = this.view.unitEl(u).querySelector(".chips em.kw");
    if (!chip || chip.textContent !== kw || !chip.classList.contains("used")) return;
    const key = `${u}:${kw}`; if (this.hinted.has(key)) return; this.hinted.add(key);
    this.view.float(u, kw + "触发", "info");
  }
  private after(e: ReplayEvent, sty: string, c: string) {
    if (this.skipS) return;
    if (e.type === "hit" && e.tgt >= 0) this.impact(this.tgtPt(e.tgt), sty, c);
    if (e.type === "status") this.aura(e.tgt, e.text);

    if (e.type === "heal") this.sparks(this.tgtPt(e.tgt), "#5eead4", 6, "plus");
    if (e.type === "down") this.sparks(this.tgtPt(e.tgt), "#fff", 10, "sq");
  }

  // ---- 弹道
  private anchorPt(u: number, toward: number): Pt {
    const hp = this.rigPt(u, "hand", true); if (hp) return hp;
    const g = this.geo(u), d = this.dir(u, toward);
    return { x: g.cx + d.x * g.rx * 0.9, y: g.cy + d.y * g.ry * 0.5 - g.ry * 0.1 };
  }
  private async projectile(src: number, tgt: number, sty: string, c: string, c2: string, pierce: boolean) {
    const a = this.anchorPt(src, tgt), b = this.tgtPt(tgt);
    (globalThis as any).__vfxLog?.push({ ev: "launch", t: performance.now(), src, tgt, a, live: this.rigPt(src, "hand"), b });
    if ((globalThis as any).__vfxMark) for (const [p, col] of [[a, "#f00"], [b, "#0f0"]] as [Pt, string][]) { const m = this.mk("vx-mark", "", { x: p.x - 4, y: p.y - 4 }); m.style.cssText += `;width:8px;height:8px;border-radius:50%;background:${col};z-index:99;position:absolute;left:0;top:0`; }
    const ang = Math.atan2(b.y - a.y, b.x - a.x), dist = Math.hypot(b.x - a.x, b.y - a.y);
    const ms = Math.max(230, Math.min(420, dist * 0.45));
    if (sty === "bing") {
      const bl = this.mk("vx-blade"); if (pierce) bl.classList.add("needle");
      bl.style.setProperty("--c", c); bl.style.setProperty("--c2", c2);
      await this.A(bl, [{ opacity: 1, transform: px({ x: a.x - 27, y: a.y - 5 }) + ` rotate(${ang}rad)` }, { opacity: 1, transform: px({ x: b.x - 27, y: b.y - 5 }) + ` rotate(${ang}rad)` }], ms, { easing: "cubic-bezier(.6,0,.9,.5)" });
      bl.remove();
    } else if (sty === "yin") {
      const mid = { x: (a.x + b.x) / 2 - Math.sin(ang) * 40, y: (a.y + b.y) / 2 + Math.cos(ang) * 40 };
      const ps: Promise<void>[] = [];
      for (let k = 0; k < 6; k++) {
        const d = this.mk("vx-bit"); d.style.setProperty("--c", k ? c : "#fff"); d.style.opacity = "0";
        ps.push(this.A(d, [{ opacity: 0, transform: px({ x: a.x - 5, y: a.y - 5 }) + " scale(1)" }, { opacity: 1 - k * 0.14, transform: px({ x: mid.x - 5, y: mid.y - 5 }) + ` scale(${1 - k * 0.1})`, offset: 0.5 }, { opacity: 0, transform: px({ x: b.x - 5, y: b.y - 5 }) + " scale(.8)" }], ms, { delay: k * 32, easing: "cubic-bezier(.4,0,.5,1)" }));
      }
      await Promise.all(ps);
    } else if (sty === "xian") {
      const ch = this.mk("vx-whip", "", { x: a.x, y: a.y - 2 }); ch.style.width = `${dist}px`; ch.style.setProperty("--c", c2);
      const sp = this.mk("vx-spike"); sp.style.setProperty("--c", c);
      const base = px({ x: a.x, y: a.y - 2 }, ` rotate(${ang}rad)`);
      void this.A(ch, [{ opacity: 1, transform: base + " scaleX(0)" }, { opacity: 1, transform: base + " scaleX(1)", offset: 0.85 }, { opacity: 0, transform: base + " scaleX(1)" }], ms * 1.6, { easing: "linear", keep: false }).then(() => ch.remove());
      await this.A(sp, [{ transform: px({ x: a.x - 6, y: a.y - 8 }, ` rotate(${ang}rad)`) }, { transform: px({ x: b.x - 6, y: b.y - 8 }, ` rotate(${ang}rad)`) }], ms * 0.85, { easing: "cubic-bezier(.5,0,.8,.6)" });
      sp.remove();
    } else {
      const mid = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 60 };
      const gl = this.mk("vx-glob"); gl.style.setProperty("--c", c); gl.style.setProperty("--c2", c2);
      void (async () => { await this.wait(ms * 0.3); this.drip({ x: (a.x + mid.x) / 2, y: (a.y + mid.y) / 2 }, c); await this.wait(ms * 0.3); this.drip({ x: (mid.x + b.x) / 2, y: mid.y + 16 }, c2); })();
      await this.A(gl, [{ transform: px({ x: a.x - 9, y: a.y - 9 }) + " scale(.8)" }, { transform: px({ x: mid.x - 9, y: mid.y - 9 }) + " scale(1.1)", offset: 0.5 }, { transform: px({ x: b.x - 9, y: b.y - 9 }) + " scale(1.2,.8)" }], ms * 1.15, { easing: "cubic-bezier(.35,0,.65,1)" });
      gl.remove();
    }
  }
  private async reflectHit(u: number, c2: string) {
    const g = this.geo(u);
    const r = this.mk("vx-ring"); r.style.borderColor = c2; r.style.setProperty("--sz", `${g.rx * 1.7}px`);
    await this.A(r, [{ opacity: 1, transform: px({ x: g.cx - g.rx * 0.85, y: g.cy - g.rx * 0.85 }) + " scale(1.2)" }, { opacity: 0, transform: px({ x: g.cx - g.rx * 0.85, y: g.cy - g.rx * 0.85 }) + " scale(.35)" }], 260);
  }
  private async motes(src: number, tgt: number, col: string, hex = false) {
    const a = this.tgtPt(src), b = this.tgtPt(tgt), ps: Promise<void>[] = [];
    for (let i = 0; i < 6; i++) {
      const m = this.mk(hex ? "vx-hex" : "vx-mote"); m.style.background = col; m.style.opacity = "0";
      const mid = { x: (a.x + b.x) / 2 + rnd(-30, 30), y: Math.min(a.y, b.y) - rnd(10, 50) };
      ps.push(this.A(m, [{ opacity: 0, transform: px({ x: a.x + rnd(-14, 14), y: a.y + rnd(-10, 10) }) + " scale(.6)" }, { opacity: 1, transform: px(mid) + " scale(1)", offset: 0.5 }, { opacity: 0.9, transform: px({ x: b.x + rnd(-8, 8), y: b.y + rnd(-14, 4) }) + " scale(.7)" }], 360, { delay: i * 40, easing: "cubic-bezier(.4,0,.4,1)" }).then(() => m.remove()));
    }
    await Promise.all(ps);
  }
  private async seed(src: number, tgt: number, col: string, c2: string) {
    if (src === tgt) { await this.wait(100); return; }
    const a = this.anchorPt(src, tgt), b = this.tgtPt(tgt);
    const d = this.mk("vx-bit"); d.style.setProperty("--c", col); d.style.boxShadow = `0 0 10px ${col}`; void c2;
    await this.A(d, [{ transform: px({ x: a.x - 5, y: a.y - 5 }) + " scale(1.4)" }, { transform: px({ x: b.x - 5, y: b.y - 5 }) + " scale(1)" }], 300, { easing: "cubic-bezier(.4,0,.8,.6)" });
    d.remove();
  }
  private async pin(u: number, toks: Tok[], c: string, c2: string) {
    toks.forEach((t) => t.el.classList.add("pulse"));
    const g = this.geo(u); this.sparks({ x: g.cx, y: g.cy - g.ry * 0.6 }, c2, 6, "x");
    this.view.unitEl(u).querySelectorAll(".stand .sl").forEach((s) => { s.classList.remove("vx-trig"); void (s as HTMLElement).offsetWidth; s.classList.add("vx-trig"); });
    void c; await this.wait(260);
  }
  private async domeFlash(u: number) { this.dome(u, "#00e5ff", true); await this.wait(150); }

  // ---- 命中特效
  private impact(p: Pt, sty: string, c: string) {
    const r = this.mk("vx-ring"); r.style.borderColor = c; r.style.setProperty("--sz", "60px");
    void this.A(r, [{ opacity: 1, transform: px({ x: p.x - 30, y: p.y - 30 }) + " scale(.2)" }, { opacity: 0, transform: px({ x: p.x - 30, y: p.y - 30 }) + " scale(1.5)" }], 320).then(() => r.remove());
    this.sparks(p, c, sty === "zhuang" ? 6 : 8, sty === "bing" ? "sq" : sty === "yin" ? "bit" : sty === "xian" ? "x" : "blob");
  }
  private sparks(p: Pt, col: string, n: number, shape: string) {
    if (this.skipS) return;
    for (let i = 0; i < n; i++) {
      const s = this.mk(`vx-sp ${shape}`); s.style.setProperty("--c", col);
      if (shape === "x") s.textContent = "✕"; if (shape === "plus") s.textContent = "+"; if (shape === "bit") s.textContent = Math.random() < 0.5 ? "0" : "1";
      const a = rnd(0, Math.PI * 2), d = rnd(14, 38);
      const from = { x: p.x - 4, y: p.y - 4 }, to = { x: p.x - 4 + Math.cos(a) * d, y: p.y - 4 + Math.sin(a) * d + (shape === "blob" ? 12 : shape === "plus" ? -22 : 0) };
      void this.A(s, [{ opacity: 1, transform: px(from) + " scale(1)" }, { opacity: 0, transform: px(to) + ` scale(.3) rotate(${rnd(-90, 90)}deg)` }], 380, { easing: "ease-out" }).then(() => s.remove());
    }
  }
  private drip(p: Pt, col: string) {
    if (this.skipS) return;
    const d = this.mk("vx-drop"); d.style.setProperty("--c", col);
    void this.A(d, [{ opacity: 0.9, transform: px({ x: p.x - 3, y: p.y - 3 }) }, { opacity: 0, transform: px({ x: p.x - 3, y: p.y + 22 }) + " scaleY(1.6)" }], 420, { easing: "ease-in" }).then(() => d.remove());
  }
  private dome(u: number, col: string, flicker = false) {
    const g = this.geo(u), d = this.mk("vx-dome"); d.style.setProperty("--c", col);
    d.style.width = `${g.w * 0.95}px`; d.style.height = `${g.h * 0.95}px`;
    const at = { x: g.cx - g.w * 0.475, y: g.cy - g.h * 0.475 };
    void this.A(d, flicker
      ? [{ opacity: 0.9, transform: px(at) + " scale(1.0)" }, { opacity: 0.2, transform: px(at) + " scale(1.0)", offset: 0.4 }, { opacity: 0.8, transform: px(at) + " scale(1.03)", offset: 0.6 }, { opacity: 0, transform: px(at) + " scale(.96)" }]
      : [{ opacity: 0, transform: px({ x: at.x, y: at.y + g.h * 0.2 }) + " scale(.7)" }, { opacity: 0.9, transform: px(at) + " scale(1.0)", offset: 0.35 }, { opacity: 0, transform: px(at) + " scale(1.02)" }], flicker ? 380 : 620).then(() => d.remove());
  }
  private aura(u: number, kind: string) {
    const g = this.geo(u), col = ST_COL[kind] ?? "#ffd23f";
    if (kind === "灼烧") for (let i = 0; i < 9; i++) {
      const s = this.mk("vx-sp blob"); s.style.setProperty("--c", i % 2 ? "#ffd23f" : col);
      const x = g.cx + rnd(-g.rx * 0.5, g.rx * 0.5), y = g.cy + g.ry * 0.5;
      void this.A(s, [{ opacity: 0, transform: px({ x, y }) }, { opacity: 1, transform: px({ x: x + rnd(-8, 8), y: y - 30 }), offset: 0.3 }, { opacity: 0, transform: px({ x: x + rnd(-14, 14), y: y - g.h * 0.7 }) + " scale(.3)" }], 700, { delay: i * 50, easing: "ease-out" }).then(() => s.remove());
    } else if (kind === "易伤") {
      const e = this.mk("vx-crack", `<svg viewBox="0 0 100 100" width="${g.w * 0.8}" height="${g.h * 0.8}"><path d="M50,0 L44,22 L58,38 L40,58 L56,76 L48,100 M44,22 L22,30 M58,38 L82,34 M40,58 L18,72 M56,76 L80,86" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/></svg>`);
      const at = { x: g.cx - g.w * 0.4, y: g.cy - g.h * 0.4 };
      void this.A(e, [{ opacity: 0, transform: px(at) + " scale(1.2)" }, { opacity: 1, transform: px(at) + " scale(1)", offset: 0.15 }, { opacity: 0, transform: px(at) + " scale(1)" }], 800).then(() => e.remove());
    } else for (let i = 0; i < 3; i++) {
      const s = this.mk("vx-pushtag", "﹀"); s.style.color = col; s.style.fontSize = "26px";
      const x = g.cx - 12 + (i - 1) * 22, y = g.cy - g.ry * 0.8;
      void this.A(s, [{ opacity: 0, transform: px({ x, y }) }, { opacity: 1, transform: px({ x, y: y + 30 }), offset: 0.4 }, { opacity: 0, transform: px({ x, y: y + g.h * 0.55 }) }], 760, { delay: i * 110 }).then(() => s.remove());
    }
  }

  // ------------------------------------------------------------ 回合末（灼烧 / 定时到期）
  private async roundEnd(seg: Seg) {
    const heat = seg.evs.find((e) => e.type === "heat");
    if (heat) { this.view.clock(null); const f = this.mk("vx-heat"); void this.A(f, [{ opacity: 0.0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], 700, { easing: "linear" }).then(() => f.remove()); }
    const burns = [...new Set(seg.evs.filter((e) => e.type === "hit" && e.src < 0 && !heat).map((e) => e.tgt))];
    await this.camTo({ s: 1, tx: 0, ty: 0 }, 200);
    if (burns.length && !heat) { burns.forEach((u) => this.aura(u, "灼烧")); await this.wait(240); }
    for(const e of seg.evs){
      if(e.src>=0&&["hit","heal","shield","status","standing","cue"].includes(e.type))await this.effectCard(e,e,e.type==="hit"?"造成":e.type==="heal"?"恢复":e.type==="shield"?"减伤":e.text,this.col(e.src)[0]);
      else await this.wait(200);
      this.apply(e);this.after(e,e.src>=0?this.styleId(e.src):"bing",e.src>=0?this.col(e.src)[0]:"#ff5c7a");
    }
    await this.wait(150);
  }
}

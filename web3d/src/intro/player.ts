// 开场演出播放器：Canvas2D 画面 + DOM 的 HUD / 字幕 / 进度。入口见 index.ts 的 playIntro。
import "./intro.css";
import { SHOTS, TOTAL, type Shot } from "./script";
import { SCENES, buildEnv, W, H, type Env } from "./scenes";
import { playBgm, stopBgm, playSfx, stopAll } from "./audio";
import { createHudFrame, hudLockBox, canvasGlitch, type LockBox } from "../ui/hud";

const TAIL = 0.9; // 结束后黑场淡出

export interface IntroOptions {
  /** 从第几秒开始（调试/截图用） */
  start?: number;
  /** 暂停在 start 处不走时间（截图用） */
  paused?: boolean;
  /** 拿到控制句柄（调试/截图用） */
  onControl?: (c: IntroControl) => void;
  /** 黑客立绘地址；null = 不用立绘。默认 BASE_URL + portraits/hacker.png */
  portraitUrl?: string | null;
}
export interface IntroControl { seek(t: number): void; pause(p: boolean): void; time(): number; skipShot(): void; skipAll(): void }

const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement) => { const e = document.createElement(tag); e.className = cls; parent?.append(e); return e; };

export async function runIntro(container: HTMLElement, o: IntroOptions = {}): Promise<void> {
  const root = el("div", "intro-root");
  if (container === document.body || container.clientHeight < 100) root.style.position = "fixed"; // 容器没有高度时铺满整个窗口
  else if (getComputedStyle(container).position === "static") container.style.position = "relative";
  const stage = el("div", "intro-stage", root);
  const canvas = el("canvas", "intro-canvas", stage); const ctx = canvas.getContext("2d")!;
  const hud = createHudFrame(stage, { reticle: true, tl: ["WC-LENS 2.0", '<span class="ok">● 在线</span>'], tr: [""], bl: [""], br: [""] });
  hud.el.classList.add("intro-hud");
  const lockLayer = el("div", "intro-locks", stage);
  const title = el("div", "intro-title", stage);
  const sub = el("div", "intro-sub", stage); const subWho = el("span", "intro-who", sub); const subText = el("span", "intro-text", sub);
  const prog = el("div", "intro-prog", stage); const segs = SHOTS.map((s) => { const sg = el("i", "", prog); sg.style.flexGrow = String(s.dur); const f = el("u", "", sg); return f; });
  const skip = el("button", "intro-skip", stage); skip.textContent = "跳过 ▸▸  Esc"; skip.type = "button";
  const hint = el("div", "intro-hint", stage); hint.textContent = "点击 / 空格：下一幕　·　Esc：跳过全部";
  const fade = el("div", "intro-fade", stage);
  const loading = el("div", "intro-loading", root); loading.textContent = "LOADING…";
  container.append(root);

  // 舞台按 16:9 适配容器
  let pxScale = 1;
  const fit = () => {
    const cw = root.clientWidth || window.innerWidth, ch = root.clientHeight || window.innerHeight;
    const w = Math.floor(Math.min(cw, (ch * 16) / 9)), h = Math.floor((w * 9) / 16);
    stage.style.width = `${w}px`; stage.style.height = `${h}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cwpx = Math.min(Math.round(w * dpr), 1920);
    if (canvas.width !== cwpx) { canvas.width = cwpx; canvas.height = Math.round((cwpx * 9) / 16); }
    pxScale = canvas.width / W;
    stage.style.fontSize = `${Math.max(10, w / 1280 * 16)}px`; // 所有 HUD/字幕用 em，随舞台缩放
  };
  fit();
  const ro = new ResizeObserver(fit); ro.observe(root);

  try { await Promise.race([document.fonts.load('700 30px "Noto Sans SC"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* 字体可缺 */ }
  const portraitUrl = o.portraitUrl === undefined ? `${import.meta.env.BASE_URL}portraits/hacker.png` : o.portraitUrl;
  const env: Env = await buildEnv(portraitUrl);
  loading.remove();

  const locks: LockBox[] = [];
  let T = Math.max(0, Math.min(TOTAL, o.start ?? 0));
  let paused = !!o.paused, done = false, shotIdx = -1, lastGlitch = 0, subKey = "", titleKey = "", hudClock = -1;
  const fired = new Set<string>();

  const shotAt = (t: number): [number, number] => { let a = 0; for (let i = 0; i < SHOTS.length; i++) { if (t < a + SHOTS[i].dur || i === SHOTS.length - 1) return [i, Math.min(t - a, SHOTS[i].dur)]; a += SHOTS[i].dur; } return [0, 0]; };
  const shotStart = (i: number) => SHOTS.slice(0, i).reduce((a, s) => a + s.dur, 0);

  const enterShot = (i: number, silent: boolean) => {
    shotIdx = i; const s: Shot = SHOTS[i];
    locks.forEach((l) => l.hide());
    if (!silent) { if (s.bgm !== undefined) { if (s.bgm) playBgm(s.bgm); else stopBgm(); } }
    hud.setReadout("tr", [`模式 <b>${s.mode}</b>`, ""]);
    const sg = prog.children;
    for (let k = 0; k < sg.length; k++) sg[k].classList.toggle("cur", k === i);
  };

  const finish = () => {
    if (done) return; done = true;
    stopAll(); ro.disconnect(); window.removeEventListener("keydown", onKey, true); cancelAnimationFrame(raf); root.remove();
    resolveFn();
  };
  let resolveFn: () => void = () => {};
  const promise = new Promise<void>((r) => { resolveFn = r; });

  const skipShot = () => { const [i] = shotAt(T); if (i >= SHOTS.length - 1) T = TOTAL; else T = shotStart(i + 1); };
  const skipAll = () => { T = TOTAL + TAIL; };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); skipAll(); }
    else if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); skipShot(); }
  };
  window.addEventListener("keydown", onKey, true);
  stage.addEventListener("click", (e) => { if (e.target === skip) return; skipShot(); });
  root.addEventListener("click", (e) => { if (e.target === root) skipShot(); });
  skip.addEventListener("click", (e) => { e.stopPropagation(); skipAll(); });
  o.onControl?.({ seek: (t) => { T = Math.max(0, Math.min(TOTAL + TAIL, t)); fired.clear(); shotIdx = -1; }, pause: (p) => { paused = p; }, time: () => T, skipShot, skipAll });

  const draw = (t: number) => {
    const [i, ts] = shotAt(Math.min(t, TOTAL));
    const s = SHOTS[i];
    if (i !== shotIdx) { enterShot(i, false); }
    ctx.setTransform(pxScale, 0, 0, pxScale, 0, 0);
    const out = SCENES[s.scene](ctx, ts, s.dur, env);
    if (out.cut) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
    canvasGlitch(ctx, out.glitch, t);
    if (out.glitch > 0.45 && t - lastGlitch > 0.5) { lastGlitch = t; hud.glitch(); }
    // 音频触发
    s.sfx?.forEach((x, k) => { const key = `${i}:${k}`; if (ts >= x.at && !fired.has(key)) { fired.add(key); if (!paused) playSfx(x.id); } });
    // 字幕与标题
    let subL = null as null | { who?: string; text: string; age: number }, titleL = null as null | string;
    for (const l of s.lines) if (ts >= l.at && ts < l.at + l.dur) { if (l.kind === "title") titleL = l.text; else subL = { who: l.who, text: l.text, age: ts - l.at }; }
    const sk = subL ? `${i}${subL.who}${subL.text}` : "";
    if (sk !== subKey) {
      subKey = sk;
      if (subL) { subWho.textContent = subL.who ?? ""; subWho.style.display = subL.who ? "" : "none"; subText.textContent = subL.text; sub.classList.remove("show"); void sub.offsetWidth; sub.classList.add("show"); }
      else sub.classList.remove("show");
    }
    const tk = titleL ? `${i}${titleL}` : "";
    if (tk !== titleKey) { titleKey = tk; if (titleL) { title.textContent = titleL; title.classList.remove("show"); void title.offsetWidth; title.classList.add("show"); } else title.classList.remove("show"); }
    // 锁定框
    const ls = s.locks ?? [];
    while (locks.length < ls.length) locks.push(hudLockBox(lockLayer));
    locks.forEach((b, j) => {
      const l = ls[j]; if (l && ts >= l.at && ts < l.at + l.dur) b.show((l.x / W) * 100, (l.y / H) * 100, (l.w / W) * 100, (l.h / H) * 100, l.label, l.info, l.color); else b.hide();
    });
    // HUD：启动后才显示；读数 4Hz 刷新
    hud.el.style.opacity = i === 0 && ts < 3.2 ? "0" : "1";
    const sec = Math.floor(t * 4);
    if (sec !== hudClock) {
      hudClock = sec;
      hud.setReadout("tr", [`模式 <b>${s.mode}</b>`, `<b>${mmss(t)}</b> / ${mmss(TOTAL)}`]);
      hud.setReadout("bl", [`电量 ▮▮▮▮▯ <b>${87 - Math.floor(t / 20)}%</b>`, `信号 夜城-7 <span class="ok">▂▄▆█</span>`]);
      hud.setReadout("br", [`坐标 <b>31.2304N 121.4737E</b>`, `镜头 <b>${String(i + 1).padStart(2, "0")}</b> / ${String(SHOTS.length).padStart(2, "0")}`]);
    }
    // 进度
    segs.forEach((f, k) => { const a = shotStart(k); f.style.transform = `scaleX(${Math.max(0, Math.min(1, (t - a) / SHOTS[k].dur))})`; });
    fade.style.opacity = String(t > TOTAL ? Math.min(1, (t - TOTAL) / TAIL) : 0);
  };

  let raf = 0, last = performance.now();
  const tick = (now: number) => {
    if (done) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused && !document.hidden) T += dt;
    draw(T);
    if (T >= TOTAL + TAIL) { finish(); return; }
    raf = requestAnimationFrame(tick);
  };
  if (T > 0) { const [i] = shotAt(T); for (let a = 0; a < i; a++) SHOTS[a].sfx?.forEach((_, k) => fired.add(`${a}:${k}`)); }
  raf = requestAnimationFrame(tick);
  return promise;
}

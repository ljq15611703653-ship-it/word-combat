// 开场动画播放器：Canvas2D 画面 + DOM 字幕 / 细进度线 / 跳过。入口见 index.ts 的 playIntro。
import "./intro.css";
import { SHOTS, TOTAL, type Shot } from "./script";
import { SCENES, buildEnv, W, type Env } from "./scenes";
import { playBgm, stopBgm, playSfx, stopAll } from "./audio";

const TAIL = 0.9; // 结束后黑场淡出

export interface IntroOptions {
  /** 从第几秒开始（调试/截图用） */
  start?: number;
  /** 暂停在 start 处不走时间（截图用） */
  paused?: boolean;
  /** 拿到控制句柄（调试/截图用） */
  onControl?: (c: IntroControl) => void;
  /** 零（黑客立绘）地址；null = 不用立绘。默认 BASE_URL + portraits/hacker.png */
  portraitUrl?: string | null;
  /** 小剑立绘地址；null = 用发光体代替。默认 BASE_URL + portraits/cyborg_zealot.png */
  swordUrl?: string | null;
}
export interface IntroControl { seek(t: number): void; pause(p: boolean): void; time(): number; skipShot(): void; skipAll(): void }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement) => { const e = document.createElement(tag); e.className = cls; parent?.append(e); return e; };

export async function runIntro(container: HTMLElement, o: IntroOptions = {}): Promise<void> {
  const root = el("div", "intro-root");
  if (container === document.body || container.clientHeight < 100) root.style.position = "fixed"; // 容器没有高度时铺满整个窗口
  else if (getComputedStyle(container).position === "static") container.style.position = "relative";
  const stage = el("div", "intro-stage", root);
  const canvas = el("canvas", "intro-canvas", stage); const ctx = canvas.getContext("2d")!;
  const title = el("div", "intro-title", stage);
  const sub = el("div", "intro-sub", stage); const subWho = el("span", "intro-who", sub); const subText = el("span", "intro-text", sub);
  const prog = el("div", "intro-prog", stage); const progFill = el("u", "", prog);
  const skip = el("button", "intro-skip", stage); skip.textContent = "跳过"; skip.type = "button";
  const fade = el("div", "intro-fade", stage);
  const loading = el("div", "intro-loading", root); loading.textContent = "…";
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
    stage.style.fontSize = `${Math.max(10, w / 1280 * 16)}px`; // 字幕用 em，随舞台缩放
  };
  fit();
  const ro = new ResizeObserver(fit); ro.observe(root);

  try { await Promise.race([document.fonts.load('700 30px "Noto Sans SC"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* 字体可缺 */ }
  const portraitUrl = o.portraitUrl === undefined ? `${import.meta.env.BASE_URL}portraits/hacker.png` : o.portraitUrl;
  const swordUrl = o.swordUrl === undefined ? `${import.meta.env.BASE_URL}portraits/cyborg_zealot.png` : o.swordUrl;
  const env: Env = await buildEnv(portraitUrl, swordUrl);
  loading.remove();

  let T = Math.max(0, Math.min(TOTAL, o.start ?? 0));
  let paused = !!o.paused, done = false, shotIdx = -1, subKey = "", titleKey = "";
  const fired = new Set<string>();

  const shotAt = (t: number): [number, number] => { let a = 0; for (let i = 0; i < SHOTS.length; i++) { if (t < a + SHOTS[i].dur || i === SHOTS.length - 1) return [i, Math.min(t - a, SHOTS[i].dur)]; a += SHOTS[i].dur; } return [0, 0]; };
  const shotStart = (i: number) => SHOTS.slice(0, i).reduce((a, s) => a + s.dur, 0);

  const enterShot = (i: number, silent: boolean) => {
    shotIdx = i; const s: Shot = SHOTS[i];
    if (!silent) { if (s.bgm !== undefined) { if (s.bgm) playBgm(s.bgm); else stopBgm(); } }
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
    SCENES[s.scene](ctx, ts, s.dur, env);
    // 音频触发
    s.sfx?.forEach((x, k) => { const key = `${i}:${k}`; if (ts >= x.at && !fired.has(key)) { fired.add(key); if (!paused) playSfx(x.id); } });
    // 字幕与标题
    let subL = null as null | { who?: string; text: string; age: number }, titleL = null as null | string;
    for (const l of s.lines) if (ts >= l.at && ts < l.at + l.dur) { if (l.kind === "title") titleL = l.text; else subL = { who: l.who, text: l.text, age: ts - l.at }; }
    const sk = subL ? `${i}${subL.who}${subL.text}` : "";
    if (sk !== subKey) {
      subKey = sk;
      if (subL) { subWho.textContent = (subL.who ?? "").replace(/^.*·\s*/, ""); subWho.style.display = subL.who ? "" : "none"; subText.textContent = subL.text; sub.classList.remove("show"); void sub.offsetWidth; sub.classList.add("show"); }
      else sub.classList.remove("show");
    }
    const tk = titleL ? `${i}${titleL}` : "";
    if (tk !== titleKey) { titleKey = tk; if (titleL) { title.textContent = titleL; title.classList.remove("show"); void title.offsetWidth; title.classList.add("show"); } else title.classList.remove("show"); }
    // 细进度线
    progFill.style.transform = `scaleX(${Math.max(0, Math.min(1, t / TOTAL))})`;
    // 镜头之间的短暗转；开头淡入，结尾淡出
    const dip = Math.max(0, 1 - ts / 0.35, 1 - (s.dur - ts) / 0.35) * (i === SHOTS.length - 1 && s.dur - ts < 0.35 ? 0 : 1);
    fade.style.opacity = String(t > TOTAL ? Math.min(1, (t - TOTAL) / TAIL) : Math.min(1, dip * 0.9));
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

// 2D 骨骼小人运行时（Canvas 2D，无第三方库）。
// 资源：public/duanju/art/<角色>/rig/{rig.json, atlas.png}，由 scripts/rig/pack.py 生成。
//   rig.json: bones{name:{parent,at[设计坐标]}}  parts{name:{atlas{x,y,w,h},pivot,bone,rot,off,ps,glow}}  order[绘制序，远→近]  view[x,y,w,h]
//   部件像素中的 pivot 点落在骨骼 at 处；骨骼局部变换 = 平移(at - parent.at + 动画) · 旋转 · 缩放
import { ANIMS, type AnimName, type Pose, type RigStyle, samplePose, speedOf } from "./anims";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
export interface RigData {
  name: string; ps: number; view: [number, number, number, number];
  bones: Record<string, { parent?: string; at: [number, number] }>;
  parts: Record<string, { atlas: { x: number; y: number; w: number; h: number }; pivot: [number, number]; bone: string; rot?: number; off?: [number, number]; ps?: number; sw?: number; glow?: number }>;
  order: string[];
  /** 各骨骼旋转幅度倍率（没有肩骨的角色，把肘骨动作放大） */
  gain?: Record<string, number>;
  /** 位置风格（词位/数位/速位），影响动作幅度/速度/腕盘发光 */
  style?: RigStyle;
}
export interface RigAsset { data: RigData; img: HTMLImageElement }
const cache = new Map<string, Promise<RigAsset | null>>();
/** 取骨骼资源；没有 rig 资源返回 null（调用方回退到整图/剪影） */
export function loadRig(artDir: string): Promise<RigAsset | null> {
  let p = cache.get(artDir);
  if (!p) {
    const dir = `${BASE}duanju/art/${artDir}/rig/`;
    p = fetch(dir + "rig.json").then((r) => (r.ok ? r.json() : Promise.reject())).then((data: RigData) => new Promise<RigAsset | null>((res) => {
      const img = new Image(); img.onload = () => res({ data, img }); img.onerror = () => res(null); img.src = dir + "atlas.png";
    })).catch(() => null);
    cache.set(artDir, p);
  }
  return p;
}

export interface RigFigure {
  /** 播放动作：idle 循环；cast/hurt 一次性，结束自动回 idle */
  play(name: AnimName): void;
  /** +1 朝右（素材原朝向），-1 镜像 */
  setFacing(f: 1 | -1): void;
  /** 测试用：停掉动画循环，直接渲染 name 在 t 秒的姿态 */
  seek(name: AnimName, t: number): void;
  destroy(): void;
  readonly canvas: HTMLCanvasElement;
}
type M = [number, number, number, number, number, number]; // a b c d e f  (x' = a x + c y + e)
const mul = (p: M, q: M): M => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
const trs = (x: number, y: number, rot: number, sx: number, sy: number): M => { const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180); return [c * sx, s * sx, -s * sy, c * sy, x, y]; };

/** 在 container 里创建骨骼小人（canvas，类名 rig，铺满容器、底对齐）。资源异步加载，加载完前 canvas 空白；加载失败 onFail 回调 */
export function createRig(artDir: string, container: HTMLElement, opts: { onFail?: () => void; onReady?: () => void; scale?: number; paused?: boolean } = {}): RigFigure {
  const cv = document.createElement("canvas"); cv.className = "rig"; cv.setAttribute("aria-hidden", "true");
  container.insertBefore(cv, container.firstChild);
  const ctx = cv.getContext("2d")!;
  let asset: RigAsset | null = null, facing: 1 | -1 = 1, dead = false, raf = 0;
  let cur: AnimName = "idle", t0 = performance.now(), queued: AnimName | null = null, manual = false;
  const ready = loadRig(artDir).then((a) => {
    if (dead) return;
    if (!a) { cv.remove(); opts.onFail?.(); return; }
    asset = a; opts.onReady?.(); const v = a.data.view, sc = opts.scale ?? 0.5;
    cv.width = Math.round(v[2] * sc); cv.height = Math.round(v[3] * sc);
    if (!manual && !opts.paused) loop();
    else draw(cur, manual ? tManual : 0);
  });
  void ready;
  let tManual = 0, margin = -1;
  const world: Record<string, M> = {};
  function draw(anim: AnimName, t: number) {
    if (!asset) return;
    const { data, img } = asset, v = data.view, sc = cv.width / v[2];
    const pose: Pose = samplePose(anim, t, data.gain, data.style);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    // 视口：设计坐标 -> 画布；facing=-1 绕视图中线镜像
    const base: M = facing === 1 ? [sc, 0, 0, sc, -v[0] * sc, -v[1] * sc] : [-sc, 0, 0, sc, (v[0] + v[2]) * sc, -v[1] * sc];
    const rootOff = { ...(pose.root ?? { x: 0, y: 0 }) };
    if (margin >= 0) rootOff.x = Math.max(-margin, Math.min(margin, rootOff.x));
    for (const k in world) delete world[k];
    const W = (b: string): M => {
      if (world[b]) return world[b];
      const bd = data.bones[b], par = bd.parent ? data.bones[bd.parent] : null, a = pose.bones[b];
      const lx = bd.at[0] - (par ? par.at[0] : 0) + (a?.x ?? 0) + (b === "root" ? rootOff.x : 0), ly = bd.at[1] - (par ? par.at[1] : 0) + (a?.y ?? 0) + (b === "root" ? rootOff.y : 0);
      const loc = trs(lx, ly, a?.rot ?? 0, a?.sx ?? 1, a?.sy ?? 1);
      return (world[b] = mul(bd.parent ? W(bd.parent) : base, loc));
    };
    const glow = pose.glow ?? 0;
    for (const pn of data.order) {
      const p = data.parts[pn]; if (!p || !data.bones[p.bone]) continue;
      const ps = p.ps ?? data.ps, off = p.off ?? [0, 0];
      const m = mul(mul(W(p.bone), trs(off[0], off[1], p.rot ?? 0, ps * (p.sw ?? 1), ps)), [1, 0, 0, 1, -p.pivot[0], -p.pivot[1]]);
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      const f = p.atlas;
      ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      if (p.glow && glow > 0.01) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, glow * 0.8); ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    }
    // 击退不出画布：用静止帧量待机姿势离画布边的余量（设计坐标），之后把根骨骼位移夹在余量内
    if (margin < 0 && Math.abs(rootOff.x) < 0.5 && anim === "idle") { try { const c0 = ctx.getImageData(0, 0, cv.width, cv.height).data; let mn = cv.width, mx = 0; for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x++) if (c0[(y * cv.width + x) * 4 + 3] > 20) { if (x < mn) mn = x; if (x > mx) mx = x; } margin = mx >= mn ? Math.max(0, Math.min(mn, cv.width - 1 - mx) / sc - 4) : -1; } catch { margin = 1e9; } }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if ((pose.flash ?? 0) > 0.01) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = `rgba(255,255,255,${pose.flash})`; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = "source-over"; }
    if ((pose.tint ?? 0) > 0.01) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = `rgba(255,70,100,${pose.tint})`; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = "source-over"; }
  }
  function loop() {
    if (dead) return;
    const now = performance.now(); let t = (now - t0) / 1000; const a = ANIMS[cur]; const sp = speedOf(asset?.data.style);
    if (!a.loop && t * sp >= a.dur) { cur = queued ?? "idle"; queued = null; t0 = now; t = 0; }
    draw(cur, ANIMS[cur].loop ? t % (ANIMS[cur].dur / sp) : t);
    raf = requestAnimationFrame(loop);
  }
  return {
    canvas: cv,
    play(name) { if (name === "idle") { cur = "idle"; t0 = performance.now(); } else { cur = name; t0 = performance.now(); } },
    setFacing(f) { facing = f; if (!raf) draw(cur, tManual); },
    seek(name, t) { manual = true; cancelAnimationFrame(raf); raf = 0; cur = name; tManual = t; draw(name, t); },
    destroy() { dead = true; cancelAnimationFrame(raf); cv.remove(); },
  };
}

// 立绘与背景：数据驱动、缺图回退。
//   背景：public/duanju/bg/bg_battle.webp（打电脑固定）/ bg_NN_*.webp（教程第 NN 拍）；缺图时 CSS 渐变
//   立绘：public/duanju/art/<角色>/battle_idle.png、battle_cast.png、battle_hurt.png（2D Q 版小人，单张静态；缺哪张回退到 idle，idle 缺则程序生成的矢量剪影）
const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const TUTORIAL_BG = ["calibrate", "echo", "wake", "probe", "streetlamp", "rainnight", "rooftop", "oldfactory", "darkcorner", "mirrorhall", "candlehall", "dicehall", "crimsonarena", "graduate"];
/** 背景数据驱动：mode = "battle"（打电脑）或教程节拍序号 1..14 */
const VER = ((import.meta as any).env?.VITE_BUILD ?? "") as string;
export function backgroundFor(mode: "battle" | number = "battle"): string {
  if (mode === "battle") return `${BASE}duanju/bg/bg_battle.webp?v=${VER}`;
  const n = Math.max(1, Math.min(TUTORIAL_BG.length, mode));
  return `${BASE}duanju/bg/bg_${String(n).padStart(2, "0")}_${TUTORIAL_BG[n - 1]}.webp?v=${VER}`;
}
export const bgUrl = () => backgroundFor("battle");
export type ArtState = "idle" | "cast" | "hurt";
export const artUrl = (artDir: string, state: ArtState = "idle") => `${BASE}duanju/art/${artDir}/battle_${state}.png?v=${VER}`;

const cache = new Map<string, Promise<ArtSet>>();
function tryImage(url: string): Promise<string | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.naturalWidth > 8 ? url : null);
    im.onerror = () => res(null);
    im.src = url;
  });
}
/** 剪影（占位）：平滑矢量的兜帽人形 + 冷色边缘光 + 护目线；三个位置各有一点区别（词位=肩甲、数位=胸前方块、速位=背后速度线） */
export function silhouette(accent: string, accent2: string, pos: number, glyph: string): string {
  const W = 240, H = 360, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  // 地面辉光
  const gr = g.createRadialGradient(120, 330, 6, 120, 330, 120); gr.addColorStop(0, accent + "66"); gr.addColorStop(1, accent + "00");
  g.fillStyle = gr; g.fillRect(0, 200, W, 160);
  const body = new Path2D();
  body.moveTo(78, 120); body.quadraticCurveTo(120, 96, 162, 120);          // 肩线
  body.quadraticCurveTo(176, 170, 170, 230); body.lineTo(160, 330);           // 右侧到脚
  body.lineTo(128, 330); body.lineTo(122, 252); body.lineTo(118, 252); body.lineTo(112, 330);
  body.lineTo(80, 330); body.lineTo(70, 230); body.quadraticCurveTo(64, 170, 78, 120); body.closePath();
  const fillG = g.createLinearGradient(0, 100, 0, 330); fillG.addColorStop(0, "#142a44"); fillG.addColorStop(1, "#08121f");
  g.fillStyle = fillG; g.fill(body);
  // 头（兜帽）
  const hood = new Path2D(); hood.moveTo(88, 108); hood.quadraticCurveTo(84, 44, 120, 38); hood.quadraticCurveTo(156, 44, 152, 108); hood.quadraticCurveTo(120, 124, 88, 108); hood.closePath();
  g.fillStyle = "#0d1c30"; g.fill(hood);
  // 护目线
  g.shadowColor = accent2; g.shadowBlur = 12; g.fillStyle = accent2; g.fillRect(100, 78, 40, 5); g.shadowBlur = 0;
  // 边缘光
  g.lineWidth = 3; g.strokeStyle = accent; g.shadowColor = accent; g.shadowBlur = 10; g.lineJoin = "round";
  g.stroke(hood); g.stroke(body); g.shadowBlur = 0;
  g.lineWidth = 1.4; g.strokeStyle = accent2 + "aa"; g.beginPath(); g.moveTo(120, 126); g.lineTo(120, 250); g.stroke();
  g.fillStyle = accent; g.shadowColor = accent; g.shadowBlur = 10;
  if (pos === 0) { g.fillRect(52, 118, 30, 9); g.fillRect(158, 118, 30, 9); g.fillStyle = accent2; g.fillRect(58, 130, 18, 5); g.fillRect(164, 130, 18, 5); }
  else if (pos === 1) { g.fillRect(106, 158, 28, 28); g.shadowBlur = 0; g.fillStyle = "#08121f"; g.fillRect(110, 162, 20, 20); g.fillStyle = accent2; g.fillRect(116, 168, 8, 8); }
  else { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? accent : accent2; g.fillRect(14 + i * 8, 150 + i * 18, 44 - i * 6, 3); g.fillRect(180 + i * 4, 160 + i * 14, 40 - i * 6, 3); } }
  g.shadowBlur = 0;
  g.fillStyle = accent2; g.font = "700 22px 'Noto Sans SC', sans-serif"; g.textAlign = "center"; g.fillText(glyph, 120, 352);
  return c.toDataURL("image/png");
}
export interface ArtSet { idle: string; cast?: string; hurt?: string }
/** 取立绘：先试真实文件（idle / cast / hurt 各自独立回退），idle 没有就生成矢量剪影（按 角色/位置/配色 缓存） */
export function loadArt(artDir: string, accent: string, accent2: string, pos: number, glyph: string): Promise<ArtSet> {
  const key = [artDir, accent, pos].join("|");
  let p = cache.get(key);
  if (!p) {
    p = Promise.all([tryImage(artUrl(artDir, "idle")), tryImage(artUrl(artDir, "cast")), tryImage(artUrl(artDir, "hurt"))])
      .then(([i, c, h]) => ({ idle: i ?? silhouette(accent, accent2, pos, glyph), cast: i ? c ?? undefined : undefined, hurt: i ? h ?? undefined : undefined }));
    cache.set(key, p);
  }
  return p;
}

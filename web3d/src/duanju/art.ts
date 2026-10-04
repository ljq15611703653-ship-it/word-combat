// 立绘与背景：数据驱动、缺图回退。
//   背景：public/duanju/bg/bg_battle.webp（打电脑固定）/ bg_NN_*.webp（教程第 NN 拍）；缺图时 CSS 渐变
//   立绘：public/duanju/art/<artDir>/battle_idle.png（缺图时程序生成的剪影，带位置徽章）
const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const TUTORIAL_BG = ["calibrate", "echo", "wake", "probe", "streetlamp", "rainnight", "rooftop", "oldfactory", "darkcorner", "mirrorhall", "candlehall", "dicehall", "crimsonarena", "graduate"];
/** 背景数据驱动：mode = "battle"（打电脑）或教程节拍序号 1..14 */
export function backgroundFor(mode: "battle" | number = "battle"): string {
  if (mode === "battle") return `${BASE}duanju/bg/bg_battle.webp`;
  const n = Math.max(1, Math.min(TUTORIAL_BG.length, mode));
  return `${BASE}duanju/bg/bg_${String(n).padStart(2, "0")}_${TUTORIAL_BG[n - 1]}.webp`;
}
export const bgUrl = () => backgroundFor("battle");
export const artUrl = (artDir: string) => `${BASE}duanju/art/${artDir}/battle_idle.png`;

const cache = new Map<string, Promise<string>>();
function tryImage(url: string): Promise<string | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.naturalWidth > 8 ? url : null);
    im.onerror = () => res(null);
    im.src = url;
  });
}
/** 剪影：兜帽人形 + 发光护目线，三个位置略有不同（词位=肩甲、数位=胸前方块、速位=背后速度线） */
export function silhouette(accent: string, accent2: string, pos: number, glyph: string): string {
  const c = document.createElement("canvas"); c.width = 160; c.height = 240;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const px = 4; // 像素风：先画小图再放大
  const s = document.createElement("canvas"); s.width = 40; s.height = 60;
  const t = s.getContext("2d")!;
  const dark = "#150a26", mid = "#241040", edge = accent;
  const R = (x: number, y: number, w: number, h: number, col: string) => { t.fillStyle = col; t.fillRect(x, y, w, h); };
  // 身体
  R(13, 22, 14, 22, dark); R(11, 24, 18, 12, dark); R(14, 44, 5, 14, dark); R(21, 44, 5, 14, dark);
  R(13, 22, 1, 22, mid); R(26, 22, 1, 22, mid);
  // 兜帽头
  R(15, 8, 10, 3, dark); R(13, 11, 14, 11, dark); R(16, 6, 8, 2, dark);
  R(16, 13, 8, 2, accent2); R(15, 14, 1, 1, accent); R(24, 14, 1, 1, accent);
  // 描边光
  R(12, 11, 1, 12, edge); R(27, 11, 1, 12, edge); R(10, 24, 1, 12, edge); R(29, 24, 1, 12, edge);
  R(14, 57, 5, 1, edge); R(21, 57, 5, 1, edge);
  if (pos === 0) { R(8, 22, 5, 3, edge); R(27, 22, 5, 3, edge); R(9, 25, 3, 2, accent2); R(28, 25, 3, 2, accent2); }
  else if (pos === 1) { R(17, 28, 6, 6, accent2); R(18, 29, 4, 4, dark); R(19, 30, 2, 2, accent); }
  else { for (let i = 0; i < 4; i++) R(3 + i * 2, 28 + i * 4, 8 - i, 1, i % 2 ? accent : accent2); for (let i = 0; i < 4; i++) R(29 + i * 2, 30 + i * 3, 7 - i, 1, i % 2 ? accent2 : accent); }
  g.drawImage(s, 0, 0, 40 * px, 60 * px);
  // 辉光
  g.globalCompositeOperation = "destination-over";
  const gr = g.createRadialGradient(80, 130, 10, 80, 130, 100); gr.addColorStop(0, accent + "55"); gr.addColorStop(1, accent + "00");
  g.fillStyle = gr; g.fillRect(0, 0, 160, 240);
  g.globalCompositeOperation = "source-over";
  g.fillStyle = accent2; g.font = "bold 18px sans-serif"; g.textAlign = "center"; g.fillText(glyph, 80, 232);
  return c.toDataURL("image/png");
}
/** 取立绘地址：先试真实文件，没有就生成剪影（按 角色/位置/配色 缓存） */
export function loadArt(artDir: string, accent: string, accent2: string, pos: number, glyph: string): Promise<string> {
  const key = [artDir, accent, pos].join("|");
  let p = cache.get(key);
  if (!p) { p = tryImage(artUrl(artDir)).then((u) => u ?? silhouette(accent, accent2, pos, glyph)); cache.set(key, p); }
  return p;
}

// 角色半身像：优先读 public/duanju/story/portraits/<角色>_<表情>.png，缺图用程序画的占位剪影（按角色配色，表情用简笔脸表示）。
import { STORY_BASE } from "../comic";

const PAL: Record<string, [string, string]> = {
  叶栖: ["#00e5ff", "#0b3a52"], 小满: ["#ffd23f", "#4a3a0a"], 柯谦: ["#b388ff", "#2a1a52"], 裴岚: ["#ff2d95", "#4a0f34"],
  回声: ["#9aa4b8", "#232a38"], 宋伯: ["#ff9f43", "#4a2a0a"], 叶晴: ["#5eead4", "#0f3a36"],
};
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const FALLBACK = ["#ff2d95", "#00e5ff", "#ffd23f", "#b388ff", "#5eead4", "#ff9f43"];
export const colorOf = (who: string) => (PAL[who] ?? [FALLBACK[hash(who) % FALLBACK.length], "#241040"])[0];
const darkOf = (who: string) => (PAL[who] ?? [FALLBACK[0], "#241040"])[1];

const cache = new Map<string, Promise<string>>();
const imgOk = (url: string) => new Promise<boolean>((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 8); im.onerror = () => res(false); im.src = url; });

function draw(who: string, expr: string): string {
  const W = 360, H = 520, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!, col = colorOf(who), dk = darkOf(who), h = hash(who);
  // 背景光晕
  const gr = g.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.42, 175); gr.addColorStop(0, col + "44"); gr.addColorStop(1, col + "00");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // 肩与身体
  g.fillStyle = "#120a22"; g.beginPath(); g.moveTo(20, H); g.quadraticCurveTo(30, 330, 130, 300); g.lineTo(230, 300); g.quadraticCurveTo(330, 330, 340, H); g.closePath(); g.fill();
  g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  g.fillStyle = dk; g.beginPath(); g.moveTo(150, 300); g.lineTo(180, 380); g.lineTo(210, 300); g.closePath(); g.fill();
  // 脖子 + 头
  g.fillStyle = "#1c1030"; g.fillRect(158, 262, 44, 50);
  g.beginPath(); g.ellipse(180, 200, 72, 86, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  // 头发（随角色略有不同）
  g.fillStyle = dk; g.beginPath(); g.ellipse(180, 160, 78, 64, 0, Math.PI, 0); g.fill();
  if (h % 2) { g.fillRect(102, 160, 20, 90); } else { g.fillRect(238, 160, 20, 70); }
  g.strokeStyle = col; g.stroke();
  // 半色调点
  g.fillStyle = col + "55";
  for (let y = 330; y < H; y += 14) for (let x = 40 + ((y / 14) % 2) * 7; x < W - 30; x += 14) { g.beginPath(); g.arc(x, y, 2.2 * Math.min(1, (y - 320) / 120), 0, 7); g.fill(); }
  // 表情脸
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.lineCap = "round";
  const eye = (x: number, y: number, kind: string) => { g.beginPath(); if (kind === "smile") { g.arc(x, y + 4, 9, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } else if (kind === "shock") { g.arc(x, y, 8, 0, 7); g.stroke(); } else if (kind === "sad") { g.moveTo(x - 9, y - 4); g.lineTo(x + 9, y + 3 * (x < 180 ? 1 : -1)); g.stroke(); } else { g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.stroke(); } };
  const e = ["smile", "shock", "sad", "angry", "smirk"].includes(expr) ? expr : "neutral";
  eye(150, 205, e === "smirk" ? "neutral" : e); eye(210, 205, e);
  g.beginPath();
  if (e === "smile") g.arc(180, 232, 18, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (e === "smirk") { g.moveTo(166, 244); g.quadraticCurveTo(190, 246, 202, 232); }
  else if (e === "shock") g.arc(180, 246, 8, 0, 7);
  else if (e === "sad") g.arc(180, 256, 16, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (e === "angry") { g.moveTo(160, 248); g.lineTo(200, 248); g.moveTo(142, 190); g.lineTo(166, 198); g.moveTo(218, 190); g.lineTo(194, 198); }
  else { g.moveTo(165, 246); g.lineTo(195, 246); }
  g.stroke();
  return c.toDataURL("image/png");
}
/** 对白里的称呼 -> 立绘文件名（文件名 = 全名）；括号备注（全角/半角）先去掉 */
const ALIAS: Record<string, string> = { 小满: "陆小满", 叶栖: "叶栖", 柯谦: "柯谦" };
export const portraitName = (who: string) => { const w = who.replace(/[（(].*[）)]?/, "").trim(); return ALIAS[w] ?? w; };
/** 返回半身像的 URL：<名>_<表情>.webp -> .png -> <名>_neutral.webp -> .png -> 程序占位 */
export function portraitUrl(who0: string, expr: string): Promise<string> {
  const who = portraitName(who0), key = `${who}|${expr}`;
  let p = cache.get(key);
  if (!p) {
    const base = (e: string, ext: string) => `${STORY_BASE}portraits/${encodeURIComponent(who)}_${e}.${ext}`;
    const tries = [base(expr, "webp"), base(expr, "png"), ...(expr === "neutral" ? [] : [base("neutral", "webp"), base("neutral", "png")])];
    p = (async () => { for (const u of tries) if (await imgOk(u)) return u; return draw(who, expr); })();
    cache.set(key, p);
  }
  return p;
}
export const isNarrator = (who: string) => !who || /^(旁白|叙述|空)$/.test(who);

// 序列帧立绘：图集按行排列，每格和立绘平面同比例（832:1216）。
// 第 0 帧兼作待机帧；动作播完回到第 0 帧。
export interface Flipbook { file: string; cols: number; rows: number; frames: number; fps: number; hold: number; }

export const FLIPBOOKS: Record<string, Flipbook> = {
  medic_chibi_cast: { file: "medic_chibi_cast.webp", cols: 6, rows: 6, frames: 36, fps: 12, hold: 2 },
  medic_full_cast: { file: "medic_full_cast.webp", cols: 6, rows: 6, frames: 36, fps: 12, hold: 2 },
};

export const artUrl = (art: string) => `${import.meta.env.BASE_URL}portraits/${FLIPBOOKS[art]?.file ?? art + ".png"}`;

/** 第 f 帧在图集里的取图范围（xy 偏移，zw 缩放），flip 时宽度取负做水平镜像。 */
export function frameRect(fb: Flipbook, f: number, flip: boolean): [number, number, number, number] {
  const w = 1 / fb.cols, h = 1 / fb.rows;
  const x = (f % fb.cols) * w, y = 1 - (Math.floor(f / fb.cols) + 1) * h;
  return flip ? [x + w, y, -w, h] : [x, y, w, h];
}

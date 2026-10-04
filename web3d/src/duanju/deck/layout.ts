// 纯逻辑：占格、吸附、装箱。无 DOM 依赖，可在 node 下测试。（移植自 D:/wc/deckbuilder/layout.js）
export interface Word {
  name: string; area: number; max: number; cat: string; icon: string;
  size: [number, number]; desc: string; example: string;
}
export interface Block { id: number; word: Word; x: number; y: number; rot: boolean }
export interface Placed { word: Word; x: number; y: number; rot: boolean }
export interface Dim { w: number; h: number }

export const dims = (word: Word, rot: boolean): Dim => { const [w, h] = word.size; return rot ? { w: h, h: w } : { w, h }; };
export const fits = (d: Dim, x: number, y: number, cols: number, rows: number) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + d.w <= cols && y + d.h <= rows;
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function canPlace(blocks: Block[], cols: number, rows: number, word: Word, rot: boolean, x: number, y: number, ignoreId?: number | null): boolean {
  const d = dims(word, rot);
  if (!fits(d, x, y, cols, rows)) return false;
  const r = { x, y, w: d.w, h: d.h };
  for (const b of blocks) {
    if (b.id === ignoreId) continue;
    const bd = dims(b.word, b.rot);
    if (overlap(r, { x: b.x, y: b.y, w: bd.w, h: bd.h })) return false;
  }
  return true;
}
/** 离 (tx,ty) 最近的合法位置（吸附）。tryOther=true 时两种朝向都试 */
export function nearestSpot(blocks: Block[], cols: number, rows: number, word: Word, rot: boolean, tx: number, ty: number, ignoreId?: number | null, tryOther = false): { x: number; y: number; rot: boolean } | null {
  let best: { x: number; y: number; rot: boolean; d: number } | null = null;
  for (const r of tryOther ? [rot, !rot] : [rot]) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!canPlace(blocks, cols, rows, word, r, x, y, ignoreId)) continue;
      const d = (x - tx) ** 2 + (y - ty) ** 2 + (r === rot ? 0 : 0.5);
      if (!best || d < best.d) best = { x, y, rot: r, d };
    }
  }
  return best && { x: best.x, y: best.y, rot: best.rot };
}
export const usedArea = (blocks: { word: Word }[]) => blocks.reduce((s, b) => s + b.word.size[0] * b.word.size[1], 0);
export function counts(blocks: { word: Word }[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const b of blocks) c[b.word.name] = (c[b.word.name] || 0) + 1;
  return c;
}
/** 能否再加一张。null = 可以，否则原因 */
export function addError(blocks: Block[], cols: number, rows: number, word: Word): "full" | "capacity" | "nospace" | null {
  if ((counts(blocks)[word.name] || 0) >= word.max) return "full";
  if (usedArea(blocks) + word.size[0] * word.size[1] > cols * rows) return "capacity";
  if (!nearestSpot(blocks, cols, rows, word, false, 0, 0, null, true)) return "nospace";
  return null;
}
/** 自动排布：精确回溯（大块优先，相同词按位置序去重），有节点上限。成功返回布局，失败 null */
export function autoPack(words: Word[], cols: number, rows: number, nodeLimit = 400000): Placed[] | null {
  const area = (w: Word) => w.size[0] * w.size[1];
  if (words.reduce((s, w) => s + area(w), 0) > cols * rows) return null;
  const list = [...words].sort((a, b) => area(b) - area(a) || a.name.localeCompare(b.name));
  const grid = new Array<boolean>(cols * rows).fill(false);
  const out: Placed[] = [];
  let nodes = 0;
  const free = (d: Dim, x: number, y: number) => {
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) if (grid[(y + j) * cols + x + i]) return false;
    return true;
  };
  const mark = (d: Dim, x: number, y: number, v: boolean) => {
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) grid[(y + j) * cols + x + i] = v;
  };
  function dfs(k: number, minPos: number): boolean {
    if (k === list.length) return true;
    if (++nodes > nodeLimit) return false;
    const word = list[k];
    const same = k > 0 && list[k - 1].name === word.name;
    const rots = word.size[0] === word.size[1] ? [false] : [false, true];
    for (const rot of rots) {
      const d = dims(word, rot);
      for (let y = 0; y + d.h <= rows; y++) for (let x = 0; x + d.w <= cols; x++) {
        const pos = (y * cols + x) * 2 + (rot ? 1 : 0);
        if (same && pos <= minPos) continue;
        if (!free(d, x, y)) continue;
        mark(d, x, y, true);
        out.push({ word, x, y, rot });
        if (dfs(k + 1, pos)) return true;
        out.pop();
        mark(d, x, y, false);
        if (nodes > nodeLimit) return false;
      }
    }
    return false;
  }
  return dfs(0, -1) ? out.map((o) => ({ ...o })) : null;
}

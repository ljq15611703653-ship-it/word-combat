// 通关记录：存在 localStorage（没有存储也能玩，只是不记）。
export interface Record1 { rounds: number; at: number }
export interface Progress { done: Record<number, Record1> }
const KEY = "wc-campaign-v1";
interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }
const real = (): Store | null => { try { return localStorage; } catch { return null; } };

export function loadProgress(st: Store | null = real()): Progress {
  try {
    const raw = st?.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (p && typeof p.done === "object") return { done: p.done }; }
  } catch { /* 损坏的记录当作没有 */ }
  return { done: {} };
}
export function saveProgress(p: Progress, st: Store | null = real()) { try { st?.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }
/** 记一次通关；同一关保留用轮数最少的那次 */
export function markDone(p: Progress, id: number, rounds: number, now = Date.now()): Progress {
  const old = p.done[id];
  return { done: { ...p.done, [id]: { rounds: old ? Math.min(old.rounds, rounds) : rounds, at: now } } };
}
export const unlocked = (p: Progress, id: number) => id <= 1 || !!p.done[id - 1] || !!p.done[id];

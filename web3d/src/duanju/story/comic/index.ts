// 漫画页播放器对外封装：按 (level, when) 播一段；没有 panels 就直接 resolve。
import { playComic, validate } from "./player";

export interface ComicData { layouts: Record<string, unknown>; panels: any[]; presentation?: string; assets?: Record<string, { src: string; crop: number[]; chroma?: string }> }
export interface ComicHandle { destroy(): void; skip(): void; next(): void; setAuto(v: boolean): void; setSpeed(v: number): void }
const BASE: string = (import.meta as any).env?.BASE_URL ?? "/";
export const STORY_BASE = `${BASE}duanju/story/`;

let cache: Promise<ComicData> | null = null;
/** 读 panels.json，并尝试读 assets.json（没有就全部用占位图） */
export function loadComicData(): Promise<ComicData> {
  cache ??= (async () => {
    const data: ComicData = await (await fetch(`${STORY_BASE}panels.json`)).json();
    try {
      const r = await fetch(`${STORY_BASE}assets.json`, { cache: "no-cache" });
      if (r.ok && (r.headers.get("content-type") ?? "").includes("json")) { const a = await r.json(); if (a && Object.keys(a).length) data.assets = a; }
    } catch { /* 没有就占位 */ }
    return data;
  })();
  return cache;
}
export const hasSegment = (d: ComicData, level: number, when: "pre" | "post") => d.panels.some((p) => p.level === level && p.when === when);
export { validate };

/** 播放一段漫画，播完 / 跳过后 resolve。返回的 handle 可由外部强制结束 */
export function playSegment(container: HTMLElement, data: ComicData, level: number, when: "pre" | "post", opts: { auto?: boolean; speed?: number } = {}): { done: Promise<void>; handle: ComicHandle | null } {
  if (!hasSegment(data, level, when)) return { done: Promise.resolve(), handle: null };
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const handle = playComic(container, data, {
    segment: { level, when }, onDone: () => { container.innerHTML = ""; resolve(); },
    auto: opts.auto, speed: opts.speed,
    imageBase: `${STORY_BASE}panels/`, assetBase: `${STORY_BASE}img/`,
    forcePlaceholder: false,
    assets: data.assets,
  }) as ComicHandle;
  return { done, handle };
}

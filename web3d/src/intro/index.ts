// 开场演出对外入口。
import { runIntro, type IntroOptions } from "./player";

export { SHOTS, TOTAL } from "./script";
export { setAudioBackend, createHtmlAudio, setVolume, nullAudio } from "./audio";
export type { IntroAudio } from "./audio";
export type { IntroOptions, IntroControl } from "./player";

const KEY = "wc.intro.seen.v1";

/** 是否还没看过开场 */
export function shouldPlayIntro(): boolean { try { return !localStorage.getItem(KEY); } catch { return false; } }
export function markIntroSeen() { try { localStorage.setItem(KEY, "1"); } catch { /* 无痕模式等 */ } }
/** 清除「已看过」，下次 playIntroIfFirst 会重新播放 */
export function resetIntroSeen() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

/** 无条件播放开场（菜单里的「重看开场」直接调这个）。播完或跳过后 resolve，并记为已看过。 */
export async function playIntro(container: HTMLElement, opts: IntroOptions = {}): Promise<void> {
  try { await runIntro(container, opts); } finally { markIntroSeen(); }
}

/** 仅第一次播放；之后直接返回。教程入口用这个。 */
export async function playIntroIfFirst(container: HTMLElement): Promise<void> {
  if (shouldPlayIntro()) await playIntro(container);
}

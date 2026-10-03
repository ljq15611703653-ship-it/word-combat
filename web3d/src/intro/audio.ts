// 音频接口：默认全部空实现（不出声）。接入真实音频时，调用 setAudioBackend 换掉即可，
// 播放器只会通过本文件的函数发声，不会直接碰 Audio。详见 src/intro/README.md。

export interface IntroAudio {
  /** 开始播放某首 BGM（id 来自 script.ts 的 bgm 字段）；已在播同 id 时不重启 */
  playBgm(id: string): void;
  stopBgm(): void;
  /** 播放一次音效（id 来自 script.ts 的 sfx 字段） */
  playSfx(id: string): void;
  /** 0~1，总音量 */
  setVolume(v: number): void;
  /** 跳过/结束时调用，停掉一切声音 */
  stopAll?(): void;
}

/** 空实现：什么都不做 */
export const nullAudio: IntroAudio = {
  playBgm() {}, stopBgm() {}, playSfx() {}, setVolume() {}, stopAll() {},
};

let backend: IntroAudio = nullAudio;
let volume = 0.8;

export function setAudioBackend(b: IntroAudio) { backend = b; backend.setVolume(volume); }
export function playBgm(id: string) { backend.playBgm(id); }
export function stopBgm() { backend.stopBgm(); }
export function playSfx(id: string) { backend.playSfx(id); }
export function setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); backend.setVolume(volume); }
export function stopAll() { backend.stopAll ? backend.stopAll() : backend.stopBgm(); }

/**
 * 现成的 HTMLAudio 后端：把 id 映射到音频文件地址即可用。
 * 例：setAudioBackend(createHtmlAudio({ bgm: { intro_theme: "/audio/intro.mp3" }, sfx: { tile_snap: "/audio/snap.wav" } }))
 * 没写在映射里的 id 会被忽略（不报错）。
 */
export function createHtmlAudio(map: { bgm?: Record<string, string>; sfx?: Record<string, string> }): IntroAudio {
  let cur: HTMLAudioElement | null = null;
  let curId = "";
  let vol = 0.8;
  const sfxLive = new Set<HTMLAudioElement>();
  return {
    playBgm(id) {
      if (id === curId) return;
      cur?.pause(); cur = null; curId = id;
      const src = map.bgm?.[id];
      if (!src) return;
      cur = new Audio(src); cur.loop = true; cur.volume = vol * 0.7;
      cur.play().catch(() => {});
    },
    stopBgm() { cur?.pause(); cur = null; curId = ""; },
    playSfx(id) {
      const src = map.sfx?.[id];
      if (!src) return;
      const a = new Audio(src); a.volume = vol; sfxLive.add(a);
      a.onended = () => sfxLive.delete(a);
      a.play().catch(() => {});
    },
    setVolume(v) { vol = v; if (cur) cur.volume = v * 0.7; },
    stopAll() { this.stopBgm(); sfxLive.forEach((a) => a.pause()); sfxLive.clear(); },
  };
}

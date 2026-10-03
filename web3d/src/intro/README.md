# 开场演出（src/intro）

纯代码动画（Canvas2D + DOM HUD），约 65 秒，叙事形式：玩家戴上智能眼镜、系统启动、看见夜城。

## 预览
`npm run dev`，打开 `/intro.html`（`?t=34` 从第 34 秒开始，`&pause=1` 暂停在该时刻）。

## 教程接入（一行）
```ts
import { playIntroIfFirst } from "../intro";
await playIntroIfFirst(document.body);   // 首次进入教程时调用；之后自动跳过
```
菜单「重看开场」：`import { playIntro } from "../intro"; await playIntro(document.body);`
（`resetIntroSeen()` 可清除已看标记。localStorage 键：`wc.intro.seen.v1`）

## 改字 / 改镜头
只改 `script.ts`：每个镜头有时长、字幕（`lines`）、HUD 锁定框（`locks`）、bgm/sfx。

## 放入 BGM / 音效
1. 把音频放进 `web3d/public/audio/`（如 `intro_theme.mp3`、`tile_snap.wav`）。
2. 在 demo 或教程入口调用一次：
```ts
import { setAudioBackend, createHtmlAudio } from "../intro";
setAudioBackend(createHtmlAudio({
  bgm: { intro_boot: "/audio/boot.mp3", intro_theme: "/audio/intro_theme.mp3", intro_danger: "/audio/danger.mp3", intro_resolve: "/audio/resolve.mp3" },
  sfx: { tile_snap: "/audio/tile_snap.wav", lock_on: "/audio/lock_on.wav" /* ... */ },
}));
```
映射里没写的 id 会被忽略。想用 WebAudio 等自己的实现，实现 `IntroAudio`（playBgm/stopBgm/playSfx/setVolume/stopAll）后传给 `setAudioBackend` 即可。
脚本里用到的 id：bgm = intro_boot / intro_theme / intro_danger / intro_resolve；sfx 见 `script.ts` 各镜头。

## HUD 组件
`src/ui/hud.css` + `src/ui/hud.ts`：括号、读数、准星、锁定框、读数条、扫描线、故障；全部是信息元素，用 em 单位随容器 font-size 缩放，可被其它界面复用。

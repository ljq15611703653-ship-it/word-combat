# 开场动画（src/intro）

纯代码动画（Canvas2D + 底部字幕），约 60 秒，七个镜头。第三人称旁观的短片：镜头在夜城里推拉移动，
底部中文字幕，角色台词在字幕前带署名（如「阿词：新来的？站稳了。」）。没有任何取景框 / 设备读数一类的界面元素。
故事：夜城雨夜 → 词牌升空（没人靠手速，招式是一句话）→ 黑客拼出「选择 敌方 造成」→ 暗巷训练场，稻草人与词师阿词
→ 时间轴（先出手的先落下）→ 并/续/择/血四流派 → 拼出第一句、标题《词战》，随后接教程第一关阿词的「欢迎来到词战」。

## 预览
`npm run dev`，打开 `/intro.html`（`?t=34` 从第 34 秒开始，`&pause=1` 暂停在该时刻）。
控制台里 `window.__intro.seek(秒)` 可随时跳到某一刻。截图脚本：`node scripts/intro-shots.mjs shots/story <端口>`。

## 操作
点击 / 空格 / 回车 / → ：跳到下一幕；Esc 或右下角小「跳过」：跳过全部；底部只有一条很细的进度线。

## 教程接入
`src/campaign/main.ts` 首次进入时 `await playIntroIfFirst(document.body)`；教程菜单（☰ 与关卡选择页）里「重看开场」调 `playIntro`。
```ts
import { playIntroIfFirst, playIntro } from "../intro";
await playIntroIfFirst(document.body);   // 只播一次（localStorage 键 wc.intro.seen.v1）
await playIntro(document.body);          // 无条件播放
```
`resetIntroSeen()` 可清除已看标记。

## 改字 / 改镜头
只改 `script.ts`：每个镜头有时长、字幕（`lines`，`who` 是说话人，`kind: "title"` 是居中大字）、bgm/sfx。

## 放入 BGM / 音效
默认全部空实现（不出声）。
1. 把音频放进 `web3d/public/audio/`。
2. 调一次：
```ts
import { setAudioBackend, createHtmlAudio } from "../intro";
setAudioBackend(createHtmlAudio({
  bgm: { intro_theme: "/audio/intro_theme.mp3", intro_danger: "/audio/danger.mp3", intro_resolve: "/audio/resolve.mp3" },
  sfx: { tile_snap: "/audio/tile_snap.wav" /* ... */ },
}));
```
映射里没写的 id 会被忽略。也可自己实现 `IntroAudio`（playBgm/stopBgm/playSfx/setVolume/stopAll）。
脚本里用到的 id：bgm = intro_theme / intro_danger / intro_resolve；sfx 见 `script.ts` 各镜头。

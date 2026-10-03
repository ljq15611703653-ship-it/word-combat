# 开场动画（src/intro）

纯代码动画（Canvas2D + 底部字幕），约 62 秒，七个镜头。第三人称的电影感短片：镜头在夜城里推拉移动，
底部中文字幕，角色台词在字幕前带署名（旁白不署名；零 / 小剑 / 阿词 / 匿名消息）。没有取景框 / 设备读数 / 玩法讲解。
故事（序幕）：雨夜街头，词牌从嘴边浮出砸在对方身上，围观者照常走路（旁白：只有一条规矩）→ 天台，黑客少女零独自坐着，
词库只剩「选择、敌方、造成」→ 键盘旁亮起一道光，随从小剑出现，只会喊「砍！」→ 匿名消息「到巷子最深处。——阿词」
→ 零戴上护目镜站起来，走进暗巷 → 披斗篷的阿词转身，稻草人眼睛亮起 → 标题《词战》。随后教程第一关由阿词接「别怕。先从你手里这三张牌开始……」。
角色：零 = portraits/hacker.png，小剑 = portraits/cyborg_zealot.png（缺图时用发光体代替），阿词 = 程序绘制的披斗篷剪影。

## 预览
`npm run dev`，打开 `/intro.html`（`?t=34` 从第 34 秒开始，`&pause=1` 暂停在该时刻）。
控制台里 `window.__intro.seek(秒)` 可随时跳到某一刻。截图脚本：`TIMES=5,17,27,52,59 node scripts/intro-shots.mjs shots/story <端口>`。

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

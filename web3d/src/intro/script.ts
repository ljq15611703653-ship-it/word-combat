// 开场动画分镜脚本（纯数据）。想改字、改时长、挂音频，只改这个文件即可。
// 故事（序幕）：雨夜夜城，街头一方的词牌从嘴边浮出砸在另一方身上，围观者继续走路 → 天台，黑客少女零独自坐着，
// 词库几乎是空的，只剩「选择、敌方、造成」三个字 → 键盘旁亮起一道光，随从小剑出现，只会喊「砍！」→ 屏幕跳出匿名消息
// → 零戴上护目镜站起来，走进暗巷 → 尽头披斗篷的阿词转身，稻草人眼睛亮起 → 标题《词战》。
// 之后教程第一关由阿词接「别怕。先从你手里这三张牌开始……」。台词不讲规则。
// 说话人写在 who 里（字幕前显示署名：旁白不填 who，零 / 小剑 / 阿词 / 匿名消息）。

/** 画面场景 id（对应 scenes.ts 里的绘制函数） */
export type SceneId = "street" | "rooftop" | "sword" | "message" | "alley" | "turn" | "title";

/** 一行字幕。at 为相对本镜头开头的秒数，dur 为停留秒数 */
export interface Line {
  at: number;
  dur: number;
  text: string;
  /** 说话人，显示在字幕前；旁白不填 */
  who?: string;
  /** sub = 底部字幕（默认）；title = 居中大字（标题） */
  kind?: "sub" | "title";
}

export interface Shot {
  id: string;
  scene: SceneId;
  /** 本镜头时长（秒） */
  dur: number;
  /** 画面说明（给改稿的人看，程序不用） */
  note: string;
  lines: Line[];
  /** 镜头开始时切换的 BGM id（不写 = 沿用上一首；写 "" = 停止） */
  bgm?: string;
  /** 镜头内按时间点触发的音效 */
  sfx?: { at: number; id: string }[];
}

export const SHOTS: Shot[] = [
  {
    id: "S1", scene: "street", dur: 10,
    note: "雨夜夜城街头，镜头缓缓推进：两个人对骂，词牌从嘴边浮出、砸在对方身上；围观的路人撑着伞继续走路，看都不看",
    bgm: "intro_theme",
    sfx: [{ at: 0, id: "rain_loop" }, { at: 0.9, id: "word_hit" }, { at: 2.5, id: "word_hit" }, { at: 4.1, id: "word_hit" }, { at: 5.5, id: "word_hit" }, { at: 6.9, id: "word_hit" }, { at: 8, id: "word_hit" }],
    lines: [
      { at: 4.4, dur: 5.2, text: "这座城只有一条规矩：谁的话先落下，谁就是对的。" },
    ],
  },
  {
    id: "S2", scene: "rooftop", dur: 10,
    note: "天台，镜头从远处缓缓推向黑客少女零；她身边只剩淡淡的空词牌轮廓；三个字「选择」「敌方」「造成」依次在她头顶亮起",
    bgm: "intro_danger",
    sfx: [{ at: 4.6, id: "tile_snap" }, { at: 5.4, id: "tile_snap" }, { at: 6.2, id: "tile_snap" }],
    lines: [
      { at: 0.6, dur: 4, text: "三年前，静默法案之后，全城人的词都被语法公司收走了。" },
      { at: 5.4, dur: 4.2, text: "只有她，留下了三个字。" },
    ],
  },
  {
    id: "S3", scene: "sword", dur: 9,
    note: "零靠在键盘前；键盘旁亮起一道暖光，凝成她的随从小剑，只会喊「砍！」",
    sfx: [{ at: 4.6, id: "spawn" }, { at: 6, id: "slash" }],
    lines: [
      { at: 0.5, dur: 3.8, who: "零", text: "一句话就够了——只要那句话是我拼的。" },
      { at: 6, dur: 2.4, who: "小剑", text: "砍！" },
    ],
  },
  {
    id: "S4", scene: "message", dur: 9,
    note: "屏幕上跳出匿名消息；零犹豫了一下，护目镜落到眼前，站了起来",
    sfx: [{ at: 0.6, id: "msg_ping" }, { at: 5, id: "visor" }, { at: 6, id: "footstep" }],
    lines: [
      { at: 1.0, dur: 4, who: "匿名消息", text: "想要回你的词，到巷子最深处。——阿词" },
    ],
  },
  {
    id: "S5", scene: "alley", dur: 9,
    note: "暗巷，镜头跟在零身后缓缓推进；她一步步走进雨里；尽头披斗篷的阿词背对着她，身旁立着稻草人",
    bgm: "intro_danger",
    sfx: [{ at: 0.5, id: "footstep" }, { at: 1.4, id: "footstep" }, { at: 2.3, id: "footstep" }, { at: 3.2, id: "footstep" }, { at: 4.1, id: "footstep" }, { at: 5, id: "footstep" }, { at: 5.9, id: "footstep" }, { at: 6.8, id: "footstep" }, { at: 7.7, id: "footstep" }],
    lines: [],
  },
  {
    id: "S6", scene: "turn", dur: 9,
    note: "越肩镜头：阿词转身，稻草人的眼睛亮起",
    bgm: "intro_resolve",
    sfx: [{ at: 0.6, id: "cloak" }, { at: 6, id: "eyes_on" }],
    lines: [
      { at: 1.8, dur: 4.6, who: "阿词", text: "来了。你的词库是空的，但你听得见词。" },
    ],
  },
  {
    id: "S7", scene: "title", dur: 6,
    note: "稻草人的光漫开，三个字缓缓升空，标题《词战 WORD COMBAT》；之后接教程第一关阿词的「别怕」",
    sfx: [{ at: 1.2, id: "title_hit" }],
    lines: [
      { at: 1.2, dur: 4.6, kind: "title", text: "词战" },
    ],
  },
];

/** 总时长（秒） */
export const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

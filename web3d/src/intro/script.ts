// 开场动画分镜脚本（纯数据）。想改字、改时长、挂音频，只改这个文件即可。
// 故事来源：教程（src/campaign/levels.ts）的世界观——「词战」里不靠手速、靠拼一句话；
// 词牌是零件、句子是招式；词师阿词在训练场教新人，对手从稻草人开始；时间轴上谁先出手谁先落下；
// 并/续/择/血四个职业。整段是第三人称旁观的短片：镜头在夜城里推拉移动，底部只有字幕。
// 开场结束后，教程第一关由阿词接一句「欢迎来到词战。」。说话人写在 who 里（字幕前显示署名）；旁白不填 who。

/** 画面场景 id（对应 scenes.ts 里的绘制函数） */
export type SceneId = "city" | "words" | "hacker" | "mentor" | "timeline" | "families" | "assemble";

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

const MENTOR = "词师 · 阿词";

export const SHOTS: Shot[] = [
  {
    id: "S1", scene: "city", dur: 8,
    note: "夜晚雨街，霓虹招牌闪烁，镜头缓缓推进；标题字「夜城」淡入淡出",
    bgm: "intro_theme",
    sfx: [{ at: 0, id: "rain_loop" }, { at: 0.4, id: "neon_buzz" }],
    lines: [
      { at: 0.6, dur: 3.2, kind: "title", text: "夜城" },
      { at: 3.8, dur: 4, text: "雨一直下，霓虹一直亮。" },
    ],
  },
  {
    id: "S2", scene: "words", dur: 9,
    note: "行人头顶飞出发光的词牌，在雨里升向夜空，镜头微微后拉",
    sfx: [{ at: 0.3, id: "word_rise" }, { at: 4.8, id: "word_swirl" }],
    lines: [
      { at: 0.4, dur: 4.2, text: "在这座城里，没人靠手速分胜负。" },
      { at: 4.8, dur: 4, text: "招式，是一句话。" },
    ],
  },
  {
    id: "S3", scene: "hacker", dur: 9,
    note: "黑客立绘立在霓虹前，词牌「选择 敌方 造成」逐张落下、连成一条线",
    bgm: "intro_theme",
    sfx: [{ at: 1.2, id: "tile_snap" }, { at: 2.4, id: "tile_snap" }, { at: 3.6, id: "tile_snap" }, { at: 6.4, id: "cast" }],
    lines: [
      { at: 0.4, dur: 3.2, text: "每一张词牌，都是一个零件。" },
      { at: 3.8, dur: 2.4, text: "选择、敌方、造成——" },
      { at: 6.4, dur: 2.4, text: "拼在一起，就是一招。" },
    ],
  },
  {
    id: "S4", scene: "mentor", dur: 10,
    note: "暗巷里的训练场，镜头缓缓推向霓虹下的稻草人；拉远，词师阿词从巷口的阴影里走出来",
    bgm: "",
    sfx: [{ at: 1, id: "heartbeat" }, { at: 5.4, id: "footstep" }],
    lines: [
      { at: 0.4, dur: 4.2, text: "巷子深处，有人在等新来的学徒。" },
      { at: 5.8, dur: 2.2, who: MENTOR, text: "新来的？站稳了。" },
      { at: 8.2, dur: 1.8, who: MENTOR, text: "别怕，它只是个稻草人。" },
    ],
  },
  {
    id: "S5", scene: "timeline", dur: 8,
    note: "时间轴：我方与敌方的句子按起手秒数排好，光标扫过，逐句落下",
    bgm: "intro_danger",
    sfx: [{ at: 1.6, id: "hit" }, { at: 2.9, id: "hit" }, { at: 4.4, id: "heal" }, { at: 5.9, id: "hit" }],
    lines: [
      { at: 0.4, dur: 3.6, text: "每一秒，双方各说一句。" },
      { at: 4.2, dur: 3.6, text: "先出手的先落下，倒下的人，话也落空。" },
    ],
  },
  {
    id: "S6", scene: "families", dur: 6.5,
    note: "四个职业依次亮起：并（青）、续（绿）、择（琥珀）、血（赤红）",
    bgm: "intro_theme",
    sfx: [{ at: 0.6, id: "tile_snap" }, { at: 1.6, id: "tile_snap" }, { at: 2.6, id: "tile_snap" }, { at: 3.6, id: "tile_snap" }],
    lines: [
      { at: 0.4, dur: 3.4, text: "并、续、择、血——四种流派，四种拼法。" },
      { at: 4, dur: 2.3, who: MENTOR, text: "先学基础，再选你的路。" },
    ],
  },
  {
    id: "S7", scene: "assemble", dur: 9.5,
    note: "词牌飞来，拼成第一句「选择 1 敌方 造成 1」，闪光，标题《词战》；之后接教程第一关阿词的「欢迎来到词战」",
    bgm: "intro_resolve",
    sfx: [{ at: 1.2, id: "tile_snap" }, { at: 1.9, id: "tile_snap" }, { at: 2.6, id: "tile_snap" }, { at: 3.3, id: "tile_snap" }, { at: 4, id: "tile_snap" }, { at: 5, id: "title_hit" }],
    lines: [
      { at: 0.3, dur: 4, who: MENTOR, text: "来，我们先拼第一句。" },
      { at: 5.6, dur: 3.6, kind: "title", text: "词战" },
    ],
  },
];

/** 总时长（秒） */
export const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

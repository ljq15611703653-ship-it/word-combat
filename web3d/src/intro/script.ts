// 开场演出分镜脚本（纯数据）。想改字、改时长、挂音频、改锁定标注，只改这个文件即可。
// 故事来源：教程（src/campaign/levels.ts）的世界观——「词战」里不靠手速、靠拼一句话；
// 词牌是零件、句子是招式；词师阿词在训练场教新人，对手从稻草人开始；时间轴上谁先出手谁先落下；
// 并/续/择/血四个职业。叙事形式：玩家戴上智能眼镜，系统启动，看见这座夜城（界面只是叠在世界上的 HUD 信息元素）。
// 开场结束后，教程第一关由阿词接一句「欢迎来到词战。」。说话人写在 who 里；旁白不填 who。

/** 画面场景 id（对应 scenes.ts 里的绘制函数） */
export type SceneId = "boot" | "city" | "words" | "hacker" | "mentor" | "timeline" | "families" | "assemble";

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

/** HUD 目标锁定框。坐标用逻辑画面 1280x720 的像素 */
export interface Lock {
  at: number; dur: number;
  x: number; y: number; w: number; h: number;
  label: string; info?: string;
  /** 颜色，不写 = HUD 主色（青） */
  color?: string;
}

export interface Shot {
  id: string;
  scene: SceneId;
  /** 本镜头时长（秒） */
  dur: number;
  /** 画面说明（给改稿的人看，程序不用） */
  note: string;
  /** 右上角读数里显示的「扫描模式」文字 */
  mode: string;
  lines: Line[];
  locks?: Lock[];
  /** 镜头开始时切换的 BGM id（不写 = 沿用上一首；写 "" = 停止） */
  bgm?: string;
  /** 镜头内按时间点触发的音效 */
  sfx?: { at: number; id: string }[];
}

const R = "#ff4560", C = "#19e6ff", G = "#3cff9a", A = "#ffb02e";

export const SHOTS: Shot[] = [
  {
    id: "S0", scene: "boot", dur: 5, mode: "启动中",
    note: "黑屏，智能眼镜开机自检文字逐行出现，最后画面从中心亮开",
    bgm: "intro_boot",
    sfx: [{ at: 0.2, id: "boot_beep" }, { at: 3.0, id: "boot_ok" }, { at: 3.4, id: "rain_loop" }],
    lines: [{ at: 3.4, dur: 1.5, text: "戴上它，才看得见这座城。" }],
  },
  {
    id: "S1", scene: "city", dur: 8, mode: "环境扫描",
    note: "夜晚雨街，霓虹招牌闪烁，镜头缓缓推进；准星锁定招牌；标题字出现",
    bgm: "intro_theme",
    sfx: [{ at: 0.4, id: "neon_buzz" }, { at: 2.4, id: "lock_on" }],
    locks: [{ at: 2.4, dur: 4.6, x: 500, y: 232, w: 150, h: 90, label: "招牌 · 词库", info: "距离 212m", color: C }],
    lines: [
      { at: 0.6, dur: 3.2, kind: "title", text: "夜城" },
      { at: 3.8, dur: 4, text: "雨一直下，霓虹一直亮。" },
    ],
  },
  {
    id: "S2", scene: "words", dur: 9, mode: "词牌追踪",
    note: "行人头顶飞出发光的词牌，在雨里升向夜空",
    sfx: [{ at: 0.3, id: "glass_shatter" }, { at: 4.8, id: "glitch_hit" }],
    locks: [{ at: 1.8, dur: 3, x: 250, y: 330, w: 170, h: 190, label: "词牌 · 信号", info: "检测到 14 张", color: A }],
    lines: [
      { at: 0.4, dur: 4.2, text: "在这里，没人靠手速分胜负。" },
      { at: 4.8, dur: 4, text: "招式，是一句话。" },
    ],
  },
  {
    id: "S3", scene: "hacker", dur: 9, mode: "目标识别",
    note: "黑客（黑客立绘）立在霓虹前，词牌「选择 敌方 造成」逐张落下、连成一条线",
    bgm: "intro_theme",
    sfx: [{ at: 1.2, id: "tile_snap" }, { at: 2.4, id: "tile_snap" }, { at: 3.6, id: "tile_snap" }, { at: 6.4, id: "cast" }],
    locks: [{ at: 1.0, dur: 8, x: 780, y: 100, w: 330, h: 580, label: "黑客 · 友方", info: "距离 3.2m", color: G }],
    lines: [
      { at: 0.4, dur: 3.2, text: "每一张词牌，都是一个零件。" },
      { at: 3.8, dur: 2.4, text: "选择、敌方、造成——" },
      { at: 6.4, dur: 2.4, text: "拼在一起，就是一招。" },
    ],
  },
  {
    id: "S4", scene: "mentor", dur: 10, mode: "训练场",
    note: "暗巷里的训练场，稻草人立在霓虹下；扫描锁定稻草人；全息影像亮起，词师阿词现身",
    bgm: "",
    sfx: [{ at: 1, id: "heartbeat" }, { at: 3.6, id: "lock_on" }, { at: 5.2, id: "holo_on" }, { at: 8.2, id: "glitch_hit" }],
    locks: [
      { at: 3.6, dur: 1.6, x: 440, y: 180, w: 400, h: 440, label: "稻草人", info: "HP 2 · 4.1m", color: R },
      { at: 7.0, dur: 3, x: 235, y: 200, w: 290, h: 360, label: "稻草人", info: "HP 2 · 4.1m", color: R },
      { at: 6.2, dur: 3.8, x: 725, y: 150, w: 310, h: 310, label: "词师 · 阿词", info: "身份已确认", color: C },
    ],
    lines: [
      { at: 0.4, dur: 4.2, text: "巷子深处，有人在等新来的学徒。" },
      { at: 5.6, dur: 2.4, who: "词师 · 阿词", text: "新来的？站稳了。" },
      { at: 8.2, dur: 1.8, who: "词师 · 阿词", text: "别怕，它只是个稻草人。" },
    ],
  },
  {
    id: "S5", scene: "timeline", dur: 8, mode: "时间轴",
    note: "时间轴：我方与敌方的句子按起手秒数排好，游标扫过，逐句落下",
    bgm: "intro_danger",
    sfx: [{ at: 1.6, id: "hit" }, { at: 2.9, id: "hit" }, { at: 4.4, id: "heal" }, { at: 5.9, id: "hit" }],
    lines: [
      { at: 0.4, dur: 3.6, text: "每一秒，双方各说一句。" },
      { at: 4.2, dur: 3.6, text: "先出手的先落下，倒下的人，话也落空。" },
    ],
  },
  {
    id: "S6", scene: "families", dur: 6.5, mode: "职业档案",
    note: "四个职业依次亮起：并（青）、续（绿）、择（琥珀）、血（赤红）",
    bgm: "intro_theme",
    sfx: [{ at: 0.6, id: "tile_snap" }, { at: 1.6, id: "tile_snap" }, { at: 2.6, id: "tile_snap" }, { at: 3.6, id: "tile_snap" }],
    lines: [
      { at: 0.4, dur: 3.4, text: "并、续、择、血——四种流派，四种拼法。" },
      { at: 4, dur: 2.3, who: "词师 · 阿词", text: "先学基础，再选你的路。" },
    ],
  },
  {
    id: "S7", scene: "assemble", dur: 9.5, mode: "拼句",
    note: "词牌飞来，拼成第一句「选择 1 敌方 造成 1」，锁定，闪光，标题《词战》；之后接教程第一关阿词的「欢迎来到词战」",
    bgm: "intro_resolve",
    sfx: [{ at: 1.2, id: "tile_snap" }, { at: 1.9, id: "tile_snap" }, { at: 2.6, id: "tile_snap" }, { at: 3.3, id: "tile_snap" }, { at: 4, id: "tile_snap" }, { at: 4.6, id: "lock_on" }, { at: 5, id: "title_hit" }],
    locks: [{ at: 4.4, dur: 0.9, x: 60, y: 250, w: 1160, h: 170, label: "语句 · 已完成", info: "5 张词牌", color: G }],
    lines: [
      { at: 0.3, dur: 4, who: "词师 · 阿词", text: "来，我们先拼第一句。" },
      { at: 5.6, dur: 3.6, kind: "title", text: "词战" },
    ],
  },
];

/** 总时长（秒） */
export const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);

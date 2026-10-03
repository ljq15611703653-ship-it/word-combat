// 全局配色：蓝绿主调，红/蓝只表示阵营，血量用薄荷绿/琥珀，HUD 白只表示「正在操作」。
// 风格开关：默认新风格（赛博朋克街道 + 义体底座）；?style=classic 回到旧的绿色电路板。
export const STYLE: "neo" | "classic" =
  typeof location !== "undefined" && new URLSearchParams(location.search).get("style") === "classic" ? "classic" : "neo";
const NEO = STYLE === "neo";

export const C = NEO ? {
  void: 0x04060d,        // 夜空最深处
  fog: 0x0b1226,         // 街道尽头的雾
  pcb: 0x0a0f1c,
  trace: 0x3d6bff,       // 钴蓝霓虹
  traceDim: 0x1a2f78,
  glass: 0xa9d8ff,       // 全息卡面的染色
  copper: 0xb9a37c,      // 铜色接口
  silver: 0xc4ccd6,
  hp: 0x3dffa6,
  hpLow: 0xffb238,
  hit: 0xffffff,
  incoming: 0xffa62b,
  hud: 0xeaf6ff,
  side: { b: 0x2fd8ff, r: 0xff4f6a } as Record<"b" | "r", number>,
} : {
  void: 0x020d0c,        // 场景最深处
  fog: 0x03201c,
  pcb: 0x04211d,         // 电路板底色
  trace: 0x1fd6b4,       // 走线
  traceDim: 0x0c5a4c,
  glass: 0x7ff5df,       // 玻璃卡体的染色
  copper: 0xc9a46a,      // 焊盘、引脚
  silver: 0xcfd8d6,
  hp: 0x3dffa6,
  hpLow: 0xffb238,
  hit: 0xffffff,
  incoming: 0xffa62b,   // 这一轮将要掉的血：橙黄警示色，和阵营红蓝、健康绿都不撞
  hud: 0xe9fffb,
  side: { b: 0x2fd8ff, r: 0xff5a6e } as Record<"b" | "r", number>,
};

export const CSS = {
  hp: "#3dffa6",
  hpLow: "#ffb238",
  trace: NEO ? "#3d6bff" : "#1fd6b4",
  side: (NEO ? { b: "#2fd8ff", r: "#ff4f6a" } : { b: "#2fd8ff", r: "#ff5a6e" }) as Record<"b" | "r", string>,
};

export const FONT_NUM = '"Chakra Petch", "JetBrains Mono", monospace';
export const FONT_CN = '"Noto Sans SC", "PingFang SC", sans-serif';

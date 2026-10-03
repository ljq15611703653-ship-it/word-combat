// 全局配色：蓝绿主调，红/蓝只表示阵营，血量用薄荷绿/琥珀，HUD 白只表示「正在操作」。
export const C = {
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
  trace: "#1fd6b4",
  side: { b: "#2fd8ff", r: "#ff5a6e" } as Record<"b" | "r", string>,
};

export const FONT_NUM = '"Chakra Petch", "JetBrains Mono", monospace';
export const FONT_CN = '"Noto Sans SC", "PingFang SC", sans-serif';

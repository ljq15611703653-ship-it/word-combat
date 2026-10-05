// 职业风格：先只是配色 + 徽章 + 立绘目录 + 随从名字，规则暂不分职业（职业规则开关之后再接）
export interface StyleDef {
  id: string; name: string; tag: string; accent: string; accent2: string; glyph: string;
  /** public/duanju/art/<artDir>/battle_idle.png */
  artDir: string;
  names: [string, string, string];
  deckPreset: string;
}
export const STYLES: StyleDef[] = [
  { id: "bing", name: "并流", tag: "一句话接几段，连环出手", accent: "#ff4fa3", accent2: "#7df9ff", glyph: "并", artDir: "bing", names: ["连枝", "叠码", "疾并"], deckPreset: "cls-bing" },
  { id: "yin", name: "引用流", tag: "把前几轮的量当数字用", accent: "#22e6ff", accent2: "#a98bff", glyph: "引", artDir: "yin", names: ["回声", "账本", "快读"], deckPreset: "cls-quote" },
  { id: "xian", name: "限制流", tag: "不得/收紧：做了就疼", accent: "#9a7bff", accent2: "#ff4fa3", glyph: "限", artDir: "xian", names: ["禁言", "封条", "断路"], deckPreset: "cls-limit" },
  { id: "zhuang", name: "状态流", tag: "灼烧易伤衰弱，慢慢磨", accent: "#3dffb0", accent2: "#22e6ff", glyph: "状", artDir: "zhuang", names: ["烛火", "裂纹", "迟滞"], deckPreset: "cls-state" },
];
export const styleOf = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];
export const TIER_DESC: Record<string, string> = {
  入门: "只会朴素的攻击/治疗/减伤，偶尔失手",
  普通: "会用连环、并、减伤、无视这类攻防词",
  进阶: "会用限制、状态、定时、引用等整套手册",
  大师: "看得更远，几乎不失误",
};

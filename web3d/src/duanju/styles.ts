import type { Cls } from "./engine/params";
// 职业风格：配色 + 徽章 + 立绘目录 + 随从名字，规则暂不分职业（职业规则开关之后再接）
export interface StyleDef {
  /** 引擎职业（配色组 = 职业，三者一致：引擎 cls、推荐卡组 deckPreset、演出风格 data-style） */
  cls: Cls;
  id: string; name: string; tag: string; accent: string; accent2: string; glyph: string;
  /** public/duanju/art/<artDir>/battle_idle.png */
  artDir: string;
  /** 按站位（0/1/2）单独指定立绘目录（剧情主角用）；缺省用 artDir */
  unitArt?: [string, string, string];
  names: [string, string, string];
  deckPreset: string;
}
export const STYLES: StyleDef[] = [
  { id: "bing", cls: "并" as Cls, name: "「并」组", tag: "一句话接几段，连环出手", accent: "#ff4fa3", accent2: "#7df9ff", glyph: "并", artDir: "bing_ci", unitArt: ["bing_ci", "bing_shu", "bing_su"], names: ["连枝", "叠码", "疾并"], deckPreset: "cls-bing" },
  { id: "yin", cls: "引用" as Cls, name: "「引用」组", tag: "把前几轮的量当数字用", accent: "#22e6ff", accent2: "#a98bff", glyph: "引", artDir: "yin_ci", unitArt: ["yin_ci", "yin_shu", "yin_su"], names: ["回声", "账本", "快读"], deckPreset: "cls-quote" },
  { id: "xian", cls: "限制" as Cls, name: "「不得」组", tag: "不得/收紧：做了就疼", accent: "#9a7bff", accent2: "#ff4fa3", glyph: "限", artDir: "xian_ci", unitArt: ["xian_ci", "xian_shu", "xian_su"], names: ["禁言", "封条", "断路"], deckPreset: "cls-limit" },
  { id: "zhuang", cls: "状态" as Cls, name: "「状态」组", tag: "灼烧易伤衰弱，慢慢磨", accent: "#3dffb0", accent2: "#22e6ff", glyph: "状", artDir: "zhuang_ci", unitArt: ["zhuang_ci", "zhuang_shu", "zhuang_su"], names: ["烛火", "裂纹", "迟滞"], deckPreset: "cls-state" },
];
export const styleOf = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];
export const TIER_DESC: Record<string, string> = {
  入门: "只会朴素的攻击/治疗/减伤，偶尔失手",
  普通: "会用连环、并、减伤、无视这类攻防词",
  进阶: "会用限制、状态、定时、引用等整套手册",
  大师: "看得更远，几乎不失误",
};

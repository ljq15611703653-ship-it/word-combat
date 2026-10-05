// 职业天赋 / 限制的说明文字：全部读引擎参数（P2/P）生成，不手写数值。规则切换后（configureRules）重新调用即可。
import { P, P2, type Cls } from "./engine/api";

export interface TalentText { talent: string; limit: string }
export function talentOf(cls: Cls): TalentText {
  const st = Math.max(0, P2.STATUS_AP - P2.ST_AP_MINUS);
  switch (cls) {
    case "并":
      return {
        talent: `每多接一段（并/连环）只加 ${P2.AND_BING} 点行动点（别的职业加 ${P.AND}），起手也不因段数变晚`,
        limit: `一句里同一个动作词只能用一次${P2.SEGCAP ? `，最多 ${P2.SEG_BING} 段` : ""}`,
      };
    case "引用":
      return {
        talent: `「全程」半价；每种引用词（次数/累计等）多带 ${P2.REF_PLUS} 张，当轮用完不能再用、下一轮立刻恢复`,
        limit: "一句里最多一个引用量词（累计/次数/词数/段数）",
      };
    case "限制":
      return {
        talent: `「不得」的惩罚 +${P2.FORBID_PLUS}；「以后N轮/之前N句」的窗口数字和「至多」次数不占数字牌`,
        limit: `攻击句单次伤害最多 ${P2.CAP_LIM}（引用量算出来的也截到 ${P2.CAP_LIM}）`,
      };
    case "状态":
      return {
        talent: `状态词（灼烧/易伤/衰弱）只花 ${st} 点行动点（别的职业 ${P2.STATUS_AP}）${P2.ST_LVL_PLUS ? `；新挂上的状态初始级别 +${P2.ST_LVL_PLUS}` : ""}`,
        limit: "同一轮对同一个目标只能挂一种状态",
      };
  }
}

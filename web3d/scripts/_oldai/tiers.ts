// 自动同步自 lab2/tiers.ts（scripts/sync-engine.mjs），请勿手改；补丁见 PATCHES.md
/* eslint-disable */
// @ts-nocheck
// 难度分级：四档电脑。区别 = 会的句子 + 看多远 + 会不会故意走错。真人打电脑不限时。
import { AI_DEFAULT, type AiCfg } from "./ai";
export const TIERS: Record<string, AiCfg> = {
  入门: { ...AI_DEFAULT, mode: "basic", depth: 1, k: 4, blunder: 0.3, recBonus: 0 },
  普通: { ...AI_DEFAULT, mode: "plain", depth: 1, k: 6, blunder: 0.12 },
  进阶: { ...AI_DEFAULT, mode: "playbook", depth: 2, k: 8, blunder: 0.04 },
  大师: { ...AI_DEFAULT, mode: "playbook", depth: 3, k: 12, blunder: 0 },
};
export const TIER_NAMES = Object.keys(TIERS);

// REAL 配置：把 lab2 的规则一键调成和真实引擎（web3d/src/engine，全灭模式）一致。
// 来源：rules.ts 的 W / TIMELINE / AND_COST / BASE_COST / FLOOR，match.ts 的开局与每轮流程，engine.ts 的结算。
// 用法：
//   1. 实验脚本里：  import { useReal } from "./realprofile"; useReal();           // 直接改 P / P2 / 词表
//   2. 工作进程：    task.rules = realRules()                                   // worker.ts 的 applyRules
//   3. 沿用 OUT 目录约定：  OUT=D:/wc/out_real node --import tsx src/lab2/analyze.ts   // 自动读 rules.json / rules2.json
//   重新生成 json：  node --import tsx src/lab2/realprofile.ts [目录，默认 D:/wc/out_real]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { applyRules, type Rules } from "./params";

/** LAB（lab/rules.ts 的 P） */
export const REAL_LAB: Record<string, unknown> = {
  HP: 6,                                   // 每个随从 6 点生命（共 18）            rules.ts W.HP
  AP0: 5, APINC: 4, APCAP: 10,             // 行动点开局 5、每轮 +4、上限 10          W.AP_START / AP_INCOME / AP_CAP
  HEAT_FROM: 3,                            // 过热第 3 轮起；每轮每随从受 (轮数−2) 点  W.HEAT_FROM（interp 里 hd = rnd − 2）
  ROUNDS: 12, TL: 10,                      // MAX_ROUNDS、TIMELINE
  BASE: 1, AND: 2,                         // BASE_COST 1、并（多一段）AND_COST 2
  WIND_CL: 1, WIND_N: 0,                   // 起手 = 1 + 词数 + 段数 − 1，与数字大小无关
  CARDS0: [],                              // 开局没有数字牌（成长阶梯、骰子没移植）
  SCHEDULE: { 3: [2], 5: [3], 7: [4] },    // 保底数字牌：第 3、5、7 轮各发一张 2、3、4（FLOOR）
  EXACT: true,                             // 数字 v 要一张面值正好是 v 的牌（pickCards）
  REMOVE: 1,                               // 移除 1 点
};
/** LAB2（params.ts 的 P2） */
export const REAL_LAB2: Record<string, unknown> = {
  REDIR: 1, POSTPONE: 1, KW: 1, STAUTO: 1, RMREAL: 1, REP: 1, ORDER: 1, KOCHECK: 1, COSTREAL: 1, MITHIT: 1, STRICT_TG: 1,
  FIZZLE: 1,                               // 出手的随从先倒下，这句落空
  AP_REDIR: 2, AP_POST: 1, STATUS_AP: 1,   // 转移 2、延后 1、状态词 1
  WIND_WORD: 1,                            // 每个词类段（状态/转移/延后/移除）起手晚 1 秒
  AOE: 0,                                  // 真实里选多个目标不加行动点（只占数字牌）
};

export const realRules = (): Rules => ({ P: REAL_LAB, P2: REAL_LAB2 });

/** 读目录里的 real.json（没有就用内置的）；LAB / LAB2 两份 */
export function loadReal(dir = process.env.REAL_DIR ?? "D:/wc/out_real"): { LAB: Record<string, unknown>; LAB2: Record<string, unknown> } {
  const f = dir + "/real.json";
  if (existsSync(f)) { const j = JSON.parse(readFileSync(f, "utf8")); return { LAB: j.LAB, LAB2: j.LAB2 }; }
  return { LAB: REAL_LAB, LAB2: REAL_LAB2 };
}
/** 一键打开：先恢复默认（含环境变量里的覆盖），再套 REAL。extra 可以再叠新设计的参数 */
export function useReal(extra: Rules = {}, dir?: string) {
  const { LAB, LAB2 } = loadReal(dir);
  applyRules({ P: { ...LAB, ...(extra.P ?? {}) }, P2: { ...LAB2, ...(extra.P2 ?? {}) }, ADV: extra.ADV });
}
export function writeReal(dir = "D:/wc/out_real") {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "/real.json", JSON.stringify({ LAB: REAL_LAB, LAB2: REAL_LAB2 }, null, 1));
  writeFileSync(dir + "/rules.json", JSON.stringify(REAL_LAB));     // 沿用 OUT 目录约定：analyze/evolve 等读它们
  writeFileSync(dir + "/rules2.json", JSON.stringify(REAL_LAB2));
}
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("lab2/realprofile.ts")) { writeReal(process.argv[2]); console.log("已写入", process.argv[2] ?? "D:/wc/out_real"); }

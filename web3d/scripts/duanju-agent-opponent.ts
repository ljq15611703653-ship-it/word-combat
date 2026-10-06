/**
 * 子 agent 的对手策略：冷面审判官。
 *
 * 固定使用「限制」职业。她优先把“攻击 / 治疗 / 任意词”变成有代价的选择，
 * 再利用来源伤害和低血集火结束对局。策略只调用公开的候选、推演和宣告接口，
 * 不读取隐藏卡组，也不修改引擎状态。
 */
import type { Side } from "../src/duanju/engine/ast";
import type { St } from "../src/duanju/engine/interp";
import { think, TIERS, type Ai2Cfg } from "../src/duanju/engine/ai2";
import type { Rng } from "../src/duanju/engine/gen";
import type { Mover } from "./duanju-ai-lib";

export const opponentName = "冷面审判官·墨律";
export const opponentClass = "限制" as const;

/** 17/18 格：两张不得负责持续压迫，收紧/至多提高触发质量，移除拆关键挂件。 */
export const opponentDeck: Record<string, number> = {
  不得: 2,
  收紧: 2,
  至多: 2,
  移除: 1,
};

const JUDGE_CFG: Ai2Cfg = {
  ...TIERS["大师"],
  // 100 局对打需要约上千次决策；两轮推演配合回应检查已经能识别集火与反杀，
  // 同时避免把一次实验拖成数十分钟。
  k: 14,
  depth: 2,
  w: [1, 0.72],
  mode: "playbook",
  blunder: 0,
  wAp: 0.2,
  wCard: 0.7,
  recBonus: 4.2,
  reply: 6,
};

/**
 * 个性原则：宁可少打一轮，也要让对手下一句变贵；残局则服从三轮推演直接斩杀。
 * ai2 的大师回应检查会把对方剩余随从的集火反击计入选择，因此不会只看句面华丽度。
 */
export const opponentMover: Mover = (s: St, side: 0 | 1, r: Rng) =>
  think(s, side, r, JUDGE_CFG);

export default opponentMover;

type Decl = {
  round?: number;
  rnd?: number;
  side: number;
  unit?: number;
  text?: string;
  start?: number;
  advanced?: string[];
};

type DuelGame = {
  index?: number;
  rounds?: number;
  round?: number;
  hp?: number[];
  win?: number;
  winner?: number | string;
  outcome?: string;
  opponentOutcome?: string;
  opponentSide?: Side;
  agentSide?: Side;
  declarations?: Decl[];
  history?: Decl[];
};

const totalHp = (hp: number[], us: number[]) =>
  us.reduce((n, u) => n + Math.max(0, Number(hp[u] ?? 0)), 0);

function resultFor(game: DuelGame, side: Side): "胜" | "负" | "平" | "未决" {
  if (game.opponentOutcome) {
    if (game.opponentOutcome === "win") return "胜";
    if (game.opponentOutcome === "lose") return "负";
    if (game.opponentOutcome === "draw") return "平";
  }
  const w = typeof game.win === "number" ? game.win :
    typeof game.winner === "number" ? game.winner : undefined;
  if (w !== undefined) return w === 2 ? "平" : w === side ? "胜" : "负";
  // 对局记录通常以主 agent（0 方）的视角保存 outcome；本策略默认是 1 方。
  if (game.outcome === "draw") return "平";
  if (game.outcome === "win") return side === 0 ? "胜" : "负";
  if (game.outcome === "lose") return side === 0 ? "负" : "胜";
  return "未决";
}

function short(text: string | undefined) {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  return s.length > 72 ? s.slice(0, 70) + "……" : s;
}

/**
 * 逐局复盘。只引用记录里真实存在的末轮宣告、终局血量和胜负；不把“使用了不得”
 * 臆测成“不得一定触发”。side 可由跑局器显式传入，省略时读取记录，最后才默认 1 方。
 */
export function agentDebrief(game: DuelGame, explicitSide?: Side): string {
  const side = explicitSide ?? game.opponentSide ?? game.agentSide ?? 1;
  const mine = side === 0 ? [0, 1, 2] : [3, 4, 5];
  const foe = side === 0 ? [3, 4, 5] : [0, 1, 2];
  const hp = Array.isArray(game.hp) && game.hp.length >= 6 ? game.hp : [0, 0, 0, 0, 0, 0];
  const declarations = (game.declarations ?? game.history ?? []).filter((d) => d && typeof d.side === "number");
  const rounds = Number(game.rounds ?? game.round ?? Math.max(0, ...declarations.map((d) => Number(d.round ?? d.rnd ?? 0))));
  const lastRound = Math.max(0, ...declarations.map((d) => Number(d.round ?? d.rnd ?? 0)));
  const myLast = declarations.filter((d) => d.side === side && Number(d.round ?? d.rnd ?? 0) === lastRound).at(-1);
  const foeLast = declarations.filter((d) => d.side !== side && Number(d.round ?? d.rnd ?? 0) === lastRound).at(-1);
  const result = resultFor(game, side);
  const myHp = totalHp(hp, mine), foeHp = totalHp(hp, foe);
  const myAlive = mine.filter((u) => (hp[u] ?? 0) > 0).length;
  const foeAlive = foe.filter((u) => (hp[u] ?? 0) > 0).length;
  const myLine = myLast ? `我方末轮最后宣告「${short(myLast.text)}」（${myLast.start ?? "?"}秒）` : "我方末轮没有有效宣告";
  const foeLine = foeLast ? `对方末轮最后宣告「${short(foeLast.text)}」（${foeLast.start ?? "?"}秒）` : "对方末轮没有有效宣告";

  let diagnosis: string;
  if (result === "胜") {
    diagnosis = foeAlive === 0
      ? "终局清空对方三人，压制已经兑现为击杀。"
      : `终局仍有${foeAlive}名对手站立，胜负来自记录中的结算条件，不能只按剩余血量解释。`;
  } else if (result === "负") {
    diagnosis = myAlive === 0
      ? "我方三人全倒，说明禁令与拆句没有及时换成生存或斩杀。"
      : `我方尚有${myAlive}人但仍判负，需要按该局结算条件复查，不能归因成单纯血量劣势。`;
  } else if (result === "平") {
    diagnosis = "双方在同一结算窗口结束，最后两句的起手秒与过热次序是复盘重点。";
  } else {
    diagnosis = "记录没有明确胜者，因此只陈述可核对的末轮行动与血量。";
  }

  return `第${game.index ?? "?"}局我方${result}，共${rounds}轮；终局我方${myHp}血/${myAlive}人，对方${foeHp}血/${foeAlive}人。${myLine}；${foeLine}。${diagnosis}`;
}

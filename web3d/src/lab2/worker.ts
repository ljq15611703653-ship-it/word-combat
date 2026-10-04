// 评估工作进程：收到一批对局任务，逐局打完，回传结果
import { playGame } from "./arena";
import { sentenceText, type Sentence } from "./ast";
import type { Deck } from "./params";
import { AI_DEFAULT, type AiCfg } from "./ai";

export interface Task { id: number; a: Deck; b: Deck; seed: number; first: 0 | 1; rec?: boolean; cfg?: AiCfg }
export interface Out { id: number; win: -1 | 0 | 1 | 2; rounds: number; stats: Record<string, number>; shapes?: [Record<string, number>, Record<string, number>] }
const shape = (cl: Sentence) => sentenceText(cl).replace(/\d+(?=级|轮|句|次|条)/g, "N").replace(/随从\d/g, "随从").replace(/\d+/g, "N");
process.on("message", (m: { tasks: Task[] }) => {
  const out: Out[] = m.tasks.map((t) => {
    const g = playGame(t.a, t.b, t.seed, t.first, t.cfg ?? AI_DEFAULT, !!t.rec);
    let shapes: Out["shapes"];
    if (t.rec && g.rec) { shapes = [{}, {}]; for (const x of g.rec) { const k = shape(x.cl); shapes[x.side][k] = (shapes[x.side][k] ?? 0) + 1; } }
    return { id: t.id, win: g.win, rounds: g.rounds, stats: g.stats, shapes };
  });
  process.send!({ out });
});

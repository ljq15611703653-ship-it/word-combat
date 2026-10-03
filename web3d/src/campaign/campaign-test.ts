// 命令行测试：脚本按 Guide 自动点每一步，打通每一关并断言胜利。运行：npx tsx src/campaign/campaign-test.ts
import { LEVELS } from "./levels";
import { Session, describe } from "./session";
declare const process: { exit(n: number): never };
const MUST: Record<number, [string, (e: any) => boolean][]> = {
  1: [["造成伤害", (e) => e.type === "hit" && e.dealt > 0], ["稻草人倒下", (e) => e.type === "ko" && e.tgt === 3]],
  3: [["治疗", (e) => e.type === "heal"], ["弓手的招落空", (e) => e.type === "fizzle"]],
  4: [["减伤挡掉伤害", (e) => e.type === "hit" && e.parts["减伤"] === 3]],
  5: [["灼烧", (e) => e.type === "burn"], ["易伤", (e) => e.type === "hit" && e.vuln >= 2], ["衰弱", (e) => e.type === "hit" && e.parts["衰弱"] > 0]],
  6: [["先倒下的落空", (e) => e.type === "fizzle"]],
  7: [["转移", (e) => e.type === "redirected"]],
  8: [["被推出时间轴", (e) => e.type === "fizzle" && e.why.includes("推出")]],
  9: [["移除", (e) => e.type === "remove"]],
  10: [["并流两段都生效", (e) => e.type === "chain" && e.all]],
  11: [["续自动再来", (e) => e.type === "fire" && e.cont]],
  12: [["择流定目标", (e) => e.type === "lock"]],
  13: [["用血付行动点", (e) => e.type === "blood"]],
};
import { loadProgress, markDone, saveProgress, unlocked } from "./progress";
let fail = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { fail++; console.log("  ✗ " + msg); } };

for (const lv of LEVELS) {
  const S = new Session(lv);
  let steps = 0, free = 0, rounds = 0;
  const log: string[] = [];
  // 引导强制：第一步点错必须被拒绝
  if (S.guided) {
    const wrong = S.M.remaining[0].find((u) => u !== (S.expect() as any).uid);
    const e0 = S.expect();
    if (wrong !== undefined) check(S.clickUnit(wrong) !== "", `${lv.title}: 点错随从应被拒绝`);
    else check(S.clickPass(S.M.remaining[0][0]) !== "" || e0.k === "pass", `${lv.title}: 引导期不能直接不出手`);
  }
  while (S.stage !== "over" && steps < 800) {
    const e = S.expect();
    if (e.k === "free") free++;
    if (e.k === "next") rounds++;
    const err = S.autoStep();
    steps++;
    if (err) { check(false, `${lv.title}: 第 ${S.M.rnd} 轮 ${describe(S, e)} 失败：${err}`); break; }
  }
  check(S.foeErrors.length === 0, `${lv.title}: 对手脚本出错 ${S.foeErrors.join("；")}`);
  check(S.stage === "over", `${lv.title}: 没有在步数内结束（轮 ${S.M.rnd}，阶段 ${S.stage}）`);
  for (const [name, f] of MUST[lv.id] ?? []) check(S.history.some(f), `${lv.title}: 教学事件没发生：${name}`);
  check(S.won, `${lv.title}: 没有获胜（winner=${S.M.winner}）`);
  if (!lv.full) check(free === 0, `${lv.title}: 有 ${free} 步没有引导覆盖`);
  console.log(`${S.won ? "✓" : "✗"} 第 ${lv.id} 关 ${lv.title}：${S.M.rnd} 轮，${steps} 步${free ? `，自由 ${free} 步` : ""}${log.join("")}`);
}
// 通关记录：存取、保留最少轮数、按顺序解锁
{
  const mem: Record<string, string> = {};
  const st = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } };
  let p = loadProgress(st);
  check(unlocked(p, 1) && !unlocked(p, 2), "初始只解锁第 1 关");
  p = markDone(p, 1, 5); p = markDone(p, 1, 3); p = markDone(p, 1, 4);
  saveProgress(p, st);
  p = loadProgress(st);
  check(p.done[1].rounds === 3 && unlocked(p, 2) && !unlocked(p, 3), "通关记录：保留最少轮数、解锁下一关");
  check(Object.keys(loadProgress({ getItem: () => "坏数据", setItem: () => undefined }).done).length === 0, "损坏的记录当作没有");
}
console.log(fail ? `\n失败 ${fail} 项` : `\n全部 ${LEVELS.length} 关通过`);
process.exit(fail ? 1 : 0);

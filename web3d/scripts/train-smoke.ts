// 四职业特训冒烟：每一关按教学步骤（脚本关）/ solution（开放关）自动通关；另检查「全程不出手」不会赢、玩家句子符合职业限制。
// 运行：node scripts/train-smoke.mjs   （V=1 打印每步；L=bing-3 只跑一关）
import { readFileSync } from "node:fs";
import { Match, configureRules, setUnitNames, sentenceText } from "../src/duanju/engine/api";
import { TrainSession, type Training, type TrainLevel } from "../src/duanju/story/train/session";
import { tokensToAst, diagnose } from "../src/duanju/composer/grammar";
import { windupFor } from "../src/duanju/engine/interp";
import { matchSentence } from "../src/duanju/story/teach/spec";
import type { Step } from "../src/duanju/story/teach/session";
import type { Sentence } from "../src/duanju/engine/ast";

const T: Training = JSON.parse(readFileSync("public/duanju/story/training.json", "utf8"));
const only = process.env.L;
const CLS: Record<string, any> = { bing: "并", quote: "引用", limit: "限制", state: "状态" };   // 与 STYLES 里的 cls 一致；对手职业：状态流关用限制，其余用状态（见 train-content 的 foeStyle）
const errs: string[] = [];
(globalThis as any).__storyErr = (e: string) => errs.push(e);

// 职业限制（lab2 的 classProblem，引擎同步后会生效；这里先自检，保证同步后这些句子仍然合法）
const QW = ["累计", "次数", "词数", "段数"];
function actionWord(c: any): string {
  switch (c.k) { case "act": return c.eff.verb; case "status": return c.kind; case "redirect": return "转移"; case "postpone": return "延后"; case "remove": case "strip": return "移除"; case "ignore": return "无视"; case "cash": return "兑现"; case "delay": return "定时"; default: return c.forbid ? "不得" : c.q?.win?.dir === "after" ? (c.judge === "absent" ? "不存在" : "每当") : "若"; }
}
function classProblem(cl: Sentence, cls: string, toks: string[]): string {
  if (cls === "bing") { const seen = new Set<string>(); for (const c of cl) { const w = actionWord(c); if (seen.has(w)) return "并流:同一动作词只能用一次"; seen.add(w); } }
  if (cls === "quote") { if (toks.filter((t) => QW.includes(t)).length > 1) return "引用流:最多一个引用量词"; }
  if (cls === "limit") { for (const c of cl as any[]) if (c.k === "act" && c.eff.verb === "dmg" && typeof c.eff.n === "number" && c.eff.n > 4) return "限制流:单次伤害不能超过 4"; }
  return "";
}
function statusClash(decls: Sentence[]): string {   // 状态流：同一轮对同一目标只能一种状态
  const k = new Map<number, string>();
  for (const cl of decls) for (const c of cl as any[]) if (c.k === "status") for (const u of c.tg.t === "unit" ? [c.tg.u] : c.tg.t === "units" ? c.tg.us : []) { const o = k.get(u); if (o && o !== c.kind) return "状态流:同轮同目标只能一种状态"; k.set(u, c.kind); }
  return "";
}

function play(lv: TrainLevel, idle: boolean) {
  const cur = { base: { rules: T.base.rules, me: T.classes.find((c) => c.id === lv.cls)!.names }, beats: [lv.beat] } as any;
  const beat = JSON.parse(JSON.stringify(lv.beat)); if (process.env.MEHP) for (const u of beat.me.units) beat.me.hp = { ...(beat.me.hp ?? {}), [u]: +process.env.MEHP };
  const ses = new TrainSession(beat as any, cur);
  const st = ses.settings();
  configureRules("custom", st.customRules);
  setUnitNames(cur.base.me, beat.foeNames as [string, string, string]);
  const m = new Match({ first: st.first === "me" ? 0 : 1, myDeck: {}, tier: st.tier, cls: [CLS[lv.cls], CLS[lv.cls === "state" ? "limit" : "state"]], seed: beat.seed, foeDeck: ses.foeDeck() });
  ses.setup(m);
  const log: string[] = []; const tag = `[${lv.id}${idle ? " idle" : ""}]`;
  let guard = 0; const roundDecls: Sentence[] = []; let lastRnd = 0;
  while (!m.over() && guard++ < 600) {
    if (m.rnd !== lastRnd) { lastRnd = m.rnd; roundDecls.length = 0; }
    const w = m.who();
    if (w === -1) {
      const ev = m.resolve();
      log.push(`r${m.rnd} hp[${m.s.hp.join(",")}] ap[${m.s.side[0].ap},${m.s.side[1].ap}] ${ev.filter((e) => e.type !== "fire").map((e) => e.type + (e.amount || "") + (e.src >= 0 ? ":" + e.src : "") + ">" + e.tgt).join(" ")}`);
      if (!m.over()) m.nextRound();
    } else if (w === 1) { ses.foeMove(m) ?? m.aiMove(); }
    else {
      if (idle) { m.passRest(); continue; }
      let steps: Step[] = ses.pending(m);
      if (beat.open) steps = (beat.solution?.[Math.min(m.rnd, beat.solution.length) - 1]?.steps ?? []).filter((s) => m.canAct(s.unit));
      const step = steps[0];
      if (!step) { m.passRest(); continue; }
      let cl: Sentence | null = null; let toks: string[] = [];
      if (step.words) { toks = step.words; cl = tokensToAst(toks); if (!cl) { errs.push(`${tag} r${m.rnd} u${step.unit}: 词序列拼不成句 ${toks.join(" ")}`); m.pass(step.unit); continue; } }
      else {
        const c = m.legalSentences(step.unit, 400).filter((x) => ses.allowed(m, step.unit)(x.cl) && (!step.want || matchSentence(x.cl, step.want)))[0];
        if (!c) { errs.push(`${tag} r${m.rnd} u${step.unit}: 没有符合的句子`); m.pass(step.unit); continue; }
        cl = c.cl;
      }
      const start = Math.max(windupFor(cl, step.unit, m.s), step.startMin ?? 1);
      const err = ses.check(step.unit, cl, start, m);
      if (err) { errs.push(`${tag} r${m.rnd} u${step.unit}: check 拒绝 ${err}（${sentenceText(cl)} @${start}）`); m.pass(step.unit); continue; }
      const cp = classProblem(cl, lv.cls, toks) || (lv.cls === "state" ? statusClash([...roundDecls, cl]) : "");
      if (cp) errs.push(`${tag} r${m.rnd} u${step.unit}: 职业限制 ${cp}（${toks.join(" ")}）`);
      if (!m.declare(step.unit, cl, start)) { errs.push(`${tag} r${m.rnd} u${step.unit}: declare 失败：${diagnose(cl, { s: m.s, side: 0, unit: step.unit } as any) ?? "?"} ｜ ${toks.join(" ")}`); m.pass(step.unit); continue; }
      roundDecls.push(cl);
      if (process.env.TALENT === "1" && lv.cls === "limit") { for (const sd of m.s.stand as any[]) if (sd.c?.forbid && sd.owner === 0 && !sd._p) { sd._p = 1; sd.c.effs[0].n += 1; } }   // 模拟限制流天赋：不得惩罚 +1
      log.push(`  我 u${step.unit}: ${sentenceText(cl)} @${start} ap${m.s.side[0].ap}`);
    }
  }
  const allDead = [3, 4, 5].every((u) => m.s.hp[u] <= 0);
  return { out: m.outcome() === "win" && !allDead ? "超时判胜(未全灭)" : m.outcome(), rnd: m.rnd, log };
}

let bad = 0;
for (const lv of T.levels) {
  if (only && lv.id !== only) continue;
  const r = play(lv, false);
  const idle = play(lv, true);
  const ok = r.out === "win" && idle.out !== "win";   // win 必须是全灭
  if (!ok) bad++;
  console.log(`${lv.id} ${lv.name}: ${r.out} 轮${r.rnd} | 不出手:${idle.out}${idle.out === "win" ? " (太简单!)" : ""} ${ok ? "OK" : "FAIL"}`);
  if (!ok || process.env.V) console.log(r.log.join("\n"));
  if (process.env.IDLE) console.log("IDLE:\n" + idle.log.join("\n"));
}
for (const e of errs) console.log("ERR", e);
console.log(bad || errs.length ? `问题：${bad} 关失败，${errs.length} 条错误` : "全部通过");
process.exit(bad || errs.length ? 1 : 0);

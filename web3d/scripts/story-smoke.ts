// 引擎级冒烟：按引导步骤自动通关节拍 1~9（脚本关），10~14 用电脑代打验证能跑完不卡死。
// 运行：node scripts/story-smoke.mjs
import { readFileSync } from "node:fs";
import { Match, configureRules, setUnitNames } from "../src/duanju/engine/api";
import { TeachSession, type Curriculum } from "../src/duanju/story/teach/session";
import { tokensToAst, diagnose } from "../src/duanju/composer/grammar";
import { windupFor } from "../src/duanju/engine/interp";
import { sentenceText } from "../src/duanju/engine/api";
import { matchSentence } from "../src/duanju/story/teach/spec";

const cur: Curriculum = JSON.parse(readFileSync("public/duanju/story/curriculum.json", "utf8"));
const errs: string[] = [];
(globalThis as any).__storyErr = (e: string) => errs.push(e);
let bad = 0;
for (const beat of cur.beats) {
  const ses = new TeachSession(beat, cur);
  const st = ses.settings();
  configureRules("custom", st.customRules);
  setUnitNames(beat.meNames ?? cur.base.me as [string, string, string], beat.foeNames as [string, string, string]);
  const m = new Match({ first: st.first === "me" ? 0 : 1, myDeck: {}, tier: st.tier, seed: beat.seed, foeDeck: ses.foeDeck() });
  ses.setup(m);
  const log: string[] = [];
  let guard = 0;
  while (!m.over() && guard++ < 400) {
    const w = m.who();
    if (w === -1) {
      const ev = m.resolve();
      log.push(`r${m.rnd} hp[${m.s.hp.join(",")}] ev${ev.length} ${ev.map((e: any) => e.type + (e.amount ?? e.n ?? "")).join(" ")}`);
      if (!m.over()) m.nextRound();
    } else if (w === 1) {
      const mv = ses.foeMove(m) ?? m.aiMove();
      void mv;
    } else if (ses.scripted) {
      if (ses.allyMove(m)) continue;
      const pend = ses.pending(m);
      let done = false;
      for (const step of pend) {
        if (step.words) {
          // 固定词序列的步骤：按词牌拼出整句（和玩家拖拽拼出的是同一棵语法树）
          const cl = tokensToAst(step.words);
          if (!cl) { errs.push(`beat${beat.beat} r${m.rnd} unit${step.unit}: 词序列拼不成句 ${step.words.join(" ")}`); m.pass(step.unit); done = true; break; }
          const start = Math.max(windupFor(cl, step.unit, m.s), step.startMin ?? 1);
          const err = ses.check(step.unit, cl, start, m);
          if (err) { errs.push(`beat${beat.beat} r${m.rnd} unit${step.unit}: check 拒绝 ${err} (${step.words.join(" ")} @${start})`); m.pass(step.unit); done = true; break; }
          if (!m.declare(step.unit, cl, start)) { errs.push(`beat${beat.beat} r${m.rnd}: declare 失败：${diagnose(cl, { s: m.s, side: 0, unit: step.unit } as any) ?? "?"} ｜ ${step.words.join(" ")}`); m.pass(step.unit); done = true; break; }
          log.push(`  我 u${step.unit}: ${sentenceText(cl)} @${start}`);
          done = true; break;
        }
        const cands = m.legalSentences(step.unit, 400).filter((c) => ses.allowed(m, step.unit)(c.cl) && (!step.want || matchSentence(c.cl, step.want)));
        const c = cands[0];
        if (!c) { errs.push(`beat${beat.beat} r${m.rnd} unit${step.unit}: 没有符合的句子 want=${JSON.stringify(step.want)}`); m.pass(step.unit); done = true; break; }
        const start = Math.max(c.minStart, step.startMin ?? 1);
        const err = ses.check(step.unit, c.cl, start, m);
        if (err) { errs.push(`beat${beat.beat} r${m.rnd} unit${step.unit}: check 拒绝 ${err} (${c.text} @${start})`); m.pass(step.unit); done = true; break; }
        if (!m.declare(step.unit, c.cl, start)) { errs.push(`beat${beat.beat} r${m.rnd}: declare 失败 ${c.text}`); m.pass(step.unit); }
        log.push(`  我 u${step.unit}: ${c.text} @${start}`);
        done = true; break;
      }
      if (!done) {
        // 脚本轮之外 / 没有步骤：自由——有可用的进攻就打，否则不出手
        const us = m.myUnits().filter((u) => m.canAct(u));
        if (!us.length) { m.passRest(); continue; }
        const u = us[0];
        const c = m.legalSentences(u, 400).find((x) => ses.allowed(m, u)(x.cl) && x.kind === "进攻");
        if (c && ses.inScript(m) === false && m.declare(u, c.cl, c.minStart)) log.push(`  自由 u${u}: ${c.text}`); else m.pass(u);
      }
    } else {
      m.autoMyMove();
    }
  }
  const out = m.outcome();
  const ok = scriptedOk(beat.beat, out);
  function scriptedOk(b: number, o: string | null) { return b <= 13 ? o === "win" : o !== null; }
  if (!ok) bad++;
  console.log(`beat ${beat.beat} ${beat.name}: ${out} 轮数${m.rnd} ${ok ? "OK" : "FAIL"}`);
  if (!ok || process.env.V) console.log(log.join("\n"));
}
for (const e of errs) console.log("ERR", e);
console.log(bad || errs.length ? `问题：${bad} 关失败，${errs.length} 条错误` : "全部通过");
process.exit(bad || errs.length ? 1 : 0);

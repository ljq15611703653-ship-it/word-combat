// 随机“真人”：只用拼句台的选项一张张拼句，检查拼出来的句子都能被引擎接受；顺便跑完整局。
import { Match } from "./match";
import { Composer } from "./composer";
import { CLASSES, presetDeck } from "./rules";
import { assignLate } from "./ai";
declare const process: { argv: string[] };
const n = +(process.argv[2] ?? 40);
let sentences = 0, rejected = 0, gamesDone = 0;
const errs: Record<string, number> = {};
const pickRand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
for (let g = 0; g < n; g++) {
  const c0 = CLASSES[g % 4], c1 = CLASSES[(g * 3 + 1) % 4];
  const m = new Match();
  m.start(presetDeck(c0), presetDeck(c1), 100 + g, true, false);
  let guard = 0;
  while (m.phase !== "over" && guard++ < 3000) {
    if (m.phase === "declare") {
      const s = m.declareSide();
      if (s === -1) { m.resolveRound(); continue; }
      if (s === 1) { m.aiStep(); continue; }
      const uid = pickRand(m.remaining[0]) as number;
      const cmp = new Composer(m, uid, 0);
      for (let i = 0; i < 40; i++) {
        const op = cmp.options();
        const pr = op.parsed;
        if (pr.complete && Math.random() < 0.4) break;
        if (op.num) {
          const vals = [1, ...Object.keys(m.usableValues(0)).map(Number)];
          if (cmp.freeCount()) vals.push(2, 3);
          const v = pickRand(vals);
          if (!cmp.addNumber(v)) cmp.addNumber(1);
        } else {
          const ok = op.words.filter((w) => w.ok);
          if (!ok.length) break;
          cmp.addWord(pickRand(ok).w);
        }
      }
      const cl = cmp.finish();
      let act = null;
      if (cl) {
        for (const c of cl) {
          if (c.tmode === "self") c.tg = [uid];
          else if (c.k === "delay") { const e = m.declared.filter((a: any) => a.side === 1); if (!e.length) { act = "bad"; break; } c.act = pickRand(e).ord; }
          else if (c.tmode !== "late") {
            const pool = m.R.U.filter((u: any) => u.down === -1 && ((u.side === 1) === (c.side === "enemy"))).map((u: any) => u.uid);
            c.tg = pool.slice(0, c.count);
          }
        }
        if (act !== "bad") {
          const ms = Math.max(...[cmp.costInfo().allLate ? 1 : 1]);
          void ms;
          const r = m.buildAction(0, uid, cl, 10);
          sentences++;
          if (r.err) { rejected++; errs[r.err] = (errs[r.err] ?? 0) + 1; m.submit(0, uid, null); }
          else m.submit(0, uid, r.act!);
          continue;
        }
      }
      m.submit(0, uid, null);
    } else if (m.phase === "assign") { assignLate(m, 0); m.finishAssign(); }
    else if (m.phase === "resolved") m.nextRound();
  }
  if (m.phase === "over") gamesDone++;
}
console.log(`局 ${gamesDone}/${n} 句 ${sentences} 被引擎拒绝 ${rejected}`);
console.log(errs);

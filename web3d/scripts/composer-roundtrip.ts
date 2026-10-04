// 往返测试：astToTokens → tokensToAst 必须与原 AST 规范化等价；nextLegal 与 canAfford 一致。
// 用法：node node_modules/tsx/dist/cli.mjs scripts/composer-roundtrip.ts [局数=60]
import { walk } from "./composer-corpus";
import { astToTokens, tokensToAst, normAst, Unsupported, nextLegal, tokenLabel } from "../src/duanju/composer/grammar";
import { canAfford, windupFor } from "../src/duanju/engine/interp";
import { P } from "../src/duanju/engine/api";
const N = +(process.argv[2] ?? 60);
let total = 0, okRT = 0; const bad = new Map<string, { n: number; ex: string }>();
const seen = new Set<string>();
let nlSent = 0, nlOk = 0, nlMiss = 0, nlEndMismatch = 0, nlTokChecked = 0; const missEx: string[] = [];
const shape = new Map<string, number>();
const t0 = Date.now();
walk(N, ({ m, unit, cands }) => {
  for (const cl of cands) {
    const key = JSON.stringify(cl); if (seen.has(key + m.rulesKind)) continue; seen.add(key + m.rulesKind);
    total++;
    let toks: string[];
    try { toks = astToTokens(cl); } catch (e) { const k = e instanceof Unsupported ? e.message : "异常:" + String(e); const b = bad.get(k) ?? { n: 0, ex: JSON.stringify(cl) }; b.n++; bad.set(k, b); continue; }
    const back = tokensToAst(toks);
    if (back && normAst(back) === normAst(cl)) okRT++; else { const k = "往返不等价"; const b = bad.get(k) ?? { n: 0, ex: toks.join(" ") + "  ||  " + JSON.stringify(cl) }; b.n++; bad.set(k, b); }
    cl.forEach((c) => shape.set(c.k + (c.k === "when" ? (c.forbid ? ":forbid" : ":" + c.q.win.dir) : ""), (shape.get(c.k + (c.k === "when" ? (c.forbid ? ":forbid" : ":" + c.q.win.dir) : "")) ?? 0) + 1));
    // nextLegal：每个前缀的下一个词都必须被放行（可宣告的句子）；整句末尾 canEnd 与 canAfford 一致
    if (windupFor(cl, unit, m.s) > P.TL) continue;
    if (nlSent >= 3000) continue;
    nlSent++;
    const ctx = { s: m.s, side: 0 as const, unit };
    let all = true;
    for (let i = 0; i < toks.length; i++) {
      const L = nextLegal(toks.slice(0, i), ctx);
      nlTokChecked++;
      if (!L.ok.has(toks[i])) { all = false; if (missEx.length < 12) missEx.push(`${toks.slice(0, i).join(" ")} [${toks[i]}] 被拒：${L.why.get(toks[i])}`); break; }
    }
    if (all) {
      nlOk++;
      const L = nextLegal(toks, ctx);
      if (!L.canEnd) { nlEndMismatch++; if (missEx.length < 12) missEx.push(`整句 ${toks.join(" ")} 不能结束：${L.endWhy}`); }
    } else nlMiss++;
  }
}, { k: 70 });
console.log(`候选句 ${total} 条（去重），往返等价 ${okRT}（${((okRT / total) * 100).toFixed(2)}%），用时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log("子句类型分布", Object.fromEntries(shape));
for (const [k, v] of bad) console.log(`  不支持/不等价「${k}」×${v.n}  例：${v.ex.slice(0, 300)}`);
console.log(`nextLegal：抽查 ${nlSent} 句，全程放行 ${nlOk}，被拒 ${nlMiss}，整句末尾 canEnd 与 canAfford 不一致 ${nlEndMismatch}（共查 ${nlTokChecked} 个前缀）`);
missEx.forEach((x) => console.log("  ", x));
process.exit(okRT / total >= 0.995 && nlMiss === 0 && nlEndMismatch === 0 ? 0 : 1);

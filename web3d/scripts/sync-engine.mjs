// 同步规则引擎：lab2（D:/wc/nc_lab）→ web3d/src/duanju/engine/。规则变了重跑：node scripts/sync-engine.mjs
// 只拷纯逻辑文件；拷贝后做几处机械补丁（见 engine/PATCHES.md），补丁对不上会直接报错，提醒你更新这个脚本。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = process.env.LAB_DIR ?? "D:/wc/nc_lab/web3d/src";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/duanju/engine");
mkdirSync(OUT, { recursive: true });
const FILES = ["ast", "interp", "params", "gen", "playbook", "ai", "tiers", "deck", "arena"];
const ENVSHIM = '(((globalThis as any).process?.env) ?? {})';
let bad = 0;
const must = (name, src, from, to) => {
  if (!src.includes(from)) { console.error(`!! 补丁没对上 ${name}: ${from.slice(0, 70)}`); bad++; return src; }
  return src.replace(from, to);
};

const header = (f) => `// 自动同步自 ${f}（scripts/sync-engine.mjs），请勿手改；补丁见 PATCHES.md\n/* eslint-disable */\n// @ts-nocheck\n`;
const fix = (t) => t.replace(/"\.\.\/lab\/rules"/g, '"./lab-rules"').replace(/process\.env/g, ENVSHIM).replace(/typeof process !== "undefined" && /g, "");

for (const f of FILES) {
  let t = readFileSync(`${LAB}/lab2/${f}.ts`, "utf8");
  t = fix(t);
  if (f === "interp") {
    t = must(f, t, "export const sideOf = ", `/** [补丁 T1] 结算追踪：duanju/engine/api.ts 用它生成回放事件 */
export let TRACE: ((e: any) => void) | null = null;
export function setTrace(fn: ((e: any) => void) | null) { TRACE = fn; }
const TR = (e: any) => { if (TRACE) TRACE(e); };
export const sideOf = `);
    t = must(f, t, 'if (d > 0) emit(s, { sord: r.sord, side: sideOf(u), kind: "hurt"', 'if (d > 0) TR({ t: "hit", u, amt: d, src: r.actor, sec: s.sec }); if (d > 0) emit(s, { sord: r.sord, side: sideOf(u), kind: "hurt"');
    t = must(f, t, "if (d > 0) { ok = true; stat(s, `s${owner}:healed`, d);", 'if (d > 0) { TR({ t: "heal", u, amt: d, src: r.actor, sec: s.sec }); ok = true; stat(s, `s${owner}:healed`, d);');
    t = must(f, t, "else { s.sh[u] += base; ok = true; }", 'else { s.sh[u] += base; ok = true; TR({ t: "shield", u, amt: base, src: r.actor, sec: s.sec }); }');
    t = must(f, t, "if (!P2.MITHIT) s.sh[u] -= ab;", 'if (ab > 0) TR({ t: "absorb", u, amt: ab, src: r.actor, sec: s.sec }); if (!P2.MITHIT) s.sh[u] -= ab;');
    t = must(f, t, "    stat(s, `s${owner}:status`);", '    TR({ t: "status", u, kind: c.kind, src: r.actor, sec: s.sec }); stat(s, `s${owner}:status`);');
    t = must(f, t, 'emit(s, { sord, side: sideOf(u), kind: "down"', 'TR({ t: "down", u, src, sec: s.sec }); emit(s, { sord, side: sideOf(u), kind: "down"');
    t = must(f, t, "st.from = d.start; st.active = true;", 'st.from = d.start; st.active = true; TR({ t: "standing", u: d.unit, c: st.c, side: d.side, sec: d.start });');
    t = must(f, t, "lastSec = j.d.start; s.sec = j.d.start; j.d.fired = true;", 'lastSec = j.d.start; s.sec = j.d.start; j.d.fired = true; TR({ t: "fire", u: j.d.unit, side: j.d.side, ord: j.d.ord, sec: j.d.start });');
    t = must(f, t, "const hd = s.rnd - 2;", 'const hd = s.rnd - 2; TR({ t: "heat", amt: hd, sec: P.TL + 1 });');
  }
  writeFileSync(`${OUT}/${f}.ts`, header(`lab2/${f}.ts`) + t);
}
let r = fix(readFileSync(`${LAB}/lab/rules.ts`, "utf8"));
writeFileSync(`${OUT}/lab-rules.ts`, header("lab/rules.ts") + r);

// 参数：rules.json = P，rules2.json = P2（含 ADVO）。applyRules 要 {P, P2, ADV}
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const toRules = (P, P2) => { const { ADVO, ...rest } = P2; return { P, P2: rest, ADV: ADVO ?? {} }; };
const OUTD = process.env.RULES_DIR ?? "D:/wc/out";
const RD = process.env.REAL_DIR ?? "D:/wc/out_real";
// 默认 = 断·句配置（out_real/duanju.json：真实规则 + 数字牌充裕 + 三个位置 + 新词）+ 目标在宣告时就定（玩家点选目标）
const dj = J(`${RD}/duanju.json`);
writeFileSync(`${OUT}/rules.default.json`, JSON.stringify(toRules(dj.LAB, { ...dj.LAB2, TGT_AT_DECL: 1 }), null, 1));
// 旧配置（out/rules.json + rules2.json）保留为「旧版」
writeFileSync(`${OUT}/rules.legacy.json`, JSON.stringify(toRules(J(`${OUTD}/rules.json`), J(`${OUTD}/rules2.json`)), null, 1));
// 纯 REAL（out_real/real.json）
const rl = J(`${RD}/real.json`);
writeFileSync(`${OUT}/rules.real.json`, JSON.stringify(toRules(rl.LAB, { TGT_AT_DECL: 1, ...rl.LAB2 }), null, 1));

// 卡组词表 / 推荐配置（D:/wc/deckbuilder/words.js）
const wj = await import(pathToFileURL("D:/wc/deckbuilder/words.js").href);
writeFileSync(`${OUT}/deck-words.json`, JSON.stringify({ presets: wj.PRESETS, words: wj.WORDS.map((w) => ({ name: w.name, area: w.area, max: w.max, cat: w.cat, desc: w.desc, example: w.example })), cats: wj.CATEGORIES }, null, 1));
console.log(bad ? `完成，但有 ${bad} 处补丁没对上` : "同步完成 →", OUT);
process.exit(bad ? 1 : 0);

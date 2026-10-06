// 同步规则引擎：lab2（D:/wc/nc_lab）→ web3d/src/duanju/engine/。规则变了重跑：node scripts/sync-engine.mjs
// 只拷纯逻辑文件；拷贝后做几处机械补丁（见 engine/PATCHES.md），补丁对不上会直接报错，提醒你更新这个脚本。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyGamePatch } from "./engine-game-patch.mjs";

const LAB = process.env.LAB_DIR ?? "D:/wc/nc_lab/web3d/src";
const OUT = process.env.ENGINE_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), "../src/duanju/engine");
mkdirSync(OUT, { recursive: true });
const FILES = ["ast", "interp", "params", "gen", "playbook", "ai", "tiers", "deck", "arena"];
const ENVSHIM = '(((globalThis as any).process?.env) ?? {})';
let bad = 0;
const must = (name, src, from, to) => {
  if (!src.includes(from)) { console.error(`!! 补丁没对上 ${name}: ${from.slice(0, 70)}`); bad++; return src; }
  return src.replace(from, to);
};

const header = (f) => `// 自动同步自 ${f}（scripts/sync-engine.mjs），请勿手改；补丁见 PATCHES.md\n/* eslint-disable */\n// @ts-nocheck\n`;
const fix = (t) => t.split(String.fromCharCode(13)).join("").replace(/"\.\.\/lab\/rules"/g, '"./lab-rules"').replace(/process\.env/g, ENVSHIM).replace(/typeof process !== "undefined" && /g, "");

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
  // ---- 游戏专有补丁（T2/T4/S1，见 PATCHES.md）
  if (f === "ast") {
    t = must(f, t, 'any: "任意词" };', 'any: "任意词", dealt: "造成的伤害", taken: "受到的伤害" };');   // T2
  }
  if (f === "params") {
    t = must(f, t, `  AOE: 1,`, `  DICE: 0,                    // [补丁 T4] 己方随从被击倒：投 d6，得到一张该点数的一次性数字牌（默认规则 1）
  AOE: 1,`);
  }
  if (f === "gen") {   // S1：去掉「全体」目标，多目标写「选择N个」
    t = must(f, t, '{ t: "allMe" } : { t: "unit", u: pick(e.r, e.mine) }', '{ t: "some", n: 2, side: "me" } : { t: "unit", u: pick(e.r, e.mine) }');
    t = must(f, t, 'heal(num(e, 3), { t: "allMe" }) : shield(num(e, 3), { t: "allMe" })', 'heal(num(e, 3), { t: "some", n: 2, side: "me" }) : shield(num(e, 3), { t: "some", n: 2, side: "me" })');
  }
  if (f === "playbook") {   // S1
    t = t.replace(/allMe: Tg = \{ t: "allMe" \}/g, 'allMe: Tg = { t: "some", n: 2, side: "me" }');
    t = must(f, t, 'add("爽·饱和攻击(敌方全体各2)", act(dmg(2, { t: "allFoe" })));', 'add("爽·饱和攻击(选择2个敌方各2)", act(dmg(2, { t: "some", n: 2, side: "foe" })));');
    t = must(f, t, 'add("爽·饱和攻击(全体各3)", act(dmg(3, { t: "allFoe" })));', 'add("爽·饱和攻击(选择3个敌方各3)", act(dmg(3, { t: "some", n: 3, side: "foe" })));');
  }
  if (f === "interp") {   // T4 击倒投骰
    t = must(f, t, `  stats: Record<string, number>;
`, `  stats: Record<string, number>;
  rs: number;                                        // [补丁 T4] 引擎种子随机数状态（骰子用，Match 构造时由 seed 定）
`);
    t = must(f, t, "win: -1, stats: {},", "win: -1, stats: {}, rs: 0x9e3779b9,");
    t = must(f, t, "function koNow(", `/** [补丁 T4] 己方随从倒下：投 d6（走 s.rs，可复现），得到一张该点数的一次性数字牌 */
export function rollDown(s: St, u: number) {
  if (!P2.DICE) return;
  s.rs = (s.rs + 0x6D2B79F5) >>> 0;
  let t = s.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const v = 1 + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 6);
  s.side[sideOf(u)].cards.push({ v, cd: 0, once: true });
  stat(s, \`s\${sideOf(u)}:dice\`);
  TR({ t: "dice", u, roll: v, side: sideOf(u), sec: s.sec });
}
function koNow(`);
    t = must(f, t, `s.hp[u] = 0; s.dead[u] = true; s.redir[u] = false;
`, `s.hp[u] = 0; s.dead[u] = true; s.redir[u] = false; rollDown(s, u);
`);
    t = must(f, t, `s.side[side].cards[i].cd = 2;
`, `s.side[side].cards[i].cd = 2;
  s.side[side].cards = s.side[side].cards.filter((c) => !(c.once && c.cd > 0));   // 一次性牌：用掉就消失
`);
    t = must(f, t, "if (s.hp[u] <= 0) { s.dead[u] = true; s.redir[u] = false; s.stand", "if (s.hp[u] <= 0) { s.dead[u] = true; s.redir[u] = false; rollDown(s, u); s.stand");
  }
  if (f === "deck") {}
  writeFileSync(`${OUT}/${f}.ts`, applyGamePatch(f, header(`lab2/${f}.ts`) + t));
}
let r = fix(readFileSync(`${LAB}/lab/rules.ts`, "utf8"));
r = must("lab-rules", r, "export interface Card { v: number; cd: number }", "export interface Card { v: number; cd: number; once?: boolean }   // once = 一次性牌（骰牌）：用掉就消失，不冷却");
writeFileSync(`${OUT}/lab-rules.ts`, header("lab/rules.ts") + r);

// 参数：rules.json = P，rules2.json = P2（含 ADVO）。applyRules 要 {P, P2, ADV}
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const toRules = (P, P2) => { const { ADVO, ...rest } = P2; return { P, P2: rest, ADV: ADVO ?? {} }; };
const OUTD = process.env.RULES_DIR ?? "D:/wc/out";
const RD = process.env.REAL_DIR ?? "D:/wc/out_real";
// 默认 = 最终定稿（out_final2/duanju_final.json）+ 目标在宣告时定（玩家点选）+ 职业开启 + 击倒投骰（游戏专有）
const FINAL = process.env.FINAL_RULES ?? "D:/wc/out_final2/duanju_final.json";
const fj = J(FINAL);
writeFileSync(`${OUT}/rules.default.json`, JSON.stringify(toRules(fj.LAB, { ...fj.LAB2, TGT_AT_DECL: 1, CLASSES: 1, DICE: 1 }), null, 1));
// 教程规则：同默认，但职业关（教程完全不提职业）
writeFileSync(`${OUT}/rules.tutorial.json`, JSON.stringify(toRules(fj.LAB, { ...fj.LAB2, TGT_AT_DECL: 1, CLASSES: 0, DICE: 1 }), null, 1));
// 对照用：不带骰子的最终规则（与模拟器逐局比较用）
writeFileSync(`${OUT}/rules.final-nodice.json`, JSON.stringify(toRules(fj.LAB, { ...fj.LAB2, TGT_AT_DECL: 1, CLASSES: 1 }), null, 1));
const dj = J(`${RD}/duanju.json`);
// 旧配置（out/rules.json + rules2.json）保留为「旧版」
writeFileSync(`${OUT}/rules.legacy.json`, JSON.stringify(toRules(J(`${OUTD}/rules.json`), J(`${OUTD}/rules2.json`)), null, 1));
// 纯 REAL（out_real/real.json）
const rl = J(`${RD}/real.json`);
writeFileSync(`${OUT}/rules.real.json`, JSON.stringify(toRules(rl.LAB, { TGT_AT_DECL: 1, ...rl.LAB2 }), null, 1));

// 卡组词表 / 推荐配置（D:/wc/deckbuilder/words.js）
const wj = await import(pathToFileURL("D:/wc/deckbuilder/words.js").href);
const EX = { "我方最低血 减伤3": "选择2个我方随从 减伤3", "2轮后：对敌方最低血 造成 对方攻击词次数×2": "2轮后：对选择的敌方随从 造成 对方攻击词次数×2" };   // S1：示例里不出现「最低血」
const words = wj.WORDS.map((w) => ({ name: w.name, area: w.area, max: w.max, cat: w.cat, desc: w.desc, example: EX[w.example] ?? w.example }));
words.push({ name: "断言", area: 3, max: 2, cat: "limit", desc: "未来窗口只判断一次：成立执行奖励，不成立执行否则。先写我方/对方只数指定方；先写以后N句数双方，再筛选。否则只接断言，可写任意合法子句或组合。", example: "断言 对方 以后1句 存在造成 奖励减伤2 否则恢复2" });
const presets = [...wj.PRESETS, { id: "assert", name: "「断言」·攻守分支", deck: { "断言": 2, "减伤": 2, "并": 1, "灼烧": 1, "移除": 1 } }];
writeFileSync(`${OUT}/deck-words.json`, JSON.stringify({ presets, words, cats: wj.CATEGORIES }, null, 1));
console.log(bad ? `完成，但有 ${bad} 处补丁没对上` : "同步完成 →", OUT);
process.exit(bad ? 1 : 0);

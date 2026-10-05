// 电脑 AI 对战评估命令行。用法：node node_modules/tsx/dist/cli.mjs scripts/duanju-ai-eval.ts <vs-old|matrix|tiers|beat14|all> [局数]
import { configureRules, DECK_WORDS } from "../src/duanju/engine/api";
import { TIERS as TIERS_NEW } from "../src/duanju/engine/ai2";
import { aiNew, aiOld, naive, deckOfClass, duel, CLASSES, pct, fmt } from "./duanju-ai-lib";
const PRE = Object.fromEntries(DECK_WORDS.presets.map((p) => [p.id, p.deck]));

const [, , what = "all", nArg = "200"] = process.argv;
const N = +nArg;
configureRules("default");
const CK = Object.keys(CLASSES) as (keyof typeof CLASSES)[];
const t0 = Date.now();
if (what === "vs-old" || what === "all") {
  console.log("== 新 AI vs 旧 AI（同档位，卡组按职业轮换，先后手各半）==");
  for (const tier of ["普通", "进阶", "大师"]) {
    const r = duel(N, (i) => ({ mv: aiNew(tier), deck: deckOfClass(CK[i % 4]) }), (i) => ({ mv: aiOld(tier), deck: deckOfClass(CK[(i >> 2) % 4]) }));
    console.log(`${tier}: 新胜率 ${fmt(r)}`);
  }
  console.log("-- 按新AI职业拆分（大师，对手旧大师，卡组同职业镜像）");
  for (const k of CK) {
    const r = duel(N, () => ({ mv: aiNew("大师"), deck: deckOfClass(k) }), () => ({ mv: aiOld("大师"), deck: deckOfClass(k) }));
    console.log(`  ${k}: ${fmt(r)}`);
  }
}
if (what === "matrix" || what === "all") {
  const ver = process.env.MATRIX_OLD ? "旧" : "新";
  console.log(`== 四职业电脑互打胜率矩阵（${ver} AI 大师，行 vs 列，行方胜率）==`);
  console.log("        " + CK.map((k) => k.padEnd(5, "　")).join(" "));
  for (const a of CK) {
    const row: string[] = [];
    for (const b of CK) {
      const mk = process.env.MATRIX_OLD ? aiOld : aiNew;
      const r = duel(N, () => ({ mv: mk("大师"), deck: deckOfClass(a) }), () => ({ mv: mk("大师"), deck: deckOfClass(b) }), 7);
      row.push(pct(r.rate).padEnd(5, " "));
    }
    console.log(a.padEnd(4, "　") + "  " + row.join("  "));
  }
}
if (what === "tiers" || what === "all") {
  console.log("== 各难度档（电脑）对朴素玩家 AI：电脑胜率；玩家卡组轮换四职业的基础卡组 ==");
  for (const tier of Object.keys(TIERS_NEW)) {
    const rn = duel(N, (i) => ({ mv: aiNew(tier), deck: deckOfClass(CK[i % 4]) }), () => ({ mv: naive, deck: deckOfClass("并") }));
    const ro = duel(N, (i) => ({ mv: aiOld(tier), deck: deckOfClass(CK[i % 4]) }), () => ({ mv: naive, deck: deckOfClass("并") }));
    console.log(`${tier}: 新 ${fmt(rn)}   旧 ${fmt(ro)}`);
  }
}
if (what === "beat14" || what === "all") {
  console.log("== 第 14 关：入门电脑 + quote 卡组（连输两次后 newbie），对朴素玩家 newbie 卡组，朴素玩家胜率 ==");
  for (const fd of ["quote", "newbie"]) {
    const rn = duel(N, () => ({ mv: naive, deck: { ...PRE.newbie } }), () => ({ mv: aiNew("入门"), deck: { ...PRE[fd] } }));
    const ro = duel(N, () => ({ mv: naive, deck: { ...PRE.newbie } }), () => ({ mv: aiOld("入门"), deck: { ...PRE[fd] } }));
    console.log(`电脑卡组 ${fd}: 玩家胜率 新AI ${fmt(rn)}   旧AI ${fmt(ro)}`);
  }
}
console.log(`(${((Date.now() - t0) / 1000).toFixed(0)}s)`);

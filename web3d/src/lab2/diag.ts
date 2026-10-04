import { readFileSync, existsSync } from "node:fs";
if (existsSync("D:/wc/out/rules.json")) process.env.LAB = readFileSync("D:/wc/out/rules.json", "utf8");
if (existsSync("D:/wc/out/rules2.json")) process.env.LAB2 = readFileSync("D:/wc/out/rules2.json", "utf8");
const { playGame } = await import("./arena");
const { AI_DEFAULT } = await import("./ai");
const { sentenceText } = await import("./ast");
const cfg = (mode: "plain" | "playbook") => ({ ...AI_DEFAULT, mode });
const A = { 并: 3, 无视: 2 }, B = { 不得: 1, 并: 2, 易伤: 1, 定时: 1, 次数: 1, 移除: 1 }, C = { 定时: 1, 次数: 1, 累计: 1, 收紧: 2, 移除: 1 };
const D = { 不得: 2, 收紧: 2, 至多: 2, 移除: 1 };
const pairs: [string, any, any, string][] = [["禁令 vs 普攻", D, A, "禁令"]];
for (const [name, d0, d1] of pairs) {
  console.log("==", name);
  let ign = 0, att = 0, games = 12;
  for (let g = 0; g < games; g++) {
    const r = playGame(d0, d1, 7000 + g, (g % 2) as 0 | 1, [cfg("playbook"), cfg("plain")], true);
    for (const x of r.rec ?? []) if (x.side === 1) { const t = sentenceText(x.cl); if (t.includes("无视 长期句子")) ign++; if (t.includes("受伤")) att++; }
    if (g < 2) for (const x of (r.rec ?? []).filter((z) => z.rnd <= 3 && z.side === 1)) console.log(`  g${g} R${x.rnd} B${x.unit}: ${sentenceText(x.cl)}`);
  }
  console.log(`普攻方 ${games} 局：宣告含「无视 长期句子」${ign} 次，含攻击 ${att} 次`);
}

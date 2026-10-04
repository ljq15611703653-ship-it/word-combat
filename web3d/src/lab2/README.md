# lab2：句子规则模拟器（稳定接口，给「打电脑」页的助手用）

## REAL 配置（和真实引擎全灭模式一致）
```ts
import { useReal } from "./realprofile";
useReal();                         // 一键：改 P / P2 / 词表（先恢复默认再套 REAL）
useReal({ P2: { QCAP: 6 } });      // 可叠加新设计的参数
```
- 工作进程：`task.rules = realRules()`（`worker.ts` 会 `applyRules`）。
- 数值/开关来源：`realprofile.ts` 的 `REAL_LAB` / `REAL_LAB2`；json 在 `D:/wc/out_real/`（`real.json`、`rules.json`、`rules2.json`，`node --import tsx src/lab2/realprofile.ts` 重新生成）。
- 对照真实引擎的测试：`node --import tsx src/lab2/realtest.ts`（110 项含模糊）；冒烟：`realsmoke.ts`。

## 开局与关键词
```ts
newGame(first: Side, decks: [Deck|null, Deck|null], record?: boolean, kws?: [string[]|null, string[]|null])
```
`kws` = 每方 3 个关键词（`"首挡" | "不屈"`，按随从序号 0~2 / 3~5）；`randKws(r)`（`deck.ts`）随机选；`P2.KW` 没开时忽略。

## 合法句子生成 API（最终形态）
```ts
candidates(s: St, side: Side, unit: number, r: Rng, k: number, mode: "free" | "plain" | "playbook" | "basic" = "free"): Sentence[]
```
- 返回「现在真的说得出口」的句子（行动点、数字牌、卡组、冷却都够；已经用 `canAfford` 过滤）。`r = mulberry32(seed)`；`k` ≈ 想要的候选数。
- `basic`：只有朴素攻击/治疗/减伤；`plain`：加攻防复杂句；`playbook`：加手册（含转移、延后、关键词组合、拆保护、重复）；`free`：再加语法随机句。
- **`P2.TGT_AT_DECL` 开（REAL 默认开）时，所有句子里的目标都是显式随从**（`unit(u)` 或 `units([..])`，没有 lowFoe/lowMe/全体 这类别名）；`declare(s, side, unit, cl, start)` / `canAfford` 也会把别名自动解析成宣告那一刻的具体随从（`resolveTgs`）。生效时目标已倒下则这一段落空。
- 宣告：`declare(...)` 返回是否成功（起手秒会被提到最早允许的秒；> `P.TL` 失败）；不出手用 `passUnit(s, unit)`；轮次：`resolveRound(s)` → `nextRound(s)`；轮流用 `nextSide(s)`。
- 延后句子的格式：`postpone(ord, n)`，`ord` = 对方那一句的 `s.decl[i].ord`；候选里 N 已是「刚好推出时间轴」的最小值。
- 句子读成中文：`sentenceText(cl)`（显式目标读作「乙方1号词位随从」）。
- 一整局：`playGame(d0, d1, seed, first, cfg, record, kws)`（`arena.ts`）；电脑难度：`tiers.ts`。

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

## 四个职业（P2.CLASSES，默认关；草案见 设计与审计/数字牌模式/新原型报告/职业草案_待审.md）
```ts
import { type Cls } from "./params";          // "并" | "引用" | "限制" | "状态"
newGame(first, decks, record, kws, cls: [Cls|null, Cls|null])   // 每方一个职业；P2.CLASSES 不开则忽略
playGame(d0, d1, seed, first, cfg, record, kws, cls)            // arena.ts；worker 的 Task 也有 cls
```
数值都在 `params.ts` 的 P2（草案默认值，可调）：`SEGCAP/CLAUSE_MAX/SEG_BING/AND_BING/REF_PLUS/FORBID_PLUS/CAP_LIM/ST_AP_MINUS/ST_LVL_PLUS`。
- **并流**：一句最多 7 段（`SEGCAP=1` 时其他职业最多 `CLAUSE_MAX`=3 段；默认没有段数上限）；多一段（并/连环）只加 `AND_BING`=1 点；起手不因段数变晚；限制：一句里同一动作词（造成/恢复/减伤/各状态词/转移/延后/移除/每当/不得…）只能一次（`classProblem`，`canAfford` 拒绝）。
- **引用流**：「全程」半价；自指词每种多 `REF_PLUS`=1 张，用完当轮不能再用、下一轮立刻恢复（不进冷却）；限制：一句最多一个引用量词（累计/次数/词数/段数）。
- **限制流**：「不得」惩罚 +1（写 2 实际 3，不改数字牌需求）；窗口数字（以后/之前 N）与「至多」次数不占数字牌；限制：攻击句写出来的单次伤害 > `CAP_LIM`=3 **不合法**，引用量算出来的数字**取 3**（运行时封顶，因为引用量宣告时还没定）。
- **状态流**：状态词行动点 −1（最低 0）；新挂上的状态初始级别 +1；限制：同一轮对同一目标只能挂一种状态（含本轮已宣告的句子；同种可叠）。
- 拒绝原因计在 `s.stats["s{side}:rej:原因"]`（生成候选时的拒绝次数）；天赋实际发挥计在 `s{side}:t:*`。
- **与三个位置（POS）叠加的优先级**：①职业限制先判（合法性）；②每多一段的底价由职业定（并流 `AND_BING`），位置词位再在其上减 `POS_WORD`（最低 0，可叠加）；③速位的「起手提前」在并流「起手不变晚」之后再减（最低第 1 秒）；④全程半价只算一次（引用流与引用位不叠加）；⑤数位的牌面 +N 在限制流免去窗口数字之后再算；⑥引用位的「引用词不冷却/不限张数」盖过引用流的「多 1 张」。
- 推荐卡组：`deckbuilder/words.js` 的 PRESETS（`cls-bing/quote/limit/state`，均 ≤18 点）。电脑：`playbook.ts` 的 `classExtras` 给对应职业多备几条特长句（不强迫）。
- 职业循环赛：`node --import tsx src/lab2/classbattle.ts [每对局数] [配置]`，结果见 `职业对战_第1版.md`。

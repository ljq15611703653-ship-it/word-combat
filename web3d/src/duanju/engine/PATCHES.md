# 对 lab2 引擎拷贝的补丁（全部由 scripts/sync-engine.mjs 自动施加；lab2 原文件没有被改）

想合回 lab2 的话，只需要 T1。其余是为了在浏览器里跑的机械替换。

## 机械替换（每个文件）
- `"../lab/rules"` 改成 `"./lab-rules"`（lab/rules.ts 同步拷成 engine/lab-rules.ts）
- `process.env` 改成 `(((globalThis as any).process?.env) ?? {})`（浏览器没有 process；ai.ts 里有一处没做 typeof 保护）
- 每个文件头加 `// @ts-nocheck`（lab2 的类型宽松度和 web3d 的 strict + noUnusedLocals 不同，引擎文件不参与类型检查）

## T1  interp.ts 结算追踪（可选 trace 回调）
在 interp.ts 加：`export let TRACE`、`setTrace(fn)`、`TR(e)`；并在这些点调用 TR（不改任何逻辑）：

| 位置 | 事件 |
| --- | --- |
| damage() 里发 hurt 事件前 | {t:"hit", u, amt, src, sec} |
| exec() 治疗 d>0 | {t:"heal", u, amt, src, sec} |
| exec() 减伤 | {t:"shield", u, amt, src, sec} |
| hit() 护盾吸收 ab>0 | {t:"absorb", u, amt, src, sec} |
| applyStatus() | {t:"status", u, kind, src, sec} |
| koNow() | {t:"down", u, src, sec} |
| 长期句子生效 job | {t:"standing", u, c, side, sec} |
| resolveRound 每个 job 开始 | {t:"fire", u, side, ord, sec}（这句话在第 sec 秒开始生效） |
| 过热开始 | {t:"heat", amt, sec} |

原因：Ev 日志里受伤/恢复/倒下没有「目标随从」和「第几秒」，只靠日志无法还原回放。
engine/api.ts 的 Match.resolve() 用 setTrace 收集，再按 sec 稳定排序，过热展开成逐随从的 hit。

## V1（VFX 分支，改的是手写的 api.ts，不是同步拷贝）
- `ReplayEvent` 增加可选字段 `kinds / start / ptgt / pn`（仅 fire 事件）：结算前拷贝 `s.decl`，`clauseKinds()` 列出这句话的动作种类，供 `vfx/` 选演出；延后的目标随从按「对方宣告序第 ord 个」推测。引擎本体与 sync 脚本不变。

## T2（教程分支，手改 ast.ts，同步脚本会覆盖，同步后要补回）
- `OBJ_ZH` 增加 `dealt: "造成的伤害"`、`taken: "受到的伤害"`：引用量词的句子读法里不再出现英文 dealt/taken。

## 2026-10-05 职业同步（duanju-cls 分支）：全部由 sync-engine.mjs 自动施加
- 同步源：lab2 当前版（含职业 Cls/CLASSES、SUM_AP、classProblem、segCap）；默认规则 = D:/wc/out_final2/duanju_final.json + TGT_AT_DECL=1、CLASSES=1、DICE=1（游戏专有）。另生成 rules.tutorial.json（职业关）、rules.final-nodice.json（与模拟器逐局对拍用）。
- T2：ast.ts OBJ_ZH 增 dealt/taken（脚本施加）。
- T3：SUM_AP 已在 lab2，不再补丁。
- T4：击倒投骰（interp.ts St.rs / rollDown / koNow / 过热倒下 / declare 清一次性牌；params.ts DICE；lab-rules.ts Card.once），脚本施加。
- S1：gen.ts / playbook.ts 的 allMe / allFoe 改成 `some`（选择N个），含 classExtras；deck-words.json 示例去掉「最低血」。
- api.ts（手写）：MatchOpts.cls 传给 newGame；composer/grammar.ts diagnose 对齐 canAfford 的职业逻辑。

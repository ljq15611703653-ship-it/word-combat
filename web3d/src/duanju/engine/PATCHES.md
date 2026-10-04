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

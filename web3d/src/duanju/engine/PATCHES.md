# 对 lab2 引擎拷贝的补丁（全部由 scripts/sync-engine.mjs 自动施加；lab2 原文件没有被改）

游戏还包含独立规则补丁；同步时必须保留下面的 T5。

## T5 断言／奖励／否则（游戏专有）

`scripts/duanju-assertion.patch` 保存 ast/interp/params 的规则变更。`sync-engine.mjs` 在旧机械补丁之后通过 `engine-game-patch.mjs` 应用；上下文不一致会报错，不能静默覆盖。更新游戏规则后重新生成这三个文件的差异，并用 `ENGINE_DIR` 指向临时目录验证同步结果，不改 lab2 仓库。

断言只有未来有限窗口；只判一次，成立选奖励，否则选否则。双方下一句与单方下一句由词序决定。两条分支可以包含任意合法子句，按原规则检查职业、目标、数字、词牌及段数；宣告预付两边资源，行动点按较贵分支计。句窗口不足本轮失效；轮窗口末判定。分支创建的定时/长期句从实际选择时开始生效，仍随施法者死亡清除。

验证：`node node_modules/tsx/dist/cli.mjs scripts/duanju-assertion-test.ts`，以及主线、特训冒烟。词表和断言预设也由同步脚本补入，不能只修改生成文件。

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

## 2026-10-06 可读性与实际结算对齐

完整预览修复在游戏覆盖补丁 `scripts/duanju-assertion.patch` 中维护；词牌说明覆盖来自 `scripts/duanju-word-copy.json`，由同步脚本写入 deck-words.json。拼句条灰词在 grammar.ts 与 dock.ts 中维护，不改引擎规则。定时、状态期限、转移余量、移除范围、无视仅防长期伤害、全局宣告编号与每轮触发上限均有真实结算检查。原有“每当不存在＋句窗口”按本轮记录在轮末判断，显示明确提示这一现有行为，未悄悄改成断言语义。

## 2026-10-07 进阶词循环冷却
默认起始数字牌为2、2、2、3；中途补牌不变。进阶词每张使用时进入cd=2，本轮与下一轮不可再用，再下一轮恢复。deck保存可用张数，advCooling保存每张冷却，克隆独立复制。同步脚本在原游戏补丁之后应用engine-cooldown-patch.mjs，避免重新同步丢失改动。引用词已有职业恢复规则保留，骰牌仍为一次性。

## 2026-10-07 逐词入口修复
composer/grammar.ts的补全不再只取第一个动词或目标。枚举必需位置的合法后续，用已有进阶词资源作下界剪枝；搜索达到预算时保留未完成前缀，最终完整句仍严格diagnose。prefix-continuation-test.ts验证并流动作替代、结果链、状态换目标以及非法完整句拒绝；真实指针拖拽五局53条宣告与整句输入一致。

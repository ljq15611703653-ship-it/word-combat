# 载荷板（组牌）

移植自 `D:/wc/deckbuilder`（交互设计不变），接进开局页（`setup.ts` 的「02 卡组与关键词」「03 对手卡组」）。

- `layout.ts` 纯逻辑：占格、吸附、旋转、`autoPack` 精确回溯装箱。
- `shapes.ts` 面积→形状：2→1×2、3→1×3、8→2×4（扩展：1→1×1、4→2×2、5→1×5、6→2×3…）。
- `words.ts` 词表取自引擎当前 `ADV`/`ADV_WORDS`/`P2.BUDGET`（价格=面积，max=张数，随规则配置变）；板子 6 列、行数=ceil(预算/6)。说明/示例/类别/推荐配置/关键词说明在 `data.ts`（来自 deckbuilder words.js；引擎 19 个进阶词全部有说明，deckbuilder 里的「重复」引擎没有，已不收）。
- `board.ts` `DeckBoard` 组件（可多实例）：词库分组折叠、拖入/吸附/R 旋转/Delete 移除、悬停与选中说明、推荐配置、自动排布、复制/导入 JSON（可带 `kws`）、关键词选择器（词位/数位/速位各选 首挡/不屈/随机，不占载荷）、手机竖屏词库抽屉。面积够但被打散时，点词库会自动整体重排。`refreshWords()` 在规则配置变化后重建词表并裁剪卡组。
- 对外：`onChange(deck)` 给标准 `{词: 张数}`；`Settings.deck` 接口不变。

## 设置与对手卡组
`Settings.foe = {mode: random|preset|custom, preset, deck}`。随机 = 每局 `randDeck`；推荐 = 选一套（规则下不合法则回退随机）；自定义 = 第二个 DeckBoard。只在 `battle.ts` 构造 `Match` 时用，战斗界面不显示。职业风格 `deckPreset` 改为 cls-*（并/引用/限制/状态流·推荐）。

## 测试
- 逻辑+穷举：`node node_modules/tsx/dist/cli.mjs scripts/duanju-deck-test.ts`（三套规则下枚举全部合法卡组，按形状多重集去重逐一装箱：default 492996 套/51 种、legacy 264395/61、real 634723/37，装不下 0）。
- 页面冒烟+截图：先起 dev（5183），`node scripts/duanju-deck-shots.mjs 5183 D:/wc/wt_deck_shots`。

## 已知不足
- 面积 4/5/6 及「两个 8 面积」不保证任意组合装得下（引擎里没有这些价格，自定义规则才会碰到）；UI 会提示装不下。
- 触控不能从词库拖入（点击装入），旋转用按钮。
- 对手自定义板与我方板是同一个完整组件，页面较长。

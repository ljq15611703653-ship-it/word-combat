# 断·句 打电脑页 v1（duanju.html）

入口 `web3d/duanju.html`（已加进 vite 多页配置）。旧页面（index/online/campaign/intro/side）不受影响。
一局：开局页（职业风格、卡组、关键词、难度、先后手、规则配置）→ 战斗 → 终局页（胜负、轮数、用过的进阶词、再来一局、导出记录 JSON）。

## 结构
- `engine/`：规则引擎。**`ast/interp/params/gen/playbook/ai/tiers/deck/arena/lab-rules` 是自动同步来的，别手改**。
  - `api.ts` 薄封装：`Match`（谁该动 / aiMove / declare / pass / legalSentences / resolve→回放事件 / hud / unitView / record）、`configureRules`、`setUnitNames`。
  - `PATCHES.md`：对 lab2 拷贝施加的补丁（最重要的是 T1 结算 trace 回调）。
  - `rules.default.json`（= `D:/wc/out_real/duanju.json` + `TGT_AT_DECL:1`）、`rules.legacy.json`（旧 out/rules*.json）、`rules.real.json`（纯 REAL）、`deck-words.json`（deckbuilder 词表与推荐配置）。
- `setup.ts / battle.ts / end.ts / main.ts`：三个页面与入口。`ui.css` 全部样式（含手机竖屏）。
- `layout.css`：战场样式（横版 3v3 + 右侧词牌库 + 霓虹；手机竖屏在文件末尾的 media 里）。`dock.ts`：右边常驻词牌库 + 拖拽拼句（见下）。`cast.ts`：最小结算动画。`art.ts`：背景/立绘路径与占位。`styles.ts`：4 套职业风格。
- `composer/grammar.ts`：词序列 <-> 语法树、nextLegal / prefixWhy（规则没动，拖拽层只是多问「插到第 k 个缝里整句还合不合法」）。

## 战斗界面（横版 3v3，沿用主分支「同伙」布局）
- 我方左、对方右，各一条斜线（前排靠中间靠下，后排靠边靠上），随从有底座，名牌（血条/状态/本轮句子）在头顶。右上小块：轮次/行动点/数字牌；右下小块：操作；中间偏右整条：词牌库。手机竖屏：上面 HUD+操作条，中间对方一排、我方一排，词牌库变底部抽屉，拼句中的句子条浮到抽屉上方。
- 拼句：把词牌从词牌库拖到我方随从头顶的句子条（拖到哪个随从 = 给谁拼）；亮起的缝是能放的位置；句子条里的词拖出去 = 拿掉（后面依赖它的一起掉下来），拖到别的缝 = 换位置；点词牌 = 放到最后一个能放的缝。句子条下方是读法/花费/起手秒/确认。键盘：Backspace 退格、Enter 确认、Esc 取消。「推荐句」从引擎的合法句里挑一句直接填。
- 对手拼句进度显示在对手名牌里（逐词出现 + 光标），对手卡组不显示（只显示数字牌张数）。
- 教程：`BattleHooks.guide(m, u)` 返回 `Guide`（allowed / lockWords / hint），hint 的下一张词牌在词牌库里脉冲，教程气泡指向它（story/teach/guided.ts 生成 Guide）。

## 同步引擎
规则变了：`node scripts/sync-engine.mjs`（lab2 → engine/，改好 import、`process.env` 垫片、打 T1 补丁；补丁对不上会报错退出）。
环境变量：`LAB_DIR`（默认 `D:/wc/nc_lab/web3d/src`）、`RULES_DIR`、`REAL_DIR`。
规则配置页面选项：断·句默认 / 旧版 / 纯REAL / 自定义（粘贴 `{P,P2,ADV}` 或 `{LAB,LAB2}`）。

## 可替换接口（types.ts）
- `Dock`（dock.ts）：`begin(u)` / `push(token)` / `confirm()` / `cancel()` / `setGuide(g)`，测试和教程可程序化驱动；`DockApi` 是它和 Battle 之间的接口。
- `CastPlayer { play(events, view), skip() }`：`events` 是按秒排序的 `ReplayEvent {sec,type,src,tgt,amount,text}`（type：fire/hit/heal/shield/absorb/status/down/standing/heat）；`view: BattleView` 提供 unitEl、setDisplay、float、flash、markDown、banner、clock。结算时引擎状态已是结算后的，演出只改显示用的血量（`disp`），结束后由 Battle 对齐。`Battle.cast` 替换即可。

## 背景与立绘约定
- 背景：`public/duanju/bg/bg_battle.webp`（打电脑）；教程第 N 拍 `bg_NN_*.webp`，用 `art.ts` 的 `backgroundFor("battle" | N)`。缺图回退 CSS 渐变。
- 立绘（之后换 2D Q 版小人）：`public/duanju/art/<artDir>/battle_idle.png`，可选 `battle_cast.png`（宣告/出手时）、`battle_hurt.png`（受击时）；`artDir` 见 styles.ts：bing/yin/xian/zhuang。idle 缺图回退程序生成的矢量剪影（词位肩甲 / 数位胸块 / 速位速度线），cast/hurt 缺图保持 idle。对手一侧自动镜像。
- `scripts/duanju-gen-bg.mjs` 生成占位背景 `placeholder.png`（已不再被页面使用）。

## 测试脚本
- 引擎 headless：`node node_modules/tsx/dist/cli.mjs scripts/duanju-engine-test.ts 200`
- 页面冒烟（先起 dev 在 5199）：`node scripts/duanju-smoke.mjs 5199 10`（URL `?auto=N` = 电脑代打 N 局；`?start=1` 跳过开局页）
- 横版布局截图 + 真实鼠标拖拽：`node scripts/duanju-layout-shots.mjs 5301 D:/wc/duanju_layout_shots`；拖拽拼句冒烟（指针事件，含拖出再拖回）：`node scripts/composer-smoke.mjs 5301 10`；教程端到端（拖拽）：`VIEW=1440x810 QS="unlock=all&fast=1&skip=1" node scripts/story-shots.mjs 5301 D:/wc/x 1,3`

## 已知不足
- 没有复用 3D 的 UnitCard/armor/castShow（用 DOM 立绘 + 底座做，更稳更省）；横版是用 CSS 位置模拟「同伙」的 SIDE_SLOTS 斜线，不是真透视。
- 句子读法是 `sentenceText` 的直译（如「我方·回声受伤1」），还不够口语。
- 职业风格只是配色/立绘，规则不分职业；对手卡组随机，不可选。
- 对手风格随机；手机竖屏下技能演出的词牌偏大，镜头拉近时词牌库抽屉会盖住我方一排的下半。

# 断·句 打电脑页 v1（duanju.html）

入口 `web3d/duanju.html`（已加进 vite 多页配置）。旧页面（index/online/campaign/intro/side）不受影响。
一局：开局页（职业风格、卡组、关键词、难度、先后手、规则配置）→ 战斗 → 终局页（胜负、轮数、用过的进阶词、再来一局、导出记录 JSON）。

## 结构
- `engine/`：规则引擎。**`ast/interp/params/gen/playbook/ai/tiers/deck/arena/lab-rules` 是自动同步来的，别手改**。
  - `api.ts` 薄封装：`Match`（谁该动 / aiMove / declare / pass / legalSentences / resolve→回放事件 / hud / unitView / record）、`configureRules`、`setUnitNames`。
  - `PATCHES.md`：对 lab2 拷贝施加的补丁（最重要的是 T1 结算 trace 回调）。
  - `rules.default.json`（= `D:/wc/out_real/duanju.json` + `TGT_AT_DECL:1`）、`rules.legacy.json`（旧 out/rules*.json）、`rules.real.json`（纯 REAL）、`deck-words.json`（deckbuilder 词表与推荐配置）。
- `setup.ts / battle.ts / end.ts / main.ts`：三个页面与入口。`ui.css` 全部样式（含手机竖屏）。
- `inputMenu.ts`：宣告输入 v1（「可说的句子」菜单）。`cast.ts`：最小结算动画。`art.ts`：背景/立绘路径与占位。`styles.ts`：4 套职业风格。

## 同步引擎
规则变了：`node scripts/sync-engine.mjs`（lab2 → engine/，改好 import、`process.env` 垫片、打 T1 补丁；补丁对不上会报错退出）。
环境变量：`LAB_DIR`（默认 `D:/wc/nc_lab/web3d/src`）、`RULES_DIR`、`REAL_DIR`。
规则配置页面选项：断·句默认 / 旧版 / 纯REAL / 自定义（粘贴 `{P,P2,ADV}` 或 `{LAB,LAB2}`）。

## 可替换接口（types.ts）
- `InputMode { open(ctx), close(), isOpen() }`：`ctx` 给出 match、unit、anchor（随从面板）、host、`onDeclare(cl,start)` / `onPass()` / `onCancel()`。第 2 版逐词拼句 composer2 实现它，在 `Battle.input` 换掉 `new MenuInput()` 即可。
- `CastPlayer { play(events, view), skip() }`：`events` 是按秒排序的 `ReplayEvent {sec,type,src,tgt,amount,text}`（type：fire/hit/heal/shield/absorb/status/down/standing/heat）；`view: BattleView` 提供 unitEl、setDisplay、float、flash、markDown、banner、clock。结算时引擎状态已是结算后的，演出只改显示用的血量（`disp`），结束后由 Battle 对齐。`Battle.cast` 替换即可。

## 背景与立绘约定
- 背景：`public/duanju/bg/bg_battle.webp`（打电脑）；教程第 N 拍 `bg_NN_*.webp`，用 `art.ts` 的 `backgroundFor("battle" | N)`。缺图回退 CSS 渐变。
- 立绘：`public/duanju/art/<artDir>/battle_idle.png`（`artDir` 见 styles.ts：bing/yin/xian/zhuang），缺图回退程序生成的像素剪影（词位肩甲 / 数位胸块 / 速位速度线）。对手一侧自动镜像。
- `scripts/duanju-gen-bg.mjs` 生成占位背景 `placeholder.png`（已不再被页面使用）。

## 测试脚本
- 引擎 headless：`node node_modules/tsx/dist/cli.mjs scripts/duanju-engine-test.ts 200`
- 页面冒烟（先起 dev 在 5199）：`node scripts/duanju-smoke.mjs 5199 10`（URL `?auto=N` = 电脑代打 N 局；`?start=1` 跳过开局页）
- 截图：`node scripts/duanju-shots.mjs 5199 D:/wc/game_shots`

## 已知不足
- 没有复用 3D 的 UnitCard/armor/castShow（用 DOM 立绘 + 底座做，更稳更省）；盔甲壳、词牌飞来飞去的演出待接 `CastPlayer`。
- 句子读法是 `sentenceText` 的直译（如「我方·回声受伤1」），还不够口语；目标在句子里已显式，点选目标的 UI 要等 composer2。
- 起手秒滑块没有时间轴可视化；职业风格只是配色/立绘，规则不分职业；对手卡组随机，不可选。
- 对手风格随机；手机竖屏菜单是底部抽屉，会盖住对手行。

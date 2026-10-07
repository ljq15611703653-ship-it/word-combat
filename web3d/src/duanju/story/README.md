# 断·句 故事模式（duanju-story.html）

入口 `web3d/duanju-story.html` → `src/duanju/story/main.ts`。流程：4 页背景漫画 → 选关页（14 个节拍卡，进度存 localStorage `duanju.story.v2`）→ 每关：标题卡 → 关前漫画 → **教学战斗** → 关后漫画 → 解锁下一关。第一、二关还有同伴的关内对白。失败可重来（不重播剧情）。漫画 Esc 跳过；`?skip=1` 直接练教学。
URL 调试：`?beat=N` 直接进某关，`?unlock=all` 全解锁，`?skip=1` 跳剧情，`?fast=1` 快速（无打字机、短标题卡）。

## 结构
- `comic/player.ts`：移植自 `D:/wc/comic/player.js`（行为一致，`@ts-nocheck`）；`comic/index.ts` 封装 `playSegment(container, data, level, when)`，读 `public/duanju/story/panels.json`，有 `assets.json` 就用图+裁剪框，否则 `forcePlaceholder`（程序画的剪影+半色调）。
- `dialog/`：`playDialog(host, lines, opts)` 底部文字框 + 左右半身像（点击/空格推进、历史、跳过本段/剧情）；`portrait.ts` 缺图时画占位剪影（按角色配色，表情=简笔脸）。
- `teach/spec.ts`：课程表里的「句子规格」`ClauseSpec`：`buildSentence`（脚本对手出招）、`matchSentence`（匹配引导步骤）、`allowedFn`（本关开放的词）。
- `teach/session.ts`：纯逻辑 `TeachSession`（无 DOM，浏览器与 smoke 共用）：规则 JSON、开局调整（缺席随从/血量/卡组）、脚本对手 `foeMove`、`check`（校验玩家宣告）、`pending`、`hintWords`。
- `teach/battleRun.ts`：用现有 `Battle` + `BattleHooks` 跑教学战斗（引导气泡、关内对话 rounds.say/after）。**不复制战斗代码**。
- `teach/guided.ts`：菜单版教学输入（`GuidedInput`）。把菜单过滤成允许的句子并高亮应选的一条。换 composer：把 `resolve()` 的结果通过 `InputMode.setGuide({allowed, hint, lockWords, denyText})` 交给 composer 的输入，整体替换这个适配层即可（`session.hintWords` 已给出 `["造成","@3","1"]` 形式的词序列）。
- `public/duanju/story/`：`curriculum.json`（课程表）、`dialog.json`（=06_关卡对话）、`panels.json`（=07_panels）、可选 `assets.json` + `img/`、`portraits/<角色>_<表情>.png`。

## 对现有 duanju 文件的改动（最小，合并时留意）
- `battle.ts`：新增 `BattleHooks`（styles/foeDeck/setup/absent/input/foeMove/onMount/onRoundStart/onRoundEnd/beforeDeclare/afterDeclare/beforeEnd/undo/onTick）与 `opts.hooks`；撤回按钮；`.unit.absent`。不传 hooks 行为不变。
- `engine/api.ts`：`Match.foeDeclare / snap / restore / removeUnit`。
- `types.ts`：与 composer 分支一致的 `Guide` 与 `InputMode.setGuide?`。
- `vite.config.ts`：多页入口 `duanjuStory`。

## 课程表数据格式（curriculum.json）
`beats[]`：`beat/name/teach[]/foeNames/first/seed/rules/me/foe/allow/rounds`。
- `me/foe`：`units`（上场的随从编号，我方 0~2、敌方 3~5，其余隐藏并视为已倒下）、`hp`、`deck`（进阶词张数）。
- `allow`：开放的词：`verbs`（dmg/heal/shield）、`kinds`（status/redirect/postpone/strip/when）、`statuses`、`maxN`、`rep`、`tgs`、`free`。
- `rounds[i]`：`foe`（电脑脚本：`unit/s/start`，`s` 是句子规格）与 `steps`（我方引导：`unit`、`want` 句子规格、`startMin/startMax`、`say.unit/menu/wrong/start` 的气泡文案）。超出脚本轮数 = 自由，对手重复最后一轮。
- 10~13 也是脚本关（分步引导）：每轮一个小目标 `rounds[i].goal`（战斗左上角目标条，完成后打勾）；步骤用 `steps[].words`——整句的词序列（拖拽词牌的 token，目标写 `"@3"`，如 `["造成","1","@3","并","造成","1","@4"]`），判定 = 玩家宣告的语法树还原成词序列后与 `words` 完全相同（`session.sameWords`）；`say.menu` 是提示气泡，`say.wrong` 是拼错时的友好提示。词牌库只亮 `words` 里的词，其余灰掉；有步骤的随从不许「不出手」（`beforePass`）。脚本轮用完对手还活着 = 自由续打（`fallback: "free"`）。
- 14 是「自由对打」：`tier/meDeck/foeDeck/foeHp/hintKind/intro`。
规则：基础 `base.rules`（关过热、固定数字牌 [2,3]、关位置和关键词）+ 每关 `rules` 覆盖，经 `Settings.rules="custom"` 交给引擎。脚本关里电脑方的牌堆是 [4×5]，不受冷却限制。

## 如何加关 / 改关
在 `curriculum.json` 加一个 beat，写 rounds；`node scripts/story-smoke.mjs` 校验每步引导句能被引擎生成、通关；`node scripts/story-shots.mjs <端口> <输出目录> 1,2,3` 用真实点击走流程并截图。

## 换占位图
- 漫画：用 `D:/wc/comic/cropper.html` 裁出 `assets.json`，连同大图放 `public/duanju/story/img/`。
- 半身像：`public/duanju/story/portraits/<角色>_<表情>.png`（角色=对话里的 who，表情=expr）。
- 背景：`public/duanju/bg/bg_NN_*.webp`（已有）。

## 测试
- `node scripts/story-smoke.mjs`：引擎级，按引导自动通关 1~9，10~14 电脑代打跑完不卡死。
- `scripts/story-shots.mjs`：CDP 真实点击（先 `node node_modules/vite/bin/vite.js --port 5184`）。
- `scripts/tut-steps.mjs <端口> <输出目录> [beats]`：`?beat=N&skip=1` 直接进关，按引导真的拖拽词牌走完并逐步截图；`FAILTEST=1` 额外测「拖被锁的词 / 拼错的句子」的提示。

## 已知不足
- 1~13 都已用真实拖拽（`scripts/tut-steps.mjs`）走通；14 仍是自由对打。
- 撤回是整句回退（只在电脑出手前）；composer 接入后撤回体验要重做。
- 占位图简陋，漫画对白字号随舞台缩放，竖屏下读起来偏小；对话半身像竖屏会压到文字框。
- 我方三人用 Q 版立绘（`StyleDef.unitArt` → `public/duanju/art/<ye_qi|lu_xiaoman|ke_qian>/`）；敌方仍是占位剪影；教程里不出现任何职业名，也不提位置（POS 关）。
# 主线重写（2026-10-07）

当前制作源为 `web3d/scripts/story-v2-content.mjs`。4 页背景介绍、14 关、6 页终章，总计 66 页（143 格）。前两关是反抗军任务，3–14 关是公司课程；真实身份只在终章揭示。叶栖和前两关同伴露脸，后期目标同伴戴面具，终章露出真脸。旧版失忆、断联与选门剧情不再使用；下文旧说明仅供历史参考。

四名同伴通过 `story_<name>/rig/rig.json` 与 `atlas.png` 接入已有骨骼，16 个独立部件，支持待机、施法、受击、左右镜像和手部特效锚点。面具版本只替换头部，复用身体与骨骼。`scripts/rig/story-pack.py` 从独立部件图打包；`story-rig-qa.mjs` 核验真实动作帧，`story-v2-integration-qa.mjs` 核验桌面/手机实际接入和全部漫画字幕。

漫画每格是独立画面，制作素材表中的每个镜头只使用一次。`python scripts/install-independent-shots.py` 分离143个镜头，然后运行 `node scripts/install-story-v2.mjs` 写入剧情数据。关卡的112格沿用旧版几何和镜头运动；宽格取景优先保住人物脸部。`story-v2-audit.mjs` 检查分镜未改变及独立画面未复用。

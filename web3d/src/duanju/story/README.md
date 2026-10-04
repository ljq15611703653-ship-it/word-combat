# 断·句 故事模式（duanju-story.html）

入口 `web3d/duanju-story.html` → `src/duanju/story/main.ts`。流程：序章漫画 → 选关页（14 个节拍卡，进度存 localStorage `duanju.story.v1`）→ 每关：标题卡 → 关前漫画(2页) → 关前对话 → **教学战斗** → 关后对话 → 关后漫画 → 解锁下一关。失败可重来（不重播剧情）。全程有「跳过」：漫画 Esc / 对话「跳过本段」「跳过剧情」。
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
- 10~14 是「自由对打」：`tier/meDeck/foeDeck/foeHp/hintKind/intro`（hintKind 让第一轮提示要学的句型）。
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

## 已知不足
- 7~9 的数值与引导已通引擎冒烟，但真实点击只系统验证了前几关；10~13 只有「首轮提示 + 自由对打」，没有逐步引导，电脑代打偶尔会输（对手 AI 为入门档、血量 4）。
- 撤回是整句回退（只在电脑出手前）；composer 接入后撤回体验要重做。
- 占位图简陋，漫画对白字号随舞台缩放，竖屏下读起来偏小；对话半身像竖屏会压到文字框。
- 教学里随从仍用现有 4 套职业剪影，没有叶栖/小满/柯谦专属立绘；不提位置/职业（POS 关），10 起默认规则里位置打开但没有专门讲解。

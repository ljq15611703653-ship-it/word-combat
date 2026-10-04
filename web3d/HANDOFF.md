# web3d 交接说明（给接手的 Claude / 同伴）

> 维护规则（用户要求）：**每次推送到主分支，都要同步更新并一起推送本文件。** 改完后把「当前状态」「待办」「分支表」更新到最新。
> 最近更新：2026-10-04 晚（手牌条拼句、选目标撤回、时间限制接口、句子规则原型 lab、设计总览；上一版：横版对战界面 + 底座外的半透明盔甲 + 全灭模式；上面一轮：四个分支已合进 main，网页版发布到 Pages /3d/，局域网联机版打成 zip）。

## 1. 这是什么
词战（Word Combat）的 3D 网页版，在仓库 `ljq15611703653-ship-it/word-combat` 的 `web3d/` 目录（Vite + TypeScript + three.js，联机服务端 Node + ws）。
数字牌对战：用词牌拼句子当招式，每个随从每轮一句，时间轴 10 秒，职业并/续/择/血。规则引擎已从 Python 移植到 `src/engine/`。

## 2. 主分支里已经有的（main）
| 功能 | 入口 | 说明 |
|---|---|---|
| 打电脑（完整对局） | `index.html` → 主菜单「打电脑」 | `src/game.ts` + `src/engine/*` |
| 联机打真人 | 主菜单「打真人」 | 选卡组（自定义+4 预设）→「开始匹配」，两人都点就配对；服务端 `server/`，`npm run online`，详见 `ONLINE.md` |
| 新手教程（14 关，一个完整故事） | `campaign.html` | 盖在真实对局界面上的一层：对话栏、发光按钮+气泡、第 1/2 关聚光灯、对手脚本、词限制、固定种子。逻辑 `src/campaign/`（levels.ts / session.ts / ui.ts / guide.ts），对局界面钩子在 `game.ts`（标 `[campaign hook]`） |
| 旧版存档 | git 标签 `archive/v1-circuit-ui` | 绿色电路板风格的完整旧版，新风格不得覆盖它 |

运行：`cd web3d && npm install && npm run dev`（打开 index.html / campaign.html）；联机 `npm run online`；测试 `npm run test:campaign`、`npm run selftest`、`node node_modules/typescript/bin/tsc --noEmit`。
注意：这台机器上 `npx vite/tsx` 常不可用，用 `node node_modules/vite/bin/vite.js`、`node node_modules/tsx/dist/cli.mjs`。

## 3. 教程故事（已定稿并写入 levels.ts）
完整方案：`docs/教程剧情方案.md`。要点：夜城，语法公司收走了语言；主角**零**只剩三个字（选择/敌方/造成）；**阿词**是带她学拼句的词师；**小剑**是她的随从，只会喊「砍！」；**句号**是公司执法官死对头；辞典四家**连环（并）/长命（续）/未定（择）/欠条（血）**。
**唯一反转**：阿词就是语法公司创始人，他让零一路夺回字，最后来打败他。
意难平：第 8 关小剑抱住炮口牺牲；第 14 关阿词的话「我当年——」没说完。结尾零把小剑的词核装进第四个槽，说「砍」。
第 9 关起玩家随从由「小剑」改名「零」。第 14 关对手单位叫 阿词/句号/旧部（仍是 AI 对打）。

## 3.5 发布（新增）
- 一条命令：`sh scripts/release.sh` → `build/pages/`（静态网页版：打电脑 + 新手教程，`VITE_STATIC=1` 时「打真人」改成提示下载联机版）+ `build/pages/lan/ci-zhan-lan.zip`（局域网联机版：`dist/` + esbuild 打包好的 `server/server.mjs` + `start.bat` / `start.sh` / `开放防火墙.bat` / `关闭旧服务器.bat` / `open-firewall.ps1` / `联机说明.txt`，房主只要装 Node.js，不用 npm install）。
- 网页版发布在 gh-pages 分支的 `3d/` 子目录：https://ljq15611703653-ship-it.github.io/word-combat/3d/ （旧的 2D 版在根目录，不动）。
- 主菜单加了「新手教程」按钮（跳 campaign.html）。
- 云端机器装依赖：package-lock.json 里的地址是 repo.huaweicloud.com（云端被拦），临时把 lock 里的地址换成 registry.npmjs.org 再 `npm ci`，装完把 lock 还原。

- 联机包的 Windows 坑（2026-10-04 修）：`.bat` 在仓库里是 UTF-8，`release.sh` 打包时转成 **GBK + CRLF**（中文 Windows 的 cmd 按 936 读批处理；UTF-8 + `chcp 65001` 会把半行中文当命令执行）。`open-firewall.ps1` / `联机说明.txt` 带 BOM（PowerShell 5.1 不认无 BOM 的 UTF-8）。服务端启动时端口被占：是本版词战 → 提示「已经在运行」并退出；是旧版词战（探测 `/` 页面）或别的程序 → 自动顺延到下一个端口并打印实际地址。新增 `关闭旧服务器.bat`（只关占着 8787-8799 的 node 进程）、`开放防火墙.bat`（自动提权，放行 8787-8799 专用网络）。主菜单底部显示「版本 = 构建时间（北京时间）」，用来分辨新旧版本。

## 3.6 横版对战 + 盔甲 + 全灭模式（2026-10-04，用户试玩后要求）
用户试玩反馈：拼词慢、互相打不死很快又拉起来；要全打死才结束；同伙推了横版战场 PR；盔甲太不明显；不要右边面板（最多上面一小块）。
- **规则**：`src/engine` 的 `Match opts.wipe`（打电脑 / 联机都用；教程关卡不用）。倒下不回来、全倒就输、第 3 轮起每轮结束「过热」、行动点收紧、每个随从 6 血、血流 1 血顶 2 点、择流待定多目标 +1 点。数值和模拟结果见 `设计与审计/数字牌模式/全灭模式.md`；平衡工具 `src/engine/simwipe.ts`（`NODEF=1` 是「只进攻」对照组）。常量在 `rules.ts` 的 `W`。
- **界面（主页面 index.html，对局时）**：采用同伙 PR #5 的横版布局（蓝左红右，三人斜排，镜头低且正对）。`?layout=rows` 回到前后两排（教程页一直是前后两排，没改）。
  - 头顶名牌：名字 + 血条 + 状态 + 这一句 + 起手秒数（`SentencePanel` 的 `.over` 样式 + `setHp`）；
  - （最新，用户定的布局）**右上角**只有行动点+数字牌（我方 + 对手一行）；**上方中间**一行「第N轮 · 过热」；**左上角**怎么玩/动画/日志/退出；**右下角**只放「下一轮 / 看结果 / 跳过动画 / 择流定目标」；随从相关的全在头顶小框里（血条、状态、句子、「＋拼一句」「不出手」），职业/成长在右键详情。
  - **没有右栏**（下面是上一版的说法，以上面为准）：`Game` 的 `ctx.layout = "top"` → 顶部一小块（回合、过热提示、双方生命/存活/成长/行动点、我方数字牌、怎么玩/动画/日志/退出）+ 底部中间的操作卡；拼句 / 详情仍是随从旁边的悬浮面板，日志是抽屉。教程仍是原来的右侧窄条（`layout` 不传）。**右边面板最终怎么做，等用户对齐后再动。**
  - 取景：`main.ts` 的 `SIDE`、`SIDE_SLOTS`、`framePoints`、`placePanels`、`topPx()`。
- **盔甲**（`src/armor.ts` 重写）：底座外一圈半透明蜂窝装甲壳（后墙高、两侧斜下、前墙矮，发光边框 + 四角立柱，阵营色；悬停/选中更亮；演出时整圈亮并向外扩光环；倒下时塌下去）。大零件在底座外：靠敌人一侧 = 攻击刃（长度 ∝ 伤害）、另一侧 = 护盾（∝ 减伤）、地面一圈 = 持续光环（一格刻度 = 一轮）、后角 = 血债量管。人物身上的小零件（背后模块、环绕状态、胸口不屈/首挡肩甲）还挂在立绘上。`UnitCard` 的 `platform` 组是底座整体（横版里缩到 0.8，人物不缩）。技能演出接口没变（`anchorWorld` / `fx`）。
- 本地截图 / 测试脚本放在会话临时目录（`panelshots`、`armorshots`、`castshots`），没进仓库；`scripts/castshots.mjs` 里的「点按钮」逻辑要改成 `__gm.cardClicked(uid)`（横版没有「给【小剑】拼一句」按钮了）。

## 4. 进行中 / 未合并的分支（全部在 origin 上）
> 2026-10-04：street-bg、glass-ui、intro、cast-fx 已全部合进 main（cast-fx 的 WIP 一并合入：结构完整，能跑完整个回放；演出时非相关随从的读数面板会淡出）。下表保留作历史。
| 分支 | 内容 | 状态 | 注意 |
|---|---|---|---|
| `claude/web3d-cast-fx` | 技能演出：镜头拉近到出手随从 → 词牌飞到透明盔甲壳旁与动作绑定一起演（并流=机械拼装；续/择/血各有演出；基础攻击按职业略有区别）→ 词牌归位 → 镜头拉回；伤害/血条与命中同步；可跳过/加速 | **助手写了约 840 行 `src/fx/castShow.ts`，尚未提交**（工作目录 `C:/Users/27654/AppData/Local/Temp/nc_cast`） | 审美任务，必须逐帧截图审查。新代码放 `src/fx/`，最小侵入接入结算回放（game.ts/live.ts/armor.ts） |
| `claude/web3d-street-bg` | 新背景（程序化街道+楼）与半机械底座（`src/scene/street.ts`、`mech.ts`，`?style=classic` 回旧版） | 第四版已推（ee6f10d）：偏蓝、有斑马线、前后排不重叠。**不足**：橙色窗光偏多，高俯视下纵深弱，不像参考图一栋栋错落 | 用户说街景交给别人继续做；相机不要再动（放低会让前排压后排底座） |
| `claude/web3d-glass-ui` | 界面换成「智能眼镜显示信息」风格，偏蓝（只改 `src/glass.css`，不改布局/DOM） | 第二版已推（1a07a28）但**报告和截图没确认**，助手可能仍在修改 | 严禁做取景框/准星/暗角/扫描线（用户很反感）。信息界面主色要偏蓝，不要青绿；血条绿保留 |
| `claude/web3d-intro` | 开场故事动画（第三人称电影感短片，约 1 分钟，BGM/音效接口预留，`src/intro/script.ts` 数据驱动） | 旧版在 51c05b1；**新助手正按定稿故事重做分镜**（零/小剑/匿名消息/阿词转身→标题） | 台词不讲玩法；已接入教程首次进入自动播放+菜单「重看开场」 |

## 5. 用户明确还没做的待办（按顺序）
1. ✅ 技能演出已合入 main。逐帧看过并流、续流两组（拼装/飞行/命中/归位正常，演出时无关的读数面板淡出）；择流截到前几帧；血流还没逐帧看。本地截帧脚本要处理择流的「定目标」阶段（宣告完点「剩下的全部用建议」），否则那一轮不会结算、截不到。
2. ✅ **右键面板改版（已完成，分支 `claude/web3d-unit-panel`）**。原始需求：左键选人/选目标；右键随从弹悬浮面板，点空白或 Esc 关闭；普通状态显示基本信息并能直接拼一句/不出手；「最大化」显示全部信息、可「恢复」；选目标时点随从只选目标；对手只显示公开信息；常驻信息放边缘窄条，日志做抽屉；小名牌保留；教程依赖 `.gm .hl` 和 `.cg-tr`。实现：
   - **窄条** `.gm.pl`（宽度 `--strip: 264px`）：回合/得分/工具（怎么玩·动画·日志·退出）、六个随从、数字牌；**底部贴着当前操作卡**（轮到你 / 电脑在想 / 结算中·跳过动画 / 择流定目标 / 轮末「下一轮」），窄条内容多了会滚动，操作卡 sticky 始终可见。
   - **左键**：我方还能出手的随从 → 在它旁边弹出拼句面板，拼句 → 选目标 → 定秒数都在这块面板里走完；其他随从 → 详情面板。随从旁的名牌「＋拼一句」也能点。窄条里的随从行同样能点（选目标时可当后备）。
   - **右键**：任何随从 → 详情面板（名字、血、关键词、状态、本轮/上一轮宣告的句子；我方可直接「拼一句」「它这轮不出手」；对手只显示公开信息）。拼句/选目标/定秒数/结算中右键不弹。
   - **最大化**：铺满窄条左边的区域，显示全部（职业特长、说明、辅助轮、词、数字牌、预览），字号放大，可「恢复」。普通状态把说明类文字（职业特长、`.cmp-help`、提示小字）收起。
   - **关闭**：✕ / Esc = 关面板（拼了一半的句子作废，同「取消」，教程里仍受 gate 约束）。点 3D 空白处只关详情面板或「还没放牌」的拼句面板——拼了一半的不会因误点丢掉，面板抖一下提示用 ✕/Esc。
   - **日志抽屉**：窄条「日志」按钮开关（本轮已宣告 + 结算日志）。
   - `?style=classic` 仍是原来的 400px 右栏（`pl=false`，DOM 不变）。教程：`.gm-float` 也带 `.gm` 类，`.gm .hl` 与聚光灯规则照常；气泡摆在高亮所在面板的外侧；`.cg-tr` 改为 `right: calc(var(--strip) + 10px)`。
   - 代码位置：`game.ts`（`placeAct / renderPop / placePop / cardContext / blankClicked / dismissPop`）、`glass.css` 末尾「第三档」、`main.ts` 与 `campaign/main.ts` 的 contextmenu / 空白点击 / `anchor`、`online/netGame.ts` 两个等待状态也调 `placeAct`。截图核对过 1440×810：选人、拼句、选目标、定秒数、最大化、详情（敌/我）、日志、轮末、教程第 1 关前五步、classic。
3. ✅ 偏蓝的玻璃界面已合入 main（`?style=classic` 看旧版）。
4. ✅ 已发布：https://ljq15611703653-ship-it.github.io/word-combat/3d/ （联机包 `/3d/lan/ci-zhan-lan.zip`，发布方法见 §3.5）。原始要求：全部合进主分支后，**构建并发布到 GitHub Pages**：放在现有站点子路径（如 `/3d/`），**不覆盖**旧的 2D 版（Pages 现在从 `web/` 发布；仓库代理见下）。联机需要局域网里跑服务，所以 Pages 上只有「打电脑」和教程。发布地址要先告诉用户。
5. 联机**没在两台真机上测过**，防火墙步骤（`open-firewall.ps1`）也没验证；宣告阶段没有超时，对方挂机会卡住。
6. ✅ 首次进教程的体验已确认（无痕浏览器实测）：开场自动播放（空格=下一镜，跳过=直接结束）→ 选关页 → 第一关阿词「别怕。先从你手里这三张牌开始……」；看过后 `localStorage["wc.intro.seen.v1"]=1`，不再自动播。

## 6. 用户的偏好和红线（务必遵守）
- **界面/特效/演出这类审美任务，做完先自己截图看过再汇报**（1440x810；改视口后要重载页面，WebGL 才会按新尺寸渲染）；发给用户用文件发送，别只说「在面板里」。用户说过「你做出来贼丑」「你做多少次都是贼垃圾」，所以别无限返工界面，抽查截图、对照参考图。
- 保留原版：重设计走新入口/新模式，旧版可回（`?style=classic`、标签 `archive/v1-circuit-ui`）；不要直接覆盖。
- 「智能眼镜」= 眼镜上**显示的信息元素**（半透明面板、细线、读数标签），**不是**镜片/取景器效果；不要给整屏加边框、准星、暗角、扫描线。
- 底座=半机械赛博朋克（攻壳机动队质感），每个随从独立底座；背景=赛博朋克街道，参考 2077/阿丽塔/攻壳/银翼杀手，要层次和立体感，不要「大黑片上贴小彩片」；整体偏蓝，绿色难看；两边角色不许互相重叠。
- 教程是「打电脑那套界面 + 一层引导」，不是另一套界面；教学是为故事服务，不是反过来。
- 每完成一步用 PowerShell `System.Speech` 朗读一句中文进度（用户要求）。
- 重要结果先对齐再动手；不要让助手改超出范围的文件；子助手交付后必须自己看截图再向用户汇报。
- 联机/教程/界面这些助手各自用独立 worktree，避免撞文件。

## 7. 环境坑
- **C 盘几乎满**（常只剩 1~2 GB，曾因此清空过文件）：别装新依赖，别生成大文件；node_modules 用目录联接 `cmd //c mklink /J node_modules C:\Users\27654\AppData\Local\Temp\nc_net\web3d\node_modules` 复用。
- worktree 目录都在 `C:/Users/27654/AppData/Local/Temp/`：`nc_net`（主克隆，含 node_modules）、`nc_cast`、`nc_bg`、`nc_glass`、`nc_intro`、`nc_story`、`nc_web3d`（旧教程）等。
- GitHub 走代理 `127.0.0.1:7890`。
- 写文件失败要检查是否变成 0 字节。
- 用户的本地仓库 `Documents/New project/word-combat-lab` 是另一条线（Godot 版 + 研究文件），分支 `word-combat-lab`，有大量未提交改动，不要碰。
- 记忆文件在 `C:\Users\27654\.claude\projects\C--Users-27654-Documents-New-project\memory\`（含界面改版、技能演出、截图自检等条目）。

## 3.7 手牌条拼句 + 句子规则原型（2026-10-04 后半，用户转本地继续前的状态）
> 设计层面的完整交接见 `设计与审计/数字牌模式/交接-句子语言设计总览.md`（决策日志、词表、原型数据、下一步），这里只写代码层面。

- **拼句界面已换掉**（横版对战；`?style=classic` 和教程页仍是旧的面板流程）：
  - `src/handStrip.ts`：底部手牌条（词牌 + 数字牌 + 撤回 / 清空 / 取消 / 拼好了）。手势：从手牌拖到名牌上装配、点一下 = 装到最后一个合法位置、句子条里的牌拖出去 = 拿掉（依赖它的一起掉）、拖到别的缝 = 换位置；拖时合法位置在名牌上亮成「缝」。
  - `src/sentencePanel.ts`：名牌 = 句子条。`setEdit(on, onTok)`、`showSlots(legal, hot, hide)`、`nearestSlot(x, y)`、`flash(i)`；`main.ts` 的 `placePanels` 拼句时把名牌放宽（`panels[i].editing`）。
  - `src/engine/composer.ts` 编辑接口：`replay / slotsFor / insertAt / removeAt（返回掉下来的牌）/ slotsForMove / moveTok / whyNot`。规则仍由旧的 `parse()` 状态机决定合法性（逐张重放检验）。
  - `src/game.ts`：`renderHandStrip / mirrorDraft / enterEdit / leaveEdit`；选目标时 `plateDraft`（名牌保留这句话 + 已选目标）、`undoTarget`、`backToCompose`；对手出招 `perform`（逐张落牌）；**时间限制接口** `setTimeLimit / armLimit / tickLimit / onTimeout`（开局设置里「每轮宣告的时间限制」，`Settings.limit`；联机版 `OnlineGame` 还没覆盖 `onTimeout`）。
  - **已删除**：辅助轮（横版）、「随从拖到目标 / 框选」（`src/drag/`、`Composer.dragTo / boxTargets / binds`、`Game.dragDrop / dragBox`、教程里的拖拽教学）。教程里引导对 `assist` 的拦截还在，但横版没有这个按钮。
  - 教程页（`campaign/`）仍是旧的点击流程，用户说之后改。
- **测试脚本**：`scripts/handshots.mjs`（手牌条真鼠标）、`scripts/targetflow.mjs`（选目标 / 撤回 / 返回修改 / 限时；端口和路径写死在脚本里，按需改）。都要先 `vite build --outDir <目录>` 并起静态服务，Chromium 用 `/opt/pw-browsers/chromium --no-sandbox`，profile 路径必须是 ASCII。**注意**：后台有别的重任务时 swiftshader 很慢，限时会真的到点。
- **句子规则原型** `src/lab/`（`rules.ts / sim.ts / ai.ts / run.ts / tune.ts / sweep.sh`）：只在模拟里跑，**不进游戏**。用法见设计总览 §4.1。它是手写模板版，用户已要求重做成「语言解释器 + 卡组自动进化」版（设计总览 §5）。
- 重新发布 Pages / 局域网包：**还没做**（手牌条之后没发布过）。

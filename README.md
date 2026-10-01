# 词战：拼词对决

用词语拼出招式的 5 对 5 卡牌对战。你和对手各有 5 个随从，每个随从一招。招式是用抽到的词拼出来的：拼什么词，它就做什么事，看到的就是会发生的。

每轮的流程是：先手把行动一口气宣告完，后手看见全部行动再应对，然后双方行动在 20 秒的时间轴上一起结算。打倒对手的随从就得分，先到 100 分获胜。

**在线试玩：** https://ljq15611703653-ship-it.github.io/word-combat/ （首次加载约 40MB，之后会缓存）

**接手开发请先读 [`交接说明.md`](交接说明.md)**（项目现状、怎么测、下一步、素材接口、发布流程）。

第一次玩，请点标题画面的「新手教学」。桌宠“小词”会从头教起，大约 10 分钟。

## 目录

| 目录 | 内容 |
| --- | --- |
| [`godot/`](godot/) | 游戏本体（Godot 4.7.1）：规则引擎、电脑对手、两种卡牌编辑器、3D 牌桌、新手教学、桌宠、特效与素材接口、自动测试。说明见 [`godot/README.md`](godot/README.md) |
| [`web/`](web/) | 网页版：从 `godot/` 导出的成品，GitHub Pages 发布的就是它 |
| [`设计与审计/`](设计与审计/) | 早期设计稿、词库、强组合与反制的审计脚本和报告 |
| [`godot/docs/素材与特效接口.md`](godot/docs/素材与特效接口.md) | 换美术、音效、特效的约定。动画和逻辑都在代码里，素材只要按名字放进 `godot/assets/` |

## 本地运行

- **Windows**：双击 `godot/运行游戏.bat`。默认用 `D:\CodexTools\godot-4.7.1\` 下的 Godot，不在这里就改脚本里的路径。
- **其他系统**：用 Godot 4.7.1 打开 `godot/project.godot`，按 F5 运行。

## 更新网页版

改了 `godot/` 的源码以后，在仓库根目录执行下面三步：

1. 重新导出（需要 Godot 4.7.1 的 Web 导出模板）：

   ```bash
   Godot --headless --path godot --export-release Web ../web/index.html
   ```

2. 提交到 `main`。

3. 把 `web/` 同步到 `gh-pages` 分支（Pages 从这个分支发布）：

   ```bash
   git subtree push --prefix web origin gh-pages
   ```

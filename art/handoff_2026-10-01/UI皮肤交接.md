# UI 皮肤交接

此包是给下一位集成人的美术交付，**尚未放入 `godot/assets/`，也没有修改游戏界面代码**。PNG 在 `assets/ui/`；卡框和主要 UI 几何的可编辑 SVG 在 `source/svg/`，细颗粒、画面背景和逐帧扫光以 PNG／生成脚本为准。早期生成脚本 `source/2d_tools/build_ui_skin.py` 会产出两张 1600×900 的界面示意图；示意图不代表游戏现在已经长这样。

**最新卡面方向**：暗红闪光、黑色、亮黄色。外框是圆润的红色金属，稀有卡保留窄亮金色画面内框；卡面内侧四角与卡背四角都有少量原创卷纹，缩小后仍能辨认。卡背的交错括号图案取自“拼词”的意象，未照搬参考视频的星盘图案。金属扫光是独立 12 帧，接入时沿边框循环播放；单张 PNG 只能呈现其中一瞬。人物、战斗规则和 3D 碰撞体不在本包内。其他面板与背景仍是早期深靛紫版本，集成人若要求全局统一暗红，需要继续替换那部分。

## 素材表

| PNG 路径（均相对 `assets/ui/`） | 尺寸 | 用途 | 九宫格边距 L/T/R/B |
|---|---:|---|---|
| `cards/card_back_512x768.png` | 512×768 | 背面盖牌、翻开前的卡 | 固定比例，不九切 |
| `cards/card_front_common_512x768.png` | 512×768 | 通用卡面透明框 | 固定比例 |
| `cards/card_front_rare_512x768.png` | 512×768 | 红金稀有框，细亮金内缘与珍藏铭牌 | 固定比例 |
| `cards/card_front_arcane_512x768.png` | 512×768 | 亮金秘术框 | 固定比例 |
| `cards/art_backing_{common,rare}_512x768.png` | 各 512×768 | 画面窗内的背景；放在身体图下面、透明卡框上面 | 固定比例 |
| `cards/glint/metal_border_mask.png`、`border_glint_00.png`～`11.png` | 各 512×768 | 仅沿金属边框移动的扫光遮罩与 12 帧；不扫过人物或文字 | 固定比例 |
| `cards/runtime_156x206/*.png` | 各 156×206 | 四张卡面／卡背的小尺寸检查版；正式接入可由原尺寸生成 | 固定比例 |
| `buttons/button_primary_{normal,hover,pressed,disabled}_360x96.png` | 各 360×96 | 主操作按钮四态 | 28/24/28/24 |
| `buttons/button_secondary_{normal,hover,pressed,disabled}_360x96.png` | 各 360×96 | 次操作按钮四态 | 28/24/28/24 |
| `panels/panel_9slice_192.png` | 192×192 | 普通信息面板、卡组区域 | 24/24/24/24 |
| `panels/popup_9slice_256.png` | 256×256 | 弹窗与强提醒 | 32/32/32/32 |
| `panels/topbar_9slice_256x96.png` | 256×96 | 顶部回合/比分/行动点带 | 24/24/24/24 |
| `panels/tab_normal_192x80.png`、`tab_active_192x80.png` | 各 192×80 | 普通/选中页签 | 22/20/22/20 |
| `hud/hp_bar_bg_320x42.png` | 320×42 | 生命槽底 | 20/16/20/16 |
| `hud/hp_bar_fill_320x42.png` | 320×42 | 随当前生命裁切的填充层 | 20/16/20/16 |
| `hud/ap_chip_128.png` | 128×128 | 行动点筹码、计数图标 | 不九切 |
| `hud/status_{狂振,易伤,沉默,护盾,牵连,升华}_128.png` | 各 128×128 | 六种状态的可辨认徽章 | 不九切 |
| `backgrounds/astral_table_1600x900.png` | 1600×900 | 大厅、编辑器、抽词背景；战斗时只宜用于 3D 牌桌外围 | 按屏幕裁切，不硬拉伸 |
| `backgrounds/dark_gold_magic_circle_1024.png` | 1024×1024 | 牌桌下、召唤或强组合时叠加的暗金法阵 | 按比例缩放 |

`optional/` 里还有独立的 `summon_circle_512.png`、`reveal_rays_512.png` 与 `stardust_512.png`，分别用于转动法阵、稀有揭示的放射光和星屑。它们也是分层纹理，不是已接入的特效场景。最终使用时可让法阵慢转、光束瞬间张开、星屑延迟消散；普通攻击不宜每次都播满屏揭示。卡面新配色由 `source/2d_tools/build_red_cards.py` 生成，**如果重新运行早期的 `build_ui_skin.py`，必须最后再运行 `build_red_cards.py`**，否则旧卡面会覆盖新卡面。

## 设计示意图

- `mockups/battle_skin_concept_1600x900.png`：保留当前项目的 3D 战斗桌面和五对五位置，替换外围层级、卡框、按钮与信息区。图中的现有 3D 随从仍是旧占位模型，不能把这张图误称为完整成品。
- `mockups/editor_skin_concept_1600x900.png`：使用独立身体图与拼词格，示意编辑器的卡牌化视觉。内容与按钮是静态设计稿，不可点击。
- `preview_ui_skin.png`：全部主要 UI 件的快速总览。

九宫格切图时四角按表中像素原尺寸保存，边缘只沿单轴延展，中心才双轴延展。不要把整张面板直接拉宽，花角和边线会变形。PNG 均保留透明通道；按钮素材不含文字，文字由游戏绘制，方便本地化与状态变化。

## 现有接口与接入边界

`godot/docs/素材与特效接口.md` 目前预留了随从配件、图标、FX 与音效入口；**没有 `assets/ui/` 的自动加载器**。本包是按用户要求先完整绘制并标明用途，后续集成人需在 UI 代码里接九宫格、按钮状态、卡面层次与背景。战斗牌桌依旧使用 3D 模型，背景图只做外围空间，不能把 3D 牌桌拍平成一张图。卡面身体、配件仍为独立层，参考 `2D模块交接.md`。

最新卡框可看 `previews/red_black_yellow_card_set.png`、`previews/rare_card_with_corner_ornaments.png` 与 `previews/card_metal_glint.gif`。早期战斗／编辑器示意图和紫金对比图尚未按新配色重画，不能以它们判断当前卡框。未靠静态 PNG 实现的部分是镜头运动、卡牌翻转、金属扫光播放、真实受击和技能反馈；需要接线后的界面／特效时序完成。

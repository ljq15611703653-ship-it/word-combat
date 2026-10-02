# 《Word Combat》特效场景用途与接入

本包的正式特效位于 `assets/fx/`：17 个 Godot 场景、2 个运行脚本。它们是待接入的视觉素材，**尚未复制进游戏工程，也未做实机联调**。接入时应将整个 `assets/fx/` 复制到游戏工程的 `godot/assets/fx/`，使场景中的 `res://assets/fx/*.gd` 引用成立。制作脚本在 `source/fx_tools/generate_scenes.py`；不要将 `source/` 当作运行时素材。

游戏工程后来增加了 `highlight_<kind>.tscn` 高光时刻接口；本包**没有**这六种高光演出场景（通关、章节首领、多重击倒、完美反制、翻盘、稀有词）。因此这些接口目前不会播放专属演出，不能把 17 个基础特效算成高光演出也已完成。

## 战斗：10 个事件

以下场景均为 `Node3D`，共用 `assets/fx/effect3d.gd`。现有 `godot/data/fx.json` 已把这些事件的 `asset` 指向 `fx/<事件名>.tscn`；`godot/scripts/fx/fx_player.gd` 在有牌桌世界坐标时实例化、调用 `play(ctx)`，并按 `lifetime` 定时删除。场景只提供 3D 视觉；音效、顿帧、震屏、大字、飞分及桌宠台词仍由游戏代码和 `fx.json` 控制。

| 场景 | 用途 |
|---|---|
| `cast.tscn` | 技能起效，符文蓄力后释放。 |
| `hit.tscn` | 普通伤害命中。 |
| `big_hit.tscn` | 大伤害命中；现有阈值是伤害 ≥ 10。 |
| `heal.tscn` | 治疗。 |
| `block.tscn` | 首挡格挡。 |
| `shield.tscn` | 护盾吸收伤害。 |
| `trigger.tscn` | 监听或关键词触发。 |
| `chain.tscn` | 短时间连续触发后的连锁表现。 |
| `interrupt.tscn` | 打断成功。 |
| `kill.tscn` | 击倒；脚本按 `ctx.who` 区分我方与对手色彩。 |

## 编辑器小舞台：6 个施法类别

这些场景也为 `Node3D`，共用 `assets/fx/effect3d.gd`。`godot/scripts/view3d/minion_stage.gd` 按类别加载 `fx/cast_<类别>.tscn`，调用 `play({"tier": tier, "color": col})`。`tier` 为 0～3，场景按档位放大效果。

| 场景 | 用途 |
|---|---|
| `cast_atk.tscn` | 攻击类技能。 |
| `cast_heal.tscn` | 治疗类技能。 |
| `cast_def.tscn` | 防御类技能。 |
| `cast_trap.tscn` | 陷阱类技能。 |
| `cast_ctl.tscn` | 控制类技能。 |
| `cast_buff.tscn` | 增益类技能。 |

## 拼词钢印：1 个场景

`stamp.tscn` 是 `Control` 场景，脚本为 `assets/fx/stamp.gd`。`godot/scripts/compose/stamp_fx.gd` 在卡牌落到句子轨时加载它，并将场景放在卡牌中心；脚本画出短暂的光环、亮点和放射线，结束后自行删除。它只替换钢印落点的视觉强调，不包含整段飞词组句动画。

## 预览与已知接入缺口

包根的 `preview_fx_3d.png`、`preview_fx_hero_timing.png` 是两张**静态预览图**。本包没有特效动画视频、可直接运行的 FX 预览工程或运行时验收记录；预览图不等于实机效果。

1. **2D 战斗无对应视觉**：10 个战斗场景全是 `Node3D`。`battle_screen.gd` 在 2D 模式给 `fx_player.gd` 传空牌桌，后者会丢弃 3D 场景。需为 2D 模式提供相应视觉或在接入时另行处理。
2. **打断缺少位置**：`battle_screen.gd` 当前调用 `interrupt` 时只传 `who`，没有 `uid` 或 `world`；`fx_player.gd` 因缺少世界坐标而丢弃 `interrupt.tscn`。需在调用链补足位置。
3. **编辑器施法场景不清理**：`minion_stage.gd` 实例化 `cast_<类别>.tscn` 后没有删除节点，共用的 `effect3d.gd` 也不自行删除。反复试放会让已淡出的场景及其动态子节点留在小舞台中，需在接入时安排场景清理。

上述判断来自交付文件与现有游戏接口的静态核对；接入后仍需在 Godot 内检查加载、时序、尺寸和性能。

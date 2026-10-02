# 五系 3D 身体模块

实际交付文件位于 `../../assets/models/minions/`：

| 形象 | 文件 | 设计轮廓 |
|---|---|---|
| 剑 | `body_sword.glb` | 红色圆盔与火苗盔缨 |
| 盾 | `body_shield.glb` | 宽而低的蓝色甲壳，按最终 2D `body_shield_v2_master.png` 修正 |
| 咒 | `body_mage.glb` | 紫色蝴蝶/月牙耳 |
| 弓 | `body_bow.glb` | 窄身、两侧大叶耳 |
| 魂 | `body_wisp.glb` | 粉色火焰头，弯曲幽灵尾，无脚 |

这些是实体三维网格，不是贴图立牌。坐标系与现有游戏约定相同：脚底投影为原点、面朝 −Z、约高 0.28–0.34；每个身体都有 `Socket_head`、`Socket_back`、`Socket_shoulder_l`、`Socket_shoulder_r`、`Socket_hand_l`、`Socket_hand_r`、`Socket_chest`、`Socket_waist`、`Socket_aura`、`Socket_ghost` 十个空节点。身体内不含装备、骨骼动画或碰撞体。装备由游戏按挂点添加，碰撞/点击逻辑仍用现有代码；这批文件没有接入正式 `godot/assets/`。

`build_bodies.py` 是可复现的网格和 glTF 源码，依赖 Python 与 NumPy。运行后会覆盖上述五个 GLB。颜色从 sRGB 转换为 glTF 的线性数值，避免 Godot 中发白。每个造型约 34–41 个独立网格部件，圆面、脸、眼睛、金属边和火焰/叶耳在三维中分别建模。

Godot 4.7.1 的导入检查脚本是 `godot_preview/check_models.gd`，检查五个 GLB 均能生成场景、十个挂点均可搜索到、尺寸和网格数均合法。`godot_preview/preview.tscn` 可渲染正面、斜侧样张；最终样张在 `../../previews/3d_bodies_front.png` 与 `../../previews/3d_bodies_three_quarter.png`。

当前 3D 层次、配色和角色轮廓已与 2D 母版对齐，但表面仍是简洁的程序化珐琅材质，没有 2D 绘制中的复杂渐变、颗粒纹理或手绘高光。正式镜头中的高光、轮廓线和动作仍需在整合阶段调校。

# Q 版医疗兵关键帧（给 Seedance 首尾帧补间）

| 文件 | 用途 | 来源 |
|---|---|---|
| `medic_chibi_idle.png` | 首帧：待机 | NovelAI V5 Full · 960×1280 · seed 4216886848 · ucPreset 3 · 画风串 `1.1::artist:solipsist ::, year 2025, 0.65::artist:windforcelan ::` |
| `medic_chibi_cast.png` | 尾帧：施放治疗 | 以待机图为参考，GPT Image 2.5 改姿势（2K，2:3），再缩放平移到和待机图同一画布：头顶、鞋底、脚的水平中心对齐，背景统一成待机图的品红 `rgb(201,36,134)` |
| `medic_chibi_cast_raw.png` | GPT Image 2.5 原始输出 | 未对齐 |
| `medic_chibi_cast_nai_rejected.png` | 废弃 | NovelAI 同种子直接画施放姿势，外套、瞳色、大小都和待机图不一致 |

## Seedance 设置

- 模式：首尾帧生成，首帧 `medic_chibi_idle.png`，尾帧 `medic_chibi_cast.png`
- 比例 3:4，时长取最短
- 提示词：

```
固定机位，镜头完全不动，纯品红色背景保持不变。Q版女孩原地站立，双脚不动，右臂快速向前伸出张开手掌施放治疗，左手按在胸口，表情从微笑变为认真并开口。动作干脆利落，没有任何光效、粒子或新物体。
```

视频回来后：抽帧 → 抠品红 → 拼精灵图集 → 接进 web3d 的一个座位。

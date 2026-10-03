# 正常比例医疗兵（非 Q 版）动作

## 首帧（你选的 5 号）

**`medic_full_v5_pure.png`**：纯品红 `#FF00FF` 背景，896×1344。抠视频帧时背景色值用 `#FF00FF`。

来源：`medic_full_v5_alpha.png`，`novelai_asset_character`（MCP 去掉画风后缀之后）· seed 763968483 · 896×1344，真透明通道，清掉了零星噪点。

```
2.1::transparent background::, has alpha, 1girl, solo, full body, centered, standing, relaxed pose, arms at sides, slight smile, looking at viewer, three-quarter view, facing slightly left, cyberpunk field medic, short teal bob hair, headset with microphone, white oversized high-collar jacket with teal stripes and red cross patch, black shorts, white socks, chunky sneakers, fingerless gloves, 1.1::artist:solipsist ::, year 2025, 0.65::artist:windforcelan ::, isolated, no background
```

负面（加在模式自带的负面后面）：`holding, holding object, floating objects, drone, magic, aura, glowing, light particles, sparkle, perspective, cropped, multiple views, chibi`

其他候选见 `candidates.png`（1–5 号）。

## Gemini 视频提示词（只给首帧，动作自由发挥）

每条都要保留的约束放在前半段：固定镜头、背景不变、人物不出画、不加光效。不加光效，是因为特效由游戏引擎叠加，而且光效会污染品红背景，导致抠图失败。

### 施放治疗（首尾帧都用 `medic_full_v5_pure.png`，回到 idle）

```
Fixed static camera, no zoom, no pan, no camera movement. The flat solid magenta (#FF00FF) background stays perfectly uniform for the entire video. The anime girl stays fully in frame from head to shoes, feet planted in place.

Action, beat by beat:
0.0–0.4s: Anticipation. A small breath, shoulders rise slightly, her smile fades into focus.
0.4–0.8s: Her left hand (on the image's right side) presses flat onto the center of her chest; her right arm (on the image's left side) draws back, elbow bent, hand near her shoulder.
0.8–1.3s: She thrusts her right arm straight out toward the image's left edge, palm opening and fingers spreading at full extension, upper body leaning slightly into the reach, head turning to follow the hand.
1.3–1.9s: She holds the pose for a beat, mouth slightly open as if speaking a short command; jacket sleeve, hem and bob hair swing and settle.
1.9–2.8s: She relaxes: the right arm lowers back to her side in an easy arc, the left hand slides down from her chest, shoulders drop, a small satisfied smile returns.
2.8s–end: She is back in her relaxed standing pose, matching the final frame exactly.

No glowing effects, no particles, no light, no new objects, no shadows on the background. Keep the same 2D anime illustration style, colors and line art throughout.
```

尾帧候选 `medic_full_cast_A.png` / `medic_full_cast_B.png`（施法姿势）目前不用，留作备用。

### 待机呼吸（首尾相接，循环用）

```
Fixed static camera, no camera movement. The flat solid magenta background stays perfectly uniform. The anime girl stands idle in place: gentle breathing, a slight weight shift, a small blink and a tiny head tilt, hair and jacket sway subtly. She ends in exactly the same pose as the first frame so the clip can loop. No effects, no particles, no shadows. Keep the same 2D anime illustration style throughout.
```

### 受击

```
Fixed static camera, no camera movement. The flat solid magenta background stays perfectly uniform. The anime girl, standing in place, gets hit by an unseen impact from the front: she flinches backward, shoulders hunched, arms coming up defensively, eyes squeezed shut, then recovers to her standing pose. Feet stay planted, she stays fully in frame. No blood, no effects, no particles, no shadows. Keep the same 2D anime illustration style throughout.
```

## 中文版（Seedance 或其他中文模型）

```
固定机位，镜头完全不动，纯品红色（#FF00FF）背景全程保持均匀不变。动漫少女从头到鞋始终完整在画面内，双脚原地不动。

动作分段：
0.0–0.4 秒：蓄势。轻吸一口气，肩膀微微抬起，笑容收起，眼神变得专注。
0.4–0.8 秒：她的左手（画面右侧那只）抬起，掌心平按在胸口正中；右臂（画面左侧那只）向后收，手肘弯曲，手停在肩膀旁。
0.8–1.3 秒：右臂向画面左侧果断地伸直推出，手肘伸直的同时掌心张开、五指张开，上身微微前倾，头稍稍转向伸出的手。
1.3–1.9 秒：保持施法姿势片刻，嘴微张像在念一句简短的指令；外套袖子、下摆和短发随惯性摆动后落定。
1.9–2.8 秒：放松收势：右臂沿弧线放回身侧，左手从胸口滑下，肩膀放松，露出满意的浅笑。
2.8 秒至结束：回到放松站立的姿势，与尾帧完全一致。

没有任何光效、粒子、新物体或背景阴影，全程保持同样的二次元插画画风、配色和线条。
```

## 生成设置

- 比例尽量选 9:16 或 2:3（竖版），分辨率选最高（至少 720p，越高越好）。
- 回来后的流程和 Q 版一样：抽帧 → 抠图（背景色值用上面的）→ 拼图集 → 接进 web3d。

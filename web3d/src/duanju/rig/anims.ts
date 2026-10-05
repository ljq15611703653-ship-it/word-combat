// 关键帧动画：每个动作是一组 轨道 [骨骼, 属性, [[时间, 值], ...]]，相邻关键帧用余弦缓动插值。
// 角度单位度，正方向 = 顺时针（屏幕坐标 y 向下）；角色朝右，所以「向前抬臂」= 负角，「后仰」= 负角。
export type AnimName = "idle" | "cast" | "hurt";
export type Prop = "x" | "y" | "rot" | "sx" | "sy";
type Key = [number, number];
type Track = [string, Prop | "glow" | "flash" | "tint", Key[]];
export interface Pose { bones: Record<string, Partial<Record<Prop, number>>>; root?: { x: number; y: number }; glow?: number; flash?: number; tint?: number }
export interface Anim { dur: number; loop: boolean; tracks: Track[] }

const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));
function sample(keys: Key[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}
/** 循环轨道：sin 形，周期 = 动作时长，相位 ph（0..1）、幅度 amp */
const wave = (amp: number, ph = 0, d = 3.2, n = 8): Key[] => Array.from({ length: n + 1 }, (_, i) => [d * i / n, amp * Math.sin(2 * Math.PI * (i / n + ph))] as Key);

export const ANIMS: Record<AnimName, Anim> = {
  idle: {
    dur: 3.2, loop: true, tracks: [
      ["hip", "y", wave(-4, 0)], ["torso", "rot", wave(-0.9, 0.05)], ["torso", "sy", wave(0.008, 0).map(([t, v]) => [t, 1 + v] as Key)],
      ["head", "rot", wave(1.6, -0.035)], ["hair", "rot", wave(3.6, -0.28)], ["neck", "rot", wave(0.8, -0.03)],
      ["sh_far", "rot", wave(2.2, -0.1)], ["el_far", "rot", wave(2, -0.2)], ["wr_far", "rot", wave(3, -0.3)],
      ["sh_near", "rot", wave(-2.4, -0.1)], ["el_near", "rot", wave(-2.4, -0.2)], ["wr_near", "rot", wave(-3, -0.3)],
      ["cape", "rot", wave(3, -0.25)], ["skirt", "rot", wave(2.4, -0.3)], ["strap", "rot", wave(4, -0.3)], ["tail", "rot", wave(5, -0.35)],
      ["holo", "y", wave(-14, 0.1)], ["holo", "rot", wave(4, 0.3)], ["drone", "y", wave(16, 0.4)], ["drone", "x", wave(8, 0.15)], ["drone", "rot", wave(5, 0.2)],
      ["root", "x", wave(0, 0)],
    ],
  },
  cast: {
    dur: 1.0, loop: false, tracks: [
      ["hip", "x", [[0, 0], [0.28, -16], [0.5, 26], [0.75, 18], [1, 0]]], ["hip", "y", [[0, 0], [0.28, 12], [0.5, 4], [1, 0]]],
      ["torso", "rot", [[0, 0], [0.28, -8], [0.5, 10], [0.75, 6], [1, 0]]], ["head", "rot", [[0, 0], [0.28, -5], [0.5, 6], [1, 0]]],
      ["hair", "rot", [[0, 0], [0.3, -6], [0.55, 14], [0.8, -4], [1, 0]]],
      ["sh_near", "rot", [[0, 0], [0.28, 38], [0.5, -98], [0.72, -88], [1, 0]]], ["el_near", "rot", [[0, 0], [0.28, 24], [0.5, -14], [0.72, -8], [1, 0]]], ["wr_near", "rot", [[0, 0], [0.28, 20], [0.5, -10], [1, 0]]],
      ["sh_far", "rot", [[0, 0], [0.28, -10], [0.5, 12], [0.75, 8], [1, 0]]], ["el_far", "rot", [[0, 0], [0.28, -16], [0.5, 12], [1, 0]]],
      ["hp_far", "rot", [[0, 0], [0.28, 5], [0.5, -9], [1, 0]]], ["hp_near", "rot", [[0, 0], [0.28, -6], [0.5, 8], [1, 0]]],
      ["kn_far", "rot", [[0, 0], [0.28, -6], [0.5, 8], [1, 0]]], ["kn_near", "rot", [[0, 0], [0.28, 8], [0.5, -4], [1, 0]]],
      ["cape", "rot", [[0, 0], [0.3, -8], [0.55, 16], [0.85, -5], [1, 0]]], ["skirt", "rot", [[0, 0], [0.3, -6], [0.55, 12], [1, 0]]], ["strap", "rot", [[0, 0], [0.3, -10], [0.55, 20], [1, 0]]], ["tail", "rot", [[0, 0], [0.3, -10], [0.55, 24], [0.85, -8], [1, 0]]],
      ["holo", "x", [[0, 0], [0.28, -20], [0.5, -60], [1, 0]]], ["holo", "y", [[0, 0], [0.28, -30], [0.5, -90], [1, 0]]], ["holo", "sx", [[0, 1], [0.5, 1.35], [1, 1]]], ["holo", "sy", [[0, 1], [0.5, 1.35], [1, 1]]],
      ["drone", "x", [[0, 0], [0.5, 130], [1, 0]]], ["drone", "y", [[0, 0], [0.28, -30], [0.5, 40], [1, 0]]],
      ["", "glow", [[0, 0], [0.26, 0.9], [0.5, 1], [0.8, 0.4], [1, 0]]],
    ],
  },
  hurt: {
    dur: 0.5, loop: false, tracks: [
      ["root", "x", [[0, 0], [0.07, -16], [0.14, -12], [0.2, -17], [0.5, 0]]], ["root", "y", [[0, 0], [0.07, -6], [0.5, 0]]],
      ["hip", "rot", [[0, 0], [0.07, -9], [0.2, -6], [0.5, 0]]], ["torso", "rot", [[0, 0], [0.07, -9], [0.2, -5], [0.5, 0]]],
      ["head", "rot", [[0, 0], [0.07, -18], [0.2, -8], [0.5, 0]]], ["hair", "rot", [[0, 0], [0.1, 22], [0.3, -10], [0.5, 0]]],
      ["sh_near", "rot", [[0, 0], [0.07, 34], [0.25, 14], [0.5, 0]]], ["el_near", "rot", [[0, 0], [0.07, 20], [0.5, 0]]],
      ["sh_far", "rot", [[0, 0], [0.07, -26], [0.25, -8], [0.5, 0]]], ["el_far", "rot", [[0, 0], [0.07, -18], [0.5, 0]]],
      ["hp_far", "rot", [[0, 0], [0.07, 8], [0.5, 0]]], ["kn_far", "rot", [[0, 0], [0.07, -10], [0.5, 0]]],
      ["hp_near", "rot", [[0, 0], [0.07, -6], [0.5, 0]]], ["kn_near", "rot", [[0, 0], [0.07, 10], [0.5, 0]]],
      ["cape", "rot", [[0, 0], [0.1, 20], [0.3, -8], [0.5, 0]]], ["skirt", "rot", [[0, 0], [0.1, 16], [0.5, 0]]], ["strap", "rot", [[0, 0], [0.1, 25], [0.3, -10], [0.5, 0]]], ["tail", "rot", [[0, 0], [0.1, 28], [0.3, -12], [0.5, 0]]],
      ["", "flash", [[0, 0.95], [0.1, 0.85], [0.2, 0], [0.26, 0.55], [0.36, 0], [0.5, 0]]],
      ["", "tint", [[0, 0.5], [0.3, 0.3], [0.5, 0]]],
    ],
  },
};

/** 位置风格：词位=出手克制/稍慢；数位=腕盘发光（待机呼吸式脉动）；速位=幅度更大、更快 */
export type RigStyle = "ci" | "shu" | "su";
export const STYLE_MOD: Record<RigStyle, { amp: number; speed: number }> = { ci: { amp: 0.72, speed: 0.92 }, shu: { amp: 1, speed: 1 }, su: { amp: 1.3, speed: 1.4 } };
export const speedOf = (style?: RigStyle) => (style ? STYLE_MOD[style].speed : 1);

export function samplePose(name: AnimName, t: number, gain?: Record<string, number>, style?: RigStyle): Pose {
  const a = ANIMS[name], pose: Pose = { bones: {} };
  const sm = style ? STYLE_MOD[style] : { amp: 1, speed: 1 };
  for (const [bone, prop, keys] of a.tracks) {
    let v = sample(keys, t * sm.speed); if (gain && bone && prop === "rot") v *= gain[bone] ?? 1;
    if (bone && (prop === "rot" || prop === "x" || prop === "y") && bone !== "root") v *= sm.amp;
    if (!bone) { (pose as any)[prop] = v; continue; }
    if (prop === ("glow" as any)) continue;
    (pose.bones[bone] ??= {})[prop as Prop] = v;
  }
  if (style === "shu") {
    if (name === "idle") pose.glow = 0.3 + 0.28 * Math.sin((2 * Math.PI * t) / a.dur);
    else if (name === "cast") pose.glow = Math.max(pose.glow ?? 0, 0.85 * Math.sin(Math.PI * Math.min(1, t / a.dur)) ** 0.7);
  }
  return pose;
}

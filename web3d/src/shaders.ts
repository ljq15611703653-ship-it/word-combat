// 两个自定义着色器：
// 1. 立绘的「数字屏幕失真」：绿色荧光、扫描线、色散、横向撕裂、滚动亮带、噪点、闪烁。
// 2. 卡体走线层：沿走线流动的电流光。
import * as THREE from "three";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const PORTRAIT_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uTime;
uniform float uGlitch;     // 0..1 受击时的瞬时撕裂强度
uniform float uDistort;    // 常驻失真强度（滑块）
uniform float uMix;        // 0 = 原色，1 = 全绿荧光
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uTint;
uniform vec4 uRect;      // 取图范围：xy 偏移，zw 缩放
uniform float uFade;     // 底部渐隐的高度
varying vec2 vUv;

float h1(float n) { return fract(sin(n) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float t = uTime + uSeed * 17.0;
  vec2 uv = uRect.xy + vUv * uRect.zw;

  // 偶发的自然故障：每 1/8 秒掷一次骰子
  float natural = step(0.988, h1(floor(t * 8.0) + uSeed)) * 0.5;
  float burst = clamp(uGlitch + natural * uDistort, 0.0, 1.5);

  // 横向撕裂：把画面切成横条，部分条带左右错位
  float band = floor(vUv.y * 46.0);
  float pick = step(0.55, h1(band * 1.37 + floor(t * 14.0)));
  uv.x += (h1(band + floor(t * 30.0)) - 0.5) * 0.11 * burst * pick;
  // 常驻的轻微波纹
  uv.x += sin(uv.y * 38.0 + t * 2.6) * 0.0018 * uDistort;

  // 色散：红蓝通道左右分离
  float ca = (0.003 + 0.022 * burst) * uDistort;
  vec4 cR = texture2D(map, uv + vec2(ca, 0.0));
  vec4 cG = texture2D(map, uv);
  vec4 cB = texture2D(map, uv - vec2(ca, 0.0));
  vec3 col = vec3(cR.r, cG.g, cB.b);
  float a = max(cG.a, max(cR.a, cB.a) * 0.75);

  // 绿色荧光：保留原色，只把暗部和中间调往荧光绿推一点
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 phos = uTint * (0.04 + pow(lum, 1.25) * 1.75);
  col = mix(col, phos, uMix) + uTint * 0.05 * uMix;

  // 扫描线 + 像素栅格
  float scan = 0.82 + 0.18 * sin(vUv.y * 900.0);
  float grid = 0.94 + 0.06 * sin(vUv.x * 600.0);
  col *= mix(1.0, scan * grid, uDistort);

  // 自上而下滚动的亮带
  float roll = 1.0 - smoothstep(0.0, 0.05, abs(fract(vUv.y + t * 0.11) - 0.5));
  col += uTint * 0.12 * roll * uDistort;

  // 数字噪点与闪烁
  col += (h2(vUv * vec2(640.0, 960.0) + fract(t * 7.0)) - 0.5) * 0.06 * uDistort;
  col *= 1.0 - 0.06 * uDistort * (0.5 + 0.5 * sin(t * 57.0));

  // 受击时随机掉块（整块像素丢失）
  vec2 blk = floor(vUv * vec2(10.0, 18.0));
  float drop = step(1.0 - 0.18 * uGlitch, h2(blk + floor(t * 20.0)));
  a *= 1.0 - drop * 0.85;

  // 底部渐隐，像从底座投出来的影像；抠图边缘残留的淡 alpha 直接丢掉
  a *= smoothstep(0.0, uFade, vUv.y);
  if (a < 0.06) discard;
  gl_FragColor = vec4(col, a * uOpacity);
}`;

export function portraitMaterial(map: THREE.Texture, seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uDistort: { value: 0.4 },
      uMix: { value: 0.15 },
      uOpacity: { value: 1 },
      uSeed: { value: seed },
      uTint: { value: new THREE.Color(0x39ff9c) },
      uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uFade: { value: 0.14 },
    },
    vertexShader: VERT,
    fragmentShader: PORTRAIT_FRAG,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

const CIRCUIT_FRAG = /* glsl */ `
uniform sampler2D mask;
uniform float uTime;
uniform float uBase;
uniform float uPulse;
uniform vec3 uColor;
varying vec2 vUv;
float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float m = texture2D(mask, vUv).a;
  // 两道沿竖直方向流动的电流
  float f1 = 1.0 - smoothstep(0.0, 0.07, abs(fract(vUv.y - uTime * 0.23) - 0.5));
  float f2 = 1.0 - smoothstep(0.0, 0.04, abs(fract(vUv.y * 1.7 + vUv.x * 0.6 + uTime * 0.17) - 0.5));
  float spark = step(0.995, h2(floor(vUv * 80.0) + floor(uTime * 6.0)));
  float k = uBase + uPulse * (f1 + 0.6 * f2) + spark;
  gl_FragColor = vec4(uColor * k, m * clamp(k, 0.0, 1.0));
}`;

export function circuitMaterial(mask: THREE.Texture, color: number, base: number, pulse: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      mask: { value: mask },
      uTime: { value: 0 },
      uBase: { value: base },
      uPulse: { value: pulse },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: VERT,
    fragmentShader: CIRCUIT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

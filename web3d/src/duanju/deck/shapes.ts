// 面积（= 引擎里的价格）→ 形状 [宽, 高]。2→1×2，3→1×3，8→2×4（横放宽 4 高 2）。
// 其余面积按「窄条优先」扩展：4 → 2×2；其余 ≤5 → 一条；6 → 3×2；偶数 ≥10 → (a/2)×2；奇数 ≥7 → ceil(a/2)×2（多占 1 格，只有自定义规则会碰到）。
// 板宽 6：宽度超过板宽的形状不支持（会被 shapeOk 拒绝）。
export function shapeFor(area: number): [number, number] {
  if (area === 8) return [4, 2];
  if (area === 4) return [2, 2];
  if (area <= 5) return [area, 1];
  if (area === 6) return [3, 2];
  return [Math.ceil(area / 2), 2];
}

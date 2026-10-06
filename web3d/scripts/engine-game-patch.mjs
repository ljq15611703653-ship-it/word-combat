// 游戏专有逻辑保持为可复核的补丁。上游上下文变化时拒绝同步，防止悄悄丢失规则。
import { readFileSync } from 'node:fs';
const patch = readFileSync(new URL('./duanju-assertion.patch', import.meta.url), 'utf8').replaceAll('\r', '');
export function applyGamePatch(file, source) {
  const section = patch.split(/^diff --git /m).find(s => s.startsWith(`a/web3d/src/duanju/engine/${file}.ts `));
  if (!section) return source;
  const lines = source.replaceAll('\r', '').split('\n');
  let shift = 0;
  for (const hunk of section.split(/^@@ /m).slice(1)) {
    const header = hunk.match(/^-(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@[^\n]*\n/);
    if (!header) throw new Error(`不能读取 ${file} 补丁`);
    const body = hunk.slice(header[0].length).split('\n');
    const old = [], next = [];
    for (const line of body) {
      if (line[0] === ' ' || line[0] === '-') old.push(line.slice(1));
      if (line[0] === ' ' || line[0] === '+') next.push(line.slice(1));
    }
    const at = Math.max(0, +header[1] - 1) + shift;
    if (lines.slice(at, at + old.length).join('\n') !== old.join('\n')) throw new Error(`游戏补丁上下文变化：${file}:${header[1]}，请复核后更新 duanju-assertion.patch`);
    lines.splice(at, old.length, ...next); shift += next.length - old.length;
  }
  return lines.join('\n');
}

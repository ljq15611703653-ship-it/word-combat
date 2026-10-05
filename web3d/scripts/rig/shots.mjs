// 骨骼测试页截图：node scripts/rig/shots.mjs <端口> <输出目录> <名称=查询串> ...
//   例: node scripts/rig/shots.mjs 5391 D:/wc/art/rig/_sheets ye_cast="c=ye_qi&sheet=cast&n=8"
// 每个作业宽度按 n 帧自动估算；页面设置 window.__ready 后截图。
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, sleep } from "../vfx-lib.mjs";
const [port, out, ...jobs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const c = await launch(9433, 1900, 400, "D:/wc/ud_rig");
for (const j of jobs) {
  const i = j.indexOf("="), name = j.slice(0, i), qs = j.slice(i + 1);
  const p = new URLSearchParams(qs), n = p.get("sheet") ? Number(p.get("n") ?? 8) : 1, rows = (p.get("c") ?? "ye_qi").split(",").length;
  const H = Number(p.get("h") ?? 360);
  await c.cdp("Emulation.setDeviceMetricsOverride", { width: Math.round(H * 0.62 * n) + 4, height: H * rows + 4, deviceScaleFactor: 1, mobile: false });
  await c.cdp("Page.navigate", { url: `http://127.0.0.1:${port}/duanju-rig.html?${qs}` });
  for (let k = 0; k < 100; k++) { if (await c.ev("!!window.__ready")) break; await sleep(100); }
  await sleep(150);
  const r = await c.cdp("Page.captureScreenshot", { format: "png" });
  if (!r.result) console.log(JSON.stringify(r)); writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, "base64")); console.log("shot", name);
}
if (c.errs.length) console.log("errors:", c.errs.slice(0, 5));
c.proc.kill(); process.exit(0);

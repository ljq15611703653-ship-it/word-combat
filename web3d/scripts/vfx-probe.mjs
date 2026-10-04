import { launch, sleep } from "./vfx-lib.mjs";
const [port = "5182", style = "bing", w = "1280", h = "720", prefix = "p"] = process.argv.slice(2);
const c = await launch(9411, +w, +h);
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${port}/duanju.html` }); await sleep(1500);
await c.ev(`localStorage.setItem('duanju.settings', JSON.stringify({styleId:'${style}',tier:'进阶',rules:'default'}))`);
await c.cdp("Page.navigate", { url: `http://127.0.0.1:${port}/duanju.html?auto=1&speed=0` }); await sleep(1200);
await c.ev("document.querySelector('.su-go').click()");
// 等到出现 vx-layer，然后连拍
let n = 0, t0 = Date.now();
while (Date.now() - t0 < 60000 && n < 40) {
  const has = await c.ev("!!document.querySelector('.vx-layer')");
  if (has) { await c.shot(`D:/wc/vfx_shots/${prefix}_${style}_${String(n++).padStart(2, "0")}.jpg`); await sleep(110); } else await sleep(150);
}
console.log("frames", n, "errors", JSON.stringify(c.errs), await c.ev("JSON.stringify(__dj.errors)"));
c.proc.kill(); process.exit(0);

// 骨骼小人测试页：?c=ye_qi&a=cast&t=0.4（单帧）  ?c=ye_qi&sheet=cast&n=8（联系表：n 帧横排）  ?c=ye_qi&live=1（实时）
import { createRig } from "./rig";
import { ANIMS, type AnimName } from "./anims";
const q = new URLSearchParams(location.search);
const chars = (q.get("c") ?? "ye_qi").split(",");
const root = document.getElementById("root")!;
const done = () => { document.title = "ready"; (window as any).__ready = true; };
const sheet = q.get("sheet") as AnimName | null, live = q.get("live");
const jobs: Promise<void>[] = [];
for (const c of chars) {
  const row = document.createElement("div"); row.className = "row"; root.appendChild(row);
  const anims: AnimName[] = sheet ? [sheet] : [(q.get("a") as AnimName) ?? "idle"];
  const n = sheet ? Number(q.get("n") ?? 8) : 1;
  for (const a of anims) for (let i = 0; i < n; i++) {
    const cell = document.createElement("div"); cell.className = "cell"; row.appendChild(cell);
    const f = createRig(c, cell, { scale: Number(q.get("s") ?? 0.5), paused: !live });
    if (q.get("flip")) f.setFacing(-1);
    if (live) { f.play(a); continue; }
    const t = sheet ? (ANIMS[a].dur * i) / Math.max(1, n - 1) * 0.999 : Number(q.get("t") ?? 0);
    jobs.push(new Promise<void>((res) => { const iv = setInterval(() => { f.seek(a, t); if (f.canvas.width > 300 && f.canvas.isConnected) { clearInterval(iv); res(); } }, 30); setTimeout(() => { clearInterval(iv); res(); }, 4000); }));
  }
}
Promise.all(jobs).then(() => setTimeout(done, 100));

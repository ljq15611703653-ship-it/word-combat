// intro.html 的预览脚本。参数：?t=12 从第 12 秒开始；&pause=1 暂停在该时刻（截图用）。
import { playIntro, type IntroControl } from "./index";

const q = new URLSearchParams(location.search);
const end = document.getElementById("end")!;
const app = document.getElementById("app")!;

async function run() {
  end.style.display = "none";
  await playIntro(app, {
    start: Number(q.get("t") ?? 0), paused: q.get("pause") === "1",
    onControl: (c: IntroControl) => { (window as unknown as { __intro: IntroControl }).__intro = c; },
  });
  end.style.display = "flex";
}
document.getElementById("again")!.addEventListener("click", () => { q.delete("t"); q.delete("pause"); void run(); });
void run();

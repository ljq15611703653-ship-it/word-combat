// 主界面顶部入口栏：打电脑 / 教程 / 四职业特训（特训通关教程后开放；?unlock=all 绕过）
import "./story/train/train.css";
export function mountNav(unlockedAll: boolean) {
  if (document.querySelector(".dj-nav")) return;
  let ok = unlockedAll;
  for (const key of ["duanju.story.v2","duanju.story.v1"]) { try { ok = ok || (JSON.parse(localStorage.getItem(key) ?? "null")?.done ?? []).includes(14); } catch { /* */ } }
  const n = document.createElement("nav"); n.className = "dj-nav";
  n.innerHTML = `<a class="on" href="duanju.html">打电脑</a><a href="duanju-story.html">教程</a>` + (ok ? `<a href="duanju-train.html">四职业特训</a>` : `<a class="lock" title="通关教程后开放">四职业特训 · 通关教程后开放</a>`);
  document.body.appendChild(n);
}

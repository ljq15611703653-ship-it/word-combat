// 菜单版教学输入：包一层 MenuInput，把菜单过滤成「本关允许的句子」，并高亮应选的那一条。
// 之后换成 composer（逐词拼句）时，只需把 resolve 的结果通过 InputMode.setGuide 交给它，本文件整体替换为适配层。
import { MenuInput } from "../../inputMenu";
import type { Sentence } from "../../engine/api";
import type { Guide, InputCtx, InputMode } from "../../types";

export interface Resolved { allowed: (cl: Sentence) => boolean; want?: ((cl: Sentence) => boolean) | null; hint?: string[]; denyText?: string }

export class GuidedInput implements InputMode {
  id = "guided-menu"; label = "教学菜单";
  private inner = new MenuInput();
  private obs: MutationObserver | null = null;
  private override: Guide | null = null;
  constructor(private resolve: (ctx: InputCtx) => Resolved) {}
  isOpen() { return this.inner.isOpen(); }
  close() { this.obs?.disconnect(); this.obs = null; this.inner.close(); }
  setGuide(g: Guide | null) { this.override = g; }
  open(ctx: InputCtx) {
    const r = this.resolve(ctx);
    const allowed = this.override?.allowed ?? r.allowed;
    let list: { cl: Sentence }[] = [];
    const proxy = Object.create(ctx.match);
    proxy.legalSentences = (u: number) => { list = ctx.match.legalSentences(u, 400).filter((c) => allowed(c.cl)); return list as any; };
    this.inner.open({ ...ctx, match: proxy });
    const el = ctx.host.querySelector<HTMLElement>(".dj-menu");
    if (!el) return;
    el.classList.add("guided");
    const mark = () => {
      el.querySelectorAll<HTMLElement>(".mn-row").forEach((row) => {
        const c = list[+row.dataset.i!];
        row.classList.toggle("guide", !!(c && r.want && r.want(c.cl)));
      });
    };
    mark();
    this.obs = new MutationObserver(mark);
    this.obs.observe(el.querySelector(".mn-list")!, { childList: true });
    el.querySelector<HTMLElement>(".mn-row.guide")?.scrollIntoView({ block: "nearest" });
    // 教学里没有搜索
    el.querySelector<HTMLElement>(".mn-q")?.setAttribute("hidden", "");
  }
}

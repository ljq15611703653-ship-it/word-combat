// 动态调度的进程池：任务队列，哪个工作进程空了就领下一个。最多 6 个进程（机器上还有别人在跑实验）。
import "./mineenv";
import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const MAX_WORKERS = 6;
export class MPool {
  private ws: ChildProcess[] = [];
  private pending = new Map<number, { res: (v: any) => void; rej: (e: Error) => void; w: number }>();
  private queue: { id: number; job: string; args: any }[] = [];
  private busy: boolean[] = [];
  private nextId = 0;
  done = 0;
  constructor(n = +(process.env.WORKERS ?? MAX_WORKERS)) {
    n = Math.max(1, Math.min(n, MAX_WORKERS));
    const dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < n; i++) {
      const w = fork(join(dir, "mworker.ts"), [], { execArgv: ["--import", "tsx"], stdio: ["ignore", "inherit", "inherit", "ipc"], env: process.env });
      w.on("message", (m: { id: number; result?: any; error?: string }) => {
        const p = this.pending.get(m.id)!; this.pending.delete(m.id); this.busy[i] = false; this.done++;
        if (m.error) p.rej(new Error(m.error)); else p.res(m.result);
        this.pump();
      });
      this.ws.push(w); this.busy.push(false);
    }
  }
  private pump() {
    for (let i = 0; i < this.ws.length && this.queue.length; i++) {
      if (this.busy[i]) continue;
      const t = this.queue.shift()!; this.busy[i] = true;
      this.pending.get(t.id)!.w = i;
      this.ws[i].send(t);
    }
  }
  /** 提交一批同类任务，返回按提交顺序排列的结果 */
  run<T = any>(job: string, argsList: any[], onProgress?: (done: number, total: number) => void): Promise<T[]> {
    let d = 0;
    const ps = argsList.map((args) => new Promise<T>((res, rej) => {
      const id = this.nextId++;
      this.pending.set(id, { res: (v) => { d++; onProgress?.(d, argsList.length); res(v); }, rej, w: -1 });
      this.queue.push({ id, job, args });
    }));
    this.pump();
    return Promise.all(ps);
  }
  close() { this.ws.forEach((w) => w.kill()); }
}

// 进程池：把对局任务分给多个工作进程并行跑
import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Task, Out } from "./worker";

export class Pool {
  private ws: ChildProcess[] = [];
  constructor(n: number) {
    const dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < n; i++) this.ws.push(fork(join(dir, "worker.ts"), [], { execArgv: ["--import", "tsx"], stdio: ["ignore", "inherit", "inherit", "ipc"] }));
  }
  run(tasks: Task[]): Promise<Out[]> {
    const n = this.ws.length, chunks: Task[][] = Array.from({ length: n }, () => []);
    tasks.forEach((t, i) => chunks[i % n].push(t));
    return Promise.all(this.ws.map((w, i) => new Promise<Out[]>((res, rej) => {
      if (!chunks[i].length) return res([]);
      w.once("message", (m: { out: Out[] }) => res(m.out));
      w.once("error", rej);
      w.send({ tasks: chunks[i] });
    }))).then((x) => x.flat());
  }
  close() { this.ws.forEach((w) => w.kill()); }
}

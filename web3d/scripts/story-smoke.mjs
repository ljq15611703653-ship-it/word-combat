// 引擎级冒烟入口：node scripts/story-smoke.mjs （V=1 打印每步）
import { spawnSync } from "node:child_process";
const r = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/story-smoke.ts"], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);

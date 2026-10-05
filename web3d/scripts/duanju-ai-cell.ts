// 单个对战单元（工作进程）：node ... duanju-ai-cell.ts <A规格> <B规格> <局数> <种子> [起始序号]  → 输出 JSON {w,d,l,rounds}
import { configureRules } from "../src/duanju/engine/api";
import { duel, player } from "./duanju-ai-lib";
const [, , A, B, N = "20", seed = "1", off = "0"] = process.argv;
configureRules("default");
const o = +off;
const r = duel(+N, (i) => player(A, i + o), (i) => player(B, i + o), +seed, o);
console.log(JSON.stringify(r));

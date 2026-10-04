// 规则环境：必须是第一个被 import 的模块。规则（rules.json / rules2.json）还在迭代，所以每次运行时现读，
// 设到环境变量 LAB / LAB2；子进程（pool 工作进程）会继承环境变量，保证主进程与工作进程用同一套规则。
import { readFileSync, existsSync, mkdirSync } from "node:fs";
export const RULES_DIR = process.env.RULES_DIR ?? "D:/wc/out";
if (!process.env.LAB && existsSync(`${RULES_DIR}/rules.json`)) process.env.LAB = readFileSync(`${RULES_DIR}/rules.json`, "utf8");
if (!process.env.LAB2 && existsSync(`${RULES_DIR}/rules2.json`)) process.env.LAB2 = readFileSync(`${RULES_DIR}/rules2.json`, "utf8");
/** 所有产物输出目录（D 盘） */
export const OUT = process.env.OUT ?? "D:/wc/mine";
mkdirSync(OUT, { recursive: true });

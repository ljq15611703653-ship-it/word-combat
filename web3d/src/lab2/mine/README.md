# 句子挖掘 + 决策表蒸馏工具链（lab2/mine）

所有脚本从 `web3d/` 目录运行：`node --import tsx src/lab2/mine/<脚本>.ts`。产物默认写到 `D:/wc/mine/`（环境变量 `OUT` 可改）。
规则每次现读 `D:/wc/out/rules.json` + `rules2.json`（环境变量 `RULES_DIR` 改目录，或直接设 `LAB` / `LAB2`），工作进程继承；**不写死任何规则参数**。
进程池最多 6 个工作进程（`WORKERS` 可调小，不能超过 6）。

| 步骤 | 脚本 | 产物 |
|---|---|---|
| 1 句子库 | `mine.ts`（`N=10000 SEED=1`） | `sentences.jsonl`（一行一句：id/key/中文/家族/进阶词/费用/长度/AST）、`sentences.meta.json` |
| 2 局面样本库 | `states.ts`（`N=300 NAME=points`） | `points.jsonl`（一行一个局面点，`st` 是整个对局状态的 JSON，`JSON.parse` 即可还原成 `St`；`side`/`unit` 指轮到谁、哪个随从）、`points.meta.json` |
| 3 漏斗评估 | `funnel.ts` | `funnel.json`、`pass.jsonl`（通过复验的精选句子）、`leaderboard.md`（总榜/家族榜/位置榜） |
| 4 蒸馏 | `distill.ts` | `decisions.jsonl`、`distill.json`（机器可读：树/规则/准确率）、`decision_table.md`（中文规则清单） |

共用库 `minelib.ts`（变异/交叉/规范化/家族/特征/推演/电脑配置）、`mpool.ts`+`mworker.ts`（进程池）、`mineenv.ts`（规则环境，必须第一个 import）。

## 小规模验证（已跑通，规则见产物里的 meta）

```
node --import tsx src/lab2/mine/mine.ts                                  # 1 万句，约 3~5 秒
node --import tsx src/lab2/mine/states.ts                                # 300 局面，约 50 秒（6 进程）
NAME=points_big N=1200 SEED=500 node --import tsx src/lab2/mine/states.ts   # 给蒸馏用的大一点的局面库，约 200 秒
P1=60 D1=2 node --import tsx src/lab2/mine/funnel.ts                     # 1 万句 × 300 局面 × 3 配置，约 20~55 秒
node --import tsx src/lab2/mine/distill.ts                               # 1200 局面 × 3 配置 = 3600 条决策，约 30 秒
```

## 大规模运行（命令与预计耗时；机器按 6 进程估）

已实测：10 万句挖掘 5 秒（95 MB）；10 万句 × 300 局面 × 3 配置漏斗 178 秒（第 1 层 122 秒占大头）。

```
# 10 万句（实测）
N=100000 OUT=D:/wc/mine/big node --import tsx src/lab2/mine/mine.ts
SENT=D:/wc/mine/big/sentences.jsonl POINTS=D:/wc/mine/points.jsonl OUT=D:/wc/mine/big P1=40 D1=2 F1=0.05 node --import tsx src/lab2/mine/funnel.ts

# 100 万句（外推，未实测）：挖掘约 1~2 分钟；漏斗第 1 层约 20 分钟、第 2/3 层约 10 分钟 → 总共约 30~40 分钟
# 内存提醒：句子库 ≈ 1 GB（JSONL），主进程和每个工作进程各读一份。建议 NODE_OPTIONS=--max-old-space-size=6144，
# 或分 3~5 批（SEED=1,2,3… 各 20~30 万）分别跑漏斗，最后合并 pass.jsonl。
N=1000000 SEED=1 OUT=D:/wc/mine/m1 NODE_OPTIONS=--max-old-space-size=6144 node --import tsx src/lab2/mine/mine.ts

# 更大的局面库（精度更高，2000 局面约 6 分钟；漏斗时间与局面数成正比）
NAME=points N=2000 SEED=100 node --import tsx src/lab2/mine/states.ts
```

漏斗参数：`P1 D1 F1 FF1`（第 1 层局面数/推演深度/全局保留比例/每家族至少保留比例）、`P2 D2 F2 FF2`、`ROBUST`（各配置下都要排进前 x，默认 0.4）、`MINAPP`（适用点数下限）。
电脑配置：`evalCfgs()` 默认 3 种（留牌权重 0/0.3/0.6，留行动点 0.3/0.3/0.15，深度 2/2/3），环境变量 `EVAL_CFGS='[{"wCard":0},{"wCard":0.6,"depth":3}]'` 可覆盖。
蒸馏参数：`POINTS LIB K CFGS DEPTH MINLEAF`（见 distill.ts 头注释）。

## 对现有文件的改动

没有改动任何现有文件（`ai.ts` 里没导出的 `rollout` 在 `minelib.ts` 里按同一逻辑复刻了一份）。

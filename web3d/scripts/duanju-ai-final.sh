#!/bin/bash
# 完整评估（并行）：bash scripts/duanju-ai-final.sh > D:/wc/ai_eval.txt
cd "$(dirname "$0")/.."
P="node scripts/duanju-ai-par.mjs"
echo "## 新 vs 旧（卡组职业轮换，先后手各半，A=新）"
for t in 普通 进阶 大师; do $P new:$t:\* old:$t:~ 200 16; done
echo "## 四职业电脑互打（新AI·大师，行方胜率，A=行）"
for a in 并 限制 引用 状态; do for b in 并 限制 引用 状态; do echo -n "$a vs $b  "; $P new:大师:$a new:大师:$b 96 16; done; done
echo "## 旧AI·大师矩阵"
for a in 并 限制 引用 状态; do for b in 并 限制 引用 状态; do echo -n "$a vs $b  "; $P old:大师:$a old:大师:$b 96 16; done; done
echo "## 各档电脑(新/旧) 对 朴素玩家(naive) 与 新手玩家(novice)；A=电脑"
for t in 入门 普通 进阶 大师; do for opp in naive:x:并 novice:x:并; do $P new:$t:\* $opp 96 16; $P old:$t:\* $opp 96 16; done; done
echo "## 第14关：玩家(newbie卡组)=A，电脑=入门；电脑卡组 引用(首次) / 并(连输两次后)"
for opp in naive novice; do for fd in 引用 并; do $P $opp:x:并 new:入门:$fd 200 16; done; done

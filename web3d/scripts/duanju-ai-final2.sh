#!/bin/bash
cd "$(dirname "$0")/.."
P="node scripts/duanju-ai-par.mjs"
echo "## 矩阵剩余格（新AI·大师）"
for a in 限制 引用 状态; do for b in 并 限制 引用 状态; do [ "$a$b" = "限制并" -o "$a$b" = "限制限制" -o "$a$b" = "限制引用" ] && continue; echo -n "$a vs $b  "; $P new:大师:$a new:大师:$b 64 16; done; done
echo "## 各档电脑(新/旧) 对 新手(novice)、朴素(naive)；A=电脑"
for t in 入门 普通 进阶 大师; do $P new:$t:\* novice:x:并 64 16; $P old:$t:\* novice:x:并 64 16; $P new:$t:\* naive:x:并 64 16; done
echo "## 第14关：玩家(newbie卡组)=A，电脑=入门；电脑卡组 引用 / 并"
for opp in naive novice; do for fd in 引用 并; do $P $opp:x:并 new:入门:$fd 128 16; done; done
echo ALLDONE

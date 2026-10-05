#!/bin/sh
# 构建+预览+裁切: sh go2.sh <id> x0 y0 x1 y1 [scale]
ID=$1; cd "$(dirname "$0")"; export TEMP=D:/wc/tmp TMP=D:/wc/tmp
python -W ignore build.py $1 >/dev/null 2>D:/wc/tmp/b.err || tail -3 D:/wc/tmp/b.err; python -W ignore preview.py $1 2>&1 | tail -2; shift; python -W ignore crop2.py $ID $1 $2 $3 $4 $5 2>/dev/null

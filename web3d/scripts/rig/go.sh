#!/bin/sh
# 构建 + 预览: sh go.sh <id> ...
cd "$(dirname "$0")"
for i in "$@"; do python build.py $i 2>&1 | grep -i "error\|Traceback\|assert" ; python preview.py $i 2>&1 | grep -i "error\|Traceback"; done

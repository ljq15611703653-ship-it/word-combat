#!/bin/sh
# 用法：sweep.sh <局数> '<基础JSON>' 'KEY=v1,v2,v3' ...  对每个组合跑一遍矩阵，只打印关键行
N=$1; BASE=$2; shift 2
node -e '
const base = JSON.parse(process.argv[1]); const dims = process.argv.slice(2).map(a => { const [k, v] = a.split("="); return [k, v.split(",").map(Number)]; });
let combos = [{}]; for (const [k, vs] of dims) combos = combos.flatMap(c => vs.map(v => ({ ...c, [k]: v })));
for (const c of combos) console.log(JSON.stringify({ ...base, ...c }));' "$BASE" "$@" | while read L; do
  echo "== $L"; LAB="$L" node_modules/.bin/tsx src/lab/run.ts all $N 2>&1 | sed -n 3,8p | tr '\n' ' ' | sed 's/平均轮数/\n   平均轮数/'; echo
done

#!/bin/sh
# 词战 · 局域网联机（macOS / Linux）：需要先装 Node.js 18+
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "没找到 Node.js，请先安装（https://nodejs.org）"; exit 1; }
echo "房主：浏览器打开 http://localhost:${PORT:-8787}/ ；朋友打开下面列出的局域网地址"
PORT=${PORT:-8787} node server/server.mjs

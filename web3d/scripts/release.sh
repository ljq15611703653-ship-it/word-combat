#!/bin/sh
# 一条命令做两个发布物：
#   build/pages/            静态网页版（GitHub Pages /3d/，打电脑 + 新手教程；打真人提示下载联机版）
#   build/pages/lan/ci-zhan-lan.zip  局域网联机版（dist + 打包好的服务端 server.mjs + 启动脚本，只需要 Node.js，不用 npm install）
set -e
cd "$(dirname "$0")/.."
rm -rf build && mkdir -p build/lan
VITE_STATIC=1 node node_modules/vite/bin/vite.js build --base ./ --outDir build/pages --emptyOutDir
node node_modules/vite/bin/vite.js build --base ./ --outDir build/lan/dist --emptyOutDir
node_modules/esbuild/bin/esbuild server/index.ts --bundle --platform=node --format=esm --outfile=build/lan/server/server.mjs \
  "--banner:js=import {createRequire as __cr} from 'module'; const require = __cr(import.meta.url);"
cp release/start.sh release/open-firewall.ps1 release/联机说明.txt build/lan/
# .bat 转成 GBK + CRLF：中文 Windows 的 cmd 按本地编码（936）读批处理，UTF-8 会把半行中文当成命令执行
python3 - <<'PY'
for name in ["start.bat", "开放防火墙.bat", "关闭旧服务器.bat"]:
    text = open("release/" + name, encoding="utf-8").read().replace("\r\n", "\n").replace("\n", "\r\n")
    open("build/lan/" + name, "wb").write(text.encode("gbk"))
for name in ["联机说明.txt"]:
    text = open("build/lan/" + name, encoding="utf-8-sig").read().replace("\r\n", "\n").replace("\n", "\r\n")
    open("build/lan/" + name, "w", encoding="utf-8-sig", newline="").write(text)
print("bat -> gbk/crlf ok")
PY
mkdir -p build/pages/lan
python3 - <<'PY'
import os, zipfile
root = "build/lan"
with zipfile.ZipFile("build/pages/lan/ci-zhan-lan.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(d, f)
            z.write(p, os.path.join("词战联机版", os.path.relpath(p, root)))
print("zip ok")
PY
ls -la build/pages build/pages/lan

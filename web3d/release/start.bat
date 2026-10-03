@echo off
rem 词战局域网联机：双击运行。
rem 注意：仓库里是 UTF-8，scripts/release.sh 打包时会转成 GBK + CRLF；不要在这里加 chcp 65001。
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没找到 Node.js。请先安装 Node.js（LTS 版）：
  echo     https://nodejs.org/zh-cn/download
  echo     国内下载慢可以用 https://npmmirror.com/mirrors/node/
  echo 装好以后重新双击 start.bat。
  echo.
  pause
  exit /b 1
)
node server\server.mjs
echo.
pause

@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 没找到 Node.js。请先安装 Node.js（https://nodejs.org 或 https://npmmirror.com/mirrors/node/ 下载 LTS 版），装好后重新双击本文件。
  pause
  exit /b 1
)
echo ===== 词战 · 局域网联机 =====
echo 房主：浏览器打开 http://localhost:8787/
echo 朋友：打开下面列出的「局域网其他人」地址（必须和房主在同一个 Wi-Fi / 路由器下）
echo 主菜单点「打真人」-选卡组-「开始匹配」；两个人都点了就自动开打。
echo 朋友连不上：右键「开放防火墙.ps1」-用 PowerShell 运行（需要管理员），或看「联机说明.txt」。
echo 关闭这个窗口 = 关闭服务器。
echo.
if "%PORT%"=="" set PORT=8787
node server\server.mjs
pause

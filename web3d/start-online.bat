@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo 首次运行，安装依赖...
  call npm install
)
echo.
echo ===== 词战 联机（打真人）=====
echo 房主：浏览器打开 http://localhost:8787/
echo 对方：打开下面列出的“局域网其他人”地址（连不上先看 ONLINE.md 的防火墙一节）
echo 主菜单点“打真人”-选卡组-“开始匹配”；两个人都点了就自动开打，不用房间号。
echo 端口被占用时：先 set PORT=8791 再运行本脚本
echo.
call npm run online
pause

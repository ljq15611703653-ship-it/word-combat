@echo off
rem 放行词战联机端口（8787-8799，只对「专用网络」生效）。会弹出一次管理员确认。
rem 注意：仓库里是 UTF-8，scripts/release.sh 打包时会转成 GBK + CRLF。
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-firewall.ps1"
echo.
pause

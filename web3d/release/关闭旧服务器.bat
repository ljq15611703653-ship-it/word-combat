@echo off
rem 关掉占着 8787-8799 端口的 Node.js 程序（通常是以前开着没关的旧版词战服务器），别的程序不动。
rem 注意：仓库里是 UTF-8，scripts/release.sh 打包时会转成 GBK + CRLF。
echo 正在关闭占用 8787-8799 端口的程序……
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -ge 8787 -and $_.LocalPort -le 8799 -and (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName -eq 'node' } | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $p) { Write-Host '没有 Node.js 程序占着 8787-8799 端口。' } else { foreach ($i in $p) { $n = (Get-Process -Id $i -ErrorAction SilentlyContinue).ProcessName; Stop-Process -Id $i -Force -ErrorAction SilentlyContinue; Write-Host ('已关闭 ' + $n + ' (PID ' + $i + ')') } }"
echo.
echo 好了，现在双击 start.bat 重新开服。
pause

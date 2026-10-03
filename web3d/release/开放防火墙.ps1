# 用「管理员 PowerShell」运行：放行联机服务端口（仅专用网络）。-Remove 删除规则。
param([int]$Port = 8787, [switch]$Remove)
if ($Remove) { Remove-NetFirewallRule -DisplayName "CiZhan LAN" -ErrorAction SilentlyContinue; Write-Host "已删除规则"; exit }
New-NetFirewallRule -DisplayName "CiZhan LAN" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private | Out-Null
Write-Host "已放行 TCP $Port（专用网络）。当前网络类型："
Get-NetConnectionProfile | Format-Table InterfaceAlias, NetworkCategory

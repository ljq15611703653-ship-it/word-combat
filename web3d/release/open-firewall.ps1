# 放行词战联机服务端口（默认 8787-8799，只对「专用网络」生效）。
# 用法：双击「开放防火墙.bat」（会弹管理员确认）；删除规则：powershell -File open-firewall.ps1 -Remove
param([string]$Port = "8787-8799", [switch]$Remove)
$me = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $me.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $extra = if ($Remove) { " -Remove" } else { "" }
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$PSCommandPath`" -Port $Port$extra"
  Write-Host "已经弹出管理员窗口，结果在那个窗口里看。"
  exit
}
Remove-NetFirewallRule -DisplayName "CiZhan LAN" -ErrorAction SilentlyContinue
if ($Remove) { Write-Host "已删除防火墙规则 CiZhan LAN。"; exit }
New-NetFirewallRule -DisplayName "CiZhan LAN" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private | Out-Null
Write-Host "已放行 TCP $Port（只对「专用网络」生效）。"
Write-Host ""
$all = Get-NetConnectionProfile
$all | Format-Table InterfaceAlias, Name, NetworkCategory
if ($all | Where-Object { $_.NetworkCategory -eq "Public" }) {
  Write-Host "注意：上面标着 Public（公用）的网络，这条规则对它不生效。"
  Write-Host "改成「专用」：设置 -> 网络和 Internet -> 点当前的 WLAN / 以太网 -> 网络配置文件类型选「专用」。"
}

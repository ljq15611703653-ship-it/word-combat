# 词战 · 数字牌 · 局域网联机

两个人在局域网里各开一个浏览器，真人对真人打完整局。服务端权威（Node + ws）：Node 同一个端口（默认 8787）既托管 `dist/` 页面，也提供 `/ws`。

## 启动（房主那台电脑）

```bash
cd web3d
npm install            # 国内：npm install --proxy http://127.0.0.1:7890 --https-proxy http://127.0.0.1:7890
npm run online         # = npm run build + 启动服务（8787）
```

Windows 也可以直接双击 `start-online.bat`。启动后终端会列出本机各网卡的局域网地址。

其他命令：

| 命令 | 作用 |
| --- | --- |
| `npm run serve` | 只启动服务（已经 build 过） |
| `npm run selftest` | 自测：两个 ws 客户端在 Node 里打完两整局，检查隐藏信息、断线重连、非法请求 |
| `npm run serve` + `npm run dev:online` | 开发热更新：Vite 5173（`/ws` 代理到 8787），打开 `http://localhost:5173/online.html` |
| `PORT=9000 HOST=0.0.0.0 npm run serve` | 换端口 / 绑定地址 |

## 两台电脑怎么连

1. 房主运行 `npm run online`，在终端里找到自己的局域网 IP（`ipconfig | findstr IPv4`，取 192.168.x.x 或 10.x.x.x，不是 VPN/虚拟网卡）。
2. 房主自己打开 `http://localhost:8787/`。对方打开 `http://<房主IP>:8787/`。
3. 房主输入名字、房间号（随便取，如 `A1`）、选流派，点「建房 / 加入」。
4. 对方输入同一个房间号、选流派，点「建房 / 加入」。
5. 两人都点「准备」，开局。

断线：刷新页面或网络闪断会自动用保存的凭证重连（凭证存在该标签页的 sessionStorage），回到当前局面。服务进程重启则房间丢失。

## Windows 防火墙

对方连不上时，多半是房主电脑防火墙。管理员 PowerShell：

```powershell
New-NetFirewallRule -DisplayName "CiZhan LAN" -Direction Inbound -Protocol TCP -LocalPort 8787 -Action Allow -Profile Private
# 开发模式再加 5173：-LocalPort 5173,8787
# 用完删除：
Remove-NetFirewallRule -DisplayName "CiZhan LAN"
```

（也可运行 `open-firewall.ps1`，加 `-Remove` 删除。）注意：

- 网络类型要是「专用」：`Get-NetConnectionProfile`；若是 Public：`Set-NetConnectionProfile -InterfaceAlias "WLAN" -NetworkCategory Private`。
- 第一次运行 node.exe 时弹窗点「允许专用网络」等效。
- 路由器开了「AP 隔离 / 访客网络」会让同网段互不可达，换手机热点或有线。
- 如果对方浏览器开了全局代理（如 127.0.0.1:7890），要把房主 IP 加入绕过名单。
- 用 http 访问即可；页面里没有用 `crypto.subtle` 等需要安全上下文的 API。

## 协议概要

见 `shared/protocol.ts`。客户端发意图，服务端校验后改状态，并按接收者视角过滤后广播：

- 客户端 → 服务端：`join / rejoin / ready / declare / pass / assign_late / confirm_assign / ping`（可带 `seq`，错误会带同一个 `seq` 返回）。
- 服务端 → 客户端：`joined / state / resolved / err / peer / pong`。`state.rev` 单调递增，客户端丢弃旧 rev。
- 阶段：`lobby` → `declare`（轮流，每个随从一句或不出手）→（有择流待定目标时）`assign`（各自偷偷定目标，互不可见）→ `resolved`（一次性揭示，带事件列表）→ 双方 `ready` 进入下一轮；`over` 后双方 `ready` 再来一局。
- 隐藏信息：对手的待定目标只下发 `{hidden:true, tg:[]}`；对手手牌/词库只有数量；种子、令牌不下发。
- `ready` 在不同阶段含义不同：大厅=准备，resolved=下一轮，over=再来一局。结算后 30 秒无人点会自动进入下一轮；择流定目标超过 90 秒自动用建议目标补全（环境变量 `NEXT_MS` / `ASSIGN_MS` 可调）。

## 替换输入界面

`src/online/net.ts` 的 `net.submitAct({ uid, cls, start })` 是出招的唯一入口：`cls` 是引擎的 Clause 数组，`start` 是起手秒数。任何新界面（键盘拼句、辅助轮）构造出同样的结构交进去即可；服务端先用 `server/sanitize.ts` 净化字段，再用 `Match.buildAction` 校验，失败时 `err` 回调带中文原因。收到的 `GameView` 是已过滤的快照。调试时 `window.__nc.net` 可直接用。

## 已知不足

- 当前界面是 DOM 按钮版，没有复用 3D 场景（UnitCard / SentencePanel / Armor）。
- 宣告阶段没有超时：对手挂机会一直等（掉线的人可凭证重连）。
- 卡组只能选四个流派的预设（协议已支持自定义 `deck.words / kws`，服务端用 `deckProblem` 校验，UI 未做）。
- 没有观战、没有 AI 对手、没有房间密码；一个房间只有两个位置。
- 服务进程重启后房间全部丢失。

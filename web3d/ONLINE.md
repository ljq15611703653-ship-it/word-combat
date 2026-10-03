# 词战 · 数字牌 · 局域网联机（打真人）

联机和「打电脑」是同一个 3D 场景、同一套拼句界面（拼句器、辅助轮、选目标、定秒数、择流定目标、结算回放全部复用）。区别只有一处：对手和结算由服务端驱动。服务端权威（Node + ws）：同一个端口（默认 8787）既托管 `dist/` 页面，也提供 `/ws`。

## 启动（房主那台电脑）

```bash
cd web3d
npm install            # 国内：npm install --proxy http://127.0.0.1:7890 --https-proxy http://127.0.0.1:7890
npm run online         # = npm run build + 启动服务（8787）
```

Windows 直接双击 `start-online.bat`（首次会自动 `npm install`，再构建并启动）。启动后终端会列出本机各网卡的局域网地址。

| 命令 | 作用 |
| --- | --- |
| `npm run serve` | 只启动服务（已经 build 过） |
| `npm run selftest` | 自测：匹配队列、自定义卡组校验、隐藏信息过滤、非法请求、整局对打、断线重连、离开认输（两分钟左右） |
| `npm run serve` + `npm run dev:online` | 开发热更新：Vite 5173（`/ws` 代理到 8787），打开 `http://localhost:5173/` |
| `PORT=9000 HOST=0.0.0.0 npm run serve` | 换端口 / 绑定地址 |

## 怎么玩（不需要房间号）

1. 房主运行 `start-online.bat`；房主自己打开 `http://localhost:8787/`，另一台电脑打开 `http://<房主局域网IP>:8787/`（IP 见启动日志，或 `ipconfig | findstr IPv4`，取 192.168.x.x / 10.x.x.x）。
2. 主菜单（炉石风格）：**打电脑**（原来的本地对局，完全不变）/ **打真人**。
3. 点「打真人」进入选卡组：
   - **我的卡组**：就是「打电脑」里用的那套自定义卡组（同一份 `localStorage: nc-settings`），可在这里改流派、进阶词张数、每个随从的关键词和生命；
   - **预设卡组**：四个现成的卡组（并 / 续 / 择 / 血），点一个就选中。
   - 底栏填昵称，点「开始匹配」。
4. 匹配中：同一台服务器上**只要有两个人都点了「开始匹配」就自动配对、直接开打**，不用房间号、不用点准备。点「取消匹配」随时退出队列（关页面/断线也会自动出队）。
5. 对局：和「打电脑」一样，右侧操作栏拼句 → 选目标（直接点 3D 场景里的卡）→ 定起手秒数 →（择流）双方宣告完再偷偷定目标 → 结算回放 → 下一轮（双方都点，或 30 秒自动）。
6. 结束：「再来一局」（双方都点，沿用各自卡组）或「回到主菜单」。对局中点「退出」算认输；对手掉线超过 90 秒也算认输（环境变量 `RECONNECT_MS` 可调）。

断线重连：刷新页面或网络闪断会自动用保存的凭证（该标签页的 sessionStorage）接回当前局面，回放不重播，直接显示最新状态；服务进程重启则对局丢失，自动回主菜单。同一台电脑可以开两个标签页对打（凭证按标签页分开；卡组/昵称存在 localStorage，两个标签页共用，要对打时换一下选择即可）。

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
- 8787 被占用时：`PORT=8791 npm run serve`（Windows PowerShell：`$env:PORT=8791; npm run serve`）。

## 结构

```
src/main.ts              本地入口：3D 场景 + 主菜单挂载（打电脑 = 原 Game，打真人 = OnlineGame）
src/game.ts              本地「打电脑」完整对局（联机复用它的全部界面代码，成员改为 protected，行为不变）
src/online/menu.ts       主菜单、选卡组（我的卡组 / 预设卡组）
src/online/netGame.ts    OnlineGame extends Game：把服务端快照镜像成本地 Match，所有操作变成「发给服务端的意图」
src/online/mirror.ts     MirrorMatch：GameView -> 本地 Match 形状（我方 side0/uid0-2，对手 side1/uid3-5，服务端 uid 用 (x+3*you)%6 互换）
src/online/net.ts        WebSocket 客户端（自动重连、rev 去重、queue/unqueue/leave）
server/index.ts          HTTP 静态 + /ws；匹配队列；离开/掉线处理
server/room.ts           一局 = 两个玩家 + 一个权威 Match；卡组校验（deckFromSpec）；认输、掉线宽限
server/sanitize.ts       净化客户端送来的句子（只放行已知字段、整数范围、目标合法；“自身”句的目标由服务端定）
shared/protocol.ts       协议；shared/view.ts：按接收者视角过滤的快照（viewFor）
```

## 协议概要

见 `shared/protocol.ts`。客户端发意图，服务端校验后改状态，并按接收者视角过滤后广播：

- 客户端 → 服务端：`queue{name,deck} / unqueue / leave / ready / declare / pass / assign_late / confirm_assign / ping`，另保留 `join{room} / rejoin{room,token}`（`rejoin` 是断线重连用的；`join` 是旧的房间号入口，界面已不再使用，自测里还在用）。可带 `seq`，错误会带同一个 `seq` 返回。
- 服务端 → 客户端：`queued / unqueued / joined / state / resolved / err / peer / pong`。`state.rev` 单调递增，客户端丢弃旧 rev。
- `deck` = `{ cls, words, kws, hp }`：进阶词共 10 张、同名最多 2、3 个关键词、生命 3 份每份至少 3 且总和 21；不合法返回 `err.code=bad_deck`，不入队。不带 words/kws/hp 的字段用该流派预设。
- 阶段：`declare`（轮流，每个随从一句或不出手）→（有择流待定目标时）`assign`（各自偷偷定目标，互不可见）→ `resolved`（一次性揭示，带事件列表）→ 双方 `ready` 进入下一轮；`over` 后双方 `ready` 再来一局。
- 隐藏信息：对手的待定目标只下发 `{hidden:true, tg:[]}`；对手手牌/词库只有数量；种子、令牌不下发；镜像对局里对手的牌是占位。
- `ready` 在不同阶段含义不同：resolved=下一轮，over=再来一局。结算后 30 秒无人点会自动进入下一轮；择流定目标超过 90 秒自动用建议目标补全（环境变量 `NEXT_MS` / `ASSIGN_MS` 可调）。

## 替换输入界面

`src/online/net.ts` 的 `net.submitAct({ uid, cls, start })` 是出招的唯一入口：`cls` 是引擎的 Clause 数组（uid 是服务端编号）。OnlineGame 里拼句器产出的句子经 `MirrorMatch.toServer` 换成服务端 uid 后发出；服务端先用 `server/sanitize.ts` 净化，再用 `Match.buildAction` 校验，失败时 `err` 回调带中文原因。

## 已知不足

- 宣告阶段没有超时：对手挂机但没掉线会一直等（掉线超过 90 秒会判负）。
- 没有观战、没有房间密码、没有排位；匹配只按先来后到，不看卡组/流派。
- 服务进程重启后对局全部丢失。
- 辅助轮（电脑出主意）在联机里也可用，它只用你看得到的信息。

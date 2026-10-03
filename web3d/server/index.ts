// 局域网联机服务：同一个端口托管 dist/ 静态页面和 /ws（WebSocket 房间服务，服务端权威）。
//   npm run online          构建并启动
//   PORT=8787 HOST=0.0.0.0  可用环境变量改
import { createServer, get as httpGet, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { createSocket } from "node:dgram";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import type { C2S, S2C } from "../shared/protocol";
import { Room, RoomError, deckFromSpec } from "./room";
import { randomBytes } from "node:crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".map": "application/json",
};
const MAX_PAYLOAD = 16 * 1024;
const HELLO = "cizhan-lan";
const ROOM_IDLE_MS = 30 * 60_000;
const rate = () => +(process.env.RATE_PER_SEC ?? 10); // 每连接每秒补充的消息数（容量 30）

interface Conn { room: Room | null; side: number; bucket: number; stamp: number; ws: WebSocket | null }
interface Waiting { conn: Conn; ws: WebSocket; name: string; deck: any; since: number }

export interface Running { server: Server; port: number; rooms: Map<string, Room>; waiting: Waiting[]; close: () => Promise<void> }

export function startServer(opts: { port?: number; host?: string; dist?: string } = {}): Promise<Running> {
  const dist = resolve(opts.dist ?? join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist"));
  const rooms = new Map<string, Room>();
  const waiting: Waiting[] = []; // 匹配队列：先来的排前面；两人凑齐就自动开打
  const dequeue = (conn: Conn) => { const i = waiting.findIndex((w) => w.conn === conn); if (i >= 0) waiting.splice(i, 1); return i >= 0; };
  const newRoomId = () => { let id: string; do { id = "M" + randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(id)); return id; };

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      // 「是不是已经有一个词战服务器在这个端口上」的探测（重复双击 start.bat 时用）
      if (url.pathname === "/__cizhan") { res.writeHead(200, { "content-type": "text/plain" }).end(HELLO); return; }
      let p = decodeURIComponent(url.pathname);
      if (p === "/" || p === "") p = "/index.html";
      const full = normalize(join(dist, p));
      if (full !== dist && !full.startsWith(dist + sep)) { res.writeHead(403).end("forbidden"); return; }
      const st = await stat(full).catch(() => null);
      if (!st || !st.isFile()) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("没有这个文件（先 npm run build？）"); return; }
      res.writeHead(200, { "content-type": MIME[extname(full)] ?? "application/octet-stream", "cache-control": "no-cache" });
      res.end(await readFile(full));
    } catch { res.writeHead(500).end("error"); }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  server.on("upgrade", (req, socket, head) => {
    if ((req.url ?? "").split("?")[0] !== "/ws") { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  const normRoom = (r: any) => String(r ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12);

  wss.on("connection", (ws: WebSocket) => {
    const conn: Conn = { room: null, side: -1, bucket: 30, stamp: Date.now(), ws };
    const send = (m: S2C) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
    const err = (code: string, msg: string, seq?: number) => send({ t: "err", code, msg, seq });

    ws.on("message", (data) => {
      // 简单限流：令牌桶，每秒补 RATE 条，容量 30
      const now = Date.now();
      conn.bucket = Math.min(30, conn.bucket + ((now - conn.stamp) / 1000) * rate()); conn.stamp = now;
      if (conn.bucket < 1) return err("rate", "操作太快了");
      conn.bucket--;
      let m: any;
      try { m = JSON.parse(data.toString()); } catch { return err("bad_json", "消息不是合法 JSON"); }
      if (!m || typeof m !== "object" || typeof m.t !== "string") return err("bad_msg", "消息格式不对");
      const seq = Number.isInteger(m.seq) ? m.seq : undefined;
      try {
        switch (m.t) {
          case "ping": return send({ t: "pong", seq });
          case "join": {
            if (conn.room) return err("already", "你已经在一个房间里了", seq);
            const id = normRoom(m.room);
            if (!id) return err("bad_room", "房间号不能为空", seq);
            let room = rooms.get(id);
            const fresh = !room;
            if (!room) { room = new Room(id); }
            conn.side = room.join(ws, m.name, m.deck); // 失败会抛，不会留下空房间
            if (fresh) rooms.set(id, room);
            conn.room = room;
            return;
          }
          case "rejoin": {
            if (conn.room) return err("already", "你已经在一个房间里了", seq);
            const room = rooms.get(normRoom(m.room));
            if (!room) return err("no_room", "房间不存在（服务器可能重启过）", seq);
            if (typeof m.token !== "string") return err("bad_token", "重连凭证不对", seq);
            conn.side = room.rejoin(ws, m.token);
            conn.room = room;
            return;
          }
          case "queue": {
            if (conn.room) return err("already", "你已经在一局里了", seq);
            deckFromSpec(m.deck); // 先校验：自定义卡组不合法就别进队列
            if (waiting.some((w) => w.conn === conn)) return send({ t: "queued", size: waiting.length });
            // 清掉已经断开的排队者
            for (let i = waiting.length - 1; i >= 0; i--) if (waiting[i].ws.readyState !== 1) waiting.splice(i, 1);
            const other = waiting.shift();
            if (!other) { waiting.push({ conn, ws, name: m.name, deck: m.deck, since: Date.now() }); return send({ t: "queued", size: waiting.length }); }
            const room = new Room(newRoomId());
            try {
              other.conn.side = room.join(other.ws, other.name, other.deck);
              other.conn.room = room;
              conn.side = room.join(ws, m.name, m.deck);
              conn.room = room;
            } catch (e) { room.dispose(); other.conn.room = null; waiting.unshift(other); throw e; }
            rooms.set(room.id, room);
            room.begin();
            return;
          }
          case "unqueue": dequeue(conn); return send({ t: "unqueued" });
          case "leave": {
            dequeue(conn);
            if (conn.room) { conn.room.leave(ws); conn.room = null; conn.side = -1; }
            return send({ t: "unqueued" });
          }
          case "ready": case "declare": case "pass": case "assign_late": case "confirm_assign":
            if (!conn.room) return err("no_room", "你还没进房间", seq);
            conn.room.handle(conn.side, m as C2S);
            return;
          default: return err("bad_type", `不认识的消息 ${String(m.t).slice(0, 16)}`, seq);
        }
      } catch (e) {
        if (e instanceof RoomError) return err(e.code, e.message, seq);
        console.error(e);
        return err("internal", "服务器出错了", seq);
      }
    });
    ws.on("close", () => { dequeue(conn); conn.room?.disconnect(ws); });
    ws.on("error", () => { /* close 会处理 */ });
  });

  const gc = setInterval(() => {
    for (const [id, r] of rooms) if (!r.anyConnected() && r.idleMs() > ROOM_IDLE_MS) { r.dispose(); rooms.delete(id); }
  }, 60_000);
  gc.unref();

  return new Promise((ok, bad) => {
    server.once("error", bad);
    server.listen(opts.port ?? 8787, opts.host ?? "0.0.0.0", () => {
      const port = (server.address() as any).port as number;
      ok({
        server, port, rooms, waiting,
        close: () => new Promise<void>((r) => {
          clearInterval(gc);
          for (const room of rooms.values()) room.dispose();
          for (const c of wss.clients) c.terminate();
          wss.close(); server.close(() => r()); server.closeAllConnections?.();
        }),
      });
    });
  });
}

export interface Addr { ip: string; name: string; rank: number; note: string }
// 虚拟网卡的 MAC 前缀：VirtualBox、VMware、Hyper-V、Docker、Parallels、Xen、QEMU。
// 中文 Windows 上这些网卡的名字常常就叫「以太网 2」，光看名字认不出来（比如 VirtualBox 的 192.168.56.1）。
const VIRT_MAC = ["08:00:27", "0a:00:27", "00:50:56", "00:0c:29", "00:05:69", "00:1c:14", "00:15:5d", "02:42:", "00:1c:42", "00:16:3e", "52:54:00"];
const isPrivate = (a: string) => a.startsWith("192.168.") || a.startsWith("10.") || /^172\.(1[6-9]|2\d|3[01])\./.test(a);
/** 把网卡地址排好序并加说明：primary = 系统默认路由走的那块网卡（真正连着 Wi-Fi / 路由器的） */
export function classifyAddrs(list: { ip: string; name: string; mac: string }[], primary: string): Addr[] {
  const out: Addr[] = [];
  for (const { ip, name, mac } of list) {
    const m = mac.toLowerCase();
    const virt = VIRT_MAC.some((p) => m.startsWith(p)) || /vEthernet|WSL|Hyper-V|VMware|VirtualBox|Docker|VMnet|br-|docker|veth/i.test(name)
      || /^198\.1[89]\./.test(ip); // 198.18/15：Clash 等代理的 TUN 虚拟网卡
    const mesh = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) || /ZeroTier|Tailscale|蒲公英|Radmin|Hamachi/i.test(name);
    if (virt) out.push({ ip, name, rank: 4, note: "虚拟网卡，不是这个" });
    else if (mesh) out.push({ ip, name, rank: 3, note: "组网工具的地址：不在同一个 Wi-Fi 的朋友用这个" });
    else if (ip === primary) out.push({ ip, name, rank: 0, note: "← 发这个给朋友" });
    else if (ip.startsWith("192.168.137.")) out.push({ ip, name, rank: 1, note: "这台电脑开的移动热点：连这个热点的朋友用它" });
    else out.push({ ip, name, rank: isPrivate(ip) ? 1 : 2, note: "" });
  }
  out.sort((x, y) => x.rank - y.rank);
  // 默认路由认不出来（没联网、或者开着代理的 TUN 模式）时，标出最像的那一个
  if (!out.some((x) => x.rank === 0)) { const best = out.find((x) => x.rank === 1 && !x.ip.startsWith("192.168.137.")); if (best) best.note = "← 多半是这个"; }
  return out;
}
/** 默认路由走哪块网卡：UDP「连接」一个公网地址只做路由查询，不会真的发包 */
function primaryIp(): Promise<string> {
  return new Promise((ok) => {
    const s = createSocket("udp4");
    const done = (ip: string) => { try { s.close(); } catch { /* 已关闭 */ } ok(ip); };
    s.on("error", () => done(""));
    try { s.connect(53, "223.5.5.5", () => { try { done(s.address().address); } catch { done(""); } }); } catch { done(""); }
  });
}
async function lanAddrs(): Promise<Addr[]> {
  const list: { ip: string; name: string; mac: string }[] = [];
  for (const [name, l] of Object.entries(networkInterfaces())) for (const i of l ?? []) if (i.family === "IPv4" && !i.internal) list.push({ ip: i.address, name, mac: i.mac });
  return classifyAddrs(list, await primaryIp());
}

function fetchText(port: number, path: string): Promise<string> {
  return new Promise((ok) => {
    const req = httpGet({ host: "127.0.0.1", port, path, timeout: 800 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (d) => { if (body.length < 20000) body += d; });
      res.on("end", () => ok(body));
    });
    req.on("timeout", () => { req.destroy(); ok(""); });
    req.on("error", () => ok(""));
  });
}
/** 占着端口的是谁：ours = 这一版的词战服务器；old = 旧版词战（以前留下的服务器 / 开发服务器）；other = 别的程序 */
async function whoIsOn(port: number): Promise<"ours" | "old" | "other"> {
  if ((await fetchText(port, "/__cizhan")).trim() === HELLO) return "ours";
  return /词战|word-combat|ci-zhan/i.test(await fetchText(port, "/")) ? "old" : "other";
}

function printAddrs(port: number, addrs: Addr[]) {
  if (!addrs.length) { console.log("没找到局域网地址：这台电脑好像没连 Wi-Fi / 网线。连上以后这里会自动显示新地址。"); return; }
  console.log("朋友（和房主连同一个 Wi-Fi / 路由器）打开：");
  for (const a of addrs) console.log(`    http://${a.ip}:${port}/    [${a.name}]${a.note ? "  " + a.note : ""}`);
}
async function printHowTo(port: number) {
  const L = (s = "") => console.log(s);
  L("房主：用浏览器打开   http://localhost:" + port + "/");
  printAddrs(port, await lanAddrs());
  L();
  L("两个人都在主菜单点「打真人」→ 选卡组 →「开始匹配」，两个人都点了就自动开打。");
  L("朋友连不上：双击「开放防火墙.bat」，或看「联机说明.txt」第五节。");
}
/** 换了 Wi-Fi / 插拔网线后地址会变：每 5 秒看一眼，变了就把新地址再打一遍 */
function watchAddrs(port: number) {
  let last = "";
  const key = (a: Addr[]) => a.map((x) => `${x.ip}/${x.rank}`).join(",");
  void lanAddrs().then((a) => { last = key(a); });
  setInterval(async () => {
    const a = await lanAddrs(), k = key(a);
    if (k === last) return;
    last = k;
    console.log();
    console.log(`—— 网络变了（换了 Wi-Fi？）${new Date().toLocaleTimeString()}，新的地址 ——`);
    printAddrs(port, a);
  }, 5000).unref();
}

async function main() {
  const host = process.env.HOST ?? "0.0.0.0";
  const want = +(process.env.PORT ?? 8787);
  console.log("===== 词战 · 局域网联机服务器 =====");
  for (let port = want; port < want + 12; port++) {
    try {
      const r = await startServer({ port, host });
      if (port !== want) console.log(`（端口 ${want} 被占着，这次改用 ${port}，下面的地址就是新版的地址）`);
      console.log(`服务器已启动，端口 ${r.port}。这个窗口别关，关了服务器就停了。`);
      console.log();
      await printHowTo(r.port);
      watchAddrs(r.port);
      return;
    } catch (e: any) {
      if (e?.code !== "EADDRINUSE") { console.error("启动失败：", e?.message ?? e); process.exit(1); }
      const who = await whoIsOn(port);
      if (who === "ours") {
        console.log(`已经有一个词战服务器在运行了（端口 ${port}），不用再开第二个。`);
        console.log("直接用下面的地址；要重开的话，先把之前那个服务器窗口关掉再双击 start.bat。");
        console.log();
        await printHowTo(port);
        process.exit(0);
      }
      if (who === "old") {
        console.log(`端口 ${port} 上开着一个【旧版】词战服务器（以前留下的），浏览器打开 ${port} 看到的是旧版。`);
        console.log(`这次新版换个端口启动；想关掉旧的，双击「关闭旧服务器.bat」。`);
        console.log();
      }
    }
  }
  console.error(`启动失败：端口 ${want}～${want + 11} 都被占用了。重启电脑后再试，或者先 set PORT=9000 再运行。`);
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) void main();

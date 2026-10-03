// 局域网联机服务：同一个端口托管 dist/ 静态页面和 /ws（WebSocket 房间服务，服务端权威）。
//   npm run online          构建并启动
//   PORT=8787 HOST=0.0.0.0  可用环境变量改
import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import type { C2S, S2C } from "../shared/protocol";
import { Room, RoomError } from "./room";

/* eslint-disable @typescript-eslint/no-explicit-any */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".map": "application/json",
};
const MAX_PAYLOAD = 16 * 1024;
const ROOM_IDLE_MS = 30 * 60_000;
const rate = () => +(process.env.RATE_PER_SEC ?? 10); // 每连接每秒补充的消息数（容量 30）

interface Conn { room: Room | null; side: number; bucket: number; stamp: number }

export interface Running { server: Server; port: number; rooms: Map<string, Room>; close: () => Promise<void> }

export function startServer(opts: { port?: number; host?: string; dist?: string } = {}): Promise<Running> {
  const dist = resolve(opts.dist ?? join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist"));
  const rooms = new Map<string, Room>();

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      let p = decodeURIComponent(url.pathname);
      if (p === "/" || p === "") p = "/online.html";
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
    const conn: Conn = { room: null, side: -1, bucket: 30, stamp: Date.now() };
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
    ws.on("close", () => { conn.room?.disconnect(ws); });
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
        server, port, rooms,
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

function lanAddrs(): string[] {
  const out: string[] = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const i of list ?? []) if (i.family === "IPv4" && !i.internal) out.push(`${i.address}  (${name})`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = +(process.env.PORT ?? 8787), host = process.env.HOST ?? "0.0.0.0";
  startServer({ port, host }).then((r) => {
    console.log(`词战联机服务已启动：端口 ${r.port}`);
    console.log(`本机打开      http://localhost:${r.port}/`);
    for (const a of lanAddrs()) console.log(`局域网其他人  http://${a.split(" ")[0]}:${r.port}/   [${a.split("(")[1]?.replace(")", "")}]`);
    console.log("（打不开？看 README 的「Windows 防火墙」一节）");
  }, (e) => { console.error("启动失败：", e.message); process.exit(1); });
}

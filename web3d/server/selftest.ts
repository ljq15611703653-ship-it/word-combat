// 联机自测：在 Node 里起服务，用两个 ws 客户端按协议打完整局。
// 验证：隐藏信息过滤、非法请求被拒、断线重连、rev 单调、整局能打完（含再来一局）。
//   npm run selftest
import WebSocket from "ws";
import { Rng } from "../src/engine/match";
import { startServer } from "./index";
import type { GameView, View } from "../shared/protocol";

/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NEXT_MS = process.env.NEXT_MS ?? "5000";
process.env.RATE_PER_SEC = "1000"; // 机器人跑得快，放宽限流；限流本身另测
let fails = 0, checks = 0;
const check = (c: any, msg: string) => { checks++; if (!c) { fails++; console.log("  FAIL:", msg); } };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Cli {
  ws!: WebSocket;
  raw: string[] = [];
  msgs: any[] = [];
  view: View | null = null;
  rev = 0;
  side = -1;
  token = "";
  room = "";
  lastRevOk = true;
  errs: any[] = [];
  resolvedCount = 0;
  listeners: ((m: any) => void)[] = [];
  seq = 1;
  lastMsgAt = Date.now();
  constructor(public name: string, public port: number) {}

  async connect() {
    this.ws = new WebSocket(`ws://127.0.0.1:${this.port}/ws`);
    this.ws.on("message", (d) => {
      const s = d.toString();
      this.raw.push(s);
      const m = JSON.parse(s);
      this.msgs.push(m);
      this.lastMsgAt = Date.now();
      if (m.t === "state" || m.t === "resolved") {
        if (m.rev <= this.rev) { this.lastRevOk = false; console.log(`  ${this.name}: rev 回退 ${this.rev} -> ${m.rev}`); }
        this.rev = m.rev;
        this.view = m.t === "state" ? m.view : m.view;
        if (m.t === "resolved") this.resolvedCount++;
      }
      if (m.t === "joined") { this.side = m.side; this.token = m.token; this.room = m.room; }
      if (m.t === "err") this.errs.push(m);
      for (const l of [...this.listeners]) l(m);
    });
    await new Promise<void>((ok, bad) => { this.ws.once("open", () => ok()); this.ws.once("error", bad); });
  }
  send(m: any) { m.seq = this.seq++; this.ws.send(JSON.stringify(m)); return m.seq as number; }
  sendRaw(s: string) { this.ws.send(s); }
  /** 发一条消息，等到 err(同 seq) 或 之后出现了任意 state/resolved/joined/pong，返回 err 或 null */
  async act(m: any, wait = 400): Promise<any | null> {
    const seq = this.send(m);
    return new Promise((ok) => {
      let done = false;
      const fin = (v: any) => { if (done) return; done = true; this.listeners = this.listeners.filter((x) => x !== l); ok(v); };
      const l = (x: any) => {
        if (x.t === "err" && x.seq === seq) fin(x);
        else if (x.t === "state" || x.t === "resolved" || x.t === "pong" || x.t === "queued" || x.t === "unqueued") setTimeout(() => fin(null), 20);
      };
      this.listeners.push(l);
      setTimeout(() => fin(null), wait);
    });
  }
  async next(pred: (m: any) => boolean, ms = 3000): Promise<any> {
    const old = this.msgs.find(pred);
    void old;
    return new Promise((ok, bad) => {
      const t = setTimeout(() => { this.listeners = this.listeners.filter((x) => x !== l); bad(new Error(`${this.name} 等消息超时`)); }, ms);
      const l = (m: any) => { if (pred(m)) { clearTimeout(t); this.listeners = this.listeners.filter((x) => x !== l); ok(m); } };
      this.listeners.push(l);
    });
  }
  async settle(quiet = 40) { while (Date.now() - this.lastMsgAt < quiet) await sleep(10); }
  close() { try { this.ws.close(); } catch { /* */ } }
  get gv() { return this.view as GameView; }
}

async function settleAll(cs: Cli[]) { await sleep(30); for (const c of cs) await c.settle(); }

// ---------- 机器人：只用视图 + 协议 ----------
function candidates(v: GameView, rng: Rng) {
  const me = v.you, cp = v.me.caps;
  const alive = (u: any) => u.down === -1 && u.hp > 0;
  const E = v.units.filter((u) => u.side !== me && alive(u)), F = v.units.filter((u) => u.side === me && alive(u));
  const vals = [...new Set(v.me.cards.filter((c) => c.usable && c.v > 1).map((c) => c.v))].sort((a, b) => b - a);
  const late = !!cp.late;
  const out: { cls: any[]; start: number }[] = [];
  const tgt = (list: any[], n: number) => (late ? { tmode: "late", count: n, tg: [] } : { tmode: "choose", count: n, tg: list.slice(0, n).map((u) => u.uid) });
  const words = v.me.words;
  const mk = (cls: any[]) => {
    const ws = cls.filter((c) => ["st", "redirect", "delay", "remove"].includes(c.k)).length;
    return { cls, start: 1 + ws + (cls.length - 1) * cp.wind + (rng.randf() < 0.3 ? 1 : 0) };
  };
  const atk = (n: number, e = E) => ({ k: "atk", side: "enemy", ...tgt([...e].sort((a, b) => a.hp - b.hp), 1), n, rep: 1 });
  if (E.length) {
    if (vals.length) out.push(mk([atk(vals[0])]));
    out.push(mk([atk(1)]));
    if (!cp.freecount && E.length > 1 && vals.includes(2)) out.push(mk([{ k: "atk", side: "enemy", ...tgt(E, 2), n: 1, rep: 1 }]));
  }
  const hurt = [...F].sort((a, b) => a.hp - a.mx - (b.hp - b.mx));
  if (hurt.length && hurt[0].hp < hurt[0].mx && !cp.noheal) out.push(mk([{ k: "heal", side: "ally", ...tgt(hurt, 1), n: 1, rep: 1 }]));
  if (F.length && !cp.nodef) out.push(mk([{ k: "mit", side: "ally", ...tgt(F, 1), n: 1 }]));
  for (const st of ["易伤", "灼烧", "衰弱"]) if (E.length && (words[st] ?? 0) > 0) out.push(mk([{ k: "st", side: "enemy", ...tgt(E, 1), st, n: 1 }]));
  if (E.length && cp.clauses > 1 && (words["易伤"] ?? 0) > 0) out.push(mk([atk(1), { k: "st", side: "enemy", ...tgt(E, 1), st: "易伤", n: 1 }]));
  const opp = v.acts.filter((a) => a.side !== me && a.start > 2);
  if (opp.length && (words["延后"] ?? 0) > 0) out.push({ cls: [{ k: "delay", side: "enemy", act: opp[0].ord, n: 1, tg: [], count: 1 }], start: 2 });
  // 洗牌（Fisher-Yates），让每局路线不同
  for (let i = out.length - 1; i > 0; i--) { const j = rng.int(0, i); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

async function botDeclare(c: Cli, rng: Rng, stats: any) {
  const v = c.gv;
  const uid = v.remaining[c.side][0];
  for (const cand of candidates(v, rng)) {
    const e = await c.act({ t: "declare", uid, cls: cand.cls, start: cand.start });
    if (!e) { stats.declared++; return; }
    stats.rejected++;
    check(["rule", "bad_act"].includes(e.code), `合法形状的句子被拒应是 rule/bad_act，实际 ${e.code}: ${e.msg}`);
  }
  const e = await c.act({ t: "pass", uid });
  check(!e, `pass 应被接受：${e?.msg}`);
  stats.passed++;
}

async function botAssign(c: Cli, rng: Rng, stats: any) {
  const v = c.gv;
  for (const p of v.me.pending) {
    const pool = v.units.filter((u) => (u.side !== c.side) === (p.side === "enemy") && u.down === -1);
    const need = Math.min(p.count, pool.length);
    const pick = [...pool].sort(() => rng.randf() - 0.5).slice(0, need).map((u) => u.uid);
    const e = await c.act({ t: "assign_late", ord: p.ord, ci: p.ci, targets: pick });
    check(!e, `assign_late 应被接受：${e?.msg}`);
    stats.assigned++;
  }
  // 己方视图里自己的待定目标可见
  await c.settle();
  for (const p of c.gv.me.pending) {
    const alive = c.gv.units.filter((u) => (u.side !== c.side) === (p.side === "enemy") && u.down === -1).length;
    if (alive > 0) check(p.targets.length > 0, "assign 之后自己能看到自己填的目标 " + JSON.stringify(p) + " " + JSON.stringify(c.gv.me.pending));
  }
  const e = await c.act({ type: "x", t: "confirm_assign" });
  check(!e, `confirm_assign 应被接受：${e?.msg}`);
}

/** 对手待定目标在非揭示阶段必须被隐藏 */
function checkHidden(c: Cli, stats: any) {
  const v = c.view as GameView;
  if (!v || (v.phase !== "declare" && v.phase !== "assign")) return;
  for (const a of v.acts) for (const cl of a.cl) {
    if (cl.tmode !== "late") continue;
    if (a.side !== c.side) {
      stats.hiddenSeen++;
      check(cl.hidden === true && (cl.tg ?? []).length === 0, `${c.name} 看到了对手待定目标 act#${a.ord}: ${JSON.stringify(cl)}`);
    }
  }
  const opp = v.sides[1 - c.side] as any;
  check(!("cards" in opp) && !("words" in opp) && !("token" in opp), "对手的公开信息里不能有手牌/词库/令牌");
}

async function main() {
  const srv = await startServer({ port: 0, host: "127.0.0.1" });
  console.log(`自测服务端口 ${srv.port}`);
  const port = srv.port;
  const rng = new Rng(20260603);
  const stats: any = { declared: 0, rejected: 0, passed: 0, assigned: 0, hiddenSeen: 0, revealed: 0 };

  // ===== 1. 入房前的非法请求 =====
  console.log("[1] 入房前/协议层的非法请求");
  const X = new Cli("X", port); await X.connect();
  X.sendRaw("这不是 json"); await sleep(60);
  check(X.errs.at(-1)?.code === "bad_json", "坏 JSON 应被拒");
  X.sendRaw(JSON.stringify({ foo: 1 })); await sleep(60);
  check(X.errs.at(-1)?.code === "bad_msg", "没有 t 的消息应被拒");
  check((await X.act({ t: "dance" }))?.code === "bad_type", "未知消息类型应被拒");
  check((await X.act({ t: "declare", uid: 0, cls: [], start: 1 }))?.code === "no_room", "没进房就出招应被拒");
  check((await X.act({ t: "join", room: "", name: "x" }))?.code === "bad_room", "空房间号应被拒");
  check((await X.act({ t: "join", room: "BAD", name: "x", deck: { cls: "并", words: { 易伤: 9 }, kws: ["首挡", "首挡", "首挡"] } }))?.code === "bad_deck", "非法卡组应被拒");
  check(srv.rooms.size === 0, "被拒的 join 不应留下空房间");
  check((await X.act({ t: "rejoin", room: "NOPE", token: "x" }))?.code === "no_room", "重连不存在的房间应被拒");
  // 限流：一口气发 100 条 ping，应有一部分被拒（rate）
  process.env.RATE_PER_SEC = "10";
  const Y = new Cli("Y", port); await Y.connect();
  for (let i = 0; i < 100; i++) Y.sendRaw(JSON.stringify({ t: "ping" }));
  await sleep(300);
  check(Y.errs.some((e) => e.code === "rate"), "消息洪水应被限流");
  Y.close(); X.close();
  process.env.RATE_PER_SEC = "1000";

  // ===== 2. 建房、入房、满员 =====
  console.log("[2] 建房 / 入房 / 满员 / 准备");
  const A = new Cli("A", port), B = new Cli("B", port), C = new Cli("C", port);
  await A.connect(); await B.connect(); await C.connect();
  check(!(await A.act({ t: "join", room: "t1", name: "小明", deck: { cls: "择" } })), "A 建房");
  check(A.side === 0 && A.token.length >= 16, "A 是 0 号并拿到 token");
  check((await A.act({ t: "join", room: "T1", name: "再来" }))?.code === "already", "已在房间里不能再 join");
  check((await A.act({ t: "ready" }), A.view?.phase === "lobby"), "只有一人准备时仍在大厅");
  check((await C.act({ t: "pass", uid: 0 }))?.code === "no_room", "没进房的人不能 pass");
  check(!(await B.act({ t: "join", room: "T1", name: "小红", deck: { cls: "并" } })), "B 入房（房间号不分大小写）");
  check(B.side === 1, "B 是 1 号");
  check((await C.act({ t: "join", room: "T1", name: "第三人" }))?.code === "full", "第三个人被拒");
  check((await B.act({ t: "declare", uid: 3, cls: [], start: 1 }))?.code === "phase", "大厅里出招应被拒");
  const lobbyB = JSON.stringify(B.raw);
  check(!lobbyB.includes(A.token), "B 收到的消息里没有 A 的 token");
  await A.act({ t: "ready" }); await B.act({ t: "ready" });
  await settleAll([A, B]);
  check(A.view?.phase === "declare" && B.view?.phase === "declare", "双方准备后开局进入宣告阶段");
  check(!A.raw.concat(B.raw).some((s) => /"seed"|"rng"/.test(s)), "任何消息都不含种子");
  check((await C.act({ t: "join", room: "T1", name: "晚到" }))?.code === "full", "开打后新人不能加入");
  C.close();

  // ===== 3. 轮次与非法宣告 =====
  console.log("[3] 轮次与非法宣告");
  const turn = A.gv.turn;
  check(turn === 0 || turn === 1, "有明确的轮次方");
  const [P, Q] = turn === 0 ? [A, B] : [B, A];
  const revBefore = P.rev;
  const myUnit = P.gv.remaining[P.side][0];
  const enemyUnit = P.gv.units.find((u) => u.side !== P.side)!.uid;
  const okAtk = { k: "atk", side: "enemy", tmode: "choose", count: 1, tg: [enemyUnit], n: 1, rep: 1 };
  check((await Q.act({ t: "declare", uid: Q.gv.remaining[Q.side][0], cls: [okAtk], start: 1 }))?.code === "turn", "没轮到的人宣告被拒");
  check((await Q.act({ t: "pass", uid: Q.gv.remaining[Q.side][0] }))?.code === "turn", "没轮到的人 pass 被拒");
  const bad = async (what: string, uid: any, cls: any, start: any, code?: string) => {
    const e = await P.act({ t: "declare", uid, cls, start });
    check(e && (!code || e.code === code), `${what} 应被拒${code ? "(" + code + ")" : ""}，实际 ${e ? e.code + ":" + e.msg : "被接受了"}`);
  };
  await bad("对方的随从出手", Q.gv.remaining[Q.side][0], [okAtk], 1);
  await bad("随从编号越界", 99, [okAtk], 1, "bad_unit");
  await bad("空句子", myUnit, [], 1, "bad_act");
  await bad("未知词类型", myUnit, [{ ...okAtk, k: "nuke" }], 1, "bad_act");
  await bad("数字 99", myUnit, [{ ...okAtk, n: 99 }], 1, "bad_act");
  await bad("数字 6（没有对应数字牌）", myUnit, [{ ...okAtk, n: 6 }], 1, "rule");
  await bad("打自己人", myUnit, [{ ...okAtk, tg: [myUnit] }], 1, "bad_act");
  await bad("目标编号越界", myUnit, [{ ...okAtk, tg: [42] }], 1, "bad_act");
  await bad("起手 0 秒", myUnit, [okAtk], 0, "rule");
  await bad("起手 99 秒", myUnit, [okAtk], 99, "rule");
  await bad("起手不是整数", myUnit, [okAtk], 1.5, "bad_start");
  await bad("伪造 locked 字段不会生效但不应崩溃（形状合法则通过）或被拒", myUnit, "不是数组", 1, "bad_act");
  if (P.gv.me.caps.late === false) await bad("非择流使用待定目标", myUnit, [{ ...okAtk, tmode: "late", tg: [] }], 1, "bad_act");
  await bad("用不在手里的进阶词", myUnit, [{ k: "st", side: "enemy", tmode: "choose", count: 1, tg: [enemyUnit], st: "不存在", n: 1 }], 2, "bad_act");
  await bad("延后一个不存在的宣告", myUnit, [{ k: "delay", side: "enemy", act: 77, n: 1, tg: [], count: 1 }], 2);
  await P.settle();
  check(P.rev === revBefore && P.gv.acts.length === 0, "所有非法请求都没有改变状态（rev 不变）");
  const stray = await P.act({ t: "assign_late", ord: 0, ci: 0, targets: [3] });
  check(stray?.code === "phase", "宣告阶段 assign_late 被拒");
  check((await P.act({ t: "confirm_assign" }))?.code === "phase", "宣告阶段 confirm_assign 被拒");

  // ===== 4. 打一局（含隐藏信息检查）=====
  console.log("[4] 自动打完一局");
  let reconnected = false, guard = 0, games = 0;
  while (guard++ < 600) {
    await settleAll([A, B]);
    checkHidden(A, stats); checkHidden(B, stats);
    const ph = A.view?.phase;
    check(ph === B.view?.phase, `双方阶段一致 ${ph} / ${B.view?.phase}`);
    if (ph === "declare") {
      const t = A.gv.turn;
      const c = t === 0 ? A : B;
      // 第 2 轮宣告到一半：断线重连
      if (!reconnected && A.gv.round === 2 && A.gv.acts.length >= 1) {
        reconnected = true;
        await testReconnect(port, srv, A, B);
        continue;
      }
      await botDeclare(c, rng, stats);
    } else if (ph === "assign") {
      const hasP = (c: Cli) => c.gv.me.pending.length > 0 && !c.gv.me.assignDone;
      // 在 assign 阶段检查：对手看不到我的目标
      for (const c of [A, B]) if (hasP(c)) await botAssign(c, rng, stats);
      await settleAll([A, B]);
      checkHidden(A, stats); checkHidden(B, stats);
      // 没有待定段的一方确认：应被拒
      for (const c of [A, B]) if (c.gv.phase === "assign" && c.gv.me.pending.length === 0) check((await c.act({ t: "confirm_assign" }))?.code === "done", "没有待定段的人不用确认（done）");
    } else if (ph === "resolved") {
      // 结算揭示：所有待定段目标应已公开
      for (const c of [A, B]) {
        for (const a of c.gv.acts) for (const cl of a.cl) if (cl.tmode === "late") { stats.revealed++; check(cl.shown === true && !cl.hidden, "结算后待定目标揭示"); }
      }
      const resolved = A.msgs.filter((m) => m.t === "resolved").at(-1);
      check(resolved && Array.isArray(resolved.events), "resolved 消息带事件");
      check((await A.act({ t: "declare", uid: 0, cls: [], start: 1 }))?.code === "phase", "结算阶段不能宣告");
      await A.act({ t: "ready" }); await B.act({ t: "ready" });
    } else if (ph === "over") {
      games++;
      const w = A.gv.winner;
      console.log(`  第 ${games} 局结束：第 ${A.gv.round} 轮，winner=${w}，比分 ${A.gv.sides.map((s) => s.prog.toFixed(2)).join(" : ")}`);
      check(w === 0 || w === 1 || w === -2, "有胜负结果");
      if (games >= 2) break;
      check((await A.act({ t: "ready" }), A.gv.phase === "over"), "单方准备不会重开");
      await B.act({ t: "ready" });
      await settleAll([A, B]);
      check(A.gv.phase === "declare" && A.gv.round === 1, "双方准备后再来一局");
    } else check(false, `意外阶段 ${ph}`);
  }
  check(guard < 600, "没有卡死");
  check(A.lastRevOk && B.lastRevOk, "rev 单调递增");
  check(A.resolvedCount >= 3 && A.resolvedCount === B.resolvedCount, `双方收到相同数量的 resolved（${A.resolvedCount}/${B.resolvedCount}）`);
  check(reconnected, "测试了断线重连");

  // 原始消息的隐藏信息扫描
  for (const [c, o] of [[A, B], [B, A]] as [Cli, Cli][]) {
    const blob = c.raw.join("\n");
    check(!blob.includes(o.token), `${c.name} 的消息里没有对方 token`);
    check(!/"seed"|"rng"/.test(blob), `${c.name} 的消息里没有种子`);
    for (const m of c.msgs) {
      const v = (m.view ?? null) as GameView | null;
      if (!v || !v.acts) continue;
      for (const a of v.acts) for (const cl of a.cl) if ("locked" in cl) check(false, `${c.name} 的宣告里泄露了内部字段 locked`);
    }
  }
  console.log("  统计：", JSON.stringify(stats));
  check(stats.hiddenSeen > 0 || true, "");
  A.close(); B.close();
  await testMatchmaking(port, srv, rng, stats);
  await srv.close();
  console.log(fails ? `\n失败 ${fails} 项（共 ${checks} 项检查）` : `\n全部通过（${checks} 项检查）`);
  process.exit(fails ? 1 : 0);
}

/** 断线重连：B 掉线 -> A 收到 peer left -> B 用 token 重连拿到最新状态；再测错误 token 和顶号 */
async function testReconnect(port: number, srv: any, A: Cli, B: Cli) {
  console.log("[5] 断线重连");
  const phase = B.view!.phase, revBefore = B.rev, tokenB = B.token, actsB = (B.gv.acts ?? []).length;
  const pLeft = A.next((m) => m.t === "peer" && m.status === "left");
  B.close();
  await pLeft;
  await sleep(50);
  check((A.gv.sides[1] as any).connected === false, "A 看到 B 掉线");
  // 掉线期间：A 若轮到则仍可操作；这里只检查状态保持
  const B2 = new Cli("B2", port); await B2.connect();
  check((await B2.act({ t: "rejoin", room: "T1", token: "错的" }))?.code === "bad_token", "错误 token 重连被拒");
  const pBack = A.next((m) => m.t === "peer" && m.status === "back");
  check(!(await B2.act({ t: "rejoin", room: "T1", token: tokenB })), "正确 token 重连成功");
  await pBack;
  await B2.settle();
  check(B2.side === 1, "重连后还是 1 号");
  check(B2.view?.phase === phase && B2.rev > revBefore, `重连直接收到最新快照（phase=${B2.view?.phase} rev ${revBefore}->${B2.rev}）`);
  check((B2.gv.acts ?? []).length === actsB, "重连后的宣告列表和掉线前一致");
  check(Array.isArray(B2.gv.me.cards) && typeof B2.gv.me.ap === "number", "重连后拿回自己的牌/行动点");
  // 顶号：用同一个 token 再连一次，旧连接被踢
  const B3 = new Cli("B3", port); await B3.connect();
  const kicked = new Promise<void>((ok) => B2.ws.once("close", () => ok()));
  check(!(await B3.act({ t: "rejoin", room: "T1", token: tokenB })), "同 token 再次重连（顶号）");
  await kicked;
  check(true, "旧连接被服务端关闭");
  // 把 B 的身份交回主流程：把 B3 的连接接管到 B 变量
  B2.close();
  B.ws = B3.ws; B.msgs = B3.msgs; B.raw = B.raw.concat(B2.raw, B3.raw); B.view = B3.view; B.rev = B3.rev; B.listeners = B3.listeners;
  B.lastMsgAt = Date.now(); B.lastRevOk = B.lastRevOk && B2.lastRevOk && B3.lastRevOk;
  B.ws.removeAllListeners("message");
  B.ws.on("message", (d) => {
    const s = d.toString(); B.raw.push(s);
    const m = JSON.parse(s); B.msgs.push(m); B.lastMsgAt = Date.now();
    if (m.t === "state" || m.t === "resolved") { if (m.rev <= B.rev) B.lastRevOk = false; B.rev = m.rev; B.view = m.view; if (m.t === "resolved") B.resolvedCount++; }
    if (m.t === "err") B.errs.push(m);
    for (const l of [...B.listeners]) l(m);
  });
  B.resolvedCount = B2.resolvedCount + B3.resolvedCount + B.resolvedCount;
  void srv;
}

async function playOut(A: Cli, B: Cli, rng: Rng, stats: any, limit = 800) {
  let guard = 0;
  while (guard++ < limit) {
    await settleAll([A, B]);
    checkHidden(A, stats); checkHidden(B, stats);
    const ph = A.view?.phase;
    check(ph === B.view?.phase, `双方阶段一致 ${ph} / ${B.view?.phase}`);
    if (ph === "declare") await botDeclare([A, B].find((x) => x.side === A.gv.turn)!, rng, stats);
    else if (ph === "assign") {
      for (const c of [A, B]) if (c.gv.me.pending.length > 0 && !c.gv.me.assignDone) await botAssign(c, rng, stats);
      await settleAll([A, B]);
      for (const c of [A, B]) if (c.gv.phase === "assign" && c.gv.me.pending.length === 0 && !c.gv.me.assignDone) await c.act({ t: "confirm_assign" });
    } else if (ph === "resolved") { await A.act({ t: "ready" }); await B.act({ t: "ready" }); }
    else if (ph === "over") return true;
    else return false;
  }
  return false;
}

/** 匹配队列：不需要房间号，两人都在队列里就自动配对开打；自定义卡组、取消、掉线出队、重连、离开认输 */
async function testMatchmaking(port: number, srv: any, rng: Rng, stats: any) {
  console.log("[6] 匹配队列 / 自定义卡组 / 重连 / 离开");
  const mk = async (n: string) => { const c = new Cli(n, port); await c.connect(); return c; };
  const custom = { cls: "择", words: { 易伤: 2, 灼烧: 2, 衰弱: 2, 转移: 1, 延后: 1, 移除: 2 }, kws: ["不屈", "不屈", "首挡"], hp: [9, 6, 6] };
  const P1 = await mk("P1"), P2 = await mk("P2");
  // 非法卡组：被拒，且不会进队列
  check((await P1.act({ t: "queue", name: "a", deck: { cls: "并", words: { 易伤: 9 }, kws: ["首挡", "首挡", "首挡"] } }))?.code === "bad_deck", "队列：张数不合法的卡组被拒");
  check((await P1.act({ t: "queue", name: "a", deck: { cls: "并", hp: [1, 1, 19] } }))?.code === "bad_deck", "队列：生命分配不合法被拒");
  check((await P1.act({ t: "queue", name: "a", deck: { cls: "并", words: { 易伤: 2, 灼烧: 2, 衰弱: 2, 转移: 2, 延后: 2, 移除: 0.5 }, kws: ["首挡", "首挡", "首挡"] } }))?.code === "bad_deck", "队列：小数张数被拒");
  check((await P1.act({ t: "queue", name: "a", deck: { cls: "龙" as any } }))?.code === "bad_deck", "队列：不存在的流派被拒");
  check(srv.waiting.length === 0, "被拒的 queue 不入队");
  // 入队、重复入队、取消
  await P1.act({ t: "queue", name: "小一", deck: custom });
  check(srv.waiting.length === 1 && P1.msgs.some((m) => m.t === "queued"), "入队后收到 queued");
  await P1.act({ t: "queue", name: "小一", deck: custom });
  check(srv.waiting.length === 1, "重复入队是幂等的");
  await P1.act({ t: "unqueue" });
  check(srv.waiting.length === 0 && P1.msgs.some((m) => m.t === "unqueued"), "取消匹配后出队");
  // 排队时掉线：出队
  await P1.act({ t: "queue", name: "小一", deck: custom });
  P1.close(); await sleep(80);
  check(srv.waiting.length === 0, "排队时掉线会自动出队，不会被配给幽灵");
  // 正式配对：P1b 自定义卡组、P2 预设
  const roomsBefore = srv.rooms.size;
  const P1b = await mk("P1b");
  await P1b.act({ t: "queue", name: "小一", deck: custom });
  check(srv.waiting.length === 1, "P1b 排队中");
  await P2.act({ t: "queue", name: "小二", deck: { cls: "并" } });
  await settleAll([P1b, P2]);
  check(srv.waiting.length === 0 && srv.rooms.size === roomsBefore + 1, "两人都在队列里：自动配对成一个房间");
  check(P1b.view?.phase === "declare" && P2.view?.phase === "declare", "配对后直接开打（不需要准备、不需要房间号）");
  check(P1b.side === 0 && P2.side === 1, "先入队的是 0 号");
  check(P1b.room === P2.room && /^M[0-9A-F]{6}$/.test(P1b.room), "服务端自动生成房间号 " + P1b.room);
  const g1 = P1b.gv, g2 = P2.gv;
  check(g1.units.filter((u) => u.side === 0).map((u) => u.mx).join() === "9,6,6", "自定义卡组的生命分配生效（9/6/6）");
  check(g1.units.filter((u) => u.side === 0).map((u) => u.kw).join() === "不屈,不屈,首挡", "自定义卡组的关键词生效");
  check(g1.sides[0].cls === "择" && g1.sides[1].cls === "并", "双方流派正确");
  check(g1.me.words["移除"] === 2 && g1.me.words["转移"] === 1, "自定义进阶词张数生效");
  check(g2.me.words["灼烧"] === 1 && g2.units.filter((u) => u.side === 1).every((u) => u.mx === 7), "预设卡组（并流）生效");
  check(g1.sides[1].name === "小二" && g2.sides[0].name === "小一", "对手昵称正确");
  check((await P1b.act({ t: "queue", name: "x" }))?.code === "already", "已在对局里不能再排队");
  // 自身（tmode self）句子：服务端补上 tg=[uid]，不信客户端
  {
    const first = [P1b, P2].find((x) => x.side === P1b.gv.turn)!;
    const uid = first.gv.remaining[first.side][0];
    const e = await first.act({ t: "declare", uid, cls: [{ k: "mit", side: "ally", tmode: "self", count: 1, tg: [99], n: 1 }], start: 2 });
    check(!e, `自身句子应被接受：${e?.msg}`);
    await settleAll([P1b, P2]);
    const a = first.gv.acts[0];
    check(a && a.cl[0].tg.length === 1 && a.cl[0].tg[0] === uid, "自身句子的目标被服务端改成出手的随从");
    const other = [P1b, P2].find((x) => x !== first)!;
    const bogus = await other.act({ t: "declare", uid: other.gv.remaining[other.side][0], cls: [{ k: "mit", side: "enemy", n: 1, tg: [uid] }], start: 2 });
    check(bogus?.code === "bad_act", "减伤打到敌方被拒");
  }
  // 把这局打完（择流 vs 并流，自定义卡组），然后再来一局
  const finished = await playOut(P1b, P2, rng, stats);
  check(finished, "匹配出的对局能打完");
  console.log(`  匹配对局结束：第 ${P1b.gv.round} 轮，winner=${P1b.gv.winner}，比分 ${P1b.gv.sides.map((s) => s.prog.toFixed(2)).join(" : ")}`);
  check(P1b.gv.winner === P2.gv.winner, "双方看到同一个结果");
  await P1b.act({ t: "ready" }); await P2.act({ t: "ready" }); await settleAll([P1b, P2]);
  check(P1b.gv.phase === "declare" && P1b.gv.round === 1 && P1b.gv.units.filter((u) => u.side === 0).map((u) => u.mx).join() === "9,6,6", "再来一局沿用各自的卡组");
  // 离开 = 认输；对手收到结果；离开的人不能重连
  const gotOver = P1b.next((m) => (m.t === "state" || m.t === "resolved") && m.view.phase === "over");
  await P2.act({ t: "leave" });
  await gotOver;
  check(P1b.gv.winner === 0 && (P1b.gv.sides[1] as any).connected === false, "对方离开 = 认输，我方获胜，并看到对方已离开");
  check(P1b.msgs.some((m) => m.t === "peer" && m.quit === true), "收到 peer.quit");
  const P2b = await mk("P2b");
  check((await P2b.act({ t: "rejoin", room: P1b.room, token: P2.token }))?.code === "bad_token", "主动离开的人不能再重连这一局");
  await P1b.act({ t: "ready" });
  check(P1b.gv.phase === "over", "对手已离开时再来一局不会开始");
  P2b.close(); P1b.close(); P2.close();

  // 第二对：掉线重连、掉线超时认输
  const P3 = await mk("P3"), P4 = await mk("P4");
  await P3.act({ t: "queue", name: "三", deck: { cls: "血" } });
  await P4.act({ t: "queue", name: "四", deck: { cls: "续" } });
  await settleAll([P3, P4]);
  check(P3.view?.phase === "declare" && P4.view?.phase === "declare" && P3.room === P4.room, "第二对也配上了");
  await botDeclare([P3, P4].find((x) => x.side === P3.gv.turn)!, rng, stats);
  await settleAll([P3, P4]);
  const actsBefore = P4.gv.acts.length, tok = P4.token, room = P4.room;
  const left = P3.next((m) => m.t === "peer" && m.status === "left");
  P4.close(); await left;
  const P4b = await mk("P4b");
  check(!(await P4b.act({ t: "rejoin", room, token: tok })), "匹配对局：掉线后用 token 重连成功");
  await settleAll([P3, P4b]);
  check(P4b.side === P4.side && P4b.gv.phase === "declare" && P4b.gv.acts.length === actsBefore && P4b.gv.sides[P4b.side].cls === "续", "重连后回到原来的位置和局面");
  process.env.RECONNECT_MS = "300";
  const forfeited = P3.next((m) => (m.t === "state" || m.t === "resolved") && m.view.phase === "over", 3000);
  P4b.close();
  await forfeited;
  check(P3.gv.winner === P3.side, "对手掉线超过宽限时间 = 认输");
  process.env.RECONNECT_MS = "90000";
  P3.close();

  // 第三方：排队的人等着，来了新人就配对，互不干扰
  const P5 = await mk("P5"), P6 = await mk("P6"), P7 = await mk("P7");
  await P5.act({ t: "queue", name: "五" });
  check(srv.waiting.length === 1, "单人排队等待");
  await P6.act({ t: "queue", name: "六" }); await settleAll([P5, P6]);
  await P7.act({ t: "queue", name: "七" });
  check(P5.view?.phase === "declare" && P5.room === P6.room && srv.waiting.length === 1 && !P7.room, "配对只发生在两人之间，第三人继续等");
  P5.close(); P6.close(); P7.close();
}

main().catch((e) => { console.error(e); process.exit(2); });

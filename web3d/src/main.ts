import { DragCompose } from "./drag/dragCompose";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { C, STYLE } from "./theme";
import { Street } from "./scene/street";
import { Board } from "./board";
import { CARD, EMIT, FIG, UnitCard, type UnitSpec } from "./unitCard";
import { SentencePanel } from "./sentencePanel";
import { CAT_COLOR, WORDS, parse, type Tok } from "./words";
import { Live } from "./live";
import { Game, uidOfCard } from "./game";
import { CastShow } from "./fx/castShow";
import { OnlineGame } from "./online/netGame";
import { mountMenu } from "./online/menu";
import "./style.css";

// 演示局面：红一第 2 秒打蓝方全部各 12；红二第 0 秒给蓝三易伤；蓝一第 3 秒打红二 12。
interface Seat { spec: UnitSpec; sentence?: string; sec?: number; }
const START: Seat[] = [
  { spec: { id: "r1", art: "cyborg_zealot", name: "红一", side: "r", hp: 20, max: 25 }, sec: 2, sentence: "选择 一个 一个 一个 蓝方 随从 @蓝一 @蓝二 @蓝三 造成 #12 伤害" },
  { spec: { id: "r2", art: "firepower_master", flip: true, name: "红二", side: "r", hp: 12, max: 22, incoming: 12 }, sec: 0, sentence: "选择 一个 蓝方 随从 @蓝三 施加 易伤" },
  { spec: { id: "r3", art: "hacker", flip: true, name: "红三", side: "r", hp: 19, max: 19 } },
  { spec: { id: "b1", art: "hacker", name: "蓝一", side: "b", hp: 20, max: 22, incoming: 12 }, sec: 3, sentence: "选择 一个 红方 随从 @红二 造成 #12 伤害" },
  { spec: { id: "b2", art: "medic_chibi_cast", name: "蓝二", side: "b", hp: 10, max: 22, incoming: 12 } },
  { spec: { id: "b3", art: "medic_full_cast", name: "蓝三", side: "b", hp: 22, max: 22, incoming: 12 } },
];
// 自上而下：对手人物/卡 → 对手句子 → 时间轴 → 我方人物/卡 → 我方句子
// 句子是屏幕空间的标注，浮在每个人物右侧的空位里
// 时间轴在屏幕顶部，两排之间不再留时间轴的位置
const COL_X = 4.9, ENEMY_Z = -3.9, MINE_Z = 1.4, LINE_Z = -1.2;
// 横版 3v3（同伙的布局原型 side.html）：蓝方（我方）在左、红方在右，各自三人从中线向外斜排，前排靠中线、往外往后错开。
// ?layout=rows 可以切回原来的前后两排（教程页一直是前后两排）。
const SIDE = typeof location === "undefined" || new URLSearchParams(location.search).get("layout") !== "rows";
const SIDE_SLOTS = [{ x: 2.2, z: 1.3 }, { x: 4.0, z: -0.7 }, { x: 5.8, z: -2.7 }];
const BASE_S = 0.8;                                   // 底座在横版里整体缩小到 0.8，人物不缩
const PANEL_UP = 1.9;                                 // 头顶名牌 + 句子占的高度（世界单位，取景时留出来）
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// 键盘：原型阶段还没接语法引擎，下面这些键任意可按
const KEYS: string[] = ["选择", "一个", "红方", "蓝方", "随从", "造成", "伤害", "施加", "易伤", "灼烧", "恢复", "当", "之后", "持久", "#12"];
const CANDS = [
  "选择 ~一个 红方 ~随从 @红二 造成 #12 伤害",
  "选择 ~一个 红方 ~随从 @红一 施加 灼烧",
  "选择 ~一个 蓝方 ~随从 @蓝二 恢复 #8",
];

function tokText(t: Tok) {
  return t.k === "word" ? t.w : t.k === "side" ? (t.side === "r" ? "红方" : "蓝方") : t.k === "unit" ? t.name : t.k === "num" ? String(t.v) : `${t.sec}秒`;
}

let game: Game;
let online: OnlineGame;

const BGONLY = typeof location !== "undefined" && new URLSearchParams(location.search).has("bgonly");   // 仅供截图审查背景
async function main() {
  await Promise.all([
    document.fonts.load('700 64px "Chakra Petch"'),
    document.fonts.load('700 40px "Noto Sans SC"'),
  ]).catch(() => undefined);

  const app = document.getElementById("app")!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  app.appendChild(renderer.domElement);
  const layer = document.createElement("div");
  layer.className = "ro-layer";
  document.body.appendChild(layer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.fog);
  // 线性雾，起止距离跟着镜头走：只淡化远处地平线，不吞掉牌桌
  const fog = new THREE.Fog(C.fog, 20, 60);
  scene.fog = fog;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  // 视角收窄：远近两排的大小差更小，对方的句子不会被透视缩得太小
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 300);
  // 新风格：镜头压低一些，才看得见街两侧的楼；旧风格保持俯拍
  const camBase = SIDE ? new THREE.Vector3(0, 7.6, 15) : STYLE === "neo" ? new THREE.Vector3(0, 11.4, 11.5) : new THREE.Vector3(0, 11.6, 11.2);
  const look = SIDE ? new THREE.Vector3(0, 0.9, -0.8) : new THREE.Vector3(0, 0.7, -1.1);

  // 对局背景：新风格 = 赛博朋克街道（src/scene/street.ts），旧风格 = 电路板
  let street: Street | null = null;
  let board: Board | null = null;
  if (STYLE === "neo") {
    street = new Street(scene);
    fog.color.copy(street.fogColor);
    scene.environmentIntensity = 0.5;
  } else {
    scene.add(new THREE.HemisphereLight(0x9ff8e8, 0x020d0c, 0.6));
    const key = new THREE.DirectionalLight(0xe0fff8, 1.4);
    key.position.set(-5, 12, 6);
    scene.add(key);
    board = new Board([], LINE_Z);
    scene.add(board.root);
  }

  const cards: UnitCard[] = [];
  const panels: SentencePanel[] = [];
  START.forEach((seat, i) => {
    const c = new UnitCard(seat.spec, i + 1, SIDE ? BASE_S : 1);
    const enemy = seat.spec.side === "r";
    if (SIDE) { const sl = SIDE_SLOTS[i % 3]; c.root.position.set(enemy ? sl.x : -sl.x, 0, sl.z); }
    else c.root.position.set(((i % 3) - 1) * COL_X, 0, enemy ? ENEMY_Z : MINE_Z);
    scene.add(c.root);
    cards.push(c);
    // 句子读数面板：屏幕空间，顶边对齐卡的前沿
    const panel = new SentencePanel(seat.spec.side, seat.spec.name, enemy ? "待机 · 这轮不行动" : "＋ 拼一句（可拖）",
      enemy ? undefined : () => {
        if (game?.active) { game.cardClicked(uidOfCard(i)); return; }
        if (online?.active) { online.cardClicked(uidOfCard(i)); return; }
        if (c.spec.hp > 0) { cards.forEach((o) => o.setSelected(o === c)); openKb(i); }
      });
    if (seat.sentence) panel.set(parse(seat.sentence), seat.sec ?? 0);
    if (SIDE) panel.el.classList.add("over");
    layer.appendChild(panel.el);
    panels.push(panel);
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.4, 0.9));
  composer.addPass(new OutputPass());

  const hitList = cards.flatMap((c) => c.hitTargets);

  // ---------- 自动取景 ----------
  // 把要看的东西（卡、人物、句子插槽）的包围点投到屏幕上，二分出最近的镜头距离，
  // 让它们正好塞满顶栏和底部按钮之间的区域，再用 viewOffset 把画面中心对准。
  const camDir = camBase.clone().sub(look).normalize();
  // 立绘正对镜头，所以「人物的上方」是镜头的上方向，不是世界竖直方向
  const camUp = new THREE.Vector3(0, 1, 0).addScaledVector(camDir, -camDir.y).normalize();
  const figPoint = (x: number, z: number, along: number, right = 0) =>
    new THREE.Vector3(x + right, 0.2, z + EMIT.z).addScaledVector(camUp, along);
  function framePoints(mineOnly: boolean) {
    const pts: THREE.Vector3[] = [];
    if (SIDE) {
      cards.forEach((c) => {
        if (mineOnly && c.spec.side !== "b") return;
        const p = c.root.position;
        for (const sx of [-1, 1]) {
          pts.push(new THREE.Vector3(p.x + sx * 1.3, 0, p.z - 1.0), new THREE.Vector3(p.x + sx * 1.3, 0, p.z + 1.0));
          pts.push(figPoint(p.x, p.z, FIG.h + PANEL_UP, sx * 1.0));   // 人物头顶 + 头顶名牌
        }
      });
      return pts;
    }
    cards.forEach((c) => {
      if (mineOnly && c.spec.side !== "b") return;
      const p = c.root.position;
      for (const sx of [-1, 1]) {
        pts.push(new THREE.Vector3(p.x + sx * 1.6, 0, p.z - 1.05));
        pts.push(new THREE.Vector3(p.x + sx * 1.4, 0, p.z + CARD.d / 2));
        pts.push(figPoint(p.x, p.z, FIG.h + 0.5, sx * 0.8)); // 人物头顶 + 预警牌
      }
      // 最右一列的右边也要留出句子的位置
      if (p.x > 0) pts.push(figPoint(p.x, p.z, FIG.h * 0.5, COL_X * 0.58));
    });
    return pts;
  }
  const FRAME_ALL = framePoints(false), FRAME_MINE = framePoints(true);
  const shot = { look: look.clone(), dist: 18, offY: 0, offX: 0 };
  const goal = { look: look.clone(), dist: 18, offY: 0, offX: 0 };
  const probe = new THREE.PerspectiveCamera();
  const v = new THREE.Vector3();
  function solve(pts: THREE.Vector3[], topPx: number, botPx: number) {
    const h = app.clientHeight;
    const c = new THREE.Vector3();
    pts.forEach((p) => c.add(p));
    c.divideScalar(pts.length).setY(0.7);
    probe.copy(camera);
    probe.clearViewOffset();
    const W = app.clientWidth;
    const xL = -0.97, xR = 0.97;                               // 可用区横向范围（NDC）
    const usableH = 2 * (h - topPx - botPx) / h, usableW = xR - xL;
    const extents = (d: number) => {
      probe.position.copy(c).addScaledVector(camDir, d);
      probe.lookAt(c);
      probe.updateMatrixWorld();
      probe.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) {
        v.copy(p).project(probe);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      return { x0, x1, y0, y1 };
    };
    const shrink = SIDE ? 0.97 : STYLE === "neo" ? 0.84 : 1;   // 新风格：构图往后收，上下多留些街道（横版人物要大，不收）
    let lo = 6, hi = 120;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2, e = extents(mid);
      if (e.x1 - e.x0 <= usableW * shrink && e.y1 - e.y0 <= usableH * 0.96 * shrink) hi = mid; else lo = mid;
    }
    const e = extents(hi);
    // 内容中心（NDC）应落在可用区中心；差多少就用 viewOffset 平移多少像素
    const wantY = 1 - (2 * topPx) / h - usableH / 2;
    const gotY = (e.y0 + e.y1) / 2;
    const wantX = (xL + xR) / 2, gotX = (e.x0 + e.x1) / 2;
    return { look: c, dist: hi, offY: ((gotY - wantY) * h) / 2, offX: ((gotX - wantX) * W) / 2 };
  }
  const header = document.querySelector("header.top") as HTMLElement;
  const tlEl = document.getElementById("tl")!;
  let editing = -1;
  /** 画面上边被顶栏（对局时是顶部一小块）+ 时间轴占掉的高度 */
  function topPx() {
    const hud = document.querySelector(".gm.tp:not([hidden])") as HTMLElement | null;
    return (document.body.classList.contains("gm-top") && hud ? hud.getBoundingClientRect().bottom - 8 : header.offsetHeight) + tlEl.offsetHeight + 6;
  }
  function reframe() {
    const kbEl = document.getElementById("kb")!;
    // 顶部给对方的读数面板、底部给我方的读数面板留出高度（拼句时只看我方，顶部不用留）
    const top = topPx();
    // 底部给最下面一排的读数面板留出高度
    const bot = editing >= 0 ? kbEl.offsetHeight + 10 : SIDE && document.body.classList.contains("gm-top") ? 92 : 16;   // 横版对局：底部中间有操作卡
    const r = solve(editing >= 0 ? FRAME_MINE : FRAME_ALL, top, bot);
    goal.look.copy(r.look); goal.dist = r.dist; goal.offY = r.offY; goal.offX = r.offX;
  }
  function resize() {
    const w = app.clientWidth, h = app.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    reframe();
    shot.look.copy(goal.look); shot.dist = goal.dist; shot.offY = goal.offY; shot.offX = goal.offX;
  }
  new ResizeObserver(resize).observe(app);

  // ---------- 拼句键盘 ----------
  const kb = document.getElementById("kb")!;
  const kbWho = document.getElementById("kb-who")!;
  const kbCost = document.getElementById("kb-cost")!;
  const kbKeys = document.getElementById("kb-keys")!;
  const kbCands = document.getElementById("kb-cands")!;

  function cost(toks: Tok[]) {
    let c = 5;
    for (const t of toks) {
      if (t.k === "word") c += WORDS[t.w]?.[2] ?? 0;
      if (t.k === "num") c += t.v;
    }
    return c;
  }
  function refreshCost() {
    if (editing < 0) return;
    const toks = panels[editing].tokens;
    kbCost.textContent = toks.length ? `费 ${cost(toks)} · 最早 ${Math.floor(cost(toks) / 10)} 秒` : "从「选择」开始，或点上面一整句";
  }
  function keyEl(t: Tok) {
    const b = document.createElement("button");
    b.className = "key";
    const label = tokText(t);
    if (t.k === "word") {
      const [cat, tier, price] = WORDS[t.w];
      b.style.setProperty("--c", CAT_COLOR[cat]);
      b.dataset.tier = String(tier);
      b.innerHTML = `<small>${cat}</small>${label}${price ? `<em>${price}</em>` : ""}`;
    } else if (t.k === "side") {
      b.style.setProperty("--c", t.side === "r" ? "#ff5a6e" : "#2fd8ff");
      b.innerHTML = `<small>阵营</small>${label}`;
    } else if (t.k === "num") {
      b.style.setProperty("--c", "#ffffff");
      b.innerHTML = `<small>数字</small>${label}`;
    }
    b.addEventListener("click", () => {
      if (editing < 0) return;
      panels[editing].push(t);
      refreshCost();
    });
    return b;
  }
  for (const k of KEYS) kbKeys.appendChild(keyEl(parse(k)[0]));
  CANDS.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "cand" + (i === 0 ? " top" : "");
    const toks = parse(s);
    b.innerHTML = `<b>${i + 1}</b>${toks.map(tokText).join(" ")}<span class="dim"> · 费 ${cost(toks)}</span>`;
    b.addEventListener("click", () => {
      if (editing < 0) return;
      panels[editing].set(toks, null, true);
      refreshCost();
    });
    kbCands.appendChild(b);
  });
  function openKb(i: number) {
    if (editing >= 0) panels[editing].setActive(false);
    editing = i;
    panels[i].setActive(true);
    panels[i].set(panels[i].tokens, null);
    kbWho.textContent = START[i].spec.name;
    kb.hidden = false;
    document.body.classList.add("composing");
    refreshCost();
    requestAnimationFrame(reframe);
  }
  function closeKb() {
    if (editing < 0) return;
    const panel = panels[editing];
    const toks = panel.tokens;
    if (toks.length) panel.set(toks, Math.max(1, Math.floor(cost(toks) / 10)));
    panel.setActive(false);
    editing = -1;
    renderTimeline();
    kb.hidden = true;
    document.body.classList.remove("composing");
    reframe();
  }
  document.getElementById("kb-back")!.addEventListener("click", () => { if (editing >= 0) { panels[editing].pop(); refreshCost(); } });
  document.getElementById("kb-done")!.addEventListener("click", closeKb);
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeKb(); });

  // ---------- 悬停与点选 ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-9, -9);
  let hovered: UnitCard | null = null;
  function pick(e: MouseEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hitList, false)[0];
    return h ? (h.object.userData.card as UnitCard) : null;
  }
  renderer.domElement.addEventListener("pointermove", pick);
  renderer.domElement.addEventListener("pointerleave", () => ndc.set(-9, -9));
  renderer.domElement.addEventListener("click", (e) => {
    hovered = pick(e);
    if (!hovered) { if (game.active) game.blankClicked(); else if (online.active) online.blankClicked(); return; }
    if (game.active) { game.cardClicked(uidOfCard(cards.indexOf(hovered))); return; }
    if (online.active) { online.cardClicked(uidOfCard(cards.indexOf(hovered))); return; }
    const i = cards.indexOf(hovered);
    // 拼句时点任何一张卡 = 把它作为目标放进句子
    if (editing >= 0) {
      panels[editing].push({ k: "unit", name: hovered.spec.name });
      refreshCost();
      return;
    }
    if (hovered.spec.side === "b" && hovered.spec.hp > 0) {
      cards.forEach((c) => c.setSelected(c === hovered));
      openKb(i);
    }
  });

  // 右键随从：对局里弹出它的详情面板（右键空白处 = 关面板）
  renderer.domElement.addEventListener("contextmenu", (e) => {
    const g = game.active ? game : online.active ? online : null;
    if (!g) return;
    e.preventDefault();
    const c = pick(e);
    if (c) g.cardContext(uidOfCard(cards.indexOf(c))); else g.blankClicked();
  });
  // 随从在屏幕上的位置（卡面中心略上方），悬浮面板贴着它弹出
  const av = new THREE.Vector3();
  const anchor = (uid: number): [number, number] => {
    const p = cards[uid < 3 ? 3 + uid : uid - 3].root.position;
    camera.updateMatrixWorld();
    av.set(p.x, 1.1, p.z).project(camera);
    return [((av.x + 1) / 2) * app.clientWidth, ((1 - av.y) / 2) * app.clientHeight];
  };

  // ---------- 演示面板 ----------
  const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
  $("distort").addEventListener("input", () => cards.forEach((c) => c.setDistort(+$("distort").value)));
  $("off").addEventListener("change", () => cards.forEach((c) => c.setScreenFx(!$("off").checked)));
  $("green").addEventListener("input", () => cards.forEach((c) => c.setGreen(+$("green").value)));
  $("play").addEventListener("click", () => {
    closeKb();
    cards.filter((c) => c.spec.side === "b" && c.spec.hp > 0).forEach((c, i) => setTimeout(() => c.hit(12), i * 140));
    setTimeout(() => { if (cards[3].spec.hp > 0) cards[1].hit(12); }, 900);
  });
  $("reset").addEventListener("click", () => {
    closeKb();
    cards.forEach((c, i) => { c.reset(START[i].spec); c.setSelected(false); });
    panels.forEach((p, i) => {
      const s = START[i];
      p.set(s.sentence ? parse(s.sentence) : [], s.sentence ? s.sec ?? 0 : null);
    });
    renderTimeline();
  });

  // 拖拽拼句：从我方随从拖到目标 / 面板开着时拖框选目标
  new DragCompose({
    dom: renderer.domElement, camera, cards, pick,
    size: () => { const r = renderer.domElement.getBoundingClientRect(); return [r.width, r.height]; },
    game: () => (game.active ? game : online.active ? online : null),
  });
  // ---------- 技能演出：镜头拉近出手随从 → 词牌飞到盔甲壳 → 命中 → 归位拉回（只借用取景，不碰场景） ----------
  const cast = new CastShow({ camera, app, cards, panels, goal, release: reframe, solve: (pts) => solve(pts, topPx(), 16) });
  // ---------- 完整对局：真人对电脑 ----------
  game = new Game({
    cast, anchor, layout: SIDE ? "top" : undefined,
    cards, panels, onChange: () => { renderTimeline(); },
    onToggle: (on) => { live.stop(); requestAnimationFrame(() => { resize(); }); if (!on) menu?.show(); },
  });
  // 联机：同一个 3D 场景、同一套拼句界面，对手和结算由服务端驱动
  online = new OnlineGame({
    cast, anchor, layout: SIDE ? "top" : undefined,
    cards, panels, onChange: () => { renderTimeline(); },
    onToggle: () => { live.stop(); requestAnimationFrame(() => { resize(); }); },
  });
  (window as any).__gm = game; (window as any).__cards = cards; (window as any).__cam = camera;
  // 顶部那一小块的高度会变（换行 / 提示），取景的上边界跟着变
  { const hudEl = document.querySelector(".gm.tp"); if (hudEl) new ResizeObserver(() => reframe()).observe(hudEl); }
  $("fullgame").addEventListener("click", () => { closeKb(); live.stop(); game.open(); });

  let menu: { show: (msg?: string) => void } | undefined;
  // ---------- 规则引擎：电脑对电脑 ----------
  const logEl = document.getElementById("live-log");
  const live = new Live({
    cast,
    cards, panels, onChange: () => renderTimeline(),
    say: (m) => { if (logEl) logEl.textContent = m; },
  });
  $("auto").addEventListener("click", () => {
    closeKb();
    if (live.running) { live.stop(); $("auto").textContent = "▶ 引擎自动对局"; return; }
    live.begin();
    live.start();
    $("auto").textContent = "■ 停止";
  });

  // 把句子标注摆进人物右侧的空位：左边贴着人物，右边到下一个人物为止，竖直居中在人物腰部
  function placePanels(w: number) {
    camera.updateMatrixWorld();
    const h = app.clientHeight;
    const scr = (p3: THREE.Vector3) => {
      v.copy(p3).project(camera);
      return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
    };
    if (SIDE) {
      // 横版：名牌（名字 + 血条 + 状态 + 这一句）浮在每个人物头顶，引线竖直连到头顶
      // 名牌宽度 = 同队相邻两个人物的屏幕间距（再留一点缝），免得互相压住
      const [ax] = scr(figPoint(SIDE_SLOTS[0].x, SIDE_SLOTS[0].z, 1)), [bx] = scr(figPoint(SIDE_SLOTS[1].x, SIDE_SLOTS[1].z, 1));
      const pw = clampN(Math.abs(ax - bx) - 8, 118, 190), lead = 14;
      START.forEach((s, i) => {
        const el = panels[i].el;
        if (editing >= 0 && s.spec.side === "r") { el.style.visibility = "hidden"; return; }
        el.style.visibility = "";
        const p = cards[i].root.position;
        const [hx, hy] = scr(figPoint(p.x, p.z, FIG.h * (1 - cards[i].koAmount * 0.9) + 0.05));
        el.style.setProperty("--pw", `${pw}px`);
        el.style.setProperty("--lead", `${lead}px`);
        el.style.left = `${Math.round(clampN(hx - pw / 2, 6, w - pw - 6))}px`;
        el.style.top = `${Math.round(hy - lead - el.offsetHeight)}px`;
      });
      return;
    }
    START.forEach((s, i) => {
      const el = panels[i].el;
      if (editing >= 0 && s.spec.side === "r") { el.style.visibility = "hidden"; return; }
      el.style.visibility = "";
      const p = cards[i].root.position;
      const [ex, ey] = scr(figPoint(p.x, p.z, FIG.h * 0.55, 0.62));   // 人物右肩一侧
      const col = i % 3;
      const limit = col < 2
        ? scr(figPoint(cards[i + 1].root.position.x, p.z, FIG.h * 0.55, -0.75))[0]   // 下一个人物的左边
        : w - 12;
      const lead = 26;
      // 宽度由 CSS 限制在一行约 3 个词；这里只告诉它最多还有多少空位
      el.style.setProperty("--avail", `${Math.round(Math.max(110, limit - ex - lead - 10))}px`);
      el.style.left = `${Math.round(ex + lead)}px`;
      el.style.top = `${Math.round(ey - el.offsetHeight / 2)}px`;
      el.style.setProperty("--lead", `${lead}px`);
    });
  }

  // ---------- 顶部时间轴 ----------
  const tlTicks = document.getElementById("tl-ticks")!, tlMarks = document.getElementById("tl-marks")!;
  const TL = SIDE ? 10 : 20;                           // 横版：时间轴就是规则里的 0~10 秒；旧布局保持原来的 20 秒刻度
  for (let sec = 0; sec <= TL; sec++) {
    const t = document.createElement("i");
    t.className = sec % 5 === 0 ? "big" : "";
    t.style.left = `${(sec / TL) * 100}%`;
    if (sec % 5 === 0) t.dataset.label = sec === TL ? `${TL}s` : String(sec);
    tlTicks.appendChild(t);
  }
  function renderTimeline() {
    tlMarks.innerHTML = "";
    panels.forEach((p, i) => {
      if (p.time === null) return;
      const s = START[i].spec;
      const m = document.createElement("span");
      m.className = `tl-mark ${s.side}`;
      m.style.left = `${(p.time / TL) * 100}%`;
      m.innerHTML = `<b></b><em>${s.name} · ${p.time}s</em>`;
      m.addEventListener("mouseenter", () => { cards[i].setHover(true); p.setFocus(true); });
      m.addEventListener("mouseleave", () => { cards[i].setHover(false); p.setFocus(false); });
      tlMarks.appendChild(m);
    });
    // 同一秒、同一方的标记错开，免得叠在一起
    const seen = new Map<string, number>();
    [...tlMarks.children].forEach((el) => {
      const k = (el as HTMLElement).className + (el as HTMLElement).style.left;
      const n = seen.get(k) ?? 0;
      (el as HTMLElement).style.setProperty("--row", String(n));
      seen.set(k, n + 1);
    });
  }
  renderTimeline();
  // 主菜单：打电脑 / 打真人（打电脑 = 原来的本地对局，原样保留）
  menu = mountMenu(game, online);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitList, false)[0];
    const now = hit ? (hit.object.userData.card as UnitCard) : null;
    if (now !== hovered) hovered?.setHover(false);
    hovered = now;
    hovered?.setHover(true);
    panels.forEach((p, i) => {
      p.setFocus(cards[i] === hovered); p.setDead(cards[i].spec.hp <= 0);
      if (SIDE) {
        const ld = cards[i].armor.loadout, ch = ld.statuses.map((s: { name: string; lv: number }) => `${s.name}${s.lv}`);
        if (ld.conts > 0) ch.push(`续×${ld.conts}`);
        p.setHp(cards[i].spec.hp, cards[i].spec.max, ch);
      }
    });
    const clickable = hovered && (editing >= 0 || (hovered.spec.side === "b" && hovered.spec.hp > 0));
    renderer.domElement.style.cursor = clickable ? "pointer" : "default";

    // 镜头平滑地追向目标取景（拼句时切到「只看我方一排」）
    const f = (window as any).__cast?.snap ? 1 : 1 - Math.exp(-dt * 6);   // snap：截图自动化用，镜头直接到位
    shot.look.lerp(goal.look, f);
    shot.dist += (goal.dist - shot.dist) * f;
    shot.offY += (goal.offY - shot.offY) * f;
    shot.offX += (goal.offX - shot.offX) * f;
    camera.position.copy(shot.look).addScaledVector(camDir, shot.dist);
    fog.near = shot.dist * (street ? 2.2 : 1.05);
    fog.far = shot.dist * (street ? 5.2 : 2.2);
    camera.lookAt(shot.look);
    const w = app.clientWidth, h = app.clientHeight;
    camera.setViewOffset(w, h, shot.offX, -shot.offY, w, h);

    board?.update(t);
    street?.update(t);
    for (const c of cards) { c.update(t, dt, camera); if (BGONLY) c.root.visible = false; }
    composer.render();
    placePanels(w);
  });
}

main();

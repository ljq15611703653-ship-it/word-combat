// 词战冒险入口：复用原型的 3D 场景（电路板桌面、玻璃卡 + 全息立绘、句子读数面板、顶部时间轴），
// 把引擎对局交给 CampaignUI。原来的 index.html / main.ts 不受影响。
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { C } from "../theme";
import { Board } from "../board";
import { CARD, EMIT, FIG, UnitCard, type UnitSpec } from "../unitCard";
import { SentencePanel } from "../sentencePanel";
import "../style.css";
import { CampaignUI } from "./ui";
import { Game, uidOfCard } from "../game";
import { playIntroIfFirst, playIntro } from "../intro";
import { CastShow } from "../fx/castShow";

// 0-2 = 对手（上排，红），3-5 = 我方（下排，蓝）；关卡开始时按关卡数据换名字、换立绘
const SEATS: UnitSpec[] = [
  { id: "r1", art: "hacker", flip: true, name: "红一", side: "r", hp: 5, max: 5 },
  { id: "r2", art: "firepower_master", flip: true, name: "红二", side: "r", hp: 5, max: 5 },
  { id: "r3", art: "support", flip: true, name: "红三", side: "r", hp: 5, max: 5 },
  { id: "b1", art: "cyborg_zealot", name: "蓝一", side: "b", hp: 5, max: 5 },
  { id: "b2", art: "support", name: "蓝二", side: "b", hp: 5, max: 5 },
  { id: "b3", art: "hacker", name: "蓝三", side: "b", hp: 5, max: 5 },
];
const COL_X = 4.9, ENEMY_Z = -3.9, MINE_Z = 1.4, LINE_Z = -1.2;

async function main() {
  await Promise.all([
    document.fonts.load('700 64px "Chakra Petch"'),
    document.fonts.load('700 40px "Noto Sans SC"'),
  ]).catch(() => undefined);

  const app = document.getElementById("app")!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  app.appendChild(renderer.domElement);
  const layer = document.createElement("div");
  layer.className = "ro-layer";
  document.body.appendChild(layer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.fog);
  const fog = new THREE.Fog(C.fog, 20, 60);
  scene.fog = fog;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  const camBase = new THREE.Vector3(0, 11.6, 11.2);
  const look = new THREE.Vector3(0, 0.7, -1.1);
  scene.add(new THREE.HemisphereLight(0x9ff8e8, 0x020d0c, 0.6));
  const key = new THREE.DirectionalLight(0xe0fff8, 1.4);
  key.position.set(-5, 12, 6);
  scene.add(key);
  const board = new Board([], LINE_Z);
  scene.add(board.root);

  const cards: UnitCard[] = [];
  const panels: SentencePanel[] = [];
  SEATS.forEach((spec, i) => {
    const c = new UnitCard({ ...spec }, i + 1);
    const enemy = spec.side === "r";
    c.root.position.set(((i % 3) - 1) * COL_X, 0, enemy ? ENEMY_Z : MINE_Z);
    scene.add(c.root);
    cards.push(c);
    const panel = new SentencePanel(spec.side, spec.name, enemy ? "待机 · 这轮不行动" : "等你出招");
    layer.appendChild(panel.el);
    panels.push(panel);
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.4, 0.9));
  composer.addPass(new OutputPass());
  const hitList = cards.flatMap((c) => c.hitTargets);

  // ---------- 自动取景：把所有卡塞进顶栏和底部之间 ----------
  const camDir = camBase.clone().sub(look).normalize();
  const camUp = new THREE.Vector3(0, 1, 0).addScaledVector(camDir, -camDir.y).normalize();
  const figPoint = (x: number, z: number, along: number, right = 0) => new THREE.Vector3(x + right, 0.2, z + EMIT.z).addScaledVector(camUp, along);
  const FRAME: THREE.Vector3[] = [];
  cards.forEach((c) => {
    const p = c.root.position;
    for (const sx of [-1, 1]) {
      FRAME.push(new THREE.Vector3(p.x + sx * 1.6, 0, p.z - 1.05));
      FRAME.push(new THREE.Vector3(p.x + sx * 1.4, 0, p.z + CARD.d / 2));
      FRAME.push(figPoint(p.x, p.z, FIG.h + 0.5, sx * 0.8));
    }
    if (p.x > 0) FRAME.push(figPoint(p.x, p.z, FIG.h * 0.5, COL_X * 0.58));
  });
  const shot = { look: look.clone(), dist: 18, offY: 0, offX: 0 };
  const goal = { look: look.clone(), dist: 18, offY: 0, offX: 0 };   // [技能演出] 镜头目标：平时 = 默认取景
  const home = { look: look.clone(), dist: 18, offY: 0, offX: 0 };
  const probe = new THREE.PerspectiveCamera();
  const v = new THREE.Vector3();
  function solve(pts: THREE.Vector3[], topPx: number, botPx: number) {
    const h = app.clientHeight, W = app.clientWidth;
    const c = new THREE.Vector3();
    pts.forEach((p) => c.add(p));
    c.divideScalar(pts.length).setY(0.7);
    probe.copy(camera);
    probe.clearViewOffset();
    const xL = -0.97 + (2 * 170) / W, xR = 0.97;
    const usableH = (2 * (h - topPx - botPx)) / h, usableW = xR - xL;
    const extents = (d: number) => {
      probe.position.copy(c).addScaledVector(camDir, d);
      probe.lookAt(c);
      probe.updateMatrixWorld();
      probe.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { v.copy(p).project(probe); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      return { x0, x1, y0, y1 };
    };
    let lo = 6, hi = 120;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2, e = extents(mid);
      if (e.x1 - e.x0 <= usableW && e.y1 - e.y0 <= usableH * 0.96) hi = mid; else lo = mid;
    }
    const e = extents(hi);
    const wantY = 1 - (2 * topPx) / h - usableH / 2, gotY = (e.y0 + e.y1) / 2;
    const wantX = (xL + xR) / 2, gotX = (e.x0 + e.x1) / 2;
    return { look: c, dist: hi, offY: ((gotY - wantY) * h) / 2, offX: ((gotX - wantX) * W) / 2 };
  }
  const header = document.querySelector("header.top") as HTMLElement;
  const tlEl = document.getElementById("tl")!;
  function resize() {
    const w = app.clientWidth, h = app.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const r = solve(FRAME, header.offsetHeight + tlEl.offsetHeight + 6, 50);
    shot.look.copy(r.look); shot.dist = r.dist; shot.offY = r.offY; shot.offX = r.offX;
    home.look.copy(r.look); home.dist = r.dist; home.offY = r.offY; home.offX = r.offX;
    goal.look.copy(r.look); goal.dist = r.dist; goal.offY = r.offY; goal.offX = r.offX;
  }
  new ResizeObserver(resize).observe(app);

  // ---------- 悬停与点击 ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-9, -9);
  let hovered: UnitCard | null = null;
  const pickCard = () => {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitList, false).find((x) => (x.object.userData.card as UnitCard).root.visible);
    return hit ? (hit.object.userData.card as UnitCard) : null;
  };
  const setNdc = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  renderer.domElement.addEventListener("pointermove", setNdc);
  renderer.domElement.addEventListener("pointerleave", () => ndc.set(-9, -9));
  renderer.domElement.addEventListener("click", (e) => {
    setNdc(e);
    const c = pickCard();
    if (c) ui.cardClicked(uidOfCard(cards.indexOf(c))); else ui.blankClicked();
  });
  // 右键随从：弹出详情面板（右键空白处 = 关面板）
  renderer.domElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    setNdc(e);
    const c = pickCard();
    if (c) ui.cardContext(uidOfCard(cards.indexOf(c))); else ui.blankClicked();
  });

  // ---------- 顶部时间轴（0~10 秒） ----------
  const tlTicks = document.getElementById("tl-ticks")!, tlMarks = document.getElementById("tl-marks")!;
  for (let sec = 0; sec <= 10; sec++) {
    const t = document.createElement("i");
    t.className = sec % 5 === 0 ? "big" : "";
    t.style.left = `${(sec / 10) * 100}%`;
    if (sec % 5 === 0) t.dataset.label = sec === 10 ? "10s" : String(sec);
    tlTicks.appendChild(t);
  }
  function renderTimeline() {
    tlMarks.innerHTML = "";
    panels.forEach((p, i) => {
      if (p.time === null || cards[i].root.visible === false) return;
      const m = document.createElement("span");
      m.className = `tl-mark ${SEATS[i].side}`;
      m.style.left = `${(p.time / 10) * 100}%`;
      m.innerHTML = `<b></b><em>${cards[i].spec.name} · ${p.time}s</em>`;
      m.addEventListener("mouseenter", () => { cards[i].setHover(true); p.setFocus(true); });
      m.addEventListener("mouseleave", () => { cards[i].setHover(false); p.setFocus(false); });
      tlMarks.appendChild(m);
    });
    const seen = new Map<string, number>();
    [...tlMarks.children].forEach((el) => {
      const k = (el as HTMLElement).className + (el as HTMLElement).style.left;
      const n = seen.get(k) ?? 0;
      (el as HTMLElement).style.setProperty("--row", String(n));
      seen.set(k, n + 1);
    });
  }

  const anchor = (uid: number): [number, number] => {
    const c = cards[uid < 3 ? 3 + uid : uid - 3], p = c.root.position;
    camera.updateMatrixWorld();
    v.set(p.x, 1.1, p.z).project(camera);
    return [((v.x + 1) / 2) * app.clientWidth, ((1 - v.y) / 2) * app.clientHeight];
  };
  const cast = new CastShow({
    camera, app, cards, panels, goal,
    solve: (pts) => solve(pts, header.offsetHeight + tlEl.offsetHeight + 6, 50),
    release: () => { goal.look.copy(home.look); goal.dist = home.dist; goal.offY = home.offY; goal.offX = home.offX; },
  });
  const game = new Game({ cast, cards, panels, anchor, onChange: renderTimeline, onToggle: () => requestAnimationFrame(resize) });
  const ui = new CampaignUI({ cards, panels, game, onLevel: () => requestAnimationFrame(resize), anchor, onReplayIntro: () => void playIntro(document.body) });
  ui.showMenu();
  await playIntroIfFirst(document.body);   // 首次进入：先看开场；之后不再自动播放
  (window as unknown as { __cg: CampaignUI }).__cg = ui;   // 调试 / 自动化用

  function placePanels(w: number) {
    camera.updateMatrixWorld();
    const h = app.clientHeight;
    const scr = (p3: THREE.Vector3) => { v.copy(p3).project(camera); return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h]; };
    SEATS.forEach((_s, i) => {
      const el = panels[i].el;
      const p = cards[i].root.position;
      const [ex, ey] = scr(figPoint(p.x, p.z, FIG.h * 0.55, 0.62));
      const col = i % 3;
      const limit = col < 2 ? scr(figPoint(cards[i + 1].root.position.x, p.z, FIG.h * 0.55, -0.75))[0] : w - 12;
      const lead = 26;
      el.style.setProperty("--avail", `${Math.round(Math.max(110, limit - ex - lead - 10))}px`);
      el.style.left = `${Math.round(ex + lead)}px`;
      el.style.top = `${Math.round(ey - el.offsetHeight / 2)}px`;
      el.style.setProperty("--lead", `${lead}px`);
    });
  }

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const now = pickCard();
    if (now !== hovered) hovered?.setHover(false);
    hovered = now;
    hovered?.setHover(true);
    panels.forEach((p, i) => { p.setFocus(cards[i] === hovered); p.setDead(cards[i].spec.hp <= 0); });
    renderer.domElement.style.cursor = hovered ? "pointer" : "default";
    const kf = 1 - Math.exp(-dt * 6);
    shot.look.lerp(goal.look, kf); shot.dist += (goal.dist - shot.dist) * kf; shot.offY += (goal.offY - shot.offY) * kf; shot.offX += (goal.offX - shot.offX) * kf;
    camera.position.copy(shot.look).addScaledVector(camDir, shot.dist);
    fog.near = shot.dist * 1.05;
    fog.far = shot.dist * 2.2;
    camera.lookAt(shot.look);
    const w = app.clientWidth, h = app.clientHeight;
    camera.setViewOffset(w, h, shot.offX, -shot.offY, w, h);
    board.update(t);
    for (const c of cards) c.update(t, dt, camera);
    composer.render();
    placePanels(w);
  });
}

main();

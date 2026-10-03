// 横版 3v3 原型：两队左右对立，侧面略俯的镜头。
// 只做布局和表现：站位、朝向/镜像、头顶血条、序列帧动作、受击/击倒。规则引擎不接。
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { C } from "../theme";
import { portraitMaterial } from "../shaders";
import { FLIPBOOKS, artUrl, frameRect } from "../flipbook";
import "./side.css";

type Side = "b" | "r";
type Facing = "left" | "right" | "front";

// 每个角色的天生朝向。左队要朝右、右队要朝左，和天生朝向相反就镜像。
const CHARS: Record<string, { facing: Facing }> = {
  medic_full_cast: { facing: "left" },
  hacker: { facing: "front" },
  support: { facing: "front" },
  firepower_master: { facing: "front" },
  cyborg_zealot: { facing: "front" },
};

interface Spec { id: string; name: string; art: string; hp: number; max: number; }
const ROSTER: Record<Side, Spec[]> = {
  b: [
    { id: "b1", name: "蓝一", art: "firepower_master", hp: 20, max: 22 },
    { id: "b2", name: "蓝二", art: "hacker", hp: 15, max: 19 },
    { id: "b3", name: "蓝三", art: "support", hp: 22, max: 22 },
  ],
  r: [
    { id: "r1", name: "红一", art: "medic_full_cast", hp: 18, max: 20 },
    { id: "r2", name: "红二", art: "cyborg_zealot", hp: 25, max: 25 },
    { id: "r3", name: "红三", art: "firepower_master", hp: 12, max: 22 },
  ],
};

// 站位：前排靠中线、后排往外往里错开，三人斜排互不遮挡。x 为右队坐标，左队取负。
const SLOTS = [
  { x: 2.0, z: 0.9 },
  { x: 3.6, z: -0.5 },
  { x: 5.2, z: -1.9 },
];
const FIG_H = 2.5;
const ASPECT = 832 / 1216;

const loader = new THREE.TextureLoader();
const geoPlane = new THREE.PlaneGeometry(1, 1);

function ringTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 60, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.72, "rgba(255,255,255,0.08)");
  grad.addColorStop(0.86, "rgba(255,255,255,1)");
  grad.addColorStop(0.92, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const RING_TEX = ringTexture();

function floorTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#04120f"; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(31,214,180,0.16)"; g.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class SideUnit {
  root = new THREE.Group();
  fig = new THREE.Group();
  art: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  ring: THREE.MeshBasicMaterial;
  plate: HTMLDivElement;
  hpFill: HTMLDivElement;
  hpText: HTMLSpanElement;
  flip = false;
  animT = -1;          // <0 待机；>=0 正在播动作的时间
  wait = 0;            // 循环播放时两遍之间的停顿
  glitch = 0;
  ko = 0; koTarget = 0;
  hover = 0; hoverTarget = 0;
  selected = false;

  constructor(public spec: Spec, public side: Side, public slot: number, seed: number) {
    const s = SLOTS[slot];
    this.root.position.set(side === "r" ? s.x : -s.x, 0, s.z);

    this.ring = new THREE.MeshBasicMaterial({ map: RING_TEX, color: C.side[side], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const ring = new THREE.Mesh(geoPlane, this.ring);
    ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(1.9); ring.position.y = 0.01;
    this.root.add(ring);

    this.mat = portraitMaterial(new THREE.Texture(), seed);
    this.mat.uniforms.uFade.value = 0.03;
    this.art = new THREE.Mesh(geoPlane, this.mat);
    this.art.scale.set(FIG_H * ASPECT, FIG_H, 1);
    this.art.position.y = FIG_H / 2;
    this.art.userData.unit = this;
    this.fig.add(this.art);
    this.root.add(this.fig);
    this.setArt(spec.art);

    this.plate = document.createElement("div");
    this.plate.className = `sv-plate ${side}`;
    this.plate.innerHTML = `<div class="sv-plate-name"></div><div class="sv-hp"><div class="sv-hp-fill"></div></div><span class="sv-hp-num"></span>`;
    this.hpFill = this.plate.querySelector(".sv-hp-fill")!;
    this.hpText = this.plate.querySelector(".sv-hp-num")!;
    document.getElementById("plates")!.appendChild(this.plate);
    this.refresh();
  }

  setArt(art: string) {
    this.spec.art = art;
    const map = loader.load(artUrl(art));
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    this.mat.uniforms.map.value = map;
    const want: Facing = this.side === "b" ? "right" : "left";
    const native = CHARS[art]?.facing ?? "front";
    this.flip = native !== "front" && native !== want;
    this.animT = -1;
    this.applyFrame(0);
  }

  applyFrame(f: number) {
    const fb = FLIPBOOKS[this.spec.art];
    const r = fb ? frameRect(fb, f, this.flip) : (this.flip ? [1, 0, -1, 1] : [0, 0, 1, 1]);
    this.mat.uniforms.uRect.value.set(...(r as [number, number, number, number]));
  }

  play() { if (FLIPBOOKS[this.spec.art] && this.koTarget === 0) this.animT = 0; }
  hit(d: number) {
    this.glitch = 1.3;
    this.spec.hp = Math.max(0, this.spec.hp - d);
    if (this.spec.hp === 0) this.koTarget = 1;
    this.refresh();
  }
  toggleKo() {
    if (this.koTarget) { this.koTarget = 0; this.spec.hp = this.spec.max; } else { this.koTarget = 1; this.spec.hp = 0; this.glitch = 1.3; }
    this.refresh();
  }

  refresh() {
    const { name, hp, max } = this.spec;
    (this.plate.querySelector(".sv-plate-name") as HTMLElement).textContent = name;
    this.hpFill.style.width = `${(hp / max) * 100}%`;
    this.hpFill.classList.toggle("low", hp / max < 0.35);
    this.hpText.textContent = `${hp}/${max}`;
    this.plate.classList.toggle("ko", hp === 0);
  }

  update(t: number, dt: number, cam: THREE.Camera, loop: boolean) {
    const k = 1 - Math.exp(-dt * 10);
    this.hover += (this.hoverTarget - this.hover) * k;
    this.ko += (this.koTarget - this.ko) * (1 - Math.exp(-dt * 3));
    this.glitch = Math.max(0, this.glitch - dt * 1.5);

    // 立绘只绕竖轴转向镜头
    const cp = cam.position;
    this.fig.rotation.y = Math.atan2(cp.x - this.root.position.x, cp.z - this.root.position.z);
    this.fig.position.y = 0.02 + Math.sin(t * 1.2 + this.root.position.x) * 0.015;
    this.fig.scale.set(1 + this.ko * 0.15, Math.max(0.02, 1 - this.ko), 1);

    const fb = FLIPBOOKS[this.spec.art];
    if (fb) {
      if (this.animT >= 0) {
        this.animT += dt;
        const f = Math.floor(this.animT * fb.fps);
        if (f >= fb.frames) { this.animT = -1; this.wait = fb.hold; this.applyFrame(0); }
        else this.applyFrame(f);
      } else if (loop && this.koTarget === 0) {
        this.wait -= dt;
        if (this.wait <= 0) this.animT = 0;
      }
    }

    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uGlitch.value = this.glitch + this.ko * 0.6;
    this.mat.uniforms.uOpacity.value = 1 - this.ko * 0.6;
    this.ring.opacity = (0.55 + 0.08 * Math.sin(t * 2.5) + this.hover * 0.3 + (this.selected ? 0.4 : 0)) * (1 - this.ko * 0.7);
  }
}

function main() {
  const app = document.getElementById("app")!;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020b0a);
  scene.fog = new THREE.Fog(0x020b0a, 14, 34);

  // 地面 + 中线
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: floorTexture() }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -4;
  scene.add(floor);
  const mid = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 9), new THREE.MeshBasicMaterial({ color: C.incoming, transparent: true, opacity: 0.6, toneMapped: false }));
  mid.rotation.x = -Math.PI / 2; mid.position.set(0, 0.012, -1.5);
  scene.add(mid);
  // 远处的粗野主义石柱剪影 + 暖色窗缝光
  const slab = new THREE.MeshBasicMaterial({ color: 0x07110f });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.35, toneMapped: false });
  for (let i = -6; i <= 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 16, 1), slab);
    p.position.set(i * 3.2, 8, -12);
    scene.add(p);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 12), glow);
    g.position.set(i * 3.2 + 1.6, 7, -12.4);
    scene.add(g);
  }

  const units: SideUnit[] = [];
  (["b", "r"] as Side[]).forEach((side) => ROSTER[side].forEach((s, i) => units.push(new SideUnit({ ...s }, side, i, units.length + 1))));
  units.forEach((u) => scene.add(u.root));

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const look = new THREE.Vector3(0, 1.15, -0.5);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.4, 0.85));
  composer.addPass(new OutputPass());

  // 镜头：从正前方略俯，距离按宽度自适应，让两队最外侧都在画面里
  function resize() {
    const w = app.clientWidth, h = app.clientHeight;
    renderer.setSize(w, h); composer.setSize(w, h);
    camera.aspect = w / h;
    const halfW = 6.6, vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(halfW / Math.tan(hfov / 2), 3.4 / Math.tan(vfov / 2));
    camera.position.set(0, look.y + dist * 0.2, look.z + dist);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  // ---- HUD ----
  const who = document.getElementById("who")!;
  const hpB = document.getElementById("hp-b")!, hpR = document.getElementById("hp-r")!;
  const clock = document.getElementById("clock")!, tlHead = document.getElementById("tl-head")!;
  let sel: SideUnit | null = null;
  const select = (u: SideUnit | null) => {
    units.forEach((o) => (o.selected = o === u)); sel = u;
    who.innerHTML = u ? `<b class="${u.side}">${u.spec.name}</b><span>${FLIPBOOKS[u.spec.art] ? "有动作序列" : "静态立绘"}${u.flip ? " · 镜像" : ""}</span>` : "点一个随从";
  };
  const teamHp = () => {
    for (const [side, el] of [["b", hpB], ["r", hpR]] as const) {
      const us = units.filter((u) => u.side === side);
      el.textContent = `${us.reduce((a, u) => a + u.spec.hp, 0)} / ${us.reduce((a, u) => a + u.spec.max, 0)}`;
    }
  };
  teamHp();
  document.getElementById("act-play")!.onclick = () => sel?.play();
  document.getElementById("act-hit")!.onclick = () => { sel?.hit(4); teamHp(); };
  document.getElementById("act-ko")!.onclick = () => { sel?.toggleKo(); teamHp(); };

  const medicSel = document.getElementById("dbg-medic") as HTMLSelectElement;
  medicSel.onchange = () => {
    // 医疗兵和对面同槽位的人互换
    const m = units.find((u) => u.spec.art === "medic_full_cast")!;
    const other = units.find((u) => u.side === medicSel.value && u.slot === m.slot)!;
    if (m.side === medicSel.value) return;
    const ms = { ...m.spec }, os = { ...other.spec };
    m.spec = { ...os, id: m.spec.id, name: m.spec.name }; other.spec = { ...ms, id: other.spec.id, name: other.spec.name };
    m.setArt(m.spec.art); other.setArt(other.spec.art); m.refresh(); other.refresh();
    select(other); teamHp();
  };
  let loop = false;
  (document.getElementById("dbg-loop") as HTMLInputElement).onchange = (e) => { loop = (e.target as HTMLInputElement).checked; };
  (document.getElementById("dbg-fx") as HTMLInputElement).onchange = (e) => {
    const on = (e.target as HTMLInputElement).checked;
    units.forEach((u) => { u.mat.uniforms.uDistort.value = on ? 0.4 : 0; u.mat.uniforms.uMix.value = on ? 0.15 : 0; });
  };

  // 悬停 / 点选
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(units.map((u) => u.art))[0];
    return hit ? (hit.object.userData.unit as SideUnit) : null;
  };
  renderer.domElement.addEventListener("pointermove", (e) => { const u = pick(e); units.forEach((o) => (o.hoverTarget = o === u ? 1 : 0)); renderer.domElement.style.cursor = u ? "pointer" : ""; });
  renderer.domElement.addEventListener("click", (e) => select(pick(e)));
  select(units.find((u) => u.spec.art === "medic_full_cast") ?? null);

  // 时间轴标记：示意每个随从这轮的出手秒数
  const marks = document.getElementById("tl-marks")!;
  units.forEach((u, i) => {
    const m = document.createElement("div");
    m.className = `sv-tl-mark ${u.side}`; m.style.left = `${8 + ((i * 37) % 84)}%`; m.textContent = u.spec.name;
    marks.appendChild(m);
  });

  const v = new THREE.Vector3();
  const clockT0 = performance.now();
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - clockT0) / 1000;
    units.forEach((u) => u.update(t, dt, camera, loop));
    composer.render();
    // 头顶血条跟着人物
    const w = app.clientWidth, h = app.clientHeight;
    units.forEach((u) => {
      v.set(u.root.position.x, FIG_H * (1 - u.ko * 0.8) + 0.2, u.root.position.z).project(camera);
      u.plate.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    });
    const sec = t % 20;
    clock.textContent = `${sec.toFixed(1)}s`;
    tlHead.style.left = `${(sec / 20) * 100}%`;
  });
}

main();

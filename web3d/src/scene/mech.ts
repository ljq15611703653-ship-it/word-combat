// 半机械化的随从底座（攻壳机动队式义体质感）：拉丝金属外壳、面板接缝、液压杆、关节、线缆接口、冷光指示灯。
// 全部程序化：贴图用 canvas 现画，几何用基础体拼。每个随从仍是独立的一块底座。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function cv(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** 拉丝金属 + 面板分缝 + 铆钉。tone 决定底色（哑光涂装 / 裸金属）。 */
export function brushedMetalTexture(tone: "steel" | "paint", seed = 1, panels: [number, number] = [2, 3]) {
  const S = 512;
  const [c, x] = cv(S, S);
  const r = rng(seed);
  const base = tone === "steel" ? [150, 160, 174] : [58, 66, 82];
  x.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  x.fillRect(0, 0, S, S);
  // 拉丝：大量细长横纹
  for (let i = 0; i < 2600; i++) {
    const y = r() * S, len = 40 + r() * 260, px = r() * S;
    const v = r() < 0.5 ? 255 : 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.02 + r() * 0.05})`;
    x.fillRect(px, y, len, 1);
  }
  // 面板接缝与铆钉
  const [pc, pr] = panels;
  x.strokeStyle = "rgba(6,10,20,0.85)";
  x.lineWidth = 3;
  for (let i = 0; i <= pc; i++) { const px = (i / pc) * S; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, S); x.stroke(); }
  for (let j = 0; j <= pr; j++) { const py = (j / pr) * S; x.beginPath(); x.moveTo(0, py); x.lineTo(S, py); x.stroke(); }
  x.strokeStyle = "rgba(255,255,255,0.12)";
  x.lineWidth = 1;
  for (let i = 0; i < pc; i++) for (let j = 0; j < pr; j++) {
    x.strokeRect((i / pc) * S + 6, (j / pr) * S + 6, S / pc - 12, S / pr - 12);
    for (const [ox, oy] of [[12, 12], [S / pc - 12, 12], [12, S / pr - 12], [S / pc - 12, S / pr - 12]]) {
      x.fillStyle = "rgba(10,14,24,0.7)";
      x.beginPath(); x.arc((i / pc) * S + ox, (j / pr) * S + oy, 3.2, 0, Math.PI * 2); x.fill();
      x.fillStyle = "rgba(255,255,255,0.25)";
      x.beginPath(); x.arc((i / pc) * S + ox - 0.8, (j / pr) * S + oy - 0.8, 1.2, 0, Math.PI * 2); x.fill();
    }
  }
  // 磨损：边缘发亮的细划痕 + 零星污渍
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`;
    x.fillRect(r() * S, r() * S, 10 + r() * 50, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** 玻璃面上的发光层遮罩：不是走线，而是分区框线、刻度、角标（HUD 风格）。 */
export function hudPanelTexture(seed: number, clear?: [number, number, number, number]) {
  const W = 512, H = 768;
  const [c, x] = cv(W, H);
  const r = rng(seed);
  x.strokeStyle = "#fff"; x.fillStyle = "#fff";
  x.lineWidth = 3;
  // 内框（带切角）
  const m = 16, k = 34;
  x.beginPath();
  x.moveTo(m + k, m); x.lineTo(W - m, m); x.lineTo(W - m, H - m - k); x.lineTo(W - m - k, H - m); x.lineTo(m, H - m); x.lineTo(m, m + k); x.closePath();
  x.stroke();
  // 边缘刻度
  x.lineWidth = 2;
  for (let i = 0; i < 28; i++) {
    const px = 40 + i * ((W - 80) / 27), len = i % 4 === 0 ? 14 : 7;
    x.beginPath(); x.moveTo(px, m + 6); x.lineTo(px, m + 6 + len); x.stroke();
  }
  for (let i = 0; i < 38; i++) {
    const py = 60 + i * ((H - 120) / 37), len = i % 5 === 0 ? 14 : 7;
    x.beginPath(); x.moveTo(m + 6, py); x.lineTo(m + 6 + len, py); x.stroke();
    x.beginPath(); x.moveTo(W - m - 6, py); x.lineTo(W - m - 6 - len, py); x.stroke();
  }
  // 细十字标
  for (let i = 0; i < 9; i++) {
    const px = 60 + r() * (W - 120), py = 60 + r() * (H - 120);
    x.beginPath(); x.moveTo(px - 6, py); x.lineTo(px + 6, py); x.moveTo(px, py - 6); x.lineTo(px, py + 6); x.stroke();
  }
  if (clear) x.clearRect(...clear);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}


/** 立在街面上的基座：下沉的深色底座 + 支撑脚 + 阵营色缝隙灯，托起上面的平台。lift = 平台抬高的高度。 */
export function buildMechPlinth(w: number, d: number, lift: number, sideColor: number) {
  const sh = shared();
  const g = new THREE.Group();
  const core = new THREE.Mesh(new RoundedBoxGeometry(w - 0.3, lift - 0.04, d - 0.3, 2, 0.03), sh.dark);
  core.position.y = (lift - 0.04) / 2 + 0.02;
  g.add(core);
  const groove = new THREE.Mesh(new THREE.BoxGeometry(w - 0.22, 0.02, d - 0.22), new THREE.MeshBasicMaterial({ color: sideColor, toneMapped: false }));
  groove.position.y = lift * 0.55;
  g.add(groove);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, lift + 0.02, 10), sh.steel);
    foot.position.set(sx * (w / 2 - 0.2), (lift + 0.02) / 2, sz * (d / 2 - 0.2));
    g.add(foot);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 10), sh.chrome);
    pad.position.set(sx * (w / 2 - 0.2), 0.015, sz * (d / 2 - 0.2));
    g.add(pad);
  }
  return g;
}

export interface MechBase {
  group: THREE.Group;
  lights: THREE.MeshBasicMaterial[];
  update(t: number): void;
}

const shared = (() => {
  let cache: ReturnType<typeof make> | null = null;
  function make() {
    const steel = new THREE.MeshStandardMaterial({ map: brushedMetalTexture("steel", 3, [3, 2]), metalness: 0.9, roughness: 0.38, color: 0xdfe6ee });
    const paint = new THREE.MeshStandardMaterial({ map: brushedMetalTexture("paint", 5, [2, 3]), metalness: 0.55, roughness: 0.62 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x10151f, metalness: 0.7, roughness: 0.5 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xe8eef6, metalness: 1, roughness: 0.18 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0e16, metalness: 0.1, roughness: 0.8 });
    const copper = new THREE.MeshStandardMaterial({ color: 0xb9a37c, metalness: 1, roughness: 0.3 });
    const slab = paint.clone();
    slab.map = brushedMetalTexture("paint", 11, [2, 2]);
    return { steel, paint, dark, chrome, rubber, copper, slab };
  }
  return () => (cache ??= make());
})();

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

function hydraulic(a: THREE.Vector3, b: THREE.Vector3, sh: ReturnType<typeof shared>) {
  const g = new THREE.Group();
  const mid = a.clone().lerp(b, 0.55);
  g.add(cylinderBetween(a, mid, 0.045, sh.dark));          // 缸体
  g.add(cylinderBetween(mid, b, 0.02, sh.chrome));         // 活塞杆
  for (const f of [0.15, 0.7]) {                           // 缸体上的箍环
    const p = a.clone().lerp(mid, f);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.02, 14), sh.steel);
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(ring);
  }
  for (const p of [a, b]) {                                // 两端的耳座
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), sh.steel);
    j.position.copy(p);
    g.add(j);
  }
  return g;
}

function cable(pts: THREE.Vector3[], sh: ReturnType<typeof shared>, r = 0.016) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 6, false), sh.rubber));
  for (const [p, q] of [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]]) {   // 端部接头
    const plug = cylinderBetween(p, p.clone().lerp(q, 0.08), r * 1.9, sh.copper);
    g.add(plug);
  }
  return g;
}

/** 一块独立的义体底座。w/d/t 是承载板尺寸，hw 是玻璃卡的宽（侧边机构放在卡的外侧）。 */
export function buildMechBase(w: number, d: number, t: number, cardW: number, sideColor: number, seed: number): MechBase {
  const sh = shared();
  const g = new THREE.Group();
  const r = rng(seed * 97 + 5);
  const lights: THREE.MeshBasicMaterial[] = [];
  const led = (color: number) => {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    m.userData.base = color;
    lights.push(m);
    return m;
  };

  // 主板：哑光涂装的厚板，边缘带倒角
  const slab = new THREE.Mesh(new RoundedBoxGeometry(w, t, d, 2, 0.02), sh.slab);
  slab.position.y = t / 2;
  g.add(slab);
  // 底部一圈外扩的拉丝钢裙边（让底座有厚度、压在街面上）
  const skirt = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, 0.05, d + 0.1, 2, 0.02), sh.steel);
  skirt.position.y = 0.025;
  g.add(skirt);

  // 左右护甲条：拉丝钢，上有阵营色细条灯
  const stripe = new THREE.MeshBasicMaterial({ color: sideColor, toneMapped: false });
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.075, d - 0.28, 2, 0.015), sh.steel);
    rail.position.set(sx * (w / 2 - 0.08), t + 0.03, -0.02);
    g.add(rail);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, d - 0.7), stripe);
    s.position.set(sx * (w / 2 - 0.08), t + 0.07, -0.02);
    g.add(s);
  }


  // 侧翼装甲块：凸起的块体 + 散热片 + 肩部接口
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, d * 0.5, 2, 0.03), sh.paint);
    wing.position.set(sx * (w / 2 + 0.06), t / 2 + 0.02, 0.1);
    g.add(wing);
    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.025), sh.steel);
      fin.position.set(sx * (w / 2 + 0.18), t / 2 + 0.03, -0.25 + i * 0.1 + 0.12);
      g.add(fin);
    }
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), sh.dark);
    sock.rotation.z = Math.PI / 2;
    sock.position.set(sx * (w / 2 + 0.17), t / 2 + 0.1, 0.55);
    g.add(sock);
    const ringL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, d * 0.4), stripe);
    ringL.position.set(sx * (w / 2 + 0.165), t / 2 + 0.1, 0.1);
    g.add(ringL);
  }

  // 前沿：接口排（深色槽 + 冷光点），代替旧的金手指
  const frontZ = d / 2 - 0.085;
  for (let i = 0; i < 9; i++) {
    const x = -0.96 + i * 0.24;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.07), sh.dark);
    slot.position.set(x, t + 0.006, frontZ);
    g.add(slot);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.014), led(i % 4 === 1 ? 0xffb347 : 0x8fe8ff));
    l.position.set(x + 0.04, t + 0.012, frontZ + 0.028);
    g.add(l);
    // 前沿面板上的铆钉
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 6), sh.chrome);
    bolt.position.set(x - 0.095, t + 0.006, frontZ - 0.05);
    g.add(bolt);
  }

  // 两侧：左 = 关节 + 液压杆；右 = 动力模块 + 散热格栅
  const mx = (cardW + w) / 4;
  // 左：球关节 + 双液压
  const joint = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), sh.steel);
  ball.position.y = 0.12;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 24), sh.dark);
  ring.position.y = 0.12; ring.rotation.x = Math.PI / 2.3;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.07, 18), sh.paint);
  base.position.y = 0.035;
  joint.add(base, ball, ring);
  joint.position.set(-mx, t, -0.52);
  g.add(joint);
  g.add(hydraulic(new THREE.Vector3(-mx - 0.04, t + 0.04, -0.15), new THREE.Vector3(-mx - 0.02, t + 0.26, -0.5), sh));
  g.add(hydraulic(new THREE.Vector3(-mx + 0.04, t + 0.04, -0.88), new THREE.Vector3(-mx, t + 0.25, -0.58), sh));
  // 线缆：从关节绕出，插进前沿接口
  g.add(cable([
    new THREE.Vector3(-mx + 0.08, t + 0.15, -0.5), new THREE.Vector3(-mx + 0.2, t + 0.12, -0.2),
    new THREE.Vector3(-mx + 0.02, t + 0.07, 0.25), new THREE.Vector3(-mx + 0.18, t + 0.03, frontZ - 0.06),
  ], sh));
  g.add(cable([
    new THREE.Vector3(-mx - 0.1, t + 0.14, -0.55), new THREE.Vector3(-mx - 0.12, t + 0.1, -0.15),
    new THREE.Vector3(-mx - 0.05, t + 0.05, 0.4), new THREE.Vector3(-mx - 0.04, t + 0.03, 0.7),
  ], sh, 0.012));

  // 右：动力模块（侧面带冷光槽）+ 立式缸 + 格栅
  const core = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.2, 0.34, 2, 0.02), sh.paint);
  core.position.set(mx, t + 0.1, -0.62);
  g.add(core);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.02), led(0x8fe8ff));
  slit.position.set(mx, t + 0.16, -0.45);
  g.add(slit);
  const slit2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.02), led(0x8fe8ff));
  slit2.position.set(mx, t + 0.12, -0.45);
  g.add(slit2);
  for (let i = 0; i < 5; i++) {                       // 散热格栅
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.014), sh.dark);
    f.position.set(mx, t + 0.05 + i * 0.03, -0.79);
    g.add(f);
  }
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 16), sh.dark);
  piston.position.set(mx, t + 0.11, -0.2);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 12), sh.chrome);
  rod.position.set(mx, t + 0.27, -0.2);
  g.add(piston, rod);
  for (const y of [0.04, 0.17]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 16), sh.steel);
    band.position.set(mx, t + y, -0.2);
    g.add(band);
  }
  g.add(cable([
    new THREE.Vector3(mx - 0.05, t + 0.22, -0.2), new THREE.Vector3(mx - 0.16, t + 0.14, 0.1),
    new THREE.Vector3(mx - 0.02, t + 0.06, 0.38), new THREE.Vector3(mx - 0.12, t + 0.03, frontZ - 0.06),
  ], sh));

  // 后沿：一条铰链 + 指示灯
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w - 0.5, 10), sh.chrome);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, t + 0.03, -d / 2 + 0.07);
  g.add(hinge);
  for (let i = 0; i < 5; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.02), led(r() < 0.3 ? 0xffb347 : 0x8fe8ff));
    l.position.set(-0.5 + i * 0.25, t + 0.012, -d / 2 + 0.16);
    g.add(l);
  }
  // 四角的六角螺栓
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), sh.chrome);
    b.position.set(sx * (w / 2 - 0.04), t + 0.01, sz * (d / 2 - 0.04));
    g.add(b);
  }

  return {
    group: g, lights,
    update(time) {
      lights.forEach((m, i) => m.color.setHex(m.userData.base).multiplyScalar(0.65 + 0.35 * Math.sin(time * (1.5 + (i % 3) * 0.7) + i * 1.9)));
    },
  };
}

// 外壳装甲：立绘（核心）保持不变，底座外面套一圈半透明的全息盔甲，装上的词在盔甲上长出零件。
//   · 盔甲壳（一直在）：底座四周的蜂窝装甲板（后墙高、两侧斜下、前墙矮）+ 发光边框 + 四角立柱，阵营色。
//     悬停 / 选中时更亮，出手演出时整圈亮起并向外扩一圈光环；随从倒下时塌下去。
//   · 底座外的零件：靠敌人的一侧 = 攻击刃（长度 ∝ 伤害）；另一侧 = 护盾（大小 ∝ 减伤）；
//     地面一圈 = 持续光环（一格刻度 = 一轮）；后角 = 血债量管。
//   · 人物身上的小零件（跟着立绘正对镜头）：背后模块（一段一块）、环绕的状态、胸口关键词（不屈 / 首挡）。
// 全部是加法混合的半透明；没有装备时只剩盔甲壳。
import * as THREE from "three";
import { C, FONT_CN, FONT_NUM } from "./theme";

export interface Loadout {
  atk: number;                       // 这一轮这个随从宣告的总伤害
  block: number;                     // 减伤点数
  heal: number;
  redirect: boolean;
  delay: number;
  blood: number;                     // 用血付的点数
  bloodRoom: number;                 // 血量管满格对应的血
  conts: number;                     // 挂着的续
  contLeft: number;                  // 续剩余轮数（最大那个）
  clauses: { kind: string; label: string }[];
  statuses: { name: string; lv: number }[];   // 身上的状态
  kw?: string;                       // 关键词
  kwSpent?: boolean;
  down?: boolean;
}
export const EMPTY_LOADOUT: Loadout = { atk: 0, block: 0, heal: 0, redirect: false, delay: 0, blood: 0, bloodRoom: 7, conts: 0, contLeft: 0, clauses: [], statuses: [] };

const ST_COL: Record<string, string> = { 易伤: "#ff5d73", 灼烧: "#ffa23a", 衰弱: "#b58cff" };
const KIND_COL: Record<string, string> = { atk: "#ff7a5c", heal: "#5dffb0", mit: "#5cc8ff", st: "#ff5dc8", redirect: "#ffd24a", delay: "#cfa37f", remove: "#e9fffb" };
const KIND_GLYPH: Record<string, string> = { atk: "伤", heal: "疗", mit: "挡", st: "状", redirect: "移", delay: "延", remove: "除" };

const texCache = new Map<string, THREE.CanvasTexture>();
function tex(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  return t;
}
function glow(x: CanvasRenderingContext2D, col: string, blur = 14) { x.shadowColor = col; x.shadowBlur = blur; }

const bladeTex = () => tex("blade", 128, 512, (x) => {
  const g = x.createLinearGradient(0, 512, 0, 0);
  g.addColorStop(0, "rgba(255,122,92,0.05)"); g.addColorStop(0.5, "rgba(255,140,110,0.35)"); g.addColorStop(1, "rgba(255,230,210,0.8)");
  x.fillStyle = g; x.strokeStyle = "#ffb7a3"; x.lineWidth = 4; glow(x, "#ff7a5c");
  x.beginPath(); x.moveTo(64, 6); x.lineTo(92, 90); x.lineTo(84, 420); x.lineTo(44, 420); x.lineTo(36, 90); x.closePath(); x.fill(); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.moveTo(64, 30); x.lineTo(64, 400); x.stroke();
  x.fillStyle = "#ffb7a3"; x.fillRect(22, 424, 84, 12); x.fillRect(54, 436, 20, 60);
});
const shieldTex = () => tex("shield", 256, 256, (x) => {
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 120);
  g.addColorStop(0, "rgba(92,200,255,0.1)"); g.addColorStop(1, "rgba(92,200,255,0.45)");
  x.fillStyle = g; x.strokeStyle = "#a9e6ff"; x.lineWidth = 5; glow(x, "#5cc8ff");
  x.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; x.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); }
  x.closePath(); x.fill(); x.stroke();
  x.lineWidth = 2; x.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; x.lineTo(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70); }
  x.closePath(); x.stroke();
});
const ringTex = () => tex("ring", 256, 256, (x) => {
  x.strokeStyle = "#ffffff"; glow(x, "#ffffff", 10);
  x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 110, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(128, 128, 96, 0, Math.PI * 2); x.stroke();
});
const tickTex = () => tex("tick", 32, 64, (x) => { x.fillStyle = "#fff"; glow(x, "#fff", 8); x.fillRect(11, 8, 10, 48); });
const tagTex = (kind: string, label: string) => tex(`tag:${kind}:${label}`, 160, 96, (x) => {
  const col = KIND_COL[kind] ?? "#ffffff";
  x.fillStyle = "rgba(255,255,255,0.1)"; x.strokeStyle = col; x.lineWidth = 4; glow(x, col, 12);
  x.beginPath(); x.roundRect(8, 8, 144, 80, 14); x.fill(); x.stroke();
  x.shadowBlur = 0; x.fillStyle = col; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `700 38px ${FONT_CN}`; x.fillText(KIND_GLYPH[kind] ?? "?", 48, 50);
  x.font = `700 30px ${FONT_NUM}`; x.fillText(label, 108, 52);
});
const chipTex = (name: string, lv: number) => tex(`chip:${name}:${lv}`, 128, 128, (x) => {
  const col = ST_COL[name] ?? "#fff";
  x.strokeStyle = col; x.fillStyle = "rgba(255,255,255,0.08)"; x.lineWidth = 5; glow(x, col, 14);
  x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.fill(); x.stroke();
  x.shadowBlur = 0; x.fillStyle = col; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `700 44px ${FONT_CN}`; x.fillText(name[0], 64, 54);
  x.font = `700 26px ${FONT_NUM}`; x.fillText(`Lv${lv}`, 64, 94);
});
const gaugeTex = () => tex("gauge", 64, 256, (x) => {
  x.strokeStyle = "#ff5d73"; x.lineWidth = 4; glow(x, "#ff5d73", 10);
  x.beginPath(); x.roundRect(8, 8, 48, 240, 20); x.stroke();
});
const numTex = (n: string, col: string) => tex(`num:${n}:${col}`, 128, 64, (x) => {
  x.fillStyle = col; glow(x, col, 10); x.font = `700 44px ${FONT_NUM}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(n, 64, 34);
});
const coreTex = () => tex("core", 128, 128, (x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 60);
  g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.35, "rgba(255,255,255,0.3)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});
const shellTex = () => tex("shell", 128, 128, (x) => {
  x.strokeStyle = "#fff"; x.lineWidth = 5; glow(x, "#fff", 10);
  x.beginPath(); x.moveTo(14, 100); x.lineTo(14, 40); x.lineTo(64, 12); x.lineTo(114, 40); x.lineTo(114, 100); x.stroke();
});

const hexTex = () => tex("hex", 96, 111, (x) => {
  // 蜂窝装甲板：一格平顶六边形，四边接缝对齐，贴图重复平铺
  const r = 32, dy = r * Math.sqrt(3);
  x.strokeStyle = "rgba(255,255,255,0.85)"; x.lineWidth = 2;
  const hex = (cx: number, cy: number) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.stroke(); };
  for (const [cx, cy] of [[0, 0], [96, 0], [0, dy * 2], [96, dy * 2], [r * 1.5, dy / 2], [r * 1.5, dy * 1.5], [r * 1.5, dy * 2.5], [r * 1.5, -dy / 2]]) hex(cx, cy);
  x.fillStyle = "rgba(255,255,255,0.10)"; x.fillRect(0, 0, 96, 111);
});

function plane(map: THREE.Texture, color: string | number, opacity = 0.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map, color, transparent: true, opacity, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  m.renderOrder = 8;
  return m;
}

/** 四边形装甲板：corners 依次是 下左、下右、上右、上左；底边亮、顶边淡（顶点颜色的 alpha 渐变） */
function wallGeo(c: THREE.Vector3[], uvScale: [number, number], a0: number, a1: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(c.flatMap((p) => [p.x, p.y, p.z]), 3));
  const wlen = c[0].distanceTo(c[1]), hlen = (c[0].distanceTo(c[3]) + c[1].distanceTo(c[2])) / 2;
  const u = wlen * uvScale[0], v = hlen * uvScale[1];
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, v], 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute([1, 1, 1, a0, 1, 1, 1, a0, 1, 1, 1, a1, 1, 1, 1, a1], 4));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
/** 发光边框的一根杆：从 a 到 b，厚 th */
function bar(a: THREE.Vector3, b: THREE.Vector3, th: number, mat: THREE.Material) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(th, th, len), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.lookAt(b);
  return m;
}

/** 一个随从的外壳。root 放进立绘的 bill 组里（始终正对镜头）；base 放在随从根节点下（世界坐标轴，围着底座）。 */
export class Armor {
  /** 人物身上的小零件（正对镜头） */
  readonly root = new THREE.Group();
  /** 底座外的盔甲壳和大零件 */
  readonly base = new THREE.Group();
  private h: number;
  private din: number;                 // 朝敌人一侧的 x 方向：蓝方在左 = +1，红方在右 = -1
  private hw: number; private hd: number; private y0: number;
  private blade: THREE.Mesh; private bladeNum: THREE.Mesh;
  private shield: THREE.Mesh; private shieldRing: THREE.Mesh; private shieldNum: THREE.Mesh;
  private halo: THREE.Mesh; private tickRing = new THREE.Group(); private tickMeshes: THREE.Mesh[] = []; private pulse: THREE.Mesh;
  private gauge: THREE.Mesh; private gaugeFill: THREE.Mesh;
  private core: THREE.Mesh; private shellL: THREE.Mesh; private shellR: THREE.Mesh;
  private tags = new THREE.Group();
  private orbit = new THREE.Group();
  private healMark: THREE.Mesh; private redirMark: THREE.Mesh; private delayMark: THREE.Mesh;
  private cur = { blade: 0, shield: 0, halo: 0, gauge: 0, core: 0, shells: 0, mods: 0, shell: 0 };
  private goal = { ...this.cur };
  private sig = "";
  private ld: Loadout = EMPTY_LOADOUT;
  private bladeLen = 1; private shieldSize = 0.5;
  // 盔甲壳
  private shellGroup = new THREE.Group();
  private wallMats: THREE.MeshBasicMaterial[] = [];
  private barMat: THREE.MeshBasicMaterial;
  private teamCol = new THREE.Color();
  private tmpCol = new THREE.Color();
  /** 悬停 / 选中的亮度（0~1），由 UnitCard 每帧写 */
  emph = 0;
  /** [技能演出] 结算回放时由 fx/castShow 驱动：kind = 本句的效果，k = 0~1 的亢奋度，swing = 刃的挥动 */
  readonly fx = { kind: "", k: 0, swing: 0, col: "#ffffff" };
  private chestPt = new THREE.Object3D();

  /** figH = 立绘高度；W / D = 底座（缩放后）的宽和进深；y0 = 底座台面的高度；side = 阵营 */
  constructor(figH: number, W = 2.9, D = 2.15, y0 = 0.3, side: "b" | "r" = "b") {
    this.h = figH;
    const h = figH;
    this.din = side === "b" ? 1 : -1;
    this.hw = W / 2 + 0.1; this.hd = D / 2 + 0.1; this.y0 = y0;
    this.teamCol.setHex(C.side[side]);
    const { hw, hd, din } = this;

    // ---- 盔甲壳：后墙高、两侧从后往前斜下、前墙矮；蜂窝板 + 底边亮 / 顶边淡 + 发光边框 + 四角立柱
    const yb = 0.04, hBack = 1.45, hSideB = 1.2, hSideF = 0.52, hFront = 0.36;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const walls: [THREE.Vector3[], number][] = [
      [[V(-hw, yb, -hd), V(hw, yb, -hd), V(hw, hBack, -hd), V(-hw, hBack, -hd)], 1],                    // 后墙
      [[V(-hw, yb, hd), V(-hw, yb, -hd), V(-hw, hSideB, -hd), V(-hw, hSideF, hd)], 1],                  // 左墙
      [[V(hw, yb, -hd), V(hw, yb, hd), V(hw, hSideF, hd), V(hw, hSideB, -hd)], 1],                       // 右墙
      [[V(-hw, yb, hd), V(hw, yb, hd), V(hw, hFront, hd), V(-hw, hFront, hd)], 1],                       // 前墙
    ];
    const ht = hexTex();
    ht.wrapS = ht.wrapT = THREE.RepeatWrapping;
    for (const [c] of walls) {
      const mat = new THREE.MeshBasicMaterial({ map: ht, color: this.teamCol, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
      const m = new THREE.Mesh(wallGeo(c, [1.1, 1.1], 0.95, 0.06), mat);
      m.renderOrder = 6;
      this.wallMats.push(mat);
      this.shellGroup.add(m);
    }
    this.barMat = new THREE.MeshBasicMaterial({ color: this.teamCol, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const bm = this.barMat, th = 0.045;
    const bars: [THREE.Vector3, THREE.Vector3][] = [
      [V(-hw, yb, -hd), V(hw, yb, -hd)], [V(hw, yb, -hd), V(hw, yb, hd)], [V(hw, yb, hd), V(-hw, yb, hd)], [V(-hw, yb, hd), V(-hw, yb, -hd)],   // 底边一圈
      [V(-hw, hBack, -hd), V(hw, hBack, -hd)],                                                                                                      // 后墙顶
      [V(-hw, hSideB, -hd), V(-hw, hSideF, hd)], [V(hw, hSideB, -hd), V(hw, hSideF, hd)],                                                           // 两侧斜边
      [V(-hw, hFront, hd), V(hw, hFront, hd)],                                                                                                      // 前墙顶
      [V(-hw, yb, -hd), V(-hw, hBack, -hd)], [V(hw, yb, -hd), V(hw, hBack, -hd)],                                                                   // 后立柱
      [V(-hw, yb, hd), V(-hw, hSideF, hd)], [V(hw, yb, hd), V(hw, hSideF, hd)],                                                                     // 前立柱
    ];
    for (const [a, b] of bars) { const m = bar(a, b, th, bm); m.renderOrder = 7; this.shellGroup.add(m); }
    // 四角立柱顶上的亮点 + 后墙上的肩甲条
    const capGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    for (const [x, y, z] of [[-hw, hBack, -hd], [hw, hBack, -hd], [-hw, hSideF, hd], [hw, hSideF, hd]]) {
      const cap = new THREE.Mesh(capGeo, bm); cap.position.set(x, y, z); cap.rotation.set(0.6, 0.6, 0); cap.renderOrder = 7;
      this.shellGroup.add(cap);
    }
    this.base.add(this.shellGroup);

    // ---- 底座外的大零件
    this.blade = plane(bladeTex(), 0xffffff); this.blade.position.set(din * (hw + 0.12), y0, hd);
    this.bladeNum = plane(numTex("0", "#ffd0c2"), 0xffffff, 0.95); this.bladeNum.scale.set(0.42, 0.21, 1);
    this.shield = plane(shieldTex(), 0xffffff); this.shield.position.set(-din * (hw + 0.1), y0 + 0.62, hd + 0.05);
    this.shieldRing = plane(ringTex(), "#a9e6ff", 0.9);
    this.shieldNum = plane(numTex("0", "#bfeaff"), 0xffffff, 0.95); this.shieldNum.scale.set(0.42, 0.21, 1);
    this.halo = plane(ringTex(), "#ffd24a", 0.75); this.halo.rotation.x = -Math.PI / 2; this.halo.position.set(0, 0.035, 0);
    this.tickRing.rotation.x = -Math.PI / 2; this.tickRing.position.set(0, 0.04, 0);
    this.pulse = plane(ringTex(), "#ffffff", 0); this.pulse.rotation.x = -Math.PI / 2; this.pulse.position.set(0, 0.05, 0); this.pulse.visible = false;
    this.gauge = plane(gaugeTex(), "#ff5d73", 0.8); this.gauge.position.set(-din * (hw + 0.1), y0 + 0.62, -hd + 0.12); this.gauge.scale.set(0.2, 0.9, 1);
    this.gaugeFill = plane(coreTex(), "#ff5d73", 0.0); this.gaugeFill.position.copy(this.gauge.position);
    this.base.add(this.blade, this.bladeNum, this.shield, this.shieldRing, this.shieldNum, this.halo, this.tickRing, this.pulse, this.gauge, this.gaugeFill);

    // ---- 人物身上的小零件（正对镜头）
    this.core = plane(coreTex(), "#ffffff", 0); this.core.position.set(0, h * 0.58, 0); this.core.scale.setScalar(0.6);
    this.shellL = plane(shellTex(), "#bfeaff", 0); this.shellL.position.set(-h * 0.24, h * 0.72, 0); this.shellL.scale.setScalar(0.5);
    this.shellR = plane(shellTex(), "#bfeaff", 0); this.shellR.position.set(h * 0.24, h * 0.72, 0); this.shellR.scale.set(-0.5, 0.5, 1);
    this.chestPt.position.set(0, h * 0.55, 0);
    this.root.add(this.chestPt);
    this.tags.position.set(0, h * 0.55, -0.02);
    this.orbit.position.set(0, h * 0.4, 0);
    const mk = (col: string, g: string) => plane(chipTex(g, 0), col, 0);
    this.healMark = mk("#5dffb0", "疗"); this.redirMark = mk("#ffd24a", "移"); this.delayMark = mk("#cfa37f", "延");
    for (const m of [this.healMark, this.redirMark, this.delayMark]) m.visible = false;
    this.root.add(this.core, this.shellL, this.shellR, this.tags, this.orbit);
  }

  get loadout() { return this.ld; }
  /** [技能演出] 盔甲壳上某个部位的世界坐标（词牌飞过去、绑在上面用） */
  anchorWorld(kind: "blade" | "shield" | "halo" | "gauge" | "chest", out: THREE.Vector3) {
    this.base.updateWorldMatrix(true, false);
    const o = kind === "blade" ? this.blade : kind === "shield" ? this.shield : kind === "halo" ? this.halo : kind === "gauge" ? this.gauge : this.chestPt;
    return o.getWorldPosition(out);
  }

  set(ld: Loadout) {
    const sig = JSON.stringify(ld);
    if (sig === this.sig) return;
    this.sig = sig;
    this.ld = ld;
    const h = this.h;
    const alive = !ld.down;
    this.goal.blade = alive && ld.atk > 0 ? 1 : 0;
    this.goal.shield = alive && ld.block > 0 ? 1 : 0;
    this.goal.halo = alive && ld.conts > 0 ? 1 : 0;
    this.goal.gauge = alive && ld.blood > 0 ? 1 : 0;
    this.goal.core = alive && ld.kw === "不屈" && !ld.kwSpent ? 1 : 0;
    this.goal.shells = alive && ld.kw === "首挡" && !ld.kwSpent ? 1 : 0;
    this.goal.mods = alive ? 1 : 0;
    this.goal.shell = alive ? 1 : 0.18;
    this.bladeLen = 0.95 + Math.min(ld.atk, 24) * 0.06;
    this.shieldSize = 0.62 + Math.min(ld.block, 8) * 0.12;
    (this.bladeNum.material as THREE.MeshBasicMaterial).map = numTex(String(ld.atk), "#ffd0c2");
    (this.shieldNum.material as THREE.MeshBasicMaterial).map = numTex(`-${ld.block}`, "#bfeaff");
    // 持续光环：一轮一格刻度（地面一圈）
    this.tickRing.clear(); this.tickMeshes = [];
    const n = Math.min(ld.contLeft, 8);
    for (let i = 0; i < n; i++) {
      const t = plane(tickTex(), "#ffd24a", 0.95);
      t.scale.set(0.12, 0.26, 1);
      t.userData.i = i; t.userData.n = n;
      this.tickMeshes.push(t);
      this.tickRing.add(t);
    }
    // 背后模块：一段一块，扇形排开
    this.tags.clear();
    const k = ld.clauses.length;
    ld.clauses.forEach((c, i) => {
      const m = plane(tagTex(c.kind, c.label), 0xffffff, 0.85);
      const f = k === 1 ? 0 : i / (k - 1) - 0.5;
      m.position.set(f * Math.min(1.4, 0.3 * k + 0.5) * 1.5, h * 0.42 + 0.12 * Math.cos(f * Math.PI) - 0.1 * Math.abs(f) * 2, 0);
      m.rotation.z = -f * 0.5;
      m.scale.set(0.48, 0.29, 1);
      m.userData.base = m.position.clone();
      this.tags.add(m);
    });
    // 环绕的状态
    this.orbit.clear();
    ld.statuses.forEach((s, i) => {
      const m = plane(chipTex(s.name, s.lv), 0xffffff, 0.9);
      m.scale.setScalar(0.3);
      m.userData.phase = (i / Math.max(ld.statuses.length, 1)) * Math.PI * 2;
      this.orbit.add(m);
    });
    // 特殊标记
    const marks: [THREE.Mesh, boolean, number][] = [[this.healMark, ld.heal > 0, -0.3], [this.redirMark, ld.redirect, 0], [this.delayMark, ld.delay > 0, 0.3]];
    this.orbit.add(this.healMark, this.redirMark, this.delayMark);
    for (const [m, on, dx] of marks) { m.visible = on && alive; m.position.set(dx * 2, h * 0.5, 0); m.scale.setScalar(0.28); (m.material as THREE.MeshBasicMaterial).opacity = 0.9; }
  }

  update(t: number, dt: number) {
    const k = 1 - Math.exp(-dt * 6);
    const h = this.h, { hw, hd, din, y0 } = this;
    for (const key of Object.keys(this.cur) as (keyof typeof this.cur)[]) this.cur[key] += (this.goal[key] - this.cur[key]) * k;
    const c = this.cur;
    const bob = Math.sin(t * 1.6) * 0.02;
    const fx = this.fx, fk = fx.k;

    // ---- 盔甲壳：基础亮度 + 悬停/选中 + 演出亢奋；演出时颜色向本句的效果色偏
    const gl = 0.9 + 0.1 * Math.sin(t * 2.2);
    const lvl = c.shell * (0.62 + 0.28 * this.emph + 0.5 * fk) * gl;
    this.tmpCol.copy(this.teamCol);
    if (fk > 0.01) this.tmpCol.lerp(new THREE.Color(fx.col), Math.min(1, fk * 0.85));
    for (const m of this.wallMats) { m.opacity = Math.min(1, lvl); m.color.copy(this.tmpCol); }
    this.barMat.color.copy(this.tmpCol);
    this.barMat.opacity = Math.min(1, 0.45 * c.shell + 0.4 * lvl);
    this.shellGroup.scale.y = 0.2 + 0.8 * Math.min(1, c.shell * 1.05);        // 倒下时塌下去
    // 向外扩的光环（演出时）
    const pm = this.pulse.material as THREE.MeshBasicMaterial;
    this.pulse.visible = fk > 0.05;
    if (this.pulse.visible) {
      const ph = (t * 1.4) % 1;
      this.pulse.scale.set((hw * 2 + 0.3 + ph * 1.5) * 1.2, (hd * 2 + 0.3 + ph * 1.1) * 1.2, 1);
      pm.color.set(fx.col); pm.opacity = fk * 0.8 * (1 - ph);
    }

    // ---- 刃（演出时即使没装备也亮起，挥动和词牌绑在一起）
    const cb = Math.max(c.blade, fx.kind === "atk" ? fk : 0), cs = Math.max(c.shield, fx.kind === "mit" ? fk : 0);
    this.blade.visible = cb > 0.02;
    this.blade.scale.set(0.34 * cb * (1 + 0.7 * fk * (fx.kind === "atk" ? 1 : 0)), this.bladeLen * cb, 1);
    this.blade.position.y = y0 + 0.06 + (this.bladeLen * cb) / 2 + bob;
    this.blade.rotation.z = -din * (0.16 + (fx.kind === "atk" ? fx.swing * 1.2 : 0));
    (this.blade.material as THREE.MeshBasicMaterial).opacity = 0.85 + 0.15 * (fx.kind === "atk" ? fk : 0);
    this.bladeNum.visible = this.blade.visible;
    this.bladeNum.position.set(this.blade.position.x - din * Math.sin(this.blade.rotation.z * -din) * this.bladeLen * cb * 0.5 + 0.02, this.blade.position.y + (this.bladeLen * cb) / 2 + 0.16, hd);
    (this.bladeNum.material as THREE.MeshBasicMaterial).opacity = cb;
    // ---- 盾
    this.shield.visible = cs > 0.02;
    const ss = this.shieldSize * cs * (1 + 0.55 * (fx.kind === "mit" ? fk : 0));
    this.shield.scale.setScalar(ss);
    this.shield.position.y = y0 + 0.62 + bob;
    this.shield.rotation.z = Math.sin(t * 0.8) * 0.04;
    this.shieldRing.visible = this.shield.visible;
    this.shieldRing.scale.setScalar(ss * 1.18 + Math.sin(t * 3) * 0.01);
    this.shieldRing.position.copy(this.shield.position);
    this.shieldRing.rotation.z = t * 0.4;
    this.shieldNum.visible = this.shield.visible;
    this.shieldNum.position.set(this.shield.position.x, this.shield.position.y - ss * 0.62 - 0.1, hd + 0.05);
    (this.shieldNum.material as THREE.MeshBasicMaterial).opacity = cs;
    // ---- 持续光环（地面一圈）
    this.halo.visible = c.halo > 0.02;
    this.halo.scale.set((hw * 2 + 1.0) * c.halo, (hd * 2 + 1.0) * c.halo, 1);
    this.tickRing.visible = c.halo > 0.02;
    const rx = 0.43 * (hw * 2 + 1.0) * c.halo, ry = 0.43 * (hd * 2 + 1.0) * c.halo;
    for (const m of this.tickMeshes) {
      const a = (m.userData.i / m.userData.n) * Math.PI * 2 + t * 0.5;
      m.position.set(Math.cos(a) * rx, Math.sin(a) * ry, 0);
      m.rotation.z = a - Math.PI / 2;
    }
    // ---- 血债量管
    const g = this.gauge.material as THREE.MeshBasicMaterial;
    g.opacity = 0.8 * c.gauge;
    this.gauge.visible = c.gauge > 0.02;
    const gf = this.gaugeFill.material as THREE.MeshBasicMaterial;
    const frac = Math.min(1, this.ld.blood / Math.max(1, this.ld.bloodRoom));
    gf.opacity = 0.75 * c.gauge;
    this.gaugeFill.visible = this.gauge.visible;
    this.gaugeFill.scale.set(0.14, 0.84 * frac + 0.001, 1);
    this.gaugeFill.position.y = this.gauge.position.y - 0.42 + 0.42 * frac;

    // ---- 人物身上：胸口核心（不屈）、肩甲（首挡）、模块、状态
    const cm = this.core.material as THREE.MeshBasicMaterial;
    cm.opacity = 0.55 * c.core * (0.7 + 0.3 * Math.sin(t * 3.2));
    // 演出：治疗 / 状态 / 转移 / 延后 / 移除等没有固定部位，胸口核心按效果着色亮起
    const generic = fk > 0.01 && fx.kind !== "atk" && fx.kind !== "mit";
    if (generic) {
      cm.color.set(fx.col);
      cm.opacity = Math.max(cm.opacity, 0.95 * fk);
      this.core.scale.setScalar(0.6 + 1.3 * fk);
    } else { cm.color.set("#ffffff"); this.core.scale.setScalar(0.6); }
    this.core.visible = c.core > 0.02 || generic;
    for (const s of [this.shellL, this.shellR]) {
      (s.material as THREE.MeshBasicMaterial).opacity = 0.7 * c.shells;
      s.visible = c.shells > 0.02;
    }
    this.tags.children.forEach((m, i) => {
      const b = m.userData.base as THREE.Vector3;
      m.position.y = b.y + Math.sin(t * 1.4 + i) * 0.025;
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.85 * c.mods;
    });
    this.orbit.children.forEach((m) => {
      if (m.userData.phase === undefined) return;
      const a = m.userData.phase + t * 0.7;
      m.position.set(Math.cos(a) * h * 0.52, Math.sin(a) * 0.12 + Math.sin(t + a) * 0.02, -0.01);
      (m as THREE.Mesh).renderOrder = Math.sin(a) > 0 ? 6 : 9;
    });
  }
}

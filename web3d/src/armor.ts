// 外壳装甲：立绘（核心）保持不变，装上的词在它周围长出半透明的全息零件，像动画片里核心外面的盔甲。
// 位置固定：右手 = 攻击刃（长度 ∝ 伤害）；左手 = 护盾（大小 ∝ 减伤）；背后 = 段落模块（一段一块）；
// 头顶 = 持续光环（一圈刻度 = 一轮）；脚边 = 血债量管；腰间 = 环绕的状态；胸口 = 关键词。
// 全部是加法混合的半透明，不遮挡立绘；没有装备时整套淡出。
import * as THREE from "three";
import { FONT_CN, FONT_NUM } from "./theme";

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

function plane(map: THREE.Texture, color: string | number, opacity = 0.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map, color, transparent: true, opacity, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  m.renderOrder = 8;
  return m;
}

/** 一个随从的外壳。放进立绘的 bill 组里（始终正对镜头），尺寸按立绘高度 h 缩放。 */
export class Armor {
  readonly root = new THREE.Group();
  private h: number;
  private blade: THREE.Mesh; private bladeNum: THREE.Mesh;
  private shield: THREE.Mesh; private shieldRing: THREE.Mesh; private shieldNum: THREE.Mesh;
  private halo: THREE.Mesh; private ticks = new THREE.Group();
  private gauge: THREE.Mesh; private gaugeFill: THREE.Mesh;
  private core: THREE.Mesh; private shellL: THREE.Mesh; private shellR: THREE.Mesh;
  private tags = new THREE.Group();
  private orbit = new THREE.Group();
  private healMark: THREE.Mesh; private redirMark: THREE.Mesh; private delayMark: THREE.Mesh;
  private cur = { blade: 0, shield: 0, halo: 0, gauge: 0, core: 0, shells: 0, mods: 0 };
  private goal = { ...this.cur };
  private sig = "";
  private ld: Loadout = EMPTY_LOADOUT;
  private bladeLen = 1; private shieldSize = 0.5;
  /** [技能演出] 结算回放时由 fx/castShow 驱动：kind = 本句的效果，k = 0~1 的亢奋度，swing = 刃的挥动 */
  readonly fx = { kind: "", k: 0, swing: 0, col: "#ffffff" };
  private chestPt = new THREE.Object3D();

  constructor(figH: number) {
    this.h = figH;
    const h = figH;
    this.blade = plane(bladeTex(), 0xffffff); this.blade.position.set(h * 0.42, h * 0.5, 0.01);
    this.bladeNum = plane(numTex("0", "#ffd0c2"), 0xffffff, 0.95); this.bladeNum.scale.set(0.34, 0.17, 1);
    this.shield = plane(shieldTex(), 0xffffff); this.shield.position.set(-h * 0.42, h * 0.42, 0.01);
    this.shieldRing = plane(ringTex(), "#a9e6ff", 0.9);
    this.shieldNum = plane(numTex("0", "#bfeaff"), 0xffffff, 0.95); this.shieldNum.scale.set(0.34, 0.17, 1);
    this.halo = plane(ringTex(), "#ffd24a", 0.7); this.halo.position.set(0, h * 1.02, 0);
    this.halo.scale.set(0.8, 0.28, 1);
    this.halo.add(this.ticks);
    this.gauge = plane(gaugeTex(), "#ff5d73", 0.8); this.gauge.position.set(-h * 0.36, h * 0.17, 0); this.gauge.scale.set(0.16, 0.64, 1);
    this.gaugeFill = plane(coreTex(), "#ff5d73", 0.0); this.gaugeFill.position.set(-h * 0.36, h * 0.17, 0);
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
    this.root.add(this.blade, this.bladeNum, this.shield, this.shieldRing, this.shieldNum, this.halo, this.gauge, this.gaugeFill,
      this.core, this.shellL, this.shellR, this.tags, this.orbit);
  }

  /** [技能演出] 盔甲壳上某个部位的世界坐标（词牌飞过去、绑在上面用） */
  anchorWorld(kind: "blade" | "shield" | "halo" | "gauge" | "chest", out: THREE.Vector3) {
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
    this.bladeLen = h * (0.34 + Math.min(ld.atk, 24) * 0.026);
    this.shieldSize = h * (0.2 + Math.min(ld.block, 8) * 0.028);
    (this.bladeNum.material as THREE.MeshBasicMaterial).map = numTex(String(ld.atk), "#ffd0c2");
    (this.shieldNum.material as THREE.MeshBasicMaterial).map = numTex(`-${ld.block}`, "#bfeaff");
    // 持续光环：一轮一格刻度
    this.ticks.clear();
    const n = Math.min(ld.contLeft, 8);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(n, 1)) * Math.PI * 2;
      const t = plane(tickTex(), "#ffd24a", 0.9);
      t.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0);
      t.rotation.z = a - Math.PI / 2;
      t.scale.set(0.06, 0.12, 1);
      this.ticks.add(t);
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
    const h = this.h;
    for (const key of Object.keys(this.cur) as (keyof typeof this.cur)[]) this.cur[key] += (this.goal[key] - this.cur[key]) * k;
    const c = this.cur;
    const bob = Math.sin(t * 1.6) * 0.02;
    const fx = this.fx, fk = fx.k;
    // 刃（演出时即使没装备也亮起，挥动和词牌绑在一起）
    const cb = Math.max(c.blade, fx.kind === "atk" ? fk : 0), cs = Math.max(c.shield, fx.kind === "mit" ? fk : 0);
    this.blade.visible = cb > 0.02;
    this.blade.scale.set(0.2 * cb * (1 + 0.7 * fk * (fx.kind === "atk" ? 1 : 0)), this.bladeLen * cb, 1);
    this.blade.position.y = h * 0.28 + (this.bladeLen * cb) / 2 + bob;
    this.blade.rotation.z = -0.12 - (fx.kind === "atk" ? fx.swing * 1.25 : 0);
    (this.blade.material as THREE.MeshBasicMaterial).opacity = 0.8 + 0.2 * (fx.kind === "atk" ? fk : 0);
    this.bladeNum.visible = this.blade.visible;
    this.bladeNum.position.set(this.blade.position.x + 0.02, this.blade.position.y + (this.bladeLen * c.blade) / 2 + 0.12, 0);
    (this.bladeNum.material as THREE.MeshBasicMaterial).opacity = cb;
    // 盾（首挡关键词再加一层环）
    this.shield.visible = cs > 0.02;
    const ss = this.shieldSize * cs * (1 + 0.55 * (fx.kind === "mit" ? fk : 0));
    this.shield.scale.setScalar(ss);
    this.shield.position.y = h * 0.42 + bob;
    this.shield.rotation.z = Math.sin(t * 0.8) * 0.04;
    this.shieldRing.visible = this.shield.visible;
    this.shieldRing.scale.setScalar(ss * 1.18 + Math.sin(t * 3) * 0.01);
    this.shieldRing.position.copy(this.shield.position);
    this.shieldRing.rotation.z = t * 0.4;
    this.shieldNum.visible = this.shield.visible;
    this.shieldNum.position.set(this.shield.position.x, this.shield.position.y - ss * 0.62 - 0.08, 0);
    (this.shieldNum.material as THREE.MeshBasicMaterial).opacity = cs;
    // 光环
    this.halo.visible = c.halo > 0.02;
    this.halo.rotation.z = 0;
    this.halo.scale.set(0.8 * c.halo, 0.28 * c.halo, 1);
    this.ticks.rotation.z = t * 0.5;
    // 血债量管
    const g = this.gauge.material as THREE.MeshBasicMaterial;
    g.opacity = 0.8 * c.gauge;
    this.gauge.visible = c.gauge > 0.02;
    const gf = this.gaugeFill.material as THREE.MeshBasicMaterial;
    const frac = Math.min(1, this.ld.blood / Math.max(1, this.ld.bloodRoom));
    gf.opacity = 0.75 * c.gauge;
    this.gaugeFill.visible = this.gauge.visible;
    this.gaugeFill.scale.set(0.12, 0.58 * frac + 0.001, 1);
    this.gaugeFill.position.y = this.gauge.position.y - 0.29 + 0.29 * frac;
    // 胸口核心（不屈）、肩甲（首挡）
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
    // 模块 / 状态环绕
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

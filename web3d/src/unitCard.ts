// 一个战斗单位 = 平放在桌上的一块玻璃卡 + 从卡里竖直投射出来的人物全息像。
// 载板：金手指、边距上立着的晶体管 / 电容 / 芯片。
// 玻璃卡：中间是投影环（人物脚下），下沿是信息栏（编号、名字、血量）和 LED 血条。
// 人物：竖直立在投影环上的立绘（轻度屏幕效果），身后一道阵营色的光柱。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C, STYLE } from "./theme";
import { buildMechBase, hudPanelTexture, type MechBase } from "./scene/mech";
import { cardCircuitTexture, plateTexture, warnTexture } from "./textures";
import { circuitMaterial, portraitMaterial } from "./shaders";
import { Armor, type Loadout } from "./armor";

export type Side = "b" | "r";

export interface UnitSpec {
  id: string;
  art: string;         // public/portraits/<art>.png
  flip?: boolean;      // 镜像（同一张图给两边用时区分一下）
  name: string;
  side: Side;
  hp: number;
  max: number;
  incoming?: number;   // 本轮已宣告、将要挨的伤害
}

export const CARD = { w: 2.2, d: 1.75, t: 0.12 };
const CARRIER = STYLE === "neo" ? { w: 2.9, d: 2.15, t: 0.06 } : { w: 2.62, d: 2.05, t: 0.06 };
export const FIG = { h: 2.3 };                 // 人物全息像的高度
export const EMIT = { z: -0.18, r: 0.62 };     // 投影环的位置和半径
const SEG_HP = 2;
const TOP = CARRIER.t + CARD.t;

const loader = new THREE.TextureLoader();
const geoPlane = new THREE.PlaneGeometry(1, 1);
const matPcb = new THREE.MeshPhysicalMaterial({ color: 0x063a32, metalness: 0.3, roughness: 0.42, clearcoat: 0.8 });
const matGold = new THREE.MeshStandardMaterial({ color: C.copper, metalness: 1, roughness: 0.25 });
const matSilver = new THREE.MeshStandardMaterial({ color: C.silver, metalness: 1, roughness: 0.25 });
const matEpoxy = new THREE.MeshPhysicalMaterial({ color: 0x0b1614, roughness: 0.25, clearcoat: 1 });
const matCap = new THREE.MeshPhysicalMaterial({ color: 0x0f7f6c, roughness: 0.3, clearcoat: 1 });

function flat(mesh: THREE.Mesh, y: number) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

function transistor() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 20, 1, false, 0, Math.PI), matEpoxy);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.15), matEpoxy);
  face.rotation.y = Math.PI / 2;
  body.add(face);
  body.position.y = 0.13;
  g.add(body);
  for (let i = -1; i <= 1; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 6), matSilver);
    leg.position.set(0, 0.03, i * 0.035);
    g.add(leg);
  }
  return g;
}

function capacitor(h: number) {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, h, 20), matCap);
  can.position.y = h / 2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.012, 20), matSilver);
  top.position.y = h + 0.006;
  g.add(can, top);
  return g;
}

function chip(size: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(size, 0.035, size), matEpoxy);
  body.position.y = 0.018;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const o = -size / 2 + (size / 5) * (i + 1);
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.012), matGold);
      p.position.set(sx * (size / 2 + 0.012), 0.004, o);
      g.add(p);
    }
  }
  return g;
}

/** 投影环贴图：同心圆 + 刻度，透明底。 */
function emitterTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.translate(256, 256);
  x.strokeStyle = "#ffffff";
  x.lineWidth = 6;
  x.beginPath(); x.arc(0, 0, 240, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2;
  x.beginPath(); x.arc(0, 0, 200, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(0, 0, 120, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r0 = i % 4 === 0 ? 205 : 220;
    x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * 236, Math.sin(a) * 236); x.stroke();
  }
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 200);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.beginPath(); x.arc(0, 0, 200, 0, Math.PI * 2); x.fill();
  return new THREE.CanvasTexture(c);
}
const EMIT_TEX = emitterTexture();

/** 光柱：自下而上渐隐的竖直圆台，只有侧面。 */
function beamMaterial(color: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uAmp: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uAmp; varying vec2 vUv;
      void main(){
        float fade = pow(1.0 - vUv.y, 2.2);
        float lines = 0.75 + 0.25 * sin(vUv.y * 60.0 - uTime * 4.0);
        gl_FragColor = vec4(uColor * 1.2, fade * lines * 0.22 * uAmp);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
  });
}

export class UnitCard {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly figure = new THREE.Group();     // 人物全息像（脚踩投影环）
  readonly bill = new THREE.Group();       // 立绘本身：始终正对镜头（平视，不被俯视压扁）
  readonly hitTargets: THREE.Mesh[] = [];
  private pMat: THREE.ShaderMaterial;
  private circuit: THREE.ShaderMaterial;
  private beam: THREE.ShaderMaterial;
  private emitMat: THREE.MeshBasicMaterial;
  private glassMat: THREE.MeshPhysicalMaterial;
  private frameMat: THREE.MeshBasicMaterial;
  private plate: THREE.Mesh;
  private mech: MechBase | null = null;
  private ledMats: THREE.MeshStandardMaterial[] = [];
  private warn: THREE.Sprite;
  private outline: THREE.MeshBasicMaterial;
  private hover = 0;
  private hoverTarget = 0;
  private selected = false;
  private glitch = 0;
  private ko = 0;
  private koTarget = 0;
  private fxOn = true;
  private distortSaved = 0.4;
  private greenSaved = 0.15;
  readonly armor = new Armor(FIG.h);
  spec: UnitSpec;

  constructor(spec: UnitSpec, seed: number) {
    this.spec = { ...spec };
    const sideCol = C.side[spec.side];
    this.root.add(this.body);

    if (STYLE === "neo") {
      // ---- 义体底座（攻壳机动队式机械质感）----
      this.mech = buildMechBase(CARRIER.w, CARRIER.d, CARRIER.t, CARD.w, sideCol, seed);
      this.body.add(this.mech.group);
    } else {
      // ---- PCB 载板 ----
      const carrier = new THREE.Mesh(new RoundedBoxGeometry(CARRIER.w, CARRIER.t, CARRIER.d, 2, 0.03), matPcb);
      carrier.position.y = CARRIER.t / 2;
      this.body.add(carrier);
      for (let i = 0; i < 16; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.006, 0.13), matGold);
        f.position.set(-0.9 + i * 0.12, CARRIER.t + 0.003, CARRIER.d / 2 - 0.08);
        this.body.add(f);
      }
      const mx = (CARD.w + CARRIER.w) / 4;
      for (let i = 0; i < 3; i++) {
        const tr = transistor();
        tr.position.set(-mx, CARRIER.t, -0.7 + i * 0.2);
        this.body.add(tr);
      }
      const c1 = capacitor(0.2), c2 = capacitor(0.14);
      c1.position.set(mx, CARRIER.t, -0.7);
      c2.position.set(mx, CARRIER.t, -0.47);
      const ic = chip(0.15);
      ic.position.set(mx, CARRIER.t, -0.15);
      this.body.add(c1, c2, ic);

    }

    // ---- 信息栏（玻璃下面）----
    this.plate = flat(new THREE.Mesh(geoPlane, new THREE.MeshBasicMaterial({ toneMapped: false })), CARRIER.t + 0.02);
    const pw = CARD.w - 0.2;
    this.plate.scale.set(pw, pw / 4, 1);
    this.plate.position.z = CARD.d / 2 - 0.08 - pw / 8;
    this.plate.renderOrder = 2;
    this.body.add(this.plate);

    // ---- 玻璃 ----
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: C.glass, transparent: true, opacity: 0.14, roughness: 0.06, metalness: 0,
      clearcoat: 0.35, clearcoatRoughness: 0.12, iridescence: 0.25, iridescenceIOR: 1.35,
      envMapIntensity: 0.2, depthWrite: false,
    });
    const glass = new THREE.Mesh(new RoundedBoxGeometry(CARD.w, CARD.t, CARD.d, 3, 0.05), this.glassMat);
    glass.position.y = CARRIER.t + CARD.t / 2;
    glass.renderOrder = 3;
    glass.userData.card = this;
    this.hitTargets.push(glass);
    this.body.add(glass);

    // 玻璃表面走线光，避开投影环
    const u = 512 / CARD.w, v = 768 / CARD.d;
    const er = EMIT.r + 0.08;
    const clear: [number, number, number, number] = [(CARD.w / 2 - er) * u, (CARD.d / 2 + EMIT.z - er) * v, er * 2 * u, er * 2 * v];
    this.circuit = circuitMaterial(STYLE === "neo" ? hudPanelTexture(seed * 13 + 3, clear) : cardCircuitTexture(seed * 13 + 3, clear), sideCol, 0.06, 0.35);
    const circ = flat(new THREE.Mesh(geoPlane, this.circuit), TOP + 0.002);
    circ.scale.set(CARD.w - 0.06, CARD.d - 0.06, 1);
    circ.renderOrder = 4;
    this.body.add(circ);

    // 投影环
    this.emitMat = new THREE.MeshBasicMaterial({ map: EMIT_TEX, color: sideCol, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const emit = flat(new THREE.Mesh(geoPlane, this.emitMat), TOP + 0.004);
    emit.scale.setScalar(EMIT.r * 2);
    emit.position.z = EMIT.z;
    emit.renderOrder = 5;
    this.body.add(emit);

    // 阵营色角标：卡的四角
    this.frameMat = new THREE.MeshBasicMaterial({ color: sideCol, toneMapped: false });
    const L = 0.3, T = 0.026, hw = CARD.w / 2 - 0.06, hd = CARD.d / 2 - 0.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(L, 0.008, T), this.frameMat);
      a.position.set(sx * (hw - L / 2), TOP + 0.005, sz * hd);
      const b = new THREE.Mesh(new THREE.BoxGeometry(T, 0.008, L), this.frameMat);
      b.position.set(sx * hw, TOP + 0.005, sz * (hd - L / 2));
      this.body.add(a, b);
    }

    // LED 血条：信息栏上方一排。绿 = 挨完这一轮还剩的血，
    // 橙黄闪烁 = 这一轮将要掉的血，暗 = 已经没了的
    const n = Math.ceil(spec.max / SEG_HP);
    const span = CARD.w - 0.3, gap = 0.014;
    const sw = (span - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const m = new THREE.MeshStandardMaterial({ color: 0x0a1f1b, emissive: C.hp, emissiveIntensity: 0, roughness: 0.4 });
      const led = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.03, 0.07), m);
      led.position.set(-span / 2 + sw / 2 + i * (sw + gap), TOP + 0.015, this.plate.position.z - pw / 8 - 0.07);
      this.body.add(led);
      this.ledMats.push(m);
    }

    // ---- 人物全息像：竖直立在投影环上 ----
    this.figure.position.set(0, TOP, EMIT.z);
    this.body.add(this.figure);
    this.beam = beamMaterial(sideCol);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(EMIT.r * 0.95, EMIT.r * 0.8, FIG.h * 0.9, 32, 1, true), this.beam);
    beam.position.y = (FIG.h * 0.9) / 2;
    beam.renderOrder = 6;
    this.figure.add(beam);

    const map = loader.load(`${import.meta.env.BASE_URL}portraits/${spec.art}.png`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    this.pMat = portraitMaterial(map, seed);
    this.pMat.uniforms.uFade.value = 0.03;
    if (spec.flip) this.pMat.uniforms.uRect.value.set(1, 0, -1, 1);
    const art = new THREE.Mesh(geoPlane, this.pMat);
    art.scale.set(FIG.h * (832 / 1216), FIG.h, 1);
    art.position.y = FIG.h / 2;
    art.renderOrder = 7;
    art.userData.card = this;
    this.hitTargets.push(art);
    this.bill.add(art);
    this.bill.add(this.armor.root);
    this.figure.add(this.bill);

    // 头顶预警牌
    this.warn = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    this.warn.scale.set(1.15, 0.29, 1);
    this.warn.position.set(0, FIG.h + 0.25, 0);
    this.warn.renderOrder = 10;
    this.bill.add(this.warn);

    // 选中描边
    this.outline = new THREE.MeshBasicMaterial({ color: C.hud, transparent: true, opacity: 0, toneMapped: false });
    const ow = CARRIER.w + 0.16, od = CARRIER.d + 0.16;
    for (const [w, d, x, z] of [[ow, 0.03, 0, -od / 2], [ow, 0.03, 0, od / 2], [0.03, od, -ow / 2, 0], [0.03, od, ow / 2, 0]]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), this.outline);
      e.position.set(x, 0.006, z);
      this.root.add(e);
    }


    this.refreshHp();
  }

  /** 装备的词在立绘周围长出的半透明外壳（立绘本身不变）。 */
  setLoadout(l: Loadout) { this.armor.set(l); }
  /** 剧情关卡：换名字、换立绘（占位图）、不上场的随从整张卡隐藏。 */
  setName(name: string) { if (this.spec.name !== name) { this.spec.name = name; this.refreshHp(); } }
  setArt(art: string, flip = false) {
    if (this.spec.art === art && !!this.spec.flip === flip) return;
    this.spec.art = art; this.spec.flip = flip;
    const map = loader.load(`${import.meta.env.BASE_URL}portraits/${art}.png`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    this.pMat.uniforms.map.value = map;
    this.pMat.uniforms.uRect.value.set(...(flip ? [1, 0, -1, 1] : [0, 0, 1, 1]) as [number, number, number, number]);
  }
  setActive(on: boolean) { this.root.visible = on; }
  setSelected(v: boolean) { this.selected = v; }
  setHover(v: boolean) { this.hoverTarget = v ? 1 : 0; }
  setDistort(v: number) { this.distortSaved = v; if (this.fxOn) this.pMat.uniforms.uDistort.value = v; }
  setGreen(v: number) { this.greenSaved = v; if (this.fxOn) this.pMat.uniforms.uMix.value = v; }
  /** 一键开关屏幕效果：关掉时失真、绿色、受击撕裂全部归零，立绘按原图显示。 */
  setScreenFx(on: boolean) {
    this.fxOn = on;
    this.pMat.uniforms.uDistort.value = on ? this.distortSaved : 0;
    this.pMat.uniforms.uMix.value = on ? this.greenSaved : 0;
  }

  hit(dmg: number) {
    this.glitch = 1.3;
    this.spec.hp = Math.max(0, this.spec.hp - dmg);
    this.spec.incoming = 0;
    if (this.spec.hp <= 0) this.koTarget = 1;
    this.refreshHp();
  }

  /** 引擎算出的血量直接同步到卡上（不播受击）。 */
  syncHp(hp: number, max: number) {
    const changed = this.spec.hp !== hp || this.spec.max !== max;
    this.spec.hp = hp; this.spec.max = max; this.spec.incoming = 0;
    this.koTarget = hp <= 0 ? 1 : 0;
    if (changed) this.refreshHp();
  }

  reset(spec: UnitSpec) {
    this.spec = { ...spec };
    this.koTarget = 0;
    this.ko = 0;
    this.refreshHp();
  }

  private refreshHp() {
    const { hp, max, incoming = 0, name, side } = this.spec;
    const after = hp - incoming;
    this.ledMats.forEach((m, i) => {
      const lo = i * SEG_HP;
      m.userData.state = lo >= hp ? "off" : incoming && lo >= Math.max(after, 0) ? "hit" : "on";
      m.emissive.setHex(m.userData.state === "hit" ? C.incoming : C.hp);
    });
    const pm = this.plate.material as THREE.MeshBasicMaterial;
    pm.map?.dispose();
    pm.map = plateTexture(name, side, hp, max, incoming);
    pm.needsUpdate = true;
    const wm = this.warn.material;
    wm.map?.dispose();
    wm.map = incoming ? warnTexture(after <= 0 ? "✕ 击倒" : `−${incoming} → ${after}`, after <= 0) : null;
    wm.opacity = 0; // 预告改由屏幕上的血量条显示
    wm.needsUpdate = true;
  }

  update(t: number, dt: number, cam: THREE.Camera) {
    const k = 1 - Math.exp(-dt * 10);
    this.hover += (this.hoverTarget - this.hover) * k;
    this.ko += (this.koTarget - this.ko) * (1 - Math.exp(-dt * 3));
    this.glitch = Math.max(0, this.glitch - dt * 1.5);

    this.body.position.y = (this.selected ? 0.08 : 0) + this.hover * 0.08;
    // 人物：竖直，只绕竖轴转向镜头；被击倒时像全息影像一样塌回卡里
    const wp = this.figure.getWorldPosition(new THREE.Vector3());
    // 立绘和镜头同朝向：屏幕上永远是原图比例，透视由立绘自己画
    this.bill.quaternion.copy(cam.quaternion);
    this.bill.scale.set(1 + this.ko * 0.15, Math.max(0.02, 1 - this.ko) * (1 + Math.sin(t * 1.4 + wp.x) * 0.006), 1);
    this.figure.position.y = TOP + 0.02 + Math.sin(t * 1.2 + wp.x) * 0.015;

    this.armor.update(t, dt);
    this.pMat.uniforms.uTime.value = t;
    this.pMat.uniforms.uGlitch.value = this.fxOn ? this.glitch + this.ko * 0.6 : 0;
    this.pMat.uniforms.uOpacity.value = 1 - this.ko * 0.6;
    this.beam.uniforms.uTime.value = t;
    this.beam.uniforms.uAmp.value = (0.75 + this.hover * 0.35 + this.glitch * 0.6) * (1 - this.ko);
    this.emitMat.opacity = (0.38 + 0.06 * Math.sin(t * 2.5) + this.hover * 0.15) * (1 - this.ko * 0.7);
    this.circuit.uniforms.uTime.value = t;
    this.mech?.update(t);
    this.circuit.uniforms.uPulse.value = 0.35 * (1 - this.ko) + this.glitch * 0.6;
    this.glassMat.opacity = 0.14 + this.ko * 0.4;
    this.glassMat.color.setHex(this.ko > 0.5 ? 0x2a3533 : C.glass);
    this.frameMat.color.setHex(this.ko > 0.5 ? 0x2c3d3a : C.side[this.spec.side]);

    // 掉血格：亮暗对比大，节奏放慢到约 0.7 次/秒
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(t * 4.4), 2);
    for (const m of this.ledMats) {
      const s = m.userData.state;
      m.emissiveIntensity = s === "on" ? 1.2 : s === "hit" ? 0.08 + 1.9 * pulse : 0;
    }
    this.outline.opacity += ((this.selected ? 0.5 : this.hover * 0.2) - this.outline.opacity) * k;
    this.warn.position.y = FIG.h + 0.25 + Math.sin(t * 2.2) * 0.04;
  }
}

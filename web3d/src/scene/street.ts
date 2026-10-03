// 对战背景：一条雨夜的赛博朋克街道。镜头在街的一端，两队人站在街面上；
// 两侧是高楼（窗灯、霓虹招牌、广告牌），地面是湿的街面（镜像倒影），尽头是空的——只有雾和一点光晕。
// 全部程序化生成，不依赖外部图片。所有对局模式共用这一个模块。
import * as THREE from "three";
import { FONT_CN, FONT_NUM } from "../theme";

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
function ctex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 统一的霓虹色板：冷青为主，洋红与琥珀只作点缀
export const NEON = { cyan: "#3d80ff", ice: "#b4ccff", magenta: "#ff3f8e", amber: "#ffb347", violet: "#8a6bff" };
const HORIZON = 0x2a2150;

const ROAD_W = 16;          // 车行道 + 人行道总宽
const FACE_X = 8;        // 楼的内立面
const Z_NEAR = 34, Z_FAR = -110;

/** 楼立面：规整窗格（成行成列，冷光/暖光/熄灭）+ 楼层线 + 立柱 + 材质明暗变化。贴图一块 = 6 列 x 4 层。 */
function facadeTextures(seed: number, palette: string[]): [THREE.Texture, THREE.Texture] {
  const W = 512, H = 512, cols = 6, floors = 4, cw = W / cols, fh = H / floors;
  const [c, x] = cv(W, H);
  const [e, ex] = cv(W, H);
  const r = rng(seed);
  x.fillStyle = "#2c3858"; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,10"},${0.03 + r() * 0.06})`;
    x.fillRect(r() * W, r() * H, 30 + r() * 120, 20 + r() * 90);
  }
  ex.fillStyle = "#000"; ex.fillRect(0, 0, W, H);
  const warm = ["#ffb347", "#ff8a4c", "#ffd27a"], cool = [palette[0], palette[1], palette[2]];
  for (let j = 0; j < floors; j++) {
    const y0 = j * fh;
    x.fillStyle = "#4a5a84"; x.fillRect(0, y0, W, 5);
    x.fillStyle = "#151c30"; x.fillRect(0, y0 + 5, W, 3);
    const mood = r();
    for (let i = 0; i < cols; i++) {
      const px = i * cw + 10, py = y0 + 22, w = cw - 20, h = fh - 38;
      x.fillStyle = "#070b16"; x.fillRect(px - 3, py - 3, w + 6, h + 6);
      const roll = r();
      const state = roll < 0.45 ? "off" : (mood < 0.4 ? (roll < 0.8 ? "warm" : "cool") : (roll < 0.8 ? "cool" : "warm"));
      x.fillStyle = "#0c1426"; x.fillRect(px, py, w, h);
      if (state !== "off") {
        const col = (state === "warm" ? warm : cool)[Math.floor(r() * 3)];
        ex.globalAlpha = 0.55 + r() * 0.45; ex.fillStyle = col; ex.fillRect(px, py, w, h); ex.globalAlpha = 1;
        ex.fillStyle = "rgba(0,0,0,0.35)";
        if (r() < 0.6) ex.fillRect(px + r() * w * 0.5, py, w * (0.15 + r() * 0.2), h);
        else ex.fillRect(px, py + h * 0.6, w, h * 0.4);
      }
      x.fillStyle = "#070b16"; x.fillRect(px + w / 2 - 1, py, 2, h);
      ex.fillStyle = "#000"; ex.fillRect(px + w / 2 - 1, py, 2, h);
      x.fillStyle = "#566695"; x.fillRect(px - 4, py + h + 3, w + 8, 4);
    }
  }
  for (let i = 0; i <= cols; i++) { x.fillStyle = "#3d4b73"; x.fillRect(i * cw - 3, 0, 6, H); x.fillStyle = "#59699a"; x.fillRect(i * cw - 3, 0, 1, H); }
  const t1 = ctex(c), t2 = ctex(e);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return [t1, t2];
}

/** 霓虹灯管招牌：暗底板 + 双层发光描边的字（灯管效果）+ 外框灯管。 */
function signTexture(text: string, color: string, vertical: boolean, w: number, h: number, frame = true) {
  const [c, x] = cv(w, h);
  x.fillStyle = "rgba(6,8,18,0.9)"; x.fillRect(0, 0, w, h);
  const tube = (draw: () => void) => {
    x.lineJoin = "round";
    x.shadowColor = color; x.shadowBlur = 22; x.strokeStyle = color; x.lineWidth = 7; draw();
    x.shadowBlur = 8; x.strokeStyle = "#ffffff"; x.lineWidth = 2.2; x.globalAlpha = 0.9; draw(); x.globalAlpha = 1;
    x.shadowBlur = 0;
  };
  if (frame) tube(() => { x.strokeRect(10, 10, w - 20, h - 20); });
  x.textAlign = "center"; x.textBaseline = "middle";
  if (vertical) {
    const chars = [...text], fs = Math.min(w * 0.6, (h - 50) / chars.length);
    x.font = `700 ${fs}px ${FONT_CN}`;
    chars.forEach((ch, i) => tube(() => x.strokeText(ch, w / 2, 28 + fs * (i + 0.5))));
  } else {
    const ascii = /^[\u0000-]+$/.test(text);
    const fs = Math.min(h * 0.58, (w - 50) / Math.max(1, [...text].length) * (ascii ? 1.7 : 1));
    x.font = `700 ${fs}px ${ascii ? FONT_NUM : FONT_CN}`;
    tube(() => x.strokeText(text, w / 2, h / 2 + 2));
  }
  return ctex(c);
}

/** 广告牌：渐变色块 + 几何图案 + 一行字，抽象的、不含任何现实品牌。 */
function billboardTexture(seed: number, text: string, a: string, b: string) {
  const W = 512, H = 256;
  const [c, x] = cv(W, H);
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, a); g.addColorStop(1, b);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = rng(seed);
  x.globalAlpha = 0.25;
  x.fillStyle = "#fff";
  for (let i = 0; i < 6; i++) {
    x.beginPath(); x.arc(r() * W, r() * H, 20 + r() * 80, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 0.18;
  for (let i = 0; i < 14; i++) x.fillRect(i * 40 + (r() * 10), 0, 6, H);
  x.globalAlpha = 1;
  x.fillStyle = "rgba(4,6,14,0.55)"; x.fillRect(0, H * 0.58, W, H * 0.3);
  x.fillStyle = "#fff"; x.font = `700 70px ${FONT_CN}`; x.textAlign = "center"; x.textBaseline = "middle";
  x.shadowColor = "#fff"; x.shadowBlur = 12;
  x.fillText(text, W / 2, H * 0.73);
  x.fillStyle = "rgba(4,6,14,0.92)";
  x.fillRect(0, 0, W, 6); x.fillRect(0, H - 6, W, 6);
  return ctex(c);
}

function roadTextures(): { map: THREE.Texture; alpha: THREE.Texture; rough: THREE.Texture } {
  const W = 512, H = 1024;
  const [c, x] = cv(W, H);
  const [a, ax] = cv(W, H);
  const [ro, rx] = cv(W, H);
  const r = rng(77);
  x.fillStyle = "#1a2340"; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${r() < 0.5 ? "70,90,140" : "10,14,30"},${0.1 + r() * 0.12})`; x.fillRect(r() * W, r() * H, 40 + r() * 160, 30 + r() * 140); }
  // 沥青颗粒
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${40 + r() * 40},${50 + r() * 40},${70 + r() * 50},${0.05 + r() * 0.08})`;
    x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  // 车道线（淡淡的）：中央虚线 + 两侧实线，加一段斑马线
  x.fillStyle = "rgba(190,205,230,0.30)";
  for (let y = 0; y < H; y += 128) x.fillRect(W / 2 - 3, y + 20, 6, 70);
  x.fillRect(W * 0.14 - 2, 0, 4, H); x.fillRect(W * 0.86 - 2, 0, 4, H);
  x.fillStyle = "rgba(215,225,245,0.55)";
  for (let i = 0; i < 11; i++) x.fillRect(W * 0.16 + i * (W * 0.68 / 11), 700, W * 0.68 / 22, 110);
  x.fillRect(W * 0.14, 660, W * 0.72, 8);
  for (const [mx, my] of [[0.3, 300], [0.68, 520], [0.45, 930]]) {
    x.fillStyle = "#0a0e1a"; x.beginPath(); x.arc(W * mx, my, 16, 0, 7); x.fill();
    x.strokeStyle = "#4a5a84"; x.lineWidth = 2; x.stroke();
    x.beginPath(); x.moveTo(W * mx - 12, my); x.lineTo(W * mx + 12, my); x.moveTo(W * mx, my - 12); x.lineTo(W * mx, my + 12); x.stroke();
  }
  // 人行道（两侧）略亮一点，带砖缝
  const sw = W * 0.1;
  for (const sx of [0, W - sw]) {
    x.fillStyle = "#26304e"; x.fillRect(sx, 0, sw, H);
    x.fillStyle = "#5a6a98"; x.fillRect(sx === 0 ? sw - 4 : 0, 0, 4, H);
    x.fillStyle = "rgba(0,0,0,0.5)";
    for (let y = 0; y < H; y += 32) x.fillRect(sx, y, sw, 2);
  }
  // 积水：湿面压暗、可见的水渍
  ax.fillStyle = "#6a6a6a"; ax.fillRect(0, 0, W, H);
  rx.fillStyle = "#555"; rx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const px = r() * W, py = r() * H, rw = 30 + r() * 110, rh = 14 + r() * 50;
    for (const [ctx, col] of [[ax, "rgba(255,255,255,0.55)"], [rx, "rgba(0,0,0,0.9)"]] as const) {
      const gr = ctx.createRadialGradient(px, py, 0, px, py, rw);
      gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save(); ctx.translate(px, py); ctx.scale(1, rh / rw); ctx.translate(-px, -py);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, rw, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  const m = ctex(c), al = ctex(a, false), rg = ctex(ro, false);
  for (const t of [m, al, rg]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 5); }
  return { map: m, alpha: al, rough: rg };
}

function glowTexture(inner = "255,255,255", size = 256) {
  const [c, x] = cv(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${inner},1)`);
  g.addColorStop(0.35, `rgba(${inner},0.35)`);
  g.addColorStop(1, `rgba(${inner},0)`);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return ctex(c);
}

function skyTexture() {
  const [c, x] = cv(4, 512);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#03050c");
  g.addColorStop(0.45, "#0a1226");
  g.addColorStop(0.7, "#2a2150");
  g.addColorStop(1, "#6a2f66");
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  return ctex(c);
}

export class Street {
  readonly root = new THREE.Group();
  readonly fogColor = new THREE.Color(HORIZON);
  private rain!: THREE.LineSegments;
  private rainMat!: THREE.ShaderMaterial;
  private haze: THREE.Mesh[] = [];
  private blinkers: { mat: THREE.MeshBasicMaterial; phase: number; rate: number }[] = [];
  private shafts: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    scene.background = skyTexture();
    const world = new THREE.Group();            // 会被镜像出倒影的部分：楼、招牌
    this.root.add(world);

    this.buildBuildings(world);
    this.buildSigns(world);

    // 倒影：整组镜像到地面以下，街面半透明盖在上面
    const mirror = world.clone(true);
    mirror.scale.y = -1;
    this.root.add(mirror);

    this.buildRoad();
    this.buildFurniture();
    this.buildOverhead();
    this.buildAtmosphere();
    this.buildRain();

    // 灯光：冷色天光 + 一盏暖色侧光，让义体底座和人物有明暗
    scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x2a2048, 1.0));
    const key = new THREE.DirectionalLight(0xcfe4ff, 1.2);
    key.position.set(-6, 12, 9);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff5f9a, 0.45);   // 洋红霓虹的边缘光
    rim.position.set(7, 5, -8);
    scene.add(rim);
    scene.add(this.root);
  }

  // ------------------------------------------------------------------ 楼
  private buildBuildings(parent: THREE.Group) {
    const palettes = [
      [NEON.ice, NEON.cyan, NEON.cyan, NEON.cyan],
      [NEON.amber, NEON.amber, NEON.amber, NEON.ice],
      [NEON.magenta, NEON.violet, NEON.magenta, NEON.ice],
      [NEON.cyan, NEON.magenta, NEON.ice, NEON.magenta],
      ["#5a8cff", "#3d80ff", "#5a8cff", NEON.ice],
      [NEON.violet, NEON.cyan, NEON.violet, NEON.magenta],
    ];
    const tints = [0xc4d4ff, 0xffe2c4, 0xe6c8ff, 0xffd0e4, 0xc4d0ff, 0xd0d4ff];
    const mats = palettes.map((p, i) => {
      const [map, emi] = facadeTextures(10 + i * 7, p as string[]);
      return new THREE.MeshStandardMaterial({
        map, emissiveMap: emi, emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.5,
        roughness: 0.6, metalness: 0.35, color: tints[i],
      });
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a3556, roughness: 0.6, metalness: 0.5 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3a4768, roughness: 0.4, metalness: 0.8 });
    const stripCols = [NEON.cyan, NEON.magenta, NEON.amber, NEON.violet];
    const r = rng(2024);
    const textured = (w: number, h: number, d: number, mat: THREE.Material) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      // 沿街的两面（±x）横向铺 d，竖向铺 h；前后面铺 w
      const n = geo.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        const side = Math.abs(n.getX(i)) > 0.5;
        const su = Math.max(1, Math.round((side ? d : w) / 8)), sv = Math.max(1, Math.round(h / 10));
        uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      }
      return new THREE.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
    };
    for (const side of [-1, 1]) {
      let z = Z_NEAR;
      while (z > Z_FAR) {
        const d = 9 + r() * 8;                  // 沿街宽度
        const depth = 12;
        const mat = mats[Math.floor(r() * mats.length)];
        const podH = 8 + r() * 6, towH = 28 + r() * 44 + (Z_NEAR - z) * 0.1, crownH = 4 + r() * 10;
        const faceX = FACE_X;
        // 裙楼：贴街，宽
        const pod = textured(depth, podH, d, mat);
        pod.position.set(side * (faceX + depth / 2), podH / 2, z - d / 2);
        parent.add(pod);
        // 塔楼：向后退台，更窄
        const so = 1.2 + r() * 1.4, tw = depth - 2, td = d - 2.2;
        const tow = textured(tw, towH, td, mats[Math.floor(r() * mats.length)]);
        tow.position.set(side * (faceX + so + tw / 2), podH + towH / 2, z - d / 2);
        parent.add(tow);
        // 顶冠
        const cr = textured(tw - 3, crownH, td - 2.5, mat);
        cr.position.set(side * (faceX + so + 1.5 + (tw - 3) / 2), podH + towH + crownH / 2, z - d / 2);
        parent.add(cr);
        const topY = podH + towH + crownH;
        // 塔楼立面上的竖向霓虹灯带 + 管线
        const nStrips = 1 + Math.floor(r() * 3);
        for (let k = 0; k < nStrips; k++) {
          const col = new THREE.Color(stripCols[Math.floor(r() * stripCols.length)]);
          const sh = towH * (0.5 + r() * 0.5);
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, sh, 0.28), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
          strip.position.set(side * (faceX + so - 0.1), podH + sh / 2 + r() * (towH - sh), z - 1.2 - r() * (d - 2.4));
          parent.add(strip);
        }
        for (let k = 0; k < 2; k++) {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, towH * 0.9, 8), pipeMat);
          pipe.position.set(side * (faceX + so - 0.2), podH + towH * 0.45, z - 0.8 - r() * (d - 1.6));
          parent.add(pipe);
        }
        // 裙楼顶沿的横向灯带
        const lip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, d - 0.6), new THREE.MeshBasicMaterial({ color: stripCols[Math.floor(r() * stripCols.length)], toneMapped: false }));
        lip.position.set(side * (faceX - 0.05), podH, z - d / 2);
        parent.add(lip);

        // 凸出物：空调外机、阳台板、管线
        const fx = side * (faceX + so);
        for (let k = 0; k < 7; k++) {
          const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.9), pipeMat);
          ac.position.set(fx - side * 0.35, podH + 2 + r() * (towH - 4), z - 1 - r() * (d - 2));
          parent.add(ac);
          const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), new THREE.MeshBasicMaterial({ color: 0x0a0e18 }));
          fan.position.copy(ac.position); fan.position.x -= side * 0.36; fan.rotation.y = -side * Math.PI / 2;
          parent.add(fan);
        }
        for (let k = 0; k < 4; k++) {
          const bd = d * (0.35 + r() * 0.3);
          const bal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, bd), roofMat);
          bal.position.set(fx - side * 0.5, podH + 3 + k * (towH / 4.4) + r() * 3, z - d / 2);
          parent.add(bal);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, bd), new THREE.MeshBasicMaterial({ color: stripCols[Math.floor(r() * 4)], toneMapped: false }));
          rail.position.copy(bal.position); rail.position.x -= side * 0.48; rail.position.y += 0.5;
          parent.add(rail);
        }
        {
          const pw = 0.22 + r() * 0.1;
          const pipe = new THREE.Mesh(new THREE.BoxGeometry(pw, podH + towH * 0.8, pw), pipeMat);
          pipe.position.set(fx - side * 0.2, (podH + towH * 0.8) / 2, z - 0.5);
          parent.add(pipe);
        }
        // 楼顶天线 + 航空灯
        if (r() < 0.8) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 5 + r() * 8, 5), roofMat);
          ant.position.set(side * (faceX + so + tw / 2), topY + 3, z - d / 2);
          parent.add(ant);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3f4e, toneMapped: false }));
          lamp.position.set(ant.position.x, topY + 3 + 3 + r() * 4, ant.position.z);
          parent.add(lamp);
          this.blinkers.push({ mat: lamp.material as THREE.MeshBasicMaterial, phase: r() * 6, rate: 1.2 + r() });
        }
        z -= d + 0.3;
      }
    }
  }

  // ------------------------------------------------------------------ 招牌
  private buildSigns(parent: THREE.Group) {
    const r = rng(555);
    const words = ["义体", "拉面", "电脑城", "NEON", "诊所", "24H", "酒", "芯片", "旅馆", "RAMEN", "夜市", "维修"];
    const cols = [NEON.cyan, NEON.magenta, NEON.amber, NEON.ice, NEON.cyan, NEON.violet];
    let n = 0;
    for (const side of [-1, 1]) {
      // 竖招牌：从楼壁伸出，成排按街深分布，越近越稀疏
      for (let z = -12; z > -95; z -= 4 + r() * 3.5) {
        const word = words[Math.floor(r() * words.length)], col = cols[Math.floor(r() * cols.length)];
        const vertical = r() < 0.6 && /[一-龥]/.test(word);
        const w = vertical ? 2.2 : 5.6, h = vertical ? 2.2 + word.length * 2.0 : 2.0;
        const tex = signTexture(word, col, vertical, vertical ? 160 : 448, vertical ? 160 + word.length * 150 : 160);
        const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        const y = 6 + r() * 16;
        // 垂直街面方向放置，伸出墙面 1.1 米，面朝街心的斜 20°，镜头一侧可见
        m.position.set(side * (FACE_X - 1.1), y, z);
        parent.add(m);
        // 背面实体 + 吊臂
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a2236, metalness: 0.8, roughness: 0.4 }));
        arm.position.set(side * (FACE_X - 0.4), y + h / 2 - 0.2, z);
        parent.add(arm);
        // 向街心洒的一团光（地面光池）
        n++;
        if (n % 2 === 0) {
          const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({
            map: glowTexture(col === NEON.magenta ? "255,63,142" : col === NEON.amber ? "255,179,71" : "70,130,255"),
            transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
          }));
          glow.rotation.x = -Math.PI / 2;
          glow.position.set(side * 4.2, 0.02, z);
          this.root.add(glow);
        }
        if (r() < 0.3) this.blinkers.push({ mat, phase: r() * 6, rate: 0.6 + r() });
      }
      // 大广告牌：贴在楼壁高处
      for (let i = 0; i < 6; i++) {
        const z = 2 - i * 14 - r() * 4;
        const pal: [string, string][] = [["#ff3f8e", "#5b1f7a"], ["#38c8ff", "#274a9a"], ["#ffb347", "#a8321f"], ["#8a6bff", "#18306e"]];
        const [a, b] = pal[(i + (side > 0 ? 2 : 0)) % pal.length];
        const txt = ["词战", "全息", "夜之城", "重装", "新世代", "漫游"][(i + (side > 0 ? 3 : 0)) % 6];
        const mat = new THREE.MeshBasicMaterial({ map: billboardTexture(i * 3 + side + 9, txt, a, b), toneMapped: false });
        mat.color.setScalar(0.85);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), mat);
        m.position.set(side * (FACE_X - 0.03), 26 + r() * 14, z);
        m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        parent.add(m);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.8, 9.3), new THREE.MeshStandardMaterial({ color: 0x0b1020, metalness: 0.7, roughness: 0.5 }));
        frame.position.set(side * (FACE_X - 0.02), m.position.y, z);
        parent.add(frame);
      }
    }
  }

  // ------------------------------------------------------------------ 街面
  private buildRoad() {
    const { map, alpha, rough } = roadTextures();
    const mat = new THREE.MeshStandardMaterial({
      map, roughness: 0.28, roughnessMap: rough, metalness: 0.15, color: 0xb4c0e0, emissive: 0x0a1330, emissiveIntensity: 1,
      transparent: true, alphaMap: alpha, opacity: 0.94, envMapIntensity: 1.1,
    });
    const g = new THREE.PlaneGeometry(ROAD_W + 2, Z_NEAR - Z_FAR);
    const road = new THREE.Mesh(g, mat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, (Z_NEAR + Z_FAR) / 2);
    road.renderOrder = -5;
    this.root.add(road);
    // 路面以外：楼脚下的黑地，防止漏底
    const under = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x0a1226 }));
    under.rotation.x = -Math.PI / 2;
    under.position.y = -0.08;
    this.root.add(under);
  }

  // ------------------------------------------------------------------ 头顶线缆 / 灯串 / 摊位 / 蒸汽
  private buildOverhead() {
    const r = rng(77);
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.6, metalness: 0.5 });
    const warm = [0xffb347, 0xff6fa5, 0xffd27a];
    for (let z = -5; z > -70; z -= 5 + r() * 4) {
      for (let k = 0; k < 2; k++) {
        const y0 = 10 + r() * 7, sag = 1.2 + r() * 1.4;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 12; i++) {
          const u = i / 12;
          pts.push(new THREE.Vector3(-FACE_X + 0.5 + u * (FACE_X * 2 - 1), y0 - Math.sin(u * Math.PI) * sag, z - k * 0.6 + Math.sin(u * 6) * 0.1));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        this.root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, k ? 0.05 : 0.09, 5, false), dark));
        if (k === 0 && r() < 0.8) {      // 暖色灯串
          for (let i = 1; i < 12; i += 1) {
            const p = curve.getPoint(i / 12);
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: warm[i % 3], toneMapped: false }));
            b.position.copy(p).y -= 0.18;
            this.root.add(b);
          }
        }
      }
    }
    // 摊位 + 蒸汽口
    const steamTex = glowTexture("200,215,235", 128);
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a3552, metalness: 0.7, roughness: 0.5 });
    for (const side of [-1, 1]) {
      for (let z = -27, i = 0; z > -70; z -= 8 + r() * 5, i++) {
        const x = side * (FACE_X - 1.4);
        const col = [0xff5f9a, 0xffb347, 0x3d80ff][(i + (side > 0 ? 1 : 0)) % 3];
        const stall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.6), metal);
        stall.position.set(x, 0.6, z);
        this.root.add(stall);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.9), metal);
        canopy.position.set(x, 2.1, z);
        this.root.add(canopy);
        const word = ["面", "酒", "夜市", "义体", "药", "24H"][(i + (side > 0 ? 2 : 0)) % 6];
        const hex = "#" + new THREE.Color(col).getHexString();
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ map: signTexture(word, hex, false, 256, 100), toneMapped: false }));
        plate.position.set(x, 2.55, z + 0.95);
        this.root.add(plate);
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.06), metal);
        back.position.set(x, 2.55, z + 0.91);
        this.root.add(back);
        for (const dx of [-0.9, 0.9]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), metal);
          post.position.set(x + dx, 1.1, z + 0.8);
          this.root.add(post);
        }
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({
          map: glowTexture(col === 0xff5f9a ? "255,95,154" : col === 0xffb347 ? "255,179,71" : "70,130,255"),
          transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(x - side * 1.5, 0.04, z);
        this.root.add(pool);
        // 蒸汽
        const sx = side * (FACE_X - 3.6), sz = z - 3.5;
        for (let k = 0; k < 3; k++) {
          const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xaab8d8, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }));
          st.position.set(sx, 0.8 + k * 1.1, sz);
          st.scale.setScalar(2.4 + k * 0.6);
          this.root.add(st);
        }
      }
    }
  }

  // ------------------------------------------------------------------ 街边设施
  private buildFurniture() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x1b2438, metalness: 0.85, roughness: 0.4 });
    const r = rng(31);
    for (const side of [-1, 1]) {
      for (let z = -24; z > -100; z -= 11) {
        // 路灯杆 + 冷色灯头
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7, 8), metal);
        pole.position.set(side * (ROAD_W / 2 - 0.4), 3.5, z);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xd4f0ff, toneMapped: false }));
        head.position.set(side * (ROAD_W / 2 - 1.0), 7, z);
        this.root.add(pole, head);
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({
          map: glowTexture("150,205,255"), transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(side * (ROAD_W / 2 - 2.5), 0.03, z);
        this.root.add(pool);
        // 路边垃圾桶/消防栓的体块（只作街景细节）
        if (r() < 0.6) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), metal);
          box.position.set(side * (ROAD_W / 2 - 0.9), 0.45, z - 3 - r() * 3);
          this.root.add(box);
        }
      }
    }
  }

  // ------------------------------------------------------------------ 氛围：雾层、光柱、尽头光晕
  private buildAtmosphere() {
    // 尽头光晕：只是一团淡淡的光，不画任何远景
    const end = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshBasicMaterial({
      map: glowTexture("70,100,255", 512), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    }));
    end.position.set(0, 9, Z_FAR + 4);
    this.root.add(end);
    const rr = rng(404);
    const streakCols = ["255,63,142", "70,130,255", "255,179,71", "138,107,255"];
    for (let i = 0; i < 26; i++) {
      const col = streakCols[i % 4], side = i % 2 ? 1 : -1;
      const sx = side * (1.2 + rr() * (ROAD_W / 2 - 1.8)), sz = -6 - rr() * 70;
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + rr() * 0.9, 5 + rr() * 12), new THREE.MeshBasicMaterial({
        map: glowTexture(col, 128), transparent: true, opacity: 0.32 + rr() * 0.25, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      st.rotation.x = -Math.PI / 2; st.position.set(sx, 0.05, sz);
      this.root.add(st);
    }
    for (const side of [-1, 1]) {
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 140), new THREE.MeshBasicMaterial({ color: side < 0 ? 0x3d80ff : 0xff5f9a, toneMapped: false }));
      ln.position.set(side * (ROAD_W / 2 - 1.6), 0.06, -40);
      this.root.add(ln);
    }
    for (let i = 0; i < 7; i++) {
      const z = -20 - i * 9 - rr() * 4, lx = (rr() < 0.5 ? -1 : 1) * (1.6 + rr() * 3);
      for (const dx of [-0.5, 0.5]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(i % 2 ? "255,236,200" : "255,90,60", 64), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
        sp.position.set(lx + dx, 0.5, z); sp.scale.setScalar(1.3);
        this.root.add(sp);
      }
    }
    const warmEnd = new THREE.Mesh(new THREE.PlaneGeometry(70, 40), new THREE.MeshBasicMaterial({
      map: glowTexture("255,110,150", 512), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    }));
    warmEnd.position.set(0, 6, Z_FAR + 8);
    this.root.add(warmEnd);
    // 雾层：横在街上的大片柔光，用来做景深分层
    const hazeTex = glowTexture("100,130,255", 512);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(46, 40), new THREE.MeshBasicMaterial({
        map: hazeTex, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        color: i % 3 === 1 ? 0xff6aa8 : i % 3 === 2 ? 0xffa060 : 0x5a86ff,
      }));
      m.position.set(0, 8, -8 - i * 14);
      this.root.add(m);
      this.haze.push(m);
    }
    // 体积光柱：从楼顶斜着打到街面的几条
    const shaftMat = (col: number) => new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(col) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
        void main(){ float a = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.5, 1.0 - abs(vUv.x - 0.5) * 2.0);
          gl_FragColor = vec4(uColor, a * 0.22); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const defs: [number, number, number][] = [[-5, -14, 0x4a7aff], [6, -22, 0xff5aa0], [-4, -34, 0xffa060], [5, -48, 0x4a7aff]];
    for (const [x, z, col] of defs) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 34), shaftMat(col));
      s.position.set(x, 15, z);
      s.rotation.z = x < 0 ? -0.22 : 0.22;
      this.root.add(s);
      this.shafts.push(s);
    }
  }

  // ------------------------------------------------------------------ 雨
  private buildRain() {
    const N = 2600, H = 34;
    const pos = new Float32Array(N * 6), ph = new Float32Array(N * 2);
    const r = rng(9);
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * 30, y = r() * H, z = Z_NEAR - r() * 95;
      pos.set([x, y, z, x, y + 0.7, z], i * 6);
      ph[i * 2] = ph[i * 2 + 1] = r() * H;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("ph", new THREE.BufferAttribute(ph, 1));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uFogN: { value: 30 }, uFogF: { value: 70 } },
      vertexShader: `attribute float ph; uniform float uT; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uT * 26.0 + ph * 3.0, ${H}.0); p.x += p.y * 0.08;
          vec4 mv = modelViewMatrix * vec4(p,1.0); vA = smoothstep(6.0, 14.0, -mv.z) * (1.0 - smoothstep(30.0, 80.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.62,0.78,1.0, 0.14 * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.root.add(this.rain);
  }

  update(t: number, camPos?: THREE.Vector3) {
    this.rainMat.uniforms.uT.value = t;
    for (const b of this.blinkers) {
      const on = Math.sin(t * b.rate * 3 + b.phase) > -0.75 ? 1 : 0.25;
      b.mat.color.setScalar(on);
    }
    this.haze.forEach((h, i) => { h.position.x = Math.sin(t * 0.07 + i * 1.7) * 3; });
    this.shafts.forEach((s, i) => { (s.material as THREE.ShaderMaterial).uniforms.uColor.value.multiplyScalar(1); void i; });
    void camPos;
  }
}

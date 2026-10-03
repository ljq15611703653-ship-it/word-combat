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
export const NEON = { cyan: "#38c8ff", ice: "#bfeaff", magenta: "#ff3f8e", amber: "#ffb347", violet: "#8a6bff" };
const HORIZON = 0x16203f;

const ROAD_W = 16.6;          // 车行道 + 人行道总宽
const FACE_X = 8.3;        // 楼的内立面
const Z_NEAR = 34, Z_FAR = -110;

/** 楼立面：暗色板块 + 一格格窗，亮灯的做进自发光贴图。 */
function facadeTextures(seed: number, palette: string[]): [THREE.Texture, THREE.Texture] {
  const W = 256, H = 512, cw = 16, ch = 22;
  const [c, x] = cv(W, H);
  const [e, ex] = cv(W, H);
  const r = rng(seed);
  x.fillStyle = "#0b1020"; x.fillRect(0, 0, W, H);
  ex.fillStyle = "#000"; ex.fillRect(0, 0, W, H);
  // 外墙板缝
  x.fillStyle = "#121a30";
  for (let i = 0; i < H; i += 128) x.fillRect(0, i, W, 3);
  for (let i = 0; i < W; i += 64) { x.fillStyle = "#0e1527"; x.fillRect(i, 0, 2, H); }
  const cols = Math.floor(W / cw), rows = Math.floor(H / ch);
  for (let j = 1; j < rows - 1; j++) {
    // 每层一个主色，层内成片亮灯，比逐格随机更像真的楼
    const rowLit = r() < 0.5;
    const rowCol = palette[Math.floor(r() * palette.length)];
    for (let i = 1; i < cols - 1; i++) {
      const px = i * cw + 2, py = j * ch + 3, w = cw - 5, h = ch - 8;
      x.fillStyle = "#05070f"; x.fillRect(px, py, w, h);
      if (rowLit && r() < 0.5) {
        ex.fillStyle = r() < 0.05 ? palette[Math.floor(r() * palette.length)] : rowCol;
        ex.globalAlpha = 0.35 + r() * 0.65;
        ex.fillRect(px, py, w, h);
        ex.globalAlpha = 1;
      }
    }
  }
  // 空调外机 / 管线（暗处的细节）
  for (let k = 0; k < 10; k++) {
    x.fillStyle = "#1b2440";
    x.fillRect(Math.floor(r() * cols) * cw, Math.floor(r() * rows) * ch + 4, cw * 1.6, 8);
  }
  const t1 = ctex(c), t2 = ctex(e);
  for (const t of [t1, t2]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return [t1, t2];
}

/** 霓虹招牌：深色底板 + 发光字，竖排或横排。 */
function signTexture(text: string, color: string, vertical: boolean, w: number, h: number, frame = true) {
  const [c, x] = cv(w, h);
  x.fillStyle = "rgba(4,6,14,0.92)"; x.fillRect(0, 0, w, h);
  x.shadowColor = color; x.shadowBlur = 18;
  x.strokeStyle = color; x.lineWidth = 5;
  if (frame) x.strokeRect(8, 8, w - 16, h - 16);
  x.fillStyle = color;
  x.textAlign = "center"; x.textBaseline = "middle";
  if (vertical) {
    const chars = [...text], fs = Math.min(w * 0.62, (h - 40) / chars.length);
    x.font = `700 ${fs}px ${FONT_CN}`;
    chars.forEach((ch, i) => x.fillText(ch, w / 2, 24 + fs * (i + 0.5)));
  } else {
    const fs = Math.min(h * 0.6, (w - 40) / Math.max(1, [...text].length) * (/^[\x00-\x7f]+$/.test(text) ? 1.7 : 1));
    x.font = `700 ${fs}px ${/^[\x00-\x7f]+$/.test(text) ? FONT_NUM : FONT_CN}`;
    x.fillText(text, w / 2, h / 2 + 2);
  }
  x.shadowBlur = 0;
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
  x.fillStyle = "#0c111f"; x.fillRect(0, 0, W, H);
  // 沥青颗粒
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${40 + r() * 40},${50 + r() * 40},${70 + r() * 50},${0.05 + r() * 0.08})`;
    x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  // 车道线（淡淡的）：中央虚线 + 两侧实线，加一段斑马线
  x.fillStyle = "rgba(190,205,230,0.30)";
  for (let y = 0; y < H; y += 128) x.fillRect(W / 2 - 3, y + 20, 6, 70);
  x.fillRect(W * 0.14 - 2, 0, 4, H); x.fillRect(W * 0.86 - 2, 0, 4, H);
  // 人行道（两侧）略亮一点，带砖缝
  const sw = W * 0.1;
  for (const sx of [0, W - sw]) {
    x.fillStyle = "#151c30"; x.fillRect(sx, 0, sw, H);
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
  g.addColorStop(0.78, "#16203f");
  g.addColorStop(1, "#1d2b52");
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
    this.buildAtmosphere();
    this.buildRain();

    // 灯光：冷色天光 + 一盏暖色侧光，让义体底座和人物有明暗
    scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x0b0f1e, 0.75));
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
      [NEON.cyan, NEON.ice, NEON.cyan, NEON.cyan, NEON.amber],
      [NEON.ice, NEON.cyan, NEON.cyan, NEON.violet],
      [NEON.cyan, NEON.cyan, NEON.ice, NEON.magenta],
    ];
    const mats = palettes.map((p, i) => {
      const [map, emi] = facadeTextures(10 + i * 7, p);
      return new THREE.MeshStandardMaterial({
        map, emissiveMap: emi, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.85,
        roughness: 0.55, metalness: 0.5,
      });
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.7, metalness: 0.4 });
    const r = rng(2024);
    for (const side of [-1, 1]) {
      let z = Z_NEAR;
      while (z > Z_FAR) {
        const d = 7 + r() * 9;                  // 沿街宽度
        const depth = 8 + r() * 10;             // 进深
        const h = 22 + r() * 46 + (Z_NEAR - z) * 0.12;
        const setback = r() < 0.35 ? r() * 1.8 : 0;
        const cx = side * (FACE_X + setback + depth / 2);
        const mat = mats[Math.floor(r() * mats.length)];
        // 分层退台：越往上越收窄，剪影更像赛博朋克巨构
        const tiers = r() < 0.55 ? 2 : 1;
        let th = h, tw = depth, ty = 0;
        for (let t = 0; t < tiers; t++) {
          const hh = t === 0 ? h * (tiers === 2 ? 0.62 : 1) : th * 0.46;
          const geo = new THREE.BoxGeometry(tw, hh, d - t * 1.2);
          const uv = geo.attributes.uv as THREE.BufferAttribute;
          const su = Math.max(1, Math.round(d / 4.2)), sv = Math.max(1, Math.round(hh / 7));
          for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
          const m = new THREE.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
          m.position.set(cx + (t ? side * (r() * 0.8) : 0), ty + hh / 2, z - d / 2);
          parent.add(m);
          ty += hh; th = hh; tw = tw * 0.78;
        }
        // 楼顶天线
        if (r() < 0.6) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3 + r() * 5, 5), roofMat);
          ant.position.set(cx, ty + 2, z - d / 2);
          parent.add(ant);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3f4e, toneMapped: false }));
          lamp.position.set(cx, ty + 3.5 + r() * 3, z - d / 2);
          parent.add(lamp);
          this.blinkers.push({ mat: lamp.material as THREE.MeshBasicMaterial, phase: r() * 6, rate: 1.2 + r() });
        }
        z -= d + (r() < 0.2 ? 1.5 : 0.2);
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
      for (let z = -30; z > -95; z -= 5 + r() * 5) {
        const word = words[Math.floor(r() * words.length)], col = cols[Math.floor(r() * cols.length)];
        const vertical = r() < 0.6 && /[一-龥]/.test(word);
        const w = vertical ? 1.5 : 4.4, h = vertical ? 1.7 + word.length * 1.5 : 1.5;
        const tex = signTexture(word, col, vertical, vertical ? 128 : 384, vertical ? 128 + word.length * 128 : 128);
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
            map: glowTexture(col === NEON.magenta ? "255,63,142" : col === NEON.amber ? "255,179,71" : "56,200,255"),
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
        const z = -8 - i * 17 - r() * 6;
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
      map, roughness: 0.28, roughnessMap: rough, metalness: 0.15, color: 0x8d97b0,
      transparent: true, alphaMap: alpha, opacity: 0.9, envMapIntensity: 0.6,
    });
    const g = new THREE.PlaneGeometry(ROAD_W + 2, Z_NEAR - Z_FAR);
    const road = new THREE.Mesh(g, mat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, (Z_NEAR + Z_FAR) / 2);
    road.renderOrder = -5;
    this.root.add(road);
    // 路面以外：楼脚下的黑地，防止漏底
    const under = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x03050b }));
    under.rotation.x = -Math.PI / 2;
    under.position.y = -0.08;
    this.root.add(under);
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
      map: glowTexture("90,130,230", 512), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    }));
    end.position.set(0, 9, Z_FAR + 4);
    this.root.add(end);
    // 雾层：横在街上的大片柔光，用来做景深分层
    const hazeTex = glowTexture("120,160,255", 512);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(46, 40), new THREE.MeshBasicMaterial({
        map: hazeTex, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        color: i % 3 === 1 ? 0xff6aa8 : 0x6ab8ff,
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
          gl_FragColor = vec4(uColor, a * 0.10); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    const defs: [number, number, number][] = [[-5, -14, 0x5aa8ff], [6, -30, 0xff5aa0], [-4, -52, 0x5aa8ff]];
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

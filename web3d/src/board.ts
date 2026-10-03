// 桌面：一整块会呼吸的电路板 + 横在两排之间的全息时间轴。
import * as THREE from "three";
import { C } from "./theme";
import { pcbTextures, timelineTexture } from "./textures";

export interface Mark { sec: number; side: "b" | "r"; }

export class Board {
  readonly root = new THREE.Group();
  private pcbMat: THREE.MeshStandardMaterial;
  private markers: THREE.Object3D[] = [];
  readonly width = 11.5;

  constructor(marks: Mark[], lineZ = 0) {
    const [map, emi] = pcbTextures();
    this.pcbMat = new THREE.MeshStandardMaterial({
      map, emissiveMap: emi, emissive: new THREE.Color(C.trace), emissiveIntensity: 0.6,
      roughness: 0.55, metalness: 0.35,
    });
    const pcb = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), this.pcbMat);
    pcb.rotation.x = -Math.PI / 2;
    this.root.add(pcb);

    // 时间轴已移到屏幕顶部（DOM），这里只在传入标记时才画桌面上的全息条
    if (!marks.length) return;
    const tl = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.width / 16),
      new THREE.MeshBasicMaterial({ map: timelineTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    tl.rotation.x = -Math.PI / 2;
    tl.position.set(0, 0.03, lineZ);
    this.root.add(tl);

    // 标记：浮在时间轴上方的菱形 + 一束光柱
    for (const m of marks) {
      const g = new THREE.Group();
      const col = C.side[m.side];
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
      gem.position.y = 0.42;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, toneMapped: false }),
      );
      beam.position.y = 0.2;
      g.add(gem, beam);
      g.position.set(this.secX(m.sec), 0, lineZ + (m.side === "r" ? -0.12 : 0.12));
      this.root.add(g);
      this.markers.push(g);
    }
  }

  secX(sec: number) {
    const inner = this.width * (1 - 80 / 2048);
    return -inner / 2 + (sec / 20) * inner;
  }

  update(t: number) {
    this.pcbMat.emissiveIntensity = 0.45 + 0.2 * Math.sin(t * 0.8);
    this.markers.forEach((m, i) => {
      m.children[0].rotation.y = t * 1.5 + i;
      m.children[0].position.y = 0.42 + Math.sin(t * 2 + i) * 0.04;
    });
  }
}

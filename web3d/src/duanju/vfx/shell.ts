// 盔甲壳：围绕随从的半透明线框穹顶（SVG）。四个职业四种材质：并=蜂窝六边形，引=同心数据环，限=菱格+锁链，状=渗滴的细胞。
const NS = "http://www.w3.org/2000/svg";
const el = (n: string, a: Record<string, string | number> = {}, kids: Element[] = []) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  kids.forEach((c) => e.appendChild(c));
  return e;
};
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export interface ShellOpts { w: number; h: number; style: string; c: string; c2: string }
/** 返回一个 SVG，尺寸 w×h，穹顶椭圆占满整个盒子 */
export function buildShell(o: ShellOpts): SVGSVGElement {
  seed = 11;
  const { w, h, c, c2 } = o;
  const rx = w / 2 - 2, ry = h / 2 - 2, cx = w / 2, cy = h / 2;
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: "vx-shell-svg" }) as SVGSVGElement;
  const id = "vxc" + Math.floor(Math.random() * 1e6);
  svg.appendChild(el("defs", {}, [el("clipPath", { id }, [el("ellipse", { cx, cy, rx, ry })]),
    el("radialGradient", { id: id + "g", cx: "50%", cy: "55%", r: "60%" }, [el("stop", { offset: "55%", "stop-color": c, "stop-opacity": 0 }), el("stop", { offset: "100%", "stop-color": c, "stop-opacity": 0.28 })])]));
  svg.appendChild(el("ellipse", { cx, cy, rx, ry, fill: `url(#${id}g)` }));
  const g = el("g", { "clip-path": `url(#${id})`, fill: "none", stroke: c, "stroke-width": 1.2, "stroke-opacity": 0.75 });
  if (o.style === "bing") {
    const r = Math.max(13, w / 11), hw = r * 0.866;
    for (let row = -1; row * r * 1.5 < h + r; row++) for (let col = -1; col * hw * 2 < w + r; col++) {
      const x = col * hw * 2 + (row & 1 ? hw : 0), y = row * r * 1.5;
      const pts = [0, 1, 2, 3, 4, 5].map((i) => { const a = Math.PI / 3 * i + Math.PI / 6; return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
      g.appendChild(el("polygon", { points: pts, fill: c, "fill-opacity": rnd() < 0.18 ? 0.16 : 0.03 }));
      if (rnd() < 0.15) g.appendChild(el("circle", { cx: x, cy: y, r: 1.8, fill: c2, stroke: "none" }));
    }
  } else if (o.style === "yin") {
    for (let i = 1; i <= 4; i++) g.appendChild(el("ellipse", { cx, cy, rx: rx * i / 4, ry: ry * i / 4, "stroke-dasharray": i % 2 ? "3 5" : "10 4", "stroke-opacity": 0.35 + i * 0.12 }));
    for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; g.appendChild(el("line", { x1: cx + Math.cos(t) * rx * 0.72, y1: cy + Math.sin(t) * ry * 0.72, x2: cx + Math.cos(t) * rx, y2: cy + Math.sin(t) * ry, "stroke-opacity": 0.4 })); }
    for (let i = 0; i < 14; i++) g.appendChild(el("circle", { cx: rnd() * w, cy: rnd() * h, r: 1.5, fill: c2, stroke: "none", "fill-opacity": 0.8 }));
  } else if (o.style === "xian") {
    const s = Math.max(18, w / 8);
    for (let i = -h / s; i < w / s + h / s; i++) {
      g.appendChild(el("line", { x1: i * s, y1: 0, x2: i * s + h, y2: h, "stroke-opacity": 0.4 }));
      g.appendChild(el("line", { x1: i * s, y1: h, x2: i * s + h, y2: 0, "stroke-opacity": 0.4 }));
    }
    for (const k of [0.34, 0.66]) g.appendChild(el("ellipse", { cx, cy: h * k, rx: rx * 1.0, ry: ry * 0.14, stroke: c2, "stroke-width": 4, "stroke-dasharray": "9 5", "stroke-opacity": 0.8 }));
  } else {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h, r = 7 + rnd() * 15;
      const d = Array.from({ length: 8 }, (_, j) => { const a = j / 8 * Math.PI * 2, rr = r * (0.75 + rnd() * 0.5); return `${j ? "L" : "M"}${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`; }).join("") + "Z";
      g.appendChild(el("path", { d, fill: i % 3 ? c : c2, "fill-opacity": 0.07, "stroke-opacity": 0.5, "stroke-linejoin": "round" }));
    }
    for (let i = 0; i < 6; i++) { const x = (i + 0.5) / 6 * w + (rnd() - 0.5) * 10; g.appendChild(el("path", { d: `M${x},${h * 0.5} q-3,${h * 0.25} 2,${h * 0.45}`, stroke: c2, "stroke-width": 1.6, "stroke-opacity": 0.6 })); }
  }
  svg.appendChild(g);
  svg.appendChild(el("ellipse", { cx, cy, rx, ry, fill: "none", stroke: c, "stroke-width": o.style === "xian" ? 3 : 2, "stroke-opacity": 0.95 }));
  return svg;
}

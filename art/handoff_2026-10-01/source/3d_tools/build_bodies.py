"""Build the five modular, actual-geometry chibi bodies as self-contained GLBs.

The model origin is at the projected feet; -Z is forward. The editable source is
kept beside the handoff, not in Godot's live asset tree. No physics nodes exist.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "models" / "minions"
OUT.mkdir(parents=True, exist_ok=True)


def rgb(value: str) -> list[float]:
    value = value.lstrip("#")
    # glTF factors are linear-light; authored hex swatches are display sRGB.
    srgb = [int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]


def normalize(v: np.ndarray) -> np.ndarray:
    return v / max(1e-9, float(np.linalg.norm(v)))


def euler_matrix(rx=0.0, ry=0.0, rz=0.0) -> np.ndarray:
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    return np.array(
        [
            [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz],
            [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz],
            [-sy, sx * cy, cx * cy],
        ],
        dtype=np.float32,
    )


def sphere(center, radii, segments=18, rings=12, rotation=(0, 0, 0)):
    c = np.array(center, dtype=np.float32)
    r = np.array(radii, dtype=np.float32)
    rot = euler_matrix(*rotation)
    verts, norms, ids = [], [], []
    for ti in range(rings + 1):
        t = math.pi * ti / rings
        for pi in range(segments + 1):
            p = 2 * math.pi * pi / segments
            unit = np.array([math.sin(t) * math.cos(p), math.cos(t), math.sin(t) * math.sin(p)], dtype=np.float32)
            verts.append(c + rot @ (unit * r))
            norms.append(normalize(rot @ (unit / r)))
    for ti in range(rings):
        for pi in range(segments):
            a = ti * (segments + 1) + pi
            b = a + segments + 1
            ids.extend((a, a + 1, b, a + 1, b + 1, b))
    return np.array(verts, dtype=np.float32), np.array(norms, dtype=np.float32), np.array(ids, dtype=np.uint32)


def cone(center, bottom_r, top_r, height, segments=24, rotation=(0, 0, 0)):
    c = np.array(center, dtype=np.float32)
    rot = euler_matrix(*rotation)
    verts, norms, ids = [], [], []
    slope = (bottom_r - top_r) / height
    for y, radius in ((-height / 2, bottom_r), (height / 2, top_r)):
        for j in range(segments + 1):
            a = 2 * math.pi * j / segments
            point = np.array([math.cos(a) * radius, y, math.sin(a) * radius])
            normal = normalize(np.array([math.cos(a), slope, math.sin(a)]))
            verts.append(c + rot @ point)
            norms.append(rot @ normal)
    for j in range(segments):
        ids.extend((j, j + 1, segments + 1 + j, j + 1, segments + 2 + j, segments + 1 + j))
    # Separate cap vertices keep their normals flat.
    for y, radius, normal_y, sign in ((-height / 2, bottom_r, -1, -1), (height / 2, top_r, 1, 1)):
        if radius <= 1e-6:
            continue
        origin = len(verts)
        verts.append(c + rot @ np.array([0, y, 0]))
        norms.append(rot @ np.array([0, normal_y, 0]))
        for j in range(segments + 1):
            a = 2 * math.pi * j / segments
            verts.append(c + rot @ np.array([math.cos(a) * radius, y, math.sin(a) * radius]))
            norms.append(rot @ np.array([0, normal_y, 0]))
        for j in range(segments):
            if sign < 0:
                ids.extend((origin, origin + j + 1, origin + j + 2))
            else:
                ids.extend((origin, origin + j + 2, origin + j + 1))
    return np.array(verts, dtype=np.float32), np.array(norms, dtype=np.float32), np.array(ids, dtype=np.uint32)


def tube(points, radius=0.002, segments=7):
    points = [np.array(x, dtype=np.float32) for x in points]
    verts, norms, ids = [], [], []
    for i, point in enumerate(points):
        tangent = normalize(points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)])
        cross = normalize(np.cross(tangent, np.array([0, 0, 1], dtype=np.float32)))
        if np.linalg.norm(cross) < 0.01:
            cross = normalize(np.cross(tangent, np.array([0, 1, 0], dtype=np.float32)))
        other = normalize(np.cross(tangent, cross))
        for j in range(segments + 1):
            a = 2 * math.pi * j / segments
            n = cross * math.cos(a) + other * math.sin(a)
            verts.append(point + radius * n)
            norms.append(n)
    for i in range(len(points) - 1):
        for j in range(segments):
            a = i * (segments + 1) + j
            b = a + segments + 1
            ids.extend((a, b, a + 1, a + 1, b, b + 1))
    return np.array(verts, dtype=np.float32), np.array(norms, dtype=np.float32), np.array(ids, dtype=np.uint32)


def tapered_tube(points, radii, segments=12):
    source = [np.array(x, dtype=np.float32) for x in points]
    smooth, smooth_r = [], []
    for i in range(len(source) - 1):
        p0, p1 = source[i], source[i + 1]
        m0 = (source[i + 1] - source[max(0, i - 1)]) * 0.5
        m1 = (source[min(len(source) - 1, i + 2)] - source[i]) * 0.5
        for k in range(5):
            t = k / 5.0
            pos = (2 * t**3 - 3 * t**2 + 1) * p0 + (t**3 - 2 * t**2 + t) * m0 + (-2 * t**3 + 3 * t**2) * p1 + (t**3 - t**2) * m1
            smooth.append(pos)
            smooth_r.append(radii[i] * (1 - t) + radii[i + 1] * t)
    smooth.append(source[-1])
    smooth_r.append(radii[-1])
    points = smooth
    radii = smooth_r
    verts, norms, ids = [], [], []
    for i, point in enumerate(points):
        tangent = normalize(points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)])
        cross = normalize(np.cross(tangent, np.array([0, 0, 1], dtype=np.float32)))
        if np.linalg.norm(cross) < 0.01:
            cross = normalize(np.cross(tangent, np.array([0, 1, 0], dtype=np.float32)))
        other = normalize(np.cross(tangent, cross))
        for j in range(segments + 1):
            a = 2 * math.pi * j / segments
            n = cross * math.cos(a) + other * math.sin(a)
            verts.append(point + radii[i] * n)
            norms.append(n)
    for i in range(len(points) - 1):
        for j in range(segments):
            a = i * (segments + 1) + j
            b = a + segments + 1
            ids.extend((a, b, a + 1, a + 1, b, b + 1))
    return np.array(verts, dtype=np.float32), np.array(norms, dtype=np.float32), np.array(ids, dtype=np.uint32)


class Glb:
    def __init__(self):
        self.data = bytearray()
        self.views = []
        self.accessors = []
        self.meshes = []
        self.nodes = [{"name": "Body", "children": []}]
        self.materials = []
        self.mat_index = {}

    def material(self, name, color, metallic=0.0, roughness=0.45, emissive=0.0):
        key = (name, color, metallic, roughness, emissive)
        if key not in self.mat_index:
            item = {
                "name": name,
                "pbrMetallicRoughness": {
                    "baseColorFactor": rgb(color) + [1.0],
                    "metallicFactor": metallic,
                    "roughnessFactor": roughness,
                },
                "doubleSided": False,
            }
            if emissive:
                item["emissiveFactor"] = [v * emissive for v in rgb(color)]
            self.mat_index[key] = len(self.materials)
            self.materials.append(item)
        return self.mat_index[key]

    def buffer(self, raw, target):
        while len(self.data) % 4:
            self.data.append(0)
        offset = len(self.data)
        self.data.extend(raw)
        view = len(self.views)
        self.views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(raw), "target": target})
        return view

    def accessor(self, data, gltf_type, component_type, target):
        arr = np.asarray(data)
        view = self.buffer(arr.tobytes(), target)
        count = int(arr.shape[0])
        out = {"bufferView": view, "componentType": component_type, "count": count, "type": gltf_type}
        if gltf_type == "VEC3":
            out["min"] = arr.min(axis=0).astype(float).tolist()
            out["max"] = arr.max(axis=0).astype(float).tolist()
        else:
            out["min"] = [int(arr.min())]
            out["max"] = [int(arr.max())]
        index = len(self.accessors)
        self.accessors.append(out)
        return index

    def mesh(self, name, geometry, mat):
        pos, norm, idx = geometry
        pa = self.accessor(pos, "VEC3", 5126, 34962)
        na = self.accessor(norm, "VEC3", 5126, 34962)
        ia = self.accessor(idx, "SCALAR", 5125, 34963)
        mesh_i = len(self.meshes)
        self.meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": pa, "NORMAL": na}, "indices": ia, "material": mat}]})
        node_i = len(self.nodes)
        self.nodes.append({"name": name, "mesh": mesh_i})
        self.nodes[0]["children"].append(node_i)

    def ball(self, name, center, radii, mat, rotation=(0, 0, 0), segments=18, rings=12):
        self.mesh(name, sphere(center, radii, segments, rings, rotation), mat)

    def cone(self, name, center, bottom_r, top_r, h, mat, rotation=(0, 0, 0)):
        self.mesh(name, cone(center, bottom_r, top_r, h, rotation=rotation), mat)

    def line(self, name, points, mat, r=0.0018):
        self.mesh(name, tube(points, r), mat)

    def sockets(self, head=0.286, width=0.07, shoulders=0.165, hands=0.105, chest=0.135, waist=0.066):
        locs = {
            "head": (0, head, 0),
            "back": (0, chest, width * 0.75),
            "shoulder_l": (-width * 1.1, shoulders, 0),
            "shoulder_r": (width * 1.1, shoulders, 0),
            "hand_l": (-width * 1.55, hands, -0.024),
            "hand_r": (width * 1.55, hands, -0.024),
            "chest": (0, chest, -width * 0.74),
            "waist": (0, waist, 0),
            "aura": (0, 0.012, 0),
            "ghost": (0, 0, 0),
        }
        for key, val in locs.items():
            idx = len(self.nodes)
            self.nodes.append({"name": "Socket_" + key, "translation": list(val)})
            self.nodes[0]["children"].append(idx)

    def export(self, path):
        document = {
            "asset": {"version": "2.0", "generator": "word-combat modular body workshop"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.views,
            "buffers": [{"byteLength": len(self.data)}],
        }
        json_bytes = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        while len(json_bytes) % 4:
            json_bytes += b" "
        while len(self.data) % 4:
            self.data.append(0)
        total_len = 12 + 8 + len(json_bytes) + 8 + len(self.data)
        with open(path, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, total_len))
            f.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
            f.write(json_bytes)
            f.write(struct.pack("<I4s", len(self.data), b"BIN\x00"))
            f.write(self.data)


def palette(g, name, cloth, dark, light, accent):
    return {
        "cloth": g.material(name + " painted enamel", cloth, 0.12, 0.32),
        "dark": g.material(name + " shadow enamel", dark, 0.08, 0.46),
        "light": g.material(name + " raised enamel", light, 0.12, 0.30),
        "accent": g.material(name + " polished gilding", accent, 0.30, 0.19, 0.10),
        "skin": g.material("porcelain face", "#fff0d5", 0, 0.50),
        "shadow": g.material("warm outline", "#47232d", 0.03, 0.70),
        "eye": g.material("ink glass eye", "#281b32", 0.10, 0.12),
        "shine": g.material("white specular dots", "#fffdf1", 0, 0.10, 0.14),
        "blush": g.material("soft cheeks", "#f3a4ab", 0, 0.72),
    }


def face(g, p, y=0.210, z=-0.047, wide=0.064, tall=0.047, eyes=0.025, smiling=True):
    g.ball("Face gold enamel rim", (0, y, z - 0.004), (wide + 0.005, tall + 0.005, 0.022), p["accent"])
    g.ball("Face porcelain inset", (0, y, z - 0.009), (wide, tall, 0.020), p["skin"])
    front = z - 0.029
    for s in (-1, 1):
        x = s * eyes
        g.ball("Glossy oval eye", (x, y + 0.004, front - 0.003), (0.010, 0.016, 0.0045), p["eye"])
        g.ball("Eye glint", (x - 0.0035, y + 0.011, front - 0.007), (0.0032, 0.0044, 0.0013), p["shine"], segments=10, rings=8)
        g.ball("Coral cheek", (s * (eyes + 0.020), y - 0.017, front - 0.001), (0.010, 0.005, 0.0018), p["blush"], segments=12, rings=8)
    if smiling:
        g.line("Tiny smile", [(-0.012, y - 0.020, front - 0.004), (-0.006, y - 0.025, front - 0.005), (0, y - 0.023, front - 0.005), (0.006, y - 0.025, front - 0.005), (0.012, y - 0.020, front - 0.004)], p["shadow"], 0.0014)


def limbs(g, p, feet=True, arm_y=0.109, shoulder_x=0.085):
    for s in (-1, 1):
        g.ball("Rounded shoulder armour", (s * shoulder_x, arm_y + 0.030, 0), (0.033, 0.032, 0.035), p["cloth"])
        g.ball("Shoulder golden band", (s * (shoulder_x + 0.004), arm_y + 0.015, -0.005), (0.035, 0.012, 0.036), p["accent"])
        g.ball("Open mitten", (s * (shoulder_x + 0.014), arm_y - 0.011, -0.016), (0.027, 0.024, 0.029), p["skin"])
        if feet:
            g.ball("Boot cuff", (s * 0.040, 0.052, -0.004), (0.035, 0.014, 0.029), p["accent"])
            g.ball("Little boot", (s * 0.040, 0.028, -0.012), (0.034, 0.027, 0.038), p["cloth"])


def noble_collar(g, p, y=0.150, width=0.062, front=-0.060):
    arc = [(-width, y + 0.010, front + 0.015), (-width * 0.67, y + 0.001, front), (0, y - 0.010, front - 0.005), (width * 0.67, y + 0.001, front), (width, y + 0.010, front + 0.015)]
    g.line("Collar dark engraved edge", [(x, yy - 0.002, z + 0.001) for x, yy, z in arc], p["shadow"], 0.0058)
    g.line("Golden V collar", arc, p["accent"], 0.0039)


def visor_v(g, p, y=0.244, width=0.062, front=-0.062):
    arc = [(-width, y + 0.002, front + 0.016), (-width * 0.5, y - 0.005, front), (0, y - 0.017, front - 0.005), (width * 0.5, y - 0.005, front), (width, y + 0.002, front + 0.016)]
    g.line("Visor ink outline", [(x, yy + 0.001, z + 0.002) for x, yy, z in arc], p["shadow"], 0.0065)
    g.line("Visor swept gold edge", arc, p["accent"], 0.0048)


def sword():
    g = Glb(); p = palette(g, "sword", "#e84e52", "#a92e47", "#ff8272", "#f9c868")
    g.ball("Cuirass dark edge", (0, 0.105, 0.004), (0.077, 0.077, 0.063), p["shadow"])
    g.ball("Red plump cuirass", (0, 0.109, -0.001), (0.074, 0.073, 0.061), p["cloth"])
    g.ball("Bright breast plate", (0, 0.115, -0.042), (0.057, 0.044, 0.027), p["light"])
    g.ball("Golden breast edge", (0, 0.124, -0.063), (0.031, 0.021, 0.010), p["accent"])
    g.ball("Heart of courage", (0, 0.123, -0.073), (0.014, 0.016, 0.006), p["shine"], rotation=(0, 0, math.pi / 4))
    noble_collar(g, p)
    limbs(g, p)
    g.ball("Helm black rim", (0, 0.217, 0.002), (0.080, 0.067, 0.066), p["shadow"])
    g.ball("Red rounded helmet", (0, 0.220, 0.003), (0.078, 0.066, 0.065), p["cloth"])
    face(g, p, y=0.210, z=-0.052, wide=0.060, tall=0.046)
    visor_v(g, p)
    g.ball("Central visor ridge", (0, 0.254, -0.056), (0.007, 0.027, 0.009), p["accent"])
    for s in (-1, 1):
        g.ball("Helm round ear plate", (s * 0.080, 0.211, -0.005), (0.020, 0.025, 0.023), p["accent"])
        g.ball("Ear ruby inset", (s * 0.088, 0.211, -0.006), (0.010, 0.017, 0.016), p["light"])
    g.ball("Gold teardrop plume border", (0, 0.288, 0.005), (0.027, 0.027, 0.019), p["accent"])
    g.cone("Gold plume point", (0, 0.303, 0.005), 0.022, 0.0001, 0.038, p["accent"])
    g.ball("Crimson teardrop plume", (0, 0.288, -0.006), (0.021, 0.022, 0.017), p["cloth"])
    g.cone("Crimson plume point", (0, 0.302, -0.007), 0.017, 0.0001, 0.035, p["cloth"])
    g.sockets(head=0.310, width=0.078, shoulders=0.157, hands=0.105, chest=0.124)
    return g


def shield():
    g = Glb(); p = palette(g, "shield", "#5b9ada", "#2e5b9c", "#91cced", "#f2cf84")
    g.ball("Broad low guardian body edge", (0, 0.100, 0.004), (0.099, 0.066, 0.071), p["dark"])
    g.ball("Broad low guardian body", (0, 0.103, -0.003), (0.095, 0.064, 0.068), p["cloth"])
    g.ball("Cream chest breastplate", (0, 0.100, -0.063), (0.036, 0.038, 0.015), p["skin"])
    g.ball("Gold breastplate binding", (0, 0.084, -0.075), (0.025, 0.009, 0.008), p["accent"])
    for s in (-1, 1):
        g.ball("Stout guardian arm", (s * 0.100, 0.104, -0.006), (0.039, 0.036, 0.039), p["cloth"])
        g.ball("Gold wrist plate", (s * 0.118, 0.093, -0.014), (0.031, 0.013, 0.034), p["accent"])
        g.ball("Cream guardian paw", (s * 0.126, 0.077, -0.026), (0.029, 0.024, 0.029), p["skin"])
        g.ball("Heavy greave", (s * 0.051, 0.043, -0.005), (0.035, 0.035, 0.034), p["cloth"])
        g.ball("Greave gold band", (s * 0.052, 0.048, -0.009), (0.033, 0.012, 0.034), p["accent"])
        g.ball("Cream toe plate", (s * 0.052, 0.023, -0.028), (0.033, 0.021, 0.022), p["skin"])
    g.ball("Beetle shell gold boundary", (0, 0.196, 0.018), (0.152, 0.074, 0.087), p["accent"])
    g.ball("Beetle shell deep sapphire", (0, 0.202, 0.021), (0.145, 0.071, 0.085), p["dark"])
    g.ball("Large sky-blue beetle shell", (0, 0.208, 0.019), (0.136, 0.067, 0.079), p["cloth"])
    for s in (-1, 1):
        g.ball("Big side shell plate", (s * 0.078, 0.207, -0.033), (0.058, 0.047, 0.036), p["light"], rotation=(0, 0, -s * 0.25))
        g.ball("Shell gold inner seam", (s * 0.069, 0.192, -0.061), (0.011, 0.044, 0.008), p["accent"], rotation=(0, 0, s * 0.30))
    g.ball("Domed centre shell plate", (0, 0.244, -0.010), (0.069, 0.037, 0.065), p["light"])
    g.ball("Guardian face helm edge", (0, 0.170, -0.047), (0.069, 0.053, 0.047), p["shadow"])
    g.ball("Blue face helm", (0, 0.173, -0.054), (0.066, 0.051, 0.044), p["cloth"])
    face(g, p, y=0.171, z=-0.083, wide=0.055, tall=0.039, eyes=0.023)
    visor_v(g, p, y=0.213, width=0.057, front=-0.087)
    g.sockets(head=0.281, width=0.091, shoulders=0.139, hands=0.090, chest=0.113)
    return g


def mage():
    g = Glb(); p = palette(g, "mage", "#9067cf", "#54348e", "#b492eb", "#e9c976")
    g.ball("Mage plump body shadow", (0, 0.102, 0.002), (0.075, 0.075, 0.063), p["dark"])
    g.ball("Violet embroidered body", (0, 0.106, -0.004), (0.074, 0.072, 0.060), p["cloth"])
    g.ball("Moon cloak front panel", (0, 0.125, -0.055), (0.057, 0.045, 0.020), p["light"])
    g.ball("Four point lunar gem", (0, 0.128, -0.075), (0.015, 0.020, 0.007), p["accent"], rotation=(0, 0, math.pi / 4))
    noble_collar(g, p)
    limbs(g, p, arm_y=0.112, shoulder_x=0.082)
    g.ball("Moon mage hood dark edge", (0, 0.218, 0), (0.079, 0.067, 0.068), p["dark"])
    g.ball("Soft violet hood", (0, 0.221, 0), (0.076, 0.065, 0.066), p["cloth"])
    face(g, p, y=0.210, z=-0.052, wide=0.057, tall=0.044, eyes=0.023)
    visor_v(g, p, y=0.247, width=0.068)
    g.ball("Moon forehead medallion", (0, 0.262, -0.057), (0.019, 0.020, 0.008), p["accent"])
    g.ball("Moon violet cutout", (0.006, 0.266, -0.063), (0.014, 0.015, 0.009), p["dark"])
    for s in (-1, 1):
        g.ball("Butterfly outer wing", (s * 0.098, 0.251, 0.026), (0.046, 0.050, 0.025), p["accent"], rotation=(0, 0, -s * 0.30))
        g.ball("Butterfly inner wing", (s * 0.100, 0.251, 0.019), (0.036, 0.041, 0.020), p["dark"], rotation=(0, 0, -s * 0.30))
        g.ball("Wing bright eye", (s * 0.116, 0.266, -0.001), (0.010, 0.010, 0.005), p["light"])
        g.ball("Lunar antenna", (s * 0.032, 0.296, 0.005), (0.012, 0.026, 0.012), p["accent"], rotation=(0, 0, -s * 0.38))
        g.ball("Antenna violet enamel", (s * 0.037, 0.299, -0.006), (0.009, 0.020, 0.008), p["light"], rotation=(0, 0, -s * 0.38))
    g.sockets(head=0.320, width=0.076, shoulders=0.162, hands=0.104, chest=0.126)
    return g


def bow():
    g = Glb(); p = palette(g, "bow", "#62b981", "#35775f", "#9fdf9e", "#f2ce79")
    g.ball("Ranger dark tunic", (0, 0.112, 0), (0.067, 0.074, 0.056), p["dark"])
    g.ball("Fresh green tunic", (0, 0.115, -0.004), (0.065, 0.070, 0.054), p["cloth"])
    g.ball("Cross chest gold clasp", (0, 0.139, -0.058), (0.014, 0.017, 0.007), p["accent"])
    g.ball("Cream feather collar", (0, 0.145, -0.063), (0.020, 0.032, 0.010), p["skin"])
    noble_collar(g, p, y=0.153, width=0.051, front=-0.058)
    limbs(g, p, arm_y=0.115, shoulder_x=0.077)
    g.ball("Ranger hood outer", (0, 0.219, 0.002), (0.076, 0.068, 0.068), p["dark"])
    g.ball("Forest hood", (0, 0.221, 0.003), (0.073, 0.065, 0.064), p["cloth"])
    face(g, p, y=0.207, z=-0.051, wide=0.056, tall=0.043, eyes=0.023)
    visor_v(g, p, y=0.248, width=0.060)
    g.ball("Hood central leaf", (0, 0.269, -0.041), (0.022, 0.048, 0.018), p["light"], rotation=(0, 0, 0.10))
    g.cone("Leaf crown point", (0.003, 0.302, -0.041), 0.018, 0.001, 0.038, p["light"], rotation=(0, 0, -0.13))
    for s in (-1, 1):
        g.ball("Huge leaf ear dark border", (s * 0.103, 0.267, 0.020), (0.031, 0.067, 0.025), p["dark"], rotation=(0, 0, -s * 0.76))
        g.ball("Huge leaf ear", (s * 0.103, 0.269, 0.012), (0.026, 0.062, 0.022), p["light"], rotation=(0, 0, -s * 0.76))
        g.ball("Cream ear inner", (s * 0.102, 0.258, -0.013), (0.016, 0.045, 0.008), p["skin"], rotation=(0, 0, -s * 0.76))
        g.ball("Side foliage", (s * 0.086, 0.196, 0.032), (0.030, 0.038, 0.026), p["cloth"], rotation=(0, 0, -s * 0.42))
    g.sockets(head=0.329, width=0.073, shoulders=0.166, hands=0.112, chest=0.133)
    return g


def wisp():
    g = Glb(); p = palette(g, "wisp", "#f36e9b", "#9e457f", "#ffacc0", "#f9cd7c")
    lavender = g.material("wisp lavender underglow", "#b77bcb", 0.0, 0.40, 0.08)
    flame = g.material("wisp bright flame", "#ff7da7", 0.02, 0.28, 0.16)
    tail = [(0.0, 0.115, 0.016), (0.013, 0.079, 0.011), (0.018, 0.050, 0.009), (0.0, 0.029, 0.008), (-0.025, 0.029, 0.006), (-0.031, 0.047, 0.005)]
    g.mesh("Long curved spectral tail shadow", tapered_tube(tail, [0.042, 0.032, 0.025, 0.019, 0.011, 0.001]), p["dark"])
    g.mesh("Pink lavender spectral tail", tapered_tube([(x, y, z - 0.007) for x, y, z in tail], [0.035, 0.029, 0.022, 0.016, 0.009, 0.001]), lavender)
    g.ball("Spectral heart body edge", (0, 0.129, 0.004), (0.071, 0.071, 0.061), p["dark"])
    g.ball("Pink luminous body", (0, 0.132, -0.004), (0.069, 0.068, 0.058), p["cloth"])
    g.ball("Chest glow", (0, 0.140, -0.053), (0.032, 0.031, 0.011), p["light"])
    g.ball("Golden heart pendant", (0, 0.140, -0.064), (0.018, 0.017, 0.006), p["accent"], rotation=(0, 0, math.pi / 4))
    noble_collar(g, p, y=0.165, width=0.055, front=-0.057)
    for s in (-1, 1):
        g.ball("Pink spectral shoulder", (s * 0.080, 0.144, 0), (0.033, 0.030, 0.033), p["cloth"])
        g.ball("Golden wrist band", (s * 0.090, 0.126, -0.011), (0.031, 0.011, 0.030), p["accent"])
        g.ball("Floating cream hand", (s * 0.099, 0.112, -0.025), (0.027, 0.023, 0.026), p["skin"])
    g.ball("Flame head dark border", (0, 0.226, 0), (0.078, 0.067, 0.065), p["dark"])
    g.ball("Pink flame head", (0, 0.229, -0.002), (0.076, 0.064, 0.063), p["cloth"])
    face(g, p, y=0.216, z=-0.052, wide=0.061, tall=0.045, eyes=0.025)
    visor_v(g, p, y=0.250, width=0.062)
    for s in (-1, 1):
        g.ball("Swept side flame fin", (s * 0.079, 0.198, 0.003), (0.019, 0.036, 0.026), p["accent"], rotation=(0, 0, -s * 0.30))
        g.ball("Side flame pink inset", (s * 0.079, 0.199, -0.011), (0.015, 0.031, 0.018), p["light"], rotation=(0, 0, -s * 0.30))
    upper_flame = [(0.014, 0.258, 0.002), (0.035, 0.278, 0.002), (0.038, 0.301, 0.002), (0.019, 0.324, 0.002), (-0.010, 0.326, 0.002)]
    g.mesh("Dancing flame gold rim", tapered_tube(upper_flame, [0.035, 0.033, 0.027, 0.016, 0.001]), p["accent"])
    g.mesh("Dancing pink flame crown", tapered_tube([(x, y, z - 0.008) for x, y, z in upper_flame], [0.030, 0.028, 0.023, 0.014, 0.001]), flame)
    g.ball("Little gold flame seed", (0, 0.263, -0.065), (0.011, 0.018, 0.006), p["accent"], rotation=(0, 0, -0.22))
    g.sockets(head=0.329, width=0.075, shoulders=0.165, hands=0.115, chest=0.145)
    return g


if __name__ == "__main__":
    for name, creator in (("sword", sword), ("shield", shield), ("mage", mage), ("bow", bow), ("wisp", wisp)):
        model = creator()
        path = OUT / f"body_{name}.glb"
        model.export(path)
        print(f"{path}: {len(model.meshes)} geometry parts, {len(model.nodes) - len(model.meshes) - 1} sockets, {path.stat().st_size} bytes")

"""Emit Godot 4.7-compatible 3D FX scenes with stable, documented names."""
from __future__ import annotations

from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
FX=ROOT/"assets"/"fx"

EVENTS=("cast hit big_hit heal block shield trigger chain interrupt kill").split()
CATEGORIES=("atk heal def trap ctl buff").split()

SCENE='''[gd_scene load_steps=6 format=3]

[ext_resource type="Script" path="res://assets/fx/effect3d.gd" id="1_fx"]

[sub_resource type="SphereMesh" id="Sphere_core"]
radius = 0.055
height = 0.11
radial_segments = 16
rings = 8

[sub_resource type="TorusMesh" id="Torus_outer"]
inner_radius = 0.465
outer_radius = 0.5
rings = 32
ring_segments = 8

[sub_resource type="TorusMesh" id="Torus_inner"]
inner_radius = 0.465
outer_radius = 0.5
rings = 32
ring_segments = 8

[sub_resource type="CylinderMesh" id="Cylinder_beam"]
top_radius = 0.035
bottom_radius = 0.065
height = 0.32
radial_segments = 12
rings = 1

[node name="{node}" type="Node3D"]
script = ExtResource("1_fx")
effect_kind = "{kind}"

[node name="Core" type="MeshInstance3D" parent="."]
mesh = SubResource("Sphere_core")

[node name="Ring" type="MeshInstance3D" parent="."]
mesh = SubResource("Torus_outer")

[node name="InnerRing" type="MeshInstance3D" parent="."]
mesh = SubResource("Torus_inner")

[node name="Beam" type="MeshInstance3D" parent="."]
mesh = SubResource("Cylinder_beam")
'''

STAMP='''[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://assets/fx/stamp.gd" id="1_stamp"]

[node name="StampFX" type="Control"]
mouse_filter = 2
script = ExtResource("1_stamp")
'''

def title(name):
    return "".join(x.capitalize() for x in name.split("_"))+"FX"

def main():
    FX.mkdir(parents=True,exist_ok=True)
    for name in EVENTS:
        (FX/(name+".tscn")).write_text(SCENE.format(node=title(name),kind=name),encoding="utf-8")
    for name in CATEGORIES:
        kind="cast_"+name
        (FX/(kind+".tscn")).write_text(SCENE.format(node=title(kind),kind=kind),encoding="utf-8")
    (FX/"stamp.tscn").write_text(STAMP,encoding="utf-8")
    print(f"wrote {len(EVENTS)} event FX, {len(CATEGORIES)} cast FX, 1 stamp FX")

if __name__=="__main__":
    main()

# 3D 牌桌材质交接

生成：在本目录运行 python generate_materials.py（需要 NumPy 与 Pillow）。全部噪声按 U/V 周期构造，确定性种子，可重建；没有从卡背或视频截取纹样。

| 贴图 | 用途 | 尺寸 / 模式 |
| --- | --- | --- |
| source/table/table_surface_2048x1024.png | 模型作者指定的台面 albedo；与下列 albedo 字节相同 | 2048×1024，RGB，不透明 |
| assets/table/textures/table_cloth_albedo_2048x1024.png | 交付版台面底色 | 2048×1024，RGB |
| assets/table/textures/table_cloth_normal_2048x1024.png | 可选的细微绒布颗粒法线，OpenGL Y+ | 2048×1024，RGB |
| assets/table/textures/table_cloth_roughness_2048x1024.png | 台面粗糙度，均值约 0.85 | 2048×1024，灰度 |
| assets/table/textures/rail_oxblood_albedo_1024.png | 可选暗红黑漆金属桌沿底色；不包含金线 | 1024×1024，RGB |
| assets/table/textures/rail_oxblood_normal_1024.png | 可选细微横向拉丝 | 1024×1024，RGB |
| assets/table/textures/rail_oxblood_roughness_1024.png | 可选桌沿粗糙度，均值约 0.28 | 1024×1024，灰度 |
| assets/table/textures/rail_oxblood_metallic_1024.png | 可选桌沿金属度，约 0.42 | 1024×1024，灰度 |

台面建议 UV 横向映射模型 X，纵向映射 Z，整个可布阵区域用一次 0–1 UV。色彩从边缘近黑酒红到中央略亮的黑紫，暗角也是周期函数，边缘可衔接。法线与粗糙度是配套可选图；若只接底色，材质建议粗糙度约 0.85、金属度 0。保持模型上已有的桌沿、槽位与细金边为独立几何和材质。桌沿套图适合暗红金属段；金色嵌条继续用独立材质。

previews/table/materials_preview.png 展示材质与现有卡背的配色关系。预览中的桌沿是示意几何，不在台面 albedo 内。

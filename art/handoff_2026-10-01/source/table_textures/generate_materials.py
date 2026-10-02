"""Rebuild the original, tileable table material maps and their comparison preview.

All noise is periodic in U and V. The broad centre lift is periodic too, so
the main surface can be used once across the tabletop or repeated if needed.
"""
from __future__ import annotations

from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "source" / "table"
OUTPUT = ROOT / "assets" / "table" / "textures"
PREVIEW = ROOT / "previews" / "table" / "materials_preview.png"


def noise(shape: tuple[int, int], sigma_x: float, sigma_y: float, seed: int) -> np.ndarray:
    """Periodic Gaussian-filtered noise, normalized to unit variance."""
    h, w = shape
    rng = np.random.default_rng(seed)
    spectrum = np.fft.rfft2(rng.normal(size=shape).astype(np.float32))
    fy = np.fft.fftfreq(h).astype(np.float32)[:, None]
    fx = np.fft.rfftfreq(w).astype(np.float32)[None, :]
    gaussian = np.exp(-2 * np.pi**2 * ((sigma_x * fx) ** 2 + (sigma_y * fy) ** 2))
    arr = np.fft.irfft2(spectrum * gaussian, s=shape).astype(np.float32)
    arr -= arr.mean()
    arr /= max(float(arr.std()), 1e-6)
    return arr


def rgb_image(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(np.stack((r, g, b), axis=-1), 0, 255).astype(np.uint8), "RGB")


def gray_image(a: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")


def normal_map(height: np.ndarray, strength: float) -> Image.Image:
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(nx)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    return rgb_image((nx / length * .5 + .5) * 255,
                     (ny / length * .5 + .5) * 255,
                     (nz / length * .5 + .5) * 255)


def save(image: Image.Image, name: str) -> Path:
    path = OUTPUT / name
    image.save(path, optimize=True)
    print(f"{path.name}: {image.size}, {image.mode}")
    return path


def make_cloth() -> Image.Image:
    shape = (1024, 2048)
    h, w = shape
    low = noise(shape, 116, 86, 321)
    mids = noise(shape, 27, 19, 322)
    grain = noise(shape, 2.0, 1.6, 323)
    nap = noise(shape, 4.8, 0.9, 324)
    fine = noise(shape, 0.45, 0.45, 325)

    # A soft, periodic lift keeps the playing area legible under dark lighting.
    # Every edge wraps back onto the opposite edge without a painted border.
    x = np.arange(w, dtype=np.float32)[None, :]
    y = np.arange(h, dtype=np.float32)[:, None]
    vignette = .62 * np.cos(2 * np.pi * (x / w - .5))
    vignette = vignette + .38 * np.cos(2 * np.pi * (y / h - .5))

    r = 29.0 + 3.8 * vignette + 1.20 * low + .55 * mids + 1.0 * grain + .50 * nap + .40 * fine
    g = 10.2 + 1.5 * vignette + .35 * low + .22 * mids + .34 * grain + .18 * nap + .18 * fine
    b = 22.5 + 2.8 * vignette + .80 * low + .42 * mids + .70 * grain + .36 * nap + .31 * fine
    albedo = rgb_image(r, g, b)
    save(albedo, "table_cloth_albedo_2048x1024.png")
    shutil.copyfile(OUTPUT / "table_cloth_albedo_2048x1024.png",
                    SOURCE / "table_surface_2048x1024.png")

    bump = .72 * grain + .34 * nap + .19 * fine
    save(normal_map(bump, .105), "table_cloth_normal_2048x1024.png")
    save(gray_image(218 + 3.5 * grain + 2.2 * nap + 1.4 * fine),
         "table_cloth_roughness_2048x1024.png")
    return albedo


def make_rail() -> Image.Image:
    shape = (1024, 1024)
    low = noise(shape, 68, 45, 401)
    brush = noise(shape, 24, .85, 402)
    grain = noise(shape, 1.4, 1.2, 403)
    fine = noise(shape, .5, .5, 404)
    r = 81 + 3.8 * low + 1.9 * brush + .8 * grain + .4 * fine
    g = 17 + .75 * low + .50 * brush + .25 * grain + .12 * fine
    b = 39 + 1.9 * low + .95 * brush + .5 * grain + .25 * fine
    albedo = rgb_image(r, g, b)
    save(albedo, "rail_oxblood_albedo_1024.png")
    save(normal_map(.4 * brush + .3 * grain + .15 * fine, .047),
         "rail_oxblood_normal_1024.png")
    save(gray_image(73 + 4.0 * brush + 3.0 * grain),
         "rail_oxblood_roughness_1024.png")
    save(gray_image(np.full(shape, 108, dtype=np.uint8)),
         "rail_oxblood_metallic_1024.png")
    return albedo


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def make_preview(cloth: Image.Image, rail: Image.Image) -> None:
    im = Image.new("RGB", (1600, 900), (13, 8, 14))
    draw = ImageDraw.Draw(im)
    draw.text((60, 23), "TABLE MATERIALS   /   3D HANDOFF", fill=(210, 173, 124), font=font(23))
    # Preview-only geometry: the delivered cloth texture contains no frame.
    board = (60, 79, 1540, 737)
    rail_top = rail.resize((1480, 36), Image.Resampling.BICUBIC)
    rail_side = rail.rotate(90).resize((36, 586), Image.Resampling.BICUBIC)
    draw.rectangle((56, 75, 1544, 741), fill=(5, 2, 7))
    im.paste(cloth.resize((1408, 586), Image.Resampling.BICUBIC), (96, 115))
    im.paste(rail_top, (60, 79))
    im.paste(rail_top, (60, 701))
    im.paste(rail_side, (60, 115))
    im.paste(rail_side, (1504, 115))
    draw = ImageDraw.Draw(im)
    draw.rectangle((95, 114, 1504, 701), outline=(54, 21, 34), width=2)
    card = Image.open(ROOT / "assets" / "ui" / "cards" / "card_back_512x768.png").convert("RGBA")
    card.thumbnail((164, 246), Image.Resampling.LANCZOS)
    for x, y in ((652, 283), (828, 276), (1004, 283)):
        draw.rounded_rectangle((x+6, y+7, x+card.width+8, y+card.height+9),
                               radius=8, fill=(8, 2, 9))
        im.paste(card, (x, y), card)
    draw.text((62, 774), "NEAR-BLACK OXBLOOD CLOTH  •  ALBEDO / NORMAL / ROUGHNESS",
              fill=(216, 179, 150), font=font(22))
    draw.text((62, 814), "Optional brushed lacquer rail: albedo / normal / roughness / metallic",
              fill=(172, 128, 118), font=font(18))
    draw.text((62, 852), "Card backs shown at relative game scale; rails are preview geometry only.",
              fill=(125, 104, 111), font=font(16))
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    im.save(PREVIEW, optimize=True)
    print(f"{PREVIEW.name}: {im.size}, {im.mode}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)
    cloth = make_cloth()
    rail = make_rail()
    make_preview(cloth, rail)


if __name__ == "__main__":
    main()



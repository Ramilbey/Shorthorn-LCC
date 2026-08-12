"""Prepare the truck render for use as a 3D billboard.

1. key the white studio background (and its soft contact shadow) to alpha
2. shift the blue paint to Shorthorn dark green
3. trim + downscale to a web-sane size
"""

import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

SRC = "/home/mrsand/Desktop/shorthorn cargo/truck.webp"
LOGO = "/home/mrsand/Desktop/shorthorn cargo/shorthorn_Logo.jpg"
OUT = "/home/mrsand/Desktop/shorthorn cargo/landing/src/assets/truck.png"

# --- load + downscale --------------------------------------------------
img = Image.open(SRC).convert("RGB")
img = img.resize((1600, 1600), Image.LANCZOS)
a = np.asarray(img).astype(np.int16)
h, w, _ = a.shape

lum = a.mean(axis=2)
spread = a.max(axis=2) - a.min(axis=2)

# Background predicate: bright and neutral. Loose enough to travel through the
# soft drop shadow, strict enough that it cannot leak into the white trailer
# (which is fenced off by dark trim on every side).
bg_ok = (lum > 196) & (spread < 26)

# --- scanline flood fill from the borders ------------------------------
visited = np.zeros((h, w), dtype=bool)
stack = deque()
for x in range(w):
    for y in (0, h - 1):
        if bg_ok[y, x] and not visited[y, x]:
            visited[y, x] = True
            stack.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if bg_ok[y, x] and not visited[y, x]:
            visited[y, x] = True
            stack.append((x, y))

while stack:
    x, y = stack.pop()
    xl = x
    while xl > 0 and bg_ok[y, xl - 1] and not visited[y, xl - 1]:
        xl -= 1
        visited[y, xl] = True
    xr = x
    while xr < w - 1 and bg_ok[y, xr + 1] and not visited[y, xr + 1]:
        xr += 1
        visited[y, xr] = True
    for ny in (y - 1, y + 1):
        if 0 <= ny < h:
            row_ok = bg_ok[ny]
            row_seen = visited[ny]
            nx = xl
            while nx <= xr:
                if row_ok[nx] and not row_seen[nx]:
                    row_seen[nx] = True
                    stack.append((nx, ny))
                    while nx <= xr and row_ok[nx]:
                        nx += 1
                nx += 1

bg = visited
print(f"background pixels: {bg.sum() / (h * w):.1%}")

# --- alpha -------------------------------------------------------------
alpha = np.where(bg, 0.0, 255.0)
alpha_img = Image.fromarray(alpha.astype(np.uint8), "L").filter(
    ImageFilter.GaussianBlur(1.1)
)
alpha = np.asarray(alpha_img).astype(np.float32) / 255.0
# Pull the matte inward so the white studio halo does not survive as a fringe.
alpha = np.clip((alpha - 0.45) / 0.4, 0, 1)

# --- blue paint -> dark green ------------------------------------------
rgb = Image.fromarray(np.asarray(img))
hsv = np.asarray(rgb.convert("HSV")).astype(np.int16)
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]

# Kenworth blue sits near hue 240 deg (170/255). Grab the paint and its
# reflections, leave chrome, glass, tyres and the white trailer alone.
paint = (H > 124) & (H < 195) & (S > 45)
print(f"paint pixels: {paint.mean():.1%}")

H = np.where(paint, 112, H)  # ~158 deg -> Shorthorn green
S = np.where(paint, np.clip(S * 1.12, 0, 255), S)
V = np.where(paint, np.clip(V * 0.66, 0, 255), V)

out_rgb = np.asarray(
    Image.fromarray(
        np.stack([H, S, V], axis=-1).astype(np.uint8), "HSV"
    ).convert("RGB")
).astype(np.float32)

# Kill the white halo left on edge pixels by mixing toward the local body colour.
out = np.dstack([out_rgb, (alpha * 255)]).astype(np.uint8)
res = Image.fromarray(out, "RGBA")

# --- trim to content ---------------------------------------------------
bbox = res.getbbox()
res = res.crop(bbox)
print("cropped to", res.size)
res.thumbnail((1400, 1400), Image.LANCZOS)
res.save(OUT)
print("wrote", OUT, res.size)

# --- logo: square, small, keep the green tile --------------------------
logo = Image.open(LOGO).convert("RGB")
logo = logo.resize((512, 512), Image.LANCZOS)
logo.save("/home/mrsand/Desktop/shorthorn cargo/landing/src/assets/logo.png")
px = np.asarray(logo).reshape(-1, 3)
# Most common colour = the brand green tile.
vals, counts = np.unique(px, axis=0, return_counts=True)
print("brand green:", "#%02x%02x%02x" % tuple(vals[counts.argmax()]))

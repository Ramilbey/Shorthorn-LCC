"""Letter the trailer with the Shorthorn wordmark, in the photo's own perspective.

The trailer side recedes hard, so the decal is built at the surface's real aspect
(about 9 m long by 1.3 m tall) and then perspective-warped onto the measured panel.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont

TRUCK = "/home/mrsand/Desktop/shorthorn cargo/landing/src/assets/truck.png"
LOGO = "/home/mrsand/Desktop/shorthorn cargo/shorthorn_Logo.jpg"

img = Image.open(TRUCK).convert("RGBA")
W, H = img.size

# Panel edges, fitted from the measurement pass.
def top(x):
    return 56 + (x - 980) * (225 - 56) / (1380 - 980)


def bot(x):
    return 479 + (x - 980) * (496 - 479) / (1340 - 980)


def at(x, v):
    """Point on the panel: x in image px, v = 0 (top) .. 1 (bottom)."""
    t, b = top(x), bot(x)
    return (x, t + (b - t) * v)


# Decal footprint on the panel.
X0, X1 = 992, 1300
V0, V1 = 0.30, 0.60

quad = [at(X0, V0), at(X1, V0), at(X1, V1), at(X0, V1)]
print("quad", [(round(a), round(b)) for a, b in quad])

# --- build the decal at its true surface aspect ------------------------
DW, DH = 1800, 260
decal = Image.new("RGBA", (DW, DH), (0, 0, 0, 0))
d = ImageDraw.Draw(decal)

GREEN = (0, 57, 38, 255)

# monogram tile lifted straight from the supplied logo
logo = Image.open(LOGO).convert("RGB")
# rows 32-71 of the 150px logo are the S monogram; below that is the wordmark
mono = logo.crop((52, 24, 98, 78)).resize((DH, DH), Image.LANCZOS)
decal.paste(mono, (0, 0))

font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 150)
font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 52)

d.text((DH + 60, 34), "SHORTHORN", font=font_b, fill=GREEN)
d.text((DH + 66, 190), "CARGO  ·  USDOT 3856749", font=font_s, fill=(0, 90, 60, 255))

# --- perspective warp --------------------------------------------------
def coeffs(dst, src):
    m = []
    for (xd, yd), (xs, ys) in zip(dst, src):
        m.append([xd, yd, 1, 0, 0, 0, -xs * xd, -xs * yd])
        m.append([0, 0, 0, xd, yd, 1, -ys * xd, -ys * yd])
    A = np.array(m, dtype=float)
    B = np.array(src, dtype=float).reshape(8)
    return np.linalg.solve(A, B)


src = [(0, 0), (DW, 0), (DW, DH), (0, DH)]
c = coeffs(quad, src)
warped = decal.transform((W, H), Image.PERSPECTIVE, c, Image.BICUBIC)

# --- composite, keeping the panel's own shading and rib lines ----------
base = np.asarray(img).astype(np.float32)
lay = np.asarray(warped).astype(np.float32)
a = (lay[..., 3:4] / 255.0)

# Modulate the decal by the local panel luminance so ribs and lighting show through.
panel_lum = base[..., :3].mean(axis=2, keepdims=True) / 235.0
shade = np.clip(panel_lum, 0.55, 1.15)

out = base.copy()
out[..., :3] = base[..., :3] * (1 - a) + lay[..., :3] * shade * a
# never paint outside the truck's own silhouette
out[..., 3] = base[..., 3]

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(TRUCK)
print("lettered", TRUCK)

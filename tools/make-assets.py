#!/usr/bin/env python3
"""One-off asset pipeline: turns the three supplied ZunoBot renders into web assets.

Inputs : tools/source-renders/{Front_view,Back_view,side_view}.jpeg
Outputs: public/images/*.webp (cut-outs with alpha + full "studio plates") and og.jpg

Requires: opencv-python, numpy, pillow.  Run: python3 tools/make-assets.py
The generated files are committed, so this only needs re-running if the renders change.
"""
import cv2, numpy as np, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "source-renders")
OUT = os.path.join(ROOT, "public", "images")
os.makedirs(OUT, exist_ok=True)

VIEWS = {
    # name: (file, grabcut rect x,y,w,h, y_cut: remove bright floor pixels below this row)
    "front": ("Front_view.jpeg", (280, 110, 560, 760), 848),
    "rear":  ("Back_view.jpeg",  (290, 130, 560, 760), 874),
    "side":  ("side_view.jpeg",  (320, 100, 460, 800), 894),
}

def cutout(name, fname, rect, y_cut):
    img = cv2.imread(os.path.join(SRC, fname))
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    cv2.grabCut(img, mask, rect, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == 1) | (mask == 3), 255, 0).astype("uint8")
    # drop bright floor / reflection pixels under the wheels
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    m[y_cut:, :][gray[y_cut:, :] > 95] = 0
    # warm floor reflections caught between wheel and floor: yellow-ish and bright, in the last rows only
    b, g, r = [img[:, :, i].astype(np.int32) for i in range(3)]
    warm = (r > 62) & (b < 0.85 * r) & (g > 0.6 * r) & (r > b + 18)
    warm[: y_cut - 44, :] = False
    m[warm] = 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 800:
            keep[lab == i] = 255
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    inner = cv2.erode(keep, np.ones((3, 3), np.uint8), iterations=2)
    band = cv2.subtract(keep, inner)
    # replace colour-contaminated edge pixels (yellow backdrop spill) with colours from the interior
    img = cv2.inpaint(img, cv2.dilate(band, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_TELEA)
    alpha = cv2.GaussianBlur(inner, (0, 0), 1.1)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    ys, xs = np.where(alpha > 8)
    pad = 24
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h)
    crop = rgba[y0:y1, x0:x1]
    im = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGRA2RGBA))
    # native resolution (the renders are 1024 px; never upscale) plus a small variant for phones
    im.save(os.path.join(OUT, f"{name}-cutout.webp"), quality=90, method=6)
    r = im.resize((400, round(im.height * 400 / im.width)), Image.LANCZOS)
    r.save(os.path.join(OUT, f"{name}-cutout-400.webp"), quality=88, method=6)
    print(name, "cutout", im.size, "bbox", (x0, y0, x1, y1))
    return im, (x0, y0, x1, y1)

def plates(name, fname):
    im = Image.open(os.path.join(SRC, fname)).convert("RGB")
    im.save(os.path.join(OUT, f"{name}-plate-1024.webp"), quality=84, method=6)
    im.resize((640, 640), Image.LANCZOS).save(os.path.join(OUT, f"{name}-plate-640.webp"), quality=82, method=6)

cut = {}
for name, (fname, rect, ycut) in VIEWS.items():
    cut[name] = cutout(name, fname, rect, ycut)
    plates(name, fname)

# --- Open Graph card (1200x630): obsidian field, warm studio glow, front cut-out, wordmark ---
W, H = 1200, 630
bg = Image.new("RGB", (W, H), (10, 11, 13))
glow = Image.new("RGB", (W, H), (0, 0, 0))
d = ImageDraw.Draw(glow)
d.ellipse((560, 40, 1160, 700), fill=(150, 108, 34))
glow = glow.filter(ImageFilter.GaussianBlur(120))
bg = Image.blend(bg, Image.eval(glow, lambda v: v), 0.0)
bg = Image.composite(bg, bg, Image.new("L", (W, H), 255))
arr = np.asarray(bg).astype(np.float32) + np.asarray(glow).astype(np.float32) * 0.85
bg = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))
rob = cut["front"][0]
rh = 560
rob = rob.resize((round(rob.width * rh / rob.height), rh), Image.LANCZOS)
bg.paste(rob, (770, 48), rob)
dr = ImageDraw.Draw(bg)
f_disp = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf", 84)
f_sub = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 30)
f_tag = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Medium.otf", 22)
dr.text((72, 150), "ZunoBot", font=f_disp, fill=(242, 243, 245))
dr.text((72, 262), "A compact home robot concept,", font=f_sub, fill=(190, 196, 205))
dr.text((72, 304), "built around NAVIQ OS.", font=f_sub, fill=(190, 196, 205))
dr.rounded_rectangle((72, 392, 392, 444), radius=26, outline=(55, 230, 217), width=2)
dr.text((98, 405), "EARLY-ACCESS WAITLIST", font=f_tag, fill=(55, 230, 217))
bg.save(os.path.join(ROOT, "public", "og.jpg"), quality=88)
print("og.jpg written")

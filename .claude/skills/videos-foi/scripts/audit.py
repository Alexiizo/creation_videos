#!/usr/bin/env python3
"""Audit d'une vidéo finie (rendue par le moteur ou téléchargée depuis TikTok).

Usage : python audit.py video.mp4 --sortie dossier_audit

Produit dans le dossier :
- planche_N.png : une image par seconde, numérotée (50 par planche), interface TikTok superposée en magenta ;
- debut.png : les 3 premières secondes image par image (0,0 / 0,5 / 1,0 / … / 3,0 s) — décisives ;
- rapport.txt : durée, loudness, secondes trop fortes / trop faibles, silences, plans figés trop longs,
  changements de plan (rythme) et passages sans changement de lieu visible.
Ensuite : REGARDER les planches (Read) et suivre la grille d'audit de references/audit.md.
"""
import argparse
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import noyau  # noqa: E402,F401  (console UTF-8 sous Windows : voir noyau/__init__.py)

W, H = 1080, 1920


def sortie_cmd(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def police(t):
    for p in ("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",
              os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "polices", "InterDisplay-Black.otf")):
        if os.path.exists(p):
            return ImageFont.truetype(p, t)
    return ImageFont.load_default()


def interface(im):
    im = im.convert("RGBA")
    k = im.width / W
    cal = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(cal)
    m = (255, 0, 255, 50)
    d.rectangle([0, 0, im.width, 240 * k], fill=m)
    d.rectangle([0, 1480 * k, im.width, im.height], fill=m)
    d.rectangle([880 * k, 900 * k, im.width, 1480 * k], fill=m)
    return Image.alpha_composite(im, cal).convert("RGB")


def images(video, fps, w, h, debut=None, duree=None):
    cmd = ["ffmpeg", "-v", "error"]
    if debut is not None:
        cmd += ["-ss", str(debut)]
    cmd += ["-i", video]
    if duree is not None:
        cmd += ["-t", str(duree)]
    cmd += ["-vf", f"fps={fps},scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    n = len(raw) // (w * h * 3)
    return np.frombuffer(raw[:n * w * h * 3], np.uint8).reshape(n, h, w, 3)


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--sortie", default="audit")
    a = ap.parse_args()
    os.makedirs(a.sortie, exist_ok=True)
    rapport = []
    pr = lambda *x: rapport.append(" ".join(str(v) for v in x))  # noqa: E731

    dur = float(sortie_cmd(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                            a.video]).stdout.strip())
    info = sortie_cmd(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate",
                       "-of", "compact", a.video]).stdout.strip()
    pr(f"Durée : {dur:.1f} s")
    pr("Flux :", info.replace("\n", " | "))

    # --- planches 1 image / seconde
    f = police(28)
    vign = images(a.video, 1, 216, 384)
    for p in range(0, len(vign), 50):
        part = vign[p:p + 50]
        cols = 10
        rows = (len(part) + cols - 1) // cols
        pl = Image.new("RGB", (cols * 216, rows * 384), (20, 20, 20))
        for i, arr in enumerate(part):
            im = interface(Image.fromarray(arr))
            d = ImageDraw.Draw(im)
            d.rectangle([0, 0, 74, 34], fill=(0, 0, 0))
            d.text((4, 0), f"{p + i}s", font=f, fill=(255, 220, 80))
            pl.paste(im, ((i % cols) * 216, (i // cols) * 384))
        pl.save(os.path.join(a.sortie, f"planche_{p // 50}.png"))

    # --- les 3 premières secondes
    deb = images(a.video, 2, 270, 480, 0, 3.2)[:7]
    pl = Image.new("RGB", (270 * len(deb), 480))
    for i, arr in enumerate(deb):
        im = interface(Image.fromarray(arr))
        ImageDraw.Draw(im).text((6, 2), f"{i * .5:.1f}s", font=f, fill=(255, 220, 80))
        pl.paste(im, (i * 270, 0))
    pl.save(os.path.join(a.sortie, "debut.png"))

    # --- rythme visuel : changements de plan et passages figés (4 i/s, petite taille)
    pet = images(a.video, 4, 54, 96).astype(np.float32)
    if len(pet) > 1:
        diff = np.abs(np.diff(pet, axis=0)).mean(axis=(1, 2, 3))
        coupes = []
        for i, v in enumerate(diff):           # pic local nettement au-dessus du mouvement ambiant = coupe
            ctx = np.median(diff[max(0, i - 6):i + 7])
            if v > 11 and v > 2.2 * ctx and (not coupes or i / 4 - coupes[-1] > .75):
                coupes.append(i / 4)
        pr(f"Changements de plan détectés : {len(coupes)} (≈ un toutes les {dur / max(len(coupes), 1):.1f} s)")
        fige, debut_f = 0, None
        figes = []
        for i, v in enumerate(diff):
            if v < .6:
                fige += 1
                debut_f = i / 4 if debut_f is None else debut_f
            else:
                if fige >= 12:
                    figes.append((debut_f, fige / 4))
                fige, debut_f = 0, None
        if fige >= 12:
            figes.append((debut_f, fige / 4))
        for d0, l in figes:
            pr(f"!! Image quasi figée {l:.1f} s à partir de {d0:.1f} s (le spectateur décroche)")
        longs = []
        prec = 0.0
        for c in coupes + [dur]:
            if c - prec > 9:
                longs.append((prec, c - prec))
            prec = c
        for d0, l in longs:
            pr(f"·  Plan sans coupe de {l:.1f} s à partir de {d0:.1f} s (vérifier qu'il se passe quelque chose)")

    # --- son
    lu = sortie_cmd(["ffmpeg", "-i", a.video, "-af", "ebur128=framelog=quiet", "-f", "null", "-"]).stderr
    m = re.search(r"I:\s+(-?[\d.]+) LUFS", lu)
    if m:
        pr(f"Loudness intégrée : {m.group(1)} LUFS (cible TikTok ≈ -14)")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.video, "-ac", "1", "-ar", "8000", "-f", "f32le", "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    if len(x):
        sec = [20 * np.log10(np.sqrt(np.mean(x[i * 8000:(i + 1) * 8000] ** 2)) + 1e-9) for i in range(len(x) // 8000)]
        med = float(np.median(sec))
        pr(f"Niveau médian : {med:.0f} dB (par seconde)")
        trop = [(i, v) for i, v in enumerate(sec) if v > med + 7]
        if trop:
            pr("!! Secondes nettement plus fortes que le reste (bruitages agressifs) : "
               + ", ".join(f"{i}s ({v:.0f} dB)" for i, v in trop))
        bas = [i for i, v in enumerate(sec) if v < med - 14]
        if bas:
            pr("·  Secondes très faibles (silences) : " + ", ".join(f"{i}s" for i in bas))
        pr("Niveaux par seconde : " + " ".join(f"{v:.0f}" for v in sec))

    texte = "\n".join(rapport)
    open(os.path.join(a.sortie, "rapport.txt"), "w", encoding="utf-8").write(texte + "\n")
    print(texte)
    print(f"\nPlanches : {a.sortie}/planche_*.png  ·  début : {a.sortie}/debut.png")


if __name__ == "__main__":
    sys.exit(principal())

"""Outils d'images partagés par les contrôles (aperçu, non-régression, banc d'essai) : police, écart entre deux
images, masque des zones qui ont changé."""
import os

import numpy as np
from PIL import Image, ImageFont

from . import lire_json

POLICE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "polices", "InterDisplay-Black.otf")
SEUIL_PIXEL = 24          # un pixel « change » quand une de ses couleurs bouge de plus de 24 / 255 (pas le bruit)


def police(taille):
    try:
        return ImageFont.truetype(POLICE, taille)
    except OSError:
        return ImageFont.load_default()


def tableau(im):
    return np.asarray(im.convert("RGB"), dtype=np.int16)


def masque(a, b):
    """Pixels qui ont nettement changé entre deux images de même taille (tableaux RGB)."""
    return np.abs(a - b).max(axis=2) > SEUIL_PIXEL


def ecart(a, b):
    """Part des pixels (0–1) qui ont nettement changé."""
    return float(masque(a, b).mean())


def pourcent(part):
    """0,0143 → « 1,4 % »."""
    return f"{part * 100:.1f} %".replace(".", ",")


def surligner(fond, m):
    """L'image en gris pâle, les zones changées en rouge : on voit d'un coup d'œil CE qui a bougé."""
    g = np.asarray(fond.convert("L"), dtype=np.float32) * .45 + 110
    rgb = np.stack([g, g, g], axis=2)
    rgb[m] = (230, 40, 40)
    return Image.fromarray(rgb.astype(np.uint8))


# ------------------------------------------------------------------ la LISIBILITÉ : un visage se lit sur un téléphone
RAYON_VISAGE = .5              # part du rayon de la tête mesurée (le visage, sans les cheveux)
ANNEAU = (1.4, 2.0)            # autour de la tête : le fond sur lequel elle doit se détacher


def mesure_visage(im, x, y, r):
    """(luminance du visage, luminance du fond autour), entre 0 et 1, mesurées sur l'image rendue."""
    import numpy as np
    a = np.asarray(im.convert("RGB"), dtype=float) / 255
    lum = .2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]
    h, w = lum.shape
    x0, x1 = int(max(0, x - r * ANNEAU[1])), int(min(w, x + r * ANNEAU[1]))
    y0, y1 = int(max(0, y - r * ANNEAU[1])), int(min(h, y + r * ANNEAU[1]))
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    yy, xx = np.mgrid[y0:y1, x0:x1]
    d = np.hypot(xx - x, yy - (y + .15 * r)) / r
    z = lum[y0:y1, x0:x1]
    visage, fond = z[d < RAYON_VISAGE], z[(d > ANNEAU[0]) & (d < ANNEAU[1])]
    return (float(visage.mean()), float(fond.mean())) if visage.size and fond.size else None


FENETRE = (46, 1034, 70, 1130)        # l'arche du format lumière (x0, x1, haut, bas) : on ne juge que les visages qu'on voit
LUM_VISAGE_MIN = .14           # en dessous, les traits ne se lisent plus sur un téléphone en plein jour
RAYON_LISIBLE = 40             # px : une tête plus petite est un figurant, on ne lit pas son visage


def lisibilite(dossier):
    """Les visages trop sombres pour se lire, image par image (tetes.json + les PNG de l'aperçu) → lignes « !! LISIBILITÉ »."""
    pires = {}
    for e in lire_json(os.path.join(dossier, "tetes.json")):
        f = os.path.join(dossier, f"t_{e['t']:06.2f}.png")
        if not os.path.exists(f):
            continue
        im = Image.open(f)
        for t in e["tetes"]:
            dans = FENETRE[0] + t.get("r", 0) / 2 < t["x"] < FENETRE[1] - t.get("r", 0) / 2 and FENETRE[2] < t["y"] < FENETRE[3]
            m = mesure_visage(im, t["x"], t["y"], t["r"]) if dans and t.get("r", 0) >= RAYON_LISIBLE else None
            if m and m[0] < LUM_VISAGE_MIN:
                k = (e["plan"], t["id"])
                pires[k] = min(pires.get(k, 1), m[0])
    def virgule(v):
        return f"{v:.2f}".replace(".", ",")
    return [f"!! LISIBILITÉ plan {p} · {i} : visage trop sombre ({virgule(v)} ; minimum {virgule(LUM_VISAGE_MIN)}) — éclairer "
            "(lampe, feu, écran, heure) ou s'approcher" for (p, i), v in sorted(pires.items())]

#!/usr/bin/env python3
"""Banc d'essai de l'animation : une petite scène (au format des vidéos) → des bandes d'images successives, pour
VOIR un mouvement (anticipation, amorti, cheveux et tissus qui suivent, deux personnages qui se touchent) et
repérer les SAUTS (le corps qui change d'un coup entre deux images).

    python3 scripts/banc.py scripts/film/test/bancs/etreinte.json --sortie etreinte.png

Le cas = un video.json sans voix : "personnages", "lieux", des "plans" muets ("duree" en secondes, "camera",
"acteurs", "objets"…) et les bandes à regarder :
    "bandes": [{"titre": "fin de marche", "de": 1.3, "a": 1.7, "images": 8, "cadre": [x0, y0, x1, y1]}]
"de" / "a" : secondes depuis le début du cas ; "cadre" : la zone de l'écran 1080 × 1920 à garder (défaut :
l'arche). Un SAUT = un pas d'image où beaucoup plus de pixels changent que d'habitude dans la bande.
Code de sortie 1 s'il y a au moins un saut.
"""
import argparse
import json
import os
import statistics
import sys
import tempfile

from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import film as FILM               # noqa: E402
from noyau import images as IM    # noqa: E402

CADRE_ARCHE = [46, 70, 1034, 1130]
HAUT_CASE = 360
SAUT_MIN = .004          # un saut change au moins 0,4 % de la zone…
SAUT_FACTEUR = 6         # … et au moins 6 fois plus que le pas d'image médian de la bande
PAS_MIN = .02            # deux images d'une bande sont au moins à 0,02 s l'une de l'autre
PAS_SAUT_MAX = .05       # les sauts ne se mesurent qu'entre images successives (au-delà, un geste vif ressemble à un saut)


def instants(b):
    n = int(b.get("images", 8))
    if n < 2:
        sys.exit(f"bande « {b.get('titre', '')} » : au moins 2 images")
    pas = (b["a"] - b["de"]) / (n - 1)
    if pas < PAS_MIN:
        sys.exit(f"bande « {b.get('titre', '')} » trop serrée : au moins {PAS_MIN} s entre deux images")
    return [round(b["de"] + k * pas, 2) for k in range(n)]


def sauts(parts):
    """Indices des pas d'image (k → k+1) qui sont des sauts."""
    med = statistics.median(parts) if parts else 0
    return [k for k, x in enumerate(parts) if x > SAUT_MIN and x > SAUT_FACTEUR * med]


def bande(b, dossier):
    ts = instants(b)
    cadre = b.get("cadre", CADRE_ARCHE)
    ims = [Image.open(os.path.join(dossier, f"t_{t:06.2f}.png")).convert("RGB").crop(cadre) for t in ts]
    tabs = [IM.tableau(im) for im in ims]
    parts = [IM.ecart(tabs[k], tabs[k + 1]) for k in range(len(tabs) - 1)]
    serree = ts[1] - ts[0] <= PAS_SAUT_MAX
    return ts, ims, parts, sauts(parts) if serree else [], serree


def planche(resultats, sortie):
    fnt, fnt_t = IM.police(20), IM.police(26)
    lignes = []
    for b, (ts, ims, parts, sk, serree) in resultats:
        k = HAUT_CASE / ims[0].height
        cases = [im.resize((round(im.width * k), HAUT_CASE)) for im in ims]
        titre = b.get("titre", "") + ("" if serree else "  (images espacées : sauts non mesurés)")
        lignes.append((titre, ts, cases, parts, sk))
    larg = max(sum(c.width + 6 for c in cases) for _, _, cases, _, _ in lignes)
    P = Image.new("RGB", (larg, len(lignes) * (HAUT_CASE + 86)), (16, 16, 20))
    d = ImageDraw.Draw(P)
    y = 0
    for titre, ts, cases, parts, sk in lignes:
        d.text((8, y + 6), titre, fill=(255, 211, 77), font=fnt_t)
        x = 0
        for j, c in enumerate(cases):
            P.paste(c, (x, y + 42))
            if j - 1 in sk:                                   # cette image arrive par un saut : cadre rouge
                d.rectangle([x, y + 42, x + c.width - 1, y + 42 + HAUT_CASE - 1], outline=(235, 50, 50), width=6)
            pas = f"  Δ {IM.pourcent(parts[j - 1])}" if j else ""
            d.text((x + 6, y + 48 + HAUT_CASE), f"{ts[j]:.2f} s".replace(".", ",") + pas,
                   fill=(235, 80, 80) if j - 1 in sk else (200, 200, 205), font=fnt)
            x += c.width + 6
        y += HAUT_CASE + 86
    P.save(sortie)


def principal():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cas")
    ap.add_argument("--sortie", required=True)
    a = ap.parse_args()
    film = FILM.charger(a.cas, {})
    bandes = film.pop("bandes", None)
    if not bandes:
        sys.exit("Le cas n'a pas de \"bandes\" à regarder.")
    tms, _, _ = FILM.timings(film)
    for m in FILM.resoudre(film, tms):
        print("  !! mot introuvable :", m)
    film.pop("_dossier", None)
    with tempfile.TemporaryDirectory() as dossier:
        resolu = os.path.join(dossier, "film_resolu.json")
        json.dump(film, open(resolu, "w", encoding="utf-8"), ensure_ascii=False)
        tous = sorted({t for b in bandes for t in instants(b)})
        # le moteur contrôle aussi chaque plan image par image (30 i/s) : ses « !! SAUT » comptent, même quand les
        # images des bandes sont trop espacées pour mesurer un saut elles-mêmes
        sortie = FILM.node(resolu, dossier, "--instants", ",".join(f"{t:.2f}" for t in tous), capture=True)
        resultats = [(b, bande(b, dossier)) for b in bandes]
    os.makedirs(os.path.dirname(os.path.abspath(a.sortie)), exist_ok=True)
    planche(resultats, a.sortie)
    n = sum(1 for ligne in sortie.splitlines() if ligne.startswith("!! SAUT"))
    for b, (ts, _, parts, sk, _) in resultats:
        med = statistics.median(parts)
        for k in sk:
            n += 1
            de, a_ = (f"{x:.2f}".replace(".", ",") for x in (ts[k], ts[k + 1]))
            print(f"SAUT « {b.get('titre', '')} » entre {de} s et {a_} s : {IM.pourcent(parts[k])} de "
                  f"l'image change d'un coup (×{parts[k] / max(med, 1e-6):.0f} le pas habituel)")
    print(f"{'Aucun saut' if not n else f'{n} saut(s)'} — regarde : {a.sortie}")
    sys.exit(1 if n else 0)


if __name__ == "__main__":
    principal()

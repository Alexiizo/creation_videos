#!/usr/bin/env python3
"""Non-régression du moteur : on FIGE les images de contrôle d'une vidéo (la référence), puis, après chaque
amélioration du moteur, on COMPARE les nouvelles images à la référence.

    python3 scripts/non_regression.py figer apercu/ reference/
        → reference/t_*.jpg (540 × 960, légères : elles se versionnent avec la vidéo)
    python3 scripts/non_regression.py comparer reference/ apercu/ --sortie apercu/comparaison.png
        → la liste des images qui ont changé + une planche : référence | nouvelle | ce qui a changé (en rouge)

Changer n'est pas une faute (une amélioration change des images) ; un changement doit être VOULU : on regarde la
planche. Les images sont réduites puis encodées en JPEG de la même façon des deux côtés : un rendu identique donne
des octets identiques, donc un écart nul (le moteur est déterministe : même JSON → mêmes images).
"""
import argparse
import glob
import io
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from noyau import lire_json  # noqa: E402
from noyau import images as IM  # noqa: E402

TAILLE = (540, 960)
QUALITE = 92
SEUIL_IMAGE = .0005        # une image a changé quand plus de 0,05 % de ses pixels ont changé
MAX_PLANCHE = 12
CASE = (270, 480)


def vignette(png):
    """L'image de contrôle telle qu'elle est figée : réduite puis encodée en JPEG (octets)."""
    tampon = io.BytesIO()
    Image.open(png).convert("RGB").resize(TAILLE, Image.LANCZOS).save(tampon, "JPEG", quality=QUALITE)
    return tampon.getvalue()


def figer(source, reference):
    pngs = sorted(glob.glob(os.path.join(source, "t_*.png")))
    if not pngs:
        sys.exit(f"Aucune image de contrôle dans {source} (lancer l'aperçu d'abord).")
    os.makedirs(reference, exist_ok=True)
    for ancien in glob.glob(os.path.join(reference, "t_*.jpg")):
        os.remove(ancien)
    for png in pngs:
        with open(os.path.join(reference, os.path.basename(png)[:-4] + ".jpg"), "wb") as f:
            f.write(vignette(png))
    print(f"Référence figée : {len(pngs)} images dans {reference}")


def nom_plan(source):
    """« t_038.65 » → « plan 12 · 38,65 s » grâce au film résolu de l'aperçu (s'il est là)."""
    chemin = os.path.join(source, "film_resolu.json")
    plans = lire_json(chemin)["plans"] if os.path.exists(chemin) else []

    def nom(fichier):
        t = float(os.path.basename(fichier)[2:8])
        i = next((k for k, p in enumerate(plans) if p["debut"] <= t < p["debut"] + p["duree"]), None)
        return (f"plan {i + 1} · " if i is not None else "") + f"{t:.2f} s".replace(".", ",")
    return nom


def comparer(reference, source, sortie):
    refs = sorted(glob.glob(os.path.join(reference, "t_*.jpg")))
    if not refs:
        sys.exit(f"Aucune référence dans {reference} (la créer : vf.py reference <vidéo>).")
    attendus = {os.path.basename(r)[:-4] for r in refs}
    presents = {os.path.basename(p)[:-4] for p in glob.glob(os.path.join(source, "t_*.png"))}
    if attendus != presents:
        print("Les instants ne correspondent plus à la référence : les durées des plans ont changé (texte, voix, pauses).")
        print("Si c'est voulu, refais la référence : vf.py reference <vidéo>.")
        return 2
    nom = nom_plan(source)
    changes = []
    for r in refs:
        a = IM.tableau(Image.open(r))
        png = os.path.join(source, os.path.basename(r)[:-4] + ".png")
        nouvelle = Image.open(io.BytesIO(vignette(png)))
        m = IM.masque(a, IM.tableau(nouvelle))
        if m.mean() > SEUIL_IMAGE:
            changes.append((float(m.mean()), r, nouvelle, m))
    print(f"{len(refs) - len(changes)} image(s) identique(s), {len(changes)} changée(s) sur {len(refs)}.")
    changes.sort(key=lambda x: -x[0])
    for part, r, _, _ in changes:
        print(f"  {nom(r):<22} {IM.pourcent(part):>7} de l'image a changé")
    if changes:
        planche(changes[:MAX_PLANCHE], nom, sortie)
        print("Regarde :", sortie)
    return 0


def planche(changes, nom, sortie):
    w, h = CASE
    P = Image.new("RGB", (3 * w, len(changes) * (h + 34)), (16, 16, 20))
    d = ImageDraw.Draw(P)
    fnt = IM.police(22)
    for k, (part, r, nouvelle, m) in enumerate(changes):
        y = k * (h + 34)
        d.text((8, y + 5), f"{nom(r)} — {IM.pourcent(part)} changé   (référence | nouvelle | ce qui a changé)", fill=(255, 211, 77), font=fnt)
        for j, im in enumerate((Image.open(r), nouvelle, IM.surligner(nouvelle, m))):
            P.paste(im.convert("RGB").resize(CASE), (j * w, y + 34))
    P.save(sortie)


def principal():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="action", required=True)
    f = sp.add_parser("figer")
    f.add_argument("source")
    f.add_argument("reference")
    c = sp.add_parser("comparer")
    c.add_argument("reference")
    c.add_argument("source")
    c.add_argument("--sortie", required=True)
    a = ap.parse_args()
    if a.action == "figer":
        figer(a.source, a.reference)
    else:
        sys.exit(comparer(a.reference, a.source, a.sortie))


if __name__ == "__main__":
    principal()

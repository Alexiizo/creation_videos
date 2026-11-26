#!/usr/bin/env python3
"""L'atlas de précision : TOUTES les poses, sous trois angles (de trois-quarts, de face, de profil), pour des
personnages types (homme en tunique et manteau, femme d'aujourd'hui, femme voilée), et TOUS les meubles, à gauche,
au centre et à droite du point de fuite, de près et de loin. Un bras derrière le corps, une main dans le vide, un
voile sur le visage, un accoudoir décollé : tout se voit d'un coup d'œil, avant de toucher une vidéo.

    python3 scripts/atlas.py [--sortie bancs/atlas]   → atlas_<personnage>_NN.png, atlas_portraits.png, atlas_meubles.png,
                                                        atlas_objets.png ; comparées à la référence figée si elle existe
    python3 scripts/atlas.py --figer                  → la référence (scripts/film/test/atlas/*.jpg, à refaire quand un
                                                        changement est VOULU et REGARDÉ)
"""
import argparse
import glob
import io
import json
import os
import subprocess
import sys
import tempfile

ICI = os.path.dirname(os.path.abspath(__file__))
TEST = os.path.join(ICI, "film", "test")
sys.path.insert(0, ICI)
import noyau  # noqa: E402,F401  (console en UTF-8)
from noyau import images as IM  # noqa: E402

PERSONNAGES = {
    "homme": {"silhouette": "homme", "traits": "simple", "tete": 1.2, "peau": "#ad7650", "cheveux": {"style": "long", "couleur": "#24180f"},
              "barbe": {"style": "courte", "couleur": "#24180f"}, "haut": {"couleur": "#efe6d6", "longueur": "chevilles", "col": "tunique"},
              "bas": None, "manteau": {"type": "drape", "couleur": "#9b2a26"}, "chaussures": {"type": "sandales", "couleur": "#5a3f28"}},
    "femme": {"silhouette": "femme", "age": "jeune", "traits": "simple", "tete": 1.3, "peau": "#c99470", "cheveux": {"style": "long", "couleur": "#2a1a12"},
              "haut": {"couleur": "#a8645a", "col": "rond", "manches": "longues", "longueur": "hanches"},
              "bas": {"type": "pantalon", "couleur": "#3a3a48"}, "chaussures": {"type": "baskets", "couleur": "#f2f0ea"}, "tient": "telephone"},
    "voilee": {"silhouette": "femme", "age": "adulte", "traits": "simple", "tete": 1.2, "peau": "#b07a52", "cheveux": {"style": "long", "couleur": "#1c130d"},
               "coiffe": {"type": "voile", "couleur": "#3d4a6a"}, "haut": {"couleur": "#6a7a9a", "longueur": "chevilles", "col": "tunique"},
               "bas": None, "chaussures": {"type": "sandales", "couleur": "#5a3f28"}},
}
VUES = (None, 0, 75)                    # la vue de la pose (souvent trois-quarts), de face, de profil
PAR_PLANCHE = 24
REFERENCE = os.path.join(TEST, "atlas")
SEUIL_PLANCHE = .0004       # une planche a changé quand plus de 0,04 % de ses pixels ont changé
MEUBLES = [("canape", 448, 224, 300), ("chaise", 120, 237, 110), ("banc", 300, 118, 90), ("lit", 380, 180, 300),
           ("table", 260, 197, 160), ("bureau", 280, 197, 150), ("commode", 220, 237, 120), ("etagere", 200, 470, 90)]


def poses():
    """Les noms de toutes les poses, lus dans le moteur (rien n'est recopié ici)."""
    code = ("global.window=global;require('../web/base.js');require('../web/rig.js');"
            "console.log(JSON.stringify(Object.keys(RIG.POSES).filter(p=>!['marche','court','attend'].includes(p))))")
    r = subprocess.run(["node", "-e", code], cwd=TEST, capture_output=True, text=True, encoding="utf-8")
    if r.returncode:
        sys.exit("Lecture des poses impossible : " + r.stderr)
    return json.loads(r.stdout)


def node(script, cas, sortie, *dims):
    r = subprocess.run(["node", script, cas, sortie, *map(str, dims)], cwd=TEST, capture_output=True, text=True, encoding="utf-8")
    if r.returncode or "ERR" in r.stderr or "Error" in r.stderr:
        sys.exit(f"{script} a échoué : {r.stderr.strip()}")


def meubles():
    """Chaque meuble à gauche, au centre et à droite du point de fuite, de loin puis de près."""
    items, W, H = [], 540, 1100
    for i, (ty, l, h, pr) in enumerate(MEUBLES):
        ox, oy = (i % 4) * W, (i // 4) * H
        hor, yref = oy + 330, oy + 1000
        items.append({"svg": f"<rect x='{ox}' y='{oy}' width='{W}' height='{H}' fill='#cdbfa8'/><rect x='{ox}' y='{hor}' width='{W}' "
                             f"height='{H - 330}' fill='#8a7458'/><text x='{ox + 12}' y='{oy + 40}' font-size='30' fill='#222'>{ty}</text>"
                             f"<rect x='{ox}' y='{oy}' width='{W}' height='{H}' fill='none' stroke='#000'/>"})
        for x, y in ((ox + 20, oy + 640), (ox + 330, oy + 640), (ox - 120, oy + 1000), (ox + 160, oy + 1000), (ox + 420, oy + 1000)):
            items.append({"gen": "meuble", "type": ty, "x": x, "y": y, "l": l * .5, "h": h * .5, "prof": pr * .5, "horizon": hor,
                          "y_ref": yref, "fuite": ox + 270, "couleur": "#7a5a40", "couleur2": "#5a6a8a"})
    return items


def visage(**k):
    return dict({"traits": "simple", "tete": 1.2}, **k)


TUNIQUE = {"longueur": "chevilles", "col": "tunique"}
TETES = [
    ("jesus", PERSONNAGES["homme"]), ("voilee", PERSONNAGES["voilee"]),
    ("court", visage(silhouette="homme", age="jeune", tete=1.3, peau="#e2b48c", cheveux={"style": "court", "couleur": "#3b2a1c"}, haut={"couleur": "#5a6b4a", "col": "capuche"})),
    ("boucles", visage(silhouette="homme", age="jeune", tete=1.35, peau="#c48a5e", cheveux={"style": "boucles", "couleur": "#1c130d"}, haut={"couleur": "#3f5a8a", "col": "capuche"})),
    ("long", visage(silhouette="femme", age="jeune", tete=1.3, peau="#c99470", cheveux={"style": "long", "couleur": "#2a1a12"}, haut={"couleur": "#a8645a", "col": "rond"})),
    ("queue", visage(silhouette="femme", age="jeune", tete=1.3, peau="#8a5a3c", cheveux={"style": "queue", "couleur": "#1a120d"}, haut={"couleur": "#6b7898", "col": "rond"})),
    ("vieux", visage(silhouette="homme", age="age", peau="#a8704a", cheveux={"style": "degarni", "couleur": "#d8d2c8"}, barbe={"style": "longue", "couleur": "#e8e2d6"}, haut=dict(TUNIQUE, couleur="#efe6d6"), bas=None)),
    ("mi_long", visage(silhouette="homme", age="jeune", peau="#c08a62", cheveux={"style": "mi_long", "couleur": "#2b1d14"}, haut=dict(TUNIQUE, couleur="#6f8fa8"), bas=None)),
]
HUMEURS = [(0, "neutre"), (35, "joie"), (35, "pleure"), (75, "triste"), (20, "peur")]


def portraits():
    return [{"titre": f"{n} v{v} {h}", "desc": d, "pose": "debout", "echelle": 1.75, "decale_y": 520, "cadre": True,
             "opts": {"style": "papier", "action": {"vue": v, "visage": h}}} for v, h in HUMEURS for n, d in TETES]


def objets():
    """Tous les objets du moteur (lus dans decors.js), chacun à la même largeur d'affichage, sol et mur visibles."""
    code = ("require('../web/tout.js');"
            "console.log(JSON.stringify(Object.entries(MONDE.OBJETS).map(([k,o])=>[k,Math.max(o.d[0],o.d[1]*.9)])))")
    r = subprocess.run(["node", "-e", code], cwd=TEST, capture_output=True, text=True, encoding="utf-8")
    if r.returncode:
        sys.exit("Lecture des objets impossible : " + r.stderr)
    items, C, W, H = [], 9, 300, 400
    for i, (ty, cm) in enumerate(json.loads(r.stdout)):
        ox, oy, k = (i % C) * W, (i // C) * H, 215 / (cm * 460 / 175)
        items.append({"svg": f"<rect x='{ox}' y='{oy}' width='{W}' height='{H}' fill='#d8cbb6'/><rect x='{ox}' y='{oy + 200}' width='{W}' height='{H - 200}' fill='#b39c7c'/>"
                             f"<text x='{ox + 10}' y='{oy + 28}' font-size='20' fill='#222'>{ty}</text>"})
        items.append({"gen": "objet", "type": ty, "x": ox + 45, "y": oy + 340, "horizon": oy + 120, "y_ref": oy + 120 + 220 / k, "fuite": ox + 150, "t": 1.2})
    return items, C * W, (len(items) // 2 + C - 1) // C * H


def vignette(png):
    from PIL import Image
    im = Image.open(png).convert("RGB")
    tampon = io.BytesIO()
    im.resize((im.width // 2, im.height // 2), Image.LANCZOS).save(tampon, "JPEG", quality=88)
    return tampon.getvalue()


def figer(faites):
    os.makedirs(REFERENCE, exist_ok=True)
    for f in glob.glob(os.path.join(REFERENCE, "*.jpg")):
        os.remove(f)
    for png in faites:
        with open(os.path.join(REFERENCE, os.path.basename(png)[:-4] + ".jpg"), "wb") as f:
            f.write(vignette(png))
    print(f"Référence de l'atlas figée : {len(faites)} planches → {REFERENCE}")


def comparer(faites, sortie):
    """Les planches qui ne sont plus celles de la référence → une planche « référence | nouvelle » par changement."""
    from PIL import Image
    changees = []
    for png in faites:
        ref = os.path.join(REFERENCE, os.path.basename(png)[:-4] + ".jpg")
        if not os.path.exists(ref):
            changees.append((png, None))
            continue
        a, b = Image.open(ref).convert("RGB"), Image.open(io.BytesIO(vignette(png))).convert("RGB")
        part = 1.0 if a.size != b.size else float(IM.masque(IM.tableau(a), IM.tableau(b)).mean())
        if part > SEUIL_PLANCHE:
            changees.append((png, part))
            out = Image.new("RGB", (a.width + b.width + 8, max(a.height, b.height)), "white")
            out.paste(a, (0, 0))
            out.paste(b, (a.width + 8, 0))
            out.save(os.path.join(sortie, "change_" + os.path.basename(png)))
    print(f"{len(faites) - len(changees)} planche(s) identique(s) à la référence, {len(changees)} changée(s).")
    for png, part in changees:
        print(f"  {os.path.basename(png):<24} " + ("nouvelle planche" if part is None else IM.pourcent(part) + " a changé → change_" + os.path.basename(png)))


def principal():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sortie", default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(ICI)))), "bancs", "atlas"))
    ap.add_argument("--figer", action="store_true", help="cet atlas devient la référence (après l'avoir REGARDÉ)")
    a = ap.parse_args()
    os.makedirs(a.sortie, exist_ok=True)
    for ancien in glob.glob(os.path.join(a.sortie, "*.png")):
        os.remove(ancien)
    noms = poses()
    faites = []
    with tempfile.TemporaryDirectory() as tmp:
        for perso, desc in PERSONNAGES.items():
            cas = [{"titre": f"{po}{'' if v is None else ' v' + str(v)}", "desc": desc, "pose": po,
                    "opts": dict({"style": "papier"}, **({"action": {"vue": v}} if v is not None else {}))} for po in noms for v in VUES]
            for k in range(0, len(cas), PAR_PLANCHE):
                f = os.path.join(tmp, "cas.json")
                json.dump(cas[k:k + PAR_PLANCHE], open(f, "w", encoding="utf-8"), ensure_ascii=False)
                sortie = os.path.join(a.sortie, f"atlas_{perso}_{k // PAR_PLANCHE:02d}.png")
                node("planche.js", f, sortie, 8, 250, 440)
                faites.append(sortie)
        f = os.path.join(tmp, "portraits.json")
        json.dump(portraits(), open(f, "w", encoding="utf-8"), ensure_ascii=False)
        sortie = os.path.join(a.sortie, "atlas_portraits.png")
        node("planche.js", f, sortie, len(TETES), 250, 400)
        faites.append(sortie)
        items, w, h = objets()
        f = os.path.join(tmp, "objets.json")
        json.dump(items, open(f, "w", encoding="utf-8"), ensure_ascii=False)
        sortie = os.path.join(a.sortie, "atlas_objets.png")
        node("gen.js", f, sortie, w, h)
        faites.append(sortie)
        f = os.path.join(tmp, "meubles.json")
        json.dump(meubles(), open(f, "w", encoding="utf-8"))
        sortie = os.path.join(a.sortie, "atlas_meubles.png")
        node("gen.js", f, sortie, 2160, 2200)
        faites.append(sortie)
    print(f"{len(noms)} poses × {len(VUES)} vues × {len(PERSONNAGES)} personnages + {len(MEUBLES)} meubles → {len(faites)} planches")
    if a.figer:
        figer(faites)
    elif glob.glob(os.path.join(REFERENCE, "*.jpg")):
        comparer(faites, a.sortie)
    print("Regarde (en taille réelle) :", a.sortie)


if __name__ == "__main__":
    principal()

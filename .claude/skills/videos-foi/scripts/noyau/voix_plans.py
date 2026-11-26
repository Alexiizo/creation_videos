"""Les fichiers de voix, un par plan (voix_plans/03.mp3…) : savoir si chacun dit bien le texte actuel de son plan.

Le manifeste (voix_plans/manifeste.json) garde, pour chaque fichier, l'empreinte de ce qui l'a produit (texte + voix + réglages)
et celle du texte seul. Un plan inséré, déplacé ou réécrit ne joue donc jamais la voix d'un autre, et une phrase déjà
enregistrée se retrouve même si son plan a changé de numéro (rien n'est payé deux fois)."""
import hashlib
import os

from . import lire_json
from . import mots as TX


def empreinte_texte(texte):
    return hashlib.sha1(TX.nettoyer(texte or "").encode()).hexdigest()[:12]


def nom(i):
    return f"{i + 1:02d}"


def manifeste(dossier):
    f = os.path.join(dossier, "manifeste.json")
    if not os.path.exists(f):
        return {}
    brut = lire_json(f)
    return {k: v if isinstance(v, dict) else {"empreinte": v} for k, v in brut.items()}     # (anciens manifestes : l'empreinte seule)


def etat(film, dossier):
    """Pour chaque plan : "a_jour", "perimee" (le texte a changé), "absente" ou "muet" (rien à dire)."""
    man, out = manifeste(dossier) if dossier else {}, []
    for i, p in enumerate(film.get("plans", [])):
        if not TX.nettoyer(p.get("texte", "")):
            out.append("muet")
            continue
        if not dossier or not os.path.exists(os.path.join(dossier, nom(i) + ".mp3")):
            out.append("absente")
            continue
        dit = man.get(nom(i), {}).get("texte")          # un fichier posé à la main n'a pas d'empreinte : on lui fait confiance
        out.append("a_jour" if dit in (None, empreinte_texte(p["texte"])) else "perimee")
    return out


def fichiers(film, dossier):
    """{numéro de plan: fichier} des voix qui disent bien le texte actuel."""
    return {i: os.path.join(dossier, nom(i) + ".mp3") for i, e in enumerate(etat(film, dossier)) if e == "a_jour"}


def deja_dites(dossier):
    """{empreinte: contenu du mp3} de tout ce qui est déjà enregistré, quel que soit son numéro de plan."""
    out = {}
    for k, v in manifeste(dossier).items():
        f = os.path.join(dossier, k + ".mp3")
        if os.path.exists(f):
            with open(f, "rb") as fichier:
                out[v["empreinte"]] = fichier.read()
    return out

#!/usr/bin/env python3
"""Les livrables d'une vidéo, prêts à copier : description TikTok, hashtags, commentaire à épingler, rappel de
l'étiquette « contenu généré par l'IA », ligne de journal (SKILL.md § 7).

    python3 scripts/livrables.py videos/v04/video.json      → videos/v04/livrables.txt (et à l'écran)

Tout vient du JSON de la vidéo : "titre", "type_video", "passage", "pont", "levier" et le bloc "livrables" que Claude
écrit avec le script :
    "livrables": {"numero": 4, "description": "…", "hashtag": "#pardon", "situation": "…", "invitation": "prière",
                  "commentaire": "…"}        (sans "commentaire" : celui de la charte)
Ce qui manque est signalé « À ÉCRIRE » ; une description de plus de 150 caractères, ou un appât dans la description
ou le commentaire (mêmes interdits que le vérificateur), est une ERREUR (code de sortie 1).
"""
import argparse
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from noyau import lire_json  # noqa: E402
from noyau import foi as V  # noqa: E402

LONGUEUR_MAX = 150
HASHTAGS = "#jesus #bible #foi #dieu"
COMMENTAIRE = "Écris “prie pour moi” et je prierai pour toi 🙏"
A_ECRIRE = "À ÉCRIRE"


def appats(texte):
    n = V._norm(texte)
    return [raison for phrase, raison in V.INTERDITS if V._norm(phrase) in n]


def livrables(film):
    """(texte prêt à copier, erreurs, manques)"""
    lv = film.get("livrables") or {}
    err, manque = [], []

    def champ(valeur, nom):
        if valeur:
            return str(valeur)
        manque.append(nom)
        return f"{A_ECRIRE} ({nom})"
    desc = champ(lv.get("description"), "description")
    if lv.get("description") and len(lv["description"]) > LONGUEUR_MAX:
        err.append(f"description de {len(lv['description'])} caractères (au plus {LONGUEUR_MAX})")
    com = lv.get("commentaire") or COMMENTAIRE
    for nom, texte in (("description", lv.get("description") or ""), ("commentaire", com)):
        err += [f"{nom} : {r}" for r in appats(texte)]
    tags = f"{HASHTAGS} {champ(lv.get('hashtag'), 'hashtag lié à la situation')}"
    journal = (f"📓 JOURNAL VIDÉO FOI {lv.get('numero', '?')} — {champ(film.get('titre'), 'titre')} — "
               f"format : {film.get('type_video', 'recit')} — dosage : {film.get('dosage', 'recit')} — passage : {champ(film.get('passage'), 'passage')} — "
               f"situation : {champ(lv.get('situation'), 'situation')} — levier : {champ(film.get('levier') or lv.get('levier'), 'levier')} — "
               f"pont : {champ((film.get('pont') or {}).get('ref'), 'pont')} — invitation : {champ(lv.get('invitation'), 'invitation')}")
    texte = "\n".join([
        "DESCRIPTION", desc, "",
        "HASHTAGS", tags, "",
        "COMMENTAIRE À ÉPINGLER", com, "",
        "RAPPEL", "Activer l'étiquette « contenu généré par l'IA » de TikTok.", "",
        "JOURNAL", journal, ""])
    return texte, err, manque


def principal():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("film")
    a = ap.parse_args()
    film = lire_json(a.film)
    texte, err, manque = livrables(film)
    sortie = os.path.join(os.path.dirname(os.path.abspath(a.film)), "livrables.txt")
    open(sortie, "w", encoding="utf-8").write(texte)
    print(texte)
    for e in err:
        print("ERREUR :", e)
    if manque:
        print(f"À écrire dans \"livrables\" du JSON : {', '.join(manque)}")
    print("Livrables :", sortie)
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    principal()

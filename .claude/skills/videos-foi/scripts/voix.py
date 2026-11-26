#!/usr/bin/env python3
"""La voix ElevenLabs, automatiquement, UN FICHIER PAR PLAN (synchro parfaite, rien à découper) :

    python3 scripts/voix.py videos/v03/video.json                 # génère les plans qui manquent ou qui ont changé
    python3 scripts/voix.py videos/v03/video.json --plan 7         # régénère une seule phrase (mal dite, mauvais ton)
    python3 scripts/voix.py videos/v03/video.json --modele eleven_v3   # le modèle le plus expressif (si dispo)
    python3 scripts/film.py videos/v03/video.json --bible charte.md --voix-plans videos/v03/voix_plans --sortie …

Clé : ELEVENLABS_API_KEY (variable d'environnement ou fichier .env du projet — JAMAIS dans git).
Voix : ELEVENLABS_VOICE_ID, sinon la voix de « Mes voix » dont le nom contient --nom (défaut « Guillaume »).
Réglages « voix bien vivante » (charte) : stabilité 0,40, similarité 0,75, style 0,30, vitesse 1,0.
Chaque phrase connaît la précédente et la suivante (continuité de l'intonation). Un manifeste garde le texte et les
réglages de chaque fichier : relancer ne régénère QUE ce qui a changé (crédits économisés).
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from noyau import lire_json  # noqa: E402
from noyau import voix_plans as VP  # noqa: E402
from noyau import mots as TX                 # noqa: E402

API = os.environ.get("ELEVENLABS_API_URL", "https://api.elevenlabs.io/v1")


def lire_env(depart):
    """Charge le premier fichier .env trouvé en remontant depuis le dossier de la vidéo (puis le dossier courant)."""
    for base in (os.path.abspath(depart), os.getcwd()):
        d = base
        while True:
            f = os.path.join(d, ".env")
            if os.path.exists(f):
                for ligne in open(f, encoding="utf-8"):
                    ligne = ligne.strip()
                    if ligne and not ligne.startswith("#") and "=" in ligne:
                        k, v = ligne.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
                return f
            p = os.path.dirname(d)
            if p == d:
                break
            d = p
    return None


def requete(chemin, cle, donnees=None, accept="application/json"):
    req = urllib.request.Request(API + chemin, data=json.dumps(donnees).encode() if donnees is not None else None,
                                 headers={"xi-api-key": cle, "Content-Type": "application/json", "Accept": accept},
                                 method="POST" if donnees is not None else "GET")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def trouver_voix(cle, nom):
    if os.environ.get("ELEVENLABS_VOICE_ID"):
        return os.environ["ELEVENLABS_VOICE_ID"], "(ELEVENLABS_VOICE_ID)"
    voix = json.loads(requete("/voices", cle)).get("voices", [])
    for v in voix:
        if nom.lower() in v.get("name", "").lower():
            return v["voice_id"], v["name"]
    noms = ", ".join(v.get("name", "?") for v in voix[:30])
    sys.exit(f"Aucune voix « {nom} » dans tes voix ElevenLabs. Ajoute « Guillaume – Narrator » depuis la Voice Library "
             f"(bouton « Add to my voices »), ou mets ELEVENLABS_VOICE_ID dans .env. Tes voix : {noms}")


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("film")
    ap.add_argument("--plan", type=int, action="append", help="numéro(s) de plan à régénérer (1 = le premier)")
    ap.add_argument("--dossier", help="dossier des fichiers (défaut : voix_plans/ à côté du JSON)")
    ap.add_argument("--modele", default=os.environ.get("ELEVENLABS_MODELE", "eleven_multilingual_v2"))
    ap.add_argument("--nom", default="Guillaume")
    ap.add_argument("--stabilite", type=float, default=.40)
    ap.add_argument("--similarite", type=float, default=.75)
    ap.add_argument("--style", type=float, default=.30)
    ap.add_argument("--vitesse", type=float, default=1.0)
    ap.add_argument("--tout", action="store_true", help="tout régénérer")
    a = ap.parse_args()
    lire_env(os.path.dirname(os.path.abspath(a.film)))
    cle = os.environ.get("ELEVENLABS_API_KEY")
    if not cle:
        sys.exit("ELEVENLABS_API_KEY manquante : copie .env.exemple en .env et mets ta clé (elevenlabs.io → Profile → API key).")
    film = lire_json(a.film)
    dossier = a.dossier or os.path.join(os.path.dirname(os.path.abspath(a.film)), "voix_plans")
    os.makedirs(dossier, exist_ok=True)
    man_f = os.path.join(dossier, "manifeste.json")
    man, connues = VP.manifeste(dossier), VP.deja_dites(dossier)          # une phrase déjà enregistrée se reprend, même si son plan a changé de numéro
    voice_id, nom = trouver_voix(cle, a.nom)
    print(f"Voix : {nom} — modèle {a.modele}")
    plans = film["plans"]
    textes = [TX.nettoyer(p.get("texte", "")) for p in plans]
    if a.modele == "eleven_v3":      # v3 : stabilité par paliers (0 créatif, 0,5 naturel, 1 robuste) ; le ton se règle par [indications]
        reglages = {"stability": 0.0 if a.stabilite < .25 else .5 if a.stabilite < .75 else 1.0, "similarity_boost": a.similarite}
    else:
        reglages = {"stability": a.stabilite, "similarity_boost": a.similarite, "style": a.style, "use_speaker_boost": True,
                    "speed": a.vitesse}
    faits = reprises = 0

    def noter(i, txt, empreinte):
        man[VP.nom(i)] = {"empreinte": empreinte, "texte": VP.empreinte_texte(txt)}
        with open(man_f, "w", encoding="utf-8") as fichier:
            json.dump(man, fichier, indent=1)
    for i, txt in enumerate(textes):
        if not txt:
            continue
        f = os.path.join(dossier, f"{i + 1:02d}.mp3")
        prev = next((textes[j] for j in range(i - 1, -1, -1) if textes[j]), "")
        nxt = next((textes[j] for j in range(i + 1, len(textes)) if textes[j]), "")
        empreinte = hashlib.sha1(json.dumps([txt, voice_id, a.modele, reglages]).encode()).hexdigest()[:12]
        demande = (a.plan and (i + 1) in a.plan) or a.tout
        if not demande and os.path.exists(f) and man.get(VP.nom(i), {}).get("empreinte") == empreinte:
            noter(i, txt, empreinte)
            continue
        if not demande and empreinte in connues:
            with open(f, "wb") as fichier:
                fichier.write(connues[empreinte])
            noter(i, txt, empreinte)
            reprises += 1
            continue
        if a.plan and (i + 1) not in a.plan and os.path.exists(f):
            continue
        corps = {"text": txt, "model_id": a.modele, "voice_settings": reglages}
        if a.modele != "eleven_v3":
            corps.update({"previous_text": prev, "next_text": nxt})
        try:
            audio = requete(f"/text-to-speech/{voice_id}?output_format=mp3_44100_128", cle, corps, "audio/mpeg")
        except urllib.error.HTTPError as e:
            if e.code in (400, 422) and "previous_text" in corps:      # réglage refusé par ce modèle : sans continuité
                corps.pop("previous_text"), corps.pop("next_text")
                audio = requete(f"/text-to-speech/{voice_id}?output_format=mp3_44100_128", cle, corps, "audio/mpeg")
            else:
                sys.exit(f"ElevenLabs a refusé le plan {i + 1} ({e.code}) : {e.read()[:300]!r}")
        with open(f, "wb") as fichier:
            fichier.write(audio)
        noter(i, txt, empreinte)
        faits += 1
        print(f"  plan {i + 1:02d} ✓  {txt[:70]}")
    print(f"{faits} fichier(s) générés dans {dossier}" + (f", {reprises} repris" if reprises else "") + ("" if faits or reprises else " (tout était à jour)"))


if __name__ == "__main__":
    principal()

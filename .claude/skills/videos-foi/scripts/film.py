#!/usr/bin/env python3
"""Le film (moteur web) : du JSON de la vidéo au MP4.

    python3 scripts/film.py video.json --bible charte.md --apercu dossier [--moments 0.3,0.8] [--plans 1,4]
        → images de contrôle (une par plan et par moment) + planche.png  (TOUJOURS avant un rendu)
    python3 scripts/film.py video.json --bible charte.md --voix voix.mp3 --sortie rendu/
        → rendu/video.mp4 (images Chromium + voix calée + ambiances + nappe, −14 LUFS)
    sans --voix : durées estimées (brouillon muet avec ambiances)

Le JSON décrit des PLANS (une phrase = une image) ; tout ce qui a un "mot" est calé sur le mot dit.
Format complet : references/moteur-film.md.
"""
import argparse
import json
import os
import re
import subprocess
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from noyau import lire_json  # noqa: E402
from noyau import audio as AU           # noqa: E402
from noyau import duree as EP           # noqa: E402
from noyau import voix_plans as VP  # noqa: E402
from noyau import mots as TX            # noqa: E402
from noyau import bible as BIB          # noqa: E402

AMBIANCE_DEFAUT = "vent"


def charger(chemin, bible):
    film = lire_json(chemin)
    film["_dossier"] = os.path.dirname(os.path.abspath(chemin))
    tv = film.get("type_video", "recit")
    cible = film.get("duree_cible") or bible.get(f"duree_cible_{tv}") or bible.get("duree_cible") or [60, 100]
    EP.regler_cible(*cible)
    EP.MOTS_PAR_SECONDE = float(film.get("mots_par_seconde", bible.get("mots_par_seconde", 2.8)))
    # lieux et SVG dans des fichiers à côté du JSON
    for zone in [film.get("lieux", {}).values(), film.get("plans", [])]:
        for z in zone:
            for c in (z.get("couches") or []) + (z.get("objets") or []):
                if c.get("fichier") and not c.get("svg"):
                    c["svg"] = open(os.path.join(film["_dossier"], c["fichier"]), encoding="utf-8").read()
    # cartes de verset : texte pris dans la Bible (Segond 1910) s'il n'est pas donné
    icones = None
    for p in film.get("plans", []):
        for g in p.get("graphiques", []) or []:
            if g.get("type") in ("verset", "citation") and g.get("ref"):
                if not g.get("texte"):
                    g["texte"] = BIB.texte(g["ref"])
                g["ref"] = BIB.joli(g["ref"])
            # icônes Lucide (assets/icones) : "icone": "heart" → tracé SVG inclus
            for o in [g, *(g.get("items") or []), g.get("gauche") or {}, g.get("droite") or {}]:
                if isinstance(o, dict) and o.get("icone"):
                    if icones is None:
                        icones = lire_json(os.path.join(ICI, "..", "assets", "icones", "lucide.json"))
                    if o["icone"] not in icones:
                        proches = [k for k in icones if o["icone"].split("-")[0] in k][:8]
                        sys.exit(f"Icône inconnue : {o['icone']} — proches : {', '.join(proches) or 'aucune'} (python3 scripts/icones.py <mot>)")
                    o["_svg"] = icones[o["icone"]]
            if g.get("type") == "carte":          # la géographie exacte (assets/geographie), chaque lieu nommé vérifié
                geo = lire_json(os.path.join(ICI, "..", "assets", "geographie", "palestine_1er_siecle.json"))
                noms = {x["nom"] for x in geo["lieux"]}
                for n in [x if isinstance(x, str) else x.get("nom") for x in g.get("lieux") or []] + list(g.get("trajet") or []):
                    if n not in noms:
                        sys.exit(f"Carte : lieu inconnu « {n} » — lieux : {', '.join(sorted(noms))}")
                if isinstance(g.get("cadre"), str) and g["cadre"] not in geo["cadres"]:
                    sys.exit(f"Carte : cadre inconnu « {g['cadre']} » — cadres : {', '.join(geo['cadres'])}")
                g["_geo"] = geo
            if g.get("type") in ("liste",) and not g.get("icone"):
                if icones is None:
                    icones = lire_json(os.path.join(ICI, "..", "assets", "icones", "lucide.json"))
                g["_svg"] = icones["check"]
    return film


def timings(film, voix=None, voix_plans=None, sortie=None):
    ep = {"scenes": [{"texte": p.get("texte", ""), **({"pause": p["pause"]} if "pause" in p else {}),
                      **({"duree": p["duree"]} if not p.get("texte") and "duree" in p else {}),
                      **({"type": "fin", "attente": p.get("attente", 2.5)} if p.get("fin") else {})}
                     for p in film["plans"]]}
    if voix_plans:
        fich = VP.fichiers(film, voix_plans)          # seulement les voix qui disent le texte actuel de leur plan
        tms, total, notes = EP.synchroniser_plans(ep, fich, os.path.join(sortie, "voix_complete.wav"))
    elif voix:
        tms, total, notes = EP.synchroniser(ep, voix)
    else:
        tms, total, notes = EP.estimer(ep)
    return tms, total, notes


LIAISONS = {"qu'il", "qu'elle", "que", "qui", "quand", "et", "mais", "pour", "avec", "comment", "parce", "si", "avant",
            "après", "comme", "où", "dont", "car", "alors", "puis", "sans", "vers", "dans"}
FINS_INTERDITES = {"le", "la", "les", "l'", "un", "une", "de", "des", "du", "d'", "à", "au", "aux", "ne", "n'", "mon", "ton",
                   "son", "ma", "ta", "sa", "mes", "tes", "ses", "ce", "cette", "qu'", "que", "qui", "et", "en", "y", "je", "tu",
                   "il", "elle", "on", "nous", "vous", "ils", "se", "te", "me", "lui", "plus", "très", "si", "pas", "deux", "trois",
                   "quatre", "cent", "mille", "tout", "tous", "même"}


def _groupes(tokens, max_mots=6, max_car=30):
    """Les morceaux de phrase affichés ensemble (≤ 2 lignes). On coupe d'abord sur la ponctuation ; un morceau trop
    long se coupe en parts équilibrées, de préférence avant un mot de liaison (« qu'il », « et », « pour »…), jamais
    après un article ou une préposition (« le / plus revenir » est interdit)."""
    mots = [m for m, _ in tokens]
    propositions, cur = [], []
    for i, m in enumerate(mots):
        cur.append(i)
        if m[-1:] in ".!?…»:;" or (m[-1:] == "," and len(cur) >= 3):
            propositions.append(cur)
            cur = []
    if cur:
        propositions.append(cur)

    def nettoie(w):
        return w.lower().strip(".,!?…:;«»“”\"")

    def coupe(ids):
        long = len(" ".join(mots[j] for j in ids))
        if len(ids) <= max_mots and long <= max_car:
            return [ids]
        best, bk = None, 1e9
        for k in range(2, len(ids) - 1):
            g_, d_ = ids[:k], ids[k:]
            lg, ld = len(" ".join(mots[j] for j in g_)), len(" ".join(mots[j] for j in d_))
            score = abs(lg - ld)
            if nettoie(mots[ids[k]]) in LIAISONS or nettoie(mots[ids[k]]).startswith("qu'"):
                score -= 20
            if nettoie(mots[ids[k - 1]]) in FINS_INTERDITES or mots[ids[k - 1]].endswith("'"):
                score += 60
            if mots[ids[k - 1]][-1:] == ",":
                score -= 15
            if score < bk:
                best, bk = k, score
        if best is None:
            return [ids]
        return coupe(ids[:best]) + coupe(ids[best:])

    out = []
    for pr in propositions:
        out += coupe(pr)
    # un morceau d'un seul mot qui n'est pas une fin de phrase se recolle au précédent s'il y a la place
    fus = []
    for g in out:
        if fus and len(g) == 1 and mots[g[0]][-1:] not in ".!?…" and len(fus[-1]) < max_mots:
            fus[-1] = fus[-1] + g
        else:
            fus.append(g)
    grp = {}
    for k, ids in enumerate(fus):
        for j in ids:
            grp[j] = k
    return grp


def resoudre(film, tms):
    """Temps en secondes partout : "mot" → instant du mot dans le plan ; mots des sous-titres."""
    manquants = []
    lumiere = (film.get("style") or {}).get("format", "lumiere") in ("lumiere", "papier")
    fps = float(film.get("fps", 30))
    for p in film["plans"]:
        # l'en-tête d'une carte de la Parole : « PAROLE DE JÉSUS » seulement si la citation est déclarée comme la sienne
        # (« qui »: "jesus") — jamais par défaut (on ne met pas dans la bouche de Jésus ce que dit le récit)
        jesus = {c.get("ref") for c in p.get("cite") or [] if c.get("qui") == "jesus"}
        for g in p.get("graphiques") or []:
            if g.get("type") in ("verset", "citation") and not g.get("entete"):
                g["entete"] = "PAROLE DE JÉSUS" if g.get("ref") in jesus else "LA BIBLE DIT"
    for p, tm in zip(film["plans"], tms):
        # les limites des plans tombent sur des images : allonger un plan ne change pas le nombre d'images des suivants
        # (le rendu par plan les retrouve dans son cache) ; l'écart avec la voix reste sous 1/60 s
        p["debut"] = round(tm["debut"] * fps) / fps
        p["duree"] = round((tm["debut"] + tm["duree"]) * fps) / fps - p["debut"]
        p["voix_debut"], p["voix_fin"] = tm["voix_debut"], tm["voix_fin"]
        texte = p.get("texte", "")
        tokens = TX.mots_avec_accent(texte)
        tps = TX.temps_mots(texte, tm["voix_debut"], tm["voix_fin"])
        grp = _groupes(tokens, 8, 42) if lumiere else _groupes(tokens)
        p["mots"] = [{"texte": m.replace("*", ""), "accent": a or any(TX._norm(m) == TX._norm(r) for r in film.get("mots_rouges", [])),
                      "t": round(t, 3), "groupe": grp[i]} for i, ((m, a), (_, t)) in enumerate(zip(tokens, tps))]

        def t_de(d):
            if not isinstance(d, dict):
                return
            if "mot" in d:
                c = TX._norm(str(d["mot"]))
                n, k = int(d.get("mot_n", 1)), 0
                for w0, t in tps:
                    w = w0.split("'")[-1] if "'" in w0 and "'" not in c else w0      # « s'effondre » → « effondre »
                    if w == c or (len(c) >= 4 and w.startswith(c)):
                        k += 1
                        if k == n:
                            d["t"] = round(max(0.0, t + float(d.get("decale", 0))), 3)
                            break
                else:
                    manquants.append(f"plan {film['plans'].index(p) + 1} : « {d['mot']} »")
            if d.get("t") == "fin":
                d["t"] = p["duree"]
            if "fin_mot" in d:
                dd = {"mot": d["fin_mot"]}
                t_de(dd)
                d["fin"] = dd.get("t")

        for cle in ("camera", "graphiques"):
            for d in p.get(cle, []) or []:
                t_de(d)
        for g in p.get("graphiques", []) or []:
            for it in (g.get("items") or []) + (g.get("lieux") or []) + (g.get("points") or []):
                if isinstance(it, dict):
                    t_de(it)
            if "mot_trajet" in g:
                dd = {"mot": g["mot_trajet"]}
                t_de(dd)
                g["t_trajet"] = dd.get("t")
            if "mot_droite" in g:
                dd = {"mot": g["mot_droite"]}
                t_de(dd)
                g["t_droite"] = dd.get("t")
            if g.get("type") == "liste":
                g["items"] = [it if isinstance(it, dict) else {"texte": it} for it in g.get("items") or []]
        for a in p.get("acteurs", []) or []:
            for d in a.get("actions", []) or []:
                t_de(d)
            for k in ("apparait", "disparait"):
                if isinstance(a.get(k), dict):
                    t_de(a[k])
                    a[k] = a[k].get("t", 0)
        for o in (p.get("objets", []) or []) + (p.get("couches", []) or []):
            for d in ((o.get("anim") or {}).get("cles") or []):
                t_de(d)
            if o.get("gen") == "eclair":
                ins = []
                for x in o.get("instants", []):
                    if isinstance(x, dict):
                        t_de(x)
                        ins.append(x.get("t", 0))
                    else:
                        ins.append(x)
                o["instants"] = ins                                   # en temps du plan (comme tout le reste)
        if p.get("camera"):
            for d in p["camera"]:
                d.setdefault("t", 0)
    return manquants


def plan_audio(film, tms):
    plan = []
    for p, tm in zip(film["plans"], tms):
        amb = p.get("ambiance") or (film.get("lieux", {}).get(p.get("lieu"), {}) or {}).get("ambiance") or AMBIANCE_DEFAUT
        e = dict(debut=tm["debut"], duree=tm["duree"], ambiance=amb, volume_ambiance=p.get("volume_ambiance", 1.0),
                 tension=p.get("tension", .25), bruitages=[], silences=[])
        for b in (p.get("bruitages") or [])[:2]:
            e["bruitages"].append((tm["debut"] + float(b.get("t", 0)), b["nom"], b.get("volume", .8), {}))
        for o in p.get("couches", []) or []:
            if o.get("gen") == "eclair":
                for t in o.get("instants", []):
                    e["bruitages"].append((tm["debut"] + t, "tonnerre", .7, {}))
        if tm.get("voix_src"):
            e["voix_src"] = tm["voix_src"]
            e["voix_pos"] = tm["debut"] + tm["voix_debut"]
        plan.append(e)
    return plan


RHUBARB_VERSION = "1.13.0"


def rhubarb():
    """Rhubarb Lip Sync (MIT) : la bouche des personnages qui parlent suit la VRAIE voix. Cherché dans $RHUBARB, le PATH,
    ~/.cache/videos-foi/ ; sinon téléchargé une fois depuis GitHub (Linux, macOS ou Windows). None → bouche procédurale."""
    import platform
    import shutil
    nom = "rhubarb.exe" if os.name == "nt" else "rhubarb"
    for c in (os.environ.get("RHUBARB"), shutil.which("rhubarb")):
        if c and os.path.exists(c):
            return c
    cache = os.path.join(os.path.expanduser("~"), ".cache", "videos-foi")
    for racine, _, fichiers in os.walk(cache):
        if nom in fichiers:
            return os.path.join(racine, nom)
    systeme = {"Linux": "Linux", "Darwin": "macOS", "Windows": "Windows"}.get(platform.system())
    if not systeme:
        return None
    url = (f"https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v{RHUBARB_VERSION}/"
           f"Rhubarb-Lip-Sync-{RHUBARB_VERSION}-{systeme}.zip")
    try:
        import urllib.request
        import zipfile
        os.makedirs(cache, exist_ok=True)
        z = os.path.join(cache, "rhubarb.zip")
        print("Rhubarb (synchro des lèvres) : téléchargement unique…")
        urllib.request.urlretrieve(url, z)
        zipfile.ZipFile(z).extractall(cache)
        os.remove(z)
        for racine, _, fichiers in os.walk(cache):
            if nom in fichiers:
                b = os.path.join(racine, nom)
                if os.name != "nt":
                    os.chmod(b, 0o755)
                return b
    except Exception as e:                                       # noqa: BLE001
        print("  (Rhubarb indisponible :", e, "→ bouche procédurale)")
    return None


def visemes(film, voix, tms, dossier):
    """Visèmes A–H/X de la voix, replacés plan par plan sur la ligne de temps du film : [[t, "A"], …]
    (seulement si un personnage « parle » ; la bouche suit alors la vraie voix)."""
    parle = any(ac.get("parle") for p in film["plans"] for a in p.get("acteurs", []) or [] for ac in a.get("actions", []) or [])
    if not parle or not voix:
        return None
    b = rhubarb()
    if not b:
        return None
    wav = os.path.join(dossier, "voix_levres.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", voix, "-ac", "1", "-ar", "16000", wav], check=True)
    # dans un FICHIER : sous Windows, Rhubarb n'écrit rien sur une sortie standard redirigée (constaté le 24/11/2026)
    sortie_json = os.path.join(dossier, "levres.json")
    r = subprocess.run([b, "-q", "-r", "phonetic", "-f", "json", "-o", sortie_json, wav], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    try:
        cues = lire_json(sortie_json).get("mouthCues", [])
    except (OSError, ValueError) as e:
        print(f"  (Rhubarb a échoué : {(r.stderr or str(e)).strip()[:200]} → bouche procédurale)")
        return None
    out = []
    for tm in tms:
        if not tm.get("voix_src"):
            continue
        v0, v1 = tm["voix_src"]
        dec = tm["debut"] + tm["voix_debut"] - v0
        for c in cues:
            if v0 <= c["start"] < v1:
                out.append([round(c["start"] + dec, 3), c["value"]])
        out.append([round(v1 + dec, 3), "X"])
    return sorted(out)


def sons_montage(film):
    """Les sons du montage (format lumière) : un souffle doux à chaque changement de plan, un « pop » feutré quand une
    étiquette, une bulle ou une carte apparaît, un carillon sur l'écran de fin. Rien d'autre (pas d'ambiances)."""
    out = []
    for i, p in enumerate(film["plans"]):
        if i and p.get("son_transition", True):
            out.append((p["debut"] - .2, "souffle", .9 if p.get("transition") in (None, "coupe") else .6))
        for g in p.get("graphiques", []) or []:
            if g.get("type") in ("badge", "ruban", "bulle", "pensee", "citation", "verset", "telephone") and g.get("son", True):
                out.append((p["debut"] + float(g.get("t", 0) or 0), "pop", .8))
            if g.get("type") == "fin":
                out.append((p["debut"] + float(g.get("t", 0) or 0) + .5, "carillon", 1.0))
    return out


def _empreinte(*parts):
    """Empreinte d'un ensemble de valeurs et de fichiers (contenu des fichiers, pas leur date)."""
    import hashlib
    h = hashlib.sha1()
    for x in parts:
        if isinstance(x, str) and os.path.isfile(x):
            h.update(open(x, "rb").read())
        else:
            h.update(json.dumps(x, sort_keys=True, default=str).encode())
    return h.hexdigest()


INTENSITE_REGISTRE = {"aujourdhui": .3, "recit": .45, "explication": .5, "invitation": .38}
INTENSITE_TOURNANT, INTENSITE_MONTEE = .88, .66


def courbe_emotion(film):
    """La courbe de la musique : installe (aujourd'hui) → raconte → MONTE vers le moment clé (le plan au panneau doré)
    → culmine → s'apaise (explication) → se résout (invitation, fin). Un plan peut imposer la sienne ("musique": 0–1).
    Renvoie ([(t0, t1, intensité)], instant du tournant ou None)."""
    plans, lieux = film["plans"], film.get("lieux", {})
    dore = [i for i, p in enumerate(plans) if p.get("panneau") or (lieux.get(p.get("lieu")) or {}).get("panneau")]
    sec = []
    for i, p in enumerate(plans):
        v = INTENSITE_REGISTRE.get(p.get("registre"), .35)
        if dore and i in dore:
            v = INTENSITE_TOURNANT
        elif dore and i == dore[0] - 1:
            v = INTENSITE_MONTEE
        sec.append((p["debut"], p["debut"] + p["duree"], float(p.get("musique", v))))
    return sec, (plans[dore[0]]["debut"] if dore else None)


def mixer_lumiere(film, tms, total, voix, musique_fichier, sortie):
    """Le son : voix + musique composée (ou choisie) + sons du montage. Gardé tel quel tant que rien de ce qui le
    compose n'a changé (les durées, la voix, la musique, le code du son) : retoucher une image ne refait pas le son."""
    from noyau import musique as MU
    st = film.get("style") or {}
    cfg = st.get("musique") if isinstance(st.get("musique"), dict) else {}
    sec, tournant = courbe_emotion(film)
    plan = [{"voix_src": tm.get("voix_src"), "voix_pos": tm["debut"] + tm["voix_debut"]} for tm in tms]
    sons = sons_montage(film)
    wav = os.path.join(sortie, "mix.wav")
    cle = _empreinte(round(total, 4), sec, st.get("musique", True), st.get("niveau_musique_db", -15), plan, sons, voix or "",
                     musique_fichier or "", os.path.join(ICI, "noyau", "musique.py"), os.path.join(ICI, "noyau", "audio.py"))
    f_cle = wav + ".cle"
    if os.path.exists(wav) and os.path.exists(f_cle) and open(f_cle, encoding="utf-8").read() == cle:
        print("Son : inchangé (repris tel quel)")
        return wav
    mus = None
    if musique_fichier:
        mus = AU.charger_audio(musique_fichier)
    elif st.get("musique", True) is not False:
        mus = MU.generer(total, sec, cfg.get("tonalite", "G"), cfg.get("tempo", 72), cfg.get("humeur", "espoir"), cfg.get("seed", 1),
                         tournant=tournant)
    AU.mixer_lumiere(plan, total, AU.charger_audio(voix) if voix else None, mus, sons, wav, float(st.get("niveau_musique_db", -15)))
    open(f_cle, "w", encoding="utf-8").write(cle)
    return wav


CIBLE_LUFS, CRETE_MAX, LRA = -14.0, -1.5, 11          # TikTok : −14 LUFS intégrés, crête vraie ≤ −1,5 dBTP
MARGE_CRETE = .5                                       # l'encodage AAC remonte un peu la crête : on vise 0,5 dB plus bas
CIBLE_BROUILLON, CRETE_BROUILLON = -21.0, -2.0         # un brouillon sans voix reste plus bas
ECART_VOIX_MIN = 14.0                                  # la voix au moins 14 dB au-dessus de la musique


def loudnorm_2passes(wav, cible, crete):
    """Le niveau final en DEUX passes : on mesure d'abord, puis on corrige linéairement (bien plus juste qu'une passe)."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", f"loudnorm=I={cible}:TP={crete}:LRA={LRA}:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    return (f"loudnorm=I={cible}:TP={crete}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")


def mesurer_son(fichier):
    """Le niveau intégré (LUFS) et la crête vraie (dBTP) d'un fichier, tels que les plateformes les mesurent."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", fichier, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)[-1])


def rapport_son(final, wav, voix, sortie):
    """Le contrôle du son, à chaque rendu : niveau, crête, voix au-dessus de la musique (son.json + une ligne)."""
    cible, crete = (CIBLE_LUFS, CRETE_MAX) if voix else (CIBLE_BROUILLON, CRETE_BROUILLON)
    lufs, tp = mesurer_son(final)
    stats = lire_json(wav + ".json") if os.path.exists(wav + ".json") else {}
    ecart = stats.get("ecart_voix_musique_db")
    ok = abs(lufs - cible) <= 1 and tp <= crete and (ecart is None or ecart >= ECART_VOIX_MIN)
    rapport = {"lufs": lufs, "cible_lufs": cible, "crete_dbtp": tp, "crete_max": crete, "ecart_voix_musique_db": ecart, "ok": ok}
    json.dump(rapport, open(os.path.join(sortie, "son.json"), "w", encoding="utf-8"), indent=1)
    m = lambda b: "✓" if b else "✗"
    print(f"Son : {lufs:.1f} LUFS {m(abs(lufs - cible) <= 1)} (cible {cible:.0f}) · crête {tp:.1f} dBTP {m(tp <= crete)} (≤ {crete})"
          + (f" · voix {ecart:+.0f} dB au-dessus de la musique {m(ecart >= ECART_VOIX_MIN)} (≥ {ECART_VOIX_MIN:.0f})" if ecart is not None else ""))
    return ok


def node(*args, capture=False):
    """Lance le moteur ; capture=True rend aussi ce qu'il a écrit (pour en lire les alertes « !! »)."""
    r = subprocess.run(["node", os.path.join(ICI, "film", "rendu.js"), *map(str, args)], text=True, encoding="utf-8",
                       errors="replace", capture_output=capture)
    if capture:
        print(r.stdout, end="")
        print(r.stderr, end="", file=sys.stderr)
    if r.returncode:
        sys.exit("Le rendu a échoué.")
    return r.stdout if capture else None


def planche(images, sortie, titres):
    from PIL import Image, ImageDraw
    from noyau import images as IM
    ims = [Image.open(i).convert("RGB").resize((270, 480)) for i in images]
    cols = 6
    rows = (len(ims) + cols - 1) // cols
    P = Image.new("RGB", (cols * 270, rows * 480), (20, 20, 20))
    fnt = IM.police(26)
    for k, (im, ti) in enumerate(zip(ims, titres)):
        x, y = (k % cols) * 270, (k // cols) * 480
        P.paste(im, (x, y))
        d = ImageDraw.Draw(P)
        d.rectangle([x, y, x + 96, y + 36], fill=(0, 0, 0))
        d.text((x + 6, y + 3), ti, fill=(255, 211, 77), font=fnt)
    P.save(sortie)
    return sortie


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("film")
    ap.add_argument("--bible")
    ap.add_argument("--voix", nargs="+")
    ap.add_argument("--voix-plans", dest="voix_plans", help="dossier voix_plans/ de scripts/voix.py (un mp3 par plan)")
    ap.add_argument("--apercu")
    ap.add_argument("--moments", default="0.25,0.75")
    ap.add_argument("--plans", default="")
    ap.add_argument("--sortie")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--musique")
    a = ap.parse_args()
    bible = EP.charger_bible(a.bible)
    film = charger(a.film, bible)
    sortie = a.sortie or a.apercu or os.path.join(film["_dossier"], "rendu_" + os.path.splitext(os.path.basename(a.film))[0])
    os.makedirs(sortie, exist_ok=True)
    voix = AU.assembler_voix(a.voix, os.path.join(sortie, "voix_complete.wav")) if a.voix else None
    if a.voix_plans:
        tms, total, notes = timings(film, None, a.voix_plans, sortie)
        voix = os.path.join(sortie, "voix_complete.wav")
    else:
        tms, total, notes = timings(film, voix)
    manq = resoudre(film, tms)
    print(f"Durée {'(voix calée)' if voix else '(estimée)'} : {total:.1f} s — {len(film['plans'])} plans")
    for i, p in enumerate(film["plans"]):
        print(f"  {i + 1:02d} {p['debut']:6.2f}s +{p['duree']:5.2f}s  {TX.nettoyer(p.get('texte', ''))[:70]}")
    for n in notes:
        print("  !!", n)
    for m in manq:
        print("  !! mot introuvable :", m)
    film.pop("_dossier", None)
    vis = visemes(film, voix, tms, sortie)
    if vis:
        film["visemes"] = vis
        print(f"Lèvres : {len(vis)} visèmes (Rhubarb)")
    resolu = os.path.join(sortie, "film_resolu.json")
    json.dump(film, open(resolu, "w", encoding="utf-8"), ensure_ascii=False)
    if a.apercu:
        moments = [float(x) for x in a.moments.split(",")]
        choix = [int(x) - 1 for x in a.plans.split(",") if x.strip()] or range(len(film["plans"]))
        inst, titres = [], []
        for i in choix:
            p = film["plans"][i]
            for m in moments:
                inst.append(round(p["debut"] + min(p["duree"] - .05, m * p["duree"]), 2))
                titres.append(f"{i + 1}·{int(m * 100)}")
        os.makedirs(a.apercu, exist_ok=True)
        for f_ in os.listdir(a.apercu):
            if f_.startswith("t_"):
                os.remove(os.path.join(a.apercu, f_))
        node(resolu, a.apercu, "--instants", ",".join(f"{x:.2f}" for x in inst))
        fichiers = [os.path.join(a.apercu, f"t_{x:06.2f}.png") for x in inst]
        from noyau import images as IM
        for ligne in IM.lisibilite(a.apercu):
            print(ligne)
        print("Planche :", planche(fichiers, os.path.join(a.apercu, "planche.png"), titres))
        return
    muette = os.path.join(sortie, "video_muette.mp4")
    node(resolu, muette, "--workers", a.workers)
    if (film.get("style") or {}).get("format", "lumiere") in ("lumiere", "papier"):
        wav = mixer_lumiere(film, tms, total, voix, a.musique, sortie)
    else:
        wav = AU.mixer(plan_audio(film, tms), total, AU.charger_audio(voix) if voix else None,
                       AU.charger_audio(a.musique) if a.musique else None, os.path.join(sortie, "mix.wav"))
    final = os.path.join(sortie, "video.mp4" if voix else "video_brouillon.mp4")
    cible, crete = (CIBLE_LUFS, CRETE_MAX) if voix else (CIBLE_BROUILLON, CRETE_BROUILLON)
    niveau = loudnorm_2passes(wav, cible, crete - MARGE_CRETE)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", muette, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-af", niveau, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", final], check=True)
    print("VIDÉO :", final)
    rapport_son(final, wav, voix, sortie)


if __name__ == "__main__":
    principal()

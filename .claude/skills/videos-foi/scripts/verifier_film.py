#!/usr/bin/env python3
"""Vérifie une vidéo du moteur de film (JSON à « plans ») AVANT tout rendu.

    python3 scripts/verifier_film.py video.json --bible charte.md

Deux familles de contrôles :
1. LA PAROLE ET LE MESSAGE (les mêmes que pour toute vidéo de la chaîne, verifier.py § verifier_foi) : chaque « … »
   vérifié mot pour mot dans la Segond 1910, les paroles de Jésus vraiment les siennes, rien d'inventé, passage et
   pont, appâts / argent / menaces / promesses interdits, Dieu le Père jamais un personnage, une porte ouverte.
2. LE FILM : chaque plan a son lieu et ce qu'il montre, chaque personnage et chaque lieu existent, les fichiers SVG
   sont valides, chaque « mot » est bien dit dans le plan, une phrase = une image (rythme), durée dans la cible.
Écrit aussi le texte pour la voix (_voix.txt, _voix_elevenlabs.txt).
"""
import argparse
import os
import re
import sys
import xml.dom.minidom

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import film as FILM                       # noqa: E402
from noyau import lire_json  # noqa: E402
from noyau import foi as V                # noqa: E402
from noyau import duree as EP             # noqa: E402

DIVINS = V.PERSONNES_DIVINES


def principal():
    ap = argparse.ArgumentParser()
    ap.add_argument("film")
    ap.add_argument("--bible")
    a = ap.parse_args()
    bible = EP.charger_bible(a.bible)
    brut = lire_json(a.film)
    donnes = {(i, j) for i, p in enumerate(brut.get("plans", [])) for j, g in enumerate(p.get("graphiques", []) or [])
              if g.get("type") in ("verset", "citation") and g.get("texte")}
    err, alerte = [], []
    try:
        film = FILM.charger(a.film, bible)
    except Exception as e:                                   # noqa: BLE001
        sys.exit(f"ERREUR : chargement impossible — {e}")
    plans = film.get("plans", [])
    if not plans:
        sys.exit("ERREUR : aucun plan")
    tms, total, notes = FILM.timings(film)
    manq = FILM.resoudre(film, tms)
    err += [f"mot introuvable : {m}" for m in manq]
    perso, lieux = film.get("personnages", {}), film.get("lieux", {})
    for k in perso:
        if k.lower() in DIVINS:
            err.append(f"personnage « {k} » : Dieu le Père et le Saint-Esprit ne sont JAMAIS des personnages "
                       "(la lumière, une voix citée, le vent, le feu, la colombe)")
    for nom, l in list(lieux.items()) + [(f"plan {i + 1}", p) for i, p in enumerate(plans)]:
        for c in (l.get("couches") or []) + (l.get("objets") or []):
            if c.get("svg"):
                try:
                    xml.dom.minidom.parseString(c["svg"] if c["svg"].lstrip().startswith("<") else "<g/>")
                except Exception as e:                       # noqa: BLE001
                    err.append(f"{nom} : SVG invalide ({c.get('fichier', 'svg')}) — {e}")
    for nom, l in list(lieux.items()) + [(f"plan {i + 1}", p) for i, p in enumerate(plans)]:
        for c in (l.get("couches") or []) + (l.get("objets") or []):
            if c.get("gen") and c["gen"] not in GENERATEURS:
                err.append(f"{nom} : générateur « {c['gen']} » inconnu — générateurs : {', '.join(sorted(GENERATEURS))}")
            if c.get("gen") == "objet" and c.get("type") not in OBJETS:
                err.append(f"{nom} : objet « {c.get('type')} » inconnu — objets : {', '.join(sorted(OBJETS))}")
            if not c.get("gen") and not c.get("svg") and not c.get("fichier"):
                err.append(f"{nom} : une couche/un objet sans « gen » ni « svg »")
    for nom, l in lieux.items():
        couches = l.get("couches") or []
        if any(c.get("gen") == "piece" and c.get("plafond") is False for c in couches) and not any(c.get("gen") == "ciel" for c in couches):
            alerte.append(f"lieu {nom} : une pièce sans plafond ni ciel — on voit du vide au-dessus du mur (\"plafond\": \"#…\", ou un ciel si c'est une cour)")
    for nom, l in lieux.items():                     # une clé que le moteur ne lit pas serait ignorée sans bruit
        for k in sorted(set(l) - CLES_LIEU):
            err.append(f"lieu {nom} : « {k} » n'est pas une clé de lieu (le moteur l'ignorerait) — clés : {', '.join(sorted(CLES_LIEU))}")
    controle_types(lieux, plans, err)
    controle_monde(lieux, plans, alerte)
    controle_ouvertures(lieux, plans, alerte)
    controle_sources(lieux, plans, alerte)
    controle_cadres(plans, alerte)
    sans_texte = 0
    for i, p in enumerate(plans, 1):
        if p.get("lieu") and p["lieu"] not in lieux:
            err.append(f"plan {i} : lieu « {p['lieu']} » non défini dans \"lieux\"")
        if not p.get("lieu") and not p.get("couches"):
            err.append(f"plan {i} : ni lieu ni couches — le plan serait vide")
        for ac in p.get("acteurs", []) or []:
            if ac.get("id") not in perso:
                err.append(f"plan {i} : personnage « {ac.get('id')} » non décrit dans \"personnages\"")
            for x in ac.get("actions", []) or []:
                if isinstance(x.get("pose"), str) and x["pose"] not in FILM_POSES:
                    alerte.append(f"plan {i} : pose « {x['pose']} » inconnue (poses : moteur-film.md) — ou donner les "
                                  "angles dans \"angles\"")
        ids = {a.get("id") for a in p.get("acteurs", []) or []}
        for g in p.get("graphiques", []) or []:
            if g.get("type") not in TYPES_GRAPHIQUES:
                err.append(f"plan {i} : graphisme « {g.get('type')} » inconnu — types : {', '.join(sorted(TYPES_GRAPHIQUES))}")
            if g.get("sur") and g["sur"] not in ids:
                err.append(f"plan {i} : graphisme « {g.get('type')} » sur « {g['sur']} », qui n'est pas un acteur de ce plan")
            if g.get("type") in ("pensee",) and isinstance(g.get("acteur"), dict) and g["acteur"].get("id") not in perso:
                err.append(f"plan {i} : bulle de pensée avec « {g['acteur'].get('id')} », personnage non décrit")
        for k in ("camera",):
            for key in p.get(k) or []:
                for c in ([key["cadre"]] if isinstance(key.get("cadre"), str) else key.get("cadre") or []):
                    if c not in ids:
                        err.append(f"plan {i} : la caméra cadre « {c} », qui n'est pas un acteur de ce plan")
        jesus = {c.get("ref") for c in p.get("cite") or [] if c.get("qui") == "jesus"}
        for g in p.get("graphiques") or []:
            if g.get("type") in ("verset", "citation") and "JÉSUS" in (g.get("entete") or "").upper() and g.get("ref") not in jesus:
                err.append(f"plan {i} : la carte « {g.get('entete')} » attribue à Jésus {g.get('ref')} — déclarer "
                           f"\"cite\": [{{\"ref\": \"{g.get('ref')}\", \"qui\": \"jesus\"}}] si ce sont ses paroles, sinon changer l'en-tête")
        if not p.get("texte"):
            sans_texte += 1
            continue
        phrases = V._phrases(p["texte"])
        if len(phrases) > 2:
            alerte.append(f"plan {i} : {len(phrases)} phrases — une phrase = une image (couper en plans, ou ajouter "
                          "des coupes de caméra / gestes au mot)")
        d = p["duree"]
        if d > 5.5 and len(p.get("camera") or []) < 2 and not any(len((x.get("actions") or [])) > 1
                                                                  for x in p.get("acteurs", []) or [])                 and not any(anime_a_la_voix(g) for g in p.get("graphiques", []) or []):
            alerte.append(f"plan {i} : {d:.1f} s sans mouvement de caméra ni geste — l'image doit vivre")
        if not (p.get("acteurs") or p.get("objets") or p.get("graphiques")):
            alerte.append(f"plan {i} : aucun personnage, objet ni graphisme — ce que dit la phrase doit se VOIR")
    # le message : on réutilise les contrôles de la chaîne (citations, Jésus, appâts, porte ouverte…)
    sc = []
    for i, p in enumerate(plans):
        evs = [{"t": 0, "type": "_film"}]
        for j, g in enumerate(p.get("graphiques", []) or []):
            if g.get("type") in ("verset", "citation"):
                evs.append({"type": "verset", "ref": g.get("ref"), "texte": g.get("texte", ""), "_texte_donne": (i, j) in donnes})
        # les plans d'aujourd'hui (la vie du spectateur) et l'invitation ne racontent pas la Bible : pas d'« appui »
        hors_recit = p.get("registre") in ("aujourdhui", "invitation") or p.get("fin")
        sc.append({"texte": p.get("texte", ""), "cite": p.get("cite"), "appui": p.get("appui"),
                   "pont": p.get("pont") or hors_recit,
                   "type": "fin" if p.get("fin") else None, "evenements": evs, "acteurs": [],
                   "fin": p.get("fin") if isinstance(p.get("fin"), dict) else {}})
    ep = {"type_video": film.get("type_video", "recit"), "passage": film.get("passage"), "pont": film.get("pont"),
          "casting": {k: {} for k in perso}, "temoignage": film.get("temoignage")}
    V.verifier_foi(ep, sc, tms, total, err, alerte)
    alerte = [x for x in alerte if "rien ne bouge" not in x]
    nb = len(plans) - sans_texte
    moy = total / max(nb, 1)
    print(f"{len(plans)} plans · {sum(EP.mots(s) for s in sc)} mots · durée estimée {total:.1f} s "
          f"(cible {EP.CIBLE_MIN:.0f}–{EP.CIBLE_MAX:.0f} s) · une image toutes les {moy:.1f} s")
    alerte += notes
    for e in err:
        print("ERREUR :", e)
    for x in alerte:
        print("ALERTE :", x)
    if not err and not alerte:
        print("Tout est bon.")
    score = max(0, 100 - 25 * len(err) - min(40, 4 * len(alerte)))
    print(f"SCORE : {score}/100  " + ("✅ prêt pour l'aperçu puis le rendu" if not err and score >= 80 else
                                       "❌ corriger les erreurs" if err else "⚠ relire les alertes"))
    if not err:
        base = os.path.splitext(os.path.abspath(a.film))[0]
        epv = {"scenes": [{"texte": p.get("texte", "")} for p in plans]}
        open(base + "_voix.txt", "w", encoding="utf-8").write(EP.texte_voix(epv))
        open(base + "_voix_elevenlabs.txt", "w", encoding="utf-8").write(EP.texte_voix(epv, balises=True))
        print(f"Texte pour la voix : {base}_voix_elevenlabs.txt")
    sys.exit(1 if err else 0)


# ------------------------------------------------------------------ le monde logique (sans rien dessiner)
POSES_AU_SOL = {"meuble", "arbre", "rochers", "batiment", "volume", "animal", "auge", "feu", "accessoire", "puits", "tombeau",
                "croix", "temple"}
# longueur habituelle d'un animal (px, au y de référence, un adulte debout ≈ 460 px) ; alerte hors de ×0,5 – ×2
# un graphisme qui vit avec la voix (des lieux qui s'allument, un trajet qui se dessine, des points qui arrivent) : l'image vit
ANIMES_A_LA_VOIX = {"frise", "liste", "texte", "compare", "chiffre"}


def anime_a_la_voix(g):
    return g.get("type") in ANIMES_A_LA_VOIX or (g.get("type") == "carte" and bool(g.get("lieux") or g.get("trajet")))


# hauteur habituelle des meubles à y_ref (un adulte ≈ 460 px ≈ 175 cm) : une assise doit être à la hauteur où un
# personnage s'assoit, sinon il flotte au-dessus ou s'enfonce dedans
HAUTEUR_MEUBLE = {"canape": 224, "chaise": 237, "banc": 118, "table": 197, "bureau": 197, "lit": 170, "commode": 237, "etagere": 470}
ECHELLE_MEUBLE = (.8, 1.25)
SIEGES = {"canape", "chaise", "banc", "lit", "caisse", "boite"}
SIEGES_OBJETS = {"banc_eglise": 250, "siege_bus": 48, "lit_hopital": 205, "abribus": 320}      # largeur en cm
CM = 460 / 175                        # px par centimètre à y_ref (decors.js)
POSES_SUR_SIEGE = {"assis", "pleure_assis"}
CLES_LIEU = {"heure", "sol", "lumiere", "couches", "objets", "panneau", "etalonnage", "couvert", "ambiance", "nom", "note"}
TAILLE_ANIMAL = {"coq": 80, "poule": 65, "porc": 300, "mouton": 300, "agneau": 180, "chevre": 280, "ane": 400, "cheval": 560, "chien": 200, "boeuf": 560,
                 "chameau": 700}
ECHELLE_PERSO = (.75, 1.3)          # un adulte vaut 1 ; un enfant se décrit par son âge, pas par son échelle


MEMES_CADRES = 3                      # autant de plans de suite avec la même image = une vidéo figée


def controle_cadres(plans, alerte):
    """Trois plans de suite dans le même lieu, sur les mêmes personnes, au même cadre : l'œil s'endort."""
    suite, prec = [], None
    for i, p in enumerate(plans, 1):
        k0 = (p.get("camera") or [{}])[0]
        cadre = k0.get("cadre")
        cle = (p.get("lieu"), tuple(sorted([cadre] if isinstance(cadre, str) else cadre)), k0.get("plan")) if cadre else None
        suite = suite + [i] if cle and cle == prec else [i]
        prec = cle
        if len(suite) == MEMES_CADRES:
            alerte.append(f"plans {suite[0]} à {i} : {MEMES_CADRES} fois la même image ({k0.get('plan')} sur {', '.join(cle[1])}) — "
                          "varier le cadre (celui qui parle, celui qui écoute, un détail)")


def controle_monde(lieux, plans, alerte):
    """Ce qui flotte (posé sur l'horizon ou au-dessus : dans le ciel) et les échelles qui ne tiennent pas."""
    def objets(nom, sol, liste):
        h = sol.get("horizon")
        for o in liste:
            y = o.get("y")
            if h is not None and y is not None and o.get("gen") in POSES_AU_SOL and y <= h + 5 and not o.get("y_sol"):
                alerte.append(f"{nom} : {o['gen']} posé à y {y}, sur l'horizon ({h}) ou au-dessus — il flotte dans le ciel")
            if o.get("gen") == "meuble" and o.get("type") in HAUTEUR_MEUBLE and o.get("h"):
                r = o["h"] / HAUTEUR_MEUBLE[o["type"]]
                if not ECHELLE_MEUBLE[0] <= r <= ECHELLE_MEUBLE[1]:
                    alerte.append(f"{nom} : {o['type']} de hauteur {o['h']} (habituel ≈ {HAUTEUR_MEUBLE[o['type']]} à y_ref) — "
                                  "un personnage assis flotterait au-dessus ou s'y enfoncerait")
            if o.get("gen") == "animal" and o.get("espece") in TAILLE_ANIMAL and o.get("taille"):
                r = o["taille"] / TAILLE_ANIMAL[o["espece"]]
                if not .5 <= r <= 2:
                    alerte.append(f"{nom} : {o['espece']} de taille {o['taille']} (habituel ≈ {TAILLE_ANIMAL[o['espece']]}) — "
                                  "échelle incohérente avec les personnages")
    for nom, l in lieux.items():
        objets(f"lieu {nom}", l.get("sol") or {}, (l.get("couches") or []) + (l.get("objets") or []))
    # assis sur une chaise (pas par terre) : il faut un siège sous lui, sinon il est assis dans le vide
    for i, p in enumerate(plans, 1):
        lieu = lieux.get(p.get("lieu")) or {}
        sieges = [o for o in (lieu.get("couches") or []) + (lieu.get("objets") or []) + (p.get("objets") or [])
                  if (o.get("gen") == "meuble" and o.get("type") in SIEGES) or o.get("gen") in ("rochers", "volume")
                  or (o.get("gen") == "objet" and o.get("type") in SIEGES_OBJETS)]
        for a in p.get("acteurs") or []:
            x = a.get("x", 540)
            for act in a.get("actions") or []:
                ang = act.get("angles") or {}
                sur_siege = act.get("pose") in POSES_SUR_SIEGE or (ang.get("assise") and ang.get("hanche_av", 90) < 120)
                if sur_siege and not any(o.get("x", 0) - 60 <= x <= o.get("x", 0) + o.get("l", SIEGES_OBJETS.get(o.get("type"), 300 / CM) * CM) + 60 for o in sieges):
                    alerte.append(f"plan {i} : {a.get('id')} est assis sans siège sous lui (pose « {act.get('pose')} ») — "
                                  "ajouter un meuble (banc, chaise, canapé, lit) ou des rochers, ou l'asseoir par terre (assis_sol…)")
                    break
    for i, p in enumerate(plans, 1):
        sol = dict((lieux.get(p.get("lieu")) or {}).get("sol") or {}, **(p.get("sol") or {}))
        objets(f"plan {i}", sol, (p.get("objets") or []) + (p.get("couches") or []))
        h = sol.get("horizon")
        for a in p.get("acteurs", []) or []:
            ys = [a.get("y")] + [x.get("y") for x in a.get("actions", []) or []]
            if h is not None and not a.get("porte_par") and a.get("perspective", True) is not False                     and any(y is not None and y <= h + 5 for y in ys):
                alerte.append(f"plan {i} : {a.get('id')} posé sur l'horizon ({h}) ou au-dessus — il flotte")
            e = a.get("echelle")
            if e is not None and not ECHELLE_PERSO[0] <= e <= ECHELLE_PERSO[1]:
                alerte.append(f"plan {i} : {a.get('id')} à l'échelle {e} — un adulte vaut 1 (un enfant se décrit par \"age\")")


# hauteurs d'un vrai lieu, en cm (un adulte ≈ 175) : une fenêtre au-dessus des têtes, une porte de quatre mètres, un cadre
# au plafond se voient tout de suite
APPUI_FENETRE, HAUT_FENETRE = (30, 125), 330
HAUT_PORTE, LARGE_PORTE = (185, 255), (65, 260)
ACCROCHES = {"cadre": 45, "horloge": 38, "miroir": 95, "tableau": 120}                   # ce qui se pend au mur : hauteur par défaut (cm)
CENTRE_ACCROCHE = (100, 270)
ECART_HORIZON = 8                     # px


def controle_ouvertures(lieux, plans, alerte):
    """Fenêtres, portes et cadres à hauteur d'homme ; l'eau qui va jusqu'au bout finit sur la ligne d'horizon du lieu."""
    def px_cm(sol, y):
        h, yr = sol.get("horizon"), sol.get("y_ref", 1060)
        return CM * (y - h) / max(1, yr - h) if h is not None and y > h else None

    def controle(nom, sol, liste):
        for o in liste:
            if o.get("gen") == "piece" and o.get("fond"):
                y1 = o["fond"][3]
                k = px_cm(sol, y1)
                if not k:
                    continue
                for fe in o.get("fenetres") or []:
                    bas, haut = (y1 - fe["y"] - fe["h"]) / k, (y1 - fe["y"]) / k
                    if not APPUI_FENETRE[0] <= bas <= APPUI_FENETRE[1] or haut > HAUT_FENETRE:
                        alerte.append(f"{nom} : fenêtre de {bas:.0f} à {haut:.0f} cm du sol (appui normal : {APPUI_FENETRE[0]}–{APPUI_FENETRE[1]} cm) — "
                                      f"par exemple \"y\": {y1 - 90 * k - 190 * k:.0f}, \"h\": {190 * k:.0f}")
                for po in o.get("portes") or []:
                    if po.get("h") and not HAUT_PORTE[0] <= po["h"] / k <= HAUT_PORTE[1] or po.get("l") and not LARGE_PORTE[0] <= po["l"] / k <= LARGE_PORTE[1]:
                        alerte.append(f"{nom} : porte de {po.get('l', 0) / k:.0f} × {po.get('h', 0) / k:.0f} cm — retirer \"l\" et \"h\" (taille réelle) ou écrire \"l\": {90 * k:.0f}, \"h\": {208 * k:.0f}")
            if o.get("gen") == "objet" and o.get("type") in ACCROCHES and o.get("y_sol") and o.get("y") is not None:
                k = px_cm(sol, o["y_sol"])
                if k:
                    haut = o["h"] / CM if o.get("h") else ACCROCHES[o["type"]]
                    centre = (o["y_sol"] - o["y"]) / k + haut / 2
                    if not CENTRE_ACCROCHE[0] <= centre <= CENTRE_ACCROCHE[1]:
                        alerte.append(f"{nom} : {o['type']} accroché à {centre:.0f} cm du sol (son milieu) — à hauteur d'homme : \"y\": {o['y_sol'] - (165 - haut / 2) * k:.0f}")
            h = sol.get("horizon")
            if o.get("gen") == "eau" and h is not None and o.get("profondeur", 1) >= 1 and abs(o.get("y", h) - h) > ECART_HORIZON:
                alerte.append(f"{nom} : l'eau s'arrête à y {o['y']} mais l'horizon du lieu est à {h} — une étendue d'eau finit sur l'horizon (une seule ligne d'horizon par lieu)")

    for nom, l in lieux.items():
        controle(f"lieu {nom}", l.get("sol") or {}, (l.get("couches") or []) + (l.get("objets") or []))
    for i, p in enumerate(plans, 1):
        controle(f"plan {i}", dict((lieux.get(p.get("lieu")) or {}).get("sol") or {}, **(p.get("sol") or {})), (p.get("objets") or []) + (p.get("couches") or []))


# un halo vient de quelque chose : une lampe, un feu, une fenêtre, un écran
SOURCES_OBJETS = {"applique", "abribus", "lampe_pied", "suspension", "tv", "ordinateur", "cierge", "vitrail", "guirlande", "moniteur"}
PORTEE_HALO = 330                     # px
TAILLE_ACCESSOIRE = {"coupe": 38, "pieces": 44, "lampe": 40, "bougie": 34, "pain": 46, "cruche": 110, "bourse": 50, "assiette": 50, "tasse": 28, "livre": 60, "telephone": 42, "panier": 100}


def controle_sources(lieux, plans, alerte):
    """Dans une pièce, une lumière sans lampe ; un accessoire trop grand pour une main."""
    for nom, l in lieux.items():
        tout = (l.get("couches") or []) + (l.get("objets") or [])
        ici = [o for p in plans if p.get("lieu") == nom for o in p.get("objets") or []]
        if not any(o.get("gen") == "piece" for o in tout):
            continue
        centres = [(o.get("x", 540), o.get("y", 1000)) for o in tout + ici if o.get("gen") in ("feu", "lampadaire") or o.get("gen") == "objet" and o.get("type") in SOURCES_OBJETS or o.get("gen") == "accessoire" and o.get("type") in ("lampe", "bougie")]
        for o in tout:
            for fe in o.get("fenetres") or []:
                centres.append((fe["x"] + fe["l"] / 2, fe["y"] + fe["h"] / 2))
        for o in tout:
            if o.get("gen") == "lumiere" and o.get("pos") and not any(((x - o["pos"][0]) ** 2 + (y - o["pos"][1]) ** 2) ** .5 < PORTEE_HALO for x, y in centres):
                alerte.append(f"lieu {nom} : un halo de lumière en {o['pos']} sans lampe, feu ni fenêtre — d'où vient-il ? (objet « applique », « lampe_pied », « suspension »…)")
    for i, p in enumerate(plans, 1):
        for o in (p.get("objets") or []) + ((lieux.get(p.get("lieu")) or {}).get("objets") or []):
            if o.get("gen") == "accessoire" and o.get("type") in TAILLE_ACCESSOIRE and o.get("taille"):
                r = o["taille"] / TAILLE_ACCESSOIRE[o["type"]]
                if not .5 <= r <= 1.7:
                    alerte.append(f"plan {i} : {o['type']} de taille {o['taille']} (habituel ≈ {TAILLE_ACCESSOIRE[o['type']]}) — trop {'grand' if r > 1 else 'petit'} pour une main")


MATIERES_MUR = {"enduit", "pierre", "brique", "bois", "lambris", "papier", "carrelage"}


def controle_types(lieux, plans, err):
    """Un type que le moteur ne connaît pas serait remplacé sans bruit par un autre (une boîte, un chêne, un mouton)."""
    for nom, l in [(f"lieu {n}", x) for n, x in lieux.items()] + [(f"plan {i}", p) for i, p in enumerate(plans, 1)]:
        for o in (l.get("couches") or []) + (l.get("objets") or []):
            g = o.get("gen")
            for cle, connus, quand in (("type", MEUBLES | {"boite"}, g == "meuble"), ("espece", ARBRES, g == "arbre"), ("espece", ANIMAUX, g == "animal"), ("matiere", MATIERES_SOL, g == "sol")):
                if quand and o.get(cle) and o[cle] not in connus:
                    err.append(f"{nom} : {g} « {o[cle]} » inconnu — {', '.join(sorted(connus))}")
            if g == "piece":
                for partie, connus in (("mur", MATIERES_MUR), ("sol", MATIERES_SOL)):
                    m = (o.get(partie) or {}).get("matiere")
                    if m and m not in connus:
                        err.append(f"{nom} : matière de {partie} « {m} » inconnue — {', '.join(sorted(connus))}")


def _poses():
    js = open(os.path.join(ICI, "film", "web", "rig.js"), encoding="utf-8").read()
    bloc = js[js.index("const POSES = {"):js.index("const MAINS")]
    return set(re.findall(r"^\s{4}(\w+):", bloc, re.M)) | set(re.findall(r"[{,]\s*(\w+): \{", bloc))


def _js(nom):
    with open(os.path.join(ICI, "film", "web", nom), encoding="utf-8") as f_:
        return f_.read()


def _generateurs():
    gens = set()
    for f_ in sorted(os.listdir(os.path.join(ICI, "film", "web"))):
        if f_.endswith(".js"):
            gens |= set(re.findall(r"GEN\.(\w+) = ", _js(f_)))
    return gens


def _cles(nom, debut):
    """Les clés (une par ligne, retrait de 4) d'un tableau du moteur : rien n'est recopié ici."""
    js = _js(nom)
    bloc = js[js.index(debut):]
    return set(re.findall(r"^    (\w+)(?:: |\()", bloc[:bloc.index("\n  };")], re.M))


GENERATEURS = _generateurs()
OBJETS = _cles("decors.js", "const OBJETS = {")
MEUBLES = _cles("interieur.js", "const MEUBLES = {")
ARBRES = (_cles("nature.js", "const ESPECES = {") - {"defaut"}) | {"chene", "pin", "figuier"}
ANIMAUX = _cles("animaux.js", "const ESPECES = {") | {"colombe", "oiseau", "coq", "poule"}
MATIERES_SOL = _cles("sols.js", "const MATIERES = {")
TYPES_GRAPHIQUES = {"verset", "citation", "titre", "lieu", "mot", "texte", "liste", "compare", "icone", "note", "cercle", "fleche",
                    "chiffre", "etiquette", "html", "badge", "ruban", "bulle", "pensee", "ondes", "goutte", "coeur", "traits",
                    "telephone", "fin", "carte", "frise", "definition"}
FILM_POSES = _poses()

if __name__ == "__main__":
    principal()

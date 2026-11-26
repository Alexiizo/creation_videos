#!/usr/bin/env python3
"""Le réalisateur automatique : à partir du texte, du registre et du lieu de chaque plan, il PROPOSE la mise en scène
— cadrages (situer → agir → émouvoir, la caméra qui pousse, une coupe au mot d'action), poses et gestes au mot,
visages, regards, petits signes d'émotion (ondes, goutte, cœur, pensée), transitions — dans les règles du moteur
(references/moteur-film.md). Il ne remplace rien de ce qui est déjà écrit : il COMPLÈTE. Claude relit et corrige
(c'est une proposition, pas un jugement), puis regarde l'aperçu.

    python3 scripts/realisateur.py videos/v04/video.json              → video.propose.json + le compte rendu
    python3 scripts/realisateur.py videos/v04/video.json --appliquer  → complète video.json lui-même
    python3 scripts/realisateur.py videos/v04/video.json --evaluer    → efface la mise en scène d'une copie, la refait,
                                                                        compare à celle écrite à la main
Ce qu'il lui faut : les "acteurs" de chaque plan (qui est là, où : x, y, sens) ; le reste se propose.
"""
import argparse
import copy
import json
import os
import re
import sys
import unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from noyau import lire_json  # noqa: E402
from noyau import mots as TX  # noqa: E402

# ------------------------------------------------------------------ le lexique (motifs sans accents, en minuscules)
# les gestes : (motifs, pose) — le premier motif trouvé dans le texte donne la pose, AU MOT où il est dit
GESTES = [
    (("serre dans ses bras", "se jeta a son cou", "se jette a son cou", "prend dans ses bras", "embrasse", "enlace"), "enlace"),
    (("court", "courut", "se precipite", "accourt"), "court"),
    (("tend la main", "tendit la main", "reclame", "demande sa part"), "tend_main"),
    (("le releve", "la releve", "relever"), "tend_main_bas"),
    (("se leve", "leverai", "se leva", "se relever", "debout"), "debout"),
    (("a genoux", "s'agenouille", "se prosterne"), "a_genoux"),
    (("prie", "priere", "dis-lui", "parle-lui"), "prie"),
    (("pleure", "larmes", "sanglote"), "mains_visage"),
    (("tombe ", "s'effondre"), "tombe"),
    (("leve les yeux", "vers le ciel", "regarde le ciel"), "regarde_haut"),
    (("baisse la tete", "tete basse"), "tete_baissee"),
    (("accueille", "ouvre les bras", "bras ouverts", "une fete", "fait la fete", "depense"), "bras_ouverts"),
    (("raconte", "enseigne", "explique", "montre"), "enseigne"),      # « Jésus montre comment… » : il enseigne
    (("benit",), "benit"),
    (("montre du doigt", "designe"), "pointe"),
    (("telephone", "ecran", "message", "scrolle"), "telephone"),
    (("marche", "rentre", "revient", "part ", "s'en va", "avance", "retourne"), "marche"),
    (("voit", "regarde", "apercoit"), "regarde"),
    (("assis", "s'assoit"), "assis_sol"),
]
MOUVEMENTS = {"marche": 300, "court": 360}               # px parcourus (vers où il regarde)
# les gestes d'un instant : au plan suivant, on revient à la posture (on ne garde pas la main tendue d'un plan à l'autre)
MOMENTANES = {"marche", "court", "tombe", "tend_main", "tend_main_bas", "pointe", "benit", "salue", "montre_haut"}
NON_HUMAINS = ("vent", "mer", "tempete", "vague", "vagues", "pluie", "nuit", "soleil", "barque", "feu", "eau", "lac")
# le danger : tous ont peur (sauf Jésus, calme et digne dans la tempête)
DANGER = ("tempete", "orage", "vagues", "naufrage", "perissons", "on coule", "danger", "incendie")
# l'apaisement : ceux qui avaient peur sont soulagés (le danger et l'apaisement ne valent que dans le récit :
# « ta tempête » au présent est une image, pas un danger)
APAISEMENT = ("calme", "silence", "s'apaise", "apaise", "paix", "vent tombe", "vent cesse")
# les émotions : (motifs, visage) — dans l'ordre de force ; le visage vaut pour tout le plan
EMOTIONS = [
    (("pleure", "larmes", "sanglote", "mort", "deuil"), "pleure"),
    (("panique", "terreur", "terrifie"), "terreur"),
    (("angoisse", "peur", "effraye", "stress", "deux heures du matin", "2 h du matin"), "peur"),
    (("honte", "coupable", "indigne"), "honte"),
    (("trop loin", "erreur", "echec", "gache", "perdu", "vide", "famine", "faim", "seul", "solitude", "plus bas", "ne plus revenir"), "triste"),
    (("inquiet", "doute", "tu te dis", "tu crois", "loin de dieu"), "inquiet"),
    (("epuise", "fatigue", "n'en peux plus"), "fatigue"),
    (("une fete", "fete", "joie", "heureux", "rire", "danse", "depense"), "joie"),
    (("serre dans ses bras", "se jeta a son cou", "embrasse"), "pleure"),          # les retrouvailles se font en larmes (Gn 33:4, 45:14)
    (("aime", "amour", "tendresse", "pardon"), "tendre"),
    (("paix", "calme", "repos", "simplement", "prie"), "paix"),
    (("surpris", "soudain", "voit arriver", "de loin"), "surprise"),
    (("leverai", "se leve", "decide", "je reviens", "revenir"), "determine"),
]
NEGATIFS = {"pleure", "terreur", "peur", "honte", "triste", "inquiet", "fatigue"}
FORTES = {"pleure", "terreur", "peur", "honte", "joie", "tendre", "emerveille"}      # elles appellent le gros plan
BASCULES = {"determine", "surprise"}       # une émotion qui ARRIVE (« je me lèverai », « il le voit ») : au mot, pas avant
GESTES_LARGES = {"marche", "court", "debout", "a_genoux", "assis_sol", "tombe"}      # le corps bouge ou change de hauteur
INTERACTIONS = {"enlace", "blotti", "tend_main", "tend_main_bas"}
POSITIFS = {"joie", "tendre", "paix", "doux", "soulage", "emerveille", "rire"}
VISAGE_REGISTRE = {"aujourdhui": "inquiet", "recit": "neutre", "explication": "doux", "invitation": "doux"}
# les petits signes : (motifs, type) — un seul par plan, sur le personnage principal
SIGNES = [
    (("tu te dis", "se dit", "tu t'es deja dit", "pense", "se demande", "souvenir", "loin de dieu"), "pensee"),
    (("angoisse", "panique", "stress", "tout s'effondre", "deux heures du matin"), "ondes"),
    (("honte", "erreur", "gene", "coupable", "gache"), "goutte"),
    (("coeur", "aime", "amour", "serre dans ses bras", "bat"), "coeur"),
]
ICONES_PENSEE = [(("dieu", "eglise", "priere"), "church"), (("maison", "pere", "famille", "revenir"), "house"),
                 (("argent", "heritage", "part"), "coins"), (("telephone", "message"), "smartphone")]
LUMIERES = {"lumiere"}             # un objet qui n'est qu'une lumière (l'écran, une lampe) : rien à montrer en large
TYPES_SIGNES = {"ondes", "goutte", "coeur", "pensee", "bulle", "traits"}
# à moins de ça (px du monde) du sujet, un voisin entre dans l'image : on le cadre avec lui (jamais coupé en deux au bord)
VOISINAGE = 420
# … et pour cadrer quelqu'un SEUL, ses voisins doivent être au moins à cette distance (px du monde), selon le plan
ISOLE = {"moyen": 340, "americain": 300, "serre": 250}
FAMILLES = {"ensemble": "loin", "large": "loin", "moyen": "milieu", "americain": "milieu", "serre": "pres", "visage": "pres"}


# une citation (« … » de la Bible, “ … ” des autres) : ce qu'on y dit n'est pas ce que fait le récit
CITATION = re.compile(r"«[^»]*»?|“[^”]*”?")


def sans_accents(s):
    return unicodedata.normalize("NFD", s.lower().replace("’", "'")).encode("ascii", "ignore").decode()


def trouve(texte_n, motifs):
    """Le premier motif présent (position la plus tôt), ou None : (position, motif)."""
    best = None
    for m in motifs:
        # toujours en DÉBUT de mot (« pense » ne se trouve pas dans « dépense ») ; l'index tombe sur le début du mot
        i = (" " + re.sub(r"[^a-z0-9' -]", " ", texte_n) + " ").find(" " + m)
        if i >= 0 and (best is None or i < best[0]):
            best = (i, m)
    return best


def mot_a(texte, pos_n):
    """Le mot du texte (tel qu'il est écrit) qui commence à la position pos_n du texte sans accents."""
    propre = TX.nettoyer(texte)
    # même longueur : les accents retirés ne changent pas le nombre de lettres de base (NFD puis ascii)
    mots = list(re.finditer(r"[\w'’-]+", propre))
    n = 0
    for m in mots:
        n = len(sans_accents(propre[:m.start()]))
        if n >= pos_n - 1:
            w = m.group(0).split("'")[-1].split("’")[-1]
            return w
    return mots[-1].group(0) if mots else None


def posture(actions):
    """La posture où finit un personnage : sa dernière pose, ses derniers angles (assis…), sa dernière orientation."""
    p = {"pose": next((x["pose"] for x in reversed(actions) if x.get("pose")), "debout")}
    for cle in ("angles", "vue"):
        v = next((x[cle] for x in reversed(actions) if cle in x), None)
        if v is not None:
            p[cle] = v
    return p


class Realisateur:
    def __init__(self, film):
        self.film = film
        self.persos = film.get("personnages", {})
        self.derniere_pose = {}          # (id, lieu) → posture : la continuité d'un plan à l'autre dans le même lieu
        self.dernier_visage = {}         # id → visage : l'émotion d'un personnage continue tant que le texte n'en dit pas une autre
        self.sujet_precedent = None
        self.lieux_vus = set()
        self.cameras = []                # les derniers cadres (lieu, qui, comment) : on ne montre pas deux fois la même image de suite
        self.compte_rendu = []

    def retenir_visage(self, ident, actions):
        """L'émotion de fond du personnage continue au plan suivant ; une bascule (décision, surprise) ne se prolonge pas,
        les yeux fermés (il dort) non plus."""
        fond = next((x["visage"] for x in reversed(actions) if x.get("visage") and x["visage"] not in BASCULES | {"yeux_fermes"}), None)
        if fond:
            self.dernier_visage[ident] = fond

    def parleur(self, p, sujet):
        """Celui dont la carte porte la parole (« MARTHE DIT », « JÉSUS DEMANDE ») ; sinon le sujet de la phrase."""
        for g in p.get("graphiques", []):
            if g.get("type") in ("citation", "verset"):
                entete = sans_accents(g.get("entete") or "")
                for a in p.get("acteurs", []):
                    if any(len(x) > 2 and x in entete for x in a["id"].split("_")):
                        return a["id"]
        return sujet

    def varier(self, lieu, cadre, debut, fin, ids, sujet):
        """Jamais deux fois de suite la même image dans le même lieu : on passe sur celui qui agit, puis sur celui qui
        écoute (le contrechamp), puis on s'éloigne."""
        def cle(c, d):
            return (lieu, tuple(sorted([c] if isinstance(c, str) else c)), d)
        recents = [k for k in self.cameras[-2:] if k[0] == lieu]
        if cle(cadre, debut) not in recents:
            return cadre, debut, fin
        autre = next((x for x in ids if x != sujet), None)
        seul = [(sujet, "americain", "americain"), (autre, "serre", "serre"), (sujet, "serre", "serre")]
        essais = [e for e in seul if e[0] and self.isole(e[0], e[1])] + [(ids if autre else sujet, "moyen", "americain"), (ids if autre else sujet, "large", "moyen"), (ids if autre else sujet, "americain", "americain")]
        return next((e for e in essais if cle(e[0], e[1]) not in recents), (cadre, debut, fin))

    def isole(self, ident, plan):
        """Peut-on cadrer cette personne SEULE à ce plan, sans couper un voisin en deux au bord de l'arche ?"""
        xs = self.positions
        return all(abs(x - xs[ident]) >= ISOLE[plan] for i, x in xs.items() if i != ident)

    def sujet(self, p, texte_n, hors_citation):
        """hors_citation : le texte sans accents ni citations (« mon fils… » ne fait pas du fils le sujet)."""
        ids = [a["id"] for a in p.get("acteurs", [])]
        if re.match(r"^(et |mais |alors |puis )?(il|elle)\b", hors_citation.strip()) and self.sujet_precedent in ids:
            return self.sujet_precedent                             # « Et il dit » : celui dont on parlait
        for i in ids:
            if any(len(x) > 2 and re.search(r"\b" + re.escape(sans_accents(x)) + r"\b", hors_citation) for x in i.split("_")):
                return i
        jesus = [i for i in ids if "jesus" in i]
        autres = [i for i in ids if i not in jesus]
        if re.search(r"\b(il|elle|tu|son|sa)\b", texte_n) and autres:
            return autres[0]
        return ids[0] if ids else None

    def visages(self, texte_n, p, sujet):
        """(visage du début, (visage de bascule, position) ou None) : l'émotion la plus FORTE nommée dans le texte ;
        sinon celle que le personnage avait déjà ; une émotion de bascule s'applique au mot où elle arrive."""
        debut, bascule = None, None
        for ms, v in EMOTIONS:                        # dans l'ordre de force
            e = trouve(texte_n, ms)
            if not e:
                continue
            if v in BASCULES:
                bascule = bascule or (v, e[0])
            elif debut is None:
                debut = v
        if debut is None and p.get("registre") == "invitation":
            debut = "doux"                                           # la porte ouverte se dit avec douceur
        if debut is None:
            debut = self.dernier_visage.get(sujet) or ("doux" if sujet and "jesus" in sujet else VISAGE_REGISTRE.get(p.get("registre"), "neutre"))
        return debut, bascule

    def proposer(self, i, p, precedent):
        texte = p.get("texte", "")
        tn = sans_accents(TX.nettoyer(texte))
        hors = sans_accents(CITATION.sub(" ", TX.nettoyer(texte)))     # (sans_accents efface aussi les guillemets : on coupe avant)
        lieu = p.get("lieu")
        notes = []
        ids = [a["id"] for a in p.get("acteurs", [])]
        sujet = self.sujet(p, tn, hors)
        # aujourd'hui, la Bible citée au « tu » (« Il essuiera toute larme… ») n'est pas l'émotion du personnage : on la lit
        # hors des citations ; dans le récit, une citation est la parole d'un personnage, son émotion compte
        visage, bascule = self.visages(hors if p.get("registre") in ("aujourdhui", "invitation") else tn, p, sujet)
        if sujet and "jesus" in sujet and visage in ("rire", "terreur"):
            visage = "doux"                                   # Jésus toujours digne
        geste = trouve(tn, [m for ms, _ in GESTES for m in ms])
        if geste and re.search(r"\b(" + "|".join(NON_HUMAINS) + r")\s+(\w+\s+)?$", tn[:geste[0]]):
            geste = None                                     # « le vent tombe » : c'est le vent qui tombe, pas Jésus
        pose_geste = next((po for ms, po in GESTES if geste and geste[1] in ms), None)
        danger = trouve(tn, DANGER) if p.get("registre") == "recit" else None
        # « Silence ! » dit par Jésus n'est pas encore le calme : l'apaisement se lit dans le récit, hors des citations
        apaise = trouve(hors, APAISEMENT) if p.get("registre") == "recit" else None
        mot_geste = mot_a(texte, geste[0]) if geste else None
        # --- les acteurs : pose de départ (continuité), geste au mot, visage, regard
        for a in p.get("acteurs", []):
            if a.get("actions"):
                if any(x.get("pose") for x in a["actions"]):
                    self.derniere_pose[(a["id"], lieu)] = posture(a["actions"])
                self.retenir_visage(a["id"], a["actions"])         # ce qu'on a écrit à la main continue aussi
                continue
            # la continuité : la même posture (assis sur le lit reste assis, tourné pareil) — sinon debout
            # (un téléphone en main : il le regarde) ; un geste d'un instant revient à la posture
            suite = dict(self.derniere_pose.get((a["id"], lieu)) or
                         {"pose": "telephone" if self.persos.get(a["id"], {}).get("tient") == "telephone" else "debout"})
            if suite["pose"] in MOMENTANES:
                suite["pose"] = "debout"
                if not (suite.get("angles") or {}).get("assise"):
                    suite.pop("angles", None)
            v_autre = self.dernier_visage.get(a["id"]) or ("doux" if "jesus" in a["id"] else "neutre")
            v = visage if a["id"] == sujet else v_autre
            if danger and "jesus" not in a["id"]:
                v = "peur"                                          # le danger : tous ont peur
            elif apaise and a["id"] != sujet and v in NEGATIFS:
                v = "soulage"                                       # le calme revient : ils respirent
            acts = [dict({"t": 0, "visage": v}, **suite)]
            autres = [x for x in ids if x != a["id"]]
            if p.get("registre") == "invitation" and a["id"] == sujet:
                acts[0]["regarde"] = "camera"                 # la porte ouverte : il nous regarde
            elif autres:
                acts[0]["regarde"] = autres[0]
            partenaire = next((x for x in ids if x != sujet), None)
            if pose_geste == "enlace" and partenaire and a["id"] in (sujet, partenaire):
                acts = [{"t": 0, "pose": "enlace", "visage": visage}] if a["id"] == sujet else \
                    [{"t": 0, "pose": "tete_baissee", "visage": visage}, {"mot": mot_geste, "pose": "blotti", "visage": visage, "transition": .6}]
            elif a["id"] == sujet and pose_geste and pose_geste != "regarde":
                g = {"mot": mot_geste, "pose": pose_geste} if geste[0] > 3 else None
                if pose_geste in MOUVEMENTS:
                    dx = MOUVEMENTS[pose_geste] * (a.get("sens", 1) or 1)
                    # le mouvement dure tout le plan (sa durée s'estime au débit de la voix, comme le fera film.py)
                    duree = max(1.5, len(tn.split()) / float(self.film.get("mots_par_seconde", 3.0)) + .8)
                    acts = [{"t": 0, "pose": pose_geste, "visage": visage, "x": max(-150, min(1230, (a.get("x", 540)) + dx)), "duree": round(duree, 1)}]
                elif g:
                    if pose_geste not in GESTES_LARGES:       # le geste se fait dans la même posture (assis, il reste assis)
                        g.update({k: v for k, v in suite.items() if k == "vue" or (k == "angles" and v.get("assise"))})
                    acts.append(g)
                else:
                    acts[0]["pose"] = pose_geste
            if a["id"] == sujet and bascule and bascule[1] > 3:
                mb = mot_a(texte, bascule[1])
                ag = next((x for x in acts if x.get("mot") == mb), None)
                if ag:
                    ag["visage"] = bascule[0]
                else:
                    acts.append({"mot": mb, "visage": bascule[0]})
            a["actions"] = acts
            self.derniere_pose[(a["id"], lieu)] = posture(acts)
            self.retenir_visage(a["id"], acts)
            notes.append(f"{a['id']} : " + " → ".join((x.get('pose') or x.get('visage')) + (f" au mot « {x['mot']} »" if 'mot' in x else "") for x in acts) +
                         f" ({acts[0].get('visage')}" + (f", regarde {acts[0]['regarde']}" if acts[0].get("regarde") else "") + ")")
        # --- la caméra : situer → agir → émouvoir
        if not p.get("camera") and ids:
            xs = {a["id"]: a.get("x", 540) for a in p.get("acteurs", [])}
            cible = ids if len(ids) <= 2 else [x for x in ids if abs(xs[x] - xs.get(sujet, 540)) < VOISINAGE]
            cadre = cible[0] if len(cible) == 1 else cible
            self.positions = xs
            nouveau_lieu = lieu not in self.lieux_vus
            graphe = {g.get("type") for g in p.get("graphiques", [])}
            signe = trouve(tn, [m for ms, t in SIGNES if t == "pensee" for m in ms])
            # la grammaire : situer (large) → agir (moyen) → émouvoir (serré) ; on voit ce qui bouge et ce qui est là
            libre = False                                            # un cadre imposé par ce qu'il y a à montrer ne se varie pas
            if ("citation" in graphe or "verset" in graphe) and pose_geste not in MOUVEMENTS:
                debut, fin = "moyen", "moyen"                        # de la place pour la carte, le visage au-dessus
                qui = self.parleur(p, sujet)
                if len(ids) >= 2 and not nouveau_lieu and self.isole(qui, "americain"):      # on sait qui est là : on montre celui qui parle
                    cadre, debut, fin = qui, "americain", "americain"
                elif len(ids) == 1 and self.cameras and self.cameras[-1] == (lieu, (ids[0],), "moyen"):
                    debut, fin = "americain", "americain"
            elif pose_geste in MOUVEMENTS or pose_geste in GESTES_LARGES:
                debut, fin = "large", "large"                        # le corps bouge ou change de hauteur : on le voit entier
            elif i == 0:
                debut, fin = "americain", "serre"                    # l'accroche : dès la 1re image un visage lisible, la caméra pousse
            elif graphe & {"liste", "compare", "texte"}:
                debut, fin = "ensemble", "ensemble"                  # le texte occupe le haut : les personnages petits, en bas
            elif "note" in graphe or any(o.get("gen") not in LUMIERES for o in p.get("objets", [])):
                debut, fin = "large", "large"                        # il y a quelque chose à voir (ou à annoter) dans le lieu
            elif pose_geste in INTERACTIONS and len(ids) >= 2:
                debut, fin = "large", "moyen"                        # deux personnes qui se touchent : en pied, puis on approche
            elif nouveau_lieu or i == 0:
                debut, fin = "large", "moyen"                        # situer
            elif p.get("registre") == "invitation":                # la porte ouverte : on va vers le visage (une prière n'a pas besoin du large)
                debut, fin = ("large", "moyen") if pose_geste in GESTES_LARGES else ("moyen", "serre")
                libre = pose_geste not in GESTES_LARGES
            elif signe:
                debut, fin = "moyen", "moyen"                        # de la place pour la bulle de pensée
            elif len(tn.split()) <= 4 and visage in NEGATIFS:
                debut, fin = "serre", "serre"                        # la phrase-choc
            elif visage in FORTES and len(cible) == 1:
                debut, fin = "serre", "serre"                        # émouvoir
            else:
                debut, fin, libre = "moyen", "americain", True
            if libre:
                cadre, debut, fin = self.varier(lieu, cadre, debut, fin, cible, sujet)
            self.cameras.append((lieu, tuple(sorted([cadre] if isinstance(cadre, str) else cadre)), debut))
            cam = [{"t": 0, "cadre": cadre, "plan": debut}]
            if mot_geste and pose_geste not in MOUVEMENTS and pose_geste != "regarde" and geste[0] > 3 and len(tn.split()) >= 8:
                cam.append({"mot": mot_geste, "cadre": cadre, "plan": fin})      # on coupe au geste
            cam.append({"t": "fin", "cadre": cadre, "plan": fin})
            p["camera"] = cam
            notes.append(f"caméra : {debut} → {fin}" + (f" (au mot « {mot_geste} »)" if len(cam) == 3 else ""))
        # --- un petit signe d'émotion (un seul), sur le personnage principal
        # la carte EST déjà la pensée ; un badge, une liste, un téléphone occupent déjà la place d'une bulle
        cartes = {"citation", "verset", "badge", "ruban", "liste", "compare", "telephone", "texte"} & {g.get("type") for g in p.get("graphiques", [])}
        if sujet and not cartes and not ({g.get("type") for g in p.get("graphiques", [])} & TYPES_SIGNES) and p.get("registre") in ("aujourdhui", "recit") \
                and (self.persos.get(sujet, {}).get("traits") != "aucun"):
            s = trouve(tn, [m for ms, _ in SIGNES for m in ms])
            if s:
                typ = next(t for ms, t in SIGNES if s[1] in ms)
                g = {"type": typ, "sur": sujet}
                mot = mot_a(texte, s[0])
                if mot and s[0] > 3:
                    g["mot"] = mot
                if typ == "pensee":
                    g["icone"] = next((ic for ms, ic in ICONES_PENSEE if trouve(tn, ms)), "circle-help")
                if typ == "coeur":
                    g.update({"bpm": 120 if visage in NEGATIFS else 70, "couleur": "#b8432f"})
                p.setdefault("graphiques", []).append(g)
                notes.append(f"signe : {typ}" + (f" ({g['icone']})" if typ == 'pensee' else "") + (f" au mot « {g['mot']} »" if 'mot' in g else ""))
        # --- la transition : on change de monde (aujourd'hui ↔ récit) → fondu ; le temps passe → fondu
        if i > 0 and "transition" not in p and precedent is not None:
            change_monde = (precedent.get("registre") == "aujourdhui") != (p.get("registre") == "aujourdhui") and lieu != precedent.get("lieu")
            temps = re.match(r"^(puis|un jour|des annees|plus tard|le lendemain)\b", tn)
            if change_monde or (temps and lieu != precedent.get("lieu")):
                p["transition"] = "fondu"
                notes.append("transition : fondu")
        self.lieux_vus.add(lieu)
        self.sujet_precedent = sujet
        if notes:
            self.compte_rendu.append(f"plan {i + 1:02d} « {TX.nettoyer(texte)[:48]} » — " + " ; ".join(notes))

    def realiser(self):
        prec = None
        for i, p in enumerate(self.film.get("plans", [])):
            if p.get("texte") or p.get("acteurs"):
                self.proposer(i, p, prec)
            prec = p
        return self.film


# ------------------------------------------------------------------ évaluation (contre une mise en scène écrite à la main)
def effacer(film):
    f = copy.deepcopy(film)
    for p in f.get("plans", []):
        if not p.get("texte"):
            continue
        p.pop("camera", None)
        p.pop("transition", None)
        for a in p.get("acteurs", []):
            a.pop("actions", None)
        p["graphiques"] = [g for g in p.get("graphiques", []) if g.get("type") not in TYPES_SIGNES]
    return f


def valence(v):
    return "+" if v in POSITIFS else "-" if v in NEGATIFS else "0"


def evaluer(original):
    auto = Realisateur(effacer(original)).realiser()
    lignes, ok_cam, ok_vis, ok_pose, n_cam, n_vis, n_pose = [], 0, 0, 0, 0, 0, 0
    for i, (po, pa) in enumerate(zip(original["plans"], auto["plans"])):
        if not po.get("texte") or not po.get("acteurs"):
            continue
        fo = FAMILLES.get((po.get("camera") or [{}])[0].get("plan"))
        fa = FAMILLES.get((pa.get("camera") or [{}])[0].get("plan"))
        if fo:
            n_cam += 1
            ok_cam += fo == fa
        so = po["acteurs"][0]
        ao = next((a for a in pa["acteurs"] if a["id"] == so["id"]), {})
        vo = next((x.get("visage") for x in so.get("actions", []) if x.get("visage")), None)
        va = next((x.get("visage") for x in ao.get("actions", []) if x.get("visage")), None)
        if vo:
            n_vis += 1
            ok_vis += valence(vo) == valence(va)
        poses_o = {x.get("pose") for a in po["acteurs"] for x in a.get("actions", [])}
        poses_a = {x.get("pose") for a in pa["acteurs"] for x in a.get("actions", [])}
        g = trouve(sans_accents(TX.nettoyer(po.get("texte", ""))), [m for ms, _ in GESTES for m in ms])
        if g:
            n_pose += 1
            ok_pose += bool(poses_o & poses_a)
        lignes.append(f"plan {i + 1:02d}  caméra {fo or '-'}/{fa or '-'}  visage {vo}/{va}  poses {sorted(x for x in poses_o if x)} / {sorted(x for x in poses_a if x)}")
    pc = lambda a, b: f"{a}/{b} ({100 * a / max(b, 1):.0f} %)"
    return auto, lignes, {"caméra (même famille de plan)": pc(ok_cam, n_cam), "visage (même valence)": pc(ok_vis, n_vis),
                          "geste nommé dans le texte (même pose)": pc(ok_pose, n_pose)}


def principal():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("film")
    ap.add_argument("--appliquer", action="store_true")
    ap.add_argument("--evaluer", action="store_true")
    a = ap.parse_args()
    film = lire_json(a.film)
    base = os.path.splitext(os.path.abspath(a.film))[0]
    if a.evaluer:
        auto, lignes, scores = evaluer(film)
        for x in lignes:
            print(x)
        for k, v in scores.items():
            print(f"{k} : {v}")
        json.dump(auto, open(base + ".auto.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("Mise en scène refaite d'office :", base + ".auto.json")
        return
    r = Realisateur(film)
    r.realiser()
    for x in r.compte_rendu:
        print(x)
    sortie = a.film if a.appliquer else base + ".propose.json"
    json.dump(film, open(sortie, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(r.compte_rendu)} plan(s) mis en scène →", sortie, "(à relire, puis vf.py verifier + apercu)")


if __name__ == "__main__":
    principal()

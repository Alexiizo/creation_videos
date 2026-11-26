"""Les règles de la chaîne sur la Parole et le message : citations mot pour mot (Segond 1910), paroles de Jésus
vraiment les siennes, passage et pont, appâts / argent / menaces interdits, Dieu le Père jamais un personnage,
une porte ouverte à la fin. Utilisé par verifier_film.py."""
import re

from . import bible as BIB
from . import mots as TX


TYPES_VIDEO = {
    "recit": "FORMAT PRINCIPAL — raconter, expliquer, appliquer : une situation d'aujourd'hui, le récit biblique en "
             "images, ce qu'il veut dire (simplement), ce que ça change ce soir pour toi, une porte ouverte",
    "question": "une vraie question de vie (souffrance, pardon, Dieu existe ?) et la réponse de la Bible",
    "promesse": "court (20–40 s) : une situation que tout le monde vit + UNE promesse de Dieu (un verset)",
    "temoignage": "un VRAI témoignage (d'Alexis ou d'une personne qui a donné son accord) — jamais inventé",
    "evangile": "l'Évangile en une minute : Dieu t'aime, la croix, la résurrection, la grâce, l'invitation",
}
RECITS = ("recit",)
# appâts et pressions interdits : la chaîne existe pour faire connaître Dieu, pas pour les vues ni l'argent
INTERDITS = (
    # des PHRASES, pas des mots seuls : les récits parlent d'argent (Zachée), du « don de Dieu », de gens qui ignorent…
    ("si tu aimes jésus", "chantage affectif (« si tu aimes Jésus, partage ») — l'Évangile ne s'impose pas"),
    ("si tu aimes dieu", "chantage affectif"), ("si tu passes", "culpabilisation (« si tu passes, tu… »)"),
    ("si tu scroll", "culpabilisation"), ("si tu scrolles", "culpabilisation"), ("ne scrolle pas", "culpabilisation"),
    ("seuls les vrais", "appât (« seuls les vrais chrétiens… »)"), ("partage sinon", "chantage"),
    ("partage si", "chantage (« partage si tu crois »)"), ("1 % des", "appât (« seuls 1 % des gens… »)"),
    ("99 % vont", "appât"), ("si tu ignores", "culpabilisation"), ("ignore cette vidéo", "culpabilisation"),
    ("abonne-toi", "appel à s'abonner : le but n'est pas les abonnés"), ("abonnez-vous", "appel à s'abonner"),
    ("like", "appel au like"), ("partie 2", "série / cliffhanger à suivre"), ("la suite demain", "série"),
    ("fais un don", "appel au don"), ("faites un don", "appel au don"), ("un petit don", "appel au don"),
    ("soutiens la chaîne", "appel à soutenir"), ("lien en bio", "appel à cliquer / à payer"),
    ("paypal", "argent"), ("cagnotte", "argent"), ("tipeee", "argent"), ("sème une graine", "évangile de prospérité"),
    ("deviendras riche", "évangile de prospérité"), ("devenir riche", "évangile de prospérité"),
    ("guérison garantie", "promesse de guérison garantie"), ("miracle garanti", "promesse de miracle garanti"),
    ("tu seras guéri", "promesse de guérison (Dieu guérit, mais on ne promet jamais un résultat)"),
    ("tu iras en enfer si tu", "menace"), ("dieu va te punir", "menace"), ("arrête ton traitement", "conseil dangereux"),
    ("arrête tes médicaments", "conseil dangereux"), ("pas besoin de médecin", "conseil dangereux"),
)
PERSONNES_DIVINES = ("dieu", "pere", "père", "dieu_le_pere", "le_pere", "eternel", "saint_esprit", "esprit")


def _norm(s):
    return BIB.normaliser(TX.nettoyer(s or ""))


def _ref_ok(ref, ou, err):
    try:
        BIB.analyser(ref)
        return True
    except BIB.RefInvalide as e:
        err.append(f"{ou} : {e}")
        return False


def verifier_foi(ep, sc, timings, total, err, alerte):
    tv = ep.get("type_video", "recit")
    if tv not in TYPES_VIDEO:
        err.append(f"type_video « {tv} » inconnu : " + ", ".join(TYPES_VIDEO))
    # --- le passage et le pont ---------------------------------------------------------------------
    if tv in RECITS:
        if not ep.get("passage"):
            err.append("pas de « passage » à la racine (ex. \"Matthieu 14:22-33\") : l'histoire racontée EST un passage "
                       "de la Bible, qu'on peut aller lire")
        else:
            _ref_ok(ep["passage"], "passage", err)
    pont = ep.get("pont")
    if tv in RECITS + ("question", "evangile") and not pont:
        err.append("pas de « pont » à la racine ({\"ref\": \"Hébreux 13:8\"}) : le verset qui relie l'histoire à la vie "
                   "du spectateur AUJOURD'HUI (bible.md § Le pont)")
    if isinstance(pont, dict) and pont.get("ref") and _ref_ok(pont["ref"], "pont", err) and pont.get("texte"):
        ok, msg = BIB.verifier(pont["ref"], pont["texte"])
        if not ok:
            err.append(f"pont : {msg}")
    # --- chaque citation mot pour mot, chaque parole de Jésus vraiment la sienne --------------------
    for i, s_ in enumerate(sc, 1):
        txt = TX.nettoyer(s_.get("texte", ""))
        cites = [c for c in s_.get("cite") or [] if isinstance(c, dict)]
        for c in cites:
            if not c.get("ref"):
                err.append(f"scène {i} : « cite » sans « ref »")
        for g in re.findall(r"«\s*(.+?)\s*»", txt):
            if not cites:
                err.append(f"scène {i} : « {g[:50]} » est entre « » mais sans référence — « » est réservé à la Bible : "
                           "ajouter \"cite\": [{\"ref\": \"…\", \"qui\": \"jesus\"}] ; une phrase qui n'est pas la Bible "
                           "(un mot à écrire en commentaire) s'écrit entre “ ”")
                continue
            bon = None
            msgs = []
            for c in cites:
                try:
                    ok, msg = BIB.verifier(c["ref"], g)
                except Exception as ex:                                   # noqa: BLE001
                    ok, msg = False, str(ex)
                if ok:
                    bon = c
                    break
                msgs.append(msg)
            if not bon:
                err.append(f"scène {i} : citation PAS MOT POUR MOT — « {g[:60]} » : {msgs[0] if msgs else ''}")
                continue
            if str(bon.get("qui", "")).lower() in ("jesus", "jésus"):
                ok, msg = BIB.verifier_jesus(bon["ref"], g)
                if not ok:
                    err.append(f"scène {i} : {msg}")
        if cites and "«" not in txt:
            alerte.append(f"scène {i} : « cite » déclaré mais aucune citation entre « » dans le texte dit")
        # Jésus / Dieu qui parle sans guillemets = des paroles inventées
        for m in re.finditer(r"\b(Jésus|Dieu|le Seigneur|l'Éternel)\s+(lui |leur |te |vous )?(dit|répond|répondit|"
                             r"déclare|murmure|crie|dira|demande)\s*:?\s*([^«\s:][^.!?]{0,40})", txt):
            # « Jésus dit à ses amis : « Passons… » » : un complément, puis deux-points et la citation entre « » — permis
            if re.match(r"[^.!?«]{0,40}:\s*«", txt[m.start(4):]):
                continue
            err.append(f"scène {i} : « {m.group(0)[:60]}… » — les paroles de {m.group(1)} sont TOUJOURS citées entre « » "
                       "et vérifiées (cite + ref, qui: jesus) ; sinon on les raconte sans les faire parler")
        for e in s_.get("evenements", []) or []:
            if e.get("type") == "verset":
                if not e.get("ref"):
                    err.append(f"scène {i} : verset sans « ref »")
                elif e.get("texte", "").startswith("["):
                    err.append(f"scène {i} : verset « {e.get('ref')} » : {e['texte']}")
                elif e.get("_texte_donne"):                   # texte écrit à la main : mot pour mot, vérifié
                    try:
                        ok, msg = BIB.verifier(e["ref"], e["texte"])
                    except Exception as ex:                    # noqa: BLE001
                        ok, msg = False, str(ex)
                    if not ok:
                        err.append(f"scène {i} : carte verset PAS MOT POUR MOT — {msg}")
            if e.get("type") in ("echec",):
                err.append(f"scène {i} : « TU ES MORT » (echec) n'existe pas sur cette chaîne")
        if tv in RECITS and s_.get("type") not in ("fin", "choix") and i > 0:
            ap = s_.get("appui")
            if not ap:
                pass
            else:
                for r in (ap if isinstance(ap, list) else [ap]):
                    _ref_ok(r, f"scène {i} (appui)", err)
    sans_appui = [str(i) for i, s_ in enumerate(sc, 1) if tv in RECITS and s_.get("type") not in ("fin", "choix")
                  and not s_.get("appui") and not s_.get("pont")]
    if sans_appui:
        alerte.append("FIDÉLITÉ : scènes sans « appui » (le verset sur lequel repose ce qu'on montre) : "
                      + ", ".join(sans_appui[:12]) + " — les détails ajoutés (émotions, décor) ne contredisent jamais le texte")
    # --- représentation ------------------------------------------------------------------------------
    for k, v in (ep.get("casting") or {}).items():
        cos = (v or {}).get("costume")
        if k.lower() in PERSONNES_DIVINES or str(cos).lower() in PERSONNES_DIVINES:
            err.append(f"casting « {k} » : Dieu le Père et le Saint-Esprit ne sont JAMAIS des personnages — la lumière, "
                       "une voix (citation), le vent, le feu, la colombe (bible.md § Représenter)")
    # --- l'invitation (fin) et les appâts interdits ----------------------------------------------------
    fin_ = next((s_ for s_ in sc if s_.get("type") == "fin"), {})
    f_ = fin_.get("fin") or {}
    tout = " ".join([s_.get("texte", "") for s_ in sc] + [str(f_.get(k, "")) for k in ("titre", "sous_titre", "appel")]
                    + [str(o) for o in f_.get("options", [])]).lower().replace("’", "'")
    for mot, pourquoi in INTERDITS:
        if re.search(r"(^|[^\w])" + re.escape(mot) + r"($|[^\w])", tout):
            err.append(f"« {mot.strip()} » : {pourquoi} — mission.md § Ce qu'on ne fait jamais")
    porte = " ".join([str(f_.get("appel", "")), fin_.get("texte", "")] + [s_.get("texte", "") for s_ in sc[-3:]]).lower()
    if not any(k in porte for k in ("écris", "dis-lui", "lui dire", "prie", "parle-lui", "lui parler", "commentaire",
                                    "demande-lui", "lis ", "lis-le", "ouvre")):
        alerte.append("INVITATION : la fin n'ouvre pas de porte concrète — une prière simple à dire, un mot à écrire "
                      "en commentaire pour qu'Alexis prie pour la personne, un passage à aller lire (mission.md)")
    if tv == "temoignage":
        t_ = ep.get("temoignage") or {}
        if not (t_.get("source") and t_.get("accord") is True):
            err.append("témoignage : \"temoignage\": {\"source\": \"Alexis\" | \"<prénom>\", \"accord\": true} — un "
                       "témoignage est VRAI et raconté avec l'accord de la personne ; jamais inventé")
    if tv == "et_toi":
        choix = [i for i, s_ in enumerate(sc) if s_.get("type") == "choix"]
        if not 1 <= len(choix) <= 2:
            alerte.append(f"ET TOI : {len(choix)} choix — 1 ou 2 moments où le spectateur se met à la place du personnage")
        for i, s_ in enumerate(sc, 1):
            if re.search(r"tu as perdu|tu es mort", TX.nettoyer(s_.get("texte", "")).lower()):
                err.append(f"scène {i} : pas de « perdu » ici — après le choix, on raconte ce que le personnage a VRAIMENT "
                           "fait et ce que Dieu a fait (formats.md § Et toi)")
    # --- l'accroche ----------------------------------------------------------------------------------
    p1 = _phrases(sc[0].get("texte", ""))
    if p1 and len(p1[0].split()) > 16:
        alerte.append(f"ACCROCHE : 1re phrase de {len(p1[0].split())} mots — 12 au plus, lisible avant de swiper")
    if not _bouge_des_0(sc[0]) and not any((a.get("actions") or [{}])[0].get("vers") is not None
                                           for a in sc[0].get("acteurs", [])) \
            and not any(e.get("t", 1) <= .1 for e in sc[0].get("evenements", [])):
        alerte.append("ACCROCHE : rien ne bouge à l'image 0 (un acteur qui avance, un objet qui bouge, la mer qui se lève)")


def _bouge_des_0(s_):
    """Un objet qui bouge dès l'image 0 (la voiture qui tombe, la vague qui arrive) : `mouvement` dont la 1re clé
    est à t = 0 et la suivante change quelque chose ; une barque qui tangue dans la houle ; une mer agitée."""
    if (s_.get("decor") or {}).get("mer") in ("agitee", "tempete"):
        return True
    if any(o.get("type") == "barque" and float(o.get("houle", .15)) >= .4 for o in s_.get("objets", []) or []):
        return True
    for o in s_.get("objets", []) or []:
        mv = o.get("mouvement") or []
        if len(mv) >= 2 and mv[0].get("t", 1) <= .05 and "mot" not in mv[0]:
            if any(mv[1].get(k) != mv[0].get(k) for k in ("x", "dx", "dy", "rot", "echelle", "alpha") if k in mv[1]):
                return True
    return False



def _phrases(texte):
    return [p.strip() for p in re.split(r"(?<=[.!?…»])\s+", TX.nettoyer(texte or ""))
            if re.search(r"[A-Za-zÀ-ÿ0-9]", p)]

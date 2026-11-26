"""La Bible (Louis Segond 1910, domaine public) dans le skill : lire, chercher et VÉRIFIER chaque citation.

Règle de la chaîne : toute parole de la Bible dite ou écrite dans une vidéo est citée MOT POUR MOT dans la
Segond 1910 (une citation peut être coupée par « … », jamais réécrite) ; les paroles de Jésus ne sont JAMAIS
inventées — seulement ses paroles telles que la Bible les rapporte.

En ligne de commande :
    python3 scripts/bible.py "Jean 3:16"              → le texte du verset
    python3 scripts/bible.py "Matthieu 14:22-33"      → un passage (un verset par ligne)
    python3 scripts/bible.py --chercher "marcher sur les eaux"
    python3 scripts/bible.py --verifier "Jean 3:16" "Car Dieu a tant aimé le monde…"
    python3 scripts/bible.py --jesus "Matthieu 14:27"  → les paroles de Jésus de ce passage
"""
import functools
import json
import math
import os
import re
import unicodedata

FICHIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "bible", "lsg1910.json")


@functools.lru_cache(maxsize=1)
def _b():
    with open(FICHIER, encoding="utf-8") as f:
        return json.load(f)


def _sans_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def _cle_livre(s):
    s = _sans_accents(s.lower()).replace(".", " ")
    s = re.sub(r"\b(iii)\b", "3", s)
    s = re.sub(r"\b(ii)\b", "2", s)
    s = re.sub(r"\b(i)\b", "1", s)
    s = re.sub(r"\b(premiere?|1er|1ere)\b", "1", s)
    s = re.sub(r"\b(deuxieme|seconde?)\b", "2", s)
    s = re.sub(r"\b(troisieme)\b", "3", s)
    s = re.sub(r"^(evangile selon|epitre de paul aux|epitre de paul a|epitre aux|epitre de|livre de|livre des)\s+", "", s)
    return re.sub(r"\s+", "", s)


@functools.lru_cache(maxsize=1)
def _index_livres():
    idx = {}
    for code, nom, *ab in _b()["livres"]:
        for n in [code, nom] + ab:
            idx[_cle_livre(n)] = code
    return idx


def nom_livre(code):
    return next(n for c, n, *_ in _b()["livres"] if c == code)


class RefInvalide(ValueError):
    pass


def analyser(ref):
    """« Jean 3:16 », « Jn 3.16-18 », « Matthieu 14:22–33 », « Psaume 23 », « 1 Jean 4:8 » →
    (code, chapitre, [versets]) ; un chapitre entier si pas de verset."""
    r = ref.strip().replace("–", "-").replace("—", "-")
    m = re.match(r"^(.+?)\s*(\d+)(?:\s*[:.,]\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$", r)
    if not m:
        raise RefInvalide(f"référence illisible : « {ref} » (ex. « Jean 3:16 », « Matthieu 14:22-33 »)")
    livre, ch, v1, v2 = m.groups()
    code = _index_livres().get(_cle_livre(livre))
    if not code:
        raise RefInvalide(f"livre inconnu : « {livre} »")
    chapitre = _b()["texte"][code].get(str(int(ch)))
    if chapitre is None:
        raise RefInvalide(f"{nom_livre(code)} n'a pas de chapitre {ch}")
    if v1 is None:
        vs = list(chapitre.keys())
    else:
        a, b = int(v1), int(v2 or v1)
        vs = [str(v) for v in range(a, b + 1)]
        manque = [v for v in vs if v not in chapitre]
        if manque:
            raise RefInvalide(f"{nom_livre(code)} {ch} n'a pas de verset {manque[0]}")
    return code, str(int(ch)), vs


def joli(ref):
    code, ch, vs = analyser(ref)
    v = f":{vs[0]}" + (f"-{vs[-1]}" if len(vs) > 1 else "") if vs else ""
    return f"{nom_livre(code)} {ch}{v}"


def texte(ref, numeros=False):
    code, ch, vs = analyser(ref)
    T = _b()["texte"][code][ch]
    if numeros:
        return "\n".join(f"{v} {T[v]}" for v in vs)
    return " ".join(T[v] for v in vs)


def paroles_jesus(ref):
    code, ch, vs = analyser(ref)
    J = _b()["jesus"].get(code, {}).get(ch, {})
    # une phrase de Jésus coupée par un renvoi (« va, et » / « ne pèche plus ») est rendue en un seul morceau
    return [" ".join(J[v]) for v in vs if J.get(v)]


def normaliser(s):
    """Compare les MOTS (casse, apostrophes, guillemets et ponctuation ignorés)."""
    s = s.lower().replace("’", "'").replace("‘", "'").replace("œ", "oe").replace("æ", "ae")
    s = re.sub(r"[«»“”\"()\[\]*_]", " ", s)
    s = re.sub(r"[.,;:!?…\-–—]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def verifier(ref, citation):
    """True si la citation est EXACTEMENT dans le passage (morceaux séparés par « … » / « ... » : chacun doit y
    être, dans l'ordre). Renvoie (ok, message)."""
    try:
        source = normaliser(texte(ref))
    except RefInvalide as e:
        return False, str(e)
    morceaux = [normaliser(m) for m in re.split(r"…|\.\.\.|\[…\]", citation) if normaliser(m)]
    pos = 0
    for m in morceaux:
        i = source.find(m, pos)
        if i < 0:
            # aide : le plus long début qui correspond
            mots = m.split()
            k = 0
            while k < len(mots) and source.find(" ".join(mots[:k + 1]), pos) >= 0:
                k += 1
            return False, (f"pas mot pour mot dans {joli(ref)} (Segond 1910) : « {' '.join(mots[:k])} » ✓ puis "
                           f"« {' '.join(mots[k:k + 6])}… » ✗ — texte : « {texte(ref)[:220]} »")
        pos = i + len(m)
    return True, "ok"


def verifier_jesus(ref, citation):
    """Une parole mise dans la bouche de Jésus doit être dans SES paroles du passage (balises \\wj)."""
    segs = paroles_jesus(ref)
    if not segs:
        return False, f"aucune parole de Jésus dans {joli(ref)}"
    source = normaliser(" ".join(segs))      # un renvoi (\x) coupe parfois une phrase de Jésus en deux morceaux
    for m in [normaliser(x) for x in re.split(r"…|\.\.\.", citation) if normaliser(x)]:
        if m not in source:
            return False, (f"Jésus ne dit pas cela dans {joli(ref)} (Segond 1910). Ses paroles : "
                           + " / ".join(f"« {s} »" for s in segs)[:300])
    return True, "ok"


MOTS_VIDES = set("le la les un une des du de d l et ou a au aux en dans sur sous par pour avec sans ce cet cette ces se s sa son ses il elle ils elles on je tu nous vous me m te t ne n pas que qu qui y mon ma mes ton ta tes est".split())


def _mots(texte):
    return re.findall(r"[a-z0-9]+", _sans_accents(texte.lower()))


@functools.lru_cache(maxsize=1)
def _versets():
    b = _b()
    return [(f"{nom_livre(code)} {ch}:{v}", normaliser(t), _mots(t)) for code, *_ in b["livres"] for ch, vv in b["texte"][code].items() for v, t in vv.items()]


def _racine(mot):
    """Ce qui reste d'un mot quelle que soit sa forme : marcher, marcha, marchaient (pas marchandises) ; eaux, eau."""
    return re.compile(re.escape(mot.rstrip("sx")) + "[sx]?$" if len(mot) < 5 else re.escape(mot[:-2]) + "[a-z]{0,5}$")


def _rapproche(mots, racines):
    """Les racines que le verset contient, et le plus petit écart (en mots) qui les réunit toutes."""
    places = [(k, r) for k, m in enumerate(mots) for r in racines if r.match(m)]
    presentes, vu, ecart = {r for _, r in places}, {}, len(mots)
    for k, r in places:
        vu[r] = k
        if len(vu) == len(presentes):
            ecart = min(ecart, k - min(vu.values()))
    return presentes, ecart


def chercher(expr, n=12):
    """Les versets qui disent ces mots : la phrase exacte d'abord, puis ceux qui en disent le plus quelle que soit leur
    forme (« marcher sur les eaux » trouve « marcha sur les eaux ») : un mot rare compte plus qu'un mot courant, des mots
    rapprochés passent devant. Un verset qui n'a que les mots courants ne compte pas."""
    e = normaliser(expr)
    exacts = [ref for ref, t, _ in _versets() if e and e in t][:n]
    racines = [_racine(m) for m in dict.fromkeys(_mots(expr)) if m not in MOTS_VIDES]
    if len(exacts) >= n or not racines:
        return exacts
    trouves = [(ref, rang, *_rapproche(mots, racines)) for rang, (ref, _, mots) in enumerate(_versets()) if any(r.match(m) for m in mots for r in racines)]
    poids = {r: math.log(len(_versets()) / (1 + sum(r in p for _, _, p, _ in trouves))) for r in racines}
    total = sum(poids.values())
    notes = [(-round(sum(poids[r] for r in p), 6), ecart, rang, ref) for ref, rang, p, ecart in trouves if ref not in exacts]
    complets = [x for x in notes if -x[0] > total - 1e-3]
    return exacts + [ref for *_, ref in sorted(complets or [x for x in notes if -x[0] > total * .5])[:n - len(exacts)]]



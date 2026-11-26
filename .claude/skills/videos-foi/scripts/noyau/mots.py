"""Les mots du texte dit : nettoyage, mots avec accent (*mot*), instant où chaque mot est dit."""
import re


def nettoyer(texte):
    """Texte pour la voix : retire les marqueurs *accent*."""
    return re.sub(r"\*", "", texte or "").strip()


def mots_avec_accent(texte):
    """[(mot, accent_bool)] ; *mots entre étoiles* = en couleur d'accent."""
    res = []
    accent = False
    ouvre = False
    for brut in (texte or "").split():
        debut = brut.startswith("*")
        fin = brut.rstrip(".,!?…;:»\"").endswith("*")
        if debut:
            accent = True
        m = brut.replace("*", "")
        if res and m and all(c in ":;!?»…." for c in m):
            # ponctuation française détachée (« fin : ») : la coller au mot précédent, jamais en début de groupe
            res[-1] = (res[-1][0] + " " + m, res[-1][1])
            continue
        if m == "«":
            ouvre = True                      # le guillemet ouvrant se colle au mot suivant (« Homme…) : la
            continue                          # citation se voit ouverte ET fermée dans les sous-titres
        if ouvre:
            m, ouvre = "« " + m, False
        res.append((m, accent))
        if fin:
            accent = False
    return res


def _norm(m):
    return re.sub(r"[^A-ZÀ-ÖØ-Ý0-9'Œ]", "", m.replace("’", "'").upper())


def temps_mots(texte, debut, fin):
    """[(mot normalisé, instant)] : quand chaque mot est dit (même calcul que les sous-titres)."""
    mots = [m for m, _ in mots_avec_accent(texte)]
    poids = [len(m) + 2 + (4 if m[-1:] in ".!?…," else 0) for m in mots]
    tot = sum(poids) or 1
    out, acc = [], 0
    for m, p in zip(mots, poids):
        out.append((_norm(m), debut + (max(fin, debut + .3) - debut) * acc / tot))
        acc += p
    return out

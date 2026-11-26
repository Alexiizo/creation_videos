"""Durées : estimées (débit de la voix) ou calées sur la voix enregistrée (découpe sur les pauses), et texte pour
l'outil de voix (ElevenLabs)."""
import json
import re
import subprocess

from . import mots as TX

CIBLE_MIN, CIBLE_MAX = 60.0, 100.0     # réglable : "duree_cible" (charte ou vidéo)
CIBLE = 80.0
MOTS_PAR_SECONDE = 2.8       # ElevenLabs « Guillaume – Narrator » à vitesse 0,9 (charte)
ATTAQUE = .12                # silence avant la voix dans chaque plan
ATTAQUE_PREMIERE = .05       # l'accroche démarre tout de suite
PAUSE_DEFAUT = .30           # respiration après la voix
ATTENTE_FIN = 2.5            # écran de fin
ATTENTE_CHOIX = ATTENTE_DILEMME = 3.0
PAUSE_ECHEC = 1.4
ATTAQUE_REMBOBINE = .9


def charger_bible(chemin):
    """Lit bible.md et en extrait le bloc ```json de configuration (serie, palette, casting, jauges)."""
    if not chemin:
        return {}
    txt = open(chemin, encoding="utf-8").read()
    for bloc in re.findall(r"```json\s*(.*?)```", txt, re.S):
        try:
            d = json.loads(bloc)
        except json.JSONDecodeError as e:
            raise SystemExit(f"Bloc JSON invalide dans la bible : {e}")
        if any(k in d for k in ("palette", "casting", "serie")):
            return d
    return {}


def regler_cible(dmin, dmax):
    global CIBLE_MIN, CIBLE_MAX, CIBLE
    CIBLE_MIN, CIBLE_MAX = float(dmin), float(dmax)
    CIBLE = (CIBLE_MIN + CIBLE_MAX) / 2


_EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u26FF\u2700-\u27BF\uFE0F\u200D]")
_EMOJI_TEXTE = {"👇": "↓", "👉": "→", "✅": "✓", "❌": "✗", "⚠️": "⚠", "➡️": "→", "⬇️": "↓"}


def mots(scene):
    return len(TX.nettoyer(scene.get("texte", "")).split())


# ----------------------------------------------------------------------------- durées


def _ajuster(scenes, voix_len):
    """voix_len[i] = durée de la voix de la scène i (0 si muette). Calcule debut/duree de chaque scène et
    ajuste les respirations pour tomber dans la durée cible."""
    n = len(scenes)
    att = [ATTAQUE_PREMIERE if i == 0 else (ATTAQUE_REMBOBINE if s.get("entree") == "rembobinage" else ATTAQUE)
           for i, s in enumerate(scenes)]
    pause = []
    dernier = n - 1
    for i, s in enumerate(scenes):
        if s.get("type") in ("choix", "fin"):
            defaut = ATTENTE_CHOIX if i == dernier else ATTENTE_DILEMME
            if s.get("type") == "fin":
                defaut = ATTENTE_FIN
            pause.append(float(s.get("attente", defaut)))
        elif any(e.get("type") in ("echec", "arret") for e in s.get("evenements", [])):
            cause = (s.get("branche") or {}).get("cause") or s.get("cause") or \
                any(e.get("cause") for e in s.get("evenements", []) or [] if e.get("type") == "echec")
            pause.append(float(s.get("pause", PAUSE_ECHEC + (.9 if cause else 0))))   # le tampon (+ la raison) reste lisible
        elif voix_len[i] == 0:
            pause.append(float(s.get("duree", 1.5)))  # scène muette : durée explicite
            att[i] = 0
        else:
            pause.append(float(s.get("pause", PAUSE_DEFAUT)))
    total = sum(att) + sum(voix_len) + sum(pause)
    notes = []
    # le temps manquant va aux respirations des scènes racontées (jamais à l'écran de fin : une fin
    # statique fait partir les gens) ; seul un dernier écran de VOTE (type choix) peut un peu s'allonger
    choix = [dernier] if scenes[dernier].get("type") == "choix" else []
    souples = [i for i, s in enumerate(scenes) if voix_len[i] > 0 and s.get("type") not in ("choix", "fin")
               and "pause" not in s and not any(e.get("type") in ("echec", "arret") for e in s.get("evenements", []))]
    if total < CIBLE_MIN + .3:
        manque = CIBLE - total
        for i in choix:
            ajout = max(0, min(manque, 5.0 - pause[i]))
            pause[i] += ajout
            manque -= ajout
        if manque > 0 and souples:                 # audit du 06/11 : +1,2 s de silence par scène = 25 s de temps
            for i in souples:                      # morts sur 1:51 ; on n'étire presque plus (≤ 0,2 s par scène)
                pause[i] += min(manque / len(souples), .2)
        total = sum(att) + sum(voix_len) + sum(pause)
        if total < CIBLE_MIN:
            notes.append(f"TROP COURT : {total:.1f}s -> ajouter ~{(CIBLE_MIN - total) * MOTS_PAR_SECONDE:.0f} mots d'histoire "
                         "(jamais des silences : un temps mort fait partir les gens)")
    elif total > CIBLE_MAX - .2:
        exces = total - (CIBLE_MAX - .5)
        for i in souples:
            r = min(exces / max(len(souples), 1), pause[i] - .08)
            pause[i] -= max(r, 0)
        total = sum(att) + sum(voix_len) + sum(pause)
        for i in choix:
            if total > CIBLE_MAX - .3:
                r = min(total - (CIBLE_MAX - .5), pause[i] - 2.0)
                pause[i] -= max(r, 0)
                total = sum(att) + sum(voix_len) + sum(pause)
        if total > CIBLE_MAX:
            notes.append(f"TROP LONG : {total:.1f}s -> retirer ~{(total - CIBLE) * MOTS_PAR_SECONDE:.0f} mots "
                         f"ou régénérer la voix un peu plus vite.")
    timings, t = [], 0.0
    for i in range(n):
        d = att[i] + voix_len[i] + pause[i]
        timings.append(dict(debut=t, duree=d, voix_debut=att[i], voix_fin=att[i] + voix_len[i]))
        t += d
    return timings, t, notes


def estimer(ep):
    """Durées sans voix (brouillon) : nombre de mots / débit de narration."""
    vl = []
    for s in ep["scenes"]:
        m = mots(s)
        vl.append(0 if m == 0 else m / MOTS_PAR_SECONDE + .25 * TX.nettoyer(s.get("texte", "")).count("."))
    timings, total, notes = _ajuster(ep["scenes"], vl)
    return timings, total, notes


def silences(chemin, seuil=-36, mini=.22):
    out = subprocess.run(["ffmpeg", "-i", chemin, "-af", f"silencedetect=noise={seuil}dB:d={mini}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    debuts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    fins = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", chemin],
                               capture_output=True, text=True).stdout.strip())
    sil = []
    for i, d in enumerate(debuts):
        f = fins[i] if i < len(fins) else dur
        sil.append((d, f))
    return sil, dur


def synchroniser(ep, chemin_voix):
    """Découpe la voix en un morceau par scène parlée en choisissant les meilleures pauses, puis recale."""
    sil, dur = silences(chemin_voix)
    parle_debut = sil[0][1] if sil and sil[0][0] < .05 else 0.0
    parle_fin = sil[-1][0] if sil and sil[-1][1] >= dur - .05 else dur
    idx = [i for i, s in enumerate(ep["scenes"]) if mots(s) > 0]
    N = len(idx)
    poids = [len(TX.nettoyer(ep["scenes"][i]["texte"])) + 8 for i in idx]
    tot = sum(poids)
    T = parle_fin - parle_debut
    attendu = []
    acc = 0
    for p in poids[:-1]:
        acc += p
        attendu.append(parle_debut + T * acc / tot)
    cands = [(a, b) for (a, b) in sil if a > parle_debut + .05 and b < parle_fin - .05]
    notes = []
    K = N - 1
    durees = sorted((b - a for a, b in cands), reverse=True)
    if K <= 0:
        coupes = []
    elif len(cands) >= K and (len(cands) == K or durees[K - 1] - durees[K] > .15):
        # cas idéal : exactement K pauses nettement plus longues que les autres = les changements de paragraphe
        seuil = durees[K - 1]
        coupes = [(a, b) for (a, b) in cands if b - a >= seuil][:K]
    elif len(cands) >= K:
        # programmation dynamique : coupes ordonnées, proches de l'attendu, préférant les longues pauses
        M = len(cands)
        INF = 1e9
        cout = [[INF] * M for _ in range(K)]
        prev = [[-1] * M for _ in range(K)]
        for k in range(K):
            for j in range(M):
                a, b = cands[j]
                c = .3 * abs((a + b) / 2 - attendu[k]) - 3.0 * (b - a)   # les pauses longues = changements de paragraphe
                if k == 0:
                    cout[k][j] = c
                else:
                    best, bi = INF, -1
                    for jj in range(j):
                        if cout[k - 1][jj] < best:
                            best, bi = cout[k - 1][jj], jj
                    if bi >= 0:
                        cout[k][j] = best + c
                        prev[k][j] = bi
        j = min(range(M), key=lambda jj: cout[K - 1][jj])
        choix = []
        for k in range(K - 1, -1, -1):
            choix.append(j)
            j = prev[k][j]
        choix.reverse()
        coupes = [cands[j] for j in choix]
    if K > 0 and len(cands) >= K:
        ecarts = [abs((a + b) / 2 - e) for (a, b), e in zip(coupes, attendu)]
        if max(ecarts) > 3.5:
            notes.append("Synchro incertaine : vérifier que chaque scène du JSON correspond bien à un paragraphe lu.")
    elif K > 0:
        notes.append(f"Seulement {len(cands)} pauses détectées pour {K} coupes : découpe proportionnelle au texte. "
                     "Pour une synchro parfaite, régénère la voix avec une vraie pause entre chaque paragraphe.")
        coupes = [(e - .01, e + .01) for e in attendu]
    morceaux = []
    d0 = parle_debut
    for (a, b) in coupes:
        morceaux.append((max(0, d0 - .03), a + .05))
        d0 = b
    morceaux.append((max(0, d0 - .03), min(dur, parle_fin + .08)))
    vl = [0.0] * len(ep["scenes"])
    src = [None] * len(ep["scenes"])
    for i, (a, b) in zip(idx, morceaux):
        vl[i] = b - a
        src[i] = (a, b)
    timings, total, n2 = _ajuster(ep["scenes"], vl)
    for tm, s in zip(timings, src):
        tm["voix_src"] = s
    return timings, total, notes + n2


def synchroniser_plans(ep, fichiers, sortie_wav):
    """Voix générée PLAN PAR PLAN (scripts/voix.py) : chaque fichier est déjà la phrase de son plan. On rogne les
    silences de début et de fin, on les met bout à bout dans un seul wav (avec un blanc), et chaque plan est calé
    exactement sur sa phrase — aucune détection de pauses, aucune erreur de découpe possible."""
    import numpy as np
    from noyau import audio as AU
    SR = AU.SR
    morceaux, src, vl, pos = [], [None] * len(ep["scenes"]), [0.0] * len(ep["scenes"]), 0.0
    blanc = np.zeros(int(SR * .5), np.float32)
    notes = []
    for i, s in enumerate(ep["scenes"]):
        f = fichiers.get(i)
        if mots(s) == 0:
            continue
        if not f:
            notes.append(f"plan {i + 1} : pas de fichier de voix (voix.py) — durée estimée, muet")
            vl[i] = mots(s) / MOTS_PAR_SECONDE
            continue
        x = AU.charger_audio(f)
        e = np.abs(x) > 10 ** (-40 / 20)
        if e.any():
            a, b = int(np.argmax(e)), len(e) - int(np.argmax(e[::-1]))
            x = x[max(0, a - int(.04 * SR)):min(len(x), b + int(.08 * SR))]
        morceaux += [x, blanc]
        src[i] = (pos, pos + len(x) / SR)
        vl[i] = len(x) / SR
        pos += (len(x) + len(blanc)) / SR
    voix = np.concatenate(morceaux) if morceaux else np.zeros(SR, np.float32)
    AU._ecrire_wav(sortie_wav, np.stack([voix, voix], 1))
    timings, total, n2 = _ajuster(ep["scenes"], vl)
    for tm, s_ in zip(timings, src):
        tm["voix_src"] = s_
    return timings, total, notes + n2


# ----------------------------------------------------------------------------- texte pour la voix

LIMITE_CONVERSION = 450      # anciens outils de voix limités par conversion
LIMITE_ELEVENLABS = 2500     # une seule génération ElevenLabs par vidéo (au-delà : PARTIES)


def texte_voix(ep, balises=False):
    """Script à coller dans l'outil de voix : un paragraphe par scène parlée, séparés par une pause.
    Si le texte dépasse la limite par conversion, il est coupé en PARTIES (entre deux paragraphes)."""
    paras = [TX.nettoyer(s["texte"]) for s in ep["scenes"] if mots(s) > 0]
    sep = '\n<break time="0.8s" />\n' if balises else "\n\n"
    total = len(sep.join(paras))
    limite = LIMITE_ELEVENLABS if balises else LIMITE_CONVERSION   # ElevenLabs accepte un long texte d'un coup
    if total <= limite:
        return sep.join(paras)
    n = -(-total // limite)
    cible = total / n
    parties, cur = [], []
    for p in paras:
        if cur and len(sep.join(cur + [p])) > cible + 40 and len(parties) < n - 1:
            parties.append(cur)
            cur = []
        cur.append(p)
    parties.append(cur)
    blocs = []
    for i, pt in enumerate(parties, 1):
        txt = sep.join(pt)
        blocs.append(f"===== PARTIE {i}/{len(parties)} ({len(txt)} caractères) — une conversion, un fichier =====\n\n{txt}")
    return "\n\n\n".join(blocs)


# ----------------------------------------------------------------------------- plan audio

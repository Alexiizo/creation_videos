"""Son procédural (aucun fichier externe, donc aucun souci de droits) + placement de la voix + mixage.

Tout est synthétisé avec numpy/scipy : ambiances par décor, nappe de tension, impacts et bruitages.
La voix (fichier fourni par l'utilisateur) est découpée par scène et replacée sur la timeline.
"""
import subprocess

import numpy as np
from scipy import signal

SR = 48000


# ----------------------------------------------------------------------------- bases

def _g(seed):
    return np.random.default_rng(seed)


def blanc(n, seed=0):
    return _g(seed).standard_normal(n).astype(np.float32)


def brun(n, seed=0):
    x = np.cumsum(blanc(n, seed)) * .02
    x -= signal.lfilter([1], [1, -.9995], x) * .0005  # dérive
    b, a = signal.butter(1, 20 / (SR / 2), "high")
    return signal.lfilter(b, a, x).astype(np.float32)


def rose(n, seed=0):
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return (signal.lfilter(b, a, blanc(n, seed)) * 4).astype(np.float32)


def passe_bas(x, f, ordre=2):
    b, a = signal.butter(ordre, min(f, SR / 2 - 100) / (SR / 2), "low")
    return signal.lfilter(b, a, x).astype(np.float32)


def passe_haut(x, f, ordre=2):
    b, a = signal.butter(ordre, f / (SR / 2), "high")
    return signal.lfilter(b, a, x).astype(np.float32)


def passe_bande(x, f1, f2, ordre=2):
    b, a = signal.butter(ordre, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], "band")
    return signal.lfilter(b, a, x).astype(np.float32)


def lfo(n, f, seed=0, prof=1.0):
    """Modulation lente et irrégulière dans [0,1]."""
    t = np.arange(n) / SR
    g = _g(seed)
    v = np.zeros(n, np.float32)
    for k in range(3):
        v += np.sin(2 * np.pi * f * (k + 1) * .73 * t + g.uniform(0, 6)) / (k + 1)
    v = (v / 1.83 + 1) / 2
    return (1 - prof + prof * v).astype(np.float32)


def norm(x, pic=1.0):
    m = np.max(np.abs(x)) or 1
    return (x / m * pic).astype(np.float32)


def env(n, attaque=.01, chute=.3):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(attaque, 1e-4)) * np.exp(-t / max(chute, 1e-4))
    return e.astype(np.float32)


def fondu(x, d_in=.05, d_out=.05):
    n = len(x)
    a, b = int(d_in * SR), int(d_out * SR)
    if a:
        x[:a] *= np.linspace(0, 1, min(a, n))[:n]
    if b:
        x[-b:] *= np.linspace(1, 0, min(b, n))[-n:]
    return x


# ----------------------------------------------------------------------------- ambiances

def amb_vent(n, seed=0, force=1.0):
    base = passe_bas(brun(n, seed), 500) * lfo(n, .09, seed, .7)
    sif = passe_bande(blanc(n, seed + 1), 500, 1100) * lfo(n, .15, seed + 2, 1.0) ** 3
    return norm(base, .6 * force) + norm(sif, .12 * force)


def amb_foret(n, seed=0):
    x = amb_vent(n, seed, .65)
    g = _g(seed + 5)
    # craquements de branches lointains
    for _ in range(max(1, n // (SR * 7))):
        i = g.integers(0, max(1, n - SR))
        x[i:i + SR // 4] += snd_craquement(seed=int(i))[:SR // 4] * .12
    # insectes nocturnes (stridulations aiguës, très discrètes)
    t = np.arange(n) / SR
    puls = (np.sin(2 * np.pi * 28 * t) > .6).astype(np.float32) * lfo(n, .3, seed + 7)
    x += np.sin(2 * np.pi * 4300 * t).astype(np.float32) * puls * .012
    return x


def amb_pluie(n, seed=0):
    x = norm(passe_haut(rose(n, seed), 900), .35) * lfo(n, .2, seed, .3)
    g = _g(seed + 3)
    gout = np.zeros(n, np.float32)
    idx = g.integers(0, n, n // 300)
    gout[idx] = g.uniform(.2, 1, len(idx))
    gout = passe_bande(gout, 2000, 7000) * 1.4
    return x + gout + amb_vent(n, seed + 9, .3)


def amb_mer(n, seed=0):
    t = np.arange(n) / SR
    houle = (np.sin(2 * np.pi * t / 7.3) * .5 + .5) ** 2
    x = norm(passe_bas(brun(n, seed), 700), .55) * (.35 + .65 * houle)
    x += norm(passe_haut(rose(n, seed + 1), 2500), .12) * houle ** 3
    return x.astype(np.float32) + amb_vent(n, seed + 2, .3)


def amb_grotte(n, seed=0):
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 48 * t) * .08 + np.sin(2 * np.pi * 72.3 * t) * .04).astype(np.float32)
    x *= lfo(n, .05, seed, .5)
    x += norm(passe_bas(brun(n, seed), 200), .15)
    g = _g(seed + 2)
    for _ in range(max(1, int(n / SR / 1.7))):
        i = int(g.integers(0, max(1, n - SR)))
        d = snd_goutte(seed=i)
        x[i:i + len(d)] += d[:n - i] * .35
    return x


def amb_interieur(n, seed=0):
    t = np.arange(n) / SR
    x = norm(passe_bas(brun(n, seed), 250), .12)
    x += (np.sin(2 * np.pi * 50 * t) * .015).astype(np.float32)
    x += amb_vent(n, seed + 1, .25)   # vent dehors
    return x


def amb_bunker(n, seed=0):
    t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * 60 * k * t) / k for k in (1, 2, 3, 5)) * .05
    x = hum.astype(np.float32) * lfo(n, .4, seed, .2)
    x += norm(passe_bande(rose(n, seed), 300, 2000), .1) * lfo(n, .1, seed + 1, .3)
    return x


def amb_ville(n, seed=0):
    t = np.arange(n) / SR
    x = amb_vent(n, seed, .5)
    x += (np.sin(2 * np.pi * 100 * t) * .02).astype(np.float32) * lfo(n, 3, seed, .5)
    x += norm(passe_bas(brun(n, seed + 4), 120), .15)
    return x


def amb_chute(n, seed=0):
    return norm(passe_bande(blanc(n, seed), 250, 2500), .5) * lfo(n, 3, seed, .3) + amb_vent(n, seed + 1, 1.2) * .5


def amb_sous_eau(n, seed=0):
    t = np.arange(n) / SR
    x = norm(passe_bas(brun(n, seed), 160), .35) + (np.sin(2 * np.pi * 38 * t) * .05).astype(np.float32)
    g = _g(seed)
    for _ in range(max(1, n // (SR // 2))):
        i = int(g.integers(0, max(1, n - SR // 10)))
        m = SR // 20
        f = g.uniform(250, 700)
        x[i:i + m] += (np.sin(2 * np.pi * (f + 1800 * t[:m]) * t[:m]) * env(m, .002, .015) * .25)[:n - i]
    return x


def amb_drone(n, seed=0):
    return amb_grotte(n, seed) * .6


AMBIANCES = {
    "vent": amb_vent, "vent_fort": lambda n, s=0: amb_vent(n, s, 1.6), "blizzard": lambda n, s=0: amb_vent(n, s, 1.8),
    "foret": amb_foret, "pluie": amb_pluie, "mer": amb_mer, "grotte": amb_grotte, "interieur": amb_interieur,
    "bunker": amb_bunker, "ville": amb_ville, "drone": amb_drone, "chute": amb_chute, "sous_eau": amb_sous_eau, "silence": lambda n, s=0: np.zeros(n, np.float32),
}


# ----------------------------------------------------------------------------- bruitages

def snd_boom(seed=0, d=1.2):
    """Coup sourd ROND (07/11 : les booms saturés « rendaient trop mal ») : sinus grave court + souffle doux."""
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 55 + 35 * np.exp(-t * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .004, .32)
    x += passe_bande(blanc(n, seed), 200, 1800) * env(n, .002, .08) * .5
    return norm(x, .8)


def snd_tonnerre(seed=0, d=4.0):
    n = int(SR * d)
    x = passe_bas(brun(n, seed), 300) * env(n, .02, 1.3) * lfo(n, 6, seed, .8)
    x += passe_bande(blanc(n, seed + 1), 800, 5000) * env(n, .001, .08) * .6
    return norm(x, .9)


def snd_whoosh(seed=0, d=.8):
    n = int(SR * d)
    x = blanc(n, seed)
    out = np.zeros(n, np.float32)
    seg = n // 16
    for k in range(16):
        f = 300 + 3000 * (np.sin(np.pi * k / 16))
        s = slice(k * seg, (k + 1) * seg + 200)
        out[s] += passe_bande(x[s], f * .7, f * 1.3)[:len(out[s])]
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return norm(out * e, .7)


def snd_riser(seed=0, d=1.8):
    n = int(SR * d)
    t = np.arange(n) / SR
    k = t / d
    f = 80 + 900 * k ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * .3 + passe_haut(blanc(n, seed), 1500) * .3
    return norm(x * k ** 2.5, .7)


def snd_craquement(seed=0, d=.4):
    n = int(SR * d)
    g = _g(seed)
    x = np.zeros(n, np.float32)
    for _ in range(g.integers(3, 7)):
        i = int(g.integers(0, n // 2))
        L = int(SR * g.uniform(.004, .02))
        x[i:i + L] += blanc(L, int(i)) * g.uniform(.4, 1)
    return norm(passe_bande(x, 600, 6000), .8)


def snd_coeur(seed=0, bpm=70, d=4.0):
    n = int(SR * d)
    x = np.zeros(n, np.float32)
    per = 60 / bpm
    t0 = 0.0
    m = int(SR * .18)
    tt = np.arange(m) / SR
    coup = (np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 28)).astype(np.float32)
    while t0 < d:
        for dt, a in ((0, 1), (.22, .7)):
            i = int((t0 + dt) * SR)
            if i + m < n:
                x[i:i + m] += coup * a
        t0 += per
    return norm(x, .9)


def snd_pas(seed=0, dur=.18, force=1.0):
    n = int(SR * dur)
    x = passe_bas(blanc(n, seed), 900) * env(n, .002, .04)
    x += passe_bande(blanc(n, seed + 1), 2000, 6000) * env(n, .001, .015) * .3
    return norm(x, .5 * force)


def snd_grincement(seed=0, d=1.4):
    n = int(SR * d)
    t = np.arange(n) / SR
    g = _g(seed)
    f = 260 + 120 * np.sin(2 * np.pi * .7 * t) + 40 * lfo(n, 5, seed)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    stick = (lfo(n, 23, seed + 1) > .55).astype(np.float32)
    x = passe_bande(saw * stick, 300, 3000) * np.sin(np.linspace(0, np.pi, n))
    return norm(x, .5)


def snd_statique(seed=0, d=1.2):
    n = int(SR * d)
    x = passe_bande(blanc(n, seed), 1200, 5000) * (lfo(n, 14, seed) > .4)
    return norm(x * np.sin(np.linspace(0, np.pi, n)) ** .3, .45)


def snd_tic(seed=0):
    n = int(SR * .05)
    x = passe_bande(blanc(n, seed), 2500, 9000) * env(n, .0005, .006)
    return norm(x, .5)


def snd_souffle(seed=0, d=1.6):
    n = int(SR * d)
    x = passe_bande(rose(n, seed), 400, 2500)
    e = np.concatenate([np.sin(np.linspace(0, np.pi, n // 2)) ** 2, np.sin(np.linspace(0, np.pi, n - n // 2)) ** 2 * .7])
    return norm(x * e, .35)


def snd_sub(seed=0, d=3.0):
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 45 - 20 * (t / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .01, 1.2)
    return norm(x, .9)


def snd_goutte(seed=0):
    n = int(SR * .25)
    t = np.arange(n) / SR
    g = _g(seed)
    f0 = g.uniform(900, 1800)
    f = f0 * (1 + .8 * np.exp(-t * 60))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .03)
    return x.astype(np.float32)


def snd_porte(seed=0):
    x = snd_grincement(seed, 1.1)
    b = snd_boom(seed, .8) * .5
    out = np.zeros(len(x) + len(b), np.float32)
    out[:len(x)] += x
    out[len(x) - 2000:len(x) - 2000 + len(b)] += b
    return out


def snd_plouf(seed=0, d=1.4):
    """Chute dans l'eau : impact + gerbe + bulles."""
    n = int(SR * d)
    x = passe_bas(blanc(n, seed), 1200) * env(n, .003, .12) * 1.4
    x += passe_bande(blanc(n, seed + 1), 1500, 6000) * env(n, .01, .35) * .6
    t = np.arange(n) / SR
    g = _g(seed)
    for _ in range(9):
        i = int(g.uniform(.15, .9) * n)
        m = int(SR * .06)
        f = g.uniform(300, 900)
        b = np.sin(2 * np.pi * (f + 2500 * t[:m]) * t[:m]) * env(m, .002, .02)
        x[i:i + m] += b[:n - i] * .4
    return norm(x, .9)


def snd_chute(seed=0, d=3.0):
    """Souffle de chute libre qui s'intensifie."""
    n = int(SR * d)
    k = np.linspace(0, 1, n)
    x = passe_bande(blanc(n, seed), 300, 3000) * (.2 + .8 * k ** 1.5)
    x += passe_bas(brun(n, seed + 1), 300) * .6 * k
    return norm(x * lfo(n, 4, seed, .3), .8)


def snd_eboulement(seed=0, d=2.5):
    """Roches qui dégringolent."""
    n = int(SR * d)
    x = passe_bas(brun(n, seed), 250) * env(n, .05, 1.0)
    g = _g(seed)
    for _ in range(40):
        i = int(g.uniform(0, .8) * n)
        L = int(SR * g.uniform(.01, .05))
        x[i:i + L] += passe_bas(blanc(L, i), 1500)[:max(0, min(L, n - i))] * g.uniform(.3, 1)
    return norm(x, .85)


def snd_echec(seed=0, d=1.4):
    """Mauvais choix : un coup sourd rond + une note basse douce qui descend (plus de signal carré saturé)."""
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 196 * np.exp(-t * .9)
    ton = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .02, .7) * .35
    ton += np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * env(n, .03, .5) * .12
    x = snd_boom(seed, d)[:n] * .8 + ton.astype(np.float32)
    return norm(x, .8)


def snd_rembobine(seed=0, d=.55):
    """Bande magnétique qu'on rembobine (retour en arrière)."""
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 2500 - 1800 * (t / d) + 300 * np.sin(2 * np.pi * 23 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 + passe_bande(blanc(n, seed), 1500, 7000) * .4
    x *= (lfo(n, 30, seed) > .35)
    return norm(x * np.sin(np.linspace(0, np.pi, n)) ** .5, .6)


def snd_vibreur(seed=0, d=1.6):
    """Téléphone qui vibre sur une surface : deux salves de bourdonnement grave."""
    n = int(SR * d)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 165 * t) * .6 + np.sign(np.sin(2 * np.pi * 82 * t)) * .25
    porte = ((t % .8) < .45).astype(np.float32)
    x = x * porte * (1 + .3 * np.sin(2 * np.pi * 9 * t))
    x = passe_bas(x.astype(np.float32), 900) + passe_bande(blanc(n, seed), 120, 600) * porte * .15
    return norm(x * env(n, .005, d * .9), .7)


def snd_notification(seed=0, d=.6):
    """Petit « ding » de notification (deux notes)."""
    n = int(SR * d)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1318 * t) * np.exp(-t * 9) + np.sin(2 * np.pi * 1760 * np.clip(t - .09, 0, None)) * \
        np.exp(-np.clip(t - .09, 0, None) * 8) * (t > .09)
    return norm(x * .8, .55)


def snd_sonnerie(seed=0, d=3.0):
    """Sonnerie d'appel : motif de notes qui se répète."""
    n = int(SR * d)
    t = np.arange(n) / SR
    notes = [988, 1319, 988, 1175]
    x = np.zeros(n, np.float32)
    for k in range(int(d / .9) + 1):
        for j, f in enumerate(notes):
            t0 = k * .9 + j * .12
            i0 = int(t0 * SR)
            if i0 >= n:
                break
            m = min(n - i0, int(SR * .11))
            tt = np.arange(m) / SR
            x[i0:i0 + m] += (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18)).astype(np.float32)
    return norm(x, .55)


def snd_sonnette(seed=0, d=1.6):
    """Sonnette d'appartement « ding-dong » : deux notes de carillon qui résonnent."""
    n = int(SR * d)
    x = np.zeros(n, np.float32)
    for t0, f in ((0.0, 784), (.42, 622)):
        i0 = int(t0 * SR)
        m = n - i0
        tt = np.arange(m) / SR
        note = np.sin(2 * np.pi * f * tt) + .35 * np.sin(2 * np.pi * f * 2.01 * tt) + .15 * np.sin(2 * np.pi * f * 3 * tt)
        x[i0:] += (note * np.exp(-tt * 3.2) * np.minimum(1, tt * 400)).astype(np.float32)
    return norm(x, .55)


def snd_alarme(seed=0, d=3.0):
    """Alerte officielle (alerte enlèvement / séisme) : bip strident modulé, très reconnaissable."""
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 853 + 107 * (np.sin(2 * np.pi * 2 * t) > 0)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    x *= ((t % .5) < .38)
    return norm(np.tanh(x * 1.5) * env(n, .01, d), .6)


def snd_hurlement(seed=0, d=1.8):
    """Cri lointain inhumain (voix filtrée qui glisse)."""
    n = int(SR * d)
    t = np.arange(n) / SR
    f = 520 + 380 * np.sin(np.pi * t / d) + 30 * np.sin(2 * np.pi * 6 * t)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .5 + passe_bande(blanc(n, seed), 600, 2600) * .4
    x = passe_bande(x.astype(np.float32), 400, 3000)
    return norm(x * np.sin(np.linspace(0, np.pi, n)) ** 1.5, .5)


BRUITAGES = {
    "plouf": snd_plouf, "chute": snd_chute, "eboulement": snd_eboulement,
    "echec": snd_echec, "rembobine": snd_rembobine,
    "boom": snd_boom, "impact": snd_boom, "tonnerre": snd_tonnerre, "whoosh": snd_whoosh, "riser": snd_riser,
    "craquement": snd_craquement, "coeur": snd_coeur, "pas": snd_pas, "grincement": snd_grincement,
    "statique": snd_statique, "tic": snd_tic, "souffle": snd_souffle, "sub": snd_sub, "goutte": snd_goutte,
    "porte": snd_porte, "vibreur": snd_vibreur, "notification": snd_notification, "sonnerie": snd_sonnerie,
    "sonnette": snd_sonnette,
    "alarme": snd_alarme, "hurlement": snd_hurlement,
}
# 07/11 (audit épisode 14 : « limite les bruitages horribles ») : tout plus bas, et les sons agressifs (statique,
# sub, alarme, hurlement, grincement) très bas — un bruitage accompagne l'image, il ne la couvre jamais.
VOLUMES = {"plouf": .3, "chute": .25, "eboulement": .25, "echec": .3, "rembobine": .25, "boom": .28, "impact": .28,
           "tonnerre": .3, "whoosh": .22, "riser": .22, "craquement": .3, "coeur": .35, "pas": .16, "grincement": .15,
           "statique": .1, "tic": .14, "souffle": .2, "sub": .12, "goutte": .2, "porte": .3, "vibreur": .3,
           "notification": .3, "sonnerie": .25, "sonnette": .3, "alarme": .15, "hurlement": .15}


# ----------------------------------------------------------------------------- nappe de tension

def nappe(n, tension, seed=0):
    """Drone grave dont le volume et la dissonance suivent la tension (tableau 0..1 par échantillon)."""
    t = np.arange(n) / SR
    # nappe plus haute et plus douce (07/11) : le drone à 41 Hz faisait 80–99 % du son pendant les morts — une boue
    # grave que les téléphones ne restituent même pas
    x = (np.sin(2 * np.pi * 82.4 * t) + .6 * np.sin(2 * np.pi * 82.9 * t) + .35 * np.sin(2 * np.pi * 123.5 * t))
    diss = np.sin(2 * np.pi * 174.6 * t) * .15 + np.sin(2 * np.pi * 233.1 * t) * .06
    x = x * .3 + diss * tension
    return (x * (.03 + .18 * tension)).astype(np.float32)


# ----------------------------------------------------------------------------- voix

def charger_audio(chemin):
    """Décode n'importe quel fichier audio en mono float32 48 kHz."""
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", chemin, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).copy()


def assembler_voix(chemins, sortie, silence=1.0):
    """Plusieurs fichiers de voix (outil limité en caractères par conversion) → un seul wav,
    avec une vraie pause entre chaque morceau pour que la synchro voie la coupure."""
    if isinstance(chemins, str):
        chemins = [chemins]
    if len(chemins) == 1:
        return chemins[0]
    blanc_ = np.zeros(int(SR * silence), np.float32)
    morceaux = []
    for i, c in enumerate(chemins):
        x = charger_audio(c)
        morceaux += [x] if i == 0 else [blanc_, x]
    v = np.concatenate(morceaux)
    _ecrire_wav(sortie, np.stack([v, v], 1))
    return sortie


def enveloppe(x, fenetre=.03):
    w = max(1, int(SR * fenetre))
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    m = (c[w:] - c[:-w]) / w
    m = np.concatenate([np.full(w // 2, m[0]), m, np.full(len(x) - len(m) - w // 2, m[-1])])
    e = np.sqrt(np.maximum(m, 0)).astype(np.float32)
    return passe_bas(e, 6, 1)


# ----------------------------------------------------------------------------- mixage

def mixer(plan, total, voix=None, musique=None, chemin_wav="mix.wav"):
    """plan = liste de scènes avec : debut, duree, ambiance, tension, bruitages[(t_abs, nom, vol, params)],
    voix_src (debut, fin) dans le fichier voix, voix_pos (instant absolu où placer la voix), silences[(t0,t1)].
    """
    N = int(total * SR) + SR
    bed = np.zeros(N, np.float32)
    tens = np.zeros(N, np.float32)
    sfx = np.zeros(N, np.float32)
    vx = np.zeros(N, np.float32)
    coupe = np.ones(N, np.float32)
    xf = int(.35 * SR)
    for i, s in enumerate(plan):
        a = int(s["debut"] * SR)
        n = int(s["duree"] * SR)
        fn = AMBIANCES.get(s.get("ambiance", "vent"), amb_vent)
        amb = fn(n + xf, 11 + i)
        amb = norm(amb, .55) * s.get("volume_ambiance", 1.0)
        amb = fondu(amb, .3 if i else .05, .35)
        b = min(N, a + len(amb))
        bed[a:b] += amb[:b - a]
        t0, t1 = s.get("tension", (.3, .3)) if isinstance(s.get("tension"), (list, tuple)) else (s.get("tension", .3),) * 2
        tens[a:a + n] = np.linspace(t0, t1, n)[:len(tens[a:a + n])]
        for (t_abs, nom, vol, prm) in s.get("bruitages", []):
            fn = BRUITAGES.get(nom)
            if not fn:
                continue
            son = fn(seed=int(t_abs * 1000), **prm) * vol * VOLUMES.get(nom, .5)
            if nom == "riser":       # le riser se termine sur l'instant indiqué
                t_abs -= len(son) / SR
            j = int(max(0, t_abs) * SR)
            k = min(N, j + len(son))
            sfx[j:k] += son[:k - j]
        for (c0, c1) in s.get("silences", []):
            j, k = int(c0 * SR), int(c1 * SR)
            coupe[j:k] = .12            # jamais de silence numérique (audit : 1 s de vide total à 1:31 = « bug »)
        if voix is not None and s.get("voix_src"):
            v0, v1 = s["voix_src"]
            seg = voix[int(v0 * SR):int(v1 * SR)].copy()
            seg = fondu(seg, .012, .03)
            j = int(s["voix_pos"] * SR)
            k = min(N, j + len(seg))
            vx[j:k] += seg[:k - j]
    # lisser les coupures de son (pas de clic)
    coupe = passe_bas(coupe, 30, 1)
    tens = passe_bas(tens, 2, 1)
    drone = nappe(N, np.clip(tens, 0, 1))
    # audit 05/11/2026 : TikTok signalait « Supprime le bruit de fond » (fond à ~10 dB sous la voix, souffle large
    # bande). Le fond passe ~15 dB sous la voix et perd son souffle aigu (passe-bas) : la voix reste nette.
    bed = passe_bas(bed, 2200, 2)
    fond = (bed * .3 + drone * .6) * coupe
    if musique is not None:
        m = np.resize(musique, N) * .35
        fond += m * coupe
    # ducking : la voix passe toujours devant
    if voix is not None:
        e = enveloppe(vx)
        e = e / (np.percentile(e[e > 1e-4], 95) if np.any(e > 1e-4) else 1)
        g = 1 - .72 * np.clip(e, 0, 1)
        fond *= g
        vx = norm(vx, .9) if np.max(np.abs(vx)) > 0 else vx
    # limiteur du bus bruitages : un impact ne dépasse jamais nettement la voix (audit ép. 5 : pics à 0 dB)
    ref = .3
    if voix is not None and np.any(np.abs(vx) > 1e-4):
        ev = enveloppe(vx * 1.15, .05)
        ref = float(np.percentile(ev[ev > 1e-3], 90)) if np.any(ev > 1e-3) else .3
    es = enveloppe(sfx, .03)
    gain = np.minimum(1.0, (ref * .7) / (es + 1e-6)).astype(np.float32)      # bruitages toujours SOUS la voix
    gain = passe_bas(gain, 25, 1)
    sfx = sfx * np.clip(gain, 0, 1)
    mix = fond * .9 + sfx + vx * 1.15
    mix = np.tanh(mix * 1.1) * .95
    mix = mix[:int(total * SR)]
    st = np.stack([mix, mix], 1)
    _ecrire_wav(chemin_wav, st)
    return chemin_wav


def _ecrire_wav(chemin, st):
    import wave
    pcm = (np.clip(st, -1, 1) * 32767).astype("<i2")
    with wave.open(chemin, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ----------------------------------------------------------------------------- format « lumière » : voix, musique, sons du montage
def mixer_lumiere(plan, total, voix=None, musique=None, sons=(), chemin_wav="mix.wav", niveau_musique_db=-15.0):
    """La voix devant, une musique douce dessous (qui s'efface un peu quand on parle), quelques sons de montage
    discrets (souffle de transition, pop d'une étiquette, carillon de fin). AUCUNE ambiance ni bruitage de décor.
    musique : stéréo (N, 2) ou mono ; sons : [(t_abs, nom, volume)]."""
    from noyau import musique as MU
    N = int(total * SR) + SR
    vx = np.zeros(N, np.float32)
    for s in plan:
        if voix is not None and s.get("voix_src"):
            v0, v1 = s["voix_src"]
            seg = fondu(voix[int(v0 * SR):int(v1 * SR)].copy(), .012, .03)
            j = int(s["voix_pos"] * SR)
            k = min(N, j + len(seg))
            vx[j:k] += seg[:k - j]
    a_voix = np.any(np.abs(vx) > 1e-4)
    if a_voix:
        vx = norm(vx, .9)
        ev = enveloppe(vx, .05)
        rms_v = float(np.sqrt(np.mean(vx[ev > .05] ** 2))) if np.any(ev > .05) else .1
    else:
        rms_v = .12
    mus = np.zeros((N, 2), np.float32)
    if musique is not None:
        m = musique if musique.ndim == 2 else np.stack([musique, musique], 1)
        m = m[:N]
        mus[:len(m)] = m
        rm = float(np.sqrt(np.mean(m ** 2))) + 1e-9
        mus *= (rms_v * 10 ** (niveau_musique_db / 20)) / rm
        if a_voix:                                 # la musique s'efface doucement sous la voix (−4 dB environ)
            e = passe_bas(np.clip(enveloppe(vx, .08) / (np.percentile(ev[ev > 1e-3], 90) + 1e-9), 0, 1), 3, 1)
            mus *= (1 - .38 * e)[:, None]
    sfx = np.zeros(N, np.float32)
    for (t_abs, nom, vol) in sons:
        fn = MU.SONS.get(nom)
        if not fn:
            continue
        x = fn(seed=int(t_abs * 1000))
        x = x / (np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) + 1e-9) * rms_v * 10 ** (-17 / 20) * vol
        j = int(max(0, t_abs) * SR)
        k = min(N, j + len(x))
        sfx[j:k] += x[:k - j]
    st = mus + (vx * 1.0 + sfx)[:, None]
    st = np.tanh(st * 1.05) * .97
    st = st[:int(total * SR)]
    _ecrire_wav(chemin_wav, st)
    # la voix doit rester intelligible : son écart avec la musique, mesuré là où l'on parle
    stats = {}
    if a_voix and musique is not None:
        parle = ev > .05
        rm = float(np.sqrt(np.mean(mus.mean(axis=1)[parle] ** 2))) + 1e-9
        stats["ecart_voix_musique_db"] = round(20 * np.log10(rms_v / rm), 1)
    import json
    json.dump(stats, open(chemin_wav + ".json", "w", encoding="utf-8"))
    return chemin_wav

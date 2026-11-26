"""La musique des vidéos « lumière » : un piano feutré et une nappe douce, composés pour CHAQUE vidéo (aucun fichier,
aucun droit). Comme dans les vidéos d'enseignement qu'Alexis aime : des accords tenus, un piano qui égrène, sous la
voix, jamais devant ; plus présents au tournant de l'histoire, qui se résolvent sur la fin.

    generer(total, sections, tonalite="G", tempo=72, seed=1) -> stéréo float32 (N, 2) à 48 kHz

sections = [(debut, fin, intensite 0–1), …] : la courbe émotionnelle (le récit qui monte, le tournant, l'apaisement).
Et les petits sons du montage : un souffle aux changements de plan, un « pop » feutré, un carillon de fin.
"""
import numpy as np
from scipy import signal

SR = 48000
NOTES = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
         "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
# progressions (degrés de la gamme majeure, en demi-tons depuis la tonique) : accords de 3 sons + basse
PROGRESSIONS = {
    "espoir": [(0, "maj"), (7, "maj"), (9, "min"), (5, "maj")],          # I – V – vi – IV
    "intime": [(9, "min"), (5, "maj"), (0, "maj"), (7, "maj")],          # vi – IV – I – V
    "grave": [(9, "min"), (4, "min"), (5, "maj"), (0, "maj")],           # vi – iii – IV – I
}


def _hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def _accord(racine, qual):
    return [racine, racine + (4 if qual == "maj" else 3), racine + 7]


def piano(freq, duree, vel=.6, seed=0):
    """Une note de piano feutré : partiels légèrement inharmoniques, chacun avec sa décroissance, attaque douce."""
    n = int(SR * duree)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    out = np.zeros(n, np.float32)
    B = .00035
    for k in range(1, 9):
        fk = freq * k * np.sqrt(1 + B * k * k)
        if fk > 7000:
            break
        amp = (1 / k ** 1.25) * (1.0 if k == 1 else .75) * (.55 + .45 * vel)
        tau = 2.6 / (1 + .55 * (k - 1)) * (1.2 if freq < 200 else 1.0) * (.75 + .25 * vel)
        ph = rng.uniform(0, 2 * np.pi)
        out += (amp * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + ph)).astype(np.float32)
    att = np.clip(t / .006, 0, 1)
    out *= att
    # feutre : moins d'aigus quand on joue doucement
    b, a = signal.butter(2, min(.95, (1400 + 2600 * vel) / (SR / 2)))
    out = signal.lfilter(b, a, out).astype(np.float32)
    rel = np.clip((duree - t) / .25, 0, 1)
    return out * rel * vel


def nappe(freqs, duree, seed=0):
    """Nappe (cordes douces / pad) : dents de scie désaccordées, très filtrées, attaque et relâche lentes."""
    n = int(SR * duree)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(seed)
    for f0 in freqs:
        for det in (-.006, 0, .007):
            f = f0 * (1 + det)
            ph = rng.uniform(0, 1)
            saw = 2 * (((f * t + ph) % 1) - .5)
            out += saw.astype(np.float32) * .3
    b, a = signal.butter(2, 900 / (SR / 2))
    out = signal.lfilter(b, a, out).astype(np.float32)
    env = np.minimum(np.clip(t / 1.4, 0, 1), np.clip((duree - t) / 1.6, 0, 1))
    trem = 1 + .06 * np.sin(2 * np.pi * .23 * t)
    return out * env * trem / max(1, len(freqs))


def reverb(x, duree=2.8, mix=.32, seed=3):
    """Réverbération de salle douce (réponse impulsionnelle synthétique, stéréo décorrélée)."""
    rng = np.random.default_rng(seed)
    n = int(SR * duree)
    t = np.arange(n) / SR
    out = []
    for c in range(2):
        ir = rng.standard_normal(n).astype(np.float32) * np.exp(-t * 6.9 / duree).astype(np.float32)
        b, a = signal.butter(1, 5000 / (SR / 2))
        ir = signal.lfilter(b, a, ir).astype(np.float32)
        ir[: int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        w = signal.fftconvolve(x, ir)[: len(x)].astype(np.float32)
        out.append(x * (1 - mix) + w * mix * 1.6)
    return np.stack(out, 1)


GAMME = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]


def theme(seed):
    """Le thème de la vidéo (5 notes de la gamme, du grave vers l'aigu puis qui retombe) : le même du début à la fin,
    pour que l'oreille le reconnaisse au moment clé puis à la résolution."""
    r = np.random.default_rng(seed + 101)
    haut = int(r.integers(4, 7))
    return [GAMME[0], GAMME[2], GAMME[haut], GAMME[haut - 1 - int(r.integers(0, 2))], GAMME[int(r.integers(1, 3))]]


def composer(total, sections=None, tonalite="G", tempo=72, humeur="espoir", seed=1, tournant=None):
    """La partition : [{t, d, note (midi), vel 0–1, voix: piano|nappe|basse}] — la même pour les deux moteurs de son.
    Le thème (theme()) est posé au début, repris une octave plus haut au tournant (le moment clé, en s), puis une
    dernière fois, lentement, avant la cadence finale (dominante → tonique)."""
    rng = np.random.default_rng(seed)
    tonique = 48 + NOTES.get(tonalite, 7)            # do3 = 48 : « G » donne bien sol3 (55) — avant le 24/11, tout sonnait une quinte trop haut
    prog = PROGRESSIONS.get(humeur, PROGRESSIONS["espoir"])
    noire = 60 / tempo
    mesure = 4 * noire
    sections = sections or [(0, total, .5)]

    def intensite(t):
        for (a, b, v) in sections:
            if a <= t < b:
                return v
        return sections[-1][2]

    ev = []
    t, k = 0.0, 0
    fin = total - 3.6
    while t < fin:
        deg, qual = prog[k % len(prog)]
        dur_acc = mesure * 2                          # un accord toutes les deux mesures (lent, tenu)
        derniere = t + dur_acc >= fin
        if derniere:
            deg, qual = 7, "maj"                      # la dominante, pour que la tonique finale se RÉSOLVE
        acc = _accord(tonique + deg - (12 if deg >= 7 else 0), qual)
        it = intensite(t)
        for m in [acc[0] - 24] + [x - 12 for x in acc]:     # nappe : l'accord tenu, plus présente quand ça monte
            ev.append(dict(t=t, d=dur_acc + .3, note=m, vel=.18 + .45 * it, voix="nappe"))
        ev.append(dict(t=t, d=min(dur_acc, 5), note=acc[0] - 12, vel=.42 + .2 * it, voix="basse"))
        pas = noire * (2 if it < .35 else 1 if it < .7 else .5)
        motif = [acc[0], acc[1] + 12, acc[2], acc[1] + 12, acc[0] + 12, acc[2]]
        tt, i = 0.0, 0
        while tt < dur_acc - .05:
            if not (it < .2 and i % 2):              # au plus calme : une note sur deux
                vel = (.33 + .25 * it) * (1.15 if i % 4 == 0 else .9) * rng.uniform(.85, 1.05)
                ev.append(dict(t=max(0, t + tt + rng.uniform(-.012, .012)), d=min(3.0, pas * 3), note=motif[i % len(motif)], vel=vel, voix="piano"))
            tt += pas
            i += 1
        if it >= .55 and not derniere:              # au tournant : une phrase mélodique au-dessus
            for q, (m, dt) in enumerate([(acc[2] + 12, 0), (acc[1] + 12 + 2, noire * 2), (acc[0] + 24, noire * 4), (acc[2] + 12, noire * 6)]):
                ev.append(dict(t=t + dt, d=noire * 2.5, note=m, vel=.42 + .2 * it, voix="piano"))
        t += dur_acc
        k += 1
    # le thème : au début (doux), au tournant (une octave plus haut, appuyé), avant la fin (lent)
    them = theme(seed)
    poses = [(noire * 2, 12, noire, .34)]
    if tournant is not None and noire * 8 < tournant < fin - mesure * 2:
        poses.append((tournant, 24, noire, .62))
    if fin - mesure * 2 > noire * 10:
        poses.append((fin - mesure * 2, 12, noire * 1.5, .4))
    for (t0, octave, pas_m, vel) in poses:
        for q, deg in enumerate(them):
            ev.append(dict(t=t0 + q * pas_m, d=pas_m * 2.2, note=tonique + octave + deg, vel=vel * (1.1 if q == 2 else 1), voix="piano"))
    acc = _accord(tonique, "maj")                    # résolution : l'accord de tonique, long, qui s'éteint
    for q, m in enumerate([acc[0] - 12, acc[0], acc[1], acc[2], acc[0] + 12]):
        ev.append(dict(t=max(0, total - 3.4) + q * .07, d=3.3, note=m, vel=.4, voix="piano"))
    return ev


def _synth_numpy(ev, total, seed=1):
    N = int(total * SR) + SR * 6
    mono_p = np.zeros(N, np.float32)
    mono_n = np.zeros(N, np.float32)
    nappes = {}
    for e in ev:
        if e["voix"] == "nappe":
            nappes.setdefault(round(e["t"], 3), []).append(e)
            continue
        x = piano(_hz(e["note"]), max(3.2, e["d"] + .6), e["vel"], seed=int(e["t"] * 1000) + e["note"])
        if e["voix"] == "basse":
            x *= .9
        j = int(e["t"] * SR)
        mono_p[j:j + len(x)] += x[: max(0, min(len(x), N - j))]
    for t0, grp in nappes.items():
        pad = nappe([_hz(e["note"]) for e in grp], grp[0]["d"] + 1.5, seed + int(t0)) * grp[0]["vel"]
        j = int(t0 * SR)
        mono_n[j:j + len(pad)] += pad[: max(0, min(len(pad), N - j))]
    return reverb(mono_p * .9 + mono_n * .55)


# ---- le vrai piano (échantillonné) : FluidSynth + une SoundFont libre, si elles sont installées (kit Claude Code)
def soundfont():
    """Une SoundFont de qualité (MuseScore General, MIT ; FluidR3 GM, MIT) : $VF_SOUNDFONT, ~/.cache/videos-foi, système."""
    import glob
    import os
    import shutil
    if not shutil.which("fluidsynth"):
        return None
    cands = [os.environ.get("VF_SOUNDFONT") or ""]
    cache = os.path.join(os.path.expanduser("~"), ".cache", "videos-foi")
    cands += sorted(glob.glob(os.path.join(cache, "*.sf3")) + glob.glob(os.path.join(cache, "*.sf2")))
    cands += ["/usr/share/sounds/sf3/MuseScore_General_Full.sf3", "/usr/share/sounds/sf3/MuseScore_General.sf3",
              "/usr/share/sounds/sf2/MuseScore_General.sf2", "/usr/share/sounds/sf2/FluidR3_GM.sf2",
              "/opt/homebrew/share/soundfonts/default.sf2", "/usr/local/share/soundfonts/default.sf2"]
    for c in cands:
        if c and os.path.exists(c) and os.path.getsize(c) > 20e6:      # les petites SoundFonts sonnent faux : on les ignore
            return c
    return None


def _midi(ev, chemin):
    """Écrit un fichier MIDI (format 0) : piano (canal 0), basse (canal 1, piano), nappe de cordes douces (canal 2)."""
    import struct
    ppq = 480                                        # tempo MIDI 60 : 1 temps = 1 s → ticks = secondes × 480
    msgs = []
    canal = {"piano": 0, "basse": 1, "nappe": 2}
    for e in ev:
        c = canal[e["voix"]]
        v = int(np.clip(e["vel"] * (110 if c < 2 else 80), 1, 127))
        msgs.append((int(e["t"] * ppq), 1, bytes([0x90 | c, e["note"], v])))
        msgs.append((int((e["t"] + e["d"]) * ppq), 0, bytes([0x80 | c, e["note"], 0])))
    msgs.sort(key=lambda m: (m[0], m[1]))
    def vlq(n):
        out = [n & 0x7F]
        n >>= 7
        while n:
            out.insert(0, (n & 0x7F) | 0x80)
            n >>= 7
        return bytes(out)
    trk = bytearray()
    trk += vlq(0) + b"\xff\x51\x03" + (1000000).to_bytes(3, "big")             # 60 bpm
    for c, prog, vol, rev in [(0, 0, 100, 70), (1, 0, 90, 60), (2, 49, 70, 90)]:  # piano, piano, cordes lentes
        trk += vlq(0) + bytes([0xC0 | c, prog]) + vlq(0) + bytes([0xB0 | c, 7, vol]) + vlq(0) + bytes([0xB0 | c, 91, rev])
    last = 0
    for tick, _, data in msgs:
        trk += vlq(tick - last) + data
        last = tick
    trk += vlq(0) + b"\xff\x2f\x00"
    with open(chemin, "wb") as f:
        f.write(b"MThd" + struct.pack(">IHHH", 6, 0, 1, ppq) + b"MTrk" + struct.pack(">I", len(trk)) + bytes(trk))


def _synth_fluidsynth(ev, total, sf):
    import os
    import subprocess
    import tempfile
    import scipy.io.wavfile as wavfile
    with tempfile.TemporaryDirectory() as d:
        mid, wav = os.path.join(d, "m.mid"), os.path.join(d, "m.wav")
        _midi(ev, mid)
        subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.5", "-r", str(SR), "-F", wav,
                        "-o", "synth.reverb.active=1", "-o", "synth.reverb.room-size=0.75", "-o", "synth.reverb.damp=0.35",
                        "-o", "synth.reverb.width=0.9", "-o", "synth.reverb.level=0.75", "-o", "synth.chorus.active=0",
                        sf, mid], check=True, capture_output=True)
        sr, x = wavfile.read(wav)
    x = x.astype(np.float32) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=0).astype(np.float32)
    # le feutre : on adoucit les aigus du piano (plus intime, sous une voix)
    b, a = signal.butter(2, 5200 / (SR / 2))
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)


def generer(total, sections=None, tonalite="G", tempo=72, humeur="espoir", seed=1, moteur="auto", tournant=None):
    """La musique de la vidéo, à la durée exacte. sections : [(t0, t1, intensité 0–1)] ; tournant : l'instant du moment
    clé (s). moteur : "auto" (vrai piano FluidSynth si disponible, sinon synthèse) | "fluidsynth" | "synthese"."""
    ev = composer(total, sections, tonalite, tempo, humeur, seed, tournant)
    sf = soundfont() if moteur in ("auto", "fluidsynth") else None
    st = None
    if sf:
        try:
            st = _synth_fluidsynth(ev, total, sf)
        except Exception as e:                       # noqa: BLE001
            print("  (FluidSynth a échoué :", e, "→ synthèse)")
    if st is None:
        st = _synth_numpy(ev, total, seed)
    N = int(total * SR)
    if len(st) < N:
        st = np.concatenate([st, np.zeros((N - len(st), 2), np.float32)])
    st = st[:N]
    st = st / (np.max(np.abs(st)) + 1e-9) * .8
    fade = np.clip((total - np.arange(N) / SR) / 1.5, 0, 1)[:, None]
    return (st * fade).astype(np.float32)


# ----------------------------------------------------------------------------- les sons du montage (discrets)
def son_souffle(seed=0, d=.5):
    """Transition : un souffle d'air doux qui passe (bruit filtré qui monte puis s'éteint)."""
    n = int(SR * d)
    rng = np.random.default_rng(seed)
    x = rng.standard_normal(n).astype(np.float32)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    seg = n // 12
    for k in range(12):
        fc = 500 + 1500 * (k / 11) ** .8
        s = slice(k * seg, min(n, (k + 1) * seg + 400))
        b, a = signal.butter(2, [fc * .55 / (SR / 2), min(.99, fc * 1.6 / (SR / 2))], "band")
        out[s] += signal.lfilter(b, a, x[s]).astype(np.float32)[: len(out[s])]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return out * env.astype(np.float32) * .5


def son_pop(seed=0):
    """Une étiquette ou une carte qui apparaît : petit « toc » feutré, très court."""
    n = int(SR * .12)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    s = np.sin(2 * np.pi * 620 * t) * np.exp(-t / .025) * .5 + rng.standard_normal(n) * np.exp(-t / .006) * .25
    b, a = signal.butter(2, 3500 / (SR / 2))
    return signal.lfilter(b, a, s).astype(np.float32)


def son_carillon(seed=0, d=3.2, f0=784.0):
    """L'écran de fin : une cloche douce (partiels inharmoniques)."""
    n = int(SR * d)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    for r, a, tau in [(1, 1, 1.6), (2.0, .4, 1.0), (2.76, .35, .8), (5.4, .15, .4), (8.93, .06, .25)]:
        out += (a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / tau)).astype(np.float32)
    out *= np.clip(t / .004, 0, 1)
    return out * .35


SONS = {"souffle": son_souffle, "pop": son_pop, "carillon": son_carillon}

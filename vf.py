#!/usr/bin/env python3
"""vf — les commandes du projet « Faire connaître Dieu » (Windows, macOS, Linux).

    python vf.py docteur                      vérifie que tout est installé
    python vf.py nouvelle v04                 crée videos/v04/ avec un video.json de départ
    python vf.py realiser videos/v04 [--appliquer]   le réalisateur propose cadrages, gestes, visages, signes (à relire)
    python vf.py verifier videos/v04          la Parole, le message, la structure (avant tout)
    python vf.py interface                    l'ATELIER : tout l'outil dans le navigateur (ou double-clic sur « Ouvrir l'atelier »)
    python vf.py studio videos/v04            l'atelier, ouvert sur cette vidéo
    python vf.py apercu videos/v04 [3,5]      images de contrôle (planche.png) + cadrage contrôlé sur tout le plan
    python vf.py voix videos/v04 [--plan 7] [--modele eleven_v3]   la voix ElevenLabs, un fichier par plan
    python vf.py rendu videos/v04 [--musique fond.mp3]             le MP4 final (videos/v04/rendu/video.mp4)
    python vf.py livrables videos/v04         description, hashtags, commentaire à épingler, ligne de journal
    python vf.py tout videos/v04 [--forcer]   vérifier → voix → aperçu + contrôles → rendu → livrables (s'arrête au 1er souci)
    python vf.py empaqueter                   dist/videos-foi.skill (à téléverser sur claude.ai)

Améliorer le moteur sans rien casser :
    python vf.py banc etreinte                un banc d'essai d'animation (scripts/film/test/bancs/) → bancs/etreinte.png
    python vf.py tests                        les tests du moteur (chaque défaut connu a son témoin)
    python vf.py atlas [--figer]              l'atlas de précision : toutes les poses × 3 vues × 3 personnages + les meubles → bancs/atlas/
    python vf.py reference videos/exemple-trop-loin   fige les images de contrôle (videos/…/reference/)
    python vf.py comparer videos/exemple-trop-loin    refait l'aperçu et montre ce qui a changé depuis la référence

Le moteur et le savoir-faire sont dans .claude/skills/videos-foi/ (le skill, chargé tout seul par Claude Code).
La charte vivante du projet (DA, voix, leçons apprises) : charte.md, à la racine.
"""
import os
import shutil
import subprocess
import sys
import zipfile

RACINE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.join(RACINE, ".claude", "skills", "videos-foi")
S = os.path.join(SKILL, "scripts")
BANCS = os.path.join(S, "film", "test", "bancs")
CHARTE = os.path.join(RACINE, "charte.md")
PY = sys.executable
MOMENTS_APERCU = "0.35,0.9"
# rendu : 4 navigateurs suffisent (mesuré le 24/11 : la carte graphique sature, 4, 6 ou 8 workers vont aussi vite)
WORKERS = max(2, min(4, (os.cpu_count() or 4) - 1))

sys.path.insert(0, S)
import noyau  # noqa: E402,F401  (console UTF-8 sous Windows : voir noyau/__init__.py)


def lancer(*args, arret=True):
    r = subprocess.run([PY, *map(str, args)], cwd=RACINE)
    if r.returncode and arret:
        sys.exit(r.returncode)
    return r.returncode


def dossier_video(arg):
    d = os.path.abspath(arg)
    if d.endswith(".json"):
        return os.path.dirname(d), d
    return d, os.path.join(d, "video.json")


def docteur():
    ok = True
    def test(nom, cond, aide):
        nonlocal ok
        print(("  ✓ " if cond else "  ✗ ") + nom + ("" if cond else f"  → {aide}"))
        ok &= bool(cond)
    print("Outils :")
    test("Python ≥ 3.9", sys.version_info >= (3, 9), "installe Python 3")
    for m in ("numpy", "scipy", "PIL"):
        try:
            __import__(m)
            test(f"module {m}", True, "")
        except ImportError:
            test(f"module {m}", False, "pip install numpy scipy pillow")
    test("ffmpeg", shutil.which("ffmpeg"), "installe ffmpeg (voir DEMARRAGE.md) ; s'il vient d'être installé : ferme et rouvre le terminal")
    test("node", shutil.which("node"), "installe Node.js ≥ 18")
    pw = shutil.which("node") and subprocess.run(["node", "-e", "require('playwright')"], cwd=os.path.join(S, "film"),
                                                  capture_output=True).returncode == 0
    test("Playwright + Chromium", pw, "relance l'installateur (npm install && npx playwright install chromium)")
    print("Optionnels (qualité) :")
    try:
        from noyau import musique as MU
        sf = MU.soundfont()
        print(("  ✓ " if sf else "  · ") + "vrai piano (FluidSynth + SoundFont)" + (f" : {sf}" if sf else " — sinon piano de synthèse (installateur)"))
    except ImportError as e:
        print(f"  · vrai piano : impossible à vérifier tant que {e.name} manque (voir plus haut)")
    cle = cle_elevenlabs()
    print(("  ✓ " if cle else "  · ") + "clé ElevenLabs dans .env" + ("" if cle else " — sinon voix à générer à la main"))
    print("Prêt." if ok else "Il manque des outils obligatoires.")


def cle_elevenlabs():
    """Une clé ElevenLabs est-elle renseignée dans .env ? (on ne lit que sa présence, jamais sa valeur)"""
    env = os.path.join(RACINE, ".env")
    if not os.path.exists(env):
        return False
    texte = open(env, encoding="utf-8").read()
    return "ELEVENLABS_API_KEY=" in texte and "ta_cle" not in texte


def nouvelle(nom):
    d = os.path.join(RACINE, "videos", nom)
    os.makedirs(d, exist_ok=True)
    f = os.path.join(d, "video.json")
    if os.path.exists(f):
        sys.exit(f"{f} existe déjà")
    open(f, "w", encoding="utf-8").write('{\n "titre": "",\n "type_video": "recit",\n "passage": "",\n "pont": {"ref": ""},\n'
                                          ' "style": {"format": "lumiere", "grain": 0.05, "musique": {"tonalite": "G", "tempo": 70, "humeur": "espoir"}},\n'
                                          ' "mots_par_seconde": 3.0,\n "personnages": {},\n "lieux": {},\n "plans": []\n}\n')
    print(f"Créé : {f} — demande à Claude d'écrire la vidéo (skill videos-foi).")


def empaqueter():
    os.makedirs(os.path.join(RACINE, "dist"), exist_ok=True)
    # la charte du projet (avec les leçons apprises) part avec le skill
    shutil.copy(CHARTE, os.path.join(SKILL, "assets", "charte.md"))
    # l'exemple du skill EST celui du projet (une seule source : il ne peut plus prendre de retard)
    ex = os.path.join(RACINE, "videos", "exemple-trop-loin")
    for src, dst in (("video.json", "film.json"), ("video_voix.txt", "film_voix.txt"), ("video_voix_elevenlabs.txt", "film_voix_elevenlabs.txt")):
        if os.path.exists(os.path.join(ex, src)):
            shutil.copy(os.path.join(ex, src), os.path.join(SKILL, "assets", "exemple-film", dst))
    out = os.path.join(RACINE, "dist", "videos-foi.skill")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for racine, dirs, fichiers in os.walk(SKILL):
            dirs[:] = [x for x in dirs if x not in ("node_modules", "__pycache__", ".studio")]
            for f in fichiers:
                if f.endswith((".pyc",)):
                    continue
                p = os.path.join(racine, f)
                z.write(p, os.path.join("videos-foi", os.path.relpath(p, SKILL)))
    print("Skill empaqueté :", out, "→ claude.ai › Réglages › Capacités › Skills › Importer")


def banc(nom):
    """Un banc d'essai : un chemin vers un cas, ou le nom d'un cas de scripts/film/test/bancs/."""
    cas = nom if os.path.exists(nom) else os.path.join(BANCS, nom + ".json")
    if not os.path.exists(cas):
        dispo = ", ".join(sorted(f[:-5] for f in os.listdir(BANCS) if f.endswith(".json")))
        sys.exit(f"Banc inconnu : {nom} — bancs : {dispo}")
    sortie = os.path.join(RACINE, "bancs", os.path.splitext(os.path.basename(cas))[0] + ".png")
    return lancer(os.path.join(S, "banc.py"), cas, "--sortie", sortie, arret=False)


def apercu(d, f, plans=None):
    """Les images de contrôle + les contrôles (cadrage, sauts…) ; renvoie les alertes (lignes « !! »)."""
    vp = os.path.join(d, "voix_plans")
    r = subprocess.run([PY, os.path.join(S, "film.py"), f, "--bible", CHARTE, "--apercu", os.path.join(d, "apercu"), "--moments", MOMENTS_APERCU,
                        *(["--plans", plans] if plans else []), *(["--voix-plans", vp] if os.path.isdir(vp) else [])],
                       cwd=RACINE, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(r.stdout, end="")
    print(r.stderr, end="", file=sys.stderr)
    if r.returncode:
        sys.exit(r.returncode)
    return [x.strip() for x in r.stdout.splitlines() if "!!" in x]


def interface(autres):
    lancer(os.path.join(S, "atelier.py"), "--racine", RACINE, "--bible", CHARTE, *autres)


def rendu(d, f, autres):
    vp = os.path.join(d, "voix_plans")
    mp3 = sorted(x for x in os.listdir(d) if x.lower().endswith((".mp3", ".wav")) and x.startswith("voix"))
    voix = ["--voix-plans", vp] if os.path.isdir(vp) else (["--voix", *[os.path.join(d, x) for x in mp3]] if mp3 else [])
    if not voix:
        print("Pas de voix (voix_plans/ ou voix*.mp3) : brouillon aux durées estimées.")
    lancer(os.path.join(S, "film.py"), f, "--bible", CHARTE, "--sortie", os.path.join(d, "rendu"),
           "--workers", str(WORKERS), *voix, *autres)


def tout(d, f, autres):
    """De bout en bout, en s'arrêtant à la première chose à corriger (--forcer : rendre malgré les alertes)."""
    forcer = "--forcer" in autres
    autres = [x for x in autres if x != "--forcer"]
    print("== 1/5 Vérifier (la Parole, le message, la structure)")
    lancer(os.path.join(S, "verifier_film.py"), f, "--bible", CHARTE)
    if cle_elevenlabs():
        print("== 2/5 Voix (ElevenLabs : seuls les plans changés sont refaits)")
        lancer(os.path.join(S, "voix.py"), f)
    else:
        print("== 2/5 Voix : pas de clé ElevenLabs dans .env — voix à générer à la main, sinon brouillon aux durées estimées")
    print("== 3/5 Aperçu et contrôles (cadrage, sauts)")
    alertes = apercu(d, f)
    if alertes and not forcer:
        sys.exit(f"{len(alertes)} alerte(s) à corriger avant le rendu (ou : python vf.py tout {os.path.relpath(d, RACINE)} --forcer)")
    print("== 4/5 Rendu (seuls les plans changés sont re-rendus)")
    rendu(d, f, autres)
    print("== 5/5 Livrables")
    lancer(os.path.join(S, "livrables.py"), f, arret=False)


def principal():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "aide"):
        print(__doc__)
        return
    cmd, reste = sys.argv[1], sys.argv[2:]
    if cmd == "docteur":
        return docteur()
    if cmd == "nouvelle":
        return nouvelle(reste[0])
    if cmd == "empaqueter":
        return empaqueter()
    if cmd == "interface":
        return interface(reste)
    if cmd == "tests":
        sys.exit(subprocess.run([PY, "-m", "unittest", "discover", "-s", os.path.join(S, "tests"), *reste], cwd=RACINE).returncode)
    if cmd == "atlas":
        sys.exit(lancer(os.path.join(S, "atlas.py"), *reste))
    if cmd == "banc":
        if not reste:
            sys.exit("Indique le banc, ex. : python vf.py banc etreinte")
        sys.exit(banc(reste[0]))
    if not reste:
        sys.exit("Indique le dossier de la vidéo, ex. : python vf.py studio videos/v04")
    d, f = dossier_video(reste[0])
    autres = reste[1:]
    if cmd == "verifier":
        lancer(os.path.join(S, "verifier_film.py"), f, "--bible", CHARTE)
    elif cmd == "studio":
        interface(["--video", os.path.basename(d), *autres])
    elif cmd == "apercu":
        plans = [x for x in autres if not x.startswith("-")]
        apercu(d, f, plans[0] if plans else None)
        print("Regarde :", os.path.join(d, "apercu", "planche.png"))
    elif cmd == "realiser":
        lancer(os.path.join(S, "realisateur.py"), f, *autres)
    elif cmd == "livrables":
        lancer(os.path.join(S, "livrables.py"), f)
    elif cmd == "tout":
        tout(d, f, autres)
    elif cmd == "reference":
        apercu(d, f)
        lancer(os.path.join(S, "non_regression.py"), "figer", os.path.join(d, "apercu"), os.path.join(d, "reference"))
    elif cmd == "comparer":
        apercu(d, f)
        lancer(os.path.join(S, "non_regression.py"), "comparer", os.path.join(d, "reference"), os.path.join(d, "apercu"),
               "--sortie", os.path.join(d, "apercu", "comparaison.png"))
    elif cmd == "voix":
        lancer(os.path.join(S, "voix.py"), f, *autres)
    elif cmd == "rendu":
        rendu(d, f, autres)
    else:
        sys.exit(f"Commande inconnue : {cmd}\n{__doc__}")


if __name__ == "__main__":
    principal()

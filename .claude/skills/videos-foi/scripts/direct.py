"""Le film EN DIRECT : le JSON d'une vidéo, résolu (temps, mots, caméra…) comme pour un rendu, sans rien rendre, et son son
(voix + musique + sons de montage). Sert à l'atelier (atelier.py). Rien n'est recalculé tant que rien n'a changé."""
import hashlib
import json
import os
import subprocess
import sys
import threading

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import film as FILM                          # noqa: E402
from noyau import duree as EP                # noqa: E402
from noyau import voix_plans as VP           # noqa: E402


class FilmDirect:
    def __init__(self, chemin, charte=None):
        self.chemin, self.charte = os.path.abspath(chemin), charte
        self.dossier = os.path.dirname(self.chemin)
        self.travail = os.path.join(self.dossier, ".studio")
        self.verrou, self.verrou_son = threading.RLock(), threading.Lock()      # (composer la musique ne fait pas attendre l'image)
        self._resolu = self._audio = self._tms = None
        self._v_resolu = self._v_audio = self._v_tms = None

    # ---------------------------------------------------------------- ce qui a changé
    @property
    def voix(self):
        d = os.path.join(self.dossier, "voix_plans")
        return d if os.path.isdir(d) else None

    def version(self):
        """Change dès que le JSON ou un fichier de voix change."""
        h = hashlib.sha1()
        for f in [self.chemin] + ([os.path.join(self.voix, x) for x in sorted(os.listdir(self.voix))] if self.voix else []):
            try:
                h.update(f"{f}:{os.path.getmtime(f)}".encode())
            except OSError:
                pass
        return h.hexdigest()[:12]

    # ---------------------------------------------------------------- le film résolu
    def _temps(self, film):
        """Les temps ne dépendent que du texte, des pauses et des voix : une retouche d'image ne les refait pas."""
        cle = hashlib.sha1(json.dumps([[p.get("texte"), p.get("pause"), p.get("duree"), bool(p.get("fin")), p.get("attente")] for p in film["plans"]] +
                                      [film.get("mots_par_seconde"), film.get("duree_cible")]).encode())
        if self.voix:
            for f in VP.fichiers(film, self.voix).values():
                cle.update(f"{f}:{os.path.getmtime(f)}".encode())
        cle = cle.hexdigest()
        if self._v_tms != cle:
            os.makedirs(self.travail, exist_ok=True)
            self._tms = FILM.timings(film, None, self.voix, self.travail) if self.voix and VP.fichiers(film, self.voix) else FILM.timings(film)
            self._v_tms = cle
        return self._tms

    def resolu(self):
        with self.verrou:
            v = self.version()
            if self._v_resolu == v and self._resolu:
                return self._resolu
            try:
                film = FILM.charger(self.chemin, EP.charger_bible(self.charte))
                if film.get("plans"):
                    tms, total, notes = self._temps(film)
                    manquants = FILM.resoudre(film, json.loads(json.dumps(tms)))
                else:
                    tms, total, notes, manquants = [], 0, [], []
                film.pop("_dossier", None)
                film.update(_version=v, _tms=tms, _total=total, _notes=notes + [f"mot introuvable : {m}" for m in manquants])
            except SystemExit as e:                      # (film.py signale une faute de l'auteur par sys.exit)
                film = {"erreur": str(e), "_version": v}
            except (ValueError, KeyError, TypeError, OSError) as e:
                film = {"erreur": f"{type(e).__name__} : {e}", "_version": v}
            self._resolu, self._v_resolu = film, v
            return film

    # ---------------------------------------------------------------- le son
    def audio(self):
        film = self.resolu()
        if film.get("erreur") or not film.get("plans"):
            return b""
        with self.verrou_son:
            if self._v_audio == film["_version"] and self._audio:
                return self._audio
            os.makedirs(self.travail, exist_ok=True)
            complete = os.path.join(self.travail, "voix_complete.wav")
            voix = complete if self.voix and VP.fichiers(film, self.voix) and os.path.exists(complete) else None
            wav = FILM.mixer_lumiere(film, film["_tms"], film["_total"], voix, None, self.travail)
            with open(wav, "rb") as f:
                self._audio, self._v_audio = f.read(), film["_version"]
            return self._audio

    # ---------------------------------------------------------------- le vérificateur
    def verifier(self):
        r = subprocess.run([sys.executable, os.path.join(ICI, "verifier_film.py"), self.chemin] + (["--bible", self.charte] if self.charte else []),
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        return (r.stdout + r.stderr).strip()

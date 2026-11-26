#!/usr/bin/env python3
"""L'atelier : l'interface de l'outil. La vidéo se joue et se corrige à la souris dans le navigateur ; un bouton par étape
(mise en scène, vérification, voix, contrôles, rendu, publication).

    python vf.py interface                 → ouvre l'atelier (toutes les vidéos)
    python vf.py studio videos/v04         → l'ouvre directement sur une vidéo

Le serveur n'écoute que cet ordinateur (127.0.0.1). Il n'écrit que dans videos/<nom>/ (video.json, et l'historique dans
.atelier/) ; tout le reste passe par les commandes de vf.py, une à la fois. La clé ElevenLabs ne passe jamais par lui.
"""
import argparse
import glob
import hashlib
import http.server
import json
import mimetypes
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser

ICI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(ICI)
sys.path.insert(0, ICI)
import livrables as LV                       # noqa: E402
from direct import FilmDirect                # noqa: E402
from noyau import lire_json  # noqa: E402
from noyau import bible as BIB               # noqa: E402
from noyau import voix_plans as VP           # noqa: E402

NOM = re.compile(r"^[a-z0-9][a-z0-9_-]{0,60}$")
STATIQUES = ("scripts/atelier/", "scripts/film/web/", "assets/polices/")          # les seuls dossiers servis tels quels
MEDIAS = re.compile(r"^(apercu|rendu|reference)/[\w.-]+\.(png|jpg|mp4|txt)$")        # ce qu'on peut lire dans le dossier d'une vidéo
CORPS_MAX = 8 * 1024 * 1024                  # octets
HISTORIQUE, ENTRE_VERSIONS = 40, 60          # versions gardées ; secondes entre deux versions gardées
LIGNES_MAX = 2000
COMMANDES = {                                # ce que l'interface peut lancer : nom → arguments de vf.py
    "realiser": lambda d, o: ["realiser", d, "--appliquer"],
    "apercu": lambda d, o: ["apercu", d] + ([str(int(o["plan"]))] if o.get("plan") else []),
    "voix": lambda d, o: ["voix", d] + (["--plan", str(int(o["plan"]))] if o.get("plan") else []),
    "rendu": lambda d, o: ["rendu", d],
    "livrables": lambda d, o: ["livrables", d],
}


class Refus(Exception):
    def __init__(self, code, message, **donnees):
        super().__init__(message)
        self.code, self.donnees = code, dict(donnees, erreur=message)


def empreinte(chemin):
    with open(chemin, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:12]


def moteur_modifie():
    return max(os.path.getmtime(x) for x in glob.glob(os.path.join(ICI, "film", "web", "*.js")) + glob.glob(os.path.join(ICI, "film", "web", "*.css")))


# ---------------------------------------------------------------------- les travaux (une commande à la fois)
class Travaux:
    def __init__(self, racine):
        self.racine, self.verrou, self.courant, self.processus, self.numero = racine, threading.Lock(), None, None, 0

    def lancer(self, quoi, nom, dossier, options):
        with self.verrou:
            if self.courant and not self.courant["fini"]:
                raise Refus(409, f"« {self.courant['quoi']} » est déjà en cours sur {self.courant['nom']} : attends la fin ou arrête-le")
            self.numero += 1
            self.courant = {"id": self.numero, "quoi": quoi, "nom": nom, "lignes": [], "oubliees": 0, "fini": False, "code": None, "debut": time.time(), "arrete": False}
            args = [sys.executable, "-u", os.path.join(self.racine, "vf.py"), *COMMANDES[quoi](dossier, options)]
            self.processus = subprocess.Popen(args, cwd=self.racine, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                              text=True, encoding="utf-8", errors="replace", env=dict(os.environ, PYTHONUNBUFFERED="1", PYTHONIOENCODING="utf-8"))
            threading.Thread(target=self._suivre, args=(self.courant, self.processus), daemon=True).start()
            return self.courant

    def _suivre(self, t, p):
        with p.stdout:
            for ligne in p.stdout:
                ligne = ligne.rstrip()
                if ligne:
                    t["lignes"].append(ligne)
                    trop = max(0, len(t["lignes"]) - LIGNES_MAX)
                    t["oubliees"] += trop
                    del t["lignes"][:trop]
        t["code"] = p.wait()
        t["duree"] = time.time() - t["debut"]
        t["fini"] = True

    def arreter(self):
        t, p = self.courant, self.processus
        if not t or t["fini"]:
            return
        t["arrete"] = True
        if os.name == "nt":                      # la commande et ce qu'elle a lancé (navigateurs, ffmpeg)
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
        else:
            p.terminate()

    def etat(self, depuis=0):
        t = self.courant
        if not t:
            return {"id": 0, "fini": True, "lignes": []}
        return dict({k: v for k, v in t.items() if k != "lignes"}, lignes=t["lignes"][max(0, depuis - t["oubliees"]):], total_lignes=t["oubliees"] + len(t["lignes"]), ecoule=t.get("duree") or time.time() - t["debut"])


# ---------------------------------------------------------------------- les vidéos
class Atelier:
    def __init__(self, racine, charte):
        self.racine, self.charte = racine, charte
        self.videos = os.path.join(racine, "videos")
        self.travaux, self.jeton, self.directs = Travaux(racine), secrets.token_urlsafe(24), {}
        self.verrou = threading.Lock()

    def dossier(self, nom):
        if not NOM.match(nom or ""):
            raise Refus(400, "nom de vidéo invalide (lettres minuscules, chiffres, tirets)")
        d = os.path.join(self.videos, nom)
        if not os.path.exists(os.path.join(d, "video.json")):
            raise Refus(404, f"la vidéo « {nom} » n'existe pas")
        return d

    def fichier(self, nom):
        return os.path.join(self.dossier(nom), "video.json")

    def direct(self, nom):
        f = self.fichier(nom)
        return self.directs.setdefault(nom, FilmDirect(f, self.charte))

    # ---------------------------------------------------------------- lire
    def liste(self):
        out = []
        for f in sorted(glob.glob(os.path.join(self.videos, "*", "video.json"))):
            nom = os.path.basename(os.path.dirname(f))
            if NOM.match(nom):
                out.append(self.resume(nom))
        return sorted(out, key=lambda v: -v["modifie"])

    def resume(self, nom):
        d, f = self.dossier(nom), self.fichier(nom)
        try:
            film = lire_json(f)
        except ValueError as e:
            return {"nom": nom, "titre": nom, "erreur": f"video.json illisible : {e}", "plans": 0, "modifie": os.path.getmtime(f), "images": [], "videos": []}
        direct = self.direct(nom)
        resolu = direct.resolu()
        images = [os.path.basename(x) for x in sorted(glob.glob(os.path.join(d, "apercu", "t_*.png")))]
        mp4 = sorted(glob.glob(os.path.join(d, "rendu", "*.mp4")), key=os.path.getmtime, reverse=True)
        voix, neuf = VP.etat(film, direct.voix), max(os.path.getmtime(f), moteur_modifie())      # un MP4 d'avant le texte OU d'avant le moteur est à refaire
        return {"nom": nom, "titre": film.get("titre") or nom, "passage": film.get("passage", ""), "dosage": film.get("dosage", "recit"),
                "plans": len(film.get("plans", [])), "duree": resolu.get("_total") if not resolu.get("erreur") else None, "erreur": resolu.get("erreur"),
                "modifie": os.path.getmtime(f), "images": images,
                "videos": [{"fichier": os.path.basename(x), "modifie": os.path.getmtime(x), "a_jour": os.path.getmtime(x) >= neuf, "octets": os.path.getsize(x)} for x in mp4],
                "voix": {"etats": voix, "a_dire": sum(e != "muet" for e in voix), "a_jour": voix.count("a_jour"),
                         "caracteres": sum(len(p.get("texte", "")) for p, e in zip(film.get("plans", []), voix) if e in ("absente", "perimee"))},
                "livrables": os.path.exists(os.path.join(d, "livrables.txt")), "version": empreinte(f)}

    def film(self, nom):
        f = self.fichier(nom)
        return {"nom": nom, "film": lire_json(f), "version": empreinte(f), "resume": self.resume(nom)}

    def verifier(self, nom):
        lignes, out = self.direct(nom).verifier().splitlines(), {"points": [], "score": None, "bilan": ""}
        for x in lignes:
            m = re.match(r"(ERREUR|ALERTE) : (.*)", x)
            if m:
                plan = re.search(r"\bplans? (\d+)", m.group(2))
                out["points"].append({"niveau": m.group(1).lower(), "texte": m.group(2), "plan": int(plan.group(1)) if plan else None})
            elif x.startswith("SCORE"):
                out["score"] = int(re.search(r"(\d+)/100", x).group(1))
        if out["score"] is None:
            out["bilan"] = "\n".join(lignes[-12:])
        return out

    def publier(self, nom):
        texte, err, manque = LV.livrables(lire_json(self.fichier(nom)))
        blocs, courant = {}, None
        for ligne in texte.splitlines():
            if ligne in ("DESCRIPTION", "HASHTAGS", "COMMENTAIRE À ÉPINGLER", "RAPPEL", "JOURNAL"):
                courant = ligne
                blocs[courant] = ""
            elif courant and ligne:
                blocs[courant] += ("\n" if blocs[courant] else "") + ligne
        return {"blocs": blocs, "erreurs": err, "manque": manque}

    # ---------------------------------------------------------------- écrire
    def enregistrer(self, nom, corps):
        film, f = corps.get("film"), self.fichier(nom)
        if not isinstance(film, dict) or not isinstance(film.get("plans"), list) or not all(isinstance(p, dict) for p in film["plans"]):
            raise Refus(400, "ce n'est pas un film (il manque la liste des plans)")
        with self.verrou:
            if corps.get("version") != empreinte(f):
                raise Refus(409, "la vidéo a été modifiée ailleurs (par Claude ou dans un éditeur)", **self.film(nom))
            self._garder_version(f)
            tmp = f + ".tmp"
            with open(tmp, "w", encoding="utf-8", newline="\n") as s:
                json.dump(film, s, ensure_ascii=False, indent=1)
            os.replace(tmp, f)
        return {"version": empreinte(f)}

    def _garder_version(self, f):
        d = os.path.join(os.path.dirname(f), ".atelier")
        os.makedirs(d, exist_ok=True)
        versions = sorted(glob.glob(os.path.join(d, "*.json")))
        if versions and time.time() - os.path.getmtime(versions[-1]) < ENTRE_VERSIONS:
            return
        shutil.copyfile(f, os.path.join(d, time.strftime("%Y%m%d-%H%M%S") + ".json"))
        for vieux in versions[:max(0, len(versions) + 1 - HISTORIQUE)]:
            os.remove(vieux)

    def versions(self, nom):
        d = os.path.join(self.dossier(nom), ".atelier")
        out = []
        for f in sorted(glob.glob(os.path.join(d, "*.json")), reverse=True):
            film = lire_json(f)
            out.append({"fichier": os.path.basename(f), "quand": os.path.getmtime(f), "plans": len(film.get("plans", [])), "titre": film.get("titre", "")})
        return out

    def revenir(self, nom, corps):
        v = str(corps.get("fichier") or "")
        if not re.match(r"^\d{8}-\d{6}\.json$", v):
            raise Refus(400, "version inconnue")
        source, f = os.path.join(self.dossier(nom), ".atelier", v), self.fichier(nom)
        if not os.path.exists(source):
            raise Refus(404, "cette version n'existe plus")
        with self.verrou:
            film = lire_json(source)
            shutil.copyfile(f, os.path.join(os.path.dirname(source), time.strftime("%Y%m%d-%H%M%S") + ".json"))      # on peut revenir du retour
            with open(f, "w", encoding="utf-8", newline="\n") as s:
                json.dump(film, s, ensure_ascii=False, indent=1)
        return self.film(nom)

    def creer(self, corps):
        nom = str(corps.get("nom") or "")
        if not NOM.match(nom):
            raise Refus(400, "nom invalide : lettres minuscules, chiffres et tirets (par exemple v09-pardon)")
        if os.path.exists(os.path.join(self.videos, nom)):
            raise Refus(409, f"« {nom} » existe déjà")
        r = subprocess.run([sys.executable, os.path.join(self.racine, "vf.py"), "nouvelle", nom], cwd=self.racine, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            raise Refus(500, (r.stdout + r.stderr).strip())
        f = self.fichier(nom)
        film = lire_json(f)
        for cle in ("titre", "passage", "dosage"):
            if isinstance(corps.get(cle), str):
                film[cle] = corps[cle].strip()
        with open(f, "w", encoding="utf-8", newline="\n") as s:
            json.dump(film, s, ensure_ascii=False, indent=1)
        return {"nom": nom}

    def travail(self, nom, corps):
        quoi = corps.get("quoi")
        if quoi not in COMMANDES:
            raise Refus(400, f"commande inconnue : {quoi}")
        self.travaux.lancer(quoi, nom, self.dossier(nom), corps.get("options") or {})
        return self.travaux.etat()

    def ouvrir(self, nom):
        d = self.dossier(nom)
        if os.name == "nt":
            os.startfile(d)                      # noqa: S606 (le dossier d'une vidéo, vérifié plus haut)
        else:
            subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", d])
        return {"ouvert": True}


# ---------------------------------------------------------------------- la Parole et les icônes
def bible(q):
    ref = q.get("ref", [""])[0]
    if ref:
        try:
            return {"ref": BIB.joli(ref), "texte": BIB.texte(ref), "jesus": BIB.paroles_jesus(ref)}
        except BIB.RefInvalide as e:
            raise Refus(404, str(e)) from e
    mots = q.get("mots", [""])[0].strip()
    return {"trouves": [{"ref": BIB.joli(r), "texte": BIB.texte(r)} for r in (BIB.chercher(mots, 20) if len(mots) > 2 else [])]}


def icones(q):
    mot, noms = q.get("mot", [""])[0].strip().lower(), lire_json(os.path.join(SKILL, "assets", "icones", "lucide.json"))
    return {k: v for k, v in noms.items() if not mot or mot in k} if mot else {k: noms[k] for k in list(noms)[:60]}


def lieux_carte():
    geo = lire_json(os.path.join(SKILL, "assets", "geographie", "palestine_1er_siecle.json"))
    return {"lieux": sorted(x["nom"] for x in geo["lieux"]), "cadres": sorted(geo["cadres"])}


def page_scene():
    """La scène : le moteur du rendu, ses modules lus dans tout.js (la même liste partout)."""
    with open(os.path.join(ICI, "film", "web", "tout.js"), encoding="utf-8") as f:
        modules = re.findall(r"'(\w+)'", re.search(r"MODULES = \[(.*?)\]", f.read(), re.S).group(1)) + ["film"]
    scripts = "".join(f'<script src="/scripts/film/web/{m}.js"></script>' for m in modules)
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Scène</title><link rel="stylesheet" href="/scripts/film/web/film.css">'
            f'<link rel="stylesheet" href="/scripts/atelier/scene.css">{scripts}</head><body><div id="scene"><svg id="monde" width="1080" height="1920" viewBox="0 0 1080 1920" '
            'xmlns="http://www.w3.org/2000/svg"></svg><div id="grain_illus"></div><div id="sous_papier"></div><div id="papier"></div><div id="textes"></div></div></body></html>').encode()


# ---------------------------------------------------------------------- le serveur
CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'"


def gestionnaire(atelier, port):
    hotes = {f"localhost:{port}", f"127.0.0.1:{port}"}
    origines = {f"http://{h}" for h in hotes}

    class H(http.server.BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        def envoyer(self, corps, typ, code=200):
            """Avec les morceaux (Range) que demandent les lecteurs audio et vidéo pour sauter dans le temps."""
            debut, fin = 0, len(corps) - 1
            rg = re.match(r"bytes=(\d*)-(\d*)$", self.headers.get("Range") or "")
            if rg and corps and code == 200:
                debut = int(rg.group(1)) if rg.group(1) else max(0, len(corps) - int(rg.group(2) or 0))
                fin = min(int(rg.group(2)), len(corps) - 1) if rg.group(1) and rg.group(2) else len(corps) - 1
                code = 206
            morceau = corps[debut:fin + 1]
            try:
                self.send_response(code)
                for k, v in (("Content-Type", typ), ("Content-Length", str(len(morceau))), ("Accept-Ranges", "bytes"), ("Cache-Control", "no-store"),
                             ("Content-Security-Policy", CSP), ("X-Content-Type-Options", "nosniff"), ("Referrer-Policy", "no-referrer"),
                             ("X-Frame-Options", "SAMEORIGIN")):
                    self.send_header(k, v)
                if code == 206:
                    self.send_header("Content-Range", f"bytes {debut}-{fin}/{len(corps)}")
                self.end_headers()
                self.wfile.write(morceau)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass                                 # le lecteur a déjà demandé un autre morceau

        def json(self, o, code=200):
            self.envoyer(json.dumps(o, ensure_ascii=False).encode(), "application/json; charset=utf-8", code)

        def fichier(self, base, rel):
            chemin = os.path.realpath(os.path.join(base, *rel.split("/")))
            if not chemin.startswith(os.path.realpath(base) + os.sep) or not os.path.isfile(chemin):
                raise Refus(404, "introuvable")
            typ = {".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8"}.get(os.path.splitext(chemin)[1]) or mimetypes.guess_type(chemin)[0] or "application/octet-stream"
            with open(chemin, "rb") as f:
                self.envoyer(f.read(), typ)

        def traiter(self, methode):
            try:
                if self.headers.get("Host") not in hotes:        # (un site malveillant ne peut pas se faire passer pour l'atelier)
                    raise Refus(403, "hôte refusé")
                url = urllib.parse.urlsplit(self.path)
                parts = [urllib.parse.unquote(x) for x in url.path.strip("/").split("/")]
                if methode == "GET":
                    return self.lire(url, parts, urllib.parse.parse_qs(url.query))
                if self.headers.get("Origin") not in origines or self.headers.get("X-Atelier") != atelier.jeton:
                    raise Refus(403, "demande refusée : recharge la page")
                n = int(self.headers.get("Content-Length") or 0)
                if n > CORPS_MAX:
                    raise Refus(413, "trop volumineux")
                try:
                    corps = json.loads(self.rfile.read(n) or b"{}")
                except ValueError as e:
                    raise Refus(400, f"JSON illisible : {e}") from e
                return self.ecrire(parts, corps)
            except Refus as e:
                self.json(e.donnees, e.code)
            except Exception as e:                       # noqa: BLE001 (une requête qui échoue ne doit pas arrêter l'atelier)
                print(f"!! {self.path} : {type(e).__name__} : {e}", file=sys.stderr)
                self.json({"erreur": f"{type(e).__name__} : {e}"}, 500)

        def lire(self, url, parts, q):
            chemin = url.path.lstrip("/")
            if chemin in ("", "index.html"):
                with open(os.path.join(ICI, "atelier", "index.html"), encoding="utf-8") as f:
                    return self.envoyer(f.read().replace("{{JETON}}", atelier.jeton).encode(), "text/html; charset=utf-8")
            if chemin == "scene.html":
                return self.envoyer(page_scene(), "text/html; charset=utf-8")
            if chemin.startswith(STATIQUES):
                return self.fichier(SKILL, chemin)
            if parts[0] != "api":
                raise Refus(404, "introuvable")
            simples = {"videos": atelier.liste, "bible": lambda: bible(q), "icones": lambda: icones(q), "carte": lieux_carte,
                       "travail": lambda: atelier.travaux.etat(int(q.get("depuis", ["0"])[0]))}
            if len(parts) == 2 and parts[1] in simples:
                return self.json(simples[parts[1]]())
            if len(parts) < 3 or parts[1] != "video":
                raise Refus(404, "introuvable")
            nom, quoi = parts[2], parts[3] if len(parts) > 3 else ""
            if quoi == "audio.wav":
                return self.envoyer(atelier.direct(nom).audio(), "audio/wav")
            if quoi == "media":
                rel = "/".join(parts[4:])
                if not MEDIAS.match(rel):
                    raise Refus(404, "introuvable")
                return self.fichier(atelier.dossier(nom), rel)
            actions = {"": lambda: atelier.film(nom), "resolu": lambda: atelier.direct(nom).resolu(), "verifier": lambda: atelier.verifier(nom),
                       "resume": lambda: atelier.resume(nom), "publier": lambda: atelier.publier(nom), "versions": lambda: atelier.versions(nom),
                       "version": lambda: {"json": empreinte(atelier.fichier(nom)), "resolu": atelier.direct(nom).version()}}
            if quoi not in actions:
                raise Refus(404, "introuvable")
            return self.json(actions[quoi]())

        def ecrire(self, parts, corps):
            if parts == ["api", "videos"]:
                return self.json(atelier.creer(corps), 201)
            if parts == ["api", "travail", "arreter"]:
                atelier.travaux.arreter()
                return self.json({"arrete": True})
            if len(parts) >= 3 and parts[:2] == ["api", "video"]:
                nom, quoi = parts[2], parts[3] if len(parts) > 3 else ""
                actions = {"": atelier.enregistrer, "travail": atelier.travail, "revenir": atelier.revenir, "ouvrir": lambda n, c: atelier.ouvrir(n)}
                if quoi in actions:
                    return self.json(actions[quoi](nom, corps))
            raise Refus(404, "introuvable")

        def do_GET(self):
            self.traiter("GET")

        def do_POST(self):
            self.traiter("POST")
    return H


class Serveur(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], ConnectionError):      # un onglet fermé coupe ses connexions : ce n'est pas une erreur
            super().handle_error(request, client_address)


def serveur(racine, charte, port):
    atelier = Atelier(racine, charte)
    return Serveur(("127.0.0.1", port), gestionnaire(atelier, port)), atelier


def principal():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--racine", required=True, help="la racine du projet (là où sont vf.py et videos/)")
    ap.add_argument("--bible", help="la charte du projet")
    ap.add_argument("--video", help="ouvrir directement cette vidéo")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--sans-navigateur", action="store_true")
    a = ap.parse_args()
    try:
        srv, _ = serveur(os.path.abspath(a.racine), a.bible, a.port)
    except OSError:
        sys.exit(f"Le port {a.port} est déjà pris : l'atelier est sans doute déjà ouvert → http://localhost:{a.port} (ou --port {a.port + 1})")
    url = f"http://localhost:{a.port}/" + (f"#/{a.video}" if a.video else "")
    print(f"Atelier : {url}   (Ctrl+C pour fermer)")
    if not a.sans_navigateur:
        threading.Timer(.5, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    principal()

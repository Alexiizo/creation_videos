"""L'atelier : le serveur (rien ne sort de videos/, personne d'autre que la page ne peut écrire, deux écritures ne s'écrasent
pas) et l'interface elle-même, pilotée dans un vrai navigateur (déplacer, annuler, écrire, choisir un geste, suivre Claude)."""
import http.client
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.parse

SCRIPTS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RACINE = os.path.abspath(os.path.join(SCRIPTS, "..", "..", "..", ".."))
sys.path.insert(0, SCRIPTS)
import atelier as AT  # noqa: E402
from noyau import voix_plans as VP  # noqa: E402

# une doublure de vf.py : l'atelier ne connaît l'outil que par ses commandes
VF = '''import json, os, sys, time
cmd, reste = sys.argv[1], sys.argv[2:]
if cmd == "nouvelle":
    d = os.path.join("videos", reste[0]); os.makedirs(d)
    json.dump({"titre": "", "plans": [], "personnages": {}, "lieux": {}}, open(os.path.join(d, "video.json"), "w"))
elif cmd == "apercu":
    print("!! CADRAGE plan 2 \\u00b7 fils : corps coup\\u00e9 au bord du cadre", flush=True)
elif cmd == "rendu":
    print("plan 1", flush=True); time.sleep(60)
'''


class Banc(unittest.TestCase):
    PORT = 8931

    @classmethod
    def setUpClass(cls):
        cls.racine = tempfile.mkdtemp(prefix="atelier_")
        cls.nom = "essai"
        d = os.path.join(cls.racine, "videos", cls.nom)
        os.makedirs(d)
        shutil.copy(os.path.join(SCRIPTS, "..", "assets", "exemple-film", "film.json"), os.path.join(d, "video.json"))
        with open(os.path.join(cls.racine, "vf.py"), "w", encoding="utf-8") as f:
            f.write(VF)
        with open(os.path.join(cls.racine, "secret.txt"), "w", encoding="utf-8") as f:
            f.write("secret")
        cls.srv, cls.atelier = AT.serveur(cls.racine, None, cls.PORT)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.atelier.travaux.arreter()
        cls.srv.shutdown()
        cls.srv.server_close()
        shutil.rmtree(cls.racine, ignore_errors=True)

    @property
    def json_video(self):
        return os.path.join(self.racine, "videos", self.nom, "video.json")

    def demande(self, methode, chemin, corps=None, hote=None, **entetes):
        c = http.client.HTTPConnection("127.0.0.1", self.PORT, timeout=30)
        c.putrequest(methode, chemin, skip_host=True)
        c.putheader("Host", hote or f"localhost:{self.PORT}")
        donnees = json.dumps(corps).encode() if corps is not None else b""
        entetes = {k.replace("_", "-"): v for k, v in entetes.items()}
        if methode == "POST":
            entetes = dict({"Origin": f"http://localhost:{self.PORT}", "X-Atelier": self.atelier.jeton}, **entetes)
        for k, v in entetes.items():
            if v is not None:
                c.putheader(k, v)
        c.putheader("Content-Length", str(len(donnees)))
        c.endheaders(donnees)
        r = c.getresponse()
        brut = r.read()
        c.close()
        try:
            return r.status, json.loads(brut)
        except ValueError:
            return r.status, brut


class Serveur(Banc):
    def test_la_page_et_la_scene(self):
        code, page = self.demande("GET", "/")
        self.assertEqual(code, 200)
        self.assertIn(self.atelier.jeton.encode(), page)
        code, scene = self.demande("GET", "/scene.html")
        for module in ("formes.js", "film.js", "animaux.js"):
            self.assertIn(module.encode(), scene)

    def test_rien_ne_sort_des_dossiers_servis(self):
        for chemin in ("/scripts/atelier/../../../../vf.py", "/scripts/atelier/..%2f..%2f..%2fvf.py", "/../secret.txt", "/scripts/atelier.py", "/api/video/..%2f..%2fsecret/media/rendu/x.mp4",
                       "/api/video/essai/media/..%2f..%2f..%2fsecret.txt", "/api/video/essai/media/video.json", "/.env", "/assets/../../../.env"):
            self.assertGreaterEqual(self.demande("GET", chemin)[0], 400, chemin)

    def test_un_autre_site_ne_peut_rien(self):
        film = {"film": {"plans": []}, "version": "x"}
        self.assertEqual(self.demande("GET", "/api/videos", hote="mechant.example")[0], 403)
        self.assertEqual(self.demande("POST", "/api/video/essai", film, Origin="http://mechant.example")[0], 403)
        self.assertEqual(self.demande("POST", "/api/video/essai", film, X_Atelier="faux")[0], 403)
        self.assertEqual(self.demande("POST", "/api/video/essai", film, X_Atelier=None)[0], 403)

    def test_enregistrer_et_conflit(self):
        _, d = self.demande("GET", "/api/video/essai")
        d["film"]["titre"] = "Nouveau titre"
        code, r = self.demande("POST", "/api/video/essai", {"film": d["film"], "version": d["version"]})
        self.assertEqual(code, 200)
        with open(self.json_video, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["titre"], "Nouveau titre")
        # la même version de départ, une deuxième fois : quelqu'un a écrit entre-temps, on n'écrase pas
        code, conflit = self.demande("POST", "/api/video/essai", {"film": dict(d["film"], titre="Écrasé"), "version": d["version"]})
        self.assertEqual((code, conflit["film"]["titre"], conflit["version"]), (409, "Nouveau titre", r["version"]))
        self.assertTrue(self.demande("GET", "/api/video/essai/versions")[1], "la version d'avant est gardée")

    def test_un_film_casse_est_refuse(self):
        v = self.demande("GET", "/api/video/essai")[1]["version"]
        for film in (None, [], {"plans": "x"}, {"plans": [1]}):
            self.assertEqual(self.demande("POST", "/api/video/essai", {"film": film, "version": v})[0], 400)

    def test_noms_de_videos(self):
        for nom in ("", "../x", "Majuscule", "a b", "x" * 80):
            self.assertEqual(self.demande("POST", "/api/videos", {"nom": nom})[0], 400, nom)
        self.assertEqual(self.demande("POST", "/api/videos", {"nom": "v01-neuve", "titre": "Neuve"})[0], 201)
        self.assertEqual(self.demande("POST", "/api/videos", {"nom": "v01-neuve"})[0], 409)
        self.assertIn("v01-neuve", [v["nom"] for v in self.demande("GET", "/api/videos")[1]])

    def test_une_video_vide_se_lit(self):
        self.demande("POST", "/api/videos", {"nom": "v02-vide"})
        self.assertEqual(self.demande("GET", "/api/video/v02-vide/resolu")[1]["plans"], [])

    def test_une_commande_a_la_fois_et_on_l_arrete(self):
        self.assertEqual(self.demande("POST", "/api/video/essai/travail", {"quoi": "rm"})[0], 400)
        self.assertEqual(self.demande("POST", "/api/video/essai/travail", {"quoi": "rendu"})[0], 200)
        self.assertEqual(self.demande("POST", "/api/video/essai/travail", {"quoi": "apercu"})[0], 409)
        self.demande("POST", "/api/travail/arreter", {})
        for _ in range(60):
            if self.demande("GET", "/api/travail")[1]["fini"]:
                break
            time.sleep(.1)
        etat = self.demande("GET", "/api/travail")[1]
        self.assertTrue(etat["fini"] and etat["arrete"])

    def test_la_bible(self):
        r = self.demande("GET", "/api/bible?ref=Jean%203:16")[1]
        self.assertIn("Car Dieu a tant aimé le monde", r["texte"])
        self.assertEqual(self.demande("GET", "/api/bible?ref=Rien%203:16")[0], 404)

    def test_chercher_des_mots_dans_la_bible(self):
        trouves = lambda mots: [x["ref"] for x in self.demande("GET", "/api/bible?mots=" + urllib.parse.quote(mots))[1]["trouves"]]
        self.assertIn("Matthieu 14:29", trouves("marcher sur les eaux"))          # « marcha sur les eaux » : la forme ne compte pas
        self.assertEqual(trouves("Jésus pleura")[0], "Jean 11:35")                 # la phrase exacte d'abord
        self.assertEqual(trouves("xylophone"), [])

    def test_morceaux_pour_les_lecteurs(self):
        code, brut = self.demande("GET", "/scripts/atelier/icone.svg", Range="bytes=0-9")
        self.assertEqual((code, len(brut)), (206, 10))


class Voix(unittest.TestCase):
    """Une voix ne joue jamais sur le texte d'un autre plan, et rien ne se paie deux fois."""
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix="voix_")
        self.film = {"plans": [{"texte": "Un."}, {"texte": "Deux."}, {}]}
        man = {}
        for i, p in enumerate(self.film["plans"][:2]):
            with open(os.path.join(self.d, VP.nom(i) + ".mp3"), "wb") as f:
                f.write(p["texte"].encode())
            man[VP.nom(i)] = {"empreinte": f"e{i}", "texte": VP.empreinte_texte(p["texte"])}
        with open(os.path.join(self.d, "manifeste.json"), "w", encoding="utf-8") as f:
            json.dump(man, f)

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def test_a_jour(self):
        self.assertEqual(VP.etat(self.film, self.d), ["a_jour", "a_jour", "muet"])

    def test_un_plan_insere_ne_prend_pas_la_voix_du_suivant(self):
        self.film["plans"].insert(0, {"texte": "Zéro."})
        self.assertEqual(VP.etat(self.film, self.d), ["perimee", "perimee", "absente", "muet"])
        self.assertEqual(VP.fichiers(self.film, self.d), {})
        self.assertEqual(VP.deja_dites(self.d)["e1"], b"Deux.")          # la phrase se retrouve, sans repayer

    def test_un_fichier_pose_a_la_main(self):
        os.remove(os.path.join(self.d, "manifeste.json"))
        self.assertEqual(VP.etat(self.film, self.d)[:2], ["a_jour", "a_jour"])


class Interface(Banc):
    PORT = 8932

    def test_dans_un_vrai_navigateur(self):
        r = subprocess.run(["node", "atelier_e2e.js", f"http://localhost:{self.PORT}", self.nom, self.json_video], cwd=os.path.join(SCRIPTS, "film", "test"),
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)
        self.assertEqual(r.returncode, 0, "\n" + r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()

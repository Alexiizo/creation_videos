"""Les tests du moteur : chaque défaut déjà rencontré a son TÉMOIN (une faute mise exprès, que le contrôle doit attraper)
et son contraire (un cas sain, qui ne doit rien déclencher). Bibliothèque standard seulement.

    python vf.py tests
"""
import copy
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest

ICI = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(ICI)
WEB = os.path.join(SCRIPTS, "film", "web")
TEST = os.path.join(SCRIPTS, "film", "test")
CHARTE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(SCRIPTS)))), "charte.md")
sys.path.insert(0, SCRIPTS)

import noyau  # noqa: E402,F401
import livrables as LV  # noqa: E402
import realisateur as RE  # noqa: E402
from noyau import images as IM  # noqa: E402

PERSO = {"silhouette": "femme", "age": "jeune", "traits": "simple", "peau": "#c99470"}
JESUS = {"silhouette": "homme", "traits": "simple", "peau": "#ad7650"}
SOL = {"horizon": 700, "y_ref": 1060}


def film(**kw):
    """Un petit film sain (récit, une citation exacte de Jésus, un siège sous qui s'assoit)."""
    f = {"titre": "Essai", "type_video": "recit", "passage": "Jean 11:1-44", "pont": {"ref": "Apocalypse 21:4"}, "mots_par_seconde": 3.0,
         "style": {"format": "lumiere"}, "personnages": {"ines": PERSO, "jesus": JESUS},
         "lieux": {"salon": {"heure": "soir", "sol": SOL, "couches": [{"gen": "piece", "fond": [-150, 220, 1230, 860]}],
                             "objets": [{"gen": "meuble", "type": "canape", "x": 200, "y": 1080, "l": 480, "h": 224, "prof": 150}]}},
         "plans": [{"texte": "Elle est partie.", "registre": "aujourdhui", "lieu": "salon",
                    "acteurs": [{"id": "ines", "x": 420, "y": 1080, "actions": [{"t": 0, "pose": "assis", "visage": "triste"}]}]},
                   {"texte": "Jésus lui dit : « Je suis la résurrection et la vie. »", "registre": "recit", "appui": ["Jean 11:25"], "lieu": "salon",
                    "cite": [{"ref": "Jean 11:25", "qui": "jesus"}],
                    "graphiques": [{"type": "citation", "entete": "JÉSUS DIT", "ref": "Jean 11:25", "texte": "Je suis la résurrection et la vie.", "mot": "résurrection"}],
                    "acteurs": [{"id": "jesus", "x": 700, "y": 1060, "actions": [{"t": 0, "pose": "debout", "visage": "doux"}]}]}]}
    f.update(kw)
    return f


def verifier(f):
    """La sortie du vérificateur sur un film en mémoire."""
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "video.json")
        with open(p, "w", encoding="utf-8") as sortie:
            json.dump(f, sortie, ensure_ascii=False)
        r = subprocess.run([sys.executable, os.path.join(SCRIPTS, "verifier_film.py"), p, "--bible", CHARTE], capture_output=True, text=True, encoding="utf-8")
    return r.stdout + r.stderr


def lignes(sortie, genre):
    return [x for x in sortie.splitlines() if x.startswith(genre)]


class Verificateur(unittest.TestCase):
    def test_film_sain(self):
        s = verifier(film())
        self.assertEqual(lignes(s, "ERREUR"), [], s)
        self.assertFalse([x for x in lignes(s, "ALERTE") if "siège" in x or "hauteur" in x], s)

    def test_citation_inexacte(self):
        f = film()
        f["plans"][1]["texte"] = "Jésus lui dit : « Je suis la lumière et la vie. »"
        f["plans"][1]["graphiques"][0]["texte"] = "Je suis la lumière et la vie."
        self.assertTrue(lignes(verifier(f), "ERREUR"))

    def test_parole_attribuee_a_jesus_a_tort(self):
        f = film()
        f["plans"][1].update({"texte": "Et la Bible dit : « Jésus pleura. »", "appui": ["Jean 11:35"], "cite": [{"ref": "Jean 11:35"}],
                              "graphiques": [{"type": "verset", "entete": "PAROLE DE JÉSUS", "ref": "Jean 11:35", "texte": "Jésus pleura.", "mot": "pleura"}]})
        self.assertTrue(any("attribue à Jésus" in x for x in lignes(verifier(f), "ERREUR")))

    def test_dieu_le_pere_jamais_un_personnage(self):
        f = film()
        f["personnages"]["dieu"] = PERSO
        self.assertTrue(any("JAMAIS" in x for x in lignes(verifier(f), "ERREUR")))

    def test_cle_de_lieu_inconnue(self):
        f = film()
        f["lieux"]["salon"]["obejts"] = []
        self.assertTrue(any("obejts" in x for x in lignes(verifier(f), "ERREUR")))

    def test_generateur_inconnu(self):
        f = film()
        f["lieux"]["salon"]["couches"].append({"gen": "soucoupe"})
        self.assertTrue(any("soucoupe" in x for x in lignes(verifier(f), "ERREUR")))

    def test_objet_inconnu(self):
        f = film()
        f["lieux"]["salon"]["objets"].append({"gen": "objet", "type": "soucoupe", "x": 100, "y": 1000})
        self.assertTrue(any("soucoupe" in x for x in lignes(verifier(f), "ERREUR")))

    def test_assis_dans_le_vide(self):
        f = film()
        f["lieux"]["salon"]["objets"] = []
        self.assertTrue(any("siège" in x for x in lignes(verifier(f), "ALERTE")))

    def test_piece_sans_plafond_ni_ciel(self):
        f = film()
        f["lieux"]["salon"]["couches"][0]["plafond"] = False
        self.assertTrue(any("plafond" in x for x in lignes(verifier(f), "ALERTE")))

    def test_meuble_hors_d_echelle(self):
        f = film()
        f["lieux"]["salon"]["objets"][0]["h"] = 120
        self.assertTrue(any("canape" in x for x in lignes(verifier(f), "ALERTE")))

    def test_trois_fois_la_meme_image(self):
        f = film()
        cam = [{"t": 0, "cadre": "jesus", "plan": "moyen"}, {"t": "fin", "cadre": "jesus", "plan": "moyen"}]
        f["plans"] = [f["plans"][0]] + [dict(copy.deepcopy(f["plans"][1]), camera=cam) for _ in range(3)]
        self.assertTrue(any("la même image" in x for x in lignes(verifier(f), "ALERTE")))

    def test_personnage_qui_flotte(self):
        f = film()
        f["plans"][1]["acteurs"][0]["y"] = 690
        self.assertTrue(any("flotte" in x for x in lignes(verifier(f), "ALERTE")))


class Realisateur(unittest.TestCase):
    def realise(self, *plans):
        f = {"personnages": {"jesus": JESUS, "ami": PERSO}, "plans": [copy.deepcopy(p) for p in plans]}
        return RE.Realisateur(f).realiser()["plans"]

    @staticmethod
    def plan(texte, registre="recit", **kw):
        return dict({"texte": texte, "registre": registre, "lieu": "lac", "acteurs": [{"id": "jesus", "x": 400, "y": 1000}, {"id": "ami", "x": 600, "y": 1000}]}, **kw)

    def visage(self, p, ident):
        return next(a for a in p["acteurs"] if a["id"] == ident)["actions"][0]["visage"]

    def poses(self, p, ident):
        return [x.get("pose") for x in next(a for a in p["acteurs"] if a["id"] == ident)["actions"]]

    def test_le_vent_qui_tombe_ne_fait_tomber_personne(self):
        p, = self.realise(self.plan("Le vent tombe. Et tout devient calme."))
        self.assertNotIn("tombe", self.poses(p, "jesus") + self.poses(p, "ami"))

    def test_danger_tous_ont_peur_sauf_jesus(self):
        p, = self.realise(self.plan("Soudain, une violente tempête éclate."))
        self.assertEqual(self.visage(p, "ami"), "peur")
        self.assertNotEqual(self.visage(p, "jesus"), "peur")

    def test_ta_tempete_n_est_pas_un_danger(self):
        p, = self.realise(self.plan("Ta tempête est dans ta tête.", "explication"))
        self.assertNotEqual(self.visage(p, "ami"), "peur")

    def test_silence_dit_n_est_pas_encore_le_calme(self):
        a, b, c = self.realise(self.plan("Une violente tempête éclate."), self.plan("Il dit à la mer : « Silence! Tais-toi! »"), self.plan("Tout devient calme."))
        self.assertEqual(self.visage(b, "ami"), "peur")
        self.assertEqual(self.visage(c, "ami"), "soulage")

    def test_assis_reste_assis(self):
        assis = {"assise": 1, "hanche_av": 86}
        p1 = self.plan("Il attend.", acteurs=[{"id": "ami", "x": 500, "y": 1000, "actions": [{"t": 0, "pose": "telephone", "angles": assis, "vue": 10}]}])
        p2 = self.plan("Il attend encore.", acteurs=[{"id": "ami", "x": 500, "y": 1000}])
        _, b = self.realise(p1, p2)
        a = b["acteurs"][0]["actions"][0]
        self.assertEqual((a.get("angles"), a.get("vue")), (assis, 10))

    def test_geste_d_un_instant_ne_reste_pas(self):
        p1 = self.plan("Il tend la main.", acteurs=[{"id": "ami", "x": 500, "y": 1000, "actions": [{"t": 0, "pose": "tend_main"}]}])
        _, b = self.realise(p1, self.plan("Il attend.", acteurs=[{"id": "ami", "x": 500, "y": 1000}]))
        self.assertEqual(b["acteurs"][0]["actions"][0]["pose"], "debout")

    def test_jamais_deux_fois_la_meme_image_de_suite(self):
        ps = self.realise(*[self.plan("Il parle encore un peu.") for _ in range(5)])
        cles = [(str(p["camera"][0]["cadre"]), p["camera"][0]["plan"]) for p in ps]
        self.assertTrue(all(a != b for a, b in zip(cles, cles[1:])), cles)

    def test_la_citation_montre_celui_qui_parle(self):
        carte = [{"type": "citation", "entete": "JÉSUS DIT", "ref": "Jean 11:25", "texte": "Je suis…"}]
        loin = [{"id": "jesus", "x": 300, "y": 1000}, {"id": "ami", "x": 700, "y": 1000}]
        _, b = self.realise(self.plan("Ils sont là.", acteurs=loin), self.plan("Il lui dit : « Je suis… »", graphiques=carte, acteurs=loin))
        self.assertEqual(b["camera"][0]["cadre"], "jesus")

    def test_des_voisins_trop_pres_ne_sont_jamais_coupes(self):
        pres = [{"id": "jesus", "x": 450, "y": 1000}, {"id": "ami", "x": 600, "y": 1000}]
        for p in self.realise(*[self.plan("Il parle encore un peu.", acteurs=pres) for _ in range(5)]):
            self.assertEqual(len(p["camera"][0]["cadre"]), 2, p["camera"])

    def test_depense_n_est_pas_pense(self):
        self.assertIsNone(RE.trouve(RE.sans_accents("Il dépense tout."), ["pense"]))


class Livrables(unittest.TestCase):
    def test_un_appat_est_refuse(self):
        self.assertTrue(LV.appats("Abonne-toi pour la suite"))

    def test_une_phrase_saine_passe(self):
        self.assertEqual(LV.appats("Jésus était dans la barque pendant la tempête."), [])


class Lisibilite(unittest.TestCase):
    @staticmethod
    def image(gris):
        from PIL import Image
        return Image.new("RGB", (400, 400), (gris, gris, gris))

    def test_mesure(self):
        self.assertLess(IM.mesure_visage(self.image(20), 200, 200, 60)[0], IM.LUM_VISAGE_MIN)
        self.assertGreater(IM.mesure_visage(self.image(120), 200, 200, 60)[0], IM.LUM_VISAGE_MIN)


def node(code, cwd=WEB):
    r = subprocess.run(["node", "-e", "global.window=global;" + code], cwd=cwd, capture_output=True, text=True, encoding="utf-8")
    if r.returncode:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


class Dessin(unittest.TestCase):
    CHARGE = "require('./tout.js');"

    def test_les_pages_chargent_tous_les_modules(self):
        # la liste des modules (tout.js) et les balises des pages ne divergent pas
        modules = node("console.log(JSON.stringify(require('./tout.js')));")
        for page in ("index.html", os.path.join("..", "test", "gen.html")):
            with open(os.path.join(WEB, page), encoding="utf-8") as f:
                html = f.read()
            charges = [m for m in re.findall(r'src="(?:\.\./web/)?(\w+)\.js"', html) if m in modules]
            attendus = [m for m in modules if m in charges] if page.endswith("gen.html") else modules
            self.assertEqual(charges, attendus, page)

    def test_aucune_pose_ne_dessine_un_nombre_impossible(self):
        mauvais = node(self.CHARGE + r"""
            const D=[{silhouette:'homme',traits:'simple',barbe:{style:'courte'},haut:{couleur:'#efe6d6',longueur:'chevilles',col:'tunique'},bas:null,manteau:{type:'drape'},cheveux:{style:'long'}},
                     {silhouette:'femme',traits:'simple',coiffe:{type:'voile'},haut:{longueur:'chevilles'},bas:null},{silhouette:'homme',age:'jeune',traits:'simple',cheveux:{style:'court'}},
                     {silhouette:'homme',age:'age',traits:'simple',cheveux:{style:'degarni'},barbe:{style:'longue'}}];
            const out=[];
            D.forEach((d,i)=>{for(const p of Object.keys(RIG.POSES)) for(const v of [0,35,90,140]) { const r=PERSO.poser(d,p,{x:0,y:0,style:'papier',action:{vue:v,visage:'triste'}}); if(/NaN|undefined|Infinity/.test(r.svg+r.defs)) out.push([i,p,v]); }});
            console.log(JSON.stringify(out));""")
        self.assertEqual(mauvais, [])

    def test_aucun_objet_ne_dessine_un_nombre_impossible(self):
        mauvais = node(self.CHARGE + r"""
            const out=[]; for(const ty of Object.keys(MONDE.OBJETS)) for(const y of [760,900,1300]) { const s=MONDE.GEN.objet({type:ty,x:300,y,horizon:700,y_ref:1060,fuite:540},'t',1.3); if(/NaN|undefined|Infinity|="-[^"]*" height|height="-/.test(s)) out.push([ty,y]); }
            console.log(JSON.stringify(out));""")
        self.assertEqual(mauvais, [])

    def test_un_sol_qui_part_de_l_horizon_se_dessine(self):
        d = node(self.CHARGE + r"""
            const out={}; for(const m of ['herbe','sable','terre','chemin','pave','dalles','carrelage','route','parquet']) { const s=MONDE.GEN.sol({y:700,matiere:m,horizon:700,y_ref:1060},'x'); out[m]=[/NaN|Infinity/.test(s), s.length]; }
            console.log(JSON.stringify(out));""")
        for m, (casse, n) in d.items():
            self.assertFalse(casse, m)
            self.assertGreater(n, 380, m + " : aucun motif dessiné")

    def test_un_membre_tourne_sans_jamais_basculer(self):
        # la main qui quitte le visage : le plus grand pas d'une image à l'autre reste petit
        pas = node(self.CHARGE + r"""
            const A={assise:1,hanche_av:86,genou_av:86,hanche_ar:82,genou_ar:80}, M=RIG.modele({silhouette:'femme'});
            const S=p=>RIG.squelette(M,Object.assign({},RIG.P0,RIG.POSES[p],A),1), a=S('mains_visage'), b=S('leve_tete');
            let m=0,q=null; for(let i=0;i<=30;i++){const P=RIG.positions(M,RIG.melangeJeu(a,b,i/30)); if(q) m=Math.max(m,Math.hypot(...P.poignet_av.map((v,k)=>v-q[k]))); q=P.poignet_av;}
            console.log(JSON.stringify(m/M.u));""")
        self.assertLess(pas, 9)

    def test_de_dos_les_mains_jointes_sont_cachees(self):
        # vu de dos, ce qui est devant la poitrine est derrière le buste : sa profondeur est négative
        z = node(self.CHARGE + r"""
            const M=RIG.modele({silhouette:'homme'}), out=[];
            for(const vue of [150,180,-150]) { const S=RIG.squelette(M,Object.assign({},RIG.P0,RIG.POSES.prie,{vue}),1), P=RIG.positions(M,S), pr=RIG.projecteur(S.yaw,0,P.O);
              for(const k of ['av','ar']) out.push(.3*pr(P['coude_'+k])[2]+.7*pr(P['poignet_'+k])[2]-pr(P.poitrine)[2]); }
            console.log(JSON.stringify(out));""")
        self.assertLess(max(z), 0, z)

    def test_assis_pas_d_attitude_debout(self):
        # la même personne assise, avec ou sans « attitude » : le même dessin
        memes = node(self.CHARGE + r"""
            const A={assise:1,hanche_av:86,genou_av:86,hanche_ar:82,genou_ar:80}, d={silhouette:'homme',traits:'simple'};
            const art=o=>JSON.stringify(PERSO.poser(d,'debout',{x:0,y:0,action:Object.assign({angles:A},o)}).articulations);
            console.log(JSON.stringify([1,2,3,4].map(n=>art({attitude:n})===art({}))));""")
        self.assertTrue(all(memes), memes)

    def test_pas_d_ombre_de_soleil_dans_une_piece(self):
        p = node(self.CHARGE + r"""require('./eclairage.js');
            const piece={heure:'soir',couches:[{gen:'piece'}]}, dehors={heure:'soir',couches:[{gen:'ciel'}]};
            console.log(JSON.stringify([ECLAIRAGE.ambiance(piece,{}).portee, ECLAIRAGE.ambiance(dehors,{}).portee]));""")
        self.assertEqual(p[0], 0)
        self.assertGreater(p[1], 0)

    def test_la_face_contre_terre(self):
        h = node(self.CHARGE + r"""
            const M=RIG.modele({silhouette:'homme'}), S=RIG.squelette(M,Object.assign({},RIG.P0,RIG.POSES.prosterne),1), P=RIG.positions(M,S);
            const bas=Math.min(P.genou_av[1],P.genou_ar[1],P.cheville_av[1],P.cheville_ar[1]); console.log(JSON.stringify([P.tete[1],P.poignet_av[1],P.O[1]].map(y=>(y-bas)/M.u)));""")
        self.assertLess(h[0], 14, "la tête n'est pas près du sol")
        self.assertLess(h[1], 14, "les mains ne sont pas près du sol")

    def test_assis_les_mains_se_posent_sur_les_cuisses(self):
        d = node(self.CHARGE + r"""
            const M=RIG.modele({silhouette:'femme'}), q=Object.assign({},RIG.P0,RIG.POSES.assis,RIG.BRAS_ASSIS.av,RIG.BRAS_ASSIS.ar,{assise:1,hanche_av:86,genou_av:86,hanche_ar:82,genou_ar:80});
            const P=RIG.positions(M,RIG.squelette(M,q,1)), seg=(w,h,k)=>{const d=k.map((v,i)=>v-h[i]),t=Math.max(0,Math.min(1,w.reduce((a,v,i)=>a+(v-h[i])*d[i],0)/d.reduce((a,v)=>a+v*v,0)));return Math.hypot(...w.map((v,i)=>v-h[i]-d[i]*t))/M.u;};
            console.log(JSON.stringify(['av','ar'].map(k=>Math.min(seg(P['poignet_'+k],P.hanche_av,P.genou_av),seg(P['poignet_'+k],P.hanche_ar,P.genou_ar)))));""")
        self.assertLess(max(d), 7, d)


class Bible(unittest.TestCase):
    def test_un_verset_connu(self):
        r = subprocess.run([sys.executable, os.path.join(SCRIPTS, "bible.py"), "Jean 11:35"], capture_output=True, text=True, encoding="utf-8")
        self.assertIn("Jésus pleura", r.stdout)

    def test_l_exemple_du_skill_est_celui_du_projet(self):
        racine = os.path.dirname(CHARTE)
        projet = os.path.join(racine, "videos", "exemple-trop-loin", "video.json")
        if not os.path.exists(projet):
            self.skipTest("hors du projet (skill seul)")
        with open(projet, encoding="utf-8") as a, open(os.path.join(SCRIPTS, "..", "assets", "exemple-film", "film.json"), encoding="utf-8") as b:
            self.assertEqual(json.load(a), json.load(b), "l'exemple du skill a pris du retard : python vf.py empaqueter")

    def test_videos_du_projet_a_100(self):
        racine = os.path.dirname(CHARTE)
        for d in sorted(os.listdir(os.path.join(racine, "videos"))):
            p = os.path.join(racine, "videos", d, "video.json")
            if os.path.exists(p):
                r = subprocess.run([sys.executable, os.path.join(SCRIPTS, "verifier_film.py"), p, "--bible", CHARTE], capture_output=True, text=True, encoding="utf-8")
                self.assertRegex(r.stdout, r"SCORE : 100/100", d + "\n" + r.stdout[-600:])


if __name__ == "__main__":
    unittest.main(verbosity=2)

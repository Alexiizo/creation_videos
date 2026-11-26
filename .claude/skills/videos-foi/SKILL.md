---
name: videos-foi
description: Crée les vidéos TikTok animées de la chaîne d'Alexis dont le seul but est de faire connaître Dieu, de l'idée au MP4. On raconte un passage de la Bible, on l'explique simplement et on montre comment l'appliquer aujourd'hui, de façon hyper accessible, pour ceux qui ne connaissent pas Jésus ou s'en sont éloignés (format récit, 60–100 s, jamais d'histoires à choix). Moteur de film animé où personnages, lieux en perspective, animaux et foules sont générés à partir du script, sans banque, avec graphismes d'explication calés sur la voix. Bible Louis Segond 1910 intégrée, citations vérifiées mot pour mot, aucune parole de Jésus inventée, Dieu le Père jamais représenté, aucun appât ni appel aux abonnés ou à l'argent. Utiliser dès qu'il est question d'une vidéo, d'un script, d'une idée, d'un verset, d'un passage biblique, de la charte, de la voix, d'un rendu, de statistiques, de commentaires ou d'un audit pour ce compte sur Dieu, Jésus, la Bible ou la foi, même sans le mot « skill ».
---

# Faire connaître Dieu — vidéos animées, de l'idée au MP4

**La mission** (Alexis, 23/11/2026) : un compte dont le SEUL but est de faire connaître Dieu au plus grand nombre —
« même si mes vidéos restent à 200–300 vues, ce sont 200–300 vies touchées ». Des vidéos **captivantes** pour
parler de Jésus, de sa Parole et de **comment l'appliquer dans la réalité d'aujourd'hui**, de façon **hyper
accessible**, pour toucher aussi ceux qui ne le connaissent pas ou qui se sont éloignés. On fait les plus belles
vidéos possibles ; on ne manipule jamais. **Lire `references/mission.md` avant chaque vidéo.**

**Le format : le `recit`** (`references/formats.md`) — **raconter, expliquer, appliquer** : une situation que le
spectateur vit (« Il est deux heures du matin. Tu fixes ton téléphone… et tout s'effondre. ») → le récit biblique
comme un film, avec les paroles exactes → ce qu'il veut dire, en mots simples → ce que ça change ce soir → une porte
ouverte (une prière, “prie pour moi” en commentaire, un passage à lire). 60–100 s. **Jamais d'histoire à choix.**
Réserve, sur demande : `question`, `promesse`, `temoignage`, `evangile`.

**L'image : le format « lumière »** (`references/moteur-film.md` § 0) — notre identité : l'image dans une fenêtre en
arche bordée d'or sur un panneau bleu nuit ; dessous, le texte dit mot à mot, le mot prononcé s'allume en or ; le
moment clé passe à la lumière dorée ; la fin sur une lampe allumée. On s'inspire de la PRÉCISION et de la NARRATION
des meilleures vidéos d'enseignement (Alexis, 23/11), on ne copie jamais leur style. **Le moteur de film** :
personnages sur un **squelette 3D** (face, trois-quarts, profil, dos ; cinématique inverse ; marche à pieds
plantés ; visages, émotions, lèvres sur la vraie voix), **lieux générés en perspective** (pièces, meubles, maisons
antiques, villes, arbres par espèce, végétation, chemins, animaux par espèce, accessoires, foules de gens tous
différents) sur un **sol** qui donne à chaque chose sa taille logique, matières vivantes (ciel, eau, pluie, feu,
rayons, brume), **caméra qui cadre les personnages qu'on lui nomme** (visages toujours au-dessus des sous-titres),
**graphismes d'explication** (texte cinétique au rythme de la voix, icônes qui se dessinent, annotations
manuscrites, listes, comparaisons, cartes de verset). **Aucune banque : pour chaque script, Claude décrit les
personnages et compose les lieux** ; le SVG à la main ne sert qu'à ce qu'aucun générateur ne fait. Exemple vérifié,
100 % généré : `assets/exemple-film/film.json` (« Trop loin pour revenir ? », le fils prodigue).

**Ce qui ne bouge jamais** :
1. **Fidèle à la Bible** (`references/bible.md`) : Louis Segond 1910 intégrée ; chaque « … » vérifié mot pour mot,
   les paroles de Jésus vérifiées comme SIENNES ; rien d'inventé ; « » réservé à la Bible.
2. **Représentation** : Jésus montré avec dignité ; **Dieu le Père jamais en visage ni en corps** ; le Saint-Esprit
   = vent, feu, colombe.
3. **Aucun appât, aucune pression, aucun argent**, pas d'« abonne-toi », pas de série.
4. **Hyper accessible** : compris par quelqu'un qui n'a jamais ouvert une Bible.
5. **Une phrase = une image**, tout ce qui est dit est montré, logique, bien proportionné, bien éclairé.
6. **Chaque retour d'Alexis entraîne le skill EN GÉNÉRAL, pour toujours** — jamais une rustine pour une vidéo.

Production : **script (toi) → voix (Alexis, ElevenLabs) → film (toi) → MP4 prêt à poster**.

## 0. Préparer l'atelier (une fois par session)
**Depuis Claude Code (recommandé)** : le projet « videos-foi-studio » (kit livré à Alexis) est déjà installé
(`installer.sh` / `installer.ps1`) ; tout passe par `python vf.py …` (voir son `CLAUDE.md`) : `interface` (L'ATELIER :
toute la vidéo dans le navigateur — texte, scène, gestes sur dessin, voix, contrôle, rendu, publication ; ce que Claude
écrit dans `video.json` y arrive tout seul), `voix` (ElevenLabs automatique, un mp3 par plan), `apercu`, `rendu`,
`empaqueter`. La charte vivante est `charte.md` à la racine du projet.
**Dans une session sans le kit** (claude.ai) :
```bash
python3 -c "import numpy, scipy, PIL" 2>/dev/null || pip install --break-system-packages numpy scipy pillow
node -e "require('playwright')" 2>/dev/null || (cd <skill>/scripts/film && npm init -y >/dev/null && npm install playwright && npx playwright install chromium)
```
Travailler dans un dossier de travail (ex. `./videos/v03/` avec `video.json`), jamais dans le dossier du skill.
Copier `assets/charte.md` dans le dossier de travail ; tous les scripts prennent `--bible charte.md`.

## 1. Rassembler le contexte
1. **La charte** (`assets/charte.md`) : mission, DA, voix, leçons apprises (elles priment).
2. **Le journal** : chercher dans les conversations passées `JOURNAL VIDÉO FOI` ; numéro = plus grand + 1 ; ne
   jamais refaire la situation ni le passage des 3 dernières vidéos.
3. **L'idée** (`formats.md` § 3) : si Alexis donne un passage ou un thème, partir de là ; sinon proposer 2–3 idées
   (la situation d'aujourd'hui, le passage, la phrase de Jésus, la 1re phrase).
4. **Lire le passage en entier** : `python3 scripts/bible.py "Marc 5:21-43"` (+ `--jesus`). Tout fait historique
   ajouté se vérifie sur le web (source gardée).
5. Lire `references/mission.md`, `formats.md`, `bible.md`, `accroche.md`, `ecriture.md`, `moteur-film.md`.

## 2. Écrire la vidéo
1. **Les 6 lignes** (`ecriture.md` § 1) : situation, passage, phrase de Jésus, idée, application, porte.
2. **L'accroche** (`accroche.md`) : 3 versions de la 1re phrase avec 3 leviers, garder la plus forte (`"levier"`).
3. **Le script, plan par plan** (`ecriture.md` § 1 bis, le rythme qui enseigne) : une phrase = un plan, avec son
   `registre` (aujourdhui / recit / explication / invitation), son `appui`, ses `cite`. Phrases de 2 à 12 mots,
   « tu », un détail de contexte vérifié, LE moment clé en lumière dorée, une phrase finale qui se retient.
4. **Le casting et les lieux, inventés pour ce script** (`moteur-film.md` § 2–3) : décrire chaque personnage
   (âge, silhouette, peau, cheveux, vêtements ; deux descriptions s'il change, ex. riche puis en haillons) ;
   COMPOSER chaque lieu avec les générateurs sur un `sol` en perspective (ciel, relief, sol, bâtiments, arbres,
   végétation, meubles, animaux, accessoires, foule ; 4–6 détails qui racontent ; lumière cohérente) — un SVG à la
   main seulement pour ce qu'aucun générateur ne fait. Regarder chaque lieu en aperçu avant d'aller plus loin.
5. **La mise en images** (`moteur-film.md` § 4–5) : caméra par `cadre` (qui, quel plan), poses, visages, gestes
   AU MOT, déplacements (x et y), objets qui bougent, matières, transitions. Pour aller vite : poser d'abord les
   acteurs (qui, où), puis `scripts/realisateur.py video.json` (`vf.py realiser`) PROPOSE le reste
   (`moteur-film.md` § 8) — le relire plan par plan et le corriger : c'est un premier jet, pas un jugement. **L'explication se VOIT** : texte
   cinétique sur la phrase clé, liste ou comparaison pour une idée, annotation manuscrite qui montre le détail
   (« animal impur », Lévitique 11:7), carte de verset sur LA parole.
6. Vérifier :
```bash
python3 scripts/verifier_film.py video.json --bible charte.md
```
Zéro ERREUR, alertes traitées, score ≥ 85. Il écrit aussi `video_voix_elevenlabs.txt`.

## 3. Contrôler l'image avant tout rendu
```bash
python3 scripts/film.py video.json --bible charte.md --apercu apercu --moments 0.3,0.9
```
Regarder soi-même `apercu/planche.png` puis plusieurs images pleine taille (Read). Corriger toutes les alertes
**CADRAGE** (tête hors champ, visage sous les sous-titres, sous l'interface TikTok) et passer la grille de
`moteur-film.md` § 5 : chaque phrase montrée, monde logique, personnages reconnaissables, émotions lisibles,
lumière cohérente. Puis le **pré-mortem** (`ecriture.md` § 5), une ligne chacun dans la réponse. Jamais de rendu
sans cette étape ; un plan raté se refait.

## 4. La voix
**Avec une clé ElevenLabs (kit Claude Code)** : `python vf.py voix videos/v03` (= `scripts/voix.py`) génère UN mp3
par plan (synchro parfaite, chaque phrase connaît la précédente et la suivante), ne régénère que ce qui a changé ;
`--plan 7` refait une seule phrase ; `--modele eleven_v3` pour le plus expressif ; puis `film.py --voix-plans`.
**Sinon** (Alexis génère sur le site) : on livre le script pour la voix —
Le script numéroté (un paragraphe par plan) dans la réponse, et `video_voix_elevenlabs.txt` (SendUserFile).
Réglages : ElevenLabs, « Guillaume – Narrator », voix **bien vivante** : stabilité 35–45 %, similarité 75 %, exagération
du style 25–35 %, vitesse 1,0, mp3 (charte). Les balises
`<break time="0.8s" />` entre les paragraphes sont indispensables (chaque plan est calé dessus). Texte long → déjà
découpé en « PARTIE 1/2 », « 2/2 » : une génération par partie, `--voix p1.mp3 p2.mp3`.

## 5. Rendu
```bash
python3 scripts/film.py video.json --bible charte.md --voix voix.mp3 --sortie rendu [--workers 2] [--musique fond.mp3]
```
Rendu sur la carte graphique, capture PNG sans perte, un navigateur par worker, et **par plan avec cache** : seuls les
plans modifiés sont re-rendus (un plan = un morceau, nommé par l'empreinte de tout ce qui le dessine, moteur compris) ;
le son aussi est gardé s'il n'a pas changé. Mesuré le 24/11/2026 (PC portable, RTX 3060) : 92 s en ≈ 2 min 30, une
retouche d'un plan en ≈ 25 s. `--brouillon` (images JPEG) pour aller plus vite, `--sans-gpu` sans carte graphique.
La voix est découpée sur ses pauses et chaque plan recalé ; texte mot à mot ; lèvres sur la voix ; musique
composée pour la vidéo (ou `--musique`) sous la voix ; souffle, pop et carillon discrets ; **aucune ambiance ni
bruitage** ; −14 LUFS. Sans `--voix` : brouillon aux durées estimées, avec la musique.

## 6. Vérifier la vidéo finale
Extraire une image au milieu de chaque plan (`ffmpeg -ss <t> -i video.mp4 -frames:v 1 x.jpg`), la 1re et la
dernière ; les regarder en taille téléphone ; lire `rendu/son.json` ; **noter la vidéo sur 10 avec la grille « œil du
réalisateur »** (`moteur-film.md` § 6) et donner la note — en dessous de 8, on reprend avant de livrer. Un défaut général = on le corrige
dans le moteur (`scripts/film/web/`) et on refait le rendu.

## 7. Livrer
1. Le **MP4** et le **JSON** de la vidéo (tout est généré à partir de lui : il suffit pour la retoucher).
2. Prêts à copier : une **description** TikTok (≤ 150 caractères, la situation + le passage, sans appât), 4–5
   hashtags (#jesus #bible #foi #dieu + 1 lié à la situation), le **commentaire à épingler** (« Écris “prie pour
   moi” et je prierai pour toi 🙏 »), et un rappel : activer l'étiquette « contenu généré par l'IA » de TikTok.
   Dans le kit : les écrire dans le bloc `"livrables"` du JSON (`numero`, `description`, `hashtag`, `situation`,
   `invitation`, `commentaire` facultatif ; `"levier"` à la racine) puis `vf.py livrables` (contrôle la longueur et
   les appâts, écrit `livrables.txt`) — `vf.py tout` enchaîne tout, de la vérification aux livrables.
3. **Finir par la ligne de journal** :
   `📓 JOURNAL VIDÉO FOI 3 — Trop loin pour revenir ? — format : recit — passage : Luc 15:11-32 — situation : sentiment d'être allé trop loin — levier : identification — pont : Luc 15:18 — invitation : prière`

## 8. Auditer, mesurer, améliorer (règle permanente)
Vidéo, statistiques ou commentaires envoyés par Alexis → `references/audit.md` : mesurer (`scripts/audit.py`),
verdict classé par impact, PUIS corriger le skill (moteur, vérificateur, références, charte) et livrer le `.skill`
mis à jour. **La mesure de la chaîne = les vies touchées**, puis l'attention (rétention à 2 s, durée moyenne).
Commentaires : `mission.md` § Les commentaires (détresse → 3114, 15 / 112, SOS Amitié — jamais remplacer une aide
humaine).

## 9. Faire évoluer le moteur
Le moteur est dans `scripts/film/web/` (`rig.js` : squelette 3D, poses, cibles des mains ; `perso.js` : corps,
vêtements, visages, marche ; `lieux.js` : générateurs de lieux, animaux, accessoires, foule ; `monde.js` : matières ;
`film.js` : plans, sol, caméra, couches, graphismes, transitions ; `index.html` : styles et polices) et
`scripts/film.py` (voix, synchro, lèvres, son, aperçus). Atlas de précision : `scripts/atlas.py` (`vf.py atlas` : toutes les poses × 3 vues + les meubles, `moteur-film.md` § 6 bis).
Bancs d'essai : `scripts/banc.py` (une petite scène →
des bandes d'images successives + détection des sauts ; cas dans `scripts/film/test/bancs/`), `scripts/film/test/`
(`planche.js` pour les personnages, `gen.js` pour les générateurs) ; non-régression : `scripts/non_regression.py`
(figer les images de contrôle d'une vidéo, puis comparer). Une capacité qui manque (un vêtement, une pose, une
matière, un type de graphisme) s'y ajoute pour TOUTES les vidéos, se teste sur son banc AVANT → APRÈS, ne change
que les images voulues de l'exemple, puis se documente dans `moteur-film.md` (§ 7). Le dossier du skill
installé est en lecture seule : le copier, le modifier, puis livrer un nouveau `videos-foi.skill`.

L'atelier : `scripts/atelier.py` (serveur local, aucune dépendance) sert `scripts/atelier/` (l'interface) et la scène
`/scene.html` (le moteur lui-même) ; voir `moteur-film.md` § 6 quater. La musique :
`scripts/noyau/musique.py` (composition → vrai piano FluidSynth + SoundFont si installés, sinon synthèse).

Repères : 1080 × 1920, 30 i/s ; un adulte mesure ≈ 460 px debout à `y_ref` du sol ; sous-titres de y 1250 à
~1420 ; rien d'important sous y 1650 ni à droite de x 880 en bas (interface TikTok). Ressources libres incluses :
polices Inter Display, Fraunces, Caveat (OFL) dans `assets/polices`, 2 400 icônes Lucide (ISC) dans
`assets/icones` ; Rhubarb Lip Sync (MIT) téléchargé à la première synchro des lèvres.

# Charte de la chaîne — faire connaître Dieu

Le nom du compte n'est pas encore choisi : quand Alexis le donne, l'écrire dans `"serie"` ci-dessous.

## La mission (en une phrase)
Faire connaître Dieu au plus grand nombre — qui il est, ce qu'il a fait en Jésus, ce qu'il fait encore aujourd'hui —
avec des vidéos animées qui **racontent** la Bible fidèlement, l'**expliquent** simplement et montrent comment
l'**appliquer** dans la vie d'aujourd'hui, de façon hyper accessible (pour ceux qui ne connaissent pas Jésus ou
qui se sont éloignés). **Une vidéo à 200 vues, ce sont 200 personnes qui ont entendu parler de Lui.** La réussite
se mesure aux vies touchées (commentaires « je veux le connaître », prières demandées, gens qui ouvrent leur Bible),
pas aux abonnés. Détails, garde-fous et ce qu'on ne fait jamais : `references/mission.md`.

## La DA (direction artistique)
- **Le format « lumière »** (`references/moteur-film.md` § 0) : l'image dans une **fenêtre en arche** bordée d'or
  sur un **panneau bleu nuit** ; dessous, le texte dit mot à mot, **le mot dit s'allume en or** ; le moment clé passe
  à la **lumière dorée** ; la fin sur la **lampe allumée**. Illustration moderne : formes simples et arrondies,
  personnages aux traits simples (yeux-points), ombres découpées douces, pas de contours noirs, caméra qui bouge
  toujours, grain léger. Notre identité : on s'inspire de la précision et de la narration des meilleures vidéos
  d'enseignement, on ne copie jamais leur style.
- **Tout est inventé pour chaque script** : les personnages sont décrits et les lieux composés (générateurs en
  perspective : maisons, arbres, animaux, foules…) pour l'histoire du jour — aucune banque. Ce qui ne change pas : le style, la lumière, la typographie, la façon de représenter Jésus.
- **La lumière est la signature** : la nuit seulement si l'histoire l'exige, avec une source qui raconte l'espoir ;
  la fin est toujours lumineuse et chaude.
- **Jésus** : montré avec dignité (tunique claire, manteau rouge profond, regard doux), jamais comique, jamais de
  paroles inventées ; la croix avec retenue. **Dieu le Père : jamais de visage ni de corps** — la lumière, sa Parole
  en carte, le feu, la nuée. **Le Saint-Esprit** : le vent, le feu, la colombe. Détails : `references/bible.md`.
- **Les gens de la Bible** : peau mate et cheveux sombres du Proche-Orient du 1er siècle ; **les gens
  d'aujourd'hui** ressemblent aux spectateurs, de toutes origines.
- **Typographie** : Inter Display (sous-titres, titres, texte cinétique), Fraunces italique (la Parole : cartes de
  verset), Caveat (annotations manuscrites) ; sous-titres par morceaux de phrase, **le mot dit s'allume en or** (« Ta parole
  est une lampe à mes pieds », Psaume 119:105), les mots clés en corail ; les versets en carte plein écran, entre « »,
  référence en or.
- **Son** (Alexis, 23/11) : la voix devant ; une musique douce composée pour chaque vidéo (piano feutré + nappe)
  ou choisie par Alexis ; seulement des sons de transition discrets (souffle, pop, carillon de fin). **Aucune
  ambiance, aucun bruitage de décor.**
- **Voix** : ElevenLabs, « Guillaume – Narrator », **bien vivante** (Alexis, 23/11) : stabilité 35–45 %, similarité
  75 %, exagération du style 25–35 %, vitesse 1,0 ; on laisse respirer les paroles de Jésus. Le modèle « Eleven v3 »,
  s'il est disponible sur le compte, accepte des indications de ton entre crochets ([doucement], [ému]) : à tester
  sur 2–3 phrases avant d'y passer.

## Leçons apprises (à compléter après chaque vidéo publiée)
| Date | Vidéo | Chiffres | Ce qu'on en retient (règle générale) |
|---|---|---|---|
| 23/11/2026 | Lancement de la chaîne | — | Refonte : mission, DA lumineuse, Bible Segond 1910 intégrée et vérifiée |
| 23/11/2026 | Retour d'Alexis | — | On RACONTE, on EXPLIQUE, on APPLIQUE (format `recit`) — plus d'histoires à choix ; nouveau moteur de film (Chromium, personnages riggés, lieux dessinés pour chaque script, caméra 2,5D) ; plus aucune banque de lieux ni de personnages |
| 23/11/2026 | Vidéo de référence d'Alexis | — | On ENSEIGNE avec précision : phrases courtes qui s'affichent au rythme de la voix, citations sur des cartes, petits signes d'émotion (ondes, goutte, cœur, pensée), un seul détail de contexte, le moment clé mis en lumière, retour au « tu », porte simple. Notre DA propre (format « lumière »), jamais une copie ; musique douce + transitions, plus d'ambiances |
| 23/11/2026 | Moteur v3 | — | Tout se GÉNÈRE : squelette 3D (face → dos), sol en perspective (chaque chose à sa taille logique, qui passe devant qui), générateurs de lieux / animaux / foules / accessoires ; la caméra cadre des personnages (visages au-dessus des sous-titres) ; l'explication se voit (texte cinétique au rythme de la voix, annotations, listes, icônes) ; lèvres sur la vraie voix |
| 24/11/2026 | Audit du moteur (`AUDIT.md`) | — | Une tête coupée par l'arche est passée entre les 2 images de contrôle d'un plan : le cadrage se contrôle sur TOUT le plan et selon la forme de l'arche. On ne touche plus au moteur sans le VOIR avant → après sur un banc d'essai (bandes d'images, sauts détectés) et sans comparer l'exemple à sa référence figée |
| 24/11/2026 | Moteur : le jeu d'acteur (phase 2) | — | Des acteurs, pas des pantins : une pose part toujours de l'état réel du corps (aucun saut, contrôlé à chaque image), le buste mène et la main arrive en dernier (élan, amorti), se lever passe par une pose de passage, cheveux / voile / robe / manteau suivent avec retard, la marche a son poids, le personnage respire selon son émotion, cligne, regarde quelqu'un (ou NOUS, pour le « tu ») et réagit au mot appuyé. Les mains se lisent (doigts tendus détachés). Une étreinte se touche vraiment : mains sur le dos, le bras passe par-dessus l'autre |
| 24/11/2026 | Moteur : la lumière (phase 3) | — | La lumière RACONTE : chaque lieu a son heure (nuit, aube, matin, midi, soir, or) qui règle soleil, ombres portées, exposition et voile de profondeur ; une lampe ou un feu éclaire le côté des visages ; le moment clé s'illumine dans la scène ; contre-jour possible. Étalonnage moins délavé (sépia 0,05). Nouveaux lieux : barque de Galilée, puits, tombeau (ouvert, lumineux), croix avec retenue, Temple |
| 24/11/2026 | Production (phase 4) | — | Le temps d'Alexis compte : rendu sur la carte graphique (13× plus rapide : 34 min → 2 min 30 pour 92 s), par plan avec cache (retoucher un plan ≈ 25 s), son gardé s'il n'a pas changé ; `vf.py tout` va du script aux livrables et s'arrête à la première alerte |
| 24/11/2026 | Le réalisateur automatique (phase 5) | — | Écrire plus vite sans écrire moins bien : on pose les acteurs, le réalisateur propose caméra (situer → agir → émouvoir), gestes au mot, visages (l'émotion continue d'un plan à l'autre, la bascule arrive au mot), regards, un signe d'émotion et les transitions ; Claude relit toujours. Mesuré : 85 % / 81 % / 92 % d'accord avec la mise en scène faite à la main |
| 24/11/2026 | Enseigner (phase 6) | — | Chaque explication a son visuel juste et exact : la carte de la Palestine du 1er siècle (coordonnées vérifiées et sourcées, lieux débattus marqués « ? », les lieux qui s'allument au mot, le trajet qui se dessine), la frise chronologique jusqu'à « aujourd'hui », la définition d'un mot (sens établi seulement) |
| 24/11/2026 | Le son (phase 7) | — | La chaîne de la voix testée de bout en bout (voix de doublure) : synchro par plan, lèvres Rhubarb (bug Windows corrigé), −14,0 LUFS en deux passes, crête −1,9 dBTP, voix +19 dB au-dessus de la musique — contrôlés à chaque rendu. La musique suit l'histoire (monte vers le moment clé, culmine, s'apaise, se résout), avec un thème qui revient et une vraie cadence ; « G » joue enfin en sol |
| 24/11/2026 | Contrôle qualité (phase 8) | — | Une vidéo n'est prête qu'avec ZÉRO alerte (cadrage, sauts, mise en page : graphismes qui se recouvrent, visage caché, texte trop long ; vérificateur : ce qui flotte, échelles) ET une note ≥ 8/10 à la grille « œil du réalisateur », passée en regardant les images |
| 24/11/2026 | 1re vraie vidéo (v04, la tempête) | — | Le réalisateur comprend l'histoire : le vent qui tombe ne fait tomber personne ; dans le danger tous ont peur sauf Jésus, au calme raconté ils respirent (« Silence ! » dit n'est pas encore le calme) ; assis reste assis d'un plan à l'autre ; un groupe se cadre ensemble (jamais un voisin coupé en deux) ; la 1re image accroche sur un visage ; on lit son téléphone et, la nuit, l'écran éclaire le visage ; sous l'orage, ni lune ni soleil ; sur l'or, le texte passe à l'encre sombre |
| 24/11/2026 | 2e vraie vidéo (v05, la honte) | — | Le détail juste enseigne : le même feu de braises (ἀνθρακιά, deux fois seulement dans le Nouveau Testament) au reniement et au pardon ; on ne fait pas dire à Pierre trois fois la même phrase (ses trois réponses diffèrent). Le moteur : le coq qui chante, le feu de braises avec le poisson et le pain, le lampadaire qui éclaire ; un lieu peut avoir ses objets (et une clé de lieu inconnue est une erreur, jamais ignorée) ; une action sans pose garde la posture (il ne se relève plus tout seul) ; les polices sont chargées avant la 1re image (une image partait sans texte) |
| 24/11/2026 | 3e vraie vidéo (v06, le deuil) | — | Jésus savait qu'il allait relever Lazare, et il a pleuré : la vidéo laisse au deuil sa place avant l'espérance. Le moteur : de face, le voile couvrait tout le visage (Marthe et Marie, la servante) — réparé ; une foule se range en profondeur (elle passait devant les personnages) ; une carte de la Parole ne dit « PAROLE DE JÉSUS » que si la citation est déclarée la sienne (le défaut le disait de « Jésus pleura. ») et le vérificateur l'exige ; les mains qui quittent le visage ne sautent plus (les membres tournent au lieu de basculer) ; sur l'or, le mot dit reste blanc mais cerné d'encre ; une carte qui s'allume avec la voix compte comme du mouvement |
| 25/11/2026 | Retour d'Alexis : la précision | — | « Un taux de précision parfait » : plus aucun défaut de dessin toléré (canapé dont l'accoudoir flotte, bras derrière le corps, main dans le vide, voile sur le visage, manteau sous le sol, assis dans le vide). Chaque meuble est construit pièce par pièce dans sa perspective ; assis, les mains se posent sur les cuisses et restent visibles ; il faut un siège sous qui s'assoit ; l'atlas de toutes les poses et de tous les meubles se regarde en taille réelle avant toute vidéo (`vf.py atlas`) |
| 25/11/2026 | Retour d'Alexis : varier les sujets | — | Pas toujours une histoire de la Bible racontée : alterner trois dosages — **récit**, **vie** (une personne d'aujourd'hui suivie de près, la Bible comme réponse, 15–25 %), **question** (une vraie question posée franchement) — jamais trois du même de suite (`formats.md` § 3) |
| 25/11/2026 | Nuit de travail : l'outil au complet | — | Des contrôles verts ne suffisent jamais : on REGARDE toutes les images, en grand, avant de dire « fait » (un contrôle annoncé ne marchait pas, une référence figée sans être vue cachait une main sur un dos). Chaque contrôle a son témoin. Visages, cheveux, épaules, écharpe, robe assise refaits ; la nuit reste lisible ; décors d'aujourd'hui (39 objets) ; jamais deux fois la même image ; un visage n'est jamais touché par un texte ni par une bulle (elle cherche sa place, quitte à rapetisser) ; on ne prête à Jésus aucun GESTE que le texte ne dit pas (« il parle de », pas « il montre ») |
| 26/11/2026 | Retour d'Alexis : « LE truc sans erreur » + l'atelier | — | On ne LISTE pas les défauts, on les fait disparaître pour toutes les vidéos : une règle automatique par défaut vu (œil qui se ferme sous la main, robe tendue d'un appui à l'autre, cheveux contre le crâne, lointain posé sur l'horizon, lumière qui part de sa source, barque coupée par l'eau, flèche hors du texte, grand mot jamais sur une tête…), un contrôle quand il peut se mesurer, puis TOUTES les images regardées. Et un outil à la souris, l'atelier : Alexis écrit, place, choisit les gestes sur dessin, lance la voix et le rendu ; ce qu'écrit Claude y arrive tout seul, rien ne s'écrase, rien ne se redessine sous les doigts |

```json
{
  "serie": "",
  "format": "film",
  "duree_cible": [60, 100],
  "duree_cible_recit": [60, 100],
  "duree_cible_question": [45, 90],
  "duree_cible_promesse": [20, 40],
  "duree_cible_temoignage": [45, 100],
  "duree_cible_evangile": [50, 80],
  "mots_par_seconde": 3.0,
  "palette": {
    "accent": "#ff7a59",
    "lumiere": "#ffd48a",
    "texte": "#fffaf0",
    "surlignage": "#ffd34d"
  }
}
```

# Écrire une vidéo : le script, la mise en images, la qualité

## 1. Avant d'écrire : les 6 lignes de la vidéo (dans la réponse de travail)
1. **La situation d'aujourd'hui** (le fil rouge) : un moment précis que beaucoup vivent — angoisse, honte, deuil,
   solitude, échec, doute, épuisement, sentiment d'être de trop.
2. **Le passage** (`bible.py "<passage>"`, lu en entier) et ce qu'il dit VRAIMENT.
3. **La phrase de Jésus** (ou de Dieu) qui fait basculer le récit — elle aura sa carte `verset`.
4. **L'idée** à expliquer, une seule, en une phrase simple (« Jésus ne vient pas après la tempête : il vient
   dedans »).
5. **L'application** concrète, pour ce soir / demain, dans la situation du début.
6. **La porte** : la prière / le mot à écrire / le passage à lire (`mission.md`).
Si une ligne est floue, le script le sera. Choisir d'abord le **dosage** (`formats.md` § 3 : récit, vie,
question) — en **vie**, la ligne 2 peut être un seul verset et la ligne 1 prend la moitié de la vidéo.

## 1 bis. Le rythme qui ENSEIGNE (retour d'Alexis du 23/11 : « c'est exactement ce que je veux faire »)
Ce qui rend une vidéo d'enseignement captivante — on s'en inspire pour la PRÉCISION et la NARRATION, jamais pour
copier un style ou un texte (notre identité visuelle est la nôtre : `moteur-film.md` § Format lumière) :
1. **Ouvrir sur une pensée que le spectateur a déjà eue**, en « tu », formulée comme lui la dirait (« Tu t'es déjà
   dit : “cette fois, je suis allé trop loin” ? »). Puis 2–3 fragments très courts qui l'approfondissent
   (« Trop d'erreurs. » / « Trop de temps loin de Dieu. »). Chaque fragment a SON image et son petit signe
   (ondes d'angoisse, goutte, pensée).
2. **Le pont vers Jésus en une phrase** : « Il y a deux mille ans, Jésus a raconté une histoire pour des gens
   comme toi. » + l'étiquette du passage (`badge`).
3. **Le récit en phrases courtes**, au présent, une action par plan ; les paroles exactes de la Bible sur une
   CARTE (`citation`) qui se lit mot à mot avec la voix.
4. **Un détail de contexte qui éclaire** (un seul, vérifié, sourcé : « Pour un Juif de l'époque, impossible de
   tomber plus bas. » + l'annotation « animal impur · Lévitique 11:7 »).
5. **Le moment clé passe de la nuit à la lumière** (`panneau` doré) : c'est LA phrase que les gens retiendront
   (« Et il court. »). Le plus court possible.
6. **Ce que ça veut dire, en une idée** + 2–3 points qui arrivent au mot (`liste` : « Pas de reproche / Pas de
   conditions / Une fête »).
7. **Retour au personnage du début** : la même pièce, la même posture, qui change (il relève la tête, se lève).
8. **Une phrase finale qui se retient** + une porte simple (prière en une phrase) ; parfois « envoie ça à
   quelqu'un qui… » (au service de l'autre, jamais pour la chaîne) ; écran de fin (lampe + passage à lire).
Densité : ≈ 200–230 mots pour 75–95 s ; des phrases de 2 à 12 mots ; le texte à l'écran = exactement ce qui est
dit (karaoké sur le panneau) ; le mot dit s'allume en or.

## 2. Le texte dit
- **Raconter** : comme un ami qui raconte une histoire vraie, au présent, avec des détails concrets (l'heure, le
  vent, les mains qui tremblent) — sans jamais inventer ce que dit le texte.
- **Expliquer** : une idée, avec des mots de tous les jours ; un exemple d'aujourd'hui vaut mieux qu'un concept.
- **Appliquer** : « tu », « ce soir », « quand ça revient » ; jamais de morale (« il faut », « tu dois »), toujours
  une promesse de Dieu et un pas simple.
- **Phrases courtes** (≤ 16 mots ; une citation peut être plus longue), une idée chacune, **aucun remplissage**.
- **Mots de tous les jours** : tout mot d'Église est expliqué en 3 mots ou remplacé.
- **Les paroles de Jésus ont de l'air** : seules dans leur plan ou presque, suivies d'une respiration (`"pause"`).
- Pour la voix ElevenLabs : chiffres en lettres, pas d'abréviations, « … » pour une hésitation, « : » avant une
  citation.

## 3. Une phrase = une image (`moteur-film.md`)
- Chaque phrase a son plan (2,5–4 s) ; ce que la voix nomme est VISIBLE quand elle le nomme (le téléphone, la
  barque, la main tendue). Plusieurs gestes / coupes de caméra AU MOT dans un plan plus long.
- **Le monde d'abord** : des lieux dessinés pour l'histoire, avec 4–6 détails qui racontent ; des personnages
  expressifs ; la caméra qui raconte (large pour situer, moyen pour l'action, gros plan pour l'émotion).
- **La cohérence** : un personnage garde la même description dans toute la vidéo ; un lieu garde sa lumière et
  ses objets à la même place ; les plans d'un même lieu s'enchaînent (raccords).
- Les plans `aujourdhui` et les plans `recit` se répondent : même cadrage, même geste, même lumière qui change
  (la chambre sombre du début, la même chambre avec la lumière à la fin).

## 4. Lumière, couleur, son
La lumière est la signature : le panneau bleu nuit, le mot dit qui s'allume en or, le moment clé qui passe à la
lumière dorée, la fin sur la lampe allumée. **Le son (format lumière, Alexis 23/11)** : la voix bien vivante
devant ; une musique douce composée pour la vidéo (piano feutré + nappe, plus présente au tournant, qui se résout à
la fin) ; un souffle discret aux changements de plan, un « pop » feutré quand une carte ou une bulle apparaît, un
carillon sur l'écran de fin. **Aucune ambiance de décor, aucun bruitage.** Chaque plan peut régler l'intensité de
la musique (`"musique": 0–1`) ; une musique choisie par Alexis passe par `--musique fichier.mp3`.

## 5. Le contrôle qualité (avant tout rendu)
`verifier_film.py` sans ERREUR, alertes traitées ; `film.py --apercu` regardé (planche + images pleine taille),
alertes CADRAGE corrigées. Puis le **pré-mortem**, une ligne chacun, honnêtement :
1. **À 2 s** : quelqu'un qui ne connaît pas Jésus se reconnaît-il ? Reste-t-il ?
2. **La seconde la plus faible** et sa correction.
3. **Fidélité** : un lecteur de la Bible trouverait-il une seule chose inventée ou déformée ?
4. **Accessibilité** : un ado sans culture biblique comprend-il tout ?
5. **L'image** : chaque phrase est-elle montrée, logique, bien proportionnée, bien éclairée ?
6. **Jésus** : digne, doux, vrai ; ses mots exactement les siens ?
7. **La porte** : une chose simple à faire maintenant, sans pression ?

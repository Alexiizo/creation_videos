# La Bible dans les vidéos : fidélité, outil, représentation

## La traduction
- **Louis Segond 1910** (domaine public), intégrée au skill : `assets/bible/lsg1910.json` (66 livres, avec les
  paroles de Jésus repérées). C'est la SEULE traduction citée mot pour mot à l'écran et à la voix.
- Les traductions modernes (Segond 21, NBS, Semeur, Parole de Vie, TOB…) sont protégées : **jamais citées mot pour
  mot**. On peut les nommer (« dans une traduction moderne : … » interdit ; « en français d'aujourd'hui, ça veut
  dire que… » permis) et paraphraser librement dans la narration.
- Le français de 1910 est parfois vieilli (« Homme de peu de foi », « ne s'alarme point ») : c'est beau et ça se
  comprend. Si un mot bloque la compréhension, on cite un **fragment** clair (« … » permis entre deux morceaux) et
  on raconte le reste en français d'aujourd'hui — on ne modernise JAMAIS l'intérieur des « ».

## L'outil (`scripts/bible.py`)
```bash
python3 scripts/bible.py "Matthieu 14:22-33"                   # le passage, un verset par ligne
python3 scripts/bible.py --chercher "marcher sur les eaux"      # trouver un passage
python3 scripts/bible.py --verifier "Jean 3:16" "Car Dieu a tant aimé le monde…"   # mot pour mot ?
python3 scripts/bible.py --jesus "Jean 8:1-11"                  # les paroles de Jésus du passage
```
Références acceptées : « Jean 3:16 », « Jn 3.16-18 », « Psaume 23 », « 1 Corinthiens 13:4-7 », « II Rois 5 ».
La vérification ignore la ponctuation, les majuscules et les apostrophes ; « … » permet de sauter des mots.
**Lire tout le passage (`bible.py "<passage>"`) AVANT d'écrire le moindre mot du script.**

## Les clés du JSON (contrôlées par `verifier_film.py`)
| Clé | Où | Rôle |
|---|---|---|
| `"passage": "Matthieu 14:22-33"` | racine | Le passage raconté (obligatoire pour `recit`) ; affiché sur l'écran de fin. |
| `"pont": {"ref": "Matthieu 14:30"}` | racine | Le verset qui relie l'histoire à la vie du spectateur aujourd'hui (obligatoire pour `recit`, `question`, `evangile`). |
| `"registre"` | plan | `aujourdhui` \| `recit` \| `explication` \| `invitation` : les plans `recit` et `explication` ont un `"appui"`. |
| `"appui": ["Matthieu 14:30"]` | plan | Le(s) verset(s) sur lequel repose ce que le plan raconte ou explique (alerte FIDÉLITÉ sinon). |
| `"cite": [{"ref": "Matthieu 14:27", "qui": "jesus"}]` | plan | Obligatoire dès que le texte dit contient « … » : chaque citation est vérifiée MOT POUR MOT ; `qui: jesus` vérifie en plus que ce sont bien SES paroles. |
| `{"type": "verset", "mot": "…", "ref": "Jean 3:16"}` | `graphiques` | La carte plein écran (texte entre « », référence en or, image floutée derrière). Sans `texte`, le verset entier est pris dans la Bible ; avec `texte` (un fragment), il est vérifié mot pour mot. |

Règles typographiques : **« » = la Bible, et rien d'autre** (une phrase à écrire en commentaire s'écrit entre
“ ”). Les paroles de Jésus et de Dieu sont TOUJOURS entre « » : « Jésus lui dit : « Viens! » » est vérifié ;
« Jésus lui dit de venir » (raconté, sans le faire parler) est permis ; « Jésus lui dit : viens, n'aie pas peur »
(des paroles inventées sans guillemets) est une ERREUR.

## Ce qu'on peut ajouter, ce qu'on ne peut pas
**Permis** (ce que le texte laisse supposer, et qui sert à vivre la scène) : la météo, l'heure, le décor, les
gestes, les émotions sur les visages, les pensées probables du personnage introduites honnêtement (« Tu as
peur. » quand le texte dit qu'il eut peur ; « Imagine… » pour une supposition), le contexte historique VÉRIFIÉ (la
4e veille = entre 3 h et 6 h du matin ; un collecteur d'impôts travaillait pour Rome) — en cas de doute, chercher
sur le web et garder la source.
**Interdit** : une parole de Jésus, de Dieu, d'un ange qui n'est pas dans le texte ; un événement, un miracle ou
un dialogue inventé ; un motif qui contredit le texte ; fusionner deux récits sans le dire ; changer la fin. Les
autres personnages peuvent avoir une réplique brève de narration sans guillemets (« les disciples hurlent de
peur »), jamais une citation inventée.
**Les paraboles** (le fils prodigue, le bon Samaritain) sont des histoires racontées par Jésus : on peut les jouer
(« Tu es le fils… »), en le disant une fois (« Jésus a raconté cette histoire. »).

## Le pont (relier à aujourd'hui)
Une phrase de passage simple (« Ce Jésus-là n'a pas changé. », « Ce qu'il a fait pour elle, il le fait encore. »)
puis LE verset, en carte `verset`. Il répond à la blessure du début (le fil rouge) : la peur → Ésaïe 41:10 ; la
honte → Romains 8:1 ; le rejet → Jean 6:37 ; le deuil → Jean 11:25 ; l'épuisement → Matthieu 11:28 ; l'échec →
Lamentations 3:22-23 ; le doute → Jean 20:29. Banque complète : `formats.md` § 5. Jamais une morale (« la leçon,
c'est… ») : une promesse de Dieu, dite par sa Parole.

## Représenter
**Jésus** — montré, avec dignité : décrit comme les autres personnages (`moteur-film.md` § 2), tunique claire,
manteau rouge profond, cheveux et barbe sombres, peau mate ; visage `doux` quand il regarde quelqu'un, `paix` quand
il prie ; gestes : `tend_main`, `tend_main_bas` (relever quelqu'un), `benit`, `bras_ouverts`, `accueille`,
`enseigne`, `prie`, `prie_genoux`. `"gloire"` (0,3–0,6) quand la lumière doit venir de lui (il marche sur l'eau,
il apparaît ressuscité). Jamais comique, jamais de clin d'œil, jamais de paroles hors du texte.
La croix : avec retenue — de loin, en contre-jour, sans sang ni détail de souffrance ; on montre l'amour (le
regard vers le brigand, « Père, pardonne-leur ») plus que la douleur.
**Dieu le Père — jamais de visage ni de corps** (le vérificateur refuse un casting `dieu`, `pere`, `eternel`…) :
la lumière (halo `contre_jour`, rayons `fx rayons`), le feu (le buisson), la nuée, et sa voix = une citation à
l'écran (carte `verset`).
**Le Saint-Esprit** : le vent (`data-anim` vent, brume qui passe), les flammes, la colombe (au baptême) — jamais un personnage.
**Les anges** : vêtements blancs et `"gloire": 1` (lumière), rares, jamais mignons.
**Le diable / la tentation** : jamais un diable de dessin animé ; une ombre, une voix (citation du texte), le
désert. Rarement.
**Les gens** : peau mate et cheveux sombres du Proche-Orient du 1er siècle (variés : `#9c6644` à `#e0b08a`),
tuniques, manteaux, voiles, keffiehs, sandales ; Romains casqués ; jamais de look « américain » ni de stéréotype.
Ils sont décrits pour chaque vidéo (`moteur-film.md` § 2), jamais pris dans une banque.
**Les miracles** : avec une lumière douce et le visage de celui qui le vit — jamais d'effets spéciaux tape-à-l'œil.

# Le moteur de film : tout générer à partir du script

**Principe (Alexis, 23/11) : aucune banque de lieux ni de personnages.** Pour chaque vidéo, Claude DÉCRIT les
personnages et COMPOSE les lieux dont CE script a besoin ; le moteur les construit, les met en perspective, les
éclaire et les anime. Le moteur ne contient que des **outils universels** :
- un **squelette 3D** de personnage (vue de face → profil → dos, cinématique inverse des bras et des jambes, marche à
  pieds plantés), habillable à l'infini par description ;
- des **générateurs de lieux** paramétrés (pièce, meubles, bâtiments antiques ou modernes, ville, arbres par espèce,
  végétation, sols, chemins, clôtures, animaux par espèce, accessoires, foule de gens tous différents) et des
  **matières** (ciel, nuages, relief, eau, pluie, neige, particules, rayons, brume, lumières, feu, éclairs) ;
- une **caméra 2,5D** qui cadre les personnages qu'on lui nomme, la profondeur de champ, l'étalonnage, le grain ;
- les **graphismes d'explication** (texte cinétique calé sur la voix, icônes qui se dessinent, annotations
  manuscrites, listes, comparaisons, chiffres, cartes de verset) ;
- la **synchro** au mot (tout ce qui a un `"mot"`) et des lèvres (Rhubarb, sur la vraie voix).

Tout ce que les générateurs ne savent pas faire se dessine en SVG pour la vidéo (`"svg"` dans une couche ou un objet).

Rendu : Chromium (Playwright) dessine chaque image, ffmpeg encode ; Python cale la voix, les sous-titres, les lèvres
et le son. Exemple complet et vérifié, 100 % généré (aucun fichier de décor) : `assets/exemple-film/film.json`
(« Trop loin pour revenir ? », le fils prodigue, Luc 15).

```bash
python3 scripts/verifier_film.py video.json --bible charte.md                           # message + structure, texte voix
python3 scripts/atelier.py --racine <projet> --bible charte.md                         # L'ATELIER : toute la vidéo dans le navigateur
python3 scripts/film.py video.json --bible charte.md --apercu apercu --moments 0.3,0.85  # images de contrôle + planche
python3 scripts/voix.py video.json [--plan 7]                                           # ElevenLabs : un mp3 par plan
python3 scripts/film.py video.json --bible charte.md --voix-plans voix_plans --sortie rendu   # le MP4 final
python3 scripts/film.py video.json --bible charte.md --voix voix.mp3 --sortie rendu     # (voix d'un seul fichier)
python3 scripts/icones.py heart                                                         # chercher une icône (mots anglais)
```
Dans le kit Claude Code, les mêmes commandes s'écrivent `python vf.py verifier|apercu|voix|rendu videos/v03` ; l'atelier :
`python vf.py interface` (ou double-clic sur « Ouvrir l'atelier »).

## 0. Le format « lumière » (par défaut ; `"style": {"format": "plein_ecran"}` pour l'ancien format à sous-titres)
Notre identité visuelle (inspirée pour la PRÉCISION et la NARRATION des meilleures vidéos d'enseignement, jamais
copiée) :
- **L'image vit dans une fenêtre en arche** (un vitrail, une porte ouverte) bordée d'un filet d'or, posée sur un
  **panneau bleu nuit** ; l'arche fait x 46 → 1034, y 70 → 1130 (réglable : `"style": {"fenetre": {…}}`).
- **Sous l'arche, le texte dit** : par morceaux de phrase (coupés sur la ponctuation, jamais après un article), mot
  à mot avec la voix ; les mots à venir sont bleu-gris, **le mot dit s'allume en or** (« Ta parole est une lampe à
  mes pieds »), les mots dits restent ivoire. Police Fraunces. Pas d'autres sous-titres.
- **Le moment clé passe de la nuit à la lumière** : le lieu (ou le plan) prend un panneau doré
  `"panneau": {"fond": "#f6cf7d", "fond2": "#e39a42", "texte": "#2b1c0e", "gris": "#a8742f", "actif": "#fffaf0",
  "lueur": "#fff3c4"}` — UNE fois par vidéo, sur LA phrase.
- **Les personnages** : `"traits": "simple"` (yeux-points, sourcils, bouche simple — le style de la chaîne),
  `"tete": 1.15–1.4` (tête plus grande, plus expressive) ; `"traits": "aucun"` = silhouette sans visage (une
  figure vue de loin, une foule symbolique). Pas de contours ; ombres découpées douces ; mains en moufle.
- **Les petits signes** qui montrent ce qu'on ressent (§ 5) : ondes d'angoisse, goutte, cœur qui bat, bulle,
  pensée (avec une icône ou une petite scène), traits qui assaillent, téléphone avec message.
- **Le son** : voix devant, musique composée pour la vidéo (piano feutré + nappe : `"style": {"musique":
  {"tonalite": "G", "tempo": 70, "humeur": "espoir" | "intime" | "grave"}}`, intensité par plan `"musique": 0–1`,
  ou `--musique fichier`), souffle aux changements de plan (`"son_transition": false` pour l'enlever), « pop »
  feutré des cartes et bulles, carillon de fin. Aucune ambiance, aucun bruitage.
  La musique suit la **courbe de l'histoire** (`film.py courbe_emotion`) : elle installe (aujourd'hui), raconte, MONTE
  sur le plan qui précède le moment clé, CULMINE sur le plan au panneau doré, s'apaise (explication), se résout
  (invitation) ; un **thème** de 5 notes (le même pour toute la vidéo) est posé au début, repris une octave plus haut
  au moment clé, puis lentement avant la fin ; la fin est une vraie **cadence** (dominante → tonique).
  Le **contrôle du son** à chaque rendu (`rendu/son.json` + une ligne) : −14 LUFS ± 1 (mastering en deux passes),
  crête ≤ −1,5 dBTP, voix ≥ 14 dB au-dessus de la musique ; un brouillon sans voix vise −21 LUFS.
- Repères de cadrage : la caméra `cadre` place les visages dans l'arche (pas besoin d'éviter des sous-titres) ;
  laisser le haut de l'arche respirer ; les groupes larges : `y_ecran` 450–700.

## 1. La structure du JSON
```jsonc
{
  "titre": "Trop loin pour revenir ?", "type_video": "recit", "passage": "Luc 15:11-32", "pont": {"ref": "Luc 15:18"},
  "mots_rouges": ["Jésus", "Dieu"],                         // en corail dans les sous-titres
  "style": {"format": "lumiere", "grain": 0.05, "musique": {"tonalite": "G", "tempo": 70, "humeur": "espoir"}},
  "mots_par_seconde": 3.0,                                   // voix vivante
  "personnages": { "theo": {…}, "fils": {…}, "jesus": {…} },   // § 2 — décrits pour CE script
  "lieux": { "salon": {…}, "maison": {…}, "champ": {…} },        // § 3 — composés pour CE script
  "plans": [ {…}, {…} ]                                          // § 4 — une phrase = un plan
}
```

## 2. Les personnages (une description, pas une banque)
```jsonc
"theo": {
  "age": "jeune",              // bebe | enfant | ado | jeune | adulte | age   (les proportions suivent l'âge)
  "silhouette": "homme",       // homme | femme ; "corpulence": 0–1 ; "taille": 1 (0,8 petit → 1,15 grand)
  "peau": "#c48a5e", "yeux": "#4a3020",
  "cheveux": {"style": "boucles", "couleur": "#1c130d"},    // court | mi_long | long | boucles | chignon | queue | rase | degarni | chauve
  "barbe": {"style": "courte", "couleur": "#2b1d14"},       // courte | longue | moustache | naissante
  "haut": {"couleur": "#3d4a6b", "col": "capuche", "manches": "longues", "longueur": "hanches", "larges": false},
                               // col : rond | v | chemise | capuche | tunique | aucun ; manches : longues | trois_quarts | courtes | aucune
                               // longueur : taille | hanches | genoux | chevilles (tunique, robe : la robe suit les jambes et
                               // ne s'ouvre jamais en voile ; en marchant, les mollets sortent dessous)
  "bas": {"type": "pantalon", "couleur": "#2b2b33"},        // pantalon | short | jupe | null (sous une tunique longue)
  "manteau": {"type": "drape", "couleur": "#8e2b26"},       // drape (en travers de l'épaule) | veste | cape
  "ceinture": "#4a3423",
  "chaussures": {"type": "baskets", "couleur": "#eee"},     // chaussures | baskets | sandales | bottes | pieds_nus
  "coiffe": {"type": "voile", "couleur": "#d9cbb0"},        // voile | keffieh | turban | capuche | casquette | bonnet | couronne |
                                                            // couronne_epines | casque | {"svg": "…"}
  "tient": "telephone",        // ce qu'il a en main par défaut (ou {"svg": "<g>…</g>", "x", "y", "rot", "echelle"}) ;
                               // une action peut le changer : {"tient": null}
  "gloire": 0                  // une lumière qui émane (un ange) : 0–1
}
```
Un même personnage qui CHANGE (riche puis en haillons, avant/après) = deux descriptions (`fils`, `fils_pauvre`) avec
le même visage (peau, cheveux, âge) et d'autres vêtements : c'est l'histoire qui se voit.
Règles : les gens de la Bible ont la peau mate et les cheveux sombres du Proche-Orient (varier #9c6644 → #e0b08a),
tuniques et manteaux de couleurs naturelles ; les gens d'aujourd'hui ressemblent aux spectateurs (toutes origines).
Jésus : tunique claire, manteau rouge profond, visage `doux`, jamais comique. **Dieu le Père n'est jamais un
personnage** : les identifiants `dieu`, `pere`, `père`, `esprit`… sont refusés (le père d'une parabole s'appelle
`pere_histoire`, jamais `pere`).

## 3. Les lieux : composer avec les générateurs
Un lieu = des **couches** à des **profondeurs** (0 = l'infini, 1 = le plan des personnages, > 1 = premier plan flou).
La caméra les déplace en parallaxe ; la profondeur de champ floute ce qui est loin de la mise au point.

**Le sol et la perspective** (`"sol"`) : c'est ce qui rend le monde LOGIQUE. Avec `"sol": {"horizon": 1000,
"y_ref": 1650, "echelle": 1}`, tout ce qui est posé au sol (personnages, meubles, animaux, accessoires, bâtiments)
prend automatiquement la taille de sa profondeur : plus c'est haut à l'écran (près de l'horizon), plus c'est loin et
petit ; un adulte mesure ≈ 460 px × `echelle` debout à `y_ref`. Les tailles des objets s'écrivent **à `y_ref`**
(un canapé : `l` 620, `h` 300 ; un cochon : `taille` 250). Qui passe devant qui suit les pieds (`y`), même pendant
une marche en profondeur. Un personnage marche vers `x` ET `y` (il se retourne tout seul de face ou de dos).

```jsonc
"maison": {
  "ambiance": "village",                                     // son : vent | mer | pluie | nuit | ville | village | interieur | …
  "sol": {"horizon": 1000, "y_ref": 1650, "echelle": 1},
  "heure": "matin",                                          // nuit | aube | matin | midi | soir | or (§ 3 bis)
  "lumiere": {"cote": -1, "couleur": "#fff1d6", "ombre": "#3a2a3a", "rim": 0.6},
  "etalonnage": {"teinte": "#f2b46b", "teinte_force": 0.12, "contraste": 1.06, "saturation": 1.05},
  "couches": [
    {"gen": "ciel", "haut": "#78aedb", "bas": "#f6dcb0", "horizon": 1000, "astre": [880, 380, 56], "profondeur": 0},
    {"gen": "relief", "y": 990, "amplitude": 190, "couleur": "#c9b38a", "profondeur": 0.15},
    {"gen": "ville", "style": "antique", "rangees": [{"y": 1010, "h": [80, 150], "echelle": 0.42}], "brume": "#f0dcb8", "profondeur": 0.4},
    {"gen": "sol", "y": 1000, "matiere": "terre", "couleur": "#c9a874"},
    {"gen": "batiment", "x": 300, "y": 1330, "l": 760, "h": 560, "style": "antique", "porte_x": 0.25},
    {"gen": "arbre", "espece": "olivier", "x": 110, "y": 1400, "hauteur": 560},
    {"gen": "vegetation", "zone": [-200, 1640, 1300, 1980], "types": ["herbe", "cailloux", "fleurs"], "densite": 0.3}
  ]
}
```
Dessiner PLUS LARGE que l'écran (x −400 → 1500). Un lieu a ses `couches` (le décor) et peut avoir ses `objets` (un banc, un lampadaire : dans chacun de ses plans,
triés en profondeur avec les personnages) ; un plan peut ajouter ses propres `couches` et `objets`. Une clé de lieu
inconnue est une ERREUR du vérificateur (le moteur l'ignorerait sans bruit).

**Générateurs de lieux** (`"gen"`, tous paramétrés, aucun décor tout fait) :
| gen | quoi | réglages |
|---|---|---|
| `piece` | intérieur en perspective : mur du fond, murs latéraux, plafond, sol | `fond: [x0,y0,x1,y1]`, `mur: {couleur, matiere: enduit\|pierre\|brique\|bois\|papier\|carrelage}`, `sol: {couleur, matiere: parquet\|dalles\|carrelage}`, `plafond`, `fenetres: [{x,y,l,h, ciel: nuit\|jour\|aube\|#…, ville, lune, pluie, rideaux}]`, `portes: [{x,l,h,couleur,ouverte}]`, `cadres`, `lumiere: {x,y,r,couleur,intensite}` |
| `meuble` | lit, table, bureau, chaise, banc, canape, etagere, commode, jarre, boite | `type`, `x`, `y` (coin avant gauche au sol), `l`, `h`, `prof`, `couleur`, `couleur2` (tissu) |
| `volume` | boîtes en perspective (muret, estrade, comptoir, caisse) | `boites: [{x,y,l,h,prof,couleur}]` |
| `batiment` | maison antique (enduit, terrasse, poutres, porte en bois, petites fenêtres) ou immeuble moderne | `x`, `y`, `l`, `h`, `style: antique\|maison\|moderne\|immeuble`, `porte_x`, `porte_ouverte`, `escalier`, `toit: plat\|pente\|dome`, `fenetres: {rangs, colonnes, allumees}`, `auvent` |
| `ville` | rangées de bâtiments générés (village de Galilée, ville moderne la nuit) | `style`, `rangees: [{y, h:[min,max], echelle}]`, `de`, `a`, `nuit`, `brume` |
| `arbre` | olivier, palmier, chene, pin, cypres, sapin, figuier, saule, acacia, nu (famine, hiver), buisson | `espece`, `x`, `y`, `hauteur`, `couleur`, `vent`, `seed` |
| `vegetation` | herbes au vent, fleurs, roseaux, buissons, cailloux, en profondeur | `zone`, `types`, `densite`, `couleur`, `fleurs` |
| `rochers`, `sol`, `chemin` | rochers ; sol texturé (herbe, sable, terre, pave, dalles, route) ; route qui file vers l'horizon | `sol: {y, matiere, couleur}` ; `chemin: {de, a, largeur, couleur, sinueux}` |
| `cloture`, `auge`, `feu` | clôture en perspective ; auge ; feu de camp animé — ou feu de BRAISES (charbons qui rougeoient, flammes basses) avec le repas posé dessus (Jean 21:9) | `de`, `a`, `hauteur` ; `l`, `contenu` ; `taille`, `braise`, `poissons`, `pains` |
| `objet` | 39 objets à leur taille réelle (cm), dans la perspective du lieu : maison (frigo, plan_travail, table_repas, tv, ordinateur, lampe_pied, suspension, plante, tapis, cadre, horloge, miroir, lavabo), école (tableau, pupitre, casiers, sac), hôpital (lit_hopital, perfusion, moniteur), église (banc_eglise, autel, vitrail, cierge), rue et transports (voiture, abribus, feu_tricolore, poubelle, haie, enseigne, siege_bus, barre_bus, fenetre_bus qui défile), guirlande, époque (etal, colonne, arcade, rouleau, filet) | `type`, `x`, `y`, `l`/`h`/`prof` (px à y_ref, sinon la taille réelle), `couleur`, `couleur2`, `allume` ; accroché au mur : `y_sol` = le pied du mur ; `lampe_pied`, `suspension`, `tv`, `ordinateur`, `cierge`, `vitrail` (et `abribus` si `allume`) sont des SOURCES |
| `premier_plan` | ce qui passe flou devant nous : feuillage, rideau, porte, etagere, rambarde | `type`, `cote`, `couleur`, `opacite`, avec `"devant": true` |
| `lampadaire` | lampadaire de rue (mât, crosse, lanterne) ; allumé : cône de lumière et flaque au sol, et c'est une SOURCE qui éclaire les personnages | `x`, `y`, `h` (≈ 430), `sens`, `allume`, `lumiere`, `couleur` |
| `animal` | porc, mouton, agneau, chevre, ane, cheval, chien, boeuf, chameau, colombe, coq, poule (le coq `pose: chante` : tête levée, bec ouvert, trois petits arcs — on l'entend sans bruitage) | `espece`, `x`, `y`, `taille`, `sens`, `pose: debout\|broute\|marche\|couche\|chante`, `couleur` ; perché (muret, toit) : `y_sol` = le sol sous lui (sa taille), `profondeur` = celle de son support |
| `accessoire` | pieces, bourse, coupe, pain, lampe (à huile, flamme vivante), bougie, telephone, livre, cruche, carouges, assiette, tasse, baton, panier | `type`, `x`, `y`, `taille`, `couleur`, `allume`, `n` |
| `foule` | des gens GÉNÉRÉS, tous différents (âge, peau, vêtements, coiffes), tournés vers ce qu'ils regardent | `n`, `zone`, `epoque: antique\|moderne`, `vers: [x, y]`, `poses`, `seed` |
| `barque` | barque de pêche de Galilée (coque, plat-bord, mât et voile latine), DANS l'eau, qui tangue (l'eau devant la coque reste à niveau, ses bords se fondent dans le lac) | `x`, `y` (ligne de flottaison), `l`, `sens`, `voile`, `tangue` (degrés, 0 = immobile), `couleur`, `eau` — passagers : `"porte_par"` + `"coupe_y"` |
| `puits` | margelle de pierres, poutre, corde et seau | `x`, `y`, `r`, `seau`, `couleur` |
| `tombeau` | tombeau taillé dans le roc, pierre ronde | `x`, `y`, `l`, `h`, `ouvert` (0 fermé → 1 roulée), `lumiere` (0–1 : le tombeau vide), `couleur` |
| `croix` | **avec retenue** : du bois nu, jamais de corps ; une ou trois, souvent de loin en contre-jour | `x`, `y`, `h`, `n: 1\|3`, `ecart`, `silhouette`, `couleur` |
| `temple` | le Temple de Jérusalem (stylisé) : sanctuaire blanc et or, portiques, marches | `x`, `y`, `l`, `h`, `couleur`, `or` |

**§ 3 bis — La lumière qui raconte** (`eclairage.js`, banc `heures`). `"heure"` sur le lieu (ou le plan) règle tout
d'un coup : le soleil (couleur, hauteur, côté `lumiere.cote`), la couleur des ombres, l'exposition (la nuit est
sombre et bleue, pas seulement le ciel), les **ombres portées** des personnages (longues à l'aube et au soir, courtes
à midi, aucune la nuit), le **voile de profondeur** (le lointain s'efface dans l'air), la vignette ; un `ciel` sans
couleurs prend celles de l'heure, et le soleil ou la lune se place tout seul — sauf sous l'orage (un lieu avec
`pluie`, `neige` ou `eclair`, ou `"couvert": true`) : ni soleil, ni lune, ni étoiles. Sans heure : lumière neutre, ombres
portées dehors seulement. `"lumiere": {"contre_jour": true}` : silhouettes bordées de lumière, ombres vers nous.
Une **source** posée dans le plan (`lumiere`, `feu`, lampe, bougie) éclaire le côté des personnages tourné vers elle
(à moins de 620 px). Le soir et la nuit, l'**écran d'un téléphone** tenu éclaire le visage penché dessus (une lueur
froide, automatique dès que l'exposition baisse). Le **moment clé** (panneau doré) s'illumine DANS la scène : la lumière dorée monte depuis le
soleil en ≈ 1 s. `"ombre": false` sur un acteur supprime son ombre portée. Raconter avec l'heure : partir le soir,
revenir dans l'or ; la nuit de l'angoisse, l'aube de la réponse.
**Matières** : `ciel` (dégradé, astre, étoiles), `nuages`, `relief`, `eau` (calme → tempête), `pluie`, `neige`,
`particules` (poussière, braises, lucioles), `rayons`, `brume`, `lumiere` (halo de lampe, d'écran, de feu),
`eclair` (`instants: [{"mot": …}]`, + tonnerre). Une couche ou un objet sans générateur : `"svg": "<g>…</g>"`.
Un objet hors-sol (une lumière, des rayons) se range dans la profondeur avec `"y_sol"`.

**Faire vivre un dessin SVG** : `<g data-anim='{"type": …}'>` — `balance`, `flotte`, `vague`, `tangue`, `pulse`,
`tourne`, `vent`, `derive`, `vacille`, `scintille`, et des images-clés `"cles": [{"t": 0, "x": 0}, {"mot": "ouvre",
"x": 120}]`. Les générateurs le font déjà (feuillages, herbes, queues, têtes des animaux qui broutent, flammes).

## 4. Les plans (une phrase = une image)
```jsonc
{
  "texte": "Mais son père le voit arriver de loin.",          // lu par la voix + sous-titres
  "registre": "recit", "appui": ["Luc 15:20"],               // aujourdhui | recit | explication | invitation ; bible.md
  "cite": [{"ref": "Luc 15:18"}],                            // pour chaque « … » dit (qui: "jesus" pour ses paroles)
  "lieu": "route", "transition": "fondu",                     // coupe | fondu | noir | blanc
  "camera": [{"t": 0, "cadre": ["pere_histoire", "fils"], "plan": "large"},
             {"mot": "loin", "cadre": "pere_histoire", "plan": "americain", "tremble": 0.2},
             {"t": "fin", "x": 600, "y": 1150, "zoom": 1.3}],   // ou x / y / zoom à la main
  "acteurs": [{"id": "pere_histoire", "x": 330, "y": 1800, "sens": 1,
               "actions": [{"t": 0, "pose": "debout", "visage": "inquiet", "vue": 160},
                           {"mot": "voit", "pose": "regarde_haut", "visage": "surprise"},
                           {"mot": "court", "pose": "court", "x": 900, "y": 1500, "duree": 2.6}]}],
  "objets": [{"gen": "animal", "espece": "porc", "x": 760, "y": 1760, "taille": 260, "pose": "broute"}],
  "graphiques": [ … § 5 … ],
  "pause": 0.5, "ambiance": "vent", "bruitages": [{"t": 1.2, "nom": "whoosh"}], "etalonnage": {…}
}
```
**La caméra cadre des PERSONNAGES** : `"cadre": id ou [ids]` + `"plan"` → le moteur calcule x, y, zoom pour que
ces personnages soient dans l'image ET leurs visages au-dessus des sous-titres. Plans : `ensemble` (le lieu, petits
personnages), `large` (en pied), `moyen` (des genoux à la tête), `americain`, `serre` (buste), `visage`. Réglages :
`y_ecran` (hauteur du visage, 760–1000), `x_ecran`, `zoom_k`, `dx`, `dy`, `tremble`. Progression type : `ensemble` ou
`large` pour situer → `moyen` pour l'action → `serre` / `visage` pour l'émotion. La caméra bouge toujours un peu.

**Le corps** : `vue` 0 (de face) · 35 (trois-quarts, défaut) · 90 (profil) · 180 (de dos), `sens` 1 (vers la
droite) / −1. Poses : `debout`, `face`, `profil`, `dos`, `marche`, `court`, `assis` (sur un siège : les pieds au
sol à `y`, le siège derrière), `assis_sol`, `assis_sol_tete`, `assis_sol_jambes`, `pleure_assis`, `a_genoux`,
`accroupi`, `allonge`, `prie`, `prie_genoux`, `prosterne`, `mains_levees`, `bras_ouverts`, `accueille`,
`tend_main`, `tend_main_bas` (vers quelqu'un à terre), `prend_main`, `pointe`, `montre_haut`, `regarde_haut`,
`leve_tete`, `tete_baissee`, `mains_visage`, `bras_croises`, `pense`, `telephone`, `appel`, `lit`, `ecoute`,
`enseigne`, `benit`, `salue`, `peur`, `recule`, `rame`, `porte`, `tombe`, `se_noie`, `enlace` (deux personnages
face à face, à ≈ 65 px × échelle l'un de l'autre : les mains se posent sur le DOS de l'autre et le bras côté caméra
passe par-dessus lui ; `"bras_devant": true` fait de même pour une autre pose). Mises en scène éprouvées (banc
`etreinte`) : A — les deux de trois-quarts (`vue` 62, le fils `"angles": {"cou": 30, "penche": 14}`) ; B — l'un de face
(`vue` 35), l'autre de dos (`vue` 150), un peu devant lui (`y` + 20).
**Le jeu est automatique** (§ 7, bancs `transitions`, `gestes`, `secondaire`, `vie`) : chaque action part de l'état
RÉEL du corps (jamais de saut) ; chaque partie du corps a son retard, son élan contraire et son amorti (le buste
mène, la main arrive en dernier ; `"jeu": 0` mécanique, `1` défaut, `1.5` appuyé) ; se lever, s'asseoir ou
s'agenouiller passe par une pose de passage (penché, le poids sur les pieds ; 1 s par défaut) ; une marche pose son
dernier pas ; cheveux longs, voile, ourlet de robe et manteau suivent le corps avec retard (`"secondaire": false` sur
l'acteur pour l'enlever) ; la marche a son poids (plus bas au contact du pied) ; la respiration se voit et suit le
visage (rapide dans la peur, lente dans la paix) ; clignements irréguliers, et un de plus quand il change de pose ;
**au mot appuyé** par la voix (`*mot*` ou `mots_rouges`), il réagit un instant (tête et épaules qui tombent s'il
souffre, sourcils qui montent sinon ; `"reagit": false` sur l'acteur pour l'empêcher).
**Le regard** : `"regarde": "camera"` (il NOUS regarde : la tête se tourne vers nous — pour le « tu »), `"ciel"`,
`"sol"`, ou l'id d'un personnage du plan (ses yeux et sa tête le cherchent). Sans regard écrit, une pose qui tient
quelque chose à lire le regarde (`telephone`, `lit`).
**Une action sans pose** (un visage, un regard qui change au mot) garde la posture en cours — pose, angles, orientation :
assis, il reste assis. Une action AVEC une pose et sans angles reprend la pose telle quelle (« se lève » : debout).
**Toute autre attitude se règle** : `"angles": {"penche": 10, "torsion": 0, "cou": 20, "tete_cote": 0,
"tete_tourne": 0, "epaule_av": 80, "ecart_av": 14, "coude_av": 10, "paume_av": 90, "main_av": "ouverte",
"hanche_av": 86, "genou_av": 86, "assise": 1, …}` (av = bras/jambe côté caméra, ar = de l'autre côté) ou en
**cibles** pour les mains : `"cible_av": "visage"` (poitrine, coeur, ventre, bouche, visage, front, tete, devant,
haut, oreille, telephone, menton, hanche, dos) ou `[x, y, z]`. Mains : detendue | ouverte | poing | pointe | tient |
jointes | benit | griffe — en style papier, la main est 20 % plus grande, les doigts tendus se détachent (main
ouverte en éventail, index qui pointe, deux doigts qui bénissent) et les doigts pliés forment une moufle.
**Visages** : `neutre`, `doux`, `joie`, `rire`, `triste`, `pleure`, `peur`, `terreur`, `surprise`, `choc`,
`colere`, `inquiet`, `honte`, `determine`, `paix`, `prie`, `yeux_fermes`, `emerveille`, `fatigue`, `soulage`,
`tendre` ; `"regard": [x, y]` ; `"parle": 1` → avec `--voix`, la bouche suit la vraie voix (visèmes Rhubarb,
téléchargé une fois ; sinon bouche procédurale).
Tout ce qui a un `"mot"` est calé sur ce mot (`"mot_n"` pour la 2e occurrence, `"decale"` en secondes).

## 5. Les graphismes : expliquer simplement
| type | quoi | réglages |
|---|---|---|
| `verset` | LA carte de la Parole (serif, mot à mot, référence) ; le monde se floute | `ref`, `texte` (sinon pris dans la Bible), `mot`, `y` |
| `texte` | texte cinétique : chaque mot apparaît QUAND LA VOIX LE DIT (`*mots*` en or) ; remplace les sous-titres ; sur le panneau doré (clair), il passe à l'encre sombre | `texte`, `y`, `taille`, `style: serif`, `synchro: false` (cascade), `fond` (assombrit le monde) |
| `liste` | 2–4 points qui arrivent au mot, avec icônes | `titre`, `items: [{texte, icone, couleur, mot}]`, `y`, `fond` |
| `compare` | deux cartes côte à côte (à l'époque / aujourd'hui) | `gauche: {titre, texte, icone}`, `droite: {…}`, `mot_droite`, `y` |
| `icone` | une icône Lucide qui se dessine (2 400 : `scripts/icones.py`) | `icone`, `position`, `taille`, `couleur`, `texte` |
| `note` | annotation manuscrite + flèche vers ce qu'on montre | `texte`, `cible: [x, y]` (monde), `position` (écran), `taille`, `rotation`, `courbe` |
| `cercle`, `fleche` | entourer / pointer un détail du monde | `cible`, `r`, `texte` |
| `chiffre` | un nombre qui compte (« 2000 ans ») | `valeur`, `de`, `suffixe`, `texte` |
| `lieu`, `titre`, `mot`, `etiquette` | nom du lieu et de l'époque ; titre de fin ; mot-clé ; étiquette | `texte`, `sous`, `t`, `fin` |
| **format lumière** | | |
| `citation` | LA carte de la Parole : nuit, filet d'or, petite lampe ; la citation s'allume mot à mot avec la voix (vérifiée mot pour mot). Sans `entete` : « PAROLE DE JÉSUS » seulement si le plan déclare `"cite": [{"ref": …, "qui": "jesus"}]`, sinon « LA BIBLE DIT » ; un en-tête qui nomme Jésus sans ce « qui » est une ERREUR (on ne met pas dans sa bouche ce que dit le récit) | `ref`, `texte` (sinon pris dans la Bible), `entete` (« PAROLE DE JÉSUS », « IL SE DIT »…), `mot`, `y` |
| `badge` | pastille nuit + filet d'or (« UNE HISTOIRE DE JÉSUS · LUC 15 », « 2 H DU MATIN », « LUC 15:20 ») | `texte`, `position`, `taille`, `fond: clair`, `icone` |
| `bulle` | bulle de parole près de la tête | `sur` (id), `cote`, `contenu: sourire\|gribouillis\|triste\|points\|coeur\|question\|exclamation`, `icone`, `texte` |
| `pensee` | bulle de pensée : une icône ou une petite scène (souvenir, imagination) | `sur`, `icone`, ou `acteur: {id, pose, vue, visage}` |
| `ondes`, `goutte` | l'angoisse, le bruit ; la gêne, la peur | `sur`, `vitesse`, `couleur` ; `cote` |
| `coeur` | le cœur qui bat (vite : peur ; lent : paix ; rouge : amour) | `sur`, `bpm`, `dx`, `dy`, `taille`, `couleur` |
| `traits` | ce qui assaille quelqu'un (bruit, regards, pression) | `sur`, `de: gauche\|droite`, `n`, `vitesse` |
| `telephone` | un téléphone tenu vers nous, le message qui s'écrit | `position`, `taille`, `texte`, `rotation` |
| `fin` | l'écran de fin : la lampe allumée, la phrase, le passage | `ligne`, `texte`, `sous` |
| **enseigner** (`enseigner.js`) | | |
| `carte` | la carte EXACTE de la Palestine du 1er siècle (`assets/geographie/palestine_1er_siecle.json`, coordonnées sourcées ; lieux débattus marqués « ? ») : les lieux s'allument en or quand on les dit, le trajet se dessine, les étiquettes évitent l'eau et se décalent | `cadre: tout\|galilee\|lac\|judee\|samarie\|[lat0,lat1,lon0,lon1]` (`lac` : le lac de Galilée et ses villes), `lieux: ["Nazareth", {nom, mot}]`, `trajet: [lieux]`, `mot_trajet`, `regions`, `titre` — un lieu inconnu est une erreur (avec la liste) |
| `frise` | la frise chronologique : une ligne d'or, chaque date arrive avec la voix, « aujourd'hui » en lumière | `points: [{annee (négatif = av. J.-C.), texte, mot, ici, date}]`, `de`, `a`, `titre` |
| `definition` | un mot expliqué : sa langue d'origine (avec prudence : le sens établi, jamais une étymologie douteuse) | `terme`, `langue`, `original`, `translit`, `sens`, `ref`, `y` |
Les annotations se placent dans les zones libres : dans l'arche à côté des visages, jamais dans la colonne droite
de TikTok (x > 880 entre y 1000 et 1650) ni en bas (y > 1650). Les bulles restent d'elles-mêmes dans l'arche.

## 6. Le contrôle (obligatoire avant le rendu)
1. `verifier_film.py` : zéro ERREUR (citations mot pour mot, paroles de Jésus et en-têtes qui les attribuent,
   personnages / lieux / clés de lieu / générateurs connus, mots présents dans le texte, durée). Alerte si un plan
   de plus de 5,5 s ne bouge pas : ni caméra, ni geste, ni graphisme qui vit avec la voix (carte dont les lieux
   s'allument ou dont le trajet se dessine, frise, liste, texte, comparaison, chiffre).
2. `film.py --apercu` : regarder `planche.png` ET des images pleine taille ; corriger chaque alerte **CADRAGE**. Le
   cadrage est contrôlé sur TOUT le plan (tous les 0,1 s, pas seulement aux images de la planche) et selon la vraie
   forme de l'arche : « personnage coupé au bord du cadre » (à moitié dedans — tout entier dehors, c'est un hors-champ,
   pas une alerte), « tête hors de la fenêtre », « tête coupée par l'arche » (plus de 15 % de la tête), avec
   l'intervalle dans le plan (« de 2,8 s à 3,7 s »). Une sortie voulue : `"hors_champ_ok": true` sur l'acteur. Les
   **sauts** aussi, à chaque image (30 i/s) : une tête, une main ou un pied qui bondit seul d'au moins 30 px
   (« !! SAUT plan 4 · marie : poignet av bondit de 142 px ») — souvent une `"transition"` trop courte.
   La **mise en page** aussi (tous les 0,1 s) : deux graphismes qui se recouvrent (« badge et pensee se recouvrent »),
   un graphisme posé sur un visage (« visage caché par liste »), un grand mot posé sur une tête, cheveux compris (« texte posé
   sur la tête »), un signe qui sort de l'arche, le texte dit qui ne tient pas sous l'arche. Et le
   vérificateur, sans rien dessiner : ce qui flotte (posé sur l'horizon ou au-dessus), les échelles qui ne tiennent
   pas (un animal hors de ×0,5–×2 de sa taille habituelle, un personnage agrandi à la main), les noms inconnus (meuble,
   arbre, animal, matière de sol), les fenêtres, portes et objets accrochés à une hauteur impossible (en cm), l'eau qui ne
   finit pas sur l'horizon, un halo sans lampe, un objet trop grand pour une main.
3. **La grille « œil du réalisateur »** — Claude la passe en REGARDANT TOUTES les images de l'aperçu (pas un échantillon)
   puis des images du MP4 ; il dit ce qu'il a vu et corrigé, ligne par ligne (pas de note qu'il s'attribue à lui-même) :
   | # | Critère | Contrôle automatique qui aide |
   |---|---|---|
   | 1 | Les 2 premières secondes : la situation se comprend, un visage lisible, ça bouge | — |
   | 2 | Chaque phrase est MONTRÉE au moment où elle est dite (une phrase = une image) | mots introuvables (vérificateur) |
   | 3 | Cadrage : visages entiers dans l'arche, l'air au-dessus des têtes | CADRAGE |
   | 4 | Lisible sur un téléphone : personnages assez grands, silhouettes claires, rien ne se recouvre | MISE EN PAGE |
   | 5 | Le jeu : aucun saut, gestes au mot, émotions lisibles, regards dirigés, le moment fort touche | SAUT |
   | 6 | La lumière raconte : l'heure, les ombres, le moment clé qui s'illumine | — |
   | 7 | Le monde est logique : rien ne flotte, échelles, perspective, raccords d'un plan à l'autre | vérificateur |
   | 8 | Enseigner : chaque explication a son visuel juste et exact, aucun texte inutile | carte (lieux vérifiés) |
   | 9 | Le son : voix devant et vivante, musique qui suit l'histoire, −14 LUFS | `son.json` (+ l'écoute d'Alexis) |
   | 10 | Fidélité et porte : la Bible exacte, Jésus digne, une porte simple sans pression | vérificateur (Bible, appâts) |

## 6 bis. La précision (retour d'Alexis du 25/11 : « un taux de précision parfait »)
Aucun défaut de dessin n'est acceptable : un bras derrière le corps, une main dans le vide, un accoudoir décollé, un
voile sur le visage. Les règles sont AUTOMATIQUES dans le moteur, et contrôlées :
- **Meubles** : chaque pièce (accoudoir, dossier, pied, plateau, coussin) est placée dans le repère du meuble avec
  la même perspective que lui, et dessinée du fond vers l'avant — rien ne flotte à côté. Hauteurs réelles à `y_ref`
  (un adulte ≈ 460 px) : canapé ≈ 224 (assise à la moitié), chaise ≈ 237, banc ≈ 118, lit ≈ 170–180, table ≈ 197 ;
  le vérificateur alerte au-delà de ×0,8–×1,25.
- **Assis** : sur un siège (`assis`, `pleure_assis`, ou `"angles": {"assise": 1}`) il faut un siège sous lui
  (meuble, rochers, volume) — sinon le vérificateur alerte (« assis dans le vide ») ; par terre : `assis_sol…`. Un
  bras que le geste ne règle pas pose la main sur la cuisse (paume vers le bas) au lieu de pendre derrière ; la main
  posée et l'avant-bras passent devant la cuisse et la robe ; une personne assise se montre au moins de trois-quarts
  (de face, les cuisses vues en bout faisaient des boules).
- **Bras** : en deux calques — le haut du bras se range par l'épaule et le coude (il ne passe plus devant le menton),
  l'avant-bras et la main par la main ; les membres se mélangent en rotation (pas de bascule d'une image à l'autre).
- **Vêtements** : le pan arrière du manteau tombe à la verticale du bassin et jamais sous le sol (assis : au bord du
  siège ; par terre : pas de pan) ; la bande du manteau s'arrête à la taille quand on est assis ; le voile encadre
  le visage sans le couvrir (ses pans partent de derrière la joue jusqu'aux épaules).
- **Mains jointes** (prière) : elles ne tiennent rien — le téléphone disparaît.
- **Cadrage** : « corps coupé au bord du cadre » quand le CONTOUR DESSINÉ du personnage sort d'un côté alors qu'il y a la
  place de l'autre, ou des deux côtés (bras ouverts) hors gros plan. Un gros plan (tête ≥ 185 px) peut perdre ses épaules.
- **L'atlas** : `vf.py atlas` dessine TOUTES les poses × 3 vues × 3 personnages types, 40 portraits (8 têtes × 5 humeurs),
  tous les meubles et tous les objets → `bancs/atlas/` (21 planches, ≈ 25 s), et les COMPARE à la référence figée
  (`change_*.png` : référence | nouvelle). À regarder en taille réelle après TOUT changement du dessin ; un changement voulu
  et REGARDÉ se fige par `vf.py atlas --figer`. Des contrôles verts ne suffisent pas : un bord dentelé les passait tous.
- **Visage** (traits simples) : nez en coin (vrai profil), oreilles, paupières, joues ; rien ne dépasse du contour du
  visage. **Cheveux** : mèches et raie (plus de bonnet), mèches de côté d'un seul tenant, cachées sous une coiffe.
- **Épaules** : pente du cou (trapèzes), bras détaché du buste par une ombre de contact. **Écharpe du manteau** : un ruban
  enroulé sur le buste (il s'amincit en tournant, finit net à la ceinture). **Robe assise** : cuisses PUIS mollets.
- **De dos**, ce qui est devant la poitrine est caché (l'avant-bras se range par la main).
- **Debout sans geste** : chacun a son attitude, toujours la même (`RIG.ATTITUDES`) — jamais un mannequin.
- **Barque** : dessinée en deux, les passagers entre l'arrière et la coque (`porte_par`).
- **Bulles** : une bulle ne couvre jamais la tête (elle cherche sa place autour, rapetisse, sinon ne s'affiche pas) ; sa queue
  va vers la tête ; personne hors champ = pas de bulle. **Pièce fermée** : pas d'ombre portée de soleil. **Assis** : pas
  d'attitude « debout ».
- **!! DESSIN** : toute erreur de dessin (nombre impossible, générateur qui échoue) est une alerte de l'aperçu.
- **!! LISIBILITÉ** : luminance des visages mesurée sur l'image (minimum 0,14) ; la nuit, les personnages sont moins
  assombris que le décor, gardent leurs couleurs et portent un liseré de lumière (`eclairage.js surPersonnage`).

## 6 ter. Ce que le moteur règle tout seul (26/11 : « je veux LE truc sans erreur »)
Chaque règle ci-dessous est automatique ; le JSON n'a rien à dire de plus.
- **Les mains devant le visage** : un œil (et son sourcil) qu'une main approche se ferme, puis disparaît sous elle ; il
  se rouvre quand la main s'en va. Rien ne dépasse entre les doigts.
- **La robe en mouvement** se tend d'un appui à l'autre (genou levé, talon) : elle ne rentre jamais entre le mollet et
  la hanche ; le genou plié se voit sous le tissu.
- **Les cheveux longs** tiennent contre le crâne (pas d'oreillettes aux tempes) ; une main portée au visage fait remonter
  la mèche jusqu'à l'épaule (sa pointe ne ressort pas sous le coude). **Bouclés** : une lisière régulière de petites
  boucles (front, tempes, nuque), plus grosses vers le sommet, toutes attachées. **Dégarni** : une seule couronne.
- **La capuche baissée**, vue de dos, passe sous la tête et les cheveux.
- **L'ouverture d'une manche** vue de face est un creux dans l'ombre du tissu (jamais un disque gris uni).
- **Le lointain tient à l'horizon** : quand la caméra monte, descend ou s'approche, le ciel, les collines et la mer restent
  posés sur la ligne où finit le sol (la caméra qui descend n'avale plus les collines).
- **La lumière part de sa source** : `"gen": "rayons"` dans une pièce à fenêtre part de la vitre et finit sur sa tache au
  sol ; dehors, du soleil du ciel. Le chemin de lumière sur l'eau (`astre_x`) suit l'astre qu'on voit, et n'existe pas
  sans astre. Un soleil bas sur l'horizon reste chaud.
- **La barque** est coupée net par la ligne d'eau : en tanguant, elle n'en sort jamais ; dessous, l'ombre de la coque.
- **Une flèche de note** part du bord de ce qui est écrit, jamais à travers un mot.
- **Bâtiment** : la porte et son linteau tiennent dans le mur ; aucune jarre devant une porte.
- **Applique** : platine vissée au mur, tige, abat-jour ; pas d'ombre au sol. **Caisse** : lattes, montants cloués, couvercle.
- **Poser sur un meuble** : `"sur": "<id du meuble>"` (et `"fond"` 0 devant → 1 au fond) calcule la hauteur, la taille et
  l'ordre : une coupe ne flotte jamais devant la table. `"z_ordre"` force l'ordre à la main si besoin.
- **Figurants** : un figurant d'une foule que le cadre coupe en deux est retiré (jamais une moitié de personne au bord).
- **Eau et sol** : l'eau reflète le ciel de l'heure, la barque prend la couleur de l'eau à sa place, le sol au bord de
  l'eau devient un rivage (`rivage`).

## 6 quater. L'atelier (`python vf.py interface`, ou double-clic sur « Ouvrir l'atelier »)
Tout l'outil dans le navigateur, sur http://localhost:8765 (rien ne sort de l'ordinateur ; un autre site ne peut ni lire ni
écrire ; deux écritures en même temps ne s'écrasent jamais : on choisit la version à garder).
- **Accueil** : les vidéos en arches ; « Nouvelle vidéo » (avec la phrase à donner à Claude).
- **Texte** : le manuscrit ; chaque mot s'allume quand la voix le dit ; clic sur un mot = cet instant ; double-clic =
  le réécrire ; « + » entre deux plans = un plan de plus (chacun reste où le plan d'avant l'a laissé). Les alertes
  (vérificateur et contrôle des images) se rangent sous leur plan.
- **La scène** : la vidéo qui se joue avec le son ; on prend un personnage ou un objet à la souris ; boucle, vitesse, frise.
- **Colonne de droite** : ce qui est choisi (plan, personnage, objet, signe) ; gestes et visages se choisissent SUR
  DESSIN ; les objets se posent à leur taille réelle (un cadre, une horloge vont au mur).
- **Personnages, Lieux, Bible** : apparence dessinée en direct ; l'heure et ce qu'on trouve dans un lieu ; la Bible
  Segond 1910 (référence ou mots, quelle que soit leur forme), « Mettre dans le plan » cite mot pour mot.
- **Étapes** : Mettre en scène, Vérifier, Voix (toujours confirmée, avec le nombre de caractères), Contrôler, Rendre,
  Publier (MP4 + textes à copier). Une commande à la fois, son journal, un bouton pour l'arrêter.
- Annuler / refaire (Ctrl+Z / Ctrl+Y), enregistrement automatique, versions d'avant ; ce qu'écrit Claude dans
  `video.json` arrive tout seul dans la page, sans jamais refermer une phrase en train de s'écrire ni redessiner un
  bouton sous le doigt.
- Tests : `tests/test_atelier.py` (serveur : chemins, autres sites, conflits, noms, commandes ; voix ; et l'interface
  pilotée dans un vrai navigateur par `scripts/film/test/atelier_e2e.js`).

## 7. Améliorer le moteur sans rien casser
- **Bancs d'essai d'animation** (`scripts/banc.py`, `vf.py banc <nom>`) : un petit cas au format des vidéos (plans
  muets avec `"duree"`) + des `"bandes"` (`titre`, `de`, `a`, `images`, `cadre`) → des bandes d'images successives
  pour VOIR un mouvement, et la détection automatique des **sauts** (le corps qui change d'un coup entre deux
  images successives ; mesurée seulement si les images sont à ≤ 1/20 s — le moteur contrôle aussi chaque plan à
  30 i/s, et ses « !! SAUT » comptent dans le bilan du banc). Cas fournis dans
  `scripts/film/test/bancs/` : `transitions` (fin de marche, pose qui en coupe une autre, se relever),
  `etreinte` (deux personnages, deux mises en scène), `gestes` (mécanique / joué), `secondaire` (sans / avec
  ressort), `vie` (réaction au mot, regards), `assis` (assise : mains au visage → tête levée / prière). Un
  mouvement s'améliore AVANT → APRÈS sur son banc, côte à côte. Les bras et les jambes se mélangent en ROTATION
  (interpolation sphérique) : une main qui descend du visage passe par devant, sans jamais basculer d'un coup.
- **Personnages seuls et générateurs** : `node scripts/film/test/planche.js cas.json out.png`,
  `node scripts/film/test/gen.js lieux.json out.png`.
- **Rendu par plan, avec cache** (`film/rendu.js`) : tout s'anime en temps DU PLAN (un plan ne dépend que de lui, de
  son lieu, de ses personnages, du style, du moteur et du plan voisin s'il s'y fond) ; les limites des plans tombent
  sur des images. Changer le code du moteur invalide tout le cache (c'est voulu).
- **Non-régression** (`scripts/non_regression.py`) : `vf.py reference <vidéo>` fige les images de contrôle
  (`videos/…/reference/`, JPEG 540 × 960, versionnées) ; après chaque changement du moteur, `vf.py comparer
  <vidéo>` refait l'aperçu et liste les images changées + `apercu/comparaison.png` (référence | nouvelle | zones
  changées en rouge). Le moteur est déterministe : sans changement, 0 image changée. Tout changement doit être
  VOULU ; quand il l'est, on refait la référence.

## 8. Le réalisateur automatique (`scripts/realisateur.py`, `vf.py realiser`)
À partir du texte, du registre et du lieu de chaque plan (et des acteurs posés : qui, où), il PROPOSE ce qui manque —
il ne remplace jamais ce qui est écrit : `video.propose.json` (ou `--appliquer` pour compléter le JSON), plus un compte
rendu plan par plan à relire.
- **Gestes au mot** : un lexique de verbes (court, se lève, serre dans ses bras, tend la main, prie, pleure, tombe,
  lève les yeux, accueille, raconte…) → la pose, au mot où elle est dite ; un mouvement (marche, court) dure tout le
  plan ; l'étreinte met les deux personnages dans les bras l'un de l'autre. Un verbe dont le sujet est le vent, la
  mer, les vagues… n'est pas un geste (« le vent tombe » ne fait pas tomber Jésus).
- **Posture qui continue** : d'un plan à l'autre dans le même lieu, chacun garde sa posture entière (pose, angles —
  assis reste assis —, orientation) ; un geste d'un instant (main tendue, doigt pointé, bénédiction) revient à la
  posture au plan suivant ; un geste fait assis se fait assis. Ce qu'on écrit à la main (actions, visage) continue
  aussi pour les plans que le réalisateur complète.
- **Visages** : l'émotion la plus forte nommée dans le texte ; sinon celle que le personnage avait déjà (elle
  continue d'un plan à l'autre) ; une émotion de bascule (décision, surprise) arrive AU MOT et ne se prolonge pas ;
  les retrouvailles se font en larmes ; l'invitation se dit avec douceur ; Jésus jamais comique. Dans le récit, le
  **danger** (tempête, vagues, « nous périssons »…) fait peur à tous sauf à Jésus, calme ; l'**apaisement** raconté
  (calme, silence, le vent tombe — hors des citations : « Silence ! » dit n'est pas encore le calme) soulage ceux qui
  avaient peur. « Ta tempête » au présent est une image, pas un danger.
- **Sujet** : le personnage nommé hors des citations (« … » et “ … ”, retirées AVANT d'ôter les accents), sinon
  « il / elle » = celui du plan précédent.
- **Cadrage** (situer → agir → émouvoir) : le **1er plan** accroche sur un visage lisible (américain → serré) ; large
  quand le corps bouge ou change de hauteur, quand il y a des choses à voir (objets — une simple lumière ne compte
  pas) ou à annoter, quand deux personnes se touchent (puis on approche) ; moyen pour une carte de citation ou une
  bulle de pensée ; « ensemble » (personnages petits, en bas) sous une liste, une comparaison ou un grand texte ;
  serré pour une émotion forte ou une phrase-choc très courte ; à l'invitation, on va vers le visage (moyen → serré,
  une prière n'a pas besoin du large) ; la caméra pousse un peu, et coupe au geste dans un plan long.
- **Variété** : jamais deux fois de suite la même image dans un lieu (celui qui agit → celui qui écoute → on s'éloigne) ; une
  citation montre celui qui la dit (lu dans l'en-tête) ; personne n'est cadré seul si un voisin serait coupé en deux. Le
  vérificateur alerte à trois fois la même image.
- **Groupe** : tous ceux qui sont à moins de 420 px du sujet entrent dans le cadre avec lui (jamais un voisin coupé
  en deux au bord de l'arche).
- **Regards** : à deux, ils se regardent ; à l'invitation, il nous regarde (`"camera"`).
- **Signes** (un par plan, sur le personnage principal, jamais en double d'une carte) : pensée (« tu te dis », « se
  dit »…, avec une icône), ondes (angoisse), goutte (honte), cœur (amour).
- **Transitions** : fondu quand on change de monde (aujourd'hui ↔ récit) ou quand le temps passe (« puis », « un jour »).
Mesuré sur l'exemple (mise en scène effacée puis refaite, comparée à celle écrite à la main) : `--evaluer` → caméra
80 %, visages 81 %, gestes 92 % (85 % avant la règle d'accroche : l'exemple ouvrait en large, la grille demande un
visage dès la 1re image — écart voulu) ; aucune alerte de cadrage ni de saut à l'aperçu.

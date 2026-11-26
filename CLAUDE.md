# Projet « Faire connaître Dieu » — vidéos TikTok animées

Ce dépôt produit les vidéos de la chaîne d'Alexis, dont le SEUL but est de faire connaître Dieu : on raconte un
passage de la Bible, on l'explique simplement, on montre comment l'appliquer aujourd'hui (format `recit`, 60–100 s).
**Tout le savoir-faire est dans le skill `videos-foi`** (`.claude/skills/videos-foi/`, chargé automatiquement) :
lis son `SKILL.md` et ses références avant toute vidéo ; elles priment sur ce fichier pour le contenu.

## Ce qui ne se négocie jamais
- **La Bible** : Louis Segond 1910 intégrée ; chaque « … » vérifié mot pour mot (`vf.py verifier`) ; aucune parole
  de Jésus inventée ; « » réservé à la Bible (les autres citations entre “ ”).
- **Dieu le Père jamais représenté** (visage, corps) ; Jésus toujours digne.
- **Aucun appât** : pas d'« abonne-toi », pas d'argent, pas de peur ; une porte ouverte simple à la fin.
- **Aucune banque** : personnages décrits et lieux composés pour CHAQUE script (générateurs du moteur).
- **Notre identité visuelle** (format « lumière » : arche dorée, nuit, le mot dit qui s'allume en or) : on s'inspire
  de la précision et de la narration des meilleures vidéos, on ne copie jamais un style ou un texte.

## Les commandes (toujours via `vf.py`, depuis la racine)
```bash
python vf.py docteur                    # tout est installé ?
python vf.py nouvelle v04               # videos/v04/video.json de départ
python vf.py realiser videos/v04        # le réalisateur propose la mise en scène (video.propose.json ; --appliquer pour compléter le JSON)
python vf.py verifier videos/v04        # zéro ERREUR avant tout aperçu
python vf.py interface                  # L'ATELIER (http://localhost:8765) : texte, scène, gestes, voix, contrôle, rendu, publier
python vf.py studio videos/v04          # l'atelier, ouvert sur cette vidéo (ou double-clic sur « Ouvrir l'atelier »)
python vf.py apercu videos/v04 [3,5]    # planche d'images → videos/v04/apercu/planche.png (la regarder avec Read)
python vf.py voix videos/v04 [--plan 7] # ElevenLabs, un mp3 par plan, ne régénère que ce qui a changé
python vf.py rendu videos/v04           # le MP4 (voix calée, lèvres, musique, transitions) → videos/v04/rendu/
python vf.py livrables videos/v04       # description, hashtags, commentaire à épingler, ligne de journal (bloc "livrables")
python vf.py tout videos/v04            # vérifier → voix → aperçu + contrôles → rendu → livrables (s'arrête au 1er souci)
python vf.py empaqueter                 # dist/videos-foi.skill pour claude.ai
python vf.py banc etreinte              # banc d'essai d'animation → bancs/etreinte.png (+ sauts détectés)
python vf.py atlas [--figer]            # l'atlas de précision, comparé à sa référence → bancs/atlas/ (--figer après l'avoir REGARDÉ)
python vf.py tests                      # les tests du moteur (chaque défaut connu a son témoin)
python vf.py reference videos/exemple-trop-loin   # fige les images de contrôle (non-régression)
python vf.py comparer videos/exemple-trop-loin    # ce qui a changé depuis la référence → apercu/comparaison.png
```
Le rendu passe par la carte graphique et garde chaque plan en cache (`rendu/.plans/`) : 92 s de vidéo en ≈ 2 min 30 la
1re fois, ≈ 25 s après la retouche d'un plan, ≈ 15 s si rien n'a changé (mesuré le 24/11 sur le PC d'Alexis).
`AUDIT.md` (racine) = l'état des lieux du moteur et le plan en phases, avec l'avancement.

## Faire une vidéo (le cycle)
1. Idée → 6 lignes → script plan par plan (`references/ecriture.md`, rythme « qui enseigne »).
2. `video.json` : personnages, lieux, plans avec leurs acteurs (`references/moteur-film.md`) → `vf.py realiser` propose
   caméra, gestes, visages, regards, signes et transitions → Claude RELIT et corrige → `vf.py verifier` jusqu'à zéro erreur.
3. L'atelier ouvert en permanence (Alexis y retouche à la souris, ce que Claude écrit y arrive tout seul) ; `vf.py apercu`
   pour regarder TOUTES les images avec Read.
4. `vf.py voix` (ou Alexis génère la voix lui-même) → réécouter → `--plan N` pour une phrase ratée.
5. `vf.py rendu` → vérifier des images du MP4 final (ffmpeg -ss) → livrer : MP4, description, hashtags, commentaire
   à épingler, ligne de journal (`SKILL.md` § 7).

## Améliorer le moteur (règle permanente)
Chaque retour d'Alexis s'applique **en général, pour toutes les vidéos** : on nomme la règle, on la rend automatique
dans le moteur (`scripts/film/web/*.js`, `scripts/*.py`), on l'ajoute au vérificateur si elle peut se contrôler, on
l'écrit dans la référence du domaine, on ajoute une ligne aux leçons de `charte.md`. Puis :
- l'atlas de précision (`vf.py atlas`, à regarder en taille réelle après tout changement du dessin) ;
- banc d'essai AVANT → APRÈS (`vf.py banc <nom>`, cas dans `scripts/film/test/bancs/` ; personnages seuls et
  générateurs : `node planche.js cas.json out.png`, `node gen.js lieux.json out.png` dans `scripts/film/test/`) ;
- non-régression : `vf.py verifier` + `vf.py comparer videos/exemple-trop-loin` (chaque image changée doit être
  voulue ; si oui, `vf.py reference` pour refaire la référence) ;
- `vf.py empaqueter` pour mettre à jour le skill sur claude.ai.
Code : noms en français cohérents avec l'existant, petit et réutilisable (pas de copier-coller), aucune dépendance
lourde sans raison ; tout ce qui se dessine reste paramétré (jamais d'image toute faite).

## Git
Alexis fait ses commits et ses push lui-même : prépare les `git add` et propose un message de commit court en
français (« moteur : la robe ne s'ouvre plus en voile à la course »). Jamais de `.env`, de voix ni de rendus dans git.

## Repères
- `charte.md` (racine) = la charte VIVANTE : DA, voix, leçons apprises ; `vf.py empaqueter` la recopie dans le skill.
- Clé ElevenLabs : `.env` (modèle `.env.exemple`). Voix « Guillaume – Narrator », bien vivante (charte).
- Musique : composée pour chaque vidéo (vrai piano FluidSynth + SoundFont MuseScore General si installés, sinon
  synthèse) ou `--musique fichier.mp3` choisi par Alexis. Aucune ambiance, aucun bruitage.

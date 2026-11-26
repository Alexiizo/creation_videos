# Auditer une vidéo, lire les statistiques, puis améliorer le skill

**Règle d'Alexis (permanente) : chaque vidéo, chaque statistique, chaque remarque entraîne le skill EN GÉNÉRAL,
pour toutes les vidéos à venir** — jamais une rustine pour une seule vidéo. On audite, on corrige le skill, on
livre le `.skill` mis à jour.

## 1. Mesurer
```bash
python3 scripts/audit.py video.mp4 --sortie audit
```
Regarder soi-même (Read) `audit/debut.png` (les 3 premières secondes) et chaque `audit/planche_N.png` ; extraire
en grand les moments douteux (`ffmpeg -ss T -i video.mp4 -frames:v 1 -vf scale=540:960 x.png`) : l'accroche, la
rencontre, la carte de la parole de Jésus, le tournant, le pont, la fin.

## 2. Ce qui compte (dans l'ordre)
**Les vies touchées** — c'est LA mesure de la chaîne (`mission.md`) :
- commentaires de foi : « je veux le connaître », « prie pour moi », « j'ai prié », « c'est moi en ce moment »,
  questions sincères ; partages et enregistrements (gens qui gardent la vidéo pour la revoir) ;
- les répondre tous (Alexis), et relever les blessures qui reviennent : ce sont les prochains sujets.
**L'attention** — parce que quelqu'un qui part à 2 s n'entend pas l'Évangile :
- rétention à 2 s (accroche), durée moyenne, % jusqu'au bout, la seconde où la courbe tombe et ce qu'il y a à
  l'écran à ce moment-là.
Ne jamais tirer de leçon des abonnés ou des vues seules. 200 vues qui produisent 3 demandes de prière valent plus
que 20 000 vues sans un mot.

## 3. Grille d'audit (par ordre d'impact)
1. **Les 3 premières secondes** (`accroche.md`) : la situation du spectateur en ≤ 12 mots, voix dès 0,0 s,
   image qui bouge, personnage au centre, rien d'autre à l'écran.
2. **Fidélité** : chaque citation est exacte (Segond 1910), rien n'est inventé, Jésus est digne et doux, Dieu le
   Père n'a ni visage ni corps.
3. **Clarté** : quelqu'un qui n'a jamais ouvert une Bible comprend tout (mots, contexte, qui est qui).
4. **Une phrase = une image** : chaque chose dite est montrée à son mot ; un plan toutes les 2,5–4 s ; pas d'image
   figée > 2 s hors respiration voulue.
5. **Lisibilité** : personnages assez grands (plein pied au minimum pour l'action), visages lisibles, rien sous
   l'interface TikTok ni sous les sous-titres, nuit lisible (une source de lumière).
6. **Le récit et l'explication** : la parole de Jésus a de l'air, sa carte, son geste montré ; l'idée est une seule, claire.
7. **Le pont et la porte** : le verset répond à la blessure ; l'invitation est simple, concrète, sans pression.
8. **Son** : voix devant, nappe douce ≥ 14 dB dessous, −14 LUFS, aucun bruitage agressif.
9. **Beauté** : lumière, couleurs, décors cohérents et détaillés, rien qui flotte, aucune forme vague.

## 4. Rendre le verdict à Alexis
Court : ce qui marche (2–5 points), ce qui ne va pas classé par impact avec les secondes exactes, ce qui sera
corrigé dans le skill.

## 5. Améliorer le skill (toujours, sans attendre qu'il le redemande)
Pour chaque défaut :
1. **Nommer la règle générale** derrière le cas (« la barque flottait au-dessus de l'eau » → « tout ce qui est sur
   l'eau EST dans l'eau, partout »). Si elle ne vaut que pour une vidéo, ce n'est pas encore la bonne.
2. **La rendre automatique dans le moteur** (`scripts/film/web/`, `scripts/film.py`) pour tous les lieux, objets, personnages concernés.
3. **L'ajouter au vérificateur** quand elle peut être contrôlée (`scripts/verifier_film.py` : erreur ou alerte ; contrôle CADRAGE de `film.js`).
4. **L'écrire** dans la référence du domaine (`ecriture.md`, `bible.md`, `formats.md`, `accroche.md`,
   `moteur-film.md`, la charte).
5. **Vérifier sur l'exemple** (`verifier_film.py` + `film.py --apercu` sur `assets/exemple-film/film.json` ; dans
   le kit : `vf.py comparer videos/exemple-trop-loin`, chaque image changée doit être voulue) ; une ligne au
   tableau des leçons de la charte.
6. **Livrer** le `.skill` mis à jour (SKILL.md § 9).

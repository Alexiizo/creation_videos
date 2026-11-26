# Démarrer (15 minutes, une seule fois)

## 1. Installer
- **Mac / Linux** : ouvre un terminal dans ce dossier, puis `./installer.sh`
- **Windows** : clic droit sur `installer.ps1` → « Exécuter avec PowerShell »
  (ou `powershell -ExecutionPolicy Bypass -File installer.ps1`). Si l'installateur vient d'installer Node,
  Python ou ffmpeg, ferme PowerShell, rouvre-le et relance-le une fois.

L'installateur met en place : ffmpeg, Node, Python (numpy, scipy, pillow), le moteur de rendu (Playwright +
Chromium), le vrai piano (FluidSynth + la SoundFont libre MuseScore General), la charte du projet, ton `.env`, et
un dépôt git. À la fin il lance `python vf.py docteur` : tout doit être ✓ (les « · » sont optionnels).

## 2. Ta clé ElevenLabs (pour la voix automatique)
1. elevenlabs.io → ton profil → **API Keys** → crée une clé.
2. Ouvre `.env` et remplace `ta_cle_ici` par ta clé. **Ne la partage jamais, ne la commite jamais** (déjà dans
   `.gitignore`).
3. Dans ElevenLabs, ajoute « Guillaume – Narrator » à **Mes voix** (Voice Library → Add to my voices).

## 3. Lancer Claude Code
```bash
claude
```
Claude Code lit `CLAUDE.md` et charge le skill `videos-foi` tout seul. Essaie :
- « Fais une nouvelle vidéo sur … » → il écrit le script, le fait vérifier ; elle apparaît dans l'atelier.
- Pendant que l'atelier est ouvert : « plan 7, le père est trop petit et la lumière trop froide » → il corrige,
  la page se met à jour toute seule.
- « Génère la voix » → un mp3 par plan ; « refais la voix du plan 12, plus doux » → une seule phrase.
- « Fais le rendu » → `videos/<nom>/rendu/video.mp4`.

## 4. L'atelier (tout l'outil, à la souris)
Double-clic sur **« Ouvrir l'atelier »** (ou `python vf.py interface`) : il s'ouvre dans ton navigateur.
- Choisis une vidéo. À gauche le **texte** (chaque mot s'allume quand la voix le dit ; double-clic pour réécrire,
  « + » pour ajouter un plan), au milieu la **scène** (Espace pour lire ; prends un personnage à la souris pour le
  déplacer), à droite **ce que tu as choisi** (gestes et visages se choisissent sur dessin).
- Onglets **Personnages**, **Lieux**, **Bible** (cherche une référence ou des mots, « Mettre dans le plan »).
- En haut, les **étapes** : Mettre en scène, Vérifier, Voix (te demande toujours avant de dépenser des crédits),
  Contrôler, Rendre, Publier (la vidéo et les textes à copier pour TikTok).
- Tout s'enregistre tout seul ; Ctrl+Z annule ; l'horloge en haut à droite ramène une version d'avant.
- Si tu modifies pendant que Claude modifie aussi, l'atelier te demande laquelle garder : rien n'est écrasé.

## 5. Les commandes à la main (si tu veux)
| Commande | Ce que ça fait |
|---|---|
| `python vf.py interface` | l'atelier (le même qu'au double-clic) |
| `python vf.py apercu videos/exemple-trop-loin` | une planche d'images de contrôle |
| `python vf.py voix videos/v04 --plan 7` | régénère la voix d'un seul plan |
| `python vf.py rendu videos/v04 --musique ma_musique.mp3` | rendu avec une musique choisie |
| `python vf.py empaqueter` | `dist/videos-foi.skill`, à importer dans claude.ai pour garder le skill à jour là-bas aussi |

## 6. Mettre le projet sur GitHub (conseillé)
Crée un dépôt **privé**, puis `git remote add origin …` et pousse. Le `.gitignore` exclut déjà la clé, les voix et
les rendus. Tu gardes l'historique de chaque amélioration du moteur.

## En cas de souci
- `python vf.py docteur` dit ce qui manque.
- Windows : si `python` n'est pas reconnu, essaie `py vf.py …`.
- Pas de FluidSynth ? La musique utilise le piano de synthèse : tout marche quand même.
- Pas de clé ElevenLabs ? Génère la voix sur le site avec `videos/<nom>/video_voix_elevenlabs.txt` (écrit par
  `vf.py verifier`), pose le fichier en `videos/<nom>/voix.mp3`, puis `vf.py rendu`.

#!/usr/bin/env bash
# Installation du projet (macOS / Linux) — une seule fois. Relançable sans risque.
set -e
cd "$(dirname "$0")"
SKILL=".claude/skills/videos-foi"
echo "== 1/5 Outils système"
if [[ "$OSTYPE" == darwin* ]]; then
  command -v brew >/dev/null || { echo "Installe Homebrew d'abord : https://brew.sh"; exit 1; }
  brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
  command -v node >/dev/null || brew install node
  brew list fluid-synth >/dev/null 2>&1 || brew install fluid-synth || echo "(FluidSynth optionnel : piano de synthèse à la place)"
else
  sudo apt-get update -y && sudo apt-get install -y ffmpeg nodejs npm python3-pip fluidsynth || true
fi
echo "== 2/5 Python (numpy, scipy, pillow)"
python3 -m pip install --user --quiet numpy scipy pillow 2>/dev/null || python3 -m pip install --user --break-system-packages --quiet numpy scipy pillow
echo "== 3/5 Moteur de rendu (Playwright + Chromium, version fixée par package.json)"
cd "$SKILL/scripts/film"
npm install --silent
npx playwright install chromium
cd - >/dev/null
echo "== 4/5 Vrai piano : SoundFont MuseScore General (MIT, 36 Mo)"
mkdir -p "$HOME/.cache/videos-foi"
SF="$HOME/.cache/videos-foi/MuseScore_General.sf3"
[ -f "$SF" ] || curl -L --fail -o "$SF" https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3 || echo "(SoundFont non téléchargée : piano de synthèse à la place)"
echo "== 5/5 Réglages"
[ -f charte.md ] || cp "$SKILL/assets/charte.md" charte.md
[ -f .env ] || cp .env.exemple .env
[ -d .git ] || git init -q
python3 vf.py docteur
echo
echo "Fini. Mets ta clé ElevenLabs dans .env, puis lance : claude"

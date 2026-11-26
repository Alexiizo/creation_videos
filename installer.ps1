# Installation du projet (Windows, PowerShell) — une seule fois. Relançable sans risque.
# Clic droit > Exécuter avec PowerShell, ou :  powershell -ExecutionPolicy Bypass -File installer.ps1
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$SKILL = ".claude\skills\videos-foi"
Write-Host "== 1/5 Outils système (winget)"
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements }
# ce que winget vient d'installer n'est dans le PATH que des NOUVEAUX terminaux : on le recharge pour la suite du script
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
Write-Host "== 2/5 Python (numpy, scipy, pillow)"
python -m pip install --quiet numpy scipy pillow
Write-Host "== 3/5 Moteur de rendu (Playwright + Chromium, version fixée par package.json)"
Push-Location "$SKILL\scripts\film"
npm install --silent
npx playwright install chromium
Pop-Location
Write-Host "== 4/5 Vrai piano (optionnel) : FluidSynth + SoundFont MuseScore General (MIT)"
$cache = "$env:USERPROFILE\.cache\videos-foi"
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$sf = "$cache\MuseScore_General.sf3"
if (-not (Test-Path $sf)) { try { Invoke-WebRequest -Uri "https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3" -OutFile $sf } catch { Write-Host "(SoundFont non téléchargée)" } }
if (-not (Get-Command fluidsynth -ErrorAction SilentlyContinue)) { Write-Host "   FluidSynth : télécharge le zip Windows sur https://github.com/FluidSynth/fluidsynth/releases, dézippe-le et ajoute son dossier bin au PATH (sinon : piano de synthèse, ça marche quand même)." }
Write-Host "== 5/5 Réglages"
if (-not (Test-Path charte.md)) { Copy-Item "$SKILL\assets\charte.md" charte.md }
if (-not (Test-Path .env)) { Copy-Item .env.exemple .env }
if (-not (Test-Path .git)) { git init -q }
python vf.py docteur
Write-Host ""
Write-Host "Fini. Mets ta clé ElevenLabs dans .env, puis lance : claude"

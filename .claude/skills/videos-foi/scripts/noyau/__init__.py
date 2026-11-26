"""Noyau sans dessin : Bible, mots, durées, son."""
import json
import sys

# Sous Windows, une sortie redirigée (Claude Code, un pipe) est en cp1252 : « ✓ », « ≈ », « → » y font planter print().
# Tous les scripts du skill importent le noyau : la console passe en UTF-8 une fois pour toutes, ligne par ligne (sinon,
# redirigée, la sortie d'un script et celle des programmes qu'il lance arrivent dans le désordre).
for _flux in (sys.stdout, sys.stderr):
    if hasattr(_flux, "reconfigure"):
        _flux.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)


def lire_json(chemin):
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)

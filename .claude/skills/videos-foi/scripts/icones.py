#!/usr/bin/env python3
"""Chercher une icône Lucide (2 400 icônes, licence ISC) par mot-clé anglais : python3 scripts/icones.py heart
Les noms trouvés s'utilisent dans les graphiques : {"type": "icone", "icone": "heart"} (voir references/moteur-film.md)."""
import json
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(ICI, "..", "assets", "icones")
noms = json.load(open(os.path.join(A, "lucide.json"), encoding="utf-8"))
tags = json.load(open(os.path.join(A, "tags.json"), encoding="utf-8"))
mots = [m.lower() for m in sys.argv[1:]]
if not mots:
    sys.exit(__doc__)
res = []
for n in noms:
    t = n + " " + tags.get(n, "")
    score = sum(3 if m in n.split("-") else (2 if m in n else (1 if m in t else 0)) for m in mots)
    if score:
        res.append((-score, n))
for _, n in sorted(res)[:30]:
    print(n, "—", tags.get(n, "")[:80])

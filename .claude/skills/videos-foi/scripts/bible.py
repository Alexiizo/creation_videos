"""La Bible (Louis Segond 1910) en ligne de commande — voir noyau/bible.py.

    python3 scripts/bible.py "Jean 3:16"              → le texte du verset
    python3 scripts/bible.py "Matthieu 14:22-33"      → un passage (un verset par ligne)
    python3 scripts/bible.py --chercher "marcher sur les eaux"
    python3 scripts/bible.py --verifier "Jean 3:16" "Car Dieu a tant aimé le monde…"
    python3 scripts/bible.py --jesus "Matthieu 14:22-33"  → les paroles de Jésus du passage
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from noyau.bible import chercher, joli, paroles_jesus, texte, verifier  # noqa: E402

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__)
    elif a[0] == "--chercher":
        for r in chercher(" ".join(a[1:]), 25):
            print(f"{r} — {texte(r)}")
    elif a[0] == "--verifier":
        ok, msg = verifier(a[1], " ".join(a[2:]))
        print("✅ mot pour mot" if ok else "❌ " + msg)
    elif a[0] == "--jesus":
        for s_ in paroles_jesus(a[1]):
            print("«", s_, "»")
    else:
        print(joli(a[0]))
        print(texte(a[0], numeros=True))

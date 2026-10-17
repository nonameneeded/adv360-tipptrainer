"""Erzeugt js/woerter.js aus einer Wortliste der Leipzig Corpora Collection.

Aufruf:
    python3 tools/import_leipzig.py <...-words.txt> [Anzahl]

Die Datei <korpus>-words.txt liegt im Download-Archiv (wortschatz.uni-leipzig.de/de/download),
Format pro Zeile: ID <Tab> Wort <Tab> Häufigkeit. Übernommen werden die häufigsten Wörter,
die nur aus deutschen Buchstaben bestehen und höchstens am Anfang groß geschrieben sind
(keine Abkürzungen wie EU oder CDU). Von „Das“/„das“ bleibt eine Schreibung (klein, außer bei Nomen).
Eigennamen (Personen, Firmen, Orte) aus tools/eigennamen.txt werden übersprungen.
"""
import json
import os
import re
import sys

QUELLE = sys.argv[1]
ANZAHL = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
KORPUS = os.path.basename(QUELLE).replace("-words.txt", "")
OUT = os.path.join(os.path.dirname(__file__), "..", "js", "woerter.js")
WORT = re.compile(r"^[A-ZÄÖÜa-zäöüß][a-zäöüß]+$")
with open(os.path.join(os.path.dirname(__file__), "eigennamen.txt"), encoding="utf-8") as f:
    EIGENNAMEN = {w for zeile in f for w in zeile.split("#")[0].split()}

eintraege = []
with open(QUELLE, encoding="utf-8") as f:
    for zeile in f:
        teile = zeile.rstrip("\n").split("\t")
        if len(teile) == 3 and WORT.match(teile[1]):
            eintraege.append((int(teile[2]), teile[1]))
# „Das“ (Satzanfang) und „das“ sind dasselbe Wort. Die kleine Schreibung gewinnt, wenn sie
# nennenswert vorkommt (≥ 10 % der großen); Nomen wie „Haus“ bleiben groß.
haeufig = {}
for n, w in eintraege:
    haeufig[w] = haeufig.get(w, 0) + n
gruppen = {}
for w, n in haeufig.items():
    gruppen.setdefault(w.lower(), {})[w] = n
woerter = []
for formen in gruppen.values():
    klein = next((w for w in formen if w.islower()), None)
    gross = max((w for w in formen if not w.islower()), key=formen.get, default=None)
    if klein and (not gross or formen[klein] >= 0.1 * formen[gross]):
        wahl = klein
    else:
        wahl = gross
    if wahl not in EIGENNAMEN:
        woerter.append((sum(formen.values()), wahl))
woerter.sort(key=lambda e: -e[0])
woerter = [w for _, w in woerter[:ANZAHL]]

with open(OUT, "w", encoding="utf-8") as f:
    f.write(f"""// Die {len(woerter)} häufigsten Wörter aus dem Korpus {KORPUS}, nach Häufigkeit sortiert.
// Quelle: Leipzig Corpora Collection, Wortschatz-Projekt der Universität Leipzig,
//         https://wortschatz.uni-leipzig.de
// Lizenz dieser Datei: CC BY-NC, siehe https://wortschatz.uni-leipzig.de/de/usage
// Zitat:  D. Goldhahn, T. Eckart, U. Quasthoff: Building Large Monolingual Dictionaries at the
//         Leipzig Corpora Collection: From 100 to 200 Languages. LREC 2012.
// Erzeugt mit tools/import_leipzig.py (nur Wörter aus deutschen Buchstaben, keine Abkürzungen,
// ohne die Eigennamen aus tools/eigennamen.txt).
window.WOERTER = {json.dumps(woerter, ensure_ascii=False)};
""")
print(f"{len(woerter)} Wörter geschrieben, die ersten: {' '.join(woerter[:30])}")
print(f"die letzten: {' '.join(woerter[-15:])}")

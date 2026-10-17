# Adv360 Tipptrainer

Ein kleiner Tipptrainer für das **Kinesis Advantage 360 Pro** mit meiner eigenen ZMK-Belegung –
wahlweise **QWERTZ** oder **Bone**. Die Bildschirmtastatur zeigt die echte Form des Adv360
(geteilte Hälften, Daumenblöcke) und markiert für jedes Zeichen die Taste, den Finger und ob
Shift oder eine Symbol-Taste (Macro2/Macro4) gehalten werden muss.

Die Belegung stammt direkt aus der Keymap im Repo
[Adv360-Pro-ZMK](https://github.com/nonameneeded/Adv360-Pro-ZMK) (Branch `deutsch`,
Ebenen Basis, Bone und Symbol).

## Benutzen

`index.html` im Browser öffnen – fertig. Es gibt keinen Server und keinen Build-Schritt; der
Fortschritt wird nur lokal im Browser gespeichert (`localStorage`).

- **Layout**: QWERTZ oder Bone. Die Tastatur muss im selben Modus sein (Bone: Mod + B),
  das Betriebssystem bleibt auf Deutsch (QWERTZ).
- **Lernen**: Start mit sechs häufigen Buchstaben (e n i s r a). Sobald alle freigeschalteten
  Buchstaben das Ziel-Tempo erreichen und weniger als 7 % Fehler haben, kommt der nächste dazu.
  Die Übungswörter enthalten nur freigeschaltete Buchstaben; der schwächste Buchstabe
  (gelb umrandet) kommt öfter vor.
- **Schwächen**: übt gezielt die Zeichen, die du am häufigsten verwechselst.
- **Auswertung** (oben rechts): Tabelle, was du womit vertippst und warum vermutlich – alter
  Griff aus dem anderen Layout, Nachbartaste oder Sonstiges. Neuere Fehler zählen stärker.
- **Falscher Modus**: Tippst du mehrmals genau das, was die Taste im anderen Layout ergibt,
  warnt der Trainer, dass die Tastatur im falschen Modus ist; diese Anschläge zählen nicht.
- **Sätze**: kurze Sätze mit Groß-/Kleinschreibung und Satzzeichen.
- **Symbole**: code-artige Schnipsel für die Symbol-Ebene (`( ) { } [ ] = & | …`).
- **Test 1 min**: eine Minute häufige Wörter, Ergebnis in Anschlägen pro Minute.
- **Esc** startet die aktuelle Zeile neu. Ein falscher Anschlag muss korrigiert werden,
  indem man das richtige Zeichen tippt (keine Rücktaste nötig).

In den Einstellungen lassen sich Groß-/Kleinschreibung und Satzzeichen fürs Lernen, die
Bildschirmtastatur und das Ziel-Tempo (Standard 150 Anschläge/min) einstellen.

## Belegung aktualisieren

Nach einer Änderung an der Keymap, mit dem Pfad zu einem lokalen Klon des Keymap-Repos:

```shell
python3 tools/export_layouts.py ../Adv360-Pro-ZMK
```

Das Skript liest `config/adv360.keymap` und die Tastenpositionen aus
`config/boards/arm/adv360/adv360-layouts.dtsi` und schreibt `js/layouts.js`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `css/style.css` | Oberfläche (hell/dunkel nach Systemeinstellung) |
| `js/app.js` | Übungslogik, Statistik, Bildschirmtastatur |
| `js/layouts.js` | erzeugt: Tasten, Finger und Wege zu jedem Zeichen |
| `js/woerter.js` | die 10 000 häufigsten deutschen Wörter (Leipzig Corpora Collection, siehe Lizenz) |
| `js/uebungen.js` | Sätze und Symbol-Schnipsel |
| `tools/export_layouts.py` | Export aus der ZMK-Keymap |
| `tools/import_leipzig.py` | erzeugt `js/woerter.js` aus einer Leipziger Wortliste |

Die Idee – Wörter statt Buchstabensalat, neue Buchstaben erst bei sicherem Tempo – ist
angelehnt an Trainer wie typista.de und keybr.com.

## Lizenz

Der Code steht unter der [MIT-Lizenz](LICENSE).

**Lizenz der Daten:** Die Wortliste `js/woerter.js` stammt aus der
[Leipzig Corpora Collection](https://wortschatz.uni-leipzig.de) des Wortschatz-Projekts der
Universität Leipzig (Korpus `deu_mixed-typical_2011_1M`) und steht unter
**CC BY-NC** ([Nutzungsbedingungen](https://wortschatz.uni-leipzig.de/de/usage)): nur nicht
kommerzielle Nutzung, mit Namensnennung. Zitat:

> D. Goldhahn, T. Eckart, U. Quasthoff: *Building Large Monolingual Dictionaries at the Leipzig
> Corpora Collection: From 100 to 200 Languages.* Proceedings of LREC 2012.

Neu erzeugen (Wortdatei aus dem Download-Archiv):

```shell
python3 tools/import_leipzig.py deu_mixed-typical_2011_1M-words.txt 10000
```

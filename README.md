# Adv360 Tipptrainer

Ein kleiner Tipptrainer für das **Kinesis Advantage 360 Pro** mit meiner eigenen ZMK-Belegung –
wahlweise **QWERTZ** oder **Bone**. Die Bildschirmtastatur zeigt die echte Form des Adv360
(geteilte Hälften, Daumenblöcke) und markiert für jedes Zeichen die Taste, den Finger und ob
Shift oder eine Symbol-Taste (Macro2/Macro4) gehalten werden muss.

Die Belegung stammt direkt aus der Keymap im Repo
[`adv360-neu`](../adv360-neu) (Ebenen Basis, Bone und Symbol).

## Benutzen

`index.html` im Browser öffnen – fertig. Es gibt keinen Server und keinen Build-Schritt; der
Fortschritt wird nur lokal im Browser gespeichert (`localStorage`).

- **Layout**: QWERTZ oder Bone. Die Tastatur muss im selben Modus sein (Bone: Mod + B),
  das Betriebssystem bleibt auf Deutsch (QWERTZ).
- **Lernen**: Start mit sechs häufigen Buchstaben (e n i s r a). Sobald alle freigeschalteten
  Buchstaben das Ziel-Tempo erreichen und weniger als 7 % Fehler haben, kommt der nächste dazu.
  Die Übungswörter enthalten nur freigeschaltete Buchstaben; der schwächste Buchstabe
  (gelb umrandet) kommt öfter vor.
- **Sätze**: kurze Sätze mit Groß-/Kleinschreibung und Satzzeichen.
- **Symbole**: code-artige Schnipsel für die Symbol-Ebene (`( ) { } [ ] = & | …`).
- **Test 1 min**: eine Minute häufige Wörter, Ergebnis in Anschlägen pro Minute.
- **Esc** startet die aktuelle Zeile neu. Ein falscher Anschlag muss korrigiert werden,
  indem man das richtige Zeichen tippt (keine Rücktaste nötig).

In den Einstellungen lassen sich Groß-/Kleinschreibung und Satzzeichen fürs Lernen, die
Bildschirmtastatur und das Ziel-Tempo (Standard 150 Anschläge/min) einstellen.

## Belegung aktualisieren

Nach einer Änderung an der Keymap:

```shell
python3 tools/export_layouts.py ../adv360-neu
```

Das Skript liest `config/adv360.keymap` und die Tastenpositionen aus
`config/boards/arm/adv360/adv360-layouts.dtsi` und schreibt `js/layouts.js`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `css/style.css` | Oberfläche (hell/dunkel nach Systemeinstellung) |
| `js/app.js` | Übungslogik, Statistik, Bildschirmtastatur |
| `js/layouts.js` | erzeugt: Tasten, Finger und Wege zu jedem Zeichen |
| `js/woerter.js` | Wortliste, Sätze und Symbol-Schnipsel |
| `tools/export_layouts.py` | Export aus der ZMK-Keymap |

Die Idee – Wörter statt Buchstabensalat, neue Buchstaben erst bei sicherem Tempo – ist
angelehnt an Trainer wie typista.de und keybr.com.

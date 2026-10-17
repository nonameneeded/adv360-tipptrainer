// Häufige deutsche Wörter (grob nach Häufigkeit), Nomen großgeschrieben.
// Die App filtert daraus Wörter, die nur freigeschaltete Buchstaben enthalten.
window.WOERTER = `
der die und in den von zu das mit sich des auf für ist im dem nicht ein Die eine als auch es an werden
aus er hat dass sie nach wird bei einer um am sind noch wie einem über einen so zum war haben nur oder
aber vor zur bis mehr durch man sein wurde sei Jahr Prozent können schon wenn ihr Jahre zwei immer
seine Zeit sagte wir Menschen kann ich unter sehr soll dann gegen Euro neue ersten Ende Uhr seit diese
mir uns Frau geht ganz wieder ihre Mann Tag gibt also wo heute Stadt Land Leben was selbst ohne
Kinder Welt dort alle drei einmal machen müssen Arbeit Geld lange Teil jetzt Seite Hause Haus gut
damit viele weil denn muss nun Frage Fall Woche hier etwa doch eigentlich zwischen kommen kommt
sagen sehen gehen bleiben stehen liegen finden geben nehmen halten lassen stellen bringen denken
glauben heißen zeigen führen sprechen leben fragen spielen arbeiten brauchen folgen lernen bestehen
verstehen setzen bekommen beginnen erzählen versuchen schreiben laufen erklären entsprechen sitzen
ziehen scheinen fallen gehören entstehen erhalten treffen suchen legen vorstellen handeln erreichen
tragen schaffen lesen verlieren darstellen erkennen entwickeln reden aussehen erscheinen bilden
anfangen erwarten wohnen betreffen warten vergehen helfen gewinnen schließen fühlen bieten
interessieren erinnern ergeben anbieten studieren verbinden ansehen fehlen bedeuten vergleichen
Wasser Weg Auge Hand Kopf Herz Name Kind Mutter Vater Freund Schule Straße Wort Buch Bild Zimmer
Tisch Tür Fenster Auto Bahn Zug Reise Weg Sonne Regen Wind Baum Blume Garten Wald Berg Meer See Fluss
Insel Erde Luft Feuer Licht Nacht Abend Morgen Mittag Monat Stunde Minute Sekunde Sommer Winter
Frühling Herbst Wetter Farbe Musik Lied Film Spiel Sport Ball Team Sieg Ziel Idee Plan Grund Sinn
Problem Antwort Lösung Beispiel Thema Text Satz Seite Zahl Wert Preis Kosten Markt Firma Kunde
Arbeit Büro Chef Kollege Termin Projekt Aufgabe Erfolg Fehler Ergebnis Ordnung Regel Gesetz Recht
Staat Politik Partei Wahl Stimme Bürger Volk Gruppe Familie Eltern Bruder Schwester Sohn Tochter
Onkel Tante Gast Nachbar Arzt Lehrer Schüler Student Leute Person Körper Gesicht Haar Mund Nase Ohr
Arm Bein Fuß Finger Rücken Brot Käse Milch Kaffee Tee Bier Wein Essen Obst Apfel Salat Suppe
Zucker Salz Ei Fleisch Fisch Reis Nudel Kuchen Teller Tasse Glas Messer Gabel Löffel Küche Bad
Bett Stuhl Schrank Lampe Boden Decke Wand Dach Keller Treppe Schlüssel Tasche Koffer Karte Brief
Papier Stift Heft Zeitung Nachricht Telefon Handy Computer Tastatur Maus Bildschirm Programm Datei
Ordner Fenster Netz Seite Liste Tabelle Daten Code Fehler Server Version System Sprache Schrift
neu alt groß klein lang kurz hoch tief gut schlecht schön schnell langsam leicht schwer warm kalt
heiß nass trocken hell dunkel laut leise stark schwach jung reich arm voll leer offen frei richtig
falsch wahr klar einfach wichtig möglich nötig fertig bereit sicher genau gleich anders ganz halb
rot blau grün gelb weiß schwarz grau braun früh spät oft selten nie gern bald gestern morgen heute
hier dort oben unten links rechts vorne hinten innen außen drinnen draußen überall nirgends
ein eine einen einer eines eins nie nein sie sei sein seine seinen seiner rein reisen Reisen Riese
Riesen Rasen rasen Rasse Rassen Sirene Serie Serien Nase Nasen nass Sense Sinne Sinn essen Eisen Eis
Reis Reise Seen See Arie Arien Rinne Ananas Anis Asse Ass niesen sinnen rinnen
er es an in ins ist nett Nest Rest Rente Rat Rate raten Tat Tante Taste Tasten Testen testen Test
Tier Tiere tief Seite Seiten Saite Ratte Ratten Stern Sterne Stein Steine Steinen Tee Teer Ente Enten
Ernte ernten Erde Ende enden Note Noten nett Rand Rede reden Rinde Rind Rinder Erdnuss dein deine
Daten Tanne Tannen Satire Senat Insasse Antenne Ader Adern Arten Atem neun nennen rennen
Rennen trennen Strand Strände Straße Stadt Städte drei dir dies diese dieser dieses dass denn danach
sind sein eins hin hinten Hand Hund Hunde Haus Hase Hasen heute Hut Hüte hart hast hatte hatten
Haut Heide Heer Held Helden hell Hemd her heraus herein Herr Herren heiß heißen Hitze Hilfe hilft
Huhn Hühner und unter uns unser unsere Uhr Ufer Ende Urlaub Laune laut Lust Luft Leute Leuten Lied
Lieder Linie Lineal lesen leise leisten lernen Land Lande landen Last Lasten Laster Laut Laute
lila Lila Lehre Lehrer Leiter Leiste Lunte Saal Salat Salz Saum Seil Seile Seele Silber Sohle Solo
Christ Dach Dichter dicht doch Docht Echo echt Ecke Lachs lachen machen Macht Mächte Nacht Licht
Sicht sicher Sache Sachen Küche Kuchen Koch kochen Gast Gäste Gans Gänse gerne Garten Gold Gras
Grund gelten Geld Gesicht Gelände Glas Glück Gleis gleich groß Gruß grüßen Muster Mond Monat
Mantel Markt Maler Maus Meer Meter Mitte Mittel Mode Motor Mühe Mund Musik Mutter Ober Obst Ofen
Ohr Ohren Oma Onkel Opa Ort Orte Bad Bahn Ball Bank Bart Bau Bauer Baum Berg Bett Biene Bild Birne
Blatt Blume Boot Brot Brief Bruder Buch Bus Butter Wagen Wahl Wald Wand Ware warm warten Wasser
Weg Wein Welt Wert Wetter Wind Winter Wolke Wolle Wort Wunder Wunsch Fahne Fahrt Fall Farbe Feder
Feld Fell Fest Feuer Film Finger Fisch Flasche Fleisch Flug Fluss Form Foto Frage Frau frei Freund
Fuß Kabel Kaffee Kamm Kampf Kanal Kante Karte Kasse Katze Kauf Kerze Kette Kind Kino Kiste Klasse
Kleid Knie Knopf Koffer Kopf Korb Kraft Kreis Kunst Kurs Zahl Zahn Zange Zaun Zeit Zelt Zettel
Zeug Ziege Ziel Zimmer Zoll Zucker Zug Zunge Paar Paket Papier Park Pause Pferd Pflanze Pilz Platz
Post Preis Punkt Puppe Vase Vater Verein Vogel Volk Ziel Juni Juli Jacke Jagd Jahr Joghurt Junge
Yoga Taxi Text Hexe extra Quelle Quark Quiz quer
Bär Bäume Ärger Äpfel Ärzte Ähre Käse Mädchen Märchen Nähe Rätsel Säge Träne Väter Öl Öfen
Österreich Röhre Söhne Töne Vögel Höhle Hölle hören Höhe König Löwe schön böse Übung über
für Tür Tür müde Mühle Mütze Bücher Brücke Rücken Stück Glück Hütte Küste Füße
Straße Fuß Fußball Gruß groß heißen weiß Maß Spaß süß außen draußen bloß
`.trim().split(/\s+/);

// Kurze Sätze für Satzzeichen-Übungen
window.SAETZE = [
  "Das ist gut.", "Wie geht es dir?", "Heute regnet es, morgen scheint die Sonne.",
  "Ich lerne ein neues Layout.", "Komm bitte schnell!", "Wo ist der Schlüssel?",
  "Der Zug fährt um acht Uhr.", "Wir treffen uns im Garten.", "Danke, das reicht.",
  "Sie liest ein Buch; er schreibt einen Brief.", "Achtung: frisch gestrichen!",
  "Was machst du am Wochenende?", "Die Tastatur ist geteilt, die Hände liegen entspannt.",
  "Übung macht den Meister.", "Lieber langsam und richtig als schnell und falsch.",
];

// Code-artige Schnipsel für die Symbol-Übung
window.SYMBOLE = [
  "(a)", "[i]", "{x}", "<b>", "a = b;", "x + y", "a - b", "a * b", "a / b", "50 %",
  "a != b", "a == b", "a <= b", "a >= b", "a && b", "a || b", "!ok", "x?", "#tag",
  "$name", "@user", "user_id", "a: b", "\"Text\"", "'c'", "f(x)", "f(a, b)", "arr[0]",
  "obj{}", "<div>", "</div>", "a -> b", "x => y", "i++", "i--", "a += 1", "10 €",
  "a\\b", "/home", "#include", "x = (a + b) * c;", "if (a) { b(); }", "[1, 2, 3]",
  "{ \"a\": 1 }", "a | b", "a & b", "100 % sicher", "Preis: 20 €", "E-Mail: a@b.de",
];

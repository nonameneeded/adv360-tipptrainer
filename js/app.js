"use strict";
/*
 * Adv360 Tipptrainer – adaptives Training für die eigene QWERTZ- und Bone-Belegung.
 *
 * Lernen: Man beginnt mit wenigen häufigen Buchstaben. Sind alle freigeschalteten Buchstaben
 * genau genug (Standard 95 %) und nicht zu langsam (60 % des Ziel-Tempos), kommt der nächste
 * dazu – spätestens nach 15 Minuten Übung, wenn wenigstens die Genauigkeit stimmt. Übungswörter
 * stammen aus einer Wortliste, gefiltert auf die freigeschalteten Buchstaben, mit Vorrang für
 * den schwächsten Buchstaben (Fokus).
 */

const D = window.ADV360;
const WOERTER = [...new Set(window.WOERTER)];
const REIHENFOLGE = "enisratdhulcgmobwfkzpvüäößjyxq";   // grob nach Häufigkeit im Deutschen
const START = 6;
const ZEILE = 52;             // Zeichen pro Übungszeile
const MIN_PROBEN = 30;        // so oft muss ein Buchstabe getippt sein, bevor er als sicher gilt
const PAUSE_MS = 3000;        // längere Pausen zählen nicht ins Tempo

const FINGER = {
  lk: "kleiner Finger links", lr: "Ringfinger links", lm: "Mittelfinger links",
  li: "Zeigefinger links", lt: "Daumen links", rt: "Daumen rechts", ri: "Zeigefinger rechts",
  rm: "Mittelfinger rechts", rr: "Ringfinger rechts", rk: "kleiner Finger rechts",
};

// ---------------------------------------------------------------- Speicher
const SPEICHER = "adv360-tipptrainer.v1";
function laden(schluessel, vorgabe) {
  try { return Object.assign(vorgabe, JSON.parse(localStorage.getItem(schluessel)) || {}); }
  catch { return vorgabe; }
}
function sichern(schluessel, wert) {
  try { localStorage.setItem(schluessel, JSON.stringify(wert)); } catch { /* privat/blockiert */ }
}

const opt = laden(SPEICHER, {
  layout: "qwertz", modus: "lernen", gross: false, satzzeichen: false, tastatur: true, ziel: 150,
  ansicht: "finger",
  genau: 95, tempoHuerde: 60, notausgang: 15,   // Freischalten des nächsten Buchstabens
});
let fort;                       // Fortschritt des aktiven Layouts
function fortLaden() {
  fort = laden(`${SPEICHER}.${opt.layout}`,
    { frei: START, tasten: {}, tage: {}, verlauf: [], fehler: [], tagWerte: null });
  if (!fort.tagWerte) {             // ältere Spielstände: Tageswerte aus den letzten Zeilen nachtragen
    fort.tagWerte = {};
    fort.verlauf.forEach(tagEintragen);
  }
}
const zwei = (n) => String(n).padStart(2, "0");
// Kalendertag in Ortszeit (toISOString wäre UTC und würde nach Mitternacht den Vortag liefern)
function tagVon(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}
const heute = () => tagVon(Date.now());
// Tageswerte für den Verlauf: Tempo und Genauigkeit aus Wort-Übungen (ohne Symbole),
// dazu das beste Test-Ergebnis des Tages
function tagEintragen(v) {
  const w = fort.tagWerte[tagVon(v.t)] ||= { zeilen: 0, tempo: 0, genau: 0, test: 0 };
  if (v.modus === "test") w.test = Math.max(w.test, v.tempo);
  else if (v.modus !== "symbole") { w.zeilen++; w.tempo += v.tempo; w.genau += v.genau; }
}
const zielMs = () => 60000 / opt.ziel;

// ---------------------------------------------------------------- Statistik je Zeichen
function stat(z) {
  return fort.tasten[z] || (fort.tasten[z] = { ms: null, fehler: 0, n: 0 });
}
function treffer(z, ms) {
  const s = stat(z);
  if (ms != null) s.ms = s.ms == null ? ms : s.ms * 0.9 + ms * 0.1;
  s.fehler *= 0.9;
  s.n++;
}
function fehlgriff(z) {
  const s = stat(z);
  s.fehler = s.fehler * 0.9 + 0.1;
}
const maxFehler = () => 1 - opt.genau / 100;
// genug geübt und genau genug – Voraussetzung für jede Freischaltung
function bereit(z) {
  const s = fort.tasten[z];
  return !!s && s.ms != null && s.n >= MIN_PROBEN && s.fehler <= maxFehler();
}
// dazu schnell genug (Anteil des Ziel-Tempos)
function sicher(z) {
  return bereit(z) && fort.tasten[z].ms * opt.tempoHuerde / 100 <= zielMs();
}
// Warum ist z noch nicht sicher? (für die Anzeige)
function grund(z) {
  const s = fort.tasten[z];
  if (!s || s.ms == null) return "neu";
  if (s.n < MIN_PROBEN) return "zu wenig geübt";
  if (s.fehler > maxFehler()) return "Genauigkeit";
  return "Tempo";
}
// 0 = neu/langsam … 1 = Ziel erreicht
function stand(z) {
  const s = fort.tasten[z];
  if (!s || s.ms == null) return 0;
  const tempo = Math.min(1, zielMs() / s.ms);
  const menge = Math.min(1, s.n / MIN_PROBEN);
  return Math.max(0, tempo * menge - s.fehler * 2);
}
const freieBuchstaben = () => REIHENFOLGE.slice(0, fort.frei).split("");
function fokus() {
  const frei = freieBuchstaben();
  return frei.reduce((a, b) => (stand(b) < stand(a) ? b : a));
}

// ---------------------------------------------------------------- Verwechslungen
const MAX_FEHLERLISTE = 1000;
const HALBWERT_TAGE = 7;            // ältere Verwechslungen zählen weniger
const ANDERES = { qwertz: "bone", bone: "qwertz" };
const ART = {
  get gewohnheit() { return opt.layout === "bone" ? "alter QWERTZ-Griff" : "Bone-Griff"; },
  nachbar: "Nachbartaste",
  sonst: "sonstiger Fehler",
  modus: "Tastatur im anderen Modus",
};
const zeichenAn = (layout, i) => (D.layouts[layout].labels[i].base || "").toLowerCase();

// Wie ist der Fehler entstanden? soll = erwartetes Zeichen, ist = getipptes Zeichen
function einordnen(soll, ist) {
  const hier = D.layouts[opt.layout].chars[soll];
  const dort = D.layouts[ANDERES[opt.layout]].chars[soll];
  const ist_ = ist.toLowerCase();
  if (!hier) return "sonst";
  // richtige Taste gedrückt, aber die Tastatur steht im anderen Modus
  if (zeichenAn(ANDERES[opt.layout], hier.key) === ist_ && ist_ !== soll.toLowerCase()) return "modus";
  // die Taste, an der das Zeichen im anderen Layout liegt
  if (dort && dort.key !== hier.key && zeichenAn(opt.layout, dort.key) === ist_) return "gewohnheit";
  const getippt = D.layouts[opt.layout].chars[ist];
  if (getippt) {
    const a = D.keys[hier.key], b = D.keys[getippt.key];
    if (Math.hypot(a.x - b.x, a.y - b.y) <= 150) return "nachbar";
  }
  return "sonst";
}

function gewicht(eintrag) {
  return Math.pow(0.5, (Date.now() - eintrag.t) / (HALBWERT_TAGE * 864e5));
}
// Verwechslungen zusammengefasst: [{soll, ist, art, wert, anzahl}], die stärksten zuerst
function verwechslungen() {
  const paare = new Map();
  for (const f of fort.fehler) {
    if (f.art === "modus") continue;
    const k = f.s + "\u0000" + f.g;
    const p = paare.get(k) || { soll: f.s, ist: f.g, art: f.art, wert: 0, anzahl: 0 };
    p.wert += gewicht(f);
    p.anzahl++;
    paare.set(k, p);
  }
  return [...paare.values()].sort((a, b) => b.wert - a.wert);
}
// Zeichen, die gezielt geübt werden sollten (meist verwechselt)
function schwache(n = 4) {
  const je = new Map();
  for (const p of verwechslungen()) je.set(p.soll, (je.get(p.soll) || 0) + p.wert);
  return [...je.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([z]) => z);
}

// ---------------------------------------------------------------- Übungstext
const zufall = (liste) => liste[Math.floor(Math.random() * liste.length)];

function wortPasst(w, erlaubt) {
  return [...w.toLowerCase()].every((c) => erlaubt.has(c));
}
function kunstwort(buchstaben, f) {
  const n = 3 + Math.floor(Math.random() * 4);
  const w = Array.from({ length: n }, () => zufall(buchstaben));
  w[Math.floor(Math.random() * n)] = f;
  return w.join("");
}
function zeileLernen() {
  const frei = freieBuchstaben();
  const erlaubt = new Set(frei);
  const f = fokus();
  const passend = WOERTER.filter((w) => wortPasst(w, erlaubt));
  const mitFokus = passend.filter((w) => w.toLowerCase().includes(f));
  const woerter = [];
  let laenge = 0;
  while (laenge < ZEILE) {
    let w;
    if (passend.length < 12) w = kunstwort(frei, f);
    else w = Math.random() < 0.6 && mitFokus.length ? zufall(mitFokus) : zufall(passend);
    if (!opt.gross) w = w.toLowerCase();
    if (opt.satzzeichen && Math.random() < 0.15) w += zufall([",", ".", "!", "?", ":"]);
    woerter.push(w);
    laenge += w.length + 1;
  }
  return woerter.join(" ");
}
function zeileAus(liste) {
  const teile = [];
  let laenge = 0;
  while (laenge < ZEILE) {
    const t = zufall(liste);
    teile.push(t);
    laenge += t.length + 1;
  }
  return teile.join(" ");
}
function zeileTest() {
  const haeufig = WOERTER.slice(0, 400).filter((w) => w.length > 1);
  return zeileAus(haeufig);
}
function zeileSchwaechen() {
  const ziel = schwache().filter((z) => z !== " ");
  if (!ziel.length) {
    melde("Noch keine Verwechslungen gespeichert – erst ein paar Zeilen üben.");
    return zeileLernen();
  }
  const buchstaben = ziel.filter((z) => /\p{L}/u.test(z)).map((z) => z.toLowerCase());
  const zeichen = ziel.filter((z) => !/\p{L}/u.test(z));
  const erlaubt = new Set(freieBuchstaben().concat(buchstaben));
  const passend = WOERTER.filter((w) => wortPasst(w, erlaubt) &&
    buchstaben.some((b) => w.toLowerCase().includes(b)));
  const teile = [];
  let laenge = 0;
  while (laenge < ZEILE) {
    let t;
    if (buchstaben.length && passend.length >= 5 && (!zeichen.length || Math.random() < 0.7)) {
      t = zufall(passend);
      if (!opt.gross && !ziel.some((z) => z !== z.toLowerCase())) t = t.toLowerCase();
    } else if (zeichen.length) {
      const sym = window.SYMBOLE.filter((x) => zeichen.some((z) => x.includes(z)));
      t = sym.length ? zufall(sym) : zufall(zeichen).repeat(2);
    } else {
      t = kunstwort(freieBuchstaben(), zufall(buchstaben));
    }
    teile.push(t);
    laenge += t.length + 1;
  }
  return teile.join(" ");
}
function neueZeile() {
  if (opt.modus === "schwaechen") return zeileSchwaechen();
  if (opt.modus === "saetze") return zeileAus(window.SAETZE);
  if (opt.modus === "symbole") return zeileAus(window.SYMBOLE);
  if (opt.modus === "test") return zeileTest();
  return zeileLernen();
}

// ---------------------------------------------------------------- Ablauf
let text = "", stelle = 0, falsch = false, fehlerStellen = new Set();
let letzterAnschlag = null, zeileStart = null, zeileAnschlaege = 0, zeileFehler = 0;
let testEnde = null, testTimer = null, summeAnschlaege = 0, summeFehler = 0;
let letzte = [];               // Ergebnis der letzten Anschläge, für die Modus-Warnung
let leerFrei = false;          // nach dem Zeilenende ist eine Leertaste gratis (Gewohnheit)
const merke = (a) => { letzte = letzte.concat(a).slice(-6); };

function starteZeile() {
  text = neueZeile();
  stelle = 0; falsch = false; fehlerStellen = new Set();
  letzterAnschlag = null; zeileStart = null; zeileAnschlaege = 0; zeileFehler = 0;
  zeichneText();
  zeichneHinweis();
}

function taste(e) {
  if (e.key === "Escape") { neustart(); return; }
  if (e.key.length !== 1) return;                 // Shift, Tottasten usw.
  if (e.target.closest && e.target.closest("input, button")) return;
  e.preventDefault();                             // Leertaste scrollt nicht, / öffnet keine Suche
  if (testEnde && Date.now() > testEnde) return;
  if (leerFrei) {
    leerFrei = false;
    if (e.key === " " && stelle === 0) return;
  }

  const jetzt = performance.now();
  const soll = text[stelle];
  if (zeileStart === null) zeileStart = jetzt;
  if (opt.modus === "test" && !testEnde) starteTest();

  if (e.key === soll) {
    merke("ok");
    const ms = letzterAnschlag !== null && jetzt - letzterAnschlag < PAUSE_MS && !falsch
      ? jetzt - letzterAnschlag : null;
    if (soll !== " ") treffer(soll, ms);
    zeitZaehlen(letzterAnschlag === null ? 0 : Math.min(jetzt - letzterAnschlag, PAUSE_MS));
    letzterAnschlag = jetzt;
    falsch = false;
    stelle++;
    zeileAnschlaege++;
    if (stelle >= text.length) { zeileFertig(jetzt); return; }
  } else {
    const art = einordnen(soll, e.key);
    merke(art);
    if (letzte.filter((a) => a === "modus").length >= 3) warneModus();
    if (!falsch && art !== "modus") {
      zeileFehler++;
      fehlgriff(soll);
      fehlerStellen.add(stelle);
      fort.fehler.push({ s: soll, g: e.key, art, t: Date.now() });
      if (fort.fehler.length > MAX_FEHLERLISTE) fort.fehler.splice(0, fort.fehler.length - MAX_FEHLERLISTE);
    }
    falsch = true;
  }
  zeichneText();
  zeichneHinweis();
}

function zeileFertig(jetzt) {
  const dauer = jetzt - zeileStart;
  const tempo = dauer > 0 ? Math.round((zeileAnschlaege - 1) / dauer * 60000) : 0;
  const genau = Math.round(100 * zeileAnschlaege / (zeileAnschlaege + zeileFehler));
  summeAnschlaege += zeileAnschlaege;
  summeFehler += zeileFehler;
  if (opt.modus !== "test") {
    const v = { t: Date.now(), tempo, genau, modus: opt.modus };
    fort.verlauf.push(v);
    tagEintragen(v);
  }
  fort.verlauf = fort.verlauf.slice(-200);
  pruefeFreischaltung();
  sichern(`${SPEICHER}.${opt.layout}`, fort);
  if (opt.modus !== "test") zeigeWerte(tempo, genau);
  starteZeile();
  leerFrei = true;
  zeichneBuchstaben();
  faerbeTastatur();
  if (!$("auswertung").hidden) zeigeAuswertung();
}

const restMinuten = () => Math.max(0, Math.ceil(opt.notausgang - (fort.seitFrei || 0) / 60));
function pruefeFreischaltung() {
  if (opt.modus !== "lernen" || fort.frei >= REIHENFOLGE.length) return;
  const frei = freieBuchstaben();
  if (frei.every(sicher)) {
    melde(`Neuer Buchstabe: ${freischalten()}`);
  } else if (opt.notausgang > 0 && restMinuten() === 0 && frei.every(bereit)) {
    // Notausgang: lange geübt und genau, nur das Tempo fehlt noch
    const langsam = frei.filter((z) => !sicher(z)).join(" ");
    melde(`Neuer Buchstabe: ${freischalten()} – nach ${opt.notausgang} min Übung (noch zu langsam: ${langsam}).`);
  }
}
function freischalten() {
  fort.frei++;
  fort.seitFrei = 0;
  return REIHENFOLGE[fort.frei - 1];
}

function warneModus() {
  const soll = opt.layout === "bone" ? "Bone (Mod + B ausschalten, LEDs aus)" : "QWERTZ (Mod + B, LEDs weiß)";
  $("meldung").textContent = `Die Tastatur scheint im anderen Modus zu sein – bitte auf ${soll} umschalten. ` +
    "Diese Anschläge zählen nicht als Fehler.";
  $("meldung").classList.add("warnung");
}

function zeitZaehlen(ms) {
  const tag = heute();
  fort.tage[tag] = (fort.tage[tag] || 0) + ms / 1000;
  if (opt.modus === "lernen") fort.seitFrei = (fort.seitFrei || 0) + ms / 1000;
  zeigeHeute();
}

// ---------------------------------------------------------------- Test
function starteTest() {
  testEnde = Date.now() + 60000;
  const box = document.getElementById("wert-timer-box");
  box.hidden = false;
  const anschlaege0 = gesamtAnschlaege();
  const fehler0 = gesamtFehler();
  testTimer = setInterval(() => {
    const rest = Math.max(0, Math.ceil((testEnde - Date.now()) / 1000));
    document.getElementById("wert-timer").textContent = rest;
    if (rest === 0) {
      clearInterval(testTimer);
      const a = gesamtAnschlaege() - anschlaege0;
      const f = gesamtFehler() - fehler0;
      zeigeWerte(a, Math.round(100 * a / Math.max(1, a + f)));
      const v = { t: Date.now(), tempo: a, genau: Math.round(100 * a / Math.max(1, a + f)), modus: "test" };
      fort.verlauf.push(v);
      tagEintragen(v);
      sichern(`${SPEICHER}.${opt.layout}`, fort);
      melde(`Test beendet: ${a} Anschläge in einer Minute. Esc startet neu.`);
    }
  }, 200);
}
function gesamtAnschlaege() { return summeAnschlaege + zeileAnschlaege; }
function gesamtFehler() { return summeFehler + zeileFehler; }

function neustart() {
  clearInterval(testTimer);
  testEnde = null;
  summeAnschlaege = 0; summeFehler = 0;
  document.getElementById("wert-timer-box").hidden = true;
  document.getElementById("wert-timer").textContent = "60";
  melde("");
  leerFrei = false;
  starteZeile();
}

// ---------------------------------------------------------------- Anzeige
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
function svgEl(name, attr = {}, text) {
  const el = document.createElementNS(NS, name);
  for (const [a, v] of Object.entries(attr)) el.setAttribute(a, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

function zeichneText() {
  const el = $("text");
  el.textContent = "";
  for (let i = 0; i < text.length; i++) {
    const s = document.createElement("span");
    s.textContent = text[i];
    if (text[i] === " ") s.className = "leer";
    if (i < stelle) s.classList.add("fertig");
    if (i < stelle && fehlerStellen.has(i)) s.classList.add("war-falsch");
    if (i === stelle) { s.classList.add("jetzt"); if (falsch) s.classList.add("falsch"); }
    el.appendChild(s);
  }
}

function weg(z) { return D.layouts[opt.layout].chars[z]; }

function zeichneHinweis() {
  const z = text[stelle];
  const w = z === undefined ? null : weg(z);
  document.querySelectorAll("#tastatur g.ziel, #tastatur g.mod")
    .forEach((g) => g.classList.remove("ziel", "mod"));
  if (!w) { $("hinweis").textContent = ""; return; }
  const teile = [];
  if (w.hold !== undefined) teile.push(w.hold === D.special.macro2 ? "Macro2 (links) halten" : "Macro4 (rechts) halten");
  if (w.shift !== undefined) teile.push(w.shift === D.special.shiftRight ? "Shift rechts" : "Shift links");
  teile.push(FINGER[D.keys[w.key].finger]);
  $("hinweis").textContent = (z === " " ? "Leertaste" : `„${z}“`) + ": " + teile.join(" + ");
  const g = (i) => document.querySelector(`#tastatur g[data-i="${i}"]`);
  g(w.key)?.classList.add("ziel");
  if (w.hold !== undefined) g(w.hold)?.classList.add("mod");
  if (w.shift !== undefined) g(w.shift)?.classList.add("mod");
}

function zeichneTastatur() {
  const box = $("tastatur");
  box.hidden = !opt.tastatur;
  $("ansichtwahl").hidden = !opt.tastatur;
  $("heat-legende").hidden = true;
  if (!opt.tastatur) return;
  const lab = D.layouts[opt.layout].labels;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const svg = svgEl("svg");
  D.keys.forEach((k, i) => {
    const g = svgEl("g", { "data-i": i, class: "f-" + k.finger[1] });
    if (k.r) g.setAttribute("transform", `rotate(${k.r / 100} ${k.rx} ${k.ry})`);
    g.appendChild(svgEl("rect", { x: k.x + 4, y: k.y + 4, width: k.w - 8, height: k.h - 8, rx: 12 }));
    const l = lab[i];
    const text = (cls, s, dx, dy) =>
      g.appendChild(svgEl("text", { class: cls, x: k.x + k.w / 2 + dx, y: k.y + k.h / 2 + dy }, s));
    if (l.base !== undefined) {
      const gross = l.base.toUpperCase();      // wie auf Tastenkappen, aber ß bleibt ß
      text("haupt", gross.length === 1 ? gross : l.base, 0, 0);
      if (l.shift) text("shift", l.shift, -k.w / 2 + 22, -k.h / 2 + 22);
    } else if (l.name) {
      text("name", l.name, 0, 0);
    }
    if (l.sym) text("sym", l.sym, k.w / 2 - 20, k.h / 2 - 20);
    svg.appendChild(g);
    // Begrenzung (inkl. Drehung grob über die Ecken)
    const rad = (k.r / 100) * Math.PI / 180;
    for (const [px, py] of [[k.x, k.y], [k.x + k.w, k.y], [k.x, k.y + k.h], [k.x + k.w, k.y + k.h]]) {
      const dx = px - k.rx, dy = py - k.ry;
      const x = k.rx + dx * Math.cos(rad) - dy * Math.sin(rad);
      const y = k.ry + dx * Math.sin(rad) + dy * Math.cos(rad);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  });
  svg.setAttribute("viewBox", `${minX - 10} ${minY - 10} ${maxX - minX + 20} ${maxY - minY + 20}`);
  box.textContent = "";
  box.appendChild(svg);
  faerbeTastatur();
  zeichneHinweis();
}

// Heatmap: je Taste der Stand aller Zeichen, die auf ihr liegen (Basis, Shift, Symbol-Ebene),
// gewichtet nach Anzahl der Anschläge
function tastenWerte() {
  const je = new Map();
  for (const [z, s] of Object.entries(fort.tasten)) {
    const w = weg(z);
    if (!w || !s.n || s.ms == null) continue;
    const e = je.get(w.key) || { summe: 0, n: 0, zeichen: [] };
    e.summe += stand(z) * s.n;
    e.n += s.n;
    e.zeichen.push(z);
    je.set(w.key, e);
  }
  return je;
}
function faerbeTastatur() {
  const svg = $("tastatur").querySelector("svg");
  if (!svg) return;
  const heat = opt.ansicht === "heatmap";
  svg.classList.toggle("heat", heat);
  $("heat-legende").hidden = !heat;
  const werte = heat ? tastenWerte() : new Map();
  svg.querySelectorAll("g[data-i]").forEach((g) => {
    const e = werte.get(Number(g.dataset.i));
    g.classList.toggle("daten", !!e);
    g.querySelector("title")?.remove();
    if (!e) return;
    g.style.setProperty("--h", Math.round(e.summe / e.n * 120));
    g.prepend(svgEl("title", {}, e.zeichen.map((z) => {
      const s = fort.tasten[z];
      return `${z}: ${Math.round(60000 / s.ms)} Anschläge/min, ${Math.round(s.fehler * 100)} % Fehler, ${s.n}× getippt`;
    }).join("\n")));
  });
}

function zeichneBuchstaben() {
  const el = $("buchstaben");
  el.textContent = "";
  el.hidden = opt.modus !== "lernen" && opt.modus !== "schwaechen";
  const f = fokus();
  REIHENFOLGE.split("").forEach((z, i) => {
    const s = document.createElement("span");
    s.textContent = z;
    if (i < fort.frei) {
      s.classList.add("offen");
      const p = stand(z);
      s.style.background = `hsl(${Math.round(p * 120)} 65% 42%)`;
      const t = fort.tasten[z];
      s.title = t?.ms
        ? `${Math.round(60000 / t.ms)} Anschläge/min, ${Math.round(t.fehler * 100)} % Fehler`
        : "noch nicht geübt";
      if (z === f) s.classList.add("fokus");
    } else {
      s.title = i === fort.frei ? "kommt als Nächstes" : "noch gesperrt";
    }
    el.appendChild(s);
  });
  zeichneNaechster();
}
// Was fehlt bis zum nächsten Buchstaben?
function zeichneNaechster() {
  const el = $("naechster");
  el.textContent = "";
  if (opt.modus !== "lernen" || fort.frei >= REIHENFOLGE.length) return;
  const fehlt = freieBuchstaben().filter((z) => !sicher(z));
  if (!fehlt.length) return;
  const teile = fehlt.slice(0, 6).map((z) => `${z} (${grund(z)})`);
  if (fehlt.length > 6) teile.push(`und ${fehlt.length - 6} weitere`);
  let text = `Bis „${REIHENFOLGE[fort.frei]}“ fehlt noch: ${teile.join(", ")}`;
  if (opt.notausgang > 0 && fehlt.every((z) => grund(z) === "Tempo")) {
    const rest = restMinuten();
    text += rest ? ` – spätestens in ${rest} min Übung` : " – kommt nach dieser Zeile";
  }
  el.textContent = text + ".";
}

function zeigeWerte(tempo, genau) {
  $("wert-tempo").textContent = tempo;
  $("wert-genau").textContent = genau + " %";
}
function zeigeHeute() {
  const s = Math.round(fort.tage[heute()] || 0);
  $("wert-heute").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function melde(t) {
  $("meldung").textContent = t;
  $("meldung").classList.remove("warnung");
}

// ---------------------------------------------------------------- Auswertung
const TAGE_IM_VERLAUF = 30;
function datumKurz(tag) { return `${Number(tag.slice(8))}.${Number(tag.slice(5, 7))}.`; }
function tagWert(tag) {
  const w = fort.tagWerte[tag];
  return {
    tag,
    minuten: (fort.tage[tag] || 0) / 60,
    tempo: w && w.zeilen ? w.tempo / w.zeilen : null,
    genau: w && w.zeilen ? w.genau / w.zeilen : null,
    test: w && w.test ? w.test : null,
    zeilen: w ? w.zeilen : 0,
  };
}
// Schnitt über mehrere Tage, gewichtet nach Zeilen
function schnitt(tage) {
  const z = tage.reduce((a, t) => a + t.zeilen, 0);
  return {
    minuten: tage.reduce((a, t) => a + t.minuten, 0),
    tempo: z ? tage.reduce((a, t) => a + (t.tempo || 0) * t.zeilen, 0) / z : null,
  };
}
function zeichneVerlauf() {
  const box = $("verlauf");
  box.textContent = "";
  const tage = [];
  for (let i = TAGE_IM_VERLAUF - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    tage.push(tagWert(tagVon(d)));
  }
  if (!tage.some((t) => t.minuten >= 0.5 || t.tempo || t.test)) {
    box.textContent = "Noch kein Verlauf – nach ein paar Übungstagen siehst du hier Übungszeit und Tempo pro Tag.";
    return;
  }
  // Vergleich: letzte 7 Tage gegen die 7 Tage davor
  const jetzt = schnitt(tage.slice(-7)), vorher = schnitt(tage.slice(-14, -7));
  const p = document.createElement("p");
  p.textContent = `Letzte 7 Tage: ${Math.round(jetzt.minuten)} min geübt` +
    (jetzt.tempo ? `, Ø ${Math.round(jetzt.tempo)} Anschläge/min` : "") +
    (jetzt.tempo && vorher.tempo ? ` (Woche davor: ${Math.round(vorher.tempo)})` : "") + ".";
  box.appendChild(p);

  const B = 720, H = 200, L = 52, R = 44, O = 10, U = 24;
  const breite = (B - L - R) / tage.length;
  const maxMin = Math.max(10, Math.ceil(Math.max(...tage.map((t) => t.minuten)) / 10) * 10);
  const maxTempo = Math.ceil(Math.max(opt.ziel, ...tage.map((t) => Math.max(t.tempo || 0, t.test || 0))) * 1.1 / 50) * 50;
  const x = (i) => L + breite * (i + 0.5);
  const yMin = (m) => H - U - (H - U - O) * m / maxMin;
  const yTempo = (v) => H - U - (H - U - O) * v / maxTempo;
  const svg = svgEl("svg", { viewBox: `0 0 ${B} ${H}`, class: "verlauf", role: "img",
    "aria-label": "Übungszeit und Tempo der letzten 30 Tage" });
  // Achsen und Hilfslinien
  for (const anteil of [0, 0.5, 1]) {
    const y = H - U - (H - U - O) * anteil;
    svg.appendChild(svgEl("line", { x1: L, x2: B - R, y1: y, y2: y, class: "gitter" }));
    svg.appendChild(svgEl("text", { x: L - 6, y, class: "achse links" }, Math.round(maxMin * anteil) + (anteil === 1 ? " min" : "")));
    svg.appendChild(svgEl("text", { x: B - R + 6, y, class: "achse rechts" }, Math.round(maxTempo * anteil)));
  }
  svg.appendChild(svgEl("line", { x1: L, x2: B - R, y1: yTempo(opt.ziel), y2: yTempo(opt.ziel), class: "ziellinie" }));
  // Übungszeit als Balken
  tage.forEach((t, i) => {
    if (t.minuten > 0) {
      const y = yMin(t.minuten);
      svg.appendChild(svgEl("rect", { x: x(i) - breite * 0.35, y, width: breite * 0.7, height: H - U - y, class: "balken" }));
    }
    if (i % 5 === (tage.length - 1) % 5) {
      svg.appendChild(svgEl("text", { x: x(i), y: H - 8, class: "achse mitte" }, datumKurz(t.tag)));
    }
  });
  // Tempo als Linie, Tests als Rauten
  const punkte = tage.map((t, i) => [t, i]).filter(([t]) => t.tempo);
  if (punkte.length > 1) {
    svg.appendChild(svgEl("polyline", { class: "tempo",
      points: punkte.map(([t, i]) => `${x(i)},${yTempo(t.tempo)}`).join(" ") }));
  }
  for (const [t, i] of punkte) svg.appendChild(svgEl("circle", { cx: x(i), cy: yTempo(t.tempo), r: 4, class: "tempo" }));
  tage.forEach((t, i) => {
    if (!t.test) return;
    const y = yTempo(t.test);
    svg.appendChild(svgEl("path", { d: `M${x(i)} ${y - 6}l6 6-6 6-6-6z`, class: "test" }));
  });
  // Unsichtbare Spalten mit Tooltip je Tag
  tage.forEach((t, i) => {
    const teile = [`${datumKurz(t.tag)}: ${Math.round(t.minuten)} min geübt`];
    if (t.tempo) teile.push(`Ø ${Math.round(t.tempo)} Anschläge/min, ${Math.round(t.genau)} % genau`);
    if (t.test) teile.push(`bester Test ${t.test}`);
    const spalte = svgEl("rect", { x: L + breite * i, y: O, width: breite, height: H - U - O, class: "spalte" });
    spalte.appendChild(svgEl("title", {}, teile.join("\n")));
    svg.appendChild(spalte);
  });
  box.appendChild(svg);
  const legende = document.createElement("p");
  legende.className = "dezent legende";
  legende.innerHTML = '<span class="farbe balken"></span> Übungszeit (links) · ' +
    '<span class="farbe tempo"></span> Ø Anschläge/min in Wort-Übungen (rechts) · ' +
    '<span class="farbe test"></span> bester Test · <span class="farbe ziel"></span> Ziel';
  box.appendChild(legende);
}

function zeigeAuswertung() {
  zeichneVerlauf();
  const liste = verwechslungen().slice(0, 12);
  const box = $("auswertung-inhalt");
  box.textContent = "";
  const alle = fort.fehler.filter((f) => f.art !== "modus");
  if (!alle.length) {
    box.textContent = "Noch keine Fehler gespeichert. Übe ein paar Zeilen, dann erscheint hier, was du womit verwechselst.";
    return;
  }
  const arten = {};
  for (const f of alle) arten[f.art] = (arten[f.art] || 0) + 1;
  const p = document.createElement("p");
  p.textContent = `${alle.length} Fehler gespeichert: ` + Object.entries(arten)
    .sort((a, b) => b[1] - a[1])
    .map(([a, n]) => `${Math.round(100 * n / alle.length)} % ${ART[a]}`).join(", ") + ".";
  box.appendChild(p);

  const tab = document.createElement("table");
  tab.innerHTML = "<thead><tr><th>Gesucht</th><th>Getippt</th><th>Wie oft</th><th>Wahrscheinlich</th></tr></thead>";
  const tb = document.createElement("tbody");
  const zeigeZ = (z) => (z === " " ? "␣" : z);
  for (const v of liste) {
    const tr = document.createElement("tr");
    for (const t of [zeigeZ(v.soll), zeigeZ(v.ist), v.anzahl + "×", ART[v.art]]) {
      const td = document.createElement("td");
      td.textContent = t;
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
  tab.appendChild(tb);
  box.appendChild(tab);
  const s = schwache().filter((z) => z !== " ");
  const hinweis = document.createElement("p");
  hinweis.className = "dezent";
  hinweis.textContent = s.length
    ? `„Schwächen“ übt gezielt: ${s.map(zeigeZ).join(" ")}. Neuere Fehler zählen stärker (Halbwertszeit ${HALBWERT_TAGE} Tage).`
    : "";
  box.appendChild(hinweis);
}

function zeichneAuswahl() {
  document.querySelectorAll("#layoutwahl button").forEach((b) =>
    b.setAttribute("aria-checked", b.dataset.layout === opt.layout));
  document.querySelectorAll("#moduswahl button").forEach((b) =>
    b.setAttribute("aria-checked", b.dataset.modus === opt.modus));
  document.querySelectorAll("#ansichtwahl button").forEach((b) =>
    b.setAttribute("aria-checked", b.dataset.ansicht === opt.ansicht));
  $("layout-hinweis").textContent = opt.layout === "bone"
    ? "Tastatur im Bone-Modus (Standard, LEDs aus), Betriebssystem auf Deutsch (QWERTZ)."
    : "QWERTZ auf der Tastatur einschalten: Mod halten + B (LEDs weiß). Das Betriebssystem bleibt auf Deutsch (QWERTZ).";
}

function allesNeu() {
  sichern(SPEICHER, opt);
  fortLaden();
  zeichneAuswahl();
  zeichneTastatur();
  zeichneBuchstaben();
  zeigeHeute();
  const letzte = fort.verlauf.filter((v) => v.modus === opt.modus).slice(-1)[0];
  if (letzte) zeigeWerte(letzte.tempo, letzte.genau);
  else { $("wert-tempo").textContent = "–"; $("wert-genau").textContent = "–"; }
  neustart();
}

// ---------------------------------------------------------------- Bedienelemente
document.querySelectorAll("#layoutwahl button").forEach((b) =>
  b.addEventListener("click", () => { opt.layout = b.dataset.layout; b.blur(); allesNeu(); }));
document.querySelectorAll("#moduswahl button").forEach((b) =>
  b.addEventListener("click", () => { opt.modus = b.dataset.modus; b.blur(); allesNeu(); }));
document.querySelectorAll("#ansichtwahl button").forEach((b) =>
  b.addEventListener("click", () => {
    opt.ansicht = b.dataset.ansicht;
    b.blur();
    sichern(SPEICHER, opt);
    zeichneAuswahl();
    faerbeTastatur();
  }));

$("auswertung-knopf").addEventListener("click", (e) => {
  const offen = $("auswertung").hidden;
  $("auswertung").hidden = !offen;
  e.currentTarget.setAttribute("aria-expanded", offen);
  if (offen) zeigeAuswertung();
  e.currentTarget.blur();
});
$("schwaechen-ueben").addEventListener("click", (e) => {
  opt.modus = "schwaechen";
  $("auswertung").hidden = true;
  $("auswertung-knopf").setAttribute("aria-expanded", false);
  e.currentTarget.blur();
  allesNeu();
});
$("einstellungen-knopf").addEventListener("click", (e) => {
  const offen = $("einstellungen").hidden;
  $("einstellungen").hidden = !offen;
  e.currentTarget.setAttribute("aria-expanded", offen);
});
const schalter = { "opt-gross": "gross", "opt-satzzeichen": "satzzeichen", "opt-tastatur": "tastatur" };
for (const [id, feld] of Object.entries(schalter)) {
  $(id).checked = opt[feld];
  $(id).addEventListener("change", (e) => { opt[feld] = e.target.checked; allesNeu(); });
}
// Zahlenfelder: Feld, kleinster Wert, größter Wert
const zahlen = {
  "opt-ziel": ["ziel", 60, 600], "opt-genau": ["genau", 80, 100], "opt-huerde": ["tempoHuerde", 0, 100],
  "opt-notausgang": ["notausgang", 0, 120],
};
for (const [id, [feld, min, max]] of Object.entries(zahlen)) {
  $(id).value = opt[feld];
  $(id).addEventListener("change", (e) => {
    const v = Number(e.target.value);
    if (e.target.value !== "" && Number.isFinite(v)) opt[feld] = Math.min(max, Math.max(min, Math.round(v)));
    e.target.value = opt[feld];
    allesNeu();
  });
}
$("freischalten").addEventListener("click", (e) => {
  e.currentTarget.blur();
  if (fort.frei >= REIHENFOLGE.length) return;
  const neu = freischalten();
  sichern(`${SPEICHER}.${opt.layout}`, fort);
  allesNeu();
  melde(`Neuer Buchstabe: ${neu} (von Hand freigeschaltet)`);
});
$("zuruecksetzen").addEventListener("click", () => {
  if (!confirm(`Fortschritt für ${opt.layout === "bone" ? "Bone" : "QWERTZ"} löschen?`)) return;
  try { localStorage.removeItem(`${SPEICHER}.${opt.layout}`); } catch { /* egal */ }
  allesNeu();
});

document.addEventListener("keydown", taste);
allesNeu();

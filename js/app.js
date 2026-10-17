"use strict";
/*
 * Adv360 Tipptrainer – adaptives Training für die eigene QWERTZ- und Bone-Belegung.
 *
 * Lernen: Man beginnt mit wenigen häufigen Buchstaben. Sind alle freigeschalteten Buchstaben
 * schnell und sicher genug (Ziel-Tempo, < 7 % Fehler), kommt der nächste dazu. Übungswörter
 * stammen aus einer Wortliste, gefiltert auf die freigeschalteten Buchstaben, mit Vorrang für
 * den schwächsten Buchstaben (Fokus).
 */

const D = window.ADV360;
const WOERTER = [...new Set(window.WOERTER)];
const REIHENFOLGE = "enisratdhulcgmobwfkzpvüäößjyxq";   // grob nach Häufigkeit im Deutschen
const START = 6;
const ZEILE = 52;             // Zeichen pro Übungszeile
const MIN_PROBEN = 15;        // so oft muss ein Buchstabe getippt sein, bevor er als sicher gilt
const MAX_FEHLER = 0.07;
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
});
let fort;                       // Fortschritt des aktiven Layouts
function fortLaden() {
  fort = laden(`${SPEICHER}.${opt.layout}`, { frei: START, tasten: {}, tage: {}, verlauf: [] });
}
const heute = () => new Date().toISOString().slice(0, 10);
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
function sicher(z) {
  const s = fort.tasten[z];
  return s && s.n >= MIN_PROBEN && s.ms != null && s.ms <= zielMs() && s.fehler <= MAX_FEHLER;
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
function neueZeile() {
  if (opt.modus === "saetze") return zeileAus(window.SAETZE);
  if (opt.modus === "symbole") return zeileAus(window.SYMBOLE);
  if (opt.modus === "test") return zeileTest();
  return zeileLernen();
}

// ---------------------------------------------------------------- Ablauf
let text = "", stelle = 0, falsch = false, fehlerStellen = new Set();
let letzterAnschlag = null, zeileStart = null, zeileAnschlaege = 0, zeileFehler = 0;
let testEnde = null, testTimer = null, summeAnschlaege = 0, summeFehler = 0;

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

  const jetzt = performance.now();
  const soll = text[stelle];
  if (zeileStart === null) zeileStart = jetzt;
  if (opt.modus === "test" && !testEnde) starteTest();

  if (e.key === soll) {
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
    if (!falsch) { zeileFehler++; fehlgriff(soll); fehlerStellen.add(stelle); }
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
  if (opt.modus !== "test") fort.verlauf.push({ t: Date.now(), tempo, genau, modus: opt.modus });
  fort.verlauf = fort.verlauf.slice(-200);
  pruefeFreischaltung();
  sichern(`${SPEICHER}.${opt.layout}`, fort);
  if (opt.modus !== "test") zeigeWerte(tempo, genau);
  starteZeile();
  zeichneBuchstaben();
}

function pruefeFreischaltung() {
  if (opt.modus !== "lernen" || fort.frei >= REIHENFOLGE.length) return;
  if (freieBuchstaben().every(sicher)) {
    const neu = REIHENFOLGE[fort.frei];
    fort.frei++;
    melde(`Neuer Buchstabe: ${neu}`);
  }
}

function zeitZaehlen(ms) {
  const tag = heute();
  fort.tage[tag] = (fort.tage[tag] || 0) + ms / 1000;
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
      fort.verlauf.push({ t: Date.now(), tempo: a, genau: Math.round(100 * a / Math.max(1, a + f)), modus: "test" });
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
  starteZeile();
}

// ---------------------------------------------------------------- Anzeige
const $ = (id) => document.getElementById(id);

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
  if (!opt.tastatur) return;
  const lab = D.layouts[opt.layout].labels;
  const ns = "http://www.w3.org/2000/svg";
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const svg = document.createElementNS(ns, "svg");
  D.keys.forEach((k, i) => {
    const g = document.createElementNS(ns, "g");
    g.dataset.i = i;
    g.setAttribute("class", "f-" + k.finger[1]);
    if (k.r) g.setAttribute("transform", `rotate(${k.r / 100} ${k.rx} ${k.ry})`);
    const r = document.createElementNS(ns, "rect");
    Object.entries({ x: k.x + 4, y: k.y + 4, width: k.w - 8, height: k.h - 8, rx: 12 })
      .forEach(([a, v]) => r.setAttribute(a, v));
    g.appendChild(r);
    const l = lab[i];
    const text = (cls, s, dx, dy) => {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("class", cls);
      t.setAttribute("x", k.x + k.w / 2 + dx);
      t.setAttribute("y", k.y + k.h / 2 + dy);
      t.textContent = s;
      g.appendChild(t);
    };
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
  zeichneHinweis();
}

function zeichneBuchstaben() {
  const el = $("buchstaben");
  el.textContent = "";
  el.hidden = opt.modus !== "lernen";
  const f = fokus();
  REIHENFOLGE.split("").forEach((z, i) => {
    const s = document.createElement("span");
    s.textContent = z;
    if (i < fort.frei) {
      s.classList.add("offen");
      const p = stand(z);
      s.style.background = `hsl(${Math.round(p * 120)} 65% 42%)`;
      s.title = fort.tasten[z]?.ms
        ? `${Math.round(60000 / fort.tasten[z].ms)} Anschläge/min, ${Math.round(fort.tasten[z].fehler * 100)} % Fehler`
        : "noch nicht geübt";
      if (z === f) s.classList.add("fokus");
    } else {
      s.title = "noch gesperrt";
    }
    el.appendChild(s);
  });
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
}

function zeichneAuswahl() {
  document.querySelectorAll("#layoutwahl button").forEach((b) =>
    b.setAttribute("aria-checked", b.dataset.layout === opt.layout));
  document.querySelectorAll("#moduswahl button").forEach((b) =>
    b.setAttribute("aria-checked", b.dataset.modus === opt.modus));
  $("layout-hinweis").textContent = opt.layout === "bone"
    ? "Bone auf der Tastatur einschalten: Mod halten + B (LEDs weiß). Das Betriebssystem bleibt auf Deutsch (QWERTZ)."
    : "Tastatur im QWERTZ-Modus (LEDs aus), Betriebssystem auf Deutsch (QWERTZ).";
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
$("opt-ziel").value = opt.ziel;
$("opt-ziel").addEventListener("change", (e) => {
  opt.ziel = Math.min(600, Math.max(60, Number(e.target.value) || 150));
  e.target.value = opt.ziel;
  allesNeu();
});
$("zuruecksetzen").addEventListener("click", () => {
  if (!confirm(`Fortschritt für ${opt.layout === "bone" ? "Bone" : "QWERTZ"} löschen?`)) return;
  try { localStorage.removeItem(`${SPEICHER}.${opt.layout}`); } catch { /* egal */ }
  allesNeu();
});

document.addEventListener("keydown", taste);
allesNeu();

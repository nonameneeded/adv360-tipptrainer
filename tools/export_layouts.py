"""Exportiert QWERTZ- und Bone-Belegung des Adv360 aus der ZMK-Keymap nach js/layouts.js.

Aufruf (aus dem Repo-Verzeichnis), mit dem Pfad zu einem Klon von
https://github.com/nonameneeded/Adv360-Pro-ZMK (Branch deutsch):
    python3 tools/export_layouts.py ../Adv360-Pro-ZMK

Gelesen werden config/adv360.keymap (Ebenen default_layer, bone, symbol) und
config/boards/arm/adv360/adv360-layouts.dtsi (Lage der Tasten). Ergebnis: für jede
Taste Position, Finger und Beschriftung, und für jedes Zeichen, welche Tasten man dafür
drückt (Taste, ggf. Shift, ggf. Symbol-Taste halten).
"""
import json
import os
import re
import sys
import time

if len(sys.argv) != 2:
    sys.exit("Aufruf: python3 tools/export_layouts.py <Pfad zum Keymap-Repo>")
ZMK = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "js", "layouts.js")

src = open(os.path.join(ZMK, "config/adv360.keymap"), encoding="utf-8").read()
src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
src = re.sub(r"(?<!\w)___(?!\w)", "&trans", src)
TOK = r"&\w+(?:\s+(?!&)[^\s&>]+)*"
layers = {
    m.group(1): [re.sub(r"\s+", " ", t) for t in re.findall(TOK, m.group(2))]
    for m in re.finditer(r"(\w+)\s*\{[^{}]*?bindings = <(.*?)>;", src, re.S)
}
for name in ("default_layer", "bone", "symbol"):
    assert len(layers[name]) == 76, (name, len(layers[name]))

phys = open(os.path.join(ZMK, "config/boards/arm/adv360/adv360-layouts.dtsi"), encoding="utf-8").read()
phys = re.search(r"physical_layout0:.*?keys(.*?);", phys, re.S).group(1)
keys = []
for t in re.findall(r"<&key_physical_attrs([^>]*)>", phys):
    w, h, x, y, rot, rx, ry = (int(v.strip("()")) for v in t.split())
    keys.append({"w": w, "h": h, "x": x, "y": y, "r": rot, "rx": rx, "ry": ry})
assert len(keys) == 76, len(keys)

# --- Finger: Reihen bestehen aus linker Hälfte, Daumenblock, rechter Hälfte -----------
GROUPS = [(7, 0, 7), (7, 0, 7), (7, 4, 7), (6, 2, 6), (5, 6, 5)]
COL_FINGER = ["k", "k", "r", "m", "i", "i", "i"]      # von außen nach innen: kleiner F., Ring, Mittel, Zeige
pos = 0
for left, mid, right in GROUPS:
    for c in range(left):
        keys[pos]["finger"] = "l" + COL_FINGER[c]; pos += 1
    for c in range(mid):
        keys[pos]["finger"] = "lt" if c < mid // 2 else "rt"; pos += 1
    for c in range(right):
        keys[pos]["finger"] = "r" + COL_FINGER[right - 1 - c]; pos += 1
for k in keys:
    k["hand"] = k["finger"][0]

# --- Was eine Bindung im deutschen OS-Layout tippt: (ohne Shift, mit Shift) ------------
HID = {
    "N1": ("1", "!"), "N2": ("2", '"'), "N3": ("3", "§"), "N4": ("4", "$"), "N5": ("5", "%"),
    "N6": ("6", "&"), "N7": ("7", "/"), "N8": ("8", "("), "N9": ("9", ")"), "N0": ("0", "="),
    "MINUS": ("ß", "?"), "EQUAL": ("´", "`"), "GRAVE": ("^", "°"), "LBKT": ("ü", "Ü"),
    "RBKT": ("+", "*"), "BSLH": ("#", "'"), "SEMI": ("ö", "Ö"), "SQT": ("ä", "Ä"),
    "COMMA": (",", ";"), "DOT": (".", ":"), "FSLH": ("-", "_"), "SPACE": (" ", " "),
}
for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    low = {"Y": "z", "Z": "y"}.get(ch, ch.lower())       # deutsches Layout: Y und Z getauscht
    HID[ch] = (low, low.upper())
    HID["DE_" + ch] = (ch.lower(), ch)
HID.update({
    "DE_A_UMLAUT": ("ä", "Ä"), "DE_O_UMLAUT": ("ö", "Ö"), "DE_U_UMLAUT": ("ü", "Ü"),
    "DE_SZ": ("ß", "?"), "DE_COMMA": (",", ";"), "DE_DOT": (".", ":"), "DE_LT": ("<", ">"),
})
SYMBOLS = {
    "DE_SUPER2": "²", "DE_SUPER3": "³", "DE_EURO": "€", "DE_MICRO": "µ", "DE_AT": "@",
    "DE_LBRC": "{", "DE_RBRC": "}", "DE_LBKT": "[", "DE_RBKT": "]", "DE_BSLH": "\\",
    "DE_PIPE": "|", "DE_TILDE": "~", "DE_MINUS": "-", "DE_UNDERSCORE": "_", "DE_CARET": "^",
    "DE_EXCL": "!", "DE_EQUAL": "=", "DE_AMPS": "&", "DE_SLASH": "/", "DE_STAR": "*",
    "DE_QMARK": "?", "DE_LPAR": "(", "DE_RPAR": ")", "DE_COLON": ":", "DE_HASH": "#",
    "DE_DLLR": "$", "DE_GRAVE": "`", "DE_PLUS": "+", "DE_PRCNT": "%", "DE_DQT": '"',
    "DE_SQT": "'", "DE_SEMI": ";", "DE_LT": "<", "DE_GT": ">",
}
DEAD = set("´`^~")       # Tottasten: erscheinen erst mit der nächsten Taste, kommen nicht in Übungen vor

NAMES = {
    "TAB": "Tab", "ESC": "Esc", "LSHFT": "Shift", "RSHFT": "Shift", "LCTRL": "Strg", "RCTRL": "Strg",
    "LALT": "Alt", "LGUI": "Win", "BSPC": "⌫", "DEL": "Entf", "HOME": "Pos1", "END": "Ende",
    "PG_UP": "Bild↑", "PG_DN": "Bild↓", "ENTER": "Enter", "SPACE": "Leer", "LEFT": "←", "RIGHT": "→",
    "UP": "↑", "DOWN": "↓", "PSCRN": "Druck", "CAPS": "Caps",
}


def key_code(b):
    """Tastencode einer Bindung, die beim Tippen ein Zeichen erzeugt (sonst None)."""
    p = b.split()
    if p[0] in ("&kp", "&sk") and len(p) == 2:
        return p[1]
    if p[0] == "&ebene_tap":          # tippen = Taste, halten = Ebene
        return p[2]
    return None


def name_of(b):
    """Beschriftung für Tasten ohne Zeichen."""
    p = b.split()
    code = key_code(b)
    if code in NAMES:
        return NAMES[code]
    if p[0] == "&sk":
        return "Shift"
    if p[0] == "&mo":
        return {"FN": "Fn", "MOD": "Mod", "SYMBOL": "Sym"}.get(p[1], p[1])
    if p[0] == "&tog":
        return {"KEYPAD": "Kp", "MAUS": "Maus"}.get(p[1], p[1])
    if p[0] == "&alt_tab":
        return "Alt-Tab"
    return ""


def layout(letters):
    """letters: Ebene, die über der Basis liegt (Bone) oder None."""
    base = [b if not letters or letters[i] == "&trans" else letters[i]
            for i, b in enumerate(layers["default_layer"])]
    labels, chars = [], {}

    def offer(ch, entry, cost):
        if ch and ch not in DEAD and (ch not in chars or cost < chars[ch]["cost"]):
            chars[ch] = dict(entry, cost=cost)

    for i, b in enumerate(base):
        code = key_code(b)
        lab = {"name": name_of(b)}
        if code in HID:
            low, up = HID[code]
            lab = {"base": low, "shift": up if up != low.upper() or not low.isalpha() else ""}
            if code == "SPACE":
                lab = {"name": "Leer"}
            shift_key = 59 if keys[i]["hand"] == "l" else 46     # Shift mit der anderen Hand
            offer(low, {"key": i}, 1)
            if up != low:
                offer(up, {"key": i, "shift": shift_key}, 2)
        sym = layers["symbol"][i]
        sc = key_code(sym) if sym != "&trans" else None
        if sc in SYMBOLS:
            lab["sym"] = SYMBOLS[sc]
            hold = 34 if keys[i]["hand"] == "r" else 39          # Macro2 links / Macro4 rechts
            offer(SYMBOLS[sc], {"key": i, "hold": hold}, 1.5)   # Symbol-Ebene vor Shift + Zahlenreihe
        labels.append(lab)
    for e in chars.values():
        del e["cost"]
    return {"labels": labels, "chars": chars}


data = {
    "keys": keys,
    "layouts": {"qwertz": layout(None), "bone": layout(layers["bone"])},
    "special": {"shiftLeft": 46, "shiftRight": 59, "macro2": 34, "macro4": 39},
    "exported": time.strftime("%Y-%m-%d"),
}
with open(OUT, "w", encoding="utf-8") as f:
    f.write("// Erzeugt von tools/export_layouts.py aus der Adv360-Keymap – nicht von Hand ändern.\n")
    f.write("window.ADV360 = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
for name, lay in data["layouts"].items():
    letters = "".join(sorted(c for c in lay["chars"] if c.isalpha()))
    print(f"{name}: {len(lay['chars'])} Zeichen, Buchstaben: {letters}")
print("geschrieben:", os.path.normpath(OUT))

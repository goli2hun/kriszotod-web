# ÖTÖDÖLŐ WEB

Egyszerű, modern webes öt-amőba játék két váltható designnal.

## Stack

- FastAPI
- SQLite
- HTML / CSS / JavaScript
- Nginx reverse proxy
- systemd

A frontend szándékosan nem használ frameworköt és jelenleg Three.js-t sem. A Three.js később opcionálisan bevethető látványeffektekhez, de a jelenlegi UI-hoz felesleges lenne.

## Funkciók

- 10×10 tábla
- helyi 2 játékos
- piros / kék felváltva
- 5 egymás mellett = győzelem
- új játék
- játékmenet mentése SQLite-ba
- két design: Midnight és Ivory
- designváltás egy gombbal, localStorage megjegyzéssel
- hover korong-preview
- aktív játékos vizuális kiemelése
- győztes sor animált kiemelése
- animált győzelmi modal

Telepítéshez lásd: `INSTALL.md`.

## v0.2 UI frissítés

- Teljes Midnight / Ivory designváltás egyetlen gombbal.
- A kiválasztott design localStorage-ban megmarad.
- A világos Ivory téma melegebb, fa-hatású táblát kapott.
- Hover korong-preview az aktuális játékos színével.
- Kompaktabb fejléc és finomított reszponzív elrendezés.

## v0.3 győzelmi visszajelzés

- Az aktuális játékos kártyája automatikusan kiemelődik.
- Győzelemkor a teljes összefüggő nyertes vonal arany fényt kap.
- A nyertes korongok pulzáló animációt kapnak.
- A győzelmi modal rövid késleltetéssel jelenik meg, így előbb látható a nyertes sor.
- A modal megjelenése animált.
- Játék vége után további lépés nem küldhető.

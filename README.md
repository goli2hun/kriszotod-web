# ÖTÖDÖLŐ WEB

Egyszerű, modern webes öt-amőba játék két váltható designnal.

## Stack

- FastAPI
- SQLite
- HTML / CSS / JavaScript
- Nginx reverse proxy
- systemd

A v0.1 szándékosan nem használ frameworköt a frontendhez és nem használ Three.js-t. A Three.js később opcionálisan bevethető látványeffektekhez, de a jelenlegi UI-hoz felesleges lenne.

## Funkciók

- 10×10 tábla
- helyi 2 játékos
- piros / kék felváltva
- 5 egymás mellett = győzelem
- új játék
- játékmenet mentése SQLite-ba
- két design: Midnight és Ivory
- designváltás egy gombbal, localStorage megjegyzéssel

Telepítéshez lásd: `INSTALL.md`.


## v0.2 UI frissítés

- Teljes Midnight / Ivory designváltás egyetlen gombbal.
- A kiválasztott design localStorage-ban megmarad.
- A világos Ivory téma melegebb, fa-hatású táblát kapott.
- Hover korong-preview az aktuális játékos színével.
- Kompaktabb fejléc és finomított reszponzív elrendezés.

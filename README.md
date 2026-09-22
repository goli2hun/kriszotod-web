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
- SQLite-alapú felhasználók és sessionök
- HttpOnly cookie-s bejelentkezés
- kijelentkezés után visszatérés a login képernyőre
- a játék API csak bejelentkezve használható
- egyedi piros női és kék férfi játékosportré
- finomított korong-lerakási animáció és hibás mező visszajelzés
- procedurális Web Audio hangok külső hangfájl nélkül
- hang be/ki kapcsoló localStorage megjegyzéssel

Telepítéshez lásd: `INSTALL.md`.

## Felhasználó létrehozása

A webes felületen nincs nyitott regisztráció. Felhasználót parancssorból lehet létrehozni:

```bash
python -m app.create_user krisz
```

A program kétszer bekéri a jelszót. Minimum 8 karakter szükséges.

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

## v0.4 login

- Modern, külön login képernyő.
- Felhasználók SQLite-ban.
- Jelszavak PBKDF2-SHA256 hash formában, egyedi salt-tal tárolódnak.
- Session token HttpOnly cookie-ban.
- A session token hash-elve kerül az adatbázisba.
- 30 napos session.
- Sikeres belépés után azonnal indul a játék.
- Nincs külön Adri/Krisz játékosválasztó.
- A játszmák a bejelentkezett felhasználóhoz kapcsolódnak.

## v0.5 presentation pack

- A P/K monogramok helyett saját SVG játékosportrék jelennek meg.
- Az aktív játékos portréja és kártyája erősebben kiemelődik.
- A korong lerakása puhább, rugózó animációt kapott.
- Foglalt mezőre kattintáskor vizuális és hangos hibajelzés jelenik meg.
- Külön hang van a piros és kék korong lerakásához.
- Rövid győzelmi fanfár került a játékba.
- A UI gombok finom kattintási hangot kapnak.
- A hang a jobb felső gombbal némítható, az állapot megmarad újratöltés után.
- A hangok Web Audio API-val készülnek, ezért nincs külön audio asset vagy licencfüggőség.

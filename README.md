# ÖTÖDÖLŐ WEB

Modern, böngészős öt-amőba játék FastAPI + SQLite backenddel és vanilla HTML/CSS/JavaScript frontenddel.

## Stack

- FastAPI
- SQLite
- HTML / CSS / JavaScript
- Nginx reverse proxy
- systemd

A frontend szándékosan nem használ frameworköt. A játéklogika és az AI is helyben fut; nincs LLM, külső AI API vagy nagy új dependency.

## Aktuális állapot

A **v0.6** verzió 2026-09-22-én elkészült, helyi Windows környezetben automata tesztekkel ellenőrzött, majd VPS-re is telepített állapotba került.

Ellenőrzött teszteredmény:

```text
Ran 8 tests in 1.382s
OK
```

A tesztek lefedik az AI alapviselkedését, az azonnali nyerés/blokkolás felismerését, az üres mező választását, a PvP matchmakinget, a soron kívüli lépés tiltását, a bot automatikus válaszlépését és a várakozó parti megszakítását.

A Windows alatt jelentkező SQLite temp-adatbázis zárolási hibát a központi adatbázis-context manager javítása oldotta meg; a kapcsolat minden használat után garantáltan bezáródik.

## Funkciók

- 10×10 tábla
- 5 egymás mellett = győzelem
- bejelentkezés SQLite-alapú felhasználókkal
- HttpOnly session cookie
- játékmód-választó belépés után
- online kétjátékos mód: Krisz és Adri külön böngészőből / eszközről játszhat
- mindkét felhasználó indíthat kétjátékos partit; az első vár, a második automatikusan csatlakozik
- szerveroldali kör- és lépésellenőrzés
- aktív vagy várakozó parti visszaállítása oldalfrissítés után
- AI ellenfél három nehézséggel: Könnyű / Normál / Nehéz
- a bot felismeri az azonnali nyerést és a veszélyes ellenfél-lépéseket
- a Normál bot erős heurisztikát használ, de nem verhetetlen
- a Nehéz bot az ellenfél legerősebb következő válaszát is figyelembe veszi
- a Könnyű bot több véletlent és szándékos pontatlanságot kap
- játékmenet mentése SQLite-ba
- Midnight / Ivory design
- hover korong-preview
- játékosportrék
- korong-lerakási és győzelmi animációk
- procedurális Web Audio hangok
- hang be/ki kapcsoló

Telepítéshez lásd: `INSTALL.md`.

## Felhasználók létrehozása

A webes felületen nincs nyitott regisztráció. Krisz és Adri külön felhasználóként jelentkezik be:

```bash
python -m app.create_user krisz
python -m app.create_user adri
```

A program kétszer bekéri a jelszót. Minimum 8 karakter szükséges.

## v0.2 UI frissítés

- Midnight / Ivory designváltás.
- A kiválasztott design localStorage-ban megmarad.
- Hover korong-preview.
- Reszponzív elrendezés.

## v0.3 győzelmi visszajelzés

- Aktuális játékos kiemelése.
- Nyertes vonal arany kiemelése.
- Pulzáló nyertes korongok.
- Animált győzelmi modal.
- Játék vége után további lépés nem küldhető.

## v0.4 login

- Külön login képernyő.
- PBKDF2-SHA256 jelszóhash egyedi salt-tal.
- Session token HttpOnly cookie-ban.
- A session token hash-elve kerül az adatbázisba.
- 30 napos session.

## v0.5 presentation pack

- Saját SVG játékosportrék.
- Finomított koronganimációk.
- Hibás mező visszajelzés.
- Procedurális játékhangok és győzelmi fanfár.
- Hangkapcsoló localStorage megjegyzéssel.

## v0.6 AI + kétjátékos mód

- Belépés után játékmód-választó.
- Krisz és Adri valódi, külön sessionös online játékosként csatlakozik ugyanabba a partiba.
- Az elsőként kétjátékos módot választó fél várólistára kerül; a második automatikusan becsatlakozik.
- Mindkét fél kezdeményezheti a partit.
- 850 ms-os kliensoldali állapotfrissítés a másik játékos lépéseihez.
- Szerveroldali soron-kívüli lépésvédelem.
- AI ellenfél: Könnyű / Normál / Nehéz.
- Az AI nem használ külső szolgáltatást és nem növeli a production dependency-k számát.
- Folyó parti visszaállítása oldalfrissítés után.
- Automata tesztek az AI-ra és a multiplayer API-folyamatra.
- Windows-kompatibilis SQLite kapcsolatlezárás.
- VPS deployment ellenőrizve.

## Következő vizuális fejlesztési irány

A működő játékmenet után a következő kör célja nem teljes redesign, hanem finom, modern látványjavítás:

- GSAP-alapú UI és korong animációk
- aktív játékos finom fény/glow kiemelése
- bot „gondolkodik” állapot látványosabb visszajelzése
- győztes ötösön végigfutó fénycsík
- rövid, visszafogott particle effekt győzelemkor
- finom háttérmozgás / parallax
- opcionálisan PixiJS csak a táblához és effektekhez, ha a CSS/GSAP már kevés

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

Az aktuális **v0.9.18** a KriszGame mintájára egy közös webes belépést és külön lobby-játékosazonosságot használ.

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
- egy közös SQLite-alapú webes belépési account
- lobbyban külön Krisz / Adri / Alíz játékos-identitás
- HttpOnly session cookie
- játékmód-választó belépés után
- online kétjátékos mód: Krisz, Adri és Alíz közül bármely két külön játékos játszhat külön böngészőből / eszközről
- mindkét felhasználó indíthat kétjátékos partit; az első vár, a második automatikusan csatlakozik
- szerveroldali kör- és lépésellenőrzés
- aktív vagy várakozó parti visszaállítása oldalfrissítés után
- AI ellenfél három nehézséggel: Könnyű / Normál / Nehéz
- a bot felismeri az azonnali nyerést és a veszélyes ellenfél-lépéseket
- a Normál bot erős heurisztikát használ, de nem verhetetlen
- a Nehéz bot az ellenfél legerősebb következő válaszát is figyelembe veszi
- a Könnyű bot több véletlent és szándékos pontatlanságot kap
- játékmenet mentése SQLite-ba
- egységes világos / Ivory design
- hover korong-preview
- játékosportrék
- korong-lerakási és győzelmi animációk
- procedurális Web Audio hangok
- hang be/ki kapcsoló
- teljes képernyős login és játéknézet
- saját login háttérgrafika és visszafogott lobby háttér
- animált, az ötös irányát követő győzelmi áthúzás
- kb. 2 másodperccel késleltetett eredménydialógus
- nyertes játékos avatárja az eredménydialógusban

Telepítéshez lásd: `INSTALL.md`.

## Felhasználók létrehozása

A webes felületen nincs nyitott regisztráció. Egyetlen közös belépési account szükséges:

```bash
python -m app.create_user kriszotod
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

## v0.7 Visual Pack

A v0.7 a működő játékmenet megtartása mellett modern, visszafogott látványréteget ad a játékhoz.

- GSAP 3.15 core CDN-ről, külön plugin nélkül
- külön `visual.js` és `visual.css`, hogy a játékmenet és a prezentáció szétváljon
- finom képernyő- és kártyabelépési animációk
- animált aktív játékosváltás
- látványosabb BOT GONDOLKODIK állapot
- utolsó lépés tartós, finom kiemelése
- korong lerakásakor rövid fény- és részecskeeffekt
- a győztes ötös szekvenciális fénykiemelése
- rövid, visszafogott győzelmi particle burst
- lassan mozgó háttérfények
- Krisz / Adri és Krisz / Bot matchup vizuál a játékmód-választón
- `prefers-reduced-motion` támogatás
- CSS fallback: ha a GSAP CDN nem érhető el, az alap animációk továbbra is működnek
- frontend smoke teszt a Visual Pack bekötésére

PixiJS továbbra sincs a projektben; csak akkor kerülne be, ha egy későbbi körben valódi WebGL/shader alapú táblaeffektekre lenne szükség.

## Következő fejlesztési irányok

- eredmény / győzelemszámláló
- játékstatisztika
- visszajátszás
- WebSocket a PvP polling későbbi kiváltására
- opcionális PixiJS kísérlet, ha a GSAP + CSS vizuális réteg már kevés


## v0.8 – KriszGame-szerű login és lobby

- Egyetlen közös webes account; Krisz és Adri nem külön login-user.
- Belépés után lobby jelenik meg, ahol a session Krisz vagy Adri identitást foglal.
- Ugyanaz az identitás egyszerre nem foglalható le két aktív sessionből.
- Játékosválasztás után PvP vagy AI választható.
- PvP-ben a várakozás és a 850 ms-os állapotfrissítés megmaradt.
- AI-ban továbbra is Könnyű / Normál / Nehéz fokozat használható.
- A Visual Pack és az alap játékmenet változatlan maradt.
- A meglévő SQLite adatbázist az induláskori migráció bővíti, törlés nem szükséges.


## v0.9.1 – Három játékos és parti lezárása

- A lobbyban már Krisz, Adri és Alíz identitás is választható.
- Ugyanaz az identitás továbbra sem foglalható le két aktív sessionből.
- PvP-ben a három családi játékos közül bármely két külön identitás összepárosítható.
- A játékoldali Kijelentkezés helyét a **JÁTÉK BEFEJEZÉSE** vette át.
- A JÁTÉK BEFEJEZÉSE lezárja az aktuális partit, de a közös webes sessiont nem bontja; a játékos visszatér a lobbyba.
- PvP-ben a másik fél kliensét a polling visszavezeti a lobbyba, ha az ellenfél lezárta a partit.
- Az **ÚJ JÁTÉK** gomb kikerült a játékoldalról; befejezett parti után **VISSZA A LOBBYBA** jelenik meg.
- A frontend API-hibakezelés olvasható üzenetet készít a FastAPI strukturált validációs hibáiból is.
- A statikus frontend assetek verziózott URL-t használnak (jelenleg **v0.9.1**), így release után a böngésző nem tartja bent a régi JS/CSS/kép asseteket.


## v0.9.2–v0.9.16 – UI, teljes képernyő és győzelmi élmény

- A nyertes öt korongot fénylő arany vonal húzza át; a vonal az ötös tényleges irányát követi vízszintesen, függőlegesen és mindkét átlóban.
- A vonalrajzolás külön CSS animáció, így nem ütközik a GSAP koronganimációival.
- A győzelmi dialógus kb. 2 másodperc késleltetéssel jelenik meg.
- Az eredménydialóguson: **ÚJ JÁTÉK**, alatta **VISSZA A LOBBYBA**. Az új játék megtartja az előző módot és AI esetén a nehézséget.
- A dialógus megjeleníti a nyertes tényleges profilképét/avatárját; döntetlennél nincs nyertes-avatar.
- A modal rétegezése javítva lett a teljes képernyős játéknézet fölött, a visual.css felülírását is megszüntetve.
- A login az `assets/images/loginscreen.png` hátteret használja; az `assets/` könyvtárat a FastAPI `/assets` útvonalon szolgálja ki.
- A login nézet teljes képernyős.
- A lobby visszafogott háttérgrafikát és áttetszőbb panelt kapott; a jelenlegi lobby elrendezést stabilnak tekintjük.
- A játéknézet teljes képernyős, a 10×10-es tábla a viewport magasságához igazodik.
- A Midnight / Ivory témaváltó megszűnt. Most kizárólag a világos **Ivory** profil használatos; a korábbi témaérték törlődik a localStorage-ból.
- A hangkapcsoló megmaradt.
- A frontend asset cache-busting verziója jelenleg **v0.9.18**.

### Jelenlegi képernyőfolyam

`Login → Lobby / játékos-identitás → PvP vagy BOT → Játék → győzelmi animáció → eredménydialógus → Új játék vagy Lobby`

A lobby játékos-identitásai: **Krisz, Adri, Alíz**. BOT módban a BOT külön cicás avatárt használ.


## v0.9.17–v0.9.18 – Aktív játékos és session-javítások

- A játék közbeni **JÁTÉK BEFEJEZÉSE** gomb kikerült a felületről; a hozzá tartozó kliensoldali kezelő is megszűnt.
- A soron következő játékost most az avatar vastag, játékosszínű kerete és finom kiemelése jelzi; a keret automatikusan vált a körrel.
- A login mezőinek **FELHASZNÁLÓNÉV** és **JELSZÓ** felirata fehér, enyhe árnyékkal, hogy az áttetsző panelen mindig olvasható legyen.
- A lobby-identitások foglalása heartbeat-alapú. A böngésző 20 másodpercenként életjelet küld, és egy másik session csak akkor blokkolja az identitást, ha az utolsó aktivitása 60 másodpercen belüli.
- A régi, szabályosan el nem engedett, de inaktív sessionök ezért nem foglalják 30 napig Krisz / Adri / Alíz identitását.
- Valóban aktív másik session esetén a felhasználó megerősítéssel **átveheti az identitást ezen az eszközön**. Az átvétel a korábbi session játékosfoglalását elengedi, de magát a webes sessiont nem törli.
- Az adatbázis `sessions.last_seen_at` mezővel bővült; az induláskori migráció automatikusan hozzáadja a meglévő SQLite adatbázishoz.


## v0.9.21–v0.9.22 – Konfigurálható tábla és korai döntetlen

- A tábla mérete központi `app/config.py` fájlból állítható, külön `BOARD_WIDTH` és `BOARD_HEIGHT` értékkel. Jelenlegi alapérték: **15×15**; a győzelmi hossz `WIN_LENGTH = 5`.
- A backend, lépésvalidáció, győzelemvizsgálat, BOT/AI, frontend cellagenerálás, koordináták és CSS grid a konfigurált méretet használja.
- Minden érvényes lépés után, ha nincs győztes, a backend ellenőrzi az összes `WIN_LENGTH` hosszú vízszintes, függőleges és átlós szakaszt.
- Ha egyik játékosnak sem maradt olyan szakasz, amely kizárólag saját kövekből és üres mezőkből áll, a parti **azonnal döntetlennel lezárul**; nem szükséges megvárni a tábla megtelését.
- A döntetlen eredménydialógusban **mindkét játékos profilképe** megjelenik egymás mellett, a fő eredmény pedig **DÖNTETLEN**.
- A döntetlen magyarázó felirata: **NINCS TÖBB LEHETSÉGES ÖTÖS**.
- Aktuális frontend asset-verzió: **v0.9.22**.

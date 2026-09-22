# KRISZOTOD – telepítési útmutató

Cél domain: `kriszotod.duckdns.org`

## 1. Helyi futtatás Windows alatt

A projekt gyökerében:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

A két játékos létrehozása:

```powershell
python -m app.create_user krisz
python -m app.create_user adri
```

A parancsok kétszer bekérik a jelszót. A jelszó minimum 8 karakter.

Indítás helyben:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

Böngésző:

```text
http://127.0.0.1:8020
```

Sikeres bejelentkezés után a játékmód-választó jelenik meg. Kétjátékos módnál az első játékos várakozik, a második külön bejelentkezéssel automatikusan csatlakozik ugyanahhoz a partihoz.

### Fejlesztői tesztek

A production dependency-lista szándékosan kicsi marad. A tesztekhez külön:

```powershell
python -m pip install -r requirements-dev.txt
python -m unittest -v
```

---

## 2. Linux/macOS helyi futtatás

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m app.create_user krisz
python -m app.create_user adri
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

---

## 3. Telepítés Ubuntu 24.04 szerverre

A szerveren az Ötödölő dedikált belső portja: `8030`.

```bash
sudo mkdir -p /opt/kriszotod
sudo chown -R $USER:$USER /opt/kriszotod

git clone https://github.com/goli2hun/kriszotod-web.git /opt/kriszotod
cd /opt/kriszotod
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

A két belépési felhasználó, ha még nem létezik:

```bash
python -m app.create_user krisz
python -m app.create_user adri
```

Tesztindítás:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8030
```

Másik terminálból:

```bash
curl http://127.0.0.1:8030/api/health
```

Elvárt válasz:

```json
{"status":"ok"}
```

---

## 4. systemd service

```bash
sudo cp deploy/systemd/kriszotod.service /etc/systemd/system/kriszotod.service
sudo chown -R www-data:www-data /opt/kriszotod
sudo systemctl daemon-reload
sudo systemctl enable --now kriszotod
```

Ellenőrzés:

```bash
sudo systemctl status kriszotod
journalctl -u kriszotod -f
```

A backend a szerveren csak ezen figyel:

```text
127.0.0.1:8030
```

---

## 5. Nginx és HTTPS

A meglévő Nginx konfiguráció használható. A DuckDNS rekord mutasson a VPS publikus IP-címére:

```text
kriszotod.duckdns.org -> VPS IP
```

Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d kriszotod.duckdns.org
```

A bejelentkezési cookie HTTPS alatt automatikusan Secure flaget kap.

---

## 6. Adatbázis

A rendszer sima SQLite-ot használ, ORM nélkül.

```text
/opt/kriszotod/otodolo.db
```

Táblák:

```text
users
sessions
games
moves
```

A v0.6 új játékmezőket ad a `games` táblához: játékosok, játékmód, bot-nehezség és következő játékos. Az alkalmazás induláskor a meglévő adatbázist automatikusan, adatvesztés nélkül kibővíti.

A jelszó nem kerül olvasható formában az adatbázisba. A rendszer PBKDF2-SHA256 hash-t és egyedi saltot használ. A session cookie HttpOnly, a szerveren csak a session token SHA-256 hash-e tárolódik.

---

## 7. Frissítés GitHubról

```bash
cd /opt/kriszotod
sudo systemctl stop kriszotod
sudo -u www-data git pull
sudo -u www-data .venv/bin/pip install -r requirements.txt
sudo systemctl start kriszotod
```

Az adatbázis-séma támogatott egyszerű migrációit az alkalmazás induláskor elvégzi.

---

## 8. v0.6 játékmódok

### Két játékos

1. Krisz vagy Adri belép és a **Két játékos** módot választja.
2. Ha még nincs ellenfél, váróképernyő jelenik meg.
3. A másik fél a saját felhasználójával belép és szintén a **Két játékos** módot választja.
4. A rendszer automatikusan összeköti őket.
5. A szerver ellenőrzi, hogy mindig csak a soron következő játékos léphessen.

A kezdeményező nem fix: Adri ugyanúgy indíthat partit, mint Krisz.

### Bot ellen

A belépett felhasználó három fokozat közül választhat:

- **Könnyű** – több véletlen, néha szándékosan nem a legerősebb védekezést választja.
- **Normál** – azonnali nyerés/blokkolás + kiegyensúlyozott heurisztika.
- **Nehéz** – az ellenfél következő legerősebb válaszát is értékeli.

A bot teljesen helyben fut a FastAPI alkalmazásban; nincs külső AI API vagy további production dependency.

---

## 9. Következő fejlesztési lépések

- modern vizuális finomítások és animációk
- statisztikai oldal
- játék-visszajátszás az SQLite lépésekből
- opcionálisan WebSocket a polling későbbi kiváltására

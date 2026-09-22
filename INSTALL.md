# KRISZOTOD – telepítési útmutató

Cél domain: `kriszotod.duckdns.org`

## 1. Helyi futtatás Windows alatt

A projekt gyökerében:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Az első belépési felhasználó létrehozása:

```powershell
python -m app.create_user krisz
```

A parancs kétszer bekéri a jelszót. A jelszó minimum 8 karakter.

Indítás helyben:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

Böngésző:

```text
http://127.0.0.1:8020
```

Sikeres bejelentkezés után a játék azonnal elindul.

---

## 2. Linux/macOS helyi futtatás

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m app.create_user krisz
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

---

## 3. Telepítés Ubuntu 24.04 szerverre

A szerveren az Ötödölő dedikált belső portja: `8030`.
A `8020` portot a `kriszgame` használja.

Példa célkönyvtár:

```bash
sudo mkdir -p /opt/kriszotod
sudo chown -R $USER:$USER /opt/kriszotod
```

Projekt letöltése:

```bash
git clone https://github.com/goli2hun/kriszotod-web.git /opt/kriszotod
cd /opt/kriszotod
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Első felhasználó:

```bash
python -m app.create_user krisz
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

A mellékelt service fájl:

```text
deploy/systemd/kriszotod.service
```

Másolás:

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

## 5. Nginx

Telepítés, ha még nincs:

```bash
sudo apt update
sudo apt install nginx
```

Konfiguráció:

```bash
sudo cp deploy/nginx/kriszotod.conf /etc/nginx/sites-available/kriszotod
sudo ln -s /etc/nginx/sites-available/kriszotod /etc/nginx/sites-enabled/kriszotod
sudo nginx -t
sudo systemctl reload nginx
```

A DuckDNS rekord mutasson a VPS publikus IP-címére:

```text
kriszotod.duckdns.org -> VPS IP
```

---

## 6. HTTPS – Let's Encrypt

Ubuntu alatt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d kriszotod.duckdns.org
```

Ellenőrzés:

```text
https://kriszotod.duckdns.org
```

A bejelentkezési cookie HTTPS alatt automatikusan Secure flaget kap.

---

## 7. Adatbázis

A rendszer sima SQLite-ot használ, ORM nélkül.

Fájl:

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

A jelszó nem kerül olvasható formában az adatbázisba. A rendszer PBKDF2-SHA256 hash-t és egyedi saltot használ. A session cookie HttpOnly, a szerveren pedig csak a session token SHA-256 hash-e tárolódik.

---

## 8. Új felhasználó hozzáadása

A virtuális környezetből:

```bash
cd /opt/kriszotod
source .venv/bin/activate
python -m app.create_user felhasznalonev
```

Nincs publikus regisztrációs oldal.

---

## 9. Frissítés GitHubról

```bash
cd /opt/kriszotod
sudo systemctl stop kriszotod
sudo -u www-data git pull
sudo -u www-data .venv/bin/pip install -r requirements.txt
sudo systemctl start kriszotod
```

Ha adatbázis-séma bővítés került a kódba, az alkalmazás induláskor elvégzi a támogatott egyszerű migrációkat.

---

## 10. Three.js

Jelenleg nincs használva, szándékosan.

Később érdemes lehet például:

- finom 3D korongdöntéshez,
- győzelmi részecskeeffekthez,
- háttérben mozgó absztrakt fényekhez,
- látványos menüátmenetekhez.

A játéktáblához és az alap UI-hoz a CSS gyorsabb és egyszerűbb.

---

## 11. Következő fejlesztési lépések

- valódi játékosportrék
- hangok
- statisztikai oldal
- játék-visszajátszás az SQLite lépésekből
- később AI ellenfél
- opcionálisan online kétjátékos mód

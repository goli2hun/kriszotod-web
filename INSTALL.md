# KRISZOTOD – telepítési útmutató

Cél domain: `kriszotod.duckdns.org`

## 1. Helyi futtatás Windows/Linux/macOS alatt

A projekt gyökerében:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

Linux/macOS:

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8020
```

Böngésző:

```text
http://127.0.0.1:8020
```

Az adatbázis első induláskor automatikusan létrejön `otodolo.db` néven.

---

## 2. Telepítés Ubuntu 24.04 szerverre

Példa célkönyvtár:

```bash
sudo mkdir -p /opt/kriszotod
sudo chown -R $USER:$USER /opt/kriszotod
```

Másold a projekt tartalmát ide, majd:

```bash
cd /opt/kriszotod
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Teszt:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8020
```

Másik terminálból:

```bash
curl http://127.0.0.1:8020/api/health
```

Elvárt válasz:

```json
{"status":"ok"}
```

---

## 3. systemd service

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
127.0.0.1:8020
```

---

## 4. Nginx

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

## 5. HTTPS – Let's Encrypt

Ubuntu alatt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d kriszotod.duckdns.org
```

Ellenőrzés:

```text
https://kriszotod.duckdns.org
```

A Certbot automatikus megújítása jellemzően systemd timerrel működik.

Teszt:

```bash
systemctl status certbot.timer
```

---

## 6. Adatbázis

A rendszer sima SQLite-ot használ, ORM nélkül.

Fájl:

```text
/opt/kriszotod/otodolo.db
```

Táblák:

```text
games
moves
```

A `games` tárolja a játszmák állapotát és győztesét, a `moves` pedig a lépéseket.

---

## 7. Frissítés később GitHubról

Ha elkészül a GitHub repo, tipikus frissítés:

```bash
cd /opt/kriszotod
sudo systemctl stop kriszotod
sudo -u www-data git pull
sudo -u www-data .venv/bin/pip install -r requirements.txt
sudo systemctl start kriszotod
```

---

## 8. Three.js

A v0.1-ben nincs használva, szándékosan.

Később érdemes lehet például:

- finom 3D korongdöntéshez,
- győzelmi részecskeeffekthez,
- háttérben mozgó absztrakt fényekhez,
- látványos menüátmenetekhez.

A játéktáblához és az alap UI-hoz a CSS gyorsabb és egyszerűbb.

---

## 9. Következő fejlesztési lépések

- valódi játékosportrék
- hover korong-preview
- győztes ötös kiemelése
- hangok
- statisztikai oldal
- játék-visszajátszás az SQLite lépésekből
- később AI ellenfél
- opcionálisan online kétjátékos mód

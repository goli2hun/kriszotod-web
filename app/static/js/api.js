async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function requestJson(url, options = {}, fallbackMessage = 'A kérés nem sikerült.') {
  const response = await fetch(url, options);
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.detail || fallbackMessage);
  }

  return data;
}

export async function getSession() {
  return requestJson('/api/auth/me', {}, 'Nem sikerült ellenőrizni a bejelentkezést.');
}

export async function login(username, password) {
  return requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }, 'A bejelentkezés nem sikerült.');
}

export async function logout() {
  return requestJson('/api/auth/logout', { method: 'POST' }, 'A kijelentkezés nem sikerült.');
}

export async function createGame(mode, difficulty = 'normal') {
  return requestJson('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, difficulty })
  }, 'Nem sikerült új játékot indítani.');
}

export async function getCurrentGame() {
  return requestJson('/api/games/current', {}, 'Nem sikerült lekérni az aktív játékot.');
}

export async function getGame(gameId) {
  return requestJson(`/api/games/${gameId}`, {}, 'Nem sikerült frissíteni a játékot.');
}

export async function cancelGame(gameId) {
  return requestJson(`/api/games/${gameId}`, { method: 'DELETE' }, 'Nem sikerült megszakítani a várakozást.');
}

export async function sendMove(gameId, row, col) {
  return requestJson(`/api/games/${gameId}/moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row, col })
  }, 'A lépés nem sikerült.');
}

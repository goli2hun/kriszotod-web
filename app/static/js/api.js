async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function getSession() {
  const response = await fetch('/api/auth/me');
  if (!response.ok) throw new Error('Nem sikerült ellenőrizni a bejelentkezést.');
  return response.json();
}

export async function login(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.detail || 'A bejelentkezés nem sikerült.');
  }

  return data;
}

export async function logout() {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('A kijelentkezés nem sikerült.');
  return response.json();
}

export async function createGame() {
  const response = await fetch('/api/games', { method: 'POST' });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.detail || 'Nem sikerült új játékot indítani.');
  }

  return data;
}

export async function sendMove(gameId, row, col) {
  const response = await fetch(`/api/games/${gameId}/moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row, col })
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.detail || 'A lépés nem sikerült.');
  }

  return data;
}

export async function createGame() {
  const response = await fetch('/api/games', { method: 'POST' });
  if (!response.ok) throw new Error('Nem sikerült új játékot indítani.');
  return response.json();
}

export async function sendMove(gameId, row, col) {
  const response = await fetch(`/api/games/${gameId}/moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row, col })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'A lépés nem sikerült.');
  }
  return response.json();
}

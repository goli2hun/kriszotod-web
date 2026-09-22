export const BOARD_SIZE = 10;

export function makeEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function playerName(player) {
  return player === 1 ? 'PIROS' : 'KÉK';
}

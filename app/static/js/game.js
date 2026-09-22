export const BOARD_SIZE = 10;

export function makeEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function playerName(player) {
  return player === 1 ? 'PIROS' : 'KÉK';
}

export function findWinningLine(board, row, col, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of directions) {
    const backward = collect(board, row, col, player, -dr, -dc).reverse();
    const forward = collect(board, row, col, player, dr, dc);
    const line = [...backward, [row, col], ...forward];

    if (line.length >= 5) {
      return line;
    }
  }

  return [];
}

function collect(board, row, col, player, dr, dc) {
  const cells = [];
  let r = row + dr;
  let c = col + dc;

  while (
    r >= 0 &&
    r < BOARD_SIZE &&
    c >= 0 &&
    c < BOARD_SIZE &&
    board[r][c] === player
  ) {
    cells.push([r, c]);
    r += dr;
    c += dc;
  }

  return cells;
}

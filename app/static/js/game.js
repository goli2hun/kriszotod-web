export let BOARD_WIDTH = 15;
export let BOARD_HEIGHT = 15;

export function setBoardSize(width, height) {
  BOARD_WIDTH = width;
  BOARD_HEIGHT = height;
}

export function makeEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
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
    r < BOARD_HEIGHT &&
    c >= 0 &&
    c < BOARD_WIDTH &&
    board[r][c] === player
  ) {
    cells.push([r, c]);
    r += dr;
    c += dc;
  }

  return cells;
}

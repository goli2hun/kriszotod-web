from __future__ import annotations

BOARD_SIZE = 10
WIN_LENGTH = 5


def is_winning_move(board: list[list[int]], row: int, col: int, player: int) -> bool:
    return any(
        _count_line(board, row, col, player, dr, dc) >= WIN_LENGTH
        for dr, dc in ((1, 0), (0, 1), (1, 1), (1, -1))
    )


def _count_line(
    board: list[list[int]], row: int, col: int, player: int, dr: int, dc: int
) -> int:
    return 1 + _count_one_way(board, row, col, player, dr, dc) + _count_one_way(
        board, row, col, player, -dr, -dc
    )


def _count_one_way(
    board: list[list[int]], row: int, col: int, player: int, dr: int, dc: int
) -> int:
    count = 0
    r, c = row + dr, col + dc
    while 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == player:
        count += 1
        r += dr
        c += dc
    return count

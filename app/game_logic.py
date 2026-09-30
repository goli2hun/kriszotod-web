from __future__ import annotations

from .config import BOARD_HEIGHT, BOARD_WIDTH, WIN_LENGTH


def is_winning_move(board: list[list[int]], row: int, col: int, player: int) -> bool:
    return any(
        _count_line(board, row, col, player, dr, dc) >= WIN_LENGTH
        for dr, dc in ((1, 0), (0, 1), (1, 1), (1, -1))
    )


def has_possible_winning_line(board: list[list[int]], player: int) -> bool:
    """Return True if at least one WIN_LENGTH segment can still belong to player."""
    directions = ((0, 1), (1, 0), (1, 1), (1, -1))
    for row in range(BOARD_HEIGHT):
        for col in range(BOARD_WIDTH):
            for dr, dc in directions:
                end_row = row + (WIN_LENGTH - 1) * dr
                end_col = col + (WIN_LENGTH - 1) * dc
                if not (0 <= end_row < BOARD_HEIGHT and 0 <= end_col < BOARD_WIDTH):
                    continue
                if all(board[row + step * dr][col + step * dc] in (0, player) for step in range(WIN_LENGTH)):
                    return True
    return False


def no_player_can_win(board: list[list[int]]) -> bool:
    return not has_possible_winning_line(board, 1) and not has_possible_winning_line(board, 2)


def is_board_full(board: list[list[int]]) -> bool:
    return all(cell != 0 for row in board for cell in row)


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
    while 0 <= r < BOARD_HEIGHT and 0 <= c < BOARD_WIDTH and board[r][c] == player:
        count += 1
        r += dr
        c += dc
    return count

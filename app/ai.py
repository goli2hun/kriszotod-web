from __future__ import annotations

import random
from collections.abc import Sequence

from .game_logic import BOARD_SIZE, is_winning_move

Difficulty = str
Move = tuple[int, int]


def choose_ai_move(
    board: list[list[int]],
    ai_player: int = 2,
    human_player: int = 1,
    difficulty: Difficulty = "normal",
    rng: random.Random | None = None,
) -> Move | None:
    """Choose a Gomoku-style move without external AI services.

    The levels intentionally have different personalities:
    - easy: understands tactics, but sometimes overlooks a block and adds more randomness;
    - normal: always handles one-move wins/blocks and uses a balanced heuristic;
    - hard: also estimates the opponent's best immediate reply.
    """
    rng = rng or random.Random()
    difficulty = difficulty if difficulty in {"easy", "normal", "hard"} else "normal"
    candidates = _candidate_moves(board)
    if not candidates:
        return None

    winning = [move for move in candidates if _wins_after_move(board, move, ai_player)]
    if winning:
        return _best_centered(winning, rng)

    threats = [move for move in candidates if _wins_after_move(board, move, human_player)]
    if threats:
        if difficulty != "easy" or rng.random() < 0.82:
            return _best_centered(threats, rng)

    ranked = _rank_moves(board, candidates, ai_player, human_player, difficulty, rng)
    if not ranked:
        return _best_centered(candidates, rng)

    if difficulty == "easy":
        pool = ranked[: min(8, len(ranked))]
        weights = [max(1.0, 9.0 - i) for i in range(len(pool))]
        return rng.choices([move for _, move in pool], weights=weights, k=1)[0]

    if difficulty == "normal":
        pool = ranked[: min(3, len(ranked))]
        weights = [0.68, 0.23, 0.09][: len(pool)]
        return rng.choices([move for _, move in pool], weights=weights, k=1)[0]

    return ranked[0][1]


def _rank_moves(
    board: list[list[int]],
    candidates: Sequence[Move],
    ai_player: int,
    human_player: int,
    difficulty: Difficulty,
    rng: random.Random,
) -> list[tuple[float, Move]]:
    defense_weight = {"easy": 0.72, "normal": 0.96, "hard": 1.08}[difficulty]
    noise = {"easy": 90.0, "normal": 14.0, "hard": 1.5}[difficulty]

    scored: list[tuple[float, Move]] = []
    for move in candidates:
        row, col = move
        attack = _potential_score(board, row, col, ai_player)
        defense = _potential_score(board, row, col, human_player)
        score = attack + defense * defense_weight + _center_bonus(row, col)
        score += rng.uniform(-noise, noise)
        scored.append((score, move))

    scored.sort(key=lambda item: item[0], reverse=True)

    if difficulty != "hard":
        return scored

    # Hard remains deliberately lightweight: only the strongest candidates are
    # evaluated against the opponent's strongest next response.
    refined: list[tuple[float, Move]] = []
    for base_score, move in scored[: min(14, len(scored))]:
        row, col = move
        board[row][col] = ai_player
        replies = _candidate_moves(board)
        worst_reply = 0.0
        for rr, cc in replies[: min(32, len(replies))]:
            reply_score = _potential_score(board, rr, cc, human_player)
            if _wins_after_move(board, (rr, cc), human_player):
                reply_score += 100_000
            worst_reply = max(worst_reply, reply_score)
        board[row][col] = 0
        refined.append((base_score - worst_reply * 0.78, move))

    refined.sort(key=lambda item: item[0], reverse=True)
    return refined


def _candidate_moves(board: list[list[int]], radius: int = 2) -> list[Move]:
    occupied = [
        (r, c)
        for r in range(BOARD_SIZE)
        for c in range(BOARD_SIZE)
        if board[r][c] != 0
    ]

    if not occupied:
        return [(4, 4), (4, 5), (5, 4), (5, 5)]

    candidates: set[Move] = set()
    for row, col in occupied:
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                r, c = row + dr, col + dc
                if (
                    0 <= r < BOARD_SIZE
                    and 0 <= c < BOARD_SIZE
                    and board[r][c] == 0
                ):
                    candidates.add((r, c))

    if not candidates:
        candidates = {
            (r, c)
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if board[r][c] == 0
        }

    return sorted(candidates, key=lambda move: -_center_bonus(*move))


def _wins_after_move(board: list[list[int]], move: Move, player: int) -> bool:
    row, col = move
    if board[row][col] != 0:
        return False
    board[row][col] = player
    won = is_winning_move(board, row, col, player)
    board[row][col] = 0
    return won


def _potential_score(board: list[list[int]], row: int, col: int, player: int) -> float:
    if board[row][col] != 0:
        return -1_000_000

    board[row][col] = player
    score = 0.0

    for dr, dc in ((1, 0), (0, 1), (1, 1), (1, -1)):
        left_count, left_open = _walk(board, row, col, player, -dr, -dc)
        right_count, right_open = _walk(board, row, col, player, dr, dc)
        count = 1 + left_count + right_count
        open_ends = int(left_open) + int(right_open)
        score += _line_value(count, open_ends)

    board[row][col] = 0
    return score


def _walk(
    board: list[list[int]], row: int, col: int, player: int, dr: int, dc: int
) -> tuple[int, bool]:
    count = 0
    r, c = row + dr, col + dc
    while 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == player:
        count += 1
        r += dr
        c += dc
    is_open = 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE and board[r][c] == 0
    return count, is_open


def _line_value(count: int, open_ends: int) -> float:
    if count >= 5:
        return 100_000
    if count == 4:
        return 14_000 if open_ends == 2 else 5_800 if open_ends == 1 else 800
    if count == 3:
        return 1_800 if open_ends == 2 else 620 if open_ends == 1 else 80
    if count == 2:
        return 230 if open_ends == 2 else 85 if open_ends == 1 else 18
    return 20 if open_ends == 2 else 8


def _center_bonus(row: int, col: int) -> float:
    center = (BOARD_SIZE - 1) / 2
    distance = abs(row - center) + abs(col - center)
    return max(0.0, 22.0 - distance * 2.4)


def _best_centered(moves: Sequence[Move], rng: random.Random) -> Move:
    best_score = max(_center_bonus(*move) for move in moves)
    best = [move for move in moves if _center_bonus(*move) == best_score]
    return rng.choice(best)

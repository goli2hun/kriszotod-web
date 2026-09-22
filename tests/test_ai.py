from __future__ import annotations

import random
import unittest

from app.ai import choose_ai_move
from app.game_logic import BOARD_SIZE


class AiTests(unittest.TestCase):
    def empty_board(self):
        return [[0 for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]

    def test_ai_finishes_immediate_win(self):
        board = self.empty_board()
        for col in range(2, 6):
            board[4][col] = 2

        move = choose_ai_move(board, difficulty="easy", rng=random.Random(1))
        self.assertIn(move, {(4, 1), (4, 6)})

    def test_normal_blocks_immediate_human_win(self):
        board = self.empty_board()
        for row in range(2, 6):
            board[row][5] = 1

        move = choose_ai_move(board, difficulty="normal", rng=random.Random(2))
        self.assertIn(move, {(1, 5), (6, 5)})

    def test_hard_blocks_immediate_human_win(self):
        board = self.empty_board()
        for i in range(4):
            board[2 + i][2 + i] = 1

        move = choose_ai_move(board, difficulty="hard", rng=random.Random(3))
        self.assertIn(move, {(1, 1), (6, 6)})

    def test_empty_board_starts_near_center(self):
        board = self.empty_board()
        move = choose_ai_move(board, difficulty="normal", rng=random.Random(4))
        self.assertIn(move, {(4, 4), (4, 5), (5, 4), (5, 5)})

    def test_ai_returns_only_empty_cell(self):
        board = self.empty_board()
        board[4][4] = 1
        board[5][5] = 2
        move = choose_ai_move(board, difficulty="normal", rng=random.Random(5))
        self.assertIsNotNone(move)
        row, col = move
        self.assertEqual(board[row][col], 0)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app import db
from app.auth import hash_password
from app.main import app


class ApiFlowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        db.DB_PATH = Path(self.tmp.name) / "test.db"
        db.init_db()
        self._create_user("krisz", "password123")
        self._create_user("adri", "password123")
        self.krisz = TestClient(app)
        self.adri = TestClient(app)
        self.assertEqual(self.krisz.post('/api/auth/login', json={'username':'krisz','password':'password123'}).status_code, 200)
        self.assertEqual(self.adri.post('/api/auth/login', json={'username':'adri','password':'password123'}).status_code, 200)

    def tearDown(self):
        self.krisz.close()
        self.adri.close()
        self.tmp.cleanup()

    def _create_user(self, username, password):
        salt, password_hash = hash_password(password)
        with db.connect() as conn:
            conn.execute(
                "INSERT INTO users(username,password_salt,password_hash) VALUES(?,?,?)",
                (username, salt, password_hash),
            )

    def test_pvp_matchmaking_and_turn_enforcement(self):
        first = self.krisz.post('/api/games', json={'mode':'pvp','difficulty':'normal'})
        self.assertEqual(first.status_code, 200)
        first_state = first.json()
        self.assertEqual(first_state['status'], 'waiting')
        self.assertEqual(first_state['player_number'], 1)

        second = self.adri.post('/api/games', json={'mode':'pvp','difficulty':'normal'})
        self.assertEqual(second.status_code, 200)
        second_state = second.json()
        self.assertEqual(second_state['game_id'], first_state['game_id'])
        self.assertEqual(second_state['status'], 'active')
        self.assertEqual(second_state['player_number'], 2)

        refreshed = self.krisz.get(f"/api/games/{first_state['game_id']}").json()
        self.assertEqual(refreshed['status'], 'active')
        self.assertEqual(refreshed['player2_name'].lower(), 'adri')

        out_of_turn = self.adri.post(f"/api/games/{first_state['game_id']}/moves", json={'row':4,'col':4})
        self.assertEqual(out_of_turn.status_code, 409)

        move1 = self.krisz.post(f"/api/games/{first_state['game_id']}/moves", json={'row':4,'col':4})
        self.assertEqual(move1.status_code, 200)
        self.assertEqual(move1.json()['next_player'], 2)

        move2 = self.adri.post(f"/api/games/{first_state['game_id']}/moves", json={'row':4,'col':5})
        self.assertEqual(move2.status_code, 200)
        self.assertEqual(move2.json()['next_player'], 1)
        self.assertEqual(len(move2.json()['moves']), 2)

    def test_ai_game_adds_bot_move(self):
        created = self.krisz.post('/api/games', json={'mode':'ai','difficulty':'normal'})
        self.assertEqual(created.status_code, 200)
        state = created.json()
        self.assertEqual(state['status'], 'active')
        self.assertEqual(state['player2_name'], 'BOT')

        moved = self.krisz.post(f"/api/games/{state['game_id']}/moves", json={'row':4,'col':4})
        self.assertEqual(moved.status_code, 200)
        result = moved.json()
        self.assertEqual(len(result['moves']), 2)
        self.assertEqual(result['moves'][0]['player'], 1)
        self.assertEqual(result['moves'][1]['player'], 2)
        self.assertEqual(result['next_player'], 1)
        self.assertNotEqual(
            (result['moves'][0]['row_idx'], result['moves'][0]['col_idx']),
            (result['moves'][1]['row_idx'], result['moves'][1]['col_idx']),
        )

    def test_waiting_game_can_be_cancelled(self):
        state = self.krisz.post('/api/games', json={'mode':'pvp','difficulty':'normal'}).json()
        response = self.krisz.delete(f"/api/games/{state['game_id']}")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(self.krisz.get('/api/games/current').json()['game'])


if __name__ == '__main__':
    unittest.main()

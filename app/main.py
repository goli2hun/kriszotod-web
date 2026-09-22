from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .ai import choose_ai_move
from .auth import (
    COOKIE_NAME,
    SESSION_MAX_AGE,
    create_session,
    delete_session,
    get_current_user,
    require_user,
    verify_password,
)
from .db import connect, init_db
from .game_logic import BOARD_SIZE, is_board_full, is_winning_move

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Krisz Ötödölő", version="0.6.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class GameCreateRequest(BaseModel):
    mode: Literal["pvp", "ai"]
    difficulty: Literal["easy", "normal", "hard"] = "normal"


class MoveRequest(BaseModel):
    row: int = Field(ge=0, lt=BOARD_SIZE)
    col: int = Field(ge=0, lt=BOARD_SIZE)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/me")
def auth_me(request: Request) -> dict[str, str | bool | None]:
    user = get_current_user(request)
    return {
        "authenticated": user is not None,
        "username": user["username"] if user is not None else None,
    }


@app.post("/api/auth/login")
def auth_login(payload: LoginRequest, request: Request, response: Response) -> dict[str, str]:
    username = payload.username.strip()

    with connect() as conn:
        user = conn.execute(
            """
            SELECT id, username, password_salt, password_hash
            FROM users
            WHERE username = ? COLLATE NOCASE
              AND active = 1
            """,
            (username,),
        ).fetchone()

    if user is None or not verify_password(
        payload.password,
        user["password_salt"],
        user["password_hash"],
    ):
        raise HTTPException(status_code=401, detail="Hibás felhasználónév vagy jelszó.")

    token = create_session(int(user["id"]))
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=_is_https(request),
        path="/",
    )

    return {"username": user["username"]}


@app.post("/api/auth/logout")
def auth_logout(request: Request, response: Response) -> dict[str, str]:
    delete_session(request.cookies.get(COOKIE_NAME))
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"status": "ok"}


@app.post("/api/games")
def create_game(payload: GameCreateRequest, request: Request) -> dict:
    user = require_user(request)
    user_id = int(user["id"])

    with connect() as conn:
        if payload.mode == "ai":
            cursor = conn.execute(
                """
                INSERT INTO games(
                    user_id, player1_user_id, player2_user_id,
                    mode, difficulty, status, next_player
                )
                VALUES (?, ?, NULL, 'ai', ?, 'active', 1)
                """,
                (user_id, user_id, payload.difficulty),
            )
            return _game_state(conn, int(cursor.lastrowid), user_id)

        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            """
            DELETE FROM games
            WHERE mode = 'pvp'
              AND status = 'waiting'
              AND player1_user_id = ?
            """,
            (user_id,),
        )

        waiting = conn.execute(
            """
            SELECT id
            FROM games
            WHERE mode = 'pvp'
              AND status = 'waiting'
              AND player2_user_id IS NULL
              AND player1_user_id <> ?
            ORDER BY id
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()

        if waiting is not None:
            game_id = int(waiting["id"])
            conn.execute(
                """
                UPDATE games
                SET player2_user_id = ?, status = 'active', next_player = 1
                WHERE id = ?
                  AND status = 'waiting'
                  AND player2_user_id IS NULL
                """,
                (user_id, game_id),
            )
        else:
            cursor = conn.execute(
                """
                INSERT INTO games(
                    user_id, player1_user_id, player2_user_id,
                    mode, difficulty, status, next_player
                )
                VALUES (?, ?, NULL, 'pvp', NULL, 'waiting', NULL)
                """,
                (user_id, user_id),
            )
            game_id = int(cursor.lastrowid)

        return _game_state(conn, game_id, user_id)


@app.get("/api/games/current")
def get_current_game(request: Request) -> dict:
    user = require_user(request)
    user_id = int(user["id"])

    with connect() as conn:
        game = conn.execute(
            """
            SELECT id
            FROM games
            WHERE status IN ('waiting', 'active')
              AND mode IN ('pvp', 'ai')
              AND (player1_user_id = ? OR player2_user_id = ?)
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id, user_id),
        ).fetchone()

        if game is None:
            return {"game": None}

        return {"game": _game_state(conn, int(game["id"]), user_id)}


@app.get("/api/games/{game_id}")
def get_game(game_id: int, request: Request) -> dict:
    user = require_user(request)
    user_id = int(user["id"])

    with connect() as conn:
        return _game_state(conn, game_id, user_id)


@app.delete("/api/games/{game_id}")
def cancel_waiting_game(game_id: int, request: Request) -> dict[str, str]:
    user = require_user(request)
    user_id = int(user["id"])

    with connect() as conn:
        game = conn.execute(
            "SELECT * FROM games WHERE id = ?",
            (game_id,),
        ).fetchone()

        if game is None or game["player1_user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Game not found")

        if game["status"] != "waiting":
            raise HTTPException(
                status_code=409,
                detail="A másik játékos már csatlakozott a partihoz.",
            )

        conn.execute("DELETE FROM games WHERE id = ?", (game_id,))

    return {"status": "cancelled"}


@app.post("/api/games/{game_id}/moves")
def make_move(game_id: int, move: MoveRequest, request: Request) -> dict:
    user = require_user(request)
    user_id = int(user["id"])

    with connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        game = _get_game_row_for_user(conn, game_id, user_id)

        if game["status"] != "active":
            raise HTTPException(status_code=409, detail="A játék még nem aktív vagy már véget ért.")

        moves = _get_moves(conn, game_id)
        board = _build_board(moves)
        next_player = int(game["next_player"] or (1 if len(moves) % 2 == 0 else 2))
        player_number = _player_number(game, user_id)

        if game["mode"] == "ai":
            if player_number != 1 or next_player != 1:
                raise HTTPException(status_code=409, detail="Most a bot következik.")
        elif player_number != next_player:
            raise HTTPException(status_code=409, detail="Most a másik játékos következik.")

        if board[move.row][move.col] != 0:
            raise HTTPException(status_code=409, detail="Cell already occupied")

        winner = _insert_move(
            conn,
            game_id,
            len(moves) + 1,
            next_player,
            move.row,
            move.col,
            board,
        )

        if winner:
            _finish_game(conn, game_id, winner)
            return _game_state(conn, game_id, user_id)

        if is_board_full(board):
            _finish_game(conn, game_id, None)
            return _game_state(conn, game_id, user_id)

        if game["mode"] == "ai":
            conn.execute("UPDATE games SET next_player = 2 WHERE id = ?", (game_id,))
            difficulty = game["difficulty"] or "normal"
            ai_move = choose_ai_move(board, 2, 1, difficulty)

            if ai_move is None:
                _finish_game(conn, game_id, None)
                return _game_state(conn, game_id, user_id)

            ai_row, ai_col = ai_move
            ai_winner = _insert_move(
                conn,
                game_id,
                len(moves) + 2,
                2,
                ai_row,
                ai_col,
                board,
            )

            if ai_winner:
                _finish_game(conn, game_id, 2)
            elif is_board_full(board):
                _finish_game(conn, game_id, None)
            else:
                conn.execute("UPDATE games SET next_player = 1 WHERE id = ?", (game_id,))
        else:
            conn.execute(
                "UPDATE games SET next_player = ? WHERE id = ?",
                (2 if next_player == 1 else 1, game_id),
            )

        return _game_state(conn, game_id, user_id)


def _get_game_row_for_user(conn, game_id: int, user_id: int):
    game = conn.execute(
        """
        SELECT *
        FROM games
        WHERE id = ?
          AND (player1_user_id = ? OR player2_user_id = ?)
        """,
        (game_id, user_id, user_id),
    ).fetchone()

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


def _player_number(game, user_id: int) -> int:
    if game["player1_user_id"] == user_id:
        return 1
    if game["player2_user_id"] == user_id:
        return 2
    raise HTTPException(status_code=403, detail="Ehhez a játékhoz nincs hozzáférésed.")


def _get_moves(conn, game_id: int):
    return conn.execute(
        """
        SELECT move_no, player, row_idx, col_idx
        FROM moves
        WHERE game_id = ?
        ORDER BY move_no
        """,
        (game_id,),
    ).fetchall()


def _build_board(moves) -> list[list[int]]:
    board = [[0 for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
    for saved in moves:
        board[saved["row_idx"]][saved["col_idx"]] = saved["player"]
    return board


def _insert_move(
    conn,
    game_id: int,
    move_no: int,
    player: int,
    row: int,
    col: int,
    board: list[list[int]],
) -> int | None:
    conn.execute(
        """
        INSERT INTO moves(game_id, move_no, player, row_idx, col_idx)
        VALUES (?, ?, ?, ?, ?)
        """,
        (game_id, move_no, player, row, col),
    )
    board[row][col] = player
    return player if is_winning_move(board, row, col, player) else None


def _finish_game(conn, game_id: int, winner: int | None) -> None:
    conn.execute(
        """
        UPDATE games
        SET status = 'finished',
            winner = ?,
            next_player = NULL,
            finished_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (winner, game_id),
    )


def _game_state(conn, game_id: int, user_id: int) -> dict:
    game = _get_game_row_for_user(conn, game_id, user_id)
    moves = _get_moves(conn, game_id)
    player_number = _player_number(game, user_id)

    player1 = conn.execute(
        "SELECT username FROM users WHERE id = ?",
        (game["player1_user_id"],),
    ).fetchone()
    player2 = None
    if game["player2_user_id"] is not None:
        player2 = conn.execute(
            "SELECT username FROM users WHERE id = ?",
            (game["player2_user_id"],),
        ).fetchone()

    player1_name = player1["username"] if player1 is not None else "Játékos 1"
    if game["mode"] == "ai":
        player2_name = "BOT"
    elif player2 is not None:
        player2_name = player2["username"]
    else:
        player2_name = "Várakozás…"

    return {
        "game_id": game_id,
        "mode": game["mode"],
        "difficulty": game["difficulty"],
        "status": game["status"],
        "winner": game["winner"],
        "next_player": game["next_player"],
        "player_number": player_number,
        "player1_name": player1_name,
        "player2_name": player2_name,
        "moves": [dict(move) for move in moves],
    }


def _is_https(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    return request.url.scheme == "https" or forwarded_proto.lower() == "https"

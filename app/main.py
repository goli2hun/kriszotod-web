from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

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
from .game_logic import BOARD_SIZE, is_winning_move

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Krisz Ötödölő", version="0.4.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class MoveRequest(BaseModel):
    row: int = Field(ge=0, lt=BOARD_SIZE)
    col: int = Field(ge=0, lt=BOARD_SIZE)


class MoveResponse(BaseModel):
    game_id: int
    player: int
    row: int
    col: int
    winner: int | None
    status: Literal["active", "finished"]
    next_player: int | None


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
def create_game(request: Request) -> dict[str, int | str]:
    user = require_user(request)

    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO games(user_id, status) VALUES (?, 'active')",
            (user["id"],),
        )
        game_id = int(cursor.lastrowid)

    return {"game_id": game_id, "status": "active", "next_player": 1}


@app.get("/api/games/{game_id}")
def get_game(game_id: int, request: Request) -> dict:
    user = require_user(request)

    with connect() as conn:
        game = conn.execute(
            "SELECT * FROM games WHERE id = ? AND user_id = ?",
            (game_id, user["id"]),
        ).fetchone()

        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        moves = conn.execute(
            """
            SELECT move_no, player, row_idx, col_idx
            FROM moves
            WHERE game_id = ?
            ORDER BY move_no
            """,
            (game_id,),
        ).fetchall()

    return {
        "game_id": game_id,
        "status": game["status"],
        "winner": game["winner"],
        "moves": [dict(m) for m in moves],
    }


@app.post("/api/games/{game_id}/moves", response_model=MoveResponse)
def make_move(game_id: int, move: MoveRequest, request: Request) -> MoveResponse:
    user = require_user(request)

    with connect() as conn:
        game = conn.execute(
            "SELECT * FROM games WHERE id = ? AND user_id = ?",
            (game_id, user["id"]),
        ).fetchone()

        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")

        if game["status"] != "active":
            raise HTTPException(status_code=409, detail="Game already finished")

        moves = conn.execute(
            """
            SELECT move_no, player, row_idx, col_idx
            FROM moves
            WHERE game_id = ?
            ORDER BY move_no
            """,
            (game_id,),
        ).fetchall()

        board = [[0 for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        for saved in moves:
            board[saved["row_idx"]][saved["col_idx"]] = saved["player"]

        if board[move.row][move.col] != 0:
            raise HTTPException(status_code=409, detail="Cell already occupied")

        player = 1 if len(moves) % 2 == 0 else 2
        move_no = len(moves) + 1
        board[move.row][move.col] = player

        try:
            conn.execute(
                """
                INSERT INTO moves(game_id, move_no, player, row_idx, col_idx)
                VALUES (?, ?, ?, ?, ?)
                """,
                (game_id, move_no, player, move.row, move.col),
            )
        except Exception as exc:
            raise HTTPException(status_code=409, detail="Move could not be saved") from exc

        winner = player if is_winning_move(board, move.row, move.col, player) else None
        status: Literal["active", "finished"] = "finished" if winner else "active"
        next_player = None if winner else (2 if player == 1 else 1)

        if winner:
            conn.execute(
                """
                UPDATE games
                SET status = 'finished',
                    winner = ?,
                    finished_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (winner, game_id),
            )

    return MoveResponse(
        game_id=game_id,
        player=player,
        row=move.row,
        col=move.col,
        winner=winner,
        status=status,
        next_player=next_player,
    )


def _is_https(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    return request.url.scheme == "https" or forwarded_proto.lower() == "https"

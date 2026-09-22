from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .db import connect, init_db
from .game_logic import BOARD_SIZE, is_winning_move

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Krisz Ötödölő", version="0.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


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


@app.post("/api/games")
def create_game() -> dict[str, int | str]:
    with connect() as conn:
        cursor = conn.execute("INSERT INTO games(status) VALUES ('active')")
        game_id = int(cursor.lastrowid)
    return {"game_id": game_id, "status": "active", "next_player": 1}


@app.get("/api/games/{game_id}")
def get_game(game_id: int) -> dict:
    with connect() as conn:
        game = conn.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")
        moves = conn.execute(
            "SELECT move_no, player, row_idx, col_idx FROM moves WHERE game_id = ? ORDER BY move_no",
            (game_id,),
        ).fetchall()

    return {
        "game_id": game_id,
        "status": game["status"],
        "winner": game["winner"],
        "moves": [dict(m) for m in moves],
    }


@app.post("/api/games/{game_id}/moves", response_model=MoveResponse)
def make_move(game_id: int, move: MoveRequest) -> MoveResponse:
    with connect() as conn:
        game = conn.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")
        if game["status"] != "active":
            raise HTTPException(status_code=409, detail="Game already finished")

        moves = conn.execute(
            "SELECT move_no, player, row_idx, col_idx FROM moves WHERE game_id = ? ORDER BY move_no",
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
                "INSERT INTO moves(game_id, move_no, player, row_idx, col_idx) VALUES (?, ?, ?, ?, ?)",
                (game_id, move_no, player, move.row, move.col),
            )
        except Exception as exc:
            raise HTTPException(status_code=409, detail="Move could not be saved") from exc

        winner = player if is_winning_move(board, move.row, move.col, player) else None
        status: Literal["active", "finished"] = "finished" if winner else "active"
        next_player = None if winner else (2 if player == 1 else 1)

        if winner:
            conn.execute(
                "UPDATE games SET status = 'finished', winner = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?",
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

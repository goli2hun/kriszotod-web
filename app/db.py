from __future__ import annotations

import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "otodolo.db"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                player1_user_id INTEGER,
                player2_user_id INTEGER,
                mode TEXT NOT NULL DEFAULT 'pvp',
                difficulty TEXT,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                finished_at TEXT,
                winner INTEGER,
                status TEXT NOT NULL DEFAULT 'waiting',
                next_player INTEGER
            );

            CREATE TABLE IF NOT EXISTS moves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                move_no INTEGER NOT NULL,
                player INTEGER NOT NULL,
                row_idx INTEGER NOT NULL,
                col_idx INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                UNIQUE(game_id, move_no),
                UNIQUE(game_id, row_idx, col_idx)
            );
            """
        )

        _ensure_column(conn, "games", "user_id", "INTEGER")
        _ensure_column(conn, "games", "player1_user_id", "INTEGER")
        _ensure_column(conn, "games", "player2_user_id", "INTEGER")
        _ensure_column(conn, "games", "mode", "TEXT")
        _ensure_column(conn, "games", "difficulty", "TEXT")
        _ensure_column(conn, "games", "next_player", "INTEGER")

        conn.execute(
            """
            UPDATE games
            SET player1_user_id = user_id
            WHERE player1_user_id IS NULL AND user_id IS NOT NULL
            """
        )
        conn.execute(
            """
            UPDATE games
            SET mode = 'legacy'
            WHERE mode IS NULL OR mode = ''
            """
        )

        conn.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_games_matchmaking
            ON games(mode, status, id);

            CREATE INDEX IF NOT EXISTS idx_games_player1
            ON games(player1_user_id, status, id);

            CREATE INDEX IF NOT EXISTS idx_games_player2
            ON games(player2_user_id, status, id);
            """
        )


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    if not _column_exists(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    return any(row["name"] == column for row in conn.execute(f"PRAGMA table_info({table})"))

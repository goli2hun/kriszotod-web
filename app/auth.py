from __future__ import annotations

import hashlib
import hmac
import secrets
import time

from fastapi import HTTPException, Request

from .db import connect

COOKIE_NAME = "otodolo_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30
PBKDF2_ITERATIONS = 240_000


def hash_password(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return salt.hex(), password_hash.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    _, calculated_hash_hex = hash_password(password, bytes.fromhex(salt_hex))
    return hmac.compare_digest(calculated_hash_hex, expected_hash_hex)


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    now = int(time.time())
    expires_at = now + SESSION_MAX_AGE

    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
        conn.execute(
            """
            INSERT INTO sessions(token_hash, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (token_hash, user_id, now, expires_at),
        )

    return token


def delete_session(token: str | None) -> None:
    if not token:
        return

    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))


def get_current_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None

    now = int(time.time())

    with connect() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.username
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
              AND sessions.expires_at > ?
              AND users.active = 1
            """,
            (_hash_token(token), now),
        ).fetchone()

        if row is None:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))

    return row


def require_user(request: Request):
    user = get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Bejelentkezés szükséges.")
    return user


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

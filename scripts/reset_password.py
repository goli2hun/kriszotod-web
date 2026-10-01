#!/usr/bin/env python3
"""Meglévő Ötödölő felhasználó jelszavának biztonságos módosítása."""

from __future__ import annotations

import argparse
import getpass

from app.auth import hash_password
from app.db import connect, init_db


def main() -> None:
    parser = argparse.ArgumentParser(description="Ötödölő jelszó módosítása")
    parser.add_argument("username", help="A meglévő bejelentkezési név")
    args = parser.parse_args()

    username = args.username.strip()
    if not username:
        raise SystemExit("A felhasználónév nem lehet üres.")

    init_db()

    with connect() as conn:
        user = conn.execute(
            "SELECT id, username FROM users WHERE username = ? COLLATE NOCASE",
            (username,),
        ).fetchone()

    if user is None:
        raise SystemExit(f"Nincs ilyen felhasználó: {username}")

    password = getpass.getpass("Új jelszó: ")
    password_again = getpass.getpass("Új jelszó újra: ")

    if password != password_again:
        raise SystemExit("A két jelszó nem egyezik.")

    if len(password) < 8:
        raise SystemExit("A jelszó legyen legalább 8 karakter.")

    salt, password_hash = hash_password(password)

    with connect() as conn:
        conn.execute(
            """
            UPDATE users
            SET password_salt = ?, password_hash = ?
            WHERE id = ?
            """,
            (salt, password_hash, user["id"]),
        )
        # A régi belépések érvénytelenítése biztonságosabb jelszócsere után.
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))

    print(f"Jelszó sikeresen módosítva: {user['username']}")
    print("A felhasználó korábbi sessionjei kijelentkeztetésre kerültek.")


if __name__ == "__main__":
    main()

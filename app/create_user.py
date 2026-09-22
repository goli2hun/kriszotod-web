from __future__ import annotations

import argparse
import getpass
import sqlite3

from .auth import hash_password
from .db import connect, init_db


def main() -> None:
    parser = argparse.ArgumentParser(description="Ötödölő felhasználó létrehozása")
    parser.add_argument("username", help="Bejelentkezési név")
    args = parser.parse_args()

    username = args.username.strip()
    if not username:
        raise SystemExit("A felhasználónév nem lehet üres.")

    password = getpass.getpass("Jelszó: ")
    password_again = getpass.getpass("Jelszó újra: ")

    if password != password_again:
        raise SystemExit("A két jelszó nem egyezik.")

    if len(password) < 8:
        raise SystemExit("A jelszó legyen legalább 8 karakter.")

    salt, password_hash = hash_password(password)

    init_db()

    try:
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO users(username, password_salt, password_hash)
                VALUES (?, ?, ?)
                """,
                (username, salt, password_hash),
            )
    except sqlite3.IntegrityError as exc:
        raise SystemExit(f"Már létezik ilyen felhasználó: {username}") from exc

    print(f"Felhasználó létrehozva: {username}")


if __name__ == "__main__":
    main()

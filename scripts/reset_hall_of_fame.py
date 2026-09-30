#!/usr/bin/env python3
"""Hall of Fame statisztika nullázása a játékosok és bejelentkezések megtartásával."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "otodolo.db"


def main() -> None:
    parser = argparse.ArgumentParser(description="Ötödölő Hall of Fame nullázása")
    parser.add_argument("--yes", action="store_true", help="Megerősítés kérésének kihagyása")
    args = parser.parse_args()

    if not DB_PATH.exists():
        raise SystemExit(f"HIBA: az adatbázis nem található: {DB_PATH}")

    if not args.yes:
        answer = input(
            "Ez törli az összes befejezett játékot és azok lépéseit a Hall of Fame nullázásához. "
            "A felhasználók és sessionök megmaradnak. Folytatod? [igen/NEM]: "
        ).strip().lower()
        if answer not in {"igen", "i", "yes", "y"}:
            print("Megszakítva.")
            return

    with sqlite3.connect(DB_PATH) as conn:
        finished = conn.execute("SELECT COUNT(*) FROM games WHERE status = 'finished'").fetchone()[0]
        conn.execute(
            "DELETE FROM moves WHERE game_id IN (SELECT id FROM games WHERE status = 'finished')"
        )
        conn.execute("DELETE FROM games WHERE status = 'finished'")
        conn.commit()

    print(f"Kész. Törölt befejezett játékok: {finished}")
    print("A Hall of Fame most tiszta lappal indul.")


if __name__ == "__main__":
    main()

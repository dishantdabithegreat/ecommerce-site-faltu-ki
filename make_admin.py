import sqlite3, sys
from pathlib import Path

db_path = Path(__file__).with_name("store.db")
email = sys.argv[1] if len(sys.argv) > 1 else input("Admin email: ").strip().lower()

conn = sqlite3.connect(db_path)
cur = conn.execute("UPDATE users SET is_admin=1 WHERE email=?", (email,))
conn.commit()
print("Admin enabled." if cur.rowcount else "User not found.")
conn.close()

import os, sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app, init_db, seed_db

if __name__ == "__main__":
    init_db()
    seed_db()
    print("===============================================================")
    print(" [ANON] Luxury eCommerce Full-Stack Engine Running!")
    print(" Storefront: http://127.0.0.1:5000")
    print(" Admin Portal: http://127.0.0.1:5000/admin")
    print(" Default Admin: admin@anon.com | Password: admin123")
    print(" Default Customer: demo@anon.com | Password: demo123")
    print("===============================================================")
    app.run(host="127.0.0.1", port=5000, debug=True)

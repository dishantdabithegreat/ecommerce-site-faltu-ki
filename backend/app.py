import os
import sqlite3
from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory, Response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Determine project directories safely
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) if os.path.basename(CURRENT_DIR) == "backend" else CURRENT_DIR
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
DB_PATH = os.path.join(PROJECT_ROOT, "backend", "store.db") if os.path.isdir(os.path.join(PROJECT_ROOT, "backend")) else os.path.join(PROJECT_ROOT, "store.db")

app = Flask(__name__, static_folder=FRONTEND_DIR)
app.secret_key = os.environ.get("SECRET_KEY", "anon-luxury-ecommerce-key-2026")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
CORS(app, supports_credentials=True)

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        old_price REAL,
        image TEXT,
        stock INTEGER NOT NULL DEFAULT 50,
        description TEXT DEFAULT '',
        rating REAL NOT NULL DEFAULT 4.5,
        badge TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, product_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        UNIQUE(user_id, product_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        pincode TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cod',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """)
    for table in ("cart", "order_items"):
        columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
        if "variant" not in columns:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN variant TEXT DEFAULT ''")
    conn.commit()
    conn.close()

# 32 Curated High-Definition Luxury & Lifestyle Products with Unsplash Studio Photography
PRODUCT_SEED = [
    # Menswear
    ('Urban Techwear Waterproof Bomber', 'mens', 129.00, 169.00,
     'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
     45, 'Precision-crafted weather-resistant bomber jacket with matte metal hardware and ergonomic utility pockets.', 4.9, 'HOT'),

    ('Tailored Oxford Cotton Button-Down', 'mens', 64.00, 85.00,
     'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
     60, '100% organic combed cotton oxford shirt. Breathable, wrinkle-resistant finish for work and weekends.', 4.7, 'NEW'),

    ('Merino Wool Minimalist Crewneck', 'mens', 88.00, 115.00,
     'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
     35, 'Ultra-fine Australian merino wool sweater designed for seamless layering in cool climates.', 4.8, 'TRENDING'),

    ('Tailored Wool Blend Overcoat', 'mens', 210.00, 280.00,
     'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
     25, 'Modern structured double-breasted overcoat tailored in luxurious charcoal Italian wool blend.', 5.0, 'PREMIUM'),

    ('Vintage Distressed Denim Jacket', 'mens', 95.00, 120.00,
     'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
     40, 'Classic 14oz heavyweight washed denim with antique brass buttons and deep utility chest pockets.', 4.6, ''),

    # Womenswear
    ('Silk Satin Slip Wrap Dress', 'womens', 145.00, 195.00,
     'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
     30, 'Lustrous mulberry silk slip dress with an adjustable wrap waist and delicate cascade drape.', 4.9, 'BESTSELLER'),

    ('Cashmere Ribbed Knit Cardigan', 'womens', 119.00, 159.00,
     'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
     42, 'Cloud-soft Mongolian cashmere knit with shell button details and relaxed, cozy shoulders.', 4.8, 'POPULAR'),

    ('Structured Double-Breasted Blazer', 'womens', 165.00, 220.00,
     'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=800&q=80',
     28, 'Architectural tailored silhouette in camel hue with sharp peak lapels and horn-effect buttons.', 4.9, 'NEW'),

    ('Pleated Tiered Chiffon Maxi Skirt', 'womens', 79.00, 105.00,
     'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80',
     55, 'Flowing accordion-pleated skirt with an elasticated grosgrain waistband for effortless elegance.', 4.5, ''),

    ('Linen Relaxed Summer Jumpsuit', 'womens', 92.00, 125.00,
     'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
     38, 'Pure European stonewashed linen jumpsuit with front belt cinch and deep seam pockets.', 4.7, 'SALE'),

    # Footwear
    ('Monochrome Leather Court Sneakers', 'footwear', 135.00, 175.00,
     'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
     50, 'Handcrafted Italian nappa leather sneakers with cushioned memory foam cupsole.', 4.9, 'TOP RATED'),

    ('Handcrafted Suede Chelsea Boots', 'footwear', 189.00, 249.00,
     'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80',
     32, 'Velvety water-repellent suede ankle boots with Goodyear welted crepe sole and elastic side gussets.', 4.8, 'POPULAR'),

    ('CloudStrider Ultra-Light Runners', 'footwear', 115.00, 150.00,
     'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
     70, 'Responsive carbon-plate cushioned runners designed for high-energy return and all-day comfort.', 4.7, 'TRENDING'),

    ('Burnished Oxford Dress Shoes', 'footwear', 160.00, 210.00,
     'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80',
     25, 'Full-grain calfskin leather dress shoes with artisanal hand-burnished toe cap finish.', 4.9, ''),

    # Watches & Accessories
    ('Chronograph Eclipse Matte Black Watch', 'watches', 245.00, 320.00,
     'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
     20, '42mm aerospace-grade titanium casing, scratch-resistant sapphire crystal, and Japanese chronograph movement.', 5.0, 'BESTSELLER'),

    ('Minimalist Rose Gold Mesh Watch', 'watches', 165.00, 215.00,
     'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
     35, 'Ultra-slim 7mm profile watch featuring an iridescent sunray dial and quick-release stainless mesh strap.', 4.8, 'ELEGANT'),

    ('Classic Aviator Polarized Sunglasses', 'watches', 85.00, 115.00,
     'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
     60, '100% UV400 polarized mineral glass lenses in a lightweight corrosion-resistant alloy frame.', 4.6, ''),

    ('Full-Grain Italian Leather Bifold', 'watches', 58.00, 78.00,
     'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
     80, 'Hand-stitched Tuscan vegetable-tanned leather wallet with built-in RFID blocking shield.', 4.7, ''),

    # Jewelry
    ('18K Gold Vermeil Herringbone Chain', 'jewelry', 125.00, 165.00,
     'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
     45, 'Silky fluid herringbone necklace plated in 18-karat gold over solid 925 sterling silver.', 4.9, 'HOT'),

    ('Solitaire Pavé Diamond Studs', 'jewelry', 290.00, 390.00,
     'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
     18, 'Conflict-free brilliant-cut lab diamonds set in high-polish four-prong recycled 14k white gold.', 5.0, 'LUXURY'),

    ('Baroque Pearl Droplet Earrings', 'jewelry', 98.00, 130.00,
     'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
     30, 'Natural organic freshwater baroque pearls suspended from sculptural hammered gold huggie hoops.', 4.8, 'UNIQUE'),

    ('Twisted Cable Silver Cuff Bangle', 'jewelry', 85.00, 110.00,
     'https://images.unsplash.com/photo-1611591475155-42ac62973e01?auto=format&fit=crop&w=800&q=80',
     50, 'Antiqued 925 solid sterling silver flexible torque bangle with fluted finials.', 4.6, ''),

    # Electronics & Audio
    ('Studio Spatial ANC Wireless Headphones', 'electronics', 279.00, 349.00,
     'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
     25, 'Hi-Res Audio certified 40mm custom beryllium drivers with hybrid ANC and 45-hour battery life.', 5.0, 'FLAGSHIP'),

    ('Acoustic Mini Bluetooth Spatial Speaker', 'electronics', 99.00, 139.00,
     'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
     65, '360-degree immersive acoustic soundstage in an IP67 waterproof aluminum unibody enclosure.', 4.7, 'TRENDING'),

    ('Pro Series Smart AMOLED Watch', 'electronics', 199.00, 259.00,
     'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
     40, 'Always-on 1.43” sapphire AMOLED display with multi-band GPS, SpO2, and cardiac health telemetry.', 4.8, 'NEW'),

    ('Mechanical Wireless Dual-Mode Keyboard', 'electronics', 129.00, 169.00,
     'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
     35, 'Custom lubricated linear switches, CNC machined aluminum chassis, and RGB per-key backlighting.', 4.9, 'TECH PICK'),

    # Fragrances & Grooming
    ('Woodland Noir Eau De Parfum (100ml)', 'fragrance', 110.00, 145.00,
     'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80',
     30, 'Deep smoky cedarwood, vetiver, and cardamom blended with spicy bourbon vanilla notes.', 4.9, 'BESTSELLER'),

    ('Mediterranean Citrus & Bergamot Mist', 'fragrance', 75.00, 95.00,
     'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
     45, 'Sun-drenched Calabrian bergamot infused with sea salt, white musk, and orange blossom.', 4.7, 'REFRESHING'),

    ('Botanical Recovery Facial Oil', 'fragrance', 62.00, 82.00,
     'https://images.unsplash.com/photo-1608248597359-00560b45d064?auto=format&fit=crop&w=800&q=80',
     55, 'Cold-pressed organic rosehip, squalane, and vitamin E night serum for deep cellular barrier hydration.', 4.8, 'ORGANIC'),

    ('Cedar & Sage Artisan Candle', 'fragrance', 38.00, 50.00,
     'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
     80, '100% soy wax candle hand-poured in a matte ceramic vessel with a crackling natural wood wick.', 4.6, '')
]

def seed_db():
    conn = db()
    # Check if products need refresh/initialization
    count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if count == 0:
        conn.executemany(
            """INSERT INTO products
               (name, category, price, old_price, image, stock, description, rating, badge)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            PRODUCT_SEED
        )
        conn.commit()

    # Seed default administrator user: admin@anon.com / admin123
    admin = conn.execute("SELECT id FROM users WHERE email='admin@anon.com'").fetchone()
    if not admin:
        conn.execute(
            "INSERT INTO users(name, email, password_hash, is_admin) VALUES(?, ?, ?, 1)",
            ("Store Administrator", "admin@anon.com", generate_password_hash("admin123"))
        )
        conn.commit()

    # Seed demo regular customer: demo@anon.com / demo123
    demo = conn.execute("SELECT id FROM users WHERE email='demo@anon.com'").fetchone()
    if not demo:
        conn.execute(
            "INSERT INTO users(name, email, password_hash, is_admin) VALUES(?, ?, ?, 0)",
            ("Jane Doe", "demo@anon.com", generate_password_hash("demo123"))
        )
        conn.commit()

    conn.close()

def row_product(row):
    return dict(row)

def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    conn = db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()
    return user

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "Login required"}), 401
        return fn(*args, **kwargs)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user or not user["is_admin"]:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

# ---------- STATIC FRONTEND & ROUTING ----------
@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/admin")
@app.route("/admin.html")
def serve_admin():
    return send_from_directory(FRONTEND_DIR, "admin.html")

@app.route("/<path:path>")
def serve_static_file(path):
    full_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(FRONTEND_DIR, path)

    # Sleek modern SVG gradient fallback for missing images
    if "assets/images" in path or path.endswith((".jpg", ".png", ".svg", ".ico", ".jpeg", ".webp")):
        filename = os.path.basename(path)
        title = os.path.splitext(filename)[0].replace("-", " ").replace("_", " ").title()
        svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0f172a"/>
                    <stop offset="50%" stop-color="#1e293b"/>
                    <stop offset="100%" stop-color="#090d16"/>
                </linearGradient>
                <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#ff4757"/>
                    <stop offset="100%" stop-color="#ff6b81"/>
                </linearGradient>
            </defs>
            <rect width="600" height="600" fill="url(#grad)"/>
            <circle cx="300" cy="240" r="90" fill="url(#accent)" opacity="0.12"/>
            <path d="M260 250 L300 210 L340 250 M300 210 L300 300" stroke="#ff4757" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <text x="50%" y="370" font-family="'Plus Jakarta Sans', 'Inter', sans-serif" font-size="22" font-weight="700" fill="#f8fafc" text-anchor="middle">{title}</text>
            <text x="50%" y="405" font-family="'Plus Jakarta Sans', 'Inter', sans-serif" font-size="14" font-weight="500" fill="#94a3b8" text-anchor="middle">Anon Luxury Collection</text>
        </svg>'''
        return Response(svg_content, mimetype="image/svg+xml")

    return send_from_directory(FRONTEND_DIR, "index.html")

# ---------- REST API ENDPOINTS ----------
@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "service": "Anon eCommerce Premium Engine",
        "status": "operational",
        "version": "2.4.0"
    })

@app.get("/api/products")
def products_api():
    q = request.args.get("q", "").strip()
    category = request.args.get("category", "").strip().lower()
    sort = request.args.get("sort", "").strip().lower()
    limit = min(max(int(request.args.get("limit", 100)), 1), 200)

    conn = db()
    sql = "SELECT * FROM products WHERE 1=1"
    params = []

    if q:
        sql += " AND (name LIKE ? OR category LIKE ? OR description LIKE ?)"
        like = f"%{q}%"
        params.extend([like, like, like])

    if category and category != "all":
        sql += " AND LOWER(category)=?"
        params.append(category)

    if sort == "price-asc":
        sql += " ORDER BY price ASC"
    elif sort == "price-desc":
        sql += " ORDER BY price DESC"
    elif sort == "rating":
        sql += " ORDER BY rating DESC, id DESC"
    else:
        sql += " ORDER BY id DESC"

    sql += " LIMIT ?"
    params.append(limit)

    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([row_product(r) for r in rows])

@app.get("/api/products/<int:product_id>")
def product_detail(product_id):
    conn = db()
    row = conn.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(row_product(row))

# Promo code validation
@app.post("/api/coupon")
def apply_coupon():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip().upper()
    valid_coupons = {
        "ANON20": {"discount_percent": 20, "description": "20% Off Storewide"},
        "LUXURY10": {"discount_percent": 10, "description": "10% VIP Discount"},
        "FREESHIP": {"discount_percent": 0, "free_shipping": True, "description": "Free Express Shipping"}
    }
    if code in valid_coupons:
        return jsonify({"valid": True, "code": code, **valid_coupons[code]})
    return jsonify({"valid": False, "error": "Invalid promo code. Try 'ANON20'"}), 400

# Auth Endpoints
@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not email or len(password) < 6:
        return jsonify({"error": "Name, valid email and password (minimum 6 characters) are required"}), 400

    conn = db()
    try:
        cur = conn.execute(
            "INSERT INTO users(name, email, password_hash) VALUES(?, ?, ?)",
            (name, email, generate_password_hash(password))
        )
        conn.commit()
        session["user_id"] = cur.lastrowid
        return jsonify({
            "message": "Account created successfully",
            "user": {"id": cur.lastrowid, "name": name, "email": email, "is_admin": False}
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "An account with this email already exists"}), 409
    finally:
        conn.close()

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    conn = db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password credentials"}), 401

    session["user_id"] = user["id"]
    return jsonify({
        "message": "Welcome back!",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "is_admin": bool(user["is_admin"])
        }
    })

@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"message": "Successfully signed out"})

@app.get("/api/auth/me")
def me():
    user = current_user()
    if not user:
        return jsonify({"user": None})
    return jsonify({
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "is_admin": bool(user["is_admin"])
        }
    })

# Newsletter
@app.post("/api/newsletter")
def newsletter():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    if "@" not in email or "." not in email:
        return jsonify({"error": "Please enter a valid email address"}), 400

    conn = db()
    try:
        conn.execute("INSERT INTO subscribers(email) VALUES(?)", (email,))
        conn.commit()
        return jsonify({"message": "Thank you for subscribing to Anon VIP Club! ✨"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"message": "You are already subscribed to our newsletter! ✨"}), 200
    finally:
        conn.close()

@app.get("/api/admin/subscribers")
@admin_required
def get_subscribers():
    conn = db()
    rows = conn.execute("SELECT * FROM subscribers ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# Cart Operations
def get_cart_rows(user_id):
    conn = db()
    rows = conn.execute("""
        SELECT c.product_id, c.quantity, c.variant, p.name, p.category, p.price, p.old_price, p.image, p.stock
        FROM cart c JOIN products p ON p.id=c.product_id
        WHERE c.user_id=? ORDER BY c.id DESC
    """, (user_id,)).fetchall()
    conn.close()
    items = [dict(r) for r in rows]
    total = sum(x["price"] * x["quantity"] for x in items)
    return {"items": items, "total": round(total, 2)}

@app.get("/api/cart")
@login_required
def get_cart():
    return jsonify(get_cart_rows(session["user_id"]))

@app.post("/api/cart")
@login_required
def add_cart():
    data = request.get_json(silent=True) or {}
    pid = int(data.get("product_id", 0))
    qty = max(int(data.get("quantity", 1)), 1)
    variant = str(data.get("variant", "")).strip()[:40]

    conn = db()
    p = conn.execute("SELECT stock FROM products WHERE id=?", (pid,)).fetchone()
    if not p:
        conn.close()
        return jsonify({"error": "Product not found"}), 404
    if qty > p["stock"]:
        conn.close()
        return jsonify({"error": f"Only {p['stock']} units available in stock"}), 400

    conn.execute("""
        INSERT INTO cart(user_id, product_id, quantity, variant) VALUES(?, ?, ?, ?)
        ON CONFLICT(user_id, product_id)
        DO UPDATE SET quantity=quantity+excluded.quantity, variant=excluded.variant
    """, (session["user_id"], pid, qty, variant))
    conn.commit()
    conn.close()
    return jsonify(get_cart_rows(session["user_id"]))

@app.patch("/api/cart/<int:product_id>")
@login_required
def update_cart(product_id):
    data = request.get_json(silent=True) or {}
    qty = int(data.get("quantity", 1))

    conn = db()
    if qty <= 0:
        conn.execute("DELETE FROM cart WHERE user_id=? AND product_id=?", (session["user_id"], product_id))
    else:
        stock = conn.execute("SELECT stock FROM products WHERE id=?", (product_id,)).fetchone()
        if not stock or qty > stock["stock"]:
            conn.close()
            return jsonify({"error": "Insufficient stock available"}), 400
        conn.execute("UPDATE cart SET quantity=? WHERE user_id=? AND product_id=?",
                     (qty, session["user_id"], product_id))
    conn.commit()
    conn.close()
    return jsonify(get_cart_rows(session["user_id"]))

@app.delete("/api/cart/<int:product_id>")
@login_required
def delete_cart(product_id):
    conn = db()
    conn.execute("DELETE FROM cart WHERE user_id=? AND product_id=?", (session["user_id"], product_id))
    conn.commit()
    conn.close()
    return jsonify(get_cart_rows(session["user_id"]))

# Wishlist Operations
@app.get("/api/wishlist")
@login_required
def get_wishlist():
    conn = db()
    rows = conn.execute("""
        SELECT p.* FROM wishlist w JOIN products p ON p.id=w.product_id
        WHERE w.user_id=? ORDER BY w.id DESC
    """, (session["user_id"],)).fetchall()
    conn.close()
    return jsonify([row_product(r) for r in rows])

@app.post("/api/wishlist/<int:product_id>")
@login_required
def toggle_wishlist(product_id):
    conn = db()
    exists = conn.execute(
        "SELECT id FROM wishlist WHERE user_id=? AND product_id=?",
        (session["user_id"], product_id)
    ).fetchone()
    if exists:
        conn.execute("DELETE FROM wishlist WHERE id=?", (exists["id"],))
        action = "removed"
    else:
        p = conn.execute("SELECT id FROM products WHERE id=?", (product_id,)).fetchone()
        if not p:
            conn.close()
            return jsonify({"error": "Product not found"}), 404
        conn.execute("INSERT INTO wishlist(user_id, product_id) VALUES(?, ?)",
                     (session["user_id"], product_id))
        action = "added"
    conn.commit()
    conn.close()
    return jsonify({"action": action})

# Orders & Checkout
@app.post("/api/orders")
@login_required
def create_order():
    data = request.get_json(silent=True) or {}
    required = ["name", "phone", "address", "city", "pincode"]
    if any(not str(data.get(k, "")).strip() for k in required):
        return jsonify({"error": "Please provide your full shipping details"}), 400

    cart = get_cart_rows(session["user_id"])
    if not cart["items"]:
        return jsonify({"error": "Your cart is currently empty"}), 400

    payment_method = str(data.get("payment_method", "cod")).lower()
    discount = float(data.get("discount", 0.0))
    final_total = max(round(cart["total"] - discount, 2), 0.0)

    conn = db()
    try:
        for item in cart["items"]:
            p = conn.execute("SELECT stock FROM products WHERE id=?", (item["product_id"],)).fetchone()
            if not p or item["quantity"] > p["stock"]:
                raise ValueError(f"Insufficient stock for {item['name']}")

        cur = conn.execute("""
            INSERT INTO orders(user_id, total, name, phone, address, city, pincode, payment_method)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        """, (session["user_id"], final_total, data["name"].strip(), data["phone"].strip(),
              data["address"].strip(), data["city"].strip(), data["pincode"].strip(), payment_method))
        order_id = cur.lastrowid

        for item in cart["items"]:
            conn.execute("""
                INSERT INTO order_items(order_id, product_id, quantity, price, variant)
                VALUES(?, ?, ?, ?, ?)
            """, (order_id, item["product_id"], item["quantity"], item["price"], item.get("variant", "")))
            conn.execute("UPDATE products SET stock=stock-? WHERE id=?",
                         (item["quantity"], item["product_id"]))

        conn.execute("DELETE FROM cart WHERE user_id=?", (session["user_id"],))
        conn.commit()
        return jsonify({
            "message": "Order placed successfully! 🎉",
            "order_id": order_id,
            "total": final_total,
            "status": "pending"
        }), 201
    except ValueError as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

@app.get("/api/orders")
@login_required
def my_orders():
    conn = db()
    orders = conn.execute(
        "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC", (session["user_id"],)
    ).fetchall()
    result = []
    for o in orders:
        items = conn.execute("""
            SELECT oi.*, p.name, p.image FROM order_items oi
            JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?
        """, (o["id"],)).fetchall()
        item = dict(o)
        item["items"] = [dict(x) for x in items]
        result.append(item)
    conn.close()
    return jsonify(result)

# Admin Endpoints
@app.get("/api/admin/metrics")
@admin_required
def admin_metrics():
    conn = db()
    total_sales = conn.execute("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'").fetchone()[0]
    total_orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    total_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    total_subscribers = conn.execute("SELECT COUNT(*) FROM subscribers").fetchone()[0]
    conn.close()
    return jsonify({
        "total_sales": round(total_sales, 2),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_subscribers": total_subscribers
    })

@app.get("/api/admin/orders")
@admin_required
def admin_orders():
    conn = db()
    rows = conn.execute("""
        SELECT o.*, u.email as user_email FROM orders o JOIN users u ON u.id=o.user_id
        ORDER BY o.id DESC
    """).fetchall()
    result = []
    for o in rows:
        items = conn.execute("""
            SELECT oi.*, p.name, p.image FROM order_items oi
            JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?
        """, (o["id"],)).fetchall()
        order_dict = dict(o)
        order_dict["items"] = [dict(x) for x in items]
        result.append(order_dict)
    conn.close()
    return jsonify(result)

@app.patch("/api/admin/orders/<int:order_id>")
@admin_required
def admin_update_order(order_id):
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "")).lower()
    allowed = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
    if status not in allowed:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(allowed)}"}), 400

    conn = db()
    cur = conn.execute("UPDATE orders SET status=? WHERE id=?", (status, order_id))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Order not found"}), 404
    return jsonify({"message": f"Order #{order_id} status updated to {status.upper()}"})

@app.post("/api/admin/products")
@admin_required
def admin_add_product():
    data = request.get_json(silent=True) or {}
    try:
        name = str(data["name"]).strip()
        category = str(data["category"]).strip().lower()
        price = float(data["price"])
        old_price = float(data["old_price"]) if data.get("old_price") is not None and str(data.get("old_price")).strip() != "" else None
        stock = int(data.get("stock", 50))
    except (KeyError, ValueError):
        return jsonify({"error": "Valid name, category, and numeric price are required"}), 400

    image = str(data.get("image", "")).strip() or "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80"
    badge = str(data.get("badge", "")).strip().upper()
    description = str(data.get("description", "")).strip()
    rating = float(data.get("rating", 4.8))

    conn = db()
    cur = conn.execute("""
        INSERT INTO products(name, category, price, old_price, image, stock, description, rating, badge)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (name, category, price, old_price, image, stock, description, rating, badge))
    conn.commit()
    pid = cur.lastrowid
    conn.close()
    return jsonify({"message": f"Product '{name}' added successfully", "id": pid}), 201

@app.patch("/api/admin/products/<int:product_id>")
@admin_required
def admin_update_product(product_id):
    data = request.get_json(silent=True) or {}
    fields = []
    values = []
    allowed = ["name", "category", "price", "old_price", "image", "stock", "description", "rating", "badge"]

    for key in allowed:
        if key in data:
            fields.append(f"{key}=?")
            val = data[key]
            if key in ("price", "rating") and val is not None:
                val = float(val)
            elif key == "stock" and val is not None:
                val = int(val)
            values.append(val)

    if not fields:
        return jsonify({"error": "No update fields provided"}), 400

    values.append(product_id)
    conn = db()
    cur = conn.execute(f"UPDATE products SET {', '.join(fields)} WHERE id=?", values)
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product updated successfully"})

@app.delete("/api/admin/products/<int:product_id>")
@admin_required
def admin_delete_product(product_id):
    conn = db()
    cur = conn.execute("DELETE FROM products WHERE id=?", (product_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product removed successfully"})

init_db()
seed_db()

if __name__ == "__main__":
    print("===============================================================")
    print(" [ANON] Luxury eCommerce Full-Stack Engine Running!")
    print(" Storefront: http://127.0.0.1:5000")
    print(" Admin Portal: http://127.0.0.1:5000/admin")
    print(" Default Admin: admin@anon.com | Password: admin123")
    print(" Default Customer: demo@anon.com | Password: demo123")
    print("===============================================================")
    app.run(host="127.0.0.1", port=5000, debug=True)

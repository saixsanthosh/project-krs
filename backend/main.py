# ================================
# PROJECT KRS — BACKEND (FINAL)
# ================================
# - FastAPI + SQLite + file uploads
# - Saves orders + selfie
# - Basic IP geolocation (free, ipapi.co)
# - Serves frontend static files
# =================================

import os
import sqlite3
import time
import secrets
import requests

from fastapi import FastAPI, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# ---------- PATHS ----------
BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
SAVE_DIR = os.path.join(BASE_DIR, "selfies")
DB_PATH = os.path.join(BASE_DIR, "database.db")

os.makedirs(SAVE_DIR, exist_ok=True)

# ---------- APP ----------
app = FastAPI(title="Project KRS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # for demo; lock down for prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB ----------
def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db_connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code TEXT,
            items TEXT,
            total REAL,
            name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            pincode TEXT,
            timestamp TEXT,
            selfie_filename TEXT,
            ip_address TEXT,
            city_auto TEXT,
            region_auto TEXT,
            country_auto TEXT,
            lat REAL,
            lng REAL
        )
        """
    )
    conn.commit()
    conn.close()


init_db()

# ---------- UTILS ----------
def gen_code():
    chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(5))


def geo_lookup(ip: str):
    """
    Free IP → location using ipapi.co.
    Returns (city, region, country, lat, lng) or all None.
    """
    try:
        if not ip or ip.startswith("127.") or ip.startswith("192.168."):
            # local / LAN; no real geo
            return None, None, None, None, None

        url = f"https://ipapi.co/{ip}/json/"
        r = requests.get(url, timeout=5).json()
        return (
            r.get("city"),
            r.get("region"),
            r.get("country_name"),
            r.get("latitude"),
            r.get("longitude"),
        )
    except Exception:
        return None, None, None, None, None


# ---------- ROUTES ----------


@app.post("/save_order")
async def save_order(
    request: Request,
    name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    address: str = Form(""),
    city: str = Form(""),
    pincode: str = Form(""),
    items: str = Form("[]"),
    total: float = Form(0.0),
    selfie: UploadFile | None = File(None),
):
    """
    Save a new order from the website.
    Called by frontend with multipart/form-data.
    """

    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    code = gen_code()

    # selfie file
    selfie_filename = None
    if selfie is not None:
        fname = f"{int(time.time())}_{selfie.filename}"
        path = os.path.join(SAVE_DIR, fname)
        with open(path, "wb") as f:
            f.write(await selfie.read())
        selfie_filename = fname

    ip_addr = request.client.host if request.client else None
    city_auto, region_auto, country_auto, lat, lng = geo_lookup(ip_addr)

    conn = db_connect()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO orders (
            order_code, items, total,
            name, email, phone, address, city, pincode,
            timestamp,
            selfie_filename,
            ip_address,
            city_auto, region_auto, country_auto, lat, lng
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            code,
            items,
            float(total or 0),
            name,
            email,
            phone,
            address,
            city,
            pincode,
            ts,
            selfie_filename,
            ip_addr,
            city_auto,
            region_auto,
            country_auto,
            lat,
            lng,
        ),
    )
    conn.commit()
    conn.close()

    return {"ok": True, "order_code": code, "timestamp": ts}


@app.post("/save_selfie")
async def save_selfie(order_id: str = Form(None), file: UploadFile = File(...)):
    fname = f"{int(time.time())}_{file.filename}"
    path = os.path.join(SAVE_DIR, fname)
    with open(path, "wb") as f:
        f.write(await file.read())

    if order_id:
        conn = db_connect()
        cur = conn.cursor()
        cur.execute(
            "UPDATE orders SET selfie_filename=? WHERE order_code=?",
            (fname, order_id),
        )
        conn.commit()
        conn.close()

    return {"ok": True, "filename": fname}


@app.get("/get_orders")
def get_orders():
    conn = db_connect()
    cur = conn.cursor()
    rows = cur.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
    conn.close()
    return JSONResponse([dict(r) for r in rows])


@app.get("/get_order")
def get_order(order_id: str):
    conn = db_connect()
    cur = conn.cursor()
    row = cur.execute(
        "SELECT * FROM orders WHERE order_code=? OR id=?",
        (order_id, order_id),
    ).fetchone()
    conn.close()
    if not row:
        return {"ok": False, "message": "Not found"}
    return {"ok": True, "order": dict(row)}


@app.get("/list_selfies")
def list_selfies():
    return JSONResponse(os.listdir(SAVE_DIR))


@app.get("/selfie/{name}")
def get_selfie(name: str):
    path = os.path.join(SAVE_DIR, name)
    if not os.path.exists(path):
        return JSONResponse({"error": "Not found"}, status_code=404)
    return FileResponse(path)


# ---------- STATIC FRONTEND ----------
if os.path.isdir(FRONTEND_DIR):
    # mount AFTER APIs so /get_orders etc. still work
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

# Run: uvicorn backend.main:app --reload --port 8000

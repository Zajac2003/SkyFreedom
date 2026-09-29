"""SkyFreedom — drone recon PWA backend."""

from __future__ import annotations

import math
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request, send_from_directory

BASE = Path(__file__).resolve().parent
DB_PATH = BASE / "skyfreedom.db"

app = Flask(__name__, static_folder="static", template_folder="templates")

# Mock drone orbit around Warsaw centre
DRONE_ORIGIN = (52.2297, 21.0122)
DRONE_RADIUS = 0.004  # ~400 m
DEFAULT_OWNER = "pilot-1"


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


@app.teardown_appcontext
def close_db(_: object) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                created_at TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                owner_id TEXT NOT NULL
            )
            """
        )
        conn.commit()


def pin_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "note": row["note"],
        "lat": row["lat"],
        "lng": row["lng"],
        "created_at": row["created_at"],
        "active": bool(row["active"]),
        "owner_id": row["owner_id"],
    }


def mock_drone() -> dict:
    t = time.time()
    angle = t * 0.15
    lat = DRONE_ORIGIN[0] + math.sin(angle) * DRONE_RADIUS
    lng = DRONE_ORIGIN[1] + math.cos(angle) * DRONE_RADIUS
    heading = (math.degrees(angle) + 90) % 360
    speed = 28.0 + 6.0 * math.sin(t * 0.4)
    return {
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "heading": round(heading, 1),
        "speed_kmh": round(speed, 1),
        "altitude_m": round(85 + 8 * math.sin(t * 0.25), 1),
        "live": True,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/manifest.json")
def manifest():
    return send_from_directory(app.static_folder, "manifest.json")


@app.route("/sw.js")
def service_worker():
    response = send_from_directory(app.static_folder, "sw.js")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/api/drone")
def api_drone():
    return jsonify(mock_drone())


@app.get("/api/pins")
def api_pins_list():
    active_only = request.args.get("active") == "1"
    sql = "SELECT * FROM pins"
    if active_only:
        sql += " WHERE active = 1"
    sql += " ORDER BY created_at DESC"
    rows = get_db().execute(sql).fetchall()
    return jsonify([pin_row(r) for r in rows])


@app.post("/api/pins")
def api_pins_create():
    data = request.get_json(silent=True) or {}
    note = (data.get("note") or "").strip()
    if not note:
        return jsonify({"error": "note_required"}), 400

    try:
        lat = float(data["lat"])
        lng = float(data["lng"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "coords_required"}), 400

    owner_id = (data.get("owner_id") or DEFAULT_OWNER).strip() or DEFAULT_OWNER
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    db = get_db()
    cur = db.execute(
        """
        INSERT INTO pins (note, lat, lng, created_at, active, owner_id)
        VALUES (?, ?, ?, ?, 1, ?)
        """,
        (note, lat, lng, created_at, owner_id),
    )
    db.commit()
    row = db.execute("SELECT * FROM pins WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(pin_row(row)), 201


@app.get("/api/pins/<int:pin_id>")
def api_pins_get(pin_id: int):
    row = get_db().execute("SELECT * FROM pins WHERE id = ?", (pin_id,)).fetchone()
    if not row:
        return jsonify({"error": "not_found"}), 404
    return jsonify(pin_row(row))


@app.patch("/api/pins/<int:pin_id>")
def api_pins_patch(pin_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM pins WHERE id = ?", (pin_id,)).fetchone()
    if not row:
        return jsonify({"error": "not_found"}), 404

    data = request.get_json(silent=True) or {}
    note = row["note"]
    active = row["active"]

    if "note" in data:
        note = (data.get("note") or "").strip()
        if not note:
            return jsonify({"error": "note_required"}), 400
    if "active" in data:
        active = 1 if data["active"] else 0

    db.execute(
        "UPDATE pins SET note = ?, active = ? WHERE id = ?",
        (note, active, pin_id),
    )
    db.commit()
    row = db.execute("SELECT * FROM pins WHERE id = ?", (pin_id,)).fetchone()
    return jsonify(pin_row(row))


init_db()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

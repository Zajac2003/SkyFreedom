"""Seed realistic recon pins around Warsaw.

Auto-used by app.py when the DB is empty (e.g. Railway).
Manual: python seed_pins.py
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

OWNERS = ["pilot-1", "pilot-2", "ops-straż", "ops-policja", "ops-wojsko"]

# note, lat, lng, hours_ago, active, owner_idx, ttl_minutes
SAMPLES = [
    (
        "Most Świętokrzyski — uszkodzona nawierzchnia, pęknięcie na jezdni południowej. Ruch ograniczony do jednego pasa.",
        52.2358,
        21.0255,
        2.5,
        1,
        0,
        None,
    ),
    (
        "Zawalony fragment dachu kamienicy przy ul. Nowy Świat. Pył, ryzyko dalszych osunięć. Ewakuacja okolicznych lokali w toku.",
        52.2321,
        21.0189,
        1.2,
        1,
        2,
        360,
    ),
    (
        "Pożar hali magazynowej — dym widoczny z SW. Jednostki na miejscu, dojazd od ul. Towarowej utrudniony.",
        52.2254,
        21.0012,
        0.4,
        1,
        2,
        60,
    ),
    (
        "Przerwana linia energetyczna przecina jezdnię. Iskry przy kontakcie z metalem. Obszar zabezpieczyć do 50 m.",
        52.2289,
        21.0198,
        3.0,
        1,
        3,
        1440,
    ),
    (
        "Zablokowane skrzyżowanie — wrak autobusu i osobówki. Wezwano dwie karetki. Korek w kierunku centrum.",
        52.2315,
        21.0087,
        0.8,
        1,
        3,
        15,
    ),
    (
        "Podtopienie piwnic przy Wiśle — poziom wody wzrasta. Studzienki przelewają się na chodnik.",
        52.2412,
        21.0310,
        4.5,
        1,
        0,
        360,
    ),
    (
        "Niezidentyfikowany obiekt na dachu bloku — możliwe urządzenie. Policja prosi o wstrzymanie ruchu pieszych poniżej.",
        52.2267,
        21.0144,
        1.0,
        1,
        3,
        60,
    ),
    (
        "Uszkodzony hydrant — woda pod ciśnieniem zalewa ulicę. Straż już powiadomiona.",
        52.2338,
        21.0061,
        5.0,
        0,
        2,
        15,
    ),
    (
        "Wykolejenie wagonu towarowego przy bocznicy. Brak wycieku, tor zajęty. PKP w drodze.",
        52.2201,
        21.0045,
        6.0,
        1,
        4,
        None,
    ),
    (
        "Most Poniatowskiego — ubytek w balustradzie po stronie wschodniej. Nie zagraża konstrukcji, wymaga naprawy.",
        52.2349,
        21.0412,
        8.0,
        0,
        0,
        None,
    ),
    (
        "Dym z kanału wentylacyjnego — prawdopodobnie palenie odpadów. Sprawdzić wlot przy pl. Bankowym.",
        52.2430,
        21.0025,
        0.3,
        1,
        2,
        15,
    ),
    (
        "Zerwany znak drogowy blokuje ścieżkę rowerową. Metal ostry — ryzyko obrażeń.",
        52.2290,
        21.0220,
        12.0,
        0,
        1,
        1440,
    ),
    (
        "Otwarty właz studzienki na jezdni. Brak oznakowania. Natychmiastowa izolacja pasa ruchu.",
        52.2375,
        21.0156,
        0.15,
        1,
        3,
        15,
    ),
    (
        "Zawalona konstrukcja reklamowa na chodniku. Odłamki szkła na ~30 m. Odciąć pieszych.",
        52.2248,
        21.0178,
        2.0,
        1,
        1,
        60,
    ),
    (
        "Podejrzany pojazd bez tablic — stoi z otwartym bagażnikiem. Załoga opuściła okolice 10 min temu.",
        52.2305,
        21.0110,
        0.6,
        1,
        4,
        60,
    ),
    (
        "Wyciek oleju napędowego na skrzyżowaniu. Ślisko, szczególnie dla motocykli. Piasek w drodze.",
        52.2272,
        21.0095,
        1.8,
        1,
        2,
        360,
    ),
    (
        "Uszkodzona latarnia — przewód pod napięciem leży na ziemi. Nie zbliżać się.",
        52.2391,
        21.0203,
        3.5,
        1,
        0,
        1440,
    ),
    (
        "Zgromadzenie osób przy wejściu do metra — możliwe utrudnienia ewakuacji. Monitorować.",
        52.2299,
        21.0038,
        0.2,
        1,
        3,
        15,
    ),
    (
        "Zawalony fragment muru oporowego przy skarpie. Ruch na dolnej ulicy wstrzymany.",
        52.2425,
        21.0288,
        7.0,
        0,
        4,
        None,
    ),
    (
        "Dym z piwnicy kamienicy — zapach spalenizny elektrycznej. Lokatorzy ewakuowani na podwórko.",
        52.2362,
        21.0128,
        0.9,
        1,
        2,
        60,
    ),
    (
        "Przejście podziemne zalane — woda do kolan. Jedyna droga omijająca w kierunku północnym.",
        52.2218,
        21.0165,
        4.0,
        1,
        1,
        360,
    ),
    (
        "Zerwany kabel światłowodowy — leży przez jezdnię. Operator telekomunikacyjny wezwany.",
        52.2328,
        21.0241,
        9.0,
        0,
        0,
        1440,
    ),
    (
        "Ogień traw na skwerze — wiatr SE, ryzyko przeniesienia na krzewy przy bloku.",
        52.2455,
        21.0180,
        0.5,
        1,
        2,
        15,
    ),
    (
        "Zablokowana brama wjazdowa na dziedziniec — nie da się wprowadzić wozu strażackiego. Wejście boczne od wschodu.",
        52.2280,
        21.0135,
        1.5,
        1,
        2,
        60,
    ),
    (
        "Osoba leżąca na chodniku — nie reaguje na wołanie. Wezwano pogotowie, oczekiwanie na przyjazd.",
        52.2340,
        21.0102,
        0.1,
        1,
        1,
        15,
    ),
]


def seed(db_path: str | Path, *, force: bool = False) -> int:
    """Insert demo pins. If force=False and table already has rows, skip. Returns inserted count."""
    db_path = Path(db_path)
    conn = sqlite3.connect(db_path)
    try:
        count = conn.execute("SELECT COUNT(*) FROM pins").fetchone()[0]
        if count and not force:
            return 0

        if force:
            conn.execute("DELETE FROM pins")
            try:
                conn.execute("DELETE FROM sqlite_sequence WHERE name='pins'")
            except sqlite3.OperationalError:
                pass

        now = datetime.now(timezone.utc)
        for note, lat, lng, hours_ago, active, owner_idx, ttl in SAMPLES:
            created = now - timedelta(hours=hours_ago)
            expires = None
            if ttl:
                expires = (created + timedelta(minutes=ttl)).isoformat(timespec="seconds")
            conn.execute(
                """
                INSERT INTO pins (note, lat, lng, created_at, active, owner_id, ttl_minutes, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    note,
                    lat,
                    lng,
                    created.isoformat(timespec="seconds"),
                    active,
                    OWNERS[owner_idx],
                    ttl,
                    expires,
                ),
            )
        conn.commit()
        return len(SAMPLES)
    finally:
        conn.close()


def seed_if_empty(db_path: str | Path) -> int:
    return seed(db_path, force=False)


if __name__ == "__main__":
    from app import DB_PATH, init_db

    init_db()
    n = seed(DB_PATH, force=True)
    print(f"Seeded {n} pins → {DB_PATH}")

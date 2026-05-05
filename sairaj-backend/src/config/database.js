const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.resolve(process.env.DB_PATH || "./sairaj.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS workers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    phone      TEXT    NOT NULL UNIQUE,
    address    TEXT    NOT NULL DEFAULT '',
    photo_url  TEXT    NOT NULL DEFAULT '',
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id  INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    time       TEXT    NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'present',
    marked_by  TEXT    NOT NULL DEFAULT 'manual',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(worker_id, date)
  );

  CREATE TABLE IF NOT EXISTS bills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number     TEXT NOT NULL UNIQUE,
    client_name     TEXT NOT NULL,
    client_address  TEXT DEFAULT '',
    client_phone    TEXT DEFAULT '',
    client_gst      TEXT DEFAULT '',
    date            TEXT NOT NULL,
    items           TEXT NOT NULL DEFAULT '[]',
    subtotal        REAL NOT NULL DEFAULT 0,
    tax_percent     REAL NOT NULL DEFAULT 18,
    tax_amount      REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    total_amount    REAL NOT NULL DEFAULT 0,
    notes           TEXT DEFAULT '',
    pdf_url         TEXT DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_number  TEXT NOT NULL UNIQUE,
    client_name       TEXT NOT NULL,
    client_address    TEXT DEFAULT '',
    client_phone      TEXT DEFAULT '',
    date              TEXT NOT NULL,
    valid_until       TEXT DEFAULT '',
    items             TEXT NOT NULL DEFAULT '[]',
    subtotal          REAL NOT NULL DEFAULT 0,
    tax_percent       REAL NOT NULL DEFAULT 18,
    tax_amount        REAL NOT NULL DEFAULT 0,
    discount_amount   REAL NOT NULL DEFAULT 0,
    total_amount      REAL NOT NULL DEFAULT 0,
    notes             TEXT DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'draft',
    pdf_url           TEXT DEFAULT '',
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log("[DB] SQLite ready →", path.resolve(process.env.DB_PATH || "./sairaj.db"));

module.exports = db;

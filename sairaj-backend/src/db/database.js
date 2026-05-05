const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './sairaj.db';
const db = new Database(path.resolve(DB_PATH));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  -- Workers table
  CREATE TABLE IF NOT EXISTS workers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL UNIQUE,
    trade       TEXT    NOT NULL,               -- e.g. Mason, Carpenter, Electrician
    daily_rate  REAL    NOT NULL DEFAULT 0,
    address     TEXT,
    aadhar      TEXT,
    photo_url   TEXT,
    face_data   TEXT,                           -- JSON blob from face-service
    is_active   INTEGER NOT NULL DEFAULT 1,
    joined_at   TEXT    NOT NULL DEFAULT (date('now')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Attendance table
  CREATE TABLE IF NOT EXISTS attendance (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id    INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,              -- YYYY-MM-DD
    status       TEXT    NOT NULL DEFAULT 'present', -- present | absent | half_day | overtime
    in_time      TEXT,                          -- HH:MM
    out_time     TEXT,                          -- HH:MM
    hours        REAL    DEFAULT 8,
    overtime_hrs REAL    DEFAULT 0,
    note         TEXT,
    marked_by    TEXT    DEFAULT 'manual',      -- manual | face
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(worker_id, date)
  );

  -- Bills table
  CREATE TABLE IF NOT EXISTS bills (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number    TEXT    NOT NULL UNIQUE,
    client_name    TEXT    NOT NULL,
    client_phone   TEXT,
    client_address TEXT,
    client_gst     TEXT,
    issue_date     TEXT    NOT NULL DEFAULT (date('now')),
    due_date       TEXT,
    status         TEXT    NOT NULL DEFAULT 'unpaid',  -- unpaid | paid | partial | cancelled
    subtotal       REAL    NOT NULL DEFAULT 0,
    discount       REAL    NOT NULL DEFAULT 0,
    gst_rate       REAL    NOT NULL DEFAULT 18,
    gst_amount     REAL    NOT NULL DEFAULT 0,
    total          REAL    NOT NULL DEFAULT 0,
    amount_paid    REAL    NOT NULL DEFAULT 0,
    notes          TEXT,
    pdf_url        TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Bill items table
  CREATE TABLE IF NOT EXISTS bill_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id     INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    description TEXT    NOT NULL,
    quantity    REAL    NOT NULL DEFAULT 1,
    unit        TEXT    DEFAULT 'nos',
    unit_price  REAL    NOT NULL DEFAULT 0,
    amount      REAL    NOT NULL DEFAULT 0
  );

  -- Quotations table
  CREATE TABLE IF NOT EXISTS quotations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number    TEXT    NOT NULL UNIQUE,
    client_name     TEXT    NOT NULL,
    client_phone    TEXT,
    client_address  TEXT,
    project_title   TEXT    NOT NULL,
    project_details TEXT,
    issue_date      TEXT    NOT NULL DEFAULT (date('now')),
    valid_until     TEXT,
    status          TEXT    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | converted
    subtotal        REAL    NOT NULL DEFAULT 0,
    discount        REAL    NOT NULL DEFAULT 0,
    gst_rate        REAL    NOT NULL DEFAULT 18,
    gst_amount      REAL    NOT NULL DEFAULT 0,
    total           REAL    NOT NULL DEFAULT 0,
    terms           TEXT,
    pdf_url         TEXT,
    bill_id         INTEGER REFERENCES bills(id),  -- set when converted to bill
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Quotation items table
  CREATE TABLE IF NOT EXISTS quotation_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id    INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    description TEXT    NOT NULL,
    quantity    REAL    NOT NULL DEFAULT 1,
    unit        TEXT    DEFAULT 'nos',
    unit_price  REAL    NOT NULL DEFAULT 0,
    amount      REAL    NOT NULL DEFAULT 0
  );
`);

console.log('[DB] SQLite database initialized at', path.resolve(DB_PATH));

module.exports = db;

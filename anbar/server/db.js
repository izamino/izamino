'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.ANBAR_DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
for (const d of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(d, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'anbar.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  phone TEXT,
  chat_id TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  active INTEGER NOT NULL DEFAULT 1,
  must_change_pw INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  tracks_expiry INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS warehouse_managers (
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (warehouse_id, user_id)
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT,
  location TEXT,
  unit TEXT NOT NULL DEFAULT 'عدد',
  min_qty REAL NOT NULL DEFAULT 0,
  qty REAL NOT NULL DEFAULT 0,
  loaned_qty REAL NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'ok' CHECK (condition IN ('ok','broken','repair')),
  brand TEXT, model TEXT, serial TEXT,
  image TEXT,
  notes TEXT,
  batch_tracked INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (warehouse_id, code)
);
CREATE INDEX IF NOT EXISTS items_wh ON items(warehouse_id);
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  batch_no TEXT NOT NULL,
  expiry TEXT,
  qty REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (item_id, batch_no)
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  direction TEXT NOT NULL CHECK (direction IN ('in','out','adj')),
  reason TEXT NOT NULL,
  qty REAL NOT NULL,
  delta REAL NOT NULL,
  qty_after REAL NOT NULL,
  op_date TEXT NOT NULL,
  party TEXT,
  note TEXT,
  batch_alloc TEXT,
  loan_id INTEGER, transfer_id INTEGER, request_id INTEGER, corrects_id INTEGER,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS tx_item ON transactions(item_id);
CREATE INDEX IF NOT EXISTS tx_date ON transactions(op_date);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  borrower TEXT NOT NULL,
  program TEXT,
  qty REAL NOT NULL,
  returned_qty REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  note TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  from_wh INTEGER NOT NULL REFERENCES warehouses(id),
  to_wh INTEGER NOT NULL REFERENCES warehouses(id),
  qty REAL NOT NULL,
  batch_alloc TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','rejected','cancelled')),
  note TEXT,
  sent_by INTEGER NOT NULL REFERENCES users(id),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  handled_by INTEGER REFERENCES users(id),
  handled_at TEXT,
  handle_note TEXT,
  dest_item_id INTEGER REFERENCES items(id)
);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  item_id INTEGER REFERENCES items(id),
  item_name TEXT NOT NULL,
  qty REAL NOT NULL,
  unit TEXT,
  kind TEXT NOT NULL DEFAULT 'use' CHECK (kind IN ('use','loan','supply')),
  reason TEXT NOT NULL,
  needed_by TEXT,
  requester_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','delivered','cancelled')),
  reviewer_id INTEGER REFERENCES users(id),
  review_note TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  warehouse_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  dedupe TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, dedupe)
);
CREATE INDEX IF NOT EXISTS notif_user ON notifications(user_id, is_read);
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const DEFAULT_WAREHOUSES = [
  ['انبار کارگاه', 0], ['انبار مسجد', 0], ['انبار رسانه', 0], ['انبار صوت مسجد', 0],
  ['انبار پایگاه حاج احمد یلالی', 0], ['انبار مدرسه', 0], ['انبار داروخانه', 1], ['انبار آشپزخانه', 1],
];
if (db.prepare('SELECT COUNT(*) AS n FROM warehouses').get().n === 0) {
  const ins = db.prepare('INSERT INTO warehouses (name, tracks_expiry, sort) VALUES (?, ?, ?)');
  DEFAULT_WAREHOUSES.forEach(([name, exp], i) => ins.run(name, exp, i + 1));
}

/** Run fn inside a transaction; rolls back on any thrown error. */
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const fix = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : v));
const all = (sql, ...p) => db.prepare(sql).all(...fix(p));
const get = (sql, ...p) => db.prepare(sql).get(...fix(p));
const run = (sql, ...p) => db.prepare(sql).run(...fix(p));

module.exports = { db, tx, all, get, run, DATA_DIR, UPLOAD_DIR, BACKUP_DIR };

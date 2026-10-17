import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "insubria-hub.sqlite"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',          -- student | staff | admin
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      profile TEXT NOT NULL DEFAULT '{}',
      libretto TEXT NOT NULL DEFAULT '{"exams":[]}',
      banned_at INTEGER,
      ban_reason TEXT,
      banned_by TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, body TEXT NOT NULL,
      uni TEXT NOT NULL, area TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
      to_staff INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS votes (
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      target_type TEXT NOT NULL,                     -- post | reply
      target_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (target_type, target_id, reporter_id)
    );
    -- author_id resta sul server anche per le risposte in incognito: serve all'audit, non viene mai inviato agli studenti
    CREATE TABLE IF NOT EXISTS staff_answers (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      anon INTEGER NOT NULL DEFAULT 1,
      by_label TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL, category TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'tutti',
      expires_at TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      by_label TEXT NOT NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL, kind TEXT NOT NULL, dep TEXT NOT NULL,
      course TEXT NOT NULL DEFAULT '', descr TEXT NOT NULL DEFAULT '',
      file_name TEXT, file_path TEXT, mime TEXT, size INTEGER,
      link TEXT NOT NULL DEFAULT '',
      by_label TEXT NOT NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS faq (
      id TEXT PRIMARY KEY,
      q TEXT NOT NULL, a TEXT NOT NULL, link TEXT NOT NULL DEFAULT '',
      by_label TEXT NOT NULL,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '', descr TEXT NOT NULL DEFAULT '',
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subs (
      endpoint TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      p256dh TEXT NOT NULL, auth TEXT NOT NULL,
      prefs TEXT NOT NULL DEFAULT '{}',
      user_agent TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      last_ok INTEGER
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT, action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id);
    CREATE INDEX IF NOT EXISTS idx_answers_post ON staff_answers(post_id);
    CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs(user_id);
  `);
  return db;
}

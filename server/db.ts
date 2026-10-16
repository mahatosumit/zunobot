import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { CleanWaitlistEntry } from '../shared/waitlist';
import { CONSENT_VERSION } from '../shared/waitlist';

/**
 * Persistence for waitlist registrations, using Node's built-in SQLite (no native dependency).
 * `node:sqlite` is still flagged experimental by Node; it is loaded through process.getBuiltinModule
 * so bundlers never try to resolve it. The surface used here is deliberately tiny, so swapping in
 * Postgres or another store later only means re-implementing `WaitlistStore`.
 */
export interface WaitlistStore {
  /** Inserts a new registration, or updates the existing one for the same email. */
  upsert(entry: CleanWaitlistEntry): { created: boolean };
  count(): number;
  all(): StoredEntry[];
  close(): void;
}

export interface StoredEntry {
  id: number;
  email: string;
  name: string;
  country: string;
  interest: string;
  message: string;
  marketing_opt_in: number;
  research_opt_in: number;
  consent_version: string;
  created_at: string;
  updated_at: string;
  submissions: number;
}

const MIGRATIONS: string[] = [
  // v1
  `CREATE TABLE waitlist_entries (
     id               INTEGER PRIMARY KEY AUTOINCREMENT,
     email            TEXT NOT NULL UNIQUE,
     name             TEXT NOT NULL,
     country          TEXT NOT NULL DEFAULT '',
     interest         TEXT NOT NULL DEFAULT '',
     message          TEXT NOT NULL DEFAULT '',
     marketing_opt_in INTEGER NOT NULL DEFAULT 0,
     research_opt_in  INTEGER NOT NULL DEFAULT 0,
     consent_version  TEXT NOT NULL,
     created_at       TEXT NOT NULL,
     updated_at       TEXT NOT NULL,
     submissions      INTEGER NOT NULL DEFAULT 1
   );
   CREATE INDEX idx_waitlist_created ON waitlist_entries (created_at);`,
];

export function openWaitlistStore(dbPath: string): WaitlistStore {
  const sqlite = process.getBuiltinModule('node:sqlite');
  if (!sqlite) throw new Error('This server needs Node.js 22.13 or newer (node:sqlite).');
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true });
  const db: DatabaseSync = new sqlite.DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  migrate(db);

  const find = db.prepare('SELECT id FROM waitlist_entries WHERE email = ?');
  const insert = db.prepare(
    `INSERT INTO waitlist_entries
       (email, name, country, interest, message, marketing_opt_in, research_opt_in, consent_version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  // A repeat submission keeps the original place in line (created_at) but refreshes answers and consent,
  // so a person can withdraw an opt-in by submitting again. Blank optional fields never erase earlier answers.
  const update = db.prepare(
    `UPDATE waitlist_entries SET
       name = ?,
       country = CASE WHEN ? <> '' THEN ? ELSE country END,
       interest = CASE WHEN ? <> '' THEN ? ELSE interest END,
       message = CASE WHEN ? <> '' THEN ? ELSE message END,
       marketing_opt_in = ?, research_opt_in = ?, consent_version = ?,
       updated_at = ?, submissions = submissions + 1
     WHERE email = ?`,
  );

  return {
    upsert(e) {
      const now = new Date().toISOString();
      const existing = find.get(e.email);
      if (existing) {
        update.run(
          e.name, e.country, e.country, e.interest, e.interest, e.message, e.message,
          e.marketingOptIn ? 1 : 0, e.researchOptIn ? 1 : 0, CONSENT_VERSION, now, e.email,
        );
        return { created: false };
      }
      try {
        insert.run(
          e.email, e.name, e.country, e.interest, e.message,
          e.marketingOptIn ? 1 : 0, e.researchOptIn ? 1 : 0, CONSENT_VERSION, now, now,
        );
        return { created: true };
      } catch (err) {
        // Two simultaneous submissions for the same address: the UNIQUE constraint decides, the loser updates.
        if (String((err as Error).message).includes('UNIQUE')) {
          update.run(
            e.name, e.country, e.country, e.interest, e.interest, e.message, e.message,
            e.marketingOptIn ? 1 : 0, e.researchOptIn ? 1 : 0, CONSENT_VERSION, now, e.email,
          );
          return { created: false };
        }
        throw err;
      }
    },
    count() {
      const row = db.prepare('SELECT COUNT(*) AS n FROM waitlist_entries').get() as { n: number } | undefined;
      return Number(row?.n ?? 0);
    },
    all() {
      return db.prepare('SELECT * FROM waitlist_entries ORDER BY id').all() as unknown as StoredEntry[];
    },
    close() {
      db.close();
    },
  };
}

function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number } | undefined;
  let version = Number(row?.user_version ?? 0);
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version] as string;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    version += 1;
  }
}

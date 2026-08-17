import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { drizzle, type RemoteCallback } from "drizzle-orm/sqlite-proxy";
import * as schema from "@/db/schema";

function resolveDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  return process.env.NODE_ENV === "production"
    ? "/var/data/sqlite.db"
    : path.join(process.cwd(), "local.db");
}

let sqliteInstance: DatabaseSync | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let initialized = false;

function getSqliteInstance(): DatabaseSync {
  if (!sqliteInstance) {
    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    sqliteInstance = new DatabaseSync(dbPath);
    sqliteInstance.exec("PRAGMA journal_mode = WAL;");
    sqliteInstance.exec("PRAGMA foreign_keys = ON;");
  }

  return sqliteInstance;
}

const queryCallback: RemoteCallback = async (sql, params, method) => {
  const sqlite = getSqliteInstance();
  const stmt = sqlite.prepare(sql);
  stmt.setReturnArrays(true);

  if (method === "run") {
    stmt.run(...params);
    return { rows: [] };
  }

  if (method === "all") {
    return { rows: stmt.all(...params) };
  }

  if (method === "get") {
    const row = stmt.get(...params);
    return { rows: row ? [row] : [] };
  }

  if (method === "values") {
    return { rows: stmt.all(...params) };
  }

  return { rows: [] };
};

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(queryCallback, { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export function initDb() {
  if (initialized) {
    return;
  }

  const sqlite = getSqliteInstance();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      image TEXT,
      google_id TEXT UNIQUE,
      clerk_id TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trackers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      target_description TEXT NOT NULL,
      frequency_minutes INTEGER NOT NULL DEFAULT 60,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
      extracted_value TEXT,
      confidence REAL,
      error TEXT,
      screenshot_path TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const logColumns = sqlite
    .prepare("PRAGMA table_info(logs)")
    .all() as { name: string }[];

  if (!logColumns.some((column) => column.name === "screenshot_path")) {
    sqlite.exec("ALTER TABLE logs ADD COLUMN screenshot_path TEXT;");
  }

  if (!logColumns.some((column) => column.name === "model")) {
    sqlite.exec("ALTER TABLE logs ADD COLUMN model TEXT;");
  }

  const trackerColumns = sqlite
    .prepare("PRAGMA table_info(trackers)")
    .all() as { name: string }[];

  if (!trackerColumns.some((column) => column.name === "reference_image_path")) {
    sqlite.exec("ALTER TABLE trackers ADD COLUMN reference_image_path TEXT;");
  }

  if (!trackerColumns.some((column) => column.name === "sort_order")) {
    sqlite.exec("ALTER TABLE trackers ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");

    const rows = sqlite
      .prepare("SELECT id FROM trackers ORDER BY created_at ASC, id ASC")
      .all() as { id: number }[];

    const updateSortOrder = sqlite.prepare(
      "UPDATE trackers SET sort_order = ? WHERE id = ?",
    );

    for (const [index, row] of rows.entries()) {
      updateSortOrder.run(index, row.id);
    }
  }

  if (!trackerColumns.some((column) => column.name === "notify_on_change")) {
    sqlite.exec(
      "ALTER TABLE trackers ADD COLUMN notify_on_change INTEGER NOT NULL DEFAULT 0;",
    );
  }

  if (!trackerColumns.some((column) => column.name === "notification_email")) {
    sqlite.exec("ALTER TABLE trackers ADD COLUMN notification_email TEXT;");
  }

  if (!trackerColumns.some((column) => column.name === "reference_image_paths")) {
    sqlite.exec("ALTER TABLE trackers ADD COLUMN reference_image_paths TEXT;");

    const rows = sqlite
      .prepare(
        "SELECT id, reference_image_path FROM trackers WHERE reference_image_path IS NOT NULL",
      )
      .all() as { id: number; reference_image_path: string }[];

    const updatePaths = sqlite.prepare(
      "UPDATE trackers SET reference_image_paths = ? WHERE id = ?",
    );

    for (const row of rows) {
      updatePaths.run(JSON.stringify([row.reference_image_path]), row.id);
    }
  }

  if (!trackerColumns.some((column) => column.name === "user_id")) {
    sqlite.exec("ALTER TABLE trackers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;");
  }

  const userColumns = sqlite
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];

  if (!userColumns.some((column) => column.name === "clerk_id")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN clerk_id TEXT;");
    sqlite.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_unique ON users(clerk_id);",
    );
  }

  if (!trackerColumns.some((column) => column.name === "deleted_at")) {
    sqlite.exec("ALTER TABLE trackers ADD COLUMN deleted_at INTEGER;");
  }

  const userColumnsAfterClerk = sqlite
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];

  if (!userColumnsAfterClerk.some((column) => column.name === "ai_provider")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN ai_provider TEXT;");
  }

  if (
    !userColumnsAfterClerk.some((column) => column.name === "ai_api_key_encrypted")
  ) {
    sqlite.exec("ALTER TABLE users ADD COLUMN ai_api_key_encrypted TEXT;");
  }

  if (
    !userColumnsAfterClerk.some((column) => column.name === "ai_fallback_enabled")
  ) {
    sqlite.exec(
      "ALTER TABLE users ADD COLUMN ai_fallback_enabled INTEGER NOT NULL DEFAULT 1;",
    );
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS site_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL UNIQUE,
      storage_state TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  initialized = true;
}

export function getSqlite() {
  return getSqliteInstance();
}

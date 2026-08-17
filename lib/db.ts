import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let sql: ReturnType<typeof postgres> | null = null;
let dbInstance: Db | null = null;
let initPromise: Promise<void> | null = null;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Use your Supabase Postgres connection string.",
    );
  }

  return url;
}

function getSql() {
  if (!sql) {
    sql = postgres(getDatabaseUrl(), {
      prepare: false,
      max: 10,
    });
  }

  return sql;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getSql(), { schema });
  }

  return dbInstance;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

async function initDbInternal() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    throw new Error(
      "No Drizzle migrations found. Run `npm run db:push` against your Supabase database.",
    );
  }

  await migrate(getDb(), { migrationsFolder });
}

export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = initDbInternal().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

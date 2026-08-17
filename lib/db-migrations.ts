import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type postgres from "postgres";

type Journal = {
  entries: Array<{
    tag: string;
    when: number;
  }>;
};

async function ensureMigrationTable(sql: ReturnType<typeof postgres>) {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
}

async function getAppliedMigrationHashes(sql: ReturnType<typeof postgres>) {
  const rows = await sql<{ hash: string }[]>`
    SELECT hash FROM drizzle.__drizzle_migrations
  `;

  return new Set(rows.map((row) => row.hash));
}

async function isMigrationAlreadyApplied(
  sql: ReturnType<typeof postgres>,
  tag: string,
) {
  if (tag === "0000_tidy_magdalene") {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'trackers'
      ) AS exists
    `;
    return row?.exists ?? false;
  }

  if (tag === "0002_notify_on_failure") {
    const [row] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'trackers'
          AND column_name = 'notify_on_failure'
      ) AS exists
    `;
    return row?.exists ?? false;
  }

  return false;
}

export async function baselineMigrationsFromExistingSchema(
  sql: ReturnType<typeof postgres>,
  migrationsFolder: string,
) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;

  await ensureMigrationTable(sql);

  const applied = await getAppliedMigrationHashes(sql);

  for (const entry of journal.entries) {
    const migrationPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const query = fs.readFileSync(migrationPath, "utf8");
    const hash = crypto.createHash("sha256").update(query).digest("hex");

    if (applied.has(hash)) {
      continue;
    }

    if (!(await isMigrationAlreadyApplied(sql, entry.tag))) {
      continue;
    }

    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${entry.when})
    `;
    applied.add(hash);
  }
}

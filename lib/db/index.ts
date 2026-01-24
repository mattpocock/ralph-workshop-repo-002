import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATABASE_PATH = process.env.DATABASE_PATH || "./data/links.db";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DATABASE_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function getTestDb(): Database.Database {
  const testDb = new Database(":memory:");
  testDb.pragma("foreign_keys = ON");
  return testDb;
}

export function runMigrations(database: Database.Database): void {
  const migrationsDir = path.join(process.cwd(), "migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.log("No migrations directory found");
    return;
  }

  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Get already applied migrations
  const applied = database
    .prepare("SELECT name FROM _migrations")
    .all()
    .map((row) => (row as { name: string }).name);

  // Get migration files sorted by name
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.includes(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    database.exec(sql);
    database.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);

    console.log(`Applied migration: ${file}`);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

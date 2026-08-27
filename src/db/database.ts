import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('crump.db');
  }
  return dbPromise;
}

export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY NOT NULL,
      product_name TEXT NOT NULL,
      brand TEXT,
      photo_uri TEXT NOT NULL,
      scanned_at INTEGER NOT NULL,
      overall_level TEXT NOT NULL,
      counts_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scan_ingredients (
      id TEXT PRIMARY KEY NOT NULL,
      scan_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      parent_id TEXT,
      name_as_printed TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      e_number TEXT,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      level_reason TEXT NOT NULL,
      additive_id TEXT,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS additives (
      id TEXT PRIMARY KEY NOT NULL,
      canonical_name TEXT NOT NULL,
      aliases_json TEXT NOT NULL,
      e_number TEXT,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      level_source TEXT,
      level_reason TEXT NOT NULL,
      description TEXT NOT NULL,
      purpose TEXT NOT NULL,
      enriched_at INTEGER,
      typical_products_json TEXT,
      alternatives_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_scan_ingredients_scan ON scan_ingredients(scan_id, position);
    CREATE INDEX IF NOT EXISTS idx_additives_e_number ON additives(e_number);
  `);
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(scan_ingredients)');
  if (!columns.some((column) => column.name === 'mention')) {
    await db.execAsync(
      `ALTER TABLE scan_ingredients ADD COLUMN mention TEXT NOT NULL DEFAULT 'listed'`,
    );
  }
}

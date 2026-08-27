import type { Additive, Level, Scan, ScanIngredient, SeedFile } from '../types';
import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeENumber } from '../domain/matcher';

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

export function rowToAdditive(row: Record<string, unknown>): Additive {
  return {
    id: String(row.id),
    canonicalName: String(row.canonical_name),
    aliases: parseJson<string[]>(String(row.aliases_json), []),
    eNumber: row.e_number ? String(row.e_number) : null,
    category: String(row.category),
    level: row.level as Additive['level'],
    levelSource: (row.level_source as Additive['levelSource']) ?? null,
    levelReason: String(row.level_reason),
    description: String(row.description),
    purpose: String(row.purpose),
    enrichedAt: row.enriched_at == null ? null : Number(row.enriched_at),
    typicalProducts: parseJson<string[] | null>(
      row.typical_products_json as string | null,
      null,
    ),
    alternatives: parseJson<string[] | null>(row.alternatives_json as string | null, null),
  };
}

export function rowToScan(row: Record<string, unknown>): Scan {
  return {
    id: String(row.id),
    productName: String(row.product_name),
    brand: row.brand ? String(row.brand) : null,
    photoUri: String(row.photo_uri),
    scannedAt: Number(row.scanned_at),
    overallLevel: row.overall_level as Level,
    counts: parseJson(String(row.counts_json), {
      organic: 0,
      low: 0,
      moderate: 0,
      high: 0,
    }),
  };
}

export function rowToIngredient(row: Record<string, unknown>): ScanIngredient {
  return {
    id: String(row.id),
    scanId: String(row.scan_id),
    position: Number(row.position),
    parentId: row.parent_id ? String(row.parent_id) : null,
    nameAsPrinted: String(row.name_as_printed),
    canonicalName: String(row.canonical_name),
    eNumber: row.e_number ? String(row.e_number) : null,
    level: row.level as Level,
    source: row.source as ScanIngredient['source'],
    levelReason: String(row.level_reason),
    additiveId: row.additive_id ? String(row.additive_id) : null,
  };
}

export async function listAdditives(db: SQLiteDatabase): Promise<Additive[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM additives');
  return rows.map(rowToAdditive);
}

export async function getAdditive(db: SQLiteDatabase, id: string): Promise<Additive | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM additives WHERE id = ?',
    id,
  );
  return row ? rowToAdditive(row) : null;
}

export async function findAdditiveByENumber(
  db: SQLiteDatabase,
  eNumber: string,
): Promise<Additive | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM additives WHERE e_number = ?',
    eNumber,
  );
  return row ? rowToAdditive(row) : null;
}

export async function findAdditiveByCanonicalName(
  db: SQLiteDatabase,
  canonicalName: string,
): Promise<Additive | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM additives WHERE lower(canonical_name) = lower(?)',
    canonicalName,
  );
  return row ? rowToAdditive(row) : null;
}

export async function linkScanIngredientAdditive(
  db: SQLiteDatabase,
  ingredientId: string,
  additiveId: string,
): Promise<void> {
  await db.runAsync('UPDATE scan_ingredients SET additive_id = ? WHERE id = ?', additiveId, ingredientId);
}

export async function insertAdditive(db: SQLiteDatabase, additive: Additive): Promise<void> {
  await db.runAsync(
    `INSERT INTO additives (
      id, canonical_name, aliases_json, e_number, category, level, level_source,
      level_reason, description, purpose, enriched_at, typical_products_json, alternatives_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    additive.id,
    additive.canonicalName,
    JSON.stringify(additive.aliases),
    additive.eNumber,
    additive.category,
    additive.level,
    additive.levelSource,
    additive.levelReason,
    additive.description,
    additive.purpose,
    additive.enrichedAt,
    additive.typicalProducts ? JSON.stringify(additive.typicalProducts) : null,
    additive.alternatives ? JSON.stringify(additive.alternatives) : null,
  );
}

export async function updateAdditiveEnrichment(
  db: SQLiteDatabase,
  id: string,
  patch: Pick<
    Additive,
    | 'level'
    | 'levelSource'
    | 'levelReason'
    | 'description'
    | 'purpose'
    | 'enrichedAt'
    | 'typicalProducts'
    | 'alternatives'
  >,
): Promise<void> {
  await db.runAsync(
    `UPDATE additives SET
      level = ?, level_source = ?, level_reason = ?, description = ?, purpose = ?,
      enriched_at = ?, typical_products_json = ?, alternatives_json = ?
     WHERE id = ?`,
    patch.level,
    patch.levelSource,
    patch.levelReason,
    patch.description,
    patch.purpose,
    patch.enrichedAt,
    JSON.stringify(patch.typicalProducts ?? []),
    JSON.stringify(patch.alternatives ?? []),
    id,
  );
}

export async function listScans(db: SQLiteDatabase): Promise<Scan[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM scans ORDER BY scanned_at DESC',
  );
  return rows.map(rowToScan);
}

export async function getScan(db: SQLiteDatabase, id: string): Promise<Scan | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM scans WHERE id = ?',
    id,
  );
  return row ? rowToScan(row) : null;
}

export async function listScanIngredients(
  db: SQLiteDatabase,
  scanId: string,
): Promise<ScanIngredient[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM scan_ingredients WHERE scan_id = ? ORDER BY position ASC',
    scanId,
  );
  return rows.map(rowToIngredient);
}

export async function getScanIngredient(
  db: SQLiteDatabase,
  id: string,
): Promise<ScanIngredient | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM scan_ingredients WHERE id = ?',
    id,
  );
  return row ? rowToIngredient(row) : null;
}

export async function insertScanWithIngredients(
  db: SQLiteDatabase,
  scan: Scan,
  ingredients: ScanIngredient[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO scans (id, product_name, brand, photo_uri, scanned_at, overall_level, counts_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      scan.id,
      scan.productName,
      scan.brand,
      scan.photoUri,
      scan.scannedAt,
      scan.overallLevel,
      JSON.stringify(scan.counts),
    );
    for (const ingredient of ingredients) {
      await db.runAsync(
        `INSERT INTO scan_ingredients (
          id, scan_id, position, parent_id, name_as_printed, canonical_name, e_number,
          level, source, level_reason, additive_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ingredient.id,
        ingredient.scanId,
        ingredient.position,
        ingredient.parentId,
        ingredient.nameAsPrinted,
        ingredient.canonicalName,
        ingredient.eNumber,
        ingredient.level,
        ingredient.source,
        ingredient.levelReason,
        ingredient.additiveId,
      );
    }
  });
}

export async function deleteScan(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM scan_ingredients WHERE scan_id = ?', id);
    await db.runAsync('DELETE FROM scans WHERE id = ?', id);
  });
}

export async function renameScan(db: SQLiteDatabase, id: string, productName: string): Promise<void> {
  await db.runAsync('UPDATE scans SET product_name = ? WHERE id = ?', productName, id);
}

export async function replaceAdditivesFromSeed(
  db: SQLiteDatabase,
  seed: SeedFile,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM additives');
    for (const additive of seed.additives) {
      const normalized: Additive = {
        ...additive,
        eNumber: normalizeENumber(additive.eNumber) ?? additive.eNumber,
      };
      await insertAdditive(db, normalized);
    }
    await db.runAsync(
      `INSERT INTO meta (key, value) VALUES ('seed_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      String(seed.version),
    );
  });
}

export async function getMeta(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

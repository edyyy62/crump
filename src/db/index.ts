import type { Additive, Level, SeedFile } from '../types';
import { getDb, migrate } from './database';
import { getMeta, listAdditives, replaceAdditivesFromSeed } from './repositories';
import seedJson from '../../assets/seed/additives.json';

const seed = seedJson as SeedFile;

let cachedAdditives: Additive[] | null = null;

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  const current = await getMeta(db, 'seed_version');
  if (current !== String(seed.version)) {
    await replaceAdditivesFromSeed(db, seed);
  }
  cachedAdditives = await listAdditives(db);
}

export async function getAdditiveCache(): Promise<Additive[]> {
  if (!cachedAdditives) {
    cachedAdditives = await listAdditives(await getDb());
  }
  return cachedAdditives;
}

export function invalidateAdditiveCache(): void {
  cachedAdditives = null;
}

export async function refreshAdditiveCache(): Promise<Additive[]> {
  cachedAdditives = await listAdditives(await getDb());
  return cachedAdditives;
}

export function emptyCounts(): Record<Level, number> {
  return { organic: 0, low: 0, moderate: 0, high: 0 };
}

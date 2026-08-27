import type { Additive, ScanIngredient } from '../types';
import { isLevel } from './level';
import { enrichIngredient, LlmError } from '../llm/client';
import { getDb } from '../db/database';
import {
  findAdditiveByCanonicalName,
  findAdditiveByENumber,
  getAdditive,
  insertAdditive,
  linkScanIngredientAdditive,
  updateAdditiveEnrichment,
} from '../db/repositories';
import { refreshAdditiveCache } from '../db';
import { randomUUID } from 'expo-crypto';
import { normalizeENumber, additiveFitsIngredient } from './matcher';

export type IngredientDetail = {
  ingredient: ScanIngredient;
  additive: Additive | null;
  offlineNote: boolean;
  enriching: boolean;
};

const inflight = new Map<string, Promise<{ additive: Additive | null; offlineNote: boolean }>>();

function cacheKey(ingredient: ScanIngredient): string {
  return ingredient.additiveId ?? `${ingredient.eNumber ?? ''}|${ingredient.canonicalName.toLowerCase()}`;
}

export function isEnriched(additive: Additive | null | undefined): boolean {
  return Boolean(additive?.enrichedAt && additive.description.trim().length > 0);
}

export async function loadAdditiveForIngredient(
  ingredient: ScanIngredient,
): Promise<Additive | null> {
  const db = await getDb();
  if (ingredient.additiveId) {
    const byId = await getAdditive(db, ingredient.additiveId);
    if (byId) return byId;
  }
  const eNumber = normalizeENumber(ingredient.eNumber);
  if (eNumber) {
    const byE = await findAdditiveByENumber(db, eNumber);
    if (byE) return byE;
  }
  return findAdditiveByCanonicalName(db, ingredient.canonicalName);
}

export async function enrichIfNeeded(ingredient: ScanIngredient): Promise<{
  additive: Additive | null;
  offlineNote: boolean;
}> {
  const key = cacheKey(ingredient);
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = enrichIfNeededUncached(ingredient).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

async function enrichIfNeededUncached(ingredient: ScanIngredient): Promise<{
  additive: Additive | null;
  offlineNote: boolean;
}> {
  const db = await getDb();
  let additive = await loadAdditiveForIngredient(ingredient);
  if (additive && !additiveFitsIngredient(ingredient, additive)) {
    await linkScanIngredientAdditive(db, ingredient.id, null);
    additive = null;
  }
  if (additive && !ingredient.additiveId) {
    await linkScanIngredientAdditive(db, ingredient.id, additive.id);
  }
  if (isEnriched(additive)) {
    return { additive, offlineNote: false };
  }

  try {
    const lockedLevel = isLevel(additive?.level ?? '') ? additive!.level : ingredient.level;
    const response = await enrichIngredient({
      canonicalName: additive?.canonicalName ?? ingredient.canonicalName,
      eNumber: additive?.eNumber ?? ingredient.eNumber,
      category: additive?.category ?? null,
      storedLevel: lockedLevel,
      storedReason: additive?.levelReason || ingredient.levelReason,
      description: additive?.description ?? null,
      purpose: additive?.purpose ?? null,
      asPrinted: ingredient.nameAsPrinted,
    });

    const keepSeedLevel = Boolean(additive && isLevel(additive.level));
    const nextLevel = keepSeedLevel && additive ? additive.level : ingredient.level;
    const nextReason =
      keepSeedLevel && additive
        ? additive.levelReason || ingredient.levelReason
        : ingredient.levelReason;

    if (!additive) {
      additive = {
        id: randomUUID(),
        canonicalName: ingredient.canonicalName,
        aliases: [ingredient.nameAsPrinted],
        eNumber: ingredient.eNumber,
        category: 'ingredient',
        level: nextLevel,
        levelSource: 'llm',
        levelReason: nextReason,
        description: response.description,
        purpose: response.purpose,
        enrichedAt: Date.now(),
        typicalProducts: response.typicalProducts,
        alternatives: response.alternatives,
      };
      await insertAdditive(db, additive);
      await linkScanIngredientAdditive(db, ingredient.id, additive.id);
    } else {
      additive = {
        ...additive,
        level: nextLevel,
        levelSource: keepSeedLevel ? additive.levelSource : additive.levelSource ?? 'llm',
        levelReason: nextReason,
        description: response.description,
        purpose: response.purpose,
        enrichedAt: Date.now(),
        typicalProducts: response.typicalProducts,
        alternatives: response.alternatives,
      };
      await updateAdditiveEnrichment(db, additive.id, additive);
    }
    await refreshAdditiveCache();
    return { additive, offlineNote: false };
  } catch (error) {
    const offline = error instanceof LlmError && error.kind === 'network';
    return { additive, offlineNote: offline };
  }
}

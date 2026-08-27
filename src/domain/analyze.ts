import { randomUUID } from 'expo-crypto';
import type { Additive, Scan, ScanIngredient } from '../types';
import { matchIngredient } from '../domain/matcher';
import { normalizeENumber } from '../domain/matcher';
import { rollup } from '../domain/rollup';
import { analyzeLabel, LlmError } from '../llm/client';
import type { ScanIngredientParsed } from '../llm/schemas';
import { getDb } from '../db/database';
import { getAdditiveCache } from '../db';
import { insertScanWithIngredients } from '../db/repositories';
import { downscaleForUpload, persistPhoto, readBase64 } from '../lib/photos';

export type AnalyzeFailure =
  | { kind: 'unreadable' }
  | { kind: 'service' };

export type AnalyzeSuccess = {
  kind: 'ok';
  scan: Scan;
};

export async function analyzeAndPersist(photoUri: string): Promise<AnalyzeSuccess | AnalyzeFailure> {
  try {
    const scaled = await downscaleForUpload(photoUri);
    const base64 = await readBase64(scaled);
    const parsed = await analyzeLabel(base64);
    if (!parsed.readable) {
      return { kind: 'unreadable' };
    }

    const additives = await getAdditiveCache();
    const scanId = randomUUID();
    const storedUri = await persistPhoto(scanId, photoUri);
    const ingredients = flattenIngredients(scanId, parsed.ingredients, additives);
    const { overallLevel, counts } = rollup(ingredients);

    const scan: Scan = {
      id: scanId,
      productName: parsed.productName?.trim() || 'Unnamed product',
      brand: parsed.brand,
      photoUri: storedUri,
      scannedAt: Date.now(),
      overallLevel,
      counts,
    };

    await insertScanWithIngredients(await getDb(), scan, ingredients);
    return { kind: 'ok', scan };
  } catch (error) {
    if (error instanceof LlmError) {
      return { kind: 'service' };
    }
    return { kind: 'service' };
  }
}

function flattenIngredients(
  scanId: string,
  parsed: ScanIngredientParsed[],
  additives: Additive[],
): ScanIngredient[] {
  const rows: ScanIngredient[] = [];
  let position = 0;
  for (const item of parsed) {
    const parentId = randomUUID();
    const matched = matchIngredient(
      {
        canonicalName: item.canonicalName,
        eNumber: item.eNumber,
        level: item.level,
        levelReason: item.levelReason,
      },
      additives,
    );
    rows.push({
      id: parentId,
      scanId,
      position: position++,
      parentId: null,
      nameAsPrinted: item.nameAsPrinted,
      canonicalName: item.canonicalName,
      eNumber: normalizeENumber(item.eNumber),
      level: matched.level,
      source: matched.source,
      levelReason: matched.levelReason,
      additiveId: matched.additiveId,
    });
    for (const sub of item.subIngredients) {
      const subMatched = matchIngredient(
        {
          canonicalName: sub.canonicalName,
          eNumber: sub.eNumber,
          level: sub.level,
          levelReason: sub.levelReason,
        },
        additives,
      );
      rows.push({
        id: randomUUID(),
        scanId,
        position: position++,
        parentId,
        nameAsPrinted: sub.nameAsPrinted,
        canonicalName: sub.canonicalName,
        eNumber: normalizeENumber(sub.eNumber),
        level: subMatched.level,
        source: subMatched.source,
        levelReason: subMatched.levelReason,
        additiveId: subMatched.additiveId,
      });
    }
  }
  return rows;
}

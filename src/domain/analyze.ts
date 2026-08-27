import { randomUUID } from 'expo-crypto';
import type { Additive, Scan, ScanIngredient } from '../types';
import { matchIngredient } from '../domain/matcher';
import { normalizeENumber } from '../domain/matcher';
import { sentenceCaseName } from './names';
import { rollup } from '../domain/rollup';
import { analyzeLabel, LlmError } from '../llm/client';
import type { ScanIngredientParsed } from '../llm/schemas';
import { getDb } from '../db/database';
import { getAdditiveCache } from '../db';
import { insertScanWithIngredients } from '../db/repositories';
import { downscaleForUpload, persistPhoto, readBase64 } from '../lib/photos';
import { applyNatureGrade, mentionForDeclared } from './labelGrade';
import { dedupeMayContain, dedupeParsedIngredients, listedCanonicalNames, listedIdentities } from './dedupe';

export const ANALYSIS_STEPS = [
  { id: 'prepare', label: 'Preparing the photo' },
  { id: 'read', label: 'Reading the ingredients' },
  { id: 'match', label: 'Matching names' },
  { id: 'save', label: 'Saving the scan' },
] as const;

export type AnalyzeStepId = (typeof ANALYSIS_STEPS)[number]['id'];

export type AnalyzeProgress = {
  step: number;
  total: number;
  label: string;
};

export type AnalyzeFailure =
  | { kind: 'unreadable' }
  | { kind: 'service'; message: string };

export type AnalyzeSuccess = {
  kind: 'ok';
  scan: Scan;
};

export async function analyzeAndPersist(
  photoUri: string,
  onProgress?: (progress: AnalyzeProgress) => void,
): Promise<AnalyzeSuccess | AnalyzeFailure> {
  const report = (step: number) => {
    const current = ANALYSIS_STEPS[step];
    if (!current) return;
    onProgress?.({ step, total: ANALYSIS_STEPS.length, label: current.label });
  };

  try {
    report(0);
    const scaled = await downscaleForUpload(photoUri);
    const base64 = await readBase64(scaled);

    report(1);
    const parsed = await analyzeLabel(base64);
    if (!parsed.readable) {
      return { kind: 'unreadable' };
    }

    report(2);
    const additives = await getAdditiveCache();
    const scanId = randomUUID();
    const listed = dedupeParsedIngredients(parsed.ingredients);
    const listedIds = listedIdentities(listed);
    const listedNames = listedCanonicalNames(listed);
    const declared = dedupeMayContain(parsed.contains ?? [], listedIds, listedNames);
    const traces = dedupeMayContain(parsed.mayContain ?? [], listedIdentities([
      ...listed,
      ...declared.map((row) => ({ ...row, subIngredients: [] })),
    ]), [...listedNames, ...declared.map((row) => row.canonicalName)]);
    const ingredients = flattenIngredients(scanId, listed, declared, traces, additives);
    const { overallLevel, counts } = rollup(
      ingredients.filter((row) => row.mention === 'listed'),
    );

    report(3);
    const storedUri = await persistPhoto(scanId, photoUri);
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
      return { kind: 'service', message: error.message };
    }
    return {
      kind: 'service',
      message: error instanceof Error ? error.message : 'Label analysis failed.',
    };
  }
}

function flattenIngredients(
  scanId: string,
  parsed: ScanIngredientParsed[],
  contains: ScanIngredientParsed['subIngredients'],
  mayContain: ScanIngredientParsed['subIngredients'],
  additives: Additive[],
): ScanIngredient[] {
  const rows: ScanIngredient[] = [];
  let position = 0;

  const push = (
    item: ScanIngredientParsed['subIngredients'][number],
    parentId: string | null,
    mention: ScanIngredient['mention'],
  ) => {
    const nature = applyNatureGrade(item);
    const matched = matchIngredient(
      {
        canonicalName: item.canonicalName,
        eNumber: item.eNumber,
        level: nature.level,
        levelReason: nature.levelReason,
      },
      additives,
    );
    const graded = applyNatureGrade({
      level: matched.level,
      levelReason: matched.levelReason,
    });
    const id = randomUUID();
    rows.push({
      id,
      scanId,
      position: position++,
      parentId,
      nameAsPrinted: item.nameAsPrinted,
      canonicalName: sentenceCaseName(item.canonicalName),
      eNumber: normalizeENumber(item.eNumber),
      level: graded.level,
      source: matched.source,
      levelReason: graded.levelReason,
      additiveId: matched.additiveId,
      mention,
    });
    return id;
  };

  for (const item of parsed) {
    const parentId = push(item, null, 'listed');
    for (const sub of item.subIngredients) {
      push(sub, parentId, 'listed');
    }
  }
  for (const item of contains) {
    push(item, null, mentionForDeclared(item));
  }
  for (const item of mayContain) {
    push(item, null, 'may_contain');
  }
  return rows;
}

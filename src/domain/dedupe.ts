import type { ScanIngredientParsed } from '../llm/schemas';
import { normalizeENumber, normalizeName } from './matcher';

export function ingredientIdentity(input: {
  canonicalName: string;
  eNumber: string | null;
}): string {
  const eNumber = normalizeENumber(input.eNumber);
  if (eNumber) return `e:${eNumber}`;
  return `n:${normalizeName(input.canonicalName)}`;
}

/** Keep first-seen parents and subs. Same E-number or canonical name is one row. */
export function dedupeParsedIngredients(
  ingredients: ScanIngredientParsed[],
): ScanIngredientParsed[] {
  const seen = new Set<string>();
  const result: ScanIngredientParsed[] = [];

  for (const item of ingredients) {
    const key = ingredientIdentity(item);
    if (seen.has(key)) {
      for (const sub of item.subIngredients) {
        maybePushStandalone(result, seen, sub);
      }
      continue;
    }
    seen.add(key);
    const subIngredients = [];
    for (const sub of item.subIngredients) {
      const subKey = ingredientIdentity(sub);
      if (seen.has(subKey)) continue;
      seen.add(subKey);
      subIngredients.push(sub);
    }
    result.push({ ...item, subIngredients });
  }

  return result;
}

export function listedIdentities(ingredients: ScanIngredientParsed[]): Set<string> {
  const seen = new Set<string>();
  for (const item of ingredients) {
    seen.add(ingredientIdentity(item));
    for (const sub of item.subIngredients) {
      seen.add(ingredientIdentity(sub));
    }
  }
  return seen;
}

export function dedupeMayContain(
  mayContain: ScanIngredientParsed['subIngredients'],
  listed: Set<string>,
): ScanIngredientParsed['subIngredients'] {
  const seen = new Set(listed);
  const result: ScanIngredientParsed['subIngredients'] = [];
  for (const item of mayContain) {
    const key = ingredientIdentity(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function maybePushStandalone(
  result: ScanIngredientParsed[],
  seen: Set<string>,
  sub: ScanIngredientParsed['subIngredients'][number],
): void {
  const key = ingredientIdentity(sub);
  if (seen.has(key)) return;
  seen.add(key);
  result.push({ ...sub, subIngredients: [] });
}

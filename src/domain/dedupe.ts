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

export function listedCanonicalNames(ingredients: ScanIngredientParsed[]): string[] {
  const names: string[] = [];
  for (const item of ingredients) {
    names.push(item.canonicalName, item.nameAsPrinted);
    for (const sub of item.subIngredients) {
      names.push(sub.canonicalName, sub.nameAsPrinted);
    }
  }
  return names;
}

export function nameCoveredByListed(listedNames: string[], candidate: string): boolean {
  const query = normalizeName(candidate);
  if (!query) return false;
  return listedNames.some((raw) => {
    const name = normalizeName(raw);
    if (!name) return false;
    if (name === query) return true;
    if (query.length < 4) return false;
    return name.startsWith(`${query} `) || name.endsWith(` ${query}`) || name.includes(` ${query} `);
  });
}

export function dedupeMayContain(
  mayContain: ScanIngredientParsed['subIngredients'],
  listed: Set<string>,
  listedNames: string[] = [],
): ScanIngredientParsed['subIngredients'] {
  const seen = new Set(listed);
  const result: ScanIngredientParsed['subIngredients'] = [];
  for (const item of mayContain) {
    const key = ingredientIdentity(item);
    if (seen.has(key)) continue;
    if (nameCoveredByListed(listedNames, item.canonicalName)) continue;
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

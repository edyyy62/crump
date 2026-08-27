import type { Additive, IngredientSource, Level } from '../types';
import { levenshtein } from './levenshtein';

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeENumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.toUpperCase().replace(/[\s-]/g, '');
  const match = compact.match(/^E(\d{3,4}[A-Z]?)$/);
  if (!match) return null;
  return `E${match[1]}`;
}

export interface ParsedIngredient {
  canonicalName: string;
  eNumber: string | null;
  level: Level;
  levelReason: string;
}

export interface MatchResult {
  level: Level;
  levelReason: string;
  source: IngredientSource;
  additiveId: string | null;
}

function namesOf(additive: Additive): string[] {
  return [additive.canonicalName, ...additive.aliases].map(normalizeName);
}

function fuzzyDistance(query: string, candidate: string): number | null {
  if (query === candidate) return 0;
  const distance = levenshtein(query, candidate);
  if (distance <= 2) return distance;
  const [shorter, longer] = query.length <= candidate.length ? [query, candidate] : [candidate, query];
  if (shorter.length >= 5 && longer.startsWith(shorter)) {
    return longer.length - shorter.length + 0.5;
  }
  return null;
}

function bestFuzzy(query: string, additives: Additive[]): Additive | null {
  let best: { additive: Additive; distance: number } | null = null;
  for (const additive of additives) {
    for (const name of namesOf(additive)) {
      const distance = fuzzyDistance(query, name);
      if (distance === null) continue;
      if (!best || distance < best.distance) {
        best = { additive, distance };
      }
    }
  }
  return best?.additive ?? null;
}

export function matchIngredient(parsed: ParsedIngredient, additives: Additive[]): MatchResult {
  const eNumber = normalizeENumber(parsed.eNumber);
  const canonical = normalizeName(parsed.canonicalName);

  let matched: Additive | null = null;

  if (eNumber) {
    matched = additives.find((row) => row.eNumber && normalizeENumber(row.eNumber) === eNumber) ?? null;
  }

  if (!matched) {
    matched =
      additives.find((row) => namesOf(row).includes(canonical)) ?? null;
  }

  if (!matched) {
    matched = bestFuzzy(canonical, additives);
  }

  if (!matched) {
    return {
      level: parsed.level,
      levelReason: parsed.levelReason,
      source: 'llm',
      additiveId: null,
    };
  }

  if (matched.level === 'unknown') {
    return {
      level: parsed.level,
      levelReason: parsed.levelReason,
      source: 'llm',
      additiveId: matched.id,
    };
  }

  return {
    level: matched.level,
    levelReason: matched.levelReason,
    source: 'database',
    additiveId: matched.id,
  };
}

export function matchIngredients(parsed: ParsedIngredient[], additives: Additive[]): MatchResult[] {
  return parsed.map((item) => matchIngredient(item, additives));
}

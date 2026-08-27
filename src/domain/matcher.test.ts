import { describe, expect, it } from 'vitest';
import type { Additive, Level } from '../types';
import { matchIngredient, normalizeENumber, normalizeName } from './matcher';

function additive(partial: Partial<Additive> & Pick<Additive, 'id' | 'canonicalName'>): Additive {
  return {
    aliases: [],
    eNumber: null,
    category: 'additive',
    level: 'low',
    levelSource: 'source-data',
    levelReason: 'Seeded',
    description: '',
    purpose: '',
    enrichedAt: null,
    typicalProducts: null,
    alternatives: null,
    ...partial,
  };
}

const llm = { level: 'high' as Level, levelReason: 'LLM said high' };

describe('normalizeENumber', () => {
  it('normalizes hyphen, case, and spacing variants to E322', () => {
    expect(normalizeENumber('E-322')).toBe('E322');
    expect(normalizeENumber('e322')).toBe('E322');
    expect(normalizeENumber('E 322')).toBe('E322');
    expect(normalizeENumber('E322')).toBe('E322');
    expect(normalizeENumber('e-150d')).toBe('E150D');
  });

  it('returns null for empty or non-E values', () => {
    expect(normalizeENumber(null)).toBeNull();
    expect(normalizeENumber('')).toBeNull();
    expect(normalizeENumber('sugar')).toBeNull();
  });
});

describe('normalizeName', () => {
  it('lowercases, trims, collapses whitespace, and strips diacritics', () => {
    expect(normalizeName('  Soy   Lécithin ')).toBe('soy lecithin');
  });
});

describe('matchIngredient', () => {
  const lecithin = additive({
    id: 'e322',
    canonicalName: 'Lecithins',
    aliases: ['soy lecithin', 'soya lecithin'],
    eNumber: 'E322',
    level: 'low',
    levelReason: 'Evaluated as safe within typical use',
  });

  const caramel = additive({
    id: 'e150d',
    canonicalName: 'Sulphite ammonia caramel',
    eNumber: 'E150D',
    level: 'moderate',
    levelReason: 'High consumers may exceed the ADI',
  });

  const unknown = additive({
    id: 'e999',
    canonicalName: 'Quillaia extract',
    eNumber: 'E999',
    level: 'unknown',
    levelSource: null,
    levelReason: '',
  });

  const phosphoric = additive({
    id: 'e338',
    canonicalName: 'Phosphoric acid',
    eNumber: 'E338',
    level: 'moderate',
    levelReason: 'Intake limit for high consumers',
  });

  const db = [lecithin, caramel, unknown, phosphoric];

  it('matches E-number variants exactly', () => {
    const hit = matchIngredient(
      { canonicalName: 'whatever', eNumber: 'e-322', ...llm },
      db,
    );
    expect(hit.additiveId).toBe('e322');
    expect(hit.source).toBe('database');
    expect(hit.level).toBe('low');
    expect(hit.levelReason).toBe(lecithin.levelReason);
  });

  it('matches exact canonical name when no E-number', () => {
    const hit = matchIngredient(
      { canonicalName: 'Phosphoric acid', eNumber: null, ...llm },
      db,
    );
    expect(hit.additiveId).toBe('e338');
    expect(hit.source).toBe('database');
    expect(hit.level).toBe('moderate');
  });

  it('matches an alias exactly', () => {
    const hit = matchIngredient(
      { canonicalName: 'Soy lecithin', eNumber: null, ...llm },
      db,
    );
    expect(hit.additiveId).toBe('e322');
    expect(hit.source).toBe('database');
  });

  it('fuzzy-matches Levenshtein distance ≤ 2', () => {
    const hit = matchIngredient(
      { canonicalName: 'Lecithinsx', eNumber: null, ...llm },
      db,
    );
    expect(hit.additiveId).toBe('e322');
    expect(hit.source).toBe('database');
  });

  it('fuzzy-matches a prefix of a longer additive name', () => {
    const hit = matchIngredient(
      { canonicalName: 'Phosphoric', eNumber: null, ...llm },
      db,
    );
    expect(hit.additiveId).toBe('e338');
  });

  it('on multiple fuzzy hits takes the lowest distance', () => {
    const near = additive({
      id: 'lecithins-alt',
      canonicalName: 'Lecithinss',
      level: 'organic',
    });
    const hit = matchIngredient(
      { canonicalName: 'Lecithins', eNumber: null, ...llm },
      [...db, near],
    );
    expect(hit.additiveId).toBe('e322');
  });

  it('does not fuzzy-match short everyday names to nearby additives', () => {
    const agar = additive({
      id: 'e406',
      canonicalName: 'Agar',
      aliases: ['Agar-agar', 'Agars'],
      eNumber: 'E406',
    });
    const hit = matchIngredient(
      { canonicalName: 'Sugar', eNumber: null, level: 'low', levelReason: 'sweetener' },
      [...db, agar],
    );
    expect(hit.additiveId).toBeNull();
    expect(hit.source).toBe('llm');
  });

  it('falls back to the LLM when nothing matches', () => {
    const hit = matchIngredient(
      { canonicalName: 'carbonated water', eNumber: null, level: 'organic', levelReason: 'Water' },
      db,
    );
    expect(hit.additiveId).toBeNull();
    expect(hit.source).toBe('llm');
    expect(hit.level).toBe('organic');
    expect(hit.levelReason).toBe('Water');
  });

  it('lets the database level win over a conflicting LLM level', () => {
    const hit = matchIngredient(
      { canonicalName: 'Phosphoric acid', eNumber: 'E338', level: 'organic', levelReason: 'LLM thinks organic' },
      db,
    );
    expect(hit.source).toBe('database');
    expect(hit.level).toBe('moderate');
    expect(hit.levelReason).toBe(phosphoric.levelReason);
  });

  it('keeps the LLM level when matched but seed level is unknown', () => {
    const hit = matchIngredient(
      { canonicalName: 'Quillaia extract', eNumber: 'E999', level: 'moderate', levelReason: 'LLM moderate' },
      db,
    );
    expect(hit.additiveId).toBe('e999');
    expect(hit.source).toBe('llm');
    expect(hit.level).toBe('moderate');
    expect(hit.levelReason).toBe('LLM moderate');
  });
});

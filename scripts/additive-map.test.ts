import { describe, expect, it } from 'vitest';
import { collectEvidence, mapLevel, normalizeENumber } from './additive-map';

describe('seed mapping', () => {
  it('normalizes E-numbers from taxonomy keys', () => {
    expect(normalizeENumber('e-150d')).toBe('E150D');
  });

  it('maps Southampton colours to moderate', () => {
    const evidence = collectEvidence('en:e102', {
      name: { en: 'Tartrazine' },
      e_number: 'E102',
    });
    expect(mapLevel(evidence).level).toBe('moderate');
    expect(mapLevel(evidence).confident).toBe(true);
  });

  it('maps nitrites to high', () => {
    const evidence = collectEvidence('en:e250', {
      name: { en: 'Sodium nitrite' },
      e_number: 'E250',
    });
    expect(mapLevel(evidence).level).toBe('high');
  });

  it('maps citric acid to organic', () => {
    const evidence = collectEvidence('en:e330', {
      name: { en: 'Citric acid' },
      e_number: 'E330',
    });
    expect(mapLevel(evidence).level).toBe('organic');
  });

  it('keeps unmapped additives unknown when evidence is thin', () => {
    const evidence = collectEvidence('en:e999', {
      name: { en: 'Quillaia extract' },
      e_number: 'E999',
    });
    const mapped = mapLevel(evidence);
    expect(mapped.confident).toBe(false);
  });
});

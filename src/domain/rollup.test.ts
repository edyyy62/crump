import { describe, expect, it } from 'vitest';
import { rollup } from './rollup';

describe('rollup', () => {
  it('returns organic with zero counts for an empty list', () => {
    expect(rollup([])).toEqual({
      overallLevel: 'organic',
      counts: { organic: 0, low: 0, moderate: 0, high: 0 },
    });
  });

  it('counts every ingredient and uses the worst level', () => {
    const result = rollup([
      { level: 'organic' },
      { level: 'organic' },
      { level: 'low' },
      { level: 'moderate' },
      { level: 'high' },
    ]);
    expect(result.overallLevel).toBe('high');
    expect(result.counts).toEqual({ organic: 2, low: 1, moderate: 1, high: 1 });
    expect(Object.values(result.counts).reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('treats moderate as worse than low and organic', () => {
    expect(rollup([{ level: 'organic' }, { level: 'moderate' }, { level: 'low' }]).overallLevel).toBe(
      'moderate',
    );
  });
});

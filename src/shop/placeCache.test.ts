import { describe, expect, it } from 'vitest';
import { placeCacheStatus } from './placeCache';

describe('placeCacheStatus', () => {
  const origin = { latitude: 50.08, longitude: 14.43 };

  it('treats a recent nearby search as a fresh hit', () => {
    expect(
      placeCacheStatus(
        { at: 1_000, origin, typeKey: 'grocery' },
        { now: 1_000 + 30_000, origin, typeKey: 'grocery' },
      ),
    ).toBe('fresh');
  });

  it('keeps a slightly old search as stale instead of dropping it', () => {
    expect(
      placeCacheStatus(
        { at: 1_000, origin, typeKey: 'grocery' },
        { now: 1_000 + 10 * 60_000, origin, typeKey: 'grocery' },
      ),
    ).toBe('stale');
  });

  it('misses when types change, the search is too old, or you have moved far', () => {
    expect(
      placeCacheStatus(
        { at: 1_000, origin, typeKey: 'grocery' },
        { now: 1_000 + 40 * 60_000, origin, typeKey: 'grocery' },
      ),
    ).toBe('miss');
    expect(
      placeCacheStatus(
        { at: 1_000, origin, typeKey: 'grocery' },
        { now: 2_000, origin, typeKey: 'gas' },
      ),
    ).toBe('miss');
    expect(
      placeCacheStatus(
        { at: 1_000, origin, typeKey: 'grocery' },
        {
          now: 2_000,
          origin: { latitude: 51.08, longitude: 14.43 },
          typeKey: 'grocery',
        },
      ),
    ).toBe('miss');
  });
});
